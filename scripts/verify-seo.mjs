import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {load} from 'cheerio';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const expectedOrigin=process.env.EXPECTED_SITE_ORIGIN;
const checks=[];
for(const prefix of ['','/ca']){
  for(const route of ['/','/products/bpc-157','/products/retatrutide','/products/tirzepatide','/products/ipamorelin','/products/thymosin-alpha-1','/collections/peptides','/about','/peptide-research','/shipping','/faq','/peptide-coa-verification',prefix?'/research-peptides-canada':'/research-peptides-usa']){
    const pathname=prefix+(route==='/'?'':route)||'/';
    const response=await fetch(origin+pathname,{signal:AbortSignal.timeout(60000)});
    assert.equal(response.status,200,pathname);
    const $=load(await response.text());
    assert.equal($('main h1').length,1,pathname+' must have one main heading');
    const canonical=$('link[rel=canonical]').attr('href');
    assert.ok(canonical,pathname+' canonical');
    assert.equal(new URL(canonical).pathname,pathname);
    if(expectedOrigin)assert.equal(new URL(canonical).origin,expectedOrigin);
    assert.ok($('meta[name=description]').attr('content'));
    assert.equal($('meta[property="og:url"]').attr('content'),canonical);
    assert.ok($('meta[name="twitter:card"]').length);
    assert.doesNotMatch($('meta[name=robots]').attr('content')||'',/noindex/);
    const schemas=$('script[type="application/ld+json"]').map((_,el)=>JSON.parse($(el).text())).get();
    const nodes=schemas.flatMap(schema=>schema['@graph']||[schema]);
    assert.ok(nodes.some(node=>node['@type']==='Organization'));
    assert.ok(nodes.some(node=>node['@type']==='WebSite'));
    if(route!=='/')assert.ok(nodes.some(node=>node['@type']==='BreadcrumbList'));
    if(route.startsWith('/products/')){
      const product=nodes.find(node=>node['@type']==='Product');assert.ok(product);
      assert.ok(product.offers.length);
      for(const offer of product.offers){
        const currency=prefix?'CAD':'USD';
        assert.equal(offer.priceCurrency,currency);
        const strength=new URL(offer.url).searchParams.get('strength');
        const row=$('.seo-variant-table tbody tr').filter((_,el)=>new URL($(el).find('th a').attr('href'),origin).searchParams.get('strength')===strength).first();
        assert.equal(row.length,1,pathname+' offer has no visible strength row: '+strength);
        const price=new Intl.NumberFormat(prefix?'en-CA':'en-US',{style:'currency',currency}).format(Number(offer.price));
        assert.equal(row.find('td').first().text(),price+' '+currency,pathname+' visible and structured prices differ');
        assert.equal(row.find('td').eq(1).text(),offer.availability==='https://schema.org/InStock'?'Available':'Unavailable');
      }
      assert.ok($('.seo-report-links a').length);
      assert.match($('.seo-buying-guide').text(),/awaiting payment/);
      assert.ok($('.seo-variant-table tbody tr').length,pathname+' strength comparison');
      assert.equal($('[data-procurement-summary]').length,1);
      assert.ok($('.seo-variant-comparison a[href*="/support"]').length);
      const lead=$('main [data-product-image]').first();
      assert.equal(lead.attr('loading'),'eager');assert.equal(lead.attr('fetchpriority'),'high');
      assert.ok(Number(lead.attr('width'))>0&&Number(lead.attr('height'))>0);
    }
    if(route==='/collections/peptides')assert.equal($('.seo-catalog-directory a').length,prefix?58:76);
    if(route==='/'){
      assert.doesNotMatch($('main').text(),/Visa, Mastercard/);
      assert.equal($('.seo-product-picks li').length,5);
    }
    if(route.startsWith('/research-peptides-')){
      assert.match($('main').text(),/awaiting payment/);
      assert.equal($('.seo-product-picks li').length,5);
    }
    if(!prefix)assert.ok($('link[hreflang="en-US"]').length);
    checks.push({path:pathname,status:response.status,canonical});
  }
}
for(const [path,canonical,noindex] of [
  ['/ca/collections/peptides?page=2','/ca/collections/peptides?page=2',false],
  ['/ca/collections/peptides?page=2&sort=price-asc','/ca/collections/peptides?page=2',true],
  ['/ca/collections/peptides?page=999','/ca/collections/peptides?page=3',true],
  ['/products/bpc-157?strength=10mg','/products/bpc-157',false],
  ['/ca/checkout','/ca/checkout',true],['/checkout','/checkout',true],
]){
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,path);
  const $=load(await response.text()),canonicalUrl=$('link[rel=canonical]').attr('href');
  assert.ok(canonicalUrl,path+' canonical');
  const url=new URL(canonicalUrl);
  assert.equal(url.pathname+url.search,canonical,path);
  assert.equal(/noindex/.test($('meta[name=robots]').attr('content')||''),noindex,path);
  checks.push({path,canonical,noindex});
}
const missing=await fetch(origin+'/this-page-does-not-exist-seo-check',{redirect:'manual'});assert.equal(missing.status,404);
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/seo-verification.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),checks},null,2));
console.log(`Verified ${checks.length} regional page/state checks plus real 404 handling, initial HTML JSON-LD, currencies, canonicals, crawlable links and image priority.`);
