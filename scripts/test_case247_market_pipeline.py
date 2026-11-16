"""Deterministic offline tests for sitemap parser and multi-source Excel pipeline."""
import json
import sys
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import case247_sitemap_sources as sm
import case247_market_consolidate as co


ROBOTS_OK = b"User-agent: *\nAllow: /\n"
XML_INDEX = b"""<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>https://www.example.it/properties.xml</loc></sitemap></sitemapindex>"""
XML_URLS = b"""<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://www.example.it/annuncio/avigliana-123</loc><lastmod>2026-11-15</lastmod></url>
<url><loc>https://www.example.it/annuncio/almese-999</loc></url>
<url><loc>https://www.example.it/annuncio/buttigliera-alta-vicino-avigliana-333</loc></url>
<url><loc>https://www.example.it/annuncio/torino-123</loc></url>
<url><loc>https://www.other.it/annuncio/condove-456</loc></url>
</urlset>"""


class SitemapTests(unittest.TestCase):
    def test_read_config_source_empty_is_accepted(self):
        sm.read_config(Path(__file__).resolve().parents[1] / "config/case247-sitemaps.json")

    def test_sitemap_category_urls_are_not_individual_properties(self):
        self.assertFalse(sm.is_individual_listing("https://www.immobiliare.it/vendita-negozi/avigliana/"))
        self.assertFalse(sm.is_individual_listing("https://www.immobiliare.it/affitto-capannoni/almese/"))
        self.assertFalse(sm.is_individual_listing("https://example.it/annunci/case-in-vendita/condove/"))
        self.assertTrue(sm.is_individual_listing("https://www.immobiliare.it/annunci/123456789/"))
        self.assertTrue(sm.is_individual_listing("https://www.casadaprivato.it/case-indipendenti/villa-torino-123456"))
        self.assertTrue(sm.is_individual_listing("https://example.it/annuncio/avigliana-123"))

    def test_local_agency_url_patterns_without_fake_numeric_id(self):
        self.assertTrue(sm.is_individual_listing(
            "https://teckimmobiliare.it/properties/appartamento/avigliana/affascinante-appartamento-con-vista-sulla-sacra-ad-avigliana/"))
        self.assertTrue(sm.is_individual_listing(
            "https://lasacraimmobiliare.it/products/appartamento-sa-santambrogio"))
        self.assertTrue(sm.is_individual_listing(
            "https://lasacraimmobiliare.it/products/bilocale-in-vendita-a-sant-ambrogio-disponibile-subito"))
        self.assertFalse(sm.is_individual_listing(
            "https://teckimmobiliare.it/properties/appartamento/avigliana/"))
        self.assertFalse(sm.is_individual_listing(
            "https://lasacraimmobiliare.it/collections/tutti-gli-immobili"))
        self.assertFalse(sm.is_individual_listing(
            "https://lasacraimmobiliare.it/products/avigliana-attivita-bar-ristorante"))
        self.assertEqual(sm.municipality(
            "https://lasacraimmobiliare.it/products/appartamento-sa-santambrogio"),
            "Sant'Ambrogio di Torino")

    def test_agency_results_not_marked_private(self):
        xml = b'<urlset><url><loc>https://teckimmobiliare.it/properties/appartamento/avigliana/trilocale-con-vista</loc></url></urlset>'
        def fetch(url):
            return ROBOTS_OK if url.endswith("robots.txt") else xml
        source = {"name":"Teck", "host":"teckimmobiliare.it",
                  "sitemap_url":"https://teckimmobiliare.it/sitemap.xml", "kind":"AGENZIA"}
        result = sm.collect_source(source, fetch)
        self.assertEqual(len(result["listings"]), 1)
        item = result["listings"][0]
        self.assertEqual(item["source_type"], "AGENZIA")
        self.assertEqual(item["owner_status"], "AGENZIA - NON PRIVATO")
        merged = co.merge([{"sources":[result], "listings":result["listings"]}])
        self.assertEqual(merged["listings"][0]["market_segment"], "AGENZIA")
        self.assertNotIn("SI", merged["listings"][0]["contact_permission"])

    def test_auction_reference_is_not_an_ordinary_listing(self):
        out = co.merge([{"sources":[{
            "source":"Portale delle Vendite Pubbliche - Ministero Giustizia",
            "town":"", "status":"SOLO_CONSULTAZIONE",
            "index_url":"https://pvp.giustizia.it/pvp/", "source_type":"ASTE"
        }], "listings":[]}])
        self.assertEqual(out["listing_count"], 0)
        self.assertEqual(out["source_errors"], 0)
        self.assertEqual(out["sources"][0]["source_type"], "ASTE")

    def test_sitemap_nested_index_and_scope(self):
        calls = []
        def fetch(url):
            calls.append(url)
            return {
                "https://www.example.it/robots.txt": ROBOTS_OK,
                "https://www.example.it/sitemap.xml": XML_INDEX,
                "https://www.example.it/properties.xml": XML_URLS,
            }[url]
        source = {"name":"Test feed", "host":"www.example.it",
                  "sitemap_url":"https://www.example.it/sitemap.xml"}
        result = sm.collect_source(source, fetch)
        self.assertEqual(result["status"], "OK")
        self.assertEqual({x["town"] for x in result["listings"]}, {"Avigliana","Almese"})
        self.assertEqual(len(result["listings"]), 2)
        self.assertEqual(result["sitemaps_checked"], 2)
        self.assertEqual(result["urls_scanned"], 5)

    def test_official_robots_sitemap_discovery(self):
        calls = []
        def fetch(url):
            calls.append(url)
            if url.endswith("/robots.txt"):
                return b"User-agent: *\\nAllow: /\\nSitemap: https://www.example.it/sitemap.xml\\nSitemap: https://www.other.it/foreign.xml\\n".replace(b"\\n",b"\n")
            if url == "https://www.example.it/sitemap.xml":
                return XML_URLS
            raise AssertionError("Unadvertised or foreign host requested: " + url)
        source = {"name":"Official", "host":"www.example.it", "discover_from_robots":True}
        out = sm.collect_source(source, fetch)
        self.assertEqual(len(out["listings"]), 2)
        self.assertEqual(len(calls), 2)

    def test_robots_without_declared_sitemap_does_not_guess(self):
        source = {"name":"NoHints", "host":"www.example.it", "discover_from_robots":True}
        out = sm.collect_source(source, lambda url: ROBOTS_OK)
        self.assertEqual(out["status"], "SITEMAP_NON_PUBBLICATA")
        self.assertEqual(out["sitemaps_checked"], 0)

    def test_robots_disallow_does_not_fetch_sitemap(self):
        calls = []
        def fetch(url):
            calls.append(url)
            return b"User-agent: *\nDisallow: /\n"
        source = {"name":"Blocked", "host":"www.example.it", "sitemap_url":"https://www.example.it/sitemap.xml"}
        result = sm.collect_source(source, fetch)
        self.assertEqual(len(calls),1)
        self.assertEqual(result["status"], "NESSUNA_SITEMAP_ACCESSIBILE")
        self.assertFalse(result["listings"])

    def test_municipality_requires_explicit_location_in_url(self):
        self.assertEqual(sm.municipality("https://example.it/annunci/sant-ambrogio-di-torino-12"), "Sant'Ambrogio di Torino")
        self.assertEqual(sm.municipality("https://example.it/annunci/attico-432"), "")
        self.assertEqual(sm.municipality("https://example.it/annunci/buttigliera-alta-a-pochi-minuti-da-avigliana"), "")
        self.assertEqual(sm.municipality("https://example.it/annunci/avigliana-condove-12"), "")

    def test_sitemap_config_rejects_non_https_and_host_mismatch(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/"cfg.json"
            for source in (
                {"name":"x","host":"www.example.it","sitemap_url":"http://www.example.it/sitemap.xml"},
                {"name":"x","host":"www.example.it","sitemap_url":"https://www.malicious.it/sitemap.xml"},
            ):
                path.write_text(json.dumps({"sources":[source]}), encoding="utf-8")
                with self.assertRaises(ValueError):
                    sm.read_config(path)


class ConsolidateTests(unittest.TestCase):
    def test_exact_url_dedup_and_no_agency_contact_permission(self):
        p1={"sources":[{"source":"CasaDaPrivato","town":"Avigliana","status":"OK","reported_count":2,"extracted_links":2,"index_url":"https://x.it/a"}],
            "listings":[
                {"town":"Avigliana","source":"CasaDaPrivato","title":"Appartamento via Roma","url":"https://x.it/a/1?utm_source=foo", "contact_permission":"NO PROPOSTE COMMERCIALI", "price":150000,"mq":80},
                {"town":"Avigliana","source":"CasaDaPrivato","title":"Appartamento via Susa","url":"https://x.it/a/2","contact_permission":"NO PROPOSTE COMMERCIALI","price":150000,"mq":80},
            ]}
        p2={"sources":[{"source":"Altro","town":"Avigliana","status":"OK","extracted_links":1,"index_url":"https://y.it/b"}],
            "listings":[{"town":"Avigliana","source":"Altro","title":"Appartamento via Roma","url":"https://x.it/a/1","price":150000,"mq":80},
                        {"town":"Rivoli","source":"Altro","title":"Fuori zona","url":"https://y.it/b/1"}]}
        out=co.merge([p1,p2])
        self.assertEqual(out["listing_count"],2)
        self.assertEqual(out["counts"]["Avigliana"],2)
        self.assertEqual(out["possible_duplicate_count"],2)
        self.assertTrue(all(row["possibly_duplicate"] for row in out["listings"]))
        self.assertTrue(all(row["contact_permission"]=="NO PROPOSTE COMMERCIALI" for row in out["listings"]))
        self.assertIn("Altro",out["listings"][0]["sources"])

    def test_valid_xlsx_and_csv(self):
        result=co.merge([{"sources":[],"listings":[{"town":"Condove","source":"Test",
            "url":"https://example.it/condove/villa-10", "title":"Villa in Condove",
            "contact_permission":"DA_VERIFICARE","price":300000,"mq":95}]}])
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"out.xlsx"
            co.write_xlsx(result,path)
            self.assertTrue(zipfile.is_zipfile(path))
            with zipfile.ZipFile(path) as z:
                names=z.namelist()
                self.assertIn("xl/worksheets/sheet1.xml",names)
                self.assertIn("xl/worksheets/sheet2.xml",names)
                self.assertIn("xl/worksheets/sheet3.xml",names)
                for name in names:
                    if name.endswith(".xml") or name.endswith(".rels"):
                        ET.fromstring(z.read(name))
                content=z.read("xl/worksheets/sheet1.xml").decode("utf-8")
                self.assertIn("Villa in Condove", content)
                self.assertIn("300000",content)

    def test_same_fingerprint_no_automatic_merging(self):
        out = co.merge([{"sources":[],"listings":[
            {"town":"Almese","url":"https://a.it/1","source":"A","price":200000,"mq":88},
            {"town":"Almese","url":"https://b.it/9","source":"B","price":200000,"mq":88}]}])
        self.assertEqual(out["listing_count"],2)
        self.assertEqual(out["possible_duplicate_count"],2)


if __name__=="__main__":
    unittest.main()
