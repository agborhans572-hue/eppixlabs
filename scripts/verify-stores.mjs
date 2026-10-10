import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {load} from 'cheerio';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ca=JSON.parse(await readFile('reference/canada/catalog.json','utf8')),us=JSON.parse(await readFile('reference/catalog.json','utf8'));
const choose=c=>c.flatMap(p=>p.comingSoon?[]:p.variants).find(v=>v.available&&v.packSize===1&&v.stock>=5);
const canadian=choose(ca),american=choose(us),checks=[],cartIds=new Set();let accountId;
const passed=label=>{checks.push(label);console.log(label);};
function session(){const jar=new Map();return {async request(path,body,headers={}){
  const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(jar.size?{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...headers},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
  for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
  const id=jar.get('eppix-cart')?.split('.')[0];if(id){cartIds.add('guest:'+id);cartIds.add('guest:'+id+':ca');}
  const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return {status:r.status,data,text,location:r.headers.get('location')};
}};}
let failure;
try{
  const guest=session();
  const initial=await guest.request('/api/cart?region=ca');assert.equal(initial.status,200);assert.equal(initial.data.currency,'CAD');assert.equal(initial.data.items.length,0);passed('Canadian guest cart starts separately in CAD');
  const added=await guest.request('/api/cart?region=ca',{variantId:canadian.id,quantity:3,operation:'add'});assert.equal(added.status,200);assert.equal(added.data.subtotalCents,canadian.priceCents*3);assert.equal(added.data.discountPercent,5);passed('Canadian prices and vial discounts come from the server');
  const other=await guest.request('/api/cart');assert.equal(other.status,200);assert.equal(other.data.currency,'USD');assert.equal(other.data.items.length,0);passed('Switching to US retains an independent cart');
  assert.equal((await guest.request('/api/cart',{variantId:american.id,quantity:1,operation:'add'})).status,200);
  assert.equal((await guest.request('/api/cart?region=ca')).data.items[0].variantId,canadian.id);passed('Canadian cart persists while US cart changes');
  for(const [url,id] of [['/api/cart?region=ca',american.id],['/api/cart',canadian.id]])assert.equal((await guest.request(url,{variantId:id,quantity:1,operation:'add'})).status,400);passed('Cross-store variant injection is rejected in both directions');
  assert.equal((await guest.request('/api/cart?region=ca',{variantId:canadian.id,quantity:1,operation:'add',priceCents:1})).status,400);passed('Canadian client price tampering is rejected');
  assert.equal((await guest.request('/api/cart?region=unknown')).status,400);passed('Unknown store selection is rejected');
  const unavailable=ca.flatMap(p=>p.variants).find(v=>!v.available);assert.ok(unavailable);assert.equal((await guest.request('/api/cart?region=ca',{variantId:unavailable.id,quantity:1,operation:'add'})).status,409);passed('Unavailable Canadian variants cannot be added');
  const password=randomBytes(20).toString('hex'),email='store-check-'+randomUUID()+'@example.invalid';
  const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(error);accountId=data.user.id;cartIds.add('user:'+accountId);cartIds.add('user:'+accountId+':ca');
  const login=await guest.request('/api/auth/login?region=ca',{email,password});assert.equal(login.status,200);assert.equal(login.data.redirect,'/ca/account');passed('Canadian login stays in the Canadian account');
  assert.equal((await guest.request('/api/cart?region=ca')).data.items[0].variantId,canadian.id);assert.equal((await guest.request('/api/cart')).data.items[0].variantId,american.id);passed('Login merges each guest cart only into its own store');
  const account=await guest.request('/ca/account');assert.equal(account.status,200);const $=load(account.text);assert.match($('meta[name="robots"]').attr('content'),/noindex/);assert.ok($('a[href="/ca/account/addresses"]').length);passed('Canadian account is protected, private and uses Canadian navigation');
  assert.equal((await guest.request('/api/auth/logout?region=ca',{})).data.redirect,'/ca/login');const protectedPage=await guest.request('/ca/account');assert.ok([307,308].includes(protectedPage.status));assert.match(protectedPage.location,/\/ca\/login\?next=/);passed('Canadian logout restores account protection');
  const find=await guest.request('/api/search?region=ca&q=retatrutide');assert.equal(find.status,200);assert.ok(find.data.results.length);assert.ok(find.data.results.every(r=>r.url==='/ca'||r.url.startsWith('/ca/')));passed('Canadian search returns only Canadian links');
}catch(error){failure=error;}finally{
  const cleanup=await db.from('carts').delete().in('id',[...cartIds]);assert.ifError(cleanup.error);
  if(accountId)assert.ifError((await db.auth.admin.deleteUser(accountId)).error);
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/stores-integration.json',JSON.stringify({origin,checks,passed:!failure,temporaryDataRemoved:true,failure:failure?.message},null,2));
}
if(failure)throw failure;
console.log('Verified',checks.length,'regional integration checks; temporary account and carts removed.');
