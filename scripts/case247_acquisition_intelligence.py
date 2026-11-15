#!/usr/bin/env python3
"""CASE247 public signals: local real-estate news + business referral prospects.

Four authorized municipalities only. No login, people-finder, address-to-person
matching, phone-number reversal or automatic marketing outreach. Public business
data from OpenStreetMap (ODbL), headlines/links from public Google News RSS.
All sources are explicitly marked unverified commercial opportunities.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.parse
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from case247_acquisition_radar import (
    ALLOWED_TOWNS, clean_text, http_text, redact, save_json, canonical_url,
)

NEWS_RX = re.compile(
    r"\b(?:ediliz\w*|urbanistic\w*|immobiliar\w*|case|casa|affitt\w*|"
    r"mutu\w*|vendit\w*|cantier\w*|ristruttur\w*|"
    r"riqualific\w*|rigeneraz\w*|residenzial\w*|"
    r"alloggi\w*|abitazion\w*|propriet[aà]|housing)\b", re.I,
)
GENERIC_BUSINESS_EMAIL = re.compile(
    r"^(?:info|contatti|contact|segreteria|ufficio|amministrazione|"
    r"commerciale|reception|direzione|office)@[a-z0-9.-]+\.[a-z]{2,}$", re.I,
)
SAFE_PHONE = re.compile(r"^\+?39[\s.-]*0\d[\d\s()./-]{5,18}$|^0\d[\d\s()./-]{5,18}$")
OSM_ENDPOINT = "https://overpass-api.de/api/interpreter"
OSM_ATTRIBUTION = "© OpenStreetMap contributors (ODbL)"


def news_feed_url(town: str) -> str:
    query = f'"{town}" (edilizia OR urbanistica OR immobiliare OR casa OR cantieri) when:7d'
    return "https://news.google.com/rss/search?" + urllib.parse.urlencode({
        "q": query, "hl": "it", "gl": "IT", "ceid": "IT:it",
    })


def exact_town(text: str, town: str) -> bool:
    return bool(re.search(r"(?<!\w)" + re.escape(town) + r"(?!\w)", text, re.I))


def news_from_feed(xml: str, town: str, now: datetime) -> list[dict]:
    root = ET.fromstring(xml)
    news = []
    cutoff = now - timedelta(hours=72)
    for item in root.findall(".//item"):
        title = clean_text(item.findtext("title") or "")
        link = clean_text(item.findtext("link") or "")
        description = clean_text(item.findtext("description") or "")
        if not title or not exact_town(title, town) or not NEWS_RX.search(title):
            continue
        link = canonical_url(link)
        if not link:
            continue
        published = item.findtext("pubDate") or ""
        try:
            dt = parsedate_to_datetime(published).astimezone(timezone.utc)
        except (TypeError, ValueError, IndexError):
            continue
        if not cutoff <= dt <= now + timedelta(hours=2):
            continue
        news.append({
            "id": hashlib.sha256(("news:" + link).encode()).hexdigest(),
            "town": town, "title": redact(title)[:200],
            "url": link, "published_utc": dt.isoformat(),
            "category": "NOTIZIA_TERRITORIALE",
            "source": "Google News RSS (titolo e link; fonte originaria da verificare)",
        })
    return news


def overpass_query(town: str) -> str:
    assert town in ALLOWED_TOWNS
    safe = town.replace("\\", "\\\\").replace('"', '\\"')
    return (
        '[out:json][timeout:22];'
        f'area["name"="{safe}"]["admin_level"="8"]->.a;'
        '('
        'nwr(area.a)["office"~"^(estate_agent|company|architect|surveyor|notary)$"]["name"];'
        'nwr(area.a)["craft"~"^(builder|roofer|electrician|plumber)$"]["name"];'
        ');out tags 60;'
    )


def clean_website(value: str) -> str:
    url = (value or "").split(";")[0].strip()
    if url and not url.startswith(("https://", "http://")):
        if re.match(r"^[a-z0-9.-]+\.[a-z]{2,}(?:/|$)", url, re.I):
            url = "https://" + url
    parts = urllib.parse.urlsplit(url)
    return url if parts.scheme in ("https", "http") and parts.hostname else ""


def safe_business_contact(tags: dict) -> dict:
    """Only organization-style published contacts, never personal or inferred."""
    email = (tags.get("contact:email") or tags.get("email") or "").split(";")[0].strip()
    if not GENERIC_BUSINESS_EMAIL.fullmatch(email):
        email = ""
    raw_phone = (tags.get("contact:phone") or tags.get("phone") or "").split(";")[0].strip()
    phone = raw_phone if SAFE_PHONE.fullmatch(raw_phone) else ""
    website = clean_website(tags.get("contact:website") or tags.get("website") or "")
    return {"website": website, "email": email, "phone": phone}


def business_from_osm(data: dict, town: str) -> list[dict]:
    results = []
    for item in data.get("elements", []):
        tags = item.get("tags", {})
        name = clean_text(tags.get("name") or "")
        if not name or len(name) > 120:
            continue
        group = tags.get("office") or tags.get("craft") or ""
        if not group:
            continue
        kind = item.get("type", "")
        osm_id = item.get("id", 0)
        if kind not in ("node", "way", "relation") or not isinstance(osm_id, int):
            continue
        contact = safe_business_contact(tags)
        # No contact point: no actionable referral lead.
        if not any(contact.values()):
            continue
        street = redact(tags.get("addr:street", ""))[:80]
        url = f"https://www.openstreetmap.org/{kind}/{osm_id}"
        results.append({
            "id": hashlib.sha256(("osm:" + kind + str(osm_id)).encode()).hexdigest(),
            "town": town, "name": redact(name), "sector": group,
            "street": street, "osm_url": url, "source": OSM_ATTRIBUTION,
            "category": "CONTATTO_AZIENDALE_PUBBLICO",
            "relationship": "Potenziale contatto B2B; NESSUN collegamento accertato con immobili o proprietari",
            **contact,
        })
    return results


def gather(now: datetime, fetch=http_text, limit_per_town: int = 8) -> dict:
    news, business, errors, status = {}, {}, [], []
    for town in ALLOWED_TOWNS:
        try:
            rss = fetch(news_feed_url(town))
            rows = news_from_feed(rss, town, now)
            for row in rows[:limit_per_town]:
                news.setdefault(row["id"], row)
            status.append({"town": town, "source": "Google News RSS", "status": "OK", "items": len(rows)})
        except (OSError, urllib.error.URLError, ET.ParseError, ValueError, TimeoutError) as err:
            errors.append(f"{town}: news {type(err).__name__}")
            status.append({"town": town, "source": "Google News RSS", "status": "ERROR"})
        try:
            payload = fetch(OSM_ENDPOINT, timeout=28,
                            data=urllib.parse.urlencode({"data": overpass_query(town)}).encode())
            rows = business_from_osm(json.loads(payload), town)
            for row in rows[:limit_per_town]:
                business.setdefault(row["id"], row)
            status.append({"town": town, "source": "OpenStreetMap Overpass", "status": "OK", "items": len(rows)})
        except (OSError, urllib.error.URLError, json.JSONDecodeError, ValueError, TimeoutError) as err:
            errors.append(f"{town}: OSM {type(err).__name__}")
            status.append({"town": town, "source": "OpenStreetMap Overpass", "status": "ERROR"})
    return {
        "generated_utc": now.isoformat(),
        "news": list(news.values()), "business_contacts": list(business.values()),
        "sources": status, "errors": errors,
        "disclaimer": "Solo fonti pubbliche. I recapiti aziendali non identificano proprietari. Nessun invio promozionale automatico.",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=Path("_radar/out/intelligence.json"))
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    data = gather(now)
    save_json(args.out, data)
    good = sum(x["status"] == "OK" for x in data["sources"])
    print(f"CASE247_INTELLIGENCE sources_ok={good}/8 news={len(data['news'])} business_contacts={len(data['business_contacts'])}")
    if good == 0:
        # Do not block the property digest: it will explicitly show unavailable sources.
        print("CASE247_INTELLIGENCE WARNING: all news/referral sources unavailable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
