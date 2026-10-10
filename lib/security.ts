import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase';
import { localTransaction } from './local-store';
function secret() {
  if(process.env.CART_COOKIE_SECRET && process.env.CART_COOKIE_SECRET.length>=32)return process.env.CART_COOKIE_SECRET;
  if(process.env.NODE_ENV==='production')throw Error('The store is unavailable.');
  mkdirSync('.local',{recursive:true});try{return readFileSync('.local/cookie-secret','utf8');}catch{const key=randomBytes(32).toString('hex');writeFileSync('.local/cookie-secret',key,{flag:'wx'});return key;}
}
export function digest(value:string) {return createHmac('sha256',secret()).update(value).digest('hex');}
export async function guestCartId() {
  const store=await cookies();const token=store.get('eppix-cart')?.value||'';const [id,signature]=token.split('.');
  if(id&&/^[0-9a-f-]{36}$/.test(id)&&signature?.length===64){const a=Buffer.from(digest(id)),b=Buffer.from(signature);if(a.length===b.length&&timingSafeEqual(a,b))return id;}
  const fresh=randomUUID();store.set('eppix-cart',fresh+'.'+digest(fresh),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});return fresh;
}
export function checkOrigin(request:Request) {
  const origin=request.headers.get('origin');const site=process.env.NEXT_PUBLIC_SITE_URL;
  if(!origin)throw new HttpError(403,'Request origin is not allowed.');
  if(site&&origin===new URL(site).origin)return;
  const port=new URL(request.url).port;
  if(process.env.NODE_ENV!=='production'&&[`http://localhost:${port}`,`http://127.0.0.1:${port}`].includes(origin))return;
  throw new HttpError(403,'Request origin is not allowed.');
}
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export async function rateLimit(request:Request,scope:string,limit=20) {
  // Vercel overwrites this header. Locally use a single development bucket.
  const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||'unknown':'local';
  const key=digest(scope+':'+ip);const windowSeconds=600;
  if(process.env.SUPABASE_SERVICE_ROLE_KEY){const {data,error}=await supabaseAdmin().rpc('consume_rate_limit',{p_key:key,p_limit:limit,p_window_seconds:windowSeconds});if(error)throw new HttpError(503,'Please try again later.');if(!data)throw new HttpError(429,'Too many requests. Please try again later.');}
  else await localTransaction(s=>{const now=Date.now();const bucket=s.rates[key];if(!bucket||bucket.reset<now)s.rates[key]={count:1,reset:now+windowSeconds*1000};else{if(bucket.count>=limit)throw new HttpError(429,'Too many requests. Please try again later.');bucket.count++;}});
}
export async function jsonBody(request:Request) {if(Number(request.headers.get('content-length')||0)>16000)throw new HttpError(413,'Request is too large.');const raw=await request.text();if(raw.length>16000)throw new HttpError(413,'Request is too large.');try{return JSON.parse(raw);}catch{throw new HttpError(400,'Invalid request.');}}
export function errorResponse(error:unknown) {if(error instanceof HttpError)return Response.json({error:error.message},{status:error.status});if(error instanceof Error&&error.name==='StoreRegionError')return Response.json({error:error.message},{status:400});if(error instanceof Error&&error.name==='ZodError')return Response.json({error:'Please check the supplied fields.'},{status:400});console.error('Store request failed:',error instanceof Error?error.message:'unknown');return Response.json({error:'This service is unavailable. Please try again later.'},{status:503});}
