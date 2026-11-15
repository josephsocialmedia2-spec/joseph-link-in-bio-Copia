#!/usr/bin/env python3
"""CASE247 Radar: cloud-first discovery of public, potentially owner-listed property ads.

Sources: Bing's best-effort RSS endpoint and owner-configured Google Alerts RSS.
No portal scraping, no login bypass, no enrichment of private people by address.
Only public listing URLs and anonymized digests are persisted in workflow artifacts.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = BASE / "config" / "case247-acquisition-radar.json"
USER_AGENT = "CASE247-AcquisitionRadar/1.0 (public-index-monitor; no login or captcha bypass)"
REDACT_PHONE = re.compile(r"(?<!\d)(?:\+39[\s.-]?)?(?:3\d{2}|0\d{1,3})(?:[\s.-]?\d){6,9}(?!\d)")
REDACT_EMAIL = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PRICE_RX = re.compile(r"(?:€|EUR)\s*(\d{2,3}(?:[.\s]\d{3})+|\d{5,7})|(\d{2,3}(?:[.\s]\d{3})+|\d{5,7})\s*(?:€|euro)", re.I)
SQM_RX = re.compile(r"(\d{2,4})\s*(?:m²|mq|metri quadrati)\b", re.I)
STREET_RX = re.compile(r"\b(?:via|viale|corso|piazza|strada|vicolo)\s+[A-ZÀ-Ý][\wÀ-ÿ' -]{2,55}", re.I)
PROPERTY_RX = re.compile(r"\b(?:appartament|trilocal|bilocal|quadrilocal|casa|villa|immobil|alloggio|attico|terreno|rustico|vendesi|vendo)\w*", re.I)
PRIVATE_RX = re.compile(r"\b(?:da privato|vendita privata|privato vende|vendo direttamente|direttamente dal proprietario|senza intermediari|no agenzie|no agenzia|proprietario vende)\b", re.I)
AGENCY_RX = re.compile(r"\b(?:agenzia immobiliare|agente immobiliare|professionista immobiliare|proponiamo in vendita|agenzia propone)\b", re.I)
GENERIC_RX = re.compile(r"\b(?:annunci immobiliari|tutti gli annunci|case in vendita a|immobili in vendita a|agenzie immobiliari a)\b", re.I)
TRACKING = frozenset(("utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "fbclid", "gclid", "msclkid"))
ALLOWED_SCHEMES = ("http", "https")


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", html.unescape(value or ""))
    return re.sub(r"\s+", " ", value).strip()


def redact(value: str) -> str:
    return REDACT_EMAIL.sub("[email pubblica nella fonte]", REDACT_PHONE.sub("[telefono pubblicato nella fonte]", clean_text(value)))


def canonical_url(value: str) -> str:
    try:
        u = urllib.parse.urlsplit(value.strip())
        if u.scheme.lower() not in ALLOWED_SCHEMES or not u.hostname:
            return ""
        host = u.hostname.lower().removeprefix("www.")
        if host.endswith("bing.com") and u.path.startswith("/search"):
            return ""
        if host.endswith("google.com") and u.path.startswith("/search"):
            return ""
        keys = ("id", "itemid", "annuncio", "listingid", "p", "pid", "ad")
        q = urllib.parse.parse_qsl(u.query, keep_blank_values=False)
        q = sorted((k, v) for k, v in q if k.lower() in keys and k.lower() not in TRACKING)
        path = re.sub(r"/+", "/", u.path).rstrip("/") or "/"
        return urllib.parse.urlunsplit(("https", host, path, urllib.parse.urlencode(q), ""))
    except ValueError:
        return ""


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_price(value: str) -> int | None:
    m = PRICE_RX.search(value)
    if not m:
        return None
    n = int(re.sub(r"\D", "", m.group(1) or m.group(2)))
    return n if 10000 <= n <= 50000000 else None


def get_sqm(value: str) -> int | None:
    m = SQM_RX.search(value)
    if not m:
        return None
    n = int(m.group(1))
    return n if 15 <= n <= 10000 else None


def get_street(value: str) -> str:
    m = STREET_RX.search(value)
    if not m:
        return ""
    street = m.group(0).strip().rstrip(",;.")
    # Stop before price/advertising words; don't fabricate a civic number.
    street = re.split(r"\b(?:vendesi|privato|appartamento|bilocale|trilocale|euro|prezzo)\b", street, flags=re.I)[0].strip()
    return redact(street[:65])


def read_config(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(data.get("priority_towns"), list) and data["priority_towns"]
    assert isinstance(data.get("other_towns"), list) and data["other_towns"]
    assert isinstance(data.get("streets"), dict)
    assert isinstance(data.get("google_alerts_rss"), list)
    return data


def search_plan(config: dict, slot: int) -> list[tuple[str, str]]:
    priority = config["priority_towns"]
    others = config["other_towns"]
    t1 = priority[slot % len(priority)]
    t2 = priority[(slot + 1) % len(priority)]
    t3 = others[slot % len(others)]
    plans = [
        (t1, f'"{t1}" "vendesi" "da privato" casa'),
        (t2, f'"{t2}" ("privato vende" OR "no agenzie") appartamento'),
        (t3, f'"{t3}" ("da privato" OR "vendo casa") vendita'),
    ]
    streets = [(town, street) for town, roads in config["streets"].items() for street in roads]
    if streets:
        town, street = streets[slot % len(streets)]
        plans.append((town, f'"{town}" "{street}" ("vendesi" OR "vendo") ("privato" OR "proprietario")'))
    return plans


def http_text(url: str, *, timeout: int = 16, data: bytes | None = None) -> str:
    req = urllib.request.Request(
        url, data=data,
        headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json"},
        method="POST" if data is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read(1_200_000)
        return raw.decode("utf-8", errors="replace")


def parse_feed(text: str) -> list[dict]:
    root = ET.fromstring(text)
    results = []
    for item in root.findall(".//item"):
        title = clean_text(item.findtext("title") or "")
        desc = clean_text(item.findtext("description") or "")
        link = clean_text(item.findtext("link") or "")
        if title and canonical_url(link):
            results.append({"title": title, "description": desc, "url": link})
    atom = "{http://www.w3.org/2005/Atom}"
    for item in root.findall(".//" + atom + "entry"):
        link = next((e.get("href", "") for e in item.findall(atom + "link") if e.get("rel", "alternate") == "alternate"), "")
        title = clean_text(item.findtext(atom + "title") or "")
        desc = clean_text(item.findtext(atom + "summary") or item.findtext(atom + "content") or "")
        if title and canonical_url(link):
            results.append({"title": title, "description": desc, "url": link})
    return results


def town_of(title: str, desc: str, url: str, config: dict) -> str:
    combined = (title + " " + desc + " " + urllib.parse.unquote(urllib.parse.urlsplit(url).path)).casefold()
    towns = config["priority_towns"] + config["other_towns"]
    found = [t for t in towns if re.search(r"(?<!\w)" + re.escape(t.casefold()) + r"(?!\w)", combined)]
    return max(found, key=len) if found else ""


def normalize_result(raw: dict, source: str, config: dict) -> dict | None:
    url = canonical_url(raw.get("url", ""))
    if not url:
        return None
    title, desc = clean_text(raw.get("title", "")), clean_text(raw.get("description", ""))
    combined = title + " " + desc
    town = town_of(title, desc, url, config)
    if not town or not PROPERTY_RX.search(combined):
        return None
    has_private = bool(PRIVATE_RX.search(combined))
    has_agency = bool(AGENCY_RX.search(combined)) and not re.search(r"\bno agenzi", combined, re.I)
    generic = bool(GENERIC_RX.search(title))
    if has_agency or generic:
        return None
    status = "PROBABILE_PRIVATO" if has_private else "DA_VERIFICARE"
    return {
        "id": digest(url), "url": url, "title": redact(title)[:150],
        "town": town, "street": get_street(combined),
        "price": get_price(combined), "mq": get_sqm(combined),
        "status": status, "source": source,
        "evidence": "dichiarazione privato nella fonte" if has_private else "nessuna dichiarazione venditore verificata",
        "public_contact_flag": bool(REDACT_PHONE.search(combined) or REDACT_EMAIL.search(combined)),
    }


def match_same_street(result: dict, businesses: list[dict]) -> list[dict]:
    """Same street = territorial lead, NEVER evidence of who owns the property."""
    street = result.get("street", "").casefold()
    town = result.get("town", "").casefold()
    if not street:
        return []
    return [
        {"name": b["name"], "source": b.get("source", ""), "website": b.get("website", "")}
        for b in businesses
        if b.get("street", "").casefold() == street and b.get("town", "").casefold() == town
    ][:5]


def openstreetmap_same_street(result: dict) -> list[dict]:
    """Optional small best-effort OSM query; same street is NOT a distance measurement."""
    street, town = result.get("street"), result.get("town")
    if not street or not town:
        return []
    if '"' in street or '"' in town or len(street) > 65:
        return []
    query = (
        '[out:json][timeout:18];'
        f'area["name"="{town}"]["admin_level"="8"]->.a;'
        f'nwr(area.a)["addr:street"="{street}"]["name"];'
        'out tags 20;'
    )
    body = http_text("https://overpass.kumi.systems/api/interpreter", timeout=22, data=urllib.parse.urlencode({"data": query}).encode())
    data = json.loads(body)
    items = []
    for obj in data.get("elements", []):
        tags = obj.get("tags", {})
        if not any(k in tags for k in ("shop", "office", "amenity", "craft", "tourism")):
            continue
        name = redact(tags.get("name", ""))[:75]
        if not name:
            continue
        website = tags.get("website") or tags.get("contact:website") or ""
        items.append({
            "name": name, "street": street, "town": town,
            "source": "OpenStreetMap (attività sulla stessa via)",
            "website": website if website.startswith(("https://", "http://")) else "",
            "public_business_phone": bool(tags.get("phone") or tags.get("contact:phone")),
            "public_business_email": bool(tags.get("email") or tags.get("contact:email")),
        })
    return items[:8]


def load_state(path: Path) -> dict:
    if not path.exists():
        return {"schema": 1, "initialized": False, "known": {}}
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
        if state.get("schema") != 1 or not isinstance(state.get("known"), dict):
            raise ValueError("schema incompatible")
        return state
    except (OSError, ValueError) as e:
        raise RuntimeError(f"State non affidabile: {e}; non azzero la memoria per evitare falsi nuovi annunci.") from e


def compare(results: list[dict], state: dict, now_iso: str) -> tuple[list[dict], dict]:
    known = dict(state["known"])
    initialized = bool(state.get("initialized", False))
    changes = []
    for row in results:
        id_ = row["id"]
        previous = known.get(id_, {})
        if not previous:
            kind = "NUOVO" if initialized else "BASELINE"
        elif row.get("price") is not None and previous.get("price") is not None and row["price"] < previous["price"]:
            kind = "RIBASSO_INDICATIVO"
        else:
            kind = "GIA_VISTO"
        newrec = {
            "first_seen": previous.get("first_seen", now_iso),
            "last_seen": now_iso,
            "price": row.get("price") if row.get("price") is not None else previous.get("price"),
        }
        known[id_] = newrec
        if kind in ("NUOVO", "RIBASSO_INDICATIVO"):
            changes.append({**row, "event": kind})
    # Memory limit: retaining a bounded recent index avoids uncontrolled artifacts.
    if len(known) > 12000:
        known = dict(sorted(known.items(), key=lambda kv: kv[1].get("last_seen", ""), reverse=True)[:12000])
    return changes, {"schema": 1, "initialized": True, "known": known}


def md_report(changes: list[dict], stats: dict, now_iso: str) -> str:
    lines = [
        "# CASE247 · Radar nuovi immobili",
        f"Scansione (UTC): {now_iso}",
        f"Fonti riuscite: {stats['feeds_ok']} / {stats['feeds_attempted']}; risultati candidati: {stats['candidates']}.",
        "",
        "Solo segnali derivati dagli indici pubblici: **non è accertato** che l'annuncio sia realmente di un privato.",
        "I recapiti delle attività sulla stessa via non identificano il proprietario e non vanno attribuiti all'immobile.",
        "",
    ]
    for r in changes[:20]:
        lines += [
            f"## {r['event']} · {r['town']} · {r['status']}",
            r["title"],
            f"Fonte: {r['source']} · {r['url']}",
            f"Via pubblicata: {r['street'] or 'non rilevata'} · Prezzo indicato: {r['price'] or 'non rilevato'} € · MQ: {r['mq'] or 'non rilevati'}",
            f"Recapito presente nell'indice: {'sì, verificare solo dalla fonte originale' if r['public_contact_flag'] else 'non rilevato'}",
        ]
        if r.get("same_street_businesses"):
            lines.append("Attività sulla stessa via (distanza non verificata): " + "; ".join(
                b["name"] + (f" ({b['website']})" if b.get("website") else "")
                for b in r["same_street_businesses"][:4]
            ))
        lines.append("")
    if len(changes) > 20:
        lines.append(f"Altri {len(changes)-20} risultati nel report JSON dell'esecuzione.")
    return "\n".join(lines)


def save_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run(config: dict, previous: dict, slot: int, fetch=http_text, enrich=False) -> tuple[dict, dict, str]:
    plans = search_plan(config, slot)
    feeds = [
        ("Bing RSS", "https://www.bing.com/search?" + urllib.parse.urlencode({"q": q, "format": "rss"}))
        for _, q in plans
    ]
    for address in config.get("google_alerts_rss", []):
        if address.startswith("https://www.google.com/alerts/feeds/"):
            feeds.append(("Google Alerts RSS", address))
    seen, errors, success = {}, [], 0
    for source, url in feeds:
        try:
            rows = parse_feed(fetch(url))
            success += 1
            for row in rows:
                obj = normalize_result(row, source, config)
                if obj:
                    seen.setdefault(obj["id"], obj)
        except (TimeoutError, urllib.error.URLError, ET.ParseError, ValueError, OSError) as e:
            errors.append(f"{source}: {type(e).__name__}")
        time.sleep(0.2)
    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    # No successful source: never replace a good state or report 'no new'.
    if success == 0:
        return {
            "status": "FONTI_NON_DISPONIBILI", "scanned_at_utc": now_iso, "new_count": 0,
            "feeds_ok": 0, "feeds_attempted": len(feeds), "errors": errors,
            "queries": [{"town": town, "query": q} for town, q in plans],
            "changes": [],
        }, previous, ""
    changes, state = compare(list(seen.values()), previous, now_iso)
    # Only high-confidence signals trigger notifications; ambiguous results remain in report.
    reportable = [c for c in changes if c["status"] == "PROBABILE_PRIVATO"]
    if enrich and reportable:
        for r in reportable[:1]:
            try:
                r["same_street_businesses"] = match_same_street(r, openstreetmap_same_street(r))
            except (TimeoutError, urllib.error.URLError, ValueError, OSError):
                r["enrichment_status"] = "NON_DISPONIBILE"
    stats = {"feeds_ok": success, "feeds_attempted": len(feeds), "candidates": len(seen)}
    output = {
        "status": "OK" if success == len(feeds) else "PARZIALE",
        "scanned_at_utc": now_iso, "new_count": len(reportable),
        **stats, "errors": errors,
        "queries": [{"town": town, "query": q} for town, q in plans],
        "changes": changes[:100],
        "candidate_count_uncertain": sum(1 for r in seen.values() if r["status"] == "DA_VERIFICARE"),
    }
    return output, state, md_report(reportable, stats, now_iso) if reportable else ""


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    p.add_argument("--state", type=Path, default=Path("_radar/state.json"))
    p.add_argument("--out", type=Path, default=Path("_radar/out"))
    p.add_argument("--slot", type=int, default=None)
    p.add_argument("--enrich", action="store_true")
    args = p.parse_args()
    config = read_config(args.config)
    previous = load_state(args.state)
    slot = args.slot if args.slot is not None else int(time.time() // 3600)
    output, next_state, alert = run(config, previous, slot, enrich=args.enrich)
    args.out.mkdir(parents=True, exist_ok=True)
    save_json(args.out / "report.json", output)
    (args.out / "alert.md").write_text(alert, encoding="utf-8")
    if output["status"] != "FONTI_NON_DISPONIBILI":
        save_json(args.out / "state.json", next_state)
    else:
        save_json(args.out / "state.json", previous)
    print(f"CASE247_RADAR status={output['status']} sources={output['feeds_ok']}/{output['feeds_attempted']} candidates={output.get('candidates', 0)} notifications={output['new_count']}")
    if output["status"] == "FONTI_NON_DISPONIBILI":
        print("No live sources responded; NOT claiming zero new listings.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
