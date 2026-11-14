"""Legacy scheduling migration: verify no new Metricool API calls or duplicate listings."""
import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from case247_legacy_transition import canonical_listing_url, reservations_for_day, load_reservations, current_reservations_for_day, FROZEN_INVENTORY

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"campagne/case247/regia-territoriale"

class LegacyTransitionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot=json.loads((ROOT/FROZEN_INVENTORY).read_text(encoding="utf-8"))
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
        # No mutable live snapshot is used as a historical regression fixture.
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "config").mkdir()
            (root / FROZEN_INVENTORY).parent.mkdir(parents=True)
            (root / FROZEN_INVENTORY).write_text(json.dumps(self.snapshot))
            (root / "config/case247-direct-meta-transition.json").write_text(json.dumps(self.config))
            out = root / "campagne/case247/regia-territoriale"
            out.mkdir(parents=True)
            live = {
                "source": "Metricool brand 7844901 / getScheduledPosts / Facebook e Instagram",
                "checked_at": "2026-11-14",
                "reservations": {"2026-11-14": [{
                    "metricool_id": 900001,
                    "urls": ["https://lasacraimmobiliare.it/products/live-only-asset"],
                    "status": {"facebook": "PENDING", "instagram": "PUBLISHED"},
                    "publication_date": "2026-11-14T12:00:00",
                }]},
            }
            (out / "metricool-central-reservations.json").write_text(json.dumps(live))
            frozen = reservations_for_day(dt.date(2026,11,14), self.snapshot, self.config)
            actual = load_reservations(dt.date(2026,11,14), root, out)
            self.assertEqual(actual, frozen | {"https://lasacraimmobiliare.it/products/live-only-asset"})
            # A malformed live register MUST NOT silently bypass reservations.
            live["reservations"]["2026-11-14"][0]["status"]["facebook"] = "UNKNOWN"
            (out / "metricool-central-reservations.json").write_text(json.dumps(live))
            with self.assertRaises(ValueError):
                load_reservations(dt.date(2026,11,14), root, out)

    def test_operational_count_is_not_frozen_count(self):
        live = {
            "source": "Metricool brand 7844901 / getScheduledPosts",
            "checked_at": "2026-11-14",
            "reservations": {"2026-11-15": [{
                "metricool_id": 987,
                "urls": ["https://lasacraimmobiliare.it/products/casa-test"],
                "status": {"facebook": "PENDING", "instagram": "PENDING"},
                "publication_date": "2026-11-15T10:00:00",
            }]},
        }
        expected = {"https://lasacraimmobiliare.it/products/casa-test"}
        self.assertEqual(current_reservations_for_day(dt.date(2026,11,15), live, self.config), expected)
        live["reservations"]["2026-11-15"].append({
            **live["reservations"]["2026-11-15"][0], "metricool_id": 988,
        })
        with self.assertRaises(ValueError):
            current_reservations_for_day(dt.date(2026,11,15), live, self.config)

    def test_real_operational_inventory_is_structurally_valid(self):
        # Integration check, never a source of assertions about historical counts.
        self.assertTrue(load_reservations(dt.date(2026,11,14), ROOT, OUT))


if __name__=="__main__":
    unittest.main()
