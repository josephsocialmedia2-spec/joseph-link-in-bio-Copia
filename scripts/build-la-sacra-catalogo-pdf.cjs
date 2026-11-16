'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,locale:'it-IT'});
   const url=process.env.CATALOG_BASE_URL||'http://127.0.0.1:8765/catalogo-premium/';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   if(response.status()!==200)throw Error('Catalogo non raggiungibile');
   await page.waitForFunction(()=>document.querySelectorAll('.page-listing-sheet').length>=1,{timeout:30000});
   const inventory=await page.evaluate(()=>({sheets:document.querySelectorAll('.page-listing-sheet').length,cards:document.querySelectorAll('.sheet-card').length}));
   if(inventory.cards!==58||inventory.sheets!==10)throw Error('Inventario incompleto '+JSON.stringify(inventory));
   await page.emulateMedia({media:'print'});
   await page.evaluate(()=>document.querySelectorAll('.sheet-card img').forEach(img=>img.loading='eager'));
   // Le immagini esterne possono richiedere più tempo: attende fino a 20 s senza bloccare la generazione.
   await page.evaluate(()=>Promise.race([
     Promise.all([...document.querySelectorAll('.sheet-card img')].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))),
     new Promise(r=>setTimeout(r,20000))
   ]));
   const dest=path.resolve(__dirname,'../catalogo-premium/La_Sacra_Catalogo_Tutti_Immobili.pdf');
   await page.pdf({path:dest,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,timeout:120000});
   const size=fs.statSync(dest).size;
   if(size<20000)throw Error('PDF anomalo: '+size+' bytes');
   console.log('PDF multipagina generato',inventory,size);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
