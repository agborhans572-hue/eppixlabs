import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {prepareHtml,readPage} from '../lib/catalog';
import {businessEmail} from '../lib/contact';
import {saveAndNotifySubmission,sendSubmissionEmail,submissionEmail,submissionFeedback,type SubmissionKind} from '../lib/submission-mail';

test('both stores use the business inbox throughout contact pages and policies',()=>{
  for(const region of ['us','ca'] as const)for(const route of ['/','/support','/privacy','/terms','/affiliate','/payment-methods']){
    const page=readPage(route,region);if(!page)continue;
    const html=prepareHtml(page,region),$=load(html);
    assert.doesNotMatch(html,/hello@eppixlabs\.(com|ca)\b/i,region+' '+route);
    const links=$('a[href^="mailto:"]');
    links.each((_,el)=>assert.ok($(el).attr('href')!.startsWith('mailto:'+businessEmail),region+' '+route));
    if(route==='/support')assert.ok(links.length>0);
    if(region==='ca')assert.doesNotMatch(html,/orders@eppix\.ca/);
  }
});

test('all submission types route to the fixed inbox and replies go to the visitor',()=>{
  for(const region of ['us','ca'] as const)for(const kind of ['support','affiliate','subscribe'] as SubmissionKind[]){
    const email=submissionEmail(kind,{email:'visitor@example.com',name:'Visitor',subject:'Help\r\nBcc: attacker@example.com',message:'<script>alert(1)</script>',preferences:['research'],to:'attacker@example.com',accountUserId:'private-id',password:'secret'},region);
    assert.deepEqual(email.to,[businessEmail]);
    assert.equal(email.from,'Eppix Labs <'+businessEmail+'>');assert.equal(email.reply_to,'visitor@example.com');
    assert.ok(email.subject.includes(region.toUpperCase()));assert.doesNotMatch(email.subject,/[\r\n]/);
    assert.ok(email.text.includes(region==='ca'?'Canada':'United States'));
    assert.doesNotMatch(email.text,/private-id|secret|To: attacker@example.com/);
    assert.equal('html' in email,false);
  }
});

test('provider requests protect secrets and deduplicate retries without losing changed preferences',async()=>{
  const calls:{url:string;init:RequestInit}[]=[];
  const provider=(async(url,init)=>{calls.push({url:String(url),init:init!});return Response.json({id:'mail-123'});}) as typeof fetch;
  for(const preferences of [['research'],['research'],['sales']])assert.equal(await sendSubmissionEmail('subscribe','submission-key',{email:'visitor@example.com',preferences},'ca','test-secret',provider),'sent');
  assert.equal(calls[0].url,'https://api.resend.com/emails');
  const headers=calls.map(c=>new Headers(c.init.headers));
  assert.equal(headers[0].get('Authorization'),'Bearer test-secret');
  assert.equal(headers[0].get('Idempotency-Key'),headers[1].get('Idempotency-Key'));
  assert.notEqual(headers[0].get('Idempotency-Key'),headers[2].get('Idempotency-Key'));
  assert.doesNotMatch(headers[0].get('Idempotency-Key')!,/visitor|example/);
  assert.equal(calls[0].init.cache,'no-store');assert.ok(calls[0].init.signal);
  const body=JSON.parse(String(calls[0].init.body));assert.deepEqual(body.to,[businessEmail]);
  assert.doesNotMatch(String(calls[0].init.body),/test-secret/);
});

test('missing configuration, provider errors, malformed replies and timeouts report unavailable',async()=>{
  const data={email:'visitor@example.com',message:'Help please'};
  let called=false;
  assert.equal(await sendSubmissionEmail('support','key',data,'us','',(async()=>{called=true;throw Error();}) as typeof fetch),'unavailable');
  assert.equal(called,false);
  for(const provider of [async()=>Response.json({error:'failed'},{status:429}),async()=>Response.json({}),async()=>new Response('bad json'),async()=>{throw Error('timeout');}]){
    assert.equal(await sendSubmissionEmail('support','key',data,'us','test-key',provider as typeof fetch),'unavailable');
  }
  assert.match(submissionFeedback('support','unavailable'),/saved.*email could not be sent/);
  assert.match(submissionFeedback('affiliate','unavailable'),/hello@eppixlabsshop.com/);
  assert.match(submissionFeedback('subscribe','sent'),/Marketing emails and restock alerts are not active yet/);
});

test('submissions persist before notifications and a save failure prevents sending',async()=>{
  const actions:string[]=[],data={email:'visitor@example.com',message:'Help please'};
  const result=await saveAndNotifySubmission('support','key',data,'ca',{
    save:async()=>{actions.push('save');},notify:async()=>{actions.push('notify');return 'unavailable';},
  });
  assert.deepEqual(actions,['save','notify']);assert.equal(result.saved,true);assert.equal(result.notification,'unavailable');
  actions.length=0;
  await assert.rejects(saveAndNotifySubmission('support','key',data,'ca',{
    save:async()=>{throw Error('database unavailable');},notify:async()=>{actions.push('notify');return 'sent';},
  }));
  assert.deepEqual(actions,[]);
});
