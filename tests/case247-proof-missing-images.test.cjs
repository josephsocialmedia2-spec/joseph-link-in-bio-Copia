'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const pdf=fs.readFileSync(path.join(base,'gestione/volantini-premium/pdf-engine.js'),'utf8');
const app=fs.readFileSync(path.join(base,'gestione/volantini-premium/app.js'),'utf8');
test('Both modules parse',()=>{assert.doesNotThrow(()=>new vm.Script(pdf));assert.doesNotThrow(()=>new vm.Script(app))});
test('Missing src is not a failed image',async()=>{
 const browser={PDFLib:{},CASE247_QR:{},setTimeout};browser.window=browser;
 vm.runInNewContext(pdf,browser);
 assert.equal(await browser.CASE247_PDF.waitForImg({getAttribute:()=>null}),true);
 assert.equal(await browser.CASE247_PDF.waitForImg({getAttribute:()=>'',complete:true,naturalWidth:0,naturalHeight:0}),true);
});
test('Broken image is reported but draft is not blocked by preflight',async()=>{
 const browser={setTimeout};browser.window=browser;
 vm.runInNewContext(pdf,browser);
 const good={getAttribute:()=>'/x.png',complete:true,naturalWidth:200,naturalHeight:100};
 const bad={getAttribute:()=>'/missing.png',complete:true,naturalWidth:0,naturalHeight:0};
 const flyer={querySelectorAll:()=>[good,bad]};
 const missing=await browser.CASE247_PDF.inspectImages(flyer);
 assert.equal(missing.length,1);assert.equal(missing[0],1);
 assert.match(pdf,/missingImages\.length&&!watermark/);
 assert.match(pdf,/img\.style\.visibility='hidden'/);
 assert.match(pdf,/FOTO DA VERIFICARE/);
});
test('Preview is explicitly watermarked while definitive stays strict',()=>{
 const section=app.slice(app.indexOf('async function exportPdf('),app.indexOf('function downloadBlob('));
 assert.match(section,/watermark:!definitive/);
 assert.match(section,/result\.missingImages/);
 assert.match(section,/if\(proof&&definitive\)/);
 assert.doesNotMatch(section,/confirm\s*\(/);
});
