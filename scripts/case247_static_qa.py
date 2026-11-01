#!/usr/bin/env python3
"""CASE247 release gate: static controls for the integration branch.
Never exercises Meta APIs or writes to production Supabase.
"""
import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]

def check(ok,message):
    print(("PASS" if ok else "FAIL")+"  "+message)
    if not ok: errors.append(message)

def read(path):
    target=ROOT/path
    if not target.is_file():errors.append("Missing file: "+path);return ""
    return target.read_text(encoding="utf-8")

catalog=json.loads(read("config/case247-strategy-catalog.json"))
methods=catalog.get("methods",[])
codes={x.get("id") for x in methods}
check(len(methods)==59 and len(codes)==59,"59 strategie distinte importate")
check(all(f"A{i:02d}" in codes for i in range(1,45)),"Codici A01-A44 presenti")
check(all(f"B{i:02d}" in codes for i in range(1,16)),"Codici B01-B15 presenti")
check(all(x.get("state")=="CATALOGATA" for x in methods),"Nessuna strategia dichiarata attiva")
inventory=json.loads(read("audit/case247/repository-inventory.json"))
pages=inventory.get("pages",[])
check(len(pages)>=50 and len({p.get("source_path") for p in pages})==len(pages),"Censimento repository >= 50 HTML senza percorsi duplicati")
check(sum(p.get("owner_guess_not_verified")=="LOCAL_BUSINESS_OR_CLIENT" for p in pages)>=18,"Siti attività locali censiti separatamente")
check(all(p.get("integration_enabled") is False for p in pages),"Nessuna integrazione massiva sui clienti")
dashboard=read("gestione/index.html")
regia=read("gestione/case247-operazioni/index.html")
review=read("campagne/case247/auto-feed/review/index.html")
edge=read("supabase/functions/case247-crm-admin-intake/index.ts")
check('href="./case247-operazioni/"' in dashboard,"Dashboard principale collegata alla Regia operativa")
check('href="../campagne/case247/auto-feed/review/' in dashboard,"Dashboard conserva la review editoriale")
required=["panoramica","radar","crm","b2b","leadgen","social","review","workflow","appuntamenti","strategie","analytics","sicurezza"]
check(all('id="'+v+'"' in regia for v in required),"Regia: 12 moduli richiesti presenti")
check('case247_staff_members' in regia and "getUser()" in regia,"Regia protetta da autenticazione e controllo staff")
check('case247-crm-admin-intake' in regia,"Modulo inserimento inbound collegato all'Edge Function")
check('case247_staff_members' in edge and 'auth.getUser(token)' in edge,"Edge: autenticazione sessione e membership server-side")
check('"outbound_marketing":false' in edge or 'outbound_marketing:false' in edge,"Edge: non invia comunicazioni marketing")
check("Deno.env.get(\"SUPABASE_SERVICE_ROLE_KEY\")" in edge,"Segreto utilizzato esclusivamente lato Edge")
check("SUPABASE_SERVICE_ROLE_KEY" not in regia and "service_role" not in regia.lower(),"Nessuna secret key nella pagina client")
check("id=\"contenuti-approvati\"" in review and 'id="archivio-aziende"' in review,"Review divisa Privati/Aziende")
check(len(set(re.findall(r'data-id="CASE247-\d{3}"',review)))==12,"Review: 12 asset statici identificati")
queue=json.loads(read("campagne/case247/editorial-queue/2026-11-01_2026-11-04/queue.json"))
check(len(queue.get("jobs",[]))==24 and queue.get("meta_enabled") is False,"24 job editoriali in coda; Meta non abilitato")
check(all(j.get("publishing_status")=="QUEUED_NOT_PUBLISHED_META_BLOCKED" for j in queue.get("jobs",[])),"Nessuna pubblicazione falsamente confermata")
print(f"RESULT: {len(errors)} failed checks")
sys.exit(1 if errors else 0)
