import 'server-only';
import {randomUUID} from 'node:crypto';
import {configured,supabaseAdmin} from './supabase';
import {localTransaction} from './local-store';
import {authoritativeProducts,cartContext,readCartItems} from './repository';
import {digest,HttpError} from './security';
import {checkoutQuote,hash,publicReceipt,requireCheckoutQuote,type CheckoutInput,type StoredOrder} from './checkout';
import {notifyOrder} from './order-mail';
import type {StoreRegion} from './stores';

// Manual-payment orders use the existing private request ledger. Its unique
// idempotency key and RLS keep checkout durable without a deployment-time migration.
async function findOrder(key:string):Promise<StoredOrder|null>{
  if(!configured())return localTransaction(s=>s.submissions[key] as StoredOrder||null);
  const {data,error}=await supabaseAdmin().from('support_requests').select('data').eq('idempotency_key',key).maybeSingle();
  if(error)throw new HttpError(503,'Your order could not be loaded.');return data?.data as StoredOrder||null;
}
export async function getOrder(idempotencyKey:string,region:StoreRegion='us'){
  const context=await cartContext(region);const key='order:'+digest(context.key+':'+idempotencyKey),order=await findOrder(key);
  return order?publicReceipt(order):null;
}
export async function placeOrder(input:CheckoutInput,region:StoreRegion='us'){
  const context=await cartContext(region),key='order:'+digest(context.key+':'+input.idempotencyKey);
  let order=await findOrder(key);
  const inputHash=hash(input);
  if(order&&order.inputHash!==inputHash)throw new HttpError(409,'This order was already submitted. Refresh checkout to start a new order.');
  if(!order){
    const items=await readCartItems(region),quote=checkoutQuote(items,await authoritativeProducts(region),region);
    try{requireCheckoutQuote(quote,input.quoteId);}catch(e){throw new HttpError(409,(e as Error).message);}
    order={kind:'order',ownerKey:digest(context.key),input,inputHash,number:(region==='ca'?'EPP-CA-':'EPP-')+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+randomUUID().slice(0,8).toUpperCase(),createdAt:new Date().toISOString(),status:'awaiting_payment',email:input.email,paymentMethod:input.paymentMethod,quote,customerEmail:'unavailable',teamEmail:'unavailable'};
    if(configured()){
      const {error}=await supabaseAdmin().from('support_requests').insert({idempotency_key:key,data:order});
      if(error){
        // Recover a concurrent or ambiguous insert without creating another order.
        const existing=await findOrder(key);
        if(!existing)throw new HttpError(503,'Your order could not be saved. Your cart is still available; please try again.');
        if(existing.inputHash!==inputHash)throw new HttpError(409,'This order was already submitted. Refresh checkout.');
        order=existing;
      }
    }else order=await localTransaction(s=>{const existing=s.submissions[key] as StoredOrder|undefined;if(existing)return existing;s.submissions[key]=order;return order!;});
  }
  if(order.inputHash!==inputHash)throw new HttpError(409,'This order was already submitted. Refresh checkout to start a new order.');
  // Clear only the exact purchased cart. Keep anything added in another tab.
  const purchased=order.quote.cart.items.map(({variantId,quantity})=>({variantId,quantity}));
  if(configured()){
    const {error}=await supabaseAdmin().from('carts').update({items:[],updated_at:new Date().toISOString()}).eq('id',context.key).eq('items',JSON.stringify(purchased));
    if(error)console.error('Order saved; cart clearing unavailable.');
  }else await localTransaction(s=>{if(hash(s.carts[context.key]?.items||[])===hash(purchased))s.carts[context.key]={items:[]};});
  if(order.customerEmail!=='sent'||order.teamEmail!=='sent'){
    const result=await notifyOrder(order,process.env.RESEND_API_KEY||'');
    order={...order,customerEmail:order.customerEmail==='sent'?'sent':result.customerEmail,teamEmail:order.teamEmail==='sent'?'sent':result.teamEmail};
    if(configured()){const {error}=await supabaseAdmin().from('support_requests').update({data:order}).eq('idempotency_key',key);if(error)console.error('Order notification status could not be saved.');}
    else await localTransaction(s=>{s.submissions[key]=order;});
  }
  return publicReceipt(order);
}
export async function listOrders(region:StoreRegion='us'){
  const owner=digest((await cartContext(region)).key);
  if(!configured())return localTransaction(s=>Object.values(s.submissions).filter((value):value is StoredOrder=>!!value&&typeof value==='object'&&(value as StoredOrder).kind==='order'&&(value as StoredOrder).ownerKey===owner).map(publicReceipt));
  const {data,error}=await supabaseAdmin().from('support_requests').select('data').eq('data->>kind','order').eq('data->>ownerKey',owner).order('created_at',{ascending:false}).limit(100);
  if(error)throw new HttpError(503,'Your orders could not be loaded.');return (data||[]).map(row=>publicReceipt(row.data));
}
