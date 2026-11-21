/* CASE247 Avigliana: regression tests for merged farming UI and single existing Agenda. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=get('gestione/acquisizione-farming/index.html');
const home=get('gestione/index.html');

test('Acquisizione dashboard mostra solo Notizie & Contatti senza pannelli duplicati',()=>{
 assert.match(home,/id="sv-acquisizione"/);
 assert.match(home,/id="sv-farming-frame"[^>]*src="\.\/acquisizione-farming\/\?rev=20261121-contacts-only&embed=contatti#contatti"/);
 assert.doesNotMatch(home,/Sistema di Acquisizione Immobiliare/);
 assert.doesNotMatch(home,/Farming Avigliana · Lettere · OMI · 90 giorni/);
 assert.doesNotMatch(home,/Standard Venditore &amp; Segreti|Networking &amp; WhatsApp|Strategia Video \(8 Titoli\)/);
 assert.doesNotMatch(home,/id="sv-tab-button-/);
 const saas=get('gestione/saas-shell.js');
 assert.doesNotMatch(saas,/Foglio di lavoro · CRM Excel|saas-workbook-bar|saas-workbook-action|saas-workbook-config/);
 assert.match(saas,/view==='acquisizione'\?acquisition/);
 assert.match(home,/sv-acquisizione\.js\?v=20261121-only-contatti/);
 assert.match(home,/sv-acquisizione\.css\?v=20261121-only-contatti/);
 assert.match(home,/control-center\.js\?v=20261120-farming1/);
 const js=get('gestione/sv-acquisizione.js');
 assert.match(js,/case247:farming-height/);
 assert.match(js,/event\.origin!==window\.location\.origin/);
 assert.match(js,/if\(tabs\.length\)activate\(tabs\[0\],false\)/);
 assert.match(page,/farming-contacts-embed/);
 assert.match(page,/get\('embed'\)==='contatti'/);
});
test('seven functional screens retained and embedded script parses',()=>{
 for(const id of ['oggi','contatti','richiami','lettere','omi','tracker','verifica'])assert.match(page,new RegExp('id="'+id+'"'));
 for(const text of ['Registro notizie','Follow-up pomeridiano','Lettera informativa','Dossier Valutazione Rapida','Tracker 90 giorni','Esporta CSV','Backup'])assert.ok(page.toLowerCase().includes(text.toLowerCase()),text);
 const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=2,'embedded loader and application scripts exist');
 for(const [i,script] of scripts.entries())new vm.Script(script[1],{filename:'farming-ui-'+i+'.js'});
});
test('OMI cannot be calculated without verified quotations',()=>{
 assert.match(page,/db\.omi/);
 assert.match(page,/Number\(x\.min\)/);
 assert.match(page,/Number\(x\.max\)/);
 assert.match(page,/mq\*x\.min/);
 assert.match(page,/mq\*x\.max/);
 assert.match(page,/Calcolo non disponibile/);
 assert.match(page,/Fonte \/ URL ufficiale/);
 assert.doesNotMatch(page,/Sig\.ra Bianchi|Fam\. Ferrero|Sig\. Carlo \(Portinaio\)/);
});
test('follow-ups write into the existing Agenda on this browser, without extra Agenda instance',()=>{
 assert.match(page,/const AGENDA_TASKS='case247-cc-tasks-v1'/);
 assert.match(page,/const FARMING_SOURCE='case247-farming-avigliana'/);
 assert.match(page,/source:FARMING_SOURCE/);
 assert.match(page,/function syncAgendaFollowups/);
 assert.match(page,/isWorkingDay\(x\.followDate\)/);
 assert.match(page,/duration:15/);
 assert.match(page,/14:30/);
 assert.match(page,/case247:farming-height/);
 const calendar=get('gestione/agenda-unificata.js');
 assert.match(calendar,/case247-cc-tasks-v1/);
 assert.match(calendar,/extraTasks\(day\)/);
 const cc=get('gestione/control-center.js');
 assert.match(cc,/event\.key!==TASKKEY/);
 assert.equal((home.match(/id="case247-control-center"/g)||[]).length,1);
});
test('letter print and daily tracker are locally auditable',()=>{
 assert.match(page,/function printLetter/);
 assert.match(page,/Stampa richiesta/);
 assert.match(page,/markLetterDelivered/);
 assert.match(page,/printHtml/);
 assert.match(page,/makeLetterQr/);
 assert.match(page,/src="\.\/qrcode\.js"/);
 assert.match(get('gestione/acquisizione-farming/qrcode.js'),/var qrcode = function/);
 assert.match(get('gestione/acquisizione-farming/QR-LICENSE.txt'),/MIT License/);

 assert.match(page,/Salva come PDF/);
 assert.match(page,/setUTCDate\(start\.getUTCDate\(\)-89\)/);
 assert.match(page,/function exportTracker/);
 assert.match(page,/function downloadBackup/);
 assert.match(page,/function parseCSV/);
});

test('OMI 2026/1 sources are linked in the integrated Farming tab',()=>{
 assert.match(page,/src="\.\/omi-avigliana\.js\?v=20261120-omi1"/);
 assert.match(home,/src="\.\/acquisizione-farming\/\?rev=20261121-contacts-only&embed=contatti#contatti"/);
 assert.match(get('gestione/acquisizione-farming/omi-avigliana.js'),/omi-avigliana-2026-1\.json/);
});


test('farming VBA installa due schede nello stesso workbook, senza contatti reali',()=>{
 const bas=get('gestione/acquisizione-farming/excel/CASE247_Acquisizione_Installer.bas');
 assert.match(page,/id="excelvba"/);
 assert.match(page,/2 sole schede: Acquisizione \+ PESA/);
 assert.match(page,/excel\/CASE247_Acquisizione_Installer\.bas/);
 assert.match(bas,/Public Sub InstallaAcquisizioneCASE247/);
 assert.match(bas,/Set wb = ThisWorkbook/);
 assert.match(bas,/If wb.Worksheets.Count > 2 Then/);
 assert.match(bas,/farming\.Name = "Acquisizione"/);
 assert.match(bas,/pesa\.Name = "PESA"/);
 for(const heading of ['Volantini consegnati','Lettere consegnate','Notizie verificate','Risposte ricevute','Incontri svolti'])
   assert.ok(bas.includes(heading),heading);
 assert.match(bas,/INDICE DI MASSA CORPOREA/);
 assert.match(bas,/LOOKUP\(2,1\//);
 assert.match(bas,/ChartObjects\.Add/);
 assert.match(bas,/GetOpenFilename/);
 assert.match(bas,/AggiornaRisultatiFarmingDaCSV/);
 assert.doesNotMatch(bas,/95[.,]70|Registro Peso|371 370 8294|telefono_fisso|cellulare/);
});

test('Farming risultati CSV esposto nella scheda Excel, senza importazioni automatiche',()=>{
 assert.match(page,/src="\.\/farming-results\.js"/);
 assert.match(page,/function exportCompletedFarming/);
 assert.match(page,/Esporta risultati raggiunti \(CSV\)/);
 const vba=get('gestione/acquisizione-farming/excel/CASE247_Acquisizione_Installer.bas');
 assert.match(vba,/Public Sub AggiornaRisultatiFarmingDaCSV/);
 assert.match(vba,/Set wb = ThisWorkbook/);
 assert.match(vba,/pesa\.Name = "PESA"/);
});
