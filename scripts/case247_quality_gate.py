#!/usr/bin/env python3
"""Read-only CASE247 editorial quality audit; no scheduling and no Meta API writes.

Publishes only an aggregate, PII-free health report into the existing regia
directory. Invalid configuration fails closed; unavailable assets stay blocked
at the actual publisher's HEAD/media gate.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from case247_territorial_engine import ROOT, OUT, read_json, atomic_write, valid_picture
from case247_legacy_transition import load_reservations

MANIFEST = ROOT / "campagne/case247/dietro-le-quinte/manifest-60.json"
CONFIG = ROOT / "config/case247-territorio.json"
PLAN = OUT / "latest-plan.json"
REPORT = OUT / "health-report.json"
LOCAL_TZ = ZoneInfo("Europe/Rome")


def safe_image_path(relative, *, root=ROOT):
    """Check a repository-backed JPG without trusting user-controlled paths."""
    if not isinstance(relative, str) or relative.startswith("/"):
        return False
    file = (root / relative).resolve()
    if not file.is_relative_to(root.resolve()) or file.suffix.lower() not in (".jpg", ".jpeg"):
        return False
    if not file.is_file() or file.stat().st_size < 128:
        return False
    with file.open("rb") as fp:
        return fp.read(3) == b"\xff\xd8\xff"


def inspect(config, manifest, plan, *, root=ROOT):
    """Return aggregate counts and fatal validation issues without any personal data."""
    problems = []
    pending = 0
    approved = 0
    duplicate_assets = 0
    broken_assets = 0
    bad_urls = 0
    assets = manifest.get("entries", [])
    declared = manifest.get("total")
    if not isinstance(assets, list) or declared != len(assets):
        problems.append("MANIFEST_COUNT_MISMATCH")
        assets = assets if isinstance(assets, list) else []
    ids, image_urls = set(), set()
    for entry in assets:
        if not isinstance(entry, dict):
            problems.append("INVALID_MANIFEST_ENTRY")
            continue
        ident, url = entry.get("id"), entry.get("public_image_url")
        if not ident or ident in ids or not url or url in image_urls:
            duplicate_assets += 1
        ids.add(ident)
        image_urls.add(url)
        parsed = urlsplit(url) if isinstance(url, str) else None
        if (not parsed or parsed.scheme != "https"
                or parsed.hostname != "josephsocialmedia2-spec.github.io"
                or not parsed.path.startswith("/joseph-link-in-bio-Copia/")
                or not valid_picture(url)):
            bad_urls += 1
        if not safe_image_path(entry.get("asset"), root=root):
            broken_assets += 1
        if entry.get("approval") == "APPROVED" and entry.get("requires_fact_check") is False:
            approved += 1
        else:
            pending += 1
    if duplicate_assets:
        problems.append("MANIFEST_DUPLICATE_ASSET")
    if bad_urls:
        problems.append("MANIFEST_BAD_PUBLIC_URL")

    towns = config.get("towns", [])
    verified_channels, invalid_activated = 0, 0
    for town in towns:
        channels = town.get("channels") or {}
        for network in ("facebook", "instagram"):
            channel = channels.get(network) or {}
            if channel.get("status") == "ACTIVE_VERIFIED":
                if (not channel.get("provider_id")
                        or not str(channel.get("url", "")).startswith("https://")
                        or not town.get("auto_publish")):
                    invalid_activated += 1
                else:
                    verified_channels += 1
    if invalid_activated:
        problems.append("UNSAFE_VERIFIED_CHANNEL")
    if not isinstance(plan, dict) or "assignments" not in plan:
        problems.append("MISSING_EDITORIAL_PLAN")
        plan = {"assignments": [], "ready_for_provider": 0}
    entries = plan["assignments"]
    keys = [(item.get("date"), item.get("type"),
             item.get("listing_id") or item.get("graphic_id")) for item in entries]
    if len(keys) != len(set(keys)):
        problems.append("DUPLICATE_EDITORIAL_ITEM")
    if any(item.get("distance_upper_bound_km", 0) > 20
           for item in entries if item.get("type") == "IMMOBILE"):
        problems.append("OUT_OF_RADIUS_ASSIGNMENT")
    return {
        "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "state": "INVALID_CONFIGURATION" if problems else
                 ("BLOCKED_NO_VERIFIED_META_ACCOUNTS" if verified_channels == 0
                  else "PROVIDER_PREFLIGHT_REQUIRED"),
        "problems": sorted(set(problems)),
        "counts": {
            "towns": len(towns),
            "verified_channels": verified_channels,
            "invalid_activated_channels": invalid_activated,
            "manifest_assets": len(assets),
            "approved_assets": approved,
            "unapproved_assets": pending,
            "duplicate_assets": duplicate_assets,
            "invalid_image_urls": bad_urls,
            "missing_or_invalid_jpg": broken_assets,
            "planned_items": len(entries),
            "planned_ready_items": plan.get("ready_for_provider", 0),
        },
        "policy": "No unpublished item is labelled PUBLISHED; never infer live authorization from config alone.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(REPORT))
    args = parser.parse_args()
    try:
        config = read_json(CONFIG)
        manifest = read_json(MANIFEST)
        plan = read_json(PLAN)
        if not config or not manifest:
            raise ValueError("Required configuration or manifest missing")
        # Validate the complete immutable legacy snapshot, not just today's rows.
        load_reservations(dt.datetime.now(LOCAL_TZ).date(), ROOT, OUT)
        report = inspect(config, manifest, plan)
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        report = {
            "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "state": "INVALID_CONFIGURATION",
            "problems": [type(error).__name__],
            "policy": "No publication until source validation succeeds.",
        }
    atomic_write(Path(args.output), report)
    print(json.dumps(report, sort_keys=True, ensure_ascii=False))
    if report["state"] == "INVALID_CONFIGURATION":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
