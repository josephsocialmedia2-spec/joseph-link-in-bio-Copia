import {PHASES,RECURRING,addDays,todayRome,currentDay,plan,summarize,validProperty,escapeHtml,csv} from "./core.js";
const $=id=>document.getElementById(id);
let client=null,user=null,mode="DEMO",properties=[],tasks=[],selected=null;
const DEMO_KEY="joseph_sales90_demo_synthetic_v1";
const sample={id:"DEMO-VIA-TORINO",title:"APPARTAMENTO DEMO · Via Torino",commune:"Avigliana",asking_price:150000,start_date:todayRome(),state:"IN_PREPARAZIONE"};
function banner(message){const e=$("notice");e.textContent=message;e.style.display="block";clearTimeout(banner.id);banner.id=setTimeout(()=>{e.style.display="none"},7000);}
function demoLoad(){
 try{const saved=JSON.parse(localStorage.getItem(DEMO_KEY)||"null");if(saved&&Array.isArray(saved.properties)&&Array.isArray(saved.tasks)){properties=saved.properties;tasks=saved.tasks;return;}}catch(_){}
 properties=[sample];tasks=plan(sample.start_date,sample.id);demoSave();
}
function demoSave(){localStorage.setItem(DEMO_KEY,JSON.stringify({properties,tasks}));}
function setMode(m){mode=m;$("mode").textContent=m==="LIVE"?"SUPABASE · ACCESSO PRIVATO":"DEMO · SOLI DATI SINTETICI";$("mode").className=m==="LIVE"?"status good":"status warn";$("db-status").textContent=m==="LIVE"?"Autenticazione e database attivi":"Da configurare · non attivo";}
async function configure(){
 let config={};
 try{config=(await import("./config.js")).default||{};}catch(_){}
 if(!config.url||!config.publishableKey){setMode("DEMO");demoLoad();render();return;}
 try{
   const mod=await import("https://esm.sh/@supabase/supabase-js@2.57.4");
   client=mod.createClient(config.url,config.publishableKey,{auth:{autoRefreshToken:true,persistSession:true}});
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user){$('auth-panel').style.display="block";$('new-property').disabled=true;setMode("LIVE");$("db-status").textContent="Accesso richiesto";render();return;}
   user=data.user;setMode("LIVE");await loadLive();
 }catch(e){setMode("DEMO");demoLoad();banner("Connessione backend non riuscita: modalità demo. Nessun dato reale salvato. "+e.message);}
 render();
}
async function loadLive(){
 if(!user) return;
 const [p,t]=await Promise.all([client.from("s90_properties").select("id,title,commune,asking_price,start_date,state").order("created_at",{ascending:false}),client.from("s90_tasks").select("id,property_id,title,assigned_role,phase,day_number,due_on,status,priority").order("due_on")]);
 if(p.error)throw Error("Lettura immobili: "+p.error.message);
 if(t.error)throw Error("Lettura attività: "+t.error.message);
 properties=p.data||[];tasks=t.data||[];if(!properties.find(p=>p.id===selected))selected=properties[0]?.id||null;
}
async function createProperty(payload){
 const normalized=validProperty(payload);
 if(mode==="DEMO"){
  const entry={...normalized,id:"DEMO-"+Date.now().toString(36),state:"IN_PREPARAZIONE"};
  properties.unshift(entry);tasks.push(...plan(entry.start_date,entry.id));demoSave();return entry;
 }
 if(!user)throw Error("Accesso obbligatorio");
 const {data,error}=await client.from("s90_properties").insert({...normalized,owner_id:user.id,state:"IN_PREPARAZIONE"}).select("id,title,commune,asking_price,start_date,state").single();
 if(error)throw Error(error.message);
 const entries=plan(data.start_date,data.id).map(({id,...t})=>({...t,owner_id:user.id}));
 const {error:taskError}=await client.from("s90_tasks").insert(entries);
 if(taskError)throw Error("Immobile creato ma piano incompleto: "+taskError.message+". Rigenera il piano dal backend.");
 // Scheduled reminders: insert only for future dates, internal recipient is authenticated account email.
 const now=todayRome(),reminders=entries.filter(t=>t.due_on>=now).map(t=>({
  owner_id:user.id,property_id:data.id,task_id:null,kind:"TASK_DUE",title:t.title,due_on:t.due_on,
  local_time:"08:30:00",recipient_email:user.email||null,status:"WAITING"})).filter(x=>!!x.recipient_email);
 if(reminders.length){const {error:remError}=await client.from("s90_reminders").insert(reminders);
  if(remError)banner("Immobile salvato, ma promemoria non configurati: "+remError.message);}
 return data;
}
async function updateTask(id,done){
 if(mode==="DEMO"){const t=tasks.find(t=>t.id===id);if(!t)return;t.status=done?"DONE":"TODO";demoSave();render();return;}
 const {error}=await client.from("s90_tasks").update({status:done?"DONE":"TODO",completed_at:done?new Date().toISOString():null}).eq("id",id);
 if(error)throw Error(error.message);
 await loadLive();render();
}
function euro(n){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(n)||0);}
function selectedProperty(){return properties.find(x=>x.id===selected);}
function render(){
 if(!selected||!properties.some(p=>p.id===selected))selected=properties[0]?.id||null;
 const now=todayRome(),filtered=tasks.filter(t=>t.property_id===selected),tot=summarize(tasks,now);
 $("k-properties").textContent=properties.length;$("k-tasks").textContent=tasks.length;$("k-done").textContent=tot.done;$("k-overdue").textContent=tot.overdue;
 $("properties").innerHTML=properties.map(p=>'<button class="property '+(p.id===selected?'on':'')+'" data-property="'+escapeHtml(p.id)+'"><span>'+escapeHtml(p.commune)+' · '+escapeHtml(p.state||"")+'</span><b>'+escapeHtml(p.title)+'</b><span>'+euro(p.asking_price)+' · '+escapeHtml(p.start_date)+'</span></button>').join("")||'<p class="small">Nessun immobile. Avvia una nuova campagna.</p>';
 const p=selectedProperty();
 $("task-heading").textContent=p?"Attività · "+p.title:"Cronoprogramma delle attività";
 if(!p){$("progress").textContent="Avvia un immobile per generare il programma.";$("timeline").innerHTML="";$("tasks").innerHTML="";renderRules();return;}
 const d=currentDay(p.start_date,now),stats=summarize(filtered,now);
 $("progress").textContent="Giorno "+d+"/90 · "+stats.done+"/"+stats.all+" completate · "+stats.overdue+" scadute. "+(d>90?"La pratica continua oltre i 90 giorni.":"");
 $("timeline").innerHTML=PHASES.map(z=>'<div class="phase '+(z.end<d?"past":z.start<=d&&z.end>=d?"now":"")+'"><small>GG '+z.start+'–'+z.end+'</small><b>'+escapeHtml(z.name)+'</b></div>').join("");
 $("tasks").innerHTML=filtered.slice().sort((a,b)=>a.due_on.localeCompare(b.due_on)).map(t=>'<label class="task '+(t.status==="DONE"?"done":"")+'"><input type="checkbox" data-task="'+escapeHtml(t.id)+'" '+(t.status==="DONE"?"checked":"")+'><span class="description"><strong>'+escapeHtml(t.title)+'</strong><small class="'+(t.due_on<now&&t.status!=="DONE"?"late":"")+'">'+escapeHtml(t.phase)+' · '+escapeHtml(t.assigned_role)+' · '+escapeHtml(t.due_on)+'</small></span></label>').join("");
 renderRules();
}
function renderRules(){
 $("rules").innerHTML=RECURRING.map(r=>'<div class="rule"><span>'+escapeHtml(r.time)+' · '+(r.days.length===1?"Settimanale":"Lun–Sab")+'</span><b>'+escapeHtml(r.label)+'</b><span>'+(mode==="LIVE"?"Regola prevista · backend da attivare":"Regola illustrativa · scheduler non attivo")+'</span></div>').join("");
}
$("properties").addEventListener("click",e=>{const b=e.target.closest("[data-property]");if(b){selected=b.dataset.property;render();}});
$("tasks").addEventListener("change",async e=>{
 const id=e.target.dataset.task;if(!id)return;e.target.disabled=true;
 try{await updateTask(id,e.target.checked);}
 catch(err){banner("Salvataggio non riuscito: "+err.message);render();}
});
$("new-property").onclick=()=>{$("start").value=todayRome();$("dialog").showModal();};
$("cancel").onclick=()=>{$("dialog").close();};
$("create").onsubmit=async e=>{
 e.preventDefault();$("form-error").textContent="";
 const b=e.submitter;b.disabled=true;
 try{const item=await createProperty({title:$("title").value,commune:$("commune").value,asking_price:$("price").value,start_date:$("start").value});
  if(mode==="LIVE")await loadLive();selected=item.id;render();$("dialog").close();banner("Immobile creato e piano delle attività generato.");$("create").reset();
 }catch(err){$("form-error").textContent=err.message;}finally{b.disabled=false;}
};
$("export").onclick=()=>{
 const p=selectedProperty();if(!p){banner("Seleziona un immobile.");return;}
 const data=csv(tasks.filter(t=>t.property_id===p.id)),blob=new Blob(["\uFEFF",data],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sales90-"+p.id+".csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$("print").onclick=()=>window.print();
$("login").onsubmit=async e=>{
 e.preventDefault();const email=$("email").value,password=$("password").value;
 if(!client){$("auth-error").textContent="Backend non configurato.";return;}
 const {data,error}=await client.auth.signInWithPassword({email,password});
 $("password").value="";
 if(error){$("auth-error").textContent=error.message;return;}
 user=data.user;$("auth-panel").style.display="none";$("new-property").disabled=false;
 try{await loadLive();render();banner("Accesso riuscito.");}catch(err){banner(err.message);}
};
await configure();
