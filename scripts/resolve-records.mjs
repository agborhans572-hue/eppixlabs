import {readFile,writeFile,readdir} from 'node:fs/promises';import {load} from 'cheerio';
const contentRoot=process.env.CAPTURE_REGION==='ca'?'reference/canada':'reference';
for(const file of await readdir(contentRoot+'/pages')){
 const page=JSON.parse(await readFile(contentRoot+'/pages/'+file,'utf8'));if(!page.records?.length)continue;
 const raw=await readFile(contentRoot+'/raw/'+file.replace('.json','.html'),'utf8'),$=load(raw);let flight='';
 $('script').each((_,el)=>{const match=($(el).html()||'').match(/^self\.__next_f\.push\((\[.*\])\)$/s);if(match)try{const row=JSON.parse(match[1]);if(row[0]===1)flight+=row[1];}catch{}});
 const rows=new Map();
 for(const m of flight.matchAll(/(?:^|\n)([0-9a-f]+):/g)){
  const start=m.index+m[0].length;const tail=flight.slice(start);
  if(tail.startsWith('T')) {const text=tail.match(/^T([0-9a-f]+),/);if(text)rows.set(m[1],Buffer.from(tail.slice(text[0].length)).subarray(0,parseInt(text[1],16)).toString());}
  else if(tail.startsWith('{')||tail.startsWith('[')||tail.startsWith('"'))try{rows.set(m[1],JSON.parse(tail.split('\n')[0]));}catch{}
 }
 function resolve(x,trail=new Set()){
  if(typeof x==='string' && /^\$[0-9a-f]+(?::.*)?$/.test(x)){
   const [id,...keys]=x.slice(1).split(':');const token=x;
   if(rows.has(id)&&!trail.has(token)){
    let value=rows.get(id);const nextTrail=new Set([...trail,token]);
    for(const key of keys){if(typeof value==='string')value=resolve(value,nextTrail);if(key==='props'&&Array.isArray(value)&&value[0]==='$')value=value[3];else value=value?.[key];}
    if(value!==undefined)return resolve(value,nextTrail);
   }
  }
  if(Array.isArray(x))return x.map(v=>resolve(v,trail));
  if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,resolve(v,trail)]));
  return x;
 }
 page.records=page.records.map(r=>resolve(r));await writeFile(contentRoot+'/pages/'+file,JSON.stringify(page));
}
console.log('Resolved streamed public product records');
