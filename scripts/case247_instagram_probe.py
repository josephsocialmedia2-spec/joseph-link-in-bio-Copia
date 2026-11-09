#!/usr/bin/env python3
"""Safe one-shot Instagram diagnostic: checks existing post then creates an UNPUBLISHED media container. Token retest 2026-11-09."""
import json,os,urllib.parse
from pathlib import Path
import case247_b2b_publish as pub

def main():
    q=json.loads(Path("campagne/case247/editorial-queue/2026-11-01_2026-11-04/queue.json").read_text())
    job=next(j for j in q["jobs"] if j["id"]=="CASE247-009-instagram")
    ledger,_=pub.read(pub.L)
    record=ledger.get("records",{}).get(job["id"],{})
    target=os.environ["META_INSTAGRAM_USER_ID"]
    if record.get("status")=="PUBLISHED" or record.get("external_post_id"):
        print("SKIP: existing Instagram record; no request to create media");return
    matches=pub.remote_matches(job,target)
    if matches:
        print("EXISTING_INSTAGRAM_POST_MATCH: manual reconciliation required; no media creation");return
    print("Existing Instagram media checked: no matching caption. Previous attempt stopped with HTTP 400 before a container ID was returned.")
    image=pub.verify_image(job)
    print("Public JPEG verified. Instagram media container creation diagnostic begins; no media_publish request will be made.")
    try:
        r=pub.meta(target+"/media",{"image_url":image,"caption":job["caption"]})
        print("IG_CONTAINER_CREATED_NOT_PUBLISHED: "+("YES" if r.get("id") else "NO"))
        print("No publication sent. Container ID intentionally not logged.")
    except RuntimeError as e:
        print("IG_MEDIA_CONTAINER_ERROR: "+str(e))
        raise

if __name__=="__main__":
    main()
