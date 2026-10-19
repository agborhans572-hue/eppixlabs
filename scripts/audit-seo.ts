import {writeFileSync,mkdirSync} from 'node:fs';
import {load} from 'cheerio';
import {pages,products} from '../lib/catalog';

const report=(['us','ca'] as const).map(region=>{
  const catalog=products(region);
  const entries=pages(region).filter(p=>!p.route.includes('?')).map(page=>{
    const $=load(page.html);
    return {route:page.route,title:page.title,description:page.description,h1:$('main h1').map((_,el)=>$(el).text()).get(),images:$('main img').length,missingAlt:$('main img').filter((_,el)=>!$(el).attr('alt')).length,missingDimensions:$('main img').filter((_,el)=>!$(el).attr('width')||!$(el).attr('height')).length,schemas:page.records.map(record=>record['@type']),main:$('main').text().replace(/\s+/g,' ').trim().slice(0,800)};
  });
  return {region,products:catalog.length,pages:entries.length,missingDescriptions:entries.filter(p=>!p.description).map(p=>p.route),missingH1:entries.filter(p=>p.h1.length!==1).map(p=>({route:p.route,h1:p.h1})),duplicateTitles:[...new Set(entries.map(p=>p.title))].map(title=>({title,routes:entries.filter(p=>p.title===title).map(p=>p.route)})).filter(p=>p.routes.length>1),entries};
});
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/seo-content-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(({entries,...summary})=>({...summary,samples:entries.filter(p=>['/','/collections/peptides','/products/bpc-157','/about','/peptide-research','/shipping'].includes(p.route))})),null,2));
