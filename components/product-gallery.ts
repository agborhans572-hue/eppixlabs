import {galleryGesture,galleryPosition} from '@/lib/gallery';

const transition='transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)';
const slidesFor=(track:HTMLElement)=>Array.from(track.children) as HTMLElement[];

export function syncProductGallery(container:HTMLElement,index?:number){
  const track=container.querySelector<HTMLElement>('[data-product-gallery-track]');
  if(!track)return;
  const all=slidesFor(track),visible=all.filter(slide=>!slide.hidden);
  let selected=all[index??Number(track.dataset.slide||0)];
  if(!selected||selected.hidden)selected=visible[0];
  const position=visible.indexOf(selected),stableIndex=all.indexOf(selected);
  track.dataset.slide=String(stableIndex);
  track.style.transition=transition;
  track.style.transform=`translateX(calc(${-Math.max(0,position)*100}% + 0px))`;
  all.forEach(slide=>{slide.inert=slide!==selected;slide.setAttribute('aria-hidden',String(slide!==selected));});
  container.querySelectorAll<HTMLElement>('[data-gallery-dot]').forEach(dot=>{
    const slide=all[Number(dot.dataset.slide)],active=slide===selected;
    dot.hidden=!slide||slide.hidden;
    if(dot.getAttribute('role')==='tab'){
      dot.setAttribute('aria-selected',String(active));dot.tabIndex=active?0:-1;
      dot.classList.toggle('clone-gallery-tab-selected',active);
      dot.classList.remove('border-brand-400','dark:border-brand-500','ring-1','ring-brand-400/40');
      const label=dot.querySelector<HTMLElement>('span:last-child');label?.classList.remove('text-brand-600','dark:text-brand-400');
    }else dot.classList.remove('w-6','bg-brand-500');
    dot.classList.toggle('clone-slide-selected',active&&dot.getAttribute('role')!=='tab');
    dot.setAttribute('aria-pressed',String(active));
    if(slide&&!slide.hidden&&dot.getAttribute('role')!=='tab')dot.setAttribute('aria-label','Go to slide '+(visible.indexOf(slide)+1));
  });
  const previous=container.querySelector<HTMLElement>('[data-slide="previous"]');
  const next=container.querySelector<HTMLElement>('[data-slide="next"]');
  if(previous)previous.hidden=position<=0;
  if(next)next.hidden=position>=visible.length-1;
  const hint=container.querySelector<HTMLElement>('[data-gallery-expand-hint]');
  if(hint)hint.hidden=selected?.dataset.galleryKind!=='diagram';
}

export function installProductGalleries(root:HTMLElement){
  const cleanups:(()=>void)[]=[];
  root.querySelectorAll<HTMLElement>('[data-product-detail]').forEach(container=>{
    const track=container.querySelector<HTMLElement>('[data-product-gallery-track]');
    if(!track)return;
    const frame=track.parentElement!;
    let gesture:{id:number;x:number;y:number;time:number;dragging:boolean}|null=null;
    let suppressClickUntil=0;
    const current=()=>{const all=slidesFor(track),visible=all.filter(slide=>!slide.hidden);return {all,visible,position:visible.indexOf(all[Number(track.dataset.slide||0)])};};
    const move=(delta:number)=>{const {all,visible,position}=current();syncProductGallery(container,all.indexOf(visible[galleryPosition(position,delta,visible.length)]));};
    const release=(id:number)=>{if(track.hasPointerCapture(id))track.releasePointerCapture(id);};
    const reset=()=>{gesture=null;delete frame.dataset.galleryDragging;syncProductGallery(container);};
    const down=(event:PointerEvent)=>{
      // A second finger belongs to browser pinch zoom, never a gallery tap or swipe.
      if(event.isPrimary===false){if(gesture){const id=gesture.id;reset();release(id);suppressClickUntil=performance.now()+500;}return;}
      if(event.pointerType==='mouse'&&event.button!==0||current().visible.length<=1)return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),dragging:false};
      track.setPointerCapture(event.pointerId);
    };
    const pointerMove=(event:PointerEvent)=>{
      if(!gesture||event.pointerId!==gesture.id)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.dragging&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>5){reset();release(event.pointerId);suppressClickUntil=performance.now()+500;return;}
      if(Math.abs(dx)>5)gesture.dragging=true;
      if(!gesture.dragging)return;
      frame.dataset.galleryDragging='true';
      track.style.transition='none';
      track.style.transform=`translateX(calc(${-current().position*100}% + ${dx}px))`;
      event.preventDefault();
    };
    const up=(event:PointerEvent)=>{
      if(!gesture||event.pointerId!==gesture.id)return;
      const started=gesture,{position,visible}=current();
      reset();release(event.pointerId);
      if(started.dragging){move(galleryGesture(event.clientX-started.x,event.clientY-started.y,performance.now()-started.time));}
      else visible[position]?.matches('[data-action="expand-image"]')&&visible[position].click();
      // Pointer capture retargets the native click to the track. A drag must not open a document.
      suppressClickUntil=performance.now()+500;
    };
    const cancel=(event:PointerEvent)=>{if(gesture&&event.pointerId===gesture.id){reset();release(event.pointerId);suppressClickUntil=performance.now()+500;}};
    const click=(event:MouseEvent)=>{
      const target=(event.target as HTMLElement).closest<HTMLElement>('[data-action="gallery"]');
      if(target&&container.contains(target)){
        event.preventDefault();event.stopPropagation();
        if(target.dataset.slide==='next')move(1);
        else if(target.dataset.slide==='previous')move(-1);
        else syncProductGallery(container,Number(target.dataset.slide));
      }else if(event.detail!==0&&track.contains(event.target as Node)&&performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();}
    };
    const keys=(event:KeyboardEvent)=>{if((event.target as HTMLElement).closest('[data-product-gallery-frame],[data-gallery-dot]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
      event.preventDefault();const {all,visible}=current();
      if(event.key==='Home'||event.key==='End')syncProductGallery(container,all.indexOf(visible[event.key==='Home'?0:visible.length-1]));
      else move(event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1);
      if((event.target as HTMLElement).getAttribute('role')==='tab')container.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({preventScroll:true});
    }};
    const variant=()=>{if(gesture)release(gesture.id);reset();};
    track.addEventListener('pointerdown',down);track.addEventListener('pointermove',pointerMove);
    track.addEventListener('pointerup',up);track.addEventListener('pointercancel',cancel);track.addEventListener('lostpointercapture',cancel);
    container.addEventListener('click',click,true);container.addEventListener('keydown',keys);container.addEventListener('clone:variant-change',variant);
    syncProductGallery(container);
    cleanups.push(()=>{if(gesture)release(gesture.id);track.removeEventListener('pointerdown',down);track.removeEventListener('pointermove',pointerMove);track.removeEventListener('pointerup',up);track.removeEventListener('pointercancel',cancel);track.removeEventListener('lostpointercapture',cancel);container.removeEventListener('click',click,true);container.removeEventListener('keydown',keys);container.removeEventListener('clone:variant-change',variant);});
  });
  return()=>cleanups.forEach(cleanup=>cleanup());
}

/** Follow the visible light/dark diagram with the reference's mouse magnification lens. */
export function installDiagramMagnifiers(root:HTMLElement,zoom=2.5,size=120){
  const cleanups:(()=>void)[]=[];
  root.querySelectorAll<HTMLElement>('[data-diagram-magnifier]').forEach(container=>{
    const lens=document.createElement('div');lens.className='clone-diagram-lens';lens.setAttribute('aria-hidden','true');lens.hidden=true;container.append(lens);
    let animation=0;
    const leave=()=>{cancelAnimationFrame(animation);lens.hidden=true;container.style.cursor='';};
    const move=(event:PointerEvent)=>{
      if(event.pointerType!=='mouse'||event.buttons||container.closest('[data-gallery-dragging]')){leave();return;}
      const image=Array.from(container.querySelectorAll<HTMLImageElement>('img')).find(image=>getComputedStyle(image).display!=='none');
      if(!image)return;
      cancelAnimationFrame(animation);
      animation=requestAnimationFrame(()=>{
        const box=container.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top,half=size/2;
        container.style.cursor='none';lens.hidden=false;
        lens.style.width=lens.style.height=size+'px';lens.style.left=(x-half)+'px';lens.style.top=(y-half)+'px';
        lens.style.backgroundImage=`url("${image.currentSrc||image.src}")`;
        lens.style.backgroundSize=`${box.width*zoom}px ${box.height*zoom}px`;
        lens.style.backgroundPosition=`${half-x*zoom}px ${half-y*zoom}px`;
      });
    };
    container.addEventListener('pointermove',move);container.addEventListener('pointerleave',leave);container.addEventListener('pointerdown',leave);
    cleanups.push(()=>{leave();container.removeEventListener('pointermove',move);container.removeEventListener('pointerleave',leave);container.removeEventListener('pointerdown',leave);lens.remove();});
  });
  return()=>cleanups.forEach(cleanup=>cleanup());
}
