export type StoreRegion = 'us' | 'ca';

export const stores = {
  us: {name:'United States', currency:'USD', locale:'en-US', prefix:''},
  ca: {name:'Canada', currency:'CAD', locale:'en-CA', prefix:'/ca'},
} as const;

export function storeRoute(path:string):{region:StoreRegion;route:string} {
  return path==='/ca'||path.startsWith('/ca/')
    ? {region:'ca',route:path.slice(3)||'/'}
    : {region:'us',route:path};
}

export function storePath(route:string,region:StoreRegion):string {
  if(!route.startsWith('/')||route.startsWith('//'))return route;
  const bare=storeRoute(route).route;
  return region==='ca'?'/ca'+(bare==='/'?'':bare):bare;
}

export function requestRegion(request:Request):StoreRegion {
  const value=new URL(request.url).searchParams.get('region');
  if(value&&value!=='us'&&value!=='ca'){const error=new Error('Unknown store region.');error.name='StoreRegionError';throw error;}
  return value==='ca'?'ca':'us';
}

export function cartKey(identity:string,region:StoreRegion):string {
  // Preserve existing US cart identities. Canada cannot merge or price US lines.
  return region==='ca'?identity+':ca':identity;
}

export function storeMoney(cents:number,region:StoreRegion):string {
  return new Intl.NumberFormat(stores[region].locale,{style:'currency',currency:stores[region].currency}).format(cents/100);
}
