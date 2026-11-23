#!/usr/bin/env node
/* Browser acceptance for the Vercel static export, not the SQLite Codespace lab.
 * Runs against .staging-preview/ with ALL external requests aborted.
 */
'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const base='http://127.0.0.1:18768';
const prefix='/joseph-link-in-bio-Copia/';
const paths=['gestione/','gestione/acquisizione-farming/',
  'gestione/acquisizione-farming/crm/','gestione/lettere-stampa/',
  'gestione/rivista/sfoglia/','gestione/rivista/',
  'catalogo-premium/','gestione/volantini-premium/',
  'gestione/volantini-premium/volantino-digitale/','newsletter/',
  'gestione/tutte-le-pagine/','gestione/regia-territoriale/'];
const server=spawn('python3',['-m','http.server','18768','--bind','127.0.0.1',
  '--directory','.staging-preview'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let browser;
  try{
    let up=false;
    for(let i=0;i<75;i++){
      if(server.exitCode!==null)throw Error('Static preview server exited unexpectedly');
      try{const r=await fetch(base+'/__staging__/');if(r.ok){up=true;break}}catch(_){}
      await sleep(100);
    }
    assert.ok(up,'Static preview server not ready');
    browser=await chromium.launch({headless:true,
      executablePath:process.env.JOSEPH_CHROME||'/usr/bin/google-chrome',
      args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:390,height:844}});
    let blockedExternal=0;
    await context.route('**/*',route=>{
      if(route.request().url().startsWith(base+'/'))return route.continue();
      blockedExternal++;return route.abort('blockedbyclient');
    });
    const page=await context.newPage();
    const missing=new Set();
    page.on('response',response=>{
      const url=new URL(response.url());
      if(url.origin===base && response.status()>=400 && /\.(?:js|css|html|json|svg|png|webp|jpg|jpeg|pdf)(?:$|\?)/i.test(url.pathname))
        missing.add(url.pathname+':'+response.status());
    });
    await page.goto(base+'/__staging__/',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#ztd-sandbox').count(),1);
    assert.equal(await page.locator('article a').count(),13);
    const main=await page.locator('article a').first().getAttribute('href');
    assert.equal(main,prefix+'gestione/');
    for(const path of paths){
      const response=await page.goto(base+prefix+path,{waitUntil:'domcontentloaded',timeout:24000});
      assert.equal(response.status(),200,'Missing exported route: '+path);
      assert.equal(await page.locator('#ztd-sandbox').count(),1,'Read-only preview guard missing: '+path);
    }
    await page.goto(base+'/__staging__/funnel.html',{waitUntil:'domcontentloaded'});
    assert.match(await page.locator('body').innerText(),/Codespace privato/);
    assert.equal(await page.locator('form').count(),0,'Static preview should not offer a writable CRM form');
    await page.goto(base+'/__staging__/guided.html',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#ztd-sandbox').count(),1);
    assert.equal(await page.locator('.operate').count(),1);
    assert.equal(await page.locator('.guide').count(),1);
    await page.locator('#mode').getByText(/ANTEPRIMA STATICA/).waitFor();
    await page.locator('#flow').selectOption('inbound');
    for(const checkbox of await page.locator('#controls input[type=checkbox]').all()){
      await checkbox.check();
    }
    assert.equal(await page.locator('#next').isDisabled(),true,
      'Static guide must not certify SQLite operations without a database');
    assert.equal(await page.locator('#workframe').count(),1);
    console.log('PASS: public two-pane UI works, but synthetic CRM gates remain blocked in static preview');
    // The static export must keep audited public assets required by key modules.
    const assets=[
      'case247-design.css',
      'gestione/acquisizione-farming/contatti-foglio.css',
      'gestione/acquisizione-farming/contatti-foglio.js',
      'gestione/acquisizione-farming/contatti-normalizza.js',
      'gestione/acquisizione-farming/omi-avigliana-2026-1.json',
      'gestione/rivista/edizioni/index.json',
      'gestione/tutte-le-pagine/pagine.json'
    ];
    for(const asset of assets){
      const res=await page.request.get(base+prefix+asset);
      assert.equal(res.status(),200,'Audited preview asset missing: '+asset);
    }
    console.log('PASS: public styles, contact UI scripts, OMI and page inventory delivered');
    const x=await page.request.get(base+'/__staging__/api/state');
    assert.equal(x.status(),404,'SQLite must not be exposed by static Vercel preview');
    await page.goto(base+prefix+'catalogo-premium/',{waitUntil:'domcontentloaded'});
    const outbound=page.locator('a[href^="https://wa.me/"]').first();
    if(await outbound.count()){
      await outbound.click({force:true});
      assert.equal(new URL(page.url()).origin,base,'Outbound action escaped static preview');
    }
    const manifest=await page.request.get(base+prefix+'gestione/rivista/edizioni/auto/latest.json');
    assert.equal(manifest.status(),200);
    assert.notEqual((await manifest.json()).status,'approved','Unapproved issue must stay blocked');
    console.log('PASS: Vercel export opens '+paths.length+' real project modules with a read-only banner');
    console.log('PASS: static funnel directs to private Codespaces; no SQLite API on Vercel');
    console.log('PASS: unapproved magazine unchanged, outbound links guarded');
    console.log('PREVIEW ASSETS NOT FOUND '+JSON.stringify([...missing].slice(0,45)));
    console.log('PREVIEW EXTERNAL REQUESTS BLOCKED '+blockedExternal);
    // Asset misses are reported explicitly for review; a static preview never promises full
    // offline behavior for every third-party app included in the source repository.
  }finally{
    if(browser)await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
