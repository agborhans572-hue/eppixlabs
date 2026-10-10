'use client';

import {useCallback,useEffect,useRef,useState,type SetStateAction} from 'react';

const exitTimes:Record<string,number>={cart:300,sections:200,'canada-filters':250};

/** Retain a closing drawer until its exit completes, including its scroll/focus lock. */
export function useSurfaceMotion<T extends string|null>(){
  const [surface,render]=useState<T>(null as T),[closing,setClosing]=useState(false);
  const current=useRef<T>(null as T),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const setSurface=useCallback((action:SetStateAction<T>)=>{
    const next=typeof action==='function'?action(current.current):action;
    // Document-level popover dismissal also sees drawer clicks. Its unchanged
    // functional update must not cancel an exit that the close button started.
    if(typeof action==='function'&&next===current.current)return;
    clearTimeout(timer.current);
    const duration=current.current?exitTimes[current.current]||0:0;
    if(next===null&&duration&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      setClosing(true);
      timer.current=setTimeout(()=>{current.current=null as T;render(null as T);setClosing(false);},duration);
    }else{current.current=next;render(next);setClosing(false);}
  },[]);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  return {surface,setSurface,closing};
}
