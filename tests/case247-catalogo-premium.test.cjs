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
test('privacy-aware one-time request form without prechecked marketing optin',()=>{
 for(const id of ['materialRequest','reqName','reqEmail','reqPhone','reqMaterial','reqMessage','reqPrivacySeen','requestByWhatsApp','requestByEmail','requestFeedback'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/privacy-richiesta\.html/);
 assert.match(html,/Non è un’iscrizione automatica/);
 assert.match(js,/requestMessage\(channel\)/);
 assert.match(js,/window\.open\(url/);
 assert.match(js,/mailto:immobiliarelasacra@gmail\.com/);
 assert.doesNotMatch(html,/id="reqPrivacySeen"[^>]+checked/);
 const notice=read('catalogo-premium/privacy-richiesta.html');
 assert.match(notice,/Regolamento|GDPR/);
 assert.match(notice,/Garante/);
 assert.match(notice,/Nessuna casella di iscrizione al marketing/);
 assert.doesNotMatch(html,/<script[^>]+google-analytics/i);
});

test('commercial activity may voluntarily request promotional materials without newsletter subscription',()=>{
 assert.match(html,/Materiale pubblicitario per vendere un’attività commerciale/);
 assert.match(html,/id="reqBusiness"/);
 assert.match(html,/id="reqCity"/);
 assert.match(html,/non attiva invii pubblicitari periodici/);
 assert.match(js,/f\.business\.value\.trim\(\)/);
 assert.match(js,/f\.city\.value\.trim\(\)/);
 assert.match(js,/Questa è una richiesta puntuale e NON un consenso a marketing periodico/);
 const notice=read('catalogo-premium/privacy-richiesta.html');
 assert.match(notice,/attività\/ragione sociale, comune dell’attività/);
});
