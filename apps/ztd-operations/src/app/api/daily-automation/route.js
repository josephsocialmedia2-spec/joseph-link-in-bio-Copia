import {dailyAutomation} from "../../../lib/pipeline";
import {cloudReady,romeDay,romeClock} from "../../../lib/cloud";
import {operator,sameOrigin,jsonError} from "../../../lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function POST(request){
 try{
  if(!sameOrigin(request))return Response.json({ok:false,error:"Invalid origin"},{status:403});
  const who=await operator();
  const result=await dailyAutomation(romeDay(),who.id);
  return Response.json({ok:true,...result},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return jsonError(e)}
}
export async function GET(request){
 try{
  // Vercel Cron authenticates itself, not through a browser Supabase session.
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get("authorization")!=="Bearer "+secret)return Response.json({error:"Unauthorized"},{status:401});
  // Two UTC triggers handle CET/CEST. Only ONE matches local 07:30.
  if(romeClock()!=="07:30")return new Response(null,{status:204});
  const result=await dailyAutomation(romeDay(),null);
  return Response.json({ok:true,...result},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return jsonError(e)}
}
