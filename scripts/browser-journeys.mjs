// Run through the in-app browser skill's persistent Node REPL; no browser package is needed.
// const suite = await import('./scripts/browser-journeys.mjs'); await suite.catalog(tab);
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
const checks=(()=>{try{return JSON.parse(readFileSync('artifacts/behavior-journeys.json','utf8')).checks;}catch{return [];}})();
const check=(label,condition)=>{assert.ok(condition,label);checks.push({label,passed:true});};
const snapshot=tab=>tab.playwright.domSnapshot();
export async function catalog(tab){
 await tab.goto('http://localhost:3000/collections/peptides');
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 check('complete catalog', (await snapshot(tab)).includes('76 products'));
 await tab.playwright.getByRole('button',{name:'Filter',exact:true}).press('Enter');
 await tab.playwright.getByRole('button',{name:'Capsules 7',exact:true}).press('Enter');
 check('capsule filter and removable chip',(await snapshot(tab)).includes('7 products')&&(await snapshot(tab)).includes('Remove Capsules filter'));
 await tab.playwright.getByRole('button',{name:'Peptides 46',exact:true}).press('Enter');
 check('multiple category union',(await snapshot(tab)).includes('53 products'));
 await tab.playwright.getByRole('button',{name:'Close filters',exact:true}).press('Enter');
 await tab.playwright.getByRole('button',{name:'Remove Capsules filter',exact:true}).press('Enter');
 check('remove individual category',(await snapshot(tab)).includes('46 products'));
 await tab.playwright.getByRole('button',{name:'Clear all',exact:true}).press('Enter');
 check('filter reset',(await snapshot(tab)).includes('76 products'));
 await tab.playwright.locator('button[aria-label="Store region: United States. Change store"]').click();
 check('external Canadian store',await tab.playwright.getByRole('menuitem',{name:'Canada',exact:false}).getAttribute('href')==='https://eppixlabs.ca');
 await tab.playwright.getByRole('menuitem',{name:'United States',exact:false}).click();
 await tab.playwright.getByPlaceholder('Search products, certificates, articles, or batch numbers...').fill('retatrutide');
 await tab.playwright.locator('.clone-search-panel section a').first().waitFor({state:'visible'});
 check('search grouped products and certificates',(await snapshot(tab)).includes('heading "Products"')&&(await snapshot(tab)).includes('heading "Certificates"'));
 check('certificate search selects a product COA',await tab.playwright.locator('.clone-search-panel a[href*="?coa="]').count()>0);
 await tab.playwright.getByRole('button',{name:'Clear search',exact:true}).press('Enter');
 check('search clear',await tab.playwright.getByPlaceholder('Search products, certificates, articles, or batch numbers...').getAttribute('value')!== 'retatrutide');
 await save();return checks;
}
export async function research(tab){
 await tab.goto('http://localhost:3000/peptide-research');
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 await tab.playwright.getByRole('button',{name:'Tissue Repair',exact:true}).press('Enter');
 check('research subject count',(await snapshot(tab)).includes('9 / 53 shown'));
 await tab.playwright.getByRole('button',{name:'Cognitive',exact:true}).press('Enter');
 check('research subject union',(await snapshot(tab)).includes('11 / 53 shown'));
 await tab.playwright.getByRole('button',{name:'Newest',exact:true}).press('Enter');
 const dates=await tab.playwright.evaluate(()=>Array.from(document.querySelectorAll('#full-library a:not([hidden]) time')).filter(t=>!t.closest('[hidden]')).map(t=>t.getAttribute('datetime')));
 check('research date order',dates.every((date,i)=>!i||dates[i-1]>=date));
 await tab.playwright.getByRole('searchbox',{name:'Filter',exact:true}).fill('unmatchable-library-query-921');
 check('research empty state',(await snapshot(tab)).includes('0 / 53 shown')&&(await snapshot(tab)).includes('No articles match these filters.'));
 await tab.playwright.getByRole('button',{name:'Reset',exact:true}).press('Enter');
 check('research reset',(await snapshot(tab)).includes('53 shown')&&!(await snapshot(tab)).includes('No articles match these filters.'));
 await save();return checks;
}
export async function calculators(tab){
 await tab.goto('http://localhost:3000/peptide-calculator');
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 await tab.playwright.getByRole('tab',{name:'Serial dilution',exact:true}).press('Enter');
 await tab.playwright.getByRole('button',{name:'1:5',exact:true}).press('Enter');
 check('serial factor preset',(await tab.playwright.locator('#dilution').innerText()).includes('0.0032'));
 await tab.playwright.getByRole('slider',{name:'Number of tubes in the series',exact:true}).press('Home');
 check('serial tube range',(await snapshot(tab)).includes('Number of tubes — 2'));
 await tab.playwright.getByRole('tab',{name:'Single dilution',exact:true}).press('Enter');
 await tab.playwright.getByRole('spinbutton',{name:'Stock concentration',exact:true}).fill('1');
 await tab.playwright.getByRole('spinbutton',{name:'Target concentration',exact:true}).fill('2');
 check('dilution invalid inputs',(await tab.playwright.locator('#dilution').innerText()).includes('cannot exceed'));
 await tab.playwright.getByRole('tab',{name:'Molarity → Mass',exact:true}).press('Enter');
 check('reverse default units',(await tab.playwright.locator('#molarity').innerText()).includes('283.9'));
 await tab.playwright.getByRole('combobox',{name:'Target molarity unit',exact:true}).selectOption('mM');
 check('reverse conversion',(await tab.playwright.locator('#molarity').innerText()).includes('283.9mg'));
 await tab.playwright.getByRole('button',{name:'Kisspeptin-10',exact:true}).press('Enter');
 check('sequence preset MW',(await tab.playwright.locator('#sequence').innerText()).includes('1303.44'));
 check('sequence absorbance',(await tab.playwright.locator('#sequence').innerText()).includes('5.363'));
 await tab.playwright.getByRole('slider',{name:'Buffer pH',exact:true}).press('Home');
 check('sequence buffer pH',(await tab.playwright.locator('#sequence').innerText()).includes('pH 0.0'));
 await save();return checks;
}
export async function product(tab){
 await tab.goto('http://localhost:3000/products/retatrutide?coa=20mg');
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 check('COA query opens certificate viewer',(await snapshot(tab)).includes('20mg \u2014 Certificate of Analysis'));
 await tab.playwright.getByRole('button',{name:'Close image',exact:true}).press('Escape');
 await tab.playwright.locator('[data-product-detail] button[data-value="20mg"][aria-pressed="true"]').waitFor({state:'visible'});
 check('COA query selects variant',await tab.playwright.getByRole('button',{name:'20mg',exact:true}).getAttribute('aria-pressed')==='true');
 check('COA query opens accordion',await tab.playwright.locator('[data-product-detail] button[data-action="accordion"]').filter({hasText:'Certificate of Analysis'}).getAttribute('aria-expanded')==='true');
 await tab.playwright.getByRole('button',{name:'120mg',exact:true}).press('Enter');
 check('unpublished certificate state',(await tab.playwright.locator('[data-coa-missing]').innerText()).includes('120mg lot'));
 check('unpublished certificate hides document',await tab.playwright.locator('[data-coa-document-grid]').getAttribute('hidden')!==null);
 check('unpublished certificate removes gallery report',await tab.playwright.getByRole('button',{name:'Go to slide 2',exact:true}).count()===0);
 await tab.playwright.getByRole('button',{name:'40mg',exact:true}).press('Enter');
 check('variant heading',(await snapshot(tab)).includes('Retatrutide 40 mg'));
 await tab.playwright.getByRole('button',{name:'5-Pack',exact:true}).press('Enter');
 check('pack vial summary',(await snapshot(tab)).includes('5 vials — 10% vial discount applied.'));
 await tab.playwright.getByRole('button',{name:'Increase quantity',exact:true}).press('Enter');
 check('quantity discount boundary',(await snapshot(tab)).includes('10 vials — 20% vial discount applied.'));
 await tab.playwright.getByRole('button',{name:'Next image',exact:true}).press('Enter');
 check('gallery advances',await tab.playwright.getByRole('button',{name:'Go to slide 2',exact:true}).getAttribute('aria-pressed')==='true');
 await tab.playwright.locator('[data-product-detail] button[data-action="add"]').first().press('PageDown');
 await tab.playwright.locator('[data-product-detail] button[data-action="add"]').first().press('Enter');
 await tab.playwright.getByRole('dialog').waitFor({state:'visible'});
 check('cart contains variant and disabled checkout',(await snapshot(tab)).includes('40mg / 5-Pack')&&(await snapshot(tab)).includes('Checkout unavailable'));
 await tab.playwright.getByRole('button',{name:'Close cart',exact:true}).press('Enter');
 await tab.goto('http://localhost:3000/about');
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 await tab.playwright.locator('[data-action="cart"]').click();
 check('cart recovers after navigation',(await snapshot(tab)).includes('40mg / 5-Pack'));
 await tab.playwright.getByRole('button',{name:'Close cart',exact:true}).press('Escape');
 check('escape dismisses modal',await tab.playwright.getByRole('dialog').count()===0);
 await save();return checks;
}
export async function navigation(tab){
 await tab.back();
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 check('back restores variant query',(await tab.url()).includes('strength=40mg'));
 check('back restores COA viewer',await tab.playwright.getByRole('button',{name:'Close image',exact:true}).count()===1);
 await tab.playwright.getByRole('button',{name:'Close image',exact:true}).press('Escape');
 await tab.reload();
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 await tab.playwright.waitForTimeout(1500);
 check('reload restores COA viewer',await tab.playwright.getByRole('button',{name:'Close image',exact:true}).count()===1);
 await tab.playwright.getByRole('button',{name:'Close image',exact:true}).press('Escape');
 check('reload restores variant selection',await tab.playwright.locator('[data-product-detail] button[data-value="40mg"]').getAttribute('aria-pressed')==='true');
 await tab.playwright.locator('[data-action="cart"]').press('Enter');
 await tab.playwright.locator('.clone-captured[inert]').waitFor({state:'attached'});
 check('reload preserves cart',(await snapshot(tab)).includes('40mg / 5-Pack'));
 check('modal focus and inert background',await tab.playwright.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]')&&document.querySelector('.clone-captured').hasAttribute('inert')));
 await tab.playwright.getByRole('button',{name:'Close cart',exact:true}).press('Escape');
 await tab.forward();
 check('forward returns to about',(await tab.url()).endsWith('/about'));
 await save();return checks;
}
async function save(){await mkdir('artifacts',{recursive:true});const unique=[...new Map(checks.map(c=>[c.label,c])).values()];await writeFile('artifacts/behavior-journeys.json',JSON.stringify({checks:unique,passed:unique.length},null,2));}
export async function certificateHover(tab){
 await tab.goto('http://localhost:3000/collections/peptides');
 await tab.playwright.locator('.clone-captured[data-interactions-ready="true"]').waitFor({state:'attached'});
 try{await tab.cua.scroll({x:500,y:750,scrollY:430,scrollX:0});}catch(error){const visible=await tab.playwright.evaluate(()=>{const r=document.querySelector('[data-product-card][data-product="retatrutide"] [data-coa-flip-frame]').getBoundingClientRect();return r.y>=0&&r.bottom<innerHeight;});if(!visible)throw error;}
 const frame='[data-product-card][data-product="retatrutide"] [data-coa-flip-frame]';
 const state=()=>tab.playwright.evaluate(()=>{const f=document.querySelector('[data-product-card][data-product="retatrutide"] [data-coa-flip-frame]');const t=f.firstElementChild;return {flipped:f.dataset.coaFlipped,available:f.dataset.coaAvailable,transform:t.style.transform,frontInert:t.children[0].hasAttribute('inert'),backInert:t.children[1].hasAttribute('inert'),backHidden:t.children[1].hidden,image:t.children[1].querySelector('img').getAttribute('src'),duration:getComputedStyle(t).transitionDuration};});
 const hoverCard=async()=>{const rect=await tab.playwright.evaluate(()=>{const r=document.querySelector('[data-product-card][data-product="retatrutide"] [data-coa-flip-frame]').getBoundingClientRect();return {x:r.x+r.width/2,y:(Math.max(r.y,70)+Math.min(r.bottom,innerHeight))/2};});await tab.cua.move(rect);};
 await hoverCard();await tab.playwright.waitForTimeout(600);
 let s=await state();check('certificate hover rotates 180 degrees in 500ms',s.flipped==='true'&&s.transform==='rotateY(180deg)'&&s.duration==='0.5s');
 check('hover hides front controls from keyboard',s.frontInert&&!s.backInert&&!s.backHidden);
 await tab.playwright.locator('[data-product-card][data-product="retatrutide"] [data-action="strength"][data-value="120mg"]').press('Enter');
 s=await state();check('missing certificate resets hover and removes stale report',s.flipped==='false'&&s.available==='false'&&s.backHidden&&!s.frontInert&&s.backInert);
 await tab.playwright.locator('[data-product-card][data-product="retatrutide"] [data-action="strength"][data-value="20mg"]').press('Enter');
 await hoverCard();await tab.playwright.waitForTimeout(600);
 s=await state();check('restored variant reveals its own certificate',s.flipped==='true'&&s.image==='/reference/8b91a7da26ec67b6f49e.webp');
 await tab.cua.move({x:8,y:80});await tab.playwright.waitForTimeout(600);
 s=await state();check('pointer leave restores vial image and controls',s.flipped==='false'&&!s.frontInert&&s.backInert);
 await save();return checks;
}
