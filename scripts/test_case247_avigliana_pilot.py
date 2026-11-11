"""Safety checks for the first territorial Meta connection: Avigliana."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def text(path):
    return (ROOT / path).read_text(encoding="utf-8")
def doc(path):
    return json.loads(text(path))

class AviglianaPilotTests(unittest.TestCase):
    def test_single_existing_app_and_no_live_flip(self):
        cfg=doc("config/case247-territorio.json")
        self.assertEqual(len(cfg["towns"]),41)
        t=next(x for x in cfg["towns"] if x["id"]=="avigliana")
        self.assertFalse(t["auto_publish"])
        self.assertFalse(t["meta_pilot"]["publishing_enabled"])
        self.assertEqual(t["channels"]["facebook"]["url"],"")
        self.assertEqual(t["channels"]["instagram"]["url"],"")
        self.assertEqual(t["meta_pilot"]["backend_function"],"case247-territory-connect")
    def test_admin_only_backend(self):
        code=text("supabase/functions/case247-territory-connect/index.ts")
        for required in ('case247_admins','getUser(access)','case247_meta_credentials',
                         'case247_territorial_meta_accounts','me/accounts','me/permissions',
                         'CREATE_CONTENT','instagram_content_publish','pages_manage_posts',
                         'INSTAGRAM_PROFESSIONAL_NOT_LINKED','VERIFIED_PENDING_DISPATCH',
                         'publishing_enabled:false','const ORIGIN = "https://josephsocialmedia2-spec.github.io"'):
            self.assertIn(required,code)
        self.assertNotIn("console.log(token",code)
        self.assertNotIn("access_token:page.access_token",code)
    def test_user_interface_is_only_linking_not_publishing(self):
        ui=text("gestione/territori/avigliana/index.html")
        home=text("gestione/index.html")
        self.assertIn("case247-territory-connect",ui)
        self.assertIn('case247-meta-callback?action=start',ui)
        self.assertIn('Verifica e collega questa coppia',ui)
        self.assertIn('Pubblicazione ancora disattivata',ui)
        self.assertIn('./territori/avigliana/',home)
    def test_avigliana_geometry_exists(self):
        geo=doc("config/case247-geo-verified.json")["towns"]
        self.assertIn("avigliana",geo)
        self.assertIn("bbox",geo["avigliana"])
    def test_existing_scheduler_stays_gated(self):
        workflow=text(".github/workflows/case247-territorial-publisher.yml")
        self.assertIn("CASE247_TERRITORIAL_LIVE",workflow)
        self.assertIn("github.ref == 'refs/heads/main'",workflow)
        self.assertIn("CASE247_TERRITORIAL_ACCOUNTS_JSON",workflow)

if __name__=="__main__":
    unittest.main()
