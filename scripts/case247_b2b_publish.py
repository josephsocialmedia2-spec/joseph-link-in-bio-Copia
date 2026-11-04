#!/usr/bin/env python3
"""Approved B2B Meta image publisher. Fail closed and prevent automatic duplicates."""
import os,json,base64,datetime as dt,urllib.request,urllib.parse,urllib.error,time
from zoneinfo import ZoneInfo
from pathlib import Path
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
def eligible(q, records, now, mode="due", content_id=""):
 jobs=q.get("jobs",[])
 ids=[j["id"] for j in jobs]
 if len(ids)!=len(set(ids)):raise RuntimeError("Duplicate job IDs")
 keys=[(j["content_id"],j["platform"]) for j in jobs]
 attempted={(r.get("content_id"),r.get("platform")) for r in records.values()}
 if len(keys)!=len(set(keys)):raise RuntimeError("Duplicate content/platform")
 result=[]
 for j in jobs:
  if j.get("approved") is not True or j.get("audience")!="aziende" or j.get("platform") not in ("facebook","instagram"):continue
  if (j["content_id"],j["platform"]) in attempted:continue
  if j["id"] in records or j.get("external_post_id") or j.get("permalink"):continue
  scheduled=dt.datetime.fromisoformat(j["scheduled_at_local"])
  if scheduled.tzinfo is None:raise RuntimeError("Schedule must include timezone")
  local=scheduled.astimezone(ZoneInfo("Europe/Rome"))
  if local.utcoffset()!=scheduled.utcoffset():raise RuntimeError("Wrong Rome UTC offset")
  age=(now-scheduled.astimezone(dt.timezone.utc)).total_seconds()
  if mode=="next":
   if local.date()!=now.astimezone(ZoneInfo("Europe/Rome")).date():continue
   if not content_id or j["content_id"]!=content_id:continue
  elif not 0<=age<=3600:continue
  result.append(j)
 return result

def verify_image(job):
 path=job.get("media_jpeg", "")
 if not path.startswith("campagne/case247/editorial-queue/") or ".." in path.split("/") or not path.endswith(".jpg"):raise RuntimeError("Invalid media path")
 if not Path(path).is_file() or Path(path).read_bytes()[:2]!=b"\xff\xd8":raise RuntimeError("JPEG missing from checkout")
 image=MEDIA+urllib.parse.quote(path,safe="/")
 with urllib.request.urlopen(image,timeout=30) as r:
  if r.status!=200 or r.read()!=Path(path).read_bytes():raise RuntimeError("Public JPEG unavailable")
 return image

def main():
 q,_=read(Q); ledger,sha=read(L); records=ledger.get("records",{})
 if not q.get("jobs"):raise RuntimeError("Editorial queue missing or empty")
 now=dt.datetime.now(dt.timezone.utc)
 jobs=eligible(q,records,now,os.getenv("PUBLISH_MODE","due"),os.getenv("CONTENT_ID",""))
 all_b2b=[j for j in q.get("jobs",[]) if j.get("approved") is True and j.get("audience")=="aziende"]
 missing=[k for k in ("META_PAGE_ACCESS_TOKEN","META_FACEBOOK_PAGE_ID","META_INSTAGRAM_USER_ID") if not os.getenv(k)]
 report={"checked_at_utc":now.isoformat(),"approved_jobs":len(all_b2b),"eligible_jobs":len(jobs),"missing_configuration":missing,"mode":os.getenv("PUBLISH_MODE","due"),"dry_run":os.getenv("DRY_RUN","true")!="false","records":records,"queue_enabled":q.get("meta_enabled") is True and q.get("no_automatic_meta_publish") is False}
 report["schedule_requested"]=os.getenv("CASE247_B2B_SCHEDULE")=="true"
 report["authentication"]="NOT_VERIFIED"
 if not missing:
  try:
   if meta("me?fields=id").get("id")!=os.environ["META_FACEBOOK_PAGE_ID"]:raise RuntimeError("Page token identity mismatch")
   page=meta(os.environ["META_FACEBOOK_PAGE_ID"]+"?fields=id,instagram_business_account")
   if page.get("id")!=os.environ["META_FACEBOOK_PAGE_ID"] or page.get("instagram_business_account",{}).get("id")!=os.environ["META_INSTAGRAM_USER_ID"]:raise RuntimeError("Meta account mismatch")
   meta(os.environ["META_INSTAGRAM_USER_ID"]+"?fields=id,username")
   report["authentication"]="ACCOUNT_LINK_VERIFIED_PUBLISH_PERMISSIONS_UNTESTED"
  except RuntimeError as e:report["authentication"]=str(e)
 Path("b2b-diagnostic.json").write_text(json.dumps(report,indent=2))
 _,status_sha=read("campagne/case247/auto-feed/b2b-status.json")
 write("campagne/case247/auto-feed/b2b-status.json",report,status_sha)
 print(json.dumps(report,indent=2))
 for job in all_b2b:verify_image(job)
 if report["dry_run"]:print("DRY RUN:", report["authentication"]);return
 if report["authentication"]!="ACCOUNT_LINK_VERIFIED_PUBLISH_PERMISSIONS_UNTESTED":raise RuntimeError("Meta preflight failed")
 pilot=os.getenv("GITHUB_EVENT_NAME")=="workflow_dispatch" and report["mode"]=="next" and bool(os.getenv("CONTENT_ID"))
 if not pilot:
  if not report["queue_enabled"]:raise RuntimeError("Automatic queue disabled")
  channels={}
  for r in records.values():
   target=os.getenv("META_FACEBOOK_PAGE_ID" if r.get("platform")=="facebook" else "META_INSTAGRAM_USER_ID")
   if r.get("source")=="meta_graph_api" and r.get("status")=="PUBLISHED" and r.get("permalink") and target and r.get("target_id")==target:
    channels.setdefault(r.get("content_id"),set()).add(r.get("platform"))
  if not any(pair=={"facebook","instagram"} for pair in channels.values()):raise RuntimeError("Verified two-channel pilot required")
 if pilot and not jobs:raise RuntimeError("Selected content ineligible or already attempted")
 if not jobs:print("No eligible approved B2B posts");return
 cid=min(jobs,key=lambda j:j["scheduled_at_local"])["content_id"]
 jobs=[j for j in jobs if j["content_id"]==cid]
 print("Selected",cid,[j["platform"] for j in jobs])
 missing=[k for k in ("META_PAGE_ACCESS_TOKEN","META_FACEBOOK_PAGE_ID","META_INSTAGRAM_USER_ID") if not os.getenv(k)]
 if missing:raise RuntimeError("Meta configuration missing: "+", ".join(missing))
 page_id=os.environ["META_FACEBOOK_PAGE_ID"];ig_id=os.environ["META_INSTAGRAM_USER_ID"]
 page=meta(page_id+"?fields=id,instagram_business_account")
 if page.get("id")!=page_id or page.get("instagram_business_account",{}).get("id")!=ig_id:raise RuntimeError("Meta account mismatch")
 for job in jobs:
  jid=job["id"]; path=job.get("media_jpeg",""); image=verify_image(job)
  if not path.startswith("campagne/case247/editorial-queue/") or not path.endswith(".jpg"):raise RuntimeError("Invalid media path")
  identity={"source":"meta_graph_api","platform":job["platform"],"content_id":job["content_id"],"target_id":page_id if job["platform"]=="facebook" else ig_id}
  records[jid]={**identity,"status":"ATTEMPTED_VERIFY_BEFORE_RETRY","at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"external_post_id":None}
  sha=write(L,{"schema_version":1,"records":records},sha)
  try:
   image=MEDIA+urllib.parse.quote(path,safe="/")
   if job["platform"]=="facebook":
    response=meta(page_id+"/photos",{"url":image,"caption":job["caption"],"published":"true"})
   else:
    container=meta(ig_id+"/media",{"image_url":image,"caption":job["caption"]})
    records[jid]["container_id"]=container["id"]
    sha=write(L,{"schema_version":1,"records":records},sha)
    for attempt in range(10):
     state=meta(container["id"]+"?fields=status_code").get("status_code")
     if state=="FINISHED":break
     if state in ("ERROR","EXPIRED"):raise RuntimeError("Instagram container "+state)
     time.sleep(3)
    else:raise RuntimeError("Instagram container not ready; verify before retry")
    response=meta(ig_id+"/media_publish",{"creation_id":container["id"]})
   postid=response.get("post_id") or response.get("id")
   if not postid:raise RuntimeError("Missing Meta post ID")
   records[jid].update({"status":"PUBLISHED_UNVERIFIED","at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"external_post_id":postid})
   sha=write(L,{"schema_version":1,"records":records},sha)
   field="permalink_url" if job["platform"]=="facebook" else "permalink"
   check=meta(str(postid)+"?fields=id,"+field)
   if str(check.get("id"))!=str(postid) or not check.get(field):raise RuntimeError("Published post could not be verified")
   records[jid].update(status="PUBLISHED",permalink=check[field])
   sha=write(L,{"schema_version":1,"records":records},sha)
   print("PUBLISHED",jid,postid)
  except Exception as e:
   print("VERIFY MANUALLY before retry",jid,type(e).__name__,str(e))
   raise
if __name__=="__main__":main()
