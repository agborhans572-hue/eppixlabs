import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const catalog=JSON.parse(await readFile('reference/canada/catalog.json','utf8'));
for(const p of catalog){
  if(p.store!=='ca'||!p.id.startsWith('ca:'))throw Error('Invalid Canadian product namespace.');
  for(const v of p.variants)if(!v.id.startsWith('ca:')||!Number.isSafeInteger(v.priceCents)||v.priceCents<0)throw Error('Invalid Canadian variant.');
}
if(process.argv.includes('--dry-run')){
  console.log('Ready to import',catalog.length,'Canadian products and',catalog.flatMap(p=>p.variants).length,'CAD variants. No database writes.');
}else{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Supabase server configuration is required.');
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  async function usFingerprint(){const [{data:products,error},{data:variants,error:variantError}]=await Promise.all([db.from('products').select('*').not('id','like','ca:%').order('id'),db.from('variants').select('*').not('id','like','ca:%').order('id')]);if(error||variantError)throw Error('Cannot verify existing US catalog.');return createHash('sha256').update(JSON.stringify({products,variants})).digest('hex');}
  const before=await usFingerprint();
  async function upsert(table,rows){for(let offset=0;offset<rows.length;offset+=25){const {error}=await db.from(table).upsert(rows.slice(offset,offset+25),{onConflict:'id'});if(error)throw Error(table+': '+error.message);}console.log('Imported Canadian',table,rows.length);}
  await upsert('products',catalog.map(p=>({id:p.id,slug:'ca/'+p.slug,data:p})));
  await upsert('variants',catalog.flatMap(p=>p.variants.map(v=>({id:v.id,product_id:p.id,price_cents:v.priceCents,stock:v.stock,available:v.available,data:v}))));
  if(await usFingerprint()!==before)throw Error('US catalog changed during import; investigate before release.');
  console.log('Existing US products, prices and stock are unchanged. No customer or order records were imported.');
}
