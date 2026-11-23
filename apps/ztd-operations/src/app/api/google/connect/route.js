import {NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {operator,jsonError} from "../../../../lib/auth";
import {baseUrl,env} from "../../../../lib/cloud";
import {google} from "googleapis";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const user=await operator("approver");
  const redirectUri=baseUrl()+"/api/google/callback";
  const client=new google.auth.OAuth2(env("GOOGLE_OAUTH_CLIENT_ID"),env("GOOGLE_OAUTH_CLIENT_SECRET"),redirectUri);
  env("GOOGLE_TOKEN_ENCRYPTION_KEY");env("SUPABASE_SECRET_KEY");
  const state=randomBytes(32).toString("base64url");
  const url=client.generateAuthUrl({access_type:"offline",prompt:"consent",
   scope:["openid","email","https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/calendar.readonly"],
   state,include_granted_scopes:false});
  const res=NextResponse.redirect(url);
  res.cookies.set("ztd_oauth_state",state+"."+user.id,{
   httpOnly:true,secure:true,sameSite:"lax",maxAge:600,path:"/api/google"
  });
  res.headers.set("Cache-Control","no-store");
  return res;
 }catch(e){return jsonError(e)}
}
