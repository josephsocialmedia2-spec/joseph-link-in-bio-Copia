#!/usr/bin/env python3
"""CASE247: read-only checks of live Pages and blocked public consent intake."""
import json,sys,time
from urllib.request import urlopen,Request
from urllib.error import HTTPError,URLError
HOST="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/"
ENDPOINT="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-public-requests"
PAGES=[
 ("landing","campagne/case247/richieste-immobili/",("CERCO_CASA","whatsapp_optin","name=\"email_optin\"")),
 ("privacy","campagne/case247/privacy-richieste-immobili/",("INFORMATIVA IN REVISIONE","DRAFT-2026-11-02")),
 ("withdraw","campagne/case247/revoca-consenso/",("Revoca","no-referrer")),
 ("admin","gestione/case247-comunicazioni/",("case247-campaign-drafts","case247_property_requests")),
 ("dashboard","gestione/",("case247-comunicazioni/","campagne/case247/richieste-immobili"))
]
def request(url,method="GET",headers=None):
 req=Request(url,method=method,headers=headers or {})
 try:
  with urlopen(req,timeout=25) as response:return response.status,response.read(300000).decode("utf-8","replace"),dict(response.headers)
 except HTTPError as exc:return exc.code,exc.read(12000).decode("utf-8","replace"),dict(exc.headers)
 except (OSError,URLError) as exc:return 0,str(exc),{}
def check(name,ok,details):
 print(("PASS" if ok else "FAIL")+" "+name+": "+str(details)[:150],flush=True)
 return bool(ok)
results=[]
for name,path,markers in PAGES:
 ok=False;code=0;missing=[]
 for attempt in range(7):
  code,body,_=request(HOST+path+"?consentqa=20261102")
  missing=[s for s in markers if s not in body]
  if code==200 and not missing:ok=True;break
  if attempt<6:time.sleep(8)
 results.append(check("GITHUB_PAGES_"+name.upper(),ok,{"http":code,"missing":missing}))
code,body,_=request(ENDPOINT,headers={"Origin":"https://josephsocialmedia2-spec.github.io"})
try:info=json.loads(body)
except:info={}
results.append(check("PUBLIC_STATUS_OFF",code==200 and info.get("intake_enabled") is False,{"http":code,"intake_enabled":info.get("intake_enabled")}))
code,body,_=request("https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-campaign-drafts")
results.append(check("STAFF_ONLY_AUTH",code in (401,403),code))
print("RESULT",sum(results),"of",len(results))
sys.exit(0 if all(results) else 1)
