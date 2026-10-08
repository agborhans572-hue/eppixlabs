import {search} from '@/lib/catalog';
export async function GET(request:Request){const q=new URL(request.url).searchParams.get('q')||'';return Response.json({results:search(q.slice(0,100))});}
