import {readFileSync} from 'node:fs';
import {load} from 'cheerio';

export const accountRoutes=['/account','/account/orders','/account/addresses','/account/messages','/account/alerts','/account/notifications'];
export function renderAccount(route:string,user:{email?:string;user_metadata:Record<string,unknown>}):string {
  if(!accountRoutes.includes(route))throw Error('Unknown account section');
  const section=route==='/account'?'dashboard':route.split('/')[2];
  const $=load(readFileSync('reference/account/'+section+'.html','utf8'),null,false);
  $('main').attr('data-account-dashboard','true');
  const fullName=String(user.user_metadata.name||user.user_metadata.full_name||user.email?.split('@')[0]||'Researcher').trim().slice(0,150);
  const firstName=fullName.split(/\s+/)[0];
  $('*').contents().filter((_,node)=>node.type==='text').each((_,node)=>{
    if(node.type==='text')node.data=node.data.replaceAll('ACCOUNT_FULL_NAME',fullName).replaceAll('ACCOUNT_FIRST_NAME',firstName).replaceAll('ACCOUNT_EMAIL',user.email||'');
  });
  $('nav').attr('aria-label','Account navigation');
  $('nav a').each((_,el)=>{if($(el).attr('href')===route)$(el).attr('aria-current','page');});
  $('nav button').attr('data-action','logout').attr('type','button');
  if(['addresses','messages','notifications'].includes(section))$('[class="lg:col-span-3"]').empty().attr('data-account-controls',section);
  return $.html();
}
