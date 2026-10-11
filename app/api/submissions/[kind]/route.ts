import {z} from 'zod';
import {checkOrigin,digest,errorResponse,HttpError,jsonBody,rateLimit} from '@/lib/security';
import {submitToTeam} from '@/lib/notifications';
import {requestRegion} from '@/lib/stores';
const base=z.object({email:z.email().max(254),company:z.string().max(150).optional()});
const schemas={subscribe:base.extend({preferences:z.array(z.enum(['sales','launches','restocks','research'])).max(4)}).strict(),support:base.extend({name:z.string().min(1).max(150),subject:z.string().min(1).max(150),message:z.string().min(5).max(5000)}).strict(),affiliate:base.extend({name:z.string().min(1).max(150),website:z.string().max(500).optional(),message:z.string().max(5000).optional(),instagram:z.string().max(500).optional(),tiktok:z.string().max(500).optional(),youtube:z.string().max(500).optional(),followers:z.string().max(100).optional()}).strict()};
export async function POST(request:Request,{params}:{params:Promise<{kind:string}>}){try{
  checkOrigin(request);const region=requestRegion(request);const {kind}=await params;if(!Object.hasOwn(schemas,kind))throw new HttpError(404,'Unknown form.');await rateLimit(request,'submission:'+kind,10);
  const raw=await jsonBody(request);const data=schemas[kind as keyof typeof schemas].parse(raw);
  if(data.company)return Response.json({saved:true,message:'Request received.'});
  const key=digest(kind==='subscribe'?data.email.toLowerCase():JSON.stringify(data));
  return Response.json(await submitToTeam(kind as keyof typeof schemas,key,{...data,store:region},region));
}catch(e){return errorResponse(e);}}
