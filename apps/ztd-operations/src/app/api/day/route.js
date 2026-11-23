import {stateFor} from "../../../lib/pipeline";
import {romeDay} from "../../../lib/cloud";
import {operator,jsonError} from "../../../lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await operator();
  if(!process.env.SUPABASE_SECRET_KEY)return Response.json({
   ok:false,configured:false,missing:["SUPABASE_SECRET_KEY"]
  },{status:503,headers:{"Cache-Control":"no-store"}});
  return Response.json({ok:true,...await stateFor(romeDay())},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return jsonError(e)}
}
