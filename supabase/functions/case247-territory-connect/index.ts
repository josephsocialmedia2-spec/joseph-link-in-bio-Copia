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


/** Canonical territory names; descriptions are proposed, not existing accounts. */
const TOWNS=[{"id":"avigliana","name":"Avigliana","ig":"case247_avigliana"},{"id":"almese","name":"Almese","ig":"case247_almese"},{"id":"rubiana","name":"Rubiana","ig":"case247_rubiana"},{"id":"villar-dora","name":"Villar Dora","ig":"case247_villardora"},{"id":"caprie","name":"Caprie","ig":"case247_caprie"},{"id":"condove","name":"Condove","ig":"case247_condove"},{"id":"sant-ambrogio-di-torino","name":"Sant’Ambrogio di Torino","ig":"case247_santambrogioditorino"},{"id":"chiusa-di-san-michele","name":"Chiusa di San Michele","ig":"case247_chiusadisanmichele"},{"id":"vaie","name":"Vaie","ig":"case247_vaie"},{"id":"san-didero","name":"San Didero","ig":"case247_sandidero"},{"id":"borgone-susa","name":"Borgone Susa","ig":"case247_borgonesusa"},{"id":"bussoleno","name":"Bussoleno","ig":"case247_bussoleno"},{"id":"chianocco","name":"Chianocco","ig":"case247_chianocco"},{"id":"susa","name":"Susa","ig":"case247_susa"},{"id":"mompantero","name":"Mompantero","ig":"case247_mompantero"},{"id":"san-giorio-di-susa","name":"San Giorio di Susa","ig":"case247_sangioriodisusa"},{"id":"villar-focchiardo","name":"Villar Focchiardo","ig":"case247_villarfocchiardo"},{"id":"venaus","name":"Venaus","ig":"case247_venaus"},{"id":"giaglione","name":"Giaglione","ig":"case247_giaglione"},{"id":"gravere","name":"Gravere","ig":"case247_gravere"},{"id":"exilles","name":"Exilles","ig":"case247_exilles"},{"id":"salbertrand","name":"Salbertrand","ig":"case247_salbertrand"},{"id":"oulx","name":"Oulx","ig":"case247_oulx"},{"id":"sauze-d-oulx","name":"Sauze d’Oulx","ig":"case247_sauzedoulx"},{"id":"cesana-torinese","name":"Cesana Torinese","ig":"case247_cesanatorinese"},{"id":"claviere","name":"Claviere","ig":"case247_claviere"},{"id":"novalesa","name":"Novalesa","ig":"case247_novalesa"},{"id":"moncenisio","name":"Moncenisio","ig":"case247_moncenisio"},{"id":"pragelato","name":"Pragelato","ig":"case247_pragelato"},{"id":"bardonecchia","name":"Bardonecchia","ig":"case247_bardonecchia"},{"id":"chiomonte","name":"Chiomonte","ig":"case247_chiomonte"},{"id":"sant-antonino-di-susa","name":"Sant’Antonino di Susa","ig":"case247_santantoninodisusa"},{"id":"rivoli","name":"Rivoli","ig":"case247_rivoli"},{"id":"giaveno","name":"Giaveno","ig":"case247_giaveno"},{"id":"grugliasco","name":"Grugliasco","ig":"case247_grugliasco"},{"id":"torino","name":"Torino","ig":"case247_torino"},{"id":"moncalieri","name":"Moncalieri","ig":"case247_moncalieri"},{"id":"collegno","name":"Collegno","ig":"case247_collegno"},{"id":"pianezza","name":"Pianezza","ig":"case247_pianezza"},{"id":"borgaro-torinese","name":"Borgaro Torinese","ig":"case247_borgarotorinese"},{"id":"valgioie","name":"Valgioie","ig":"case247_valgioie"}];
const TOWN_MAP=new Map(TOWNS.map(x=>[x.id,x]));
const normalize=(s:string)=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
function pageMatch(name:string,t:any){return normalize(name)===normalize("Case in Pubblicità 24/7 - "+t.name)}
function igMatch(handle:string,t:any){
  const s=String(handle||"").toLowerCase(),tail=t.id.replace(/-/g,"");
  return s===t.ig||s.endsWith("_"+tail)||s.endsWith("."+tail);
}
async function validatePair(page:any,t:any,fbPerm:boolean,igPerm:boolean){
 if(!page||!pageMatch(page.name,t))throw Error("TERRITORIAL_PAGE_NOT_AUTHORIZED");
 if(!fbPerm||!igPerm)throw Error("REQUIRED_PERMISSIONS_MISSING");
 if(!page.access_token||!page.tasks?.includes("CREATE_CONTENT"))throw Error("FACEBOOK_CONTENT_TASK_MISSING");
 const detail=await graph(encodeURIComponent(String(page.id)),String(page.access_token),{fields:"id,name,instagram_business_account{id,username}"});
 if(String(detail.id)!==String(page.id))throw Error("PAGE_IDENTITY_MISMATCH");
 const ig=detail.instagram_business_account;
 if(!ig?.id||!ig?.username||!igMatch(ig.username,t))throw Error("INSTAGRAM_TERRITORY_NOT_MATCHED");
 const igDetails=await graph(encodeURIComponent(String(ig.id)),String(page.access_token),{fields:"id,username,account_type"});
 if(String(igDetails.id)!==String(ig.id)||!["BUSINESS","MEDIA_CREATOR"].includes(String(igDetails.account_type)))throw Error("INSTAGRAM_ACCOUNT_NOT_VERIFIED");
 return {page,ig};
}
function verifiedRows(pair:any,t:any,adminId:string){
 const when=new Date().toISOString();
 return [
 {town_id:t.id,platform:"facebook",provider_id:String(pair.page.id),page_id:String(pair.page.id),public_url:"https://www.facebook.com/"+encodeURIComponent(String(pair.page.id)),handle:null,verified_by:adminId,verified_at:when,updated_at:when,publishing_enabled:false,status:"VERIFIED_PENDING_DISPATCH"},
 {town_id:t.id,platform:"instagram",provider_id:String(pair.ig.id),page_id:String(pair.page.id),public_url:"https://www.instagram.com/"+encodeURIComponent(String(pair.ig.username))+"/",handle:String(pair.ig.username),verified_by:adminId,verified_at:when,updated_at:when,publishing_enabled:false,status:"VERIFIED_PENDING_DISPATCH"}
 ];
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
  const townId=url.searchParams.get("town_id")||"avigliana";
  if(req.method==="GET"&&action==="status"){
    if(townId!=="all"&&!TOWN_MAP.has(townId))return reply(400,{error:"UNKNOWN_TOWN"});
    let q=service.from("case247_territorial_meta_accounts")
      .select("town_id,platform,provider_id,page_id,public_url,handle,verified_at,status,publishing_enabled");
    if(townId!=="all")q=q.eq("town_id",townId);
    const {data,error}=await q.order("town_id");
    if(error)return reply(503,{error:"TERRITORIAL_REGISTRY_UNAVAILABLE"});
    return reply(200,{ok:true,town_id:townId,accounts:data||[],towns_configured:41,publication_live:false});
  }
  if(req.method==="GET"&&(action!=="pages"||!TOWN_MAP.has(townId)))return reply(400,{error:"UNKNOWN_ACTION_OR_TOWN"});
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
      const t=TOWN_MAP.get(townId);
      const candidates=allPages.filter((p:any)=>pageMatch(String(p.name||""),t))
        .map((p:any)=>({page_id:String(p.id),page_name:String(p.name||""),
          can_create_content:!!p.tasks?.includes("CREATE_CONTENT"),
          instagram:p.instagram_business_account?{id:String(p.instagram_business_account.id||""),
            username:String(p.instagram_business_account.username||"")}:null}));
      return reply(200,{ok:true,town_id:townId,matching_pages:candidates,
        facebook_permissions_granted:fbPermissions,instagram_permissions_granted:igPermissions,
        missing_permissions:[...facebookRequired,...instagramRequired].filter(k=>!granted.has(k)),
        authorization_action_required:!candidates.length||!fbPermissions||!igPermissions,
        publication_live:false});
    }
    let body:any;
    try{body=await req.json()}catch{return reply(400,{error:"INVALID_JSON"})}
    if(body?.mode==="scan"){
      // Batch discover and verify existing Meta-owned accounts ONLY.
      if(!fbPermissions||!igPermissions)return reply(409,{error:"REQUIRED_META_PERMISSIONS_MISSING"});
      const linked:any[]=[],blocked:any[]=[],used=new Set<string>();
      for(const t of TOWNS){
        const candidates=allPages.filter((p:any)=>pageMatch(String(p.name||""),t));
        if(candidates.length!==1){blocked.push({town_id:t.id,reason:candidates.length?"AMBIGUOUS_PAGE":"NO_MATCHING_PAGE"});continue}
        const page=candidates[0];
        if(used.has(String(page.id))){blocked.push({town_id:t.id,reason:"PAGE_ALREADY_ASSIGNED"});continue}
        try{
          const pair=await validatePair(page,t,fbPermissions,igPermissions);
          const {error:e}=await service.from("case247_territorial_meta_accounts")
            .upsert(verifiedRows(pair,t,user.id),{onConflict:"town_id,platform"});
          if(e)throw Error("TERRITORIAL_REGISTRY_WRITE_FAILED");
          used.add(String(page.id));
          linked.push({town_id:t.id,page_id:String(page.id),instagram_id:String(pair.ig.id)});
        }catch(e){blocked.push({town_id:t.id,reason:e instanceof Error?e.message:"VERIFY_FAILED"})}
      }
      return reply(200,{ok:true,scanned_towns:41,linked,blocked,
        publishing_enabled:false,status:"VERIFIED_PENDING_DISPATCH"});
    }
    if(!TOWN_MAP.has(body?.town_id)||typeof body?.page_id!=="string"||!/^\\d{5,30}$/.test(body.page_id))
      return reply(400,{error:"INVALID_TERRITORY_OR_PAGE"});
    const t=TOWN_MAP.get(body.town_id);
    const page=allPages.find((p:any)=>String(p.id)===body.page_id);
    let pair:any;
    try{pair=await validatePair(page,t,fbPermissions,igPermissions)}
    catch(e){return reply(409,{error:e instanceof Error?e.message:"ACCOUNT_VERIFICATION_FAILED"})}
    const {error:saveError}=await service.from("case247_territorial_meta_accounts")
      .upsert(verifiedRows(pair,t,user.id),{onConflict:"town_id,platform"});
    if(saveError)return reply(503,{error:"TERRITORIAL_CONNECTION_SAVE_FAILED"});
    return reply(200,{ok:true,town_id:t.id,page_id:String(pair.page.id),
      instagram_id:String(pair.ig.id),instagram_username:String(pair.ig.username),
      status:"VERIFIED_PENDING_DISPATCH",publication_live:false});
  }catch(error){
    const name=error instanceof Error?error.message:"META_UNKNOWN_ERROR";
    if(name.startsWith("META_GRAPH_"))return reply(409,{error:"META_AUTHORIZATION_OR_API_ERROR",meta_code:name.slice(11)});
    return reply(502,{error:"META_ACCOUNT_VERIFICATION_FAILED"});
  }
});