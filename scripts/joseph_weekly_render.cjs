#!/usr/bin/env node
/* GitHub Actions Chromium renderer; no external browser service. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const mode=process.argv[2]||'test';
const root=path.resolve(__dirname,'..');
const source=path.join(root,'gestione','rivista','data','approved.json');
const now=new Date().toISOString().slice(0,10);
const example={
  issue:'TEST',period:'Prova tecnica - nessun articolo reale',cover:'ANTEPRIMA TECNICA, NON PUBBLICARE',
  editorial:'Contenuti di prova per controllare impaginazione e funzionamento del PDF.',
  closed:true,
  items:Array.from({length:3},(_,i)=>({
    title:'TEST QA NON PUBBLICARE '+(i+1),date:now,source:'Fonte di test',
    url:'https://example.com/test-'+i,summary:'Test tecnico di rendering senza dati reali. '+('Un testo segnaposto per verificare impaginazione, spaziature e stampa. ').repeat(2),
    status:'approved',original_url_verified:true
  }))
};
async function main(){
  if(!['test','final'].includes(mode))throw new Error('Only test or final modes allowed');
  const model=mode==='test'?example:JSON.parse(fs.readFileSync(source,'utf8'));
  if(mode==='final' && (!model.closed||!Array.isArray(model.items)||model.items.length<3)) throw new Error('Editorial release not approved');
  const outDir=path.join(root,'gestione','rivista','edizioni');
  fs.mkdirSync(outDir,{recursive:true});
  const safeIssue=String(model.issue).replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,40);
  const name=mode==='final'?('Joseph-Real-Estate-Weekly-'+safeIssue+'-'+now+'.pdf'):'TEST-QA-NON-PUBBLICARE.pdf';
  const pdfPath=path.join(outDir,name);
  const browser=await chromium.launch({headless:true,executablePath:process.env.JOSEPH_CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1200,height:900},deviceScaleFactor:1});
    await context.addInitScript(value=>{
      localStorage.setItem('jm-real-estate-weekly-v1',JSON.stringify(value));
    },model);
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',err=>errors.push(String(err)));
    await page.goto('http://127.0.0.1:8765/gestione/rivista/stampa.html',{waitUntil:'load',timeout:25000});
    await page.locator('.sheet').first().waitFor();
    const sheets=await page.locator('.sheet').count();
    if(sheets!==8)throw new Error('Expected 8 A4 sheets, got '+sheets);
    if(!(await page.locator('#doPrint').isEnabled())) throw new Error('Print button disabled after editorial approval');
    if(errors.length)throw new Error('JavaScript errors: '+errors.join(' / '));
    const overflow=await page.locator('.sheet').evaluateAll(xs=>xs.map((x,i)=>({page:i+1,used:x.scrollHeight,available:x.clientHeight})).filter(x=>x.used>x.available+4));
    if(overflow.length)throw new Error('Clipped A4 page content: '+JSON.stringify(overflow));
    await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
    const shot=path.join(outDir,mode==='test'?'TEST-QA-cover.png':('Joseph-Weekly-'+safeIssue+'-cover.png'));
    await page.locator('.sheet').first().screenshot({path:shot});
    console.log(JSON.stringify({status:'ok',mode,pdf:pdfPath,screenshot:shot,pages:sheets,bytes:fs.statSync(pdfPath).size}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
