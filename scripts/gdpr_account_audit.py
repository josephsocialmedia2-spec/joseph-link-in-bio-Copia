#!/usr/bin/env python3
"""Read-only static HTML preflight of six authorized public GitHub repositories.
Never certifies legal GDPR conformity; never emits user-provided HTML contents or secrets.
"""
import base64
import csv
import datetime
import html
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

OWNER = "josephsocialmedia2-spec"
REPOS = ["joseph-link-in-bio-Copia","launcher-dashboard","crescita-social","leadcontattipdf","acquisizionesusa","immobili-in-zona"]
OUTPUT = pathlib.Path(__file__).resolve().parents[1] / "gdpr-reports"
TOKEN = os.environ.get("GITHUB_TOKEN","")
API="https://api.github.com"

def fetch_json(path):
    h={"Accept":"application/vnd.github+json","User-Agent":"Joseph-GDPR-static-audit/1.0","X-GitHub-Api-Version":"2022-11-28"}
    if TOKEN: h["Authorization"]="Bearer "+TOKEN
    req=urllib.request.Request(API+path,headers=h)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=22) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError) as exc:
            if attempt==2: raise RuntimeError("API unavailable for endpoint: "+path.split("?")[0]+" ("+str(getattr(exc,"code","network"))+")")
            time.sleep(1+attempt)
    raise RuntimeError("Unable to fetch "+path)

def find_content(repo, sha):
    obj=fetch_json("/repos/"+OWNER+"/"+repo+"/git/blobs/"+sha)
    if obj.get("encoding")=="base64":
        return base64.b64decode(obj.get("content","")).decode("utf-8",errors="replace")
    return obj.get("content","")

def inspect(repo,path,sha,text):
    privacy=bool(re.search(r'''href\s*=\s*["'][^"'<>]*(?:privacy|informativa)[^"'<>]*["']''',text,re.I))
    tracker=bool(re.search(r"(?:googletagmanager|google-analytics|gtag\s*\(|fbq\s*\(|connect\.facebook\.net|tiktok\.com/i18n/pixel|hotjar|clarity\.ms)",text,re.I))
    possible_secret=bool(re.search(r"gh[pousr]_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",text))
    title_match=re.search(r"<title(?:\s[^>]*)?>(.*?)</title>",text,re.I|re.S)
    title=html.unescape(re.sub(r"<[^>]*>","",title_match.group(1))).strip()[:110] if title_match else ""
    form=len(re.findall(r"<form\b",text,re.I))
    inputs=len(re.findall(r"<input\b",text,re.I))
    scripts=len(re.findall(r"<script\b",text,re.I))
    thirdparty=len(re.findall(r'<script\b[^>]*\bsrc\s*=\s*["\x27]https?://',text,re.I))
    iframe=len(re.findall(r"<iframe\b",text,re.I))
    storage=bool(re.search(r"\b(?:localStorage|sessionStorage|indexedDB)\b",text))
    assessment=[]
    if not privacy and "privacy" not in path:assessment.append("PRIVACY_LINK_NON_RILEVATO")
    if form:assessment.append("FORM_REVIEW")
    if inputs:assessment.append("INPUT_REVIEW")
    if tracker:assessment.append("TRACKER_INDICATOR")
    if storage:assessment.append("BROWSER_STORAGE_REVIEW")
    if possible_secret:assessment.append("POSSIBLE_SECRET_CRITICAL")
    if iframe or thirdparty:assessment.append("THIRD_PARTY_REVIEW")
    return {"repository":repo,"path":path,"code_url":f"https://github.com/{OWNER}/{repo}/blob/main/{path}",
            "title":title,"forms":form,"inputs":inputs,"scripts":scripts,"remote_scripts":thirdparty,
            "iframes":iframe,"storage":"SI" if storage else "NO","privacy_link":"SI" if privacy else "NO",
            "tracker_pattern":"SI" if tracker else "NO","possible_secret":"SI" if possible_secret else "NO",
            "issues":"; ".join(assessment),"legal_status":"NON_VALIDATO"}

def main():
    OUTPUT.mkdir(exist_ok=True)
    rows=[];repo_stats=[];errors=[]
    for repo in REPOS:
        try:
            tree=fetch_json("/repos/"+OWNER+"/"+repo+"/git/trees/main?recursive=1")
            if tree.get("truncated"):raise RuntimeError("TREE_TRUNCATED")
            blobs=sorted((v for v in tree.get("tree",[]) if v.get("type")=="blob" and v.get("path","").lower().endswith(".html")),key=lambda x:x["path"])
            good=0
            for item in blobs:
                try:
                    text=find_content(repo,item["sha"])
                    rows.append(inspect(repo,item["path"],item["sha"],text))
                    good+=1
                except Exception as exc:
                    errors.append({"repository":repo,"path":item["path"],"error_class":type(exc).__name__})
            repo_stats.append({"repository":repo,"html_found":len(blobs),"html_scanned":good})
        except Exception as exc:
            errors.append({"repository":repo,"path":"TREE","error_class":type(exc).__name__})
            repo_stats.append({"repository":repo,"html_found":None,"html_scanned":0})
    cols=["repository","path","code_url","title","forms","inputs","scripts","remote_scripts","iframes","storage","privacy_link","tracker_pattern","possible_secret","issues","legal_status"]
    with (OUTPUT/"account_html_audit.csv").open("w",encoding="utf-8-sig",newline="") as stream:
        out=csv.DictWriter(stream,fieldnames=cols);out.writeheader();out.writerows(rows)
    summary={"checked_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "scanned_total":len(rows),"repository_stats":repo_stats,"missing_privacy":sum(1 for r in rows if r["privacy_link"]=="NO"),
        "with_inputs":sum(1 for r in rows if r["inputs"]>0),"with_storage":sum(1 for r in rows if r["storage"]=="SI"),
        "with_tracker_pattern":sum(1 for r in rows if r["tracker_pattern"]=="SI"),
        "possible_secrets":sum(1 for r in rows if r["possible_secret"]=="SI"),
        "scan_errors":errors,"legal_status":"NOT_VALIDATED"}
    (OUTPUT/"account_summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    # Incomplete scans and possible secrets need explicit review, not fake success.
    return 1 if errors or summary["possible_secrets"] else 0
if __name__=="__main__":sys.exit(main())
