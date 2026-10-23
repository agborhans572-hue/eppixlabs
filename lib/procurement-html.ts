import type {CheerioAPI} from 'cheerio';
import type {Product} from './types';
import {storeMoney,storePath,stores,type StoreRegion} from './stores';
import {prioritySlugs,procurementNote,procurementRoute,productLabel,productSummary,singleVariants,strengthLabel} from './procurement';

export function prepareProcurementHtml($:CheerioAPI,route:string,region:StoreRegion,catalog:Product[]) {
  const main=$('main').first(),country=region==='ca'?'Canada':'the United States',currency=stores[region].currency;
  const href=(path:string)=>storePath(path,region);
  const link=(path:string,label:string)=>$('<a></a>').attr('href',href(path)).text(label);
  const selected=prioritySlugs.flatMap(slug=>catalog.filter(p=>p.slug===slug));
  const guideLinks=()=> $('<p class="seo-help-links"></p>').append(
    link(procurementRoute(region),'Ordering checklist'),link('/peptide-coa-verification','How to check a lot report'),link('/support','Ask before ordering'));

  function productCards(items:Product[]){
    const list=$('<ul class="seo-product-picks"></ul>');
    for(const product of items){
      const item=$('<li></li>');
      item.append(link('/products/'+product.slug,productLabel(product)));
      item.append($('<p></p>').text(singleVariants(product).map(v=>strengthLabel(v.strength)).join(' / ')+' · '+currency));
      item.append($('<p></p>').text(procurementNote(product,region)));
      list.append(item);
    }
    return list;
  }

  const product=route.startsWith('/products/')?catalog.find(p=>route==='/products/'+p.slug):undefined;
  if(product){
    const heading=main.find('h1').first(),intro=heading.parent();
    // Replace captured strength lists and marketing summaries with catalog facts.
    const subtitle=intro.find('[data-public-product-subtitle]').first();
    const summary=$('<p class="seo-product-summary" data-procurement-summary></p>').text(productSummary(product,region));
    if(subtitle.length)subtitle.replaceWith(summary);else heading.after(summary);
    intro.children('p.font-mono').first().text('Laboratory research material · '+currency+' catalog');
    intro.children('p.mt-3').first().text(procurementNote(product,region));
    const guide=main.find('.seo-buying-guide').first();
    const section=$('<section class="seo-variant-comparison" aria-labelledby="variant-comparison-title"><h3 id="variant-comparison-title">Compare strengths, prices and reports</h3></section>');
    section.append($('<p></p>').text('Single-unit listing prices in '+currency+', before cart discounts and shipping. A report link is published documentation, not confirmation that this lot will be supplied. Confirm the assigned lot with support.'));
    const wrapper=$('<div class="seo-table-scroll" role="region" aria-label="Strength and report comparison" tabindex="0"></div>');
    const table=$('<table class="seo-variant-table"><caption></caption><thead><tr><th scope="col">Strength</th><th scope="col">Single unit</th><th scope="col">Listing status</th><th scope="col">Published reports</th></tr></thead><tbody></tbody></table>');
    table.find('caption').text(productLabel(product)+' · '+country);
    for(const variant of singleVariants(product)){
      const row=$('<tr></tr>');
      row.append($('<th scope="row"></th>').append(link('/products/'+product.slug+'?strength='+encodeURIComponent(variant.strength),strengthLabel(variant.strength))),$('<td></td>').text(storeMoney(variant.priceCents,region)+' '+currency),$('<td></td>').text(!product.comingSoon&&variant.available&&variant.stock>0?'Available':'Unavailable'));
      const reports=$('<td></td>'),matching=product.certificates.filter(c=>c.strength===variant.strength);
      if(!matching.length)reports.text('Ask support for a matching report');
      for(const [i,certificate] of matching.entries()){
        if(i)reports.append(' · ');
        reports.append(link('/certificates-of-analysis/'+certificate.batch.toLowerCase(),certificate.batch));
      }
      row.append(reports);table.find('tbody').append(row);
    }
    if(singleVariants(product).length)wrapper.append(table);else wrapper.append('<p>No priced single-unit options are listed. Ask support about availability and documentation before ordering.</p>');
    section.append(wrapper,guideLinks());
    guide.find('p').first().after(section);
  }

  if(route==='/'||route==='/collections/peptides'){
    const heading=main.find('h1').first();
    if(route==='/'){
      heading.empty().append('Research peptides in '+country+'. ',$('<span class="text-brand-600 dark:text-brand-400"></span>').text('Compare the material. Check the report.'));
      heading.parent().siblings().last().find('p').first().text('Choose from the '+currency+' research catalog, compare the listed strengths and review published laboratory documentation. Check your selection and delivery details at checkout, then receive payment instructions by email. Materials are for laboratory research only.');
    }else{
      heading.text('Research peptides in '+country+' — strengths, prices and reports');
      heading.next('p').text('Compare '+catalog.length+' research materials with prices in '+currency+'. Open a product to review its strengths, pack sizes and published reports. Check payment and shipping details before placing your order.');
    }
    const section=$('<section class="seo-buying-guide" aria-labelledby="procurement-picks-title"><p class="seo-eyebrow">Before you order</p><h2 id="procurement-picks-title">Find your material and its documentation</h2><p>Start with the exact compound and strength, then check the published report. These links bring the listing and pre-order checks together.</p></section>');
    section.append(productCards(selected),guideLinks());
    if(route==='/collections/peptides')main.find('.seo-buying-guide').first().before(section);else main.children().first().after(section);
  }

  if(route===procurementRoute(region)){
    const section=$('<section class="seo-about seo-procurement-guide"><p class="seo-eyebrow">Eppix Labs ordering guide</p></section>');
    section.append($('<h1></h1>').text('Ordering research peptides in '+country),$('<p class="seo-intro"></p>').text('A practical checklist for this '+currency+' storefront: choose the exact listing, inspect its published documentation and understand what happens after checkout.'));
    section.append('<h2>1. Compare the exact material</h2><p>Compound name, strength and pack size identify what you are ordering. A single vial and a multi-vial pack have different totals. Compare the price of the selected option; a lower starting price may refer to a different strength.</p>',productCards(selected));
    section.append('<h2>2. Check the report before the price decides</h2><p>Open the report linked to the strength you need. Compare its compound name, label strength and batch code. Follow the laboratory verification link to inspect the original record. Published reports can include historical lots; ask which lot will be assigned to your order.</p>',link('/peptide-coa-verification','Walk through a report comparison'));
    section.append('<h2>3. Review the regional total</h2>',$('<p></p>').text('This storefront lists prices in '+currency+'. Review your cart quantities, discounts, shipping address and delivery charge before submitting checkout. '+(region==='ca'?'Canadian taxes are confirmed in the payment email.':'Use the US storefront for a USD order and a US delivery address.')));
    section.append($('<p class="seo-help-links"></p>').append(link('/shipping','Shipping & returns'),link('/collections/peptides','Full '+currency+' catalog')));
    section.append('<h2>4. Understand the payment handoff</h2><p>Submitting checkout saves an order as awaiting payment. It does not collect money or confirm dispatch. Choose a payment preference and check your email for instructions. Payment and availability must be confirmed before fulfillment. Card payments are currently unavailable.</p><h2>5. Resolve missing details before ordering</h2><p>Send support the product name, strength, quantity and destination country. Ask for the relevant lot report and confirmation of delivery and payment arrangements. Never assume an option or report from the other regional storefront applies to this order.</p>',guideLinks());
    section.append('<h2>Laboratory research only</h2><p>These materials are not supplied for human or veterinary use. Product documentation is not dosing, administration or medical advice.</p>');
    main.empty().append(section);
  }

  if(route==='/peptide-coa-verification'){
    const section=$('<section class="seo-about seo-procurement-guide"><p class="seo-eyebrow">Before you order</p><h1>How to check a peptide certificate of analysis</h1><p class="seo-intro">Check the material, strength and lot together. A certificate is useful only when you understand which sample it describes and what it actually reports.</p><h2>1. Start from the product and selected strength</h2><p>Open the product listing, choose the strength and find the published report links. Do not substitute a certificate for a different strength or format. If no matching report is linked, request it before ordering.</p></section>');
    const example=catalog.find(p=>p.slug==='bpc-157'),certificate=example?.certificates.find(c=>singleVariants(example).some(v=>v.strength===c.strength));
    if(example&&certificate){
      section.append('<h2>A comparison from this catalog</h2>',$('<p></p>').text(productLabel(example)+' has a '+strengthLabel(certificate.strength)+' listing with published lot '+certificate.batch+'. Use the links below to compare the listing, storefront report and laboratory record. This example describes a published record; it does not establish the lot that will be fulfilled.'));
      section.append($('<p class="seo-help-links"></p>').append(link('/products/'+example.slug,productLabel(example)+' listing'),link('/certificates-of-analysis/'+certificate.batch.toLowerCase(),'Lot '+certificate.batch),$('<a target="_blank" rel="noopener noreferrer">Original laboratory record</a>').attr('href',certificate.reportUrl)));
    }
    section.append('<h2>2. Inspect the original record</h2><p>Follow the report verification link to the issuing laboratory. Compare the compound, strength, batch code, sample information and test date with the storefront copy. Ask support to explain any mismatch. A logo or a screenshot alone does not establish that the record matches the material you will receive.</p><h2>3. Read each result on its own terms</h2><p>Read the method, units and limitations on the original report. A percentage purity result and a measured-content result answer different questions. Do not treat a purity percentage as the number of milligrams in the vial, or assume unlisted tests were performed.</p><h2>4. Confirm the lot before fulfillment</h2><p>Ask support which batch will be supplied and request its matching record. After delivery, compare the received label with that record. A published certificate describes a tested sample; it does not guarantee every vial, every test or suitability for your experiment.</p>');
    section.append($('<p class="seo-help-links"></p>').append(link('/certificates-of-analysis','Browse published certificates'),link('/verify','Look up a batch code'),link('/support','Request a matching report'),link(procurementRoute(region),'Ordering checklist')));
    main.empty().append(section);
  }

  // Research readers should be able to reach the exact regional listings.
  if(route.startsWith('/peptide-research/')&&!route.startsWith('/peptide-research/topic/')){
    const relevant=selected.filter(p=>route.includes(p.slug));
    if(relevant.length){const section=$('<aside class="seo-buying-guide" aria-label="Related catalog listings"><h2>Compare the catalog listings and reports</h2><p>Literature and product documentation serve different purposes. Check the exact regional strength and report before ordering research materials.</p></aside>');section.append(productCards(relevant),guideLinks());main.append(section);}
  }
  if(route.startsWith('/certificates-of-analysis/')){
    const related=catalog.filter(p=>p.certificates.some(c=>route==='/certificates-of-analysis/'+c.batch.toLowerCase()));
    if(related.length){const section=$('<aside class="seo-buying-guide" aria-label="Related products"><h2>Compare this report with the product listing</h2><p>Confirm the selected strength and ask which lot will be supplied before placing an order.</p></aside>');section.append($('<p class="seo-help-links"></p>').append(...related.map(p=>link('/products/'+p.slug,productLabel(p)))),guideLinks());main.append(section);}
  }
}
