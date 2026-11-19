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
regia_path=ROOT/"gestione/case247-operazioni/index.html"
review=read("campagne/case247/auto-feed/review/index.html")
edge=read("supabase/functions/case247-crm-admin-intake/index.ts")
check(not regia_path.exists() and 'href="./case247-operazioni/"' not in dashboard,"Regia operativa obsoleta rimossa dalla pagina e dai collegamenti")
check('href="../campagne/case247/auto-feed/review/' in dashboard,"Dashboard conserva la review editoriale")
for source in ["gestione/agenda-unificata.js","gestione/agenda50.js","gestione/agenda-strumenti-acquisizione.js","gestione/control-center.js"]:
    check("case247-operazioni/" not in read(source),"Nessun riferimento al percorso eliminato: "+source)
check("case247-crm-admin-intake" in edge,"La funzione privata CRM rimane nel repository")
check('case247_staff_members' in edge and 'withSupabase({auth:"user"}' in edge and 'ctx.userClaims' in edge,"Edge: autenticazione ufficiale JWT e membership server-side")
check('eq("name","CASE IN PUBBLICITÀ 24/7")' in edge and 'eq("organization_id",org)' in edge,"Endpoint legato solo a tenant CASE247")

check('"outbound_marketing":false' in edge or 'outbound_marketing:false' in edge,"Edge: non invia comunicazioni marketing")
check("ctx.supabaseAdmin" in edge and "@supabase/server@1" in edge,"Accesso amministrativo riservato al middleware server")
check("SUPABASE_SERVICE_ROLE_KEY" not in dashboard and "service_role" not in dashboard.lower(),"Nessuna secret key nella dashboard gestione")
check("id=\"contenuti-approvati\"" in review and 'id="archivio-aziende"' in review,"Review divisa Privati/Aziende")
check(len(set(re.findall(r'data-id="CASE247-\d{3}"',review)))==12,"Review: 12 asset statici identificati")
queue=json.loads(read("campagne/case247/editorial-queue/2026-11-01_2026-11-04/queue.json"))
check(len(queue.get("jobs",[]))==24 and queue.get("meta_enabled") is False,"24 job editoriali in coda; Meta non abilitato")
check(all(j.get("publishing_status")=="QUEUED_NOT_PUBLISHED_META_BLOCKED" for j in queue.get("jobs",[])),"Nessuna pubblicazione falsamente confermata")
print(f"RESULT: {len(errors)} failed checks")
sys.exit(1 if errors else 0)
