import {load} from 'cheerio';
import {pages,prepareHtml} from '../lib/catalog';
import {writeFileSync,mkdirSync} from 'node:fs';
const unbound=new Map<string,{control:string;routes:string[]}>();let buttons=0,bound=0;
for(const page of pages()){
 const $=load(prepareHtml(page));$('template').remove();
 $('button').each((_,el)=>{const b=$(el);if(b.closest('template').length)return;buttons++;if(b.attr('data-action')||b.attr('type')==='submit'||b.closest('a[href],form').length||b.closest('#reconstitution,#molarity,#dilution,#aliquots,#sequence').length||b.attr('disabled')!==undefined){bound++;return;}const control=b.text().trim()||b.attr('aria-label')||'(unlabelled)';const entry=unbound.get(control)||{control,routes:[]};if(!entry.routes.includes(page.route))entry.routes.push(page.route);unbound.set(control,entry);});
}
mkdirSync('artifacts',{recursive:true});const report={capturedStates:pages().length,buttons,bound,unbound:[...unbound.values()]};writeFileSync('artifacts/interaction-coverage.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
