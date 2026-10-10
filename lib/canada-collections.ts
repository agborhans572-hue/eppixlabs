import {load} from 'cheerio';
import {readFileSync} from 'node:fs';
import {products,readPage} from './catalog';
import type {CapturedPage} from './types';

type Query=Record<string,string|string[]|undefined>;

/** Filter and paginate the complete Canadian catalog, with captured card markup. */
export function canadianCollection(page:CapturedPage,query:Query):CapturedPage {
  const $=load(page.html,null,false),cards=new Map<string,string>();
  for(const route of ['/collections/peptides','/collections/peptides?page=2','/collections/peptides?page=3']){
    const captured=readPage(route,'ca');if(!captured)continue;const source=load(captured.html);
    source('main article').each((_,el)=>{const slug=(source(el).find('a[href^="/products/"]').first().attr('href')||'').split('/')[2]?.split('?')[0];if(slug)cards.set(slug,source(el).prop('outerHTML')||'');});
  }
  const price=(slug:string)=>Math.min(...products('ca').find(p=>p.slug===slug)!.variants.filter(v=>v.packSize===1&&v.priceCents>0).map(v=>v.priceCents));
  const purity=(slug:string)=>Math.max(0,...products('ca').find(p=>p.slug===slug)!.certificates.map(c=>parseFloat(c.purity)||0));
  let slugs=page.route==='/collections/peptides'?[...cards.keys()]:$('main article').map((_,el)=>($(el).find('a[href^="/products/"]').first().attr('href')||'').split('/')[2]?.split('?')[0]).get();
  if(query.stock==='1')slugs=slugs.filter(slug=>{const p=products('ca').find(p=>p.slug===slug);return p&&!p.comingSoon&&p.variants.some(v=>v.available&&v.stock>0);});
  const sort=typeof query.sort==='string'?query.sort:'best';
  if(sort==='price-asc'||sort==='price-desc')slugs.sort((a,b)=>(price(a)-price(b))*(sort==='price-asc'?1:-1));
  if(sort==='purity')slugs.sort((a,b)=>purity(b)-purity(a));
  if(sort==='new'){const newest:string[]=JSON.parse(readFileSync('reference/canada/behavior/newest-order.json','utf8'));slugs.sort((a,b)=>newest.indexOf(a)-newest.indexOf(b));}
  const total=slugs.length,size=page.route==='/collections/peptides'?24:Math.max(1,total),count=Math.max(1,Math.ceil(total/size));
  const current=Math.min(count,Math.max(1,Math.floor(Number(query.page)||1))),offset=(current-1)*size;
  const grid=$('main article').first().parent();
  if(grid.length)grid.html(slugs.slice(offset,offset+size).map(slug=>cards.get(slug)||'').join('')||'<p role="status">No products match these filters.</p>');
  $('main span,main p,main div').filter((_,el)=>!$(el).children().length&&/^Showing \d+[–-]\d+ of \d+$/.test($(el).text())).text(total?'Showing '+(offset+1)+'–'+Math.min(offset+size,total)+' of '+total:'Showing 0 products');
  const pager=$('main a[rel="next"],main a[rel="prev"]').first().parent();
  if(pager.length){const button=pager.find('a').first().clone();pager.empty().append($('<span class="font-mono text-[11px] tabular-nums text-foreground-muted"></span>').text('Page '+current+' of '+count));for(const [number,label,rel] of [[current-1,'‹ Prev','prev'],[current+1,'Next ›','next']] as const)if(number>=1&&number<=count){const params=new URLSearchParams();if(query.stock==='1')params.set('stock','1');if(sort!=='best')params.set('sort',sort);if(number>1)params.set('page',String(number));pager.append(button.clone().attr('rel',rel).attr('href',page.route+(params.size?'?'+params:'')).text(label));}}
  $('main input[name="stock"]').attr('value','1').prop('checked',query.stock==='1');
  $('main select[name="sort"] option').each((_,el)=>{$(el).prop('selected',$(el).attr('value')===sort);});
  const drawer=load(readFileSync('reference/canada/behavior/category-drawer.html','utf8'),null,false);
  drawer('form').attr('action',page.route);drawer('input[name="stock"]').prop('checked',query.stock==='1');
  drawer('select[name="sort"] option').each((_,el)=>{drawer(el).prop('selected',drawer(el).attr('value')===sort);});
  drawer('nav a').removeAttr('aria-current').each((_,el)=>{const link=drawer(el),active=link.attr('href')===page.route;link.toggleClass('clone-ca-category-current',active);if(active)link.attr('aria-current','page');else link.removeClass('bg-brand-500/12 text-brand-700 dark:text-brand-300 font-medium');});
  drawer('button[type="submit"]').text('Apply · '+total+' shown');
  // Parse the complete template at once; assigning .html() leaves parse5's
  // template-content fragment stale when the enclosing document is serialized.
  $.root().append('<template data-canada-filters>'+(drawer('#category-drawer').html()||'')+'</template>');
  $('button[aria-controls="category-drawer"]').attr('data-action','canada-filters');
  return {...page,html:$.html()};
}
