import "server-only";
import {createClient} from "@supabase/supabase-js";
export function env(name){
  const v=process.env[name]?.trim();
  if(!v)throw new Error("Missing cloud configuration: "+name);
  return v;
}
export function cloudReady(){
  const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY","SUPABASE_STORAGE_BUCKET","ZTD_ADMIN_EMAILS","ZTD_APPROVER_EMAILS",
    "GOOGLE_OAUTH_CLIENT_ID","GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REFRESH_TOKEN","GOOGLE_DRIVE_FOLDER_ID",
    "GOOGLE_CALENDAR_ID","GITHUB_REPOSITORY","GITHUB_DRAFT_REF",
    "APP_BASE_URL","CRON_SECRET","ZTD_EXPECTED_SUPABASE_PROJECT_ID"];
  return {ready:required.every(n=>!!process.env[n]?.trim()),missing:required.filter(n=>!process.env[n]?.trim())};
}
export function assertPersonalProject(){
 const expected=env("ZTD_EXPECTED_SUPABASE_PROJECT_ID");
 if(expected!=="nqnmlsmeiynxbdojeyjt" || new URL(env("NEXT_PUBLIC_SUPABASE_URL")).hostname!==expected+".supabase.co")
   throw new Error("Supabase project mismatch: refuse access to other projects");
}
export function cloudPublicationEnabled(){
 cloudEnabled();
 if(process.env.ZTD_PUBLICATION_ENABLED!=="true")
   throw new Error("Publication explicitly disabled");
}
export function cloudEnabled(){
  if(process.env.ZTD_AUTOMATION_ENABLED!=="true")throw new Error("Automation disabled until cloud integrations are validated");
  const c=cloudReady();
  if(!c.ready)throw new Error("Cloud integrations are not configured");
  assertPersonalProject();
}
export function db(){
  assertPersonalProject();
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"),env("SUPABASE_SECRET_KEY"),{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
}
export async function expectRow(query,label){
 const {data,error}=await query;
 if(error)throw new Error(label+": "+error.message);
 return data;
}
export function romeDay(now=new Date()){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function romeClock(now=new Date()){
 return new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(now);
}
export function safeDay(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+"T12:00:00Z")))throw new Error("Invalid date");
 return day;
}
export function baseUrl(){
 const u=new URL(env("APP_BASE_URL"));
 if(u.protocol!=="https:" || u.username||u.password||u.search||u.hash)throw new Error("APP_BASE_URL must be canonical HTTPS origin");
 return u.origin;
}
