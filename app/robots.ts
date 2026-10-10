import type {MetadataRoute} from 'next';
import {siteOrigin} from '@/lib/site';

export default function robots():MetadataRoute.Robots {
  return {
    rules:{userAgent:'*',allow:'/',disallow:['/api/','/auth/','/account','/cart','/checkout']},
    sitemap:siteOrigin()+'/sitemap.xml',
  };
}
