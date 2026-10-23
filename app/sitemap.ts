import type {MetadataRoute} from 'next';
import {certificates,pages,products,readPage} from '@/lib/catalog';
import {isNonIndexablePath,siteOrigin} from '@/lib/site';
import {storePath,type StoreRegion} from '@/lib/stores';
import {absoluteUrl,languageAlternates,paginationRoutes} from '@/lib/seo';

export default function sitemap():MetadataRoute.Sitemap {
  // Use the same content sources as the storefront, including generated lot pages.
  // Include real pagination; filter states and variant selectors are duplicates.
  const origin=siteOrigin();
  return (['us','ca'] as StoreRegion[]).flatMap(region=>{
    const routes=new Set([...pages(region).map(page=>page.route),...certificates(region).map(c=>'/certificates-of-analysis/'+c.batch.toLowerCase())]);
    const publicRoutes=[...routes].filter(route=>route.startsWith('/')&&!route.startsWith('//')&&!/[?#]/.test(route)&&!isNonIndexablePath(route)&&readPage(route,region));
    return [...publicRoutes,...paginationRoutes(region)].sort().map(route=>{
      const product=products(region).find(p=>route==='/products/'+p.slug);
      return {url:new URL(storePath(route,region),origin).href,...(!route.includes('?')?{alternates:{languages:languageAlternates(route)}}:{}),...(product?.image?{images:[absoluteUrl(product.image)]}:{})};
    });
  });
}
