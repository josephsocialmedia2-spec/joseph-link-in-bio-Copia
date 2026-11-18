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
 await until("document.querySelector('#saas-app')?.dataset.view==='agenda'",'SaaS mobile agenda');
 assert.equal(await evalJS("document.scrollingElement.scrollHeight<=innerHeight"),true);
 assert.equal(await evalJS("[...document.querySelectorAll('#cc-week .cc-day')].filter(x=>getComputedStyle(x).display!=='none').length"),6);
 assert.equal(await evalJS("getComputedStyle(document.querySelector('#cc-week')).gridTemplateColumns.split(' ').length"),2);
 await evalJS("document.querySelector('[data-saas-view=acquisizione]').click();true");
 assert.equal(await evalJS("document.querySelector('#saas-app').dataset.view"),'acquisizione');
 await evalJS("document.querySelector('[data-saas-view=agenda]').click();true");
 assert.equal(await evalJS("document.querySelector('#saas-app').dataset.view"),'agenda');
 console.log('PASS: six-day mobile grid and tab switching without document scroll');
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
 await command('Emulation.clearDeviceMetricsOverride');
}
main().catch(e=>{console.error('FAIL:',e.stack||String(e));process.exitCode=1})
 .finally(async()=>{try{socket?.close()}catch(_){}server.kill('SIGTERM');browser.kill('SIGTERM');});
