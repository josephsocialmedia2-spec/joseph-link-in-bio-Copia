// CASE247 emergency STOP ONLY: never enables data capture or delivery.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1";
const ORIGIN="https://josephsocialmedia2-spec.github.io";
const reply=(status:number,body:Record<string,unknown>,origin:string|null)=>new Response(JSON.stringify(body),{status,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",
 "vary":"origin",...(origin?{"access-control-allow-origin":origin}:{})
}});
const run=withSupabase({auth:"user"},async(req,ctx)=>{
 const origin=req.headers.get("origin")===ORIGIN?ORIGIN:null;
 if(req.method!=="POST")return reply(405,{error:"METHOD_NOT_ALLOWED"},origin);
 if(!origin)return reply(403,{error:"BROWSER_ORIGIN_DENIED"},null);
 const uid=ctx.userClaims?.id,admin=ctx.supabaseAdmin;
 if(!uid||!admin)return reply(401,{error:"AUTH_REQUIRED"},origin);
 const orgResult=await admin.from("case247_organizations").select("id").eq("name","CASE IN PUBBLICITÀ 24/7").maybeSingle();
 if(!orgResult.data?.id||orgResult.error)return reply(503,{error:"ORG_UNAVAILABLE"},origin);
 const org=orgResult.data.id;
 const member=await admin.from("case247_staff_members").select("staff_role").eq("organization_id",org).eq("user_id",uid).eq("active",true).eq("staff_role","admin").maybeSingle();
 if(member.error||!member.data)return reply(403,{error:"ADMIN_ONLY"},origin);
 let payload:unknown;
 try {payload=await req.json()}catch{return reply(400,{error:"INVALID_JSON"},origin)}
 if(!payload||typeof payload!=="object"||Array.isArray(payload)||
    (payload as Record<string,unknown>).action!=="EMERGENCY_STOP")
    return reply(422,{error:"ONLY_EMERGENCY_STOP_ALLOWED"},origin);
 // Idempotent, fail-closed: stop flags are written first; there is NO enable method.
 const update=await admin.from("case247_optin_settings")
  .update({intake_enabled:false,email_outbound_enabled:false,whatsapp_outbound_enabled:false,updated_at:new Date().toISOString()})
  .eq("organization_id",org).select("intake_enabled,email_outbound_enabled,whatsapp_outbound_enabled").single();
 if(update.error||!update.data)return reply(503,{error:"STOP_SETTINGS_WRITE_FAILED"},origin);
 // Cancel only not-yet-sent jobs. Previous SENT records are immutable audit history.
 const jobs=await admin.from("case247_property_dispatch_jobs").update({status:"CANCELLED",error_code:"EMERGENCY_STOP"})
  .eq("organization_id",org).in("status",["HELD","QUEUED"]).select("id");
 if(jobs.error)return reply(503,{error:"STOP_ACTIVE_BUT_QUEUE_CLEANUP_FAILED",sending_enabled:false},origin);
 return reply(200,{ok:true,status:"STOPPED",intake_enabled:false,email_sending_enabled:false,whatsapp_sending_enabled:false,
   cancelled_jobs:jobs.data?.length??0,reactivation_available:false},origin);
});
Deno.serve((req:Request)=>{
 const raw=req.headers.get("origin"),origin=raw===ORIGIN?ORIGIN:null;
 if(raw&&!origin)return reply(403,{error:"ORIGIN_DENIED"},null);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
   "access-control-allow-origin":origin??ORIGIN,"access-control-allow-methods":"POST,OPTIONS",
   "access-control-allow-headers":"authorization,apikey,content-type","access-control-max-age":"300","vary":"origin"
 }});
 return run(req);
});