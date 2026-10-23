import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {products,prepareHtml,readPage} from '../lib/catalog';
import {canadianCollection} from '../lib/canada-collections';
import {prioritySlugs,procurementRoute,singleVariants,strengthLabel} from '../lib/procurement';
import {pageSeo,structuredData} from '../lib/seo';
import {storePath} from '../lib/stores';

test('priority pages compare exact regional strengths and never borrow a report from another strength',()=>{
  for(const region of ['us','ca'] as const)for(const slug of prioritySlugs){
    const product=products(region).find(p=>p.slug===slug)!,page=readPage('/products/'+slug,region)!;
    const $=load(prepareHtml(page,region)),rows=$('.seo-variant-table tbody tr');
    assert.equal(rows.length,singleVariants(product).length,region+' '+slug);
    assert.equal($('[data-procurement-summary]').length,1);
    for(const [index,variant] of singleVariants(product).entries()){
      const row=rows.eq(index),reports=product.certificates.filter(c=>c.strength===variant.strength);
      assert.equal(row.find('th a').text(),strengthLabel(variant.strength));
      assert.equal(row.find('th a').attr('href'),storePath('/products/'+slug+'?strength='+encodeURIComponent(variant.strength),region));
      assert.equal(row.find('td').eq(1).text(),!product.comingSoon&&variant.available&&variant.stock>0?'Available':'Unavailable');
      assert.equal(row.find('td').last().find('a').length,reports.length);
      for(const report of reports)assert.ok(row.text().includes(report.batch));
      if(!reports.length)assert.match(row.text(),/Ask support/);
    }
    assert.match($('.seo-variant-comparison').text(),/not confirmation that this lot will be supplied/);
    assert.equal($('main h1').length,1);
  }
});

test('priority product metadata uses the listed strengths rather than stale captured copy',()=>{
  const product=products('us').find(p=>p.slug==='bpc-157')!,meta=pageSeo('/products/bpc-157','us',readPage('/products/bpc-157'));
  assert.match(meta.description!,/10 mg/);assert.doesNotMatch(meta.description!,/20 mg/);
  const $=load(prepareHtml(readPage('/products/bpc-157')!));
  assert.doesNotMatch($('[data-procurement-summary]').text(),/20 mg/);
  assert.equal(product.variants.filter(v=>v.packSize===1).length,1);
  const canada=load(prepareHtml(readPage('/products/retatrutide','ca')!,'ca'));
  assert.doesNotMatch(canada('main h1').parent().children('p').text(),/120\s*mg/);
});

test('original guides, homepages, research articles and reports connect to regional buying pages',()=>{
  for(const region of ['us','ca'] as const){
    for(const route of [procurementRoute(region),'/peptide-coa-verification','/']){
      const $=load(prepareHtml(readPage(route,region)!,region));
      assert.equal($('main h1').length,1,region+' '+route);
      assert.ok($('main a').toArray().some(el=>$(el).attr('href')===storePath('/support',region)));
      assert.ok($('main a').toArray().some(el=>$(el).attr('href')===storePath('/products/bpc-157',region)));
      if(route===procurementRoute(region)){
        assert.match($('main').text(),/awaiting payment/);
        assert.doesNotMatch($('main').text(),/Alberta|Interac|same-day|FDA|Health Canada/);
      }
    }
    const article='/peptide-research/buy-ipamorelin-'+(region==='ca'?'canada':'usa');
    const $=load(prepareHtml(readPage(article,region)!,region));
    assert.equal($('aside[aria-label="Related catalog listings"] a').first().attr('href'),storePath('/products/ipamorelin',region));
    const certificate=products(region).find(p=>p.slug==='bpc-157')!.certificates[0];
    const report=load(prepareHtml(readPage('/certificates-of-analysis/'+certificate.batch.toLowerCase(),region)!,region));
    assert.equal(report('aside[aria-label="Related products"] a').first().attr('href'),storePath('/products/bpc-157',region));
  }
});

test('collection structured data follows visible pagination instead of the complete product directory',()=>{
  const page=readPage('/collections/peptides','ca')!;
  for(const [number,count] of [[1,24],[3,10]]){
    const query={page:String(number)},prepared=canadianCollection(page,query),html=prepareHtml(prepared,'ca');
    const data=structuredData(page.route,'ca',page,html,query),list=data['@graph'].find(n=>n['@type']==='ItemList');
    assert.ok(list);assert.equal(list.numberOfItems,count);
    const items=list.itemListElement as {url:string}[];
    assert.equal(new Set(items.map(item=>item.url)).size,count);
    for(const item of items)assert.ok(item.url.includes('/ca/products/'));
  }
});

test('topic hubs are not articles, invalid pagination is noindex, and report titles identify the lot',()=>{
  const route='/peptide-research/topic/compound-profiles',page=readPage(route)!;
  assert.ok(page);
  assert.ok(!structuredData(route,'us',page,prepareHtml(page))['@graph'].some(n=>n['@type']==='Article'));
  for(const value of ['999','0','abc',['2','3']])assert.equal((pageSeo('/collections/peptides','ca',readPage('/collections/peptides','ca'),{page:value}).robots as {index:boolean}).index,false);
  const product=products().find(p=>p.slug==='bpc-157')!;
  const titles=product.certificates.map(c=>pageSeo('/certificates-of-analysis/'+c.batch.toLowerCase(),'us',readPage('/certificates-of-analysis/'+c.batch.toLowerCase())).title);
  assert.equal(new Set(titles).size,titles.length);
});
