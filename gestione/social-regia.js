/* REAL MEDIA PRO — Regia social e gruppi. Solo dati pubblici. Nessun OAuth in GitHub Pages. */
(function(){
"use strict";
var endpoint="./social-routing.json";
var key="rmp-social-groups-register-v1";
var iconNames=["facebook","instagram","linkedin"];
var root=document.querySelector(".stats"), top=document.querySelector(".topactions");
if(!root)return;
var style=document.createElement("style");
style.textContent=`
#social-regia{margin:0 0 23px;padding:20px;scroll-margin-top:16px}
#social-regia .routingCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:15px 0}
#social-regia .routingCard{padding:16px;border:1px solid #35516a;border-radius:12px;background:#14293c}
#social-regia h2{margin:4px 0 8px}#social-regia h3{margin:0 0 8px;font-size:17px}
#social-regia .routingSmall{font-size:12px;color:#abc5d5;margin:5px 0 12px}
#social-regia .routingChannels{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}
#social-regia .routingChannels a,#social-regia .routingChannels span{font-size:12px;display:inline-block;padding:6px 10px;border:1px solid #43637b;border-radius:7px;color:#e6f4fa}
#social-regia .routingChannels a:hover{background:#234962}
#social-regia .routingWarning{padding:10px 13px;border-radius:9px;border:1px solid #796844;background:#342c1a;color:#ffe3b2;font-size:12px}
#social-regia .routingGroups{border-top:1px solid #365066;padding-top:16px;margin-top:16px}
#social-regia .groupFields{display:grid;grid-template-columns:1fr 1fr 2fr 2fr auto;gap:8px;align-items:end}
#social-regia label{display:block;font-size:12px;color:#c9ddec}
#social-regia select,#social-regia input{display:block;width:100%;padding:8px;background:#0d1927;color:#ebf3fa;border:1px solid #35516a;border-radius:7px;margin-top:5px}
#social-regia .groupsList{display:grid;gap:8px;margin-top:12px}
#social-regia .groupLine{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;padding:8px;border:1px solid #324d66;border-radius:8px}
#social-regia .groupLine strong{font-size:12px}
#social-regia .groupLine small{font-size:11px;color:#a2b9c9}
#social-regia .groupLine a,#social-regia .groupLine button{padding:6px 9px;border-radius:7px;font-size:12px;background:#1a3b50;border:1px solid #42637b;color:white;cursor:pointer}
@media(max-width:780px){#social-regia .routingCards{grid-template-columns:1fr}#social-regia .groupFields{grid-template-columns:1fr 1fr}#social-regia .groupFields>label:nth-child(3),#social-regia .groupFields>label:nth-child(4){grid-column:1/-1}}
`;
document.head.appendChild(style);
function esc(x){return String(x==null?"":x).replace(/[&<>"']/g,function(z){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[z]})}
function validSocial(platform,raw){
 try{var u=new URL(raw),h=u.hostname.toLowerCase(),host=platform+".com";if(platform==="linkedin")host="linkedin.com";if(platform==="facebook")host="facebook.com";
 return u.protocol==="https:"&&(h===host||h.endsWith("."+host))&&u.pathname!=="/"?u.href:"";
 }catch(e){return ""}
}
function reg(){try{var x=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(x)?x:[]}catch(e){return []}}
function save(a){try{localStorage.setItem(key,JSON.stringify(a));return true}catch(e){alert("Impossibile salvare nel browser. Esporta il registro.");return false}}
var panel=document.createElement("section");panel.id="social-regia";panel.className="panel";
panel.setAttribute("aria-label","Canali e gruppi social per le due linee di promozione");
panel.innerHTML='<div class="eyebrow">DISTRIBUZIONE DELLE LANDING</div><h2>Canali e gruppi social</h2><p class="routingSmall">48 pagine censite: 39 landing commerciali, 6 pagine di supporto associate alle linee e 3 pagine tecniche escluse. Gli URL dei profili non dimostrano l’autenticazione tramite API.</p><div id="rmpEditorialBatch" class="routingCard" style="margin:12px 0">Coda editoriale: caricamento riepilogo…</div><div class="routingCards" id="socialRoutingCards">Caricamento dei collegamenti…</div><p class="routingWarning">I gruppi Facebook non supportano la pubblicazione automatica tramite le vecchie API. Prima di pubblicare occorre verificare l’iscrizione, le regole e l’eventuale approvazione degli amministratori. Non condividere password o token qui.</p><div class="routingGroups"><h3>Registro dei gruppi</h3><p class="routingSmall">Registra soltanto gruppi pertinenti. Il pulsante «Apri gruppo» permette di richiedere personalmente l’iscrizione; non viene simulata alcuna adesione.</p><form id="socialGroupForm" class="groupFields"><label>Campagna<select name="line"><option value="imprese">Imprese</option><option value="immobiliare">Immobiliare</option></select></label><label>Social<select name="platform"><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option></select></label><label>Nome del gruppo<input name="name" type="text" required maxlength="130" placeholder="Nome effettivo del gruppo"></label><label>Link del gruppo<input name="url" type="url" required placeholder="https://www.facebook.com/groups/..."></label><button class="btn primary" type="submit">Registra</button></form><div class="groupsList" id="socialGroupsList"></div><div class="topactions" style="margin-top:12px"><button type="button" class="btn" id="exportGroupRegister">Esporta registro CSV</button><a class="btn outline" href="https://www.facebook.com/groups/feed/" target="_blank" rel="noopener noreferrer">Cerca gruppi Facebook ↗</a><a class="btn outline" href="https://www.linkedin.com/groups/" target="_blank" rel="noopener noreferrer">Cerca gruppi LinkedIn ↗</a></div></div>';
root.insertAdjacentElement("afterend",panel);
var topNav=document.querySelector(".topbar .topactions");
if(topNav){var a=document.createElement("a");a.className="btn outline";a.href="#social-regia";a.textContent="Social e gruppi";topNav.insertBefore(a,topNav.firstChild)}
fetch("./editorial-batch-status.json",{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(function(snapshot){
 var q=snapshot.queue||{},scope=snapshot.scope||{},node=document.getElementById("rmpEditorialBatch");
 if(!node||!Number.isInteger(q.total)||!Number.isInteger(scope.promotional_pages))throw Error("Missing batch summary");
 node.textContent="Coda editoriale — "+q.total+" bozze su "+scope.promotional_pages+" pagine | Facebook "+(q.platforms.facebook||0)+" · Instagram "+(q.platforms.instagram||0)+" · LinkedIn "+(q.platforms.linkedin||0)+" | nessuna pubblicazione attiva. Fotografia del "+snapshot.snapshot_date+", non dati in tempo reale.";
}).catch(function(){var node=document.getElementById("rmpEditorialBatch");if(node)node.textContent="Coda editoriale: riepilogo non disponibile. Verifica direttamente il database Supabase.";});
var rows=JSON.parse(document.getElementById("landing-data").textContent);
fetch(endpoint,{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(function(data){
 var counts={imprese:0,immobiliare:0},rr=data.routing;
 rows.forEach(function(row){
  if((rr.internal_only||[]).includes(row.id)||(rr.service_no_campaign||[]).includes(row.id))return;
  var line=(rr.overrides||{})[row.id]||(rr.sector_map||{})[row.sector]||rr.default;
  if(counts[line]!==undefined)counts[line]++;
 });
 document.getElementById("socialRoutingCards").innerHTML=["imprese","immobiliare"].map(function(k){
  var line=data.lines[k],links=iconNames.map(function(ch){
   var x=line.profiles[ch],url=validSocial(ch,x?.url||"");
   var caption=ch==="facebook"?"Facebook":ch==="instagram"?"Instagram":"LinkedIn";
   return url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" title="URL presente: API da autorizzare">'+caption+' ↗</a>':'<span>'+caption+' · mancante</span>';
  }).join("");
  return '<article class="routingCard"><h3>'+esc(line.label)+'</h3><p class="routingSmall"><strong>'+counts[k]+' pagine associate</strong> ('+(k==="immobiliare"?"21 landing e 4 pagine di supporto":"18 landing e 2 pagine di supporto")+') · '+esc(line.goal)+'</p><div class="routingChannels">'+links+'</div><p class="routingSmall">Stato: URL registrati; OAuth e pubblicazioni non verificati'+(line.partner?' · '+esc(line.partner):"")+'</p></article>';
 }).join("");
}).catch(function(){document.getElementById("socialRoutingCards").textContent="Impossibile leggere gestione/social-routing.json. Verificare il file GitHub."});
function validGroupUrl(url,p){
 try{var u=new URL(url);if(u.protocol!=="https:")return "";
 var host=u.hostname.toLowerCase();
 if(p==="facebook"&&(host==="facebook.com"||host==="www.facebook.com"||host==="m.facebook.com")&&u.pathname.startsWith("/groups/"))return u.href;
 if(p==="linkedin"&&(host==="linkedin.com"||host==="www.linkedin.com")&&u.pathname.startsWith("/groups/"))return u.href;
 return "";
 }catch(e){return ""}
}
function paintGroups(){
 var all=reg();
 document.getElementById("socialGroupsList").innerHTML=all.length?all.map(function(g,i){
  return '<div class="groupLine"><div><strong>'+esc(g.name)+'</strong><div><small>'+esc(g.line==="imprese"?"Imprese":"Immobiliare")+' · '+esc(g.platform)+' · adesione e promozioni ancora da verificare</small></div></div><div><a href="'+esc(g.url)+'" target="_blank" rel="noopener noreferrer">Apri gruppo ↗</a> <button type="button" data-group-remove="'+i+'">Elimina</button></div></div>';
 }).join(""):'<p class="routingSmall">Nessun gruppo registrato. Cerca gruppi pertinenti e verifica le regole prima di condividerci le landing.</p>';
}
document.getElementById("socialGroupForm").addEventListener("submit",function(e){
 e.preventDefault();var f=e.target,p=f.elements.platform.value,link=validGroupUrl(f.elements.url.value,p);
 if(!link){alert("Inserisci un link reale a un gruppo Facebook o LinkedIn.");return}
 var all=reg();
 if(all.some(function(x){return x.url===link})){alert("Gruppo già registrato.");return}
 all.push({line:f.elements.line.value,platform:p,name:f.elements.name.value.trim(),url:link,status:"DA_VERIFICARE"});
 if(save(all)){f.reset();paintGroups()}
});
document.getElementById("socialGroupsList").addEventListener("click",function(e){
 var b=e.target.closest("[data-group-remove]");if(!b)return;
 if(!confirm("Eliminare questo gruppo dal registro locale?"))return;
 var all=reg();all.splice(Number(b.dataset.groupRemove),1);if(save(all))paintGroups();
});
document.getElementById("exportGroupRegister").addEventListener("click",function(){
 var data=[["Campagna","Piattaforma","Gruppo","URL","Stato iscrizione","Promozioni ammesse","Approvazione admin","Data verifica"]];
 reg().forEach(function(g){data.push([g.line,g.platform,g.name,g.url,"DA_VERIFICARE","DA_VERIFICARE","DA_VERIFICARE",""])});
 var csv="\uFEFF"+data.map(function(line){return line.map(function(v){return '"'+String(v||"").replace(/"/g,'""')+'"'}).join(";")}).join("\r\n")+"\r\n";
 var blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="rmp-registro-gruppi.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
});
paintGroups();
})();
