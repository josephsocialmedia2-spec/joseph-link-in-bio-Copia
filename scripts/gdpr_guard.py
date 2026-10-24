#!/usr/bin/env python3
"""Static GDPR preflight: flags technical indicators, NEVER certifies legal compliance."""
import argparse
import csv
import datetime
import html
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "gdpr-reports"
BLOCKING_PATTERNS = {
    "GitHub PAT": r"gh[pousr]_[A-Za-z0-9_]{30,}",
    "AWS access key": r"AKIA[0-9A-Z]{16}",
    "OpenAI-like secret": r"sk-[A-Za-z0-9_-]{30,}",
    "private key": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
}
TRACKING = re.compile(r"(?:googletagmanager\.com|google-analytics\.com|gtag\s*\(|fbq\s*\(|connect\.facebook\.net|tiktok\.com/i18n/pixel|hotjar\.com|clarity\.ms)", re.I)
PRIVACY_HREF = re.compile(r'''href\s*=\s*["'][^"'<>]*(?:privacy-censimento|privacy|informativa)[^"'<>]*["']''', re.I)
URL = re.compile(r"https?://([a-zA-Z0-9.-]+)", re.I)

def count(pattern, value):
    return len(re.findall(pattern, value, flags=re.I))

def title_of(s):
    m = re.search(r"<title(?:\s[^>]*)?>(.*?)</title>", s, flags=re.I | re.S)
    return html.unescape(re.sub(r"<[^>]*>", "", m.group(1))).strip() if m else ""

def category(path):
    s = path.as_posix()
    if s.startswith("campagne/immobiliare/"):
        return "immobiliare"
    if s.startswith("campagne/attivita/"):
        return "attivita"
    if s == "gestione/index.html":
        return "gestionale"
    if s.startswith("privacy-censimento/"):
        return "privacy"
    if s.startswith("compliance/"):
        return "compliance"
    return "servizio"

def get_changed():
    try:
        base = subprocess.check_output(["git", "merge-base", "origin/main", "HEAD"], cwd=ROOT, text=True).strip()
        output = subprocess.check_output(["git", "diff", "--name-only", base, "HEAD"], cwd=ROOT, text=True)
        return {line.strip() for line in output.splitlines() if line.strip().lower().endswith(".html")}
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Non posso determinare il diff PR; controllo tutte le pagine in modalita prudenziale.", file=sys.stderr)
        return None

def scan(path, strict):
    relative = path.relative_to(ROOT).as_posix()
    source = path.read_text(encoding="utf-8", errors="replace")
    privacy_page = category(path.relative_to(ROOT)) == "privacy"
    forms = count(r"<form\b", source)
    fields = count(r"<input\b", source)
    iframes = count(r"<iframe\b", source)
    trackers = len(TRACKING.findall(source))
    thirdparty_scripts = count(r'<script\b[^>]*\bsrc\s*=\s*["\x27]https?://', source)
    js = count(r"<script\b", source)
    privacy_link = bool(PRIVACY_HREF.search(source))
    matched_secrets = [name for name, p in BLOCKING_PATTERNS.items() if re.search(p, source)]
    insecure_form = bool(re.search(r'<form\b[^>]*\baction\s*=\s*["\x27]http://', source, re.I))
    storage = bool(re.search(r"\b(?:localStorage|sessionStorage|indexedDB)\b", source))
    remote = sorted(set(m.group(1).lower() for m in URL.finditer(source)))
    issues = []
    if not privacy_page and not privacy_link:
        issues.append("LINK_PRIVACY_NON_RILEVATO")
    if matched_secrets:
        issues.append("POSSIBILE_SEGRETO_ESPOSTO")
    if insecure_form:
        issues.append("FORM_ACTION_HTTP")
    if trackers:
        issues.append("TRACKING_DA_VERIFICARE")
    if forms:
        issues.append("FORM_TRATTAMENTO_DA_VERIFICARE")
    if storage:
        issues.append("STORAGE_BROWSER_DA_VERIFICARE")
    if thirdparty_scripts:
        issues.append("SCRIPT_REMOTI_DA_VERIFICARE")
    if privacy_page and re.search(r"\bversione preliminare\b|\bbozza\b", source, re.I):
        issues.append("INFORMATIVA_PRELIMINARE")
    blockers = bool(matched_secrets or insecure_form)
    if strict and not privacy_page and not privacy_link:
        blockers = True
    # DO NOT mark a page legally approved based only on technical checks.
    return {
        "file": relative, "category": category(path.relative_to(ROOT)), "title": title_of(source),
        "privacy_link_html": "SI" if privacy_link else "NO",
        "forms": forms, "inputs": fields, "iframes": iframes, "scripts": js,
        "remote_scripts": thirdparty_scripts, "tracker_patterns": trackers,
        "browser_storage": "SI" if storage else "NO",
        "external_hosts": "; ".join(remote[:25]), "issues": "; ".join(issues),
        "technical": "BLOCCANTE" if blockers else ("DA_VERIFICARE" if issues else "NESSUN_SEGNALE_CRITICO"),
        "legal": "VALIDAZIONE_PROFESSIONALE_NON_ACQUISITA",
        "block": blockers
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--changed-only", action="store_true", help="Block changed HTML pages with missing privacy link")
    args = parser.parse_args()
    files = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts and "node_modules" not in p.parts)
    changed = get_changed() if args.changed_only else None
    records = [scan(p, args.changed_only and (changed is None or p.relative_to(ROOT).as_posix() in changed)) for p in files]
    OUT.mkdir(parents=True, exist_ok=True)
    cols = ["file","category","title","privacy_link_html","forms","inputs","iframes","scripts","remote_scripts","tracker_patterns","browser_storage","external_hosts","issues","technical","legal"]
    with (OUT / "audit_landing.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    blocked = [r["file"] for r in records if r["block"]]
    missing = [r["file"] for r in records if "LINK_PRIVACY_NON_RILEVATO" in r["issues"]]
    info = {
        "checked_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "html_count": len(records), "no_privacy_link_count": len(missing),
        "blocking_files": blocked, "changed_html": sorted(changed) if changed is not None else None,
        "legal_status": "NOT_VALIDATED"
    }
    (OUT / "summary.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = [
        "# Joseph GDPR Guard — revisione tecnica",
        "", f"- File HTML scansionati: **{len(records)}**",
        f"- File senza link privacy HTML: **{len(missing)}**",
        f"- File tecnicamente bloccanti per questa esecuzione: **{len(blocked)}**",
        "- Stato giuridico: **NON VALIDATO** (richiede documentazione e professionista qualificato)",
        "", "## File da affrontare", ""
    ]
    summary += [f"- \x60{r['file']}\x60: {r['issues']}" for r in records if r["issues"]]
    summary += ["", "Il test rileva pattern nel sorgente, non attesta consenso, titolarita, legalita della fonte, o il trattamento a valle di WhatsApp/CRM/terze parti."]
    (OUT / "summary.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(json.dumps(info, ensure_ascii=False, indent=2))
    if blocked:
        print("ERROR: correggere o fare revisionare i file bloccanti prima del merge.", file=sys.stderr)
    return 1 if blocked else 0

if __name__ == "__main__":
    sys.exit(main())
