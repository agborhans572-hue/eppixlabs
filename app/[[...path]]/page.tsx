import type {Metadata} from 'next';
import {notFound,redirect} from 'next/navigation';
import {load} from 'cheerio';
import {products,readPage,prepareHtml,certificates} from '@/lib/catalog';
import {currentUser} from '@/lib/repository';
import {Storefront} from '@/components/storefront';
export const dynamic='force-dynamic';
type Props={params:Promise<{path?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {path}=await params;const p=readPage('/'+(path||[]).join('/'));return {title:p?.title||'Eppix Labs',description:p?.description,alternates:p?{canonical:'/'+(path||[]).join('/')}:undefined};}
export default async function Page({params,searchParams}:Props){const {path}=await params;const route='/'+(path||[]).join('/');const query=await searchParams;const state=new URLSearchParams();if(route==='/certificates-of-analysis'){for(const key of ['category','page'])if(typeof query[key]==='string')state.set(key,query[key]);state.sort();}let page=(state.size?readPage(route+'?'+state.toString()):null)||readPage(route);let user=null;
  if(route==='/account'){user=await currentUser();if(!user)redirect('/login?next=/account');page=readPage('/login');}
  if(route==='/checkout')page=readPage('/login');
  if(!page)notFound();
  let html=prepareHtml({...page,route});
  if(route==='/account'||route==='/checkout'){
    const $=load(html,null,false);$('main').html(route==='/account'?`<section class="clone-account"><p class="clone-eyebrow">Your Account</p><h1>Welcome back</h1><p>${user?.email?.replace(/[<>&"]/g,'')||''}</p><h2>Orders</h2><p>You haven’t placed any orders yet.</p><a class="clone-primary" href="/collections/peptides">Browse Research Peptides</a><h2>Certificates of Analysis</h2><p>Browse the published lab reports for every tested lot.</p><a href="/certificates-of-analysis">Open the certificate library</a><button class="clone-secondary" data-action="logout">Sign Out</button></section>`:'<section class="clone-account"><h1>Checkout is unavailable</h1><p>Payments have not been configured. Your cart is saved; no order has been placed.</p><a class="clone-primary" href="/collections/peptides">Continue Shopping</a></section>');html=$.html();
  }
  return <Storefront key={route} html={html} route={route} catalog={products()} certificates={certificates()} initialStrength={typeof query.strength==='string'?query.strength:undefined} initialCoa={typeof query.coa==='string'?query.coa:undefined} initialQuery={typeof query.q==='string'?query.q:undefined}/>;
}
