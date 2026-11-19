/* CASE247 Agenda 50 — end-to-end smoke against the full, unmodified /gestione/ SPA. */
'use strict';
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = 18935;
const cdpPort = 19235;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd:process.cwd(), stdio:'ignore'});
const browser = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  '--remote-allow-origins=*', '--remote-debugging-port=' + cdpPort,
  '--user-data-dir=/tmp/case247-agenda50-chrome-' + process.pid,
  '--window-size=1440,900', 'about:blank'
], {stdio:'ignore'});
let socket, sequence=0;
const pending=new Map();
async function discover(){
  for(let n=0;n<90;n++){
    try{
      const response=await fetch('http://127.0.0.1:'+cdpPort+'/json/list');
      if(response.ok){
        const target=(await response.json()).find(v=>v.type==='page'&&v.webSocketDebuggerUrl);
        if(target)return target.webSocketDebuggerUrl;
      }
    }catch(_){}
    await wait(250);
  }
  throw Error('Chrome DevTools non raggiungibile');
}
async function connect(url){
  socket=new WebSocket(url);
  await new Promise((resolve,reject)=>{
    socket.addEventListener('open',resolve,{once:true});
    socket.addEventListener('error',reject,{once:true});
  });
  socket.addEventListener('message',event=>{
    const msg=JSON.parse(event.data);
    const p=pending.get(msg.id);
    if(!p)return;
    pending.delete(msg.id);
    msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);
  });
}
function command(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    pending.set(id,{resolve,reject});
    socket.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout: '+method))}},20000).unref?.();
  });
}
async function evalJS(expression){
  const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(result.exceptionDetails)throw Error('Browser exception: '+JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}
async function until(expression,description){
  for(let i=0;i<100;i++){
    try{if(await evalJS(expression))return}catch(_){}
    await wait(250);
  }
  throw Error('UI non disponibile: '+description);
}
async function smoke(){
  await connect(await discover());
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url:'http://127.0.0.1:'+port+'/gestione/'});
  await until("Boolean(document.querySelector('#saas-app')?.dataset.view==='agenda'&&document.querySelector('#cc-week .cc-day')&&document.querySelector('#case247-agenda50'))",'Agenda SPA e nuovo modulo');
  assert.equal(await evalJS("document.scrollingElement.scrollHeight<=innerHeight"),true);
  assert.equal(await evalJS("document.querySelectorAll('#cc-week .cc-day').length"),6);
  assert.equal(await evalJS("document.querySelectorAll('#cc-week .cc-slot.cc-fixed').length"),5);
  assert.equal(await evalJS("document.querySelectorAll('#case247-agenda50').length"),1);
  assert.equal(await evalJS("document.querySelector('#case247-agenda50').parentElement.id"),'cc-calendar');
  assert.equal(await evalJS("document.querySelector('#case247-agenda50').previousElementSibling.id"),'cc-week');
  assert.equal(await evalJS("document.querySelector('#case247-agenda50').nextElementSibling.classList.contains('cc-filters')"),true);
  assert.equal(await evalJS("['cc-export','cc-ics','cc-import'].every(id=>Boolean(document.getElementById(id)))"),true);
  console.log('PASS: original layout, 6 days, 5 acquisition slots, new panel isolated');
  // The legacy weekly grid stays in the DOM for backward compatibility, but only the daily timeline is visible.
  assert.equal(await evalJS("getComputedStyle(document.querySelector('#cc-week')).display"),'none');
  assert.equal(await evalJS("document.querySelector('#a50-unified-timeline .a50-block-title').textContent"),'Colazione strategica · Centri di influenza');
  assert.equal(await evalJS("document.querySelectorAll('#a50-unified-timeline .a50-item').length"),6);
  assert.equal(await evalJS("Boolean(document.querySelector('#a50-unified-view .a50-crm-quick'))"),true);
  await evalJS("(()=>{for(let i=0;i<6&&new Date(CASE247Agenda50.getDay()+'T12:00:00Z').getUTCDay()!==6;i++)document.querySelectorAll('.a50-day-button')[2].click();return true})()");
  assert.equal(await evalJS("document.querySelector('#case247-agenda50').classList.contains('a50-day-saturday')"),true);
  assert.equal(await evalJS("getComputedStyle(document.querySelector('#a50-grand-total, .a50-grand-total')).display"),'none');
  assert.equal(await evalJS("document.querySelectorAll('#a50-unified-timeline .a50-time-block').length"),4);
  assert.equal(await evalJS("document.querySelectorAll('#a50-unified-timeline .a50-item').length"),0);
  await evalJS("document.querySelector('.a50-today-button').click();true");
  assert.equal(await evalJS("document.querySelector('#case247-agenda50').classList.contains('a50-day-saturday')"),false);
  assert.equal(await evalJS("document.querySelectorAll('#a50-unified-timeline .a50-item').length"),6);
  console.log('PASS: Saturday has exactly four blocks and weekday counters restore without duplicates');


  assert.equal(await evalJS("document.querySelector('#saas-app').dataset.view"),'agenda');
  assert.equal(await evalJS("getComputedStyle(document.querySelector('#case247-agenda50')).display!=='none'"),true);
  assert.equal(await evalJS("document.querySelector('#a50-title').textContent.includes('0 / 50')"),true);
  assert.equal(await evalJS("document.querySelectorAll('#case247-agenda50 .a50-group').length"),3);
  assert.equal(await evalJS("document.querySelectorAll('#case247-agenda50 .a50-item').length"),6);
  await evalJS("document.querySelector('#case247-agenda50').scrollIntoView({block:'start'});true");
  await wait(150);
  const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync('/tmp/case247-agenda50-preview-desktop.png',Buffer.from(screenshot.data,'base64'));
  console.log('PASS: agenda 50 screenshot below original week grid');

  await evalJS("(()=>{const b=document.querySelector('[data-direction=\"1\"][data-for-item=\"email\"]');for(let i=0;i<12;i++)b.click();return true})()");
  assert.equal(await evalJS("document.querySelector('[data-counter=\"email\"]').textContent.trim()"),'10 / 10');
  assert.equal(await evalJS("document.querySelector('[data-direction=\"1\"][data-for-item=\"email\"]').disabled"),true);
  assert.equal(await evalJS("document.querySelector('.a50-grand-total').textContent.trim()"),'10 / 50');
  await evalJS("document.querySelector('[data-direction=\"-1\"][data-for-item=\"email\"]').click();true");
  assert.equal(await evalJS("document.querySelector('[data-counter=\"email\"]').textContent.trim()"),'9 / 10');
  console.log('PASS: manual-only counting, cap 10 and undo');

  await evalJS("window.confirm=()=>false;document.querySelector('#a50-reset').click();true");
  assert.equal(await evalJS("document.querySelector('[data-counter=\"email\"]').textContent.trim()"),'9 / 10');
  await evalJS("window.confirm=()=>true;document.querySelector('#a50-reset').click();true");
  assert.equal(await evalJS("document.querySelector('.a50-grand-total').textContent.trim()"),'0 / 50');
  await evalJS("document.querySelector('[data-direction=\"1\"][data-for-item=\"followups\"]').click();true");
  const persisted=await evalJS("(()=>{const k=Object.keys(localStorage).find(k=>/^case247_agenda_\\d{4}-\\d{2}-\\d{2}$/.test(k));return k&&JSON.parse(localStorage.getItem(k))})()");
  assert.equal(persisted.schema,'case247.agenda.v1');
  assert.equal(persisted.counters.followups,1);
  await command('Page.reload',{ignoreCache:true});
  await until("Boolean(document.querySelector('#saas-app')&&document.querySelector('#case247-agenda50'))",'reload');
  assert.equal(await evalJS("document.querySelector('[data-counter=\"followups\"]').textContent.trim()"),'1 / 5');
  assert.equal(await evalJS("document.querySelectorAll('#cc-week .cc-slot.cc-fixed').length"),5);
  console.log('PASS: localStorage survives refresh, calendar unchanged');

  // Existing school localStorage remains untouched until an explicit schedule confirmation.
  await evalJS("document.querySelector('[data-saas-view=\"operativo\"]').click();true");
  await until("Boolean(document.querySelector('#cc-school-reference')&&document.querySelector('#cc-school-badge'))",'Studio tab');
  assert.equal(await evalJS("document.querySelector('#saas-app').dataset.view"),'operativo');
  assert.equal(await evalJS("document.querySelector('#cc-school-badge').textContent.includes('13 lezioni')"),true);
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-lessons .cc-study-row').length"),13);
  assert.equal(await evalJS("Boolean(JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')||'{\"weeks\":{}}').weeks['2026-11-16'])"),false);
  assert.equal(await evalJS("document.querySelector('#cc-school-lessons').textContent.includes('Riferimento fornito dall')"),false);
  console.log('PASS: 13 2SCAT reference lessons available without overwriting saved data');

  await evalJS("document.querySelector('#cc-school-reference').click();true");
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-draft tr').length"),13);
  await evalJS("window.confirm=()=>true;document.querySelector('#cc-school-confirm').click();true");
  assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')).weeks['2026-11-16'].rows.length"),13);
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-lessons .cc-study-row').length"),13);
  await evalJS("document.querySelector('#cc-school-verify-all').click();true");
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-lessons .cc-study-state-verified').length"),13);
  await evalJS("document.querySelector('#cc-school-lessons .cc-study-state').click();true");
  assert.equal(await evalJS("document.querySelector('#cc-school-lessons .cc-study-state').textContent"),'Ripasso OK');
  await evalJS("document.querySelector('#cc-school-lessons .cc-study-state').click();true");
  assert.equal(await evalJS("document.querySelector('#cc-school-lessons .cc-study-state').textContent"),'Da verificare');
  console.log('PASS: 13 confirmed lessons intact; stage cycle independently persisted');

  await evalJS("([...document.querySelectorAll('#cc-study-filter-days button')].find(b=>b.textContent.includes('Lun 16'))).click();true");
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-lessons .cc-study-row').length"),2);
  await evalJS("document.querySelector('#cc-study-filter-days button').click();true");
  await evalJS("([...document.querySelectorAll('#cc-study-filter-subjects button')].find(b=>b.textContent==='Topografia')).click();true");
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-lessons .cc-study-row').length"),2);
  await evalJS("document.querySelector('#cc-study-filter-subjects button').click();true");
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-lessons .cc-study-row').length"),13);
  console.log('PASS: day and subject pills filter 13 lessons without data mutation');

  await evalJS("document.querySelector('#cc-school-lessons .cc-study-row-actions button').click();true");
  assert.equal(await evalJS("Boolean(document.querySelector('.cc-study-inline-editor textarea'))"),true);
  await evalJS("(()=>{const a=document.querySelector('.cc-study-inline-editor textarea');a.value='Ripassare rilievo topografico';document.querySelector('.cc-study-inline-editor').requestSubmit();return true})()");
  assert.equal(await evalJS("Object.values(JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')).lessonNotes).some(v=>v==='Ripassare rilievo topografico')"),true);
  await evalJS("window.confirm=()=>false;document.querySelector('#cc-school-lessons .cc-study-delete').click();true");
  assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')).weeks['2026-11-16'].rows.length"),13);
  await command('Page.reload',{ignoreCache:true});
  await until("Boolean(document.querySelector('#cc-school-badge')&&document.querySelector('#case247-agenda50'))",'after school reload');
  assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')).weeks['2026-11-16'].rows.length"),13);
  assert.equal(await evalJS("document.querySelectorAll('#cc-school-lessons .cc-study-row').length"),13);
  assert.equal(await evalJS("Boolean(document.querySelector('#cc-crm')&&document.querySelector('#case247-two-boards')&&document.querySelector('#cc-school-export'))"),true);
  await evalJS("document.querySelector('[data-saas-view=\"operativo\"]').click();document.querySelector('#cc-studio').scrollIntoView({block:'start'});true");
  await wait(180);
  const schoolScreenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync('/tmp/case247-studio-compact-preview.png',Buffer.from(schoolScreenshot.data,'base64'));
  console.log('PASS: Studio UI, 13 saved lessons, notes and business modules preserved after refresh');

}
smoke().then(()=>{
  console.log('CASE247 Agenda 50 browser QA succeeded');
  process.exitCode=0;
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
}).finally(()=>{
  try{socket?.close()}catch(_){}
  try{browser.kill('SIGTERM')}catch(_){}
  try{server.kill('SIGTERM')}catch(_){}
});
