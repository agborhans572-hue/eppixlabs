import {businessEmail} from './contact';
import type {StoredOrder} from './checkout';
import {paymentMethods} from './checkout-options';
import {storeMoney} from './stores';

export function orderEmails(order:StoredOrder){
  const {input,quote}=order;
  const address=(a:typeof input.billing)=>[a.line1,a.line2,a.city+', '+a.state+' '+a.postalCode,'United States'].filter(Boolean).join('\n');
  const summary=[...quote.cart.items.map(i=>`${i.quantity} × ${i.product} — ${i.variant}: ${storeMoney(i.quantity*i.priceCents,'us')}`),`Subtotal: ${storeMoney(quote.cart.subtotalCents,'us')}`,`Mix & Match discount: ${storeMoney(quote.cart.discountCents,'us')}`,`Shipping: ${storeMoney(quote.shippingCents,'us')}`,`Sales tax: ${storeMoney(quote.taxCents,'us')}`,`Total: ${storeMoney(quote.totalCents,'us')} USD`].join('\n');
  const common={from:`Eppix Labs <${businessEmail}>`,reply_to:businessEmail};
  return {
    customer:{...common,to:[order.email],subject:`Order ${order.number} received — awaiting payment`,text:[`Thank you, ${input.firstName}. Your order has been received.`,`Order number: ${order.number}`,`Payment preference: ${paymentMethods[order.paymentMethod]}`,'','CHECK YOUR EMAIL FOR PAYMENT DETAILS',`Our team will send a separate email from ${businessEmail} with instructions for your selected payment method. Check your inbox and spam folder. No payment has been taken. Your order is awaiting payment and will be processed after payment and availability are confirmed. Apple Pay instructions, if selected, will include a compatible payment link from our team. Do not send card details by email.`,'',summary,'','Shipping address:',address(input.shipping||input.billing),'',`Questions? Reply to this email and include order ${order.number}.`].join('\n')},
    team:{...common,to:[businessEmail],reply_to:order.email,subject:`[New order] ${order.number} — ${paymentMethods[order.paymentMethod]} — awaiting payment`,text:[`ACTION: Send payment instructions to ${order.email} for ${paymentMethods[order.paymentMethod]}.`,'For Apple Pay, provide a compatible payment link. Confirm payment and stock before fulfillment.',`Order: ${order.number}`,`Received: ${order.createdAt}`,`Customer: ${input.firstName} ${input.lastName}`,`Email: ${order.email}`,`Phone: ${input.phone}`,`Role: ${input.role||'Not provided'}`,'',summary,'','Billing address:',address(input.billing),'','Shipping address:',address(input.shipping||input.billing),'',`Order notes: ${input.notes||'None'}`].join('\n')},
  };
}
export async function notifyOrder(order:StoredOrder,apiKey:string,send:typeof fetch=fetch){
  const emails=orderEmails(order);
  const deliver=async(kind:'customer'|'team'):Promise<'sent'|'unavailable'>=>{
    if((kind==='customer'?order.customerEmail:order.teamEmail)==='sent')return 'sent';
    if(!apiKey)return 'unavailable';
    try{
      const response=await send('https://api.resend.com/emails',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':`order/${order.number}/${kind}`},body:JSON.stringify(emails[kind])});
      if(!response.ok)return 'unavailable';const result=await response.json();return typeof result.id==='string'&&result.id?'sent':'unavailable';
    }catch{return 'unavailable';}
  };
  const [customerEmail,teamEmail]=await Promise.all([deliver('customer'),deliver('team')]);return {customerEmail,teamEmail};
}
