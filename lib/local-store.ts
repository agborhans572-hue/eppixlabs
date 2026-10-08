import 'server-only';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
export interface LocalState {carts:Record<string,{items:{variantId:string;quantity:number}[];userId?:string}>; submissions:Record<string,unknown>; rates:Record<string,{count:number;reset:number}>;}
let queue:Promise<unknown>=Promise.resolve();
const dir=path.join(process.cwd(),'.local'),file=path.join(dir,'store.json');
export async function localTransaction<T>(fn:(state:LocalState)=>T):Promise<T> {
  if(process.env.NODE_ENV==='production')throw Error('The store database is unavailable. Configure Supabase before production use.');
  const operation=queue.then(async()=>{
    await mkdir(dir,{recursive:true}); let state:LocalState;
    try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;state={carts:{},submissions:{},rates:{}};}
    const result=fn(state);await writeFile(file+'.tmp',JSON.stringify(state));await rename(file+'.tmp',file);return result;
  });queue=operation.catch(()=>{});return operation;
}
