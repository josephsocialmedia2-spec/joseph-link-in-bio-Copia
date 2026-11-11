"""Regression checks for the CASE247 privacy-first flyer funnel."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("flyer",ROOT/"scripts"/"case247_apply_flyer_cta.py")
flyer=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(flyer)

class FlyerCaptionTests(unittest.TestCase):
    def setUp(self):
        self.cfg=json.loads((ROOT/"branding"/"flyer-cta.json").read_text(encoding="utf-8"))
    def test_disabled_gate_never_injects(self):
        job={"id":"test","platform":"facebook","caption":"Test"}
        self.assertFalse(flyer.transform(job,self.cfg))
        self.assertEqual(job["caption"],"Test")
    def test_active_cta_exactly_once(self):
        cfg={**self.cfg,"enabled":True}
        for platform in ("facebook","instagram"):
            job={"id":"test","platform":platform,"caption":"Test caption"}
            self.assertTrue(flyer.transform(job,cfg))
            self.assertEqual(job["caption"].count(cfg["landing_url"]),1)
            self.assertFalse(flyer.transform(job,cfg))
    def test_form_does_not_publish_phone_numbers(self):
        page=(ROOT/"campagne"/"case247"/"volantino"/"index.html").read_text(encoding="utf-8")
        self.assertIn('name="nome"',page)
        self.assertIn('name="cognome"',page)
        self.assertIn('name="telefono"',page)
        self.assertNotIn("10njebDKvOjL2QmGfx9zaTNawdqPEABVO",page)
    def test_marketing_is_never_forced(self):
        fn=(ROOT/"supabase"/"functions"/"case247-flyer-download"/"index.ts").read_text(encoding="utf-8")
        self.assertIn("consenso_marketing:false",fn)
        self.assertIn("privacy_notice_approved",fn)
        self.assertIn('CASE247_FLYER_GATE_ENABLED',fn)
        self.assertIn('ANTIBOT_REQUIRED',fn)

if __name__=="__main__":unittest.main()
