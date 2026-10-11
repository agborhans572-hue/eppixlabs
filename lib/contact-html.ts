import type {CheerioAPI} from 'cheerio';
import {businessEmail} from './contact';

export function prepareContactEmail($:CheerioAPI){
  const replace=(value:string)=>value.replace(/hello@eppixlabs\.(?:com|ca)\b/gi,businessEmail);
  $('a[href^="mailto:"]').each((_,el)=>{const link=$(el);link.attr('href',replace(link.attr('href')||''));});
  $('*').contents().each((_,node)=>{if(node.type==='text')node.data=replace(node.data);});
}
