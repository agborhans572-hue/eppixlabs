import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import path from 'node:path';

const canadian = process.env.CAPTURE_REGION === 'ca';
const contentRoot = canadian ? 'reference/canada' : 'reference';
const origin = canadian ? 'https://www.eppixlabs.ca' : 'https://www.eppixlabs.com';
const root = process.cwd();
await mkdir(contentRoot+'/pages', { recursive: true });
await mkdir(contentRoot+'/raw', { recursive: true });
await mkdir('public/reference', { recursive: true });
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20);
const assets = new Map(); const failures = []; const pages = [];
const requestedRoutes=process.argv.slice(2).filter(arg=>arg.startsWith('/'));
if(requestedRoutes.length){try{const previous=JSON.parse(await readFile(contentRoot+'/manifest.json','utf8'));for(const asset of previous.assets)assets.set(asset.source,Promise.resolve(asset.local));pages.push(...previous.pages.filter(page=>!requestedRoutes.includes(page.route)));failures.push(...previous.failures.filter(failure=>!requestedRoutes.includes(failure.route)));}catch{}}
async function fetchRetry(url) {
  for (let i = 0; i < 3; i++) { try { const r = await fetch(url, { signal: AbortSignal.timeout(45000) }); if (!r.ok) throw Error(`HTTP ${r.status}`); return r; } catch(e) { if(i === 2) throw e; } }
}
function assetUrl(value) {
  if (!value || value.startsWith('data:') || value.startsWith('#')) return null;
  let u; try { u = new URL(value, origin); } catch { return null; }
  if (u.pathname === '/_next/image') { try { u = new URL(u.searchParams.get('url'), origin); } catch { return null; } }
  return u;
}
async function localize(value) {
  const u = assetUrl(value); if(!u) return value;
  if(![origin, 'https://www.eppixlabs.ca'].includes(u.origin) && !/supabase\.co$|\.public\.blob\.vercel-storage\.com$/.test(u.hostname)) return value;
  const key = u.href; if(assets.has(key)) return assets.get(key);
  const promise = (async()=> {
    const extension = path.extname(u.pathname).split('?')[0] || '.bin';
    const filename = `/reference/${hash(key)}${extension}`;
    try {
      let bytes = Buffer.from(await (await fetchRetry(key)).arrayBuffer());
      if(extension === '.css') {
        let css = bytes.toString(); const matches = [...css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)];
        for(const match of matches) { const target = new URL(match[2], u).href; const localized = await localize(target); css = css.replaceAll(match[0], `url("${localized}")`); }
        bytes = Buffer.from(css);
      }
      await writeFile(path.join(root, 'public', filename), bytes); return filename;
    } catch(e) { failures.push({url:key,error:String(e)}); return value; }
  })(); assets.set(key,promise); return promise;
}
function walk(value, found) {
  if(!value || typeof value !== 'object') return;
  if(!Array.isArray(value) && ('variants' in value || 'product' in value || 'certificates' in value || 'articles' in value)) found.push(value);
  for(const child of Object.values(value)) if(child && typeof child === 'object') walk(child,found);
}
async function capture(route) {
  const filename = hash(route); const filepath = `${contentRoot}/pages/${filename}.json`;
  try {
    let html;
    try { html = await readFile(`${contentRoot}/raw/${filename}.html`, 'utf8'); } catch { html = await (await fetchRetry(origin + route)).text(); await writeFile(`${contentRoot}/raw/${filename}.html`,html); }
    const $ = load(html); const records = []; let rsc = '';
    $('script').each((_,el) => {
      const t = $(el).html() || ''; const match = t.match(/^self\.__next_f\.push\((\[.*\])\)$/s);
      if(match) { try { const a = JSON.parse(match[1]); if(a[0]===1) rsc += a[1]; } catch {} }
    });
    for(const line of rsc.split('\n')) { const j = line.slice(line.indexOf(':')+1); if(j.startsWith('{')||j.startsWith('[')) try { walk(JSON.parse(j),records); } catch {} }
    const structured = [];
    $('script[type="application/ld+json"]').each((_,el)=>{try {structured.push(JSON.parse($(el).html()));} catch{}});
    const styles = []; for(const el of $('link[rel="stylesheet"]').toArray()) styles.push(await localize($(el).attr('href')));
    const title = $('title').text(); const description = $('meta[name="description"]').attr('content') || '';
    const bodyClass = $('body').attr('class') || ''; const htmlClass = $('html').attr('class') || '';
    $('script, noscript, link, next-route-announcer').remove();
    $('[hidden]').remove();
    // No original executable code, trackers, payment integrations, or credential forms are carried over.
    $('form').attr('action', '').attr('method', 'post');
    for(const el of $('*').toArray()) {
      for(const attr of Object.keys(el.attribs||{})) if(/^on/i.test(attr)) $(el).removeAttr(attr);
    }
    const nodes = $('img, source, video, audio, a[href], iframe[src], object[data]').toArray();
    async function processNode(el) {
      const node = $(el);
      if(el.name === 'iframe') { node.replaceWith('<p>External media is unavailable in this copy.</p>'); return; }
      if(el.name === 'a') {
        const href = node.attr('href') || '';
        if(href.startsWith(origin)) node.attr('href',href.slice(origin.length)||'/');
        if(/\.(pdf|png|jpe?g|webp)(\?|$)/i.test(href)) node.attr('href',await localize(href));
      } else {
        const attr = el.name === 'object' ? 'data' : 'src'; const value = node.attr(attr);
        if(value) node.attr(attr,await localize(value));
        node.removeAttr('srcset').removeAttr('imagesrcset');
        if(el.name === 'img') node.removeAttr('loading');
      }
    }
    for(let offset=0;offset<nodes.length;offset+=8) await Promise.all(nodes.slice(offset,offset+8).map(processNode));
    const content = $('body').html() || '';
    const unique = [...new Map(records.filter(r=>r.handle && Array.isArray(r.variants)).map(r=>[r.handle,r])).values()];
    const page = {route,title,description,bodyClass,htmlClass,styles,html:content,records:unique,structured,source:origin+route,capturedAt:new Date().toISOString()};
    await writeFile(filepath,JSON.stringify(page)); pages.push({route,title,file:filename+'.json'});
    if(pages.length%10===0) console.log(`Captured ${pages.length}/${routes.length}`);
  } catch(e) { failures.push({route,error:String(e)}); console.log(`FAILED ${route}: ${e.message}`); }
}
const sitemap = await (await fetchRetry(origin+'/sitemap.xml')).text();
await writeFile(contentRoot+'/sitemap.xml',sitemap);
const sm = load(sitemap,{xmlMode:true});
const routes = requestedRoutes.length?requestedRoutes:[...new Set(['/', ...sm('url > loc').toArray().map(el=>new URL(sm(el).text()).pathname), '/login','/signup','/forgot-password','/reset-password','/faq','/support','/affiliate','/collections/best-sellers','/collections/new',...(canadian?['/certificates-of-analysis?page=2','/certificates-of-analysis?page=3']:[])])];
let index = 0;
await Promise.all(Array.from({length:5},async()=>{while(index<routes.length) await capture(routes[index++]);}));
pages.sort((a,b)=>a.route.localeCompare(b.route));
const manifest = {origin,capturedAt:new Date().toISOString(),pages,assets:await Promise.all([...assets.entries()].map(async([source,p])=>({source,local:await p}))),failures};
await writeFile(contentRoot+'/manifest.json',JSON.stringify(manifest,null,2));
console.log(`Done: ${pages.length} pages, ${assets.size} assets, ${failures.length} failures`);
