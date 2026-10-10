import type {Product, Variant} from './types';

export type CatalogSort='featured'|'price-up'|'price-down'|'name';
export interface CatalogFilters {categories:string[];stockOnly:boolean;minPrice:string;maxPrice:string;sort:CatalogSort;}
export const defaultFilters:CatalogFilters={categories:[],stockOnly:false,minPrice:'',maxPrice:'',sort:'featured'};
export function chooseVariant(product:Product,strength?:string,pack=1):Variant|undefined {
  const singles=product.variants.filter(v=>v.packSize===1);
  return product.variants.find(v=>v.strength===strength&&v.packSize===pack)
    ||singles.find(v=>v.strength===strength)
    ||singles.filter(v=>product.store!=='ca'||v.priceCents>0).slice().sort((a,b)=>a.priceCents-b.priceCents)[0]
    ||product.variants[0];
}
export function filteredProducts(products:Product[],filters:CatalogFilters,membership:Record<string,string[]>):Product[]{
  const price=(p:Product)=>Math.min(...p.variants.filter(v=>v.packSize===1).map(v=>v.priceCents));
  const result=products.filter(p=>(!filters.categories.length||filters.categories.some(c=>membership[c]?.includes(p.slug)||p.categories.includes(c)))
    &&(!filters.stockOnly||!p.comingSoon&&p.variants.some(v=>v.available))
    &&(!filters.minPrice||price(p)>=Number(filters.minPrice)*100)
    &&(!filters.maxPrice||price(p)<=Number(filters.maxPrice)*100));
  if(filters.sort!=='featured')result.sort((a,b)=>filters.sort==='name'?a.name.localeCompare(b.name):filters.sort==='price-up'?price(a)-price(b):price(b)-price(a));
  return result;
}
export type ResearchOrder='Curated'|'Newest'|'Oldest';
export interface ResearchFilters {query:string;subjects:string[];month:string;order:ResearchOrder;}
export function matchesArticle(text:string,date:string,filters:ResearchFilters):boolean {
  const query=filters.query.trim().toLocaleLowerCase();
  return (!query||text.toLocaleLowerCase().includes(query))
    &&(!filters.subjects.length||filters.subjects.some(subject=>text.toLocaleLowerCase().includes(subject.toLocaleLowerCase())))
    &&(!filters.month||filters.month==='all'||date.startsWith(filters.month));
}
export function compareArticles(a:{date:string;index:number},b:{date:string;index:number},order:ResearchOrder){return order==='Curated'?a.index-b.index:(a.date.localeCompare(b.date)||a.index-b.index)*(order==='Newest'?-1:1);}
export function vialDiscount(vials:number){return vials>=10?20:vials>=5?10:vials>=3?5:0;}
