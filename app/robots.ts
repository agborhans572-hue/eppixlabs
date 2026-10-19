import type {MetadataRoute} from 'next';
import {siteOrigin} from '@/lib/site';

export default function robots():MetadataRoute.Robots {
  return {
    // Checkout/cart carry noindex metadata. Let crawlers read that directive.
    rules:{userAgent:'*',allow:'/',disallow:['/api/','/auth/','/account','/ca/account']},
    sitemap:siteOrigin()+'/sitemap.xml',
  };
}
