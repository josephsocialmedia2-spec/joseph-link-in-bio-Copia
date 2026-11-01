// CASE247 internal CRM intake. Only authorized staff with a validated Supabase JWT.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1";

type Json = Record<string, unknown>;
const allowedOrigin = "https://josephsocialmedia2-spec.github.io";
const allow = (o: string|null) => (!o || o === allowedOrigin) ? (o ?? allowedOrigin) : null;
const send = (status: number, body: Json, origin: string | null) =>
  new Response(JSON.stringify(body), {status, headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store",
    "vary":"origin",
    ...(origin ? {"access-control-allow-origin":origin} : {})
  }});
const trim = (v: unknown, max: number): string =>
 typeof v === "string" ? v.trim().slice(0,max) : "";
const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;
const uuidValid = (s: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);

const authenticatedHandler = withSupabase({auth:"user"}, async (req, ctx) => {
  const origin = allow(req.headers.get("origin"));
  if (req.headers.get("origin") && !origin) return send(403,{error:"ORIGIN_NOT_ALLOWED"},null);
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:{
    "access-control-allow-origin":origin ?? allowedOrigin,
    "access-control-allow-methods":"POST, GET, OPTIONS",
    "access-control-allow-headers":"authorization,apikey,content-type",
    "access-control-max-age":"300"
  }});
  // The official middleware validates the user JWT; only the server receives admin access.
  const userId=ctx.userClaims?.id;
  const service=ctx.supabaseAdmin;
  if(!userId || !service) return send(401,{error:"INVALID_SESSION"},origin);
  // Bind this endpoint to the CASE247 organization, never to an arbitrary membership.
  const target=await service.from("case247_organizations").select("id").eq("name","CASE IN PUBBLICITÀ 24/7").maybeSingle();
  if(target.error || !target.data?.id) return send(503,{error:"CASE247_ORGANIZATION_UNAVAILABLE"},origin);
  const org=target.data.id;
  const {data:member,error:memberError}=await service.from("case247_staff_members")
    .select("staff_role").eq("user_id",userId).eq("organization_id",org).eq("active",true)
    .in("staff_role",["admin","editor"]).maybeSingle();
  if (memberError || !member) return send(403,{error:"NOT_CASE247_STAFF"},origin);
  if (req.method === "GET") return send(200,{ok:true,authorized:true,role:member.staff_role,write_mode:"STAFF_ONLY",outbound_marketing:false},origin);
  if (req.method !== "POST") return send(405,{error:"METHOD_NOT_ALLOWED"},origin);
  const size=Number(req.headers.get("content-length") || "0");
  if (size > 9000) return send(413,{error:"PAYLOAD_TOO_LARGE"},origin);
  let payload:Json;
  try { payload=await req.json(); if (!payload || Array.isArray(payload) || typeof payload!=="object") throw Error(); }
  catch { return send(400,{error:"INVALID_JSON"},origin); }
  if (payload.action !== "create_inbound_lead") return send(400,{error:"UNKNOWN_ACTION"},origin);
  if (Object.keys(payload).length > 20) return send(400,{error:"EXCESS_FIELDS"},origin);
  const eventKey=trim(payload.event_id,100);
  if (!eventKey || !/^[a-zA-Z0-9_-]{8,100}$/.test(eventKey)) return send(422,{error:"EVENT_ID_REQUIRED"},origin);
  const email=trim(payload.email,200).toLowerCase();
  const phone=trim(payload.phone,40);
  const comune=trim(payload.comune,120);
  const propertyType=trim(payload.property_type,90) || null;
  const first=trim(payload.first_name,120);
  const last=trim(payload.last_name,120);
  const page=trim(payload.page_source_path,300);
  const campaign=trim(payload.campaign_key,100);
  const inquiry=trim(payload.inquiry_type,70) || "VALUATION_REQUEST";
  const channel=trim(payload.preferred_channel,30) || "none";
  const stated=trim(payload.intent_self_declared,250);
  const timeline=trim(payload.sell_timeline,80);
  if (!comune || comune.length < 2 || (!email && !phone) || (email && !emailValid(email)))
    return send(422,{error:"INVALID_CONTACT_OR_COMUNE"},origin);
  if (!["none","email","phone","whatsapp"].includes(channel))
    return send(422,{error:"INVALID_CONTACT_PREFERENCE"},origin);
  if (!["VALUATION_REQUEST","SELLER_INQUIRY","B2B_SELLER_INQUIRY","MARKET_REPORT_REQUEST"].includes(inquiry))
    return send(422,{error:"INVALID_INQUIRY_TYPE"},origin);
  const sqmRaw=payload.sqm;
  const sqm=sqmRaw===null||sqmRaw===undefined||sqmRaw===""?null:Number(sqmRaw);
  if (sqm !== null && (!Number.isFinite(sqm)||sqm<=0||sqm>100000))return send(422,{error:"INVALID_SURFACE"},origin);
  // Idempotency: a repeated event never triggers a second response or outbound communication.
  const existing=await service.from("case247_crm_leads").select("id,stage").eq("organization_id",org).eq("external_event_key",eventKey).maybeSingle();
  if (existing.error) return send(500,{error:"LEAD_LOOKUP_FAILED"},origin);
  if (existing.data) return send(200,{ok:true,duplicate:true,lead_id:existing.data.id,stage:existing.data.stage,outbound_marketing:false},origin);
  let contactId:string|undefined;
  if(email){
    const found=await service.from("case247_crm_contacts").select("id").eq("organization_id",org).eq("email",email).limit(1).maybeSingle();
    if (found.error) return send(500,{error:"CONTACT_LOOKUP_FAILED"},origin);
    contactId=found.data?.id;
  }
  if(!contactId){
    const added=await service.from("case247_crm_contacts").insert({
      organization_id:org,first_name:first||null,last_name:last||null,email:email||null,phone:phone||null,
      collected_from:page || "internal_staff_intake",owner_verified:false,status:"NEW"
    }).select("id").single();
    if (added.error){
      if (added.error.code==="23505"&&email){
        const retry=await service.from("case247_crm_contacts").select("id").eq("organization_id",org).eq("email",email).maybeSingle();
        contactId=retry.data?.id;
      }
      if (!contactId)return send(409,{error:"CONTACT_CONFLICT_REVIEW_REQUIRED"},origin);
    } else contactId=added.data.id;
  }
  const property=await service.from("case247_crm_properties").insert({
    organization_id:org,contact_id:contactId,comune,property_type:propertyType,sqm
  }).select("id").single();
  if (property.error)return send(500,{error:"PROPERTY_CREATE_FAILED_REVIEW_REQUIRED"},origin);
  const lead=await service.from("case247_crm_leads").insert({
    organization_id:org,contact_id:contactId,property_id:property.data.id,external_event_key:eventKey,
    page_source_path:page||null,campaign_key:campaign||null,
    inquiry_type:inquiry,stated_intent:stated||null,preferred_channel:channel,sell_timeline:timeline||null,
    stage:"NEW",marketing_consent_inferred:false
  }).select("id,stage").single();
  if (lead.error){
    if(lead.error.code==="23505"){
      const e=await service.from("case247_crm_leads").select("id,stage").eq("organization_id",org).eq("external_event_key",eventKey).maybeSingle();
      if(e.data)return send(200,{ok:true,duplicate:true,lead_id:e.data.id,stage:e.data.stage,outbound_marketing:false},origin);
    }
    return send(500,{error:"LEAD_CREATE_FAILED_REVIEW_REQUIRED"},origin);
  }
  // A staff-created lead does not imply marketing consent, even when the owner requested a reply.
  return send(201,{ok:true,lead_id:lead.data.id,stage:lead.data.stage,marketing_consent:false,outbound_marketing:false},origin);
});

Deno.serve((req: Request) => {
  // CORS preflight must be handled before user JWT validation.
  const requestOrigin=req.headers.get("origin");
  const origin=allow(requestOrigin);
  if(requestOrigin && !origin)return send(403,{error:"ORIGIN_NOT_ALLOWED"},null);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "access-control-allow-origin":origin ?? allowedOrigin,
    "access-control-allow-methods":"POST, GET, OPTIONS",
    "access-control-allow-headers":"authorization,apikey,content-type",
    "access-control-max-age":"300"
  }});
  return authenticatedHandler(req);
});
