/* CASE247 Agenda 50 — behavioral tests without DOM dependencies */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  GROUPS, ITEMS, MAX_TOTAL, romeDay, normalizeCounts, total, groupTotal,
  nextCounts, fresh, normalizeState, report
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
  assert.match(output, /08:30 – 10:00 — 30\/30/);
  assert.match(output, /10:30 – 11:30 — 10\/10/);
  assert.match(output, /14:30 – 15:15 — 10\/10/);
  assert.match(output, /TOTALE CONFERMATE: 50\/50/);
  for (const item of ITEMS) assert.ok(output.includes(item.label));
});

test('isolation regression: existing calendar code unchanged in this feature', () => {
  const html = fs.readFileSync(path.join(__dirname,'../gestione/index.html'),'utf8');
  const script = fs.readFileSync(path.join(__dirname,'../gestione/agenda50.js'),'utf8');
  assert.match(html, /saas-shell\.js\?v=20261118-reorder1/);
  assert.match(html, /agenda50\.js\?v=20261118-isolated1/);
  assert.match(html, /agenda50\.css\?v=20261118-isolated1/);
  assert.ok(html.indexOf('saas-shell.js?v=20261118-reorder1') < html.indexOf('agenda50.js?v=20261118-isolated1'));
  assert.match(script, /main\.insertBefore\(section, crm\)/);
  assert.doesNotMatch(script, /cc-week['"]?\)\.innerHTML|cc-week['"]?\)\.replaceChildren/);
  assert.match(script, /window\.confirm\(/);
  assert.match(script, /localStorage\.setItem/);
  assert.match(script, /case247_agenda_/);
});
