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
   await page.waitForFunction(()=>document.querySelectorAll('.page-listing-sheet').length===15,{timeout:20000});
   assert.equal(await page.locator('.page').count(),17);
   assert.equal(await page.locator('.page-listing-sheet').count(),15);
   assert.equal(await page.locator('.sheet-card').count(),58);
   assert.equal(await page.locator('.page:not([hidden])').count(),1);
   await page.screenshot({path:path.join(out,label+'-copertina.png'),fullPage:true});
   const labels=['Immobili 1–4','Immobili 5–8','Immobili 9–12'];
   for(let i=0;i<3;i++){
     await page.locator('#nextPage').click();
     assert.equal((await page.locator('#pageCounter').innerText()).trim(),(i+2)+' / 17');
     assert.equal((await page.locator('#pageLabel').innerText()).trim(),labels[i]);
     assert.equal(await page.locator('.page:not([hidden])').count(),1);
   }
   assert.equal(await page.locator('.page:not([hidden]) .sheet-card').count(),4);
   await page.screenshot({path:path.join(out,label+'-immobili.png'),fullPage:true});
   await page.locator('#pageDots button').nth(16).click();
   assert.equal((await page.locator('#pageLabel').innerText()).trim(),'Valutazione gratuita');
   await page.screenshot({path:path.join(out,label+'-contatti.png'),fullPage:true});
   await page.locator('#pageDots button').nth(1).click();
   assert.equal((await page.locator('#pageLabel').innerText()).trim(),'Immobili 1–4');
   assert.equal(await page.locator('.page:not([hidden]) .sheet-card').count(),4);
   const firstCards=page.locator('.page:not([hidden]) .sheet-card .property-photo');
   assert.equal(await firstCards.count(),4);
   for(const photo of await firstCards.all()){
     const box=await photo.boundingBox();
     assert.ok(box&&box.height>=90,'Property photo too small: '+(box&&box.height));
   }
   for(const t of ['whatsapp','email','sms','copy','print'])assert.equal(await page.locator('[data-share="'+t+'"]').count(),1);
   assert.match(await page.locator('.catalog-end-contacts').innerText(),/346 256 8685/);
   await page.locator('#pageDots button').nth(16).click();
   assert.match(await page.locator('.page-end').innerText(),/RICHIEDI LA TUA/);
   assert.match(await page.locator('.page-end').innerText(),/VALUTAZIONE ORA/);
   assert.equal(await page.locator('.catalog-valuation-button').count(),1);
   // Checkbox toggles the dedicated form; future offers consent remains unchecked.
   assert.equal(await page.locator('#requestMoreToggle').isChecked(),false);
   assert.equal(await page.locator('#richiesta-materiale').isVisible(),false);
   await page.locator('#requestMoreToggle').check();
   assert.equal(await page.locator('#richiesta-materiale').isVisible(),true);
   assert.equal(await page.locator('#reqPrivacySeen').isChecked(),false);
   assert.equal(await page.locator('#reqMoreOffersConsent').isChecked(),false);
   await page.locator('#reqName').fill('Cliente Collaudo');
   await page.locator('#reqCity').fill('Avigliana');
   await page.locator('#reqType').selectOption('Appartamento');
   await page.locator('#reqBudget').selectOption('Fino a 200.000 euro');
   await page.locator('#requestByWhatsApp').click();
   assert.match(await page.locator('#requestFeedback').innerText(),/informativa/i);
   await page.locator('#reqPrivacySeen').check();
   await page.evaluate(()=>{window.open=(url)=>{window.__requestTestUrl=url;return null}});
   await page.locator('#requestByWhatsApp').click();
   const composed=await page.evaluate(()=>window.__requestTestUrl);
   assert.ok(composed.includes('wa.me/393713708294'));
   assert.ok(decodeURIComponent(composed).includes('Cliente Collaudo'));
   assert.ok(decodeURIComponent(composed).includes('Avigliana'));
   assert.ok(decodeURIComponent(composed).includes('NO, non autorizzo comunicazioni periodiche'));
   await page.locator('#reqMoreOffersConsent').check();
   await page.locator('#requestByWhatsApp').click();
   const futureComposed=await page.evaluate(()=>window.__requestTestUrl);
   assert.ok(decodeURIComponent(futureComposed).includes('SÌ, chiedo di essere ricontattato'));
   await page.locator('#reqEmail').fill('cliente@example.com');
   assert.equal(await page.locator('#requestByEmail').count(),1);
   assert.equal(await page.locator('a[href^="tel:+393713708294"]').count()>0,true);
   assert.equal(await page.locator('a[href$="privacy-richiesta.html"]').count()>0,true);
   const imgs=await page.locator('.sheet-card .property-photo img').count();
   assert.equal(imgs,54);
   // Studio-selected URL parameters must produce ONE scoped flyer and a matching print-to-PDF action.
   const officialIds=await page.evaluate(async()=>{
     const r=await fetch('../immobili/catalogo.json');
     const data=await r.json();
     return data.items.filter(p=>p.availability_status==='AVAILABLE'&&/^https:\/\/lasacraimmobiliare.it\/products\//.test(p.url)).slice(0,5).map(p=>String(p.id));
   });
   assert.equal(officialIds.length,5);
   const selectedPage=await context.newPage();
   await selectedPage.goto(base+'?immobili='+officialIds.join(','),{waitUntil:'load',timeout:30000});
   await selectedPage.waitForFunction(()=>document.querySelectorAll('.page-listing-sheet').length===2,{timeout:20000});
   assert.equal(await selectedPage.locator('.page').count(),4);
   assert.equal(await selectedPage.locator('.sheet-card').count(),5);
   assert.equal(await selectedPage.locator('.pdf-download').isVisible(),false);
   assert.match(await selectedPage.locator('[data-share="print"]').innerText(),/PDF della selezione/);
   await selectedPage.locator('#nextPage').click();
   assert.ok(new URL(await selectedPage.url()).searchParams.get('immobili')?.includes(officialIds[0]));
   if(!isMobile){
     await selectedPage.emulateMedia({media:'print'});
     const pickedPdf=await selectedPage.pdf({printBackground:true,preferCSSPageSize:true,timeout:120000});
     fs.writeFileSync(path.join(out,label+'-selected-print-debug.pdf'),pickedPdf);
     const selectedPages=pickedPdf.toString('latin1').split('/Type /Page').length-1;
     assert.equal(selectedPages,4,'Filtered customer print must include cover + two proposal pages + valuation');
   }
   await selectedPage.close();
   await page.screenshot({path:path.join(out,label+'-richiesta-materiale.png'),fullPage:true});
   if(!isMobile){
     await page.emulateMedia({media:'print'});
     const pdf=await page.pdf({printBackground:true,preferCSSPageSize:true,timeout:120000});
     fs.writeFileSync(path.join(out,label+'-full-print-debug.pdf'),pdf);
     const pages=pdf.toString('latin1').split('/Type /Page').length-1;
     assert.equal(pages,17,'Full customer print must include 17 A4 pages, not just the cover');
     await page.emulateMedia({media:'screen'});
   }


   assert.equal(errors.length,0,'Browser errors: '+errors.join(' | '));
   // CSS does not allow horizontal scrolling at normal viewport.
   const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
   assert.ok(dims.scroll<=dims.width+3,'Horizontal overflow '+JSON.stringify(dims));
   console.log('PASS '+label+' 58 authentic listings, 15 four-property spreads, cover, valuation, PDF, responsive viewport');
  }catch(e){failures.push(label+': '+e.message);console.error('FAIL '+label,e);try{await page.screenshot({path:path.join(out,label+'-failure.png'),fullPage:true})}catch{}}
  finally{await context.close()}
 }
 try{await run('desktop',{width:1440,height:900});await run('mobile',{width:390,height:844},true)}
 finally{await browser.close()}
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
