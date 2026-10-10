import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,act} from 'react';
import {createRoot} from 'react-dom/client';
import {Window} from 'happy-dom';
import {useSurfaceMotion} from '../components/surface-motion';

test('drawer exits survive document dismissal, reopen safely and honor reduced motion',async()=>{
  const window=new Window(),keys=['window','document','HTMLElement','Node','matchMedia','IS_REACT_ACT_ENVIRONMENT'];
  const original=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  let reduced=false;
  Object.assign(globalThis,{window,document:window.document,HTMLElement:window.HTMLElement,Node:window.Node,matchMedia:()=>({matches:reduced}),IS_REACT_ACT_ENVIRONMENT:true});
  const host=window.document.createElement('div');window.document.body.append(host);const root=createRoot(host as unknown as HTMLElement);
  let control:ReturnType<typeof useSurfaceMotion<'cart'|'canada-filters'|null>>;
  function Probe(){control=useSurfaceMotion<'cart'|'canada-filters'|null>();return createElement('div',{'data-surface':control.surface||'none','data-closing':String(control.closing)});}
  const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
  try{
    await act(()=>root.render(createElement(Probe)));
    await act(()=>control.setSurface('cart'));
    await act(()=>{control.setSurface(null);control.setSurface(previous=>previous);});
    assert.equal(host.firstElementChild?.getAttribute('data-surface'),'cart');assert.equal(host.firstElementChild?.getAttribute('data-closing'),'true');
    await act(()=>pause(330));assert.equal(host.firstElementChild?.getAttribute('data-surface'),'none');
    await act(()=>control.setSurface('canada-filters'));await act(()=>control.setSurface(null));
    await act(()=>control.setSurface('cart'));await act(()=>pause(280));assert.equal(host.firstElementChild?.getAttribute('data-surface'),'cart');assert.equal(host.firstElementChild?.getAttribute('data-closing'),'false');
    reduced=true;await act(()=>control.setSurface(null));assert.equal(host.firstElementChild?.getAttribute('data-surface'),'none');
  }finally{await act(()=>root.unmount());await window.happyDOM.cancelAsync();for(const key of keys){const descriptor=original.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
