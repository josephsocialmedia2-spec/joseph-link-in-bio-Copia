#!/usr/bin/env node
/* Browser acceptance for the NEW two-pane guided operations on real staging
 * pages and the isolated SQLite synthetic CRM. No production services.
 */
'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const HOST='http://127.0.0.1:18769';
const server=spawn('python3',['tools/staging/server.py','--host','127.0.0.1','--port','18769'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let browser;
 try{
  let ready=false;
  for(let n=0;n<90;n++){
   try{const r=await fetch(HOST+'/__staging__/api/health');if(r.ok){ready=true;break}}catch(_){}
   await sleep(100);
  }
  assert.ok(ready,'Staging server did not start');
  browser=await chromium.launch({headless:true,executablePath:process.env.JOSEPH_CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1500,height:900}});
  page.on('pageerror',e=>{throw Error('Guide JavaScript: '+e.message)});
  const opening=await page.goto(HOST+'/__staging__/guided.html',{waitUntil:'domcontentloaded'});
  assert.equal(opening.status(),200);
  await page.locator('#mode.live').getByText('CODESPACES').waitFor();
  assert.equal(await page.locator('.operate').count(),1);
  assert.equal(await page.locator('.guide').count(),1);
  assert.equal(await page.locator('#workframe').count(),1);
  const op=page.frameLocator('#workframe');
  await op.locator('#ztd-sandbox').waitFor();
  assert.equal(await page.locator('#next').isDisabled(),true);
  await page.locator('#controls input[type=checkbox]').first().check();
  await page.locator('#controls input[type=checkbox]').last().check();
  assert.equal(await page.locator('#next').isEnabled(),true);
  await page.locator('#next').click();
  await page.locator('#steptitle').getByText('Apri Lettere & Stampa').waitFor();
  await page.locator('#controls select[data-field="letter"]').selectOption('B');
  await page.locator('#controls select[data-field="purpose"]').selectOption('generica');
  await page.locator('#controls input[type=checkbox]').check();
  assert.equal(await page.locator('#next').isDisabled(),true,'Letter B cannot be distributed generically');
  await page.locator('#controls select[data-field="purpose"]').selectOption('inbound');
  assert.equal(await page.locator('#next').isEnabled(),true);
  console.log('PASS: two real panes, staging dashboard and letter-B restriction');
  // Reset only the isolated synthetic database; no real API is called.
  const clear=await page.evaluate(async()=>{
   return (await fetch('/__staging__/api/reset',{method:'POST',
    headers:{'Content-Type':'application/json','X-Staging-Lab':'synthetic-only'},
    body:JSON.stringify({confirm:'RESET_SYNTHETIC_ONLY'})})).status;
  });
  assert.equal(clear,200);
  await page.locator('#flow').selectOption('inbound');
  await op.locator('#feedback').getByText(/CRM SQLite sintetico pronto/).waitFor();
  await page.locator('#controls input[type=checkbox]').first().check();
  await page.locator('#controls input[type=checkbox]').last().check();
  assert.equal(await page.locator('#next').isDisabled(),true,'A manual tick cannot fake a CRM lead');
  await op.locator('#create').click();
  await op.locator('#feedback').getByText(/Richiesta TEST/).waitFor();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isEnabled(),true,'Lead must be verified in SQLite');
  await page.locator('#next').click();
  assert.equal(await page.locator('#next').isDisabled(),true);
  await op.locator('button[data-action="qualify"]').click();
  await op.locator('#selected').getByText(/Qualificato/).waitFor();
  await page.locator('#controls input[type=checkbox]').first().check();
  await page.locator('#controls input[type=checkbox]').last().check();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isEnabled(),true);
  await page.locator('#next').click();
  await op.locator('button[data-action="followup"]').click();
  await op.locator('#feedback').getByText(/consenso assente/).waitFor();
  for(const box of await page.locator('#controls input[type=checkbox]').all())await box.check();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isEnabled(),true,'Blocked followup must be in event log');
  await page.locator('#next').click();
  await op.locator('#selectedMarketing').check();
  await op.locator('#updatePermissions').click();
  await op.locator('#feedback').getByText(/Azione permissions/).waitFor();
  await op.locator('button[data-action="followup"]').click();
  await op.locator('#feedback').getByText(/Azione followup/).waitFor();
  for(const box of await page.locator('#controls input[type=checkbox]').all())await box.check();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isEnabled(),true);
  console.log('PASS: inbound → SQLite → qualify → blocked follow-up → authorized TEST follow-up');
  await page.locator('#flow').selectOption('handoff');
  const guards=await page.locator('#controls input[type=checkbox]').count();
  assert.equal(guards,7,'All seven gate conditions must be displayed');
  await op.locator('button[data-action="handoff"]').click();
  await page.locator('#toast').getByText(/Handoff bloccato/).waitFor();
  for(const box of await page.locator('#controls input[type=checkbox]').all())await box.check();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isDisabled(),true,'No handoff without permission');
  await op.locator('#selectedTransfer').check();
  await op.locator('#updatePermissions').click();
  await op.locator('#feedback').getByText(/Azione permissions/).waitFor();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isEnabled(),true);
  await page.locator('#next').click();
  await op.locator('button[data-action="handoff"]').click();
  await op.locator('#feedback').getByText(/Azione handoff/).waitFor();
  for(const box of await page.locator('#controls input[type=checkbox]').all())await box.check();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isEnabled(),true);
  await page.locator('#next').click();
  await op.locator('button[data-action="close"]').click();
  await op.locator('#feedback').getByText(/Azione close/).waitFor();
  for(const box of await page.locator('#controls input[type=checkbox]').all())await box.check();
  await page.locator('#sync').click();
  assert.equal(await page.locator('#next').isEnabled(),true);
  const db=await page.evaluate(async()=>await (await fetch('/__staging__/api/state')).json());
  assert.equal(db.kpi.handoffs_simulated,1);
  assert.equal(db.kpi.closed_simulated,1);
  assert.equal(db.kpi.blocked_by_policy,1);
  assert.equal(db.external_deliveries,0);
  console.log('PASS: guided handoff blocked until 7 checks, then SQLite handoff + close without real deliveries');
  // Static site preview must still show both panes but not fabricate a live CRM.
  await page.setViewportSize({width:380,height:780});
  await page.locator('[data-view="guide"]').click();
  assert.equal(await page.locator('.guide').isVisible(),true);
  await page.locator('[data-view="operate"]').click();
  assert.equal(await page.locator('.operate').isVisible(),true);
  console.log('PASS: mobile tabs switch operative page and instruction page');
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
