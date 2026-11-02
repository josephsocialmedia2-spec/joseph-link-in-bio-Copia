#!/usr/bin/env python3
"""CASE247 consent-first release gate. Read-only API probes and local asset checks."""
from __future__ import annotations
import json, re, sys
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
ROOT=Path(__file__).resolve().parents[1]
FILES=[
 "campagne/case247/richieste-immobili/index.html",
 "campagne/case247/privacy-richieste-immobili/index.html",
 "campagne/case247/revoca-consenso/index.html",
 "gestione/case247-comunicazioni/index.html",
 "supabase/functions/case247-public-requests/index.ts",
 "supabase/functions/case247-campaign-drafts/index.ts",
 "gestione/index.html",
 "gestione/case247-operazioni/index.html",
 "gestione/case247-conformita/index.html",
 "docs/case247-piano-rilascio-gdpr.md",
 "supabase/schema/case247-dispatch-gate-hardened.sql"
]
fails=[]
def check(label,ok,detail=""):
 print(("PASS " if ok else "FAIL ")+label+" "+str(detail),flush=True)
 if not ok:fails.append(label)

files={p:(ROOT/p).read_text(encoding="utf-8") if (ROOT/p).is_file() else "" for p in FILES}
check("ALL_11_FILES",all(files.values()))
page=files[FILES[0]];notice=files[FILES[1]];revoke=files[FILES[2]];admin=files[FILES[3]]
server=files[FILES[4]];staff=files[FILES[5]]
check("THREE_INBOUND_TYPES",all(v in page for v in ("CERCO_CASA","VOGLIO_VENDERE","ATTIVITA_IMMOBILE")))
check("CHANNELS_SEPARATE",all('name="'+x+'"' in page for x in ("email_optin","whatsapp_optin")))
check("NO_DEFAULT_OPT_IN",not re.search(r'name="(?:email_optin|whatsapp_optin)"[^>]*\bchecked\b',page))
check("FORM_CLOSED_BY_DEFAULT",('id="submit" disabled' in page and "intake_enabled===true" in page))
check("DRAFT_PRIVACY",("INFORMATIVA IN REVISIONE" in notice and "DRAFT-2026-11-02" in notice))
check("CONTROLLER_CONFIRMED_BUT_RELEASE_BLOCKED",("Joseph Malafronte, persona fisica" in notice and "non equivale ad approvazione" in notice and "DA VERIFICARE" not in notice))
check("LANDING_IDENTIFIES_CONTROLLER",("Joseph Malafronte (persona fisica)" in page and "raccolta e invii promozionali non attivi" in page))
check("SECURE_REVOCATION_PAGE",('name="referrer" content="no-referrer"' in revoke and 'action:\'withdraw\'' in revoke))
check("SERVER_ANTIBOT",("CASE247_TURNSTILE_SECRET_KEY" in server and "siteverify" in server))
check("SERVER_LEGAL_GATE",('CASE247_LEGAL_RELEASE_APPROVED' in server and 'config.privacy_notice_approved' in server))
check("SERVER_NEVER_SENDS",not any(x in server for x in ("graph.facebook.com","api.whatsapp.com","api.resend.com","gmail.googleapis.com")))
check("STAFF_DRAFT_ONLY",('campaign_status:"DRAFT"' in staff and "rights_to_promote_verified:false" in staff and "verify" not in staff.lower().split('rights_to_promote_verified:false')[-1][:15]))
check("STAFF_AUTH_REQUIRED",('withSupabase({auth:"user"}' in staff and 'eq("organization_id",org)' in staff))
check("ROOT_DASHBOARD_LINKS",('href="./case247-comunicazioni/"' in files[FILES[6]] and 'href="../campagne/case247/richieste-immobili/"' in files[FILES[6]]))
check("REGIA_LINKED",('href="../case247-comunicazioni/"' in files[FILES[7]]))
center=files[FILES[8]];release_doc=files[FILES[9]];sql_guard=files[FILES[10]]
check("READ_ONLY_RELEASE_CENTER",('Centro verifiche GDPR' in center and 'method:"GET"' in center and 'credentials:"omit"' in center and 'STATO NON VERIFICABILE' in center))
check("RELEASE_CENTER_LINKED",('href="../case247-conformita/"' in admin))
check("RELEASE_DOCUMENT_EXPLICITLY_PENDING",('PRE-PRODUZIONE' in release_doc and 'Nessun servizio di invio' in release_doc and 'Joseph Malafronte' in release_doc))
check("SQL_DISPATCH_DEFENSE_IN_DEPTH",all(v in sql_guard for v in ('case247_private.enforce_property_dispatch','cfg.controller_confirmed','cfg.anti_bot_verified','cfg.notice_version','req.consent_text_email','req.consent_text_whatsapp','not cfg.intake_enabled')))

URL="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/"
def call(path,method="GET",payload=None,headers=None):
 body=json.dumps(payload).encode("utf-8") if payload is not None else None
 h={"origin":"https://josephsocialmedia2-spec.github.io"}
 if body is not None:h["content-type"]="application/json"
 h.update(headers or {})
 req=Request(URL+path,method=method,data=body,headers=h)
 try:
  with urlopen(req,timeout=20) as r:return r.status,r.read(25000).decode("utf-8","replace"),r.headers
 except HTTPError as e:return e.code,e.read(25000).decode("utf-8","replace"),e.headers
 except (URLError,OSError) as e:return 0,str(e),{}
status,body,_=call("case247-public-requests")
try:data=json.loads(body)
except:data={}
check("PUBLIC_ENDPOINT_GET",status==200,(status,data.get("intake_enabled")))
check("PUBLIC_COLLECTION_BLOCKED",data.get("intake_enabled") is False,"must remain disabled until legal + bot controls")
code,payload,_=call("case247-public-requests",method="POST",payload={"action":"create_request","submission_key":"test-only-no-contact"})
check("UNREVIEWED_CAPTURE_DENIED",code in (403,503),(code,payload[:150]))
s,b,_=call("case247-campaign-drafts")
check("DRAFT_ENDPOINT_REQUIRES_JWT",s in (401,403),s)
s,b,headers=call("case247-public-requests",method="OPTIONS",headers={"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type"})
check("CORS_PREFLIGHT",s in (200,204) and headers.get("access-control-allow-origin")=="https://josephsocialmedia2-spec.github.io",s)
print("TOTAL "+str(25-len(fails))+" / 25 check candidates",flush=True)
if fails:
 print("FAILED: "+", ".join(fails),file=sys.stderr)
 sys.exit(1)
