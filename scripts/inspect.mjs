import {readFile,readdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {load} from 'cheerio';
for(const route of process.argv.slice(2)){
 const file=createHash('sha256').update(route).digest('hex').slice(0,20);
 const raw=await readFile('reference/raw/'+file+'.html','utf8'),$=load(raw);
 console.log(route,'templates', $('template[id]').toArray().map(e=>e.attribs),'hidden', $('div[hidden][id]').toArray().map(e=>e.attribs));
 console.log($('script').toArray().map(e=>$(e).text()).filter(x=>/\$RC\(|\$RS\(/.test(x)).map(x=>x.slice(-400)));
 console.log('Main', $('main').text().slice(0,400));
}
