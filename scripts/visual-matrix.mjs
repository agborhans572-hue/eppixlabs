// Invoke with the browser skill's documented tab and viewport APIs.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const directory='artifacts/visual-matrix';
export async function capture(tab,viewport,route,width,theme,reference=false){
 await viewport.set({width,height:900});
 await tab.goto((reference?'https://www.eppixlabs.com':'http://localhost:3000')+route);
 if(!reference)await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 const dark=await tab.playwright.evaluate(()=>document.documentElement.classList.contains('dark'));
 if(dark!==(theme==='dark'))await tab.playwright.getByRole('button',{name:dark?'Switch to light mode':'Switch to dark mode',exact:true}).press('Enter');
 await tab.playwright.waitForTimeout(900);
 await tab.cua.move({x:8,y:80});
 await tab.screenshot({fullPage:false});
 await tab.playwright.waitForTimeout(1000);
 const state=await tab.playwright.evaluate(()=>({actualTheme:document.documentElement.classList.contains('dark')?'dark':'light',width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent,broken:Array.from(document.querySelectorAll('main img')).filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));
 const file=route.replace(/[^a-z0-9]/gi,'_')+'-'+width+'-'+theme+'-'+(reference?'reference':'local')+'.png';
 await mkdir(directory,{recursive:true});await writeFile(directory+'/'+file,await tab.screenshot({fullPage:false}));
 let records=[];try{records=JSON.parse(await readFile(directory+'/report.json','utf8'));}catch{}
 records=records.filter(r=>r.file!==file);records.push({route,width,theme,reference,file,...state});await writeFile(directory+'/report.json',JSON.stringify(records,null,2));return {file,...state};
}
