#!/usr/bin/env python3
"""Guarded official Meta Graph publisher for verified territorial FB/IG accounts.

Only runs on GitHub Actions with explicit enablement and secure per-account secrets.
A durable INTENT is pushed before provider submission; unknown outcomes are not retried
automatically, preventing duplicate publication on interrupted runs.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

from case247_territorial_engine import ROOT, OUT, read_json, atomic_write, TZ

GRAPH = "https://graph.facebook.com/v26.0"
LEDGER = OUT / "publish-ledger.json"
CONFIG = ROOT / "config/case247-territorio.json"
PLAN = OUT / "latest-plan.json"

def request(url, params=None, method="GET"):
    data = urllib.parse.urlencode(params).encode() if params is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "User-Agent": "CASE247-Verified-Territorial-Publisher/1.0",
        "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=50) as response:
            result = json.load(response)
    except urllib.error.HTTPError as e:
        # Never leak access tokens or raw API responses containing credentials.
        raise RuntimeError(f"Provider HTTP error {e.code}") from None
    if not isinstance(result, dict) or result.get("error"):
        raise RuntimeError("Invalid or rejected provider response")
    return result

def check_media(url):
    if not url.startswith("https://"):
        return False
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Case247-Publisher/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status == 200 and "image/" in resp.headers.get("Content-Type", "").lower()
    except Exception:
        return False

def send_facebook(account, item):
    result = request(f"{GRAPH}/{urllib.parse.quote(str(account['page_id']))}/photos",
                     {"url":item["media_url"],"message":item["caption"],
                      "published":"true","access_token":account["access_token"]},method="POST")
    result_id = str(result.get("post_id") or result.get("id") or "")
    if not result_id:
        raise RuntimeError("Facebook provided no publish receipt")
    return result_id

def send_instagram(account, item):
    uid = urllib.parse.quote(str(account["ig_user_id"]))
    created = request(f"{GRAPH}/{uid}/media",
                      {"image_url": item["media_url"], "caption": item["caption"],
                       "access_token":account["access_token"]}, method="POST")
    cid = str(created.get("id") or "")
    if not cid:
        raise RuntimeError("Instagram media container ID missing")
    for _ in range(12):
        status = request(f"{GRAPH}/{urllib.parse.quote(cid)}?"+urllib.parse.urlencode({
            "fields":"status_code","access_token":account["access_token"]}))
        if status.get("status_code") == "FINISHED":
            break
        if status.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError("Instagram media container invalid")
        time.sleep(3)
    else:
        raise RuntimeError("Instagram container not ready; no automatic retry")
    posted = request(f"{GRAPH}/{uid}/media_publish",
                     {"creation_id":cid,"access_token":account["access_token"]},method="POST")
    pid = str(posted.get("id") or "")
    if not pid:
        raise RuntimeError("Instagram provided no publish receipt")
    return pid

def persist_ledger(ledger, *, commit):
    atomic_write(LEDGER, ledger)
    if not commit:
        return
    subprocess.run(["git","add",str(LEDGER.relative_to(ROOT))],cwd=ROOT,check=True)
    result = subprocess.run(["git","diff","--cached","--quiet"],cwd=ROOT)
    if result.returncode == 0:
        return
    subprocess.run(["git","-c","user.name=case247-publisher",
                    "-c","user.email=case247-publisher@users.noreply.github.com",
                    "commit","-m","CASE247: durable territorial publish ledger"],cwd=ROOT,check=True,
                   capture_output=True)
    subprocess.run(["git","push","origin","HEAD:main"],cwd=ROOT,check=True,capture_output=True)

def eligible_due(item, now, grace_minutes=180):
    if item.get("date") != now.date().isoformat() or item.get("status") != "READY_TO_SUBMIT":
        return False
    hour, minute = map(int,item["time"].split(":"))
    planned = dt.datetime.combine(now.date(), dt.time(hour,minute),tzinfo=TZ)
    delta = (now-planned).total_seconds()/60
    return 0 <= delta <= grace_minutes

def account_for(item, credentials, config_by_id):
    town = config_by_id.get(item["town_id"])
    if not town or not town.get("auto_publish"):
        return None
    network=item["network"]
    public=town.get("channels",{}).get(network,{})
    if public.get("status") != "ACTIVE_VERIFIED" or not public.get("provider_id") or not public.get("url"):
        return None
    acct=credentials.get(item["town_id"],{}).get(network,{})
    provider_id=str(acct.get("page_id") if network=="facebook" else acct.get("ig_user_id") or "")
    if not provider_id or provider_id!=str(public["provider_id"]) or not acct.get("access_token"):
        return None
    return acct

def run(live=False,max_per_run=10):
    if live and os.getenv("CASE247_TERRITORIAL_LIVE")!="true":
        raise SystemExit("Live disabled by environment")
    if live and not os.getenv("GITHUB_ACTIONS"):
        raise SystemExit("Live allowed only in controlled GitHub Actions")
    now=dt.datetime.now(TZ)
    plan=read_json(OUT / "plans" / (now.date().isoformat() + ".json"))
    if not plan or plan.get("date")!=now.date().isoformat():
        print("No verified current-day plan, nothing sent")
        return
    all_towns=read_json(CONFIG)["towns"]
    by_id={t["id"]:t for t in all_towns}
    if live:
        credentials=json.loads(os.environ["CASE247_TERRITORIAL_ACCOUNTS_JSON"])
    else:
        credentials={}
    ledger=read_json(LEDGER, {"entries":{}})
    entries=ledger.setdefault("entries",{})
    done=0
    for item in plan["assignments"]:
        if done>=max_per_run:
            break
        if not eligible_due(item,now):
            continue
        key=f"{item['date']}:{item['type']}:{item.get('listing_id',item.get('graphic_id'))}"
        if key in entries:  # includes INTENT and errors: NEVER blindly retry
            continue
        acct=account_for(item,credentials,by_id) if live else None
        if live and not acct:
            print(f"BLOCKED_CHANNEL {item['town_id']}/{item['network']}")
            continue
        if not check_media(item["media_url"]):
            print(f"BLOCKED_MEDIA {key}")
            continue
        if not live:
            print(f"DRY_RUN {key} => {item['town_id']}/{item['network']}")
            continue
        entries[key]={"status":"INTENT", "town_id":item["town_id"],"network":item["network"],
                      "time":now.isoformat(),"source_url":item.get("source_url","")}
        persist_ledger(ledger,commit=True)
        try:
            receipt=(send_facebook(acct,item) if item["network"]=="facebook"
                     else send_instagram(acct,item))
            entries[key].update(status="PUBLISHED",provider_id=receipt,
                                published_at=dt.datetime.now(dt.timezone.utc).isoformat())
            print(f"PUBLISHED {key} receipt={receipt}")
        except Exception as error:
            entries[key].update(status="UNCONFIRMED_NO_RETRY",
                                error=type(error).__name__,
                                checked_at=dt.datetime.now(dt.timezone.utc).isoformat())
            print(f"UNCONFIRMED {key}: requires provider reconciliation")
        persist_ledger(ledger,commit=True)
        done+=1
    print(f"Finished; {done} provider attempts. Existing intents are never replayed.")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--live",action="store_true")
    parser.add_argument("--max-per-run",type=int,default=10)
    a=parser.parse_args()
    run(live=a.live,max_per_run=a.max_per_run)
