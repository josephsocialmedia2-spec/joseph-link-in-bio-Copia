'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function file(p){return fs.readFileSync(path.join(ROOT,p),'utf8')}
function links(html){return [...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1])}
function resolveLink(from,href){
 if(!href||/^(https?:|mailto:|tel:|javascript:)/i.test(href)||href.startsWith('#'))return null;
 const clean=href.split(/[?#]/)[0];if(!clean)return null;
 const target=path.resolve(ROOT,path.dirname(from),decodeURIComponent(clean));
 assert.ok(target.startsWith(ROOT+path.sep),'Link outside repo: '+href);
 return target.endsWith('/')?path.join(target,'index.html'):(fs.existsSync(target)&&fs.statSync(target).isDirectory()?path.join(target,'index.html'):target);
}
const pages=['gestione/quadro-strumenti/index.html','gestione/quadro-social/index.html','gestione/menu-operativo/index.html','gestione/archivio-branch/index.html'];
for(const page of pages){
 test('Internal links resolve: '+page,()=>{
  const html=file(page);
  assert.match(html,/<!doctype html>/i);
  assert.match(html,/<\/html>/i);
  for(const href of links(html)){const target=resolveLink(page,href);if(target)assert.ok(fs.existsSync(target),'Broken internal link '+page+' -> '+href)}
 });
 test('Inline scripts parse: '+page,()=>{
  const html=file(page);for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){if(m[1].trim())assert.doesNotThrow(()=>new Function(m[1]),'Script parse failure in '+page)}
 });
}
test('Both compact boards are linked from management homepage',()=>{const html=file('gestione/index.html');assert.match(html,/quadro-strumenti\//);assert.match(html,/quadro-social\//);assert.match(html,/case247-legacy-toggle/);});
test('Social board does not assert Meta is live',()=>{const html=file('gestione/quadro-social/index.html');assert.match(html,/COLLEGATO_E_VERIFICATO/);assert.match(html,/non sono test live/);});
