import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const origin=process.env.TEST_ORIGIN||'https://www.eppixlabsshop.com';
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const catalog=JSON.parse(await readFile('reference/catalog.json','utf8'));
const variant=catalog.flatMap(p=>p.comingSoon?[]:p.variants).find(v=>v.available&&v.packSize===1&&v.stock>=10);
const checks=[],users=[],guestIds=[];
const testEmail='deployment-'+randomUUID()+'@example.invalid';
function passed(label){checks.push(label);console.log(label);}
function session(){const jar=new Map();return {jar,async request(path,body,extra={}){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(jar.size?{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...extra},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return {status:r.status,data,text,location:r.headers.get('location')};}};}
let failure;
try{
 for(const [table,expected] of [['products',76],['variants',259],['batches',73],['certificates',73]]){let query=admin.from(table).select('*',{count:'exact',head:true});if(table==='products'||table==='variants')query=query.not('id','like','ca:%');const {count,error}=await query;assert.ifError(error);assert.equal(count,expected);passed(table+' import count');}
 const guest=session();assert.equal((await guest.request('/api/cart')).status,200);guestIds.push('guest:'+guest.jar.get('eppix-cart').split('.')[0]);
 for(const [quantity,discount] of [[2,0],[3,5],[4,5],[5,10],[9,10],[10,20]]){const r=await guest.request('/api/cart',{variantId:variant.id,quantity,operation:'set'});assert.equal(r.status,200);assert.equal(r.data.discountPercent,discount);assert.equal(r.data.subtotalCents,variant.priceCents*quantity);assert.equal(r.data.checkoutAvailable,true);passed('live cart '+quantity+' vials / '+discount+'%');}
 assert.equal((await guest.request('/api/cart')).data.items[0].quantity,10);passed('live cookie cart persistence');
 assert.equal((await guest.request('/api/cart',{variantId:variant.id,quantity:1,operation:'add',priceCents:1})).status,400);passed('live client price rejected');
 assert.equal((await guest.request('/api/cart',{variantId:variant.id,quantity:1,operation:'add'},{Origin:'https://untrusted.example'})).status,403);passed('live cross-origin mutation rejected');
 await guest.request('/api/cart',{variantId:variant.id,quantity:0,operation:'remove'});
 for(let i=0;i<2;i++){const password=randomBytes(24).toString('base64url');const email=testEmail.replace('@','-'+i+'@');const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'Temporary deployment verification'}});assert.ifError(error);users.push({id:data.user.id,email,password,session:session()});}
 for(const user of users){const r=await user.session.request('/api/auth/login',{email:user.email,password:user.password});assert.equal(r.status,200);assert.equal(r.data.redirect,'/account');const account=await user.session.request('/account');assert.equal(account.status,200);assert.ok(account.text.includes(user.email));passed('confirmed test account login and protected account '+users.indexOf(user));const cart=await user.session.request('/api/cart');assert.equal(cart.status,200);assert.equal(cart.data.items.length,0);guestIds.push('guest:'+user.session.jar.get('eppix-cart').split('.')[0]);}
 assert.equal((await users[0].session.request('/api/cart',{variantId:variant.id,quantity:3,operation:'set'})).status,200);
 assert.equal((await users[1].session.request('/api/cart')).data.items.length,0);passed('live account cart isolation');
 const reader=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 assert.ifError((await reader.auth.signInWithPassword({email:users[1].email,password:users[1].password})).error);
 for(const table of ['profiles','carts']){const {data,error}=await reader.from(table).select('*').eq(table==='profiles'?'id':'user_id',users[0].id);assert.ifError(error);assert.deepEqual(data,[]);passed(table+' ownership policy');}
 const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
 for(const table of ['subscriptions','support_requests','affiliate_applications']){const {data,error}=await anon.from(table).select('*').limit(1);assert.ok(error||data.length===0);passed('anonymous '+table+' access blocked');}
 const fields={email:testEmail,company:'',preferences:['restocks']};for(let i=0;i<2;i++)assert.equal((await guest.request('/api/submissions/subscribe',fields)).status,200);
 const {count,error}=await admin.from('subscriptions').select('*',{count:'exact',head:true}).eq('email',testEmail);assert.ifError(error);assert.equal(count,1);passed('live duplicate subscription is idempotent');
 for(const [kind,fields] of [['support',{name:'Deployment verification',subject:'Temporary test',message:'Temporary deployment persistence verification.'}],['affiliate',{name:'Deployment verification',website:'https://example.invalid',message:'Temporary deployment persistence verification.'}]]){assert.equal((await guest.request('/api/submissions/'+kind,{email:testEmail,company:'',...fields})).status,200);passed('live '+kind+' persistence');}
 assert.equal((await users[0].session.request('/api/auth/logout',{})).status,200);assert.ok([307,308].includes((await users[0].session.request('/account')).status));passed('live logout protects account');
 const search=await guest.request('/api/search?q=retatrutide%2020mg');assert.equal(search.status,200);assert.ok(search.data.results.some(r=>r.url.includes('strength=20mg')));passed('live strength search');
 const asset=catalog[0].image;const {error:assetError}=await admin.storage.from('clone-assets').download(asset.replace(/^\//,''));assert.ifError(assetError);passed('Supabase storage download');
}catch(error){failure=error.message;console.error('Deployment verification failed:',failure);process.exitCode=1;}
finally{
 for(const user of users){const {error}=await admin.auth.admin.deleteUser(user.id);if(error){process.exitCode=1;console.error('Temporary account cleanup failed');}}
 for(const id of guestIds){const {error}=await admin.from('carts').delete().eq('id',id);if(error){process.exitCode=1;console.error('Temporary cart cleanup failed');}}
 for(const [table,field] of [['subscriptions','email'],['support_requests','data->>email'],['affiliate_applications','data->>email']]){const {error}=await admin.from(table).delete().eq(field,testEmail);if(error){process.exitCode=1;console.error('Temporary submission cleanup failed');}}
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/live-deployment-report.json',JSON.stringify({origin,verifiedAt:new Date().toISOString(),checks,passed:!process.exitCode,failure,temporaryTestDataCleanup:true},null,2));
}
