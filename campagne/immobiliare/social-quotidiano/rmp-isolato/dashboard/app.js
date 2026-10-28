"use strict";
(() => {
let cfg, token="", tab="calendar", data={};
const $ = id => document.getElementById(id);
const tables = {
  calendar:["local_date","local_time","platform","status","caption"],
  next:["scheduled_at","platform","status","caption"],
  accounts:["platform","display_name","account_id","verified","token_expires_at","last_error"],
  history:["published_at","platform","remote_id","permalink","status"],
  errors:["scheduled_at","platform","status","last_error"],
  usage:["provider","used","allowance","verified_at","source"]
};
const titles={calendar:"Calendario",next:"Prossime pubblicazioni",accounts:"Connessioni social",history:"Storico pubblicazioni",errors:"Errori e incertezze",usage:"Consumi e soglie",admin:"Impostazioni e sospensione"};
function message(id,text){$(id).textContent=text}
async function call(path,options={}){
 const res=await fetch(cfg.supabaseUrl+path,{...options,headers:{
  apikey:cfg.publishableKey, Authorization:"Bearer "+token, Accept:"application/json",
  "Content-Type":"application/json",...(options.headers||{})}});
 if(!res.ok) throw new Error("Richiesta negata o non disponibile (HTTP "+res.status+")");
 if(res.status===204)return null;
 return res.json();
}
async function load(){
 const queries=[
  ["settings","rmp_settings?select=*"],["posts","rmp_posts?select=*&order=scheduled_at.desc&limit=150"],
  ["accounts","rmp_accounts?select=*"],["usage","rmp_quotas?select=*"],
  ["events","rmp_events?select=*&order=created_at.desc&limit=100"]];
 for(const [name,path] of queries)data[name]=await call("/rest/v1/"+path);
 const control=data.settings[0]||{};
 const state=control.enabled?"Programmazione abilitata":"Pubblicazioni sospese";
 message("stateBadge",state);
 const all=data.posts||[];
 $("metrics").replaceChildren(...[
  ["Previste",all.filter(x=>x.status==="READY").length],
  ["Pubblicate",all.filter(x=>x.status==="PUBLISHED").length],
  ["Incerte",all.filter(x=>x.status==="UNCERTAIN"||x.status==="CLAIMED").length],
  ["Account verificati",(data.accounts||[]).filter(x=>x.verified).length+"/3"]
 ].map(([title,value])=>{const cell=document.createElement("div");cell.className="stat";
  const strong=document.createElement("strong");strong.textContent=value;
  const caption=document.createElement("span");caption.textContent=title;cell.append(strong,caption);return cell;}));
 draw();
}
function textNode(tag,value,klass){
 const el=document.createElement(tag);el.textContent=(value===undefined||value===null||value==="")?"—":String(value);
 if(klass)el.className=klass;return el;
}
function makeTable(rows,cols){
 if(!rows.length)return textNode("p","Nessun dato disponibile o nessuna voce registrata.");
 const table=document.createElement("table");table.className="grid-table";
 const thead=document.createElement("thead"),tr=document.createElement("tr");
 cols.forEach(c=>tr.appendChild(textNode("th",({caption:"Testo",status:"Stato",platform:"Canale",local_date:"Data",local_time:"Ora",scheduled_at:"Programmato",published_at:"Pubblicato",last_error:"Dettaglio",provider:"Servizio",allowance:"Limite",used:"Utilizzo",verified_at:"Verificato il",source:"Fonte"}[c]||c))));
 thead.appendChild(tr);table.appendChild(thead);const tbody=document.createElement("tbody");
 rows.forEach(row=>{const tr=document.createElement("tr");cols.forEach(c=>{
 const td=document.createElement("td");const value=row[c];td.textContent=(value===null||value===undefined||value==="")?"—":String(value);
 if(c==="caption")td.className="caption";
 if(c==="permalink"&&/^https:\/\//.test(value||"")){td.replaceChildren();const link=document.createElement("a");link.href=value;link.textContent="Apri pubblicazione";link.rel="noopener noreferrer";link.target="_blank";td.append(link);}
 tr.appendChild(td);});tbody.appendChild(tr)});table.appendChild(tbody);return table;
}
function addText(container,kind,content){container.appendChild(textNode(kind,content))}
function draw(){
 message("tabTitle",titles[tab]);const root=$("content");root.replaceChildren();
 const posts=data.posts||[];
 if(tab==="admin"){
  const setting=data.settings?.[0]||{};
  addText(root,"p","La sospensione è immediata a livello logico: eventuali pubblicazioni già inviate alle API non possono essere annullate.");
  addText(root,"p","Stato: "+(setting.enabled?"abilitato":"sospeso")+" · Diritti verificati: "+(setting.rights_verified?"Sì":"No")+" · Prova verificata: "+(setting.live_test_verified?"Sì":"No"));
  const row=document.createElement("div");row.className="actions";
  const pause=document.createElement("button");pause.textContent="Sospendi pubblicazioni";pause.disabled=!setting.enabled;
  pause.onclick=()=>change(false);
  const resume=document.createElement("button");resume.className="ghost";resume.textContent="Riprendi pubblicazioni";resume.disabled=!!setting.enabled;
  resume.onclick=()=>change(true);row.append(pause,resume);root.append(row);
  const p=textNode("p","Riesumare non bypassa il controllo diritti, le quote, gli account o la verifica della prova.");p.className="hint";root.append(p);return;
 }
 const rows=tab==="calendar"?[...posts].reverse():
  tab==="next"?posts.filter(x=>x.status==="READY").sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)):
  tab==="history"?posts.filter(x=>x.status==="PUBLISHED"):
  tab==="errors"?posts.filter(x=>["UNCERTAIN","CLAIMED","BLOCKED","RETRYABLE"].includes(x.status)):
  tab==="accounts"?data.accounts||[]:
  tab==="usage"?data.usage||[]:[];
 root.append(makeTable(rows,tables[tab]));
 if(tab==="usage"){const note=textNode("p","Soglia 70%: avviso. Soglia 80%: blocco operazioni non essenziali. Quota non verificata: SCONOSCIUTA.");note.className="hint";root.append(note);}
 if(tab==="accounts")addText(root,"p","I token rimangono esclusivamente sul server GitHub Actions; il pannello mostra soltanto dati di verifica.");
}
async function change(enabled){
 if(!window.confirm(enabled?"Richiedere ripresa dei nuovi slot? Restano obbligatori i controlli di sicurezza.":"Sospendere gli slot non ancora inviati?"))return;
 try{await call("/rest/v1/rmp_settings?singleton=eq.true",{method:"PATCH",body:JSON.stringify({enabled}),headers:{"Prefer":"return=minimal"}});await load();}
 catch(e){alert(e.message)}
}
async function authenticate(e){
 e.preventDefault();message("loginError","");
 try{
  const res=await fetch(cfg.supabaseUrl+"/auth/v1/token?grant_type=password",{
   method:"POST",headers:{"apikey":cfg.publishableKey,"Content-Type":"application/json"},
   body:JSON.stringify({email:$("email").value,password:$("password").value})});
  if(!res.ok)throw new Error("Accesso non riuscito");
  const result=await res.json();token=result.access_token;$("password").value="";
  const authorized=await call("/rest/v1/rmp_admins?select=user_id&limit=1");
  if(!authorized.length)throw new Error("Utente non autorizzato alla dashboard");
  $("loginBox").hidden=true;$("app").hidden=false;$("logout").hidden=false;
  await load();
 }catch(err){token="";$("loginBox").hidden=false;$("app").hidden=true;$("logout").hidden=true;message("loginError",err.message)}
}
function logout(){token="";data={};$("loginBox").hidden=false;$("app").hidden=true;$("logout").hidden=true;message("stateBadge","Non collegato")}
$("loginForm").addEventListener("submit",authenticate);
$("logout").addEventListener("click",logout);
$("refresh").addEventListener("click",async()=>{try{await load()}catch(err){alert(err.message)}});
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("selected",x===b));draw()}));
fetch("./public-config.json").then(r=>r.json()).then(c=>{
 cfg=c;if(!/^https:\/\//.test(c.supabaseUrl)||!c.publishableKey){
 message("loginError","Configurazione del nuovo progetto isolato non ancora disponibile. Accesso disabilitato.");$("loginForm").querySelector("button").disabled=true;
 }}).catch(()=>message("loginError","Configurazione non accessibile."));
})();