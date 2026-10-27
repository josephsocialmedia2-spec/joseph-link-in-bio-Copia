"""Tests: privacy ledger stays local, marketing opt-in stays disabled, revocations persist."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
TOOL = ROOT / "privacy-censimento" / "registro_privato.py"


class PrivateLedgerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "private-ledger.sqlite3"
        self.contact = "+390000000000"  # fictional value only; no user data

    def tearDown(self):
        self.tmp.cleanup()

    def call(self, *args, expected=0):
        result = subprocess.run(
            [sys.executable, str(TOOL), "--db", str(self.db), *args],
            capture_output=True, text=True, timeout=10
        )
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return result.stdout

    def test_request_is_not_a_marketing_consent(self):
        self.assertIn("NOT a marketing consent", self.call(
            "request", "--contact", self.contact, "--channel", "whatsapp"))
        self.assertIn("MARKETING BLOCKED", self.call("check", "--contact", self.contact))
        self.assertIn("marketing gate: CLOSED", self.call("summary"))

    def test_cannot_register_consent_without_legal_activation(self):
        self.assertIn("BLOCKED", self.call("consent", "--contact", self.contact,
            "--channel", "whatsapp", "--purpose", "marketing",
            "--notice-version", "test", "--proof", "/not/a/real/file", expected=2))

    def test_revocation_kept_after_erasure_of_local_data(self):
        self.call("request", "--contact", self.contact)
        self.assertIn("DO NOT CONTACT", self.call("withdraw", "--contact", self.contact))
        self.assertIn("MARKETING BLOCKED", self.call("check", "--contact", self.contact))
        self.assertIn("RETAINED", self.call("erase", "--contact", self.contact, "--confirm-erase"))
        self.assertIn("suppressions: 1", self.call("summary"))
        self.assertIn("withdrew or objected", self.call("check", "--contact", self.contact))

    def test_no_database_inside_public_repository(self):
        result = subprocess.run(
            [sys.executable, str(TOOL), "--db", str(ROOT / "PII.sqlite3"), "summary"],
            capture_output=True, text=True, timeout=10
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("OUTSIDE", result.stdout)
        self.assertFalse((ROOT / "PII.sqlite3").exists())


if __name__ == "__main__":
    unittest.main()
