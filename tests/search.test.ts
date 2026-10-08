import test from 'node:test';
import assert from 'node:assert/strict';
import {search} from '../lib/catalog';
test('public search preserves strength and certificate navigation',()=>{
 const results=search('retatrutide 20mg');
 assert.ok(results.some(r=>r.type==='Product'&&r.url==='/products/retatrutide?strength=20mg'));
 assert.ok(results.some(r=>r.type==='Certificate'&&r.url==='/products/retatrutide?coa=20mg'));
 assert.ok(results.every(r=>r.type!=='Certificate'||r.title.includes('20mg')));
});
test('public search accepts compact compound names and bounds grouped results',()=>{
 assert.ok(search('bpc157').some(r=>r.type==='Product'&&r.url.startsWith('/products/bpc-157')));
 const results=search('peptide');
 for(const [type,limit] of [['Product',6],['Certificate',5],['Research',5],['Page',4]] as const)assert.ok(results.filter(r=>r.type===type).length<=limit);
 assert.ok(search('b').some(r=>r.type==='Product'));
 assert.deepEqual(search(''),[]);
});
