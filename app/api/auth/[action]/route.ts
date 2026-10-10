import {z} from 'zod';
import {configured,supabaseServer} from '@/lib/supabase';
import {checkOrigin,errorResponse,HttpError,jsonBody,rateLimit} from '@/lib/security';
import {signupCodeSchema,signupEmailSchema} from '@/lib/auth-validation';
import {requestRegion,storePath} from '@/lib/stores';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){try{
  checkOrigin(request);const {action}=await params;await rateLimit(request,'auth:'+action,10);
  if(!configured())throw new HttpError(503,'Accounts are unavailable until the store is configured.');
  const region=requestRegion(request),account=storePath('/account',region),login=storePath('/login',region);
  const db=await supabaseServer();const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||request.url).origin;
  if(action==='logout'){const {error}=await db.auth.signOut();if(error)throw new HttpError(503,'Sign out failed.');return Response.json({redirect:login});}
  if(action==='google'){const {data,error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/auth/callback'+(region==='ca'?'?next='+encodeURIComponent(account):'')}});if(error)throw new HttpError(503,'Google sign-in is unavailable.');return Response.json({redirect:data.url});}
  const raw=await jsonBody(request);
  if(action==='verify-signup'){
    const {email,token}=signupCodeSchema.parse(raw);
    const {data,error}=await db.auth.verifyOtp({email,token,type:'email'});
    if(error||!data.session||!data.user?.email_confirmed_at)throw new HttpError(400,'This code is invalid or has expired. Request a new code and try again.');
    return Response.json({redirect:account});
  }
  if(action==='resend-signup'){
    const {email}=signupEmailSchema.parse(raw);
    const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:origin+'/auth/callback'+(region==='ca'?'?next='+encodeURIComponent(account):'')}});
    if(error)throw new HttpError(error.status===429?429:503,error.status===429?'Please wait before requesting another code.':'The verification email could not be sent. Please try again later.');
    return Response.json({message:'If your account is awaiting verification, a new code has been sent. If you already verified it, sign in.'});
  }
  if(action==='forgot-password'){const {email}=z.object({email:z.email()}).strict().parse(raw);const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:origin+'/auth/callback?next='+encodeURIComponent(storePath('/reset-password',region))});if(error)throw new HttpError(503,'Password reset is unavailable.');return Response.json({message:'If an account exists, check your email for a reset link.'});}
  if(action==='reset-password'){const {password}=z.object({password:z.string().min(8).max(128)}).strict().parse(raw);const {data:user}=await db.auth.getUser();if(!user.user)throw new HttpError(401,'Open a valid password reset link first.');const {error}=await db.auth.updateUser({password});if(error)throw new HttpError(400,error.message);return Response.json({redirect:account});}
  if(!['login','signup'].includes(action))throw new HttpError(404,'Unknown authentication action.');
  const fields=z.object({email:z.email().max(254),password:z.string().min(8).max(128),name:z.string().max(150).optional()}).strict().parse(raw);
  if(action==='login'){const {error}=await db.auth.signInWithPassword({email:fields.email,password:fields.password});if(error)throw new HttpError(401,'Email or password is incorrect.');return Response.json({redirect:account});}
  const {data,error}=await db.auth.signUp({email:fields.email,password:fields.password,options:{emailRedirectTo:origin+'/auth/callback'+(region==='ca'?'?next='+encodeURIComponent(account):''),data:{name:fields.name||''}}});if(error)throw new HttpError(400,error.message);
  if(data.session){await db.auth.signOut();throw new HttpError(503,'Email verification is unavailable. Please contact support.');}
  return Response.json({verificationRequired:true,email:fields.email.trim().toLowerCase(),message:'Check your email for your account verification code.'});
}catch(e){return errorResponse(e);}}
