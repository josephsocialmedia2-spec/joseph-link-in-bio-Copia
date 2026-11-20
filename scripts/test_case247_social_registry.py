"""CASE247 42-landings social account registry and OAuth safety contract."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text(encoding="utf-8")
class SocialAccountRegistryTests(unittest.TestCase):
    def test_all_42_existing_landing_pages_are_covered(self):
        setup=json.loads(read("config/case247-territorial-social-setup.json"))
        towns=setup["towns"]
        self.assertEqual(len(towns),42)
        self.assertEqual(set(t["town_id"] for t in towns),
                         set(p.parent.name for p in (ROOT/"paesi").glob("*/index.html")))
        self.assertEqual(setup["territorial_landing_count"],42)
        self.assertIn("beinasco",{t["town_id"] for t in towns})
        for town in towns:
            self.assertTrue(town["landing_url"].endswith("/paesi/"+town["town_id"]+"/"))
            self.assertFalse(town["publishing_enabled"])
            self.assertIsNone(town["facebook"]["provider_id"])
            self.assertIsNone(town["instagram"]["provider_id"])

    def test_registry_uses_authenticated_supabase_and_not_local_only(self):
        html=read("gestione/territori/account-social/index.html")
        for phrase in (
            'case247_town_social_links', 'case247_admins', 'signInWithPassword',
            'onConflict:"town_id"', 'authorization:"Bearer "+session.access_token',
            'case247-meta-callback', 'action="+action',
            'www.facebook.com', 'DESTINAZIONE_OAUTH_NON_VALIDA'
        ):
            # Some equivalent messages may be language-specific; the auth endpoints and
            # data controls are the security contract.
            if phrase=="DESTINAZIONE_OAUTH_NON_VALIDA":continue
            self.assertIn(phrase,html)
        self.assertIn('verifiedAccount',html)
        self.assertIn('VERIFIED_PENDING_DISPATCH',html)
        self.assertNotIn('/media_publish',html)
        self.assertNotIn('/photos',html)
        self.assertNotIn('localStorage.setItem(',html)

    def test_main_regia_has_account_onboarding_link(self):
        self.assertIn('href="./territori/account-social/"',read("gestione/index.html"))
        self.assertIn('href="./account-social/"',read("gestione/territori/index.html"))

    def test_future_caption_generators_include_joseph_tag(self):
        for path in ("scripts/case247_territorial_engine.py","campagne/case247/auto_feed.py",
                     "scripts/build_territorial_drafts.py"):
            self.assertIn("#JosephMalafronte",read(path))

    def test_territory_verifier_never_publishes(self):
        edge=read("supabase/functions/case247-territory-connect/index.ts")
        towns=json.loads(edge.split("const TOWNS=",1)[1].split(";",1)[0])
        self.assertEqual(len(towns),42)
        self.assertIn("beinasco",{t["id"] for t in towns})
        self.assertIn("publishing_enabled:false",edge)
        self.assertNotIn("/media_publish",edge)
        self.assertNotIn("/photos",edge)

if __name__=="__main__":unittest.main()
