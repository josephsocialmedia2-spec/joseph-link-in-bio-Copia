#!/usr/bin/env node
/* Full-project browser smoke in a read-only, isolated staging environment. */
'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:18767';
const ORIGIN='/joseph-link-in-bio-Copia/';
const paths=[
  'gestione/', 'gestione/acquisizione-farming/', 'gestione/acquisizione-farming/crm/',
  'gestione/lettere-stampa/', 'gestione/rivista/sfoglia/', 'gestione/rivista/',
  'catalogo-premium/', 'gestione/volantini-premium/',
  'gestione/volantini-premium/volantino-digitale/', 'newsletter/',
  'gestione/tutte-le-pagine/', 'gestione/regia-territoriale/'
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['tools/staging/server.py','--host','127.0.0.1','--port','18767'],{stdio:'ignore'});
(async()=>{
 let browser;
 try{
   let up=false;
   for(let n=0;n<70;n++){
     if(server.exitCode!==null)throw Error('Staging server crashed before start');
     try{const r=await fetch(BASE+'/__staging__/');if(r.ok){up=true;break}}catch(_){}
     await sleep(120);
   }
   assert.ok(up,'Staging server did not start');
   browser=await chromium.launch({headless:true,executablePath:process.env.JOSEPH_CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
   const context=await browser.newContext({viewport:{width:390,height:844}});
   const page=await context.newPage();
   const results=[];
   for(const path of paths){
     const response=await page.goto(BASE+ORIGIN+path,{waitUntil:'domcontentloaded',timeout:25000});
     const status=response.status();
     const banner=await page.locator('#ztd-sandbox').count();
     const title=await page.title();
     const record={path,status,stagingBanner:banner===1,title};
     results.push(record);
     assert.equal(status,200,'Page unavailable: '+path);
     assert.equal(banner,1,'Staging banner absent: '+path);
   }
   console.log('PASS: '+results.length+' project modules open on an isolated staging origin');
   await page.goto(BASE+'/__staging__/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('article a').count(),12);
   const opening=await page.locator('article a').first().getAttribute('href');
   assert.equal(opening,ORIGIN+'gestione/');
   await page.locator('article a').first().click();
   await page.waitForURL(/\/gestione\/$/);
   assert.equal(await page.locator('#ztd-sandbox').count(),1);
   console.log('PASS: test portal navigation opens the existing CASE247 dashboard');

   const policy=await page.evaluate(async()=>{
     try{await fetch('https://example.com/sandbox-must-block',{method:'POST',mode:'cors'});return 'allowed'}
     catch{return 'blocked'}
   });
   assert.equal(policy,'blocked','External network requests must be blocked');
   console.log('PASS: external network writes blocked');

   await page.goto(BASE+ORIGIN+'gestione/rivista/sfoglia/',{waitUntil:'domcontentloaded'});
   await page.locator('#counter').getByText('Non ancora approvata',{exact:true}).waitFor();
   assert.equal(await page.locator('.downloads a:visible').count(),0);
   console.log('PASS: unapproved magazine does not expose current PDFs as approved');

   await page.goto(BASE+ORIGIN+'catalogo-premium/',{waitUntil:'domcontentloaded'});
   const external=page.locator('a[href^="https://wa.me/"]').first();
   if(await external.count()){
     await external.click({force:true});
     assert.equal(new URL(page.url()).origin,BASE,'External contact action must not navigate out of staging');
     console.log('PASS: external WhatsApp contact link cannot leave the sandbox');
   }

   console.log('STAGING MODULE REPORT '+JSON.stringify(results));
 }finally{
   if(browser)await browser.close();
   server.kill('SIGTERM');
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
