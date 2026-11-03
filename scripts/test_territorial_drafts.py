import json
from pathlib import Path
import unittest
from build_territorial_drafts import mention_ids

ROOT = Path(__file__).resolve().parents[1]

class TerritoryRoutingTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((ROOT / 'config/case247-territorio.json').read_text())
        self.towns = self.config['towns']

    def test_susa_is_not_confused_with_sant_antonino(self):
        self.assertEqual(mention_ids({'title': 'APPARTAMENTO A SANT’ANTONINO DI SUSA'}, self.towns), ['sant-antonino-di-susa'])

    def test_torino_is_not_confused_with_sant_ambrogio(self):
        self.assertEqual(mention_ids({'title': 'CASA A SANT’AMBROGIO DI TORINO'}, self.towns), ['sant-ambrogio-di-torino'])

    def test_two_explicit_towns_are_kept(self):
        self.assertEqual(mention_ids({'title': 'CASA A SANT’AMBROGIO AI CONFINI DI AVIGLIANA'}, self.towns), ['avigliana', 'sant-ambrogio-di-torino'])

    def test_unknown_destination_cannot_be_approved(self):
        data = json.loads((ROOT / 'campagne/case247/territorio/bozze.json').read_text())
        self.assertFalse(data['auto_publish'])
        self.assertTrue(data['drafts'])
        self.assertTrue(all(not d['approved'] and not d['auto_publish'] for d in data['drafts']))
        self.assertEqual(len(data['drafts']), len({d['id'] for d in data['drafts']}))

if __name__ == '__main__':
    unittest.main()
