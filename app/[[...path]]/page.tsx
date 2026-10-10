import type {Metadata} from 'next';
import {notFound,redirect} from 'next/navigation';
import {load} from 'cheerio';
import {products,readPage,prepareHtml,certificates} from '@/lib/catalog';
import {currentUser} from '@/lib/repository';
import {Storefront} from '@/components/storefront';
import {isNonIndexablePath} from '@/lib/site';
import {supabaseAdmin} from '@/lib/supabase';
import {accountRoutes,renderAccount} from '@/lib/account-render';
import {readAccountSettings,type AccountData} from '@/lib/account-validation';
export const dynamic='force-dynamic';
type Props={params:Promise<{path?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {path}=await params;const route='/'+(path||[]).join('/');const p=readPage(route);return {title:accountRoutes.includes(route)?'My Account | Eppix Labs':p?.title||'Eppix Labs',description:p?.description,alternates:p?{canonical:route}:undefined,robots:isNonIndexablePath(route)?{index:false,follow:true}:undefined};}
export default async function Page({params,searchParams}:Props){const {path}=await params;const route='/'+(path||[]).join('/');const query=await searchParams;const state=new URLSearchParams();if(route==='/certificates-of-analysis'){for(const key of ['category','page'])if(typeof query[key]==='string')state.set(key,query[key]);state.sort();}let page=(state.size?readPage(route+'?'+state.toString()):null)||readPage(route);let user=null;
  let accountData:AccountData|undefined;
  if(route==='/account'||route.startsWith('/account/')){
    user=await currentUser();if(!user)redirect('/login?next='+encodeURIComponent(route));
    if(!accountRoutes.includes(route))notFound();
    page=readPage('/login');
    accountData={...readAccountSettings(user.user_metadata.eppix_account),messages:[]};
    if(route==='/account/messages'){
      const {data,error}=await supabaseAdmin().from('support_requests').select('id,data,created_at').eq('data->>accountUserId',user.id).order('created_at',{ascending:true}).limit(100);
      if(error)throw Error('Your messages could not be loaded. Please try again later.');
      accountData.messages=(data||[]).map(row=>({id:row.id,message:String(row.data.message),createdAt:row.created_at}));
    }
  }
  if(route==='/checkout')page=readPage('/login');
  if(!page)notFound();
  let html=prepareHtml({...page,route});
  if(route==='/checkout'){
    const $=load(html,null,false);$('main').html('<section class="clone-account"><h1>Checkout is unavailable</h1><p>Payments have not been configured. Your cart is saved; no order has been placed.</p><a class="clone-primary" href="/collections/peptides">Continue Shopping</a></section>');html=$.html();
  }
  if(user){
    const $=load(html,null,false);$('main').replaceWith(renderAccount(route,user));
    const account=$('header a[href="/login"]');
    const name=String(user.user_metadata.name||user.user_metadata.full_name||user.email||'A');
    account.attr('href','/account').attr('aria-label','Your account').addClass('relative').empty().append($('<span class="account-avatar" aria-hidden="true"></span>').text(name.trim().charAt(0).toUpperCase()),'<span class="account-online" aria-hidden="true"></span>');
    html=$.html();
  }
  return <Storefront key={route} html={html} route={route} accountData={accountData} catalog={products()} certificates={certificates()} initialStrength={typeof query.strength==='string'?query.strength:undefined} initialCoa={typeof query.coa==='string'?query.coa:undefined} initialQuery={typeof query.q==='string'?query.q:undefined}/>;
}
