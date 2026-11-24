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

test('Acquisizione senza titolo e quattro sottoschede, ma Farming sempre visibile e CRM intatto',()=>{
 assert.match(home,/id="sv-acquisizione" aria-label="Acquisizione · Farming Avigliana"/);
 assert.doesNotMatch(home,/Sistema di Acquisizione Immobiliare|sv-tab-button-|sv-nav-buttons/);
 assert.doesNotMatch(home,/Standard Venditore &amp; Segreti|Networking &amp; WhatsApp|Strategia Video \(8 Titoli\)/);
 assert.match(home,/id="sv-tab-4" class="sv-panel sv-farming-panel"/);
 assert.doesNotMatch(home,/id="sv-tab-4"[^>]+hidden/);
 assert.match(home,/id="sv-farming-frame"[^>]*src="\.\/acquisizione-farming\/\?omi=20261120-1&rev=20261124-strade-omi-c1-c2-d1&embed=hide-header"/);
 assert.match(home,/sv-acquisizione\.js\?v=20261121-no-quattro-tab1/);
 assert.match(home,/control-center\.js\?v=20261120-farming1/);
 const js=get('gestione/sv-acquisizione.js');
 assert.match(js,/case247:farming-height/);
 assert.match(js,/event\.origin!==window\.location\.origin/);
 assert.match(js,/if\(tabs\.length\)activate\(tabs\[0\],false\)/);
 const shell=get('gestione/saas-shell.js');
 assert.match(shell,/Foglio di lavoro · CRM Excel/);
 assert.match(shell,/acquisitionPane\.prepend\(workbookBar\)/);
});
test('solo dentro la dashboard l’intestazione richiesta non viene mostrata',()=>{
 assert.match(page,/html\.farming-header-hidden header\.top\{display:none!important\}/);
 assert.match(page,/get\('embed'\)==='hide-header'/);
 assert.match(page,/CASE247 \/ IMMOBILIARE LA SACRA/);
 assert.match(page,/id="nav"/);
 assert.match(home,/&embed=hide-header"/);
});
test('Oggi mostra il solo accesso Excel richiesto, senza storico fittizio e contatori',()=>{
 const oggi=page.split('<section class="panel" id="oggi">')[1].split('<section class="panel" id="contatti">')[0];
 assert.match(oggi,/id="farming-onedrive-excel"/);
 assert.match(oggi,/href="https:\/\/1drv\.ms\/x\/c\/56a10d0f448c4577\/IQCnZeONwGa_R4Y5xRmvpKN3Adv1lgRiNlJgoPyFFaMtmRk\?e=f3xHwd&amp;nav=MTVfe0M0RjM2MjY5LTJGNkEtNDU1Ny1CQjdFLUI2RkMzQzE1QUM3RH0"/);
 assert.match(oggi,/target="_blank" rel="noopener noreferrer"/);
 assert.doesNotMatch(oggi,/Storico giornaliero Farming|Apri lo storico giornaliero|Agenda operativa unica · simulazione/);
 assert.doesNotMatch(oggi,/Contatti registrati|Follow-up da gestire|Lettere consegnate/);
 assert.doesNotMatch(page,/getElementById\('statContacts'\)|getElementById\('statFollow'\)|getElementById\('statLetters'\)/);
 assert.match(oggi,/id="checklist"/);
 assert.match(oggi,/id="zones"/);
});
test('scheda Notizie & Contatti senza inserimento manuale e vecchio CSV',()=>{
 const section=page.split('<section class="panel" id="contatti">')[1].split('<section class="panel" id="richiami">')[0];
 assert.doesNotMatch(section,/Registro notizie e proprietari · inserimento manuale|Salva nel registro|id="contactForm"|id="importCsv"/);
 assert.doesNotMatch(section,/>Importa CSV<|>Esporta CSV</);
 for(const id of ['contactsWorkbook','contactsRows','clientDetailForm','photoImportCard','photoRead','photoSave'])assert.match(section,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(page,/getElementById\('contactForm'\)|getElementById\('importCsv'\)/);
});
test('seven functional screens retained and embedded script parses',()=>{
 for(const id of ['oggi','contatti','richiami','lettere','omi','tracker','verifica'])assert.match(page,new RegExp('id="'+id+'"'));
 for(const text of ['Foglio Excel · Notizie e Contatti','Follow-up pomeridiano','Lettera informativa','Dossier Valutazione Rapida','Tracker 90 giorni','Scarica foglio per Excel (CSV)','Backup'])assert.ok(page.toLowerCase().includes(text.toLowerCase()),text);
 const script=page.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script,'inline app script exists');
 new vm.Script(script[1],{filename:'farming-ui.js'});
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
test('Lettere & Stampa mostra il magazine sfogliabile e la lettera PDF aggiornata',()=>{
 const section=page.split('<section class="panel" id="lettere">')[1].split('<section class="panel" id="omi">')[0];
 for(const id of ['rew-flipbook','rew-letter-preview','rew-open-flipbook','rew-download-magazine','rew-download-spreads','rew-download-letter'])assert.match(section,new RegExp('id="'+id+'"'));
 assert.match(section,/src="\.\.\/lettere-stampa\/"/);
 assert.match(section,/lettera-c-23-11-aggiornata\.html/);
 assert.doesNotMatch(section,/Immobiliare La Sacra|letterType|letterZone|letterPreview|Centro stampa · lettere A4\/A5/);
 assert.doesNotMatch(page,/function previewLetter\(|function printLetter\(|function makeLetterQr\(/);
 const viewer=get('gestione/lettere-stampa/index.html');
 assert.match(viewer,/const PAGES=\[/);
 assert.match(viewer,/id="next"/);
 assert.match(viewer,/showFallback/);
 for(const name of ['Real_Estate_Weekly_Joseph_Malafronte_EDITORIALE_A4.pdf','Real_Estate_Weekly_DOPPIE_PAGINE.pdf','Lettera_Joseph_Malafronte_AGGIORNATA_A4.pdf']){
  const pdf=fs.readFileSync(path.join(root,'gestione/lettere-stampa',name));
  assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  assert.ok(pdf.length>1000000,'PDF originale deve essere completo: '+name);
 }
 assert.match(page,/function printHtml/);
 assert.match(page,/setUTCDate\(start\.getUTCDate\(\)-89\)/);
 assert.match(page,/function exportTracker/);
 assert.match(page,/function downloadBackup/);
});

test('OMI 2026/1 sources are linked in the integrated Farming tab',()=>{
 assert.match(page,/src="\.\/omi-avigliana\.js\?v=20261120-omi1"/);
 assert.match(home,/src="\.\/acquisizione-farming\/\?omi=20261120-1&rev=20261124-strade-omi-c1-c2-d1&embed=hide-header"/);
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
