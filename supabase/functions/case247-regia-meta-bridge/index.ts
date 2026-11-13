import { createClient } from "npm:@supabase/supabase-js@2.78.0";

// CASE247 broker. Never exposes a token without a separate machine-to-machine secret.
// Requires current Meta authorization AND a verified, enabled territorial registry row.
const PROJECT = "qmeftxsdfeyqozwoivzo";
const BASE = "https://" + PROJECT + ".supabase.co";
const GRAPH = "https://graph.facebook.com/v26.0/";
const json=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{
  "content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",
  "referrer-policy":"no-referrer","vary":"authorization",
}});
const env=(key:string)=>Deno.env.get(key)||"";
const bytes=(s:string)=>new TextEncoder().encode(s);
async function authorized(req:Request):Promise<boolean>{
  const expected=env("CASE247_REGIA_BRIDGE_KEY");
  const provided=req.headers.get("x-case247-regia-key")||"";
  if(expected.length<48||provided.length!==expected.length)return false;
  const [a,b]=await Promise.all([crypto.subtle.digest("SHA-256",bytes(expected)),crypto.subtle.digest("SHA-256",bytes(provided))]);
  const left=new Uint8Array(a),right=new Uint8Array(b);
  let diff=0; for(let i=0;i<left.length;i++)diff|=left[i]^right[i];
  return diff===0;
}
function secretKey(){
  const x=env("SUPABASE_SERVICE_ROLE_KEY");
  if(!x)throw Error("BACKEND_AUTH_UNAVAILABLE");
  return x;
}
const from64=(s:string)=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
const to64=(a:Uint8Array)=>btoa(String.fromCharCode(...a));
async function metaCipherKey(mode:string){
  if(mode==="aes256-hkdf-meta-v1"){
    const secret=env("CASE247_META_APP_SECRET");
    if(!secret)throw Error("META_ENCRYPTION_KEY_MISSING");
    const material=await crypto.subtle.importKey("raw",bytes(secret),"HKDF",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:bytes("case247:"+PROJECT),
      info:bytes("meta-token-encryption:v1")},material,{name:"AES-GCM",length:256},false,["decrypt","encrypt"]);
  }
  if(mode==="aes256-env-v1"){
    const hex=env("CASE247_TOKEN_ENCRYPTION_KEY");
    if(!/^[a-f0-9]{64}$/i.test(hex))throw Error("META_ENCRYPTION_KEY_MISSING");
    return crypto.subtle.importKey("raw",Uint8Array.from(hex.match(/../g)!.map(x=>parseInt(x,16))),
      {name:"AES-GCM",length:256},false,["decrypt","encrypt"]);
  }
  throw Error("TOKEN_FORMAT_UNSUPPORTED");
}
async function decrypt(stored:string){
  const [mode,iv,ct,...rest]=String(stored).split(".");
  if(rest.length||!mode||!iv||!ct)throw Error("TOKEN_FORMAT_UNSUPPORTED");
  const key=await metaCipherKey(mode);
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:from64(iv)},key,from64(ct)));
}
async function encrypt(value:string,original:string){
  const mode=original.split(".")[0];
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await metaCipherKey(mode);
  const enc=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,bytes(value)));
  return [mode,to64(iv),to64(enc)].join(".");
}
async function graph(path:string,token:string,fields:string){
  const u=new URL(GRAPH+path);
  u.searchParams.set("fields",fields);
  const r=await fetch(u,{headers:{authorization:"Bearer "+token},signal:AbortSignal.timeout(14000),cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw Error("META_GRAPH_AUTH_OR_PERMISSION_FAILED");
  return j;
}
async function pages(token:string){
  const result:any[]=[]; let cursor="";
  for(let i=0;i<12;i++){
    const u=new URL(GRAPH+"me/accounts");
    u.searchParams.set("fields","id,name,tasks,access_token,instagram_business_account{id,username}");
    u.searchParams.set("limit","100");
    if(cursor)u.searchParams.set("after",cursor);
    const r=await fetch(u,{headers:{authorization:"Bearer "+token},signal:AbortSignal.timeout(16000),cache:"no-store"});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!Array.isArray(j.data))throw Error("META_PAGES_UNAVAILABLE");
    result.push(...j.data);
    if(!j.paging?.next)return result;
    const next=String(j.paging?.cursors?.after||"");
    if(!next||next===cursor)throw Error("META_CURSOR_INVALID");
    cursor=next;
  }
  throw Error("META_PAGE_LIST_TRUNCATED");
}
async function refreshIfNeeded(service:any,record:any,token:string){
  const expiry=record.token_expires_at?Date.parse(record.token_expires_at):NaN;
  if(!Number.isFinite(expiry))throw Error("META_TOKEN_EXPIRY_UNKNOWN");
  const remaining=expiry-Date.now();
  let fresh=token,notice="VALID";
  if(remaining<7*86400000){
    const id=env("CASE247_META_APP_ID"),secret=env("CASE247_META_APP_SECRET");
    if(id&&secret&&remaining>0){
      try{
        const u=new URL(GRAPH+"oauth/access_token");
        u.searchParams.set("grant_type","fb_exchange_token");
        u.searchParams.set("client_id",id);
        u.searchParams.set("client_secret",secret);
        u.searchParams.set("fb_exchange_token",token);
        const resp=await fetch(u,{signal:AbortSignal.timeout(15000),cache:"no-store"});
        const answer=await resp.json().catch(()=>({}));
        if(resp.ok&&typeof answer.access_token==="string"&&answer.access_token.length>30&&Number(answer.expires_in)>86400){
          fresh=answer.access_token;
          const nextExpiry=new Date(Date.now()+Number(answer.expires_in)*1000).toISOString();
          const crypted=await encrypt(fresh,record.encrypted_token);
          const {error}=await service.from("case247_meta_credentials").update({
            encrypted_token:crypted,token_expires_at:nextExpiry,
            updated_at:new Date().toISOString()
          }).eq("singleton",true).eq("encrypted_token",record.encrypted_token);
          if(error)throw Error("META_TOKEN_REFRESH_PERSIST_FAILED");
          notice="REFRESHED";
        }else{notice="REAUTHORIZATION_RECOMMENDED";}
      }catch{notice="REAUTHORIZATION_RECOMMENDED";}
    }else{
      notice="REAUTHORIZATION_RECOMMENDED";
    }
  }
  if(remaining<=0&&notice!=="REFRESHED")throw Error("META_TOKEN_EXPIRED_REAUTH_REQUIRED");
  return {token:fresh,notice};
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"});
  if(!(await authorized(req)))return json(401,{error:"BROKER_AUTH_FAILED"});
  if(!env("SUPABASE_URL")||!env("SUPABASE_SERVICE_ROLE_KEY"))return json(503,{error:"BACKEND_UNAVAILABLE"});
  const mode=req.headers.get("x-case247-bridge-mode")||"metadata";
  if(mode!=="metadata"&&mode!=="credentials")return json(400,{error:"INVALID_BRIDGE_MODE"});
  try{
    const service=createClient(BASE,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});
    const [saved,rows]=await Promise.all([
      service.from("case247_meta_credentials").select("encrypted_token,token_expires_at").eq("singleton",true).maybeSingle(),
      service.from("case247_territorial_meta_accounts").select(
        "town_id,platform,provider_id,page_id,public_url,handle,verified_at,verified_by,publishing_enabled,status"
      ).eq("publishing_enabled",true),
    ]);
    if(saved.error||rows.error)throw Error("SUPABASE_ACCOUNT_QUERY_FAILED");
    if(!saved.data?.encrypted_token)return json(409,{ok:false,error:"META_OAUTH_REQUIRED",accounts:{}});
    const token=await decrypt(saved.data.encrypted_token);
    const freshness=await refreshIfNeeded(service,saved.data,token);
    const perms=await graph("me/permissions",freshness.token,"permission,status");
    const granted=new Set((perms.data||[]).filter((x:any)=>x.status==="granted").map((x:any)=>x.permission));
    const fbGood=["pages_show_list","pages_manage_posts","pages_read_engagement"].every(x=>granted.has(x));
    const igGood=["instagram_basic","instagram_content_publish"].every(x=>granted.has(x));
    if(!fbGood)throw Error("META_REQUIRED_FACEBOOK_SCOPES_MISSING");
    const livePages=await pages(freshness.token);
    const byPage=new Map(livePages.map((p:any)=>[String(p.id),p]));
    const result:Record<string,any>={};
    let approved=0,ignored=0;
    for(const row of rows.data||[]){
      if(!row.verified_by||!row.verified_at||!row.provider_id||!row.page_id
         ||!String(row.public_url).startsWith("https://")
         ||!["ACTIVE_VERIFIED","VERIFIED_PENDING_DISPATCH"].includes(row.status)
         ||!["facebook","instagram"].includes(row.platform)){ignored++;continue;}
      const page:any=byPage.get(String(row.page_id));
      if(!page||!page.tasks?.includes("CREATE_CONTENT")||!page.access_token){ignored++;continue;}
      const isFB=row.platform==="facebook";
      if(!isFB&&!igGood){ignored++;continue;}
      if(isFB?String(row.provider_id)!==String(page.id):
           String(row.provider_id)!==String(page.instagram_business_account?.id)){ignored++;continue;}
      const pid=String(row.provider_id);
      const live=await graph(encodeURIComponent(pid),String(page.access_token),"id");
      if(String(live.id)!==pid){ignored++;continue;}
      if(!result[row.town_id])result[row.town_id]={};
      if(result[row.town_id][row.platform]){delete result[row.town_id][row.platform];ignored++;continue;}
      const acct:any={provider_id:pid,url:row.public_url,
        status:"ACTIVE_VERIFIED",publishing_enabled:true};
      if(mode==="credentials"){
        acct.access_token=String(page.access_token);
        if(isFB)acct.page_id=pid;
        else acct.ig_user_id=pid;
      }
      result[row.town_id][row.platform]=acct;
      approved++;
    }
    return json(200,{ok:true,accounts:result,approved_channels:approved,ignored_channels:ignored,
      token_state:freshness.notice,checked_at:new Date().toISOString()});
  }catch(e){
    const name=e instanceof Error?e.message:"BROKER_UNAVAILABLE";
    const safe=/^(META_|SUPABASE_|BACKEND_|TOKEN_)/.test(name)?name:"BROKER_UNAVAILABLE";
    return json(503,{ok:false,error:safe,accounts:{}});
  }
});