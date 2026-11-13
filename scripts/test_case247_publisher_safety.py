"""No-network tests: account authorization and due-time publication gates."""
import datetime as dt
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

from case247_territorial_publisher import (
    account_for, eligible_due, verify_provider_identity,
)


class PublisherSafetyTests(unittest.TestCase):
    def setUp(self):
        self.item = {"town_id": "avigliana", "network": "facebook"}
        self.config = {"avigliana": {
            "auto_publish": True,
            "channels": {"facebook": {
                "status": "ACTIVE_VERIFIED", "provider_id": "123456",
                "url": "https://www.facebook.com/123456",
            }},
        }}
        self.credentials = {"avigliana": {
            "facebook": {"page_id": "123456", "access_token": "test-only-token"},
        }}

    def test_valid_config_and_matching_credentials(self):
        self.assertEqual(
            account_for(self.item, self.credentials, self.config),
            self.credentials["avigliana"]["facebook"],
        )

    def test_unverified_channel_blocked(self):
        self.config["avigliana"]["channels"]["facebook"]["status"] = "DA_VERIFICARE"
        self.assertIsNone(account_for(self.item, self.credentials, self.config))

    def test_no_token_blocked(self):
        del self.credentials["avigliana"]["facebook"]["access_token"]
        self.assertIsNone(account_for(self.item, self.credentials, self.config))

    def test_wrong_provider_id_blocked(self):
        self.credentials["avigliana"]["facebook"]["page_id"] = "9999"
        self.assertIsNone(account_for(self.item, self.credentials, self.config))

    def test_bad_public_url_blocked(self):
        self.config["avigliana"]["channels"]["facebook"]["url"] = "http://example.com"
        self.assertIsNone(account_for(self.item, self.credentials, self.config))

    def test_meta_provider_identity_checked(self):
        with patch("case247_territorial_publisher.request", return_value={"id": "123456"}) as call:
            self.assertTrue(verify_provider_identity(
                "facebook", self.credentials["avigliana"]["facebook"]))
            self.assertIn("fields=id", call.call_args.args[0])

    def test_meta_provider_mismatch_rejected(self):
        with patch("case247_territorial_publisher.request", return_value={"id": "9999"}):
            with self.assertRaises(RuntimeError):
                verify_provider_identity("facebook", self.credentials["avigliana"]["facebook"])

    def test_due_requires_ready_and_correct_day(self):
        now = dt.datetime(2026, 11, 13, 10, 1, tzinfo=ZoneInfo("Europe/Rome"))
        record = {"date": "2026-11-13", "time": "10:00", "status": "READY_TO_SUBMIT"}
        self.assertTrue(eligible_due(record, now))
        record["status"] = "BLOCKED_CHANNEL_NOT_CONNECTED"
        self.assertFalse(eligible_due(record, now))
        record["status"] = "READY_TO_SUBMIT"
        record["date"] = "2026-11-12"
        self.assertFalse(eligible_due(record, now))


if __name__ == "__main__":
    unittest.main()
