const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('gestione/index.html'),js=read('gestione/control-center.js'),css=read('gestione/control-center.css');
test('the control center is integrated into the existing dashboard, once',()=>{
 assert.equal((html.match(/id="case247-control-center"/g)||[]).length,1);
 assert.match(html,/control-center\.js\?v=20261115-0930-crm/);
 assert.match(html,/control-center\.css\?v=20261115-0930-crm/);
 assert.match(html,/id="landing-data"/);
 assert.match(html,/id="detail"/);
 assert.match(html,/id="list"/);
});
test('JavaScript is syntactically valid and modular',()=>{assert.doesNotThrow(()=>new vm.Script(js));assert.match(js,/function refreshBranches/);assert.match(js,/function importTasks/);assert.match(js,/function agenda/);});
test('the GitHub snapshot is nonempty, unique and marked as a historical fallback',()=>{
 const inv=JSON.parse(read('gestione/cc-branches-snapshot.json'));
 assert.ok(inv.checked&&Date.parse(inv.checked));
 assert.ok(inv.branches.length>=53);
 assert.equal(new Set(inv.branches.map(x=>x.name)).size,inv.branches.length);
 assert.ok(inv.branches.some(x=>x.name==='main'));
 assert.ok(inv.branches.some(x=>x.name==='feature/case247-control-center-20261115'));
});
test('calendar has acquisition period and excludes manual Sunday tasks',()=>{
 assert.match(js,/slot\(\['09:30','12:30','ACQUISIZIONE/);assert.match(js,/isSunday\(date\)/);assert.match(js,/m>=570&&m<750/);assert.match(js,/>570}/);
 assert.match(js,/case247-cc-tasks-v1/);assert.match(js,/cc-import-file/);
});
test('repository uses namespaced CSS and does not expose the provided CRM sharing URL',()=>{
 assert.match(css,/#case247-control-center/);
 for(const file of [html,js,css]){
  assert.doesNotMatch(file,/1drv\.ms\/x\//i);
  assert.doesNotMatch(file,/ghp_[A-Za-z0-9]{15,}/);
 }
 assert.match(js,/GitHub Pages/);
 assert.match(js,/non collegato/);
});
test('project preview only embeds own Pages origin and external apps open in new tabs',()=>{
 assert.match(js,/url\.startsWith\(BASE\)/);
 assert.match(js,/noopener noreferrer/);
 assert.match(js,/api\.github\.com\/repos/);
 assert.match(js,/per_page=100&page=/);
});
test('acquisition slot is a direct Excel CRM link after local one-time setup',()=>{
 assert.match(js,/function onCrmClick\(e\)/);
 assert.match(js,/kind==='cc-fixed'\?'a':'div'/);
 assert.match(js,/data-cc-crm-link/);
 assert.match(js,/s\.addEventListener\('click',onCrmClick\)/);
 assert.match(js,/a\.href=crmUrl\|\|'#cc-crm'/);
 assert.match(js,/CRMKEY='case247-cc-private-excel-url-v1'/);
 assert.match(js,/window\.location\.assign\(crmUrl\)/);
 assert.match(css,/#case247-control-center a\.cc-slot\.cc-fixed/);
 const match=js.match(/function allowedCrmUrl\(value\)\{[\s\S]*?\n\}/);
 assert.ok(match,'URL validation function must exist');
 const validate=vm.runInNewContext(match[0]+';allowedCrmUrl',{URL});
 assert.equal(validate('http://1drv.ms/x/example'),'');
 assert.equal(validate('https://1drv.ms.evil.example/x/example'),'');
 assert.equal(validate('javascript:alert(1)'),'');
 assert.match(validate('https://1drv.ms/x/c/example'),/^https:\/\/1drv\.ms\//);
 assert.match(validate('https://drive.google.com/file/d/abc'),/^https:\/\/drive\.google\.com\//);
});
