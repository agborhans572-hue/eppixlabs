import {readFile,writeFile,mkdir} from 'node:fs/promises';
const manifest=JSON.parse(await readFile('reference/manifest.json','utf8'));
const certificates=JSON.parse(await readFile('reference/certificates.json','utf8'));
const routes=[...new Set([...manifest.pages.map(p=>p.route),...certificates.map(c=>'/certificates-of-analysis/'+c.batch.toLowerCase())])];
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';let cursor=0;const failures=[];
await Promise.all(Array.from({length:4},async()=>{while(cursor<routes.length){const route=routes[cursor++];try{const r=await fetch(origin+route,{signal:AbortSignal.timeout(60000)});const html=await r.text();if(r.status!==200||!html.includes('<main'))failures.push({route,status:r.status});}catch(e){failures.push({route,error:String(e)});}}}));
await mkdir('artifacts',{recursive:true});const report={origin,checked:routes.length,failures};await writeFile('artifacts/route-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
