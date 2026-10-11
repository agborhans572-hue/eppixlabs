import type {CheerioAPI} from 'cheerio';
import {storePath} from './stores';
import {products} from './catalog';

/** Canadian cards use articles and native strength selects, unlike US flip cards. */
export function prepareCanadianCards($:CheerioAPI){
  $('main article').has('a[href^="/products/"]').has('button').each((_,el)=>{
    const card=$(el),slug=(card.find('a[href^="/products/"]').first().attr('href')||'').split('/')[2]?.split('?')[0];
    card.attr('data-product',slug).attr('data-product-card','true');
    card.find('h3 a').attr('data-card-heading','true');
    card.find('img').first().attr('data-product-image','true');
    const select=card.find('select');select.attr('data-strength-select','true');
    const strength=select.find('option[selected]').attr('value')||select.find('option').first().attr('value');
    if(strength)card.attr('data-strength',strength);
    card.find('span').filter((_,span)=>/^\$[\d,.]+$/.test($(span).text().trim())).first().attr('data-variant-price','true');
    card.find('span.line-through').attr('data-compare-price','true');
    card.find('span').filter((_,span)=>$(span).text()==='Sale').attr('data-sale-badge','true');
    card.find('a[href^="/certificates-of-analysis/"]').attr('data-card-batch','true');
    card.find('[data-card-batch]').next('span').attr('data-certificate-field','purity');
    card.find('[data-card-batch]').parent().next('p').attr('data-ca-mass','true');
    const product=products('ca').find(p=>p.slug===slug),variant=product?.variants.find(v=>v.strength===strength&&v.packSize===1)||product?.variants.filter(v=>v.packSize===1&&v.priceCents>0).sort((a,b)=>a.priceCents-b.priceCents)[0];
    if(variant)card.attr('data-strength',variant.strength);
    const frame=card.find('[class*="perspective:1200px"]').first(),report=product?.coaImages?.[variant?.strength||''];
    if(frame.length){frame.attr('data-coa-flip-frame','true');if(report&&frame.children().first().children().length===1){const back=$('<div inert class="absolute inset-0 overflow-hidden bg-white [backface-visibility:hidden] [transform:rotateY(180deg)]"></div>');back.append($('<img class="object-cover object-[center_48%] scale-[1.15]" style="position:absolute;height:100%;width:100%;inset:0;color:transparent">').attr('src',report).attr('alt','Certificate of Analysis — '+variant?.strength+' — '+product?.name),$('<span data-ca-coa-label class="absolute left-2.5 top-2.5 z-10 inline-flex items-center rounded-badge bg-brand-500 px-2 py-1 font-mono text-[10px] font-medium tracking-[0.12em] uppercase text-white shadow-soft"></span>').text('COA · '+variant?.strength));frame.children().first().append(back);}}
  });
}

export function regionalizeHtml($:CheerioAPI):string {
  $('a[href],form[action]').each((_,el)=>{
    const attr=el.name==='form'?'action':'href';let href=$(el).attr(attr)||'';
    if(href.startsWith('https://www.eppixlabs.ca'))href=href.slice('https://www.eppixlabs.ca'.length)||'/';
    if(href.startsWith('/')&&!href.startsWith('//')&&!/^\/(reference|chemical|chain|_next)\//.test(href))$(el).attr(attr,storePath(href,'ca'));
  });
  $('a[href="mailto:orders@eppix.ca"]').attr('href','/ca/payment-methods');
  $('*').contents().each((_,el)=>{if(el.type==='text')el.data=el.data.replaceAll('orders@eppix.ca','not available (payments are not configured)');});
  return $.html();
}
