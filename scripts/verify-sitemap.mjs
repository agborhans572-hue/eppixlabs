import assert from 'node:assert/strict';
import {load} from 'cheerio';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const response=await fetch(origin+'/sitemap.xml',{redirect:'manual'});
assert.equal(response.status,200,'Sitemap must serve directly with HTTP 200');
assert.match(response.headers.get('content-type')||'',/^application\/xml\b/);
const xml=await response.text();
assert.match(xml,/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.doesNotMatch(xml,/<(?:html|script|body)\b/i);
const $=load(xml,{xmlMode:true});
assert.equal($('urlset').attr('xmlns'),'http://www.sitemaps.org/schemas/sitemap/0.9');
const urls=$('urlset > url > loc').map((_,el)=>$(el).text()).get();
assert.ok(urls.length>0&&urls.length<=50000);
assert.equal(new Set(urls).size,urls.length);
const sitemapOrigin=new URL(urls[0]).origin;
if(process.env.EXPECTED_SITE_ORIGIN)assert.equal(sitemapOrigin,process.env.EXPECTED_SITE_ORIGIN,'Unexpected canonical hostname');
const robots=await fetch(origin+'/robots.txt',{redirect:'manual'});
assert.equal(robots.status,200);
assert.match(robots.headers.get('content-type')||'',/^text\/plain\b/);
const robotsText=await robots.text();
assert.ok(robotsText.includes('Sitemap: '+sitemapOrigin+'/sitemap.xml'));
// These metadata routes publish a single User-Agent: * group.
assert.equal((robotsText.match(/^User-Agent:/gmi)||[]).length,1);
assert.match(robotsText,/^User-Agent:\s*\*\s*$/mi);
const disallowed=[...robotsText.matchAll(/^Disallow:\s*(\S+)\s*$/gmi)].map(match=>match[1]);
const head=await fetch(origin+'/sitemap.xml',{method:'HEAD',redirect:'manual'});
assert.equal(head.status,200);
assert.match(head.headers.get('content-type')||'',/^application\/xml\b/);

let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
  while(cursor<urls.length){
    const url=new URL(urls[cursor++]);
    assert.equal(url.origin,sitemapOrigin);
    if(url.search)assert.match(url.search,/^\?page=[23]$/);
    assert.equal(url.hash,'');
    assert.ok(!disallowed.some(path=>url.pathname.startsWith(path)),url.pathname+' is blocked by robots.txt');
    const page=await fetch(origin+url.pathname+url.search,{redirect:'manual',signal:AbortSignal.timeout(60000)});
    assert.equal(page.status,200,url.pathname);
    assert.doesNotMatch(page.headers.get('x-robots-tag')||'',/noindex|\bnone\b/i,url.pathname+' is blocked by X-Robots-Tag');
    const document=load(await page.text());
    const canonical=document('link[rel="canonical"]').attr('href');
    assert.ok(canonical,url.pathname+' is missing a canonical');
    assert.equal(new URL(canonical).href,url.href,url.pathname+' canonical mismatch');
    assert.doesNotMatch(document('meta[name="robots"], meta[name="googlebot"]').map((_,el)=>document(el).attr('content')).get().join(','),/noindex|\bnone\b/i,url.pathname);
  }
}));
for(const route of ['/login','/signup','/forgot-password','/reset-password','/checkout']){
  const page=await fetch(origin+route,{redirect:'manual'});
  assert.equal(page.status,200,route);
  assert.match(load(await page.text())('meta[name="robots"]').attr('content')||'',/noindex/,route);
}
console.log(`Verified XML GET/HEAD, robots.txt, ${urls.length} canonical indexable pages and private-page noindex metadata.`);
