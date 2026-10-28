(function(){
"use strict";
var here=document.getElementById("social-regia"), node=document.getElementById("landing-data");
if(!here||!node)return;
var BASE="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/";
var API="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/rmp-public-status";
var box=document.createElement("section");
box.id="social-queue";box.className="panel";box.style.cssText="margin:18px 0;padding:20px;scroll-margin-top:16px";
box.innerHTML='<div class="eyebrow">SUPABASE · REGIA EDITORIALE</div>'+
'<h2>Calendario unico delle campagne</h2><p class="routingSmall">45 landing promozionali · 3 piattaforme · 135 proposte. <strong>Non sono pubblicazioni automatiche.</strong></p>'+
'<p id="sq-live" class="routingSmall">Verifica coda Supabase…</p>'+
'<div class="sq-controls"><label>Settore<select id="sq-track"><option value="all">Entrambi</option><option value="imprese">Imprese</option><option value="immobiliare">Immobiliare</option></select></label>'+
'<label>Canale<select id="sq-channel"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option></select></label>'+
'<label>Data<select id="sq-date"><option value="all">Tutte le date</option></select></label>'+
'<button id="sq-export" type="button">Esporta 135 caption CSV</button></div>'+
'<p id="sq-count" class="routingSmall"></p><div id="sq-results" class="sq-list"></div>'+
'<p class="routingWarning">Questa è una vista editoriale basata sul catalogo pubblico. Lo stato numerico arriva da Supabase. Tutte le caption devono essere revisionate: Instagram richiede un file media. Nessuna autorizzazione o pubblicazione è attiva.</p>';
here.insertAdjacentElement("afterend",box);
var styles=document.createElement("style");
styles.textContent="#social-queue .sq-controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}#social-queue .sq-controls select{display:block;min-width:140px;max-width:230px;background:#101d2b;color:white;border:1px solid #47718d;border-radius:6px;padding:8px;margin-top:4px}#social-queue .sq-controls button,#social-queue .sq-card button{background:#225773;color:white;cursor:pointer;border:1px solid #4e809f;border-radius:8px;padding:9px}#social-queue .sq-controls button{align-self:end}#social-queue .sq-list{display:grid;gap:12px}#social-queue .sq-card{padding:12px 15px;border:1px solid #35516a;border-radius:10px;background:#102538}#social-queue .sq-caption{white-space:pre-wrap;overflow-wrap:anywhere;max-height:165px;overflow:auto;background:#071723;padding:12px;border-radius:6px;font-size:12px;line-height:1.55}#social-queue .sq-detail{color:#acc9dc;font-size:12px}#social-queue .sq-card a{color:#a8dfff;margin-left:11px}";
document.head.appendChild(styles);
var byId=function(id){return document.getElementById(id)};
var esc=function(t){return String(t==null?"":t).replace(/[&<>"']/g,function(x){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]})};
var title=function(p){return {"facebook":"Facebook","instagram":"Instagram","linkedin":"LinkedIn"}[p]};
var rows=[], slots=["10:00","16:00","20:00"];
function caption(x,p){
if(x.id==="HOME"){
var txt="Come può un'attività locale ottenere più richieste?\n\nREAL MEDIA PRO propone strategie di marketing per imprese: contenuti, siti, video, promozioni territoriali e analisi dei risultati.\n\n";
if(p==="instagram")return txt+"Scrivici in DM per ricevere le guide. WhatsApp 371 370 8294.";
return txt+"Scopri le guide: "+BASE+"scopri/\nPer informazioni: WhatsApp 371 370 8294.";
}
var body=x.question+"\n\n"+x.answer+"\n\n"+x.action;
if(p==="instagram")return body+"\n\nRichiedi il link alla guida in DM o su WhatsApp 371 370 8294.";
if(p==="linkedin")return body+"\n\nApprofondimento: "+x.url+"\nContatto: WhatsApp 371 370 8294.";
return body+"\n\nLeggi la guida: "+x.url+"\nPer informazioni: WhatsApp 371 370 8294.";
}
function show(){
var track=byId("sq-track").value,p=byId("sq-channel").value,date=byId("sq-date").value;
var filtered=rows.filter(function(x){return (track==="all"||x.track===track)&&(date==="all"||x.date===date)});
byId("sq-count").textContent=filtered.length+" proposte visualizzate · "+title(p)+" · orario italiano";
byId("sq-results").innerHTML=filtered.map(function(x){
return '<article class="sq-card"><strong>'+esc(x.id)+" · "+esc(x.title)+'</strong><p class="sq-detail">'+esc(x.date)+" · "+esc(x.hour)+" · "+esc(x.track)+" · DRAFT</p>"+
'<div class="sq-caption">'+esc(caption(x,p))+'</div>'+
(p==="instagram"?'<p class="sq-detail">Serve un’immagine o un video.</p>':"")+
'<p><button type="button" data-copy="'+esc(x.id)+'">Copia caption</button><a target="_blank" rel="noopener noreferrer" href="'+esc(x.url)+'">Apri landing</a></p></article>';
}).join("")||"<p>Nessuna bozza con questi filtri.</p>";
}
function cell(x){var v=String(x==null?"":x);if(/^\s*[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'}
function download(){
if(!rows.length)return;
var csv=[["Data","Ora Italia","Settore","Canale","Landing","Titolo","URL","Stato iniziale","Caption proposta"]];
rows.forEach(function(x){["facebook","instagram","linkedin"].forEach(function(p){csv.push([x.date,x.hour,x.track,p,x.id,x.title,x.url,"DRAFT",caption(x,p)])})});
var url=URL.createObjectURL(new Blob(["\uFEFF"+csv.map(function(r){return r.map(cell).join(";")}).join("\r\n")+"\r\n"],{type:"text/csv;charset=utf-8"}));
var link=document.createElement("a");link.href=url;link.download="REAL_MEDIA_PRO_135_PROPOSTE_SOCIAL.csv";document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);
}
byId("sq-track").addEventListener("change",show);byId("sq-channel").addEventListener("change",show);byId("sq-date").addEventListener("change",show);byId("sq-export").addEventListener("click",download);
byId("sq-results").addEventListener("click",function(e){
var b=e.target.closest("button[data-copy]");if(!b)return;var x=rows.find(function(r){return r.id===b.dataset.copy});if(!x)return;
navigator.clipboard.writeText(caption(x,byId("sq-channel").value)).then(function(){b.textContent="Copiato";setTimeout(function(){b.textContent="Copia caption"},1500)}).catch(function(){b.textContent="Copia non riuscita"});
});
Promise.all([
fetch("./piano-editoriale/pagine.json").then(function(r){if(!r.ok)throw Error("Piano editoriale");return r.json()}),
fetch("./social-routing.json").then(function(r){if(!r.ok)throw Error("Instradamento");return r.json()})
]).then(function(all){
var ed=new Map(all[0].records.map(function(x){return [x.id,x]})),routing=all[1].routing,ban=new Set(routing.internal_only.concat(routing.service_no_campaign));
var items=JSON.parse(node.textContent).filter(function(x){return !ban.has(x.id)}).map(function(x){
var e=ed.get(x.id)||{question:"Quale guida può aiutare la tua attività?",answer:"Il catalogo offre percorsi per imprese e promozione immobiliare.",action:"Esplora il catalogo e contattaci."};
var track=routing.overrides[x.id]||routing.sector_map[x.sector]||routing.default;
return {id:x.id,title:x.title,track:track,url:BASE+x.path,question:e.question,answer:e.answer,action:e.action};
});
var im=items.filter(function(x){return x.track==="immobiliare"}),biz=items.filter(function(x){return x.track==="imprese"}),ordered=[];
for(var k=0;k<Math.max(im.length,biz.length);k++){if(im[k])ordered.push(im[k]);if(biz[k])ordered.push(biz[k]);}
if(ordered.length!==45)throw Error("Conteggio landing non valido");
rows=ordered.map(function(x,i){var d=new Date(Date.UTC(2026,9,29+Math.floor(i/3))).toISOString().slice(0,10);return Object.assign({},x,{date:d,hour:slots[i%3]})});
var dates=Array.from(new Set(rows.map(function(x){return x.date})));
byId("sq-date").innerHTML='<option value="all">Tutte le date</option>'+dates.map(function(d){return '<option value="'+d+'">'+d+'</option>'}).join("");
show();
}).catch(function(e){byId("sq-count").textContent="Catalogo non disponibile: "+e.message});
fetch(API,{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(function(d){
if(d.source!=="SUPABASE_LIVE"||typeof d.total!=="number")throw Error("Dati incompleti");
byId("sq-live").textContent="Supabase LIVE · "+d.total+" job · bozze "+(d.status.DRAFT||0)+" · pubblicati "+d.published+" · Facebook "+d.platforms.facebook+" · Instagram "+d.platforms.instagram+" · LinkedIn "+d.platforms.linkedin+" · motore "+(d.dispatcher_enabled?"ABILITATO":"SOSPESO")+" · account API verificati "+d.verified_profiles+" · video pronti "+d.ready_videos;
}).catch(function(){byId("sq-live").textContent="Supabase non raggiungibile dal browser. Ultima verifica: 135 bozze, 0 pubblicazioni (28 ottobre 2026)."});
var top=document.querySelector(".topactions");if(top){var a=document.createElement("a");a.href="#social-queue";a.textContent="Calendario social · 135 bozze";a.style.cssText="display:inline-block;padding:8px 10px;border-radius:7px;border:1px solid #47718d;color:white;text-decoration:none";top.appendChild(a)}
})();