// Generate temporary authentication links without sending email.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const origin=process.env.TEST_ORIGIN||'https://www.eppixlabsshop.com';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const email='auth-verification-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('base64url'),newPassword=randomBytes(24).toString('base64url');
const jar=new Map(),checks=[];let userId,failure;
async function request(path,body){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});for(const value of r.headers.getSetCookie()){const pair=value.split(';')[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}return {status:r.status,location:r.headers.get('location'),text:await r.text()};}
function passed(label){checks.push(label);console.log(label);}
try{
 const {data,error}=await db.auth.admin.generateLink({type:'signup',email,password,options:{redirectTo:origin+'/auth/callback'}});assert.ifError(error);userId=data.user.id;
 const confirm=await request('/auth/callback?type=signup&token_hash='+encodeURIComponent(data.properties.hashed_token));assert.equal(confirm.status,307);assert.equal(new URL(confirm.location).pathname,'/account');assert.equal((await request('/account')).status,200);passed('signup confirmation token creates authenticated session');
 await request('/api/auth/logout',{});
 const recovery=await db.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:origin+'/auth/callback?next=/reset-password'}});assert.ifError(recovery.error);
 const callback=await request('/auth/callback?type=recovery&token_hash='+encodeURIComponent(recovery.data.properties.hashed_token));assert.equal(callback.status,307);assert.equal(new URL(callback.location).pathname,'/reset-password');passed('recovery callback opens reset-password');
 assert.equal((await request('/api/auth/reset-password',{password:newPassword})).status,200);passed('password update accepts authenticated recovery session');
 await request('/api/auth/logout',{});assert.equal((await request('/api/auth/login',{email,password})).status,401);assert.equal((await request('/api/auth/login',{email,password:newPassword})).status,200);passed('new password works and old password is rejected');
 const invalid=await request('/auth/callback?type=recovery&token_hash=invalid');assert.equal(new URL(invalid.location).pathname,'/login');passed('invalid authentication link fails safely');
}catch(error){failure=error.message;process.exitCode=1;console.error('Auth link verification failed:',failure);}
finally{if(userId){const {error}=await db.auth.admin.deleteUser(userId);if(error){process.exitCode=1;console.error('Temporary account cleanup failed');}}await mkdir('artifacts',{recursive:true});await writeFile('artifacts/live-auth-links-report.json',JSON.stringify({origin,verifiedAt:new Date().toISOString(),checks,passed:!process.exitCode,failure,emailDeliveryTested:false},null,2));}
