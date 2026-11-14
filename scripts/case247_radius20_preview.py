#!/usr/bin/env python3
"""Read-only 20 km geofence impact simulation; never schedules or publishes."""
import json
from pathlib import Path

from case247_territorial_engine import (
    ROOT, distance_km, eligible_towns, listed_available, valid_picture,
)
from case247_legacy_transition import canonical_listing_url


def preview(config, catalog, geo, candidate):
    if (config.get("coverage_radius_km") != 10
            or candidate.get("production_radius_km") != 10
            or candidate.get("candidate_radius_km") != 20
            or candidate.get("status") != "PROPOSAL_DRY_RUN_ONLY"
            or candidate.get("never_publish_from_candidate") is not True):
        raise ValueError("20 km preview configuration is unsafe")
    towns = config.get("towns", [])
    if len({t["id"] for t in towns}) != len(towns):
        raise ValueError("Duplicate territorial IDs")
    considered = eligible_10 = eligible_20 = edges_10 = edges_20 = overlap_20 = 0
    newly_covered = 0
    seen = set()
    for item in catalog.get("items", []):
        if not (listed_available(item)
                and valid_picture(item.get("image"))
                and canonical_listing_url(item.get("url"))):
            continue
        listing_id = str(item["id"])
        if listing_id in seen:
            raise ValueError("Duplicate source listing ID")
        seen.add(listing_id)
        considered += 1
        ten = {town["id"] for town, _ in eligible_towns(item, towns, geo, radius=10)}
        twenty = {town["id"] for town, _ in eligible_towns(item, towns, geo, radius=20)}
        if not ten.issubset(twenty):
            raise ValueError("Nonmonotonic geofence simulation")
        eligible_10 += bool(ten)
        eligible_20 += bool(twenty)
        newly_covered += not ten and bool(twenty)
        edges_10 += len(ten)
        edges_20 += len(twenty)
        overlap_20 += len(twenty) > 1
    return {
        "mode": "READ_ONLY_NO_PUBLISH",
        "production_radius_km": 10,
        "candidate_radius_km": 20,
        "town_count": len(towns),
        "source_listings_considered": considered,
        "listings_with_town_10km": eligible_10,
        "listings_with_town_20km": eligible_20,
        "newly_covered_listings": newly_covered,
        "eligible_listing_town_pairs_10km": edges_10,
        "eligible_listing_town_pairs_20km": edges_20,
        "additional_candidate_pairs": edges_20 - edges_10,
        "listings_eligible_for_multiple_towns_20km": overlap_20,
        "warning": "Pairs are eligibility candidates, not scheduled or published posts; "
                   "municipality bounding boxes are conservative proxies.",
    }


def main():
    config = json.loads((ROOT / "config/case247-territorio.json").read_text())
    candidate = json.loads((ROOT / "config/case247-radius20-candidate.json").read_text())
    catalog = json.loads((ROOT / "immobili/catalogo.json").read_text())
    geo = json.loads((ROOT / "config/case247-geo-verified.json").read_text())["towns"]
    if len(config["towns"]) != candidate["towns_expected"]:
        raise ValueError("Not all 42 towns represented in 20 km preview")
    print(json.dumps(preview(config, catalog, geo, candidate), sort_keys=True))


if __name__ == "__main__":
    main()
