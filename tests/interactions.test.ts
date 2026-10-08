import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseVariant,filteredProducts,defaultFilters,matchesArticle,compareArticles,vialDiscount} from '../lib/interactions';
import {serialDilution} from '../lib/calculations';
import type {Product} from '../lib/types';
const catalog:Product[]=JSON.parse(readFileSync('reference/catalog.json','utf8'));
const membership=JSON.parse(readFileSync('reference/behavior/category-members.json','utf8'));
test('catalog categories use union selection and reset to the complete catalog',()=>{
 assert.equal(filteredProducts(catalog,{...defaultFilters,categories:['Capsules']},membership).length,7);
 assert.equal(filteredProducts(catalog,{...defaultFilters,categories:['Capsules','Peptides']},membership).length,53);
 assert.equal(filteredProducts(catalog,defaultFilters,membership).length,76);
});
test('sorting and unavailable filters use typed catalog values',()=>{
 const list=filteredProducts(catalog,{...defaultFilters,stockOnly:true,sort:'price-up'},membership);
 assert.ok(list.every(p=>!p.comingSoon&&p.variants.some(v=>v.available)));
 const prices=list.map(p=>Math.min(...p.variants.filter(v=>v.packSize===1).map(v=>v.priceCents)));
 assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
});
test('variant selection preserves strength and pack and handles unavailable combinations',()=>{
 const p=catalog.find(p=>p.slug==='retatrutide')!;
 assert.equal(chooseVariant(p,'20mg',5)?.packSize,5);
 assert.equal(chooseVariant(p,'20mg',7)?.strength,'20mg');
 assert.equal(chooseVariant(p,'20mg',7)?.packSize,1);
});
test('research selections compose query, subject union and publication month',()=>{
 const filters={query:'peptide',subjects:['Cognitive','Tissue Repair'],month:'2026-09',order:'Curated' as const};
 assert.equal(matchesArticle('Cognitive peptide research','2026-09-23',filters),true);
 assert.equal(matchesArticle('Tissue Repair peptide research','2026-09-23',filters),true);
 assert.equal(matchesArticle('Metabolic peptide research','2026-09-23',filters),false);
 assert.equal(matchesArticle('Cognitive peptide research','2026-08-23',filters),false);
 assert.equal(compareArticles({date:'2026-09-23',index:2},{date:'2026-08-23',index:1},'Newest'),-1);
});
test('discount summaries follow all six boundary points',()=>assert.deepEqual([2,3,4,5,9,10].map(vialDiscount),[0,5,5,10,10,20]));
test('serial dilution includes the starting tube and charges only downstream tubes',()=>{
 const r=serialDilution(10,10,6,1)!;
 assert.deepEqual(r.concentrations,[10,1,.1,.01,.001,.0001]);
 assert.equal(r.transfer,.1);assert.equal(r.totalDiluent,4.5);assert.equal(r.finalFactor,100000);
 assert.equal(serialDilution(10,1,6,1),null);assert.equal(serialDilution(10,10,13,1),null);
});
