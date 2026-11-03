#!/usr/bin/env python3
"""Approved B2B Meta image publisher. Fail closed and prevent automatic duplicates."""
import os,json,base64,datetime as dt,urllib.request,urllib.parse,urllib.error
Q="campagne/case247/editorial-queue/2026-11-01_2026-11-04/queue.json"
L="campagne/case247/auto-feed/publish-ledger-b2b.json"
API="https://api.github.com/repos/"+os.environ["GITHUB_REPOSITORY"]+"/contents/"
GRAPH="https://graph.facebook.com/"+os.getenv("META_GRAPH_VERSION","v26.0")+"/"
MEDIA="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/"
GH=os.environ["GH_TOKEN"]
def call(url,method="GET",data=None,token=None,gh=False):
 h={"User-Agent":"case247-b2b/1.0"}
 if token:h["Authorization"]="Bearer "+token
 if data is not None:
  h["Content-Type"]="application/json" if gh else "application/x-www-form-urlencoded"
  data=json.dumps(data).encode() if gh else urllib.parse.urlencode(data).encode()
 try:
  with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=h,method=method),timeout=30) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError(("GitHub" if gh else "Meta")+" API HTTP "+str(e.code)) from None
def read(path):
 try:
  r=call(API+urllib.parse.quote(path,safe="/"),token=GH,gh=True)
  return json.loads(base64.b64decode(r["content"])),r["sha"]
 except RuntimeError as e:
  if str(e)=="GitHub API HTTP 404":return {},None
  raise
def write(path,data,sha):
 body={"message":"chore: record CASE247 B2B publication attempt","content":base64.b64encode((json.dumps(data,ensure_ascii=False,indent=2)+"\n").encode()).decode(),"branch":"main"}
 if sha:body["sha"]=sha
 return call(API+urllib.parse.quote(path,safe="/"),"PUT",body,GH,True)["content"]["sha"]
def meta(path,body=None):
 return call(GRAPH+path,"POST" if body is not None else "GET",body,os.environ["META_PAGE_ACCESS_TOKEN"])
def main():
 q,_=read(Q); ledger,sha=read(L); records=ledger.get("records",{})
 jobs=[j for j in q.get("jobs",[]) if j.get("approved") is True and j.get("audience")=="aziende" and j.get("platform") in ("facebook","instagram") and j["id"] not in records]
 if os.getenv("PUBLISH_MODE","due")!="next":
  now=dt.datetime.now(dt.timezone.utc)
  jobs=[j for j in jobs if dt.datetime.fromisoformat(j["scheduled_at_local"]).astimezone(dt.timezone.utc)<=now]
 if not jobs:print("No eligible approved B2B posts");return
 cid=min(jobs,key=lambda j:j["scheduled_at_local"])["content_id"]
 jobs=[j for j in jobs if j["content_id"]==cid]
 print("Selected",cid,[j["platform"] for j in jobs])
 if os.getenv("DRY_RUN","true")!="false":print("DRY RUN: nothing posted");return
 missing=[k for k in ("META_PAGE_ACCESS_TOKEN","META_FACEBOOK_PAGE_ID","META_INSTAGRAM_USER_ID") if not os.getenv(k)]
 if missing:raise RuntimeError("Meta configuration missing: "+", ".join(missing))
 page_id=os.environ["META_FACEBOOK_PAGE_ID"];ig_id=os.environ["META_INSTAGRAM_USER_ID"]
 page=meta(page_id+"?fields=id,instagram_business_account")
 if page.get("id")!=page_id or page.get("instagram_business_account",{}).get("id")!=ig_id:raise RuntimeError("Meta account mismatch")
 for job in jobs:
  jid=job["id"]; path=job.get("media_jpeg","")
  if not path.startswith("campagne/case247/editorial-queue/") or not path.endswith(".jpg"):raise RuntimeError("Invalid media path")
  records[jid]={"status":"ATTEMPTED_VERIFY_BEFORE_RETRY","at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"external_post_id":None}
  sha=write(L,{"schema_version":1,"records":records},sha)
  try:
   image=MEDIA+urllib.parse.quote(path,safe="/")
   if job["platform"]=="facebook":
    response=meta(page_id+"/photos",{"url":image,"caption":job["caption"],"published":"true"})
   else:
    container=meta(ig_id+"/media",{"image_url":image,"caption":job["caption"]})
    response=meta(ig_id+"/media_publish",{"creation_id":container["id"]})
   postid=response.get("post_id") or response.get("id")
   if not postid:raise RuntimeError("Missing Meta post ID")
   records[jid]={"status":"PUBLISHED","at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"external_post_id":postid}
   sha=write(L,{"schema_version":1,"records":records},sha)
   print("PUBLISHED",jid,postid)
  except Exception as e:
   print("VERIFY MANUALLY before retry",jid,type(e).__name__,str(e))
   raise
if __name__=="__main__":main()
