#!/usr/bin/env python3
"""CASE247 cron gate: one morning plan and one evening plan per Rome calendar day."""
from __future__ import annotations

import datetime as dt
import json
import os
from zoneinfo import ZoneInfo

from case247_territorial_engine import OUT

TZ = ZoneInfo("Europe/Rome")


def target_day(now):
    local = now.astimezone(TZ)
    return (local.date() if local.hour < 18
            else local.date() + dt.timedelta(days=1)).isoformat()


def should_reconcile(now, event, plan):
    """Recover delayed cron runs without repeating a completed same-day phase."""
    local = now.astimezone(TZ)
    target = target_day(local)
    if event != "schedule":
        return True, "manual_or_code_update", target
    if local.hour < 6:
        return False, "before_06_rome", target
    if isinstance(plan, dict) and plan.get("date") == target:
        try:
            created = dt.datetime.fromisoformat(plan["generated_at"])
            if created.tzinfo is None:
                raise ValueError("Naive generation timestamp")
            if created.astimezone(TZ).date() == local.date():
                return False, "already_reconciled_this_phase", target
        except (KeyError, TypeError, ValueError):
            pass
    return True, ("morning_or_delayed_rebuild" if local.hour < 18
                  else "evening_or_delayed_rebuild"), target


def main():
    now = dt.datetime.now(TZ)
    target = target_day(now)
    path = OUT / "plans" / (target + ".json")
    try:
        plan = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        plan = None
    enabled, reason, target = should_reconcile(now, os.getenv("EVENT_NAME", ""), plan)
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write("active=" + str(enabled).lower() + "\n")
    print(f"CASE247 schedule: run={enabled} reason={reason} target={target}")


if __name__ == "__main__":
    main()
