/* Browser QA for the existing CASE247 calendar, launched in GitHub Actions with installed Google Chrome. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['-m','http.server','18765','--bind','127.0.0.1'],{cwd:process.cwd(),stdio:'ignore'});
const browser=spawn(chrome,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-allow-origins=*','--remote-debugging-port=19222','--user-data-dir=/tmp/case247-studio-chrome-qa-'+process.pid,'about:blank'],{stdio:'ignore'});
let socket,serial=0;const pending=new Map();
async function discover(){
 for(let i=0;i<90;i++){
  try{
   const res=await fetch('http://127.0.0.1:19222/json/list');
   if(res.ok){const targets=await res.json();const target=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);if(target)return target.webSocketDebuggerUrl}
  }catch(_){}
  await sleep(250);
 }
 throw Error('Chrome DevTools endpoint unavailable. Check installed Chrome.');
}
async function connect(url){
 socket=new WebSocket(url);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
 socket.addEventListener('message',e=>{
  const data=JSON.parse(e.data);if(!data.id||!pending.has(data.id))return;
  const item=pending.get(data.id);pending.delete(data.id);
  if(data.error)item.reject(Error(data.error.message));else item.resolve(data.result);
 });
}
async function command(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP command timed out: '+method))}},20000).unref?.();
 });
}
async function evalJS(expression){
 const res=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
 if(res.exceptionDetails)throw Error('Browser exception: '+(res.exceptionDetails.text||JSON.stringify(res.exceptionDetails)));
 return res.result?.value;
}
async function until(expression,label){
 for(let i=0;i<90;i++){
  try{if(await evalJS(expression))return}catch(_){}
  await sleep(250);
 }
 const status=await evalJS("({html:document.querySelector('#case247-control-center')?.innerHTML.slice(0,500),scripts:[...document.scripts].map(x=>x.src).slice(-6)})");
 throw Error('UI not ready: '+label+'; debug='+JSON.stringify(status));
}
async function main(){
 console.log('Using browser:',chrome);
 await connect(await discover());await command('Page.enable');await command('Runtime.enable');
 await command('Page.navigate',{url:'http://127.0.0.1:18765/gestione/'});
 await until("Boolean(document.querySelector('#cc-studio')&&document.querySelector('#cc-school-reference')&&document.querySelector('#input-perche'))",'STUDIO and motivation widget render');
 await until("Boolean(document.querySelector('#saas-app')?.dataset.view==='agenda')",'SaaS shell default agenda');
 assert.equal(await evalJS("document.scrollingElement.scrollHeight <= innerHeight"),true);
 assert.equal(await evalJS("getComputedStyle(document.querySelector('#saas-app [data-pane=control]')).display"),'block');
 console.log('PASS: fixed viewport with Agenda as default');
 // The site opens on today's date. Weekend schedules omit the weekday 09:00 tools.
 // Select a known weekday before asserting weekday-only agenda blocks.
 await until("Boolean(window.CASE247Agenda50&&document.querySelector('#a50-unified-view'))",'agenda instance ready');
 await evalJS("CASE247Agenda50.selectDay('2026-11-17');true");
 await until("Boolean(document.querySelector('#a50-unified-timeline [data-start=\"09:00\"] #a50-tools-portals'))",'privati tools visible within 09:00 block');
 assert.equal(await evalJS("document.querySelectorAll('#a50-unified-view').length"),1);
 assert.equal(await evalJS("document.querySelectorAll('#case247-acq-tools').length"),0);
 assert.equal(await evalJS("Boolean(document.querySelector('#a50-unified-timeline [data-start=\"09:30\"] #a50-tools-timer'))"),true);
 assert.equal(await evalJS("Boolean(document.querySelector('#a50-unified-timeline [data-start=\"11:30\"] #a50-tools-scripts'))"),true);
 assert.equal(await evalJS("Boolean(document.querySelector('#a50-unified-timeline [data-start=\"15:30\"] #a50-tools-qr'))"),true);
 assert.equal(await evalJS("Boolean(document.querySelector('#a50-unified-timeline [data-start=\"16:30\"] #a50-tools-kpi'))"),true);
 assert.equal(await evalJS("Boolean(document.querySelector('#a50-tools-portals [href=\"https://www.idealista.it/\"]'))"),true);
 assert.equal(await evalJS("getComputedStyle(document.querySelector('#a50-tools-portals')).display"),'block');
 assert.equal(await evalJS("document.querySelector('.a50-agenda-build').textContent.includes('19.11.3')"),true);
 const priorKpiDay=await evalJS("CASE247Agenda50.getDay()");
 await evalJS("CASE247Agenda50.selectDay('2026-11-17');true");
 await until("document.querySelector('#a50-kpi-day')?.textContent.includes('2026-11-17')",'KPI selected date');
 await evalJS("(()=>{const field=document.querySelector('#a50-tools-kpi [data-kpi=privati]');field.value='2';field.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-acquisizione-kpi-v1'))['2026-11-17'].privati"),2);
 await evalJS("CASE247Agenda50.selectDay('2026-11-18');true");
 await until("document.querySelector('#a50-kpi-day')?.textContent.includes('2026-11-18')",'KPI second day');
 assert.equal(await evalJS("document.querySelector('#a50-tools-kpi [data-kpi=privati]').value"),'0');
 await evalJS("CASE247Agenda50.selectDay('2026-11-17');true");
 await until("document.querySelector('#a50-kpi-day')?.textContent.includes('2026-11-17')",'KPI original day');
 assert.equal(await evalJS("document.querySelector('#a50-tools-kpi [data-kpi=privati]').value"),'2');
 await evalJS("document.querySelector('#a50-tools-timer [data-pomo=\"10\"]').click();true");
 assert.equal(await evalJS("document.querySelector('#a50-pomo-display').textContent==='10:00' || document.querySelector('#a50-pomo-display').textContent==='09:59'"),true);
 await evalJS("document.querySelector('#a50-tools-timer [data-pomo=stop]').click();true");
 assert.equal(await evalJS("document.querySelector('#a50-pomo-display').textContent"),'50:00');
 await evalJS("CASE247Agenda50.selectDay('2026-11-21');true");
 await until("Boolean(document.querySelector('#a50-unified-timeline [data-start=\"12:00\"] #a50-tools-kpi'))",'Saturday KPI inline');
 assert.equal(await evalJS("document.querySelectorAll('#a50-unified-timeline .a50-inline-tool').length"),1);
 await evalJS("CASE247Agenda50.selectDay('"+priorKpiDay+"');true");
 await until("Boolean(document.querySelector('#a50-unified-timeline [data-start=\"09:30\"] #a50-tools-timer'))",'weekday tools restored');
 console.log('PASS: every acquisition tool visible in a chronological time block; KPI/date and timer validated');

 await until("Boolean(document.querySelector('#saas-app .saas-google-piva'))",'SaaS Google shortcut');
 await until("Boolean(window.CASE247GooglePiva && new URL(document.querySelector('#saas-app .saas-google-piva')?.href||location.href).searchParams.get('q')?.includes('Piazza Conte Rosso'))",'complete Google research prompt in header');
 assert.equal(await evalJS("new URL(document.querySelector('#saas-app .saas-google-piva').href).searchParams.get('q')===CASE247GooglePiva.prompt"),true);
 assert.equal(await evalJS("CASE247GooglePiva.prompt.includes('Inizia fornendo un elenco completo attività partendo da Avigliana')"),true);
 assert.equal(await evalJS("CASE247GooglePiva.prompt.includes('esattamente queste 7 colonne')"),true);
 assert.equal(await evalJS("document.querySelector('#saas-app .saas-google-piva').target"),'_blank');
 await until("Boolean(window.CASE247Agenda50&&document.querySelector('#a50-unified-view'))",'unified agenda');
 const beforeSearchDay=await evalJS("CASE247Agenda50.getDay()");
 await evalJS("CASE247Agenda50.selectDay('2026-11-17');true");
 await until("[...document.querySelectorAll('#a50-unified-view .a50-quick-link')].some(a=>a.textContent==='Partita IVA Avigliana')",'manual Google shortcut on weekday');
 await until("[...document.querySelectorAll('#a50-unified-view .a50-quick-link')].some(a=>a.textContent==='Partita IVA Avigliana' && new URL(a.href).searchParams.get('q')===CASE247GooglePiva.prompt)",'full Google prompt linked in daily agenda');
 assert.equal(await evalJS("new URL([...document.querySelectorAll('#a50-unified-view .a50-quick-link')].find(a=>a.textContent==='Partita IVA Avigliana')?.href).searchParams.get('q')===CASE247GooglePiva.prompt"),true);
 assert.equal(await evalJS("[...document.querySelectorAll('#a50-unified-view .a50-quick-link')].find(a=>a.textContent==='Partita IVA Avigliana')?.target"),'_blank');
 await evalJS("CASE247Agenda50.selectDay('"+beforeSearchDay+"');true");
 console.log('PASS: click-ready manual Google Partita IVA Avigliana shortcut in daily agenda');

 await until("Boolean(document.querySelector('#saas-app > #case247-routine03'))",'03:00 routine mounted beneath SaaS header');
 assert.equal(await evalJS("document.querySelector('#saas-app > #case247-routine03')?.id"),'case247-routine03');
 assert.equal(await evalJS("document.querySelectorAll('#case247-routine03 .r03-card').length"),3);
 assert.equal(await evalJS("document.querySelector('#r03-total').textContent"),'0');
 await evalJS("document.querySelector('input[data-r03-check=flessioni]').click();true");
 assert.equal(await evalJS("document.querySelector('#r03-total').textContent"),'16');
 assert.equal(await evalJS("document.querySelector('#r03-today').textContent"),'16');
 await until("document.querySelector('[data-r03-id=flessioni]').hidden",'routine completed item becomes hidden');
 await command('Page.reload',{ignoreCache:true});
 await until("Boolean(document.querySelector('#saas-app > #case247-routine03'))",'routine after reload');
 assert.equal(await evalJS("document.querySelector('#r03-total').textContent"),'16');
 assert.equal(await evalJS("document.querySelector('[data-r03-id=flessioni]').hidden"),true);
 await evalJS("(()=>{const pts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const m=Object.fromEntries(pts.map(x=>[x.type,x.value]));const date=m.year+'-'+m.month+'-'+m.day;const yesterday=new Date(date+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1);localStorage.setItem('case247-routine03-v1',JSON.stringify({day:yesterday.toISOString().slice(0,10),historyTotal:50,done:['flessioni','addominali']}));return true})()");
 await command('Page.reload',{ignoreCache:true});
 await until("Boolean(document.querySelector('#saas-app > #case247-routine03'))",'routine auto-reset next day');
 assert.equal(await evalJS("document.querySelector('#r03-total').textContent"),'78');
 assert.equal(await evalJS("document.querySelector('#r03-today').textContent"),'0');
 assert.equal(await evalJS("[...document.querySelectorAll('#case247-routine03 .r03-card')].every(c=>!c.hidden)"),true);
 await evalJS("window.confirm=()=>true;document.querySelector('#r03-reset').click();true");
 assert.equal(await evalJS("document.querySelector('#r03-total').textContent"),'0');
 await evalJS("document.querySelectorAll('#case247-routine03 input[data-r03-check]').forEach(x=>x.click());true");
 await sleep(350);
 assert.equal(await evalJS("document.querySelector('#r03-today').textContent"),'188');
 assert.equal(await evalJS("document.querySelector('#r03-total').textContent"),'188');
 assert.equal(await evalJS("document.querySelector('#r03-complete').hidden"),false);
 assert.equal(await evalJS("[...document.querySelectorAll('#case247-routine03 .r03-card')].every(c=>c.hidden)"),true);
 console.log('PASS: morning routine, 16/12/160 kcal, persistence, daily rollover and completion');

 await evalJS("(()=>{const i=document.querySelector('#input-perche');i.value='Completare la mia giornata';document.querySelector('#perche-form').requestSubmit();return true})()");
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('mieiPerche')).length"),1);
 assert.equal(await evalJS("document.querySelector('#ticker-text').textContent.includes('Completare la mia giornata')"),true);
 await evalJS("(()=>{const i=document.querySelector('#input-perche');i.value='<img src=x onerror=alert(1)>';document.querySelector('#perche-form').requestSubmit();return true})()");
 assert.equal(await evalJS("document.querySelector('#ticker-text img')===null"),true);
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('mieiPerche')).length"),2);
 await command('Page.reload',{ignoreCache:true});
 await until("Boolean(document.querySelector('#cc-studio')&&document.querySelector('#ticker-text')?.textContent.includes('Completare la mia giornata'))",'saved Perché after page reload');
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('mieiPerche')).length"),2);
 console.log('PASS: Perché precedes Agenda; saved entries persist across reload and HTML is rendered safely');
 assert.equal(await evalJS("document.querySelector('#case247-control-center').compareDocumentPosition(document.querySelector('#case247-two-boards')) & Node.DOCUMENT_POSITION_FOLLOWING"),4);
 assert.equal(await evalJS("document.querySelector('.cc-main > .cc-section').id"),'cc-calendar');
 assert.equal(await evalJS("document.querySelectorAll('#cc-new').length"),1);
 console.log('PASS: Agenda is first, without duplicate controls');
 assert.equal(await evalJS("document.querySelector('#cc-studio h2').textContent"),'STUDIO — CLASSE 2S CAT');
 assert.equal(await evalJS("document.querySelectorAll('#cc-week .cc-slot.cc-fixed').length"),5);
 assert.equal(await evalJS("document.querySelector('#cc-week .cc-slot.cc-fixed').textContent.includes('09:30')"),true);
 console.log('PASS: same calendar and acquisition link preserved');
 await evalJS("document.querySelector('#cc-school-reference').click(); true");
 assert.equal(await evalJS("document.querySelectorAll('#cc-school-draft tr').length"),13);
 assert.equal(await evalJS("document.querySelector('#cc-school-preview').classList.contains('cc-hidden')"),false);
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')||'{\"weeks\":{}}').weeks?.['2026-11-16']===undefined"),true);
 console.log('PASS: reference preview stays uncommitted before confirmation');
 await evalJS("window.confirm=()=>true; document.querySelector('#cc-school-confirm').click();true");
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')).weeks['2026-11-16'].rows.length"),13);
 assert.equal(await evalJS("document.querySelector('#cc-school-lessons').textContent.includes('Topografia')"),true);
 console.log('PASS: 13 lessons committed in local browser only after explicit confirmation');
 await evalJS("document.querySelector('#cc-new').click();true");
 await evalJS("(()=>{const f=document.querySelector('#cc-form');f.elements.title.value='Verifica Matematica';f.elements.date.value='2026-11-20';f.elements.time.value='17:00';f.elements.duration.value='45';f.elements.project.value='STUDIO';f.elements.project.dispatchEvent(new Event('change',{bubbles:true}));f.elements.schoolType.value='SCUOLA VERIFICA';f.elements.schoolSubject.value='Matematica';f.elements.topics.value='Radicali';f.requestSubmit();return true})()");
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-cc-tasks-v1')).some(t=>t.project==='STUDIO'&&t.schoolType==='SCUOLA VERIFICA'&&t.subject==='Matematica')"),true);
 console.log('PASS: new STUDIO exam uses existing task storage');
 const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 fs.writeFileSync('/tmp/case247-studio-chrome-smoke.png',Buffer.from(screenshot.data,'base64'));
 console.log('PASS: browser screenshot produced');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await evalJS("CASE247Agenda50.selectDay('2026-11-17');true");
 await until("document.querySelector('#saas-app')?.dataset.view==='agenda'",'SaaS mobile agenda');
 assert.equal(await evalJS("document.scrollingElement.scrollHeight<=innerHeight"),true);
 assert.equal(await evalJS("[...document.querySelectorAll('#cc-week .cc-day')].filter(x=>getComputedStyle(x).display!=='none').length"),6);
 assert.equal(await evalJS("getComputedStyle(document.querySelector('#cc-week')).display"),'none');
 assert.equal(await evalJS("document.querySelectorAll('#a50-unified-timeline .a50-time-block').length>=6"),true);
 assert.equal(await evalJS("getComputedStyle(document.querySelector('#a50-unified-view')).display!=='none'"),true);
 await evalJS("document.querySelector('[data-saas-view=acquisizione]').click();true");
 assert.equal(await evalJS("document.querySelector('#saas-app').dataset.view"),'acquisizione');
 await evalJS("document.querySelector('[data-saas-view=agenda]').click();true");
 assert.equal(await evalJS("document.querySelector('#saas-app').dataset.view"),'agenda');
 console.log('PASS: single chronological mobile agenda, hidden legacy grid and tab switching');
 await evalJS("document.querySelector('.saas-reorder-toggle').click();true");
 await evalJS("document.querySelector('[data-saas-key=archivio] .saas-move-left').click();true");
 assert.equal(await evalJS("document.querySelectorAll('.saas-tab-unit')[4].dataset.saasKey"),'archivio');
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-saas-tab-order-v1'))[4]"),'archivio');
 await command('Page.reload',{ignoreCache:true});
 await until("document.querySelector('#saas-app')?.dataset.view==='agenda'",'SaaS tabs after reload');
 assert.equal(await evalJS("document.querySelectorAll('.saas-tab-unit')[4].dataset.saasKey"),'archivio');
 await evalJS("document.querySelector('[data-saas-view=acquisizione]').click();true");
 assert.equal(await evalJS("Boolean(document.querySelector('.saas-workbook-action')&&document.querySelector('.saas-workbook-config'))"),true);
 await evalJS("document.querySelector('.saas-workbook-config').click();true");
 assert.equal(await evalJS("document.querySelector('#cc-crm-dialog').open"),true);
 await evalJS("document.querySelector('#cc-crm-cancel').click();true");
 console.log('PASS: tab order persists after reload and CRM workbook configuration opens');

 // Integrated Farming Avigliana workspace: verify actual browser actions in the fourth Acquisition panel.
 await until("Boolean(document.querySelector('#sv-farming-frame')?.contentDocument?.querySelector('#contactsWorkbook'))",'Avigliana Farming contacts loaded');
 assert.equal(await evalJS("document.querySelectorAll('#sv-acquisizione [role=tab]').length"),0);
 assert.equal(await evalJS("document.querySelector('#sv-acquisizione').textContent.includes('Sistema di Acquisizione Immobiliare')"),false);
 assert.equal(await evalJS("document.querySelector('#sv-acquisizione').textContent.includes('Standard Venditore')"),false);
 assert.equal(await evalJS("document.querySelector('#sv-tab-4').getBoundingClientRect().height>0"),true);
 assert.equal(await evalJS("Boolean(document.querySelector('.saas-workbook-action')&&document.querySelector('.saas-workbook-config'))"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelectorAll('#nav button').length"),9);

 await until("document.querySelector('#sv-farming-frame')?.contentDocument?.querySelectorAll('#omi-work-list [data-omi-road]').length>0",'OMI daily street action list loaded');
 assert.equal(await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow;const q=w.document.querySelector('#omi-work-zone');q.value='all';q.dispatchEvent(new Event('change'));return w.document.querySelectorAll('[data-omi-road]').length})()"),6);
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow;w.alert=()=>{w.__omiStreetBlock=true};w.document.querySelector('[data-omi-road=\"C1|Via Suppo\"]').click();const d=w.document;d.querySelector('#omi-road-prepared').value='10';d.querySelector('#omi-road-delivered').value='5';d.querySelector('#omi-road-save').click();return true})()");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentWindow.__omiStreetBlock===true"),true);
 assert.equal(await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow,d=w.document;return !JSON.parse(w.localStorage.getItem('case247-farming-strade-omi-2026-1-v1')||'{}')?.days?.[d.querySelector('#omi-work-date').value]?.['C1|Via Suppo']})()"),true);
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow,d=w.document;d.querySelector('#omi-road-civici').value='Tratto QA';d.querySelector('#omi-road-verified').checked=true;d.querySelector('#omi-road-noadv').checked=true;d.querySelector('#omi-road-save').click();return true})()");
 assert.equal(await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow,d=w.document;return JSON.parse(w.localStorage.getItem('case247-farming-strade-omi-2026-1-v1')).days[d.querySelector('#omi-work-date').value]['C1|Via Suppo'].delivered})()"),5);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#omi-work-week').textContent.includes('Lunedì C1')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#omi-work-week').textContent.includes('Giovedì D1')"),true);
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow,d=w.document;d.querySelector('#omi-work-zone').value='C1';d.querySelector('#omi-work-zone').dispatchEvent(new Event('change'));d.querySelector('#omi-work-letter').click();return true})()");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#letterZone').value.includes('Via Suppo')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#lettere').classList.contains('on')"),true);
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow,d=w.document;w.goto('oggi');d.querySelector('#omi-work-quotes').click();return true})()");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#omi').classList.contains('on')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#omi-zone').value"),'C1');
 await evalJS("document.querySelector('#sv-farming-frame').contentWindow.goto('oggi');true");


 assert.equal(await evalJS("Boolean(document.querySelector('#sv-farming-frame').contentDocument.querySelector('#oggi #farming-onedrive-excel'))"),true);
 assert.equal(await evalJS("(()=>{const a=document.querySelector('#sv-farming-frame').contentDocument.querySelector('#farming-onedrive-excel');return a.href.startsWith('https://1drv.ms/x/c/')&&a.target==='_blank'})()"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#oggi').textContent.includes('Agenda operativa unica · simulazione')"),false);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#oggi').textContent.includes('Storico giornaliero Farming')"),false);

 assert.equal(await evalJS("getComputedStyle(document.querySelector('#sv-farming-frame').contentDocument.querySelector('header.top')).display"),'none');
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('header.top').textContent.includes('Installa VBA Acquisizione')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#nav').getBoundingClientRect().height>0"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelectorAll('#omiRows tr').length>=1"),true);
 assert.equal(await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow;w.goto('excelvba');return w.document.querySelector('#excelvba')?.classList.contains('on') && w.document.querySelector('#excelvba a[download]')?.getAttribute('href')==='./excel/CASE247_Acquisizione_Installer.bas'})()"),true);
 await evalJS("document.querySelector('#sv-farming-frame').contentWindow.goto('oggi');true");
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow,d=w.document;w.alert=()=>{};w.confirm=()=>true;w.goto('contatti');d.querySelector('#photoText').value='20/11/2026 Avigliana\\nVia Test QA 1 - Cliente: Appartamento prova';d.querySelector('#photoParse').click();d.querySelector('#photoConfirm').checked=true;d.querySelector('#photoSave').click();return true})()");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#contactForm')===null"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#importCsv')===null"),true);
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-lab-avigliana-v1')).contacts.some(x=>x.address==='Via Test QA 1')"),true);

 await evalJS("(()=>{const d=document.querySelector('#sv-farming-frame').contentDocument;d.querySelector('#contactsRows [data-contact-id]').click();const f=d.querySelector('#clientDetailForm');f.elements.followDate.value='2026-11-23';f.elements.followTime.value='14:30';f.requestSubmit();return true})()");
 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-lab-avigliana-v1')).contacts.some(x=>x.address==='Via Test QA 1'&&x.followDate==='2026-11-23')"),true);

  // Originale: Notizie & Contatti mostra subito il foglio Excel e le schede cliente.
  await evalJS("document.querySelector('#sv-farming-frame').contentWindow.goto('contatti');true");
  await until("document.querySelector('#sv-farming-frame')?.contentDocument?.querySelector('#contactsSheetTable')?.textContent.includes('Via Test QA 1')",'foglio Acquisizione mostra contatti già salvati');
  assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelectorAll('#contactsWorkbook').length"),1);
  await evalJS("(()=>{const d=document.querySelector('#sv-farming-frame').contentDocument;d.querySelector('#contactsRows [data-contact-id]').click();return true})()");
  assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#clientDetail').hidden"),false);
  await evalJS("(()=>{const d=document.querySelector('#sv-farming-frame').contentDocument,f=d.querySelector('#clientDetailForm');f.elements.name.value='Appartamento QA';f.elements.notes.value='Sopralluogo registrato';f.requestSubmit();return true})()");
  assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-lab-avigliana-v1')).contacts.some(x=>x.address==='Via Test QA 1'&&x.name==='Appartamento QA')"),true);
  await evalJS("(()=>{const d=document.querySelector('#sv-farming-frame').contentDocument;d.querySelector('#photoText').value='21/11/2026 Avigliana\\nVia Torino 41 - Cliente: Trilocale A\\nVia Roma 8 - Cliente: Casa B';d.querySelector('#photoParse').click();return true})()");
  assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelectorAll('#photoDrafts fieldset').length"),2);
  await evalJS("(()=>{const d=document.querySelector('#sv-farming-frame').contentDocument;d.querySelector('#photoConfirm').checked=true;d.querySelector('#photoSave').click();return true})()");
  assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-lab-avigliana-v1')).contacts.some(x=>x.address==='Via Torino 41')"),true);
  assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-lab-avigliana-v1')).contacts.some(x=>x.address==='Via Roma 8')"),true);
  assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#contactsRows').textContent.includes('Via Torino 41')"),true);
  await evalJS("(()=>{const k='case247-farming-daily-history-v1',h=JSON.parse(localStorage.getItem(k)||'[]');h.push({date:'2026-11-21',comune:'Avigliana',zone:'A',address:'Via Diario QA 99',immobile:'Monolocale',type:'Notizia verificata',quantity:1,outcome:'Completato'});localStorage.setItem(k,JSON.stringify(h));const w=document.querySelector('#sv-farming-frame').contentWindow;w.dispatchEvent(new StorageEvent('storage',{key:k}));return true})()");
  await until("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#contactsRows')?.textContent.includes('Via Diario QA 99')",'diario Farming appare senza creare contatti fittizi');
  console.log('PASS: Notizie & Contatti foglio Excel, scheda cliente, testo foto e diario');

 assert.equal(await evalJS("JSON.parse(localStorage.getItem('case247-cc-tasks-v1')).some(x=>x.source==='case247-farming-avigliana'&&x.date==='2026-11-23'&&x.time==='14:30')"),true);
 await until("document.querySelector('#sv-farming-frame').style.height.endsWith('px')",'same-origin embedded height adjusted');
 await until("document.querySelector('#sv-farming-frame')?.contentWindow?.CASE247OMI?.getData()?.quotations?.length===35",'all 35 sourced OMI quotes loaded');
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentWindow.CASE247OMI.getData().zones.length"),7);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelectorAll('#omi-map path').length"),7);
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow;w.goto('omi');w.CASE247OMI.selectZone('C2');const d=w.document;d.querySelector('#omi-type').value='Abitazioni civili';w.renderOmi();d.querySelector('#omi-condition').value='OTTIMO';w.renderOmi();d.querySelector('#dOmi').selectedIndex=1;d.querySelector('#dMq').value='100';w.previewDossier();return true})()");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentWindow.CASE247OMI.getSelectedQuote()?.min"),1450);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#dossierPreview').textContent.includes('145.000')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#dossierPreview').textContent.includes('215.000')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#dossierPreview').textContent.includes('5.9')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#omi-zone').value"),'C2');
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow,d=w.document;d.querySelector('#omi-zone').value='';w.renderOmi();d.querySelector('#omi-type').value='';w.renderOmi();d.querySelector('#omi-condition').value='';w.renderOmi();return d.querySelector('#omi-zone').value===''})()");
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow;w.goto('omi');const f=w.document.querySelector('#omiForm');for(const [k,v] of Object.entries({city:'Avigliana',zone:'TEST-OMI',semester:'2026/1',type:'Abitazioni civili',condition:'Normale',min:'1000',max:'2000',source:'TEST QA - dati non ufficiali'}))f.elements[k].value=v;f.requestSubmit();w.document.querySelector('#dMq').value='100';w.document.querySelector('#dOmi').value=Array.from(w.document.querySelector('#dOmi').options).find(o=>o.textContent.includes('TEST-OMI'))?.value||'';w.previewDossier();return true})()");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#dossierPreview').textContent.includes('100.000')"),true);
 await evalJS("document.querySelector('#sv-farming-frame').contentWindow.goto('lettere');true");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#letterType')===null"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#rew-flipbook').getAttribute('src')"),'../lettere-stampa/');
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#rew-download-letter').getAttribute('href').endsWith('lettera-c-23-11-aggiornata.html')"),true);
 await until("Boolean(document.querySelector('#sv-farming-frame')?.contentDocument?.querySelector('#rew-flipbook')?.contentDocument?.querySelector('#count'))",'Sfogliatore rivista embedded caricato');
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#rew-flipbook').contentDocument.querySelectorAll('#prev,#next').length"),2);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#rew-flipbook').contentDocument.querySelector('#count').textContent.includes('8')"),true);
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#rew-flipbook').contentDocument.querySelector('#next').disabled"),false);
 await evalJS("(()=>{const w=document.querySelector('#sv-farming-frame').contentWindow;w.goto('tracker');const f=w.document.querySelector('#trackerForm');f.elements.date.value='2026-11-20';f.elements.news.value='2';f.elements.contacts.value='1';f.elements.appointments.value='1';f.elements.incarichi.value='0';f.requestSubmit();return true})()");
 assert.equal(await evalJS("document.querySelector('#sv-farming-frame').contentDocument.querySelector('#kNews').textContent"),'2');
 await evalJS("document.querySelector('[data-saas-view=agenda]').click();CASE247Agenda50.selectDay('2026-11-23');true");
 await until("document.querySelector('#a50-unified-timeline')?.textContent.includes('Follow-up Avigliana · Via Test QA 1')",'Farming reminder visible in existing Agenda');
 console.log('PASS: Farming + OMI + PDF print + tracker + Agenda follow-up browser integration');

 await command('Emulation.clearDeviceMetricsOverride');

  await command('Page.navigate',{url:'http://127.0.0.1:18765/gestione/acquisizione-farming/crm/'});
  await until("Boolean(document.querySelector('#resultForm')&&document.querySelector('#tabPesa')&&window.CASE247CRMLogic)",'CRM Farming live');
  assert.equal(await evalJS("document.querySelectorAll('[role=tab]').length"),2);
  await evalJS("(()=>{const f=document.querySelector('#resultForm');f.elements.date.value='2026-11-21';f.elements.comune.value='Avigliana';f.elements.zone.value='A';f.elements.address.value='Via Prova CRM 22';f.elements.immobile.value='Appartamento A';f.elements.type.value='Volantino consegnato';f.elements.quantity.value='7';f.requestSubmit();return true})()");
  await until("document.querySelector('#acqRows')?.textContent.includes('Via Prova CRM 22')",'CRM captures farming result');
  assert.equal(await evalJS("document.querySelector('#acqRows').textContent.includes('Volantini 7')"),true);
  await evalJS("(()=>{const k='case247-farming-daily-history-v1',h=JSON.parse(localStorage.getItem(k));h.push({date:'2026-11-21',comune:'Avigliana',zone:'A',address:'Via Prova CRM 22',immobile:'Appartamento A',type:'Lettera consegnata',quantity:3,outcome:'Completato'});localStorage.setItem(k,JSON.stringify(h));window.dispatchEvent(new StorageEvent('storage',{key:k}));return true})()");
  await until("document.querySelector('#acqRows')?.textContent.includes('Lettere 3')",'automatic farming refresh');
  await evalJS("document.querySelector('#tabPesa').click();document.querySelector('#pesaPassword').value='TestPassword_2026!';document.querySelector('#unlockPesa').click();true");
  await until("document.querySelector('#pesaPrivate')?.hidden===false",'PESA encrypted unlock');
  await evalJS("(()=>{const f=document.querySelector('#heightCm');f.value='169';f.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await until("document.querySelector('#pesaMessage')?.textContent.length>3",'height saved');
  await evalJS("(()=>{const f=document.querySelector('#pesaRows input[data-date=\"2026-11-21\"]');f.value='95.7';f.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await until("document.querySelector('#pesaKpis')?.textContent.includes('33,5')",'BMI displayed');
  assert.equal(await evalJS("(()=>{const v=localStorage.getItem('case247-pesa-aes-gcm-v1')||'';return v.includes('payload')&&!v.includes('95.7')&&!v.includes('TestPassword_2026!')})()"),true);
  await evalJS("(()=>{window.XLSX={utils:{aoa_to_sheet:()=>({}),book_new:()=>({names:[]}),book_append_sheet:(b,s,n)=>b.names.push(n)},writeFile:(b,name)=>{window.__exported={names:b.names,name}}};document.querySelector('#tabAcq').click();document.querySelector('#xlsxExport').click();return true})()");
  await until("Boolean(window.__exported)",'two-sheet XLSX workbook');
  assert.deepEqual(await evalJS("window.__exported.names"),['Acquisizione','PESA']);
  console.log('PASS: CRM Farming live, AES-GCM PESA, BMI, Excel exactly two sheets');

}
main().catch(e=>{console.error('FAIL:',e.stack||String(e));process.exitCode=1})
 .finally(async()=>{try{socket?.close()}catch(_){}server.kill('SIGTERM');browser.kill('SIGTERM');});
