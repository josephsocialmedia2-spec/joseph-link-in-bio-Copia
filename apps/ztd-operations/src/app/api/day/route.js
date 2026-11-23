import {stateFor} from "../../../lib/pipeline";
import {cloudReady,romeDay} from "../../../lib/cloud";
import {operator,jsonError} from "../../../lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await operator();
  const c=cloudReady();
  if(!c.ready)return Response.json({ok:false,configured:false,missing:c.missing},{status:503});
  return Response.json({ok:true,...await stateFor(romeDay())},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return jsonError(e)}
}
