#!/usr/bin/env python3
"""Conservative automated URL preflight for RSS candidates. Does NOT approve articles."""
import concurrent.futures
import datetime as dt
from html.parser import HTMLParser
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
FOLDER=ROOT/"gestione"/"rivista"/"data"

class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title=[]
        self.in_title=False
        self.meta={}
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if tag=="title":
            self.in_title=True
        if tag=="meta":
            key=(data.get("property") or data.get("name") or "").lower()
            if key in ("article:published_time","datepublished","pubdate","og:title","article:modified_time"):
                self.meta[key]=data.get("content","")
        if tag=="link" and data.get("rel","").lower()=="canonical":
            self.meta["canonical"]=data.get("href","")
    def handle_endtag(self,tag):
        if tag=="title":self.in_title=False
    def handle_data(self,text):
        if self.in_title:self.title.append(text)

def one(item):
    link=item.get("url","")
    result={"title":item.get("title",""),"candidate_url":link,"status":"needs_human_review","http_ok":False,"primary_source_confirmed":False}
    try:
        req=urllib.request.Request(link,headers={"User-Agent":"Mozilla/5.0 (compatible; JosephRealEstateWeekly/1.0; editorial verification)","Accept":"text/html"})
        with urllib.request.urlopen(req,timeout=8) as resp:
            result["http_status"]=resp.status
            result["resolved_url"]=resp.url
            result["http_ok"]=200<=resp.status<400
            typ=resp.headers.get("Content-Type","")
            if "html" not in typ.lower():return result
            data=resp.read(150000).decode("utf-8","replace")
            h=HeadParser()
            h.feed(data)
            result["page_title"]=" ".join(h.title).strip()[:220]
            result["published_metadata"]=h.meta.get("article:published_time") or h.meta.get("datepublished") or h.meta.get("pubdate") or ""
            result["canonical"]=h.meta.get("canonical","")
            host=(urllib.parse.urlparse(result["resolved_url"]).hostname or "").lower()
            result["primary_source_confirmed"]=bool(host and not host.endswith(("google.com","news.google.com")) and result["page_title"])
    except Exception as exc:
        result["error"]=type(exc).__name__
    return result

def main():
    d=json.loads((FOLDER/"latest.json").read_text(encoding="utf-8"))
    items=d.get("items",[])[:25]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        checks=list(pool.map(one,items))
    payload={
      "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
      "notice":"HTTP/metadati soltanto: NON costituiscono fact-checking, verifica delle cifre o approvazione editoriale.",
      "checks":checks
    }
    (FOLDER/"preflight.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Preflight:",len(checks),"HTTP OK:",sum(x["http_ok"] for x in checks),"original host:",sum(x["primary_source_confirmed"] for x in checks))

if __name__=="__main__":main()
