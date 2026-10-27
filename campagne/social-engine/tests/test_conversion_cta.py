"""Regression tests: every platform caption includes form, optional consent and guide."""
import unittest

from social_engine.caption_engine import load_conversion_cta, attach_mandatory_cta, validate_mandatory_cta
from social_engine.branding import BrandViolation


class ConversionCTATests(unittest.TestCase):
    def test_config_approved_links_and_free_consent(self):
        p = load_conversion_cta()
        self.assertIn("#modulo-whatsapp", p["form_url"])
        self.assertTrue(p["guide_url"].endswith(".pdf"))
        self.assertTrue(p["consent"]["optional"])
        self.assertFalse(p["consent"]["default_checked"])
        self.assertTrue(p["consent"]["not_a_condition_of_download"])
        self.assertIs(p["consent"]["enabled"], False)

    def test_new_caption_gets_both_real_links(self):
        for platform in ("facebook", "instagram", "linkedin"):
            text = attach_mandatory_cta("Analizza i prezzi richiesti del mercato locale per " + platform)
            validate_mandatory_cta(text)
            self.assertIn("consenso facoltativo", text)
            self.assertIn("non è ancora attivabile", text)
            self.assertIn("iscrizione resta sospesa", text)
            self.assertEqual(text.count("https://"), 2)

    def test_idempotent_append(self):
        a = attach_mandatory_cta("Proprietari di Avigliana: i dati spiegati.")
        self.assertEqual(attach_mandatory_cta(a), a)

    def test_reject_claim_that_disabled_opt_in_is_live(self):
        text = attach_mandatory_cta("Spunta la casella del consenso e riceverai le promozioni.")
        with self.assertRaises(BrandViolation):
            validate_mandatory_cta(text)

    def test_missing_link_or_consent_is_rejected(self):
        with self.assertRaises(BrandViolation):
            validate_mandatory_cta("Scrivi e scarica la guida!")
        p = load_conversion_cta()
        with self.assertRaises(BrandViolation):
            validate_mandatory_cta(p["form_url"] + " " + p["guide_url"])

if __name__ == "__main__":
    unittest.main()
