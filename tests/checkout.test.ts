import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkoutQuote,checkoutSchema,canadianCheckoutSchema,publicReceipt,requireCheckoutQuote,type StoredOrder} from '../lib/checkout';
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
test('homepages retain their original payment presentation',()=>{
  for(const region of ['us','ca'] as const){const html=prepareHtml(readPage('/',region)!,region);assert.doesNotMatch(html,/Card payments (?:are currently )?unavailable/i);assert.match(html,/Visa, Mastercard/);}
});
test('Canadian addresses accept every province and normalize postal codes without accepting US addresses',()=>{
  const billing={line1:'123 Test St',city:'Ottawa',state:'Ontario',postalCode:'k1a0b1'};
  const result=canadianCheckoutSchema.parse({...input,billing});assert.equal(result.billing.postalCode,'K1A 0B1');
  for(const patch of [{postalCode:'00000'},{postalCode:'D1A 1A1'},{state:'Texas'},{state:'Unknown'}])assert.equal(canadianCheckoutSchema.safeParse({...input,billing:{...billing,...patch}}).success,false);
  assert.equal(checkoutSchema.safeParse({...input,billing}).success,false);
});
test('Canadian checkout prices its regional variants in CAD and emails Canadian address and currency',()=>{
  const ca=JSON.parse(readFileSync('reference/canada/catalog.json','utf8')) as Product[],variant=ca.flatMap(p=>p.comingSoon?[]:p.variants).find(v=>v.available&&v.packSize===1)!;
  const quote=checkoutQuote([{variantId:variant.id,quantity:1}],ca,'ca');assert.equal(quote.cart.currency,'CAD');assert.equal(quote.cart.region,'ca');assert.equal(quote.cart.checkoutAvailable,true);
  assert.throws(()=>checkoutQuote([{variantId:variant.id,quantity:1}],ca,'us'));
  const orderInput=canadianCheckoutSchema.parse({...input,quoteId:quote.quoteId,billing:{line1:'Test address',city:'Ottawa',state:'Ontario',postalCode:'K1A 0B1'}});
  const emails=orderEmails({...order,input:orderInput,quote});assert.match(emails.customer.text,/Canada/);assert.match(emails.customer.text,/CAD/);assert.doesNotMatch(emails.customer.text,/USD|United States/);assert.match(emails.team.text,/Store: Canada/);
});
test('Canadian payment pages expose active manual choices without old transfer discounts or disabled checkout copy',()=>{
  for(const route of ['/payment-methods','/shipping','/terms']){
    const html=prepareHtml(readPage(route,'ca')!,'ca');assert.doesNotMatch(html,/payments are not configured|checkout is unavailable|Visa, Mastercard, (?:Amex|American Express)|Pay by E-Transfer and save an extra 5%|up to 25% when paying|orders@eppix\.ca/i);
    if(route==='/payment-methods'){assert.match(html,/PayPal, Apple Pay, crypto, or Zelle/);assert.match(html,/quoted in CAD/);assert.match(html,/eligible US bank accounts/);assert.match(html,/href="\/ca\/collections\/peptides"/);}
    if(route==='/terms')assert.doesNotMatch(html,/Accepted cards:|Inventory reserved for 60 minutes|Discount applied automatically at checkout/);
  }
});
