#!/usr/bin/env python3
"""Fail-closed REAL MEDIA PRO worker: no live calls without independent safety gates.
Architecture: GitHub Actions -> new isolated Supabase REST -> official social APIs.
Stdlib only. Requires manual OAuth and a rights-cleared public HTTPS video URL.
"""
import argparse
import hashlib
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from schedule import AGENT, WHATSAPP, ROME, PLATFORMS, daily_posts, due

OLD_PROJECT = "nqnmlsmeiynxbdojeyjt"
META_VERSION = os.getenv("META_API_VERSION", "v24.0")
LI_VERSION = os.getenv("LINKEDIN_API_VERSION", "202610")
MAX_ATTEMPTS = 2
REQUIRED_QUOTAS = ("github_actions", "supabase", "meta", "linkedin")
LINKEDIN_BASE = "https://api.linkedin.com/rest"
GRAPH = "https://graph.facebook.com/" + META_VERSION


class Blocked(Exception):
    pass


class Uncertain(Exception):
    pass


class ApiRejected(Exception):
    def __init__(self, code):
        super().__init__("HTTP status " + str(code))
        self.code = code


def req(url, method="GET", data=None, headers=None, timeout=30):
    if data is not None and not isinstance(data, bytes):
        data = json.dumps(data).encode("utf-8")
        headers = {"Content-Type": "application/json", **(headers or {})}
    r = Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urlopen(r, timeout=timeout) as response:
            raw = response.read()
            return response.status, (json.loads(raw) if raw else {}), dict(response.headers)
    except HTTPError as e:
        # Never expose response body or authorization headers into logs.
        raise ApiRejected(e.code) from None
    except (URLError, TimeoutError, ConnectionError) as e:
        raise Uncertain("Network outcome could not be confirmed") from None


def must_env(name):
    v = os.getenv(name)
    if not v:
        raise Blocked("Missing server secret or verified setting: " + name)
    return v


def db_url():
    url = must_env("RMP_SUPABASE_URL").rstrip("/")
    parsed = urlparse(url)
    if parsed.scheme != "https" or OLD_PROJECT in parsed.netloc:
        raise Blocked("Unsafe database target: old project is forbidden")
    return url


def db(path, method="GET", data=None, extra=""):
    secret = must_env("RMP_SUPABASE_SERVICE_ROLE")
    headers = {"apikey": secret, "Authorization": "Bearer " + secret,
               "Accept": "application/json", "Prefer": "return=representation"}
    return req(db_url() + "/rest/v1/" + path + extra, method, data, headers)[1]


def record(post_id, event, detail=""):
    try:
        db("rmp_events", "POST", {"post_id": post_id, "event_type": event,
                                 "detail": str(detail)[:250]})
    except (Blocked, Uncertain, ApiRejected):
        print("Event logging unavailable; publication remains fail-closed", file=sys.stderr)


def patch_post(pid, fields, if_status=None):
    query = "?id=eq." + quote(pid, safe="")
    if if_status:
        query += "&status=eq." + quote(if_status)
    result = db("rmp_posts", "PATCH",
                {**fields, "updated_at": datetime.now(timezone.utc).isoformat()}, query)
    return result[0] if result else None


def settings():
    data = db("rmp_settings?singleton=eq.true&select=*")
    if len(data) != 1:
        raise Blocked("Missing isolated settings")
    return data[0]


def quotas_ok():
    rows = db("rmp_quotas?select=*")
    quotas = {r["provider"]: r for r in rows}
    now = datetime.now(timezone.utc)
    for name in REQUIRED_QUOTAS:
        q = quotas.get(name)
        if not q or not q.get("allowance") or not q.get("verified_at"):
            raise Blocked("Quota UNKNOWN: " + name)
        last = datetime.fromisoformat(q["verified_at"].replace("Z", "+00:00"))
        if now - last > timedelta(hours=24):
            raise Blocked("Quota STALE: " + name)
        usage = float(q["used"]) / float(q["allowance"]) * 100
        if usage >= 80:
            raise Blocked("80% threshold reached: " + name)
        if usage >= 70:
            print("WARNING: >=70% verified quota utilization: " + name)


def graph_get(node, fields, token):
    query = urlencode({"fields": fields, "access_token": token})
    return req(GRAPH + "/" + quote(str(node), safe="/") + "?" + query)[1]


def graph_post(node, values, token):
    values["access_token"] = token
    body = urlencode(values).encode()
    return req(GRAPH + "/" + node, "POST", body,
               {"Content-Type": "application/x-www-form-urlencoded"}, 90)[1]


def linkedin_headers():
    return {"Authorization": "Bearer " + must_env("RMP_LINKEDIN_TOKEN"),
            "Linkedin-Version": LI_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json"}


def expiry_ok(platform):
    raw = must_env("RMP_" + platform.upper() + "_TOKEN_EXPIRES_AT")
    exp = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if not exp.tzinfo or exp - datetime.now(timezone.utc) < timedelta(hours=48):
        raise Blocked("Token expiry or renewal requires attention: " + platform)


def verify_connections(allow_register=False):
    rows = db("rmp_accounts?select=*")
    entries = {r["platform"]: r for r in rows}
    if set(entries) != set(PLATFORMS):
        raise Blocked("Connection registry incomplete")
    page = must_env("RMP_FACEBOOK_PAGE_ID")
    ig = must_env("RMP_INSTAGRAM_ACCOUNT_ID")
    owner = must_env("RMP_LINKEDIN_OWNER_URN")
    if not owner.startswith("urn:li:organization:"):
        raise Blocked("LinkedIn organizational destination is not verified")
    fb_token = must_env("RMP_FACEBOOK_TOKEN")
    ig_token = must_env("RMP_INSTAGRAM_TOKEN")
    for platform in PLATFORMS:
        expiry_ok(platform)
        row = entries[platform]
        if not row.get("expected_name"):
            raise Blocked("Expected verified destination name missing: " + platform)
    page_info = graph_get(page, "id,name,instagram_business_account", fb_token)
    ig_info = graph_get(ig, "id,username,account_type", ig_token)
    if str(page_info.get("id")) != page or str(ig_info.get("id")) != ig:
        raise Blocked("Meta API account ID mismatch")
    linked = page_info.get("instagram_business_account") or {}
    if str(linked.get("id")) != ig:
        raise Blocked("Instagram account is not associated with the approved Page")
    orgid = owner.rsplit(":", 1)[-1]
    li_info = req(LINKEDIN_BASE + "/organizations/" + quote(orgid),
                  headers=linkedin_headers())[1]
    names = {"facebook": page_info.get("name", ""),
             "instagram": ig_info.get("username", ""),
             "linkedin": li_info.get("localizedName", "")}
    ids = {"facebook": page, "instagram": ig, "linkedin": owner}
    for platform in PLATFORMS:
        if names[platform].strip().casefold() != entries[platform]["expected_name"].strip().casefold():
            raise Blocked("Account name ambiguous or changed: " + platform)
        previous_id = entries[platform].get("account_id")
        if previous_id and previous_id != ids[platform]:
            raise Blocked("Destination differs from previously approved account: " + platform)
        if allow_register:
            db("rmp_accounts", "PATCH",
               {"account_id": ids[platform], "display_name": names[platform],
                "verified": True, "verified_at": datetime.now(timezone.utc).isoformat(),
                "last_error": None}, "?platform=eq." + platform)
        elif not entries[platform].get("verified") or previous_id != ids[platform]:
            raise Blocked("Destination not approved in isolated account registry: " + platform)
    return ids


def remote_search(post, ids):
    """Read-only duplicate check. No search results is safe ONLY on a successful API response."""
    platform = post["platform"]
    caption = post["caption"]
    if platform == "facebook":
        result = graph_get(ids["facebook"] + "/videos",
                           "id,description,created_time,permalink_url",
                           must_env("RMP_FACEBOOK_TOKEN"))
        items = result.get("data", [])
        return [("id", r["id"], r.get("permalink_url")) for r in items
                if r.get("description") == caption]
    if platform == "instagram":
        result = graph_get(ids["instagram"] + "/media",
                           "id,caption,timestamp,permalink",
                           must_env("RMP_INSTAGRAM_TOKEN"))
        return [("id", r["id"], r.get("permalink")) for r in result.get("data", [])
                if r.get("caption") == caption]
    params = urlencode({"q": "author", "author": ids["linkedin"], "count": "100"})
    result = req(LINKEDIN_BASE + "/posts?" + params, headers=linkedin_headers())[1]
    return [("id", r["id"], None) for r in result.get("elements", [])
            if r.get("commentary") == caption]


def verify_remote(platform, remote_id):
    if platform in ("facebook", "instagram"):
        token = must_env("RMP_" + platform.upper() + "_TOKEN")
        result = graph_get(remote_id, "id" + (",permalink" if platform == "instagram"
                                              else ",permalink_url"), token)
        return result.get("id") == remote_id, result.get("permalink") or result.get("permalink_url")
    code, obj, _ = req(LINKEDIN_BASE + "/posts/" + quote(remote_id, safe=""),
                       headers=linkedin_headers())
    return code == 200 and obj.get("id") == remote_id and obj.get("lifecycleState") == "PUBLISHED", None


def verify_media_identity(options):
    """Require the exact SHA-256 registered in the private database."""
    approved = str(options.get("media_sha256") or "").lower()
    configured = must_env("RMP_VIDEO_SHA256").lower()
    if len(approved) != 64 or not all(c in "0123456789abcdef" for c in approved):
        raise Blocked("Approved media checksum is missing or invalid in Neon")
    if approved != configured:
        raise Blocked("Configured media checksum does not match the reviewed video")
    return approved


def video_url():
    url = must_env("RMP_VIDEO_URL")
    parsed = urlparse(url)
    expected_host = must_env("RMP_VIDEO_HOST")
    if parsed.scheme != "https" or parsed.hostname != expected_host or parsed.username or parsed.password:
        raise Blocked("Video URL must be an explicitly approved HTTPS host")
    return url


def publish_facebook(post, ids):
    resp = graph_post(ids["facebook"] + "/videos",
                      {"file_url": video_url(), "description": post["caption"],
                       "published": "true"}, must_env("RMP_FACEBOOK_TOKEN"))
    if not resp.get("id"):
        raise Uncertain("Facebook response lacks video ID")
    return str(resp["id"])


def publish_instagram(post, ids):
    token = must_env("RMP_INSTAGRAM_TOKEN")
    container = graph_post(ids["instagram"] + "/media",
                           {"media_type": "REELS", "video_url": video_url(),
                            "caption": post["caption"]}, token)
    cid = container.get("id")
    if not cid:
        raise Uncertain("Instagram container ID missing")
    for i in range(9):
        state = graph_get(cid, "status_code", token).get("status_code")
        if state == "FINISHED":
            break
        if state == "ERROR":
            raise Blocked("Instagram video processing rejected")
        time.sleep(7)
    else:
        raise Uncertain("Instagram container processing not confirmed")
    published = graph_post(ids["instagram"] + "/media_publish",
                           {"creation_id": cid}, token)
    if not published.get("id"):
        raise Uncertain("Instagram publish response is inconclusive")
    return str(published["id"])


def download_video():
    # No upload to Supabase Storage; download one temporary local copy during the job.
    url = video_url()
    expected = must_env("RMP_VIDEO_SHA256").lower()
    try:
        with urlopen(Request(url, headers={"User-Agent": "RMP-Video-Worker/1.0"}), timeout=60) as r:
            if r.geturl().split("/")[2] != must_env("RMP_VIDEO_HOST"):
                raise Blocked("Video redirect left approved host")
            body = r.read(100_000_001)
    except (URLError, TimeoutError):
        raise Blocked("Video download failed")
    if len(body) > 100_000_000 or hashlib.sha256(body).hexdigest() != expected:
        raise Blocked("Video too large or SHA256 mismatch")
    return body


def publish_linkedin(post, ids):
    data = download_video()
    h = linkedin_headers()
    response = req(LINKEDIN_BASE + "/videos?action=initializeUpload", "POST", {
        "initializeUploadRequest": {"owner": ids["linkedin"], "fileSizeBytes": len(data),
                                    "uploadCaptions": False, "uploadThumbnail": False}
    }, h)[1]["value"]
    urn = response["video"]
    etags = []
    for chunk in response["uploadInstructions"]:
        start, end = int(chunk["firstByte"]), int(chunk["lastByte"]) + 1
        _, _, headers = req(chunk["uploadUrl"], "PUT", data[start:end],
                            {"Content-Type": "application/octet-stream"}, 90)
        etags.append(headers.get("ETag", "").strip('"'))
    req(LINKEDIN_BASE + "/videos?action=finalizeUpload", "POST", {
        "finalizeUploadRequest": {"video": urn, "uploadToken": response.get("uploadToken", ""),
                                  "uploadedPartIds": etags}}, h)
    for i in range(9):
        item = req(LINKEDIN_BASE + "/videos/" + quote(urn, safe=""), headers=h)[1]
        if item.get("status") == "AVAILABLE":
            break
        if item.get("status") in ("PROCESSING_FAILED", "FAILED"):
            raise Blocked("LinkedIn video processing rejected")
        time.sleep(7)
    else:
        raise Uncertain("LinkedIn upload not ready; do not recreate blindly")
    payload = {"author": ids["linkedin"], "commentary": post["caption"],
               "visibility": "PUBLIC", "distribution": {
                   "feedDistribution": "MAIN_FEED",
                   "targetEntities": [], "thirdPartyDistributionChannels": []},
               "content": {"media": {"title": "REAL MEDIA PRO - Vendere casa", "id": urn}},
               "lifecycleState": "PUBLISHED", "isReshareDisabledByAuthor": False}
    _, body, headers = req(LINKEDIN_BASE + "/posts", "POST", payload, h, 90)
    published = headers.get("x-restli-id") or headers.get("X-RestLi-Id") or body.get("id")
    if not published:
        raise Uncertain("LinkedIn post identifier missing")
    return published


PUBLISHERS = {"facebook": publish_facebook, "instagram": publish_instagram,
              "linkedin": publish_linkedin}


def mark_published(post, remote_id, permalink=None):
    verified, uri = verify_remote(post["platform"], remote_id)
    if not verified:
        raise Uncertain("Post was not independently confirmed by official API")
    patch_post(post["id"], {"status": "PUBLISHED", "remote_id": remote_id,
                            "permalink": uri or permalink,
                            "published_at": datetime.now(timezone.utc).isoformat()}, "CLAIMED")
    record(post["id"], "PUBLISHED", remote_id)


def process(post, ids):
    # Non-atomic external APIs have no cross-platform exactly-once guarantee.
    # Claim in database first; a crashed claimed item will never be auto-retried.
    if post["attempts"] >= MAX_ATTEMPTS:
        patch_post(post["id"], {"status": "BLOCKED", "last_error": "Retry cap reached"})
        return
    matches = remote_search(post, ids)
    if matches:
        patch_post(post["id"], {"status": "UNCERTAIN",
                                "last_error": "Potential duplicate already exists"})
        record(post["id"], "DUPLICATE_PREVENTED")
        return
    claimed = patch_post(post["id"], {"status": "CLAIMED",
                                      "attempts": post["attempts"] + 1,
                                      "claimed_at": datetime.now(timezone.utc).isoformat()},
                         "READY")
    if not claimed:
        return
    try:
        rid = PUBLISHERS[post["platform"]](post, ids)
        mark_published(post, rid)
    except ApiRejected as e:
        # A conclusive non-2xx response may still hide a server-side creation;
        # only a read-only reconciliation can authorize a future retry.
        patch_post(post["id"], {"status": "UNCERTAIN",
                                "last_error": "API rejected request " + str(e.code)}, "CLAIMED")
        record(post["id"], "UNCERTAIN_HTTP", e.code)
    except (Uncertain, Blocked) as e:
        patch_post(post["id"], {"status": "UNCERTAIN", "last_error": str(e)}, "CLAIMED")
        record(post["id"], "UNCERTAIN", str(e))
    except Exception:
        patch_post(post["id"], {"status": "UNCERTAIN", "last_error": "Unexpected failure"}, "CLAIMED")
        record(post["id"], "UNCERTAIN", "Unexpected failure")


def reconcile(ids):
    rows = db("rmp_posts?status=in.(CLAIMED,UNCERTAIN)&select=*&order=scheduled_at.asc&limit=100")
    for post in rows:
        try:
            matches = remote_search(post, ids)
            if len(matches) == 1:
                rid = matches[0][1]
                yes, permalink = verify_remote(post["platform"], rid)
                if yes:
                    patch_post(post["id"], {"status": "PUBLISHED",
                                            "remote_id": rid, "permalink": permalink,
                                            "published_at": datetime.now(timezone.utc).isoformat()})
                    record(post["id"], "RECONCILED_PUBLISHED", rid)
            elif not matches:
                # An empty bounded feed is not proof no post exists: NEVER retry automatically.
                record(post["id"], "RECONCILE_NO_MATCH_STILL_BLOCKED")
        except (Uncertain, ApiRejected, Blocked):
            record(post["id"], "RECONCILE_UNAVAILABLE")


def seed(days=4):
    now = datetime.now(ROME).date()
    count = 0
    for step in range(days):
        for item in daily_posts(now + timedelta(days=step)):
            # On conflict ignore: preserves historic, in-flight and published records.
            secret = must_env("RMP_SUPABASE_SERVICE_ROLE")
            req(db_url() + "/rest/v1/rmp_posts?on_conflict=id", "POST", item,
                {"apikey": secret, "Authorization": "Bearer " + secret,
                 "Prefer": "resolution=ignore-duplicates,return=minimal"})
            count += 1
    print(json.dumps({"seed_attempted": count, "note": "idempotent insert only"}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("dry-run", "seed", "check", "tick", "test-publish", "reconcile"))
    parser.add_argument("--date", default=datetime.now(ROME).date().isoformat())
    args = parser.parse_args()
    if args.mode == "dry-run":
        print(json.dumps({"mode": "DRY_RUN_NO_NETWORK",
                          "posts": daily_posts(date.fromisoformat(args.date))},
                         ensure_ascii=False, indent=2))
        return
    if args.mode == "seed":
        quotas_ok()
        seed()
        return
    if args.mode == "check":
        ids = verify_connections(allow_register=True)
        print("VERIFIED READ-ONLY DESTINATIONS: " + ",".join(ids))
        return
    opts = settings()
    if args.mode == "reconcile":
        ids = verify_connections()
        reconcile(ids)
        return
    if os.getenv("RMP_LIVE_PUBLISH") != "YES":
        raise Blocked("Publication disabled in GitHub server settings")
    if not opts.get("enabled") or not opts.get("rights_verified"):
        raise Blocked("Publishing paused or rights evidence not verified")
    if args.mode == "tick" and not opts.get("live_test_verified"):
        raise Blocked("First authorized live test not independently verified")
    verify_media_identity(opts)
    video_url()
    # Verify the exact approved bytes before even making a Facebook/Instagram request.
    download_video()
    quotas_ok()
    ids = verify_connections()
    reconcile(ids)
    # The scheduler must populate its queue before dispatch. Without this
    # step a green workflow would publish zero items indefinitely.
    seed(days=2)
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(minutes=45)).isoformat()
    rows = db("rmp_posts?status=eq.READY&scheduled_at=gte." + quote(cutoff, safe="") +
              "&scheduled_at=lte." + quote(now.isoformat(), safe="") +
              "&order=scheduled_at.asc&select=*&limit=30")
    candidates = due(rows, now)
    if args.mode == "test-publish" and candidates:
        # Test all THREE platforms in the SAME existing slot; never create extra jobs.
        test_slot = candidates[0]["scheduled_at"]
        candidates = [p for p in candidates if p["scheduled_at"] == test_slot]
    for post in candidates:
        if AGENT not in post["caption"] or WHATSAPP not in post["caption"]:
            patch_post(post["id"], {"status": "BLOCKED", "last_error": "Required links missing"})
            continue
        process(post, ids)
    if args.mode == "test-publish" and candidates:
        slot = candidates[0]["scheduled_at"]
        rows = db("rmp_posts?scheduled_at=eq." + quote(slot, safe="") +
                  "&select=platform,status")
        if len(rows) == 3 and {r["platform"] for r in rows} == set(PLATFORMS) and all(
                r["status"] == "PUBLISHED" for r in rows):
            db("rmp_settings", "PATCH", {"live_test_verified": True},
               "?singleton=eq.true")
            print("ALL THREE PLATFORM TEST POSTS independently verified")
    print(json.dumps({"mode": args.mode, "candidates": len(candidates)}))


if __name__ == "__main__":
    try:
        main()
    except (Blocked, Uncertain, ApiRejected) as exc:
        print("BLOCCATO: " + str(exc), file=sys.stderr)
        sys.exit(2)
