import {db,safeDay} from "../../../../../lib/cloud";
import {readPdf} from "../../../../../lib/google";
import {operator,jsonError} from "../../../../../lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request,{params}){
 try{
  await operator();
  const {date,type}=await params;
  safeDay(date);
  if(!["magazine","letter"].includes(type))return new Response("Not Found",{status:404});
  const {data,error}=await db().from("ztd_daily_runs").select("*").eq("day",date).maybeSingle();
  if(error)throw error;
  const id=type==="magazine"?data?.magazine_drive_id:data?.letter_drive_id;
  if(!id||!["READY","PUBLISHED"].includes(data.status))return new Response("Not Found",{status:404});
  const bytes=await readPdf(id);
  return new Response(bytes,{headers:{"Content-Type":"application/pdf",
   "Content-Disposition":"inline; filename=\"ZTD-"+type+"-"+date+".pdf\"",
   "Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){return jsonError(e)}
}
