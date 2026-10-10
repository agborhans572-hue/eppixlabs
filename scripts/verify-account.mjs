import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {load} from 'cheerio';
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[],checks=[];
const routes=['/account','/account/orders','/account/addresses','/account/messages','/account/alerts','/account/notifications'];
function client(){const cookies=new Map();return async(path,body,extra={})=>{const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...extra},body:body?JSON.stringify(body):undefined,redirect:'manual'});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');cookies.set(p.slice(0,i),p.slice(i+1));}return {status:r.status,text:await r.text()};};}
const pass=label=>{checks.push(label);console.log(label);};
try{
 const guest=client();for(const route of routes)assert.equal((await guest(route)).status,307);
 assert.equal((await guest('/api/account/settings',{addresses:[],preferences:[]})).status,401);pass('all account routes and mutations require authentication');
 for(let n=0;n<2;n++){
  const email='dashboard-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('base64url');
  const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:n?'Other Researcher':'Dashboard Tester'}});assert.ifError(error);
  const request=client();users.push({id:data.user.id,email,password,request});
  assert.equal((await request('/api/auth/login',{email,password})).status,200);
 }
 const a=users[0],b=users[1];
 for(const route of routes){const page=await a.request(route);assert.equal(page.status,200,route);const $=load(page.text);assert.match($('meta[name="robots"]').attr('content'),/noindex/);assert.equal($('nav[aria-label="Account navigation"] a[aria-current="page"]').attr('href'),route);assert.match($('main').text(),/Dashboard Tester/);}
 pass('all six account sections render personalized navigation and noindex metadata');
 const address={id:randomUUID(),label:'Test address',firstName:'Dashboard',lastName:'Tester',line1:'123 Test Street',line2:'',city:'Test City',state:'CA',postalCode:'90210',country:'United States'};
 const settings={addresses:[address],preferences:['sales','research']};
 assert.equal((await a.request('/api/account/settings',settings)).status,200);
 const saved=await db.auth.admin.getUserById(a.id);assert.deepEqual(saved.data.user.user_metadata.eppix_account,settings);
 const other=await db.auth.admin.getUserById(b.id);assert.equal(other.data.user.user_metadata.eppix_account,undefined);pass('addresses and preferences persist only on the signed-in account');
 assert.equal((await a.request('/api/account/settings',{...settings,userId:b.id})).status,400);
 assert.equal((await a.request('/api/account/settings',settings,{Origin:'https://untrusted.example'})).status,403);pass('ownership injection and untrusted origins are rejected');
 const message='Dashboard isolation test '+randomUUID();
 assert.equal((await a.request('/api/account/message',{message})).status,200);
 assert.equal((await a.request('/api/account/message',{message})).status,200);
 const rows=await db.from('support_requests').select('id').eq('data->>accountUserId',a.id);assert.ifError(rows.error);assert.equal(rows.data.length,1);
 assert.ok((await a.request('/account/messages')).text.includes(message));assert.ok(!(await b.request('/account/messages')).text.includes(message));pass('support messages persist, deduplicate and stay private between accounts');
 assert.equal((await a.request('/account/unknown')).status,404);
 assert.equal((await a.request('/checkout')).status,200);pass('unknown account routes return 404 and checkout behavior remains available');
 if(process.env.KEEP_ACCOUNT_FOR_BROWSER==='1'){await mkdir('artifacts',{recursive:true});await writeFile('artifacts/account-browser-test.json',JSON.stringify({id:a.id,email:a.email,password:a.password}));}
}catch(error){process.exitCode=1;console.error(error.message);}
finally{
 for(let i=0;i<users.length;i++){
  const u=users[i];const messages=await db.from('support_requests').delete().eq('data->>accountUserId',u.id);if(messages.error)process.exitCode=1;
  if(i===0&&process.env.KEEP_ACCOUNT_FOR_BROWSER==='1'&&!process.exitCode)continue;
  const {error}=await db.auth.admin.deleteUser(u.id);if(error)process.exitCode=1;
 }
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/account-report.json',JSON.stringify({origin,checks,passed:!process.exitCode},null,2));
}
