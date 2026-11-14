import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const URLBASE = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(URLBASE, SERVICE_KEY, {auth:{persistSession:false}});
const APP_ORIGIN = "https://josephsocialmedia2-spec.github.io";
const APP_ROOT = APP_ORIGIN + "/joseph-link-in-bio-Copia/";
const BRAND = "Immobiliare La Sacra";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cors = {"access-control-allow-origin":APP_ORIGIN,"access-control-allow-headers":"apikey,authorization,content-type","access-control-allow-methods":"GET,POST,OPTIONS"};
function json(v:unknown,status=200){return new Response(JSON.stringify(v),{status,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});}
function problem(message:string,status=400){return json({error:message},status);}
function safe(v:unknown,max=200){return String(v??"").trim().slice(0,max);}
function email(v:unknown){return safe(v,250).toLowerCase();}
function equal(a:string,b:string){if(!a||!b)return false;const aa=new TextEncoder().encode(a),bb=new TextEncoder().encode(b);let d=aa.length^bb.length;for(let i=0;i<Math.max(aa.length,bb.length);i++)d|=(aa[i]||0)^(bb[i]||0);return d===0;}
const config=()=>({
 enabled:Deno.env.get("CASE247_MAIL_SEND_ENABLED")==="true",
 testEmail:email(Deno.env.get("CASE247_TEST_RECIPIENT")),
 brevo:!!Deno.env.get("BREVO_API_KEY"),
 sender:email(Deno.env.get("BREVO_SENDER_EMAIL")),
 folder:Number(Deno.env.get("BREVO_FOLDER_ID")||"0"),
 webhook:!!Deno.env.get("CASE247_BREVO_WEBHOOK_TOKEN"),
 webhookLive:Deno.env.get("CASE247_BREVO_WEBHOOK_ACTIVE")==="true",
 unsubscribe:!!Deno.env.get("CASE247_UNSUBSCRIBE_SECRET"),
 privacy:Deno.env.get("CASE247_PRIVACY_URL")||""
});
async function isAdmin(req:Request) {
 const auth=req.headers.get("authorization")||"";
 const token=auth.replace(/^Bearer\s+/i,"");
 if(!token||token===auth)return false;
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user)return false;
 const {data,error:e}=await db.from("case247_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 return !e&&!!data;
}
async function brevo(path:string,method="GET",body?:unknown) {
 const key=Deno.env.get("BREVO_API_KEY");
 if(!key)throw Error("Provider email non configurato");
 const r=await fetch("https://api.brevo.com/v3"+path,{method,headers:{"api-key":key,"accept":"application/json","content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const raw=await r.text();let data:any={};try{data=raw?JSON.parse(raw):{}}catch{data={}}
 if(!r.ok){const err=new Error("Brevo HTTP "+r.status);(err as any).httpStatus=r.status;throw err;}
 return data;
}
async function approvedRecipient(sector:string) {
 const c=config();
 if(!c.testEmail||!EMAIL_RE.test(c.testEmail))return {eligible:[],reasons:["Nessun destinatario di prova designato nel backend"]};
 if(!["privati","aziende"].includes(sector))return {eligible:[],reasons:["Settore non valido"]};
 const {data:contacts,error:e}=await db.from("case247_mail_contacts").select("id,email,consent_at,unsubscribed_at,evidence,lawful_basis,sector").eq("sector",sector).eq("email",c.testEmail).limit(2);
 if(e)throw Error("Errore controllo consensi");
 const {data:excluded,error:x}=await db.from("case247_mail_suppressions").select("email").eq("email",c.testEmail).maybeSingle();
 if(x)throw Error("Errore controllo soppressioni");
 const reasons:string[]=[];
 if((contacts||[]).length!==1)reasons.push("Contatto di test non registrato nel settore");
 const one=contacts?.[0];
 if(one&&(!one.consent_at||one.lawful_basis!=="consent"||safe(one.evidence).length<12))reasons.push("Consenso non documentato");
 if(one?.unsubscribed_at||excluded)reasons.push("Destinatario disiscritto o escluso");
 if(reasons.length)return {eligible:[],reasons};
 return {eligible:[{email:c.testEmail}],reasons:[]};
}
const linkAllowed=(raw:string)=>{
 try{const u=new URL(raw);return u.protocol==="https:"&&u.origin===APP_ORIGIN&&u.pathname.startsWith("/joseph-link-in-bio-Copia/")&&/\.(jpg|jpeg|png|pdf|webp)$/i.test(u.pathname)?u.href:null}catch{return null}
};
async function verifyAsset(url:string) {
 const r=await fetch(url,{method:"GET",signal:AbortSignal.timeout(12000),headers:{"Range":"bytes=0-1023"}});
 if(!r.ok)throw Error("Il volantino non è accessibile (HTTP "+r.status+")");
 const ct=r.headers.get("content-type")||"";
 if(!/image\/(jpeg|png|webp)|application\/pdf|application\/octet-stream/.test(ct))throw Error("Il contenuto del volantino non è un'immagine o PDF");
}
async function checkProvider() {
 const c=config();
 if(!c.brevo||!EMAIL_RE.test(c.sender)||!c.folder||!c.webhook||!c.webhookLive||!c.unsubscribe||!c.privacy)
   throw Error("Mancano i segreti, la conferma del webhook o l'informativa. Nessun invio autorizzato.");
 const u=new URL(c.privacy);if(u.protocol!=="https:")throw Error("Informativa privacy non HTTPS");
 const s=await brevo("/senders");
 if(!Array.isArray(s.senders)||!s.senders.some((x:any)=>email(x.email)===c.sender&&x.active===true))
   throw Error("Il mittente non risulta attivo/verificato presso Brevo");
 return c;
}
async function signOptout(addr:string){
 const secret=Deno.env.get("CASE247_UNSUBSCRIBE_SECRET")||"";
 if(secret.length<32)throw Error("Segreto disiscrizione non configurato");
 const nonce=crypto.randomUUID();
 const payload=btoa(JSON.stringify({email:addr,nonce,exp:Date.now()+365*86400000})).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload));
 const sign=btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
 return payload+"."+sign;
}
async function verifyOptout(token:string){
 const parts=token.split(".");if(parts.length!==2)return null;
 const secret=Deno.env.get("CASE247_UNSUBSCRIBE_SECRET")||"";if(secret.length<32)return null;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 const b=Uint8Array.from(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
 if(!await crypto.subtle.verify("HMAC",key,b,new TextEncoder().encode(parts[0])))return null;
 const p=JSON.parse(atob(parts[0].replace(/-/g,"+").replace(/_/g,"/")));
 return p.exp>Date.now()&&EMAIL_RE.test(p.email)?email(p.email):null;
}
function unsubscribePage(token:string) {
 const action=Deno.env.get("SUPABASE_URL")+"/functions/v1/case247-flyer-mail";
 const body='<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Disiscrizione — Immobiliare La Sacra</title><body style="font:16px Arial,sans-serif;max-width:550px;margin:50px auto;padding:20px"><h1>Immobiliare La Sacra</h1><h2>Disiscrizione comunicazioni email</h2><p>Conferma per interrompere le future comunicazioni promozionali.</p><form method="POST" action="'+action+'"><input type="hidden" name="optout_token" value="'+token.replace(/"/g,"")+'"><button style="padding:12px 20px">Conferma disiscrizione</button></form></body></html>';
 return new Response(body,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
}
async function suppress(addr:string,reason:string,source:string) {
 const {error}=await db.from("case247_mail_suppressions").upsert({email:addr,reason,source},{onConflict:"email"});
 if(error)throw Error("Non è stato possibile aggiornare la soppressione");
 const {error:e}=await db.from("case247_mail_contacts").update({unsubscribed_at:new Date().toISOString()}).eq("email",addr);
 if(e)throw Error("Non è stato possibile registrare la revoca");
 const {data:campaigns}=await db.from("case247_mail_campaigns").select("id,brevo_campaign_id,status").eq("test_email",addr).in("status",["draft","preparing","scheduled","accepted","uncertain"]);
 for(const c of campaigns||[]) {
   if(c.brevo_campaign_id&&["scheduled","accepted","uncertain"].includes(c.status)){
     try{await brevo("/emailCampaigns/"+c.brevo_campaign_id+"/status","PUT",{status:"cancel"});}
     catch{await db.from("case247_mail_campaigns").update({status:"uncertain",error_text:"Disiscrizione registrata; verifica cancellazione presso Brevo"}).eq("id",c.id);continue;}
   }
   await db.from("case247_mail_campaigns").update({status:"cancelled",cancelled_at:new Date().toISOString()}).eq("id",c.id);
 }
}
async function campaignHtml(c:any,addr:string){
 const configNow=config(),tok=await signOptout(addr);
 const root=URLBASE+"/functions/v1/case247-flyer-mail?optout="+encodeURIComponent(tok);
 const title="COLLAUDO TECNICO — "+BRAND;
 const asset=c.flyer_url?'Il file di prova è disponibile a questo indirizzo: '+c.flyer_url:'Questo test non include un volantino definitivo.';
 const text=title+"\n\n"+asset+"\n\nQuesto messaggio è un collaudo tecnico, non una proposta commerciale.\nInformativa: "+configNow.privacy+"\nDisiscrizione: "+root;
 const h=(s:string)=>s.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[t]||t));
 const html='<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;padding:20px;background:#f6f7f9;color:#14202e;font-family:Arial,sans-serif"><main style="max-width:600px;margin:auto;background:white;border:1px solid #ddd;padding:24px"><h1>Immobiliare La Sacra</h1><h2>COLLAUDO TECNICO — EMAIL DI PROVA</h2><p>Questa è una prova del sistema email, non una campagna commerciale.</p>'+(c.flyer_url?'<p><a href="'+h(c.flyer_url)+'">Visualizza il file di test</a></p>':'<p>Nessun volantino definitivo incluso.</p>')+'<hr><p><a href="'+h(configNow.privacy)+'">Informativa privacy</a> · <a href="'+h(root)+'">Disiscriviti</a></p><p><a href="{{ unsubscribe }}">Disiscrizione gestita dal provider</a></p></main></body></html>';
 return {html,text};
}
async function preview(c:any) {
 const r=await approvedRecipient(c.sector),cfg=config();
 const reasons=[...r.reasons];
 if(!cfg.enabled)reasons.push("Invio di prova disabilitato (interruttore backend)");
 if(!cfg.brevo)reasons.push("Chiave Brevo non configurata");
 if(!cfg.sender)reasons.push("Mittente Brevo non configurato");
 if(!cfg.folder)reasons.push("Cartella Brevo non configurata");
 if(!cfg.webhook||!cfg.webhookLive)reasons.push("Webhook Brevo non verificato");
 if(!cfg.unsubscribe)reasons.push("Disiscrizione non configurata");
 if(!cfg.privacy)reasons.push("Informativa privacy non configurata");
 if(!c.test_mode)reasons.push("Solo campagne di collaudo consentite");
 if(c.test_email!==cfg.testEmail)reasons.push("Destinatario non designato");
 if(c.flyer_url&&!linkAllowed(c.flyer_url))reasons.push("URL file non valido");
 return {eligible_count:r.eligible.length,send_allowed:reasons.length===0,reasons,timezone:"Europe/Rome",scheduled_at:c.scheduled_at,brand:BRAND};
}
async function start(id:string) {
 const {data:c,error:e}=await db.from("case247_mail_campaigns").select("*").eq("id",id).single();
 if(e||!c)throw Error("Campagna non trovata");
 if(c.status!=="draft")throw Error("La campagna non è una bozza: non è consentito riprovare senza riconciliazione");
 const report=await preview(c);if(!report.send_allowed)throw Error("Simulazione non superata: "+report.reasons.join("; "));
 const ms=new Date(c.scheduled_at).getTime()-Date.now();
 if(ms<120000||ms>86400000)throw Error("Colllaudo ammesso solo tra 2 minuti e 24 ore in futuro");
 const {data:claimed,error:claimError}=await db.from("case247_mail_campaigns").update({status:"preparing",dispatch_attempts:c.dispatch_attempts+1,updated_at:new Date().toISOString()}).eq("id",id).eq("status","draft").select("id").maybeSingle();
 if(claimError||!claimed)throw Error("Esecuzione già richiesta da un altro processo");
 let providerId:number|undefined;
 try {
  const cfg=await checkProvider();
  if(c.flyer_url)await verifyAsset(c.flyer_url);
  const recipients=await approvedRecipient(c.sector);
  if(recipients.eligible.length!==1||recipients.eligible[0].email!==cfg.testEmail)throw Error("Il consenso o il destinatario sono cambiati");
  let p:any;
  try{p=await brevo("/contacts/"+encodeURIComponent(cfg.testEmail));}
  catch(e){if((e as any).httpStatus!==404)throw e;p=null}
  if(p?.emailBlacklisted===true)throw Error("Destinatario escluso dal provider");
  const l=await brevo("/contacts/lists","POST",{name:"case247-collaudo-"+id.slice(0,8),folderId:cfg.folder});
  if(!Number.isInteger(l.id))throw Error("Lista Brevo non creata");
  await db.from("case247_mail_campaigns").update({brevo_list_id:l.id}).eq("id",id);
  // If a list import fails, fail closed rather than scheduling a partial audience.
  await brevo("/contacts","POST",{email:cfg.testEmail,listIds:[l.id],updateEnabled:true});
  const current=await approvedRecipient(c.sector);
  if(current.eligible.length!==1)throw Error("Consenso revocato prima della programmazione");
  const content=await campaignHtml(c,cfg.testEmail);
  // Campaign creation with scheduledAt is Brevo's documented scheduling request.
  const created=await brevo("/emailCampaigns","POST",{
   name:"CASE247-TEST-"+c.request_key,
   sender:{name:BRAND,email:cfg.sender},
   subject:"[PROVA] "+BRAND+" — collaudo tecnico",
   recipients:{listIds:[l.id]},
   htmlContent:content.html,previewText:"Messaggio tecnico di prova — nessuna offerta commerciale",
   scheduledAt:c.scheduled_at,
   tag:"CASE247-TEST"
  });
  providerId=Number(created.id);
  if(!Number.isInteger(providerId)||providerId<=0)throw Error("Brevo non ha restituito un ID campagna valido");
  const {error:saveError}=await db.from("case247_mail_campaigns").update({brevo_campaign_id:providerId,provider_status:"created",status:"accepted",provider_accepted_at:new Date().toISOString(),eligible_count:1,updated_at:new Date().toISOString()}).eq("id",id);
  if(saveError)throw Error("Campagna creata nel provider, impossibile sincronizzare il CRM");
  // Verify Brevo recognizes the exact campaign, rather than assuming it was sent.
  const detail=await brevo("/emailCampaigns/"+providerId);
  const providerStatus=safe(detail.status,40)||"unknown";
  const scheduled=["scheduled","queued"].includes(providerStatus);
  const {error:finalError}=await db.from("case247_mail_campaigns").update({provider_status:providerStatus,status:scheduled?"scheduled":"accepted",updated_at:new Date().toISOString()}).eq("id",id);
  if(finalError)throw Error("Stato provider non sincronizzato");
  return {campaign_id:id,provider_id:providerId,provider_status:providerStatus,status:scheduled?"scheduled":"accepted",delivered:false};
 } catch(err){
  await db.from("case247_mail_campaigns").update({status:providerId?"uncertain":"failed",brevo_campaign_id:providerId||null,error_text:safe(err,240),updated_at:new Date().toISOString()}).eq("id",id);
  throw err;
 }
}
async function reconcile(c:any) {
 if(!c.brevo_campaign_id)throw Error("Nessun identificativo Brevo da riconciliare");
 const provider=await brevo("/emailCampaigns/"+c.brevo_campaign_id);
 const st=safe(provider.status,50);
 // Do NOT infer delivered from a campaign-level completed/sent status.
 let next=c.status;
 if(["draft","scheduled","queued"].includes(st))next="scheduled";
 if(["sent","inProcess","inProgress"].includes(st))next="accepted";
 if(st==="suspended"||st==="cancelled")next="cancelled";
 await db.from("case247_mail_campaigns").update({provider_status:st,status:next,updated_at:new Date().toISOString()}).eq("id",c.id);
 return {provider_status:st,local_status:next,delivered_verified:c.status==="delivered"};
}
async function ingestWebhook(req:Request) {
 const supplied=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 const secret=Deno.env.get("CASE247_BREVO_WEBHOOK_TOKEN")||"";
 if(secret.length<24||!equal(supplied,secret))return problem("Non autorizzato",401);
 const raw=await req.text();if(raw.length>50000)return problem("Payload troppo grande",413);
 const payload=JSON.parse(raw);const entries=Array.isArray(payload)?payload:[payload];
 const results=[];
 for(const event of entries) {
  const addr=email(event.email),name=safe(event.event,80).toLowerCase(),pid=Number(event.camp_id||0);
  if(!EMAIL_RE.test(addr)||!name)continue;
  const keyBuf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(event)));
  const key=[...new Uint8Array(keyBuf)].map(x=>x.toString(16).padStart(2,"0")).join("");
  const {data:campaign}=await db.from("case247_mail_campaigns").select("id,status,test_email").eq("brevo_campaign_id",pid).maybeSingle();
  const {error}=await db.from("case247_mail_events").insert({event_key:key,email:addr,provider_campaign_id:Number.isInteger(pid)&&pid>0?pid:null,campaign_id:campaign?.id||null,event_type:name,occurred_at:Number(event.ts_event)?new Date(Number(event.ts_event)*1000).toISOString():null});
  if(error){if(error.code==="23505"){results.push("duplicate");continue}throw Error("Registrazione evento non riuscita");}
  if(["unsubscribe","spam","hard_bounce","hardbounce","blocked"].includes(name))await suppress(addr,"provider:"+name,"brevo");
  if(campaign&&campaign.test_email===addr) {
   if(name==="delivered")await db.from("case247_mail_campaigns").update({status:"delivered",delivered_at:new Date().toISOString(),provider_status:"delivered"}).eq("id",campaign.id).neq("status","cancelled");
   if(["hard_bounce","spam"].includes(name))await db.from("case247_mail_campaigns").update({status:"failed",provider_status:name}).eq("id",campaign.id);
  }
  results.push("recorded");
 }
 return json({received:results.length});
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 const url=new URL(req.url);
 try {
  if(url.searchParams.get("webhook")==="brevo"){
   if(req.method!=="POST")return problem("Metodo non valido",405);
   return await ingestWebhook(req);
  }
  if(url.searchParams.has("optout")){
   const token=safe(url.searchParams.get("optout"),3000);
   if(!await verifyOptout(token))return problem("Link di disiscrizione non valido",400);
   return unsubscribePage(token);
  }
  if(req.method==="POST"&&(req.headers.get("content-type")||"").includes("application/x-www-form-urlencoded")){
   const form=await req.formData(),addr=await verifyOptout(safe(form.get("optout_token"),3000));
   if(!addr)return problem("Disiscrizione non valida",400);
   await suppress(addr,"user-optout","one-click");
   return new Response("<!doctype html><html lang='it'><meta name='viewport' content='width=device-width,initial-scale=1'><h1>Immobiliare La Sacra</h1><p>Disiscrizione registrata. Non riceverai ulteriori invii promozionali da questo sistema.</p></html>",{headers:{"content-type":"text/html;charset=utf-8","cache-control":"no-store"}});
  }
  const origin=req.headers.get("origin");
  if(origin&&origin!==APP_ORIGIN)return problem("Origine non consentita",403);
  if(!await isAdmin(req))return problem("Amministratore CASE247 non autenticato",403);
  if(req.method==="GET"){
   const [a,b]=await Promise.all([
    db.from("case247_mail_contacts").select("id,email,full_name,sector,city,consent_at,unsubscribed_at").order("created_at",{ascending:false}).limit(100),
    db.from("case247_mail_campaigns").select("id,title,sector,scheduled_at,status,brevo_campaign_id,provider_status,eligible_count,error_text,test_mode,delivered_at,request_key").order("created_at",{ascending:false}).limit(100)
   ]);
   if(a.error||b.error)throw Error("Database non raggiungibile");
   const cfg=config();
   return json({contacts:a.data,campaigns:b.data,diagnostics:{
    project:"CASE247",brand:BRAND,provider_key_configured:cfg.brevo,
    sender_configured:!!cfg.sender,designated_test_recipient_configured:!!cfg.testEmail,
    delivery_enabled:cfg.enabled,webhook_configured:cfg.webhook&&cfg.webhookLive,
    unsubscribe_configured:cfg.unsubscribe,privacy_configured:!!cfg.privacy
   }});
  }
  if(req.method!=="POST")return problem("Metodo non supportato",405);
  const b=await req.json();
  if(b.action==="contact"){
   const addr=email(b.email),sector=safe(b.sector,20),evidence=safe(b.evidence,1000),date=new Date(b.consent_at),cfg=config();
   if(addr!==cfg.testEmail||!EMAIL_RE.test(addr))return problem("È consentito registrare solo il destinatario di test designato",403);
   if(!["privati","aziende"].includes(sector)||evidence.length<12||!b.test_authorized||isNaN(date.getTime())||date.getTime()>Date.now())return problem("Autorizzazione di prova e prova del consenso obbligatorie");
   const {data:suppressed}=await db.from("case247_mail_suppressions").select("email").eq("email",addr).maybeSingle();
   if(suppressed)return problem("Contatto già disiscritto: riattivazione bloccata",409);
   const {error}=await db.from("case247_mail_contacts").insert({email:addr,sector,full_name:safe(b.full_name,130),city:safe(b.city,80),evidence,lawful_basis:"consent",consent_at:date.toISOString()});
   if(error)return problem("Contatto già esistente o dati non validi",409);
   return json({created:true},201);
  }
  if(b.action==="campaign"){
   const sector=safe(b.sector,20),scheduled=new Date(b.scheduled_at),urlString=safe(b.flyer_url,1000);
   const asset=urlString?linkAllowed(urlString):null,cfg=config();
   if(!["privati","aziende"].includes(sector)||!cfg.testEmail||!EMAIL_RE.test(cfg.testEmail)||isNaN(scheduled.getTime())||scheduled.getTime()<Date.now()+120000||scheduled.getTime()>Date.now()+86400000||urlString&&!asset)
      return problem("Campagna di prova non valida (data 2 minuti–24 ore; URL file CASE247 HTTPS)");
   const {data,error}=await db.from("case247_mail_campaigns").insert({title:safe(b.title||"Collaudo tecnico",100),sector,subject:"[PROVA] "+BRAND,flyer_url:asset||"",scheduled_at:scheduled.toISOString(),test_mode:true,test_email:cfg.testEmail,status:"draft"}).select("id").single();
   if(error)throw Error("Errore creazione bozza");
   return json({id:data.id,status:"draft"},201);
  }
  if(b.action==="dry_run"||b.action==="schedule"||b.action==="reconcile"||b.action==="cancel"){
   const id=safe(b.id,60);if(!/^[0-9a-f-]{36}$/i.test(id))return problem("ID campagna non valido");
   const {data:c,error}=await db.from("case247_mail_campaigns").select("*").eq("id",id).single();
   if(error||!c)return problem("Campagna non trovata",404);
   if(b.action==="dry_run")return json(await preview(c));
   if(b.action==="schedule")return json(await start(id));
   if(b.action==="reconcile")return json(await reconcile(c));
   if(["cancelled","delivered"].includes(c.status))return json({status:c.status});
   if(c.brevo_campaign_id){
     await brevo("/emailCampaigns/"+c.brevo_campaign_id+"/status","PUT",{status:"cancel"});
   }
   const {error:e}=await db.from("case247_mail_campaigns").update({status:"cancelled",cancelled_at:new Date().toISOString()}).eq("id",id);
   if(e)throw Error("Campagna non annullata nel CRM");
   return json({status:"cancelled"});
  }
  if(b.action==="unsubscribe"){
   const addr=email(b.email),cfg=config();if(addr!==cfg.testEmail)return problem("Solo destinatario designato",403);
   await suppress(addr,"admin-suppression","dashboard");
   return json({suppressed:true});
  }
  return problem("Azione sconosciuta",400);
 }catch(err){return problem("Operazione non completata: "+safe(err instanceof Error?err.message:String(err),240),500)}
});
