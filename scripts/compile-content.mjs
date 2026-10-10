import {readFile,writeFile,readdir} from 'node:fs/promises';
import {load} from 'cheerio';
const canadian=process.env.CAPTURE_REGION==='ca',contentRoot=canadian?'reference/canada':'reference';
const manifest=JSON.parse(await readFile(contentRoot+'/manifest.json','utf8'));
const assets=new Map(manifest.assets.map(a=>[a.source,a.local]));
const catalog=new Map();
const local=u=>assets.get(u)||u;
for(const f of await readdir(contentRoot+'/pages')) {
  if(!f.endsWith('.json'))continue;
  const p=JSON.parse(await readFile(contentRoot+'/pages/'+f,'utf8'));
  const $=load(p.html); const seen=new Map();
  for(const r of p.records||[]) {
    if(!r.handle||!Array.isArray(r.variants))continue;
    seen.set(r.handle,r);
    const old=catalog.get(r.handle);
    const paragraph=$(`a[href="/products/${r.handle}"]`).find('p').first().text();
    const description=(typeof r.description==='string'&&!r.description.startsWith('$')?r.description:paragraph)||old?.description||'';
    const variants=r.variants.map(v=>({id:(canadian?'ca:':'')+v.id,title:v.title,sku:v.sku,strength:v.title.split(' / ')[0],packSize:v.title.includes('10-Pack')?10:v.title.includes('5-Pack')?5:1,priceCents:Math.round(Number(v.price.amount)*100),...(canadian&&v.compareAtPrice?{compareAtCents:Math.round(Number(v.compareAtPrice.amount)*100)}:{}),available:!!v.availableForSale,stock:Math.max(0,v.quantityAvailable??99),image:local(v.image?.url||r.featuredImage?.url||'')}));
    if(variants.some(v=>!Number.isSafeInteger(v.priceCents)))throw Error('Unresolved price for '+r.handle);
    const certificates=(Array.isArray(r.latestCoaCards)?r.latestCoaCards:old?.certificates||[]).map(c=>({batch:c.batchNumber||c.batch,strength:c.strength,productName:c.productName,purity:c.avgPurity||c.purity||'',mass:c.avgMass||c.mass||'',laboratory:c.labName||c.laboratory||'',date:c.resultDate||c.date||'',dateAdded:c.dateAdded||'',heavyMetals:c.heavyMetals||'',screenUrl:c.screenLink||'',reportUrl:c.link||c.reportUrl||'',image:local(r.coaImages?.[c.strength]||c.image||'')}));
    catalog.set(r.handle,{id:(canadian?'ca:':'')+r.id,...(canadian?{store:'ca'}:{}),slug:r.handle,name:r.title,description,image:local(r.featuredImage?.url||r.images?.[0]?.url||''),images:(Array.isArray(r.images)?r.images:[]).map(i=>local(i.url)),categories:Array.isArray(r.categories)?r.categories:old?.categories||[],comingSoon:!!r.comingSoon,coaLinks:r.coaLinks||{},coaImages:Object.fromEntries(Object.entries(r.coaImages||{}).map(([k,v])=>[k,local(v)])),variants,certificates});
  }
  // Raw flight records are kept only as source evidence in ignored reference/raw.
  p.records=[...seen.values()];
  await writeFile(contentRoot+'/pages/'+f,JSON.stringify(p));
}
try{const metadata=JSON.parse(await readFile(contentRoot+'/behavior/search-catalog.json','utf8'));for(const product of catalog.values()){const source=metadata.find(p=>p.handle===product.slug);if(source){product.displayName=source.title;product.searchBatchNumbers=source.batchNumbers||{};product.searchCoaStrengths=source.coaStrengths||[];product.searchTags=source.tags||[];}}}catch{}
await writeFile(contentRoot+'/catalog.json',JSON.stringify([...catalog.values()],null,2));
console.log(`Compiled ${catalog.size} products and ${[...catalog.values()].reduce((n,p)=>n+p.variants.length,0)} variants`);
