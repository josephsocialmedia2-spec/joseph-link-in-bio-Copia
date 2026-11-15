const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('gestione/collega-crm/setup.js','utf8');
const html=fs.readFileSync('gestione/collega-crm/index.html','utf8');
const styles=fs.readFileSync('gestione/collega-crm/style.css','utf8');
function run(hash,failStore=false){
 const events=[],stored={};
 const status={textContent:''};
 const location={hash,pathname:'/joseph-link-in-bio-Copia/gestione/collega-crm/',search:'',
   replace(value){events.push(['navigate',value]);}};
 const history={state:null,replaceState(_state,_title,href){events.push(['scrub',href]);}};
 const localStorage={setItem(key,value){if(failStore)throw Error('blocked');events.push(['store',key]);stored[key]=value;}};
 const context={window:{location,history,localStorage},document:{getElementById:()=>status},URL,decodeURIComponent};
 vm.runInNewContext(js,context);
 return {events,stored,status:status.textContent};
}
test('private Excel URL is configured in localStorage, scrubbed before navigation',()=>{
 const excel='https://1drv.ms/x/c/valid-id?e=6atSvw';
 const x=run('#crm-connect='+encodeURIComponent(excel));
 assert.equal(JSON.parse(x.stored['case247-cc-private-excel-url-v1']),excel);
 assert.deepEqual(x.events.map(v=>v[0]),['scrub','store','navigate']);
 assert.equal(x.events[0][1],'/joseph-link-in-bio-Copia/gestione/collega-crm/');
 assert.equal(x.events[2][1],'../#cc-calendar');
 assert.doesNotMatch(x.status,/6atSvw/);
});
test('incorrect URL or lookalike host is never persisted or visited',()=>{
 for(const url of ['http://1drv.ms/x/foo','https://1drv.ms.evil.example/x/foo','javascript:alert(1)','https://evil.example/?url=1drv.ms']){
  const x=run('#crm-connect='+encodeURIComponent(url));
  assert.deepEqual(x.events.map(v=>v[0]),['scrub']);
  assert.equal(Object.keys(x.stored).length,0);
 }
});
test('missing link and blocked local storage have safe behavior',()=>{
 const noLink=run('#cc-calendar');
 assert.equal(noLink.events.length,0);
 const blocked=run('#crm-connect='+encodeURIComponent('https://1drv.ms/x/c/valid'),true);
 assert.deepEqual(blocked.events.map(v=>v[0]),['scrub']);
 assert.match(blocked.status,/bloccato/);
});
test('setup page loads only own assets, forbids outbound data and does not embed CRM link',()=>{
 assert.match(html,/Content-Security-Policy/);
 assert.match(html,/default-src 'none'/);
 assert.match(html,/script-src 'self'/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/no-referrer/);
 assert.match(styles,/#08754f/);
 for(const source of [html,styles,js])assert.doesNotMatch(source,/56a10d0f448c4577|e=6atSvw/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
