from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "gestione" / "dimostra-il-valore" / "index.html"
CONTROL = ROOT / "gestione" / "control-center.js"

class ValueDemoTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = APP.read_text(encoding="utf-8")
        cls.js = CONTROL.read_text(encoding="utf-8")

    def test_app_is_accessible_standalone(self):
        self.assertIn('<html lang="it">', self.html)
        self.assertIn('id="dossier"', self.html)
        self.assertIn('id="preventivo"', self.html)
        self.assertIn('id="dashboard"', self.html)
        self.assertIn('id="presentazione"', self.html)

    def test_no_duplicate_ids(self):
        ids = re.findall(r'\bid="([^"]+)"', self.html)
        self.assertEqual(len(ids), len(set(ids)))

    def test_critical_disclosures(self):
        for marker in ('DEMO', 'METRICHE FITTIZIE', 'nessuna garanzia', 'mediatore abilitato'):
            self.assertIn(marker.casefold(), self.html.casefold())

    def test_pricing_six_items(self):
        expected = [700, 600, 850, 750, 850, 1250]
        self.assertEqual(sum(expected), 5000)
        for value in expected:
            self.assertIn(str(value), self.html)

    def test_control_center_link(self):
        self.assertIn('gestione/dimostra-il-valore/', self.js)

if __name__ == '__main__':
    unittest.main()
