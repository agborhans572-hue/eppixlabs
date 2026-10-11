import 'server-only';
import {saveSubmission} from './repository';
import {saveAndNotifySubmission,sendSubmissionEmail,type SubmissionKind} from './submission-mail';
import type {StoreRegion} from './stores';

export function submitToTeam(kind:SubmissionKind,key:string,data:Record<string,unknown>,region:StoreRegion){
  return saveAndNotifySubmission(kind,key,data,region,{
    save:saveSubmission,
    notify:(kind,key,data,region)=>sendSubmissionEmail(kind,key,data,region,process.env.RESEND_API_KEY||''),
  });
}
