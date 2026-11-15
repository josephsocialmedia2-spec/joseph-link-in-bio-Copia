"""Offline tests for the acquisitions news and public-business contact signals."""
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import case247_acquisition_intelligence as intelligence
import case247_acquisition_digest as digest


def feed(title, date, town="Avigliana"):
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss><channel><item><title>{title}</title>
<link>https://news.google.com/articles/abc?t=1</link>
<description>Lavori di edilizia in {town}</description>
<pubDate>{date}</pubDate></item></channel></rss>"""


NOW = datetime(2026, 11, 15, 5, 0, tzinfo=timezone.utc)


class IntelligenceTests(unittest.TestCase):
    def test_all_queries_are_limited_to_four_towns(self):
        for town in intelligence.ALLOWED_TOWNS:
            url = intelligence.news_feed_url(town)
            self.assertIn("news.google.com/rss/search", url)
            self.assertIn("when%3A7d", url)
            self.assertIn("ceid=IT%3Ait", url)
            self.assertIn(town.split(" ")[0], __import__("urllib.parse", fromlist=["unquote"]).unquote(url))
            self.assertIn(town, intelligence.overpass_query(town))
        with self.assertRaises(AssertionError):
            intelligence.overpass_query("Buttigliera Alta")

    def test_news_must_be_local_property_relevant_and_fresh(self):
        good = feed("Avigliana: nuovi interventi di edilizia", "Sun, 15 Nov 2026 04:00:00 GMT")
        rows = intelligence.news_from_feed(good, "Avigliana", NOW)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["town"], "Avigliana")
        old = feed("Avigliana: nuovi interventi di edilizia", "Sun, 01 Nov 2026 04:00:00 GMT")
        self.assertEqual(intelligence.news_from_feed(old, "Avigliana", NOW), [])
        foreign = feed("Buttigliera Alta: nuove abitazioni", "Sun, 15 Nov 2026 04:00:00 GMT")
        self.assertEqual(intelligence.news_from_feed(foreign, "Avigliana", NOW), [])
        unrelated = feed("Avigliana: festival musicale", "Sun, 15 Nov 2026 04:00:00 GMT", town="Avigliana")
        self.assertEqual(intelligence.news_from_feed(unrelated, "Avigliana", NOW), [])

    def test_osm_company_contacts_are_public_organization_contacts(self):
        data = {"elements": [
            {"id": 42, "type": "node", "tags": {
                "name": "Azienda Edile Demo", "craft": "builder", "addr:street": "Via Roma",
                "contact:website": "https://impresa.example.it",
                "contact:email": "info@impresa.example.it",
                "contact:phone": "+39 011 1234567",
            }},
            {"id": 43, "type": "node", "tags": {
                "name": "Senza sede web", "office": "company"
            }},
        ]}
        rows = intelligence.business_from_osm(data, "Almese")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["town"], "Almese")
        self.assertEqual(rows[0]["email"], "info@impresa.example.it")
        self.assertEqual(rows[0]["phone"], "+39 011 1234567")
        self.assertIn("/node/42", rows[0]["osm_url"])
        self.assertIn("NESSUN collegamento", rows[0]["relationship"])

    def test_private_email_or_mobile_not_exposed_as_public_business_contact(self):
        contact = intelligence.safe_business_contact({
            "contact:email": "mario.rossi@gmail.com",
            "contact:phone": "+39 333 8889999",
            "contact:website": "https://example.org",
        })
        self.assertEqual(contact["email"], "")
        self.assertEqual(contact["phone"], "")
        self.assertEqual(contact["website"], "https://example.org")

    def test_source_errors_do_not_fabricate_contacts(self):
        def fail(*args, **kwargs):
            raise OSError("offline")
        data = intelligence.gather(NOW, fetch=fail)
        self.assertEqual(len(data["sources"]), 8)
        self.assertEqual(len(data["errors"]), 8)
        self.assertEqual(data["business_contacts"], [])
        self.assertEqual(data["news"], [])

    def test_single_daily_message_includes_news_and_business_contacts_once(self):
        news = {"id": "news1", "town": "Avigliana", "title": "Avigliana edilizia",
                "url": "https://news.example/a", "published_utc": NOW.isoformat()}
        org = {"id": "org1", "town": "Condove", "name": "Studio Edile Demo",
               "sector": "company", "street": "Via Roma",
               "website": "https://studio.example", "email": "info@studio.example",
               "phone": "", "osm_url": "https://www.openstreetmap.org/node/123"}
        found = {"news": [news], "business_contacts": [org], "sources": [
            {"town": "Avigliana", "source": "Google News RSS", "status": "OK"},
        ], "errors": []}
        state = {"schema": 1, "initialized": True, "known": {}}
        md, report = digest.create_digest(state, "2026-11-16", found)
        self.assertIn("Avigliana edilizia", md)
        self.assertIn("Studio Edile Demo", md)
        self.assertIn("info@studio.example", md)
        self.assertIn("Nessun nuovo annuncio pertinente", md)
        self.assertEqual(len(report["news"]), 1)
        self.assertEqual(len(report["business_contacts"]), 1)
        saved = digest.finalize(state, "2026-11-16", found)
        next_md, next_report = digest.create_digest(saved, "2026-11-17", found)
        self.assertEqual(next_report["news"], [])
        self.assertEqual(next_report["business_contacts"], [])
        self.assertNotIn("info@studio.example", next_md)

    def test_foreign_news_and_business_are_excluded(self):
        intel = {"news": [{"id": "x", "town": "Susa", "title": "Nuova casa"}],
                 "business_contacts": [{"id": "y", "town": "Rivoli", "name": "Azienda"}]}
        state = {"schema": 1, "initialized": True, "known": {}}
        _, r = digest.create_digest(state, "2026-11-16", intel)
        self.assertEqual(r["news"], [])
        self.assertEqual(r["business_contacts"], [])


if __name__ == "__main__":
    unittest.main()
