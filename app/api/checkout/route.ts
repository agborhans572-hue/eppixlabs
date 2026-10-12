import {z} from 'zod';
import {checkoutQuote,checkoutSchemaFor} from '@/lib/checkout';
import {getOrder,listOrders,placeOrder} from '@/lib/orders';
import {authoritativeProducts,currentUser,readCartItems} from '@/lib/repository';
import {checkOrigin,errorResponse,HttpError,jsonBody,rateLimit} from '@/lib/security';
import {requestRegion} from '@/lib/stores';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){try{
  const region=requestRegion(request);
  const params=new URL(request.url).searchParams;
  if(params.has('order')){const key=z.uuid().parse(params.get('order'));const order=await getOrder(key,region);if(!order)throw new HttpError(404,'Order not found.');return Response.json({order},{headers});}
  if(params.has('history')){if(!await currentUser())throw new HttpError(401,'Please sign in to view your orders.');return Response.json({orders:await listOrders(region)},{headers});}
  const [items,catalog,user]=await Promise.all([readCartItems(region),authoritativeProducts(region),currentUser()]);
  return Response.json({quote:checkoutQuote(items,catalog,region),email:user?.email||''},{headers});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
  checkOrigin(request);const region=requestRegion(request);
  await rateLimit(request,'checkout:'+region,15);const input=checkoutSchemaFor(region).parse(await jsonBody(request));return Response.json({order:await placeOrder(input,region)},{headers});
}catch(e){return errorResponse(e);}}
