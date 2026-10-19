import {readdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';

const dimensions={};
for(const file of await readdir('public/reference')){
  if(!/\.(webp|png|jpe?g|gif|avif)$/i.test(file))continue;
  const {width,height}=await sharp('public/reference/'+file).metadata();
  if(width&&height)dimensions['/reference/'+file]={width,height};
}
await writeFile('reference/image-dimensions.json',JSON.stringify(dimensions,null,2)+'\n');
console.log(`Recorded intrinsic dimensions for ${Object.keys(dimensions).length} local images.`);
