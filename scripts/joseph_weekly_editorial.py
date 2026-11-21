#!/usr/bin/env python3
"""GitHub Actions-only editorial safeguards for Joseph Real Estate Weekly."""
import argparse
import datetime as dt
import json
import pathlib
import re
import sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIR = ROOT / "gestione" / "rivista"
APPROVED = DIR / "data" / "approved.json"
LATEST = DIR / "data" / "latest.json"
REPORT = DIR / "data" / "review.md"
EXCLUDED = ("immobiliare la sacra", "case in pubblicità 24/7", "case247")
ACCEPTED_DOMAINS = (
    "immobiliare.it", "idealista.it", "casa.it", "ilsole24ore.com",
    "rainews.it", "regione.piemonte.it", "comune.avigliana.to.it",
    "agenziaentrate.gov.it", "bancaditalia.it", "istat.it",
    "ansa.it", "lastampa.it", "torinotoday.it", "lunanuova.it",
    "vallesusa-tesori.it", "valsusaoggi.it",
)

def valid_origin(url):
    try:
        p = urlparse(url.strip())
        if p.scheme != "https" or not p.hostname:
            return False
        h = p.hostname.lower()
        if h in ("news.google.com", "google.com", "example.com"):
            return False
        return any(h == d or h.endswith("." + d) for d in ACCEPTED_DOMAINS)
    except (ValueError, AttributeError):
        return False

def validate(final_path=APPROVED, now=None):
    now = now or dt.datetime.now(dt.timezone.utc).date()
    obj = json.loads(pathlib.Path(final_path).read_text(encoding="utf-8"))
    errors = []
    if obj.get("closed") is not True:
        errors.append("closed must be true: editorial approval is mandatory")
    if not str(obj.get("issue", "")).strip():
        errors.append("issue is mandatory")
    if not str(obj.get("period", "")).strip():
        errors.append("period is mandatory")
    if not str(obj.get("cover", "")).strip():
        errors.append("cover is mandatory")
    if not str(obj.get("editorial", "")).strip():
        errors.append("editorial text is mandatory")
    items = obj.get("items", [])
    if not isinstance(items, list) or not 3 <= len(items) <= 8:
        errors.append("3 to 8 approved articles are required")
        items = []
    urls = set()
    for i, a in enumerate(items, start=1):
        if a.get("status") != "approved":
            errors.append(f"Article {i}: status must be approved")
        if a.get("original_url_verified") is not True:
            errors.append(f"Article {i}: original_url_verified must be true")
        url = a.get("url", "")
        if not valid_origin(url):
            errors.append(f"Article {i}: origin domain not trusted/eligible: {url}")
        if url in urls:
            errors.append(f"Article {i}: duplicate URL")
        urls.add(url)
        for f in ("title", "source", "summary", "date"):
            if not str(a.get(f, "")).strip():
                errors.append(f"Article {i}: missing {f}")
        if len(str(a.get("summary", ""))) < 100:
            errors.append(f"Article {i}: summary too short; editorial text requires review")
        try:
            d = dt.date.fromisoformat(a.get("date", ""))
            delta = (now-d).days
            if not 0 <= delta <= 14:
                errors.append(f"Article {i}: publication date outside last 14 days")
        except ValueError:
            errors.append(f"Article {i}: date must be YYYY-MM-DD")
    content = json.dumps(obj, ensure_ascii=False).lower()
    for brand in EXCLUDED:
        if brand in content:
            errors.append(f"Excluded brand appears: {brand}")
    if errors:
        raise ValueError("\n".join(errors))
    return obj

def make_report():
    obj = json.loads(LATEST.read_text(encoding="utf-8"))
    items = obj.get("items", [])
    date = dt.datetime.now(dt.timezone(dt.timedelta(hours=1))).date().isoformat()
    lines = [
        f"# Joseph Real Estate Weekly — scheda revisione {date}",
        "",
        "> DOCUMENTO DI LAVORO. I risultati RSS NON sono notizie verificate, né articoli approvati.",
        "> Verificare sempre dominio originale, autore, data, contenuto e dati prima della stampa.",
        "",
        f"Candidati recenti: **{len(items)}**. Finestra RSS: {obj.get('window_start', 'n.d.')} — {obj.get('window_end', 'n.d.')}.",
        "",
    ]
    for i, x in enumerate(items[:45], 1):
        lines.extend([
            f"## {i}. {x.get('title', 'Titolo mancante')}",
            f"- Fonte cercata: {x.get('source','n.d.')} | Data RSS: {x.get('date','n.d.')}",
            f"- Link da risolvere: {x.get('url','n.d.')}",
            "- Stato: DA VERIFICARE. Non approvato.",
            "- Checklist: [ ] URL originale [ ] data [ ] dati [ ] sintesi [ ] impatto su Avigliana / Valle di Susa",
            "",
        ])
    if not items:
        lines += ["**Nessun risultato acquisito.** Verificare l'accesso RSS e i log GitHub Actions.", ""]
    for err in obj.get("errors", []):
        lines.append(f"- Problema feed: {err.get('source')}: {err.get('reason')}")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Review file updated: {REPORT}, {len(items)} candidates")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("review", "validate"))
    parser.add_argument("--file", type=pathlib.Path, default=APPROVED)
    args = parser.parse_args()
    if args.command == "review":
        make_report()
    else:
        try:
            approved = validate(args.file)
            print(f"Editorial release authorized: {approved['issue']}, {len(approved['items'])} approved articles.")
        except (ValueError, json.JSONDecodeError) as exc:
            print(f"BLOCKED: {exc}", file=sys.stderr)
            raise SystemExit(2)
if __name__ == "__main__":
    main()
