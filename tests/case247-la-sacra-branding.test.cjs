'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','gestione/volantini-premium');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('La Sacra is the exclusive customer-facing brand in flyer studio',()=>{
 const html=read('index.html'),config=read('config.js'),app=read('app.js');
 for(const file of [html,config,app])assert.doesNotMatch(file,/CASE IN PUBBLICITÀ|Case in Pubblicità|Avigliana e territorio circostante|Selezione immobili dal portafoglio La Sacra Immobiliare/);
 assert.match(html,/IMMOBILIARE <span>LA SACRA<\/span>/);
 assert.match(html,/Valle di Susa e territorio torinese/);
 assert.match(config,/brand: 'IMMOBILIARE LA SACRA'/);
 assert.match(app,/Immobili e opportunità · Immobiliare La Sacra/);
 assert.doesNotThrow(()=>new vm.Script(config));
 assert.doesNotThrow(()=>new vm.Script(app));
});