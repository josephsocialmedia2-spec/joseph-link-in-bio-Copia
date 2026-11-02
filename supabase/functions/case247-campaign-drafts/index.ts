// CASE247 staff-only campaign DRAFT creation. No send, no approvals by this endpoint.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1";
const ORIGIN="https://josephsocialmedia2-spec.github.io";
const response=(status:number,body:Record<string,unknown>,origin:string|null)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"origin",...(origin?{"access-control-allow-origin":origin}:{})}
});
const t=(x:unknown,max=150)=>typeof x==="string"?x.trim().slice(0,max):"";
const run=withSupabase({auth:"user"},async(req,ctx)=>{
 const origin=req.headers.get("origin")===ORIGIN?ORIGIN:null;
 const uid=ctx.userClaims?.id,admin=ctx.supabaseAdmin;
 if(!uid||!admin)return response(401,{error:"NOT_AUTHORIZED"},origin);
 const o=await admin.from("case247_organizations").select("id").eq("name","CASE IN PUBBLICITÀ 24/7").maybeSingle();
 if(!o.data?.id)return response(503,{error:"ORGANIZATION_MISSING"},origin);
 const org=o.data.id;
 const member=await admin.from("case247_staff_members").select("staff_role").eq("organization_id",org).eq("user_id",uid).eq("active",true).in("staff_role",["admin","editor"]).maybeSingle();
 if(member.error||!member.data)return response(403,{error:"NOT_CASE247_EDITOR"},origin);
 if(req.method==="GET")return response(200,{ok:true,staff:true,organization:"CASE IN PUBBLICITÀ 24/7",allowed_actions:["create_draft"],sending_enabled:false},origin);
 if(req.method!=="POST")return response(405,{error:"METHOD_NOT_ALLOWED"},origin);
 if(!origin)return response(403,{error:"BROWSER_ORIGIN_DENIED"},null);
 if(Number(req.headers.get("content-length")||"0")>6000)return response(413,{error:"PAYLOAD_TOO_LARGE"},origin);
 let body:any;
 try{body=await req.json()}catch{return response(400,{error:"INVALID_JSON"},origin)}
 if(!body||typeof body!=="object"||Array.isArray(body)||body.action!=="create_draft")
  return response(422,{error:"INVALID_ACTION"},origin);
 const kind=t(body.content_kind,30),title=t(body.title,160),city=t(body.location_comune,120);
 const type=t(body.property_type,90),url=t(body.landing_url,400),summary=t(body.content_summary,450);
 const price=body.max_price_eur===null||body.max_price_eur===""||body.max_price_eur===undefined?null:Number(body.max_price_eur);
 if(!["IMMOBILE_IN_VENDITA","PUBBLICITA_CONTINUA","REPORT_MERCATO"].includes(kind)||title.length<8||title.length>160||
 (price!==null&&(!Number.isFinite(price)||price<0||price>100000000)))
  return response(422,{error:"INVALID_CAMPAIGN"},origin);
 if(url && (!/^https:\/\//.test(url)||url.includes("@")||url.includes("#")))
  return response(422,{error:"INVALID_URL"},origin);
 const ins=await admin.from("case247_property_campaigns").insert({
  organization_id:org,content_kind:kind,title,location_comune:city||null,property_type:type||null,
  max_price_eur:price,landing_url:url||null,content_summary:summary||null,
  rights_to_promote_verified:false,reviewed_by_staff:false,campaign_status:"DRAFT"
 }).select("id,campaign_status").single();
 if(ins.error)return response(503,{error:"DRAFT_CREATION_FAILED"},origin);
 return response(201,{ok:true,id:ins.data.id,status:"DRAFT",approved:false,marketing_sent:false},origin);
});
Deno.serve((req:Request)=>{
 const raw=req.headers.get("origin"),origin=raw===ORIGIN?ORIGIN:null;
 if(raw&&!origin)return response(403,{error:"ORIGIN_DENIED"},null);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
 "access-control-allow-origin":origin??ORIGIN,"access-control-allow-headers":"apikey,authorization,content-type",
 "access-control-allow-methods":"GET,POST,OPTIONS","access-control-max-age":"300"
 }});
 return run(req);
});
