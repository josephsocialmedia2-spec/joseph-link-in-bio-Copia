const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('gestione/index.html'),js=read('gestione/control-center.js'),css=read('gestione/control-center.css');
test('the control center is integrated into the existing dashboard, once',()=>{
 assert.equal((html.match(/id="case247-control-center"/g)||[]).length,1);
 assert.match(html,/control-center\.js\?v=20261120-farming1/);
 assert.match(html,/control-center\.css\?v=20261115-studio-2scat/);
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

test('Agenda is structurally first and preserves the original dashboard and local persistence',()=>{
 const app=html.indexOf('id="case247-control-center"');
 const boards=html.indexOf('id="case247-two-boards"');
 const acquisition=html.indexOf('id="sv-acquisizione"');
 assert.ok(acquisition>=0&&app>acquisition&&boards>app,'Acquisition must precede Control Center and two boards');
 assert.doesNotMatch(html,/<header id="case247-site-header">/);
 assert.equal((html.match(/id="case247-control-center"/g)||[]).length,1);
 assert.ok(js.indexOf("'<section id=\"cc-calendar\"")<js.indexOf("'<div class=\"cc-stats\""));
 assert.ok(js.indexOf("'<section id=\"cc-calendar\"")<js.indexOf("'<section id=\"cc-overview\""));
 assert.ok(js.indexOf("'<section id=\"cc-crm\"")<js.indexOf("'<section id=\"cc-overview\""));
 assert.equal((js.match(/id="cc-new"/g)||[]).length,1);
 assert.match(js,/case247-cc-tasks-v1/);
 assert.match(js,/case247-cc-private-excel-url-v1/);
 assert.match(js,/CASE247StudioUI\.mount/);
 assert.match(js,/function ics\(\)/);
 assert.match(js,/function importTasks/);
});
test('Mobile Agenda has a real single-day picker and responsive CSS',()=>{
 assert.match(js,/id="cc-day-nav"/);
 assert.match(js,/cc-active-day/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/function resetMobileDay/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/\.cc-day\.cc-active-day\{display:block\}/);
 assert.match(css,/\.cc-week\{grid-template-columns:1fr!important\}/);
 assert.match(js,/href="#cc-studio"/);
 assert.match(js,/href="#cc-crm"/);
});

test('The Perché ticker is first above Agenda and uses localStorage without HTML injection',()=>{
 const widget=html.indexOf('id="perche-widget"');
 const acquisition=html.indexOf('id="sv-acquisizione"');
 const agenda=html.indexOf('id="case247-control-center"');
 assert.ok(widget>=0&&acquisition>widget&&agenda>acquisition);
 assert.equal((html.match(/id="perche-widget"/g)||[]).length,1);
 assert.match(html,/id="perche-form"/);
 assert.match(html,/id="input-perche"/);
 assert.match(html,/id="ticker-container"/);
 assert.match(html,/perche-widget\.js\?v=/);
 assert.match(html,/perche-widget\.css\?v=/);
 const ticker=read('gestione/perche-widget.js');
 const tickerCss=read('gestione/perche-widget.css');
 assert.doesNotThrow(()=>new vm.Script(ticker));
 assert.match(ticker,/KEY='mieiPerche'/);
 assert.match(ticker,/localStorage\.setItem\(KEY,JSON\.stringify\(next\)\)/);
 assert.match(ticker,/text\.textContent=contenuto/);
 assert.doesNotMatch(ticker,/innerHTML\s*=/);
 assert.match(ticker,/new Intl\.DateTimeFormat\('it-IT'/);
 assert.match(tickerCss,/prefers-reduced-motion:reduce/);
 assert.match(tickerCss,/#perche-widget/);
});

test('Horizontal dashboard shows all six days and moves the 14 selling pillars above the agenda',()=>{
 const layout=read('gestione/layout-orizzontale.css');
 const pillars=read('gestione/pilastri-vendite-agenda.js');
 assert.match(layout,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(layout,/\.cc-sidebar\{display:flex!important/);
 assert.match(layout,/\.pilastri-gruppi\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(pillars,/control\.parentNode\.insertBefore\(aside, control\)/);
 assert.match(html,/layout-orizzontale\.css\?v=/);
 assert.match(html,/sv-acquisizione\.js\?v=/);
 assert.match(html,/pilastri-vendite-agenda\.js\?v=/);
 assert.doesNotMatch(html,/<header id="case247-site-header">/);
});
