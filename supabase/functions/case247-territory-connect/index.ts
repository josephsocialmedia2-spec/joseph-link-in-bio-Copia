import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const PROJECT = "qmeftxsdfeyqozwoivzo";
const BASE = "https://" + PROJECT + ".supabase.co";
const ORIGIN = "https://josephsocialmedia2-spec.github.io";
const HEADERS = {
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "access-control-allow-origin":ORIGIN,
  "access-control-allow-methods":"GET,POST,OPTIONS",
  "access-control-allow-headers":"authorization,apikey,content-type",
  "vary":"Origin"
};
const reply = (status:number, data:unknown)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
function envDefault(name:string) {
  try { const x=JSON.parse(Deno.env.get(name)||"{}"); return typeof x.default==="string"?x.default:""; }
  catch { return ""; }
}
const PUBLIC_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")||envDefault("SUPABASE_PUBLISHABLE_KEYS");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envDefault("SUPABASE_SECRET_KEYS");
const from64 = (text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));

async function decrypt(encrypted:string) {
  const parts=encrypted.split(".");
  if(parts.length!==3)throw Error("TOKEN_FORMAT_UNSUPPORTED");
  const [mode,iv,ciphertext]=parts;
  let key:CryptoKey;
  if(mode==="aes256-hkdf-meta-v1"){
    const secret=Deno.env.get("CASE247_META_APP_SECRET")||"";
    if(!secret)throw Error("ENCRYPTION_KEY_MISSING");
    const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),"HKDF",false,["deriveKey"]);
    key=await crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:new TextEncoder().encode("case247:"+PROJECT),info:new TextEncoder().encode("meta-token-encryption:v1")},material,{name:"AES-GCM",length:256},false,["decrypt"]);
  }else if(mode==="aes256-env-v1"){
    const hex=(Deno.env.get("CASE247_TOKEN_ENCRYPTION_KEY")||"").replace(/\s/g,"");
    if(!/^[0-9a-fA-F]{64}$/.test(hex))throw Error("ENCRYPTION_KEY_MISSING");
    key=await crypto.subtle.importKey("raw",Uint8Array.from(hex.match(/../g)!.map(x=>parseInt(x,16))),"AES-GCM",false,["decrypt"]);
  }else throw Error("TOKEN_FORMAT_UNSUPPORTED");
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:from64(iv)},key,from64(ciphertext)));
}

async function graph(path:string,token:string,query:Record<string,string>={}) {
  const u=new URL("https://graph.facebook.com/v26.0/"+path);
  for(const [k,v] of Object.entries(query))u.searchParams.set(k,v);
  const r=await fetch(u,{headers:{authorization:"Bearer "+token, "cache-control":"no-store"},signal:AbortSignal.timeout(15000)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw Error("META_GRAPH_"+String(j?.error?.code||r.status));
  return j;
}
async function pages(token:string) {
  const result:any[]=[];
  let cursor="";
  for(let batch=0;batch<12;batch++){
    const q:Record<string,string>={fields:"id,name,tasks,access_token,instagram_business_account{id,username}",limit:"100"};
    if(cursor)q.after=cursor;
    const data=await graph("me/accounts",token,q);
    if(!Array.isArray(data.data))throw Error("META_ACCOUNTS_INVALID");
    result.push(...data.data);
    if(!data.paging?.next)return result;
    const next=data.paging?.cursors?.after;
    if(!next||next===cursor)throw Error("META_ACCOUNT_PAGINATION_FAILED");
    cursor=next; // Never follow paging.next: it may embed sensitive query values.
  }
  throw Error("META_ACCOUNT_PAGINATION_LIMIT");
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return reply(200,{ok:true});
  if(!["GET","POST"].includes(req.method))return reply(405,{error:"METHOD_NOT_ALLOWED"});
  if(req.headers.get("origin")&&req.headers.get("origin")!==ORIGIN)return reply(403,{error:"ORIGIN_BLOCKED"});
  const access=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]||"";
  if(!access)return reply(401,{error:"AUTH_REQUIRED"});
  if(!PUBLIC_KEY||!SERVICE_KEY)return reply(503,{error:"BACKEND_NOT_CONFIGURED"});
  const userClient=createClient(BASE,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser(access);
  if(userError||!user)return reply(401,{error:"AUTH_INVALID"});
  const service=createClient(BASE,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:admin,error:adminError}=await service.from("case247_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(adminError)return reply(503,{error:"ADMIN_LOOKUP_FAILED"});
  if(!admin)return reply(403,{error:"ADMIN_REQUIRED"});

  const url=new URL(req.url);
  const action=req.method==="GET"?(url.searchParams.get("action")||"status"):"verify";
  if(req.method==="GET"&&action==="status"){
    const {data,error}=await service.from("case247_territorial_meta_accounts")
      .select("town_id,platform,provider_id,page_id,public_url,handle,verified_at,status,publishing_enabled")
      .eq("town_id","avigliana").order("platform");
    if(error)return reply(503,{error:"TERRITORIAL_REGISTRY_UNAVAILABLE"});
    return reply(200,{ok:true,town_id:"avigliana",accounts:data||[],publication_live:false});
  }
  if(req.method==="GET"&&action!=="pages")return reply(400,{error:"UNKNOWN_ACTION"});
  if(req.method==="POST"&&Number(req.headers.get("content-length")||"0")>5000)return reply(413,{error:"REQUEST_TOO_LARGE"});

  const {data:record,error:credsError}=await service.from("case247_meta_credentials")
    .select("encrypted_token,token_expires_at").eq("singleton",true).maybeSingle();
  if(credsError)return reply(503,{error:"META_CREDENTIAL_LOOKUP_FAILED"});
  if(!record?.encrypted_token)return reply(409,{error:"META_OAUTH_REQUIRED"});
  if(record.token_expires_at&&Date.parse(record.token_expires_at)<=Date.now())return reply(409,{error:"META_OAUTH_EXPIRED"});
  let token:string;
  try{token=await decrypt(record.encrypted_token)}catch{return reply(503,{error:"META_CREDENTIAL_NOT_READABLE"})}
  try{
    const [allPages,perms]=await Promise.all([pages(token),graph("me/permissions",token)]);
    const granted=new Set((Array.isArray(perms.data)?perms.data:[])
      .filter((p:any)=>p.status==="granted").map((p:any)=>String(p.permission)));
    const facebookRequired=["pages_show_list","pages_manage_posts","pages_read_engagement"];
    const instagramRequired=["instagram_basic","instagram_content_publish"];
    const fbPermissions=facebookRequired.every(k=>granted.has(k));
    const igPermissions=instagramRequired.every(k=>granted.has(k));

    if(req.method==="GET"){
      const candidates=allPages
        .filter((pg:any)=>/avigliana/i.test(String(pg.name||"")))
        .map((pg:any)=>({
          page_id:String(pg.id||""),
          page_name:String(pg.name||""),
          can_create_content:Array.isArray(pg.tasks)&&pg.tasks.includes("CREATE_CONTENT"),
          instagram:pg.instagram_business_account?{
            id:String(pg.instagram_business_account.id||""),
            username:String(pg.instagram_business_account.username||"")
          }:null
        }));
      return reply(200,{ok:true,town_id:"avigliana",matching_pages:candidates,
        facebook_permissions_granted:fbPermissions,instagram_permissions_granted:igPermissions,
        missing_permissions:[...facebookRequired,...instagramRequired].filter(k=>!granted.has(k)),
        authorization_action_required:!candidates.length||!fbPermissions||!igPermissions,
        publication_live:false});
    }
    let body:any;
    try{body=await req.json()}catch{return reply(400,{error:"INVALID_JSON"})}
    if(body?.town_id!=="avigliana"||typeof body?.page_id!=="string"||!/^\d{5,30}$/.test(body.page_id))
      return reply(400,{error:"INVALID_TERRITORY_OR_PAGE"});
    const page=allPages.find((pg:any)=>String(pg.id)===body.page_id);
    if(!page||!/avigliana/i.test(String(page.name||"")))return reply(409,{error:"AVIGLIANA_PAGE_NOT_AUTHORIZED"});
    if(!fbPermissions||!igPermissions)return reply(409,{error:"REQUIRED_META_PERMISSIONS_MISSING"});
    if(!page.access_token||!Array.isArray(page.tasks)||!page.tasks.includes("CREATE_CONTENT"))
      return reply(409,{error:"FACEBOOK_CONTENT_TASK_MISSING"});
    const pageDetails=await graph(encodeURIComponent(String(page.id)),String(page.access_token),
      {fields:"id,name,instagram_business_account{id,username}"});
    if(String(pageDetails.id)!==body.page_id)return reply(409,{error:"PAGE_IDENTITY_MISMATCH"});
    const instagram=pageDetails.instagram_business_account;
    if(!instagram?.id||!instagram.username)return reply(409,{error:"INSTAGRAM_PROFESSIONAL_NOT_LINKED"});
    if(!/avigliana/i.test(String(instagram.username)))return reply(409,{error:"INSTAGRAM_NOT_TERRITORIAL"});
    const igDetail=await graph(encodeURIComponent(String(instagram.id)),String(page.access_token),
      {fields:"id,username,account_type"});
    if(String(igDetail.id)!==String(instagram.id)||!["BUSINESS","MEDIA_CREATOR"].includes(String(igDetail.account_type)))
      return reply(409,{error:"INSTAGRAM_ACCOUNT_NOT_VERIFIED"});
    const when=new Date().toISOString();
    const rows=[
      {town_id:"avigliana",platform:"facebook",provider_id:String(page.id),page_id:String(page.id),
       public_url:"https://www.facebook.com/"+encodeURIComponent(String(page.id)),
       handle:null,verified_by:user.id,verified_at:when,updated_at:when,publishing_enabled:false,
       status:"VERIFIED_PENDING_DISPATCH"},
      {town_id:"avigliana",platform:"instagram",provider_id:String(instagram.id),page_id:String(page.id),
       public_url:"https://www.instagram.com/"+encodeURIComponent(String(instagram.username))+"/",
       handle:String(instagram.username),verified_by:user.id,verified_at:when,updated_at:when,publishing_enabled:false,
       status:"VERIFIED_PENDING_DISPATCH"}
    ];
    const {error:saveError}=await service.from("case247_territorial_meta_accounts")
      .upsert(rows,{onConflict:"town_id,platform"});
    if(saveError)return reply(503,{error:"TERRITORIAL_CONNECTION_SAVE_FAILED"});
    return reply(200,{ok:true,town_id:"avigliana",page_id:String(page.id),
      instagram_id:String(instagram.id),instagram_username:String(instagram.username),
      status:"VERIFIED_PENDING_DISPATCH",publication_live:false});
  }catch(error){
    const name=error instanceof Error?error.message:"META_UNKNOWN_ERROR";
    if(name.startsWith("META_GRAPH_"))return reply(409,{error:"META_AUTHORIZATION_OR_API_ERROR",meta_code:name.slice(11)});
    return reply(502,{error:"META_ACCOUNT_VERIFICATION_FAILED"});
  }
});