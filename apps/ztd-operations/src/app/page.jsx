import {redirect} from "next/navigation";
import {sessionClient} from "../lib/auth";

import Dashboard from "./dashboard-client";
export const dynamic="force-dynamic";
export default async function Home(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  return <main className="login"><h1>Supabase Auth non configurato</h1>
   <p>Configurare le credenziali pubbliche Supabase prima di accedere.</p></main>;
 const client=await sessionClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user?.id||!user.email)redirect("/login");
 const allowed=(process.env.ZTD_ADMIN_EMAILS||"").toLowerCase().split(",").map(x=>x.trim());
 if(!allowed.includes(user.email.toLowerCase()))return <main className="login"><h1>Accesso non autorizzato</h1></main>;
 const approvers=(process.env.ZTD_APPROVER_EMAILS||"").toLowerCase().split(",").map(x=>x.trim());
 return <Dashboard operatorEmail={user.email} canApprove={approvers.includes(user.email.toLowerCase())}/>;
}
