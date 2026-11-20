'use strict';
/** Archive Shopify hero photography as lightweight local thumbnails for catalogue reliability.
 * Images are from the official Shopify catalogue only. No image substitution is performed.
 */
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const input=JSON.parse(fs.readFileSync(path.join(root,'immobili/catalogo.json'),'utf8'));
const dir=path.join(root,'catalogo-premium/photos');
fs.mkdirSync(dir,{recursive:true});
const candidates=input.items.filter(p=>/^\d+$/.test(String(p.id||''))&&/^https:\/\/cdn\.shopify\.com\//.test(String(p.image||'')));
const failed=[];
let built=0,reused=0;
async function grab(p){
 const dest=path.join(dir,p.id+'.jpg');
 if(fs.existsSync(dest)&&fs.statSync(dest).size>2500){reused++;return}
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const res=await fetch(p.image,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0 (compatible; LaSacraCatalog/1.0)'}});
   if(!res.ok)throw new Error('HTTP '+res.status);
   const raw=Buffer.from(await res.arrayBuffer());
   if(raw.length>25000000)throw new Error('Image too large');
   const optimized=await sharp(raw).rotate().resize({width:860,height:640,fit:'inside',withoutEnlargement:true}).jpeg({quality:73,mozjpeg:true}).toBuffer();
   if(optimized.length<1500)throw new Error('Invalid thumbnail');
   fs.writeFileSync(dest,optimized);built++;return;
  }catch(e){if(attempt===3)failed.push({id:p.id,title:p.title,error:e.message});else await new Promise(resolve=>setTimeout(resolve,500*attempt));}
 }
}
(async()=>{
 const pool=5;let index=0;
 await Promise.all(Array.from({length:pool},async()=>{while(index<candidates.length){const p=candidates[index++];await grab(p);}}));
 const report={date:new Date().toISOString(),source:'Shopify La Sacra',total:input.items.length,photosAvailable:candidates.length,missingSourcePhoto:input.items.filter(p=>!p.image).map(p=>({id:p.id,title:p.title})),created:built,reused,failed};
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 // A brief Shopify CDN denial must not break catalogue browser QA when a
 // substantial verified local photo archive is already available. The missing
 // entry stays explicit in report.json; the browser uses the original URL and
 // then a truthful "Fotografia non disponibile" fallback if needed.
 const count=built+reused;
 const isolatedCdnDenial=failed.length>0&&failed.length<=2&&
   count>=Math.ceil(candidates.length*0.95)&&
   failed.every(row=>/^HTTP (403|404|429)$/.test(row.error));
 if(count<candidates.length&&!isolatedCdnDenial)process.exitCode=1;
 if(isolatedCdnDenial)console.warn('WARN: Shopify CDN denied '+failed.length+' photo(s). '+count+' existing local photos retained; no substitution fabricated.');
})().catch(e=>{console.error(e);process.exitCode=1});
