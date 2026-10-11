import {createHash} from 'node:crypto';
import {businessEmail} from './contact';
import {stores,type StoreRegion} from './stores';

export type SubmissionKind='subscribe'|'support'|'affiliate';
export type NotificationStatus='sent'|'unavailable';
const labels={subscribe:'Newsletter preferences',support:'Enquiry',affiliate:'Affiliate application'};
const fields:Record<SubmissionKind,string[]>={
  subscribe:['email','preferences'],
  support:['name','email','subject','message'],
  affiliate:['name','email','website','instagram','tiktok','youtube','followers','message'],
};

export function submissionEmail(kind:SubmissionKind,data:Record<string,unknown>,region:StoreRegion){
  const subject=String(data.subject||'').replace(/[\r\n\u0000-\u001f\u007f]+/g,' ').trim().slice(0,150);
  const details=fields[kind].flatMap(field=>{
    const value=data[field];if(value===undefined||value==='')return [];
    return [field[0].toUpperCase()+field.slice(1)+': '+(Array.isArray(value)?value.join(', '):String(value))];
  });
  return {
    from:`Eppix Labs <${businessEmail}>`,
    to:[businessEmail],
    reply_to:String(data.email),
    subject:`[Eppix Labs ${region.toUpperCase()}] ${labels[kind]}`+(kind==='support'&&subject?': '+subject:''),
    // Plain text keeps visitor-provided messages from being interpreted as HTML.
    text:[labels[kind],'Store: '+stores[region].name,'',...details,'','Submitted through the Eppix Labs website.'].join('\n'),
    tags:[{name:'submission',value:kind},{name:'store',value:region}],
  };
}

export async function sendSubmissionEmail(kind:SubmissionKind,key:string,data:Record<string,unknown>,region:StoreRegion,apiKey:string,send:typeof fetch=fetch):Promise<NotificationStatus>{
  if(!apiKey)return 'unavailable';
  const email=submissionEmail(kind,data,region);
  // Include the content so changed newsletter preferences can notify the team too.
  const contentKey=createHash('sha256').update(key+JSON.stringify(email)).digest('hex');
  try{
    const response=await send('https://api.resend.com/emails',{
      method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':`submission/${kind}/${contentKey}`},
      body:JSON.stringify(email),
    });
    if(!response.ok){console.error('Submission notification rejected:',response.status);return 'unavailable';}
    const result=await response.json();
    return typeof result.id==='string'&&result.id?'sent':'unavailable';
  }catch{
    // Do not log visitor content, credentials, or provider response bodies.
    console.error('Submission notification unavailable.');return 'unavailable';
  }
}

export function submissionFeedback(kind:SubmissionKind,notification:NotificationStatus){
  if(kind==='subscribe')return 'Your preferences have been saved. Marketing emails and restock alerts are not active yet.';
  return notification==='sent'?'Your message has been sent to our team.':`Your message has been saved, but the email could not be sent. For help, email ${businessEmail}.`;
}

export async function saveAndNotifySubmission(kind:SubmissionKind,key:string,data:Record<string,unknown>,region:StoreRegion,services:{save:(kind:SubmissionKind,key:string,data:Record<string,unknown>)=>Promise<void>;notify:(kind:SubmissionKind,key:string,data:Record<string,unknown>,region:StoreRegion)=>Promise<NotificationStatus>}){
  await services.save(kind,key,data);
  const notification=await services.notify(kind,key,data,region);
  return {saved:true,notification,message:submissionFeedback(kind,notification)};
}
