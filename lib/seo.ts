import type {Metadata} from 'next';
import {load} from 'cheerio';
import {products,readPage} from './catalog';
import {isNonIndexablePath,siteOrigin} from './site';
import {stores,storePath,type StoreRegion} from './stores';
import type {CapturedPage,Product} from './types';
import {businessIdentity} from './business';

export type PageQuery=Record<string,string|string[]|undefined>;
type SchemaNode=Record<string,unknown>;
export const absoluteUrl=(path:string)=>new URL(path,siteOrigin()).href;
const plain=(text:string)=>load('<div>'+text+'</div>')('div').text().replace(/\s+/g,' ').trim();

// Only genuinely paginated content has its own query-string canonical. Sorting,
// search and filter combinations remain crawlable but are not search landing pages.
export function paginationPage(route:string,region:StoreRegion,query:PageQuery):number {
  const value=typeof query.page==='string'&&/^\d+$/.test(query.page)?Number(query.page):1;
  if(region==='ca'&&route==='/collections/peptides')return Math.min(Math.ceil(products(region).length/24),Math.max(1,value));
  if(route==='/certificates-of-analysis'&&value>1&&value<=3&&readPage(route+'?page='+value,region))return value;
  return 1;
}

export function languageAlternates(route:string):Record<string,string> {
  const languages:Record<string,string>={};
  for(const region of ['us','ca'] as const)if(readPage(route,region))languages[stores[region].locale]=absoluteUrl(storePath(route,region));
  if(languages['en-US'])languages['x-default']=languages['en-US'];
  return languages;
}

export function pageSeo(route:string,region:StoreRegion,page:CapturedPage|null,query:PageQuery={}):Metadata {
  const country=region==='ca'?'Canada':'USA',currency=stores[region].currency;
  const product=route.startsWith('/products/')?products(region).find(p=>route==='/products/'+p.slug):undefined;
  const pageNumber=paginationPage(route,region,query);
  const filtered=['q','sort','stock','category'].some(key=>query[key]!==undefined&&query[key]!=='');
  const canonicalPath=storePath(route,region)+(pageNumber>1?'?page='+pageNumber:'');
  let title=page?.title||'Page Not Found | Eppix Labs';
  let description=plain(page?.description||'Browse the Eppix Labs research catalog and published laboratory reports.');
  if(product){
    title=`${product.name} ${country} | Research Catalog | Eppix Labs`;
    description=`Browse ${product.name} in ${country}. Compare available strengths, pack sizes and published laboratory reports. Prices in ${currency}. Laboratory research use only.`;
  }
  if(route==='/')description=`Browse research peptides in ${country}, compare strengths and prices in ${currency}, and review published lot certificates. For laboratory research use only.`;
  if(route==='/collections/peptides')description=`Explore the ${country} research catalog. Compare strengths, pack sizes and ${currency} prices, review published lot reports, and check shipping and payment details.`;
  if(route==='/payment-methods'){
    title=`Payment Methods & Order Process ${country} | Eppix Labs`;
    description=`Choose a payment preference for your ${country} order. Orders await payment instructions by email; no payment is collected at checkout. Card payments unavailable.`;
  }
  if(route==='/faq')description=`Answers about ${country} research catalog orders, published certificates, shipping and payment by email. Orders await payment; card payments are unavailable.`;
  if(route==='/about'){
    title=`About Eppix Labs ${country} | Catalog, Reports & Ordering`;
    description=`How the Eppix Labs ${country} store works: compare research materials in ${currency}, review published lot documentation, and understand orders awaiting payment.`;
  }
  if(route.startsWith('/account'))title='My Account | Eppix Labs';
  if(route==='/checkout')title=`Checkout ${country} | Eppix Labs`;
  if(route.startsWith('/certificates-of-analysis/')){
    const heading=load(page?.html||'')('main h1').text().replace(/\s+/g,' ').trim();
    if(heading)title=`${heading}${route.endsWith('-spray')?' Spray':''} | Lab Reports ${country} | Eppix Labs`;
  }
  if(pageNumber>1){title=title.replace(/\s*\|\s*Eppix Labs(?: Canada)?$/,'')+` | Page ${pageNumber} | Eppix Labs`;description+=` Page ${pageNumber}.`;}
  const image=absoluteUrl(product?.image||'/icon.png');
  const languages=pageNumber===1?languageAlternates(route):undefined;
  const indexable=!!page&&!isNonIndexablePath(storePath(route,region))&&!filtered;
  return {
    title,description,
    alternates:page?{canonical:absoluteUrl(canonicalPath),languages}:undefined,
    robots:indexable?{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1}}:{index:false,follow:true},
    openGraph:{type:route.startsWith('/peptide-research/')?'article':'website',title,description,url:absoluteUrl(canonicalPath),siteName:region==='ca'?'Eppix Labs Canada':'Eppix Labs',locale:region==='ca'?'en_CA':'en_US',images:[{url:image,alt:product?.name||'Eppix Labs'}]},
    twitter:{card:product?'summary_large_image':'summary',title,description,images:[image]},
  };
}

export function productSchema(product:Product,region:StoreRegion,description:string):SchemaNode {
  const url=absoluteUrl(storePath('/products/'+product.slug,region));
  const variants=product.variants.filter(v=>v.packSize===1&&v.priceCents>0);
  return {
    '@type':'Product','@id':url+'#product',name:product.name,url,
    description,image:[...new Set([product.image,...product.images])].filter(Boolean).map(absoluteUrl),
    brand:{'@type':'Brand',name:'Eppix Labs'},
    ...(variants.length?{offers:variants.map(variant=>({
      '@type':'Offer',name:product.name+' '+variant.strength,
      url:url+'?strength='+encodeURIComponent(variant.strength),
      price:(variant.priceCents/100).toFixed(2),priceCurrency:stores[region].currency,
      availability:'https://schema.org/'+(!product.comingSoon&&variant.available&&variant.stock>0?'InStock':'OutOfStock'),
      itemCondition:'https://schema.org/NewCondition',seller:{'@id':absoluteUrl('/')+'#organization'},
    }))}:{}),
  };
}

export function structuredData(route:string,region:StoreRegion,page:CapturedPage,html:string,query:PageQuery={}):{'@context':string;'@graph':SchemaNode[]} {
  const metadata=pageSeo(route,region,page,query),url=String(metadata.alternates?.canonical),home=absoluteUrl(storePath('/',region));
  const organizationId=absoluteUrl('/')+'#organization',websiteId=home+'#website';
  const graph:SchemaNode[]=[{'@type':'Organization','@id':organizationId,name:'Eppix Labs',legalName:businessIdentity.legalName,url:absoluteUrl('/'),logo:absoluteUrl('/icon.png'),email:'hello@eppixlabsshop.com'}];
  graph.push({'@type':'WebSite','@id':websiteId,url:home,name:region==='ca'?'Eppix Labs Canada':'Eppix Labs',inLanguage:stores[region].locale,publisher:{'@id':organizationId}});
  const $=load(html),heading=$('main h1').first().text().replace(/\s+/g,' ').trim()||page.title.split('|')[0].trim();
  const product=route.startsWith('/products/')?products(region).find(p=>route==='/products/'+p.slug):undefined;
  const isArticle=route.startsWith('/peptide-research/');
  graph.push({'@type':isArticle?'Article':route.startsWith('/collections/')?'CollectionPage':'WebPage','@id':url+'#webpage',url,name:String(metadata.title),description:metadata.description,inLanguage:stores[region].locale,isPartOf:{'@id':websiteId},...(product?{mainEntity:{'@id':url+'#product'}}:{}),...(isArticle?{headline:heading,publisher:{'@id':organizationId}}:{})});
  if(product)graph.push(productSchema(product,region,String(metadata.description)));
  if(route!=='/'){
    const crumbs=[{name:'Home',url:home}];
    const parent=route.startsWith('/products/')?'/collections/peptides':route.startsWith('/peptide-research/')?'/peptide-research':route.startsWith('/certificates-of-analysis/')?'/certificates-of-analysis':null;
    if(parent)crumbs.push({name:parent==='/collections/peptides'?'Research catalog':parent==='/peptide-research'?'Research library':'Certificates of analysis',url:absoluteUrl(storePath(parent,region))});
    crumbs.push({name:heading,url});
    graph.push({'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:crumbs.map((crumb,index)=>({'@type':'ListItem',position:index+1,name:crumb.name,item:crumb.url}))});
  }
  return {'@context':'https://schema.org','@graph':graph};
}

export const serializeJsonLd=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
