#!/usr/bin/env node
'use strict';
// Safe static preview. SQLite remains available in the Codespaces laboratory.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),dest=path.join(root,'.staging-preview');
const prefix='joseph-link-in-bio-Copia';
const dirs=['gestione','catalogo-premium','catalogo','newsletter','assets','immobili','paesi','campagne'];
const ext=new Set(['.html','.css','.js','.mjs','.json','.svg','.png','.jpg','.jpeg','.webp','.gif','.ico','.pdf','.woff','.woff2']);
const blocked=/(^|\/)(?:\.|node_modules|__pycache__|supabase|secret|credential|token|private|backup|database|analytics|leads|contacts|contatti|clienti|password|settings|api-keys)/i;
const jsonOK=/^(?:gestione\/rivista\/edizioni\/auto\/latest\.json|gestione\/rivista\/data\/approved\.json|immobili\/catalogo\.json|catalogo-premium\/immobili-verificati\.json|gestione\/social-routing\.json|gestione\/social-links\.json)$/;
function walk(src,out,relative){
  if(!fs.existsSync(src))return;
  for(const ent of fs.readdirSync(src,{withFileTypes:true})){
    const rel=relative+'/'+ent.name,full=path.join(src,ent.name);
    if(ent.isSymbolicLink()||ent.name.startsWith('.')||blocked.test(rel))continue;
    if(ent.isDirectory()){walk(full,path.join(out,ent.name),rel);continue}
    if(!ent.isFile()||!ext.has(path.extname(ent.name).toLowerCase())||fs.statSync(full).size>8*1024*1024)continue;
    if(path.extname(ent.name).toLowerCase()==='.json'&&!jsonOK.test(rel))continue;
    const target=path.join(out,ent.name);fs.mkdirSync(path.dirname(target),{recursive:true});
    if(path.extname(ent.name).toLowerCase()==='.html'){
      const raw=fs.readFileSync(full,'utf8');
      const tag='<script src="/__staging__/read-only-guard.js" defer></script>';
      fs.writeFileSync(target,/<\/head>/i.test(raw)?raw.replace(/<\/head>/i,tag+'</head>'):tag+raw);
    }else fs.copyFileSync(full,target);
  }
}
fs.rmSync(dest,{recursive:true,force:true});
for(const dir of dirs)walk(path.join(root,dir),path.join(dest,prefix,dir),dir);
// Explicitly audited *public* display assets that generic filters would omit.
// Do not add state/ledger/approval drafts, contact records, or private config.
const publicExtras=[
  'case247-design.css',
  'gestione/acquisizione-farming/contatti-foglio.css',
  'gestione/acquisizione-farming/contatti-foglio.js',
  'gestione/acquisizione-farming/contatti-normalizza.js',
  'gestione/acquisizione-farming/omi-avigliana-2026-1.json',
  'gestione/rivista/edizioni/index.json',
  'gestione/tutte-le-pagine/pagine.json'
];
for(const rel of publicExtras){
  const source=path.join(root,rel);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile()||
     fs.statSync(source).size>8*1024*1024)throw Error('Missing safe preview asset: '+rel);
  const target=path.join(dest,prefix,rel);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
}
const labDir=path.join(dest,'__staging__');fs.mkdirSync(labDir,{recursive:true});
let portal=fs.readFileSync(path.join(root,'tools/staging/index.html'),'utf8');
portal=portal.replace('Le API esterne sono bloccate; soltanto la API SQLite sintetica locale accetta modifiche a contatti inventati. Non inserire mai dati personali reali.',
'Questa è una anteprima WEB statica. Il database SQLite sintetico è attivo solo nel Codespace privato, non su Vercel. Non inserire dati reali.')
.replace('<b>Importante:</b> le pagine del gestionale mostrano il codice del repository e non sono ancora sincronizzate con il CRM di produzione. Il nuovo simulatore dispone di un database SQLite separato, esclusivamente con contatti TEST.',
'<b>Importante:</b> questa anteprima Vercel mostra le pagine in sola lettura. Il CRM SQLite e la pipeline interattiva sono disponibili solo nel Codespace, non su questo hosting statico.')
.replace('href="/__staging__/funnel.html">Apri il funnel interattivo',
'href="/__staging__/funnel.html">Avvia il funnel nel Codespace');
portal=portal.replace(/<\/head>/i,'<script src="/__staging__/read-only-guard.js" defer></script></head>');
fs.writeFileSync(path.join(labDir,'index.html'),portal);
fs.copyFileSync(path.join(root,'tools/staging/read-only-guard.js'),path.join(labDir,'read-only-guard.js'));
const codespaces='https://github.com/codespaces/new?hide_repo_select=true&ref=test%2Fztd-full-staging-lab-20261122&repo=1431333923';
const message='<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Funnel TEST — Codespaces</title><script src="/__staging__/read-only-guard.js" defer></script><style>body{background:#eff4f8;color:#0a2945;font:16px/1.6 Arial,sans-serif;max-width:750px;margin:45px auto;padding:20px}section{background:white;padding:30px;border-top:5px solid #bd9c54}a{color:#0a4a79}</style></head><body><section><h1>Funnel CRM sintetico — laboratorio completo</h1><p>Questa anteprima Vercel è <strong>statica e di sola lettura</strong>. Il database SQLite e i test del percorso richiesta → CRM → agente → KPI non vengono eseguiti su Vercel.</p><p>Per utilizzare il funnel operativo con dati TEST e persistenza locale, apri il <a href="'+codespaces+'">Codespace privato del progetto</a>, avvia la porta 8765 e visita <code>/__staging__/funnel.html</code>.</p><p><a href="/__staging__/">Torna all’indice dei moduli</a></p></section></body></html>';
fs.writeFileSync(path.join(labDir,'funnel.html'),message);
let count=0,bytes=0;
(function total(p){for(const ent of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,ent.name);if(ent.isDirectory())total(f);else{count++;bytes+=fs.statSync(f).size}}})(dest);
console.log(JSON.stringify({files:count,bytes,staticPreview:true}));
if(count<100||bytes<1000000)throw Error('Incomplete staging export');
