import {currentUser} from '@/lib/repository';
import {submitToTeam} from '@/lib/notifications';
import {requestRegion} from '@/lib/stores';
import {supabaseServer} from '@/lib/supabase';
import {checkOrigin,digest,errorResponse,HttpError,jsonBody,rateLimit} from '@/lib/security';
import {accountSettingsSchema,accountMessageSchema} from '@/lib/account-validation';

export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){try{
  checkOrigin(request);
  const region=requestRegion(request);
  const user=await currentUser();if(!user)throw new HttpError(401,'Please sign in to manage your account.');
  const {action}=await params;
  if(!['settings','message'].includes(action))throw new HttpError(404,'Unknown account action.');
  await rateLimit(request,'account:'+action,30);
  const raw=await jsonBody(request);
  if(action==='settings'){
    const settings=accountSettingsSchema.parse(raw);
    const {error}=await (await supabaseServer()).auth.updateUser({data:{eppix_account:settings}});
    if(error)throw new HttpError(503,'Your changes could not be saved. Please try again.');
    return Response.json({saved:true,settings});
  }
  const {message}=accountMessageSchema.parse(raw);
  return Response.json(await submitToTeam('support',digest(user.id+':account:'+message),{email:user.email,name:String(user.user_metadata.name||user.user_metadata.full_name||user.email),subject:'Account message',message,accountUserId:user.id,store:region},region));
}catch(error){return errorResponse(error);}}
