"""One-time import of legacy scheduled posts. No Metricool API or account is needed by the live publisher.

After an operator's instruction to stop using Metricool, the existing posts
were inventoried for the final time. The immutable snapshot prevents collisions
until the last scheduled legacy date, then retires naturally.
"""
from __future__ import annotations
import datetime as dt
import json
from pathlib import Path
from urllib.parse import urlsplit, unquote

def canonical_listing_url(value):
    if not isinstance(value,str) or not value.strip():
        return ""
    split=urlsplit(value.strip())
    if (split.hostname or "").lower() not in ("lasacraimmobiliare.it","www.lasacraimmobiliare.it"):
        return ""
    path=unquote(split.path).rstrip("/").lower()
    if not path.startswith("/products/") or path.count("/") != 2:
        return ""
    return "https://lasacraimmobiliare.it"+path

def record_listing_urls(record):
    """Resolve original URLs from the current Metricool snapshot or older one-URL rows.

    A missing/malformed URL must block all direct publishing, not silently
    remove a collision reservation.
    """
    if not isinstance(record, dict):
        raise ValueError("Invalid legacy reservation record")
    raw = record.get("urls")
    if raw is None and isinstance(record.get("url"), str):
        raw = [record["url"]]
    if not isinstance(raw, list) or not raw:
        raise ValueError("Legacy reservation has no listing URLs")
    clean = [canonical_listing_url(url) for url in raw]
    if any(not url for url in clean):
        raise ValueError("Legacy reservation has an invalid listing URL")
    if len(clean) != len(set(clean)):
        raise ValueError("Duplicate URL inside legacy reservation")
    return set(clean)


def reservations_for_day(day, snapshot, transition):
    """Return legacy listing URLs to exclude from our own schedule on 'day'.
    
    Strictly validate the one-time snapshot before allowing any direct sends.
    Failure to provide the frozen inventory fails closed.
    """
    if not isinstance(day,dt.date):
        raise ValueError("day must be a date")
    if transition.get("provider")!="META_GRAPH_API_DIRECT":
        raise ValueError("Direct Meta migration is not configured")
    if transition.get("mode")!="FROZEN_LEGACY_SNAPSHOT":
        raise ValueError("Unknown legacy safety mode")
    count=transition.get("expected_legacy_posts")
    if not isinstance(count,int) or count<0:
        raise ValueError("Invalid expected legacy count")
    items=snapshot.get("reservations")
    if not isinstance(items,dict):
        raise ValueError("Missing one-time legacy reservations")
    try:
        covered=dt.date.fromisoformat(transition["verified_through"])
        final=dt.date.fromisoformat(transition["last_legacy_publish_day"])
        captured=dt.date.fromisoformat(transition["snapshot_date"])
        checked=dt.date.fromisoformat(snapshot["checked_at"])
    except (KeyError,TypeError,ValueError) as e:
        raise ValueError("Invalid legacy inventory dates") from e
    if captured!=checked or final>covered or covered<captured:
        raise ValueError("Legacy inventory coverage mismatch")
    all_records=[(key,record) for key,rows in items.items() for record in rows]
    if len(all_records)!=count:
        raise ValueError("Legacy inventory count has changed")
    ids=[str(record.get("metricool_id","")) for _,record in all_records]
    if any(not x for x in ids) or len(ids)!=len(set(ids)):
        raise ValueError("Missing or duplicate legacy provider identifiers")
    reserved_by_date = {}
    for key, record in all_records:
        if dt.date.fromisoformat(key) > final:
            raise ValueError("Legacy inventory exceeds declared final date")
        urls = record_listing_urls(record)
        occupied = reserved_by_date.setdefault(key, set())
        if occupied.intersection(urls):
            raise ValueError("Duplicate legacy listing on the same day")
        occupied.update(urls)
    if day <= final and day > covered:
        raise ValueError("Legacy inventory does not cover the requested day")
    # Validate ALL frozen rows before returning the day-specific exclusions.
    # A malformed row must never silently disable the duplicate safety gate.
    return reserved_by_date.get(day.isoformat(), set())

# Captured from the real 2026-11-12 Metricool reconciliation commit.
# This fixture is immutable: the daily operational register is not a fixture.
FROZEN_INVENTORY = Path("scripts/fixtures/case247_legacy_reservations_2026-11-12.json")


def current_reservations_for_day(day, snapshot, transition):
    """Validate the mutable read-only Metricool inventory independently.

    The old 32-post freeze is checked separately and remains reserved even if
    a published post disappears from the provider's future-only response.
    No current provider record is interpreted as proof that a post published.
    """
    if not isinstance(day, dt.date) or not isinstance(snapshot, dict):
        raise ValueError("Invalid current Metricool inventory")
    try:
        captured = dt.date.fromisoformat(transition["snapshot_date"])
        checked = dt.date.fromisoformat(snapshot["checked_at"])
        covered = dt.date.fromisoformat(transition["verified_through"])
    except (KeyError, ValueError, TypeError) as exc:
        raise ValueError("Invalid operational inventory dates") from exc
    if not captured <= checked <= covered:
        raise ValueError("Operational inventory outside verified date range")
    if "Metricool brand 7844901" not in str(snapshot.get("source", "")):
        raise ValueError("Unrecognized operational inventory source")
    items = snapshot.get("reservations")
    if not isinstance(items, dict):
        raise ValueError("Missing operational reservations")
    ids, by_date = set(), {}
    for date_key, rows in items.items():
        try:
            post_day = dt.date.fromisoformat(date_key)
        except (ValueError, TypeError) as exc:
            raise ValueError("Invalid operational reservation day") from exc
        if post_day > covered or not isinstance(rows, list):
            raise ValueError("Operational inventory coverage mismatch")
        occupied = by_date.setdefault(date_key, set())
        for record in rows:
            if not isinstance(record, dict):
                raise ValueError("Invalid operational reservation record")
            provider_id = str(record.get("metricool_id") or "")
            if not provider_id or provider_id in ids:
                raise ValueError("Missing or duplicate operational Metricool ID")
            ids.add(provider_id)
            status = record.get("status")
            if (not isinstance(status, dict)
                    or not all(status.get(n) in
                               ("PENDING", "PUBLISHED", "FAILED", "CANCELLED")
                               for n in ("facebook", "instagram"))):
                raise ValueError("Missing or unknown operational provider status")
            published_date = record.get("publication_date")
            if not isinstance(published_date, str):
                raise ValueError("Missing operational publication date")
            try:
                if dt.datetime.fromisoformat(published_date).date() != post_day:
                    raise ValueError("Operational publication date mismatch")
            except (TypeError, ValueError) as exc:
                raise ValueError("Invalid operational publication date") from exc
            urls = record_listing_urls(record)
            if occupied.intersection(urls):
                raise ValueError("Duplicate operational listing on the same day")
            occupied.update(urls)
    return by_date.get(day.isoformat(), set())


def load_reservations(day, root, out):
    """Union of frozen historical and current provider reservations.

    The original historical snapshot and current mutable register are NEVER
    substituted for each other. Invalid input blocks the direct publisher.
    """
    root, out = Path(root), Path(out)
    transition = json.loads((root / "config/case247-direct-meta-transition.json").read_text(encoding="utf-8"))
    frozen = json.loads((root / FROZEN_INVENTORY).read_text(encoding="utf-8"))
    current = json.loads((out / "metricool-central-reservations.json").read_text(encoding="utf-8"))
    return (reservations_for_day(day, frozen, transition)
            | current_reservations_for_day(day, current, transition))
