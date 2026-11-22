// supabase/functions/s90-reminders/index.ts
// Deploy only after schema and secrets are reviewed. Internal email reminders ONLY.
// Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SALES90_SCHEDULER_SECRET,
//           RESEND_API_KEY, SALES90_FROM_EMAIL (verified sender). No WhatsApp automation.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
Deno.serve(async (req)=>{
 const secret=Deno.env.get("SALES90_SCHEDULER_SECRET");
 if(!secret || req.headers.get("x-s90-scheduler-key")!==secret) return new Response("Unauthorized",{status:401});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const resend=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("SALES90_FROM_EMAIL");
 if(!url||!service||!resend||!from)return Response.json({status:"NOT_CONFIGURED",processed:0},{status:503});
 const sb=createClient(url,service,{auth:{persistSession:false}});
 const {data,error}=await sb.rpc("s90_claim_due_reminders",{batch_size:25});
 if(error)return Response.json({status:"DATABASE_ERROR",detail:error.message},{status:500});
 let sent=0,failed=0;
 for(const record of data||[]){
  try{
   if(!record.recipient_email || !/^\S+@\S+\.\S+$/.test(record.recipient_email)) throw Error("Recipient unavailable");
   const body={from,to:[record.recipient_email],subject:"Promemoria interno · Joseph Sales Automation 90",
    text:"Promemoria relativo alla tua campagna immobiliare: "+record.title+"\nScadenza locale: "+record.due_on+" ore "+record.local_time+"\nAccedi alla dashboard privata per completare l'attività."};
   const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+resend,"Content-Type":"application/json","Idempotency-Key":record.id},body:JSON.stringify(body)});
   if(!response.ok)throw Error("Email provider HTTP "+response.status);
   const {error:up}=await sb.from("s90_reminders").update({status:"SENT",sent_at:new Date().toISOString(),last_error:null}).eq("id",record.id);
   if(up)throw Error("Status persistence error: "+up.message);
   sent++;
  }catch(ex){
    failed++;
    const retry=record.attempts<3;
    await sb.from("s90_reminders").update({status:retry?"WAITING":"FAILED",
       due_at:retry?new Date(Date.now()+Math.min(3600000,record.attempts*300000)).toISOString():record.due_at,
       last_error:String(ex.message||ex).slice(0,250)}).eq("id",record.id);
  }
 }
 return Response.json({status:"OK",sent,failed,processed:(data||[]).length});
});
