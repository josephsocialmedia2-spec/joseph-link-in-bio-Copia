#!/usr/bin/env python3
"""Import a user-authorized idealista/tools CSV/XLSX export into CASE247 safely.

This is NOT an idealista API client. No login, scraping or hidden-phone retrieval.
The user obtains an export with their own authorized idealista/tools access.
Personal phone numbers, names and emails are NEVER written into output JSON.
"""
from __future__ import annotations

import argparse
import csv
 import io
import json
import re
import unicodedata
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROME = ZoneInfo("Europe/Rome")
ALLOWED = ("Avigliana", "Sant'Ambrogio di Torino", "Almese", "Condove")
HOST_LIMIT = 2500
NAMES = {
    "Avigliana": {"avigliana"},
    "Sant'Ambrogio di Torino": {"santambrogioditorino", "santambrogio", "santambrogioditorino"},
    "Almese": {"almese"},
    "Condove": {"condove"},
}
ALIASES = {
    "town": ("comune", "citta", "localita", "municipio"),
    "url": ("url", "link annuncio", "url annuncio", "link all annuncio", "annuncio", "collegamento annuncio", "link"),
    "crosspost": ("altri portali", "altri siti", "link altri siti", "link su altri siti", "altri annunci", "link fonti", "altre pubblicazioni", "url altri portali"),
    "title": ("titolo", "tipo immobile", "tipologia"),
    "street": ("indirizzo", "via", "indirizzo immobile"),
    "price": ("prezzo", "prezzo euro", "prezzo vendita", "prezzo attuale", "prezzo corrente"),
    "sqm": ("mq", "m2", "metri quadrati", "superficie", "superficie mq"),
    "published": ("data pubblicazione", "pubblicato", "data annuncio", "data ultimo aggiornamento"),
    "phone": ("telefono", "numero telefono", "cellulare", "numero di telefono del proprietario", "telefono proprietario"),
    "kind": ("operazione", "tipo operazione", "vendita affitto", "transazione"),
    "reference": ("id annuncio", "id immobile", "riferimento", "codice annuncio"),
}
URL_RE = re.compile(r"https?://[^\s<>'\";,|]+", re.I)
DIGIT = re.compile(r"\d")


def norm(text: object) -> str:
    raw = unicodedata.normalize("NFKD", str(text or "").casefold())
    raw = "".join(c for c in raw if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", raw).split())


def canonical_url(url: str) -> str:
    try:
        parts = urllib.parse.urlsplit(str(url).strip())
        if parts.scheme not in ("https", "http") or not parts.hostname or parts.username or parts.password:
            return ""
        host = parts.hostname.casefold()
        if host in ("localhost", "127.0.0.1") or host.endswith(".local"):
            return ""
        return urllib.parse.urlunsplit(("https", host.removeprefix("www."), parts.path.rstrip("/") or "/", "", ""))
    except (ValueError, TypeError):
        return ""


def town_for(value: str) -> str:
    raw = norm(value).replace(" ", "")
    found = [town for town, names in NAMES.items() if raw in names]
    return found[0] if len(found) == 1 else ""


def _number(value: str) -> int | None:
    if not value:
        return None
    value = re.sub(r"[€\s]", "", str(value))
    if re.fullmatch(r"\d{1,8}(?:[.,]\d{3})*", value):
        return int(value.replace(".", "").replace(",", ""))
    if re.fullmatch(r"\d{1,7}[.,]\d{1,2}", value):
        # For a surface, 75.5 -> 76; caller decides what is meaningful.
        return int(round(float(value.replace(",", "."))))
    return None


def public_label(value: str, limit: int = 160) -> str:
    """Redact numbers/emails that might appear in free-text labels."""
    value = re.sub(r"(?i)[\w.+-]+@[\w.-]+\.[a-z]{2,}", "[EMAIL]", value)
    value = re.sub(r"(?<!\d)(?:\+?\d[\d .-]{6,}\d)(?!\d)", "[TELEFONO]", value)
    return value.replace("<", "").replace(">", "")[:limit]


def csv_rows(path: Path) -> list[list[str]]:
    if path.stat().st_size > 6_000_000:
        raise ValueError("CSV export too large")
    content = path.read_text(encoding="utf-8-sig")
    try:
        dialect = csv.Sniffer().sniff(content[:8192], delimiters=";,\t")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ";" if content.splitlines() and content.splitlines()[0].count(";") > content.splitlines()[0].count(",") else ","
    return list(csv.reader(io.StringIO(content), delimiter=delimiter))[:HOST_LIMIT+20]


def _col_index(cell_ref: str) -> int:
    match = re.match(r"([A-Z]+)", cell_ref.upper())
    if not match:
        return -1
    val = 0
    for letter in match.group(1):
        val = val * 26 + ord(letter) - 64
    return val - 1


def xlsx_rows(path: Path) -> list[list[str]]:
    """Minimal OOXML reader for ordinary user-exported sheets, no macros/formula evaluation."""
    if path.stat().st_size > 8_000_000:
        raise ValueError("XLSX export too large")
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        sheets = sorted(n for n in names if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n))
        if not sheets:
            raise ValueError("No worksheet data in XLSX")
        def read_part(name):
            data = z.read(name)
            if len(data) > 9_000_000 or b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
                raise ValueError("Unsafe or oversized OOXML")
            return ET.fromstring(data)
        shared = []
        if "xl/sharedStrings.xml" in names:
            root = read_part("xl/sharedStrings.xml")
            shared = ["".join(n.text or "" for n in si.iter() if n.tag.rsplit("}",1)[-1]=="t")
                      for si in root if si.tag.rsplit("}",1)[-1]=="si"]
        rows = []
        root = read_part(sheets[0])
        for row in root.iter():
            if row.tag.rsplit("}",1)[-1]!="row":
                continue
            values = []
            for cell in row:
                if cell.tag.rsplit("}",1)[-1]!="c":
                    continue
                col = _col_index(cell.attrib.get("r", ""))
                if col < 0 or col >= 100:
                    continue
                while len(values) <= col:
                    values.append("")
                kind = cell.attrib.get("t")
                v = next((node.text or "" for node in cell if node.tag.rsplit("}",1)[-1]=="v"), "")
                if kind == "s":
                    try:
                        v = shared[int(v)]
                    except (ValueError, IndexError):
                        v = ""
                elif kind == "inlineStr":
                    v = "".join(node.text or "" for node in cell.iter() if node.tag.rsplit("}",1)[-1]=="t")
                values[col] = v
            if any(str(x).strip() for x in values):
                rows.append(values)
            if len(rows) >= HOST_LIMIT + 20:
                break
        return rows


def header_columns(row: list[str]) -> dict[str, int]:
    cells = [norm(x) for x in row]
    result = {}
    for key, names in ALIASES.items():
        for i, name in enumerate(cells):
            if name in names:
                result[key] = i
                break
    return result


def parse_export(path: Path) -> dict:
    if path.suffix.casefold() == ".csv":
        rows = csv_rows(path)
    elif path.suffix.casefold() == ".xlsx":
        rows = xlsx_rows(path)
    else:
        raise ValueError("Only CSV/XLSX exports are accepted")
    header_line, columns = None, {}
    for idx, row in enumerate(rows[:16]):
        found = header_columns(row)
        if "town" in found and "url" in found:
            header_line, columns = idx, found
            break
    if header_line is None:
        raise ValueError("Export must contain both Comune and Link annuncio columns. Review mapping before import.")

    links = {}
    stats = {"rows": 0, "excluded_town": 0, "excluded_without_url": 0,
             "excluded_rental": 0, "imported": 0, "has_phone_field": "phone" in columns}
    def take(row, key):
        pos = columns.get(key)
        return str(row[pos] or "").strip() if pos is not None and len(row) > pos else ""

    for row in rows[header_line+1:]:
        stats["rows"] += 1
        town = town_for(take(row, "town"))
        if not town:
            stats["excluded_town"] += 1
            continue
        kind = norm(take(row, "kind"))
        if any(word in kind.split() for word in ("affitto", "locazione", "rent", "rental")):
            stats["excluded_rental"] += 1
            continue
        urls = [canonical_url(x) for x in URL_RE.findall(take(row,"url"))]
        main_url = next((x for x in urls if x), "")
        if not main_url:
            main_url = canonical_url(take(row,"url"))
        if not main_url:
            stats["excluded_without_url"] += 1
            continue
        extra = [canonical_url(x) for x in URL_RE.findall(take(row, "crosspost"))]
        extra = list(dict.fromkeys(x for x in extra if x and x != main_url))
        price, sqm = _number(take(row, "price")), _number(take(row, "sqm"))
        raw_phone = take(row, "phone")
        phone_status = "PRESENTE_NEL_FILE_DA_VERIFICARE" if DIGIT.search(raw_phone) else "NON_RILEVATO"
        # No raw phone, names, personal emails or free-text messages are emitted.
        item = {
            "town": town, "source": "idealista/tools · esportazione autorizzata",
            "source_type": "IDEALISTA_TOOLS_EXPORT", "url": main_url,
            "title": public_label(take(row, "title")) or "Immobile privato - da verificare",
            "street": public_label(take(row, "street"), 120),
            "price": price, "mq": sqm,
            "last_modified": take(row, "published")[:30],
            "owner_status": "PRIVATO_DA_VERIFICARE",
            "contact_permission": "DA_VERIFICARE BASE GIURIDICA",
            "phone_availability": phone_status,
            "related_urls": extra,
            "crosspost_evidence": "LINK ASSOCIATI NEL REPORT IDEALISTA" if extra else "",
        }
        if main_url in links:
            prev = links[main_url]
            prev["related_urls"] = list(dict.fromkeys(prev["related_urls"] + extra))
        else:
            links[main_url] = item
        stats["imported"] += 1
    return {"as_of_rome": datetime.now(ROME).isoformat(timespec="seconds"),
            "status": "OK", "scope": list(ALLOWED), "type": "IDEALISTA_TOOLS_EXPORT",
            "sources": [{"source": "idealista/tools · esportazione autorizzata",
                        "town": "", "status": "IMPORT_UTENTE", "index_url": "",
                        "reported_count": stats["rows"], "extracted_links": len(links),
                        "source_type": "IDEALISTA_TOOLS_EXPORT"}],
            "listings": list(links.values()), "diagnostics": stats}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--file", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--authorized-export", action="store_true",
                   help="Explicitly acknowledge you possess this export and may process it")
    opt = p.parse_args()
    if not opt.authorized_export:
        p.error("Provide --authorized-export only for your own authorized export")
    report = parse_export(opt.file)
    opt.out.parent.mkdir(parents=True, exist_ok=True)
    opt.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("IDEALISTA_IMPORT records=" + str(len(report["listings"])) +
          " linked_crossposts=" + str(sum(bool(r["related_urls"]) for r in report["listings"])) +
          " phones=REDACTED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
