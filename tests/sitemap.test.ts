import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../app/sitemap';
import robots from '../app/robots';
import {certificates,pages,products,readPage} from '../lib/catalog';
import {isNonIndexablePath,siteOrigin} from '../lib/site';
import {paginationRoutes} from '../lib/seo';
import {storeRoute} from '../lib/stores';

test('sitemap covers every public page, product and generated certificate',()=>{
  const urls=sitemap().map(entry=>entry.url);
  const paths=new Set(urls.map(url=>new URL(url).pathname));
  assert.equal(new Set(urls).size,urls.length);
  for(const page of pages())if(!/[?#]/.test(page.route)&&!isNonIndexablePath(page.route))assert.ok(paths.has(page.route),page.route);
  for(const product of products())assert.ok(paths.has('/products/'+product.slug),product.slug);
  for(const certificate of certificates())assert.ok(paths.has('/certificates-of-analysis/'+certificate.batch.toLowerCase()),certificate.batch);
  for(const url of urls){
    const parsed=new URL(url);
    assert.equal(parsed.origin,siteOrigin());
    const {region,route}=storeRoute(parsed.pathname);
    if(parsed.search)assert.ok(paginationRoutes(region).includes(route+parsed.search),url);
    assert.equal(parsed.hash,'');
    assert.ok(readPage(parsed.pathname),parsed.pathname);
    assert.equal(isNonIndexablePath(parsed.pathname),false);
  }
  for(const route of ['/account','/checkout','/cart','/login','/signup','/forgot-password','/reset-password','/api/search','/auth/callback'])assert.equal(paths.has(route),false);
});

test('sitemap includes real pagination and product images without false regional alternates',()=>{
  const entries=sitemap();
  for(const region of ['us','ca'] as const)for(const route of paginationRoutes(region)){
    const entry=entries.find(entry=>entry.url===siteOrigin()+(region==='ca'?'/ca':'')+route);
    assert.ok(entry,route);assert.equal(entry.alternates,undefined);
  }
  for(const region of ['us','ca'] as const){
    const entry=entries.find(entry=>entry.url===siteOrigin()+(region==='ca'?'/ca':'')+'/products/bpc-157');
    assert.deepEqual(entry?.images,[new URL(products(region).find(p=>p.slug==='bpc-157')!.image,siteOrigin()).href]);
  }
});

test('robots advertises the canonical sitemap and permits public crawling',()=>{
  assert.equal(robots().sitemap,siteOrigin()+'/sitemap.xml');
  assert.deepEqual(robots().rules,{userAgent:'*',allow:'/',disallow:['/api/','/auth/','/account','/ca/account']});
});

test('canonical origin uses www by default and normalizes the environment override',()=>{
  const previous=process.env.NEXT_PUBLIC_SITE_URL;
  try{
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(siteOrigin(),'https://www.eppixlabsshop.com');
    process.env.NEXT_PUBLIC_SITE_URL='https://www.eppixlabsshop.com/';
    assert.equal(siteOrigin(),'https://www.eppixlabsshop.com');
  }finally{
    if(previous===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=previous;
  }
});
