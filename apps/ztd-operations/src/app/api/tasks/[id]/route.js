import {completeTask} from "../../../../lib/pipeline";
import {operator,sameOrigin,jsonError} from "../../../../lib/auth";
export const runtime="nodejs";
export async function PATCH(request,{params}){
 try{
  if(!sameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
  const who=await operator();
  const {id}=await params;
  const task=await completeTask(id,who.id);
  return Response.json({ok:true,task},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return jsonError(e)}
}
