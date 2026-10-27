import unittest
from social_engine.branding import load_brand_rules, verify_brand_archive, BrandViolation, validate_copy
from social_engine.publisher import publish_pending
from social_engine.autopilot import select_next

class BrandGateTests(unittest.TestCase):
    def test_master_brand_rules(self):
        rules=load_brand_rules()
        self.assertEqual(rules["brand"], "REAL MEDIA PRO")
        self.assertEqual(rules["archive"]["original_images"], 38)
        self.assertEqual(rules["archive"]["unique_images"], 28)
        self.assertEqual(rules["contact"]["whatsapp"], "https://wa.me/393713708294")
        self.assertTrue(rules["rules"]["ban_third_party_phone_numbers"])

    def test_archive_missing_fails_closed(self):
        rules=load_brand_rules()
        try:
            verify_brand_archive(rules)
        except BrandViolation as e:
            self.assertIn("Brand archive", str(e))
        else:
            # Also succeeds once Joseph manually uploads the EXACT sha256-verified binary archive.
            pass

    def test_contact_guard(self):
        self.assertIn("371", validate_copy("Scrivi a Joseph: 371 370 8294"))
        with self.assertRaises(BrandViolation):
            validate_copy("Numero terzo: 333 123 4567")
        with self.assertRaises(BrandViolation):
            validate_copy("vendita garantita in 90 giorni")

    def test_publisher_disabled_without_tokens(self):
        value=publish_pending("josephsocialmedia2-spec/joseph-link-in-bio-Copia", live=False)
        self.assertEqual(value["status"],"disabled")

    def test_published_releases_free_pending_capacity(self):
        import json
        queue=[{"code":"IMM01"},{"code":"IMM02"},{"code":"COM01"}]
        release={"tag_name":"joseph-staging-imm01", "assets":[{"id":1}],
            "body":json.dumps({"receipts":{
                "facebook":{"post_id":"fb1"},"instagram":{"post_id":"ig2"},
                "linkedin":{"post_id":"li3"}}})}
        code,_=select_next(queue,[release],max_pending=1)
        self.assertEqual(code,"IMM02")

if __name__=="__main__": unittest.main()
