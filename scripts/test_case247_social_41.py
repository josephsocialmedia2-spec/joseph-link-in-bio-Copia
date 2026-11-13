"""41-town network checks: no synthetic Meta accounts, fail-closed 10km routing."""
import json
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(path):return (ROOT/path).read_text(encoding="utf-8")
def load(path):return json.loads(read(path))
class SocialNetwork41Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original=load("config/case247-territorio.json")
        cls.setup=load("config/case247-territorial-social-setup.json")
        cls.by_id={t["town_id"]:t for t in cls.setup["towns"]}
    def test_41_towns_and_82_reserved_destinations(self):
        a={x["id"] for x in self.original["towns"]}
        b={x["town_id"] for x in self.setup["towns"]}
        self.assertEqual(len(a),41)
        self.assertEqual(a,b)
        self.assertEqual(self.setup["desired_facebook_pages"],41)
        self.assertEqual(self.setup["desired_instagram_professional_accounts"],41)
        self.assertEqual(self.setup["distribution_radius_km"],10)
        for t in self.original["towns"]:
            self.assertEqual(t["social_onboarding"]["status"],"PREPARED_NOT_CREATED")
            self.assertEqual(t["social_onboarding"]["radius_km"],10)
            self.assertFalse(t["auto_publish"])
            self.assertFalse(t["social_onboarding"]["publishing_enabled"])
            self.assertTrue((ROOT/("paesi/"+t["id"]+"/index.html")).is_file())
    def test_no_created_pages_claimed_and_unique_handles(self):
        handles=set()
        for t in self.setup["towns"]:
            self.assertIsNone(t["facebook"]["provider_id"])
            self.assertIsNone(t["instagram"]["provider_id"])
            self.assertIsNone(t["facebook"]["url"])
            self.assertIsNone(t["instagram"]["url"])
            self.assertFalse(t["publishing_enabled"])
            self.assertTrue(t["facebook"]["planned_name"].endswith(t["name"]))
            handle=t["instagram"]["suggested_username"]
            self.assertRegex(handle,r"^[a-z0-9_.]{1,30}$")
            self.assertNotIn(handle,handles)
            handles.add(handle)
        self.assertEqual(len(handles),41)
    def test_secure_bulk_meta_linker(self):
        edge=read("supabase/functions/case247-territory-connect/index.ts")
        self.assertIn("const TOWNS=",edge)
        self.assertIn('body?.mode==="scan"',edge)
        self.assertIn('case247_admins',edge)
        self.assertIn("getUser(access)",edge)
        self.assertIn("case247_meta_credentials",edge)
        self.assertIn("case247_territorial_meta_accounts",edge)
        self.assertIn("VERIFIED_PENDING_DISPATCH",edge)
        self.assertIn("CREATE_CONTENT",edge)
        self.assertIn("instagram_content_publish",edge)
        self.assertIn("publishing_enabled:false",edge)
        self.assertNotIn("/media_publish",edge)
        self.assertNotIn("/photos",edge)
    def test_admin_panel_uses_existing_app(self):
        ui=read("gestione/territori/index.html")
        home=read("gestione/index.html")
        self.assertIn("case247-territory-connect",ui)
        self.assertIn("scanned_towns",ui)
        self.assertIn('mode:"scan"',ui)
        self.assertIn('href="./territori/"',home)
    def test_10km_landing_catalog_is_restricted(self):
        js=read("immobili/catalogo.js")
        self.assertIn("MAX_RADIUS_KM = 10",js)
        self.assertIn("localRadiusEligible",js)
        self.assertIn("case247-geo-verified.json",js)
        self.assertIn("location_status !== 'VERIFICATO_FONTE'",js)
        self.assertIn("Promise.all",js)
        self.assertIn("Immobili dei comuni vicini entro 10 km",js)
        self.assertNotIn("Nessun altro immobile corrisponde ai filtri",js)
    def test_publisher_gates_preserved(self):
        workflow=read(".github/workflows/case247-territorial-publisher.yml")
        self.assertIn("CASE247_TERRITORIAL_LIVE",workflow)
        self.assertIn("CASE247_TERRITORIAL_ACCOUNTS_JSON",workflow)
        self.assertIn("github.ref == 'refs/heads/main'",workflow)
if __name__=="__main__":unittest.main()
