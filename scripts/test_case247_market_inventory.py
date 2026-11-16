"""Deterministic tests for conservative four-town public market index monitoring."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from case247_market_inventory import SOURCES, TOWNS, collect, parse_page, markdown

class MarketTests(unittest.TestCase):
    def test_exact_geography_and_allowed_portals(self):
        self.assertEqual(set(t for _,t,_ in SOURCES), set(TOWNS))
        self.assertEqual(len(SOURCES), 8)
        self.assertTrue(all("immobiliare.it" in u or "casadaprivato.it" in u for _,_,u in SOURCES))

    def test_private_index_does_not_include_nearby_town(self):
        html = """<h1>Case in vendita da Privati a Condove</h1>
        <h2>3 annunci di case</h2>
        <h3><a href="/case-indipendenti/casa-montagna-torino-111">Casa montagna</a></h3>
        <h2>Immobili e case simili nelle vicinanze di Condove</h2>
        <a href="/case-indipendenti/casa-vaie-torino-222">Casa a Vaie</a>"""
        result = parse_page(html,"CasaDaPrivato","Condove", "https://www.casadaprivato.it/annunci-vendita/immobili/torino-condove")
        self.assertEqual(result["reported_count"],3)
        self.assertEqual(len(result["listings"]),1)
        self.assertTrue(result["listings"][0]["url"].endswith("-111"))
        self.assertEqual(result["listings"][0]["contact_permission"],"NO PROPOSTE COMMERCIALI")

    def test_immobiliare_private_label_not_trusted(self):
        html = """<h1>Case da privati in vendita Avigliana</h1>241 risultati
        <a href="https://www.immobiliare.it/annunci/1000/">Annuncio A</a>
        <a href="https://www.immobiliare.it/annunci/1000/?utm_source=x">Annuncio A bis</a>
        <a href="https://www.immobiliare.it/annunci/1001/">Annuncio B</a>"""
        result = parse_page(html,"Immobiliare.it","Avigliana","https://www.immobiliare.it/vendita-case/avigliana/da-privati/")
        self.assertEqual(result["reported_count"],241)
        self.assertEqual(result["extracted_links"],2)
        self.assertTrue(all("DA_VERIFICARE" in x["owner_status"] for x in result["listings"]))

    def test_source_disallowed_by_robots_no_result_claim(self):
        def fetch(url):
            if url.endswith("robots.txt"):
                return "User-agent: *\nDisallow: /\n"
            raise AssertionError("Must never fetch disallowed page")
        out=collect(fetch=fetch, sleep=lambda _s:None)
        self.assertEqual(out["unique_listing_links"],0)
        self.assertEqual(out["status"],"PARZIALE")
        self.assertTrue(all(s["status"]=="NON_CONSENTITO_DA_ROBOTS" for s in out["sources"]))
        self.assertIn("non disponibile",markdown(out))

    def test_missing_robots_is_not_implicitly_allowed(self):
        def fetch(url):
            raise RuntimeError("blocked")
        out=collect(fetch=fetch, sleep=lambda _s:None)
        self.assertEqual(out["status"],"PARZIALE")
        self.assertTrue(all(s["status"]=="ROBOTS_NON_VERIFICABILE" for s in out["sources"]))

if __name__=="__main__":
    unittest.main()
