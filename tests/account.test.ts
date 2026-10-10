import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {accountRoutes,renderAccount} from '../lib/account-render';
import {accountSettingsSchema,accountMessageSchema,readAccountSettings} from '../lib/account-validation';

test('all account sections render their active navigation and safely personalize customer details',()=>{
 for(const route of accountRoutes){
  const $=load(renderAccount(route,{email:'customer@example.com',user_metadata:{full_name:'<img src=x onerror=alert(1)> Customer'}}));
  assert.equal($('nav[aria-label="Account navigation"] a').length,6);
  assert.equal($('nav a[aria-current="page"]').attr('href'),route);
  assert.equal($('nav button[data-action="logout"]').length,1);
  assert.equal($('img,script').length,0);
  assert.match($('nav').text(),/customer@example.com/);
  assert.doesNotMatch($.html(),/ACCOUNT_EMAIL|ACCOUNT_FIRST_NAME|agborhans572|Agbor Hans/);
 }
});
test('dashboard retains quick links, empty order history and partner program',()=>{
 const $=load(renderAccount('/account',{email:'customer@example.com',user_metadata:{name:'Jane Doe'}}));
 assert.equal($('h1').text(),'Hey, Jane');
 assert.equal($('h2').first().text(),'Welcome back, Jane');
 for(const href of ['/account/orders','/account/addresses','/certificates-of-analysis','/affiliate','/collections/peptides'])assert.ok($('a[href="'+href+'"]').length);
 assert.match($('main').text(),/No orders yet/);
 assert.throws(()=>renderAccount('/account/unknown',{user_metadata:{}}));
});
test('account settings reject extra ownership fields, malformed addresses and oversized messages',()=>{
 assert.deepEqual(readAccountSettings(undefined),{addresses:[],preferences:[]});
 assert.equal(accountSettingsSchema.safeParse({addresses:[],preferences:['sales'],userId:'someone-else'}).success,false);
 assert.equal(accountSettingsSchema.safeParse({addresses:[{id:'invalid'}],preferences:[]}).success,false);
 assert.equal(accountMessageSchema.safeParse({message:' '.repeat(5)}).success,false);
 assert.equal(accountMessageSchema.safeParse({message:'x'.repeat(5001)}).success,false);
 assert.equal(accountMessageSchema.safeParse({message:'Hello',email:'someone@example.com'}).success,false);
});
