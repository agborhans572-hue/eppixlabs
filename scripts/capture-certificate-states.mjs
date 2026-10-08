import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const manifest=JSON.parse(await readFile('reference/manifest.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,20);
const base=JSON.parse(await readFile('reference/pages/'+hash('/certificates-of-analysis')+'.json','utf8'));
const assets=new Map(manifest.assets.map(a=>[a.source,a.local]));
const queue=[],seen=new Set(['/certificates-of-analysis']);
function discover($){$('main a[href^="/certificates-of-analysis?"]').each((_,el)=>{const url=new URL($(el).attr('href'),manifest.origin);url.searchParams.sort();const route=url.pathname+url.search;if(!seen.has(route)){seen.add(route);queue.push(route);}});}
discover(load(base.html));
while(queue.length){const route=queue.shift();const response=await fetch(manifest.origin+route,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(route+': '+response.status);const $=load(await response.text());discover($);const title=$('title').text(),description=$('meta[name="description"]').attr('content');$('script,noscript,iframe,link,next-route-announcer,[hidden]').remove();$('form').attr('action','').attr('method','post');
 for(const el of $('*').toArray())for(const attr of Object.keys(el.attribs||{}))if(/^on/i.test(attr))$(el).removeAttr(attr);
 for(const el of $('img').toArray()){const img=$(el),src=img.attr('src');if(!src||src.startsWith('data:'))continue;let url=new URL(src,manifest.origin);if(url.pathname==='/_next/image')url=new URL(url.searchParams.get('url'),manifest.origin);const local=assets.get(url.href);if(!local)throw Error('Uncaptured asset '+url.href);img.attr('src',local).removeAttr('srcset').removeAttr('loading');}
 const shell=load(base.html,null,false);shell('main').replaceWith($('main').prop('outerHTML'));const page={...base,route,title,description,html:shell.html(),source:manifest.origin+route,capturedAt:new Date().toISOString()};const file=hash(route)+'.json';await writeFile('reference/pages/'+file,JSON.stringify(page));if(!manifest.pages.some(p=>p.route===route))manifest.pages.push({route,title,file});console.log(route,$('main tbody tr').length,'rows');
}
for(const [source,filename] of [['/icon.png?icon.1c079bf1.png','/icon.png'],['/apple-icon.png?apple-icon.c12b186b.png','/apple-icon.png']]){const r=await fetch(manifest.origin+source);if(!r.ok)throw Error(source);await writeFile('public'+filename,Buffer.from(await r.arrayBuffer()));if(!manifest.assets.some(a=>a.local===filename))manifest.assets.push({source:manifest.origin+source,local:filename});}
await writeFile('reference/manifest.json',JSON.stringify(manifest,null,2));
