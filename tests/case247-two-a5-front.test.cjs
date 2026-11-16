'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=source('gestione/volantini-premium/index.html');
const app=source('gestione/volantini-premium/app.js');
const pdf=source('gestione/volantini-premium/pdf-engine.js');
const css=source('gestione/volantini-premium/styles.css');
test('Both Javascript modules parse',()=>{assert.doesNotThrow(()=>new vm.Script(app));assert.doesNotThrow(()=>new vm.Script(pdf))});
test('Upload and preview slots for LEFT and RIGHT A5 exist',()=>{
  for(const id of ['outerLeftInput','outerRightInput','outerLeftPage','outerRightPage','outerLeftPreview','outerRightPreview'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(html,/id="outerInput"/);
  assert.match(css,/\.outer-preview\.outer-a5-pair/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
});
test('Both files are forwarded to PDF and three-version ZIP export',()=>{
  assert.match(app,/externalLeftPage:Number\(\$\('outerLeftPage'\)/);
  assert.match(app,/externalRightPage:Number\(\$\('outerRightPage'\)/);
  assert.equal((app.match(/externalLeft,externalRight/g)||[]).length>=2,true);
  assert.match(app,/Boolean\(externalLeft\)!==Boolean\(externalRight\)/);
});
test('A4 page places each A5 in its own half without cropping',()=>{
  assert.match(pdf,/const half=W\/2/);
  assert.match(pdf,/Math\.min\(half\/w,H\/h\)/);
  assert.match(pdf,/drawA5\(doc,page,left,leftPage,0\)/);
  assert.match(pdf,/drawA5\(doc,page,right,rightPage,W\/2\)/);
  assert.match(pdf,/if\(!left\|\|!right\)throw Error/);
  assert.match(pdf,/if\(w>=h\)throw Error/);
  assert.match(pdf,/if\(externalLeft\|\|externalRight\)await addExternalPage/);
});
test('Two-file upload supersedes old single external upload throughout source',()=>{
  assert.doesNotMatch(html,/id="outerInput"/);
  assert.doesNotMatch(app,/externalFile|\$\('outerInput'\)/);
  assert.doesNotMatch(pdf,/externalFile/);
});
