#!/usr/bin/env python3
"""Read-only CASE247 live-publishing preflight.

No Meta/Metricool API calls, token access, queue mutations or external sends.
This report is informational; the publisher must recheck every safety gate.
"""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path

from case247_legacy_transition import canonical_listing_url, load_reservations
from case247_territorial_engine import TZ, RADIUS_KM, ROOT, read_json
from case247_territorial_publisher import eligible_due


def evaluate(root: Path, now: dt.datetime, live_enabled: bool) -> dict:
    root = Path(root)
    today = now.astimezone(TZ).date()
    out = root / "campagne/case247/regia-territoriale"
    blocked = []

    def block(code: str) -> None:
        if code not in blocked:
            blocked.append(code)

    if not live_enabled:
        block("LIVE_SWITCH_DISABLED")

    try:
        config = read_json(root / "config/case247-territorio.json")
        if not isinstance(config, dict) or config.get("coverage_radius_km") != RADIUS_KM:
            raise ValueError("invalid configuration")
        towns = config.get("towns")
        if not isinstance(towns, list):
            raise ValueError("invalid town list")
        verified = sum(
            1 for town in towns if isinstance(town, dict) and town.get("auto_publish") is True
            for channel in (town.get("channels") or {}).values()
            if isinstance(channel, dict)
            and channel.get("status") == "ACTIVE_VERIFIED"
            and str(channel.get("provider_id", "")).isdigit()
            and str(channel.get("url", "")).startswith("https://")
        )
        if verified == 0:
            block("NO_VERIFIED_TERRITORIAL_CHANNELS")
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
        verified = 0
        block("INVALID_PUBLIC_META_CONFIGURATION")

    try:
        reserved = load_reservations(today, root, out)
        if not isinstance(reserved, set):
            raise ValueError("invalid reservations")
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
        reserved = set()
        block("METRICOOL_RESERVATIONS_STALE_OR_INVALID")

    try:
        catalog = read_json(root / "immobili/catalogo.json")
        timestamp = dt.datetime.fromisoformat(catalog["last_success_at"].replace("Z", "+00:00"))
        age = now.astimezone(dt.timezone.utc) - timestamp.astimezone(dt.timezone.utc)
        if age < dt.timedelta(minutes=-5) or age > dt.timedelta(hours=36):
            block("CATALOG_NOT_FRESH")
    except (OSError, ValueError, TypeError, KeyError, AttributeError, json.JSONDecodeError):
        block("CATALOG_NOT_FRESH")

    plan_path = out / "plans" / (today.isoformat() + ".json")
    try:
        plan = read_json(plan_path)
        if (not isinstance(plan, dict) or plan.get("date") != today.isoformat()
                or plan.get("max_distance_km") != RADIUS_KM
                or not isinstance(plan.get("assignments"), list)):
            raise ValueError("no valid daily plan")
        assignments = plan["assignments"]
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
        assignments = []
        block("CURRENT_DAY_PLAN_MISSING_OR_INVALID")

    try:
        ledger = read_json(out / "publish-ledger.json", {"entries": {}})
        entries = ledger.get("entries", {})
        if not isinstance(entries, dict):
            raise ValueError("invalid ledger")
    except (OSError, ValueError, TypeError, AttributeError, json.JSONDecodeError):
        entries = {}
        block("PUBLISH_LEDGER_INVALID")

    due_count = 0
    collision_count = 0
    already_attempted = 0
    eligible_count = 0
    for item in assignments:
        if not isinstance(item, dict):
            block("INVALID_ASSIGNMENT")
            continue
        try:
            due = eligible_due(item, now.astimezone(TZ))
        except (TypeError, ValueError, KeyError, AttributeError):
            block("INVALID_ASSIGNMENT")
            continue
        if not due:
            continue
        due_count += 1
        ident = item.get("listing_id") if item.get("type") == "IMMOBILE" else item.get("graphic_id")
        if not ident or item.get("type") not in ("IMMOBILE", "DIETRO_LE_QUINTE"):
            block("INVALID_ASSIGNMENT")
            continue
        key = f"{item['date']}:{item['type']}:{ident}"
        if key in entries:
            already_attempted += 1
            continue
        if item["type"] == "IMMOBILE":
            url = canonical_listing_url(item.get("source_url"))
            if not url or url in reserved:
                collision_count += 1
                continue
        eligible_count += 1

    if eligible_count == 0:
        block("NO_DUE_UNRESERVED_ITEMS")
    return {
        "date": today.isoformat(),
        "status": "READY_FOR_PROVIDER_PREFLIGHT" if not blocked else "BLOCKED",
        "can_publish": not blocked,
        "blocked_reasons": blocked,
        "counts": {
            "verified_public_channels": verified,
            "legacy_reserved_today": len(reserved),
            "daily_assignments": len(assignments),
            "due_now": due_count,
            "due_collisions_or_invalid_urls": collision_count,
            "due_already_attempted": already_attempted,
            "eligible_due": eligible_count,
        },
        "note": "Read-only preflight; real live authorization and idempotency are checked again by publisher.",
    }


def main() -> None:
    report = evaluate(ROOT, dt.datetime.now(TZ), os.getenv("CASE247_TERRITORIAL_LIVE") == "true")
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    github_output = os.getenv("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as fp:
            fp.write("can_publish=" + ("true" if report["can_publish"] else "false") + "\n")
    summary = os.getenv("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fp:
            fp.write("### CASE247 publishing readiness (read-only)\n\n")
            fp.write(f"Status: **{report['status']}** · Date: {report['date']}\n\n")
            fp.write("Blockers: " + (", ".join(report["blocked_reasons"]) or "none") + "\n\n")
            fp.write("No post submitted by this preflight.\n")


if __name__ == "__main__":
    main()
