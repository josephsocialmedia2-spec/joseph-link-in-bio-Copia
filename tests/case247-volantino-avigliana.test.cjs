'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(base,p),'utf8');
const catalog=JSON.parse(source('immobili/catalogo.json'));
const app=source('gestione/volantini-premium/app.js');
const html=source('gestione/volantini-premium/index.html');
const styles=source('gestione/volantini-premium/styles.css');
test('App syntax',()=>assert.doesNotThrow(()=>new vm.Script(app)));
test('Paired A5 external preview controls and handlers',()=>{
 for(const id of ['outerPreview','outerPreviewState','outerLeftInput','outerRightInput','outerLeftPage','outerRightPage','outerLeftPreview','outerRightPreview','clearOuter'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/function previewOuter\(/);
 assert.match(app,/URL\.createObjectURL\(file\)/);
 assert.match(app,/file\.type==='application\/pdf'/);
 assert.match(app,/URL\.revokeObjectURL/);
 assert.match(styles,/\.outer-a5-media/);
});
test('Catalog import uses priority instead of first eighteen source rows',()=>{
 assert.match(app,/eligibleListings\(await loadCatalog\(true\)\)/);
 assert.doesNotMatch(app,/items\.filter\(x=>Core\.canonicalUrl\(x\.url\)\)\.slice\(0,18\)/);
 assert.match(app,/model\.properties=blank\(\)/);
});
test('Unsourced and unchecked listings cannot be exported',()=>{
 assert.match(app,/LaSacraRules\?\.isEligible/);
 const rules=require('../catalogo-premium/property-rules.js');
 const candidates=rules.filterListings(catalog.items);
 assert.ok(candidates.every(p=>p.availability_status==='AVAILABLE'&&p.location_status==='VERIFICATO_FONTE'));
 assert.match(app,/annunci non verificati nel catalogo ufficiale/);
 assert.match(app,/Lo ZIP non può includere annunci assenti/);
 assert.match(app,/schede senza riscontro rimosse dalla selezione/);
});
test('Studio uses only whitelist residential source listings and up to eighteen slots',()=>{
 const rules=require('../catalogo-premium/property-rules.js');
 const candidates=rules.filterListings(catalog.items);
 assert.ok(candidates.length>=18);
 assert.ok(candidates.every(x=>x.category==='Residenziale'&&rules.ALLOWED_TOWN_IDS.has(x.town_id)));
 assert.ok(candidates.some(x=>x.municipality==='Sant’Ambrogio di Torino'));
 assert.equal(new Set(candidates.map(x=>x.url)).size,candidates.length);
 assert.match(app,/chosen\.length&&!selectedIds\.length/);
});
