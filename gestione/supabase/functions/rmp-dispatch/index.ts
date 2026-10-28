// REAL MEDIA PRO: fail-closed dispatcher. In Supabase: 135 preexisting drafts remain untouched.
// Protected by a random Vault key; "enabled=false" by default. No public posting endpoint.
const PROJECT="qmeftxsdfeyqozwoivzo";
const META_VERSION=Deno.env.get("RMP_META_API_VERSION")||"v24.0";
const LI_VERSION=Deno.env.get("RMP_LINKEDIN_VERSION")||"202610";
const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const output=(code,x)=>new Response(JSON.stringify(x),{status:code,headers});
const env=n=>Deno.env.get(n)||"";
class Blocked extends Error {}
class Uncertain extends Error {}
async function json(res){const s=await res.text();try{return s?JSON.parse(s):{}}catch{return {}}}
function key(){
  let v="";try{v=JSON.parse(env("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{}
  return v||env("SUPABASE_SERVICE_ROLE_KEY");
}
async function db(path,method="GET",body){
  const k=key(),u=env("SUPABASE_URL");
  if(!k||u!=="https://"+PROJECT+".supabase.co")throw new Blocked("DATABASE_CONFIGURATION_UNAVAILABLE");
  const h={"apikey":k,"Accept":"application/json","Prefer":"return=representation",
    ...(k.startsWith("sb_secret_")?{}:{"Authorization":"Bearer "+k}),
    ...(body?{"Content-Type":"application/json"}:{})};
  const r=await fetch(u+"/rest/v1/"+path,{method,headers:h,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Blocked("DATABASE_HTTP_"+r.status);
  return json(r);
}
function qs(p){return new URLSearchParams(p).toString()}
const get=(table,filter)=>db(table+"?"+qs(filter));
const patch=(j,body,status)=>db("rmp_publication_jobs?"+qs({id:"eq."+j.id,status:"eq."+status}),"PATCH",{...body,updated_at:new Date().toISOString()});
async function audit(job_id,event_type,status,details={}){
  try{await db("rmp_publication_events","POST",{job_id,event_type,status,details})}catch{}
}
async function hash(s){const b=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")}
function equal(a,b){if(!a||!b||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function required(k){const v=env(k);if(!v)throw new Blocked("MISSING_"+k);return v}
function expiry(k){const t=Date.parse(required(k+"_TOKEN_EXPIRES_AT"));if(!Number.isFinite(t)||t<Date.now()+48*3600000)throw new Blocked("TOKEN_EXPIRY_"+k)}
function mediaURL(s){
 let u;try{u=new URL(s)}catch{throw new Blocked("INVALID_MEDIA_URL")}
 const host=required("RMP_ALLOWED_MEDIA_HOST").toLowerCase();
 if(u.protocol!=="https:"||u.hostname.toLowerCase()!==host||u.port||u.username||u.password||u.hash||!/\.(mp4|mov)$/i.test(u.pathname))throw new Blocked("MEDIA_HOST_OR_EXTENSION_NOT_ALLOWED");
 return u.href;
}
async function checkMedia(s){
 const u=mediaURL(s);
 let r;try{r=await fetch(u,{method:"HEAD",redirect:"error",signal:AbortSignal.timeout(8000)})}catch{throw new Blocked("MEDIA_HEAD_FAILED")}
 if(!r.ok)throw new Blocked("MEDIA_HEAD_"+r.status);
 const ct=(r.headers.get("content-type")||"").split(";")[0].toLowerCase();
 const size=Number(r.headers.get("content-length")||0);
 if(!["video/mp4","video/quicktime"].includes(ct)||size<1024||size>50000000)throw new Blocked("MEDIA_TYPE_OR_SIZE_NOT_VERIFIED");
 return {url:u,size};
}
const graph=p=>"https://graph.facebook.com/"+META_VERSION+"/"+p;
async function request(url,token,method="GET",data){
 const h={"Authorization":"Bearer "+token};let body;
 if(data instanceof URLSearchParams){h["Content-Type"]="application/x-www-form-urlencoded";body=data.toString()}
 else if(data!==undefined){h["Content-Type"]="application/json";body=JSON.stringify(data)}
 let r;try{r=await fetch(url,{method,headers:h,body,redirect:"error",signal:AbortSignal.timeout(20000)})}catch{throw new Uncertain("REMOTE_REQUEST_RESULT_UNKNOWN")}
 const value=await json(r);if(!r.ok)throw new Blocked("REMOTE_HTTP_"+r.status);
 return {value,headers:r.headers,status:r.status};
}
async function linkedin(url,token,method="GET",body){
 const h={"Authorization":"Bearer "+token,"Linkedin-Version":LI_VERSION,"X-Restli-Protocol-Version":"2.0.0","Content-Type":"application/json"};
 let r;try{r=await fetch("https://api.linkedin.com/rest/"+url,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),redirect:"error",signal:AbortSignal.timeout(20000)})}catch{throw new Uncertain("LINKEDIN_REMOTE_OUTCOME_UNKNOWN")}
 const value=await json(r);if(!r.ok)throw new Blocked("LINKEDIN_HTTP_"+r.status);
 return {value,headers:r.headers};
}
async function verify(job,p){
 if(!p||p.id!==job.social_profile_id||p.track_slug!==job.track_slug||p.platform!==job.platform||p.auth_status!=="VERIFIED"||!p.external_account_id||!p.verified_at)
  throw new Blocked("SOCIAL_IDENTITY_NOT_VERIFIED");
 if(!Number.isFinite(Date.parse(p.verified_at))||Date.now()-Date.parse(p.verified_at)>7*86400000)throw new Blocked("SOCIAL_IDENTITY_CHECK_STALE");
 const scope={facebook:"pages_manage_posts",instagram:"instagram_content_publish",linkedin:"w_member_social"}[job.platform];
 if(!(p.granted_scopes||[]).includes(scope))throw new Blocked("OAUTH_SCOPE_MISSING");
 let id=p.external_account_id,token;
 if(job.platform==="facebook"){
  token=required("RMP_FACEBOOK_PAGE_TOKEN");expiry("RMP_FACEBOOK");
  if(required("RMP_FACEBOOK_PAGE_ID")!==id)throw new Blocked("FACEBOOK_ID_MISMATCH");
  const v=(await request(graph(encodeURIComponent(id)+"?fields=id,name"),token)).value;
  if(String(v.id)!==id)throw new Blocked("FACEBOOK_GRAPH_NOT_VERIFIED");
 }else if(job.platform==="instagram"){
  token=required("RMP_INSTAGRAM_ACCESS_TOKEN");expiry("RMP_INSTAGRAM");
  if(required("RMP_INSTAGRAM_ACCOUNT_ID")!==id)throw new Blocked("INSTAGRAM_ID_MISMATCH");
  const v=(await request(graph(encodeURIComponent(id)+"?fields=id,username,account_type"),token)).value;
  if(String(v.id)!==id||!["BUSINESS","CREATOR"].includes(v.account_type))throw new Blocked("INSTAGRAM_GRAPH_NOT_VERIFIED");
 }else if(job.platform==="linkedin"){
  token=required("RMP_LINKEDIN_TOKEN");expiry("RMP_LINKEDIN");
  if(!/^urn:li:person:[\w-]+$/.test(id)||required("RMP_LINKEDIN_OWNER_URN")!==id)throw new Blocked("LINKEDIN_ID_MISMATCH");
  const v=(await request("https://api.linkedin.com/v2/userinfo",token)).value;
  if("urn:li:person:"+v.sub!==id)throw new Blocked("LINKEDIN_MEMBER_NOT_VERIFIED");
 }else throw new Blocked("UNSUPPORTED_PLATFORM");
 return {id,token};
}
async function fb(job,a,media){
 const d=new URLSearchParams({file_url:media.url,description:job.caption,published:"true"});
 const result=(await request(graph(encodeURIComponent(a.id)+"/videos"),a.token,"POST",d)).value;
 const id=String(result.id||"");if(!/^\d+$/.test(id))throw new Uncertain("FACEBOOK_POST_ID_UNKNOWN");
 const v=(await request(graph(id+"?fields=id,permalink_url"),a.token)).value;
 if(String(v.id)!==id||!v.permalink_url)throw new Uncertain("FACEBOOK_POST_PERMALINK_PENDING");
 return {id,url:String(v.permalink_url)};
}
const sleep=(t)=>new Promise(resolve=>setTimeout(resolve,t));
async function ig(job,a,media){
 const data=new URLSearchParams({media_type:"REELS",video_url:media.url,caption:job.caption,share_to_feed:"true"});
 const container=String((await request(graph(encodeURIComponent(a.id)+"/media"),a.token,"POST",data)).value.id||"");
 if(!/^\d+$/.test(container))throw new Uncertain("IG_CONTAINER_UNKNOWN");
 let ready=false;
 for(let i=0;i<7;i++){
  await sleep(2500);
  const s=(await request(graph(container+"?fields=status_code"),a.token)).value.status_code;
  if(s==="FINISHED"){ready=true;break}
  if(s==="ERROR"||s==="EXPIRED")throw new Blocked("IG_MEDIA_"+s);
 }
 if(!ready)throw new Uncertain("IG_MEDIA_PROCESSING");
 const id=String((await request(graph(encodeURIComponent(a.id)+"/media_publish"),a.token,"POST",new URLSearchParams({creation_id:container}))).value.id||"");
 if(!/^\d+$/.test(id))throw new Uncertain("IG_PUBLISH_ID_UNKNOWN");
 const v=(await request(graph(id+"?fields=id,permalink"),a.token)).value;
 if(String(v.id)!==id||!v.permalink)throw new Uncertain("IG_PERMALINK_PENDING");
 return {id,url:v.permalink};
}
async function li(job,a,media){
 let r;try{r=await fetch(media.url,{redirect:"error",signal:AbortSignal.timeout(25000)})}catch{throw new Blocked("VIDEO_DOWNLOAD_FAILED")}
 if(!r.ok)throw new Blocked("VIDEO_DOWNLOAD_HTTP_"+r.status);
 const bytes=new Uint8Array(await r.arrayBuffer());
 if(bytes.byteLength!==media.size)throw new Blocked("VIDEO_BYTES_MISMATCH");
 const init=(await linkedin("videos?action=initializeUpload",a.token,"POST",{initializeUploadRequest:{owner:a.id,fileSizeBytes:bytes.byteLength,uploadCaptions:false,uploadThumbnail:false}})).value.value||{};
 const parts=init.uploadInstructions||[],video=init.video;
 if(!/^urn:li:video:[\w-]+$/.test(video||"")||!Array.isArray(parts)||!parts.length)throw new Blocked("LINKEDIN_VIDEO_INIT_INVALID");
 const uploaded=[];
 for(const part of parts){
  const f=part.firstByte,l=part.lastByte,url=part.uploadUrl;
  if(!Number.isInteger(f)||!Number.isInteger(l)||l<f||l>=bytes.length||!String(url).startsWith("https://"))throw new Blocked("LINKEDIN_PART_INVALID");
  let put;try{put=await fetch(url,{method:"PUT",headers:{"Content-Type":"application/octet-stream"},body:bytes.slice(f,l+1),redirect:"error",signal:AbortSignal.timeout(25000)})}catch{throw new Uncertain("LINKEDIN_VIDEO_PUT_UNKNOWN")}
  if(!put.ok)throw new Blocked("LINKEDIN_VIDEO_PUT_"+put.status);
  const tag=put.headers.get("etag");if(!tag)throw new Uncertain("LINKEDIN_ETAG_UNKNOWN");
  uploaded.push(tag.replace(/^"|"$/g,""));
 }
 await linkedin("videos?action=finalizeUpload",a.token,"POST",{finalizeUploadRequest:{video:video,uploadToken:init.uploadToken||"",uploadedPartIds:uploaded}});
 let finished=false;
 for(let i=0;i<6;i++){
  await sleep(2500);
  const s=(await linkedin("videos/"+encodeURIComponent(video),a.token)).value.status;
  if(s==="AVAILABLE"){finished=true;break}
  if(s==="PROCESSING_FAILED")throw new Blocked("LINKEDIN_VIDEO_FAILED");
 }
 if(!finished)throw new Uncertain("LINKEDIN_VIDEO_PROCESSING");
 const post=await linkedin("posts",a.token,"POST",{
  author:a.id,commentary:job.caption,visibility:"PUBLIC",lifecycleState:"PUBLISHED",
  distribution:{feedDistribution:"MAIN_FEED",targetEntities:[],thirdPartyDistributionChannels:[]},
  content:{media:{title:"REAL MEDIA PRO",id:video}},isReshareDisabledByAuthor:false
 });
 const urn=post.headers.get("x-restli-id");
 if(!/^urn:li:(ugcPost|share):\d+$/.test(urn||""))throw new Uncertain("LINKEDIN_POST_URN_UNKNOWN");
 const found=(await linkedin("posts/"+encodeURIComponent(urn)+"?viewContext=AUTHOR",a.token)).value;
 if(found.id!==urn||found.lifecycleState!=="PUBLISHED")throw new Uncertain("LINKEDIN_POST_NOT_VERIFIED");
 return {id:urn,url:null};
}
async function publish(job){
 const p=await get("rmp_social_profiles",{id:"eq."+job.social_profile_id,select:"*"});
 if(p.length!==1)throw new Blocked("PROFILE_NOT_FOUND");
 if(!job.caption||job.caption.length>1900||!["REEL","VIDEO"].includes(job.content_type))throw new Blocked("NOT_APPROVED_VIDEO");
 // All preflight checks precede the irreversible READY -> PUBLISHING transition.
 const account=await verify(job,p[0]),media=await checkMedia(job.media_url);
 const got=await patch(job,{status:"PUBLISHING",attempt_count:job.attempt_count+1,last_error:null},"READY");
 if(!Array.isArray(got)||got.length!==1)return {state:"ALREADY_CLAIMED"};
 await audit(job.id,"CLAIM","PUBLISHING",{platform:job.platform});
 try{
  const post=job.platform==="facebook"?await fb(job,account,media):job.platform==="instagram"?await ig(job,account,media):await li(job,account,media);
  await patch(job,{status:"PUBLISHED",external_post_id:post.id,external_post_url:post.url,published_at:new Date().toISOString(),last_error:null},"PUBLISHING");
  await audit(job.id,"PUBLISHED_VERIFIED","PUBLISHED",{platform:job.platform,external_id:post.id});
  return {state:"PUBLISHED",platform:job.platform,job_id:job.id};
 }catch(e){
  // Never auto-retry PUBLISHING; remote post might exist despite a timeout.
  const reason=e instanceof Blocked?e.message:"REMOTE_OUTCOME_UNCERTAIN";
  try{await patch(job,{last_error:reason},"PUBLISHING")}catch{}
  await audit(job.id,"NEEDS_RECONCILIATION","PUBLISHING",{reason});
  return {state:"RECONCILE",job_id:job.id,platform:job.platform};
 }
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return output(405,{state:"METHOD_NOT_ALLOWED"});
 try{
  const supplied=req.headers.get("x-rmp-dispatch-key")||"";
  if(!/^[a-f0-9]{64}$/.test(supplied))return output(401,{state:"AUTH_REQUIRED"});
  const auth=await get("rmp_dispatch_auth",{singleton:"eq.true",select:"key_sha256"});
  if(auth.length!==1||!equal(await hash(supplied),auth[0].key_sha256))return output(401,{state:"AUTH_REQUIRED"});
  const settings=await get("rmp_dispatch_settings",{singleton:"eq.true",select:"enabled"});
  if(settings.length!==1||settings[0].enabled!==true)return output(200,{state:"SUSPENDED",published:0});
  const now=new Date(),since=new Date(now.getTime()-20*60000);
  const jobs=await get("rmp_publication_jobs",{
   status:"eq.READY",content_type:"in.(REEL,VIDEO)",
   scheduled_at:"gte."+since.toISOString(),and:"(scheduled_at.lte."+now.toISOString()+",media_url.not.is.null)",
   select:"*",order:"scheduled_at.asc",limit:"3"
  });
  if(!jobs.length)return output(200,{state:"NO_APPROVED_VIDEO_DUE",published:0});
  const results=[];
  for(const job of jobs){
   try{results.push(await publish(job))}
   catch(e){const reason=e instanceof Blocked?e.message:"PREFLIGHT_UNAVAILABLE";
    await audit(job.id,"PREFLIGHT_BLOCKED","READY",{reason});
    results.push({state:"BLOCKED",job_id:job.id,reason});}
  }
  return output(200,{state:"PROCESSED",published:results.filter(x=>x.state==="PUBLISHED").length,results});
 }catch{return output(503,{state:"BACKEND_UNAVAILABLE",published:0})}
});
