import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,act} from 'react';
import {createRoot} from 'react-dom/client';
import {Window} from 'happy-dom';
import {StickyPurchaseBar,observePurchaseAnchor,purchaseSelection} from '../components/sticky-purchase-bar';
import {prepareHtml,readPage,products} from '../lib/catalog';
import {storeMoney,type StoreRegion} from '../lib/stores';
import {updateVialSummary} from '../components/product-discount';

function fixture(region:StoreRegion){
  const window=new Window();window.document.body.innerHTML=prepareHtml(readPage('/products/retatrutide',region)!,region);
  const detail=window.document.querySelector('[data-product-detail]') as unknown as HTMLElement;
  return {window,detail,product:products(region).find(product=>product.slug==='retatrutide')!};
}

for(const region of ['us','ca'] as const){
  test(`${region}: floating purchase uses the current strength, pack, quantity and regional discount`,()=>{
    const {detail,product}=fixture(region),input=detail.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')!;
    const variant=product.variants.find(variant=>variant.packSize===5)!;
    detail.dataset.strength=variant.strength;detail.dataset.pack='5';input.value='2';
    const selection=purchaseSelection(detail,product,0);
    assert.equal(selection.variant?.id,variant.id);assert.equal(selection.quantity,2);
    assert.equal(selection.priceCents,variant.priceCents-Math.round(variant.priceCents*.2));
    detail.dataset.pack='1';input.value='1';const single=purchaseSelection(detail,product,2);
    assert.equal(single.priceCents,single.variant!.priceCents-Math.round(single.variant!.priceCents*.05));
    input.value='not a number';assert.equal(purchaseSelection(detail,product,0).quantity,1);
  });
}

test('the bar observes the main purchase block, follows footer overlap and releases scroll listeners',()=>{
  const {window,detail}=fixture('ca');
  const original=Object.getOwnPropertyDescriptor(globalThis,'IntersectionObserver');
  let notify:(entries:{isIntersecting:boolean}[])=>void=()=>{},observed:Element|undefined,disconnected=false;
  class Observer{constructor(callback:typeof notify,options:IntersectionObserverInit){notify=callback;assert.equal(options.threshold,0);}observe(element:Element){observed=element;}disconnect(){disconnected=true;}}
  Object.assign(globalThis,{IntersectionObserver:Observer});
  let pending:FrameRequestCallback|undefined;Object.defineProperty(window,'requestAnimationFrame',{value:(callback:FrameRequestCallback)=>{pending=callback;return 1;}});window.cancelAnimationFrame=()=>{pending=undefined;};
  const changes:{visible:boolean;offset:number}[]=[];let footerTop=window.innerHeight+100;
  const footer=window.document.querySelector('footer')!;footer.getBoundingClientRect=()=>new window.DOMRect(0,footerTop,390,200);
  const cleanup=observePurchaseAnchor(detail,(visible,offset)=>changes.push({visible,offset}));
  try{
    assert.equal(observed,detail.querySelector('[data-action="add"]')!.parentElement);
    notify([{isIntersecting:false}]);assert.deepEqual(changes.at(-1),{visible:true,offset:0});
    notify([{isIntersecting:true}]);assert.deepEqual(changes.at(-1),{visible:false,offset:0});
    footerTop=window.innerHeight-140;notify([{isIntersecting:false}]);assert.deepEqual(changes.at(-1),{visible:true,offset:140});
    footerTop=window.innerHeight-220;window.dispatchEvent(new window.Event('scroll'));assert.ok(pending);pending!(0);assert.deepEqual(changes.at(-1),{visible:true,offset:220});
    cleanup();assert.equal(disconnected,true);pending=undefined;window.dispatchEvent(new window.Event('resize'));assert.equal(pending,undefined);
  }finally{cleanup();if(original)Object.defineProperty(globalThis,'IntersectionObserver',original);else Reflect.deleteProperty(globalThis,'IntersectionObserver');}
});

test('both regional bars synchronize options, submit one selected quantity, and disable unavailable or obscured controls',async()=>{
  const keys=['window','document','HTMLElement','Node','IntersectionObserver','IS_REACT_ACT_ENVIRONMENT'];
  const original=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const region of ['us','ca'] as const){
    const {window,detail,product}=fixture(region);let notify:(entries:{isIntersecting:boolean}[])=>void=()=>{};
    class Observer{constructor(callback:typeof notify){notify=callback;}observe(){}disconnect(){}}
    Object.assign(globalThis,{window,document:window.document,HTMLElement:window.HTMLElement,Node:window.Node,IntersectionObserver:Observer,IS_REACT_ACT_ENVIRONMENT:true});
    const host=window.document.createElement('div');window.document.body.append(host);const root=createRoot(host as unknown as HTMLElement);
    const calls:{id:string;quantity:number}[]=[];let success=false;
    const props={detail,product,region,cartVials:0,busy:false,suppressed:false,add:async(variant:{id:string},quantity:number)=>{calls.push({id:variant.id,quantity});return success;}};
    const render=(overrides:Partial<typeof props>={})=>root.render(createElement(StickyPurchaseBar,{...props,...overrides}));
    try{
      await act(()=>render());await act(()=>notify([{isIntersecting:false}]));
      const bar=host.querySelector('.clone-sticky-purchase')!,button=host.querySelector('button')!;
      assert.equal(bar.getAttribute('aria-hidden'),'false');assert.equal(button.tabIndex,0);
      const variant=product.variants.find(variant=>variant.packSize===5&&variant.available)!;
      await act(async()=>{detail.dataset.strength=variant.strength;detail.dataset.pack='5';detail.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')!.value='2';detail.dispatchEvent(new window.Event('clone:variant-change') as unknown as Event);});
      assert.ok(host.querySelector('p')!.textContent?.includes(variant.strength));
      assert.ok(host.querySelector('p')!.textContent?.includes(storeMoney(variant.priceCents-Math.round(variant.priceCents*.2),region)));
      await act(async()=>button.click());assert.deepEqual(calls,[{id:variant.id,quantity:2}]);assert.equal(button.textContent,'Add to Cart');
      success=true;await act(async()=>button.click());assert.equal(calls.length,2);assert.equal(button.textContent,'Added to Cart');
      const input=detail.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')!;
      const single=product.variants.find(candidate=>candidate.packSize===1&&candidate.strength===variant.strength)!;
      await act(()=>{detail.dataset.strength=single.strength;detail.dataset.pack='1';input.value='2';detail.dispatchEvent(new window.Event('clone:variant-change') as unknown as Event);});
      const increase=detail.querySelector('[data-action="quantity-up"]') as unknown as HTMLButtonElement;
      const delegate=(event:Event)=>{if(event.target===increase){event.stopPropagation();input.value=String(Number(input.value)+1);updateVialSummary(detail);}};detail.parentElement!.addEventListener('click',delegate);
      await act(()=>increase.click());assert.equal(input.value,'3');assert.ok(host.querySelector('p')!.textContent?.includes(storeMoney(single.priceCents-Math.round(single.priceCents*.05),region)));
      detail.parentElement!.removeEventListener('click',delegate);
      const normalize=()=>{input.value='5';updateVialSummary(detail);};detail.parentElement!.addEventListener('input',normalize);
      await act(()=>{input.value='4';input.dispatchEvent(new window.Event('input',{bubbles:true}) as unknown as Event);});
      assert.ok(host.querySelector('p')!.textContent?.includes(storeMoney(single.priceCents-Math.round(single.priceCents*.1),region)));detail.parentElement!.removeEventListener('input',normalize);
      await act(()=>notify([{isIntersecting:true}]));assert.equal(bar.getAttribute('aria-hidden'),'true');assert.equal(button.tabIndex,-1);assert.equal(bar.hasAttribute('inert'),true);
      await act(()=>{notify([{isIntersecting:false}]);render({suppressed:true});});assert.equal(bar.getAttribute('aria-hidden'),'true');
      await act(()=>render({busy:true}));assert.equal(button.disabled,true);assert.equal(button.textContent,'Adding…');await act(()=>button.click());assert.equal(calls.length,2);
      await act(()=>render({product:{...product,comingSoon:true}}));assert.equal(button.disabled,true);assert.equal(button.textContent,'Coming Soon');
      await act(()=>render({product:{...product,variants:product.variants.map(variant=>({...variant,available:false}))}}));assert.equal(button.disabled,true);assert.equal(button.textContent,'Out of Stock');
    }finally{await act(()=>root.unmount());await window.happyDOM.cancelAsync();}
  }
  for(const key of keys){const descriptor=original.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
});
