"""Tests for hourly accrual and single daily 06:00 Rome digest."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import case247_acquisition_digest as digest
from case247_acquisition_radar import ALLOWED_TOWNS, compare


class DigestTests(unittest.TestCase):
    def setUp(self):
        self.state = {"schema": 1, "initialized": True, "known": {}}
        self.new_avigliana = {
            "id": "abc123", "title": "Privato vende bilocale ad Avigliana",
            "town": "Avigliana", "street": "Via Roma 7",
            "price": 150000, "mq": 62, "url": "https://example.org/a",
            "event": "NUOVO", "status": "PROBABILE_PRIVATO",
        }
        self.new_almese = {
            "id": "def456", "title": "Alloggio in Almese", "town": "Almese",
            "street": "", "price": 95000, "mq": 45, "url": "https://example.org/b",
            "event": "NUOVO", "status": "DA_VERIFICARE",
        }

    def test_collect_all_and_one_daily_summary(self):
        first = {
            "status": "OK", "scanned_at_utc": "2026-11-15T06:17:00Z",
            "feeds_ok": 5, "feeds_attempted": 5, "feed_items": 12, "candidates": 1,
            "changes": [self.new_avigliana],
        }
        s1 = digest.accumulate(self.state, first)
        self.assertEqual(len(s1["pending"]), 1)
        second = {
            **first, "scanned_at_utc": "2026-11-15T12:17:00Z",
            "changes": [self.new_almese, self.new_avigliana],
        }
        s2 = digest.accumulate(s1, second)
        self.assertEqual(len(s2["pending"]), 2)
        md, out = digest.create_digest(s2, "2026-11-16")
        self.assertEqual(out["total"], 2)
        self.assertEqual(out["counts"]["Avigliana"], 1)
        self.assertEqual(out["counts"]["Almese"], 1)
        self.assertEqual(out["counts"]["Condove"], 0)
        self.assertIn("https://example.org/a", md)
        self.assertIn("https://example.org/b", md)
        self.assertIn("DA_VERIFICARE", md)
        final = digest.finalize(s2, "2026-11-16")
        self.assertEqual(final["pending"], {})
        self.assertEqual(final["last_digest_date"], "2026-11-16")
        _, after = digest.create_digest(final, "2026-11-16")
        self.assertTrue(after["sent_previously"])

    def test_repeated_digest_day_no_second_batch(self):
        state = {**self.state, "pending": {"abc123": self.new_avigliana}, "last_digest_date": "2026-11-16"}
        md, out = digest.create_digest(state, "2026-11-16")
        self.assertTrue(out["sent_previously"])
        self.assertIn("Avigliana", md)
        self.assertIs(digest.finalize(state, "2026-11-16"), state)

    def test_empty_daily_message_is_not_false_no_listings_claim(self):
        md, out = digest.create_digest(self.state, "2026-11-16")
        self.assertEqual(out["total"], 0)
        self.assertIn("Nessun nuovo annuncio pertinente", md)
        self.assertIn("non dimostra", md)

    def test_foreign_locations_cannot_reappear_in_daily_report(self):
        outside = {**self.new_avigliana, "town": "Buttigliera Alta", "id": "outside"}
        r = {"changes": [self.new_avigliana, outside], "status": "OK"}
        collected = digest.accumulate(self.state, r)
        self.assertEqual(list(collected["pending"]), ["abc123"])
        text, result = digest.create_digest(collected, "2026-11-16")
        self.assertNotIn("Buttigliera Alta", text)
        self.assertEqual(set(result["counts"]), set(ALLOWED_TOWNS))

    def test_hourly_compare_keeps_daily_pending(self):
        pending = {"abc123": self.new_avigliana}
        state = {**self.state, "pending": pending}
        other = {"id": "some-other-id", "price": 90000, "status": "DA_VERIFICARE"}
        _, newstate = compare([other], state, "2026-11-15T14:17:00Z")
        self.assertEqual(newstate["pending"], pending)


if __name__ == "__main__":
    unittest.main()
