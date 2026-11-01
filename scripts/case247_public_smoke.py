#!/usr/bin/env python3
"""Non-destructive CASE247 production smoke test from GitHub Actions.
No login, no tokens, no mutations, no social publication.
"""
from __future__ import annotations
import json
import os
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

SITE="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/"
EDGE="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-crm-admin-intake"
ORIGIN="https://josephsocialmedia2-spec.github.io"
REPORT_PATH=Path("audit/case247/live-smoke-report.json")

class ScriptExtractor(HTMLParser):
  def __init__(self):
    super().__init__(); self.in_script=False; self.scripts=[]
  def handle_starttag(self,tag,attrs):
    if tag=="script":
      d=dict(attrs)
      self.in_script=(d.get("type")=="module" and not d.get("src"))
      if self.in_script:self.scripts.append("")
  def handle_endtag(self,tag):
    if tag=="script":self.in_script=False
  def handle_data(self,data):
    if self.in_script:self.scripts[-1]+=data

def request(url,method="GET",headers=None,data=None):
  req=Request(url,method=method,headers=headers or {},data=data)
  try:
    with urlopen(req,timeout=25) as response:
      b=response.read(400000)
      return {"status":response.status,"url":response.url,"body":b.decode("utf-8","replace"),"headers":dict(response.headers)}
  except HTTPError as e:
    return {"status":e.code,"url":url,"body":e.read(10000).decode("utf-8","replace"),"headers":dict(e.headers)}
  except (URLError,OSError) as e:
    return {"status":0,"url":url,"body":"","headers":{},"error":type(e).__name__+": "+str(e)[:150]}

def request_with_retry(url,max_attempts=3):
  """Retry only safe GET requests on transient gateway/CDN errors."""
  for attempt in range(max_attempts):
    reply=request(url)
    if reply["status"] not in (0,429,502,503,504):
      return reply
    if attempt+1<max_attempts:
      time.sleep(1.2*(attempt+1))
  return reply

def main():
  checks=[]
  def check(name,condition,details):
    item={"check":name,"passed":bool(condition),"details":details}
    checks.append(item)
    print(("PASS" if condition else "FAIL")+" "+name+" — "+str(details)[:150],flush=True)

  main_page=request(SITE+"gestione/?smoke=case247")
  check("MAIN_DASHBOARD_HTTP_200",main_page["status"]==200,main_page["status"])
  check("MAIN_LINKS_CRM",main_page["status"]==200 and "case247-operazioni/" in main_page["body"],"CRM entry link visible")

  op=request(SITE+"gestione/case247-operazioni/?smoke=case247")
  check("REGIA_HTTP_200",op["status"]==200,op["status"])
  check("REGIA_CRM_INTAKE_PRESENT",op["status"]==200 and 'id="intake-form"' in op["body"] and "case247-crm-admin-intake" in op["body"],"form+edge route")
  check("REGIA_12_MODULES",op["status"]==200 and all('id="'+module+'"' in op["body"] for module in
    ["panoramica","radar","crm","b2b","leadgen","social","review","workflow","appuntamenti","strategie","analytics","sicurezza"]),"12 section identifiers")

  review=request(SITE+"campagne/case247/auto-feed/review/?smoke=case247")
  check("REVIEW_HTTP_200",review["status"]==200,review["status"])
  check("REVIEW_12_APPROVED",review["status"]==200 and review["body"].count('class="archive-card"')==12,"12 static cards")
  check("REVIEW_BOTH_AUDIENCES",all('id="archivio-'+sector+'"' in review["body"] for sector in ["privati","aziende"]),"privati, aziende")

  jpg_results=[]
  for index in range(1,13):
    url=SITE+"campagne/case247/editorial-queue/2026-11-01_2026-11-04/assets/CASE247-"+str(index).zfill(3)+".jpg"
    response=request_with_retry(url)
    jpg_results.append({"id":index,"status":response["status"]})
  check("ALL_12_APPROVED_JPG",all(a["status"]==200 for a in jpg_results),jpg_results)

  personal=request_with_retry(SITE+"campagne/case247/auto-feed/review/joseph-personal/")
  check("JOSEPH_PERSONAL_GALLERY_HTTP_200",personal["status"]==200,personal["status"])
  check("JOSEPH_PERSONAL_MANIFEST",personal["status"]==200 and "CASE IN PUBBLICITÀ 24/7" in personal["body"],"Photo gallery and captions")
  check("JOSEPH_REVIEW_LINK",review["status"]==200 and 'id="joseph-4xday"' in review["body"],"Review linked to four new photo graphics")
  personal_assets=[]
  for index in range(1,5):
    url=SITE+"campagne/case247/auto-feed/review/joseph-personal/assets/CASE247-JOSEPH-"+str(index).zfill(2)+".jpg"
    image=request_with_retry(url)
    personal_assets.append({"id":index,"status":image["status"]})
  check("ALL_4_JOSEPH_GRAPHICS",all(a["status"]==200 for a in personal_assets),personal_assets)

  edge=request(EDGE,headers={"Origin":ORIGIN})
  check("EDGE_UNAUTH_DENIED",edge["status"] in (401,403),"GET without access token -> "+str(edge["status"]))
  check("EDGE_NO_PRIVILEGED_DATA",not any(x in edge["body"] for x in ["organization_id","service_role_key","SUPABASE_SECRET_KEYS"]),"no sensitive data in error body")
  unsigned_post=request(EDGE,method="POST",
    headers={"Origin":ORIGIN,"Content-Type":"application/json"},
    data=b'{"action":"create_inbound_lead","event_id":"synthetic-denied-no-jwt"}')
  check("EDGE_UNAUTH_POST_DENIED",unsigned_post["status"] in (401,403),
    "POST without access token -> "+str(unsigned_post["status"]))


  pre=request(EDGE,method="OPTIONS",headers={"Origin":ORIGIN,"Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"authorization,apikey,content-type"})
  allow=next((v for k,v in pre["headers"].items() if k.lower()=="access-control-allow-origin"),None)
  check("EDGE_CORS_PREFLIGHT",pre["status"] in (200,204) and allow==ORIGIN,"OPTIONS -> "+str(pre["status"])+", allow-origin="+str(allow))

  if op["status"]==200:
    extract=ScriptExtractor();extract.feed(op["body"])
    Path("/tmp/case247-inline.mjs").write_text("\n".join(extract.scripts),encoding="utf-8")
    check("REGIA_INLINE_JS_EXTRACTED",bool(extract.scripts),"module script extracted for Node parse check")
  else:
    check("REGIA_INLINE_JS_EXTRACTED",False,"page unavailable")

  report={"project":"CASE IN PUBBLICITÀ 24/7","test_type":"non-destructive/public", "checks":checks,
          "passed":sum(x["passed"] for x in checks),"failed":sum(not x["passed"] for x in checks),
          "status":"PASS" if all(x["passed"] for x in checks) else "FAIL",
          "notes":"No logged-in sessions, no database writes, and no posts made."}
  REPORT_PATH.parent.mkdir(parents=True,exist_ok=True)
  REPORT_PATH.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
  print("RESULT_JSON="+json.dumps(report,ensure_ascii=False),flush=True)
  summary=os.environ.get("GITHUB_STEP_SUMMARY")
  if summary:
    with open(summary,"a",encoding="utf-8") as fp:
      fp.write("## CASE247 live smoke tests\n\n| Test | Status | Details |\n|---|---|---|\n")
      for x in checks:fp.write(f"| {x['check']} | {'PASS' if x['passed'] else 'FAIL'} | {str(x['details']).replace('|','/')} |\n")
      fp.write(f"\n**{report['passed']} passed; {report['failed']} failed**. No authenticated E2E test was performed.\n")
  return 0 if all(x["passed"] for x in checks) else 1

if __name__=="__main__":
  raise SystemExit(main())
