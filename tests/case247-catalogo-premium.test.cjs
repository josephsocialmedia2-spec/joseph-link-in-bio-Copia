'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('catalogo-premium/index.html');
const js=read('catalogo-premium/catalogo.js');
const css=read('catalogo-premium/style.css');
const Rules=require('../catalogo-premium/property-rules.js');
const items=JSON.parse(read('immobili/catalogo.json')).items;
const eligible=Rules.filterListings(items);

test('scripts parse, shared property rules exist and original feed is not modified',()=>{
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.ok(items.length>=30,'Official feed should contain property source records');
  assert.ok(eligible.length>=10,'Residential subset unexpectedly empty');
  assert.match(html,/property-rules\.js/);
  assert.match(js,/Rules\.filterListings/);
});

test('strict residential filter excludes business, land, chalet and town outside whitelist',()=>{
  assert.ok(items.some(p=>p.category==='Impresa'));
  assert.ok(items.some(p=>p.municipality==='Borgaro Torinese'));
  assert.ok(eligible.every(p=>p.category==='Residenziale'));
  assert.ok(eligible.every(p=>p.location_status==='VERIFICATO_FONTE'));
  assert.ok(eligible.every(p=>Rules.ALLOWED_TOWN_IDS.has(p.town_id)));
  assert.ok(eligible.every(p=>Rules.originalUrl(p.url)));
  assert.equal(eligible.some(p=>/terren|magazzin|chalet|attivit|bar|ristorant|capannon/i.test(p.title)),false);
  assert.equal(eligible.some(p=>p.municipality==='Borgaro Torinese'),false);
  const offTown={...eligible[0],town_id:'borgaro-torinese',municipality:'Borgaro Torinese'};
  assert.equal(Rules.isEligible(offTown),false);
  const bareLand={...eligible[0],title:'TERRENO EDIFICABILE CON PROGETTO',category:'Residenziale'};
  assert.equal(Rules.isEligible(bareLand),false);
});

test('onlyVerified flag excludes missing APE; verified status is never guessed',()=>{
  assert.ok(eligible.every(p=>!Rules.hasVerifiedApe(p)));
  assert.equal(Rules.filterListings(items,{onlyVerified:true}).length,0);
  const verified={...eligible[0],apeStatus:'PRESENTE',apeVerified:true,energyClass:'B',epglNren:121};
  assert.ok(Rules.isEligible(verified,{onlyVerified:true}));
  assert.equal(Rules.displayData(verified).ape,'Classe B');
  assert.equal(Rules.displayData(eligible[0]).ape,'APE da verificare');
  const hidden={...verified,apeVerified:false};
  assert.equal(Rules.isEligible(hidden,{onlyVerified:true}),false);
  assert.match(html,/id="verifiedOnly"/);
  assert.match(js,/solo_verificati/);
});

test('derived headings and features come from original title or description, not placeholders',()=>{
  for(const p of eligible){
    const display=Rules.displayData(p);
    assert.ok(display.title.length>3);
    assert.doesNotMatch(display.title,/da verificare/i);
    assert.ok(display.locality);
    assert.ok(display.rooms.toLowerCase().includes('locali'));
    assert.ok(display.surface.includes('m²')||display.surface.includes('n.d.'));
    assert.ok(display.features.length<=2);
  }
  const example={...eligible[0],title:'TRILOCALE CON TERRAZZO E BOX',description:'',rooms:null};
  assert.equal(Rules.displayData(example).title,'Trilocale con terrazzo');
  assert.equal(Rules.displayData(example).rooms,'3 locali');
  const none={...eligible[0],title:'APPARTAMENTO',description:'',surface:null,rooms:null};
  assert.equal(Rules.displayData(none).surface,'Superficie n.d.');
  assert.equal(Rules.displayData(none).rooms,'Locali n.d.');
});

test('catalogue always keeps four real properties per sheet with original secure links',()=>{
  assert.match(js,/const pageSize=4/);
  assert.match(js,/grid\.append\(card\(p,true\)\)/);
  assert.match(js,/frame\.insertBefore\(sheet,before\)/);
  assert.match(js,/link\.href=p\.url/);
  assert.match(js,/rel='noopener noreferrer'/);
  assert.match(js,/property-link/);
  assert.match(js,/ape-badge/);
  assert.match(js,/document\.querySelector\('\.pdf-download'\)/);
  assert.match(js,/Rules\.filterListings\(data\.items/);
});

test('accessible numeric navigation replaces tiny dot grid',()=>{
  for(const id of ['prevPage','nextPage','pageCounter','pageSelect','pageLabel','catalogStatus','verifiedOnly'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(html,/id="pageDots"/);
  assert.match(js,/Pagina '\+\(selected\+1\)\+' di '/);
  assert.match(js,/select\.addEventListener\('change'/);
  assert.match(js,/touchstart/);
  assert.match(js,/ArrowRight/);
  assert.match(css,/#pageSelect/);
  assert.match(css,/min-height:48px/);
});

test('content-first web cards keep links visible; A4 PDF 2x2 retains cover and finale',()=>{
  assert.match(css,/@media screen\{/);
  assert.match(css,/overflow:visible!important/);
  assert.match(css,/aspect-ratio:16\/10/);
  assert.match(css,/justify-content:space-between!important/);
  assert.match(css,/@media print/);
  assert.match(css,/break-inside:avoid!important/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(html,/class="page page-cover active"/);
  assert.match(html,/CATALOGO<br><em>IMMOBILIARE<\/em>/);
  assert.match(html,/class="page page-end catalog-end"/);
  assert.match(html,/RICHIEDI LA TUA/);
  assert.match(html,/VALUTAZIONE ORA/);
  const builder=read('scripts/build-la-sacra-catalogo-pdf.cjs');
  assert.match(builder,/Rules\.filterListings\(source\.items\)/);
  assert.match(builder,/expectedSheets=Math\.ceil\(expected\.length\/4\)/);
  assert.match(builder,/pageCount!==expectedPages/);
});

test('privacy and communication flow remains optional and unautomated',()=>{
  for(const id of ['requestMoreToggle','richiesta-materiale','materialRequest','reqName','reqEmail','reqPhone','reqPrivacySeen','reqMoreOffersConsent','requestByWhatsApp','requestByEmail'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/requestSection\.hidden=!requestToggle\.checked/);
  assert.match(js,/f\.offersConsent\.checked/);
  assert.match(js,/https:\/\/wa\.me\/\?text=/);
  assert.match(html,/privacy-richiesta\.html/);
  assert.match(html,/La_Sacra_Catalogo_Tutti_Immobili\.pdf/);
  assert.match(html,/346 256 8685/);
  assert.match(html,/immobiliarelasacra@gmail\.com/);
});
