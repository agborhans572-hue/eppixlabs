import { z } from 'zod';
import { priceCart } from '@/lib/cart';
import { authoritativeProducts,mutateCart,readCartItems } from '@/lib/repository';
import {checkOrigin,errorResponse,jsonBody,rateLimit} from '@/lib/security';
export const dynamic='force-dynamic';
const schema=z.object({variantId:z.string().min(1).max(100),quantity:z.number().int().min(0).max(99),operation:z.enum(['add','set','remove'])}).strict();
export async function GET(){try{return Response.json(priceCart(await readCartItems(),await authoritativeProducts()),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{checkOrigin(request);await rateLimit(request,'cart',120);const body=schema.parse(await jsonBody(request));const items=await mutateCart(body.variantId,body.quantity,body.operation);return Response.json(priceCart(items,await authoritativeProducts()));}catch(e){return errorResponse(e);}}
