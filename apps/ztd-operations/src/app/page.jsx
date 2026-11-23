import {redirect} from "next/navigation";
import {sessionClient} from "../lib/auth";
import {cloudReady} from "../lib/cloud";
import Dashboard from "./dashboard-client";
export const dynamic="force-dynamic";
export default async function Home(){
 const config=cloudReady();
 if(!config.ready)return <main className="login"><h1>Cloud non configurato</h1>
  <p>Questa applicazione non usa dati fittizi: l'accesso rimane bloccato finché non vengono collegati Supabase, Google Drive e Google Calendar.</p>
  <p>Le variabili mancanti sono riportate nel file <code>.env.example</code>. Configurale nei segreti Vercel.</p></main>;
 const client=await sessionClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user?.id||!user.email)redirect("/login");
 const allowed=(process.env.ZTD_ADMIN_EMAILS||"").toLowerCase().split(",").map(x=>x.trim());
 if(!allowed.includes(user.email.toLowerCase()))return <main className="login"><h1>Accesso non autorizzato</h1></main>;
 const approvers=(process.env.ZTD_APPROVER_EMAILS||"").toLowerCase().split(",").map(x=>x.trim());
 return <Dashboard operatorEmail={user.email} canApprove={approvers.includes(user.email.toLowerCase())}/>;
}
