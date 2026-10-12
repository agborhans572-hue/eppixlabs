import type {CheerioAPI} from 'cheerio';
export function preparePaymentHtml($:CheerioAPI,route:string){
  $('*').contents().each((_,node)=>{if(node.type==='text'){
    if(/^\s*We accept Visa, Mastercard/.test(node.data))node.data='PayPal, Apple Pay, crypto, and Zelle. Card payments are currently unavailable.';
    if(/^\s*Visa, Mastercard, Amex, Apple Pay, Google Pay\s*$/.test(node.data))node.data='PayPal, Apple Pay, crypto, and Zelle · Payment details by email';
    if(/^\s*Visa, Mastercard, American Express, Apple Pay and Google Pay, processed/.test(node.data))node.data='Choose PayPal, Apple Pay, crypto, or Zelle at checkout. Card payments are currently unavailable. Place your order, then check your email for payment instructions from our team. No payment is collected on the checkout page.';
    if(/^\s*Which cards and digital wallets/.test(node.data))node.data='Which payment methods can I choose?';
  }});
  $('footer img[alt="Visa"],footer img[alt="Mastercard"],footer img[alt="American Express"]').remove();
  if(route==='/payment-methods')$('main').html('<section class="checkout-page"><h1>Payment Methods</h1><div class="checkout-card checkout-review"><h2>Card payments unavailable</h2><p>Choose PayPal, Apple Pay, crypto, or Zelle at checkout. Place your order, then check your email for payment instructions from our team.</p><p>No payment is taken when you place an order. Orders await payment, and payment and availability must be confirmed before fulfillment. For Apple Pay, our team provides a compatible payment link.</p><a class="clone-primary" href="/collections/peptides">Browse products</a></div></section>');
}
