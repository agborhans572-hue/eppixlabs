import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const catalog=JSON.parse(await readFile('reference/catalog.json','utf8'));
let cookie='';const checks=[];
async function request(path,body,extra={}){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined,redirect:'manual'});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,data:await r.json().catch(()=>null),location:r.headers.get('location')};}
const variant=catalog.flatMap(p=>p.comingSoon?[]:p.variants).find(v=>v.available&&v.packSize===1&&v.stock>=10);
assert.equal((await request('/api/cart')).status,200);
for(const [quantity,percent] of [[2,0],[3,5],[4,5],[5,10],[9,10],[10,20]]){const r=await request('/api/cart',{variantId:variant.id,quantity,operation:'set'});assert.equal(r.status,200);assert.equal(r.data.discountPercent,percent);assert.equal(r.data.subtotalCents,variant.priceCents*quantity);checks.push('cart '+quantity+' vials / '+percent+'%');}
assert.equal((await request('/api/cart')).data.items[0].quantity,10);checks.push('cookie cart persistence');
assert.equal((await request('/api/cart',{variantId:variant.id,quantity:1,operation:'add',priceCents:1})).status,400);checks.push('client price rejected');
assert.equal((await request('/api/cart',{variantId:variant.id,quantity:1,operation:'add'},{Origin:'https://untrusted.example'})).status,403);checks.push('cross origin rejected');
assert.equal((await request('/api/cart',{variantId:'invalid',quantity:1,operation:'add'})).status,400);checks.push('unknown variant rejected');
await request('/api/cart',{variantId:variant.id,quantity:0,operation:'remove'});assert.equal((await request('/api/cart')).data.items.length,0);
const payload={email:'clone-test@example.invalid',company:'',preferences:['restocks']};for(let i=0;i<2;i++)assert.equal((await request('/api/submissions/subscribe',payload)).status,200);
const store=JSON.parse(await readFile('.local/store.json','utf8'));assert.equal(Object.values(store.submissions).filter(s=>s.data.email===payload.email).length,1);checks.push('duplicate subscription is idempotent');
assert.equal((await request('/api/submissions/support',{email:'support-test@example.invalid',company:'',name:'Local integration test',subject:'Website test',message:'Testing the local support persistence.'})).status,200);
assert.equal((await request('/api/submissions/affiliate',{email:'affiliate-test@example.invalid',company:'',name:'Local integration test',website:'https://example.invalid',message:'Testing the local affiliate persistence.',instagram:'test',tiktok:'',youtube:'',followers:'100'})).status,200);checks.push('support and affiliate persistence');
assert.equal((await request('/api/auth/login',{email:'clone-test@example.invalid',password:'testing-password'})).status,503);checks.push('unconfigured auth fails honestly');
const account=await request('/account');assert.ok([307,308].includes(account.status));assert.ok(account.location.includes('/login'));checks.push('account requires login');
const search=await request('/api/search?q=retatrutide');assert.ok(search.data.results.some(r=>r.url==='/products/retatrutide'));checks.push('global search');
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/api-report.json',JSON.stringify({origin,checks,passed:true},null,2));console.log(checks.join('\n'));
