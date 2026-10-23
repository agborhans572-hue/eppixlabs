import {writeFileSync,mkdirSync} from 'node:fs';
import {load} from 'cheerio';
import {pages,products,prepareHtml} from '../lib/catalog';
import {pageSeo} from '../lib/seo';
import {isNonIndexablePath} from '../lib/site';

const report=(['us','ca'] as const).map(region=>{
  const catalog=products(region);
  const entries=pages(region).filter(p=>!p.route.includes('?')).map(page=>{
    const $=load(prepareHtml(page,region)),metadata=pageSeo(page.route,region,page);
    return {route:page.route,title:String(metadata.title),description:metadata.description,canonical:metadata.alternates?.canonical,indexable:!isNonIndexablePath(page.route),referenceTitle:page.title,h1:$('main h1').map((_,el)=>$(el).text()).get(),images:$('main img').length,missingAlt:$('main img').filter((_,el)=>!$(el).attr('alt')).length,missingDimensions:$('main img').filter((_,el)=>!$(el).attr('width')||!$(el).attr('height')).length,comparisonRows:$('.seo-variant-table tbody tr').length,buyerLinks:$('.seo-help-links a').length,main:$('main').text().replace(/\s+/g,' ').trim().slice(0,800)};
  });
  return {region,products:catalog.length,pages:entries.length,missingDescriptions:entries.filter(p=>!p.description).map(p=>p.route),missingH1:entries.filter(p=>p.h1.length!==1).map(p=>({route:p.route,h1:p.h1})),duplicateTitles:[...new Set(entries.map(p=>p.title))].map(title=>({title,routes:entries.filter(p=>p.title===title).map(p=>p.route)})).filter(p=>p.routes.length>1),entries};
});
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/seo-content-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(({entries,...summary})=>({...summary,productComparisons:entries.filter(p=>p.comparisonRows>0).length})),null,2));
