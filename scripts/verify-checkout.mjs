import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Run checkout verification against an isolated local server with email and Supabase disabled.');
const region=process.env.TEST_REGION==='ca'?'ca':'us',opposite=region==='ca'?'us':'ca';
const catalog=JSON.parse(await readFile(region==='ca'?'reference/canada/catalog.json':'reference/catalog.json','utf8'));
const alternateCatalog=JSON.parse(await readFile(region==='ca'?'reference/catalog.json':'reference/canada/catalog.json','utf8'));
const alternateVariant=alternateCatalog.flatMap(p=>p.comingSoon?[]:p.variants).find(v=>v.available&&v.packSize===1);
const variant=catalog.flatMap(p=>p.comingSoon?[]:p.variants).find(v=>v.available&&v.stock>=3&&v.packSize===1);
const testEmail='checkout-'+randomUUID()+'@example.invalid',guestIds=[];
if(process.env.RESEND_API_KEY)throw Error('Disable email delivery before running checkout verification.');
function session(){const jar=new Map();return async(path,body,extra={})=>{
  const response=await fetch(origin+path+(path.includes('region=')?'':(path.includes('?')?'&':'?')+'region='+region),{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(jar.size?{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...extra},body:body?JSON.stringify(body):undefined});
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));if(pair.startsWith('eppix-cart='))guestIds.push('guest:'+pair.slice(i+1).split('.')[0]);}
  return {status:response.status,data:await response.json()};
};}
const request=session(),other=session();
try{
await request('/api/cart');await other('/api/cart');
assert.equal((await request('/api/cart?region='+opposite,{variantId:alternateVariant.id,quantity:1,operation:'set'})).status,200);
for(const paymentMethod of ['paypal','apple_pay','crypto','zelle']){
  assert.equal((await request('/api/cart',{variantId:variant.id,quantity:1,operation:'set'})).status,200);
  const {quote}= (await request('/api/checkout')).data;
  const input={idempotencyKey:randomUUID(),quoteId:quote.quoteId,firstName:'Local',lastName:'Test',email:testEmail,phone:'555-555-0100',billing:{line1:'123 Test St',line2:'',city:region==='ca'?'Ottawa':'Austin',state:region==='ca'?'Ontario':'Texas',postalCode:region==='ca'?'K1A 0B1':'78701'},paymentMethod,termsAccepted:true,researchOnly:true,notes:'Isolated local verification. Do not fulfill.',role:'',company:''};
  const first=await request('/api/checkout',input);assert.equal(first.status,200,JSON.stringify(first.data));
  assert.equal(first.data.order.quote.cart.currency,region==='ca'?'CAD':'USD');assert.equal(first.data.order.quote.cart.region,region);
  assert.equal(first.data.order.status,'awaiting_payment');assert.equal(first.data.order.paymentMethod,paymentMethod);assert.equal(first.data.order.quote.totalCents,quote.totalCents);
  assert.equal(first.data.order.customerEmail,'unavailable','Local test must have email disabled.');
  assert.equal((await request('/api/cart')).data.items.length,0);
  assert.equal((await request('/api/cart?region='+opposite)).data.items[0].quantity,1);
  assert.equal((await request('/api/checkout?region='+opposite+'&order='+input.idempotencyKey)).status,404);
  const retry=await request('/api/checkout',input);assert.equal(retry.status,200);assert.equal(retry.data.order.number,first.data.order.number);
  assert.equal((await request('/api/checkout?order='+input.idempotencyKey)).data.order.number,first.data.order.number);
  assert.equal((await other('/api/checkout?order='+input.idempotencyKey)).status,404);
  if(paymentMethod==='paypal'){
    assert.equal((await request('/api/checkout',{...input,email:'changed@example.invalid'})).status,409);
    assert.equal((await request('/api/checkout',{...input,totalCents:1})).status,400);
  }
  console.log(paymentMethod+': persisted, priced on server, cart cleared, retry deduplicated, receipt isolated');
}
assert.equal((await request('/api/checkout',{},{Origin:'https://untrusted.example'})).status,403);
assert.equal((await request('/api/checkout?region=unknown',{})).status,400);
assert.equal((await request('/api/checkout?history=1')).status,401);
console.log('Cross-origin checkout blocked; regional carts and receipts isolated; anonymous history protected.');
}finally{
  if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY){
    const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const {error}=await admin.from('support_requests').delete().eq('data->>email',testEmail).eq('data->>kind','order');assert.ifError(error);
    if(guestIds.length){const {error}=await admin.from('carts').delete().in('id',[...new Set(guestIds.flatMap(id=>[id,id+':ca']))]);assert.ifError(error);}
    console.log('Temporary database verification orders and carts removed.');
  }
}
