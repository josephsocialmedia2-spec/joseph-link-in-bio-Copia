#!/usr/bin/env python3
"""CASE247 individual-property semantic checks. Stdlib only, privacy-first.

A municipality in an URL or in promotional prose is not location evidence.
A successful index crawl is not evidence of a currently active property.
Never save telephone numbers, names, cookies or personal emails in artifacts.
"""
from __future__ import annotations

import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser

TOWNS = ("Avigliana", "Sant'Ambrogio di Torino", "Almese", "Condove")
MICRO_AREAS = ("Drubiaglio", "Bertassi", "Rivera", "Milanere", "Grangia",
               "San Mauro", "Frassinere", "Pralesio")
AGENCY_HOSTS = frozenset(("teckimmobiliare.it", "lasacraimmobiliare.it",
                          "immobiliarevalmessa.it", "fcimmobiliare.it"))
DETAIL_HOSTS = AGENCY_HOSTS  # Only verified agency-owned public pages; no portals.
UA = "CASE247Semantic/1.0 (robots-aware, low-frequency research)"
CONTRACT_RENT = re.compile(r"\b(?:affitto|affittasi|affittato|in\s+locazione|locazione|canone\s+mensile|transitorio|rental|for\s+rent)\b", re.I)
CONTRACT_SALE = re.compile(r"\b(?:vendita|vendesi|in\s+vendita|for\s+sale)\b", re.I)
BAN = re.compile(r"\b(?:no\s+agenzie|no\s+intermediari|no\s+telemarketing|astenersi\s+(?:agenzie|intermediari)|non\s+(?:voglio|desidero)\s+(?:essere\s+)?contattat[oa]\s+da\s+agenzie)\b", re.I)
TOWN_ALIASES = {
    "avigliana": "Avigliana",
    "sant ambrogio di torino": "Sant'Ambrogio di Torino",
    "sant ambrogio": "Sant'Ambrogio di Torino",
    "santambrogio di torino": "Sant'Ambrogio di Torino",
    "santambrogio": "Sant'Ambrogio di Torino",
    "almese": "Almese",
    "condove": "Condove",
}
PROPERTY_TYPES = frozenset(("product", "realestatelisting", "apartment", "house", "singlefamilyresidence",
                            "residence", "accommodation", "place", "floorplan", "propertyvalue"))


def normalize(value: str) -> str:
    x = unicodedata.normalize("NFKD", str(value or "").casefold())
    x = "".join(c for c in x if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", x).split())


def canonical_town(value: str) -> str:
    x = normalize(value)
    x = re.sub(r"\b(?:provincia di|provincia|to|torino|piemonte|italia)\b", " ", x)
    x = " ".join(x.split())
    return TOWN_ALIASES.get(x, "")


class Signals(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.title = []
        self.h1 = []
        self.breadcrumbs = []
        self.fields = []
        self.scripts = []
        self.content = []
        self.meta = {}
        self.localities = []
        self.streets = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        klass = (a.get("class", "") + " " + a.get("id", "")).lower()
        parent = self.stack[-1][1] if self.stack else False
        breadcrumb = parent or "breadcrumb" in klass or a.get("aria-label", "").lower() == "breadcrumb"
        if tag == "nav" and a.get("aria-label", "").lower() in ("breadcrumb", "breadcrumbs"):
            breadcrumb = True
        self.stack.append((tag, breadcrumb, a.get("type", "").lower() == "application/ld+json"))
        if tag == "meta":
            key = a.get("property", a.get("name", "")).lower()
            if key and a.get("content"):
                self.meta[key] = a["content"][:300]
        if a.get("itemprop", "").lower() == "addresslocality" and a.get("content"):
            self.localities.append(a["content"][:90])
        if a.get("itemprop", "").lower() == "streetaddress" and a.get("content"):
            self.streets.append(a["content"][:130])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        # Track nesting conservatively and only reset one matching tag.
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, text):
        if not text.strip() or not self.stack:
            return
        tag, _, _ = self.stack[-1]
        if tag in ("script", "style"):
            if tag == "script" and self.stack[-1][2]:
                self.scripts.append(text)
            return
        val = " ".join(text.split())
        if tag == "title" or any(x[0] == "title" for x in self.stack):
            self.title.append(val)
        if tag == "h1" or any(x[0] == "h1" for x in self.stack):
            self.h1.append(val)
        if any(x[1] for x in self.stack):
            self.breadcrumbs.append(val[:100])
        # A labelled location is accepted only as a short, explicitly labelled field.
        if re.match(r"^(?:Comune|Localit[aà]|Zona)\s*:", val, re.I) and len(val) <= 110:
            self.fields.append(val)
        # Capture text for opt-out detection only. Never persist original page text.
        if len(self.content) < 750:
            self.content.append(val[:250])


def structured_data(scripts: list[str]) -> list[dict]:
    result = []
    for script in scripts[:16]:
        try:
            item = json.loads(script)
        except (TypeError, ValueError):
            continue
        pending = item if isinstance(item, list) else [item]
        while pending and len(result) < 60:
            obj = pending.pop()
            if not isinstance(obj, dict):
                continue
            result.append(obj)
            graph = obj.get("@graph")
            if isinstance(graph, list):
                pending.extend(graph[:45])
            for key in ("mainEntity", "itemOffered", "about"):
                child = obj.get(key)
                if isinstance(child, dict):
                    pending.append(child)
    return result


def _property_values(s: Signals) -> tuple[list[str], list[str], list[int], bool, bool]:
    localities, streets = list(s.localities), list(s.streets)
    prices, active, agency = [], False, False
    for obj in structured_data(s.scripts):
        objtype = normalize(" ".join(obj.get("@type", [])) if isinstance(obj.get("@type"), list)
                            else str(obj.get("@type", ""))).replace(" ", "")
        # Organisation address is the brokerage office, not the listing!
        if any(x in objtype for x in ("realestateagent", "realestateorganization")):
            agency = True
        if "organization" in objtype:
            agency = True
        if objtype in PROPERTY_TYPES or any(x in objtype for x in ("realestatelisting","apartment","residence")):
            address = obj.get("address")
            if isinstance(address, dict):
                if isinstance(address.get("addressLocality"), str):
                    localities.append(address["addressLocality"][:90])
                if isinstance(address.get("streetAddress"), str):
                    streets.append(address["streetAddress"][:130])
            if isinstance(obj.get("addressLocality"), str):
                localities.append(obj["addressLocality"][:90])
        offers = obj.get("offers")
        if isinstance(offers, dict):
            offers = [offers]
        if isinstance(offers, list):
            for offer in offers[:10]:
                if not isinstance(offer, dict):
                    continue
                try:
                    price = int(float(str(offer.get("price", "")).replace(",", ".")))
                    if price > 0: prices.append(price)
                except ValueError:
                    pass
                availability = str(offer.get("availability", "")).lower()
                if availability.endswith(("instock", "/instock")):
                    active = True
    return localities, streets, prices, active, agency


def _label_locality(raw: str) -> str:
    val = re.sub(r"^(?:Comune|Localit[aà]|Zona)\s*:\s*", "", raw, flags=re.I)
    # Strictly allow only a town, optional province suffix, or town + micro-area.
    candidate = canonical_town(val)
    if candidate:
        return candidate
    for town in TOWNS:
        first = normalize(town)
        if normalize(val).startswith(first + " "):
            residue = normalize(val)[len(first):].strip()
            if residue in {normalize(x) for x in MICRO_AREAS}:
                return town
    return ""


def valida_comune(s: Signals) -> tuple[str, str]:
    """Priority: property JSON-LD locality, labelled field, breadcrumb.

    A conflicting or non-target explicit locality fails closed.
    """
    localities, _, _, _, _ = _property_values(s)
    if localities:
        found = {canonical_town(v) for v in localities}
        if len(found) == 1:
            only = next(iter(found))
            return (only, "Verificato") if only else ("", "Fuori_Perimetro")
        return "", "Comune_Da_Verificare"
    if s.fields:
        found = {_label_locality(v) for v in s.fields}
        if len(found) == 1:
            only = next(iter(found))
            return (only, "Verificato") if only else ("", "Fuori_Perimetro")
        return "", "Comune_Da_Verificare"
    if s.breadcrumbs:
        found = set()
        for crumb in s.breadcrumbs:
            if len(crumb) <= 75:
                candidate = canonical_town(crumb)
                if candidate:
                    found.add(candidate)
        return (next(iter(found)), "Verificato") if len(found) == 1 else ("", "Comune_Da_Verificare")
    return "", "Comune_Da_Verificare"


def is_vendita(s: Signals) -> str:
    """Contract from title, H1, breadcrumbs, structured offer; never free prose."""
    headline = " ".join([*s.title, *s.h1, *s.breadcrumbs, s.meta.get("og:title", "")])
    if CONTRACT_RENT.search(headline):
        return "Escluso_Affitto"
    _, _, prices, _, _ = _property_values(s)
    if prices and min(prices) < 15000:
        # €12k can be a genuine sale: flag rather than silently deleting it.
        return "Prezzo_Da_Verificare"
    if CONTRACT_SALE.search(headline):
        return "Vendita"
    return "Contratto_Da_Verificare"


def extract_microzone(s: Signals) -> str:
    _, streets, _, _, _ = _property_values(s)
    if streets:
        return streets[0][:115]
    headline = " ".join([*s.title, *s.h1])
    for zone in MICRO_AREAS:
        if re.search(r"\b" + re.escape(zone) + r"\b", headline, re.I):
            return zone
    via = re.search(r"\b(?:via|viale|corso|piazza|borgata)\s+[A-Za-zÀ-ÿ0-9 .'\-/]{3,60}", headline, re.I)
    return via.group(0).strip()[:90] if via else ""


def classify_seller(source: str, source_type: str, url: str, signals: Signals | None) -> str:
    host = (urllib.parse.urlsplit(url).hostname or "").removeprefix("www.")
    if source_type == "ASTE":
        return "Asta_Giudiziaria"
    if source_type == "AGENZIA" or host in AGENCY_HOSTS:
        return "Agenzia_Verificata"
    if signals:
        _, _, _, _, agency = _property_values(signals)
        if agency or re.search(r"\bP\.?\s*IVA\s*[:\s]*\d{11}\b", " ".join(signals.content), re.I):
            return "Agenzia_Verificata"
    if "CasaDaPrivato" in source or source_type == "IDEALISTA_TOOLS_EXPORT":
        return "Privato_Dichiarato" if not signals or not agency else "Agenzia_Verificata"
    return "Da_Verificare"


def contact_state(nature: str, source: str, permission: str,
                  phone_public: bool, ban: bool = False) -> str:
    if ban or permission == "NO PROPOSTE COMMERCIALI" or "CasaDaPrivato" in source:
        return "Divieto_Esplicito"
    if nature == "Agenzia_Verificata":
        return "Agenzia_Collega"
    if nature == "Privato_Dichiarato":
        return "Privato_Con_Recapito" if phone_public else "Privato_Senza_Telefono"
    return "Da_Verificare"


def inspect_html(html: str, source: str, source_type: str, url: str,
                 phone_public: bool = False) -> dict:
    p = Signals()
    p.feed(html[:1_000_000])
    town, location_status = valida_comune(p)
    contract = is_vendita(p)
    nature = classify_seller(source, source_type, url, p)
    ban = bool(BAN.search(" ".join(p.content)))
    _, _, _, active, _ = _property_values(p)
    return {
        "verified_town": town,
        "commune_status": location_status,
        "contract_status": contract,
        "nature": nature,
        "contact_status": contact_state(nature, source, "", phone_public, ban),
        "explicit_ban": ban,
        "micro_zone": extract_microzone(p),
        "detail_verified": True,
        "active_confirmed": active and contract == "Vendita" and location_status == "Verificato",
    }


def enrich_sources(parts: list[dict], downloader=None, per_host: int = 8,
                   sleep=time.sleep) -> dict:
    """Visit a small number of allowed individual agency pages per scheduled run.

    If robots cannot be verified or a page fails, record INCONCLUSIVE, not
    'property sold' or a verified town. Public portal details are not fetched.
    """
    if downloader is None:
        def downloader(url):
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
            with urllib.request.urlopen(req, timeout=8) as response:
                if urllib.parse.urlsplit(response.geturl()).hostname != urllib.parse.urlsplit(url).hostname:
                    raise ValueError("cross-origin redirect")
                return response.read(1_000_000).decode("utf-8", "replace")
    robots, counts, checked = {}, {}, 0
    for part in parts:
        for row in part.get("listings", []):
            row["detail_verified"] = False
            row["active_confirmed"] = False
            row["commune_status"] = "Comune_Da_Verificare"
            row["contract_status"] = "Contratto_Da_Verificare"
            source = row.get("source", "")
            url = row.get("url", "")
            host = (urllib.parse.urlsplit(url).hostname or "").lower().removeprefix("www.")
            row["nature"] = classify_seller(source, row.get("source_type", ""), url, None)
            row["contact_status"] = contact_state(row["nature"], source, row.get("contact_permission",""), False)
            if row.get("stale") or host not in DETAIL_HOSTS or counts.get(host, 0) >= per_host:
                continue
            if host not in robots:
                try:
                    rules = urllib.robotparser.RobotFileParser()
                    rules.parse(downloader("https://" + host + "/robots.txt").splitlines())
                    robots[host] = rules
                except Exception:
                    robots[host] = None
            rule = robots[host]
            if rule is None or not rule.can_fetch(UA, url):
                continue
            counts[host] = counts.get(host, 0) + 1
            try:
                detail = inspect_html(downloader(url), source, row.get("source_type", ""), url)
                row.update(detail)
                checked += 1
            except Exception:
                row["detail_error"] = "SCHEDA_NON_VERIFICABILE"
            sleep(0.25)
    return {"parts": parts, "checked": checked,
            "attempted": sum(counts.values()),
            "allowed_hosts": list(sorted(DETAIL_HOSTS))}


def main() -> int:
    import argparse
    from pathlib import Path
    p = argparse.ArgumentParser()
    p.add_argument("--input-dir", type=Path, required=True)
    p.add_argument("--max-per-host", type=int, default=8)
    args = p.parse_args()
    parts = []
    for path in sorted(args.input_dir.rglob("*.json")):
        if path.name in ("inventory.json", "sitemaps.json"):
            parts.append((path, json.loads(path.read_text(encoding="utf-8"))))
    results = enrich_sources([entry for _, entry in parts], per_host=max(0, min(args.max_per_host, 10)))
    for path, entry in parts:
        path.write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"CASE247_SEMANTIC attempted={results['attempted']} parsed={results['checked']} (no personal contacts stored)")


if __name__ == "__main__":
    raise SystemExit(main())
