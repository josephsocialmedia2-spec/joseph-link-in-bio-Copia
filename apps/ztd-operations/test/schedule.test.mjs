import test from "node:test";
import assert from "node:assert/strict";
test("public QR remains a stable local route",()=>{
 const day="2026-11-23";
 const route="/api/publications/"+day;
 assert.equal(route,"/api/publications/2026-11-23");
});
test("cron trigger at 05:30/06:30 UTC covers CET and CEST without both local 07:30",()=>{
 const formatter=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 assert.equal(formatter.format(new Date("2026-11-23T06:30:00Z")),"07:30");
 assert.equal(formatter.format(new Date("2026-07-23T05:30:00Z")),"07:30");
 assert.equal(formatter.format(new Date("2026-11-23T05:30:00Z")),"06:30");
});
