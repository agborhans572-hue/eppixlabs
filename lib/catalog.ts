import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load } from 'cheerio';
import type { CapturedPage, Product, SearchResult, Certificate } from './types';

const directory = path.join(process.cwd(),'reference/pages');
let productCache:Product[] | undefined;
let productModified=0;
export function readPage(route:string):CapturedPage|null {
  try { return JSON.parse(readFileSync(path.join(directory,createHash('sha256').update(route).digest('hex').slice(0,20)+'.json'),'utf8')); } catch { return route.startsWith('/certificates-of-analysis/')?certificatePage(route):null; }
}
function certificatePage(route:string):CapturedPage|null {
  const certificate=certificates().find(c=>route==='/certificates-of-analysis/'+c.batch.toLowerCase());if(!certificate)return null;
  const shell=readPage('/certificates-of-analysis/ghkc-ca-26i-100');if(!shell)return null;const $=load(shell.html,null,false);const section=$('<section class="clone-account clone-coa"></section>');section.append($('<h1></h1>').text(certificate.productName+' '+certificate.strength));section.append($('<p></p>').text('Lot '+certificate.batch));const details=$('<dl></dl>');for(const [label,value] of [['Laboratory',certificate.laboratory],['HPLC purity',certificate.purity],['Measured content',certificate.mass],['Test date',certificate.date]])details.append($('<dt></dt>').text(label),$('<dd></dd>').text(value||'See laboratory report'));section.append(details);if(certificate.image)section.append($('<img>').attr('src',certificate.image).attr('alt',certificate.productName+' certificate of analysis'),$('<a class="clone-secondary" download>Download certificate</a>').attr('href',certificate.image));section.append($('<a class="clone-primary" target="_blank" rel="noopener noreferrer">Verify with the laboratory</a>').attr('href',certificate.reportUrl));$('main').empty().append(section);return {...shell,route,title:certificate.batch+' Test Report | Eppix Labs',description:'Published laboratory certificate for '+certificate.productName,html:$.html(),source:certificate.reportUrl};
}
export function pages():CapturedPage[] { return readdirSync(directory).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(directory,f),'utf8'))); }
export function products():Product[] {
  try {const modified=statSync('reference/catalog.json').mtimeMs;if(productCache&&modified===productModified)return productCache;productCache=JSON.parse(readFileSync('reference/catalog.json','utf8'));productModified=modified;return productCache!;}catch{return [];}
}
export function certificates():Certificate[] {return JSON.parse(readFileSync('reference/certificates.json','utf8'));}
export function search(query:string):SearchResult[] {
  const q=query.trim().toLowerCase();if(!q)return [];
  const results:SearchResult[]=[];
  const tokens=q.split(/\s+/).filter(Boolean);const matches=(value:string)=>{const text=value.toLowerCase(),compact=text.replace(/[^a-z0-9]+/g,'');return tokens.every(token=>{const normalized=token.replace(/[^a-z0-9]+/g,'');if(/\d/.test(token)){const escaped=normalized.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return !!escaped&&new RegExp('(?:^|[^0-9])'+escaped+'(?=$|[^0-9])').test(compact);}return text.includes(token)||!!normalized&&compact.includes(normalized);});};
  for(const p of products()){const title=p.displayName||p.name;const primary=title+' '+p.name+' '+p.slug+' '+(p.searchTags||[]).join(' ');const strengths=[...new Set(p.variants.map(v=>v.strength))];const strength=strengths.find(strength=>matches(primary+' '+strength+' '+(p.searchBatchNumbers?.[strength]||'')));if(matches(primary)||strength)results.push({title:title+(matches(primary)?'':' '+strength),url:'/products/'+p.slug+(matches(primary)?'':'?strength='+encodeURIComponent(strength!)),type:'Product',image:p.image,subtitle:matches(primary)?p.searchBatchNumbers?.default||p.searchBatchNumbers?.[strengths[0]]||'':p.searchBatchNumbers?.[strength!]||''});
    for(const strength of [...(p.searchCoaStrengths||p.certificates.map(c=>c.strength))].sort((a,b)=>parseFloat(a)-parseFloat(b))){const c=p.certificates.find(c=>c.strength===strength);const batch=p.searchBatchNumbers?.[strength]||c?.batch||'';if(matches(primary+' '+strength+' '+batch+' certificate coa lab report'))results.push({title:title+' \u2014 '+strength+' certificate',url:'/products/'+p.slug+'?coa='+encodeURIComponent(strength),type:'Certificate',subtitle:batch});}
  }
  for(const p of pages())if(!p.route.includes('?')&&!/^\/(products|certificates-of-analysis)/.test(p.route)&&(p.title+' '+p.description).toLowerCase().includes(q))results.push({title:p.title.split('|')[0].trim(),url:p.route,type:p.route.startsWith('/peptide-research/')?'Research':'Page',subtitle:p.description});
  const unique=[...new Map(results.map(r=>[r.url,r])).values()];return (['Product','Certificate','Research','Page'] as const).flatMap(type=>unique.filter(r=>r.type===type).slice(0,({Product:6,Certificate:5,Research:5,Page:4})[type]));
}
export function prepareHtml(page:CapturedPage):string {
  const $=load(page.html,null,false);
  $('[role="dialog"], #__next-route-announcer__,noscript').remove();
  $('.skeleton').remove();
  if(['/collections/peptide-vials','/collections/capsules','/collections/bioregulators','/collections/aminos','/collections/cosmetics','/collections/intranasal-sprays'].includes(page.route)){
    const all=readPage('/collections/peptides');if(all){const source=load(all.html,null,false);const grid=source('main a[href^="/products/"]').filter((_,el)=>source(el).find('button').length>0).first().parent();const existing=$('main a[href^="/products/"]').filter((_,el)=>$(el).find('button').length>0).first().parent();if(existing.length)existing.html(grid.html()||'');else{const empty=$('main p').filter((_,el)=>/No products found/i.test($(el).text())).parent();if(empty.length){empty.attr('data-catalog-empty','true');empty.before(grid.prop('outerHTML')||'');}}}
  }
  $('footer p').filter((_,el)=>$(el).text()==='Products').next('ul').html(['All Peptides|peptides','Peptides|peptide-vials','Intranasal Sprays|intranasal-sprays','Capsules|capsules','Bioregulators|bioregulators','Aminos|aminos','Cosmetics|cosmetics','Best Sellers|best-sellers','New Releases|new'].map(item=>{const [name,slug]=item.split('|');return `<li><a href="/collections/${slug}" class="text-[13px] text-foreground-muted hover:text-foreground transition-colors">${name}</a></li>`;}).join(''));
  $('img.opacity-0').removeClass('opacity-0').addClass('opacity-100');
  // Menu and cart surfaces are owned by the independent React application.
  $('main a[href^="/products/"]').each((_,el)=>{
    const href=$(el).attr('href')||''; const slug=href.split('/')[2]?.split('?')[0];
    if($(el).find('button').length) {
      $(el).attr('data-product',slug).attr('data-product-card','true');
      $(el).find('[class*="perspective:1200px"]').attr('data-coa-flip-frame','true');
      const product=products().find(p=>p.slug===slug);if(product){$(el).find('h3,p,span,div').filter((_,item)=>!$(item).children().length).each((_,item)=>{const value=$(item).text().replace(/\s/g,'');const strength=product.variants.map(v=>v.strength).find(strength=>[product.name,product.displayName].some(name=>name&&value===(name+strength).replace(/\s/g,'')));if(strength)$(item).attr('data-card-heading','true').text((product.displayName||product.name)+' '+strength.replace(/(\d)(mg|mcg|g|mL|IU)$/,'$1 $2'));});}
      $(el).find('p').filter((_,p)=>/^(From)?\$\d/.test($(p).text().trim())).attr('data-variant-price','true');
      $(el).find('img').first().attr('data-product-image','true');
    }
  });
  if(page.route.startsWith('/products/')) {
    const slug=page.route.split('/')[2]; $('main').attr('data-product',slug).attr('data-product-detail','true');
    const quantity=$('input[aria-label="Quantity"]'); quantity.attr('type','number').attr('min','1').attr('max','99');
    const detail=products().find(p=>p.slug===slug); const defaultVariant=detail?.variants.filter(v=>v.packSize===1).sort((a,b)=>a.priceCents-b.priceCents)[0];
    if(defaultVariant) $('main').attr('data-strength',defaultVariant.strength).attr('data-pack','1');
    $('main span,main p').filter((_,el)=>/^\$\d[\d,.]*$/.test($(el).text().trim())&&!$(el).children().length).first().attr('data-variant-price','true');
    const price=$('[data-variant-price]').first();if(price.length)price.parent().after('<div data-shipping-countdown class="flex items-center gap-2 mt-2"><span class="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span class="font-mono text-[11px] tracking-wide text-foreground-secondary"></span></div>');
    $('main img').first().attr('data-product-image','true');
    const track=$('main .touch-pan-y').first(),frame=track.parent();
    track.attr('data-product-gallery-track','true').attr('data-slide','0');
    frame.attr('data-product-gallery-frame','true').attr('role','region').attr('aria-label','Product images').attr('tabindex','0');
    track.children().each((index,el)=>{
      const slide=$(el),alt=slide.find('img').first().attr('alt')||'';
      const kind=/certificate/i.test(alt)?'certificate':slide.find('.chemical-diagram').length?'diagram':'product';
      slide.attr('data-gallery-kind',kind).attr('data-gallery-index',String(index));
      if(kind==='certificate')slide.find('span').first().attr('data-gallery-certificate-label','true');
    });
    frame.find('button[aria-label="Next image"],button[aria-label="Previous image"]').remove();
    if(track.children().length>1)for(const [direction,label,points] of [['previous','Previous image','15 18 9 12 15 6'],['next','Next image','9 18 15 12 9 6']])frame.append(`<button type="button" class="clone-gallery-arrow clone-gallery-${direction}" aria-label="${label}" data-action="gallery" data-slide="${direction}"${direction==='previous'?' hidden':''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${points}"/></svg></button>`);
    frame.append('<div data-gallery-expand-hint hidden class="clone-gallery-expand-hint"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><span>Tap to expand</span></div>');
    $('main button[aria-label^="Go to slide"]').attr('data-gallery-dot','true');
  }
  $('main figure').each((_,el)=>{const link=$(el).find('a[href^="/products/"]').first();if(link.length&&$(el).find('button').length){const slug=(link.attr('href')||'').split('/')[2]?.split('?')[0];$(el).attr('data-product',slug).attr('data-inline-certificate','true');}});
  $('[data-product]').each((_,container)=>{const product=products().find(p=>p.slug===$(container).attr('data-product'));if(!product)return;for(const c of product.certificates){for(const key of ['batch','purity','mass','laboratory','date','dateAdded'] as const){if(!c[key])continue;$(container).find('span,p,dd').filter((_,el)=>!$(el).children().length&&$(el).text().trim()===c[key]).attr('data-certificate-field',key);}$(container).find('p').filter((_,el)=>[product.name,product.displayName,c.productName].some(name=>name&&$(el).text().replace(/\s/g,'')===(name+c.strength).replace(/\s/g,''))).attr('data-certificate-heading','true');}});
  $('[data-product-detail] p').filter((_,el)=>/^\d+ vial/.test($(el).text().trim())).attr('data-vial-summary','true');
  $('[data-product-detail] p').filter((_,el)=>/^Add \d+ more vials/.test($(el).text().trim())).attr('data-vial-next','true');
  $('[data-product-detail] .cursor-zoom-in').has('img').each((_,el)=>{const target=$(el),alt=target.find('img').first().attr('alt')||'product image';target.attr('data-action','expand-image').attr('role','button').attr('tabindex','0').attr('aria-label','Expand '+alt);if(target.find('.chemical-diagram').length)target.attr('data-diagram-magnifier','true');});
  $('[data-product-detail] img[alt^="Certificate of Analysis"]').each((_,el)=>{const grid=$(el).closest('.grid-cols-2');if(grid.length){grid.attr('data-coa-document-grid','true');if(!grid.next('[data-coa-missing]').length)grid.after('<div data-coa-missing hidden class="bg-white/50 dark:bg-surface rounded-card border border-white/30 dark:border-border px-4 py-5 text-center"><p class="font-mono text-[11px] tracking-[0.12em] uppercase text-foreground-muted">Coming Soon</p><p class="mt-2 text-[13px] text-foreground-secondary"></p></div>');}});
  $('button').each((_,el)=>{
    const b=$(el),text=b.text().trim(),aria=b.attr('aria-label')||'';
    if(aria.includes('Shopping cart')) b.attr('data-action','cart');
    else if(aria.includes('dark mode')||aria.includes('light mode')) b.attr('data-action','theme');
    else if(/announcement/i.test(aria)) b.attr('data-action',aria.startsWith('Next')?'announcement-next':'announcement-prev');
    else if(/menu/i.test(aria)) b.attr('data-action','menu');
    else if(aria.startsWith('Store region')) b.attr('data-action','region');
    else if(aria==='Search site') b.attr('data-action','search');
    else if(text==='Add to Cart') b.attr('data-action','add');
    else if(aria.includes('certificate of analysis')||/^(Full\s*)?COA\s*→$/.test(text)) b.attr('data-action','coa');
    else if(text==='10'&&b.closest('[data-product-detail]').length)b.attr('data-action','strength').attr('data-value','10');
    else if(b.closest('[data-product]').length && /^\d+(?:\.\d+)?\s*(mg|mcg|g|mL|IU|capsules)$/i.test(text)) b.attr('data-action','strength').attr('data-value',text);
    else if(b.closest('[data-product-detail]').length && /^(Single Vial|1 Vial|\d+[- ]Pack)$/.test(text)) b.attr('data-action','pack').attr('data-value',/^(Single Vial|1 Vial)$/.test(text)?'1':text.match(/^\d+/)?.[0]||'1');
    else if(/quantity/i.test(aria)) b.attr('data-action',aria.startsWith('Increase')?'quantity-up':'quantity-down');
    else if(/^(Previous|Next) COA card$/.test(aria))b.attr('data-action','coa-card').attr('data-direction',aria.startsWith('Next')?'1':'-1');
    else if(aria==='Next image'||aria==='Previous image'||aria.startsWith('Go to slide')) b.attr('data-action','gallery').attr('data-slide',aria==='Next image'?'next':aria==='Previous image'?'previous':String(Number(aria.match(/\d+/)?.[0])-1));
    else if(/Notify/i.test(text) && b.attr('type')!=='submit') b.attr('data-action','notify');
    else if(page.route.startsWith('/peptide-research') && ['Curated','Newest','Oldest'].includes(text)) b.attr('data-action','research-sort').attr('data-value',text);
    else if(page.route.startsWith('/peptide-research') && ['Metabolic & GLP-1','Tissue Repair','Growth Hormone','Longevity','Cognitive','Immune & Inflammation','COAs & Testing','Regulation','Lab Practice'].includes(text)) b.attr('data-action','research-category').attr('data-value',text);
    else if(text==='Clear filters')b.attr('data-action','clear-filters');
    else if(page.route.startsWith('/collections/')&&b.parent().find('[data-action="filter"]').length)b.attr('data-action','category-chip').attr('data-value',text);
    else if(/^Filter\s*\d*$/.test(text)){b.attr('data-action','filter');b.find('span').remove();b.parent().siblings('button').filter((_,el)=>['Peptides','Capsules','Bioregulators','Aminos','Cosmetics'].includes($(el).text().trim())).remove();}
    else if(text==='Continue with Google') b.attr('data-action','google');
    else if(text==='Expand'||(!text&&b.find('img').length)) b.attr('data-action','expand-image');
    else if(b.attr('aria-expanded')!==undefined && !b.closest('header').length) b.attr('data-action','accordion');
  });
  $('input[placeholder^="Search products"]').attr('data-search','global').attr('autocomplete','off');
  $('[data-action="accordion"]').each((_,el)=>{const button=$(el);if(button.attr('aria-expanded')==='false')button.closest('h2,h3').next().children().first().attr('inert','');});
  $('form').each((i,el)=>{
    const f=$(el),main=f.closest('main').length>0;
    const kind=f.find('#library-q').length?'research':main&&['/login','/signup','/forgot-password','/reset-password'].includes(page.route)?page.route.slice(1):main&&page.route==='/support'?'support':main&&page.route.startsWith('/affiliate')?'affiliate':main&&(page.route==='/verify'||f.find('#lot-lookup').length)?'verify':'subscribe';
    f.attr('data-form',kind).attr('data-form-id',String(i));
    f.find('input,textarea,select').each((n,input)=>{ const x=$(input); if(!x.attr('name')) x.attr('name',x.attr('id')||x.attr('type')||'field'+n); });
    if(kind==='subscribe') {f.find('input[type="checkbox"]').each((n,x)=>{ $(x).attr('name',['sales','launches','restocks','research'][n]||'preference'+n); });}
    f.find('input[type="email"]').attr('name','email');
    f.find('input[id$="-company"]').attr('name','company');
  });
  const menu=$('header nav').first().find('a').clone();menu.attr('class','font-medium py-2.5 transition-colors text-[13px] text-foreground-muted hover:text-foreground');$('header').append('<nav data-mobile-menu hidden class="lg:hidden border-t border-border glass-strong px-4 sm:px-6 py-4"><div class="flex flex-col gap-1"></div></nav>');$('[data-mobile-menu] > div').append(menu);
  $('img').removeAttr('fetchpriority');
  try{const mobile=load(readFileSync('reference/behavior/announcements-mobile.html','utf8'),null,false);mobile('button[aria-label="Previous announcement"]').attr('data-action','announcement-prev');mobile('button[aria-label="Next announcement"]').attr('data-action','announcement-next');$.root().append($('<template data-announcements-mobile>'+mobile.html()+'</template>'),$('<template data-announcements-desktop>'+($('[aria-label="Announcements"]').html()||'')+'</template>'));}catch{}
  for(const theme of ['light','dark']){try{const template=$('<template data-theme-icon="'+theme+'">'+readFileSync('reference/behavior/theme-'+theme+'.html','utf8')+'</template>');if($('body').length)$('body').append(template);else $.root().append(template);}catch{}}
  if(page.route==='/certificates-of-analysis'){const rows=new Map<string,string>();for(const route of ['/certificates-of-analysis','/certificates-of-analysis?page=2','/certificates-of-analysis?page=3']){const source=readPage(route);if(!source)continue;const library=load(source.html);library('main tbody tr').each((_,el)=>{const row=library(el);const key=row.find('a[href^="/certificates-of-analysis/"]').first().attr('href')+'|'+row.find('a[href^="/products/"]').first().attr('href')+'|'+row.find('td span').first().text();rows.set(key,row.prop('outerHTML')||'');});}$.root().append($('<template data-certificate-rows></template>').html('<table><tbody>'+[...rows.values()].join('')+'</tbody></table>'));}
  try{const menu=load(readFileSync('reference/behavior/region-menu.html','utf8'),null,false);menu('[role="menuitem"]').each((index,el)=>{$.root().append($('<template data-region-flag="'+(index===0?'us':'ca')+'">'+(menu(el).find('svg').first().prop('outerHTML')||'')+'</template>'));});}catch{}
  if(page.route==='/peptide-calculator')for(const mode of ['serial','reverse']){try{const template=load(readFileSync('reference/behavior/calculator-'+mode+'.html','utf8'),null,false);$('main').append($('<template></template>').attr('data-calculator-mode',mode).html(template('section').html()||''));}catch{}}
  return $.html();
}
