import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const ROOT="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/";
const URLBASE=Deno.env.get("SUPABASE_URL")!;
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const service=createClient(URLBASE,KEY,{auth:{persistSession:false}});
const allowOrigin="https://josephsocialmedia2-spec.github.io";
const headers={"content-type":"application/json","access-control-allow-origin":allowOrigin,"access-control-allow-headers":"authorization, content-type, apikey","access-control-allow-methods":"GET, POST, OPTIONS"};
const ok=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
function fail(message:string,status=400){return ok({error:message},status)}
const clean=(v:unknown,max=200)=>String(v??"").trim().slice(0,max);
const emailValid=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const sectorValid=(s:string)=>["privati","aziende"].includes(s);
async function admin(req:Request){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token) return false;
 const {data:{user},error}=await service.auth.getUser(token);
 if(error||!user) return false;
 const {data, error:e}=await service.from("case247_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 return !e&&!!data;
}
function flyerLink(input:string){
 try {
  const u=new URL(input);
  if(u.origin!==new URL(ROOT).origin || !u.pathname.startsWith(new URL(ROOT).pathname)) return null;
  if(!/\.(pdf|jpg|jpeg|png|webp)$/i.test(u.pathname))return null;
  return u.href;
 }catch{return null}
}
async function brevo(path:string,method:string,body?:unknown){
 const key=Deno.env.get("BREVO_API_KEY");
 if(!key) throw Error("BREVO_API_KEY non configurata");
 const r=await fetch("https://api.brevo.com/v3"+path,{method,headers:{"api-key":key,"accept":"application/json","content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const t=await r.text();let result:any={};try{result=JSON.parse(t)}catch{result={detail:t.slice(0,300)}}
 if(!r.ok)throw Error("Brevo HTTP "+r.status+": "+clean(result.message||result.detail,220));
 return result;
}
const escapeHtml=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
function bodyHtml(c:any){
 const url=escapeHtml(c.flyer_url);
 const title=escapeHtml(c.title);
 const wa="https://wa.me/393713708294?text="+encodeURIComponent("Buongiorno, contatto Case in Pubblicità 24/7.\nNome:\nCognome:\nTipo di richiesta:\nVolantino: "+c.title);
 return '<!doctype html><html lang="it"><body style="background:#f5f8fc;font-family:Arial,sans-serif;color:#122747;padding:25px"><div style="max-width:640px;margin:auto;background:white;padding:24px;border-radius:12px"><h1 style="color:#084ea5">CASE IN PUBBLICITÀ 24/7</h1><h2>'+title+'</h2><p>È disponibile il nuovo volantino del nostro progetto.</p><p><a href="'+url+'" style="background:#0b72d7;color:white;padding:13px 18px;border-radius:9px;display:inline-block">Visualizza il volantino</a></p><p><a href="'+escapeHtml(wa)+'">Contattaci su WhatsApp: 371 370 8294</a></p><hr><p style="font-size:12px">Comunicazione riservata ai destinatari iscritti alle nostre comunicazioni promozionali. <a href="{{ unsubscribe }}">Disiscriviti</a>.</p></div></body></html>';
}
async function dispatch(id:string){
 const {data:c,error}=await service.from("case247_mail_campaigns").select("*").eq("id",id).single();
 if(error||!c)throw Error("Campagna non trovata");
 if(c.status!=="draft"&&c.status!=="failed")throw Error("Campagna non modificabile: "+c.status);
 if(new Date(c.scheduled_at).getTime()<Date.now()+15*60*1000)throw Error("Pianificazione: servono almeno 15 minuti di anticipo");
 const sender=Deno.env.get("BREVO_SENDER_EMAIL"),folder=Number(Deno.env.get("BREVO_FOLDER_ID"));
 if(!sender||!emailValid(sender)||!Number.isSafeInteger(folder)||folder<1)throw Error("Configurare BREVO_SENDER_EMAIL e BREVO_FOLDER_ID");
 const {data:contacts,error:e}=await service.from("case247_mail_contacts").select("email,full_name").eq("sector",c.sector).is("unsubscribed_at",null).order("email").limit(500);
 if(e)throw Error(e.message);
 if(!contacts?.length)throw Error("Nessun destinatario con consenso documentato");
 if(contacts.length===500)throw Error("Segmento di 500 o più contatti: richiede paginazione prima dell'invio");
 const {data:locked,error:lockError}=await service.from("case247_mail_campaigns").update({status:"preparing",error_text:null,updated_at:new Date().toISOString()}).eq("id",id).in("status",["draft","failed"]).select("id").maybeSingle();
 if(lockError||!locked)throw Error("Campagna già in elaborazione");
 try{
  let listId=c.brevo_list_id;
  if(!listId){
   const l=await brevo("/contacts/lists","POST",{name:"CASE247-"+id.slice(0,8),folderId:folder});
   listId=l.id;
   const {error:x}=await service.from("case247_mail_campaigns").update({brevo_list_id:listId}).eq("id",id);
   if(x)throw Error("Impossibile registrare ID lista");
  }
  let eligible=0,blocked=0;
  for(const contact of contacts){
   try{
    const p=await brevo("/contacts/"+encodeURIComponent(contact.email),"GET");
    if(p.emailBlacklisted===true){blocked++;continue}
   }catch(err){
    if(!String(err).includes("HTTP 404"))throw err;
   }
   await brevo("/contacts","POST",{email:contact.email,attributes:{FIRSTNAME:contact.full_name.slice(0,60)},listIds:[listId],updateEnabled:true});
   eligible++;
  }
  if(!eligible)throw Error("Nessun contatto consegnabile (blacklist provider)");
  let campaignId=c.brevo_campaign_id;
  if(!campaignId){
   const campaign=await brevo("/emailCampaigns","POST",{name:"CASE247 "+c.title+" "+id.slice(0,8),subject:c.subject,sender:{name:"Case in Pubblicità 24/7",email:sender},recipients:{listIds:[listId]},htmlContent:bodyHtml(c),utmSource:"case247",utmMedium:"email",utmCampaign:"flyer-"+id.slice(0,8)});
   campaignId=campaign.id;
   const {error:x}=await service.from("case247_mail_campaigns").update({brevo_campaign_id:campaignId,eligible_count:eligible}).eq("id",id);
   if(x)throw Error("Impossibile registrare ID campagna");
  }
  await brevo("/emailCampaigns/"+campaignId,"PUT",{scheduledAt:c.scheduled_at});
  const {error:x}=await service.from("case247_mail_campaigns").update({status:"scheduled",eligible_count:eligible,updated_at:new Date().toISOString(),error_text:null}).eq("id",id);
  if(x)throw Error("Invio pianificato nel provider, sincronizzazione locale fallita");
  return {status:"scheduled",campaign_id:campaignId,eligible,blocked};
 }catch(err){
  await service.from("case247_mail_campaigns").update({status:"failed",error_text:clean(String(err),500),updated_at:new Date().toISOString()}).eq("id",id);
  throw err;
 }
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers});
 try{
  if(req.headers.get("origin")&&req.headers.get("origin")!==allowOrigin)return fail("Origine non consentita",403);
  if(!await admin(req))return fail("Amministratore CASE247 non autenticato",403);
  if(req.method==="GET"){
   const [contacts,campaigns]=await Promise.all([
    service.from("case247_mail_contacts").select("id,email,full_name,sector,city,consent_at,unsubscribed_at").order("created_at",{ascending:false}).limit(100),
    service.from("case247_mail_campaigns").select("*").order("created_at",{ascending:false}).limit(100)
   ]);
   if(contacts.error||campaigns.error)throw Error(contacts.error?.message||campaigns.error?.message);
   return ok({contacts:contacts.data,campaigns:campaigns.data,brevo_configured:!!Deno.env.get("BREVO_API_KEY")});
  }
  if(req.method!=="POST")return fail("Metodo non valido",405);
  const b=await req.json();
  if(b.action==="contact"){
   const email=clean(b.email,255).toLowerCase(),full_name=clean(b.full_name,130),sector=clean(b.sector,20),city=clean(b.city,100);
   const evidence=clean(b.evidence,1000),consentAt=clean(b.consent_at,50);
   if(!emailValid(email)||!sectorValid(sector)||evidence.length<12||!consentAt||isNaN(Date.parse(consentAt))||Date.parse(consentAt)>Date.now())return fail("Email, settore, data e prova di consenso sono obbligatori");
   const existing=await service.from("case247_mail_contacts").select("id,unsubscribed_at").eq("email",email).maybeSingle();
   if(existing.error)throw Error(existing.error.message);
   if(existing.data)return fail("Email già registrata. Non si possono riattivare contatti disiscritti tramite importazione.",409);
   const {error}=await service.from("case247_mail_contacts").insert({email,full_name,sector,city,evidence,consent_at:new Date(consentAt).toISOString(),lawful_basis:"consent"});
   if(error)throw Error(error.message);
   return ok({saved:true},201);
  }
  if(b.action==="campaign"){
   const title=clean(b.title,120),subject=clean(b.subject,150),sector=clean(b.sector,20),url=flyerLink(clean(b.flyer_url,1000)),scheduled=clean(b.scheduled_at,50);
   if(!title||!subject||!sectorValid(sector)||!url||!scheduled||isNaN(Date.parse(scheduled))||Date.parse(scheduled)<Date.now()+15*60*1000)return fail("Dati campagna non validi: URL immagine/PDF CASE247 e data futura (+15 min) obbligatori");
   const {data,error}=await service.from("case247_mail_campaigns").insert({title,subject,sector,flyer_url:url,scheduled_at:new Date(scheduled).toISOString()}).select("id").single();
   if(error)throw Error(error.message);
   return ok({id:data.id,status:"draft"},201);
  }
  if(b.action==="schedule"){
   if(!/^[0-9a-f-]{36}$/i.test(String(b.id)))return fail("ID non valido");
   return ok(await dispatch(b.id));
  }
  if(b.action==="unsubscribe"){
   const email=clean(b.email,255).toLowerCase();
   const {error}=await service.from("case247_mail_contacts").update({unsubscribed_at:new Date().toISOString()}).eq("email",email);
   if(error)throw Error(error.message);
   return ok({suppressed:true});
  }
  return fail("Azione sconosciuta");
 }catch(err){return fail(clean(String(err),300),500)}
});
