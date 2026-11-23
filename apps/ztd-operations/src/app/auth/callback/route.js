import {NextResponse} from "next/server";
import {sessionClient} from "../../../lib/auth";
export const runtime="nodejs";
export async function GET(request){
 const url=new URL(request.url);
 const code=url.searchParams.get("code");
 if(!code)return NextResponse.redirect(new URL("/login?error=callback",url.origin));
 try{
  const client=await sessionClient();
  const {error}=await client.auth.exchangeCodeForSession(code);
  if(error)throw error;
  return NextResponse.redirect(new URL("/",url.origin));
 }catch(_){return NextResponse.redirect(new URL("/login?error=auth",url.origin))}
}
