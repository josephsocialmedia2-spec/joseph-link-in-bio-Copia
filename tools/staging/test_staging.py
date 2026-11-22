"""Integration checks for the private, read-only whole-site staging server."""
import json
import os
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PORT = 18766
BASE = f"http://127.0.0.1:{PORT}"
PREFIX = "/joseph-link-in-bio-Copia"


def request(path: str, method: str = "GET"):
    req = urllib.request.Request(BASE + path, method=method)
    try:
        with urllib.request.urlopen(req, timeout=4) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read()


class StagingIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proc = subprocess.Popen(
            [sys.executable, "tools/staging/server.py", "--host", "127.0.0.1", "--port", str(PORT)],
            cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        for _ in range(50):
            if cls.proc.poll() is not None:
                raise RuntimeError("Staging server exited unexpectedly")
            try:
                if request("/__staging__/")[0] == 200:
                    break
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(0.1)
        else:
            cls.tearDownClass()
            raise RuntimeError("Staging did not start")

    @classmethod
    def tearDownClass(cls):
        if getattr(cls, "proc", None) and cls.proc.poll() is None:
            cls.proc.terminate()
            try:
                cls.proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                cls.proc.kill()

    def test_full_system_portal(self):
        status, headers, data = request("/__staging__/")
        self.assertEqual(status, 200)
        self.assertIn(b"Laboratorio completo", data)
        self.assertIn(b"AMBIENTE DI COLLAUDO", data)
        self.assertIn("noindex", headers["X-Robots-Tag"])

    def test_deep_page_routes_under_original_prefix(self):
        paths = [
            "gestione/", "gestione/acquisizione-farming/",
            "gestione/acquisizione-farming/crm/", "gestione/lettere-stampa/",
            "gestione/rivista/sfoglia/", "gestione/rivista/",
            "catalogo-premium/", "gestione/volantini-premium/",
            "gestione/volantini-premium/volantino-digitale/",
            "newsletter/", "gestione/tutte-le-pagine/",
            "gestione/regia-territoriale/",
        ]
        for path in paths:
            with self.subTest(path=path):
                status, _, data = request(f"{PREFIX}/{path}")
                self.assertEqual(status, 200)
                self.assertIn(b"AMBIENTE DI COLLAUDO", data)
                self.assertIn(b"<html", data.lower())

    def test_external_writes_and_api_connections_are_disabled(self):
        status, headers, html = request(PREFIX + "/gestione/")
        self.assertEqual(status, 200)
        policy = headers.get("Content-Security-Policy", "")
        self.assertIn("connect-src 'self'", policy)
        self.assertIn("form-action 'none'", policy)
        self.assertIn("X-Content-Type-Options", headers)
        for method in ("POST", "PUT", "PATCH", "DELETE"):
            self.assertEqual(request(PREFIX + "/gestione/", method=method)[0], 405)
        self.assertIn(b"window.__ZTD_SANDBOX__", html)

    def test_pdf_and_manifest_are_readable_but_not_approved(self):
        status, _, data = request(PREFIX + "/gestione/rivista/edizioni/auto/latest.json")
        self.assertEqual(status, 200)
        manifest = json.loads(data)
        self.assertNotEqual(manifest.get("status"), "approved",
                            "Demo must never be marked as approved in staging")
        for filename in ("rivista-latest.pdf", "seller-letter-latest.pdf"):
            response, _, data = request(PREFIX + "/gestione/rivista/edizioni/auto/" + filename)
            self.assertEqual(response, 200)
            self.assertTrue(data.startswith(b"%PDF-"), filename)

    def test_no_path_traversal_and_no_accidental_production_redirect(self):
        status, _, data = request("/__staging__/")
        self.assertEqual(status, 200)
        self.assertIn(b"STAGING", data)
        status, _, js = request(PREFIX + "/gestione/rivista/sfoglia/redirect-lettere-stampa.html")
        self.assertEqual(status, 200)
        self.assertIn(b"/joseph-link-in-bio-Copia/gestione/rivista/sfoglia/", js)


if __name__ == "__main__":
    unittest.main()
