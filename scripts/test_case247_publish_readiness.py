"""Offline tests for CASE247 publisher preflight; never call external providers."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

from case247_publish_readiness import evaluate

TZ = ZoneInfo("Europe/Rome")


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for folder in ("config", "immobili", "campagne/case247/regia-territoriale/plans"):
            (self.root / folder).mkdir(parents=True)
        self.now = dt.datetime(2026, 11, 20, 10, 1, tzinfo=TZ)
        self.config = {
            "coverage_radius_km": 10.0,
            "towns": [{"id": "avigliana", "auto_publish": True,
                "channels": {"facebook": {"status": "ACTIVE_VERIFIED",
                    "provider_id": "123456", "url": "https://www.facebook.com/123456"}}}],
        }
        self.listing_url = "https://lasacraimmobiliare.it/products/example"
        self.plan = {"date": "2026-11-20", "max_distance_km": 10.0,
                     "assignments": [{"date": "2026-11-20", "time": "10:00",
                         "status": "READY_TO_SUBMIT", "type": "IMMOBILE",
                         "listing_id": "123", "source_url": self.listing_url}]}
        self.write("config/case247-territorio.json", self.config)
        self.write("immobili/catalogo.json", {"last_success_at": "2026-11-20T07:00:00+00:00"})
        self.write("campagne/case247/regia-territoriale/plans/2026-11-20.json", self.plan)

    def write(self, path, value):
        (self.root / path).write_text(json.dumps(value), encoding="utf-8")

    def evaluate(self, live=True, reserved=None):
        with patch("case247_publish_readiness.load_reservations",
                   return_value=set() if reserved is None else reserved):
            return evaluate(self.root, self.now, live)

    def test_valid_due_unreserved_slot_is_preflight_eligible(self):
        result = self.evaluate()
        self.assertTrue(result["can_publish"])
        self.assertEqual(result["counts"]["eligible_due"], 1)

    def test_live_disabled_does_not_claim_eligible_to_send(self):
        result = self.evaluate(live=False)
        self.assertFalse(result["can_publish"])
        self.assertIn("LIVE_SWITCH_DISABLED", result["blocked_reasons"])

    def test_no_verified_meta_account_fails_closed(self):
        self.config["towns"][0]["channels"]["facebook"]["status"] = "DA_VERIFICARE"
        self.write("config/case247-territorio.json", self.config)
        result = self.evaluate()
        self.assertFalse(result["can_publish"])
        self.assertIn("NO_VERIFIED_TERRITORIAL_CHANNELS", result["blocked_reasons"])

    def test_metricool_reserved_property_fails_closed(self):
        result = self.evaluate(reserved={self.listing_url})
        self.assertFalse(result["can_publish"])
        self.assertEqual(result["counts"]["due_collisions_or_invalid_urls"], 1)

    def test_previous_intent_or_publish_receipt_prevents_retry(self):
        self.write("campagne/case247/regia-territoriale/publish-ledger.json",
                   {"entries": {"2026-11-20:IMMOBILE:123": {"status": "INTENT"}}})
        result = self.evaluate()
        self.assertFalse(result["can_publish"])
        self.assertEqual(result["counts"]["due_already_attempted"], 1)

    def test_stale_catalog_blocks_publishing(self):
        self.write("immobili/catalogo.json", {"last_success_at": "2026-11-17T07:00:00Z"})
        result = self.evaluate()
        self.assertFalse(result["can_publish"])
        self.assertIn("CATALOG_NOT_FRESH", result["blocked_reasons"])

    def test_missing_daily_plan_blocks_publishing(self):
        (self.root / "campagne/case247/regia-territoriale/plans/2026-11-20.json").unlink()
        result = self.evaluate()
        self.assertFalse(result["can_publish"])
        self.assertIn("CURRENT_DAY_PLAN_MISSING_OR_INVALID", result["blocked_reasons"])

    def test_stale_metricool_reconciliation_blocks_publishing(self):
        with patch("case247_publish_readiness.load_reservations", side_effect=ValueError("stale")):
            result = evaluate(self.root, self.now, True)
        self.assertFalse(result["can_publish"])
        self.assertIn("METRICOOL_RESERVATIONS_STALE_OR_INVALID", result["blocked_reasons"])


if __name__ == "__main__":
    unittest.main()
