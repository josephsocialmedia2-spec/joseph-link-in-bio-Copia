import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const HOST="https://qmeftxsdfeyqozwoivzo.supabase.co";
const headers={
  "content-type":"application/json; charset=utf-8",
  "access-control-allow-origin":"*",
  "access-control-allow-methods":"GET,OPTIONS",
  "cache-control":"public, max-age=120"
};
const respond=(status:number,data:object)=>new Response(JSON.stringify(data),{status,headers});
function defaultSecret(){
  const direct=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(direct)return direct;
  try{
    const v=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
    return typeof v.default==="string"?v.default:"";
  }catch{return ""}
}
function validSocialLink(value:string,platform:"facebook"|"instagram"){
  try{
    const u=new URL(value);
    if(u.protocol!=="https:"||u.username||u.password)return false;
    const allowed=platform==="facebook"?["facebook.com","www.facebook.com"]:["instagram.com","www.instagram.com"];
    return allowed.includes(u.hostname.toLowerCase())&&u.pathname.length>1;
  }catch{return false}
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return respond(200,{ok:true});
  if(req.method!=="GET")return respond(405,{error:"METHOD_NOT_ALLOWED"});
  const id=new URL(req.url).searchParams.get("town_id")||"";
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||id.length>70)
    return respond(400,{error:"INVALID_TOWN_ID"});
  const key=defaultSecret();
  if(!key)return respond(503,{error:"SOCIAL_LINK_REGISTRY_UNAVAILABLE"});
  const supabase=createClient(HOST,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await supabase.from("case247_territorial_meta_accounts")
    .select("platform,public_url,page_id,status,verified_at")
    .eq("town_id",id)
    .eq("status","VERIFIED_PENDING_DISPATCH");
  if(error)return respond(503,{error:"SOCIAL_LINK_REGISTRY_ERROR"});
  const fb=(data||[]).find((x:any)=>x.platform==="facebook");
  const ig=(data||[]).find((x:any)=>x.platform==="instagram");
  if(!fb||!ig||String(fb.page_id)!==String(ig.page_id)
      ||!validSocialLink(fb.public_url,"facebook")
      ||!validSocialLink(ig.public_url,"instagram")){
    return respond(200,{town_id:id,verified:false,facebook_url:null,instagram_url:null});
  }
  return respond(200,{town_id:id,verified:true,facebook_url:fb.public_url,
    instagram_url:ig.public_url,verified_at:fb.verified_at});
});