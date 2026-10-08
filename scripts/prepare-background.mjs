import {readFile,writeFile} from 'node:fs/promises';import {load} from 'cheerio';import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('reference/manifest.json','utf8'));
for(const theme of ['light','dark']){const file=theme==='light'?'reference/background-rendered.html':'reference/background-dark-rendered.html';const $=load(await readFile(file,'utf8'),null,false);$('.peptide-bg > div').remove();$('.peptide-bg').attr('data-ambient-theme',theme);
for(const [index,el] of $('img').toArray().entries()){const src=$(el).attr('src');if(!src.startsWith('data:image/png;base64,'))continue;const bytes=Buffer.from(src.split(',')[1],'base64');const local='/reference/'+createHash('sha256').update(bytes).digest('hex').slice(0,20)+'.png';await writeFile('public'+local,bytes);$(el).attr('src',local).attr('data-ambient-frame',String(index));manifest.assets.push({source:'rendered:background-'+theme+'-frame-'+index,local});}
await writeFile(file,$.html());}
manifest.assets=[...new Map(manifest.assets.map(a=>[a.source,a])).values()];await writeFile('reference/manifest.json',JSON.stringify(manifest,null,2));console.log('Prepared original background frames');
