import type {Product} from './types';
import {stores,type StoreRegion} from './stores';

// Existing products associated with observed Search Console queries, plus BPC-157
// as the documented lot-comparison example. This is editorial order, not sales rank.
export const prioritySlugs=['retatrutide','tirzepatide','ipamorelin','thymosin-alpha-1','bpc-157'] as const;

export const singleVariants=(product:Product)=>product.variants
  .filter(variant=>variant.packSize===1&&variant.priceCents>0)
  .slice().sort((a,b)=>a.strength.localeCompare(b.strength,undefined,{numeric:true}));

export const productLabel=(product:Product)=>product.name.replace(/\s*\(Triple Agonist\)$/,'');
export const strengthLabel=(strength:string)=>strength.replace(/(\d)(mg|mcg|g|mL|IU)\b/g,'$1 $2');
export const procurementRoute=(region:StoreRegion)=>'/research-peptides-'+(region==='ca'?'canada':'usa');

export function productSummary(product:Product,region:StoreRegion):string {
  const strengths=[...new Set(singleVariants(product).map(v=>strengthLabel(v.strength)))];
  return `${productLabel(product)} for laboratory research in ${region==='ca'?'Canada':'the United States'}. `+
    (strengths.length?`Compare ${strengths.join(', ')} options and ${stores[region].currency} prices${product.certificates.length?', then review the published lot reports':''} before ordering.`:`Review the listing and published documentation before ordering.`);
}

export function procurementNote(product:Product,region:StoreRegion):string {
  const market=region==='ca'?'Canadian':'US';
  switch(product.slug){
    case 'retatrutide':return `Compare each ${market} strength separately. A report for one strength does not document the other options, and a published historical lot is not a promise of the lot assigned to your order.`;
    case 'tirzepatide':return 'Check the label strength against the report itself. Do not infer a strength from a file name or treat a report with an unspecified strength as a match for every vial.';
    case 'ipamorelin':return 'Keep standalone Ipamorelin separate from CJC-1295 / Ipamorelin blends when comparing listings. Confirm the compound name, strength and lot code together.';
    case 'thymosin-alpha-1':return 'Confirm the full compound name: Thymosin Alpha-1 is a separate catalog entry from Thymosin Beta-4 and TB-500. Use the exact product and strength when asking about documentation.';
    case 'bpc-157':return 'Match documentation to the listed format and strength. A report for a different vial strength, capsule or blend should not be used as the certificate for this selection.';
    default:return 'Compare the listed strength and pack size with the report for the material you need. If the matching documentation is missing, ask support before ordering.';
  }
}
