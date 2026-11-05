import test from "node:test";
import assert from "node:assert/strict";
import {PHASES,RECURRING,addDays,plan,summarize,validProperty,dayBetween,escapeHtml,csv} from "./core.js";
const base="2026-10-25",list=plan(base,"demo");
test("creates full 90-day schedule without a gap in phase coverage",()=>{
  assert.equal(PHASES[0].start,1);assert.equal(PHASES.at(-1).end,90);
  for(let i=1;i<PHASES.length;i++)assert.equal(PHASES[i].start,PHASES[i-1].end+1);
  assert.equal(list.length,37);
  assert.equal(new Set(list.map(x=>x.id)).size,list.length);
  assert.ok(list.every(t=>t.day_number>=1&&t.day_number<=90));
  assert.equal(list[0].due_on,base);
  assert.equal(list.at(-1).due_on,addDays(base,89));
});
test("offsets in UTC are DST-independent calendar days",()=>{
  assert.equal(addDays("2026-10-25",1),"2026-10-26");
  assert.equal(addDays("2026-03-29",1),"2026-03-30");
  assert.equal(dayBetween("2026-03-28","2026-03-31"),3);
});
test("summaries do not count completed tasks as overdue",()=>{
  const s=summarize([{due_on:"2026-01-01",status:"DONE"},{due_on:"2026-01-01",status:"TODO"},{due_on:"2026-12-01",status:"TODO"}],"2026-02-01");
  assert.deepEqual(s,{all:3,done:1,overdue:1,due:1});
});
test("input checks reject invalid properties",()=>{
  assert.throws(()=>validProperty({title:"A",commune:"TO",asking_price:20,start_date:base}));
  assert.throws(()=>validProperty({title:"Appartamento demo",commune:"TO",asking_price:-9,start_date:base}));
  assert.deepEqual(validProperty({title:"Appartamento demo",commune:"Avigliana",asking_price:"150000",start_date:base}),
  {title:"Appartamento demo",commune:"Avigliana",asking_price:150000,start_date:base});
});
test("output encoding prevents HTML injection and protects CSV delimiters",()=>{
  assert.equal(escapeHtml('<img src="x">'),'&lt;img src=&quot;x&quot;&gt;');
  assert.ok(csv([{phase:"T",title:'Test "quote"; safe',assigned_role:"Joseph",due_on:base,status:"TODO"}]).includes('""quote""'));
});
test("all scheduled reminder hours are valid, unique and have destinations",()=>{
  const codes=RECURRING.map(r=>r.code);
  assert.equal(new Set(codes).size,codes.length);
  assert.ok(RECURRING.every(r=>/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) && r.days.every(d=>d>=1&&d<=7)));
});
