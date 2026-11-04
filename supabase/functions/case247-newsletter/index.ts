import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.78.0";
const ORIGIN="https://josephsocialmedia2-spec.github.io";
const SITE=ORIGIN+"/joseph-link-in-bio-Copia/";
const DB=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const admin=createClient(DB,SERVICE,{auth:{persistSession:false}});
const json=(status:number,body:unknown,origin:string|null=null)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","vary":"Origin",...(origin?{"access-control-allow-origin":origin}:{})}});
const clean=(value:unknown,n:number)=>typeof value==="string"?value.trim().slice(0,n):"";
const hex=(a:Uint8Array)=>[...a].map(x=>x.toString(16).padStart(2,"0")).join("");
const digest=async(s:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const signature=async(id:string)=>{const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(Deno.env.get("CASE247_UNSUB_SECRET")||""),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(id))))};
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
async function orgSettings(){
 const o=await admin.from("case247_organizations").select("id").eq("name","CASE IN PUBBLICITÀ 24/7").maybeSingle();
 if(o.error||!o.data)throw Error("ORGANIZATION_NOT_FOUND");
 const n=await admin.from("case247_newsletter_settings").select("*").eq("organization_id",o.data.id).maybeSingle();
 const p=await admin.from("case247_optin_settings").select("privacy_notice_approved,anti_bot_verified,intake_enabled,email_outbound_enabled").eq("organization_id",o.data.id).maybeSingle();
 if(n.error||p.error||!n.data||!p.data)throw Error("SETTINGS_UNAVAILABLE");
 return {org:o.data.id,n:n.data,p:p.data};
}
async function mail(to:string,subject:string,html:string,text:string,unsubscribe?:string){
 const key=Deno.env.get("CASE247_RESEND_API_KEY")||"";
 const from=Deno.env.get("CASE247_MAIL_FROM")||"";
 if(!key||!from)throw Error("MAIL_PROVIDER_NOT_CONFIGURED");
 const headers:Record<string,string>={};
 if(unsubscribe){headers["List-Unsubscribe"]="<"+unsubscribe+">";}
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({from,to,subject,html,text,headers}),signal:AbortSignal.timeout(12000)});
 const answer=await response.json().catch(()=>({}));
 if(!response.ok||!answer.id)throw Error("MAIL_PROVIDER_FAILED_"+response.status);
 return String(answer.id);
}
const allowed=(req:Request)=>req.headers.get("origin")===ORIGIN;
Deno.serve(async(req:Request)=>{
 const origin=allowed(req)?ORIGIN:null;
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ORIGIN,"access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"content-type,authorization","vary":"Origin"}});
 try {
  const url=new URL(req.url);
  if(req.method==="GET"&&url.searchParams.get("action")==="status"){
   const {n,p}=await orgSettings();
   const ready=Boolean(n.intake_enabled&&n.privacy_approved&&n.antibot_verified&&p.privacy_notice_approved&&p.anti_bot_verified&&Deno.env.get("CASE247_TURNSTILE_SECRET_KEY")&&Deno.env.get("CASE247_TURNSTILE_SITE_KEY")&&Deno.env.get("CASE247_RESEND_API_KEY")&&Deno.env.get("CASE247_MAIL_FROM")&&Deno.env.get("CASE247_UNSUB_SECRET")&&!String(n.notice_version).startsWith("DRAFT"));
   return json(200,{intake_enabled:ready,notice_version:n.notice_version,turnstile_site_key:ready?Deno.env.get("CASE247_TURNSTILE_SITE_KEY"):null,monthly_sending_enabled:Boolean(ready&&n.outbound_enabled&&p.email_outbound_enabled)},origin);
  }
  if(req.method==="GET"&&url.searchParams.get("action")==="confirm"){
   const id=url.searchParams.get("id")||"", token=url.searchParams.get("token")||"";
   if(!/^[a-f0-9-]{36}$/i.test(id)||!/^[a-f0-9]{64}$/.test(token))return new Response("Link di conferma non valido",{status:400});
   const found=await admin.from("case247_newsletter_subscribers").select("id,state,confirm_token_sha256,confirm_expires_at,consent_notice_version").eq("id",id).maybeSingle();
   if(found.error||!found.data)return new Response("Iscrizione non trovata",{status:404});
   if(found.data.state==="CONFIRMED")return Response.redirect(SITE+"newsletter/esito/?stato=confermato",303);
   if(found.data.state!=="PENDING_CONFIRMATION"||Date.parse(found.data.confirm_expires_at||"0")<Date.now()||found.data.confirm_token_sha256!==await digest(token))return new Response("Link scaduto o non valido",{status:410});
   const change=await admin.from("case247_newsletter_subscribers").update({state:"CONFIRMED",confirmed_at:new Date().toISOString(),confirm_token_sha256:null,confirm_expires_at:null,updated_at:new Date().toISOString()}).eq("id",id).eq("state","PENDING_CONFIRMATION").select("id").maybeSingle();
   if(change.error||!change.data)return new Response("Conferma non disponibile",{status:503});
   await admin.from("case247_newsletter_events").insert({subscriber_id:id,event_type:"CONFIRMED_EMAIL",notice_version:found.data.consent_notice_version});
   return Response.redirect(SITE+"newsletter/esito/?stato=confermato",303);
  }
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"},origin);
  const body=await req.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body))return json(400,{error:"INVALID_PAYLOAD"},origin);
  if(body.action==="unsubscribe"){
   const id=clean(body.id,50),sig=clean(body.sig,100);
   if(!/^[a-f0-9-]{36}$/i.test(id)||!/^[a-f0-9]{64}$/.test(sig)||!Deno.env.get("CASE247_UNSUB_SECRET"))return json(400,{error:"INVALID_UNSUBSCRIBE_LINK"},origin);
   if(sig!==await signature(id))return json(403,{error:"INVALID_SIGNATURE"},origin);
   const found=await admin.from("case247_newsletter_subscribers").select("id,state,consent_notice_version").eq("id",id).maybeSingle();
   if(found.error||!found.data)return json(404,{error:"NOT_FOUND"},origin);
   if(found.data.state!=="UNSUBSCRIBED"){
    const updated=await admin.from("case247_newsletter_subscribers").update({state:"UNSUBSCRIBED",unsubscribed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);
    if(updated.error)return json(503,{error:"UNSUBSCRIBE_FAILED"},origin);
    await admin.from("case247_newsletter_events").insert({subscriber_id:id,event_type:"UNSUBSCRIBED",notice_version:found.data.consent_notice_version});
   }
   return json(200,{ok:true,state:"UNSUBSCRIBED"},origin);
  }
  if(body.action==="monthly_send"){
   if(!SERVICE||req.headers.get("authorization")!=="Bearer "+SERVICE)return json(403,{error:"FORBIDDEN"},origin);
   const {org,n,p}=await orgSettings();
   if(!n.outbound_enabled||!n.privacy_approved||!p.privacy_notice_approved||!p.email_outbound_enabled)return json(200,{sent:0,reason:"DISABLED"},origin);
   if(!Deno.env.get("CASE247_RESEND_API_KEY")||!Deno.env.get("CASE247_MAIL_FROM")||!Deno.env.get("CASE247_UNSUB_SECRET"))return json(503,{error:"EMAIL_SECRETS_MISSING"},origin);
   const local=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
   const get=(k:string)=>local.find(x=>x.type===k)?.value||"";
   if(Number(get("day"))!==n.send_day||Number(get("hour"))!==n.send_hour_rome)return json(200,{sent:0,reason:"OUTSIDE_SEND_WINDOW"},origin);
   const issue=get("year")+"-"+get("month")+"-01";
   const rows=await admin.from("case247_newsletter_subscribers").select("id,email,contact_name,last_sent_month").eq("organization_id",org).eq("state","CONFIRMED").limit(100);
   if(rows.error)return json(503,{error:"SUBSCRIBERS_UNAVAILABLE"},origin);
   let sent=0,skipped=0,errors=0;
   for(const person of rows.data||[]){
    if(person.last_sent_month===issue){skipped++;continue}
    const created=await admin.from("case247_newsletter_dispatches").insert({subscriber_id:person.id,issue_month:issue,state:"QUEUED"}).select("id").maybeSingle();
    if(created.error||!created.data){skipped++;continue}
    const unsub=SITE+"newsletter/disiscriviti/?id="+encodeURIComponent(person.id)+"&sig="+await signature(person.id);
    const catalog=SITE+"immobili/";
    const month=new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric",timeZone:"Europe/Rome"}).format(new Date());
    const subject="Proposte immobiliari di "+month+" | Case in Pubblicità 24/7";
    const greeting=person.contact_name?"Buongiorno "+escapeHtml(person.contact_name)+",":"Buongiorno,";
    const html="<div style='font:16px/1.6 Arial,sans-serif;max-width:640px;margin:auto'><h1>Case in Pubblicità 24/7</h1><p>"+greeting+"</p><p>Questo mese può consultare la nostra selezione aggiornata di immobili, locali e attività disponibili tramite La Sacra Immobiliare.</p><p><a href='"+catalog+"'>Scopri le proposte immobiliari</a></p><p>Se un immobile ti interessa, puoi richiedere informazioni senza impegno.</p><p>Joseph Malafronte<br>Case in Pubblicità 24/7<br><a href='https://wa.me/393713708294'>WhatsApp</a></p><hr><small>Ricevi questo messaggio perché hai confermato l'iscrizione mensile.<br><a href='"+unsub+"'>Disiscriviti</a> | <a href='"+SITE+"campagne/case247/privacy-richieste-immobili/'>Privacy</a></small></div>";
    const plain="Case in Pubblicità 24/7 - proposte immobiliari aggiornate: "+catalog+"\nContatto: +39 371 370 8294\nDisiscriviti: "+unsub;
    try{
     const provider=await mail(person.email,subject,html,plain,unsub);
     await admin.from("case247_newsletter_dispatches").update({state:"SENT",provider_id:provider,sent_at:new Date().toISOString(),attempted_at:new Date().toISOString()}).eq("id",created.data.id);
     await admin.from("case247_newsletter_subscribers").update({last_sent_month:issue,updated_at:new Date().toISOString()}).eq("id",person.id).eq("state","CONFIRMED");
     sent++;
    }catch(e){
     await admin.from("case247_newsletter_dispatches").update({state:"FAILED",error_code:String(e).slice(0,120),attempted_at:new Date().toISOString()}).eq("id",created.data.id);
     errors++;
    }
   }
   return json(200,{sent,skipped,errors,issue_month:issue},origin);
  }
  if(body.action!=="subscribe")return json(400,{error:"UNKNOWN_ACTION"},origin);
  if(!allowed(req))return json(403,{error:"ORIGIN_NOT_ALLOWED"},null);
  const {org,n,p}=await orgSettings();
  const ready=Boolean(n.intake_enabled&&n.privacy_approved&&n.antibot_verified&&p.privacy_notice_approved&&p.anti_bot_verified&&!String(n.notice_version).startsWith("DRAFT"));
  if(!ready)return json(503,{error:"INTAKE_NOT_ACTIVE"},origin);
  if(!Deno.env.get("CASE247_RESEND_API_KEY")||!Deno.env.get("CASE247_MAIL_FROM")||!Deno.env.get("CASE247_UNSUB_SECRET")||!Deno.env.get("CASE247_TURNSTILE_SECRET_KEY"))return json(503,{error:"SERVICE_NOT_READY"},origin);
  const email=clean(body.email,254).toLowerCase(),name=clean(body.name,100),phone=clean(body.phone,30),interest=clean(body.interest,80);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||!/^[+0-9\s().-]{0,30}$/.test(phone)||body.email_optin!==true||body.privacy_seen!==true||body.notice_version!==n.notice_version||clean(body.trap,100))return json(422,{error:"INVALID_INPUT_OR_CONSENT"},origin);
  const challenge=clean(body.turnstile_token,2050);
  if(!challenge)return json(400,{error:"CAPTCHA_REQUIRED"},origin);
  let captcha:any;
  try{const resp=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:Deno.env.get("CASE247_TURNSTILE_SECRET_KEY")||"",response:challenge}),signal:AbortSignal.timeout(10000)});captcha=await resp.json()}catch{return json(503,{error:"CAPTCHA_UNAVAILABLE"},origin)}
  if(captcha.success!==true||captcha.hostname!=="josephsocialmedia2-spec.github.io")return json(400,{error:"CAPTCHA_FAILED"},origin);
  const verification=random(),textConsent="Desidero ricevere una email mensile con proposte immobiliari Case in Pubblicità 24/7. Consenso libero e revocabile.";
  const record={organization_id:org,email,contact_name:name||null,phone:phone||null,interest:interest||null,state:"PENDING_CONFIRMATION",confirm_token_sha256:await digest(verification),confirm_expires_at:new Date(Date.now()+48*3600*1000).toISOString(),consent_notice_version:n.notice_version,consent_text:textConsent,consent_source:SITE+"newsletter/",confirmed_at:null,unsubscribed_at:null,requested_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const save=await admin.from("case247_newsletter_subscribers").upsert(record,{onConflict:"organization_id,email"}).select("id").single();
  if(save.error||!save.data)return json(503,{error:"SUBSCRIPTION_NOT_SAVED"},origin);
  const link="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-newsletter?action=confirm&id="+save.data.id+"&token="+verification;
  try{
   await mail(email,"Conferma la tua iscrizione | Case in Pubblicità 24/7","<p>Conferma la tua iscrizione alla newsletter mensile di Case in Pubblicità 24/7.</p><p><a href='"+link+"'>Conferma la mia email</a></p><p>Il collegamento scade tra 48 ore. Se non hai richiesto l'iscrizione, ignora questo messaggio.</p>","Conferma la tua iscrizione: "+link);
  }catch{return json(503,{error:"CONFIRMATION_EMAIL_NOT_SENT"},origin)}
  await admin.from("case247_newsletter_events").insert({subscriber_id:save.data.id,event_type:"CONSENT_REQUESTED",notice_version:n.notice_version});
  return json(200,{ok:true,state:"PENDING_CONFIRMATION",message:"Controlla la tua email e conferma l'iscrizione."},origin);
 }catch(e){console.error("case247-newsletter",String(e).slice(0,150));return json(503,{error:"TEMPORARILY_UNAVAILABLE"},origin)}
});
