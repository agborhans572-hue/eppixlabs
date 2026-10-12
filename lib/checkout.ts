import {createHash} from 'node:crypto';
import {z} from 'zod';
import {priceCart} from './cart';
import type {CartItem,Product,Cart} from './types';
import type {StoreRegion} from './stores';

import {states,provinces,type PaymentMethod} from './checkout-options';
const text=(max=150)=>z.string().trim().min(1).max(max);
export const addressSchema=z.object({line1:text(200),line2:z.string().trim().max(150).default(''),city:text(),state:z.enum(states),postalCode:z.string().trim().regex(/^\d{5}(?:-\d{4})?$/,'Enter a valid ZIP code.')}).strict();
export const canadianAddressSchema=addressSchema.extend({state:z.enum(provinces),postalCode:z.string().trim().toUpperCase().regex(/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/,'Enter a valid Canadian postal code.').transform(value=>value.replace(/\s/g,'').replace(/^(.{3})(.{3})$/,'$1 $2'))});
export const checkoutSchema=z.object({
  idempotencyKey:z.uuid(),quoteId:z.string().regex(/^[a-f0-9]{64}$/),
  firstName:text(80),lastName:text(80),email:z.email().max(254).transform(v=>v.toLowerCase()),phone:z.string().trim().min(7).max(40).regex(/^[+\d() .-]+$/),
  role:z.string().trim().max(100).default(''),billing:addressSchema,shipping:addressSchema.optional(),notes:z.string().trim().max(1500).default(''),
  paymentMethod:z.enum(['paypal','apple_pay','crypto','zelle']),researchOnly:z.literal(true),termsAccepted:z.literal(true),company:z.string().max(0).default(''),
}).strict();
export const canadianCheckoutSchema=checkoutSchema.extend({billing:canadianAddressSchema,shipping:canadianAddressSchema.optional()});
export function checkoutSchemaFor(region:StoreRegion){return region==='ca'?canadianCheckoutSchema:checkoutSchema;}
export type CheckoutInput=z.infer<typeof checkoutSchema>|z.infer<typeof canadianCheckoutSchema>;
export interface CheckoutQuote {cart:Cart;shippingCents:number;taxCents:number;totalCents:number;quoteId:string;}
export interface OrderReceipt {number:string;createdAt:string;status:'awaiting_payment';email:string;paymentMethod:PaymentMethod;quote:CheckoutQuote;customerEmail:'sent'|'unavailable';teamEmail:'sent'|'unavailable';}
export interface StoredOrder extends OrderReceipt {kind:'order';ownerKey:string;input:CheckoutInput;inputHash:string;}
export const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function checkoutQuote(items:CartItem[],catalog:Product[],region:StoreRegion='us'):CheckoutQuote {
  const cart=priceCart(items,catalog,region);const shippingCents=cart.freeShipping?0:2000,taxCents=0;
  return {cart,shippingCents,taxCents,totalCents:cart.totalCents+shippingCents+taxCents,quoteId:hash({region,currency:cart.currency,items:cart.items,subtotal:cart.subtotalCents,discount:cart.discountCents,shippingCents,taxCents})};
}
export function requireCheckoutQuote(quote:CheckoutQuote,quoteId:string){
  if(!quote.cart.items.length)throw Error('Your cart is empty. Add a product before placing an order.');
  if(quote.cart.items.some(item=>!item.available))throw Error('An item or quantity is unavailable. Please update your cart.');
  if(quote.quoteId!==quoteId)throw Error('Your cart or prices changed. Review the updated total before placing your order.');
}
export function publicReceipt(order:StoredOrder):OrderReceipt {
  const {number,createdAt,status,email,paymentMethod,quote,customerEmail,teamEmail}=order;
  return {number,createdAt,status,email,paymentMethod,quote,customerEmail,teamEmail};
}
