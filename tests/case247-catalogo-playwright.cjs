'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.CATALOG_BASE_URL||'http://127.0.0.1:8765/catalogo-premium/';
const out=path.resolve(__dirname,'../artifacts/catalogo-playwright');
fs.mkdirSync(out,{recursive:true});
const countPdfPages=buf=>{
  const raw=buf.toString('latin1');
  return (raw.split('/Type /Page').length-1)-(raw.split('/Type /Pages').length-1);
};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const failures=[];
 async function run(label,viewport,isMobile=false){
   const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile,hasTouch:isMobile,locale:'it-IT',reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   try{
     const response=await page.goto(base,{waitUntil:'load',timeout:30000});
     assert.equal(response.status(),200);
     assert.match(await page.title(),/Immobiliare La Sacra/i);
     const expected=await page.evaluate(async()=>{
       const feed=await (await fetch('../immobili/catalogo.json')).json();
       return window.LaSacraRules.filterListings(feed.items).length;
     });
     assert.equal(expected,58,'Default catalogue must contain all 58 official URLs');
     const sheets=Math.ceil(expected/4),pages=sheets+2;
     await page.waitForFunction(n=>document.querySelectorAll('.sheet-card').length===n,expected,{timeout:20000});
     assert.equal(await page.locator('.page').count(),pages);
     assert.equal(await page.locator('.page-listing-sheet').count(),sheets);
     assert.equal(await page.locator('.sheet-card').count(),expected);
     assert.equal(await page.locator('.page:not([hidden])').count(),1);
     assert.match(await page.locator('#catalogStatus').innerText(),/proposte visualizzate/);
     assert.equal(await page.locator('#categoryFilter').inputValue(),'');
     assert.equal(await page.locator('#townFilter').inputValue(),'');
     assert.equal(await page.locator('#statusFilter').inputValue(),'');
     assert.equal(await page.locator('#categoryFilter option').count()>2,true);
     await page.screenshot({path:path.join(out,label+'-copertina.png'),fullPage:true});
     assert.equal(await page.locator('#pageSelect option').count(),pages);
     await page.locator('#nextPage').click();
     assert.equal((await page.locator('#pageCounter').innerText()).trim(),'Pagina 2 di '+pages);
     assert.equal((await page.locator('#pageLabel').innerText()).trim(),'Immobili 1–4');
     assert.equal(await page.locator('.page:not([hidden]) .sheet-card').count(),4);
     const cards=page.locator('.page:not([hidden]) .sheet-card');
     const diagnostics=await cards.evaluateAll(elements=>elements.map(card=>{
       const photo=card.querySelector('.property-photo'),link=card.querySelector('.property-link');
       const cardRect=card.getBoundingClientRect(),imageRect=photo.getBoundingClientRect(),linkRect=link.getBoundingClientRect();
       return {
         cardHeight:cardRect.height,imageHeight:imageRect.height,
         imageWidth:imageRect.width,linkBottom:linkRect.bottom,
         cardBottom:cardRect.bottom,linkVisible:linkRect.width>20&&linkRect.height>12,
         title:card.querySelector('h3')?.textContent, url:link.href,
         state:card.querySelector('.listing-status')?.textContent
       };
     }));
     assert.equal(diagnostics.length,4);
     for(const d of diagnostics){
       assert.ok(d.linkVisible,'Original listing link is hidden: '+JSON.stringify(d));
       assert.ok(d.linkBottom<=d.cardBottom+3,'Listing link clipped: '+JSON.stringify(d));
       assert.ok(d.imageHeight>=90,'Photo too small: '+JSON.stringify(d));
       assert.ok(d.imageWidth>100,'Photo too narrow: '+JSON.stringify(d));
       assert.ok(d.state,'Source listing status missing: '+JSON.stringify(d));
       assert.ok(d.url.startsWith('https://lasacraimmobiliare.it/products/'));
       assert.ok(!/da verificare/i.test(d.title));
     }
     assert.equal(await cards.locator('.property-features').count(),4);
     assert.equal(await cards.locator('.ape-badge').count(),4);
     assert.equal(await cards.locator('.property-link').count(),4);
     await page.screenshot({path:path.join(out,label+'-immobili.png'),fullPage:true});
     await page.locator('#pageSelect').selectOption(String(pages-1));
     assert.equal((await page.locator('#pageCounter').innerText()).trim(),'Pagina '+pages+' di '+pages);
     assert.match(await page.locator('.page-end').innerText(),/RICHIEDI LA TUA/);
     assert.match(await page.locator('.page-end').innerText(),/VALUTAZIONE ORA/);
     await page.screenshot({path:path.join(out,label+'-contatti.png'),fullPage:true});
     assert.equal(await page.locator('#pageDots').count(),0);

     // Selected official IDs preserve the requested property order and never show an unrelated listing.
     const selectedIds=await page.evaluate(async()=>{
       const feed=await (await fetch('../immobili/catalogo.json')).json();
       return window.LaSacraRules.filterListings(feed.items).slice(0,5).map(p=>String(p.id));
     });
     const chosen=await context.newPage();
     const scopedUrl=base+'?immobili='+selectedIds.join(',');
     await chosen.goto(scopedUrl,{waitUntil:'load',timeout:30000});
     await chosen.waitForFunction(()=>document.querySelectorAll('.sheet-card').length===5,{timeout:20000});
     assert.equal(await chosen.locator('.page-listing-sheet').count(),2);
     assert.equal(await chosen.locator('.page').count(),4);
     assert.equal(await chosen.locator('.pdf-download').isVisible(),false);
     const ids=await chosen.locator('.sheet-card').evaluateAll(cards=>cards.map(c=>c.dataset.propertyId));
     assert.deepEqual(ids,selectedIds);
     assert.match(await chosen.locator('[data-share="print"]').innerText(),/PDF/);
     await chosen.locator('#nextPage').click();
     assert.ok(new URL(await chosen.url()).searchParams.get('immobili')?.includes(selectedIds[0]));
     if(!isMobile){
       await chosen.emulateMedia({media:'print'});
       const selectedPdf=await chosen.pdf({printBackground:true,preferCSSPageSize:true,timeout:120000});
       fs.writeFileSync(path.join(out,'desktop-selected-print.pdf'),selectedPdf);
       assert.equal(countPdfPages(selectedPdf),4,'Selected PDF must have cover, two spreads and valuation');
     }
     await chosen.close();

     // A category or town filter is opt-in and does not change the default catalogue.
     const commercial=await context.newPage();
     await commercial.goto(base+'?categoria=Commerciale',{waitUntil:'load'});
     await commercial.waitForFunction(()=>document.querySelector('#catalogStatus')?.textContent.includes('proposte visualizzate'),{timeout:20000});
     const commercialCount=await commercial.locator('.sheet-card').count();
     assert.ok(commercialCount>0&&commercialCount<expected);
     assert.equal(await commercial.locator('#categoryFilter').inputValue(),'Commerciale');
     assert.equal(await commercial.locator('.pdf-download').isVisible(),false);
     assert.ok((await commercial.locator('.sheet-card .listing-status').allTextContents()).every(x=>x==='Disponibile'));
     await commercial.close();

     const unlocated=await context.newPage();
     await unlocated.goto(base+'?comune='+encodeURIComponent('Comune da verificare'),{waitUntil:'load'});
     await unlocated.waitForFunction(()=>document.querySelector('#catalogStatus')?.textContent.includes('proposte visualizzate'),{timeout:20000});
     assert.ok(await unlocated.locator('.sheet-card').count()>0);
     assert.ok((await unlocated.locator('.sheet-card .location').allTextContents()).every(t=>t==='Comune da verificare'));
     await unlocated.close();

     // Privacy request remains optional, not a newsletter opt-in.
     assert.equal(await page.locator('#requestMoreToggle').isChecked(),false);
     assert.equal(await page.locator('#richiesta-materiale').isVisible(),false);
     await page.locator('#requestMoreToggle').check();
     assert.equal(await page.locator('#richiesta-materiale').isVisible(),true);
     assert.equal(await page.locator('#reqMoreOffersConsent').isChecked(),false);
     await page.locator('#reqName').fill('Cliente Collaudo');
     await page.locator('#requestByWhatsApp').click();
     assert.match(await page.locator('#requestFeedback').innerText(),/informativa/i);
     await page.locator('#reqPrivacySeen').check();
     await page.evaluate(()=>{window.open=(url)=>{window.__testWhatsApp=url;return null}});
     await page.locator('#requestByWhatsApp').click();
     assert.ok((await page.evaluate(()=>window.__testWhatsApp)).includes('wa.me/393713708294'));

     if(!isMobile){
       await page.emulateMedia({media:'print'});
       const printBounds=await page.locator('.sheet-card').evaluateAll(cards=>cards.slice(0,4).map(c=>{
         const a=c.querySelector('.property-link').getBoundingClientRect();
         const b=c.getBoundingClientRect();
         return {linkBottom:a.bottom,cardBottom:b.bottom,linkWidth:a.width};
       }));
       for(const item of printBounds){
         assert.ok(item.linkWidth>0&&item.linkBottom<=item.cardBottom+3,'Print link clipped: '+JSON.stringify(item));
       }
       const pdf=await page.pdf({printBackground:true,preferCSSPageSize:true,timeout:120000});
       fs.writeFileSync(path.join(out,'desktop-full-print.pdf'),pdf);
       assert.equal(countPdfPages(pdf),pages,'Full printed PDF must include all selected offers');
       await page.emulateMedia({media:'screen'});
     }
     assert.equal(errors.length,0,'Browser errors '+errors.join(' | '));
     const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
     assert.ok(dims.scroll<=dims.width+3,'Horizontal overflow '+JSON.stringify(dims));
     console.log('PASS '+label+': '+expected+' official offers, '+sheets+' complete 2x2 spreads, optional filters, printable PDF and accessible navigation.');
   }catch(e){
     failures.push(label+': '+e.message);
     console.error('FAIL '+label,e);
     try{await page.screenshot({path:path.join(out,label+'-failure.png'),fullPage:true})}catch(_){}
   }finally{await context.close()}
 }
 try{await run('desktop',{width:1440,height:900});await run('mobile',{width:390,height:844},true)}
 finally{await browser.close()}
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
