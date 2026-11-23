"use client";
import {useState} from "react";
import {createBrowserClient} from "@supabase/ssr";
export default function Login(){
 const [email,setEmail]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function login(event){
  event.preventDefault();setBusy(true);setMessage("");
  try{
   const client=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
   const {error}=await client.auth.signInWithOtp({email,
    options:{emailRedirectTo:window.location.origin+"/auth/callback"}});
   if(error)throw error;
   setMessage("Controlla la tua email per il collegamento di accesso.");
  }catch(_){setMessage("Accesso non disponibile: verifica la configurazione Supabase Auth.")}
  finally{setBusy(false)}
 }
 return <main className="login"><h1>Zero to Diamond</h1><p>Accesso operatori autorizzati. Nessun dato demo.</p>
  <form onSubmit={login}><label>Email autorizzata<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
  <button disabled={busy}>{busy?"Invio...":"Accedi con link email"}</button></form>
  <p role="status">{message}</p></main>
}
