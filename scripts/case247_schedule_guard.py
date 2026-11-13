#!/usr/bin/env python3
"""Idempotent trigger guard for the existing 18:00 CASE247 GitHub Actions regia."""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

from case247_territorial_engine import OUT

TZ = ZoneInfo("Europe/Rome")


def should_reconcile(now, event, plan):
    """At most one daily 18:00 reconciliation; recover from delayed GitHub cron."""
    local = now.astimezone(TZ)
    target = (local.date() + dt.timedelta(days=1)).isoformat()
    if event != "schedule":
        return True, "manual_dispatch", target
    if local.hour < 18:
        return False, "before_18_rome", target
    if isinstance(plan, dict) and plan.get("date") == target:
        try:
            created = dt.datetime.fromisoformat(plan["generated_at"])
            if created.tzinfo is None:
                raise ValueError("Naive plan date")
            if created.astimezone(TZ).date() == local.date():
                return False, "already_reconciled_today", target
        except (KeyError, TypeError, ValueError):
            pass
    return True, "late_or_missing_plan_rebuild", target


def main():
    now = dt.datetime.now(TZ)
    target = (now.date() + dt.timedelta(days=1)).isoformat()
    plan_file = OUT / "plans" / (target + ".json")
    try:
        plan = json.loads(plan_file.read_text(encoding="utf-8")) if plan_file.exists() else None
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        plan = None
    enabled, reason, target = should_reconcile(now, os.getenv("EVENT_NAME", ""), plan)
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write("active=" + str(enabled).lower() + chr(10))
    print(f"CASE247 scheduled reconcile: run={enabled} reason={reason} target={target}")


if __name__ == "__main__":
    main()
