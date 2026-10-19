import type {CheerioAPI} from 'cheerio';
import {storePath,type StoreRegion} from './stores';
export function preparePaymentHtml($:CheerioAPI,route:string,region:StoreRegion='us'){
  if(region==='ca'&&route==='/terms'){
    const heading=$('main h2').filter((_,el)=>$(el).text().trim()==='Payments & Billing').first(),block=heading.parent().parent();
    if(heading.length&&block.find('h2').length===1){
      const policy=block.children('p').last().clone(),title=heading.parent();block.children().not(title).remove();
      block.append('<p class="text-foreground-secondary text-[13px] leading-relaxed mb-5">Card payments are currently unavailable. Select PayPal, Apple Pay, crypto, or Zelle at checkout. Your order is saved as awaiting payment; no payment is collected on the checkout page. Our team emails payment instructions, and payment and availability must be confirmed before fulfilment.</p><p class="text-foreground-secondary text-[13px] leading-relaxed mb-5">Canadian orders are quoted in CAD. Taxes are confirmed in the payment email. Apple Pay requires a compatible payment link. Zelle requires eligible US bank accounts. No additional payment-method discount or timed inventory reservation is applied.</p>',policy);
    }
  }
  $('*').contents().each((_,node)=>{if(node.type==='text'){
    node.data=node.data.replace(/up to 25%/gi,match=>match[0]==='U'?'Up to 20%':'up to 20%');
    if(/^\s*We accept Visa, Mastercard/.test(node.data))node.data='PayPal, Apple Pay, crypto, and Zelle. Card payments are currently unavailable.';
    if(/^\s*Visa, Mastercard, Amex, Apple Pay, Google Pay\s*$/.test(node.data))node.data='PayPal, Apple Pay, crypto, and Zelle · Payment details by email';
    if(/^\s*Visa, Mastercard, Amex, Interac e-Transfer\s*$/.test(node.data))node.data='PayPal, Apple Pay, crypto, and Zelle · Payment details by email';
    if(/^\s*Visa, Mastercard, American Express, Apple Pay and Google Pay, processed/.test(node.data))node.data='Choose PayPal, Apple Pay, crypto, or Zelle at checkout. Card payments are currently unavailable. Place your order, then check your email for payment instructions from our team. No payment is collected on the checkout page.';
    if(/^\s*Which cards and digital wallets/.test(node.data))node.data='Which payment methods can I choose?';
    if(region==='ca'){
      if(/^\s*Visa, Mastercard, (?:Amex|American Express)/.test(node.data))node.data='PayPal, Apple Pay, crypto, and Zelle · Card payments unavailable. Check your email for payment instructions.';
      node.data=node.data.replace(/, and up to 25% when paying by Interac e-Transfer/g,', with payment details sent by email');
      if(/Pay by E-Transfer and save an extra 5%/.test(node.data))node.data='Choose a payment method; details sent by email';
      if(node.data.trim()==='E-Transfer')node.data='Email Payment';
      node.data=node.data.replace(/Mix & Match up to 25%/g,'Mix & Match up to 20%');
      if(/E-Transfer orders: inventory is reserved for 60 minutes/.test(node.data))node.data='Orders await payment. Payment and availability must be confirmed before fulfilment.';
      if(/Paid at checkout through our payment provider/.test(node.data))node.data='Choose PayPal, Apple Pay, crypto, or Zelle at checkout. No payment is taken on this page. Our team sends instructions by email. Card payments are unavailable.';
    }
  }});
  $('footer img[alt="Visa"],footer img[alt="Mastercard"],footer img[alt="American Express"]').remove();
  if(region==='ca'){
    $('footer img[alt="Interac"]').parent().append('<span class="text-[11px] text-foreground-muted">PayPal · Apple Pay · Crypto · Zelle<br>Card payments unavailable · Payment details by email</span>');
    $('footer img[alt="Interac"]').remove();
  }
  if(route==='/payment-methods')$('main').html('<section class="checkout-page"><h1>Payment Methods</h1><div class="checkout-card checkout-review"><h2>Card payments unavailable</h2><p>Choose PayPal, Apple Pay, crypto, or Zelle at checkout. Place your order, then check your email for payment instructions from our team.</p><p>No payment is taken when you place an order. Orders await payment, and payment and availability must be confirmed before fulfillment. For Apple Pay, our team provides a compatible payment link.</p>'+(region==='ca'?'<p>Canadian orders are quoted in CAD. Taxes are confirmed in the payment email. Zelle requires eligible US bank accounts; our team confirms eligibility before sending instructions.</p>':'')+'<a class="clone-primary" href="'+storePath('/collections/peptides',region)+'">Browse products</a></div></section>');
}
