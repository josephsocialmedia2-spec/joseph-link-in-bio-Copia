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
test('one catalogue spreads all real inventory records into four-card spreads with cover + finale',()=>{
 assert.match(js,/fetch\('\.\.\/immobili\/catalogo\.json'/);
 assert.match(js,/const pageSize=4/);
 assert.match(js,/addSheets\(listings\)/);
 assert.match(js,/frame\.insertBefore\(sheet,before\)/);
 assert.match(js,/pageNames=\['Copertina',\.\.\.Array\.from/);
 assert.match(js,/resetDots\(\)/);
 assert.match(js,/frame\.querySelector\('\.page-end'\)/);
 assert.match(css,/\.sheet-grid/);
});
test('mobile responsive navigation, PDF print and sharing',()=>{
 for(const id of ['prevPage','nextPage','pageCounter','pageDots','requestMoreToggle'])assert.match(html,new RegExp('id="'+id+'"'));
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
test('premium blue cover, four large photo properties per spread, seller valuation finale',()=>{
 assert.match(html,/class="page page-cover active"/);
 assert.match(html,/CATALOGO<br><em>IMMOBILIARE<\/em>/);
 assert.match(html,/class="catalog-cover-logo"/);
 assert.match(html,/class="page page-end catalog-end"/);
 assert.match(html,/RICHIEDI LA TUA/);
 assert.match(html,/VALUTAZIONE ORA/);
 assert.match(html,/https:\/\/wa\.me\/393462568685/);
 assert.doesNotMatch(html,/page page-intro|page page-properties|page page-more-properties|03 \/ IL TERRITORIO/);
 assert.match(js,/const pageSize=4/);
 assert.match(js,/grid\.append\(card\(p,true\)\)/);
 assert.match(css,/\.sheet-grid\{display:grid;grid-template-columns:repeat\(2/);
 assert.match(css,/@media print/);
 assert.match(css,/\.catalog-cover-photo/);
 const pdf=read('scripts/build-la-sacra-catalogo-pdf.cjs');
 assert.match(pdf,/inventory\.sheets!==15\|\|inventory\.pages!==17/);
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
