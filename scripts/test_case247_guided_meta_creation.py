"""Guided Meta creation uses official websites and never simulates account creation."""
import json
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def content(path):return (ROOT/path).read_text(encoding="utf-8")
class GuidedMetaCreationTests(unittest.TestCase):
 def test_official_creation_and_connection_urls(self):
  page=content("gestione/territori/index.html")
  self.assertIn('https://www.facebook.com/pages/create',page)
  self.assertIn('https://www.instagram.com/accounts/emailsignup/',page)
  self.assertIn('https://business.facebook.com/',page)
  self.assertIn('case247-territory-connect',page)
  self.assertIn('id="creation-wizard"',page)
  self.assertIn('id="wizard-town"',page)
  self.assertIn('id="verify-selected"',page)
 def test_no_fake_success_and_one_original_meta_app(self):
  page=content("gestione/territori/index.html")
  cfg=json.loads(content("config/case247-territorial-social-setup.json"))
  self.assertEqual(len(cfg["towns"]),41)
  self.assertEqual(len({t["instagram"]["suggested_username"] for t in cfg["towns"]}),41)
  self.assertIn('non ha creato pagine o post',page)
  self.assertIn('non ancora attiva',page)
  self.assertIn('if(!town||!session)return;',page)
  self.assertIn('mode:"scan"',page)
  self.assertNotIn('POST /me/accounts',page)
 def test_separate_verification_and_browsing(self):
  page=content("gestione/territori/index.html")
  self.assertIn('pickTown(town.town_id)',page)
  self.assertIn('body:{town_id:town.town_id,page_id:matches[0].page_id}',page)
  self.assertIn('if(matches.length!==1)',page)
  self.assertIn('window.location',content('gestione/territori/avigliana/index.html'))
 def test_scheduler_keeps_default_live_gate(self):
  workflow=content(".github/workflows/case247-territorial-publisher.yml")
  self.assertIn('vars.CASE247_TERRITORIAL_LIVE',workflow)
  self.assertIn('CASE247_TERRITORIAL_ACCOUNTS_JSON',workflow)
if __name__=="__main__":unittest.main()
