#!/usr/bin/env node
/* Real-click / DOM-mirrored Zero to Diamond training, synthetic API only. */
'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:18769';
const server=spawn('python3',['tools/staging/server.py','--host','127.0.0.1','--port','18769'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let browser;
 try{
  let up=false;
  for(let t=0;t<90;t++){try{if((await fetch(BASE+'/__staging__/api/health')).ok){up=true;break}}catch(_){}await sleep(130)}
  assert.ok(up,'Server staging not running');
  browser=await chromium.launch({headless:true,executablePath:process.env.JOSEPH_CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1650,height:1000}});
  const response=await page.goto(BASE+'/__staging__/guided.html',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  const work=page.frameLocator('#workframe');
  const mirror=page.frameLocator('#mirrorframe');
  await page.locator('#mode.live').waitFor();
  await work.locator('#rew-open-flipbook').waitFor();
  await mirror.locator('#rew-open-flipbook[data-ztd-live-target]').waitFor();
  assert.equal(await page.locator('#next').isVisible(),false,'Manual Next must be hidden');
  assert.equal(await page.locator('#mirrorframe').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  // Wrong clicks cannot unlock the guide.
  await work.locator('#rew-download-magazine').click({force:true});
  assert.match(await page.locator('#steptitle').innerText(),/Apri la rivista/);
  await work.locator('#rew-open-flipbook').click();
  await page.locator('#steptitle').getByText(/Verifica la Lettera aggiornata/).waitFor();
  await work.locator('#letter').waitFor();
  await mirror.locator('#letter[data-ztd-live-target]').waitFor();
  await work.locator('#letter').click();
  await page.locator('#steptitle').getByText(/Scegli il modello A/).waitFor();
  await work.locator('#model-A').click();
  await page.locator('#steptitle').getByText(/Scegli il modello B/).waitFor();
  await work.locator('#model-B').click();
  await page.locator('#steptitle').getByText(/Scegli il modello C/).waitFor();
  await work.locator('#model-C').click();
  await page.locator('#steptitle').getByText(/Verifica il QR/).waitFor();
  await work.locator('#qr-test').click();
  await page.locator('#steptitle').getByText(/Controlla il blocco editoriale/).waitFor();
  await work.locator('#review-status').click();
  await page.locator('#mirrorlabel').getByText(/PROCEDURA COMPLETATA/).waitFor();
  assert.equal(await work.locator('#result').getAttribute('data-test'),'approval');
  console.log('PASS: identical mirrored pages, highlighted exact DOM target, real click → checked result → automatic next step');
  console.log('PASS: actual Farming→Lettere link, original PDF, three A/B/C interactive models, QR and editorial gate');

  const reset=await page.evaluate(async()=>(
   await fetch('/__staging__/api/reset',{method:'POST',
    headers:{'Content-Type':'application/json','X-Staging-Lab':'synthetic-only'},
    body:JSON.stringify({confirm:'RESET_SYNTHETIC_ONLY'})})).status);
  assert.equal(reset,200);
  await page.locator('#flow').selectOption('inbound');
  await work.locator('#create').waitFor();
  await work.locator('#create').click();
  await page.locator('#steptitle').getByText(/Qualifica il TEST/).waitFor();
  await work.locator('button[data-action="qualify"]').click();
  await page.locator('#steptitle').getByText(/Prova il divieto di follow-up/).waitFor();
  await work.locator('button[data-action="followup"]').click();
  await page.locator('#steptitle').getByText(/Attiva il permesso TEST/).waitFor();
  await work.locator('#selectedMarketing').check();
  await page.locator('#steptitle').getByText(/Registra la scelta TEST/).waitFor();
  await work.locator('#updatePermissions').click();
  await page.locator('#steptitle').getByText(/Esegui follow-up TEST/).waitFor();
  await work.locator('button[data-action="followup"]').click();
  await page.locator('#mirrorlabel').getByText(/PROCEDURA COMPLETATA/).waitFor();
  console.log('PASS: actual SQLite CRM actions observed: request → qualified → blocked follow-up → permission → successful TEST follow-up');

  await page.locator('#flow').selectOption('handoff');
  await work.locator('#create').click();
  await page.locator('#steptitle').getByText(/Qualifica la richiesta/).waitFor();
  await work.locator('button[data-action="qualify"]').click();
  await page.locator('#steptitle').getByText(/Verifica che il sistema blocchi/).waitFor();
  await work.locator('button[data-action="handoff"]').click();
  await page.locator('#steptitle').getByText(/Gate 1 di 7/).waitFor();
  for(let k=1;k<=7;k++){
   await work.locator('#gate-'+k).check();
   if(k<7)await page.locator('#steptitle').getByText('Gate '+(k+1)+' di 7').waitFor();
  }
  await page.locator('#steptitle').getByText(/Convalida i 7 controlli/).waitFor();
  await work.locator('#gate-submit').click();
  await page.locator('#steptitle').getByText(/Seleziona il permesso trasferimento/).waitFor();
  await work.locator('#selectedTransfer').check();
  await page.locator('#steptitle').getByText(/Salva il permesso TEST/).waitFor();
  await work.locator('#updatePermissions').click();
  await page.locator('#steptitle').getByText(/Handoff a AGENTE TEST/).waitFor();
  await work.locator('button[data-action="handoff"]').click();
  await page.locator('#steptitle').getByText(/Chiudi il processo TEST/).waitFor();
  await work.locator('button[data-action="close"]').click();
  await page.locator('#mirrorlabel').getByText(/PROCEDURA COMPLETATA/).waitFor();
  const db=await page.evaluate(async()=>await (await fetch('/__staging__/api/state')).json());
  assert.equal(db.kpi.handoffs_simulated,1);
  assert.equal(db.kpi.closed_simulated,1);
  assert.equal(db.kpi.blocked_by_policy,2);
  assert.equal(db.external_deliveries,0);
  console.log('PASS: 7 real checkbox actions, verified TEST permission, handoff and closure; zero external deliveries');

  await page.locator('#flow').selectOption('routine');
  for(let i=0;i<8;i++){
   await work.locator('#slot-'+i).click();
   if(i<7)await page.locator('#steptitle').getByText(/.+/).waitFor();
  }
  await page.locator('#mirrorlabel').getByText(/PROCEDURA COMPLETATA/).waitFor();
  await page.locator('#flow').selectOption('newsletter');
  await work.locator('#track-A').click();
  await page.locator('#steptitle').getByText(/calendario italiano/).waitFor();
  await work.locator('#track-B').click();
  await page.locator('#steptitle').getByText(/blocco degli invii/).waitFor();
  await work.locator('#verify-channel').click();
  await page.locator('#steptitle').getByText(/Genera il contatto TEST/).waitFor();
  await work.locator('#create').click();
  await page.locator('#steptitle').getByText(/Imposta NON CONTATTARE/).waitFor();
  await work.locator('button[data-action="stop"]').click();
  await page.locator('#mirrorlabel').getByText(/PROCEDURA COMPLETATA/).waitFor();
  console.log('PASS: routine, newsletter rotations and database NON_CONTATTARE via real clicks');
  await page.setViewportSize({width:385,height:780});
  await page.locator('[data-view="guide"]').click();
  assert.equal(await page.locator('#mirrorframe').isVisible(),true);
  await page.locator('[data-view="operate"]').click();
  assert.equal(await page.locator('#workframe').isVisible(),true);
  console.log('PASS: responsive mobile switch between identical page and guided mirror');
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
