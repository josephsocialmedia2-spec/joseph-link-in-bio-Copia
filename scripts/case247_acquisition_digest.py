#!/usr/bin/env python3
"""One daily 06:00 Rome GitHub Issue digest; hourly scans never send notifications."""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from case247_acquisition_radar import ALLOWED_TOWNS, load_state, save_json

ROME = ZoneInfo("Europe/Rome")
ALLOWED_EVENTS = frozenset(("NUOVO", "RIBASSO_INDICATIVO"))


def accumulate(state: dict, report: dict) -> dict:
    """Merge all discovered candidate listings into a pending daily batch."""
    pending = dict(state.get("pending", {}))
    found_at = report.get("scanned_at_utc", "")
    for row in report.get("changes", []):
        if row.get("event") not in ALLOWED_EVENTS or row.get("town") not in ALLOWED_TOWNS:
            continue
        key = row.get("id")
        if not key:
            continue
        old = pending.get(key, {})
        pending[key] = {
            **row,
            "first_detected": old.get("first_detected", found_at),
            "last_detected": found_at,
        }
    return {
        **state,
        "pending": pending,
        "last_scan": {
            "at": found_at, "status": report.get("status"),
            "sources": report.get("feeds_ok", 0),
            "sources_attempted": report.get("feeds_attempted", 0),
            "raw": report.get("feed_items", 0),
            "qualified": report.get("candidates", 0),
        },
    }


def create_digest(state: dict, day: str) -> tuple[str, dict]:
    """Include every distinct new/discounted lead since the last delivered digest."""
    pending = list(state.get("pending", {}).values())
    pending = [p for p in pending if p.get("town") in ALLOWED_TOWNS and p.get("event") in ALLOWED_EVENTS]
    pending.sort(key=lambda r: (ALLOWED_TOWNS.index(r["town"]), r.get("first_detected", ""), r.get("title", "")))
    counts = {town: sum(r["town"] == town for r in pending) for town in ALLOWED_TOWNS}
    last = state.get("last_scan", {})
    result = {
        "date_rome": day,
        "sent_previously": state.get("last_digest_date") == day,
        "total": len(pending), "counts": counts,
        "last_scan": last, "listings": pending,
    }
    lines = [
        f"# CASE247 · Riepilogo acquisizione · {day} ore 06:00",
        "",
        "**Perimetro:** Avigliana, Sant'Ambrogio di Torino, Almese e Condove. "
        "Rilevazioni dall'ultimo riepilogo: annunci nuovi e possibili ribassi, non compravendite accertate.",
        "",
        f"**Totale nuovi/aggiornati: {len(pending)}** · "
        + " · ".join(f"{town}: {counts[town]}" for town in ALLOWED_TOWNS),
        "",
        "Le classificazioni sono basate su indici pubblici e richiedono verifica della fonte originale.",
        f"Ultimo controllo: {last.get('at', 'non disponibile')} · "
        f"fonti {last.get('sources', 0)}/{last.get('sources_attempted', 0)} · "
        f"righe grezze {last.get('raw', 0)} · candidati {last.get('qualified', 0)}.",
        "",
    ]
    if not pending:
        lines += [
            "**Nessun nuovo annuncio pertinente individuato nel periodo.** "
            "Questo non dimostra che non esistano immobili in vendita: "
            "la copertura dei motori di ricerca può essere incompleta.",
            "",
        ]
    for town in ALLOWED_TOWNS:
        items = [r for r in pending if r["town"] == town]
        if not items:
            continue
        lines.append(f"## {town} ({len(items)})")
        for row in items:
            name = row.get("title", "Immobile senza titolo")
            status = row.get("status", "DA_VERIFICARE")
            kind = "Ribasso indicativo" if row.get("event") == "RIBASSO_INDICATIVO" else "Nuovo"
            price = f"{row['price']:,}".replace(",", ".") + " €" if row.get("price") else "non indicato"
            sqm = f"{row['mq']} mq" if row.get("mq") else "mq non indicati"
            lines += [
                f"- **{kind} · {status}** — {name}. {row.get('street') or 'Via non rilevata'}; {price}; {sqm}. "
                f"[Fonte originale]({row.get('url', '')})",
            ]
        lines.append("")
    lines += [
        "**Nota:** una via in comune con attività commerciali non identifica il proprietario. "
        "Nessun numero privato o indirizzo email personale viene pubblicato in questo report."
    ]
    return "\n".join(lines) + "\n", result


def finalize(state: dict, day: str) -> dict:
    if state.get("last_digest_date") == day:
        return state
    return {**state, "pending": {}, "last_digest_date": day}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=("accumulate", "digest", "finalize"))
    p.add_argument("--state", type=Path, default=Path("_radar/out/state.json"))
    p.add_argument("--report", type=Path, default=Path("_radar/out/report.json"))
    p.add_argument("--out", type=Path, default=Path("_radar/out"))
    p.add_argument("--day", default="")
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    state = load_state(args.state)
    date = args.day or datetime.now(ROME).date().isoformat()

    if args.mode == "accumulate":
        report = json.loads(args.report.read_text(encoding="utf-8"))
        state = accumulate(state, report)
        save_json(args.out / "state.json", state)
        print(f"CASE247_BATCH pending={len(state.get('pending', {}))} (no notification)")
    elif args.mode == "digest":
        content, info = create_digest(state, date)
        (args.out / "digest.md").write_text(content, encoding="utf-8")
        save_json(args.out / "daily-report.json", info)
        # Avoid falsely confirming a notification; only the GitHub issue step sends it.
        (args.out / "send.txt").write_text("no" if info["sent_previously"] else "yes", encoding="utf-8")
        print(f"CASE247_DIGEST date={date} candidates={info['total']} already_sent={info['sent_previously']}")
    elif args.mode == "finalize":
        save_json(args.out / "state.json", finalize(state, date))
        print(f"CASE247_DIGEST_FINALIZED date={date}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
