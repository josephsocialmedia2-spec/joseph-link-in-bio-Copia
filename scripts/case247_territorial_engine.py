#!/usr/bin/env python3
"""CASE247: territorial advertising planner and 18:00 inventory reconciliation.

Safe by default: this creates an auditable schedule, NEVER social accounts or posts.
An entry is publishable only when its real territorial provider is verified.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config/case247-territorio.json"
GEO = ROOT / "config/case247-geo-verified.json"
CATALOG = ROOT / "immobili/catalogo.json"
GRAPHICS = ROOT / "campagne/case247/dietro-le-quinte/manifest-60.json"
OUT = ROOT / "campagne/case247/regia-territoriale"
TZ = ZoneInfo("Europe/Rome")
RADIUS_KM = 20.0
SLOTS = ("00:00", "04:00", "08:00", "12:00", "16:00", "20:00")
PROPERTY_SLOTS = SLOTS[::2]
GRAPHIC_SLOTS = SLOTS[1::2]

def read_json(path, fallback=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback

def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)

def fold(s):
    return "".join(c for c in unicodedata.normalize("NFKD", str(s).casefold())
                   if not unicodedata.combining(c)).replace("’", "'")

def distance_km(lat1, lon1, lat2, lon2):
    a, b, c, d = map(math.radians, (lat1, lon1, lat2, lon2))
    h = math.sin((c-a)/2)**2 + math.cos(a)*math.cos(c)*math.sin((d-b)/2)**2
    return 6371.0088 * 2 * math.asin(min(1, math.sqrt(h)))

def bbox_furthest_km(point, bbox):
    """Maximum distance from a page town centre to bounding box of source town.
    This conservative proxy is used only when actual listing coordinates are absent.
    """
    south, north, west, east = map(float, bbox)
    return max(distance_km(point["lat"], point["lon"], lat, lon)
               for lat in (south, north) for lon in (west, east))

def geocode_town(name):
    """Nominatim public endpoint, low-volume municipal geocoding with review gates."""
    query = urllib.parse.urlencode({
        "q": f"{name}, Piemonte, Italia", "format": "jsonv2", "addressdetails": 1,
        "limit": 5, "countrycodes": "it",
    })
    request = urllib.request.Request(
        "https://nominatim.openstreetmap.org/search?" + query,
        headers={"User-Agent": "Case247TerritorialPlanner/1.0 (https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/)", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=25) as resp:
        matches = json.load(resp)
    matches = [m for m in matches
               if m.get("boundingbox") and len(m["boundingbox"]) == 4
               and m.get("address", {}).get("country_code") == "it"
               and ("piemonte" in fold(m.get("display_name", "")))]
    # Accept only geographic entities whose displayed municipality includes the name;
    # never quietly assign a similarly named point of interest.
    key = fold(name).replace(" di torino", "").replace(" torinese", "")
    selected = next((m for m in matches
                     if key in fold(m.get("name", "") + " " + m.get("display_name", ""))
                     and m.get("type") in ("administrative", "town", "village", "municipality")), None)
    if not selected:
        return None
    return {
        "lat": float(selected["lat"]), "lon": float(selected["lon"]),
        "bbox": list(map(float, selected["boundingbox"])),
        "osm_type": selected.get("osm_type"), "osm_id": selected.get("osm_id"),
        "display_name": selected["display_name"], "source": "OpenStreetMap Nominatim",
        "verified_scope": "MUNICIPALITY_BBOX_PROXY",
    }

def refresh_geocodes(towns, existing, max_new=50):
    cache = dict(existing)
    for town in towns:
        if town["id"] in cache:
            continue
        if max_new <= 0:
            break
        try:
            entry = geocode_town(town["name"])
            if entry:
                cache[town["id"]] = entry
        except Exception as exc:
            print(f"Geocoding non riuscito per {town['name']}: {type(exc).__name__}")
        max_new -= 1
        time.sleep(1.2)
    return cache

def valid_picture(url):
    return bool(url and url.startswith("https://") and
                not re.search(r"chatgpt|dall.?e|midjourney|stable.?diffusion",
                              urllib.parse.unquote(url), re.I))

def listed_available(item):
    # A missing Shopify availability flag is NOT evidence of availability.
    if item.get("availability_status") != "AVAILABLE":
        return False
    title = fold(item.get("title", ""))
    tags = fold(" ".join(item.get("tags") or []))
    unavailable = ("venduto", "in trattativa", "riservato", "non disponibile")
    return not any(flag in title or flag in tags for flag in unavailable)

def eligible_towns(item, towns, geo, radius=RADIUS_KM):
    source_id = item.get("town_id")
    if item.get("location_status") != "VERIFICATO_FONTE" or source_id not in geo:
        return []
    source = geo[source_id]
    bbox = source.get("bbox")
    if not bbox or len(bbox) != 4:
        return []
    results = []
    for town in towns:
        dest = geo.get(town["id"])
        if not dest:
            continue
        farthest = bbox_furthest_km(dest, bbox)
        if farthest <= radius + 1e-9:
            results.append((town, round(farthest, 2)))
    return results

def channel_ready(town, network):
    obj = town.get("channels", {}).get(network) or {}
    # A URL, or an account name alone, never constitutes a confirmed connection.
    return (obj.get("status") == "ACTIVE_VERIFIED"
            and obj.get("provider_id") and obj.get("url")
            and town.get("auto_publish") is True)

def hash_order(key, day):
    return hashlib.sha256(f"{day}|{key}".encode()).hexdigest()

def content_fingerprint(p):
    raw = [p.get(k) for k in ("title", "price", "image", "url", "description", "availability_status")]
    return hashlib.sha256(json.dumps(raw, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def normalize_changes(items, old):
    before = old or {}
    after = {str(p["id"]): content_fingerprint(p) for p in items}
    return {
        "added_ids": sorted(after.keys() - before.keys()),
        "removed_ids": sorted(before.keys() - after.keys()),
        "changed_ids": sorted(k for k in after.keys() & before.keys() if after[k] != before[k]),
        "after": after,
    }

def make_plan(day, items, towns, geo, graphics, previous=None, reserved_urls=None):
    """Allocate each verified available listing ONCE across all territorial networks."""
    previous = previous or {}
    reserved_urls = set(reserved_urls or [])
    sources = [p for p in items if listed_available(p) and valid_picture(p.get("image"))
               and p.get("url") not in reserved_urls]
    sources.sort(key=lambda p: hash_order(p["id"], day))
    occupancy = {}  # (town, network) -> 0..3 property posts
    assignments, exclusions = [], {}
    alternation = dt.date.fromisoformat(day).toordinal()

    for p in sources:
        choices = eligible_towns(p, towns, geo)
        if not choices:
            exclusions[str(p["id"])] = "NO_VERIFIED_TOWN_WITHIN_20KM"
            continue
        preferred = "facebook" if (int(hash_order(p["id"], day)[:3], 16) + alternation) % 2 else "instagram"
        viable = []
        for t, farthest in choices:
            for n in ("facebook", "instagram"):
                used = occupancy.get((t["id"], n), 0)
                if used >= len(PROPERTY_SLOTS):
                    continue
                same_as_yesterday = previous.get(str(p["id"]), {}).get("town_id") == t["id"]
                viable.append((used, int(same_as_yesterday), int(t["id"] != p["town_id"]),
                               int(n != preferred), hash_order(p["id"] + t["id"] + n, day),
                               t, n, farthest))
        if not viable:
            exclusions[str(p["id"])] = "ALL_ELIGIBLE_CHANNEL_SLOTS_FULL"
            continue
        _, _, _, _, _, town, network, km = min(viable, key=lambda x: x[:5])
        key = (town["id"], network)
        position = occupancy.get(key, 0)
        occupancy[key] = position + 1
        assignments.append({
            "type": "IMMOBILE", "listing_id": str(p["id"]), "title": p["title"],
            "source_town_id": p["town_id"], "town_id": town["id"], "town": town["name"],
            "network": network, "time": PROPERTY_SLOTS[position],
            "date": day, "distance_upper_bound_km": km,
            "geo_method": "conservative_municipality_bbox",
            "media_url": p["image"], "source_url": p["url"],
            "landing_url": town["landing_url"],
            "price": p.get("price"), "source_updated_at": p.get("source_updated_at"),
            "status": "READY_TO_SUBMIT" if channel_ready(town, network) else "BLOCKED_CHANNEL_NOT_CONNECTED",
            "caption": f"{p['title']}\n\n"
                + (f"Prezzo indicato: {p['price']:,.0f} EUR\n".replace(",", ".") if p.get("price") else "")
                + f"Dettagli e disponibilità: {p['url']}\n"
                + f"Immobili del territorio: {town['landing_url']}\n"
                + "Case in Pubblicità 24/7 · Comunicazione pubblicitaria. "
                  "La mediazione immobiliare è svolta dai professionisti abilitati.",
        })
    # Graphics rotate in distinct accounts, at most one presentation of each
    # graphic per day across the network. Never fill empty capacity with duplicates.
    used_graphics = set()
    asset_entries = sorted(graphics, key=lambda x: hash_order(x.get("id", ""), day))
    used_channels = sorted(set(occupancy), key=lambda z: hash_order(":".join(z), day))
    for tid, network in used_channels:
        town = next(t for t in towns if t["id"] == tid)
        for slot in GRAPHIC_SLOTS:
            candidate = next((g for g in asset_entries if g.get("id") not in used_graphics
                              and g.get("public_image_url") and g.get("ai_generated") is True), None)
            if not candidate:
                break
            used_graphics.add(candidate["id"])
            assignments.append({
                "type": "DIETRO_LE_QUINTE", "graphic_id": candidate["id"],
                "topic": candidate.get("topic"), "town_id": tid, "town": town["name"],
                "network": network, "date": day, "time": slot,
                "media_url": candidate["public_image_url"], "landing_url": town["landing_url"],
                "is_ai_generated": True, "status": "READY_TO_SUBMIT" if channel_ready(town, network)
                           else "BLOCKED_CHANNEL_NOT_CONNECTED",
                "caption": f"{candidate.get('topic', 'Come funziona la promozione immobiliare')}\n\n"
                           "Ricostruzione illustrativa generata con IA: non documenta attività realmente svolte.\n"
                           f"Scopri gli immobili del territorio: {town['landing_url']}\n"
                           "Case in Pubblicità 24/7 · Solo pubblicità, non intermediazione.",
            })
    assignments.sort(key=lambda p: (p["date"], p["time"], p["town_id"], p["network"]))
    unique = [x["listing_id"] for x in assignments if x["type"] == "IMMOBILE"]
    assert len(unique) == len(set(unique)), "Duplicate listing in daily network"
    assert all(x.get("distance_upper_bound_km", 0) <= RADIUS_KM for x in assignments)
    return {
        "date": day, "timezone": "Europe/Rome", "slots_per_account": list(SLOTS),
        "max_distance_km": RADIUS_KM, "scope": "single daily posting across FB and IG",
        "catalog_available_verified_with_media": len(sources),
        "unique_listings_planned": len(unique),
        "graphic_posts_planned": len(assignments) - len(unique),
        "ready_for_provider": sum(x["status"] == "READY_TO_SUBMIT" for x in assignments),
        "unassigned": exclusions, "assignments": assignments,
        "channel_blocker": "Territorial FB/IG accounts must be verified and connected first.",
    }

def repair_future_today(day, items, towns, geo, old_plan, now_hour=18):
    """Repair only not-yet-published slots following the 18:00 source refresh.
    Never reuse today's assigned listing or the subsequent scheduled listing.
    """
    if not old_plan or old_plan.get("date") != day:
        return None, {"updated":0,"removed":0,"replaced":0}
    lookup = {str(p["id"]):p for p in items}
    town_map = {t["id"]:t for t in towns}
    assignments = list(old_plan.get("assignments", []))
    original_listing_ids = {a["listing_id"] for a in assignments
                            if a.get("type") == "IMMOBILE"}
    changes = {"updated":0,"removed":0,"replaced":0}
    repaired = []
    valid_candidates = [p for p in items if listed_available(p) and valid_picture(p.get("image"))
                        and str(p["id"]) not in original_listing_ids]
    for index, a in enumerate(assignments):
        if a.get("type") != "IMMOBILE":
            repaired.append(a)
            continue
        hour = int(a.get("time", "00:00").split(":")[0])
        if hour <= now_hour:
            repaired.append(a)  # Past post: record must remain immutable.
            continue
        listing = lookup.get(a["listing_id"])
        dest = town_map.get(a["town_id"])
        still_eligible = (listing is not None and listed_available(listing)
                          and valid_picture(listing.get("image")) and dest is not None
                          and any(t["id"] == a["town_id"] for t,_ in eligible_towns(listing,towns,geo)))
        if still_eligible:
            refreshed = dict(a)
            new_price, new_media = listing.get("price"), listing.get("image")
            if (new_price != a.get("price") or new_media != a.get("media_url")
                    or listing.get("title") != a.get("title")):
                refreshed["title"] = listing["title"]
                refreshed["price"] = new_price
                refreshed["media_url"] = new_media
                refreshed["source_url"] = listing["url"]
                refreshed["caption"] = (
                    listing["title"] + "\n\n"
                    + (f"Prezzo indicato: {new_price:,.0f} EUR\n".replace(",", ".")
                       if new_price else "")
                    + f"Dettagli e disponibilità: {listing['url']}\n"
                    + f"Immobili del territorio: {dest['landing_url']}\n"
                    + "Case in Pubblicità 24/7 · Comunicazione pubblicitaria. "
                      "La mediazione immobiliare è svolta dai professionisti abilitati."
                )
                changes["updated"] += 1
            repaired.append(refreshed)
            continue
        changes["removed"] += 1
        # Never pick next scheduled listing, even if the removed one was replaced.
        next_listing = next((future["listing_id"] for future in assignments[index + 1:]
                             if future.get("type") == "IMMOBILE"), None)
        options = [p for p in valid_candidates if str(p["id"]) != next_listing and
                   any(t["id"] == a["town_id"] for t,_ in eligible_towns(p,towns,geo))]
        if not options:
            continue  # Unfilled slot is safer than a duplicate or nonlocal post.
        options.sort(key=lambda p: hash_order(str(p["id"]),day))
        substitute = options[0]
        valid_candidates.remove(substitute)
        updated = dict(a)
        updated.update(listing_id=str(substitute["id"]), title=substitute["title"],
                       price=substitute.get("price"), media_url=substitute["image"],
                       source_url=substitute["url"], source_town_id=substitute["town_id"],
                       caption=substitute["title"] + "\n\n"
                           + f"Dettagli e disponibilità: {substitute['url']}\n"
                           + f"Immobili del territorio: {dest['landing_url']}\n"
                           + "Case in Pubblicità 24/7 · Comunicazione pubblicitaria; "
                             "intermediazione a cura di professionisti abilitati.")
        updated["distance_upper_bound_km"] = next(km for t,km in eligible_towns(substitute,towns,geo)
                                                  if t["id"] == a["town_id"])
        repaired.append(updated)
        changes["replaced"] += 1
    old_plan["assignments"] = repaired
    old_plan["unique_listings_planned"] = sum(a["type"] == "IMMOBILE" for a in repaired)
    old_plan["graphic_posts_planned"] = sum(a["type"] == "DIETRO_LE_QUINTE" for a in repaired)
    old_plan["ready_for_provider"] = sum(a.get("status") == "READY_TO_SUBMIT" for a in repaired)
    return old_plan,changes

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", help="Planned day, YYYY-MM-DD (default: next local day)")
    parser.add_argument("--geocode", action="store_true", help="Resolve missing municipality bounding boxes")
    parser.add_argument("--max-geocodes", type=int, default=50)
    args = parser.parse_args()
    today = dt.datetime.now(TZ).date()
    day = args.day or (today + dt.timedelta(days=1)).isoformat()
    config = read_json(CONFIG)
    catalog = read_json(CATALOG)
    manifest = read_json(GRAPHICS)
    if not config or not catalog or not manifest:
        raise SystemExit("Required config/catalog/graphic manifest missing")
    towns = config["towns"]
    geo_source = read_json(GEO, {"towns": {}})
    geo = geo_source.get("towns", {})
    if args.geocode:
        geo = refresh_geocodes(towns, geo, max_new=args.max_geocodes)
        atomic_write(GEO, {"source": "OpenStreetMap Nominatim", "towns": geo})
    if not catalog.get("last_success_at"):
        raise SystemExit("Catalog has no successful synchronization timestamp")
    source_ts = dt.datetime.fromisoformat(catalog["last_success_at"].replace("Z", "+00:00"))
    if dt.datetime.now(dt.timezone.utc) - source_ts > dt.timedelta(hours=36):
        raise SystemExit("Catalog older than 36 hours: do not schedule stale inventory")
    prev_fingerprints = read_json(OUT / "catalog-fingerprints.json", {})
    changes = normalize_changes(catalog["items"], prev_fingerprints)
    past_assignments = read_json(OUT / "previous-assignments.json", {})
    central = read_json(OUT / "metricool-central-reservations.json", {})
    reserved = {p.get("url") for p in central.get("reservations", {}).get(day, []) if p.get("url")}
    plan = make_plan(day, catalog["items"], towns, geo, manifest["entries"],
                     past_assignments, reserved_urls=reserved)
    plan["existing_central_metricool_reservations"] = len(reserved)
    plan["metricool_reservations_checked_at"] = central.get("checked_at")
    plan["generated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    plan["source_snapshot_at"] = catalog["last_success_at"]
    plan["catalog_count"] = len(catalog["items"])
    plan["verified_town_count"] = sum(p.get("location_status") == "VERIFICATO_FONTE"
                                      for p in catalog["items"])
    plan["geocoded_town_count"] = len(geo)
    # Repair today's remaining slots before scheduling the next day. This is
    # crucial when an announcement was removed before the 20:00 local slot.
    todays_file = OUT / "plans" / (today.isoformat() + ".json")
    todays_plan, repairs = repair_future_today(today.isoformat(),catalog["items"],towns,geo,
                                               read_json(todays_file))
    if todays_plan:
        atomic_write(todays_file,todays_plan)
    atomic_write(OUT / "latest-plan.json", plan)
    atomic_write(OUT / "plans" / (day + ".json"), plan)
    atomic_write(OUT / "catalog-fingerprints.json", changes["after"])
    atomic_write(OUT / "previous-assignments.json",
                 {x["listing_id"]: {"town_id": x["town_id"], "network": x["network"]}
                  for x in plan["assignments"] if x["type"] == "IMMOBILE"})
    atomic_write(OUT / "reconciliation.json", {
        "checked_at": plan["generated_at"], "next_day": day,
        "added_ids": changes["added_ids"], "removed_ids": changes["removed_ids"],
        "changed_ids": changes["changed_ids"],
        "live_updates_performed": 0,
        "todays_future_plan_repairs": repairs,
        "reason": "Updated local future queue; no external provider edit was made",
        "action": "Rebuild next-day plan; removed properties excluded automatically",
    })
    print(f"DAY {day} | listings={plan['catalog_count']} verified={plan['verified_town_count']} "
          f"geo={len(geo)} planned={plan['unique_listings_planned']} "
          f"ready={plan['ready_for_provider']} excluded={len(plan['unassigned'])}")

if __name__ == "__main__":
    main()
