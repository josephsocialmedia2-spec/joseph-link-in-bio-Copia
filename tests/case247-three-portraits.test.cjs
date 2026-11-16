'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('gestione/volantini-premium/index.html');
const app=read('gestione/volantini-premium/app.js');
const css=read('gestione/volantini-premium/styles.css');
test('Javascript syntax and independent portrait uploads',()=>{
 assert.doesNotThrow(()=>new vm.Script(app));
 for(const id of ['portraitJosephInput','portraitCristianInput','portraitYleniaInput','portraitJosephStatus','portraitCristianStatus','portraitYleniaStatus'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/id="portraitInput"/);
});
test('Saved portraits survive reload in IndexedDB with local fallback',()=>{
 assert.match(app,/indexedDB\.open\(photoStoreName,1\)/);
 assert.match(app,/createObjectStore\('portraits'\)/);
 assert.match(app,/async function savePortrait\(id,data\)/);
 assert.match(app,/async function loadPortrait\(id\)/);
 assert.match(app,/async function restorePortraits\(\)/);
 assert.match(app,/savePortrait\('joseph',model\.portrait\)/);
 assert.match(app,/global\.localStorage\.setItem\(photoStoreName/);
 for(const id of ['joseph','cristian','ylenia'])assert.match(app,new RegExp(id));
});
test('Selected profile photo, not Joseph, is rendered into both flyer photo positions',()=>{
 assert.match(app,/storedPortraits\[staff\.id\]/);
 assert.match(app,/staff\.id==='joseph'\?model\.portrait/);
 assert.match(app,/portrait\.src=photo/);
 assert.match(app,/footerPortrait\.src=photo/);
 assert.match(css,/#flyer\.profile-lasacra\.has-staff-photo \.flyer-header \.portrait\{display:block!important/);
 assert.match(css,/#flyer\.profile-lasacra\.has-staff-photo \.footer-portrait\{display:block!important/);
});
test('Large 18 badge removed without removing 18 listing slots',()=>{
 assert.doesNotMatch(html,/<div class="headline"><strong>18<\/strong>/);
 assert.match(html,/<div class="headline"><span>IMMOBILI<br>IN EVIDENZA<\/span><\/div>/);
 assert.match(html,/id="listingGrid"/);
 assert.match(app,/length:18/);
});
