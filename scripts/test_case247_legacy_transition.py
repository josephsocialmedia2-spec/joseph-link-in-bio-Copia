"""Legacy scheduling migration: verify no new Metricool API calls or duplicate listings."""
import datetime as dt
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from case247_legacy_transition import canonical_listing_url, reservations_for_day, load_reservations

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"campagne/case247/regia-territoriale"

class LegacyTransitionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot=json.loads((OUT/"metricool-central-reservations.json").read_text(encoding="utf-8"))
        cls.config=json.loads((ROOT/"config/case247-direct-meta-transition.json").read_text(encoding="utf-8"))
    def test_snapshot_matches_validated_inventory(self):
        self.assertEqual(self.snapshot["checked_at"], self.config["snapshot_date"])
        self.assertEqual(sum(map(len,self.snapshot["reservations"].values())),32)
        self.assertEqual(self.config["provider"],"META_GRAPH_API_DIRECT")
        self.assertEqual(self.config["expected_legacy_posts"],32)
    def test_imported_existing_post_is_reserved(self):
        day=dt.date(2026,11,13)
        expected={canonical_listing_url(url) for x in self.snapshot["reservations"]["2026-11-13"] for url in x["urls"]}
        actual=reservations_for_day(day,self.snapshot,self.config)
        self.assertEqual(actual,expected)
        self.assertTrue(actual)
    def test_no_extra_schedules_after_final_day(self):
        self.assertEqual(reservations_for_day(dt.date(2026,12,10),self.snapshot,self.config),set())
    def test_no_posts_on_a_gap_day(self):
        self.assertEqual(reservations_for_day(dt.date(2026,11,12),self.snapshot,self.config),set())
    def test_count_mismatch_fails_closed(self):
        altered=dict(self.config,expected_legacy_posts=31)
        with self.assertRaises(ValueError):
            reservations_for_day(dt.date(2026,11,13),self.snapshot,altered)
    def test_bad_provider_fails_closed(self):
        with self.assertRaises(ValueError):
            reservations_for_day(dt.date(2026,11,13),self.snapshot,dict(self.config,provider="metricool"))
    def test_query_string_and_host_normalization(self):
        url="https://www.lasacraimmobiliare.it/products/casa-test/?utm_source=foo"
        self.assertEqual(canonical_listing_url(url),"https://lasacraimmobiliare.it/products/casa-test")
        self.assertEqual(canonical_listing_url("https://badhost.it/products/casa-test"),"")
    def test_missing_reservation_url_fails_closed(self):
        broken=json.loads(json.dumps(self.snapshot))
        broken["reservations"]["2026-11-13"][0]["urls"]=[]
        with self.assertRaises(ValueError):
            reservations_for_day(dt.date(2026,11,13),broken,self.config)

    def test_invalid_reservation_url_fails_closed(self):
        broken=json.loads(json.dumps(self.snapshot))
        broken["reservations"]["2026-11-13"][0]["urls"]=["https://example.com/products/missing"]
        with self.assertRaises(ValueError):
            reservations_for_day(dt.date(2026,11,13),broken,self.config)

    def test_duplicate_same_day_url_fails_closed(self):
        broken=json.loads(json.dumps(self.snapshot))
        rows=broken["reservations"]["2026-11-15"]
        self.assertGreaterEqual(len(rows),2)
        rows[1]["urls"]=list(rows[0]["urls"])
        with self.assertRaises(ValueError):
            reservations_for_day(dt.date(2026,11,15),broken,self.config)

    def test_runtime_snapshot_path(self):
        real=load_reservations(dt.date(2026,11,13),ROOT,OUT)
        self.assertEqual(real,reservations_for_day(dt.date(2026,11,13),self.snapshot,self.config))

if __name__=="__main__":
    unittest.main()
