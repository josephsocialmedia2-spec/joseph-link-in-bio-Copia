"use client";
import {useCallback,useEffect,useRef,useState} from "react";
function toCSV(rows){
 const escape=v=>{let s=String(v??"");if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
 return "\uFEFF"+[["Orario","Fine","Attività","Origine","Stato","Operatore ID","Completato il"],
  ...rows.map(x=>[x.start_at,x.end_at,x.title,x.origin,x.status,x.completed_by||"",x.completed_at||""])]
  .map(r=>r.map(escape).join(";")).join("\r\n");
}
async function call(url,method="GET",body){
 const res=await fetch(url,{method,cache:"no-store",credentials:"same-origin",headers:body?{"Content-Type":"application/json"}:{},
  body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||"Servizio non disponibile ("+res.status+")");
 return data;
}
export default function Dashboard({operatorEmail,canApprove}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(""),[error,setError]=useState("");
 const [integrations,setIntegrations]=useState(null);
 const [reviewed,setReviewed]=useState(false),letterRef=useRef(null);
 const reload=useCallback(async()=>{try{const x=await call("/api/day");setData(x);setError("")}catch(e){setError(e.message)}},[]);
 useEffect(()=>{reload();call("/api/integrations/status").then(setIntegrations).catch(()=>setIntegrations(null))},[reload]);
 const day=data?.run?.day||new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 async function action(kind,fn){
  setBusy(kind);setError("");
  try{await fn();await reload()}catch(e){setError(e.message)}finally{setBusy("")}
 }
 function print(){
  const frame=letterRef.current;
  try{
   if(!frame?.contentWindow)throw new Error("PDF not loaded");
   frame.contentWindow.focus();
   frame.contentWindow.print();
  }catch(_){
   window.open("/api/documents/"+day+"/letter","_blank","noopener,noreferrer");
  }
 }
 function exportCSV(){
  const content=toCSV(data?.tasks||[]);
  const link=document.createElement("a"),blob=new Blob([content],{type:"text/csv;charset=utf-8"});
  link.href=URL.createObjectURL(blob);link.download="ZTD_Agenda_"+day+".csv";link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
 }
 const run=data?.run;
 const tasks=data?.tasks||[];
 const delivered=tasks.find(x=>/imbucat/i.test(x.title));
 const publishable=run?.status==="READY"&&canApprove;
 const printedText=delivered?.completed_at?new Date(delivered.completed_at).toLocaleString("it-IT",{timeZone:"Europe/Rome"}):"";
 return <><header><h1>Zero to Diamond · Regia operativa</h1>
  <p>{day} · Operatore: {operatorEmail} · Database persistente, Google Drive e PDF gestiti dal server</p></header>
 <main>
  <div className="state" role="status">
   <strong>Connessioni reali: </strong>
   PostgreSQL {integrations?.connected?.database?"OK":"NON PRONTO"} ·
   Google Drive {integrations?.connected?.drive?"OK":"NON CONNESSO"} ·
   Calendar {integrations?.connected?.calendar?"OK":"NON CONNESSO"}.
   {integrations&&!integrations.automationEnabled&&<strong> Automazione disattivata.</strong>}
   {integrations&&!integrations.publicationEnabled&&<strong> Pubblicazione disattivata.</strong>}
   {integrations?.oauthSetupReady&&!integrations?.connected?.googleAccount&&<p>
    <a href="/api/google/connect" className="button">Connetti Google Drive e Calendar</a>
    <small> Autorizzazione Google una tantum, senza copiare refresh token.</small>
   </p>}
   {integrations?.missing?.length>0&&<p><small>Configurazioni ancora da completare in Vercel:
    {integrations.missing.join(", ")}.</small></p>}
  </div>
  <div className="actions"><button disabled={!!busy||!integrations?.automationEnabled||
   !integrations?.connected?.database||!integrations?.connected?.drive||!integrations?.connected?.calendar}
   onClick={()=>action("generate",()=>call("/api/daily-automation","POST",{}))}>
   {busy==="generate"?"Generazione…":"Genera flusso giornaliero"}</button>
   <button className="secondary" disabled={!!busy} onClick={reload}>Aggiorna dati</button>
   <span className={"pill"+(run?.status==="PUBLISHED"?"":" warning")}>Edizione: {run?.status||"NON GENERATA"}</span>
  </div>
  {error&&<p role="alert" className="note">{error}</p>}
  <section className="cards">
   <article className="card"><span className="pill">01 · Rivista digitale</span><h2>Bozza e approvazione</h2>
    {run?.magazine_drive_id?<><iframe title="Anteprima della rivista da Drive" src={"/api/documents/"+day+"/magazine"}></iframe>
     <p>Fascicolo sorgente: {run.source_issue||"in revisione"}</p>
     <p><a href={run.magazine_drive_url} target="_blank" rel="noopener noreferrer">Copia privata su Google Drive</a></p>
     {run.status==="PUBLISHED"&&<p><a href={run.public_path} target="_blank" rel="noopener noreferrer">Apri link pubblico approvato</a></p>}
     {run.status==="READY"&&<><label className="note" style={{display:"block"}}>
      <input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
      Ho esaminato TUTTE le pagine, immagini, eventuali minori, fonti e diritti: nessun materiale inappropriato.
     </label><div className="actions"><button disabled={!publishable||!reviewed||!!busy}
      onClick={()=>{if(window.confirm("Confermi di aver revisionato ogni immagine e ogni pagina? La rivista diventerà accessibile tramite QR pubblico."))
       action("approve",()=>call("/api/editions/"+day+"/approve","POST",{assetsReviewed:reviewed}))}}>
      Approva edizione</button></div></>}
     {run.status==="PUBLISHED"&&<p className="state">Pubblicata da un operatore autorizzato alle {new Date(run.published_at).toLocaleString("it-IT",{timeZone:"Europe/Rome"})}.</p>}
    </>:<p>Il PDF apparirà qui dopo la prima generazione effettiva sul server.</p>}
   </article>
   <article className="card"><span className="pill">02 · Lettera giornaliera</span><h2>PDF A4 con QR</h2>
    {run?.letter_drive_id?<><iframe ref={letterRef} title="Lettera PDF A4 generata" src={"/api/documents/"+day+"/letter"}></iframe>
     <p><a href={run.letter_drive_url} target="_blank" rel="noopener noreferrer">Documento privato su Drive</a></p>
     <div className="actions"><button disabled={!!busy||run?.status!=="PUBLISHED"||!integrations?.publicationEnabled} onClick={print}>Stampa ora</button>
      <button disabled={!delivered||delivered.status==="DONE"||run.status!=="PUBLISHED"||!!busy}
       onClick={()=>{if(window.confirm("Confermi di aver IMBUCATO fisicamente la lettera, dopo avere verificato il QR e le cassette autorizzate?"))
        action("deliver",()=>call("/api/tasks/"+delivered.id,"PATCH",{}))}}>Segna come imbucata</button></div>
     <p className="state">{printedText?"Imbucata: "+printedText+" · Operatore "+delivered.completed_by:
      "Imbucata non ancora confermata. Bloccata finché la rivista non è approvata."}</p>
    </>:<p>Il PDF definitivo verrà prodotto automaticamente con il QR dell'edizione di oggi.</p>}
   </article>
   <article className="card"><span className="pill">03 · Programmazione</span><h2>Agenda 08:00–20:00</h2>
    <p>Attività sincronizzate con PostgreSQL e impegni importati da Google Calendar, quando autorizzati.</p>
    <ol className="tasks">{tasks.map(t=><li key={t.id} className={t.status==="DONE"?"done":""}>
     <span className="time">{t.start_at?.slice(0,5)}</span>
     <span style={{flex:1}}>{t.title}</span>
     <input aria-label={"Completa "+t.title} type="checkbox" disabled={t.status==="DONE"||!!busy}
       checked={t.status==="DONE"} onChange={()=>action(t.id,()=>call("/api/tasks/"+t.id,"PATCH",{}))}/>
    </li>)}</ol>
    <button className="secondary" disabled={!data||!!busy} onClick={exportCSV}>Esporta CSV dati reali</button>
    {tasks.length===0&&<p>Nessuna attività ancora presente nel database.</p>}
   </article>
  </section>
  <p className="note">L'automazione crea soltanto bozze e documenti privati. Nessuna pubblicazione, stampa fisica o distribuzione è considerata completata automaticamente. Non vengono eseguite attività di mediazione immobiliare.</p>
 </main></>;
}
