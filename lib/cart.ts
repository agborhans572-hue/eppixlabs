import type { Cart, CartItem, Product } from './types';
import {stores,type StoreRegion} from './stores';
export function priceCart(items:CartItem[],catalog:Product[],region:StoreRegion='us'):Cart {
  const seen=new Set<string>();
  const lines=items.map(item=>{
    if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>99||seen.has(item.variantId)) throw Error('Invalid cart quantity or duplicate variant.');
    seen.add(item.variantId);
    const p=catalog.find(p=>p.variants.some(v=>v.id===item.variantId)); const v=p?.variants.find(v=>v.id===item.variantId);
    if(!p||!v||(p.store||'us')!==region) throw Error('This product variant is unavailable.');
    return {...item,product:p.name,slug:p.slug,variant:v.title,image:v.image||p.image,priceCents:v.priceCents,packSize:v.packSize,available:v.available&&!p.comingSoon&&item.quantity<=v.stock};
  });
  const vialCount=lines.reduce((n,l)=>n+l.quantity*l.packSize,0),subtotalCents=lines.reduce((n,l)=>n+l.quantity*l.priceCents,0);
  const discountPercent=vialCount>=10?20:vialCount>=5?10:vialCount>=3?5:0,discountCents=Math.round(subtotalCents*discountPercent/100);
  return {items:lines,currency:stores[region].currency,region,vialCount,subtotalCents,discountPercent,discountCents,totalCents:subtotalCents-discountCents,freeShipping:subtotalCents-discountCents>20000,checkoutAvailable:false};
}
