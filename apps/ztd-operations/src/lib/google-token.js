import "server-only";
import {db,env} from "./cloud";
import {encryptToken,decryptToken} from "./token-crypto.mjs";
export async function loadGoogleRefreshToken(){
 const {data,error}=await db().from("ztd_google_auth")
  .select("encrypted_refresh_token,nonce,tag").eq("provider","google").maybeSingle();
 if(error)throw new Error("Google OAuth token database unavailable");
 if(data)return decryptToken(data,env("GOOGLE_TOKEN_ENCRYPTION_KEY"));
 const fallback=process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
 if(fallback)return fallback; // Legacy migration only. Prefer encrypted DB token.
 throw new Error("Google Drive authorization missing: connect the owner through OAuth");
}
export async function saveGoogleRefreshToken(refreshToken,{email,scopes,actorId}){
 const fields=encryptToken(refreshToken,env("GOOGLE_TOKEN_ENCRYPTION_KEY"));
 if(!actorId||!Array.isArray(scopes)||!scopes.includes("https://www.googleapis.com/auth/drive"))
  throw new Error("Google OAuth scopes or operator are invalid");
 if(!scopes.includes("https://www.googleapis.com/auth/calendar.readonly"))
  throw new Error("Google Calendar permission is required");
 const {error}=await db().from("ztd_google_auth").upsert({
  provider:"google",...fields,google_email:email||null,scopes,connected_by:actorId,
  updated_at:new Date().toISOString()
 },{onConflict:"provider"});
 if(error)throw new Error("Failed to persist Google connection");
 return {connected:true};
}
export async function googleConnection(){
 if(!process.env.SUPABASE_SECRET_KEY)return {connected:false};
 const {data,error}=await db().from("ztd_google_auth").select("google_email,connected_at,updated_at,scopes")
  .eq("provider","google").maybeSingle();
 if(error)throw new Error("Google OAuth metadata unavailable");
 return data?{connected:true,email:data.google_email,connected_at:data.connected_at,updated_at:data.updated_at,
   drive:data.scopes.includes("https://www.googleapis.com/auth/drive"),
   calendar:data.scopes.includes("https://www.googleapis.com/auth/calendar.readonly")}:{connected:false};
}
