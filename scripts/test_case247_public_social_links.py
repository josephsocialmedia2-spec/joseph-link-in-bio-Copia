"""Public Facebook/Instagram links are released only after verified Meta identity."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def f(p):return (ROOT/p).read_text(encoding='utf-8')
class SocialLinksTests(unittest.TestCase):
    def test_public_function_read_only(self):
        s=f('supabase/functions/case247-public-territory-social/index.ts')
        self.assertIn('if(req.method!=="GET")',s)
        self.assertIn('case247_territorial_meta_accounts',s)
        self.assertIn('VERIFIED_PENDING_DISPATCH',s)
        self.assertIn('fb.page_id)!==String(ig.page_id)',s)
        self.assertIn('validSocialLink',s)
        self.assertNotIn('encrypted_token',s)
        self.assertNotIn('.insert(',s)
        self.assertNotIn('.upsert(',s)
        self.assertNotIn('.update(',s)
        self.assertNotIn('access_token:',s)
    def test_shared_catalog_ui_remains_fail_closed(self):
        s=f('immobili/catalogo.js')
        self.assertIn('if(!data.verified||!data.facebook_url||!data.instagram_url)return;',s)
        self.assertIn('case247-public-territory-social?town_id=',s)
        self.assertIn('facebook.com',s)
        self.assertIn('instagram.com',s)
        self.assertIn("if(townId)renderVerifiedSocialLinks();",s)
        self.assertIn("localRadiusEligible",s)
    def test_no_plausible_faux_instagram_urls(self):
        import json
        cfg=json.loads(f('config/case247-territorio.json'))
        self.assertEqual(len(cfg['towns']),41)
        for t in cfg['towns']:
            self.assertFalse(t['auto_publish'])
            self.assertFalse(t['social_onboarding']['publishing_enabled'])
if __name__=='__main__':unittest.main()
