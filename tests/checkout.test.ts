import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkoutQuote,checkoutSchema,publicReceipt,requireCheckoutQuote,type StoredOrder} from '../lib/checkout';
import {orderEmails,notifyOrder} from '../lib/order-mail';
import {businessEmail} from '../lib/contact';
import type {Product} from '../lib/types';
import {prepareHtml,readPage} from '../lib/catalog';
const catalog=JSON.parse(readFileSync('reference/catalog.json','utf8')) as Product[];
const variant=catalog.flatMap(p=>p.comingSoon?[]:p.variants).find(v=>v.available&&v.stock>=10&&v.packSize===1&&v.priceCents<20000)!;
const quote=checkoutQuote([{variantId:variant.id,quantity:1}],catalog);
const input={idempotencyKey:'f9c26cb9-7daa-4f47-9f20-361cb34f1f6b',quoteId:quote.quoteId,firstName:'Jane',lastName:'Researcher',email:'research@example.com',phone:'555-555-0100',billing:{line1:'123 Test St',line2:'',city:'Austin',state:'Texas',postalCode:'78701'},paymentMethod:'paypal',researchOnly:true,termsAccepted:true,notes:'',role:'',company:''};
test('checkout validates contact, addresses, payment preference and consent; rejects client totals',()=>{
  for(const paymentMethod of ['paypal','apple_pay','crypto','zelle'])assert.equal(checkoutSchema.safeParse({...input,paymentMethod}).success,true);
  for(const extra of [{paymentMethod:'card'},{paymentMethod:'wire'},{termsAccepted:false},{researchOnly:false},{email:'bad'},{totalCents:1},{company:'bot'},{billing:{...input.billing,postalCode:'bad'}},{shipping:{...input.billing,state:'Ontario'}}])assert.equal(checkoutSchema.safeParse({...input,...extra}).success,false);
});
test('checkout prices shipping after discount and preserves strict over-$200 threshold',()=>{
  assert.equal(quote.shippingCents,2000);assert.equal(quote.totalCents,quote.cart.totalCents+2000);
  const product={...catalog.find(p=>p.variants.some(v=>v.id===variant.id))!,variants:[{...variant,priceCents:20000}]};
  assert.equal(checkoutQuote([{variantId:variant.id,quantity:1}],[product]).shippingCents,2000);
  product.variants[0].priceCents=20001;assert.equal(checkoutQuote([{variantId:variant.id,quantity:1}],[product]).shippingCents,0);
});
test('empty carts, stock changes and stale price quotes block checkout',()=>{
  assert.throws(()=>requireCheckoutQuote(checkoutQuote([],catalog),quote.quoteId),/empty/);
  assert.throws(()=>requireCheckoutQuote(quote,'0'.repeat(64)),/changed/);
  const unavailable=catalog.map(p=>({...p,variants:p.variants.map(v=>v.id===variant.id?{...v,stock:0}:v)}));
  const changed=checkoutQuote([{variantId:variant.id,quantity:1}],unavailable);assert.throws(()=>requireCheckoutQuote(changed,changed.quoteId),/unavailable/);
});
const order:StoredOrder={kind:'order',ownerKey:'private-owner',input:checkoutSchema.parse(input),inputHash:'private-hash',number:'EPP-TEST-123',createdAt:'2026-10-12T09:00:00Z',status:'awaiting_payment',email:input.email,paymentMethod:'paypal',quote,customerEmail:'unavailable',teamEmail:'unavailable'};
test('receipts omit private customer addresses, owner and request keys',()=>{
  const receipt=publicReceipt(order);assert.equal(receipt.status,'awaiting_payment');assert.doesNotMatch(JSON.stringify(receipt),/private-owner|private-hash|123 Test St|idempotencyKey/);
});
test('emails route the payment instructions task to the shop and never claim payment was collected',()=>{
  const emails=orderEmails({...order,paymentMethod:'apple_pay'});assert.deepEqual(emails.team.to,[businessEmail]);assert.deepEqual(emails.customer.to,[input.email]);assert.equal(emails.team.reply_to,input.email);
  assert.match(emails.team.text,/ACTION: Send payment instructions/);assert.match(emails.team.text,/compatible payment link/);assert.match(emails.customer.text,/CHECK YOUR EMAIL FOR PAYMENT DETAILS/);assert.match(emails.customer.text,/No payment has been taken/);
});
test('email delivery uses stable retry keys and reports independent provider failures',async()=>{
  const calls:RequestInit[]=[];const provider=(async(_url,init)=>{calls.push(init!);return calls.length%2?Response.json({id:'mail'}):Response.json({error:'failed'},{status:500});}) as typeof fetch;
  const statuses=await notifyOrder(order,'test-secret',provider);assert.deepEqual(statuses,{customerEmail:'sent',teamEmail:'unavailable'});
  await notifyOrder(order,'test-secret',provider);assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),new Headers(calls[2].headers).get('Idempotency-Key'));
  assert.deepEqual(await notifyOrder(order,''),{customerEmail:'unavailable',teamEmail:'unavailable'});
});
test('storefront payment copy agrees with the manual checkout and removes card acceptance claims',()=>{
  const html=prepareHtml(readPage('/')!);assert.match(html,/Card payments are currently unavailable/);assert.match(html,/Which payment methods can I choose/);assert.doesNotMatch(html,/processed on a hosted checkout page|We accept Visa, Mastercard/);
});
