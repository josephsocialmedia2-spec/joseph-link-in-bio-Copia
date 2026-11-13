"""Offline regression tests for CASE247 editorial safety audit."""
import tempfile
import unittest
from pathlib import Path
from case247_quality_gate import inspect


def base(root):
    asset = root / "assets" / "first.jpg"
    asset.parent.mkdir(parents=True, exist_ok=True)
    asset.write_bytes(b"\xff\xd8\xff" + b"0" * 256)
    config = {"coverage_radius_km": 10, "towns": [{"id": "avigliana", "auto_publish": False,
                         "channels": {"facebook": {"status": "DA_VERIFICARE"},
                                      "instagram": {"status": "DA_VERIFICARE"}}}]}
    manifest = {"total": 1, "entries": [{
        "id": "A", "asset": "assets/first.jpg",
        "public_image_url": "https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/assets/first.jpg",
        "approval": "APPROVED", "requires_fact_check": False,
        "ai_generated": True,
    }]}
    plan = {"max_distance_km": 10, "assignments": [], "ready_for_provider": 0}
    return config, manifest, plan


class QualityGateTests(unittest.TestCase):
    def test_safe_but_unconnected_reports_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            config, manifest, plan = base(root)
            out = inspect(config, manifest, plan, root=root)
            self.assertEqual(out["state"], "BLOCKED_NO_VERIFIED_META_ACCOUNTS")
            self.assertEqual(out["counts"]["missing_or_invalid_jpg"], 0)

    def test_unauthorized_active_channel_is_error(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            config, manifest, plan = base(root)
            config["towns"][0]["channels"]["facebook"]["status"] = "ACTIVE_VERIFIED"
            out = inspect(config, manifest, plan, root=root)
            self.assertEqual(out["state"], "INVALID_CONFIGURATION")
            self.assertIn("UNSAFE_VERIFIED_CHANNEL", out["problems"])

    def test_duplicate_asset_is_error(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            config, manifest, plan = base(root)
            manifest["total"] = 2
            manifest["entries"].append(dict(manifest["entries"][0]))
            out = inspect(config, manifest, plan, root=root)
            self.assertIn("MANIFEST_DUPLICATE_ASSET", out["problems"])

    def test_radius_policy_and_plan_must_match(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            config, manifest, plan = base(root)
            config["coverage_radius_km"] = 20
            out = inspect(config, manifest, plan, root=root)
            self.assertIn("INVALID_10KM_COVERAGE_CONFIG", out["problems"])
            config["coverage_radius_km"] = 10
            plan["max_distance_km"] = 20
            out = inspect(config, manifest, plan, root=root)
            self.assertIn("PLAN_RADIUS_POLICY_MISMATCH", out["problems"])

    def test_verified_distance_cannot_exceed_ten_km(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            config, manifest, plan = base(root)
            plan["assignments"] = [{"type": "IMMOBILE", "date": "2026-11-13",
                                    "listing_id": "123", "distance_upper_bound_km": 11.5}]
            out = inspect(config, manifest, plan, root=root)
            self.assertIn("OUT_OF_RADIUS_ASSIGNMENT", out["problems"])

    def test_pending_graphic_not_auto_approved(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            config, manifest, plan = base(root)
            manifest["entries"][0]["approval"] = "PENDING"
            manifest["entries"][0]["requires_fact_check"] = True
            out = inspect(config, manifest, plan, root=root)
            self.assertEqual(out["counts"]["unapproved_assets"], 1)


if __name__ == "__main__":
    unittest.main()
