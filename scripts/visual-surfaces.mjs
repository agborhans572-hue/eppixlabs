import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {capture} from './visual-matrix.mjs';
export async function surfaces(tab,viewport,width,theme,reference){
 await capture(tab,viewport,'/collections/peptides',width,theme,reference);
 const directory='artifacts/visual-surfaces';await mkdir(directory,{recursive:true});
 async function save(surface){await tab.cua.move({x:8,y:80});await tab.screenshot({fullPage:false});await tab.playwright.waitForTimeout(1000);const file=surface+'-'+width+'-'+theme+'-'+(reference?'reference':'local')+'.png';await writeFile(directory+'/'+file,await tab.screenshot({fullPage:false}));let rows=[];try{rows=JSON.parse(await readFile(directory+'/report.json','utf8'));}catch{}rows=rows.filter(r=>r.file!==file);rows.push({surface,width,theme,reference,file});await writeFile(directory+'/report.json',JSON.stringify(rows,null,2));}
 await tab.playwright.getByRole('button',{name:'Filter',exact:true}).press('Enter');await save('filter');await tab.playwright.getByRole('button',{name:'Close filters',exact:true}).press('Enter');
 await tab.playwright.getByRole('button',{name:'Store region: United States. Change store',exact:true}).press('Enter');await save('region');await tab.playwright.getByRole('menuitem',{name:reference?'United States':'United States \u2713',exact:false}).press('Escape');
 await tab.playwright.getByPlaceholder('Search products, certificates, articles, or batch numbers...',{exact:true}).fill('retatrutide');await tab.playwright.waitForTimeout(1200);await save('search');await tab.playwright.getByRole('button',{name:'Clear search',exact:true}).press('Enter');
 if(width<1024){await tab.playwright.getByRole('button',{name:'Toggle menu',exact:true}).press('Enter');await save('menu');await tab.playwright.getByRole('button',{name:'Toggle menu',exact:true}).press('Enter');}
 await tab.playwright.getByRole('button',{name:/Shopping cart/}).press('Enter');await tab.playwright.getByRole('button',{name:'Close cart',exact:true}).waitFor({state:'visible'});await save('cart');await tab.playwright.getByRole('button',{name:'Close cart',exact:true}).press('Escape');
 return {width,theme,reference};
}
export async function certificate(tab,viewport,width,theme,reference){
 await capture(tab,viewport,'/products/retatrutide',width,theme,reference);
 await tab.playwright.getByRole('button',{name:'Certificate of Analysis',exact:true}).press('Enter');
 await tab.playwright.getByRole('button',{name:'Expand',exact:true}).press('Enter');
 await tab.cua.move({x:8,y:80});await tab.screenshot({fullPage:false});await tab.playwright.waitForTimeout(1000);
 const directory='artifacts/visual-surfaces',file='certificate-'+width+'-'+theme+'-'+(reference?'reference':'local')+'.png';
 await mkdir(directory,{recursive:true});await writeFile(directory+'/'+file,await tab.screenshot({fullPage:false}));
 let rows=[];try{rows=JSON.parse(await readFile(directory+'/report.json','utf8'));}catch{}rows=rows.filter(r=>r.file!==file);rows.push({surface:'certificate',width,theme,reference,file});await writeFile(directory+'/report.json',JSON.stringify(rows,null,2));return file;
}
