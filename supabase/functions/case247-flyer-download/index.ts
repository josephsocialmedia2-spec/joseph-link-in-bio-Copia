// CASE247: download after recording a voluntary lead, fail closed while privacy is pending.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1";
const ORIGIN = "https://josephsocialmedia2-spec.github.io";
const BRAND = "CASE IN PUBBLICITÀ 24/7";
const FILE_ID = "10njebDKvOjL2QmGfx9zaTNawdqPEABVO";
const response=(status:number,body:Record<string,unknown>,origin:string|null)=>
  new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","vary":"origin",...(origin?{"access-control-allow-origin":origin}:{})}});
const clean=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
const handler=withSupabase({auth:"none"},async(req,ctx)=>{
  const origin=req.headers.get("origin")===ORIGIN?ORIGIN:null;
  if(req.method==="POST"&&!origin) return response(403,{error:"ORIGIN_NOT_ALLOWED"},null);
  if(!ctx.supabaseAdmin) return response(503,{error:"BACKEND_UNAVAILABLE"},origin);
  const orgResult=await ctx.supabaseAdmin.from("case247_organizations").select("id").eq("name",BRAND).maybeSingle();
  if(orgResult.error||!orgResult.data?.id) return response(503,{error:"ORGANIZATION_UNAVAILABLE"},origin);
  const settings=await ctx.supabaseAdmin.from("case247_optin_settings").select("intake_enabled,controller_confirmed,privacy_notice_approved,anti_bot_verified,notice_version").eq("organization_id",orgResult.data.id).maybeSingle();
  const s=settings.data;
  const siteKey=Deno.env.get("CASE247_TURNSTILE_SITE_KEY")||"";
  const secret=Deno.env.get("CASE247_TURNSTILE_SECRET_KEY")||"";
  const pdf=Deno.env.get("CASE247_FLYER_DOWNLOAD_URL")||"";
  const expected=/^https:\/\/drive\.google\.com\/file\/d\/10njebDKvOjL2QmGfx9zaTNawdqPEABVO\/view(?:\?.*)?$/;
  const active=Boolean(!settings.error&&s?.intake_enabled&&s.controller_confirmed&&s.privacy_notice_approved&&s.anti_bot_verified&&
    !String(s.notice_version).startsWith("DRAFT")&&Deno.env.get("CASE247_LEGAL_RELEASE_APPROVED")==="true"&&
    Deno.env.get("CASE247_FLYER_GATE_ENABLED")==="true"&&siteKey&&secret&&expected.test(pdf));
  if(req.method==="GET")return response(200,{enabled:active,notice_version:s?.notice_version??null,turnstile_site_key:active?siteKey:null},origin);
  if(req.method!=="POST")return response(405,{error:"METHOD_NOT_ALLOWED"},origin);
  if(!active)return response(503,{error:"FORM_NOT_ACTIVATED"},origin);
  if(Number(req.headers.get("content-length")||"0")>6000)return response(413,{error:"PAYLOAD_TOO_LARGE"},origin);
  let body:Record<string,unknown>;
  try{const b=await req.json();if(!b||Array.isArray(b)||typeof b!=="object")throw Error();body=b;}catch{return response(400,{error:"INVALID_JSON"},origin)}
  if(Object.keys(body).length>12)return response(422,{error:"EXCESS_FIELDS"},origin);
  const nome=clean(body.nome,100),cognome=clean(body.cognome,100),telefono=clean(body.telefono,25);
  const origine=clean(body.origine,20),key=clean(body.submission_key,36),versione=clean(body.informativa_versione,120);
  const validName=(s:string)=>/^[\p{L}][\p{L}\p{M} .'-]{1,99}$/u.test(s);
  if(clean(body.trap,120)||!validName(nome)||!validName(cognome)||!/^\+?[0-9 ()-]{9,25}$/.test(telefono)||
    telefono.replace(/\D/g,"").length<9||!["facebook","instagram","messenger","sito","altro"].includes(origine)||
    !/^[a-f0-9-]{36}$/i.test(key)||body.informativa_letta!==true||versione!==s.notice_version)
      return response(422,{error:"INVALID_FIELDS"},origin);
  const challenge=clean(body.turnstile_token,2050);
  if(challenge.length<10)return response(400,{error:"ANTIBOT_REQUIRED"},origin);
  let proof:any;
  try{
    const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({secret,response:challenge}),signal:AbortSignal.timeout(8000)});
    if(!r.ok)return response(503,{error:"ANTIBOT_UNAVAILABLE"},origin);
    proof=await r.json();
  }catch{return response(503,{error:"ANTIBOT_UNAVAILABLE"},origin)}
  if(proof.success!==true||proof.hostname!=="josephsocialmedia2-spec.github.io")
    return response(400,{error:"ANTIBOT_REJECTED"},origin);
  const saved=await ctx.supabaseAdmin.from("case247_flyer_leads").insert({
    organization_id:orgResult.data.id, submission_key:key,nome,cognome,telefono,
    origine,informativa_versione:versione,informativa_letta:true,consenso_marketing:false
  }).select("id").single();
  if(saved.error)return response(saved.error.code==="23505"?409:503,
    {error:saved.error.code==="23505"?"ALREADY_REGISTERED":"SAVE_FAILED"},origin);
  return response(201,{ok:true,download_url:pdf},origin);
});
Deno.serve((req:Request)=>{
  const origin=req.headers.get("origin")===ORIGIN?ORIGIN:null;
  if(req.headers.get("origin")&&!origin)return response(403,{error:"ORIGIN_NOT_ALLOWED"},null);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin??ORIGIN,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","access-control-max-age":"300","vary":"origin"}});
  return handler(req);
});
