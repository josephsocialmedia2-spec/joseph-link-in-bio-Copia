'use strict';
const {chromium,devices}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.CATALOG_BASE_URL||'http://127.0.0.1:8765/catalogo-premium/';
const out=path.resolve(__dirname,'../artifacts/catalogo-playwright');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 let failures=[];
 async function run(label,viewport,isMobile=false){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile,hasTouch:isMobile,locale:'it-IT',reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  try{
   const response=await page.goto(base,{waitUntil:'load',timeout:30000});
   assert.equal(response.status(),200,'HTTP status');
   await page.locator('.page-cover').waitFor();
   assert.match(await page.title(),/Immobiliare La Sacra/i);
   assert.equal(await page.locator('.page').count(),5);
   assert.equal(await page.locator('.page:not([hidden])').count(),1);
   await page.screenshot({path:path.join(out,label+'-copertina.png'),fullPage:true});
   const labels=['Il nostro metodo','Immobili','Il territorio','Contatti'];
   for(let i=0;i<4;i++){
     await page.locator('#nextPage').click();
     assert.equal((await page.locator('#pageCounter').innerText()).trim(),(i+2)+' / 5');
     assert.equal((await page.locator('#pageLabel').innerText()).trim(),labels[i]);
     assert.equal(await page.locator('.page:not([hidden])').count(),1);
   }
   await page.screenshot({path:path.join(out,label+'-contatti.png'),fullPage:true});
   await page.locator('#prevPage').click();
   assert.equal((await page.locator('#pageLabel').innerText()).trim(),'Il territorio');
   await page.locator('#pageDots button').nth(2).click();
   assert.equal((await page.locator('#pageLabel').innerText()).trim(),'Immobili');
   assert.match(await page.locator('#propertyResults').innerText(),/completando la selezione|schede immobiliari/i);
   assert.equal(await page.locator('.property-card').count(),0,'No unverified listings published');
   await page.locator('#queryFilter').fill('Avigliana');
   assert.ok(await page.locator('#queryFilter').inputValue()==='Avigliana');
   for(const t of ['whatsapp','email','sms','copy','print'])assert.equal(await page.locator('[data-share="'+t+'"]').count(),1);
   assert.match(await page.locator('.contact-block').innerText(),/346 256 8685/);
   assert.equal(errors.length,0,'Browser errors: '+errors.join(' | '));
   // CSS does not allow horizontal scrolling at normal viewport.
   const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
   assert.ok(dims.scroll<=dims.width+3,'Horizontal overflow '+JSON.stringify(dims));
   console.log('PASS '+label+' navigation, sharing, data gate, responsive viewport');
  }catch(e){failures.push(label+': '+e.message);console.error('FAIL '+label,e);try{await page.screenshot({path:path.join(out,label+'-failure.png'),fullPage:true})}catch{}}
  finally{await context.close()}
 }
 try{await run('desktop',{width:1440,height:900});await run('mobile',{width:390,height:844},true)}
 finally{await browser.close()}
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
