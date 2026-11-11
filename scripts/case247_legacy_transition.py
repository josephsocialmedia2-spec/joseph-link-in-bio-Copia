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
    if any(dt.date.fromisoformat(key)>final for key,_ in all_records):
        raise ValueError("Legacy inventory exceeds declared final date")
    if day<=final and day>covered:
        raise ValueError("Legacy inventory does not cover the requested day")
    # The snapshot is the ONLY residual record of the old provider.
    # No Metricool calls, tokens or subscription are necessary after capture.
    return {url for record in items.get(day.isoformat(),[])
            if (url:=canonical_listing_url(record.get("url","")))}

def load_reservations(day, root, out):
    transition=json.loads((Path(root)/"config/case247-direct-meta-transition.json").read_text(encoding="utf-8"))
    snapshot=json.loads((Path(out)/"metricool-central-reservations.json").read_text(encoding="utf-8"))
    return reservations_for_day(day,snapshot,transition)
