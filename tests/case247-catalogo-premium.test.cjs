'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('catalogo-premium/index.html'),js=read('catalogo-premium/catalogo.js'),css=read('catalogo-premium/style.css');
const catalog=JSON.parse(read('immobili/catalogo.json'));
test('real-estate flipbook Javascript parses and catalog has source listings',()=>{
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.ok(catalog.items.length>=50);
 assert.equal(catalog.items.length,58);
});
test('flipbook dynamically spreads all inventory records into six-card sheets',()=>{
 assert.match(js,/fetch\('\.\.\/immobili\/catalogo\.json'/);
 assert.match(js,/const pageSize=6/);
 assert.match(js,/addSheets\(listings\)/);
 assert.match(js,/frame\.insertBefore\(sheet,before\)/);
 assert.match(js,/listings\.length\+' ANNUNCI IN ARCHIVIO'/);
 assert.match(js,/resetDots\(\)/);
 assert.match(js,/renderListings\(\)/);
 assert.match(css,/\.sheet-grid/);
});
test('mobile responsive navigation, PDF print and sharing',()=>{
 for(const id of ['prevPage','nextPage','pageCounter','pageDots','propertyResults','cityFilter','queryFilter'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/touchstart/);assert.match(js,/touchend/);assert.match(js,/ArrowRight/);
 for(const item of ['whatsapp','email','sms','copy','print'])assert.match(html,new RegExp('data-share="'+item+'"'));
 assert.match(js,/https:\/\/wa\.me\/\?text=/);assert.match(js,/mailto:\?subject=/);
 assert.match(js,/sms:\?body=/);assert.match(css,/@media print/);
});
test('only direct official urls; do not fabricate energy class',()=>{
 assert.match(js,/hostOK\(p\.url\)/);
 assert.match(js,/p\.availability_status==='AVAILABLE'/);
 assert.match(js,/Prestazione energetica: dato non riportato nella fonte catalogo/);
 assert.match(html,/informazioni energetiche mancanti/i);
});
test('official agency contact and property links exist',()=>{
 assert.match(html,/IMMOBILIARE LA SACRA/);assert.match(html,/346 256 8685/);
 assert.match(html,/immobiliarelasacra@gmail\.com/);assert.match(js,/Apri scheda ufficiale/);
});

test('official logo, Joseph as referente e funzionario, direct telephone WhatsApp and PDF',()=>{
 assert.match(html,/Logo ufficiale Immobiliare La Sacra/);
 assert.match(html,/Malafronte Joseph/);
 assert.match(html,/371 370 8294/);
 assert.match(html,/tel:\+393713708294/);
 assert.match(html,/https:\/\/wa\.me\/393713708294/);
 assert.match(html,/La_Sacra_Catalogo_Tutti_Immobili\.pdf/);
});
test('page 03 shows actual estate proposals instead of generic territory marketing',()=>{
 assert.match(html,/03 \/ ALTRE PROPOSTE IMMOBILIARI/);
 assert.match(html,/id="morePropertyResults"/);
 assert.match(html,/page-more-properties/);
 assert.doesNotMatch(html,/03 \/ IL TERRITORIO|La Valle di Susa<br><em>è casa nostra|UN TERRITORIO, TANTE STORIE/);
 assert.match(js,/function renderMoreProperties\(\)/);
 assert.match(js,/renderMoreProperties\(\)/);
 assert.match(js,/for\(const property of more\)container\.append\(card\(property\)\)/);
 assert.match(js,/frame\.querySelector\('\.page-more-properties'\)/);
 assert.match(css,/\.more-property-grid/);
});

test('checkbox reveals further-property-request form without enrolling automatically',()=>{
 for(const id of ['requestMoreToggle','richiesta-materiale','materialRequest','reqName','reqEmail','reqPhone','reqMaterial','reqType','reqBudget','reqCity','reqMessage','reqPrivacySeen','reqMoreOffersConsent','requestByWhatsApp','requestByEmail','requestFeedback']){
   assert.ok(html.includes('id="'+id+'"'),'Missing checkbox or form control: '+id);
 }
 assert.match(html,/id="richiesta-materiale"[^>]+hidden/);
 assert.match(html,/id="requestMoreToggle" type="checkbox"/);
 assert.match(js,/requestSection\.hidden=!requestToggle\.checked/);
 assert.match(js,/requestToggle\.addEventListener\('change'/);
 assert.match(js,/window\.open\(url/);
 assert.match(js,/mailto:immobiliarelasacra@gmail\.com/);
 assert.match(html,/privacy-richiesta\.html/);
 assert.match(html,/Non iscrive automaticamente|non attiva da sola alcun invio automatico/i);
 assert.match(css,/#richiesta-materiale\[hidden\]/);
});

test('future property offers consent is optional, initially unchecked and kept separate from privacy reading',()=>{
 assert.ok(html.includes('id="reqMoreOffersConsent" type="checkbox"'));
 assert.ok(html.includes('id="reqPrivacySeen" type="checkbox" required'));
 assert.doesNotMatch(html,/id="reqMoreOffersConsent"[^>]+checked/);
 assert.doesNotMatch(html,/id="reqPrivacySeen"[^>]+checked/);
 assert.match(js,/f\.offersConsent\.checked/);
 assert.match(js,/Consenso per comunicazioni future/);
 assert.match(js,/Questa è una richiesta puntuale|non costituisce registrazione automatica/);
 assert.doesNotMatch(html,/Hai un’attività da vendere\?|Materiale pubblicitario per vendere un’attività commerciale/);
 const notice=read('catalogo-premium/privacy-richiesta.html');
 assert.match(notice,/GDPR/);
 assert.match(notice,/Garante/);
 assert.match(notice,/facoltativa, non preselezionata/);
 assert.match(notice,/registrazione automatica/);
 assert.doesNotMatch(html,/<script[^>]+google-analytics/i);
});
