import {readFile,readdir} from 'node:fs/promises';import path from 'node:path';import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before import.');
const db=createClient(url,key,{auth:{persistSession:false}}),catalog=JSON.parse(await readFile('reference/catalog.json','utf8')),manifest=JSON.parse(await readFile('reference/manifest.json','utf8'));
async function upsert(table,rows,key){for(let i=0;i<rows.length;i+=25){const {error}=await db.from(table).upsert(rows.slice(i,i+25),{onConflict:key});if(error)throw Error(table+': '+error.message);}console.log('Imported',table,rows.length);}
await upsert('products',catalog.map(p=>({id:p.id,slug:p.slug,data:p})),'id');
await upsert('variants',catalog.flatMap(p=>p.variants.map(v=>({id:v.id,product_id:p.id,price_cents:v.priceCents,stock:v.stock,available:v.available,data:v}))),'id');
const certificates=JSON.parse(await readFile('reference/certificates.json','utf8'));
await upsert('batches',certificates.map(c=>({code:c.batch,product_id:catalog.find(p=>p.certificates.some(x=>x.batch===c.batch))?.id||null,data:c})),'code');
await upsert('certificates',certificates.map(c=>({batch_code:c.batch,data:c})),'batch_code');
const pages=[];for(const f of await readdir('reference/pages')){const p=JSON.parse(await readFile('reference/pages/'+f,'utf8'));delete p.records;pages.push(p);}
await upsert('public_pages',pages.map(p=>({route:p.route,data:p})),'route');
await upsert('collections',pages.filter(p=>p.route.startsWith('/collections/')).map(p=>({slug:p.route.split('/')[2],data:p})),'slug');
await upsert('articles',pages.filter(p=>p.route.startsWith('/peptide-research/')).map(p=>({slug:p.route.slice('/peptide-research/'.length),data:p})),'slug');
const contentTypes={'.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.pdf':'application/pdf','.woff2':'font/woff2'};
let i=0;for(const a of manifest.assets){if(!a.local.startsWith('/reference/'))continue;const filename=a.local.replace(/^\//,'');const bytes=await readFile('public/'+filename);const {error}=await db.storage.from('clone-assets').upload(filename,bytes,{upsert:true,contentType:contentTypes[path.extname(filename)]||'application/octet-stream'});if(error)throw Error('Storage upload failed: '+error.message);if(++i%50===0)console.log('Uploaded assets',i);}
await upsert('assets',manifest.assets.filter(a=>a.local.startsWith('/reference/')).map(a=>({source:a.source,storage_path:a.local.slice(1),data:a})),'source');
console.log('Import complete. No customer records or orders were imported.');
