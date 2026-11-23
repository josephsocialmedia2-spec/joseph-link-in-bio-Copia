import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {google} from "googleapis";
import {operator} from "../../../../lib/auth";
import {baseUrl,env} from "../../../../lib/cloud";
import {saveGoogleRefreshToken} from "../../../../lib/google-token";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request){
 const home=baseUrl();
 const redirect=(code)=>{
  const response=NextResponse.redirect(new URL("/?google="+encodeURIComponent(code),home));
  response.cookies.set("ztd_oauth_state","",{path:"/api/google",maxAge:0,httpOnly:true,secure:true,sameSite:"lax"});
  response.headers.set("Cache-Control","no-store");
  return response;
 };
 try{
  const who=await operator("approver");
  const url=new URL(request.url);
  if(url.searchParams.has("error"))return redirect("denied");
  const code=url.searchParams.get("code");
  const state=url.searchParams.get("state");
  const cookie=request.cookies.get("ztd_oauth_state")?.value||"";
  const separator=cookie.indexOf(".");
  const expected=separator>0?cookie.slice(0,separator):"";
  const starter=separator>0?cookie.slice(separator+1):"";
  if(!code||!state||expected.length!==state.length||!starter||who.id!==starter
    ||!timingSafeEqual(Buffer.from(state),Buffer.from(expected)))
      return redirect("invalid_state");
  const auth=new google.auth.OAuth2(
   env("GOOGLE_OAUTH_CLIENT_ID"),env("GOOGLE_OAUTH_CLIENT_SECRET"),
   home+"/api/google/callback");
  const {tokens}=await auth.getToken(code);
  if(!tokens.refresh_token)throw new Error("Google did not return an offline refresh token");
  auth.setCredentials(tokens);
  const tokenInfo=await auth.getTokenInfo(tokens.access_token);
  const scopes=(tokenInfo.scopes||[]).map(String);
  if(!scopes.includes("https://www.googleapis.com/auth/drive")
   ||!scopes.includes("https://www.googleapis.com/auth/calendar.readonly"))
    throw new Error("Requested Drive/Calendar scopes not granted");
  // Confirm concrete access to this existing My Drive folder and to Calendar.
  const drive=google.drive({version:"v3",auth});
  const folder=await drive.files.get({fileId:env("GOOGLE_DRIVE_FOLDER_ID"),
   fields:"id,mimeType,capabilities/canAddChildren"});
  if(folder.data.mimeType!=="application/vnd.google-apps.folder"
   ||folder.data.capabilities?.canAddChildren!==true)
    throw new Error("Google folder cannot be written by OAuth user");
  const calendar=google.calendar({version:"v3",auth});
  await calendar.events.list({calendarId:env("GOOGLE_CALENDAR_ID"),maxResults:1});
  const identity=await google.oauth2({version:"v2",auth}).userinfo.get();
  await saveGoogleRefreshToken(tokens.refresh_token,{actorId:who.id,
   email:identity.data.email||"",scopes});
  return redirect("connected");
 }catch(_){return redirect("failed")}
}
