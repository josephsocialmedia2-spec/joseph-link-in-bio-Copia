#!/usr/bin/env python3
"""Read public, permission-checked sitemap URLs for CASE247's four towns.

Never bypass site access controls, solicit owners, crawl listing pages or infer
private identities. Only configured origins are contacted. Unknown geography
and URLs mentioning another municipality are excluded.
"""
from __future__ import annotations

import argparse
import gzip
import io
import ipaddress
import json
import re
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "config/case247-sitemaps.json"
ROME = ZoneInfo("Europe/Rome")
USER_AGENT = "CASE247SitemapMonitor/1.0 (public index, robots compliant)"
SLUGS = {
    "Avigliana": ("avigliana",),
    "Sant'Ambrogio di Torino": ("sant-ambrogio-di-torino", "santambrogio-di-torino", "santambrogioditorino", "sant-ambrogio", "santambrogio"),
    "Almese": ("almese",),
    "Condove": ("condove",),
}
EXCLUDED = ("buttigliera-alta", "rivoli", "rosta", "susa", "bussoleno",
            "caprie", "rubiana", "vaie", "caselette", "villar-dora",
            "chiusa-di-san-michele", "alpignano", "san-didero")
MAX_FILES_PER_SOURCE = 8
MAX_LISTINGS_PER_SOURCE = 3000


def safe_host(url: str) -> str:
    split = urllib.parse.urlsplit(url)
    host = (split.hostname or "").lower()
    if split.scheme != "https" or not host or split.username or split.password or split.port not in (None, 443):
        return ""
    try:
        ipaddress.ip_address(host)
        return ""
    except ValueError:
        pass
    if not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", host):
        return ""
    return host


def canonical(url: str) -> str:
    host = safe_host(url)
    if not host:
        return ""
    x = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(("https", host, x.path.rstrip("/") or "/", "", ""))


def municipality(url: str) -> str:
    """Scope only where the *listing URL* explicitly names one town unambiguously."""
    path = urllib.parse.unquote(urllib.parse.urlsplit(url).path).casefold().replace("_", "-")
    # A page about nearby towns is not evidence of a listing's location.
    if any(x in path for x in ("/vicino-a-", "/nei-pressi-di-", "/a-pochi-minuti-da-")):
        return ""
    if any(re.search(r"(?<![a-z])" + re.escape(x) + r"(?![a-z])", path) for x in EXCLUDED):
        return ""
    found = [
        town for town, variants in SLUGS.items()
        if any(re.search(r"(?<![a-z])" + re.escape(s) + r"(?![a-z])", path) for s in variants)
    ]
    return found[0] if len(found) == 1 else ""


def is_individual_listing(url: str) -> bool:
    """Exclude search categories and area landing pages from sitemap results.

    A URL naming a municipality is NOT evidence of an individual property.
    For unknown hosts, require a property/listing path AND a numeric ID.
    """
    x = urllib.parse.urlsplit(url)
    host = (x.hostname or "").lower().removeprefix("www.")
    path = x.path.casefold().rstrip("/")
    if host == "immobiliare.it":
        return bool(re.fullmatch(r"/annunci/\d{5,}", path))
    if host == "casadaprivato.it":
        return bool(re.search(r"-torino-\d{3,}$", path))
    if host == "teckimmobiliare.it":
        # Verified real page pattern: /properties/appartamento/avigliana/<slug>/
        return bool(re.fullmatch(
            r"/properties/(?:appartamento|casa|villa|terreno|rustico|attico|immobile|negozio|commerciale|bilocale|trilocale|quadrilocale)/[a-z0-9-]+/[a-z0-9-]+",
            path,
        ))
    if host == "lasacraimmobiliare.it":
        # Shopify products use textual property slugs rather than numeric IDs.
        return bool(re.fullmatch(r"/products/[a-z0-9-]+", path)) and bool(re.search(
            r"(?:appartamento|alloggio|bilocale|trilocale|quadrilocale|casa|villa|chalet|terreno|rustico|mansarda|bifamiliare|semindipendente)",
            path,
        ))
    # Unknown publishers: conservative individual listing path + numeric identifier.
    if re.search(r"/(?:vendita-[^/]*|affitto-[^/]*|aste-[^/]*|agenzie|cerca|ricerca|news|prezzi|valutazione)(?:/|$)", path):
        return False
    return bool(
        re.search(r"/(?:annunci?|annuncio|immobili?|immobile|listing|property|scheda)/", path)
        and re.search(r"(?:-|/)\d{3,}$", path)
    )


def read_config(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    sources = data.get("sources")
    if not isinstance(sources, list) or len(sources) > 12:
        raise ValueError("sitemap sources must be a list of 0..12 entries")
    names = set()
    for src in sources:
        if not isinstance(src, dict) or not isinstance(src.get("name"), str):
            raise ValueError("source requires name")
        if src["name"] in names:
            raise ValueError("duplicate source name")
        if src.get("kind", "PORTALE") not in ("PORTALE", "AGENZIA"):
            raise ValueError("kind must be PORTALE or AGENZIA")
        names.add(src["name"])
        base = src.get("sitemap_url", "")
        host = src.get("host", "").lower()
        if not safe_host("https://" + host + "/robots.txt"):
            raise ValueError("invalid source host")
        discover = src.get("discover_from_robots", False)
        if not isinstance(discover, bool):
            raise ValueError("discover_from_robots must be boolean")
        if discover:
            if base:
                raise ValueError("discovery source must not specify sitemap_url")
        elif safe_host(base) != host:
            raise ValueError("sitemap_url must be HTTPS and same as source host")
    return data


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/xml,text/xml,application/gzip"})
    with urllib.request.urlopen(request, timeout=12) as response:
        if safe_host(response.geturl()) != safe_host(url):
            raise ValueError("cross-origin redirect rejected")
        return response.read(1_500_000)


def xml_root(data: bytes, url: str) -> ET.Element:
    if url.endswith(".gz") or data.startswith(b"\x1f\x8b"):
        data = gzip.decompress(data[:1_500_000])
        if len(data) > 5_000_000:
            raise ValueError("decompressed sitemap too large")
    if len(data) > 5_000_000 or b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
        raise ValueError("unsafe/oversized XML")
    return ET.fromstring(data)


def local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def xml_urls(root: ET.Element) -> tuple[str, list[tuple[str, str]]]:
    root_type = local_tag(root.tag)
    if root_type not in ("sitemapindex", "urlset"):
        raise ValueError("expected sitemapindex or urlset")
    entries = []
    item_tag = "sitemap" if root_type == "sitemapindex" else "url"
    for item in root:
        if local_tag(item.tag) != item_tag:
            continue
        loc = next((x.text for x in item if local_tag(x.tag) == "loc"), "")
        lastmod = next((x.text for x in item if local_tag(x.tag) == "lastmod"), "")
        if loc:
            entries.append((loc.strip(), (lastmod or "").strip()))
    return root_type, entries


def collect_source(source: dict, downloader=fetch) -> dict:
    result = {"source": source["name"], "status": "OK", "listings": [],
              "sitemaps_checked": 0, "urls_scanned": 0, "errors": []}
    host = source["host"].lower()
    try:
        rules_text = downloader("https://" + host + "/robots.txt").decode("utf-8", "replace")
        robots = urllib.robotparser.RobotFileParser()
        robots.parse(rules_text.splitlines())
    except Exception:
        result["status"] = "ROBOTS_NON_VERIFICABILE"
        return result
    if source.get("discover_from_robots"):
        # Only follow the publisher's own publicly advertised sitemap URLs.
        advertised = [
            line.split(":", 1)[1].strip()
            for line in rules_text.splitlines()
            if line.strip().casefold().startswith("sitemap:")
        ]
        pending = [(u, 0) for u in advertised if safe_host(u) == host][:MAX_FILES_PER_SOURCE]
        if not pending:
            result["status"] = "SITEMAP_NON_PUBBLICATA"
            return result
    else:
        pending = [(source["sitemap_url"], 0)]
    seen_sitemaps = set()
    seen_links = set()
    while pending and len(seen_sitemaps) < MAX_FILES_PER_SOURCE:
        current, depth = pending.pop(0)
        if current in seen_sitemaps:
            continue
        seen_sitemaps.add(current)
        if safe_host(current) != host or not robots.can_fetch(USER_AGENT, current):
            result["errors"].append("SITEMAP_BLOCCATA_O_ORIGINE_DIVERSA")
            continue
        try:
            root = xml_root(downloader(current), current)
            kind, entries = xml_urls(root)
            result["sitemaps_checked"] += 1
        except Exception:
            result["errors"].append("SITEMAP_NON_DISPONIBILE_O_NON_XML")
            continue
        if kind == "sitemapindex" and depth < 2:
            for uri, _ in entries[:MAX_FILES_PER_SOURCE * 5]:
                if safe_host(uri) == host and uri not in seen_sitemaps:
                    pending.append((uri, depth + 1))
            continue
        if kind == "urlset":
            for uri, lastmod in entries:
                result["urls_scanned"] += 1
                if len(seen_links) >= MAX_LISTINGS_PER_SOURCE:
                    break
                if safe_host(uri) != host or not robots.can_fetch(USER_AGENT, uri):
                    continue
                town = municipality(uri)
                normalized = canonical(uri)
                if not town or not normalized or not is_individual_listing(uri) or normalized in seen_links:
                    continue
                seen_links.add(normalized)
                result["listings"].append({
                    "town": town, "source": source["name"], "url": normalized,
                    "title": "Da verificare sulla fonte originale",
                    "last_modified": lastmod,
                    "owner_status": "AGENZIA - NON PRIVATO" if source.get("kind") == "AGENZIA" else "DA_VERIFICARE",
                    "contact_permission": "NO CONTATTO AUTOMATICO",
                    "source_type": "AGENZIA" if source.get("kind") == "AGENZIA" else "SITEMAP_PUBBLICA",
                    "price": None, "mq": None, "street": "",
                })
        if len(seen_links) >= MAX_LISTINGS_PER_SOURCE:
            result["errors"].append("LIMITE_URL_RAGGIUNTO")
            break
    if not result["sitemaps_checked"]:
        result["status"] = "NESSUNA_SITEMAP_ACCESSIBILE"
    elif result["errors"]:
        result["status"] = "PARZIALE"
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--out", type=Path, default=Path("_market/out/sitemaps.json"))
    args = parser.parse_args()
    cfg = read_config(args.config)
    entries = [collect_source(s) for s in cfg["sources"]]
    references = [
        {"source": "Portale delle Vendite Pubbliche - Ministero Giustizia",
         "town": "", "status": "SOLO_CONSULTAZIONE", "reported_count": None,
         "extracted_links": 0, "index_url": "https://pvp.giustizia.it/pvp/",
         "source_type": "ASTE", "listings": []},
    ]
    result = {"as_of_rome": datetime.now(ROME).isoformat(timespec="seconds"),
              "scope": list(SLUGS), "type": "SITEMAP",
              "status": "OK" if entries and all(r["status"] == "OK" for r in entries) else
                        "NESSUNA_FONTE_CONFIGURATA" if not entries else "PARZIALE",
              "sources": [*entries, *references],
              "listings": [row for entry in entries for row in entry["listings"]]}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("CASE247_SITEMAPS status=" + result["status"] + " listings=" + str(len(result["listings"])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
