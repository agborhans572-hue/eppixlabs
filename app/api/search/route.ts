import {search} from '@/lib/catalog';
import {requestRegion} from '@/lib/stores';
export async function GET(request:Request){try{const q=new URL(request.url).searchParams.get('q')||'';return Response.json({results:search(q.slice(0,100),requestRegion(request))});}catch{return Response.json({error:'Unknown store region.'},{status:400});}}
