'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const read=(file)=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('la pagina principale include PDF, 10 volantini e modulo guida dopo il catalogo',()=>{
  const html=read('catalogo-premium/index.html');
  for(const id of ['pdfBook','pdfStart','pdfPrev','pdfNext','flyerProducts','guideCount','guideRequest','guideOpen','guidePrivacy','guideMarketing']){
    assert.match(html,new RegExp('id="'+id+'"'),id);
  }
  const catalogue=html.indexOf('<section class="reader"');
  const pdf=html.indexOf('id="catalogo-pdf"');
  const gallery=html.indexOf('id="vetrina-volantini"');
  const guide=html.indexOf('id="guide"');
  assert.ok(catalogue>=0&&pdf>catalogue&&gallery>pdf&&guide>gallery);
  assert.match(html,/campagna-volantini\.css/);
  assert.match(html,/campagna-volantini\.js/);
  assert.match(html,/guida-download\.js/);
  assert.ok(fs.existsSync(path.join(__dirname,'..','catalogo-premium','La_Sacra_Catalogo_Tutti_Immobili.pdf')));
});

test('dieci prodotti fronte/retro e reader PDF con navigazione reale',()=>{
  const src=read('catalogo-premium/campagna-volantini.js');
  assert.equal((src.match(/\{title:/g)||[]).length,10);
  assert.match(src,/\.poster-back/);
  assert.match(src,/getDocument\(/);
  assert.match(src,/\.getPage\(/);
  assert.match(src,/pdf\.numPages/);
  assert.match(src,/touchend/);
  assert.match(src,/setFallback\(/);
  assert.match(src,/withCredentials:false/);
  execFileSync(process.execPath,['--check',path.join(__dirname,'..','catalogo-premium','campagna-volantini.js')]);
});

test('vecchi URL confluiscono in un solo catalogo preservando i collegamenti',()=>{
  const source=read('gestione/volantini-premium/volantino-digitale/index.html');
  const legacy=read('catalogo/index.html');
  assert.match(source,/\/catalogo\/#guide/);
  assert.match(source,/standalone/);
  assert.match(legacy,/window\.location\.search \+ window\.location\.hash/);
  const html=read('catalogo-premium/index.html');
  assert.match(html,/id="guideWebsite"/);
  assert.match(html,/id="guideSubmit"/);
  assert.match(html,/id="guideSuccess"/);
});
