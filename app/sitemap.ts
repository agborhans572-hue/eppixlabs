import type {MetadataRoute} from 'next';
import {certificates,pages,readPage} from '@/lib/catalog';
import {isNonIndexablePath,siteOrigin} from '@/lib/site';

export default function sitemap():MetadataRoute.Sitemap {
  // Use the same content sources as the storefront, including generated lot pages.
  // Filter states/strengths/COA query links canonicalize to their base page.
  const routes=new Set([
    ...pages().map(page=>page.route),
    ...certificates().map(c=>'/certificates-of-analysis/'+c.batch.toLowerCase()),
  ]);
  const origin=siteOrigin();
  return [...routes]
    .filter(route=>route.startsWith('/')&&!route.startsWith('//')&&!/[?#]/.test(route)&&!isNonIndexablePath(route)&&readPage(route))
    .sort()
    .map(route=>({url:new URL(route,origin).href}));
}
