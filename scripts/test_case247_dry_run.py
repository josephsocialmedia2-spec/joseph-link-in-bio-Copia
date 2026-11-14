"""Deterministic, zero-network end-to-end dry-run safety smoke tests."""
import datetime as dt
import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import case247_territorial_publisher as publisher


class PublisherDryRunIntegrationTests(unittest.TestCase):
    def setUp(self):
        now = dt.datetime.now(publisher.TZ)
        self.day = now.date().isoformat()
        self.listing = {
            "id": "dry-100", "town_id": "avigliana", "title": "Casa test autorizzata",
            "url": "https://lasacraimmobiliare.it/products/dryrun-test",
            "image": "https://lasacraimmobiliare.it/images/dryrun-test.jpg",
            "price": 100000, "availability_status": "AVAILABLE",
            "location_status": "VERIFICATO_FONTE",
        }
        self.item = {
            "date": self.day, "time": now.strftime("%H:%M"),
            "status": "READY_TO_SUBMIT", "type": "IMMOBILE",
            "listing_id": "dry-100", "town_id": "avigliana",
            "source_town_id": "avigliana", "network": "facebook",
            "source_url": self.listing["url"], "media_url": self.listing["image"],
            "title": self.listing["title"], "price": self.listing["price"],
            "distance_upper_bound_km": 1.0,
        }
        self.plan = {"date": self.day, "max_distance_km": 10, "assignments": [self.item]}
        self.config = {
            "coverage_radius_km": 10,
            "towns": [{
                "id": "avigliana", "auto_publish": False,
                "channels": {
                    "facebook": {"status": "DA_VERIFICARE"},
                    "instagram": {"status": "DA_VERIFICARE"},
                },
            }],
        }
        self.catalog = {
            "last_success_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "items": [self.listing],
        }
        self.manifest = {"entries": [{"id": "F01", "approval": "PENDING",
                                     "technical_status": "APPROVED",
                                     "requires_fact_check": True,
                                     "ai_generated": True,
                                     "public_image_url": "https://example.org/test.jpg"}]}

    def read_json(self, path, fallback=None):
        name = str(path)
        if "/plans/" in name and name.endswith(".json"):
            return self.plan
        if name.endswith("case247-territorio.json"):
            return self.config
        if name.endswith("catalogo.json"):
            return self.catalog
        if name.endswith("manifest-60.json"):
            return self.manifest
        if name.endswith("case247-geo-verified.json"):
            return {"towns": {}}
        if name.endswith("publish-ledger.json"):
            return {"entries": {}}
        return fallback

    def execute(self):
        stream = io.StringIO()
        with (patch.object(publisher, "read_json", side_effect=self.read_json),
              patch.object(publisher, "load_reservations", return_value=set()),
              patch.object(publisher, "verified_ten_km_assignment", return_value=True),
              patch.object(publisher, "check_media", return_value=True),
              patch.object(publisher, "credentials_for_publisher",
                           side_effect=AssertionError("No credentials in DRY RUN")),
              patch.object(publisher, "send_facebook",
                           side_effect=AssertionError("No Meta FB writes in DRY RUN")),
              patch.object(publisher, "send_instagram",
                           side_effect=AssertionError("No Meta IG writes in DRY RUN")),
              patch.object(publisher, "persist_ledger",
                           side_effect=AssertionError("No ledger writes in DRY RUN")),
              redirect_stdout(stream)):
            publisher.run(live=False, max_per_run=10)
        return stream.getvalue()

    def test_valid_candidate_is_only_simulated(self):
        output = self.execute()
        self.assertIn("DRY_RUN", output)
        self.assertIn("0 provider attempts", output)
        self.assertNotIn("PUBLISHED ", output)

    def test_pending_graphic_never_enters_dryrun(self):
        self.plan["assignments"] = [{
            **self.item, "type": "DIETRO_LE_QUINTE", "graphic_id": "F01",
            "media_url": "https://example.org/test.jpg",
        }]
        output = self.execute()
        self.assertIn("BLOCKED_UNAPPROVED_OR_CHANGED_GRAPHIC", output)
        self.assertNotIn("DRY_RUN ", output)

    def test_missing_central_legacy_inventory_blocks_even_dryrun(self):
        with patch.object(publisher, "read_json", side_effect=self.read_json), \
             patch.object(publisher, "load_reservations",
                          side_effect=ValueError("Legacy inventory missing")):
            with self.assertRaises(SystemExit) as caught:
                publisher.run(live=False, max_per_run=1)
        self.assertIn("legacy-overlap safety", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
