import "server-only";
import {db,cloudEnabled,romeDay,safeDay} from "./cloud";
import {verifyDriveFolder,dayEvents,putPdf} from "./google";
import {currentDraft,letterPdf,publicMagazineUrl} from "./documents";
import {savePdf} from "./storage";
import {createHash} from "node:crypto";
export async function audit(day,action,actor_id=null,details={}){
 const {error}=await db().from("ztd_audit_events").insert({day,action,actor_id,details});
 if(error)throw new Error("Audit event not persisted: "+error.message);
}
async function runRecord(day){
 const {data,error}=await db().from("ztd_daily_runs").select("*").eq("day",day).maybeSingle();
 if(error)throw error;
 return data;
}
export async function stateFor(day=romeDay()){
 safeDay(day);
 const client=db();
 const [r,t]=await Promise.all([
  client.from("ztd_daily_runs").select("*").eq("day",day).maybeSingle(),
  client.from("ztd_daily_tasks").select("*").eq("day",day).order("start_at").order("ordinal")
 ]);
 if(r.error)throw r.error;if(t.error)throw t.error;
 return {run:r.data,tasks:t.data||[]};
}
const BASE_TASKS=[
 ["08:00","09:00","Controllo dashboard, privacy e richieste inbound"],
 ["09:00","10:30","Revisione editoriale della rivista digitale"],
 ["10:30","12:00","Controllo QR, lettera A4 e prova di stampa"],
 ["12:00","14:00","Pausa"],
 ["14:00","16:30","Lavoro e richieste legittime, senza chiamate a freddo"],
 ["16:30","18:00","Preparazione distribuzione cartacea autorizzata"],
 ["18:00","19:00","Imbucata solo dopo verifica QR e approvazione del fascicolo"],
 ["19:00","20:00","KPI, rendicontazione e programmazione successiva"]
];
export function makeTasks(calendarEvents){
 const rows=BASE_TASKS.map(([start_at,end_at,title])=>({start_at,end_at,title,origin:"SYSTEM"}));
 for(const event of calendarEvents){
  rows.push({start_at:event.start,end_at:event.end,title:"Calendario: "+event.title,origin:"CALENDAR"});
 }
 rows.sort((a,b)=>a.start_at.localeCompare(b.start_at)||a.origin.localeCompare(b.origin));
 return rows.map((t,i)=>({...t,ordinal:i+1}));
}
export async function dailyAutomation(day=romeDay(),actor_id=null){
 safeDay(day);cloudEnabled();
 // Fail before any mutation when OAuth, Calendar, GitHub or Drive cannot be reached.
 await verifyDriveFolder();
 const [events,draft]=await Promise.all([dayEvents(day),currentDraft()]);
 const client=db();
 const {error:insertErr}=await client.from("ztd_daily_runs").insert({
  day,status:"PREPARING",source_issue:draft.issue,source_sha256:draft.sha256
 });
 if(insertErr){
  if(insertErr.code!=="23505")throw insertErr;
  const existing=await runRecord(day);
  if(existing?.status==="READY"||existing?.status==="PUBLISHED")return {reused:true,...await stateFor(day)};
  if(existing?.status!=="FAILED")throw new Error("Daily job already in progress");
  const {data,error}=await client.from("ztd_daily_runs")
   .update({status:"PREPARING",error_code:null,source_sha256:draft.sha256,source_issue:draft.issue,updated_at:new Date().toISOString()})
   .eq("day",day).eq("status","FAILED").select("day").maybeSingle();
  if(error||!data)throw new Error("Concurrent retry blocked");
 }
 const stamp=draft.sha256.slice(0,16);
 const magazineName="ZTD-Magazine-"+day+"-"+stamp+".pdf";
 const letterName="ZTD-Lettera-C-"+day+"-"+stamp+".pdf";
 try{
  const magazine=await putPdf(magazineName,draft.pdf);
  const magazineStoragePath=await savePdf("magazine",day,draft.pdf);
  const publicPath="/api/publications/"+day;
  const letter=await letterPdf({day,qrUrl:publicMagazineUrl(day),issue:draft.issue});
  const letterName=letterNameBase+createHash("sha256").update(letter).digest("hex").slice(0,16)+".pdf";
  const print=await putPdf(letterName,letter);
  const letterStoragePath=await savePdf("letters",day,letter);
  const {error:taskErr}=await client.from("ztd_daily_tasks")
    .upsert(makeTasks(events).map(t=>({...t,day})),{onConflict:"day,ordinal"});
  if(taskErr)throw taskErr;
  const {error}=await client.from("ztd_daily_runs").update({
   status:"READY",magazine_drive_id:magazine.id,
   magazine_drive_url:magazine.webViewLink||"https://drive.google.com/file/d/"+magazine.id+"/view",
   magazine_name:magazineName,magazine_storage_path:magazineStoragePath,letter_drive_id:print.id,
   letter_drive_url:print.webViewLink||"https://drive.google.com/file/d/"+print.id+"/view",
   letter_name:letterName,letter_storage_path:letterStoragePath,public_path:publicPath,error_code:null,
   updated_at:new Date().toISOString(),ready_at:new Date().toISOString()
  }).eq("day",day).eq("status","PREPARING");
  if(error)throw error;
  await audit(day,"DAILY_READY",actor_id,{issue:draft.issue,magazineId:magazine.id,letterId:print.id});
  return {reused:false,...await stateFor(day)};
 }catch(error){
  await client.from("ztd_daily_runs").update({
   status:"FAILED",error_code:"PIPELINE_ERROR",updated_at:new Date().toISOString()
  }).eq("day",day).eq("status","PREPARING");
  try{await audit(day,"DAILY_FAILED",actor_id,{message:String(error.message||error).slice(0,250)})}catch(_){}
  throw error;
 }
}
export async function approve(day,actorId,{assetsReviewed}){
 cloudEnabled();safeDay(day);
 if(assetsReviewed!==true)throw new Error("Editorial review and images must be confirmed");
 const client=db();
 const {data,error}=await client.from("ztd_daily_runs")
  .update({status:"PUBLISHED",published_at:new Date().toISOString(),published_by:actorId,updated_at:new Date().toISOString()})
  .eq("day",day).eq("status","READY").not("magazine_drive_id","is",null)
  .not("letter_drive_id","is",null).select("*").maybeSingle();
 if(error)throw error;
 if(!data)throw new Error("Edition is not READY or already published");
 // Atomic Postgres trigger writes the approval audit row with this status update.
 return data;
}
export async function completeTask(taskId,userId){
 cloudEnabled();
 if(!/^[0-9a-fA-F-]{36}$/.test(taskId))throw new Error("Invalid task ID");
 const client=db();
 const {data:task,error:fetchErr}=await client.from("ztd_daily_tasks").select("*").eq("id",taskId).single();
 if(fetchErr)throw fetchErr;
 if(task.status==="DONE")return task;
 if(/imbucat/i.test(task.title)){
  const run=await runRecord(task.day);
  if(run?.status!=="PUBLISHED")throw new Error("Cannot mark delivered before publication approval");
 }
 const {data,error}=await client.from("ztd_daily_tasks")
  .update({status:"DONE",completed_at:new Date().toISOString(),completed_by:userId})
  .eq("id",taskId).eq("status","PENDING").select("*").maybeSingle();
 if(error)throw error;
 if(!data)throw new Error("Task has been changed concurrently");
 // Atomic Postgres trigger writes the physical task completion event.
 return data;
}
