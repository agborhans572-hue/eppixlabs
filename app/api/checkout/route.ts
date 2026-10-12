import {z} from 'zod';
import {checkoutQuote,checkoutSchema} from '@/lib/checkout';
import {getOrder,listOrders,placeOrder} from '@/lib/orders';
import {authoritativeProducts,currentUser,readCartItems} from '@/lib/repository';
import {checkOrigin,errorResponse,HttpError,jsonBody,rateLimit} from '@/lib/security';
import {requestRegion} from '@/lib/stores';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){try{
  if(requestRegion(request)!=='us')throw new HttpError(400,'Checkout is currently available in the US store only.');
  const params=new URL(request.url).searchParams;
  if(params.has('order')){const key=z.uuid().parse(params.get('order'));const order=await getOrder(key);if(!order)throw new HttpError(404,'Order not found.');return Response.json({order},{headers});}
  if(params.has('history')){if(!await currentUser())throw new HttpError(401,'Please sign in to view your orders.');return Response.json({orders:await listOrders()},{headers});}
  const [items,catalog,user]=await Promise.all([readCartItems(),authoritativeProducts(),currentUser()]);
  return Response.json({quote:checkoutQuote(items,catalog),email:user?.email||''},{headers});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
  checkOrigin(request);if(requestRegion(request)!=='us')throw new HttpError(400,'Checkout is currently available in the US store only.');
  await rateLimit(request,'checkout',15);const input=checkoutSchema.parse(await jsonBody(request));return Response.json({order:await placeOrder(input)},{headers});
}catch(e){return errorResponse(e);}}
