import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const m=JSON.parse(await readFile('reference/manifest.json','utf8'));
const existing=new Map(m.assets.map(a=>[a.source,a.local])); const urls=new Set();
function walk(x) { if(typeof x==='string' && /^https:\/\/(www\.eppixlabs\.com|[^/]+\.public\.blob\.vercel-storage\.com)\//.test(x) && /\.(webp|png|jpg|jpeg|svg|pdf)(\?|$)/i.test(x))urls.add(x); else if(x&&typeof x==='object')Object.values(x).forEach(walk); }
for(const f of await readdir('reference/pages')) {const p=JSON.parse(await readFile('reference/pages/'+f,'utf8')); walk(p.records);}
const pending=[...urls].filter(u=>!existing.has(u)); let index=0;
await Promise.all(Array.from({length:8},async()=>{while(index<pending.length){const u=pending[index++];try{const r=await fetch(u,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const name='/reference/'+createHash('sha256').update(u).digest('hex').slice(0,20)+path.extname(new URL(u).pathname);await writeFile('public'+name,Buffer.from(await r.arrayBuffer())); existing.set(u,name);}catch(e){m.failures.push({url:u,error:String(e)});}}}));
m.assets=[...existing].map(([source,local])=>({source,local})); await writeFile('reference/manifest.json',JSON.stringify(m,null,2));console.log(`Additional assets: ${pending.length}; total ${existing.size}`);
