#!/usr/bin/env python3
"""Low-volume, robots-aware CASE247 public market index monitor.

Read-only research, NO portal messages, owner matching, personal contact extraction,
logins, bypass, or bulk copying of the source pages. Collection is informational.
A public listing is not automatically an owner-direct acquisition lead.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

TOWNS = ("Avigliana", "Sant'Ambrogio di Torino", "Almese", "Condove")
UA = "CASE247MarketInventory/1.0 (low-frequency read-only public listings)"
ROME = ZoneInfo("Europe/Rome")
SOURCES = (
    ("CasaDaPrivato", "Avigliana", "https://www.casadaprivato.it/annunci-vendita/immobili/torino-avigliana"),
    ("CasaDaPrivato", "Sant'Ambrogio di Torino", "https://www.casadaprivato.it/annunci-vendita/appartamenti/torino-sant_ambrogio_di_torino"),
    ("CasaDaPrivato", "Almese", "https://www.casadaprivato.it/annunci-vendita/immobili/torino-almese"),
    ("CasaDaPrivato", "Condove", "https://www.casadaprivato.it/annunci-vendita/immobili/torino-condove"),
    ("Immobiliare.it", "Avigliana", "https://www.immobiliare.it/vendita-case/avigliana/da-privati/"),
    ("Immobiliare.it", "Sant'Ambrogio di Torino", "https://www.immobiliare.it/vendita-case/sant-ambrogio-di-torino/da-privati/"),
    ("Immobiliare.it", "Almese", "https://www.immobiliare.it/vendita-case/almese/da-privati/"),
    ("Immobiliare.it", "Condove", "https://www.immobiliare.it/vendita-case/condove/da-privati/"),
)
CASA_RE = re.compile(r"/(?:[\w-]+/)?[\w-]+-torino-(\d+)(?:$|/)", re.I)
IMM_RE = re.compile(r"^/annunci/(\d+)/?$", re.I)
COUNT_RE = re.compile(r"(\d{1,4})\s+(?:risultati|annunci di case|annunci di appartamenti|annunci)\b", re.I)


def canonical(value: str) -> str:
    parts = urllib.parse.urlsplit(value)
    if parts.scheme not in ("https", "http") or not parts.hostname:
        return ""
    if parts.hostname.lower() not in ("www.casadaprivato.it", "www.immobiliare.it"):
        return ""
    return urllib.parse.urlunsplit(("https", parts.hostname.lower(), parts.path.rstrip("/") or "/", "", ""))


class IndexParser(HTMLParser):
    """Index anchors only; stop at 'nearby homes' in CasaDaPrivato."""
    def __init__(self, source: str, page_url: str):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.page_url = page_url
        self.result = []
        self.text = []
        self.in_anchor = False
        self.anchor_url = ""
        self.anchor_text = []
        self.nearby = False
        self.h_level = 0
        self.h_text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("h2", "h3"):
            self.h_level += 1
            self.h_text = []
        if tag == "a":
            self.in_anchor = True
            self.anchor_url = urllib.parse.urljoin(self.page_url, attrs.get("href", ""))
            self.anchor_text = []

    def handle_data(self, data):
        if data.strip():
            self.text.append(data.strip())
            if self.in_anchor:
                self.anchor_text.append(data.strip())
            if self.h_level:
                self.h_text.append(data.strip())

    def handle_endtag(self, tag):
        if tag in ("h2", "h3"):
            title = " ".join(self.h_text).casefold()
            if self.source == "CasaDaPrivato" and (
                "vicinanze" in title or "simili nelle vicinanze" in title
            ):
                self.nearby = True
            self.h_level = max(0, self.h_level - 1)
            self.h_text = []
        if tag == "a" and self.in_anchor:
            value = canonical(self.anchor_url)
            path = urllib.parse.urlsplit(value).path if value else ""
            yes = bool(CASA_RE.search(path)) if self.source == "CasaDaPrivato" else bool(IMM_RE.match(path))
            if value and yes and not self.nearby:
                title = " ".join(self.anchor_text).strip()
                if not title and self.source == "CasaDaPrivato":
                    slug = path.rsplit("/", 1)[-1].rsplit("-torino-", 1)[0]
                    title = slug.replace("-", " ").capitalize()
                if not title:
                    title = "(titolo da verificare)"
                if len(title) > 130:
                    title = title[:127] + "..."
                self.result.append({"url": value, "title": title})
            self.in_anchor = False
            self.anchor_url = ""
            self.anchor_text = []


def parse_page(html: str, source: str, town: str, url: str) -> dict:
    parser = IndexParser(source, url)
    parser.feed(html)
    description = " ".join(parser.text)
    match = COUNT_RE.search(description)
    reported_count = int(match.group(1)) if match else None
    unique = {}
    for x in parser.result:
        unique.setdefault(x["url"], {
            "town": town, "source": source, "url": x["url"], "title": x["title"],
            "owner_status": "PORTALE PRIVATI, NON CONTATTARE PER SERVIZI" if source == "CasaDaPrivato"
                            else "DA_VERIFICARE: LA PAGINA INCLUDE ANCHE AGENZIE",
            "contact_permission": "NO PROPOSTE COMMERCIALI" if source == "CasaDaPrivato" else "DA_VERIFICARE",
        })
    return {
        "source": source, "town": town, "index_url": url,
        "reported_count": reported_count, "extracted_links": len(unique),
        "listings": list(unique.values()), "status": "OK",
    }


def robots_allowed(url: str, fetch) -> bool:
    parts = urllib.parse.urlsplit(url)
    address = f"{parts.scheme}://{parts.netloc}/robots.txt"
    robots = fetch(address)
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(address)
    rp.parse(robots.splitlines())
    return rp.can_fetch(UA, url)


def download(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,text/plain"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read(1_200_000).decode("utf-8", errors="replace")


def collect(fetch=download, sleep=time.sleep) -> dict:
    results = []
    robots = {}
    for source, town, url in SOURCES:
        hostname = urllib.parse.urlsplit(url).netloc
        if hostname not in robots:
            try:
                robots[hostname] = fetch(f"https://{hostname}/robots.txt")
            except Exception as exc:
                robots[hostname] = None
        if robots[hostname] is None:
            results.append({"source": source, "town": town, "index_url": url, "status": "ROBOTS_NON_VERIFICABILE", "listings": [], "reported_count": None, "extracted_links": 0})
            continue
        try:
            rules = urllib.robotparser.RobotFileParser()
            rules.parse(robots[hostname].splitlines())
            if not rules.can_fetch(UA, url):
                results.append({"source": source, "town": town, "index_url": url, "status": "NON_CONSENTITO_DA_ROBOTS", "listings": [], "reported_count": None, "extracted_links": 0})
                continue
            results.append(parse_page(fetch(url), source, town, url))
        except Exception as exc:
            # Report source failure but don't fabricate zero available homes.
            results.append({"source": source, "town": town, "index_url": url, "status": "FONTE_NON_DISPONIBILE", "listings": [], "reported_count": None, "extracted_links": 0})
        sleep(0.5)
    urls = {}
    for item in results:
        for row in item["listings"]:
            urls.setdefault(row["url"], row)
    return {
        "as_of_rome": datetime.now(ROME).isoformat(timespec="seconds"),
        "scope": list(TOWNS), "status": "OK" if all(s["status"] == "OK" for s in results) else "PARZIALE",
        "sources": results, "unique_listing_links": len(urls),
        "listings": list(urls.values()),
    }


def markdown(report: dict) -> str:
    lines = [
        "## Panorama mercato — consultazione automatica di indici pubblici",
        f"Rilevazione: {report['as_of_rome']}; comuni: " + ", ".join(TOWNS),
        "",
        "**Attenzione:** gli indici etichettati 'da privati' possono includere agenzie. "
        "I numeri dei portali non rappresentano necessariamente immobili unici. "
        "Nessun annuncio è autorizzazione per sollecitazioni commerciali.",
        "CasaDaPrivato vieta di contattare gli inserzionisti per proporre servizi immobiliari o pubblicitari.",
        "",
    ]
    for town in TOWNS:
        lines.append(f"### {town}")
        items = [s for s in report["sources"] if s["town"] == town]
        for s in items:
            count = s.get("reported_count")
            count_display = str(count) if count is not None else "non disponibile"
            lines.append(
                f"- {s['source']}: stato **{s['status']}**, "
                f"conteggio indicato dalla pagina **{count_display}**, "
                f"link estratti dalla pagina **{s['extracted_links']}**. "
                f"[Apri indice]({s['index_url']})"
            )
        lines.append("")
    lines += [
        f"**Link distinti estratti (non deduplicati fra portali): {report['unique_listing_links']}**.",
        "La raccolta legge solo le prime pagine consultabili delle fonti permesse: "
        "non equivale a una scansione completa del mercato.",
        "",
    ]
    for town in TOWNS:
        rows = [r for r in report["listings"] if r["town"] == town]
        if not rows:
            continue
        lines.append(f"### Collegamenti — {town}")
        for x in rows[:75]:
            lines.append(f"- [{x['source']} · {x['title']}]({x['url']}) — {x['owner_status']}")
        lines.append("")
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("_market/out"))
    opt = ap.parse_args()
    opt.out.mkdir(parents=True, exist_ok=True)
    result = collect()
    (opt.out / "inventory.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (opt.out / "market.md").write_text(markdown(result), encoding="utf-8")
    print("CASE247_MARKET status=" + result["status"] + " links=" + str(result["unique_listing_links"]))
    for s in result["sources"]:
        print(f"MARKET_SOURCE {s['town']!r} {s['source']} status={s['status']} links={s['extracted_links']} count={s['reported_count']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
