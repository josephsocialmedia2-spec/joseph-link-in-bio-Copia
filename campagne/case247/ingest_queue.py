#!/usr/bin/env python3
"""Bridge: signed short-lived GitHub Actions identity -> CASE247 Supabase editorial queue."""
import datetime as dt
import json, os, sys, urllib.parse, urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[2]
today=(dt.datetime.now(ZoneInfo("Europe/Rome")).date().isoformat())
date=sys.argv[1] if len(sys.argv)>1 and sys.argv[1] else today
file=ROOT/"campagne"/"case247"/"auto-feed"/"queue"/(date+".json")
if not file.is_file():
    raise SystemExit("NO_EDITORIAL_QUEUE_FOR_DATE")
queue=json.loads(file.read_text(encoding="utf-8"))
if queue.get("state")!="QUEUED_NOT_PUBLISHED":
    raise SystemExit("NOT_READY")
request=os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
bearer=os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
if not request or not bearer:
    raise SystemExit("GITHUB_OIDC_NOT_AVAILABLE")
oidc_url=request+("&" if "?" in request else "?")+urllib.parse.urlencode({"audience":"case247-queue-qmeftxsdfeyqozwoivzo"})
id_request=urllib.request.Request(oidc_url,headers={"Authorization":"Bearer "+bearer,"User-Agent":"case247-actions"},method="GET")
with urllib.request.urlopen(id_request,timeout=15) as r:
    identity=json.load(r).get("value")
if not identity:raise SystemExit("OIDC_IDENTITY_MISSING")
endpoint="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-queue-ingest"
body={name:queue[name] for name in ("date","format","candidate","selection_mode","caption","files","source_photo")}
req=urllib.request.Request(endpoint,data=json.dumps(body,ensure_ascii=False).encode("utf-8"),method="POST",headers={
"Authorization":"Bearer "+identity,"Content-Type":"application/json","User-Agent":"case247-actions"})
with urllib.request.urlopen(req,timeout=25) as r:
    answer=json.load(r)
print("SUPABASE_QUEUED:",json.dumps(answer,ensure_ascii=False))
if not answer.get("ok"):raise SystemExit("QUEUE_NOT_CONFIRMED")
