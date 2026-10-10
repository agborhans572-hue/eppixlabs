'use client';

import {useEffect,useState} from 'react';
import {chooseVariant,vialDiscount} from '@/lib/interactions';
import {storeMoney,type StoreRegion} from '@/lib/stores';
import type {Product,Variant} from '@/lib/types';

export function purchaseSelection(detail:HTMLElement,product:Product,cartVials:number){
  const variant=chooseVariant(product,detail.dataset.strength,Number(detail.dataset.pack||1));
  const value=Number(detail.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')?.value||1);
  const quantity=Number.isFinite(value)?Math.max(1,Math.min(99,Math.floor(value))):1;
  const percent=vialDiscount(cartVials+(variant?.packSize||1)*quantity);
  return {variant,quantity,priceCents:variant?variant.priceCents-Math.round(variant.priceCents*percent/100):0};
}

/** Observe the purchase block, including its waitlist, and avoid covering the footer. */
export function observePurchaseAnchor(detail:HTMLElement,change:(visible:boolean,offset:number)=>void){
  const button=Array.from(detail.querySelectorAll<HTMLElement>('[data-action="add"]')).find(button=>button.closest('[data-product]')===detail);
  if(!button)return()=>{};
  const view=detail.ownerDocument.defaultView!;let visible=false,frame=0;
  const measure=()=>{frame=0;const footer=detail.ownerDocument.querySelector('footer');const offset=visible&&footer?Math.max(0,view.innerHeight-footer.getBoundingClientRect().top):0;change(visible,offset);};
  const scroll=()=>{if(!frame)frame=view.requestAnimationFrame(measure);};
  const observer=new IntersectionObserver(entries=>{visible=!entries[0].isIntersecting;view.cancelAnimationFrame(frame);measure();},{threshold:0});
  observer.observe(button.parentElement||button);
  view.addEventListener('scroll',scroll,{passive:true});view.addEventListener('resize',scroll);
  return()=>{observer.disconnect();view.cancelAnimationFrame(frame);view.removeEventListener('scroll',scroll);view.removeEventListener('resize',scroll);};
}

type Props={detail:HTMLElement;product:Product;region:StoreRegion;cartVials:number;busy:boolean;suppressed:boolean;add:(variant:Variant,quantity:number)=>Promise<boolean>};
export function StickyPurchaseBar({detail,product,region,cartVials,busy,suppressed,add}:Props){
  const [position,setPosition]=useState({visible:false,offset:0});
  const [selection,setSelection]=useState(()=>purchaseSelection(detail,product,cartVials));
  const [added,setAdded]=useState(false);
  useEffect(()=>observePurchaseAnchor(detail,(visible,offset)=>setPosition({visible,offset})),[detail]);
  useEffect(()=>{
    const sync=()=>setSelection(purchaseSelection(detail,product,cartVials));
    detail.addEventListener('clone:variant-change',sync);detail.addEventListener('clone:purchase-change',sync);sync();
    return()=>{detail.removeEventListener('clone:variant-change',sync);detail.removeEventListener('clone:purchase-change',sync);};
  },[detail,product,cartVials]);
  useEffect(()=>{if(!added)return;const timer=setTimeout(()=>setAdded(false),2000);return()=>clearTimeout(timer);},[added]);
  const visible=position.visible&&!suppressed,variant=selection.variant,disabled=busy||!variant?.available||product.comingSoon;
  const label=busy?'Adding…':product.comingSoon?'Coming Soon':!variant?.available?'Out of Stock':added?'Added to Cart':'Add to Cart';
  return <div className="clone-sticky-purchase" data-visible={visible} aria-hidden={!visible} inert={!visible} style={{transform:`translateY(${position.offset?-position.offset:visible?0:12}px)`}}>
    <div className="clone-sticky-purchase-panel glass-strong">
      <p>{product.displayName||product.name}{variant?' · '+variant.strength:''} · {storeMoney(selection.priceCents,region)}</p>
      <button type="button" className="clone-touch-button" disabled={disabled} tabIndex={visible?0:-1} onClick={async()=>{
        const current=purchaseSelection(detail,product,cartVials);
        if(disabled||!current.variant)return;
        if(await add(current.variant,current.quantity))setAdded(true);
      }}>{label}</button>
    </div>
  </div>;
}
