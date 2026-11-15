"""Deterministic, offline tests for CASE247 acquisition radar."""
import json
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import case247_acquisition_radar as radar


CFG = {
    "priority_towns": ["Avigliana", "Almese", "Condove", "Sant'Ambrogio di Torino"],
    "other_towns": ["Rivoli", "Susa"],
    "streets": {"Avigliana": ["Via Roma", "Via Susa"]},
    "google_alerts_rss": [],
}


def rss(items):
    body = "".join(
        "<item><title>" + x[0].replace("&", "&amp;") +
        "</title><link>" + x[1].replace("&", "&amp;") +
        "</link><description>" + x[2].replace("&", "&amp;") +
        "</description></item>" for x in items
    )
    return '<?xml version="1.0"?><rss version="2.0"><channel>' + body + "</channel></rss>"


class RadarTests(unittest.TestCase):
    def test_config_is_valid(self):
        path = Path(__file__).resolve().parents[1] / "config/case247-acquisition-radar.json"
        config = radar.read_config(path)
        self.assertIn("Avigliana", config["priority_towns"])
        self.assertIn("Susa", config["other_towns"])
        self.assertGreater(len(config["streets"]["Avigliana"]), 10)

    def test_query_rotation(self):
        plan0 = radar.search_plan(CFG, 0)
        plan1 = radar.search_plan(CFG, 1)
        self.assertEqual(len(plan0), 4)
        self.assertIn('"Avigliana"', plan0[0][1])
        self.assertIn('"Via Roma"', plan0[3][1])
        self.assertIn('"Via Susa"', plan1[3][1])
        self.assertNotEqual(plan0[0][0], plan1[0][0])

    def test_rss_feed_and_canonical(self):
        items = radar.parse_feed(rss([("Vendesi da privato Avigliana", "https://www.example.com/listing/3?utm_source=rss&id=3", "85 mq")]))
        self.assertEqual(len(items), 1)
        self.assertEqual(radar.canonical_url(items[0]["url"]), "https://example.com/listing/3?id=3")
        self.assertEqual(radar.canonical_url("javascript:alert(1)"), "")

    def test_positive_private_listing(self):
        row = radar.normalize_result({
            "title": "Privato vende trilocale ad Avigliana",
            "description": "Via Roma 22, 85 mq, € 195.000, no agenzie. Tel 333 1234567",
            "url": "https://example.org/annuncio/123",
        }, "Bing RSS", CFG)
        self.assertEqual(row["status"], "PROBABILE_PRIVATO")
        self.assertEqual(row["price"], 195000)
        self.assertEqual(row["mq"], 85)
        self.assertEqual(row["street"], "Via Roma 22")
        self.assertTrue(row["public_contact_flag"])
        self.assertNotIn("333", row["title"])

    def test_ambiguous_is_not_owner(self):
        row = radar.normalize_result({
            "title": "Trilocale Avigliana 90 mq in vendita",
            "description": "Via Susa, prezzo € 210.000",
            "url": "https://example.org/annuncio/234",
        }, "Bing RSS", CFG)
        self.assertEqual(row["status"], "DA_VERIFICARE")

    def test_agency_generic_and_non_local_excluded(self):
        for title, desc in [
            ("Bilocale Avigliana", "Agenzia immobiliare propone in vendita"),
            ("Case in vendita a Avigliana", "tutti gli annunci da privato"),
            ("Trilocale Torino", "privato vende a Torino"),
        ]:
            row = radar.normalize_result({"title": title, "description": desc, "url": "https://example.org/x"}, "Bing RSS", CFG)
            self.assertIsNone(row)

    def test_baseline_dedup_and_price_decrease(self):
        first = {"id": radar.digest("url"), "status": "PROBABILE_PRIVATO", "price": 230000}
        changes, baseline = radar.compare([first], {"schema": 1, "initialized": False, "known": {}}, "2026-11-15T00:00:00+00:00")
        self.assertEqual(changes, [])
        changes2, state2 = radar.compare([first], baseline, "2026-11-15T01:00:00+00:00")
        self.assertEqual(changes2, [])
        changed = {**first, "price": 210000}
        changes3, state3 = radar.compare([changed], state2, "2026-11-15T02:00:00+00:00")
        self.assertEqual(changes3[0]["event"], "RIBASSO_INDICATIVO")
        self.assertEqual(state3["known"][first["id"]]["price"], 210000)
        second = {**first, "id": radar.digest("second")}
        changes4, _ = radar.compare([second], state3, "2026-11-15T03:00:00+00:00")
        self.assertEqual(changes4[0]["event"], "NUOVO")

    def test_cloud_run_first_baseline_then_no_duplicate(self):
        item = ("Privato vende trilocale Avigliana", "https://example.org/annuncio/123", "85 mq € 195.000 Via Roma, no agenzie")
        mocked = lambda _: rss([item])
        out1, state1, alert1 = radar.run(CFG, {"schema": 1, "initialized": False, "known": {}}, 0, fetch=mocked)
        self.assertEqual(out1["feeds_ok"], 4)
        self.assertEqual(out1["new_count"], 0)
        self.assertFalse(alert1)
        out2, state2, alert2 = radar.run(CFG, state1, 1, fetch=mocked)
        self.assertEqual(out2["new_count"], 0)
        self.assertFalse(alert2)
        self.assertEqual(len(state2["known"]), 1)

    def test_source_outage_does_not_erase_history(self):
        state = {"schema": 1, "initialized": True, "known": {radar.digest("x"): {"price": 120000}}}
        def unavailable(_):
            raise urllib.error.URLError("offline")
        output, returned_state, alert = radar.run(CFG, state, 0, fetch=unavailable)
        self.assertEqual(output["status"], "FONTI_NON_DISPONIBILI")
        self.assertIs(returned_state, state)
        self.assertEqual(output["new_count"], 0)
        self.assertFalse(alert)

    def test_business_same_street_does_not_infer_owner(self):
        listing = {"street": "Via Roma", "town": "Avigliana"}
        businesses = [
            {"name": "Attività pubblica", "street": "Via Roma", "town": "Avigliana", "website": "https://example.com"},
            {"name": "Altrove", "street": "Via Susa", "town": "Avigliana"},
        ]
        self.assertEqual([x["name"] for x in radar.match_same_street(listing, businesses)], ["Attività pubblica"])
        self.assertNotIn("owner", radar.match_same_street(listing, businesses)[0])

    def test_google_alert_requires_google_feed_url(self):
        config = {**CFG, "google_alerts_rss": ["https://not-trusted.example/rss", "https://www.google.com/alerts/feeds/111/222"]}
        urls = []
        def capture(url):
            urls.append(url)
            return rss([])
        output, _, _ = radar.run(config, {"schema": 1, "initialized": True, "known": {}}, 0, fetch=capture)
        self.assertEqual(output["feeds_attempted"], 5)
        self.assertTrue(any("google.com/alerts/feeds" in u for u in urls))


if __name__ == "__main__":
    unittest.main()
