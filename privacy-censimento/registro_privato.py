#!/usr/bin/env python3
"""REAL MEDIA PRO: local-only request / withdrawal ledger. No paid APIs or network.

The SQLite database must live OUTSIDE the public GitHub repository. It is not
encrypted by this program: protect the device/drive and private directory.
Marketing consent registration is blocked until the central privacy gate
explicitly reports that a verified privacy process is active.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
POLICY = REPO / "branding" / "conversion-cta.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_location(arg: str | None) -> Path:
    value = arg or os.environ.get("RMP_PRIVATE_DB")
    if value:
        result = Path(value).expanduser().resolve()
    elif os.name == "nt":
        home = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
        result = (Path(home) / "REAL_MEDIA_PRO" / "privacy" / "registro.sqlite3").resolve()
    else:
        result = (Path.home() / ".local" / "share" / "real-media-pro" / "privacy" / "registro.sqlite3").resolve()
    if not result.name.endswith(".sqlite3"):
        raise ValueError("Use a .sqlite3 file in a private directory")
    try:
        result.relative_to(REPO.resolve())
    except ValueError:
        pass
    else:
        raise ValueError("REFUSED: the privacy register must be OUTSIDE the public GitHub repository")
    return result


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    if os.name != "nt":
        os.chmod(path.parent, 0o700)
    db = sqlite3.connect(str(path))
    if os.name != "nt":
        os.chmod(path, 0o600)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA secure_delete=ON")
    db.executescript("""
      CREATE TABLE IF NOT EXISTS contacts (
        contact TEXT PRIMARY KEY, channel TEXT NOT NULL,
        first_seen TEXT NOT NULL, last_requested TEXT,
        request_closed TEXT
      );
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact TEXT NOT NULL REFERENCES contacts(contact),
        event TEXT NOT NULL, at_utc TEXT NOT NULL,
        channel TEXT, purpose TEXT, notice_version TEXT,
        evidence_sha256 TEXT, proof_location TEXT,
        note TEXT
      );
      CREATE TABLE IF NOT EXISTS suppression (
        contact TEXT PRIMARY KEY,
        at_utc TEXT NOT NULL, channel TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS records_contact_event
        ON records(contact, at_utc, id);
    """)
    return db


def ensure_contact(db: sqlite3.Connection, contact: str, channel: str) -> None:
    if not contact.strip() or len(contact) > 180 or any(ord(ch) < 32 for ch in contact):
        raise ValueError("Enter one valid contact identifier (phone or email)")
    db.execute(
        "INSERT OR IGNORE INTO contacts(contact, channel, first_seen) VALUES(?,?,?)",
        (contact.strip(), channel, utc_now()),
    )


def event(db: sqlite3.Connection, who: str, typ: str, channel: str,
          purpose: str = "", notice: str = "", evidence: str = "",
          proof: str = "", note: str = "") -> None:
    db.execute(
        """INSERT INTO records
        (contact,event,at_utc,channel,purpose,notice_version,evidence_sha256,proof_location,note)
        VALUES(?,?,?,?,?,?,?,?,?)""",
        (who.strip(), typ, utc_now(), channel, purpose, notice, evidence, proof, note),
    )


def marketing_gate() -> bool:
    try:
        cfg = json.loads(POLICY.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RuntimeError("Privacy policy config missing or invalid; marketing blocked") from exc
    consent = cfg.get("consent", {})
    return bool(consent.get("enabled") is True
                and consent.get("privacy_notice_status") == "FINAL_VALIDATED"
                and cfg.get("status") == "MARKETING_CONSENT_APPROVED")


def run() -> int:
    parser = argparse.ArgumentParser(
        description="Private REAL MEDIA PRO register: no data ever sent online")
    parser.add_argument("--db", help="Private .sqlite3 file path OUTSIDE GitHub repository")
    sub = parser.add_subparsers(dest="action", required=True)

    for action in ("request", "close", "withdraw", "check", "erase"):
        p = sub.add_parser(action)
        p.add_argument("--contact", required=True, help="Phone or email; stored LOCALLY")
        if action in ("request", "withdraw"):
            p.add_argument("--channel", choices=("whatsapp", "email", "phone"), default="whatsapp")
        if action == "erase":
            p.add_argument("--confirm-erase", action="store_true")

    p = sub.add_parser("consent", help="DISABLED until privacy documentation and approval")
    p.add_argument("--contact", required=True)
    p.add_argument("--channel", choices=("whatsapp", "email"), required=True)
    p.add_argument("--purpose", required=True)
    p.add_argument("--notice-version", required=True)
    p.add_argument("--proof", required=True, help="Path to ORIGINAL received evidence file outside GitHub")
    p = sub.add_parser("due", help="List CLOSED inquiries due for a retention review (no auto deletion)")
    p.add_argument("--days", type=int, default=365)
    sub.add_parser("summary")
    args = parser.parse_args()

    try:
        path = db_location(args.db)
        db = connect(path)
        if args.action == "consent" and not marketing_gate():
            print("BLOCKED: marketing consent is not activated or legally validated.")
            return 2

        with db:
            if args.action == "request":
                ensure_contact(db, args.contact, args.channel)
                db.execute(
                    "UPDATE contacts SET channel=?,last_requested=?,request_closed=NULL WHERE contact=?",
                    (args.channel, utc_now(), args.contact.strip()),
                )
                event(db, args.contact, "REQUEST", args.channel)
                print("Recorded PRIVATE incoming request; NOT a marketing consent.")
            elif args.action == "close":
                ensure_contact(db, args.contact, "unknown")
                db.execute("UPDATE contacts SET request_closed=? WHERE contact=?",
                           (utc_now(), args.contact.strip()))
                event(db, args.contact, "REQUEST_CLOSED", "unknown")
                print("Request marked closed. Retention clock starts now.")
            elif args.action == "withdraw":
                ensure_contact(db, args.contact, args.channel)
                db.execute(
                    """INSERT INTO suppression(contact,at_utc,channel) VALUES(?,?,?)
                       ON CONFLICT(contact) DO UPDATE SET at_utc=excluded.at_utc,
                       channel=excluded.channel""",
                    (args.contact.strip(), utc_now(), args.channel),
                )
                event(db, args.contact, "WITHDRAW_OR_OBJECT", args.channel)
                print("DO NOT CONTACT FOR MARKETING. Withdrawal / objection saved locally.")
            elif args.action == "consent":
                proof = Path(args.proof).expanduser().resolve()
                if not proof.is_file():
                    raise ValueError("Actual received proof file required; never invent evidence")
                try:
                    proof.relative_to(REPO.resolve())
                except ValueError:
                    pass
                else:
                    raise ValueError("Evidence may NOT be stored in the public GitHub repository")
                ensure_contact(db, args.contact, args.channel)
                signature = hashlib.sha256(proof.read_bytes()).hexdigest()
                event(db, args.contact, "CONSENT", args.channel, args.purpose,
                      args.notice_version, signature, str(proof))
                db.execute("DELETE FROM suppression WHERE contact=?", (args.contact.strip(),))
                print("Consent evidence registered privately (does not send marketing).")
            elif args.action == "check":
                blocked = db.execute(
                    "SELECT 1 FROM suppression WHERE contact=?", (args.contact.strip(),)
                ).fetchone()
                latest = db.execute(
                    "SELECT event,at_utc FROM records WHERE contact=? ORDER BY id DESC LIMIT 1",
                    (args.contact.strip(),),
                ).fetchone()
                if blocked:
                    print("MARKETING BLOCKED: contact withdrew or objected.")
                elif not marketing_gate():
                    print("MARKETING BLOCKED: site opt-in is not activated.")
                elif not latest or latest[0] != "CONSENT":
                    print("MARKETING BLOCKED: no current demonstrable opt-in.")
                else:
                    print("CONSENT RECORD PRESENT: independently verify scope, proof and revocation before any send.")
            elif args.action == "due":
                if args.days < 1 or args.days > 3650:
                    raise ValueError("--days must be between 1 and 3650")
                deadline = (datetime.now(timezone.utc) - timedelta(days=args.days)).isoformat(timespec="seconds")
                due = db.execute(
                    "SELECT contact,request_closed FROM contacts WHERE request_closed IS NOT NULL AND request_closed<=? ORDER BY request_closed",
                    (deadline,),
                ).fetchall()
                print(f"Closed requests for manual retention review ({args.days} days): {len(due)}")
                for contact, closed in due:
                    print(f"  {contact} | closed {closed} | review all chats, backups and other systems")
            elif args.action == "erase":
                if not args.confirm_erase:
                    raise ValueError("Provide --confirm-erase after confirming deletion obligations")
                suppressed = db.execute("SELECT 1 FROM suppression WHERE contact=?",
                                        (args.contact.strip(),)).fetchone()
                db.execute("DELETE FROM records WHERE contact=?", (args.contact.strip(),))
                db.execute("DELETE FROM contacts WHERE contact=?", (args.contact.strip(),))
                print("Local contact data erased. Suppression minimal record "
                      + ("RETAINED (required to avoid future marketing)" if suppressed else "not present")
                      + ". Manually delete/verify WhatsApp chats, email copies, proof files and backups.")
            elif args.action == "summary":
                n = db.execute("SELECT count(*) FROM contacts").fetchone()[0]
                suppressed = db.execute("SELECT count(*) FROM suppression").fetchone()[0]
                pending = db.execute("SELECT count(*) FROM contacts WHERE request_closed IS NULL").fetchone()[0]
                print(f"Private contacts: {n} | active inquiries: {pending} | suppressions: {suppressed} "
                      f"| marketing gate: {'OPEN' if marketing_gate() else 'CLOSED'}")
        return 0
    except (ValueError, OSError, sqlite3.DatabaseError, RuntimeError) as exc:
        print(f"ERROR: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(run())
