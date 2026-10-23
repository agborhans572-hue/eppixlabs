import type {CheerioAPI} from 'cheerio';
import type {Product} from './types';
import {stores,storePath,type StoreRegion} from './stores';
import imageDimensions from '../reference/image-dimensions.json';
import {businessIdentity} from './business';
import {prepareProcurementHtml} from './procurement-html';

const dimensions:Record<string,{width:number;height:number}>=imageDimensions;

/** Enhance the actual server-rendered page so links work without client JS. */
export function prepareSeoHtml($:CheerioAPI,route:string,region:StoreRegion,catalog:Product[]) {
  const country=region==='ca'?'Canada':'the United States',currency=stores[region].currency;
  const href=(path:string)=>storePath(path,region);
  const main=$('main').first();
  if(!main.length)return;
  $('*').contents().each((_,node)=>{if(node.type==='text')node.data=node.data.replace(/\bEppix Inc\./g,businessIdentity.legalName);});
  if(route==='/about'){
    const section=$('<section class="seo-about"><p class="seo-eyebrow">About Eppix Labs</p><h1>Research materials, published documentation and a clear ordering process.</h1></section>');
    section.append($('<p class="seo-intro"></p>').text('Use the Eppix Labs '+(region==='ca'?'Canadian':'US')+' storefront to compare research materials, review the reports linked to a product, and place an order in '+currency+'. This page explains what you can check before you order and what happens afterward.'));
    section.append('<h2>Business identity</h2>',$('<p></p>').text('Registered business name: '+businessIdentity.legalName+'. Registration country: '+businessIdentity.registrationCountry+'.'));
    section.append('<h2>Start with the material and its documentation</h2><p>Product pages bring available strengths, pack options and prices together. Where a laboratory report is published, open it and compare the product name, strength and lot code with the material you are evaluating. Review the laboratory’s original verification page as well as the storefront summary.</p><p>A certificate describes a tested sample. Its reported purity and measured content are different measurements, and neither establishes suitability for a particular experiment. If the information you need is missing, ask our team before ordering.</p>');
    section.append($('<p class="seo-help-links"></p>').append($('<a>Browse the research catalog</a>').attr('href',href('/collections/peptides')),$('<a>Open the certificate library</a>').attr('href',href('/certificates-of-analysis')),$('<a>Look up a lot code</a>').attr('href',href('/verify'))));
    section.append('<h2>Know how your order will be handled</h2>');
    section.append($('<p></p>').text('This storefront quotes orders for '+country+' in '+currency+'. Review your selected strength, quantity, delivery address and total at checkout. Submitting checkout saves an order as awaiting payment. It does not collect a payment or confirm fulfillment.'));
    section.append('<p>Choose a payment preference at checkout and check your email for instructions from our team. Card payments are currently unavailable. Payment and availability must be confirmed before fulfillment; Canadian taxes are confirmed in the payment email.</p>');
    if(region==='us')section.find('p').last().text('Choose a payment preference at checkout and check your email for instructions from our team. Card payments are currently unavailable. Payment and availability must be confirmed before fulfillment.');
    section.append($('<p class="seo-help-links"></p>').append($('<a>Shipping & returns</a>').attr('href',href('/shipping')),$('<a>Ordering questions</a>').attr('href',href('/faq')),$('<a>Terms</a>').attr('href',href('/terms'))));
    section.append('<h2>Get help before or after ordering</h2><p>For product documentation or order questions, contact <a href="mailto:hello@eppixlabsshop.com">hello@eppixlabsshop.com</a>. Include the product name and strength for a catalog question, or your order number for an existing order.</p>');
    section.append($('<p></p>').append($('<a>Contact support</a>').attr('href',href('/support'))));
    section.append('<h2>Laboratory research use only</h2><p>Materials in this catalog are supplied for laboratory research only. They are not for human or veterinary use. The research library and laboratory reports are documentation resources, not medical, dosing or administration guidance.</p>');
    const alternate=region==='ca'?'us':'ca';
    section.append($('<p></p>').append('Shopping for '+stores[alternate].name+'? ',$('<a></a>').attr('href',storePath('/about',alternate)).text('Read about the '+stores[alternate].name+' storefront.')));
    main.empty().append(section);
  }
  const product=route.startsWith('/products/')?catalog.find(p=>route==='/products/'+p.slug):undefined;
  if(product){
    const breadcrumb=$('<nav class="seo-breadcrumb" aria-label="Breadcrumb"></nav>');
    breadcrumb.append($('<a>Home</a>').attr('href',href('/')),' / ',$('<a>Research catalog</a>').attr('href',href('/collections/peptides')),' / ',$('<span aria-current="page"></span>').text(product.name));
    main.prepend(breadcrumb);
    const section=$('<section class="seo-buying-guide" aria-labelledby="buying-guide-title"></section>');
    section.append($('<h2 id="buying-guide-title"></h2>').text('Ordering '+product.name+' in '+country));
    section.append($('<p></p>').text('Compare the strength and pack size above before adding this material to your cart. Prices are shown in '+currency+'. All materials are for laboratory research use only, not for human or veterinary use.'));
    if(product.certificates.length){
      section.append('<h3>Check the published lot documentation</h3><p>Match the lot code and strength on the report to the material you are evaluating. A published report describes the tested sample; it does not establish suitability for a particular application.</p>');
      const list=$('<ul class="seo-report-links"></ul>');
      for(const certificate of product.certificates){
        const item=$('<li></li>');
        item.append($('<a></a>').attr('href',href('/certificates-of-analysis/'+certificate.batch.toLowerCase())).text(certificate.batch+' · '+certificate.strength));
        if(certificate.reportUrl)item.append(' · ',$('<a target="_blank" rel="noopener noreferrer">Verify with the laboratory</a>').attr('href',certificate.reportUrl));
        list.append(item);
      }
      section.append(list);
    }
    section.append('<h3>Shipping and payment</h3><p>Checkout records your order as awaiting payment. Our team sends payment instructions by email; no payment is collected on the checkout page. Payment and availability must be confirmed before fulfillment. Card payments are currently unavailable.</p>');
    const links=$('<p class="seo-help-links"></p>');
    for(const [path,label] of [['/shipping','Shipping & returns'],[region==='ca'?'/payment-methods':'/faq','Payment & ordering details'],['/support','Ask a product or order question']] as const)links.append($('<a></a>').attr('href',href(path)).text(label));
    section.append(links);main.append(section);
  }
  if(route==='/collections/peptides'){
    const section=$('<section class="seo-buying-guide" aria-labelledby="catalog-directory-title"><h2 id="catalog-directory-title">Research catalog A–Z</h2><p>Open a product to compare available strengths, pack sizes and published reports.</p><ul class="seo-catalog-directory"></ul></section>');
    for(const item of [...catalog].sort((a,b)=>a.name.localeCompare(b.name)))section.find('ul').append($('<li></li>').append($('<a></a>').attr('href',href('/products/'+item.slug)).text(item.name)));
    main.append(section);
  }
  prepareProcurementHtml($,route,region,catalog);
  // Reserve the real aspect ratio; never guess report or product dimensions.
  $('img').each((_,element)=>{
    const img=$(element),src=(img.attr('src')||'').split('?')[0],size=dimensions[src];
    if(size&&!img.attr('width')&&!img.attr('height'))img.attr('width',String(size.width)).attr('height',String(size.height));
    img.attr('decoding','async');
    if(!img.attr('loading'))img.attr('loading','lazy');
    if(img.attr('alt')===undefined)img.attr('alt','');
  });
  // Prioritize only the first visible product/hero image, not hidden COA slides.
  const lead=product?main.find('[data-product-image]').first():route==='/'?main.find('img').first():main.find('[data-product-card] img').first();
  if(lead.length)lead.attr('loading','eager').attr('fetchpriority','high');
}
