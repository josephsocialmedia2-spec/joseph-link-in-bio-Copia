#!/usr/bin/env python3
"""Persist CASE247 first-seen observations across GitHub Actions artifacts.

'Giorni_Sul_Mercato' represents monitored days since CASE247 first observed
the URL, *not* proof of time actually advertised before monitoring began.
An inactive/unverified page is never flagged as confirmed unsold >90 days.
No names or personal contact data are kept in lifecycle state.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROME = ZoneInfo("Europe/Rome")


def _date(value) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def load_state(directory: Path | None) -> dict:
    """Recover oldest first-seen and newest verified dates from prior artifacts.

    A recorded lifecycle can be indefinitely carried forward in daily artifacts,
    while only the last few artifacts need to remain downloadable.
    """
    state = {}
    if not directory or not directory.exists():
        return state
    for path in sorted(directory.rglob("lifecycle.json")):
        try:
            saved = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(saved, dict):
                continue
            for url, values in saved.get("urls", {}).items():
                if not isinstance(url, str) or not isinstance(values, dict):
                    continue
                first = _date(values.get("first_seen"))
                last = _date(values.get("last_verified"))
                if not first:
                    continue
                rec = state.setdefault(url, {"first_seen": first.isoformat(), "last_verified": ""})
                old = _date(rec["first_seen"])
                if old is None or first < old:
                    rec["first_seen"] = first.isoformat()
                old = _date(rec["last_verified"])
                if last and (old is None or last > old):
                    rec["last_verified"] = last.isoformat()
        except (OSError, ValueError, TypeError):
            continue
    # Backward-compatible migration from old inventory.json artifacts without
    # lifecycle state, preserving earliest previously observed dates.
    for path in sorted(directory.rglob("inventory.json")):
        try:
            saved = json.loads(path.read_text(encoding="utf-8"))
            at = datetime.fromisoformat(saved["as_of_rome"])
            if at.tzinfo is None:
                continue
            first = at.astimezone(ROME).date()
            for row in saved.get("listings", []):
                url = row.get("url")
                if not isinstance(url, str) or not url:
                    continue
                row_first = _date(row.get("data_prima_rilevazione")) or first
                rec = state.setdefault(url, {"first_seen": row_first.isoformat(), "last_verified": ""})
                previous = _date(rec["first_seen"])
                if previous and row_first < previous:
                    rec["first_seen"] = row_first.isoformat()
                row_last = _date(row.get("data_ultima_verifica"))
                old_last = _date(rec.get("last_verified"))
                if row_last and (old_last is None or row_last > old_last):
                    rec["last_verified"] = row_last.isoformat()
        except (ValueError, TypeError, OSError, KeyError):
            continue
    return state


def apply_lifecycle(rows: list[dict], state: dict,
                    now: datetime | None = None) -> dict:
    now = now or datetime.now(ROME)
    today = now.astimezone(ROME).date()
    saved = {key: dict(value) for key, value in state.items() if isinstance(value, dict)}
    for row in rows:
        url = row["url"]
        old = saved.get(url) or {}
        first = _date(old.get("first_seen")) or _date(row.get("data_prima_rilevazione")) or today
        if first > today:
            first = today
        verified_today = (
            bool(row.get("detail_verified"))
            and not row.get("stale")
            and row.get("commune_status") == "Verificato"
            and row.get("contract_status") == "Vendita"
        )
        last = _date(old.get("last_verified")) or _date(row.get("data_ultima_verifica"))
        if verified_today:
            last = today
        row["data_prima_rilevazione"] = first.isoformat()
        row["data_ultima_verifica"] = last.isoformat() if last else ""
        row["giorni_sul_mercato"] = (today-first).days
        row["fascia_permanenza"] = ("< 30 gg" if row["giorni_sul_mercato"] < 30 else
                                    "30-90 gg" if row["giorni_sul_mercato"] <= 90 else "> 90 gg")
        row["priorita_monitoraggio"] = (
            "Invenduto_Oltre_90gg"
            if row["giorni_sul_mercato"] >= 90 and verified_today and row.get("active_confirmed")
            else "Da_Verificare"
        )
        # Last verified only after positive fetch/semantic check. Index-only
        # observability does not assert that property is still on the market.
        saved[url] = {"first_seen": first.isoformat(),
                      "last_verified": row["data_ultima_verifica"]}
    return saved


def write_state(path: Path, state: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"schema":1, "urls":state}, ensure_ascii=False,
                               sort_keys=True, indent=2) + "\n", encoding="utf-8")
