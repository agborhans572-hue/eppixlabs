import 'server-only';
import { products } from './catalog';
import { configured, supabaseAdmin, supabaseServer } from './supabase';
import { localTransaction } from './local-store';
import { guestCartId, HttpError } from './security';
import type { CartItem, Product } from './types';
import {cartKey,type StoreRegion} from './stores';
export async function currentUser() {if(!configured())return null;const {data,error}=await (await supabaseServer()).auth.getUser();if(error)return null;return data.user;}
export async function authoritativeProducts(region:StoreRegion='us'):Promise<Product[]> {
  if(!configured()) {if(process.env.NODE_ENV==='production')throw new HttpError(503,'The store is not configured.');return products(region);}
  const admin=supabaseAdmin();const [{data:rows,error},{data:variants,error:variantError}]=await Promise.all([admin.from('products').select('data'),admin.from('variants').select('*')]);
  if(error||variantError||!rows?.length)throw new HttpError(503,'Catalog is unavailable.');
  const regional=rows.filter(row=>((row.data as Product).store||'us')===region);
  if(!regional.length)throw new HttpError(503,'This regional catalog is unavailable.');
  return regional.map(row=>{const p=row.data as Product;return {...p,variants:(variants||[]).filter(v=>v.product_id===p.id).map(v=>({...v.data,priceCents:v.price_cents,available:v.available,stock:v.stock}))};});
}
export async function cartContext(region:StoreRegion='us') {const guest=await guestCartId();const user=await currentUser();return {key:cartKey(user?'user:'+user.id:'guest:'+guest,region),userId:user?.id||null,guestKey:cartKey('guest:'+guest,region)};}
export async function readCartItems(region:StoreRegion='us'):Promise<CartItem[]> {
  const context=await cartContext(region);
  if(configured()) {
    const db=supabaseAdmin();
    const {data,error}=await db.rpc('read_cart',{p_key:context.key,p_user_id:context.userId,p_guest_key:context.userId?context.guestKey:null});
    if(error)throw new HttpError(503,'Your cart could not be loaded.');return data||[];
  }
  return localTransaction(s=>s.carts[context.key]?.items||[]);
}
export async function mutateCart(variantId:string,quantity:number,operation:'add'|'set'|'remove',region:StoreRegion='us'):Promise<CartItem[]> {
  const context=await cartContext(region); const catalog=await authoritativeProducts(region);
  const p=catalog.find(p=>p.variants.some(v=>v.id===variantId)),v=p?.variants.find(v=>v.id===variantId);
  if(!p||!v)throw new HttpError(400,'Unknown product variant.');
  if(operation!=='remove'&&quantity>0&&(!v.available||p.comingSoon))throw new HttpError(409,'This variant is unavailable.');
  if(configured()) {
    const {data,error}=await supabaseAdmin().rpc('mutate_cart',{p_key:context.key,p_user_id:context.userId,p_variant:variantId,p_quantity:quantity,p_operation:operation});
    if(error)throw new HttpError(/STOCK|QUANTITY|UNAVAILABLE/.test(error.message)?409:503,/STOCK|QUANTITY|UNAVAILABLE/.test(error.message)?'Requested quantity is unavailable.':'Your cart could not be saved.');return data||[];
  }
  return localTransaction(s=>{
    const cart=s.carts[context.key]||{items:[]};const old=cart.items.find(i=>i.variantId===variantId)?.quantity||0;
    const next=operation==='remove'?0:operation==='set'?quantity:old+quantity;
    if(next>99||next>v.stock)throw new HttpError(409,'Requested quantity is unavailable.');
    const items=cart.items.filter(i=>i.variantId!==variantId);if(next>0)items.push({variantId,quantity:next});s.carts[context.key]={items};return items;
  });
}
export async function saveSubmission(kind:string,key:string,data:Record<string,unknown>) {
  if(configured()) {
    const db=supabaseAdmin();const table=kind==='subscribe'?'subscriptions':kind==='support'?'support_requests':'affiliate_applications';
    const row={idempotency_key:key,data,...(kind==='subscribe'?{email:String(data.email).toLowerCase()}:{} )};
    const {error}=await db.from(table).upsert(row,{onConflict:kind==='subscribe'?'email':'idempotency_key'});if(error)throw new HttpError(503,'Your request could not be saved.');
  }else await localTransaction(s=>{s.submissions[kind+':'+key]={kind,data,createdAt:new Date().toISOString()};});
}
