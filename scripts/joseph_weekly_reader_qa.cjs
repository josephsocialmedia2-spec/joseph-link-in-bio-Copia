#!/usr/bin/env node
/* Read-only browser regression for the Joseph Weekly reader and safe publication gate.
 * Exercises an unapproved on-disk manifest and an in-memory approved QA fixture.
 * Never approves an issue, sends messages, or modifies the repository.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:8765';
const PATH='/gestione/rivista/sfoglia/';
const LIVE_READER='https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/rivista/sfoglia/';
const DATE='2026-11-22';
const fixture={
  status:'approved',issue_date:DATE,approved_issue:'QA-ONLY',
  qr_target:LIVE_READER,
  magazine:'Real-Estate-Weekly-'+DATE+'.pdf',
  double_pages:'Real-Estate-Weekly-Doppie-Pagine-'+DATE+'.pdf',
  seller_letter:'Seller-Letter-'+DATE+'.pdf',
  previews:Array.from({length:8},(_,i)=>'previews/'+DATE+'/pagina-'+String(i+1).padStart(2,'0')+'.jpg')
};
(async()=>{
  const browser=await chromium.launch({
    headless:true,executablePath:process.env.JOSEPH_CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']
  });
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(ROOT+PATH,{waitUntil:'load'});
    await page.locator('#counter').getByText('Non ancora approvata').waitFor();
    assert.equal(await page.locator('#next').isDisabled(),true);
    assert.equal(await page.locator('#prev').isDisabled(),true);
    assert.equal(await page.locator('.downloads a:visible').count(),0,'Unapproved PDFs must remain hidden');
    assert.equal(await page.locator('#book a').getAttribute('href'),'../../lettere-stampa/');
    const legacy=await page.request.get(ROOT+'/gestione/lettere-stampa/');
    assert.equal(legacy.status(),200,'Existing legacy edition must remain available');
    assert.match(await legacy.text(),/Real Estate Weekly/i);
    console.log('PASS: unapproved issue does not masquerade as a new edition; archive accessible');

    await page.route('**/gestione/rivista/edizioni/auto/latest.json*',route=>
      route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
    await page.goto(ROOT+PATH,{waitUntil:'load'});
    await page.locator('#counter').getByText('Apertura 1 / 5').waitFor();
    assert.equal(await page.locator('.downloads a:visible').count(),3);
    assert.match(await page.locator('#pdf').getAttribute('href'),/Real-Estate-Weekly-2026-11-22\.pdf$/);
    assert.match(await page.locator('#spreads').getAttribute('href'),/Real-Estate-Weekly-Doppie-Pagine-2026-11-22\.pdf$/);
    assert.match(await page.locator('#letter').getAttribute('href'),/Seller-Letter-2026-11-22\.pdf$/);
    await page.locator('#next').click();
    await page.locator('#counter').getByText('Apertura 2 / 5').waitFor();
    assert.equal(await page.locator('#book img').count(),2,'Second opening must display two pages');
    await page.locator('#prev').click();
    await page.locator('#counter').getByText('Apertura 1 / 5').waitFor();
    console.log('PASS: approved fixture exposes the same issue PDFs, letter and usable mobile page controls');

    const bad={...fixture,qr_target:'https://example.com/not-our-reader/'};
    await page.unrouteAll({behavior:'wait'});
    await page.route('**/gestione/rivista/edizioni/auto/latest.json*',route=>
      route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bad)}));
    await page.reload({waitUntil:'load'});
    await page.locator('#counter').getByText('Non ancora approvata').waitFor();
    assert.equal(await page.locator('.downloads a:visible').count(),0);
    console.log('PASS: manifest QR mismatch fails closed');

    await page.unrouteAll({behavior:'wait'});
    await page.goto(ROOT+PATH+'redirect-lettere-stampa.html?source=qa',{waitUntil:'domcontentloaded'});
    await page.waitForURL(/\/gestione\/rivista\/sfoglia\/\?source=qa/);
    console.log('PASS: static redirect resolves to the correct reader from its original location');
    assert.deepEqual(errors,[],'No JavaScript runtime errors');
    console.log('PASS: reader end-to-end browser smoke (read-only, QA fixtures only)');
  }finally{
    await browser.close();
  }
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});
