import type {MetadataRoute} from 'next';
import {certificates,pages,readPage} from '@/lib/catalog';
import {isNonIndexablePath,siteOrigin} from '@/lib/site';
import {storePath,type StoreRegion} from '@/lib/stores';
import {languageAlternates} from '@/lib/seo';

export default function sitemap():MetadataRoute.Sitemap {
  // Use the same content sources as the storefront, including generated lot pages.
  // Filter states/strengths/COA query links canonicalize to their base page.
  const origin=siteOrigin();
  return (['us','ca'] as StoreRegion[]).flatMap(region=>{
    const routes=new Set([...pages(region).map(page=>page.route),...certificates(region).map(c=>'/certificates-of-analysis/'+c.batch.toLowerCase())]);
    return [...routes].filter(route=>route.startsWith('/')&&!route.startsWith('//')&&!/[?#]/.test(route)&&!isNonIndexablePath(route)&&readPage(route,region)).sort().map(route=>({url:new URL(storePath(route,region),origin).href,alternates:{languages:languageAlternates(route)}}));
  });
}
