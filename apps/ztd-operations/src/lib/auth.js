import "server-only";
import {cookies} from "next/headers";
import {createServerClient} from "@supabase/ssr";
import {env} from "./cloud";
function allowed(name,email){
 const list=(process.env[name]||"").toLowerCase().split(",").map(v=>v.trim()).filter(Boolean);
 return email&&list.includes(email.toLowerCase());
}
export async function sessionClient(){
 const jar=await cookies();
 return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"),env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),{
  cookies:{
    getAll(){return jar.getAll()},
    setAll(values){for(const x of values){try{jar.set(x.name,x.value,x.options)}catch(_){/* server component read only */}}}
  }
 });
}
export async function operator(role="operator"){
 const client=await sessionClient();
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user?.id||!user.email||!allowed("ZTD_ADMIN_EMAILS",user.email))throw new Error("UNAUTHORIZED");
 if(role==="approver"&&!allowed("ZTD_APPROVER_EMAILS",user.email))throw new Error("FORBIDDEN");
 return {id:user.id,email:user.email};
}
export function sameOrigin(request){
 const origin=request.headers.get("origin");
 if(!origin)return false;
 const expected=process.env.APP_BASE_URL;
 if(!expected)return false;
 try{return new URL(origin).origin===new URL(expected).origin}catch(_){return false}
}
export function jsonError(e){
 const message=e instanceof Error?e.message:"Unexpected error";
 const code=message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:message==="Invalid date"?400:503;
 return Response.json({ok:false,error:code===503?"Servizio cloud non ancora configurato o non disponibile":message},{status:code,headers:{"Cache-Control":"no-store"}});
}
