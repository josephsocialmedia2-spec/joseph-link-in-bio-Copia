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


def daily_intelligence(state: dict, day: str) -> dict:
    """Use only today's silent pre-06:00 scan; never carry old news forward."""
    cached = state.get("intelligence") or {}
    timestamp = cached.get("generated_utc", "")
    if not timestamp:
        return {"news": [], "business_contacts": [], "sources": [], "errors": ["Raccolta mattutina non disponibile"]}
    try:
        local_day = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).astimezone(ROME).date().isoformat()
    except (TypeError, ValueError):
        local_day = ""
    return cached if local_day == day else {"news": [], "business_contacts": [], "sources": [], "errors": ["Raccolta giornaliera non disponibile"]}


def create_digest(state: dict, day: str, intelligence: dict | None = None) -> tuple[str, dict]:
    """Include every distinct new/discounted lead since the last delivered digest."""
    pending = list(state.get("pending", {}).values())
    pending = [p for p in pending if p.get("town") in ALLOWED_TOWNS and p.get("event") in ALLOWED_EVENTS]
    pending.sort(key=lambda r: (ALLOWED_TOWNS.index(r["town"]), r.get("first_detected", ""), r.get("title", "")))
    counts = {town: sum(r["town"] == town for r in pending) for town in ALLOWED_TOWNS}
    last = state.get("last_scan", {})
    intelligence = intelligence if intelligence is not None else daily_intelligence(state, day)
    used_news = set(state.get("news_seen", []))
    used_business = set(state.get("business_seen", []))
    fresh_news = [n for n in intelligence.get("news", []) if n.get("id") not in used_news and n.get("town") in ALLOWED_TOWNS]
    fresh_business = [n for n in intelligence.get("business_contacts", []) if n.get("id") not in used_business and n.get("town") in ALLOWED_TOWNS]
    result = {
        "date_rome": day,
        "sent_previously": state.get("last_digest_date") == day,
        "total": len(pending), "counts": counts,
        "last_scan": last, "listings": pending,
        "news": fresh_news, "business_contacts": fresh_business,
        "source_diagnostics": intelligence.get("sources", []),
        "source_errors": intelligence.get("errors", []),
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
        "## Notizie territoriali utili per acquisizione (" + str(len(fresh_news)) + ")",
        "Titoli e collegamenti a notizie pubblicate di recente; non rappresentano proprietari intenzionati a vendere.",
        "",
    ]
    if not fresh_news:
        lines.append("Nessuna nuova notizia pertinente intercettata dalle fonti disponibili.")
    for item in fresh_news:
        lines.append(
            f"- **{item['town']}** · [{item['title']}]({item['url']}) · "
            f"pubblicata {item.get('published_utc', 'data non disponibile')}"
        )
    lines += [
        "",
        "## Contatti aziendali pubblici per relazioni e segnalazioni (" + str(len(fresh_business)) + ")",
        "Sono attività e professionisti censiti in OpenStreetMap; non sono proprietari identificati "
        "e non risulta verificata alcuna disponibilità a collaborare.",
        "",
    ]
    if not fresh_business:
        lines.append("Nessun nuovo contatto aziendale qualificato dalle fonti disponibili.")
    for item in fresh_business:
        fields = [
            f"**{item['town']}** · {item.get('name', 'Azienda')}",
            "settore: " + item.get("sector", "non indicato"),
        ]
        if item.get("street"):
            fields.append(item["street"])
        if item.get("website"):
            fields.append(f"[sito]({item['website']})")
        if item.get("email"):
            fields.append("email generale: " + item["email"])
        if item.get("phone"):
            fields.append("fisso aziendale pubblicato: " + item["phone"])
        fields.append(f"[scheda OSM]({item['osm_url']})")
        lines.append("- " + " · ".join(fields))
    lines += [
        "",
        "**Qualità delle fonti:** " + ", ".join(
            f"{s.get('town', '')} {s.get('source', '')}: {s.get('status', 'N/D')}"
            for s in intelligence.get("sources", [])
        ) if intelligence.get("sources") else "**Qualità delle fonti:** notizie e contatti non verificati da questa esecuzione.",
        "",
        "**Regole contatto:** prima di telefonate o email promozionali verificare base giuridica, "
        "registro delle opposizioni, eventuale consenso e preferenze del destinatario. "
        "Nessun contatto viene effettuato automaticamente.",
        "",
        "**Nota:** una via in comune con attività commerciali non identifica il proprietario. "
        "Nessun numero privato o indirizzo email personale viene pubblicato in questo report."
    ]
    return "\n".join(lines) + "\n", result


def finalize(state: dict, day: str, intelligence: dict | None = None) -> dict:
    if state.get("last_digest_date") == day:
        return state
    intelligence = intelligence if intelligence is not None else daily_intelligence(state, day)
    news_ids = [x.get("id") for x in intelligence.get("news", []) if x.get("id")]
    business_ids = [x.get("id") for x in intelligence.get("business_contacts", []) if x.get("id")]
    news_seen = list(dict.fromkeys([*state.get("news_seen", []), *news_ids]))[-3000:]
    business_seen = list(dict.fromkeys([*state.get("business_seen", []), *business_ids]))[-3000:]
    return {**state, "pending": {}, "intelligence": {}, "last_digest_date": day,
            "news_seen": news_seen, "business_seen": business_seen}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=("accumulate", "digest", "finalize", "cache"))
    p.add_argument("--state", type=Path, default=Path("_radar/out/state.json"))
    p.add_argument("--report", type=Path, default=Path("_radar/out/report.json"))
    p.add_argument("--out", type=Path, default=Path("_radar/out"))
    p.add_argument("--day", default="")
    p.add_argument("--intelligence", type=Path, default=None)
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    state = load_state(args.state)
    date = args.day or datetime.now(ROME).date().isoformat()
    intelligence = None
    if args.intelligence is not None and args.intelligence.exists():
        intelligence = json.loads(args.intelligence.read_text(encoding="utf-8"))

    if args.mode == "cache":
        if intelligence is None:
            raise ValueError("Il comando cache richiede --intelligence e un file JSON disponibile")
        save_json(args.out / "state.json", {**state, "intelligence": intelligence})
        print(f"CASE247_INTELLIGENCE_CACHED news={len(intelligence.get('news', []))} contacts={len(intelligence.get('business_contacts', []))}")
    elif args.mode == "accumulate":
        report = json.loads(args.report.read_text(encoding="utf-8"))
        state = accumulate(state, report)
        save_json(args.out / "state.json", state)
        print(f"CASE247_BATCH pending={len(state.get('pending', {}))} (no notification)")
    elif args.mode == "digest":
        content, info = create_digest(state, date, intelligence)
        (args.out / "digest.md").write_text(content, encoding="utf-8")
        save_json(args.out / "daily-report.json", info)
        # Avoid falsely confirming a notification; only the GitHub issue step sends it.
        (args.out / "send.txt").write_text("no" if info["sent_previously"] else "yes", encoding="utf-8")
        print(f"CASE247_DIGEST date={date} candidates={info['total']} already_sent={info['sent_previously']}")
    elif args.mode == "finalize":
        save_json(args.out / "state.json", finalize(state, date, intelligence))
        print(f"CASE247_DIGEST_FINALIZED date={date}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
