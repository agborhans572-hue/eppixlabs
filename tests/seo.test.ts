import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {pageSeo,structuredData,productSchema,serializeJsonLd,languageAlternates} from '../lib/seo';
import {readPage,products,prepareHtml} from '../lib/catalog';
import {prepareSeoHtml} from '../lib/seo-html';
import {siteOrigin} from '../lib/site';
import type {Product} from '../lib/types';

test('regional products expose matching canonicals, social metadata and currency-specific descriptions',()=>{
  for(const region of ['us','ca'] as const){
    const page=readPage('/products/bpc-157',region)!,metadata=pageSeo(page.route,region,page);
    assert.equal(metadata.alternates?.canonical,siteOrigin()+(region==='ca'?'/ca':'')+page.route);
    assert.match(metadata.description!,region==='ca'?/CAD/:/USD/);
    assert.ok(metadata.openGraph&&metadata.twitter);
    assert.equal(languageAlternates(page.route)['en-CA'],siteOrigin()+'/ca/products/bpc-157');
    assert.equal(languageAlternates(page.route)['x-default'],siteOrigin()+'/products/bpc-157');
    assert.doesNotMatch(pageSeo('/payment-methods',region,page).description!,/Interac|credit card,|Google Pay/);
  }
});

test('real pagination is self-canonical while filters and private/missing pages are noindex',()=>{
  const page=readPage('/collections/peptides','ca')!;
  assert.equal(pageSeo(page.route,'ca',page,{page:'2'}).alternates?.canonical,siteOrigin()+'/ca/collections/peptides?page=2');
  assert.equal(pageSeo(page.route,'ca',page,{page:'999'}).alternates?.canonical,siteOrigin()+'/ca/collections/peptides?page=3');
  for(const query of [{q:'test'},{sort:'price-asc'},{stock:'1'},{category:'capsules'}])assert.equal((pageSeo(page.route,'ca',page,query).robots as {index:boolean}).index,false);
  for(const route of ['/checkout','/login','/ca/account','/missing'])assert.equal((pageSeo(route,'us',route==='/missing'?null:page).robots as {index:boolean}).index,false);
  assert.equal(pageSeo('/products/bpc-157','us',readPage('/products/bpc-157'),{strength:'10mg'}).alternates?.canonical,siteOrigin()+'/products/bpc-157');
});

test('product offers use regional prices and truthful availability without invented ratings',()=>{
  for(const region of ['us','ca'] as const){
    const product=products(region).find(p=>p.slug==='bpc-157')!;
    const schema=productSchema(product,region,'Research use only.'),offers=schema.offers as Record<string,unknown>[];
    const variants=product.variants.filter(v=>v.packSize===1&&v.priceCents>0);
    assert.equal(offers.length,variants.length);
    for(const [i,offer] of offers.entries()){
      assert.equal(offer.price,(variants[i].priceCents/100).toFixed(2));
      assert.equal(offer.priceCurrency,region==='ca'?'CAD':'USD');
      assert.ok(String(offer.url).startsWith(siteOrigin()+(region==='ca'?'/ca':'')+'/products/'));
    }
    const unavailable=productSchema({...product,comingSoon:true},region,'');
    assert.ok((unavailable.offers as Record<string,unknown>[]).every(offer=>offer.availability==='https://schema.org/OutOfStock'));
    assert.equal(schema.aggregateRating,undefined);assert.equal(schema.review,undefined);
  }
});

test('JSON-LD is server serializable and cannot break out of a script tag',()=>{
  const page=readPage('/products/bpc-157')!,data=structuredData(page.route,'us',page,page.html);
  assert.ok(data['@graph'].some(node=>node['@type']==='Product'));
  assert.ok(data['@graph'].some(node=>node['@type']==='BreadcrumbList'));
  const serialized=serializeJsonLd({value:'</script><script>alert(1)</script>'});
  assert.doesNotMatch(serialized,/<\/script>/);assert.equal(JSON.parse(serialized).value,'</script><script>alert(1)</script>');
});

test('every regional catalog product is discoverable through a normal server-rendered link',()=>{
  for(const region of ['us','ca'] as const){
    const $=load('<main><h1>Catalog</h1></main>');prepareSeoHtml($,'/collections/peptides',region,products(region));
    const links=new Set($('.seo-catalog-directory a').map((_,el)=>$(el).attr('href')).get());
    for(const product of products(region))assert.ok(links.has((region==='ca'?'/ca':'')+'/products/'+product.slug),product.slug);
  }
});

test('buying guidance links the actual lot and preserves real image dimensions and priority',()=>{
  const product=products().find(p=>p.slug==='bpc-157')!,page=readPage('/products/bpc-157')!,$=load(prepareHtml(page));
  for(const certificate of product.certificates)assert.ok($('.seo-report-links a').toArray().some(el=>$(el).attr('href')==='/certificates-of-analysis/'+certificate.batch.toLowerCase()));
  assert.equal($('main img[data-product-image]').first().attr('loading'),'eager');
  assert.equal($('main img[data-product-image]').first().attr('fetchpriority'),'high');
  assert.ok($('main img[data-product-image]').first().attr('width'));
  assert.equal($('main img[fetchpriority="high"]').length,1);
  assert.match($('.seo-buying-guide').text(),/no payment is collected/);
});
