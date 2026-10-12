import type {Metadata} from 'next';
import {notFound,redirect} from 'next/navigation';
import {load} from 'cheerio';
import {products,readPage,prepareHtml,certificates} from '@/lib/catalog';
import {currentUser} from '@/lib/repository';
import {Storefront} from '@/components/storefront';
import {isNonIndexablePath} from '@/lib/site';
import {storeRoute,storePath} from '@/lib/stores';
import {regionalizeHtml} from '@/lib/canada-html';
import {canadianCollection} from '@/lib/canada-collections';
import {supabaseAdmin} from '@/lib/supabase';
import {accountRoutes,renderAccount} from '@/lib/account-render';
import {readAccountSettings,type AccountData} from '@/lib/account-validation';
export const dynamic='force-dynamic';
type Props={params:Promise<{path?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {path}=await params,pathname='/'+(path||[]).join('/'),{route,region}=storeRoute(pathname),p=readPage(route,region);
  const languages:Record<string,string>={};
  if(readPage(route,'us'))languages['en-US']=storePath(route,'us');
  if(readPage(route,'ca'))languages['en-CA']=storePath(route,'ca');
  return {title:accountRoutes.includes(route)?'My Account | Eppix Labs':p?.title||'Eppix Labs',description:p?.description,alternates:p?{canonical:storePath(route,region),languages}:undefined,robots:isNonIndexablePath(pathname)?{index:false,follow:true}:undefined};
}
export default async function Page({params,searchParams}:Props){
  const {path}=await params,pathname='/'+(path||[]).join('/'),{route,region}=storeRoute(pathname),query=await searchParams,state=new URLSearchParams();
  if(route==='/certificates-of-analysis'){for(const key of ['category','page'])if(typeof query[key]==='string')state.set(key,query[key]);state.sort();}
  let page=(state.size?readPage(route+'?'+state.toString(),region):null)||readPage(route,region),user=null;
  let accountData:AccountData|undefined;
  if(route==='/account'||route.startsWith('/account/')){
    user=await currentUser();if(!user)redirect(storePath('/login',region)+'?next='+encodeURIComponent(pathname));
    if(!accountRoutes.includes(route))notFound();
    page=readPage('/login',region);accountData={...readAccountSettings(user.user_metadata.eppix_account),messages:[]};
    if(route==='/account/messages'){
      const {data,error}=await supabaseAdmin().from('support_requests').select('id,data,created_at').eq('data->>accountUserId',user.id).order('created_at',{ascending:true}).limit(100);
      if(error)throw Error('Your messages could not be loaded. Please try again later.');
      accountData.messages=(data||[]).map(row=>({id:row.id,message:String(row.data.message),createdAt:row.created_at}));
    }
  }
  if(route==='/checkout')page=readPage('/login',region);
  if(!page)notFound();
  if(region==='ca'&&route.startsWith('/collections/'))page=canadianCollection(page,query);
  let html=prepareHtml({...page,route},region);
  if(route==='/checkout'){
    const $=load(html,null,false);$('main').html('<div data-checkout></div>');html=$.html();
  }
  if(user){
    const $=load(html,null,false);$('main').replaceWith(renderAccount(route,user));const account=$('header a[href$="/login"]'),name=String(user.user_metadata.name||user.user_metadata.full_name||user.email||'A');
    account.attr('href',storePath('/account',region)).attr('aria-label','Your account').addClass('relative').empty().append($('<span class="account-avatar" aria-hidden="true"></span>').text(name.trim().charAt(0).toUpperCase()),'<span class="account-online" aria-hidden="true"></span>');html=region==='ca'?regionalizeHtml($):$.html();
  }
  return <>{region==='ca'&&page.styles.map(href=><link key={href} rel="stylesheet" href={href}/>)}<Storefront key={pathname} html={html} route={route} region={region} accountData={accountData} catalog={products(region)} certificates={certificates(region)} initialStrength={typeof query.strength==='string'?query.strength:undefined} initialCoa={typeof query.coa==='string'?query.coa:undefined} initialQuery={typeof query.q==='string'?query.q:undefined}/></>;
}
