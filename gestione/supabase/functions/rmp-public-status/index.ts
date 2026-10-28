// REAL MEDIA PRO: endpoint PUBBLICO di sole statistiche aggregate.
// Nessun post, caption, URL, identità o segreto viene restituito. NESSUNA SCRITTURA.
const ORIGIN = "https://josephsocialmedia2-spec.github.io";
const PROJECT = "qmeftxsdfeyqozwoivzo";
const headers = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=120, s-maxage=120",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff"
};
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers});
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers});
  if (req.method !== "GET") return json({error:"method_not_allowed"},405);
  // Preferisci le nuove chiavi server-side Supabase; fallback alle chiavi legacy.
  let secret = "";
  try { secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { /* fallback */ }
  if (!secret) secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const url=Deno.env.get("SUPABASE_URL");
  if (!secret || !url || !url.startsWith("https://" + PROJECT + ".supabase.co"))
    return json({error:"backend_not_configured"},503);
  try {
    const res=await fetch(url + "/rest/v1/rmp_publication_jobs?select=platform,track_slug,status,content_type,media_url&limit=1000", {
      method:"GET", headers:{ "apikey":secret, ...(secret.startsWith("sb_secret_") ? {} : {"Authorization":"Bearer "+secret}), "Accept":"application/json"},
      signal:AbortSignal.timeout(8000)
    });
    if (!res.ok) return json({error:"database_unavailable"},503);
    const jobs=await res.json();
    if (!Array.isArray(jobs)) return json({error:"invalid_response"},503);
    const output={source:"SUPABASE_LIVE",as_of:new Date().toISOString(),total:0,
      status:{},platforms:{facebook:0,instagram:0,linkedin:0},
      tracks:{imprese:0,immobiliare:0},published:0,ready_videos:0,media_attached:0,verified_profiles:0,dispatcher_enabled:false};
    for (const j of jobs) {
      if (!["facebook","instagram","linkedin"].includes(j.platform)) continue;
      if (!["imprese","immobiliare"].includes(j.track_slug)) continue;
      output.total++;
      output.platforms[j.platform]++;
      output.tracks[j.track_slug]++;
      const status=String(j.status || "UNKNOWN").replace(/[^A-Z_]/g,"").slice(0,24);
      output.status[status]=(output.status[status]||0)+1;
      if(status === "PUBLISHED") output.published++;
      if(j.media_url) output.media_attached++;
      if(status==="READY" && ["REEL","VIDEO"].includes(j.content_type) && j.media_url) output.ready_videos++;
    }
    const authHeader={"apikey":secret,...(secret.startsWith("sb_secret_")?{}:{"Authorization":"Bearer "+secret}),"Accept":"application/json"};
    const [settingsResponse,profilesResponse]=await Promise.all([
      fetch(url+"/rest/v1/rmp_dispatch_settings?select=enabled&singleton=eq.true",{headers:authHeader,signal:AbortSignal.timeout(8000)}),
      fetch(url+"/rest/v1/rmp_social_profiles?select=auth_status",{headers:authHeader,signal:AbortSignal.timeout(8000)})
    ]);
    if(!settingsResponse.ok||!profilesResponse.ok) return json({error:"readiness_unavailable"},503);
    const settings=await settingsResponse.json(),profiles=await profilesResponse.json();
    output.dispatcher_enabled=settings.length===1 && settings[0].enabled===true;
    output.verified_profiles=profiles.filter(p=>p.auth_status==="VERIFIED").length;
    return json(output);
  } catch {
    return json({error:"backend_unavailable"},503);
  }
});
