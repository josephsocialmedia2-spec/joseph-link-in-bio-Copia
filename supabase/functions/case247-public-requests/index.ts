// CASE IN PUBBLICITÀ 24/7 — consent-first, public intake (disabled by default).
// No recipient import, unsolicited marketing, email or WhatsApp sending is implemented.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1";
const ALLOWED_ORIGIN="https://josephsocialmedia2-spec.github.io";
const BRAND="CASE IN PUBBLICITÀ 24/7";
type Body = Record<string,unknown>;
const purpose=(kind:string)=>({
 "CERCO_CASA":"proposte immobiliari corrispondenti alla mia ricerca di acquisto",
 "VOGLIO_VENDERE":"informazioni e servizi di pubblicità continuativa relativi alla vendita del mio immobile",
 "ATTIVITA_IMMOBILE":"opportunità e comunicazioni immobiliari per attività, negozi e immobili commerciali"
}[kind]||"comunicazioni relative alla richiesta immobiliare");
const consentEmail=(kind:string)=>"Autorizzo CASE IN PUBBLICITÀ 24/7 a inviarmi via EMAIL "+purpose(kind)+". Consenso facoltativo e revocabile.";
const consentWhatsApp=(kind:string)=>"Autorizzo CASE IN PUBBLICITÀ 24/7 a inviarmi via WHATSAPP "+purpose(kind)+". Consenso facoltativo e revocabile.";
const reply=(status:number,content:Body,origin:string|null)=>
 new Response(JSON.stringify(content),{status,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"origin",
 "x-content-type-options":"nosniff", ...(origin?{"access-control-allow-origin":origin}:{})
 }});
const t=(s:unknown,max=150)=>typeof s==="string"?s.trim().slice(0,max):"";
const sha256=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))).map(n=>n.toString(16).padStart(2,"0")).join("");
const token=()=>{const a=crypto.getRandomValues(new Uint8Array(32));return Array.from(a,n=>n.toString(16).padStart(2,"0")).join("")};
const userOrigin=(req:Request)=>{
 const origin=req.headers.get("origin");
 return origin===ALLOWED_ORIGIN?origin:null;
};
const handler=withSupabase({auth:"none"},async(req,ctx)=>{
 const origin=userOrigin(req);
 if(!ctx.supabaseAdmin)return reply(503,{error:"BACKEND_UNAVAILABLE"},origin);
 const admin=ctx.supabaseAdmin;
 const orgRes=await admin.from("case247_organizations").select("id").eq("name",BRAND).maybeSingle();
 const org=orgRes.data?.id;
 if(!org || orgRes.error)return reply(503,{error:"CASE247_ORGANIZATION_MISSING"},origin);
 const setRes=await admin.from("case247_optin_settings").select("intake_enabled,controller_confirmed,privacy_notice_approved,anti_bot_verified,notice_version").eq("organization_id",org).maybeSingle();
 const config=setRes.data;
 if(setRes.error||!config)return reply(503,{error:"CAPTURE_CONFIG_NOT_AVAILABLE"},origin);
 const turnstileSecret=Deno.env.get("CASE247_TURNSTILE_SECRET_KEY")||"";
 const turnstileSite=Deno.env.get("CASE247_TURNSTILE_SITE_KEY")||"";
 const controllerApproved=Deno.env.get("CASE247_LEGAL_RELEASE_APPROVED")==="true";
 const enabled=Boolean(config.intake_enabled && config.controller_confirmed && config.privacy_notice_approved &&
 config.anti_bot_verified && controllerApproved && turnstileSecret && turnstileSite &&
 !String(config.notice_version).startsWith("DRAFT"));
 if(req.method==="GET")return reply(200,{
  brand:BRAND,intake_enabled:enabled,
  notice_version:config.notice_version,
  turnstile_site_key:enabled?turnstileSite:null,
  email_sending_enabled:false,whatsapp_sending_enabled:false,
  message:enabled?"REQUESTS_ACCEPTED_PENDING_CHANNEL_VERIFICATION":"REQUIRES_PRIVACY_APPROVAL_AND_ANTIBOT"
 },origin);
 if(req.method!=="POST")return reply(405,{error:"METHOD_NOT_ALLOWED"},origin);
 const length=Number(req.headers.get("content-length")||"0");
 if(length>10000)return reply(413,{error:"PAYLOAD_TOO_LARGE"},origin);
 let payload:Body;
 try{payload=await req.json();if(!payload||Array.isArray(payload)||typeof payload!=="object")throw Error()}catch{return reply(400,{error:"INVALID_JSON"},origin)}
 if(payload.action==="withdraw"){
  const provided=t(payload.withdraw_token,80);
  if(!/^[a-f0-9]{64}$/.test(provided))return reply(422,{error:"INVALID_WITHDRAW_TOKEN"},origin);
  const hashed=await sha256(provided);
  const found=await admin.from("case247_property_requests").select("id,status").eq("organization_id",org).eq("revoke_token_sha256",hashed).maybeSingle();
  if(found.error)return reply(503,{error:"WITHDRAWAL_UNAVAILABLE"},origin);
  if(!found.data)return reply(404,{error:"NOT_FOUND"},origin);
  const update=await admin.from("case247_property_requests").update({status:"CANCELLED",revoked_at:new Date().toISOString(),email_optin_requested:false,whatsapp_optin_requested:false,updated_at:new Date().toISOString()})
    .eq("id",found.data.id).eq("organization_id",org);
  if(update.error)return reply(503,{error:"WITHDRAWAL_FAILED"},origin);
  return reply(200,{ok:true,status:"REVOKED",message:"Le preferenze di marketing associate alla richiesta sono revocate."},origin);
 }
 if(payload.action!=="create_request")return reply(400,{error:"UNKNOWN_ACTION"},origin);
 // Strict browser origin and all mandatory release controls are required to collect PII.
 if(!origin)return reply(403,{error:"BROWSER_ORIGIN_NOT_ALLOWED"},null);
 if(!enabled)return reply(503,{error:"REQUEST_FORM_NOT_ACTIVATED",status:"DISABLED"},origin);
 if(Object.keys(payload).length>24)return reply(422,{error:"EXCESS_FIELDS"},origin);
 if(t(payload.trap,200))return reply(400,{error:"SPAM_BLOCKED"},origin);
 const challenge=t(payload.turnstile_token,2050);
 if(challenge.length<10)return reply(400,{error:"TURNSTILE_REQUIRED"},origin);
 const checkBody=new URLSearchParams({secret:turnstileSecret,response:challenge});
 let captcha:any;
 try{const v=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
   method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
   body:checkBody,signal:AbortSignal.timeout(8000)});
   if(!v.ok)return reply(503,{error:"ANTIBOT_UNAVAILABLE"},origin);
   captcha=await v.json();
 }catch{return reply(503,{error:"ANTIBOT_UNAVAILABLE"},origin)}
 if(captcha.success!==true||captcha.hostname!=="josephsocialmedia2-spec.github.io")
   return reply(400,{error:"ANTIBOT_VERIFICATION_FAILED"},origin);
 const key=t(payload.submission_key,100),kind=t(payload.request_kind,40),
 name=t(payload.contact_name,160),email=t(payload.email,200).toLowerCase(),
 phone=t(payload.phone,25),city=t(payload.comune,120),type=t(payload.property_type,60),
 message=t(payload.message,450),frequency=t(payload.frequency,30),notice=t(payload.notice_version,120);
 const emailConsent=payload.email_optin_requested===true,whatsAppConsent=payload.whatsapp_optin_requested===true;
 const budget=payload.max_budget_eur==null||payload.max_budget_eur===""?null:Number(payload.max_budget_eur);
 if(!/^[a-f0-9-]{36}$/i.test(key)||!["CERCO_CASA","VOGLIO_VENDERE","ATTIVITA_IMMOBILE"].includes(kind)||
  name.length<2||city.length<2||!["settimanale","solo_pertinenti"].includes(frequency)||
  !["da_definire","appartamento","villa","casa_semindipendente","negozio","ufficio","capannone","terreno"].includes(type)||
  payload.privacy_seen!==true||notice!==config.notice_version)
   return reply(422,{error:"INVALID_REQUEST_DETAILS"},origin);
 if((!email&&!phone)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))||
    (phone&&!/^\+?[0-9\s()-]{9,25}$/.test(phone))||
    (emailConsent&&!email)||(whatsAppConsent&&!phone))
   return reply(422,{error:"INVALID_CONTACT_CHANNEL"},origin);
 if(whatsAppConsent && !/^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g,"")))
   return reply(422,{error:"WHATSAPP_NUMBER_MUST_BE_INTERNATIONAL_FORMAT"},origin);
 if(budget!==null&&(!Number.isFinite(budget)||budget<1000||budget>100000000||kind!=="CERCO_CASA"))
   return reply(422,{error:"INVALID_BUDGET"},origin);
 const secretToken=token();
 const userAgentHash=await sha256(t(req.headers.get("user-agent"),250));
 const toInsert={
  organization_id:org,submission_key:key,request_kind:kind,contact_name:name,
  email:email||null,phone:phone||null,comune:city,property_type:type,
  max_budget_eur:budget,message:message||null,frequency,
  email_optin_requested:emailConsent,whatsapp_optin_requested:whatsAppConsent,
  consent_text_email:emailConsent?consentEmail(kind):null,
  consent_text_whatsapp:whatsAppConsent?consentWhatsApp(kind):null,
  notice_version:notice,user_agent_sha256:userAgentHash,
  origin_url:ALLOWED_ORIGIN+"/joseph-link-in-bio-Copia/campagne/case247/richieste-immobili/",
  revoke_token_sha256:await sha256(secretToken),
  status:"PENDING_VERIFICATION"
 };
 const insert=await admin.from("case247_property_requests").insert(toInsert).select("id,status").single();
 if(insert.error){
  if(insert.error.code==="23505")return reply(409,{error:"REQUEST_ALREADY_SUBMITTED"},origin);
  return reply(503,{error:"REQUEST_COULD_NOT_BE_SAVED"},origin);
 }
 // There is deliberately NO email or WhatsApp send in this function.
 return reply(201,{ok:true,request_id:insert.data.id,status:insert.data.status,
  email_marketing_active:false,whatsapp_marketing_active:false,
  withdraw_url:ALLOWED_ORIGIN+"/joseph-link-in-bio-Copia/campagne/case247/revoca-consenso/?token="+secretToken},origin);
});
Deno.serve((req:Request)=>{
 const origin=userOrigin(req);
 if(req.headers.get("origin") && !origin)return reply(403,{error:"ORIGIN_NOT_ALLOWED"},null);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
   "access-control-allow-origin":origin??ALLOWED_ORIGIN,"access-control-allow-methods":"GET, POST, OPTIONS",
   "access-control-allow-headers":"content-type, apikey","access-control-max-age":"300","vary":"origin"
 }});
 return handler(req);
});
