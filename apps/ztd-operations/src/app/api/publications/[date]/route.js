import {db,safeDay} from "../../../../lib/cloud";
import {loadPdf} from "../../../../lib/storage";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request,{params}){
 try{
  const {date}=await params;
  safeDay(date);
  const {data,error}=await db().from("ztd_daily_runs")
   .select("status,magazine_storage_path").eq("day",date).maybeSingle();
  if(error||data?.status!=="PUBLISHED"||!data.magazine_storage_path)
   return new Response("Edizione non disponibile",{status:404,headers:{"Cache-Control":"no-store"}});
  // Drive remains private. This stable route is the public QR target ONLY after approval.
  const pdf=await loadPdf(data.magazine_storage_path);
  return new Response(pdf,{headers:{"Content-Type":"application/pdf",
    "Content-Disposition":"inline; filename=\"Real-Estate-Weekly-"+date+".pdf\"",
    "X-Content-Type-Options":"nosniff","Cache-Control":"public,max-age=180"}});
 }catch(_){return new Response("Edizione non disponibile",{status:503})}
}
