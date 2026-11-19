/* CASE247 Agenda 50 — behavioral tests without DOM dependencies */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  GROUPS, ITEMS, MAX_TOTAL, romeDay, normalizeCounts, total, groupTotal,
  nextCounts, fresh, normalizeState, report, WINDOWS, romeMinutes, activeWindow, sleepReminderActive
} = require('../gestione/agenda50.js');

test('exactly 6 independent counters and group maxima 30/10/10 = 50', () => {
  assert.equal(ITEMS.length, 6);
  assert.deepEqual(ITEMS.map(item => item.limit), [10, 10, 10, 10, 5, 5]);
  assert.deepEqual(GROUPS.map(group => group.limit), [30, 10, 10]);
  assert.equal(MAX_TOTAL, 50);
  assert.deepEqual(Object.keys(normalizeCounts({})), ['email', 'linkedin', 'dm', 'calls', 'comments', 'followups']);
});

test('counters start at zero and increase only through an explicit command', () => {
  const original = normalizeCounts({});
  assert.equal(total(original), 0);
  assert.equal(total(nextCounts(original, 'email', 1)), 1);
  assert.equal(total(original), 0, 'original object must not be mutated');
  assert.equal(total(nextCounts(original, 'unknown', 1)), 0);
  assert.equal(total(nextCounts(original, 'email', 0)), 0);
  assert.equal(total(nextCounts(original, 'email', 2)), 0);
});

test('each count is strictly capped and cannot go below zero', () => {
  let counts = normalizeCounts({});
  for (const [id, max] of [['email',10],['linkedin',10],['dm',10],['calls',10],['comments',5],['followups',5]]) {
    for (let n = 0; n < max + 5; n++) counts = nextCounts(counts, id, 1);
    assert.equal(counts[id], max);
  }
  assert.equal(total(counts), 50);
  assert.deepEqual(GROUPS.map(group => groupTotal(counts, group)), [30,10,10]);
  counts = nextCounts(counts, 'comments', -1);
  assert.equal(counts.comments, 4);
  assert.equal(total(counts), 49);
  counts = normalizeCounts({ email:999, comments:-500, linkedin:'NaN' });
  assert.equal(counts.email, 10);
  assert.equal(counts.comments, 0);
  assert.equal(counts.linkedin, 0);
  counts = nextCounts(counts, 'comments', -1);
  assert.equal(counts.comments, 0);
});

test('state is date-scoped and defensively sanitized for future CRM syncing', () => {
  const date = '2026-11-18';
  const s = fresh(date);
  assert.equal(s.schema, 'case247.agenda.v1');
  assert.equal(s.time_zone, 'Europe/Rome');
  assert.equal(s.date, date);
  assert.equal(s.revision, 0);
  assert.equal(total(s.counters), 0);
  const old = { ...s, counters: { email: 9, comments: 3 },
    journal:[{item:'email',direction:1,at:'2026-11-18T09:00:00Z'}, {item:'untrusted',direction:1}] };
  const loaded = normalizeState(old,date);
  assert.equal(total(loaded.counters), 12);
  assert.equal(loaded.journal.length, 1);
  assert.equal(total(normalizeState(old,'2026-11-19').counters), 0);
  assert.equal(total(normalizeState({ ...old,time_zone:'UTC' },date).counters), 0);
});

test('Rome date follows actual time zone including midnight', () => {
  assert.equal(romeDay(new Date('2026-11-18T22:30:00Z')), '2026-11-18');
  assert.equal(romeDay(new Date('2026-11-18T23:30:00Z')), '2026-11-19');
  assert.equal(romeDay(new Date('2026-07-01T22:30:00Z')), '2026-07-02');
});

test('report contains 3 group totals, all 6 counters and final 50', () => {
  const counts = normalizeCounts({email:10,linkedin:10,dm:10,calls:10,comments:5,followups:5});
  const output = report('2026-11-18', counts);
  assert.match(output, /2026-11-18/);
  assert.match(output, /Mattina · 09:30 – 11:30 · Acquisizione — 30\/30/);
  assert.match(output, /Tarda mattina · 11:30 – 12:30 · Acquisizione diretta — 10\/10/);
  assert.match(output, /Pomeriggio · 14:00 – 15:30 \/ 15:30 – 16:30 · Sviluppo e Follow-up — 10\/10/);
  assert.match(output, /TOTALE CONFERMATE: 50\/50/);
  for (const item of ITEMS) assert.ok(output.includes(item.label));
});

test('isolation regression: existing calendar code unchanged in this feature', () => {
  const html = fs.readFileSync(path.join(__dirname,'../gestione/index.html'),'utf8');
  const script = fs.readFileSync(path.join(__dirname,'../gestione/agenda50.js'),'utf8');
  assert.match(html, /saas-shell\.js\?v=20261119-piva-google/);
  assert.match(html, /agenda50\.js\?v=20261119-piva-google/);
  assert.match(html, /agenda50\.css\?v=20261118-unified1/);
  assert.ok(html.indexOf('saas-shell.js?v=20261119-piva-google') < html.indexOf('agenda50.js?v=20261119-piva-google'));
  assert.match(script, /calendar\.insertBefore\(section, filters\)/);
  assert.doesNotMatch(script, /cc-week['"]?\)\.innerHTML|cc-week['"]?\)\.replaceChildren/);
  assert.match(script, /window\.confirm\(/);
  assert.match(script, /localStorage\.setItem/);
  assert.match(script, /case247_agenda_/);
});


test('placement is after weekly grid, before export/import, preserving original calendar controls',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../gestione/index.html'),'utf8');
 const agenda=fs.readFileSync(path.join(__dirname,'../gestione/agenda50.js'),'utf8');
 assert.match(agenda,/calendar\.insertBefore\(section, filters\)/);
 assert.match(html,/studio-compact\.css\?v=20261118-compact1/);
 assert.match(agenda,/#cc-week/);
 assert.match(agenda,/Copia resoconto/);
 assert.match(agenda,/Azzera giornata/);
 const core=fs.readFileSync(path.join(__dirname,'../gestione/control-center.js'),'utf8');
 for(const label of ['Esporta attività JSON','Esporta calendario ICS','Importa JSON']){
  assert.ok(core.includes(label),'original action missing: '+label);
 }
});

test('time windows use Europe/Rome minutes with exclusive end boundaries, including DST',()=>{
 assert.equal(WINDOWS.length,4);
 const atRome=(day,time)=>new Date(day+'T'+time+':00Z');
 // Winter UTC+1
 assert.equal(romeMinutes(atRome('2026-11-18','08:29')),9*60+29);
 assert.equal(activeWindow(atRome('2026-11-18','08:29')),null);
 assert.equal(activeWindow(atRome('2026-11-18','08:30')).group,'morning');
 assert.equal(activeWindow(atRome('2026-11-18','10:29')).group,'morning');
 assert.equal(activeWindow(atRome('2026-11-18','10:30')).group,'calls');
 assert.equal(activeWindow(atRome('2026-11-18','11:30')),null);
 assert.equal(activeWindow(atRome('2026-11-18','13:00')).group,'afternoon');
 assert.equal(activeWindow(atRome('2026-11-18','14:30')).item,'followups');
 assert.equal(activeWindow(atRome('2026-11-18','15:30')),null);
 assert.equal(activeWindow(atRome('2026-11-18','17:00')),null);
 // Summer UTC+2
 assert.equal(activeWindow(atRome('2026-07-01','07:30')).group,'morning');
 assert.equal(activeWindow(atRome('2026-07-01','12:00')).item,'comments');
});
test('time-driven banner and pulse preserve confirmation workflow and motion preferences',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../gestione/agenda50.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../gestione/agenda50.css'),'utf8');
 assert.match(js,/window\.setInterval\(\(\) => \{ rollover\(\); updateTiming\(\); \}, 20000\)/);
 assert.match(js,/const done = !!group && achieved >= target/);
 assert.match(js,/classList\.toggle\('fascia-attiva-lampeggiante'/);
 assert.match(js,/badge\.hidden = !shouldPulse/);
 assert.match(js,/render\(\)/);
 assert.match(js,/a50-live-banner/);
 assert.match(js,/ORA IN CORSO/);
 assert.match(css,/@keyframes a50-active-glow/);
 assert.match(css,/1\.5s ease-in-out infinite/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const label of ['−1','+1 Confermata','Copia resoconto','Azzera giornata'])assert.ok(js.includes(label));
});

test('sleep reminder switches on at 22:30 Rome time and resets after midnight',()=>{
 const winter = value => new Date('2026-11-18T'+value+':00Z');
 assert.equal(sleepReminderActive(winter('21:29')), false);
 assert.equal(sleepReminderActive(winter('21:30')), true);
 assert.equal(sleepReminderActive(winter('22:59')), true);
 assert.equal(sleepReminderActive(new Date('2026-11-18T23:00:00Z')),false);
 // Summer time UTC+2
 assert.equal(sleepReminderActive(new Date('2026-07-01T20:29:00Z')),false);
 assert.equal(sleepReminderActive(new Date('2026-07-01T20:30:00Z')),true);
 const js=fs.readFileSync(path.join(__dirname,'../gestione/agenda50.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../gestione/agenda50.css'),'utf8');
 assert.match(js,/22:30 · DORMIRE/);
 assert.match(js,/isToday && !sleep \? activeWindow\(now\) : null/);
 assert.match(css,/a50-sleep-red-pulse/);
 assert.match(css,/1\.5s ease-in-out infinite/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('one integrated chronological day contains all operational blocks and preserves core actions',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../gestione/index.html'),'utf8');
 const script=fs.readFileSync(path.join(__dirname,'../gestione/agenda-unificata.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../gestione/agenda-unificata.css'),'utf8');
 assert.match(html,/agenda-unificata\.js\?v=20261119-inline3/);
 assert.match(html,/agenda-unificata\.css\?v=20261119-inline3/);
 assert.match(script,/Agenda integrata/);
 for(const label of ['Acquisizione Digitale','Acquisizione Diretta','Sviluppo Prioritario & Commenti Social','Contenuti, Materiali & Follow-up','Test, Verifiche & Chiusura Operativa','STUDIO · 2S CAT','Revisione lavori aperti','KPI e scadenze','Pianificazione settimana','CRM Excel','Seller Radar','WhatsApp'])assert.ok(script.includes(label),label);
 assert.match(script,/A\.selectDay\(day\)/);
 assert.match(script,/case247-cc-school-2scat-v1/);
 assert.match(script,/case247-cc-tasks-v1/);
 assert.match(css,/#cc-calendar>#cc-week/);
 assert.match(css,/\.a50-day-saturday/);
});

test('company census shortcut opens manual Google P.IVA Avigliana search', () => {
 const html=fs.readFileSync(path.join(__dirname,'../gestione/index.html'),'utf8');
 const integrated=fs.readFileSync(path.join(__dirname,'../gestione/agenda-unificata.js'),'utf8');
 const agenda=fs.readFileSync(path.join(__dirname,'../gestione/agenda50.js'),'utf8');
 const query='https://www.google.com/search?q=partita+iva+avigliana';
 assert.ok(html.includes(query));
 assert.ok(integrated.includes(query));
 assert.ok(agenda.includes(query));
 assert.doesNotMatch(integrated,/quick\('Censimento',/);
 assert.doesNotMatch(agenda,/\['Censimento aziende',/);
});

test('manual Google B2C Avigliana search uses the full supplied 20 km research prompt',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../gestione/ricerca-piva-avigliana.js'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'../gestione/index.html'),'utf8');
 const census=fs.readFileSync(path.join(__dirname,'../gestione/censimento-aziende/index.html'),'utf8');
 assert.match(script,/Piazza Conte Rosso/);
 assert.match(script,/Chiusa di San Michele/);
 assert.match(script,/Piossasco/);
 assert.match(script,/Non trovata/);
 assert.match(script,/esattamente queste 7 colonne/);
 assert.match(script,/Registro Imprese/);
 assert.match(script,/Google\.com\/search\?q=/i);
 assert.match(page,/ricerca-piva-avigliana\.js\?v=20261119-fullprompt1/);
 assert.match(census,/ricerca-piva-avigliana\.js\?v=20261119-fullprompt1/);
 assert.match(census,/Copia prompt completo/);
});

test('new acquisition tools are mounted directly in existing day blocks',()=>{
 const base=fs.readFileSync(path.join(__dirname,'../gestione/index.html'),'utf8');
 const timeline=fs.readFileSync(path.join(__dirname,'../gestione/agenda-unificata.js'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../gestione/agenda-strumenti-acquisizione.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../gestione/agenda-strumenti-acquisizione.css'),'utf8');
 assert.match(base,/agenda-strumenti-acquisizione\.js\?v=20261119-inline3/);
 assert.match(base,/agenda-strumenti-acquisizione\.css\?v=20261119-inline3/);
 assert.match(base,/agenda-unificata\.js\?v=20261119-inline3/);
 assert.match(base,/agenda-unificata\.css\?v=20261119-inline3/);
 assert.match(timeline,/AGGIORNATA · 19\.11\.3/);
 assert.match(timeline,/Mappatura annunci privati/);
 assert.match(timeline,/Colazione strategica/);
 assert.match(timeline,/case247:timeline-rendered/);
 assert.match(js,/document\.getElementById\('a50-unified-view'\)/);
 assert.match(js,/case247-acquisizione-kpi-v1/);
 assert.match(js,/Europe\/Rome/);
 assert.match(js,/data-pomo="50"/);
 assert.match(js,/data-pomo="10"/);
 assert.match(js,/Privati incontrati/);
 assert.match(js,/Consensi documentati/);
 assert.match(js,/Prequalifiche/);
 assert.match(js,/data-kpi="privati"/);
 assert.match(js,/qrcode-generator@1\.4\.4/);
 assert.match(js,/\.isDark\(y,x\)/);
 assert.match(js,/srcdoc=page/);
 assert.match(js,/htmlEscape/);
 assert.match(js,/393713708294/);
 assert.match(js,/case247:timeline-rendered/);
 for(const [name,time] of [['portals','09:00'],['timer','09:30'],['scripts','11:30'],['qr','15:30'],['kpi','16:30']]){
   assert.ok(js.includes(name+":'"+time+"'"),name+' must be mounted at '+time);
 }
 assert.doesNotMatch(js,/due famiglie|QR senza URL|qrserver\.com|window\.open\('/i);
 assert.doesNotMatch(js,/agenda-integrata-50|a50-grand-total/);
 assert.doesNotMatch(js,/<summary>Strumenti acquisizione/);
 assert.match(css,/\.a50-inline-tool/);
});
