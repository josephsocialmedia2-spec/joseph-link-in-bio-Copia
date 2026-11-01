#!/usr/bin/env python3
"""CASE247: repository-wide, read-only page inventory. Never sends data externally.
Scans source files in the checked-out Git tree. Records metadata, not credentials.
"""
from __future__ import annotations
import csv
import json
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audit" / "case247"
EXCLUDE = {".git", "node_modules", "vendor", "dist", ".next", ".venv", "__pycache__"}
EXTENSIONS = {".html", ".htm"}
BASE = "https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/"
FORM_HINTS = ("form", "contact", "email", "telefono", "whatsapp", "submit", "invio", "valutaz")

class Analyzer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.capture_title = False
        self.links = []
        self.forms = []
        self.scripts = []
        self.inputs = []
        self.meta_description = None
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "title":
            self.capture_title = True
        if tag == "meta" and d.get("name", "").lower() == "description":
            self.meta_description = (d.get("content") or "")[:220]
        if tag == "form":
            self.forms.append({"method": d.get("method", "get").lower(), "action": (d.get("action") or "")[:180]})
        if tag in ("a", "link") and d.get("href"):
            url = d["href"]
            if url.startswith(("https://", "http://", "/", "#", "../", "./")):
                self.links.append(url[:260])
        if tag == "script" and d.get("src"):
            self.scripts.append(d["src"][:200])
        if tag in ("input", "select", "textarea"):
            name = (d.get("name") or d.get("id") or "")[:80]
            self.inputs.append({"name": name, "type": d.get("type", tag)})
    def handle_endtag(self, tag):
        if tag == "title":
            self.capture_title = False
    def handle_data(self, data):
        if self.capture_title:
            self.title += data

def classify(path):
    p = path.lower()
    if "campagne/case247/" in p or p.startswith("gestione/"):
        return "CASE247_PROJECT", "DA_VERIFICARE"
    if p.startswith("campagne/immobiliare/"):
        return "REALESTATE_LEGACY_OR_PARTNER", "DA_VERIFICARE"
    if p.startswith("campagne/attivita/"):
        return "LOCAL_BUSINESS_OR_CLIENT", "ESCLUSA_AUTO"
    return "OTHER_OR_UNKNOWN", "DA_VERIFICARE"

def scan():
    rows = []
    for file in sorted(ROOT.rglob("*")):
        if not file.is_file() or file.suffix.lower() not in EXTENSIONS:
            continue
        if any(s in EXCLUDE for s in file.relative_to(ROOT).parts):
            continue
        rel = file.relative_to(ROOT).as_posix()
        try:
            raw = file.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        parser = Analyzer()
        try:
            parser.feed(raw)
        except Exception:
            pass
        owner, decision = classify(rel)
        public_path = rel[:-10] if rel.endswith("/index.html") else rel
        if rel == "index.html":
            public_path = ""
        if public_path.endswith("index.html"):
            public_path = public_path[:-10]
        lead_form_candidate = bool(parser.forms) or any(
            any(h in (x["name"] or "").lower() for h in FORM_HINTS)
            for x in parser.inputs
        )
        rows.append({
            "source_path": rel,
            "url": BASE + public_path,
            "title": parser.title.strip()[:200],
            "owner_guess_not_verified": owner,
            "integration_status": decision,
            "forms_count": len(parser.forms),
            "input_fields_count": len(parser.inputs),
            "has_potential_contact_form": lead_form_candidate,
            "has_supabase_reference": "supabase" in raw.lower(),
            "has_meta_reference": "facebook.com" in raw.lower() or "instagram.com" in raw.lower(),
            "has_review_link": "auto-feed/review" in raw,
            "has_seller_radar_reference": "seller radar" in raw.lower(),
            "has_privacy_link": "privacy" in raw.lower(),
            "outbound_link_count": len([v for v in parser.links if v.startswith(("http://", "https://"))]),
            "script_count": len(parser.scripts),
            "forms": parser.forms[:8],
            "requires_manual_review": True,
            "integration_enabled": False
        })
    return rows

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = scan()
    by_group = dict(Counter(x["owner_guess_not_verified"] for x in rows))
    report = {
        "brand": "CASE IN PUBBLICITÀ 24/7",
        "scope": "git checkout, all tracked-and-untracked HTML in checkout (excluded build caches)",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "total_html_pages_found": len(rows),
        "total_potential_forms": sum(bool(x["has_potential_contact_form"]) for x in rows),
        "total_supabase_references": sum(bool(x["has_supabase_reference"]) for x in rows),
        "groups": by_group,
        "note": "URL availability, actual ownership, permissions and live integrations are NOT verified by static scanning.",
        "pages": rows
    }
    (OUT / "repository-inventory.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (OUT / "repository-inventory.csv").open("w", encoding="utf-8-sig", newline="") as file:
        fields = ["source_path", "url", "title", "owner_guess_not_verified", "integration_status", "forms_count", "has_potential_contact_form", "has_supabase_reference", "has_review_link", "has_privacy_link"]
        writer = csv.DictWriter(file, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({k: v for k, v in report.items() if k != "pages"}, ensure_ascii=False))
    if len(rows) < 40:
        raise SystemExit("AUDIT_WARNING: fewer than 40 HTML pages found; check repository checkout")

if __name__ == "__main__":
    main()
