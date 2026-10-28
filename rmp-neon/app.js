"use strict";
import { createClient } from "https://esm.sh/@neondatabase/neon-js@0.9.0-beta?bundle";

const $ = id => document.getElementById(id);
const labels = {
  calendar:"Calendario",next:"Prossime",accounts:"Connessioni",
  history:"Storico",errors:"Errori",usage:"Consumi",admin:"Impostazioni"
};
const cols = {
  calendar:["local_date","local_time","platform","status","caption"],
  next:["scheduled_at","platform","status","caption"],
  accounts:["platform","display_name","verified","token_expires_at","last_error"],
  history:["published_at","platform","remote_id","permalink","status"],
  errors:["scheduled_at","platform","status","last_error"],
  usage:["provider","used","allowance","verified_at","source"]
};
let client = null;
let currentTab = "calendar";
let data = {};
let activeUser = null;
let selectedDate = "";
const PAGE_SIZE = 9;
const pages = {next:0,history:0,errors:0};

function msg(s){ $("loginError").textContent = String(s || ""); }
function setStatus(s){ $("stateBadge").textContent = s; }
function display(root){for(const id of ["loginBox","approvalBox","app"])$(id).hidden=id!==root; $("logout").hidden=root==="loginBox";}
function errorMessage(e){return String(e?.message || e?.error?.message || e || "Operazione non riuscita").slice(0,230);}
function unwrap(result){
  if(result?.error) throw new Error(errorMessage(result.error));
  return result?.data ?? result;
}
function el(tag,text,cls){
  const out=document.createElement(tag);
  if(text!==undefined)out.textContent=text==null?"—":String(text);
  if(cls)out.className=cls;
  return out;
}
function table(rows,fields){
  if(!rows.length)return el("p","Nessuna voce visibile.");
  const t=el("table",undefined,"grid-table"),head=el("thead"),top=el("tr");
  for(const key of fields)top.append(el("th",key.replaceAll("_"," ")));
  head.append(top);t.append(head);
  const body=el("tbody");
  for(const item of rows){
    const tr=el("tr");
    for(const col of fields){
      const td=el("td");
      if(col==="caption"){
        const d=el("details",undefined,"caption-details");
        d.append(el("summary",String(item[col]||"").replace(/\s+/g," ").slice(0,110)+"…"));
        d.append(el("p",item[col]||"","full-caption"));
        td.append(d);
      }else if(col==="permalink" && /^https:\/\//.test(item[col]||"")){
        const a=el("a","Apri post");a.href=item[col];a.target="_blank";a.rel="noopener noreferrer";
        td.append(a);
      }else{
        td.textContent=item[col]===null||item[col]===undefined?"—":String(item[col]);
      }
      tr.append(td);
    }
    body.append(tr);
  }
  t.append(body);return t;
}
function shortDate(iso){
  try{return new Intl.DateTimeFormat("it-IT",{dateStyle:"full",timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z"));}
  catch{return iso;}
}
function postCards(rows,includeDate=false){
  if(!rows.length)return el("p","Nessuna pubblicazione per questo giorno.");
  const grid=el("div",undefined,"post-cards");
  for(const post of rows){
    const card=el("article",undefined,"post-card"),meta=el("div",undefined,"post-meta");
    meta.append(el("strong",String(post.local_time||"").slice(0,5),"post-time"),
      el("span",post.platform||"—","post-platform"),
      el("span",post.status||"—","post-status"));
    if(includeDate)meta.prepend(el("span",post.local_date||"—","post-date"));
    card.append(meta);
    const text=String(post.caption||""),firstLine=text.split("\n").find(s=>s.trim())||"Pubblicazione";
    card.append(el("h3",firstLine,"post-title"));
    const preview=text.split("\n").filter(s=>s.trim())[1]||"";
    if(preview)card.append(el("p",preview.slice(0,105)+(preview.length>105?"…":""),"post-preview"));
    const details=el("details",undefined,"post-details");
    details.append(el("summary","Leggi il testo completo"),el("p",text,"full-caption"));
    card.append(details);grid.append(card);
  }
  return grid;
}
function dateNavigation(posts,dates){
  const bar=el("div",undefined,"date-nav");
  const back=el("button","‹ Giorno precedente","ghost"),
        forward=el("button","Giorno successivo ›","ghost");
  const index=dates.indexOf(selectedDate);
  back.disabled=index<=0;forward.disabled=index<0||index===dates.length-1;
  back.addEventListener("click",()=>{selectedDate=dates[index-1];draw();});
  forward.addEventListener("click",()=>{selectedDate=dates[index+1];draw();});
  const label=el("label",undefined,"date-picker-label");
  label.append(el("span","Giorno da visualizzare"));
  const select=el("select",undefined,"day-select");
  select.setAttribute("aria-label","Seleziona giorno");
  for(const day of dates){
    const count=posts.filter(p=>p.local_date===day).length;
    const option=el("option",shortDate(day)+" · "+count+" post");
    option.value=day;option.selected=day===selectedDate;select.append(option);
  }
  select.addEventListener("change",()=>{selectedDate=select.value;draw();});
  label.append(select);bar.append(back,label,forward);
  return bar;
}
function pageNavigation(count){
  if(count<=PAGE_SIZE)return null;
  const last=Math.ceil(count/PAGE_SIZE)-1,page=Math.min(pages[currentTab]||0,last);
  const nav=el("div",undefined,"page-nav");
  const back=el("button","‹ Precedente","ghost"),fwd=el("button","Successiva ›","ghost");
  back.disabled=page===0;fwd.disabled=page===last;
  back.addEventListener("click",()=>{pages[currentTab]=page-1;draw();});
  fwd.addEventListener("click",()=>{pages[currentTab]=page+1;draw();});
  nav.append(back,el("span","Pagina "+(page+1)+" di "+(last+1)+" · "+count+" risultati"),fwd);
  return nav;
}
async function select(name,query){
  const result=await query;
  return unwrap(result) || [];
}
async function load(){
  const [settings,posts,accounts,quotas,events]=await Promise.all([
    select("settings",client.from("settings").select("*")),
    select("posts",client.from("posts").select("*").order("scheduled_at",{ascending:false}).limit(250)),
    select("accounts",client.from("accounts").select("*")),
    select("quotas",client.from("quotas").select("*")),
    select("events",client.from("events").select("*").order("created_at",{ascending:false}).limit(100))
  ]);
  data={settings,posts,accounts,quotas,events};
  const dates=[...new Set(posts.map(p=>p.local_date).filter(Boolean))].sort();
  if(!dates.includes(selectedDate)){
    const today=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Europe/Rome"}).format(new Date());
    selectedDate=dates.find(d=>d>=today)||dates[dates.length-1]||today;
  }
  const cfg=settings[0]||{};
  setStatus(cfg.enabled?"Programmazione consentita":"Pubblicazioni sospese");
  $("metrics").replaceChildren(...[
    ["In coda",posts.filter(p=>p.status==="READY").length],
    ["Pubblicati",posts.filter(p=>p.status==="PUBLISHED").length],
    ["Da verificare",posts.filter(p=>["UNCERTAIN","CLAIMED"].includes(p.status)).length],
    ["Account verificati",accounts.filter(a=>a.verified).length+"/3"]
  ].map(([name,value])=>{const card=el("div",undefined,"stat");card.append(el("strong",value),el("span",name));return card;}));
  draw();
}
function draw(){
  $("tabTitle").textContent=labels[currentTab];
  const box=$("content");box.replaceChildren();
  const posts=data.posts||[];
  if(currentTab==="admin"){
    const opts=data.settings?.[0]||{};
    box.append(el("p","Pubblicazioni: "+(opts.enabled?"abilitate":"sospese")+
      " · Diritti: "+(opts.rights_verified?"verificati":"non verificati")+
      " · Test live: "+(opts.live_test_verified?"verificato":"non verificato")));
    const b=el("button","Sospendi pubblicazioni");
    b.disabled=!opts.enabled;
    b.addEventListener("click",async ()=>{
      if(!confirm("Sospendere le pubblicazioni future?"))return;
      try{unwrap(await client.from("settings").update({enabled:false}).eq("singleton",true));await load();}
      catch(e){alert(errorMessage(e));}
    });
    box.append(b,el("p","L'attivazione richiede verifiche server-side di diritti, OAuth, quote e post di prova; non è possibile abilitarla dal browser.","hint"));
    return;
  }
  if(currentTab==="calendar"){
    const dates=[...new Set(posts.map(p=>p.local_date).filter(Boolean))].sort();
    if(!dates.length){box.append(el("p","Calendario vuoto."));return;}
    if(!dates.includes(selectedDate))selectedDate=dates[0];
    const daily=posts.filter(p=>p.local_date===selectedDate)
      .sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
    box.append(dateNavigation(posts,dates));
    box.append(el("p",shortDate(selectedDate)+" · "+daily.length+" pubblicazioni · 3 piattaforme","day-heading"));
    box.append(postCards(daily));
    box.append(el("p","Mostriamo un solo giorno alla volta. Le descrizioni complete si aprono su richiesta.","hint"));
    return;
  }
  const rows=currentTab==="next"?posts.filter(p=>p.status==="READY").sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)):
    currentTab==="history"?posts.filter(p=>p.status==="PUBLISHED"):
    currentTab==="errors"?posts.filter(p=>["UNCERTAIN","CLAIMED","BLOCKED"].includes(p.status)):
    currentTab==="accounts"?data.accounts||[]:
    currentTab==="usage"?data.quotas||[]:[];
  if(["next","history","errors"].includes(currentTab)){
    const last=Math.max(0,Math.ceil(rows.length/PAGE_SIZE)-1);
    pages[currentTab]=Math.min(pages[currentTab]||0,last);
    const pageRows=rows.slice(pages[currentTab]*PAGE_SIZE,(pages[currentTab]+1)*PAGE_SIZE);
    box.append(currentTab==="next"?postCards(pageRows,true):table(pageRows,cols[currentTab]));
    const nav=pageNavigation(rows.length);if(nav)box.append(nav);
  }else{
    box.append(table(rows,cols[currentTab]||[]));
  }
  if(currentTab==="usage")box.append(el("p","Quota sconosciuta = nessuna pubblicazione automatica. Avviso 70%, blocco 80%.","hint"));
}
async function checkAuthorization(){
  if(!client)return;
  try{
    const session=unwrap(await client.auth.getSession());
    const user=session?.user || session?.session?.user;
    if(!user){activeUser=null;display("loginBox");setStatus("Accesso richiesto");return;}
    activeUser=user;
    const admins=await select("admin_users",client.from("admin_users").select("auth_user_id").limit(1));
    if(!admins.length){
      display("approvalBox");setStatus("Autorizzazione richiesta");
      $("currentAccount").textContent="Email: "+(user.email||"—")+" · ID utente: "+(user.id||"—")+
        ". Non condividere password o codici.";
      return;
    }
    display("app");await load();
  }catch(e){
    display("loginBox");setStatus("Connessione non disponibile");msg(errorMessage(e));
  }
}
async function signIn(e){
  e.preventDefault();msg("");
  try{
    const email=$("email").value.trim(),password=$("password").value;
    if(!email||!password)throw new Error("Email e password obbligatorie");
    unwrap(await client.auth.signIn.email({email,password}));
    $("password").value="";
    await checkAuthorization();
  }catch(e){msg(errorMessage(e));$("password").value="";}
}
async function register(){
  msg("");
  try{
    const email=$("email").value.trim(),password=$("password").value;
    if(!email||password.length<12)throw new Error("Inserisci email e una password di almeno 12 caratteri.");
    unwrap(await client.auth.signUp.email({email,password,name:"REAL MEDIA PRO"}));
    $("password").value="";
    msg("Account registrato. Accedi o verifica la tua email, poi richiedi autorizzazione amministrativa.");
    await checkAuthorization();
  }catch(e){msg(errorMessage(e));$("password").value="";}
}
async function google(){
  msg("");
  try{
    unwrap(await client.auth.signIn.social({provider:"google",callbackURL:location.origin+location.pathname}));
    // OAuth usually redirects; if already signed in, refresh.
    await checkAuthorization();
  }catch(e){msg(errorMessage(e));}
}
async function boot(){
  try{
    const response=await fetch("./config.json",{cache:"no-store"});
    if(!response.ok)throw new Error("Configurazione pubblica non disponibile.");
    const cfg=await response.json();
    if(!cfg.authUrl?.startsWith("https://")||!cfg.dataApiUrl?.startsWith("https://")){
      throw new Error("Accesso in preparazione: endpoint Neon non ancora configurati.");
    }
    const ah=new URL(cfg.authUrl).hostname;
    const dh=new URL(cfg.dataApiUrl).hostname;
    if(!ah.endsWith(".neon.tech")&&!ah.endsWith(".neon.build"))throw new Error("Host Auth non autorizzato");
    if(!dh.endsWith(".neon.tech")&&!dh.endsWith(".neon.build"))throw new Error("Host Data API non autorizzato");
    client=createClient({auth:{url:cfg.authUrl},dataApi:{url:cfg.dataApiUrl}});
    await checkAuthorization();
  }catch(e){msg(errorMessage(e));setStatus("Configurazione in corso");}
}
$("loginForm").addEventListener("submit",signIn);
$("register").addEventListener("click",register);
$("googleLogin").addEventListener("click",google);
$("retryApproval").addEventListener("click",checkAuthorization);
$("refresh").addEventListener("click",async()=>{try{await load()}catch(e){alert(errorMessage(e));}});
$("logout").addEventListener("click",async()=>{try{if(client)await client.auth.signOut()}finally{activeUser=null;data={};display("loginBox");setStatus("Disconnesso");}});
for(const button of document.querySelectorAll("[data-tab]")){
  button.addEventListener("click",()=>{currentTab=button.dataset.tab;document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("selected",b===button));draw();});
}
boot();
