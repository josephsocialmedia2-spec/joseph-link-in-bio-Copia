'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'gestione/volantini-premium/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'gestione/volantini-premium/styles.css'),'utf8');
const html=fs.readFileSync(path.join(root,'gestione/volantini-premium/index.html'),'utf8');
test('complete preflight can be expanded and contains no 10-item truncation',()=>{
 assert.doesNotThrow(()=>new vm.Script(app));
 const body=app.slice(app.indexOf('function showPreflight()'),app.indexOf('function render(){'));
 assert.ok(body.includes("for(const issue of issues)"));
 assert.ok(body.includes("for(const [index,items] of"));
 assert.ok(body.includes("open.onclick=()=>openDialog(index)"));
 assert.ok(body.includes("target.replaceChildren(summary,explanation)"));
 assert.ok(!body.includes('issues.slice(0,10)'));
 assert.ok(body.includes("APE in redazione"));
 assert.ok(body.includes("categories.ape.length"));
});
test('final gate opens checklist and preserves strict publishing controls',()=>{
 const body=app.slice(app.indexOf('async function exportPdf('),app.indexOf('function downloadBlob('));
 assert.ok(body.includes("if(proof&&definitive===true)"));
 assert.ok(body.includes("dataset.expanded='true'"));
 assert.ok(body.includes("scrollIntoView"));
 assert.ok(body.includes('Drive.uploadPrivateDraft'));
 assert.ok(body.includes('Drive.uploadVerifiedPdf'));
 assert.match(css,/#preflight \.preflight-open/);
 assert.match(html,/app\.js\?v=20261116-preflight-all/);
});
