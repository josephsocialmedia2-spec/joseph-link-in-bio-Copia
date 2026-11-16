'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'gestione/volantini-premium/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'gestione/volantini-premium/index.html'),'utf8');
test('Print, private Drive draft and verified final are explicitly separate',()=>{
  assert.match(html,/id="exportPdf"[^>]*>PDF per stampa di prova<\/button>/);
  assert.match(html,/id="exportFinalPdf"[^>]*>PDF definitivo \+ Drive<\/button>/);
  assert.match(app,/\$\('exportPdf'\)\.onclick=\(\)=>exportPdf\(false\)/);
  assert.match(app,/\$\('exportFinalPdf'\)\.onclick=\(\)=>exportPdf\(true\)/);
});
test('Proof printing does not trigger a browser confirm popup',()=>{
  assert.doesNotThrow(()=>new vm.Script(app));
  const proof=app.slice(app.indexOf('async function exportPdf('),app.indexOf('function downloadBlob('));
  assert.doesNotMatch(proof,/confirm\s*\(/);
  assert.match(proof,/watermark:definitive!==true/);
  assert.match(proof,/if\(proof&&definitive\)throw Error/);
  assert.match(proof,/BOZZA_STAMPA/);
  assert.match(proof,/DEFINITIVO/);
});
test('Print retains safeguards for unpublished listings and invalid QR destinations',()=>{
  const proof=app.slice(app.indexOf('async function exportPdf('),app.indexOf('function downloadBlob('));
  assert.match(proof,/await loadCatalog\(true\)/);
  assert.match(proof,/invalid\.length/);
  assert.match(proof,/QR\.verifyAssociations/);
  assert.match(proof,/externalLeft,externalRight/);
});
