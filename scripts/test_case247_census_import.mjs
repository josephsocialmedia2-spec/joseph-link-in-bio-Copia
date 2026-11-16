import test from "node:test";
import assert from "node:assert/strict";
import {parseSemicolonCSV,validateManifest,analyzeRecords,sha256Hex} from "../gestione/censimento-aziende/validator.mjs";
const headers="Ragione sociale / attività;Email pubblica;Stato campagna;Base giuridica marketing;Prova consenso;Stato revoca / opposizione;Partita IVA";
const row='Azienda Srl;info@example.test;NON_AUTORIZZATO;NON_DOCUMENTATA;MANCANTE;NON_VERIFICATO;12345678901';
const checksum="0".repeat(64);
test("CSV: gestisce BOM, separatori, righe e virgolette",()=>{
 const r=parseSemicolonCSV("\uFEFF"+headers+"\n"+row+'\n"Con; nome";info2@example.test;NON_AUTORIZZATO;NON_DOCUMENTATA;MANCANTE;NON_VERIFICATO;\n');
 assert.equal(r.rows.length,2);assert.equal(r.rows[1][0],"Con; nome");
 assert.throws(()=>parseSemicolonCSV('A;B\n"C;D'),/virgolette/);
 assert.throws(()=>parseSemicolonCSV("A;B\nx"),/colonne/);
});
test("Manifest: SHA e invio disabilitato obbligatori",()=>{
 const m={lotto:"TEST",daily_send_cap:280,sending_enabled:false,files:{
 "aziende_avigliana_20km.csv":{sha256:checksum},
 "IMMOBILIARE_LA_SACRA_CENSIMENTO_AZIENDE_AVIGLIANA_20KM.pdf":{sha256:checksum}}};
 const files={"aziende_avigliana_20km.csv":{},"IMMOBILIARE_LA_SACRA_CENSIMENTO_AZIENDE_AVIGLIANA_20KM.pdf":{}};
 assert.equal(validateManifest(m,files).ok,true);
 assert.throws(()=>validateManifest({...m,daily_send_cap:300},files),/280/);
});
test("Contatti senza consenso: nessun idoneo e campagna bloccata",()=>{
 const c=parseSemicolonCSV(headers+"\n"+row+"\n");
 const s=analyzeRecords(c,{records:1});
 assert.equal(s.rows,1);assert.equal(s.email,1);assert.equal(s.eligibleCandidates,0);assert.equal(s.sendingEnabled,false);assert.equal(s.dailyCap,280);
});
test("Manifest: numero record diverso blocca import",()=>{
 const c=parseSemicolonCSV(headers+"\n"+row+"\n");
 assert.throws(()=>analyzeRecords(c,{records:2}),/diverso/);
});
test("SHA-256 browser-compatible",async()=>{
 const digest=await sha256Hex(new TextEncoder().encode("abc").buffer);
 assert.equal(digest,"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
