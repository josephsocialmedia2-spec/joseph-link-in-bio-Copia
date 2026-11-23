import {approve} from "../../../../../lib/pipeline";
import {operator,sameOrigin,jsonError} from "../../../../../lib/auth";
export const runtime="nodejs";
export async function POST(request,{params}){
 try{
  if(!sameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
  const who=await operator("approver");
  const {date}=await params;
  const data=await request.json();
  const result=await approve(date,who.id,{assetsReviewed:data?.assetsReviewed===true});
  return Response.json({ok:true,run:result},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return jsonError(e)}
}
