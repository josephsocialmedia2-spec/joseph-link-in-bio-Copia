"""Official social publisher. Disabled unless explicitly configured, with persistent remote receipts.

Publishes: Facebook Page 5-photo post, Instagram professional 5-photo carousel,
LinkedIn public MEMBER/ORGANIZATION 5-image organic post. Never fakes a receipt.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from .branding import verify_brand_archive, validate_copy, BrandViolation
from .github_release import GitHubReleaseStaging

GRAPH_VERSION = os.getenv("META_GRAPH_VERSION", "v25.0")
LI_VERSION = os.getenv("LINKEDIN_API_VERSION", "202610")
CHANNELS = ("facebook", "instagram", "linkedin")


def _request(url, data=None, headers=None, method=None, raw=False):
    head = {"User-Agent": "RealMediaProSocialPublisher/1.0", **(headers or {})}
    req = Request(url, data=data, headers=head, method=method or ("POST" if data is not None else "GET"))
    try:
        with urlopen(req, timeout=90) as response:
            body = response.read()
            if raw:
                return body
            val = json.loads(body) if body else {}
            return {"data": val, "headers": dict(response.headers), "status": response.status}
    except HTTPError as e:
        # Avoid echoing tokens and full request URLs to public CI logs.
        raise RuntimeError(f"Platform API rejected operation, HTTP {e.code}: {e.read().decode('utf-8','replace')[:350]}") from e


def _meta(edge, fields, token):
    if not token:
        raise BrandViolation("Missing authorized Meta access token")
    url = f"https://graph.facebook.com/{GRAPH_VERSION}/{edge.lstrip('/')}"
    fields = {**fields, "access_token": token}
    return _request(url, urlencode(fields).encode("utf-8"))["data"]


def _li_request(url, token, data=None, method=None, raw=False):
    if not token:
        raise BrandViolation("Missing LinkedIn OAuth token")
    hdr = {"Authorization": "Bearer " + token, "Linkedin-Version": LI_VERSION,
           "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json"}
    return _request(url, data=data, headers=hdr, method=method, raw=raw)


def _need_env():
    names = ("FB_PAGE_ID", "FB_PAGE_ACCESS_TOKEN", "IG_ACCOUNT_ID", "IG_ACCESS_TOKEN",
             "LINKEDIN_OWNER_URN", "LINKEDIN_ACCESS_TOKEN", "GITHUB_TOKEN")
    missing = [name for name in names if not os.getenv(name)]
    if missing:
        raise BrandViolation("Publishing blocked: missing required GitHub Secrets " + ", ".join(missing))
    owner = os.environ["LINKEDIN_OWNER_URN"]
    if not (owner.startswith("urn:li:person:") or owner.startswith("urn:li:organization:")):
        raise BrandViolation("LinkedIn owner must be the authorized person or company URN")


def _release_items(release):
    assets = {a["name"]: a["browser_download_url"] for a in release.get("assets", [])}
    required = [f"carousel_{i:02d}.jpg" for i in range(1, 6)] + \
               ["caption_facebook.txt", "caption_instagram.txt",
                "caption_linkedin.txt", "manifest.json"]
    if not all(n in assets for n in required):
        return None
    manifest = json.loads(_request(assets["manifest.json"], raw=True))
    if manifest.get("status") != "ready_for_later_import" or len(manifest.get("assets", {})) != 7:
        raise BrandViolation("Incomplete media manifest — blocked")
    if manifest.get("caption_status") != "generated_not_published":
        raise BrandViolation("Captions have not passed the generation gate")
    visual = manifest.get("quality", {})
    if not all(visual.get("carousel_%02d" % n, {}).get("pass") is True for n in range(1, 6)):
        raise BrandViolation("At least one slide lacks positive brand visual QA")
    captions = {ch: _request(assets[f"caption_{ch}.txt"], raw=True).decode("utf-8")
                for ch in CHANNELS}
    for cap in captions.values():
        validate_copy(cap)
    return {"image_urls": [assets[f"carousel_{i:02d}.jpg"] for i in range(1, 6)],
            "caption": captions, "manifest": manifest}


def _facebook(image_urls, caption):
    token = os.environ["FB_PAGE_ACCESS_TOKEN"]
    page = os.environ["FB_PAGE_ID"]
    media = []
    for url in image_urls:
        reply = _meta(page + "/photos", {"url": url, "published": "false"}, token)
        media.append(reply["id"])
    data = {"message": caption}
    for i, photo_id in enumerate(media):
        data[f"attached_media[{i}]"] = json.dumps({"media_fbid": photo_id})
    reply = _meta(page + "/feed", data, token)
    return {"post_id": reply["id"], "type": "facebook_multi_photo"}


def _instagram(image_urls, caption):
    token = os.environ["IG_ACCESS_TOKEN"]
    account = os.environ["IG_ACCOUNT_ID"]
    children = []
    for url in image_urls:
        reply = _meta(account + "/media", {"image_url": url, "is_carousel_item": "true"}, token)
        children.append(reply["id"])
    parent = _meta(account + "/media", {"media_type": "CAROUSEL",
                   "children": ",".join(children), "caption": caption}, token)
    creation_id = parent["id"]
    for attempt in range(12):
        reply = _request("https://graph.facebook.com/" + GRAPH_VERSION + "/" + creation_id
             + "?" + urlencode({"fields": "status_code", "access_token": token}))["data"]
        state = reply.get("status_code")
        if state == "FINISHED":
            break
        if state in ("ERROR", "EXPIRED", "PUBLISHED"):
            raise RuntimeError("Instagram carousel not ready: " + str(state))
        time.sleep(5)
    else:
        raise RuntimeError("Instagram container did not become ready; publication blocked")
    published = _meta(account + "/media_publish", {"creation_id": creation_id}, token)
    return {"post_id": published["id"], "creation_id": creation_id,
            "type": "instagram_carousel"}


def _linkedin(image_urls, caption):
    token = os.environ["LINKEDIN_ACCESS_TOKEN"]
    owner = os.environ["LINKEDIN_OWNER_URN"]
    images = []
    for url in image_urls:
        request_body = json.dumps({"initializeUploadRequest": {"owner": owner}}).encode("utf-8")
        init = _li_request("https://api.linkedin.com/rest/images?action=initializeUpload",
                           token, request_body)
        result = init["data"]["value"]
        raw_jpeg = _request(url, raw=True)
        if not raw_jpeg.startswith(b"\xff\xd8"):
            raise BrandViolation("LinkedIn upload is not a JPEG asset")
        upload_headers = {"Authorization": "Bearer " + token,
                          "Content-Type": "image/jpeg"}
        _request(result["uploadUrl"], data=raw_jpeg, headers=upload_headers,
                 method="PUT", raw=True)
        images.append({"id": result["image"], "altText": "Grafica informativa REAL MEDIA PRO"})
    post_body = {"author": owner, "commentary": caption, "visibility": "PUBLIC",
                 "distribution": {"feedDistribution": "MAIN_FEED",
                                  "targetEntities": [], "thirdPartyDistributionChannels": []},
                 "lifecycleState": "PUBLISHED", "isReshareDisabledByAuthor": False,
                 "content": {"multiImage": {"images": images}}}
    response = _li_request("https://api.linkedin.com/rest/posts", token,
                           json.dumps(post_body, ensure_ascii=False).encode("utf-8"))
    post_id = response["headers"].get("x-restli-id") or response["headers"].get("X-Restli-Id")
    if not post_id:
        raise RuntimeError("LinkedIn accepted request but returned no post identifier")
    return {"post_id": post_id, "type": "linkedin_organic_multiimage"}


def publish_pending(repo: str, live: bool = False) -> dict:
    if not live:
        return {"status": "disabled", "detail": "Set SOCIAL_LIVE_PUBLISH=true with authorized tokens"}
    verify_brand_archive()
    _need_env()  # Validate ALL channels before any side effects.
    github = GitHubReleaseStaging(repo)
    all_releases = github.request("GET", f"https://api.github.com/repos/{repo}/releases?per_page=100")
    for release in reversed(all_releases):
        if not release.get("tag_name", "").startswith("joseph-staging-"):
            continue
        try:
            record = json.loads(release.get("body") or "{}")
        except (TypeError, ValueError):
            record = {}
        receipts = record.get("receipts", {})
        if all(ch in receipts for ch in CHANNELS):
            continue
        prepared = _release_items(release)
        if prepared is None:
            continue
        for ch, fn in (("facebook", _facebook),
                       ("instagram", _instagram), ("linkedin", _linkedin)):
            if ch in receipts:
                continue
            result = fn(prepared["image_urls"], prepared["caption"][ch])
            if not result.get("post_id"):
                raise RuntimeError("Missing actual platform post ID for " + ch)
            receipts[ch] = result
            record.update({"campaign": release["tag_name"], "receipts": receipts,
                           "published": all(c in receipts for c in CHANNELS),
                           "publisher": "official_social_apis"})
            # Save receipt IMMEDIATELY to prevent duplicate posting after retries.
            github.request("PATCH", f"https://api.github.com/repos/{repo}/releases/{release['id']}",
                           json.dumps({"body": json.dumps(record, ensure_ascii=False)}).encode("utf-8"))
        return {"status": "published_confirmed", "campaign": release["tag_name"],
                "receipts": receipts}
    return {"status": "no_pending_verified_campaign"}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--repo", default="josephsocialmedia2-spec/joseph-link-in-bio-Copia")
    args = p.parse_args()
    print(json.dumps(publish_pending(args.repo,
          live=os.getenv("SOCIAL_LIVE_PUBLISH", "").lower() == "true"), ensure_ascii=False))


if __name__ == "__main__":
    main()
