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



def api(path: str, body=None, *, origin=BASE, token="synthetic-only"):
    headers = {"Origin": origin, "X-Staging-Lab": token, "Content-Type": "application/json"}
    req = urllib.request.Request(
        BASE + "/__staging__/api/" + path,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=headers,
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=4) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())


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

    def test_funnel_synthetic_happy_path_and_consent_gates(self):
        self.assertEqual(api("reset", {"confirm": "RESET_SYNTHETIC_ONLY"})[0], 200)
        code, data = api("requests", {
            "source": "volantino-qr", "scenario": "venditore",
            "marketing_optin": False, "transfer_optin": False,
        })
        self.assertEqual(code, 201)
        lead = data["lead"]
        self.assertTrue(lead["name"].startswith("TEST "))
        self.assertTrue(lead["email"].endswith("@example.test"))
        self.assertEqual(lead["status"], "NUOVO")
        path = f"leads/{lead['id']}/"
        self.assertEqual(api(path + "qualify", {})[1]["lead"]["status"], "QUALIFICATO")
        code, reason = api(path + "followup", {})
        self.assertEqual(code, 409)
        self.assertEqual(reason["error"], "consent_required")
        self.assertEqual(api(path + "permissions", {
            "marketing_optin": True, "transfer_optin": False,
        })[0], 200)
        self.assertEqual(api(path + "followup", {})[1]["lead"]["status"], "FOLLOW_UP")
        code, reason = api(path + "handoff", {})
        self.assertEqual(code, 409)
        self.assertEqual(reason["error"], "transfer_required")
        self.assertEqual(api(path + "appointment", {})[1]["lead"]["status"], "APPUNTAMENTO")
        self.assertEqual(api(path + "permissions", {
            "marketing_optin": True, "transfer_optin": True,
        })[0], 200)
        self.assertEqual(api(path + "handoff", {})[1]["lead"]["status"], "TRASFERITO")
        self.assertEqual(api(path + "close", {})[1]["lead"]["status"], "CHIUSO")
        code, state = api("state")
        self.assertEqual(code, 200)
        self.assertEqual(state["mode"], "SYNTHETIC_ONLY")
        self.assertEqual(state["external_deliveries"], 0)
        self.assertEqual(state["kpi"]["requests"], 1)
        self.assertEqual(state["kpi"]["followups_simulated"], 1)
        self.assertEqual(state["kpi"]["appointments_simulated"], 1)
        self.assertEqual(state["kpi"]["handoffs_simulated"], 1)
        self.assertEqual(state["kpi"]["closed_simulated"], 1)
        self.assertEqual(state["kpi"]["blocked_by_policy"], 2)
        self.assertEqual(state["leads"][0]["status"], "CHIUSO")
        self.assertEqual(api(path + "followup", {})[0], 409)
        self.assertEqual(api("reset", {"confirm": "RESET_SYNTHETIC_ONLY"})[1]["kpi"]["requests"], 0)

    def test_opt_out_and_free_text_are_blocked(self):
        self.assertEqual(api("reset", {"confirm": "RESET_SYNTHETIC_ONLY"})[0], 200)
        code, result = api("requests", {
            "source": "landing-test", "scenario": "acquirente",
            "marketing_optin": True, "transfer_optin": True,
            "phone": "+39 333 123 4567",
        })
        self.assertEqual(code, 422)
        self.assertEqual(result["error"], "synthetic_fields_only")
        code, result = api("requests", {
            "source": "landing-test", "scenario": "acquirente",
            "marketing_optin": True, "transfer_optin": True,
        })
        self.assertEqual(code, 201)
        lead_id = result["lead"]["id"]
        path = f"leads/{lead_id}/"
        code, result = api(path + "stop", {})
        self.assertEqual(code, 200)
        self.assertEqual(result["lead"]["status"], "NON_CONTATTARE")
        self.assertFalse(result["lead"]["marketing_optin"])
        self.assertFalse(result["lead"]["transfer_optin"])
        self.assertEqual(api(path + "qualify", {})[0], 409)
        self.assertEqual(api(path + "permissions", {"marketing_optin": True,
                                                      "transfer_optin": True})[0], 409)
        self.assertEqual(api("reset", {"confirm": "RESET_SYNTHETIC_ONLY"})[0], 200)

    def test_private_checkout_files_are_unreachable(self):
        for forbidden in ("/.git/config", "/.devcontainer/devcontainer.json",
                          "/.github/workflows/ztd-full-staging-qa.yml"):
            with self.subTest(forbidden=forbidden):
                code, _, _ = request(PREFIX + forbidden)
                self.assertEqual(code, 404)

    def test_lab_api_rejects_cross_origin_and_untrusted_actions(self):
        self.assertEqual(api("requests", {
            "source": "volantino-qr", "scenario": "venditore",
            "marketing_optin": True, "transfer_optin": True,
        }, origin="https://evil.example.test")[0], 403)
        self.assertEqual(api("requests", {
            "source": "volantino-qr", "scenario": "venditore",
            "marketing_optin": True, "transfer_optin": True,
        }, token="not-the-lab")[0], 403)
        self.assertEqual(api("reset", {"confirm": "yes"})[0], 422)
        self.assertEqual(api("unknown", {})[0], 404)
        self.assertEqual(api("health")[1]["production_connections"], 0)
        status, _, data = request("/__staging__/funnel.html")
        self.assertEqual(status, 200)
        self.assertIn(b"Funnel end-to-end", data)


if __name__ == "__main__":
    unittest.main()
