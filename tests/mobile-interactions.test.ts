import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {installProductGalleries,syncProductGallery,imageScopeForExpansion} from '../components/product-gallery';
import {installHeroTouches,installTouchFeedback,installSectionTracking} from '../components/mobile-interactions';
import {prepareHtml,readPage,products} from '../lib/catalog';
import {installCalculators} from '../components/calculators';
import {updateVialSummary} from '../components/product-discount';

function dom(html:string){
  const window=new Window();window.document.body.innerHTML=html;
  Object.assign(globalThis,{Element:window.Element,HTMLElement:window.HTMLElement});
  const root=window.document.body as unknown as HTMLElement;
  const pointer=(target:Element,type:string,x:number,y:number,extra:Record<string,unknown>={})=>target.dispatchEvent(new window.PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:1,isPrimary:true,button:0,buttons:1,clientX:x,clientY:y,...extra}) as unknown as Event);
  return {window,root,pointer};
}
function gallery(){
  const fixture=dom(prepareHtml(readPage('/products/retatrutide')!));
  const container=fixture.root.querySelector<HTMLElement>('[data-product-detail]')!;
  const track=container.querySelector<HTMLElement>('[data-product-gallery-track]')!;
  // Happy DOM models DOM/events but not the browser's native pointer capture.
  const captured=new Set<number>();track.setPointerCapture=id=>{captured.add(id);};track.hasPointerCapture=id=>captured.has(id);track.releasePointerCapture=id=>{captured.delete(id);};
  let opened=0;container.addEventListener('click',event=>{if((event.target as Element).closest('[data-action="expand-image"]'))opened++;});
  const cleanup=installProductGalleries(fixture.root);
  return {...fixture,container,track,captured,opened:()=>opened,cleanup};
}

test('touch swipe advances to the certificate and suppresses the following native click',()=>{
  const g=gallery();g.pointer(g.track,'pointerdown',270,250);g.pointer(g.track,'pointermove',160,255);
  assert.equal(g.track.parentElement?.dataset.galleryDragging,'true');assert.match(g.track.style.transform,/-110px/);
  g.pointer(g.track,'pointerup',160,255);assert.equal(g.track.dataset.slide,'1');assert.equal(g.captured.size,0);
  const clicked=g.track.dispatchEvent(new g.window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}) as unknown as Event);
  assert.equal(clicked,false);assert.equal(g.opened(),0);g.cleanup();
});
test('a touch tap on the captured certificate opens it exactly once',()=>{
  const g=gallery();syncProductGallery(g.container,1);g.pointer(g.track,'pointerdown',150,250);g.pointer(g.track,'pointerup',150,250);
  g.track.dispatchEvent(new g.window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}) as unknown as Event);
  assert.equal(g.opened(),1);g.cleanup();
});
test('vertical touch scrolling restores the gallery without advancing or opening',()=>{
  const g=gallery();syncProductGallery(g.container,1);g.pointer(g.track,'pointerdown',150,250);g.pointer(g.track,'pointermove',154,340);g.pointer(g.track,'pointerup',154,340);
  assert.equal(g.track.dataset.slide,'1');assert.equal(g.opened(),0);assert.equal(g.captured.size,0);assert.equal(g.track.parentElement?.dataset.galleryDragging,undefined);g.cleanup();
});
test('browser scroll/pinch cancellation and lost capture never navigate or open',()=>{
  for(const reason of ['pointercancel','lostpointercapture']){const g=gallery();syncProductGallery(g.container,1);g.pointer(g.track,'pointerdown',250,250);g.pointer(g.track,'pointermove',140,251);g.pointer(g.track,reason,140,251);g.pointer(g.track,'pointerup',140,251);assert.equal(g.track.dataset.slide,'1');assert.equal(g.opened(),0);assert.equal(g.captured.size,0);g.cleanup();}
});
test('a second finger cancels a gallery drag or tap and preserves native pinch zoom',()=>{
  for(const drag of [false,true]){const g=gallery();syncProductGallery(g.container,1);g.pointer(g.track,'pointerdown',250,250);if(drag)g.pointer(g.track,'pointermove',140,251);g.pointer(g.track,'pointerdown',280,300,{pointerId:2,isPrimary:false});g.pointer(g.track,'pointerup',140,251);assert.equal(g.track.dataset.slide,'1');assert.equal(g.opened(),0);assert.equal(g.captured.size,0);g.cleanup();}
});
test('touch navigation reaches every structure and sequence and stops at gallery edges',()=>{
  const g=gallery();for(let i=0;i<5;i++){g.pointer(g.track,'pointerdown',250,250);g.pointer(g.track,'pointermove',130,251);g.pointer(g.track,'pointerup',130,251);}
  assert.equal(g.track.dataset.slide,'3');assert.equal(g.container.querySelector<HTMLElement>('[data-slide="next"]')?.hidden,true);
  for(let i=0;i<5;i++){g.pointer(g.track,'pointerdown',100,250);g.pointer(g.track,'pointermove',230,251);g.pointer(g.track,'pointerup',230,251);}
  assert.equal(g.track.dataset.slide,'0');assert.equal(g.container.querySelector<HTMLElement>('[data-slide="previous"]')?.hidden,true);assert.equal(g.opened(),0);g.cleanup();
});
test('changing to an untested strength retains diagrams and omits its certificate',()=>{
  const g=gallery();syncProductGallery(g.container,2);g.track.children[1].setAttribute('hidden','');g.container.dispatchEvent(new g.window.Event('clone:variant-change') as unknown as Event);
  assert.equal(g.track.dataset.slide,'2');assert.match(g.track.style.transform,/-100%/);assert.equal(g.container.querySelector<HTMLElement>('[data-gallery-dot][data-slide="1"]')?.hidden,true);g.cleanup();
});
test('touch button feedback clears on cancellation and lets a native tap act once',()=>{
  const d=dom('<button class="[&.touch-active]:scale-[0.97]">Add</button><button disabled class="[&.touch-active]:scale-[0.97]">Disabled</button>');
  const button=d.root.querySelector('button')!;let clicks=0;button.addEventListener('click',()=>clicks++);const cleanup=installTouchFeedback(d.root);
  d.pointer(button,'pointerdown',10,10);assert.equal(button.classList.contains('touch-active'),true);d.pointer(button,'pointercancel',10,10);assert.equal(button.classList.contains('touch-active'),false);assert.equal(clicks,0);
  d.pointer(button,'pointerdown',10,10);d.pointer(button,'pointerup',10,10);button.click();assert.equal(clicks,1);assert.equal(button.classList.contains('touch-active'),false);
  const disabled=d.root.querySelectorAll('button')[1];d.pointer(disabled,'pointerdown',10,10);assert.equal(disabled.classList.contains('touch-active'),false);cleanup();
});

test('regional discount previews include saved cart vials and selected packs without stale tiers',()=>{
  for(const region of ['us','ca'] as const){
    const d=dom(prepareHtml(readPage('/products/retatrutide',region)!,region)),detail=d.root.querySelector<HTMLElement>('[data-product-detail]')!;
    const quantity=detail.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')!,summary=detail.querySelector<HTMLElement>('[data-vial-summary]')!,next=detail.querySelector<HTMLElement>('[data-vial-next]')!,after=detail.querySelector<HTMLElement>('[data-vial-after]')!;
    detail.dataset.cartVials='2';detail.dataset.pack='1';quantity.value='1';updateVialSummary(detail);
    assert.match(summary.textContent!,/^3 vials \(2 in your cart \+ 1 here\) — 5% off/);assert.match(next.textContent!,/Add 2 more vials for 10%/);assert.equal(after.textContent,'After that, 20% at 10 vials.');
    detail.dataset.pack='5';quantity.value='2';updateVialSummary(detail);assert.match(summary.textContent!,/^12 vials \(2 in your cart \+ 10 here\) — 20% off/);assert.equal(next.hidden,true);assert.equal(after.hidden,true);
    detail.dataset.cartVials='0';detail.dataset.pack='1';quantity.value='1';updateVialSummary(detail);assert.equal(summary.textContent,'1 vial — no vial discount yet.');assert.equal(summary.parentElement?.classList.contains('clone-vial-earned'),false);assert.equal(next.hidden,false);assert.equal(after.hidden,false);assert.match(after.textContent!,/10% at 5 vials, 20% at 10 vials/);
  }
});

test('portal cart buttons receive touch feedback without duplicating native clicks',()=>{
  const d=dom('<button class="clone-touch-button"><span>Continue Shopping</span></button>'),button=d.root.querySelector<HTMLButtonElement>('button')!;
  const cleanup=installTouchFeedback(d.root);let clicks=0;button.addEventListener('click',()=>clicks++);
  d.pointer(button.firstElementChild!,'pointerdown',10,10);assert.equal(button.classList.contains('touch-active'),true);d.pointer(button,'pointerup',10,10);button.click();assert.equal(clicks,1);assert.equal(button.classList.contains('touch-active'),false);cleanup();
});
test('hero touch lifts the pointed vial and clears the preview 700ms after release',async()=>{
  const d=dom(prepareHtml(readPage('/')!));const vial=d.root.querySelector<HTMLElement>('[data-vial]')!;
  d.window.document.elementFromPoint=()=>vial as never;const cleanup=installHeroTouches(d.root);
  d.pointer(vial,'pointerdown',120,400);assert.equal(vial.dataset.vialActive,'true');d.pointer(vial,'pointerup',120,400);assert.equal(vial.dataset.vialActive,'true');
  await new Promise(resolve=>setTimeout(resolve,720));assert.equal(vial.dataset.vialActive,undefined);cleanup();
});
test('both stores expand the certificate beside a nested toolbar',()=>{
  for(const region of ['us','ca'] as const){
    const d=dom(prepareHtml(readPage('/products/retatrutide',region)!));
    const trigger=Array.from(d.root.querySelectorAll<HTMLElement>('button[data-action="expand-image"]')).find(button=>button.textContent?.trim()==='Expand')!;
    assert.ok(trigger);const scope=imageScopeForExpansion(trigger),image=scope?.querySelector('img');
    assert.match(image?.alt||'',/certificate|certificate of analysis/i);assert.match(image?.getAttribute('src')||'',/^\/reference\//);
    const expected=products(region).find(product=>product.slug==='retatrutide')?.certificates.find(certificate=>certificate.strength==='10mg')?.image;
    assert.equal(image?.getAttribute('src'),expected,'the toolbar resolves the selected product certificate');
    assert.equal(imageScopeForExpansion(d.root.querySelector('[data-action="cart"]')!),null,'an unrelated control must not expand a product image');
  }
});

test('the phone calculator section toggle is independent of content accordions',()=>{
  for(const region of ['us','ca'] as const){
    const d=dom(prepareHtml(readPage('/peptide-calculator',region)!));const toggle=d.root.querySelector('[aria-controls="section-rail"]')!;
    assert.equal(toggle.getAttribute('data-action'),'sections');const links=d.root.querySelectorAll('[data-action="section-link"]');assert.equal(links.length,region==='ca'?5:7);for(const link of links)assert.ok(d.root.querySelector(link.getAttribute('href')!));
  }
});
test('phone section labels follow the reference intersection band and selected links',()=>{
  const d=dom(prepareHtml(readPage('/peptide-calculator')!));const previous=globalThis.IntersectionObserver;
  let notify:IntersectionObserverCallback,options:IntersectionObserverInit|undefined;
  class Observer{constructor(callback:IntersectionObserverCallback,init?:IntersectionObserverInit){notify=callback;options=init;}observe(){}disconnect(){}}
  Object.assign(globalThis,{IntersectionObserver:Observer});
  try{let active='';const cleanup=installSectionTracking(d.root,id=>active=id);
    assert.equal(options?.rootMargin,'-15% 0px -70% 0px');
    const sequence=d.root.querySelector('#sequence')!,aliquots=d.root.querySelector('#aliquots')!;
    notify!([{target:aliquots,intersectionRatio:.01},{target:sequence,intersectionRatio:.03}] as IntersectionObserverEntry[],{} as IntersectionObserver);
    assert.equal(active,'sequence');assert.equal(d.root.querySelector('[data-action="sections"]')?.nextElementSibling?.textContent,'Sequence MW · pI');
    aliquots.getBoundingClientRect=()=>({top:-500,bottom:150,height:650}) as DOMRect;
    sequence.getBoundingClientRect=()=>({top:150,bottom:550,height:400}) as DOMRect;
    notify!([{target:aliquots,intersectionRatio:.1},{target:sequence,intersectionRatio:.01}] as IntersectionObserverEntry[],{} as IntersectionObserver);
    assert.equal(active,'sequence','fresh geometry must override stale ratios for long scrolling sections');
    // Browser CustomEvent permits primitive detail; Happy DOM's type restricts it to object.
    d.root.dispatchEvent(new d.window.CustomEvent('clone:section-change',{detail:'molarity' as unknown as object}) as unknown as Event);
    assert.equal(active,'molarity');assert.equal(d.root.querySelector('[data-action="section-link"][aria-current=true]')?.getAttribute('href'),'#molarity');cleanup();
  }finally{Object.assign(globalThis,{IntersectionObserver:previous});}
});
test('Canadian calculator section selection updates its phone label and active link',()=>{
  const d=dom(prepareHtml(readPage('/peptide-calculator','ca')!)),previous=globalThis.IntersectionObserver;
  class Observer{observe(){}disconnect(){}}
  Object.assign(globalThis,{IntersectionObserver:Observer});
  try{
    let active='';const cleanup=installSectionTracking(d.root,id=>active=id);
    d.root.dispatchEvent(new d.window.CustomEvent('clone:section-change',{detail:'sequence' as unknown as object}) as unknown as Event);
    assert.equal(active,'sequence');assert.equal(d.root.querySelector('[data-action="sections"]')?.nextElementSibling?.textContent,'Sequence Properties');
    assert.equal(d.root.querySelector('[data-action="sections"]')?.nextElementSibling?.nextElementSibling?.textContent,'5 of 5');
    assert.equal(d.root.querySelector('[data-action="section-link"][aria-current=true]')?.getAttribute('href'),'#sequence');cleanup();
  }finally{Object.assign(globalThis,{IntersectionObserver:previous});}
});
test('touching the sequence graph previews charge without changing the chosen buffer pH',()=>{
  const d=dom(prepareHtml(readPage('/peptide-calculator')!));Object.assign(globalThis,{document:d.window.document});const cleanup=installCalculators(d.root);
  const section=d.root.querySelector<HTMLElement>('#sequence')!,graph=section.querySelector('svg[role="img"]')!.parentElement!;
  const slider=section.querySelector<HTMLInputElement>('input[aria-label="Buffer pH"]')!,before=slider.value;
  graph.getBoundingClientRect=()=>({left:100,width:200}) as DOMRect;
  d.pointer(graph,'pointerdown',150,50);assert.equal(slider.value,before);assert.match(graph.querySelector('svg')!.getAttribute('aria-label')!,/At pH 3\.5/);
  d.pointer(graph,'pointercancel',150,50);assert.equal(slider.value,before);assert.ok(graph.querySelector('svg')!.getAttribute('aria-label')!.includes('At pH '+Number(before).toFixed(1)));cleanup();
});
