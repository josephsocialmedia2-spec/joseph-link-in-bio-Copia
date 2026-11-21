"""Test di regressione del generatore editoriale settimanale."""
import datetime as dt
import importlib.util
import pathlib
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("weekly",ROOT/"scripts/real_estate_weekly_autopub.py")
mod=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

class WeeklyEditorialTest(unittest.TestCase):
    def test_source_integrity(self):
        for name,url,domain in mod.SOURCES:
            self.assertTrue(url.startswith("https://"),url)
            self.assertIn(domain,url)
        self.assertEqual(len(mod.OMI),3)
        self.assertEqual(mod.OMI[0],("C1","Abitazioni civili · normale",1000,1500))

    def test_no_rounded_cards(self):
        self.assertIn("border-radius:0!important",mod.CSS)
        self.assertIn("size:A4 portrait",mod.CSS)
        self.assertIn("grid-template-columns:106mm 57mm",mod.CSS)

    def test_source_escaping(self):
        text=mod.html_news({"publisher":"Idealista","date":"2026-11-20","title":"<script>alert(1)</script>",
                           "summary":"<b>test</b>","url":"https://www.idealista.it/news/item"})
        self.assertNotIn("<script>",text)
        self.assertNotIn("<b>test</b>",text)
        self.assertIn("&lt;script&gt;",text)

    def test_static_copy_has_no_unverified_sales(self):
        text=" ".join(mod.intro_paragraphs())
        self.assertIn("professionisti abilitati",text)
        self.assertNotIn("venduto in 40 giorni",text)
        self.assertIn("dossier",mod.chart().lower())
        self.assertIn("non prezzi di rogito",mod.chart().lower())

    def test_date_and_qr_target(self):
        self.assertTrue(mod.BASE.startswith("https://josephsocialmedia2-spec.github.io/"))
        self.assertIn("/gestione/rivista/edizioni/auto",mod.BASE)

if __name__=="__main__":
    unittest.main()
