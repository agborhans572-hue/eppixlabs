/** Touch feedback uses native clicks, so a tap can never submit an action twice. */
export function installTouchFeedback(root:HTMLElement){
  let pressed:HTMLButtonElement|null=null;
  const clear=()=>{pressed?.classList.remove('touch-active');pressed=null;};
  const show=(target:EventTarget|null)=>{
    const button=target instanceof Element?target.closest<HTMLButtonElement>('button'):null;
    if(button===pressed)return;
    clear();
    if(button&&root.contains(button)&&!button.disabled&&button.className.includes('touch-active')){pressed=button;pressed.classList.add('touch-active');}
  };
  const down=(event:PointerEvent)=>{if(event.pointerType==='touch'&&event.isPrimary)show(event.target);};
  const move=(event:PointerEvent)=>{if(event.pointerType==='touch'&&event.isPrimary&&event.buttons)show(root.ownerDocument.elementFromPoint(event.clientX,event.clientY));};
  root.addEventListener('pointerdown',down,true);root.addEventListener('pointermove',move,true);
  root.addEventListener('pointerup',clear,true);root.addEventListener('pointercancel',clear,true);
  return()=>{clear();root.removeEventListener('pointerdown',down,true);root.removeEventListener('pointermove',move,true);root.removeEventListener('pointerup',clear,true);root.removeEventListener('pointercancel',clear,true);};
}

/** Match the reference's vial lift, label reveal and 700ms touch-release delay. */
export function installHeroTouches(root:HTMLElement){
  const links=Array.from(root.querySelectorAll<HTMLElement>('[data-vial]'));
  if(!links.length)return()=>{};
  const group=links[0].parentElement?.parentElement?.parentElement;
  if(!group)return()=>{};
  let timer:ReturnType<typeof setTimeout>|undefined;
  const clear=()=>links.forEach(link=>delete link.dataset.vialActive);
  const highlight=(event:PointerEvent)=>{
    if(event.pointerType!=='touch'||!event.isPrimary)return;
    const link=root.ownerDocument.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-vial]');
    if(!link||!links.includes(link))return;
    clearTimeout(timer);clear();link.dataset.vialActive='true';
  };
  const end=(event:PointerEvent)=>{if(event.pointerType!=='touch')return;clearTimeout(timer);timer=setTimeout(clear,700);};
  group.addEventListener('pointerdown',highlight);group.addEventListener('pointermove',highlight);
  group.addEventListener('pointerup',end);group.addEventListener('pointercancel',end);
  return()=>{clearTimeout(timer);clear();group.removeEventListener('pointerdown',highlight);group.removeEventListener('pointermove',highlight);group.removeEventListener('pointerup',end);group.removeEventListener('pointercancel',end);};
}

/** Keep desktop links and the phone section label in sync with scroll position. */
export function installSectionTracking(root:HTMLElement,change:(id:string)=>void){
  const links=Array.from(root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Jump to"] a[href^="#"]'));
  const sections=links.map(link=>root.querySelector<HTMLElement>(link.getAttribute('href')!));
  const toggle=root.querySelector<HTMLElement>('[data-action="sections"]');
  if(!links.length)return()=>{};
  let previous='';
  const update=(index:number)=>{
    const id=links[index].hash.slice(1);
    if(id===previous)return;previous=id;
    links.forEach((link,i)=>{link.classList.remove('bg-brand-500','border-brand-500','text-white','shadow-soft');link.classList.toggle('clone-section-current',i===index);if(i===index)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
    if(toggle?.nextElementSibling)toggle.nextElementSibling.textContent=links[index].textContent;
    if(toggle?.nextElementSibling?.nextElementSibling)toggle.nextElementSibling.nextElementSibling.textContent=(index+1)+' of '+links.length;
    change(id);
  };
  const ratios=new Map<string,number>();
  const view=root.ownerDocument.defaultView!;
  let animation=0;
  const visible=()=>{
    let index=-1,best=0;const top=view.innerHeight*.15,bottom=view.innerHeight*.3;
    sections.forEach((section,i)=>{if(!section)return;const box=section.getBoundingClientRect();const ratio=box.height?Math.max(0,Math.min(bottom,box.bottom)-Math.max(top,box.top))/box.height:ratios.get(section.id)||0;if(ratio>best){best=ratio;index=i;}});
    if(index>=0)update(index);
  };
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>ratios.set(entry.target.id,entry.intersectionRatio));
    visible();
  },{rootMargin:'-15% 0px -70% 0px',threshold:[0,.25,.5,1]});
  sections.forEach(section=>{if(section)observer.observe(section);});
  const selected=(event:Event)=>{const index=sections.findIndex(section=>section?.id===(event as CustomEvent<string>).detail);if(index>=0)update(index);};
  // Long sections may never cross the observer's next ratio threshold during a smooth scroll.
  const scroll=()=>{view.cancelAnimationFrame(animation);animation=view.requestAnimationFrame(visible);};
  view.addEventListener('scroll',scroll,{passive:true});view.addEventListener('resize',scroll);
  root.addEventListener('clone:section-change',selected);update(0);
  return()=>{observer.disconnect();view.cancelAnimationFrame(animation);view.removeEventListener('scroll',scroll);view.removeEventListener('resize',scroll);root.removeEventListener('clone:section-change',selected);};
}
