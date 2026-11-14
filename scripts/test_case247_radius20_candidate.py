"""Regression tests for candidate-only 20 km migration, never changing production."""
import json
import unittest

from case247_radius20_preview import ROOT, preview
from case247_territorial_engine import eligible_towns


class RadiusCandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads((ROOT / "config/case247-territorio.json").read_text())
        cls.candidate = json.loads((ROOT / "config/case247-radius20-candidate.json").read_text())
        cls.catalog = json.loads((ROOT / "immobili/catalogo.json").read_text())
        cls.geo = json.loads((ROOT / "config/case247-geo-verified.json").read_text())["towns"]

    def test_20km_stays_candidate_only(self):
        self.assertEqual(self.config["coverage_radius_km"], 10)
        self.assertTrue(self.candidate["never_publish_from_candidate"])
        self.assertEqual(self.candidate["status"], "PROPOSAL_DRY_RUN_ONLY")
        self.assertEqual(len(self.config["towns"]), 42)
        self.assertEqual(len(self.geo), 42)
        self.assertTrue(all(not town["auto_publish"] for town in self.config["towns"]))

    def test_20km_eligibility_superset_not_duplicate_publication(self):
        result = preview(self.config, self.catalog, self.geo, self.candidate)
        self.assertEqual(result["mode"], "READ_ONLY_NO_PUBLISH")
        self.assertGreaterEqual(result["listings_with_town_20km"], result["listings_with_town_10km"])
        self.assertGreaterEqual(result["additional_candidate_pairs"], 0)
        self.assertGreaterEqual(result["listings_eligible_for_multiple_towns_20km"], 0)
        self.assertEqual(result["town_count"], 42)

    def test_boundary_examples_expand_only_in_candidate(self):
        listing = {"town_id": "source", "location_status": "VERIFICATO_FONTE"}
        source = {"lat": 45.10, "lon": 7.29, "bbox": [45.09, 45.11, 7.28, 7.30]}
        near = {"lat": 45.21, "lon": 7.29, "bbox": [45.20, 45.22, 7.28, 7.30]}
        far = {"lat": 46.1, "lon": 7.29, "bbox": [46.09, 46.11, 7.28, 7.30]}
        towns = [{"id": "source"}, {"id": "near"}, {"id": "far"}]
        geo = {"source": source, "near": near, "far": far}
        ten = {t["id"] for t, _ in eligible_towns(listing, towns, geo, radius=10)}
        twenty = {t["id"] for t, _ in eligible_towns(listing, towns, geo, radius=20)}
        self.assertNotIn("near", ten)
        self.assertIn("near", twenty)
        self.assertNotIn("far", twenty)

    def test_invalid_candidate_cannot_override_10km(self):
        for override in ({"status": "ACTIVE"}, {"never_publish_from_candidate": False},
                         {"production_radius_km": 20}):
            with self.subTest(override=override), self.assertRaises(ValueError):
                preview(self.config, self.catalog, self.geo, {**self.candidate, **override})


if __name__ == "__main__":
    unittest.main()
