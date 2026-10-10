// Exercise real Supabase OTP verification without sending mail to test addresses.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const email='signup-otp-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('base64url');
const cookies=new Map(),checks=[];let userId;
async function request(path,body,headers={}){
  const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:new URL(process.env.NEXT_PUBLIC_SITE_URL||origin).origin}:{}),Cookie:[...cookies].map(([key,value])=>key+'='+value).join('; '),...headers},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
  for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
  return {status:response.status,text:await response.text()};
}
function pass(label){checks.push(label);console.log(label);}
try{
  const {data,error}=await db.auth.admin.generateLink({type:'signup',email,password});assert.ifError(error);userId=data.user.id;
  assert.equal(data.user.email_confirmed_at,undefined);
  assert.equal((await request('/account')).status,307);pass('account requires verification before access');
  assert.equal((await request('/api/auth/login',{email,password})).status,401);pass('unverified password login is rejected');
  assert.equal((await request('/api/auth/verify-signup',{email,token:'abcdef'})).status,400);pass('malformed OTP is rejected');
  const token=data.properties.email_otp;
  const wrong=token[0]==='0'?'1'+token.slice(1):'0'+token.slice(1);
  assert.equal((await request('/api/auth/verify-signup',{email,token:wrong})).status,400);
  assert.equal((await request('/account')).status,307);pass('incorrect OTP does not authenticate');
  assert.equal((await request('/api/auth/verify-signup',{email,token},{Origin:'https://untrusted.example'})).status,403);pass('untrusted origin is rejected');
  const verified=await request('/api/auth/verify-signup',{email,token});assert.equal(verified.status,200);assert.equal(JSON.parse(verified.text).redirect,'/account');
  assert.equal((await request('/account')).status,200);
  const confirmed=await db.auth.admin.getUserById(userId);assert.ifError(confirmed.error);assert.ok(confirmed.data.user.email_confirmed_at);pass('valid OTP confirms the account and establishes cookie session');
  await request('/api/auth/logout',{});
  assert.equal((await request('/api/auth/verify-signup',{email,token})).status,400);pass('used OTP cannot be replayed');
  assert.equal((await request('/api/auth/login',{email,password})).status,200);pass('verified account retains password login');
  assert.equal((await request('/api/auth/resend-signup',{email:'not-an-email'})).status,400);pass('resend rejects invalid email');
}catch(error){process.exitCode=1;console.error('Signup OTP verification failed:',error.message);}
finally{
  if(userId){const {error}=await db.auth.admin.deleteUser(userId);if(error){process.exitCode=1;console.error('Temporary account cleanup failed.');}}
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/signup-otp-report.json',JSON.stringify({origin,checks,passed:!process.exitCode,emailDeliveryTested:false},null,2));
}
