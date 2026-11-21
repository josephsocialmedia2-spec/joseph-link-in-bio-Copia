'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mod=require('../gestione/acquisizione-farming/farming-results.js');
const page=fs.readFileSync(path.join(__dirname,'../gestione/acquisizione-farming/index.html'),'utf8');
const vba=fs.readFileSync(path.join(__dirname,'../gestione/acquisizione-farming/excel/CASE247_Acquisizione_Installer.bas'),'utf8');

test('solo risultati raggiunti: niente azioni pianificate, righe per immobile',()=>{
 const history=[
  {date:'2026-11-21',comune:'Avigliana',zone:'A',address:'Via Roma 11',immobile:'Trilocale',type:'Volantino consegnato',quantity:15,outcome:'Completato'},
  {date:'2026-11-21',comune:'Avigliana',zone:'A',address:'Via Roma 11',immobile:'Trilocale',type:'Lettera preparata',quantity:50,outcome:'Completato'},
  {date:'2026-11-21',comune:'Avigliana',zone:'A',address:'Via Roma 11',immobile:'Trilocale',type:'Lettera consegnata',quantity:4,outcome:'Da verificare'},
  {date:'2026-11-21',comune:'Avigliana',zone:'A',address:'Via Roma 11',immobile:'Trilocale',type:'Osservazione / notizia',outcome:'Completato'},
  {date:'2026-11-20',comune:'Avigliana',zone:'A',address:'Via Roma 11',immobile:'Trilocale',type:'Contatto spontaneo',outcome:'Interessato'},
  {date:'2026-11-21',comune:'Avigliana',address:'Via Roma 12',immobile:'Monolocale',type:'Volantino preparato',quantity:30,outcome:'Completato'},
 ];
 const rows=mod.consolidate(history,[]);
 assert.equal(rows.length,1);
 assert.deepEqual(rows[0].slice(0,10),['2026-11-21','Avigliana','A','Via Roma 11','Trilocale',15,0,1,1,0]);
 assert.equal(rows[0][11],'Diario farming');
});

test('azioni completate della scheda cliente, senza nomi telefonici nel CSV',()=>{
 const contacts=[
  {date:'2026-11-21',address:'Via Portici 4',name:'Cliente 371 370 8294',status:'Nuovo',action:'Incontro'},
  {date:'2026-11-21',address:'Via Portici 5',name:'X',status:'Nuovo',action:'Lettera informativa preparata'},
  {date:'2026-11-21',address:'Via Portici 6',name:'=HYPERLINK("X")',status:'Qualificato',action:'Nessuna'},
 ];
 const rows=mod.consolidate([],contacts);
 assert.equal(rows.length,2);
 const s=mod.csv(rows);
 assert.match(s,/Data risultato;?/);
 assert.doesNotMatch(s,/371 370 8294/);
 assert.doesNotMatch(s,/HYPERLINK/); // [should be escaped?]
});
test('HTML / VBA includono importazione locale e due soli fogli',()=>{
 assert.match(page,/exportCompletedFarming/);
 assert.match(page,/farming-results\.js/);
 assert.match(vba,/Public Sub InstallaAcquisizioneCASE247/);
 assert.match(vba,/Public Sub AggiornaRisultatiFarmingDaCSV/);
 assert.match(vba,/ThisWorkbook/);
 assert.match(vba,/PESA/);
 assert.doesNotMatch(vba,/telefono_fisso|cellulare|371 370 8294/);
});
