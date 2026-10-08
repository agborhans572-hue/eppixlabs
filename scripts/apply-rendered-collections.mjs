import {readFile,writeFile,readdir,stat} from 'node:fs/promises';import {createHash} from 'node:crypto';import {load} from 'cheerio';import path from 'node:path';
const manifest=JSON.parse(await readFile('reference/manifest.json','utf8'));const assets=new Map(manifest.assets.map(a=>[a.source,a.local]));
for(const file of await readdir('reference/rendered')){
 const rendered=JSON.parse(await readFile('reference/rendered/'+file,'utf8'));
 const filename='reference/pages/'+createHash('sha256').update(rendered.route).digest('hex').slice(0,20)+'.json';const page=JSON.parse(await readFile(filename,'utf8'));const $=load(rendered.html,null,false);
 for(const el of $('img').toArray()){
  const img=$(el),src=img.attr('src');if(!src||src.startsWith('data:'))continue;let url=new URL(src,'https://www.eppixlabs.com');if(url.pathname==='/_next/image')url=new URL(url.searchParams.get('url'),'https://www.eppixlabs.com');
  let local=assets.get(url.href);if(!local){local='/reference/'+createHash('sha256').update(url.href).digest('hex').slice(0,20)+path.extname(url.pathname);try{const r=await fetch(url.href,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(r.status);await writeFile('public'+local,Buffer.from(await r.arrayBuffer()));assets.set(url.href,local);}catch(e){manifest.failures.push({url:url.href,error:String(e)});local=src;}}
  img.attr('src',local).removeAttr('srcset').removeAttr('loading');
 }
 $('script,iframe').remove();$('form').attr('action','').attr('method','post');
 const shell=load(page.html,null,false);shell('main').replaceWith($.html());page.html=shell.html();await writeFile(filename,JSON.stringify(page));console.log('Applied',rendered.route,$('main a[href^="/products/"]').length,'product links');
}
manifest.assets=[...assets].map(([source,local])=>({source,local}));await writeFile('reference/manifest.json',JSON.stringify(manifest,null,2));
