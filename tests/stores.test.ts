import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load} from 'cheerio';
import {storeRoute,storePath,cartKey} from '../lib/stores';
import {products,pages,readPage,prepareHtml,search} from '../lib/catalog';
import {chooseVariant} from '../lib/interactions';
import {priceCart} from '../lib/cart';
import {canadianCollection} from '../lib/canada-collections';
import {isNonIndexablePath} from '../lib/site';
import sitemap from '../app/sitemap';

test('store routes preserve US paths and regionalize Canada exactly once',()=>{
  assert.deepEqual(storeRoute('/ca'),{region:'ca',route:'/'});
  assert.deepEqual(storeRoute('/ca/products/retatrutide'),{region:'ca',route:'/products/retatrutide'});
  assert.deepEqual(storeRoute('/calculator'),{region:'us',route:'/calculator'});
  assert.equal(storePath('/','ca'),'/ca');
  assert.equal(storePath('/ca/products/retatrutide?strength=20mg','ca'),'/ca/products/retatrutide?strength=20mg');
  assert.equal(storePath('/products/retatrutide','us'),'/products/retatrutide');
});
test('Canada has its own CAD prices, strengths and variant identities',()=>{
  const ca=products('ca'),us=products(),usIds=new Set(us.flatMap(p=>p.variants.map(v=>v.id)));
  assert.equal(ca.length,58);assert.equal(us.length,76);
  for(const p of ca){assert.equal(p.store,'ca');assert.ok(p.id.startsWith('ca:'));for(const v of p.variants){assert.ok(v.id.startsWith('ca:'));assert.equal(usIds.has(v.id),false);assert.ok(Number.isSafeInteger(v.priceCents));}}
  const ret=ca.find(p=>p.slug==='retatrutide')!;
  assert.equal(chooseVariant(ret)?.strength,'10mg');assert.equal(chooseVariant(ret)?.priceCents,6999);
  assert.equal(chooseVariant(ret,'50mg')?.priceCents,19999);
  assert.equal(chooseVariant(ret,'40mg')?.available,false);
});
test('US and Canada carts cannot mix identities, currencies or discounts',()=>{
  const ca=products('ca'),us=products(),v=chooseVariant(ca.find(p=>p.slug==='retatrutide')!)!;
  assert.equal(cartKey('user:123','us'),'user:123');assert.equal(cartKey('user:123','ca'),'user:123:ca');
  assert.notEqual(cartKey('guest:123','ca'),cartKey('guest:123','us'));
  const cart=priceCart([{variantId:v.id,quantity:3}],ca,'ca');
  assert.equal(cart.currency,'CAD');assert.equal(cart.region,'ca');assert.equal(cart.subtotalCents,20997);assert.equal(cart.discountPercent,5);assert.equal(cart.checkoutAvailable,true);
  assert.throws(()=>priceCart([{variantId:v.id,quantity:1}],[...us,...ca],'us'));
  assert.throws(()=>priceCart([{variantId:us[0].variants[0].id,quantity:1}],[...us,...ca],'ca'));
});
test('every Canadian product keeps its gallery and local scientific images',()=>{
  const productPages=pages('ca').filter(p=>p.route.startsWith('/products/'));
  assert.equal(productPages.length,products('ca').length);
  for(const page of productPages){const $=load(prepareHtml(page,'ca')),track=$('[data-product-gallery-track]');assert.equal(track.length,1,page.route);assert.ok(track.children().length>=1,page.route);track.find('img').each((_,el)=>{const src=$(el).attr('src')||'';assert.ok(src.startsWith('/reference/'),page.route+' '+src);assert.ok(existsSync('public'+src),src);});
    $('[role="tablist"] button').each((_,el)=>{assert.equal($(el).attr('data-action'),'gallery');assert.ok($(el).attr('data-slide'));});
    $('a[href^="/products/"],a[href^="/collections/"]').each((_,el)=>assert.fail(page.route+' unprefixed navigation '+$(el).attr('href')));
  }
});
test('Canadian catalog pagination and price sorting use all 58 products',()=>{
  const page=readPage('/collections/peptides','ca')!;
  const first=load(canadianCollection(page,{}).html),last=load(canadianCollection(page,{page:'3'}).html);
  assert.equal(first('main article').length,24);assert.equal(last('main article').length,10);
  const sorted=load(canadianCollection(page,{sort:'price-desc',stock:'1'}).html);
  const costs=sorted('main article').map((_,el)=>{const slug=(sorted(el).find('a').first().attr('href')||'').split('/')[2];return Math.min(...products('ca').find(p=>p.slug===slug)!.variants.filter(v=>v.packSize===1&&v.priceCents>0).map(v=>v.priceCents));}).get();
  assert.deepEqual(costs,[...costs].sort((a,b)=>b-a));
  assert.equal(sorted('input[name="stock"]').prop('checked'),true);
  const prepared=load(prepareHtml(canadianCollection(page,{stock:'1',sort:'price-desc'}),'ca'));
  const drawer=load(prepared('template[data-canada-filters]').html()||'');
  assert.equal(drawer('nav a').length,8);assert.equal(drawer('form').attr('action'),'/ca/collections/peptides');
  assert.equal(drawer('select[name="sort"] option[selected]').attr('value'),'price-desc');
});
test('Canadian search and sitemap stay canonical and exclude private pages',()=>{
  assert.ok(search('retatrutide','ca').length);for(const result of search('retatrutide','ca'))assert.ok(result.url==='/ca'||result.url.startsWith('/ca/'));
  const urls=new Set(sitemap().map(entry=>new URL(entry.url).pathname));
  for(const p of pages('ca'))if(!/[?#]/.test(p.route)&&!isNonIndexablePath(p.route))assert.ok(urls.has(storePath(p.route,'ca')),p.route);
  for(const route of ['/ca/account','/ca/cart','/ca/checkout','/ca/login','/ca/signup','/ca/reset-password']){assert.equal(isNonIndexablePath(route),true);assert.equal(urls.has(route),false);}
  assert.ok(urls.has('/ca'));assert.ok(urls.has('/ca/products/retatrutide'));assert.ok(readPage('/ca/products/retatrutide'));
});
test('Canadian signup and recovery retain actual forms and regional links',()=>{
  for(const route of ['/login','/signup','/forgot-password','/reset-password']){
    const $=load(prepareHtml(readPage(route,'ca')!,'ca'));
    assert.equal($('main form[data-form="'+route.slice(1)+'"]').length,1,route);
    assert.ok($('main input[type="email"],main input[type="password"]').length,route);
    assert.ok($('main').text().trim().length,route);
  }
});
test('Canadian pages do not direct transfers to the reference merchant',()=>{
  for(const route of ['/payment-methods','/terms'])assert.equal(prepareHtml(readPage(route,'ca')!,'ca').includes('orders@eppix.ca'),false,route);
});
