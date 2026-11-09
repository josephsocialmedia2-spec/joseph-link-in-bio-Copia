#!/usr/bin/env python3
"""One-shot, explicitly authorized CASE247-009 Instagram publication.
Never automatically retry after a new POST; fail closed on uncertainty.
"""
import datetime as dt
import time
import case247_b2b_publish as pub

JOB_ID="CASE247-009-instagram"
EXPECTED_TARGET="17841415827906266"
EXPECTED_PAGE="1402024242991896"

def main():
    import json
    from pathlib import Path
    q=json.loads(Path(pub.Q).read_text(encoding="utf-8"))
    jobs=[j for j in q.get("jobs",[]) if j.get("id")==JOB_ID]
    if len(jobs)!=1:raise RuntimeError("Expected exactly one CASE247-009 Instagram job")
    job=jobs[0]
    if job.get("approved") is not True or job.get("platform")!="instagram" or job.get("content_id")!="CASE247-009":
        raise RuntimeError("Job not explicitly eligible")
    records,sha=pub.read(pub.L)
    records=records.get("records",{})
    prior=records.get(JOB_ID,{})
    if prior.get("status")!="ATTEMPTED_VERIFY_BEFORE_RETRY" or prior.get("external_post_id") or prior.get("container_id"):
        print("BLOCKED: uncertain or existing publication state; no post sent")
        return
    if prior.get("target_id")!=EXPECTED_TARGET:
        raise RuntimeError("Ledger account mismatch")
    if pub.meta("me?fields=id").get("id")!=EXPECTED_PAGE:
        raise RuntimeError("Page token identity mismatch")
    page=pub.meta(EXPECTED_PAGE+"?fields=id,instagram_business_account")
    if page.get("id")!=EXPECTED_PAGE or page.get("instagram_business_account",{}).get("id")!=EXPECTED_TARGET:
        raise RuntimeError("Instagram account mismatch")
    pub.meta(EXPECTED_TARGET+"?fields=id,username")
    matching=pub.remote_matches(job,EXPECTED_TARGET)
    if matching:
        records[JOB_ID].update(status="REMOTE_MATCH_REQUIRES_REVIEW",matches=matching)
        pub.write(pub.L,{"schema_version":1,"records":records},sha)
        print("BLOCKED: Instagram already has matching caption, manual reconciliation required")
        return
    image=pub.verify_image(job)
    # Previous attempt produced Meta HTTP 400, so no container ID was returned.
    # Claim this one-shot attempt on GitHub BEFORE issuing any external write.
    records[JOB_ID].update(status="RECOVERY_20261109_ATTEMPTED_VERIFY_BEFORE_RETRY",
        recovery_at_utc=dt.datetime.now(dt.timezone.utc).isoformat(),
        source="meta_graph_api",target_id=EXPECTED_TARGET,
        recovery_note="Explicitly approved CASE247-009 one-shot after previous HTTP 400 and remote account history check")
    sha=pub.write(pub.L,{"schema_version":1,"records":records},sha)
    print("Safe recovery claimed; creating Instagram container.")
    try:
        container=pub.meta(EXPECTED_TARGET+"/media",{"image_url":image,"caption":job["caption"]})
        if not container.get("id"):raise RuntimeError("Container creation response missing ID")
        records[JOB_ID]["container_id"]=container["id"]
        sha=pub.write(pub.L,{"schema_version":1,"records":records},sha)
        for attempt in range(15):
            state=pub.meta(str(container["id"])+"?fields=status_code").get("status_code")
            if state=="FINISHED":break
            if state in ("ERROR","EXPIRED"):raise RuntimeError("Instagram container "+state)
            time.sleep(3)
        else:raise RuntimeError("Instagram container not ready; manual inspection required")
        published=pub.meta(EXPECTED_TARGET+"/media_publish",{"creation_id":container["id"]})
        post_id=published.get("id")
        if not post_id:raise RuntimeError("Publish response missing post id; manual inspection required")
        records[JOB_ID].update(status="PUBLISHED_UNVERIFIED",external_post_id=post_id,
            published_at_utc=dt.datetime.now(dt.timezone.utc).isoformat())
        sha=pub.write(pub.L,{"schema_version":1,"records":records},sha)
        verified=pub.meta(str(post_id)+"?fields=id,permalink")
        if str(verified.get("id"))!=str(post_id) or not verified.get("permalink"):
            raise RuntimeError("Instagram published but permalink verification failed")
        records[JOB_ID].update(status="PUBLISHED",permalink=verified["permalink"],
            verified_at_utc=dt.datetime.now(dt.timezone.utc).isoformat())
        pub.write(pub.L,{"schema_version":1,"records":records},sha)
        print("INSTAGRAM_PUBLISHED_VERIFIED",JOB_ID,verified["permalink"])
    except Exception as e:
        print("RECOVERY_INCOMPLETE_VERIFY_MANUALLY",type(e).__name__,str(e))
        raise

if __name__=="__main__":
    main()
