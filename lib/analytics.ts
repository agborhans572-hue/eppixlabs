'use client';
import {track} from '@vercel/analytics';

type EventValue=string|number|boolean|null;
type AnalyticsWindow=Window&{gtag?:(command:string,name:string,properties:Record<string,EventValue>)=>void};

// Never include customer details, free-text form fields, or search queries.
// Analytics failures must not interrupt cart or checkout operations.
export function trackCommerce(name:string,properties:Record<string,EventValue>) {
  if(typeof window==='undefined')return;
  try{track(name,properties);}catch{/* Optional analytics may be blocked. */}
  try{(window as AnalyticsWindow).gtag?.('event',name,properties);}catch{/* Existing GA integration is optional. */}
}

export function trackSubmittedOrder(number:string,properties:Record<string,EventValue>) {
  try{
    const key='eppix-tracked-order:'+properties.region;
    if(sessionStorage.getItem(key)===number)return;
    sessionStorage.setItem(key,number);
  }catch{/* Storage is not required to place an order. */}
  // This is a lead awaiting payment, not paid purchase revenue.
  trackCommerce('order_submitted',{...properties,status:'awaiting_payment'});
}
