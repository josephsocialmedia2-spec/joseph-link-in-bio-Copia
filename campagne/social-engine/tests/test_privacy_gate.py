"""Static privacy gates for the public lead form (no external API, no personal data)."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[3]
LEAD = ROOT / "campagne" / "immobiliare" / "valore-casa" / "index.html"
PRIVACY = ROOT / "privacy-censimento" / "index.html"
GUIDE = ROOT / "campagne" / "immobiliare" / "valore-casa" / "Guida_Quanto_Vale_La_Mia_Casa_Joseph_Digital_Strategist.pdf"


class PrivacyGateTests(unittest.TestCase):
    def test_marketing_optin_explicitly_disabled_until_notice_validated(self):
        text = LEAD.read_text(encoding="utf-8")
        self.assertRegex(text, r'id="marketingConsent"[^>]*\bdisabled\b')
        self.assertNotRegex(text, r'id="marketingConsent"[^>]*\brequired\b')
        self.assertNotRegex(text, r'id="marketingConsent"[^>]*\bchecked\b')
        self.assertIn("nessun consenso raccolto", text.lower())
        self.assertIn("iscrizione temporaneamente non attiva", text.lower())

    def test_request_and_pdf_download_remain_separate(self):
        text = LEAD.read_text(encoding="utf-8")
        self.assertIn('id="valuationForm"', text)
        self.assertIn('id="guida-gratuita"', text)
        self.assertIn('href="Guida_Quanto_Vale_La_Mia_Casa_Joseph_Digital_Strategist.pdf"', text)
        self.assertIn('download="Guida_Quanto_Vale_La_Mia_Casa_Joseph_Digital_Strategist.pdf"', text)
        self.assertTrue(GUIDE.is_file())

    def test_named_controller_visible_in_notice_and_lead_pages(self):
        privacy = PRIVACY.read_text(encoding="utf-8")
        home = LEAD.read_text(encoding="utf-8")
        second = (ROOT / "campagne" / "immobiliare" / "vendere-seconda-casa" / "index.html").read_text(encoding="utf-8")
        for page in (privacy, home, second):
            self.assertIn("Joseph Malafronte", page)
            self.assertIn("persona fisica", page)
        self.assertIn("REAL MEDIA PRO", privacy)
        self.assertIn("recapito postale", privacy.lower())

    def test_privacy_notice_does_not_claim_full_validation(self):
        text = PRIVACY.read_text(encoding="utf-8").lower()
        self.assertIn("informativa in completamento", text)
        self.assertIn("id=\"richieste-web\"", text)
        self.assertIn("casella per iscriversi alle comunicazioni promozionali è temporaneamente disattivata", text)
        self.assertIn("titolar", text)

if __name__ == "__main__":
    unittest.main()
