#!/usr/bin/env python3
"""Combine CASE247 public index + permitted sitemap evidence into CSV and XLSX.

Exact URL duplicates are merged; matching town/price/mq is *only* a potential
duplicate flag, never an automatic merge. Contactability is never inferred from
owner claims such as "no agenzie". Workbook written with stdlib OOXML for
reproducible zero-dependency execution on GitHub runners.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import urllib.parse
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from case247_market_lifecycle import load_state, apply_lifecycle, write_state
from case247_market_semantics import BAN, MICRO_AREAS, classify_seller, contact_state

TOWNS = ("Avigliana", "Sant'Ambrogio di Torino", "Almese", "Condove")
ROME = ZoneInfo("Europe/Rome")
HEADERS = (
    "Comune", "Fonte", "URL fonte", "Titolo", "Via", "Prezzo EUR", "Superficie mq",
    "Venditore", "Contattabilita", "Possibile duplicato", "Link annuncio",
    "Ultimo aggiornamento", "Esito verifica", "Categoria mercato", "Stato rilevazione",
    "Telefono nel report", "Altri link associati", "Incrocio con altra fonte",
    "Natura_Inserzionista", "Stato_Contatto_Commerciale", "Micro_Zona_Indirizzo",
    "Stato_Contratto", "Stato_Comune", "Data_Prima_Rilevazione",
    "Data_Ultima_Verifica", "Giorni_Sul_Mercato", "Priorita_Monitoraggio",
    "Stato_Attivita", "Possibile_Duplicato",
)
SOURCE_HEADERS = ("Fonte", "Comune", "Esito", "Totale dichiarato", "Link estratti", "URL indice")


def normalize_url(url: str) -> str:
    try:
        u = urllib.parse.urlsplit(str(url).strip())
        if u.scheme not in ("https", "http") or not u.hostname or u.username or u.password:
            return ""
        host = u.hostname.lower().removeprefix("www.")
        # Keep listing identifiers when used in query params.
        key_values = urllib.parse.parse_qsl(u.query)
        keep = {"id", "annuncio", "listingid", "itemid", "pid", "p"}
        cleaned = urllib.parse.urlencode(sorted((k, v) for k, v in key_values if k.casefold() in keep))
        return urllib.parse.urlunsplit(("https", host, u.path.rstrip("/") or "/", cleaned, ""))
    except ValueError:
        return ""


def _number(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and value > 0:
        return int(value)
    if isinstance(value, str) and re.fullmatch(r"\d{1,8}(?:[.,]\d{3})*", value.strip()):
        return int(value.replace(".", "").replace(",", ""))
    return None


def _candidate_key(row: dict) -> tuple | None:
    town = row["town"]
    price = row.get("price")
    size = row.get("mq")
    if price is None or size is None:
        return None
    # Primary purpose: identify collisions for manual review, never dedup on it.
    return (town, price, size)


def cached_rows(sources: list[dict], history: list[dict], now: datetime | None = None) -> list[dict]:
    """Retain earlier public URLs only when the source is temporarily offline.

    These are explicitly HISTORICAL, not confirmed current sale listings.
    A robots disallow is never overridden by a cache.
    """
    now = now or datetime.now(ROME)
    offline = {s["source"] for s in sources if s.get("status") in (
        "ROBOTS_NON_VERIFICABILE", "FONTE_NON_DISPONIBILE",
    )}
    selected = {}
    for entry in history:
        try:
            at = datetime.fromisoformat(entry.get("as_of_rome", ""))
            if at.tzinfo is None:
                continue
            elapsed = now - at.astimezone(ROME)
            if elapsed < timedelta(0) or elapsed > timedelta(hours=72):
                continue
        except (TypeError, ValueError):
            continue
        successful = {s.get("source") for s in entry.get("sources", []) if s.get("status") == "OK"}
        for row in entry.get("listings", []):
            for name in row.get("sources", []):
                if name not in offline or name not in successful:
                    continue
                key = (name, row.get("url"))
                previous = selected.get(key)
                if previous is None or previous["as_of"] < at:
                    selected[key] = {"row": row, "source": name, "as_of": at}
    result = []
    for item in selected.values():
        row, name = item["row"], item["source"]
        if row.get("town") not in TOWNS or not normalize_url(row.get("url", "")):
            continue
        result.append({
            "town": row["town"], "url": row["url"],
            "title": row.get("title", "Annuncio da riverificare"),
            "street": row.get("street", ""), "price": row.get("price"),
            "mq": row.get("mq"), "source": name,
            "source_type": "AGENZIA" if row.get("market_segment") == "AGENZIA" else "",
            "owner_status": row.get("owner_status", "DA_VERIFICARE"),
            "contact_permission": row.get("contact_permission", "DA_VERIFICARE"),
            "last_modified": row.get("last_modified", ""),
            "stale": True,
        })
    return result


def merge(parts: list[dict], history: list[dict] | None = None, now: datetime | None = None,
          lifecycle: dict | None = None) -> dict:
    all_rows = []
    sources = []
    for part in parts:
        for entry in part.get("sources", []):
            sources.append({
                "source": entry.get("source", "sitemap"),
                "town": entry.get("town", ""),
                "status": entry.get("status", "NON_DISPONIBILE"),
                "reported_count": entry.get("reported_count"),
                "extracted_links": entry.get("extracted_links", len(entry.get("listings", []))),
                "index_url": entry.get("index_url", ""),
                "source_type": entry.get("source_type", ""),
            })
        all_rows.extend(part.get("listings", []))

    if history:
        all_rows.extend(cached_rows(sources, history, now))
    grouped = {}
    explicit_relations = []
    for row in all_rows:
        town = row.get("town")
        url = normalize_url(row.get("url", ""))
        if town not in TOWNS or not url:
            continue
        key = url
        name = str(row.get("source") or
                   " | ".join(row.get("sources", [])) or "Fonte pubblica")[:160]
        # Relations may be trusted ONLY when explicitly present in a user-authorized
        # idealista/tools export. Never infer equivalence from price/mq alone.
        related = [normalize_url(link) for link in row.get("related_urls", [])
                   if isinstance(link, str)]
        related = list(dict.fromkeys(link for link in related if link and link != url))
        if row.get("source_type") == "IDEALISTA_TOOLS_EXPORT" and related:
            explicit_relations.append((url, town, related))
        else:
            related = []
        if key not in grouped:
            grouped[key] = {
                "town": town, "url": url, "title": row.get("title", "") or "Annuncio senza titolo",
                "street": row.get("street", "") or "", "price": _number(row.get("price")),
                "mq": _number(row.get("mq")), "sources": [name],
                "source_urls": [url] + related,
                "related_urls": related,
                "linked_matches": [],
                "phone_availability": row.get("phone_availability", "NON_DISPONIBILE"),
                "crosspost_evidence": "LINK ASSOCIATI NEL REPORT IDEALISTA" if related else "",
                "owner_status": row.get("owner_status", "DA_VERIFICARE"),
                "contact_permission": "DA_VERIFICARE",
                "last_modified": row.get("last_modified", ""),
                "possibly_duplicate": False,
                "verification": "DA RIVERIFICARE: FONTE TEMPORANEAMENTE NON DISPONIBILE"
                    if row.get("stale") else "DA_VERIFICARE SU FONTE ORIGINALE",
                "stale": bool(row.get("stale", False)),
                "detail_verified": bool(row.get("detail_verified", False)),
                "active_confirmed": bool(row.get("active_confirmed", False)),
                "verified_town": row.get("verified_town", ""),
                "commune_status": row.get("commune_status", "Comune_Da_Verificare"),
                "contract_status": row.get("contract_status", "Contratto_Da_Verificare"),
                "nature": row.get("nature") or classify_seller(name, row.get("source_type", ""), url, None),
                "micro_zone": row.get("micro_zone", ""),
                "explicit_ban": bool(row.get("explicit_ban") or BAN.search(str(row.get("title", "")))),
                "market_segment": "AGENZIA" if row.get("source_type") == "AGENZIA" or
                    "AGENZIA" in str(row.get("owner_status", "")) else
                    "PRIVATO - DA VERIFICARE" if row.get("source_type") == "IDEALISTA_TOOLS_EXPORT" else
                    "PORTALE PRIVATI - DA VERIFICARE" if name == "CasaDaPrivato" else
                    row.get("market_segment") or "MERCATO - DA VERIFICARE",
            }
        else:
            g = grouped[key]
            if g["town"] != town:
                g["verification"] = "CONFLITTO_COMUNE: VERIFICA MANUALE"
            if not row.get("stale"):
                g["stale"] = False
                if not g["verification"].startswith("CONFLITTO_"):
                    g["verification"] = "DA_VERIFICARE SU FONTE ORIGINALE"
            if row.get("source_type") == "AGENZIA" or "AGENZIA" in str(row.get("owner_status", "")):
                g["market_segment"] = "AGENZIA"
                # Never silently change municipality.
            if name not in g["sources"]:
                g["sources"].append(name)
            for related_url in related:
                if related_url not in g["related_urls"]:
                    g["related_urls"].append(related_url)
                if related_url not in g["source_urls"]:
                    g["source_urls"].append(related_url)
            if related:
                g["crosspost_evidence"] = "LINK ASSOCIATI NEL REPORT IDEALISTA"
            if row.get("phone_availability") == "PRESENTE_NEL_FILE_DA_VERIFICARE":
                g["phone_availability"] = "PRESENTE_NEL_FILE_DA_VERIFICARE"
            if row.get("explicit_ban") or BAN.search(str(row.get("title", ""))):
                g["explicit_ban"] = True
            if row.get("nature") == "Agenzia_Verificata" or row.get("source_type") == "AGENZIA":
                g["nature"] = "Agenzia_Verificata"
            if row.get("micro_zone") and not g.get("micro_zone"):
                g["micro_zone"] = row["micro_zone"]
            if row.get("detail_verified"):
                g["detail_verified"] = True
                g["active_confirmed"] = bool(row.get("active_confirmed"))
                g["verified_town"] = row.get("verified_town", "")
                g["commune_status"] = row.get("commune_status", "Comune_Da_Verificare")
                g["contract_status"] = row.get("contract_status", "Contratto_Da_Verificare")
            for field in ("street", "last_modified"):
                if not g.get(field) and row.get(field):
                    g[field] = row[field]
            for field in ("price", "mq"):
                if g.get(field) is None and _number(row.get(field)) is not None:
                    g[field] = _number(row[field])
            if g["title"] == "Annuncio senza titolo" and row.get("title"):
                g["title"] = row["title"]

        g = grouped[key]
        if "CasaDaPrivato" in name or row.get("contact_permission") == "NO PROPOSTE COMMERCIALI":
            g["contact_permission"] = "NO PROPOSTE COMMERCIALI"
        elif g["contact_permission"] != "NO PROPOSTE COMMERCIALI":
            # Never infer YES from 'privato' or 'no agenzie'.
            g["contact_permission"] = "DA_VERIFICARE BASE GIURIDICA"
    # Cross-post comparison: the linked URL must also be independently present
    # in the current dataset to count as an observed overlap.
    for primary, town, links in explicit_relations:
        first = grouped.get(primary)
        if not first or first["town"] != town:
            continue
        for link in links:
            other = grouped.get(link)
            if not other or other["town"] != town:
                continue
            if link not in first["linked_matches"]:
                first["linked_matches"].append(link)
            if primary not in other["linked_matches"]:
                other["linked_matches"].append(primary)
            first["possibly_duplicate"] = True
            other["possibly_duplicate"] = True
            first["crosspost_evidence"] = "LINK INCROCIATO: REPORT IDEALISTA + FONTE"
            other["crosspost_evidence"] = "LINK INCROCIATO: REPORT IDEALISTA + FONTE"
    buckets = defaultdict(list)
    for g in grouped.values():
        k = _candidate_key(g)
        if k:
            buckets[k].append(g)
    for items in buckets.values():
        if len(items) > 1:
            for item in items:
                item["possibly_duplicate"] = True
    records = sorted(grouped.values(), key=lambda x: (TOWNS.index(x["town"]), x["title"].casefold(), x["url"]))
    for rec in records:
        # Never silently recategorize an ambiguous address to the URL's town.
        if rec["commune_status"] == "Verificato" and rec["verified_town"] != rec["town"]:
            rec["commune_status"] = "Fuori_Perimetro"
        if (rec["contract_status"] == "Contratto_Da_Verificare" and
            isinstance(rec.get("price"), int) and 0 < rec["price"] < 15000):
            rec["contract_status"] = "Prezzo_Da_Verificare"
        if not rec.get("micro_zone"):
            label = str(rec.get("title", ""))
            rec["micro_zone"] = next((z for z in MICRO_AREAS if
                                      re.search(r"\b" + re.escape(z) + r"\b", label, re.I)), "")
        rec["nature"] = ("Agenzia_Verificata" if rec["market_segment"] == "AGENZIA" else
                          "Privato_Dichiarato" if rec["nature"] == "Privato_Dichiarato" or
                          rec["market_segment"] in ("PORTALE PRIVATI - DA VERIFICARE",
                                                     "PRIVATO - DA VERIFICARE") else
                          rec["nature"])
        rec["stato_contatto"] = contact_state(rec["nature"], " | ".join(rec["sources"]),
                          rec["contact_permission"], bool(rec.get("phone_public_verified", False)),
                          bool(rec.get("explicit_ban", False)))
        if rec["stato_contatto"] == "Divieto_Esplicito":
            rec["contact_permission"] = "NO PROPOSTE COMMERCIALI"
        rec["verified_scope"] = (rec["commune_status"] == "Verificato" and
                                 rec["verified_town"] == rec["town"] and
                                 rec["contract_status"] == "Vendita" and not rec["stale"])
    now = now or datetime.now(ROME)
    lifecycle_state = apply_lifecycle(records, lifecycle or {}, now)
    counts = {town: sum(r["town"] == town and r["verified_scope"] for r in records) for town in TOWNS}
    indexed_counts = {town: sum(r["town"] == town for r in records) for town in TOWNS}
    source_outages = sum(s["status"] not in ("OK", "SOLO_CONSULTAZIONE", "IMPORT_UTENTE") for s in sources)
    return {
        "as_of_rome": now.isoformat(timespec="seconds"),
        "scope": list(TOWNS), "status": "PARZIALE" if source_outages else "OK",
        "listing_count": len(records),
        "verified_listing_count": sum(counts.values()),
        "possible_duplicate_count": sum(r["possibly_duplicate"] for r in records),
        "crosspost_records": sum(bool(r["related_urls"]) for r in records),
        "independent_crosspost_matches": sum(bool(r["linked_matches"]) for r in records),
        "counts": counts, "indexed_counts": indexed_counts, "source_errors": source_outages,
        "sources": sources, "listings": records, "lifecycle": lifecycle_state,
    }


def load_parts(directory: Path) -> list[dict]:
    parts = []
    for path in sorted(directory.rglob("*.json")):
        # Ignore already consolidated outputs, if the input path overlaps output dir.
        if path.name not in ("inventory.json", "sitemaps.json"):
            continue
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(value, dict) and isinstance(value.get("listings"), list):
                parts.append(value)
        except (OSError, ValueError):
            continue
    return parts


def render_markdown(result: dict) -> str:
    lines = [
        "## CASE247 · Inventario pubblico multi-fonte dei quattro comuni",
        f"Rilevazione {result['as_of_rome']}; **link indicizzati: {result['listing_count']}**; "
        f"**vendite e comuni verificati: {result['verified_listing_count']}**.",
        "Le fonti possono essere parziali. Un link indicizzato NON conferma comune, vendita o attività.",
        "**Nessun annuncio è automaticamente un contatto commerciale acquisibile.** "
        "Un prezzo e una superficie uguali non dimostrano che due annunci siano lo stesso immobile.",
        "",
    ]
    for town in TOWNS:
        lines.append(f"### {town} — {result['counts'][town]} verificati / "
                     f"{result['indexed_counts'][town]} indicizzati")
        for row in (r for r in result["listings"] if r["town"] == town):
            lines.append(
                f"- [{row['title']}]({row['url']}) · {', '.join(row['sources'])}"
                + (" · ARCHIVIO, DA RIVERIFICARE" if row.get("stale") else "")
                + (" · COMUNE/CONTRATTO NON VERIFICATO" if not row.get("verified_scope") else "")
                + (" · " + row["priorita_monitoraggio"] if row.get("priorita_monitoraggio") == "Invenduto_Oltre_90gg" else "")
                + (" · possibili pubblicazioni multiple: " + ", ".join(row["related_urls"][:5]) if row["related_urls"] else "")
                + (" · potenziale duplicato" if row["possibly_duplicate"] else "")
                + (" · **non usare per proposte commerciali**" if row["contact_permission"] == "NO PROPOSTE COMMERCIALI" else "")
            )
        lines.append("")
    lines.append("### Diagnostica delle fonti")
    for source in result["sources"]:
        lines.append(
            f"- {source['source']} {source['town']}: {source['status']}, link {source['extracted_links']}, "
            f"totale pagina {source['reported_count'] if source['reported_count'] is not None else 'N/D'}."
        )
    lines += ["", "**Incrocio tra portali:** i collegamenti attribuiti allo stesso immobile in un export idealista/tools sono associati come evidenza, non cancellati. Comune+prezzo+mq rimangono solo un'indicazione di possibile doppione.",
              "**Recapiti:** l'eventuale presenza di un numero nell'export richiede verifica della sua pubblicità e della base giuridica per l'uso; nessun numero è incluso negli artifact.",
              "Le aste PVP sono una fonte ufficiale di consultazione separata, non un catalogo acquisito automaticamente e non annunci privati.",
              "Il file Excel completo e i JSON della scansione sono negli artifact GitHub dell'esecuzione."]
    return "\n".join(lines) + "\n"


def _cell(col: int, row: int, value, style: int = 0) -> str:
    colname = ""
    x = col
    while x:
        x, digit = divmod(x-1, 26)
        colname = chr(65+digit) + colname
    ref = f"{colname}{row}"
    if value is None:
        value = ""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
    raw = str(value)
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{escape(raw)}</t></is></c>'


def _sheet_xml(headers: tuple, rows: list[list], width: list[int]) -> bytes:
    ncol = len(headers)
    coldefs = "".join(f'<col min="{i+1}" max="{i+1}" width="{w}" customWidth="1"/>' for i, w in enumerate(width))
    lines = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
             '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>',
             '<cols>' + coldefs + '</cols>', '<sheetData>']
    lines.append('<row r="1" ht="27" customHeight="1">' +
                 "".join(_cell(j+1, 1, h, 1) for j, h in enumerate(headers)) + '</row>')
    for i, record in enumerate(rows, 2):
        lines.append(f'<row r="{i}">' +
                     "".join(_cell(j+1, i, value, 2 if isinstance(value, (int,float)) else 0)
                             for j, value in enumerate(record)) + '</row>')
    lines += ['</sheetData>',
              f'<autoFilter ref="A1:{_col(ncol)}{max(1,len(rows)+1)}"/>',
              '</worksheet>']
    return "\n".join(lines).encode("utf-8")


def _col(n: int) -> str:
    out = ""
    while n:
        n, digit = divmod(n-1, 26)
        out = chr(65+digit)+out
    return out


def write_xlsx(data: dict, output: Path) -> None:
    """Write a portable, correctly structured XLSX without third-party dependencies."""
    listings = []
    for row in data["listings"]:
        listings.append([
            row["town"], ", ".join(row["sources"]), ", ".join(row["source_urls"]),
            row["title"], row["street"], row["price"], row["mq"], row["owner_status"],
            row["contact_permission"], "VERIFICARE" if row["possibly_duplicate"] else "",
            row["url"], row["last_modified"], row["verification"], row["market_segment"],
            "ARCHIVIO 72H" if row.get("stale") else "SCANSIONE CORRENTE",
            row["phone_availability"], ", ".join(row["related_urls"]),
            row["crosspost_evidence"],
            row["nature"], row["stato_contatto"], row.get("micro_zone", ""),
            row["contract_status"], row["commune_status"],
            row["data_prima_rilevazione"], row["data_ultima_verifica"],
            row["giorni_sul_mercato"], row["priorita_monitoraggio"],
            "ATTIVO_CONFERMATO" if row.get("active_confirmed") and row.get("detail_verified") else "DA_VERIFICARE",
            "Sì" if row["possibly_duplicate"] else "No",
        ])
    source_rows = [
        [r.get("source"), r.get("town"), r.get("status"), r.get("reported_count"),
         r.get("extracted_links"), r.get("index_url")] for r in data["sources"]
    ]
    overview_rows = [
        [town, data["counts"][town], "Vendite con comune verificato", ""]
        for town in TOWNS
    ] + [
        [town+" · da verificare", data["indexed_counts"][town]-data["counts"][town],
         "Link non conteggiati come immobili confermati", ""]
        for town in TOWNS
    ] + [
        ["TOTALE", data["listing_count"], "Rilevazione parziale; verificare fonti"],
        ["POTENZIALI DOPPIONI", data["possible_duplicate_count"], "Mai eliminati automaticamente"],
        ["FONTI CON PROBLEMI", data["source_errors"], "N/D non equivale a zero immobili"],
        ["ANNUNCI CON LINK INCROCIATI", data["crosspost_records"], "Link indicati nello stesso export idealista/tools"],
        ["INCROCI ANCHE NEL RADAR", data["independent_crosspost_matches"], "Collegamenti riconosciuti su fonti indipendenti"],
    ]
    overview_rows = [list(r) + [""]*(4-len(r)) for r in overview_rows]
    overview_rows.extend([
        ["COMUNE", "NATURA_INSERZIONISTA", "FASCIA_PERMANENZA", "NUMERO_ANNUNCI"],
    ])
    # All combinations, including zeros, make territorial gaps visible.
    groups = ("Agenzia_Verificata", "Privato_Dichiarato", "Da_Verificare")
    bands = ("< 30 gg", "30-90 gg", "> 90 gg")
    for town in TOWNS:
        for nature in groups:
            for band in bands:
                n = sum(1 for row in data["listings"]
                        if row["town"] == town and row["verified_scope"] and
                           row["nature"] == nature and row["fascia_permanenza"] == band)
                overview_rows.append([town, nature, band, n])
    sheets = [
        ("Annunci", HEADERS, listings, [25,24,38,46,28,16,16,33,35,23,53,22,35,28,24,30,55,48,
                                       26,30,32,25,27,24,24,22,28,25,23]),
        ("Fonti", SOURCE_HEADERS, source_rows, [28,26,30,21,19,64]),
        ("Riepilogo", ("Comune / KPI","Valore","Interpretazione","Totale"), overview_rows, [32,30,53,22]),
    ]
    content_types = ['<?xml version="1.0" encoding="UTF-8"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ]
    for ix in range(1, len(sheets)+1):
        content_types.append(f'<Override PartName="/xl/worksheets/sheet{ix}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
    content_types.append("</Types>")
    workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + "".join(f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i,(name,*_) in enumerate(sheets,1)) + '</sheets></workbook>'
    workbook_rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheets)+1)) + f'<Relationship Id="rId{len(sheets)+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    styles = ('<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
              '<fonts count="2"><font><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font></fonts>'
              '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17365D"/><bgColor indexed="64"/></patternFill></fill></fills>'
              '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
              '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
              '<cellXfs count="3"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
              '</styleSheet>')
    root_rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", "\n".join(content_types))
        package.writestr("_rels/.rels", root_rels)
        package.writestr("xl/workbook.xml", workbook)
        package.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        package.writestr("xl/styles.xml", styles)
        for i, (_, headers, rows, widths) in enumerate(sheets, 1):
            package.writestr(f"xl/worksheets/sheet{i}.xml", _sheet_xml(headers, rows, widths))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inputs-dir", type=Path, default=Path("_market_parts"))
    ap.add_argument("--out", type=Path, default=Path("_market"))
    ap.add_argument("--history-dir", type=Path, default=None)
    ap.add_argument("--idealista-export", type=Path, default=None,
                    help="Optional user-authorized CSV or XLSX export to merge privately")
    ap.add_argument("--authorized-export", action="store_true",
                    help="Explicitly confirm the right to process the supplied file")
    args = ap.parse_args()
    if args.idealista_export and not args.authorized_export:
        ap.error("--idealista-export requires --authorized-export")
    args.out.mkdir(parents=True, exist_ok=True)
    history = []
    if args.history_dir and args.history_dir.exists():
        for file in args.history_dir.rglob("inventory.json"):
            try:
                item = json.loads(file.read_text(encoding="utf-8"))
                if isinstance(item.get("listings"), list):
                    history.append(item)
            except (OSError, ValueError):
                continue
    parts = load_parts(args.inputs_dir)
    if args.idealista_export:
        from case247_idealista_export import parse_export
        parts.append(parse_export(args.idealista_export))
    result = merge(parts, history=history, lifecycle=load_state(args.history_dir))
    write_state(args.out / "lifecycle.json", result["lifecycle"])
    # History itself is stored as a separate artifact; the public report needs
    # no duplicate nested state dictionary.
    del result["lifecycle"]
    (args.out/"inventory.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out/"market.md").write_text(render_markdown(result), encoding="utf-8")
    with (args.out/"inventory.csv").open("w", encoding="utf-8-sig", newline="") as fd:
        wr = csv.writer(fd, delimiter=";")
        wr.writerow(HEADERS)
        for row in result["listings"]:
            wr.writerow([
                row["town"], ", ".join(row["sources"]), ", ".join(row["source_urls"]),
                row["title"], row["street"], row["price"], row["mq"], row["owner_status"],
                row["contact_permission"], "VERIFICARE" if row["possibly_duplicate"] else "",
                row["url"], row["last_modified"], row["verification"], row["market_segment"],
                "ARCHIVIO 72H" if row.get("stale") else "SCANSIONE CORRENTE",
                row["phone_availability"], ", ".join(row["related_urls"]),
                row["crosspost_evidence"],
                row["nature"], row["stato_contatto"], row.get("micro_zone", ""),
                row["contract_status"], row["commune_status"],
                row["data_prima_rilevazione"], row["data_ultima_verifica"],
                row["giorni_sul_mercato"], row["priorita_monitoraggio"],
                "ATTIVO_CONFERMATO" if row.get("active_confirmed") and row.get("detail_verified") else "DA_VERIFICARE",
                "Sì" if row["possibly_duplicate"] else "No",
            ])
    file = args.out / f"CASE247_Immobili_4_Comuni_{datetime.now(ROME).date().isoformat()}.xlsx"
    write_xlsx(result, file)
    archived = sum(bool(r.get("stale")) for r in result["listings"])
    print(f"CASE247_CONSOLIDATED links={result['listing_count']} verified={result['verified_listing_count']} archived_recheck={archived} potential_duplicates={result['possible_duplicate_count']} crossposts={result['crosspost_records']} matched={result['independent_crosspost_matches']} sources_with_issues={result['source_errors']} xlsx={file.name}")


if __name__ == "__main__":
    main()
