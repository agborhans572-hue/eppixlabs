import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises';import {load} from 'cheerio';
const m=JSON.parse(await readFile('reference/manifest.json','utf8'));const routes=new Set(m.pages.map(p=>p.route));['/account','/checkout','/auth/callback'].forEach(r=>routes.add(r));
const missingRoutes=new Map(),missingAssets=new Set(),emptyPages=[],unsafe=[];
for(const f of await readdir('reference/pages')){const p=JSON.parse(await readFile('reference/pages/'+f,'utf8')),$=load(p.html);
 if(!$('main').length||!$('main').text().trim())emptyPages.push(p.route);
 if($('script,iframe').length)unsafe.push(p.route);
 for(const e of $('a[href]').toArray()){const href=$(e).attr('href');if(!href.startsWith('/')||href.startsWith('//'))continue;const route=href.split(/[?#]/)[0];if(!route||route.startsWith('/reference/'))continue;if(!routes.has(route)){const sources=missingRoutes.get(route)||[];if(sources.length<3)sources.push(p.route);missingRoutes.set(route,sources);}}
 for(const e of $('img[src]').toArray()){const src=$(e).attr('src');if(src.startsWith('/reference/'))try{await stat('public'+src);}catch{missingAssets.add(src);}}
}
const report={pages:m.pages.length,assets:m.assets.length,missingRoutes:[...missingRoutes].map(([route,from])=>({route,from})),missingAssets:[...missingAssets],emptyPages,unsafe};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/content-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(missingAssets.size||unsafe.length)process.exitCode=1;
