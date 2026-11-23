import {operator,jsonError} from "../../../lib/auth";
import {cloudReady,db,romeDay} from "../../../lib/cloud";
import {googleConnection} from "../../../lib/google-token";
import {verifyDriveFolder,dayEvents} from "../../../lib/google";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await operator();
  const config=cloudReady();
  const connected={database:false,drive:false,calendar:false,googleAccount:false};
  const errors={};
  if(process.env.SUPABASE_SECRET_KEY){
   try{
    const {error}=await db().from("ztd_daily_runs").select("day",{head:true,count:"exact"});
    if(error)throw error;
    connected.database=true;
   }catch(_){errors.database="Credenziale privilegiata o API database non verificata";}
  }
  if(connected.database){
   try{const r=await googleConnection();connected.googleAccount=r.connected;
     if(r.connected)connected.googleEmail=r.email||null;}
   catch(_){errors.googleAccount="Credenziale Google non verificata";}
  }
  if(connected.googleAccount&&process.env.GOOGLE_OAUTH_CLIENT_ID&&process.env.GOOGLE_OAUTH_CLIENT_SECRET){
   try{await verifyDriveFolder();connected.drive=true}
   catch(_){errors.drive="Cartella Drive non accessibile in scrittura";}
   try{await dayEvents(romeDay());connected.calendar=true}
   catch(_){errors.calendar="Google Calendar non accessibile";}
  }
  return Response.json({ok:true,connected,errors,missing:config.missing,
   oauthSetupReady:Boolean(connected.database&&process.env.GOOGLE_OAUTH_CLIENT_ID&&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET&&process.env.GOOGLE_TOKEN_ENCRYPTION_KEY&&process.env.APP_BASE_URL),
   automationEnabled:process.env.ZTD_AUTOMATION_ENABLED==="true",
   publicationEnabled:process.env.ZTD_PUBLICATION_ENABLED==="true",
   cronScheduled:false},{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}
