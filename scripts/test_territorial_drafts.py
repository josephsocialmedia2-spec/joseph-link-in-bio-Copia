import json
from html.parser import HTMLParser
from pathlib import Path
import unittest
from build_territorial_drafts import mention_ids
from verified_locations import apply_locations
import copy

ROOT = Path(__file__).resolve().parents[1]


class LandingBody(HTMLParser):
    """Read the actual page contract without brittle substring matching."""
    def __init__(self):
        super().__init__()
        self.body = None

    def handle_starttag(self, tag, attrs):
        if tag == "body" and self.body is None:
            self.body = dict(attrs)


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

    def test_title_alone_cannot_verify_location(self):
        item = {'id': 'unknown', 'title': 'Casa ad Avigliana', 'url': 'https://lasacraimmobiliare.it/products/test', 'description': ''}
        apply_locations([item])
        self.assertEqual(item['location_status'], 'DA_VERIFICARE')
        self.assertIsNone(item['town_id'])

    def test_changed_description_invalidates_review(self):
        catalog = json.loads((ROOT / 'immobili/catalogo.json').read_text())
        item = copy.deepcopy(next(i for i in catalog['items'] if i['location_status'] == 'VERIFICATO_FONTE'))
        item['description'] += ' Nuova localizzazione.'
        apply_locations([item])
        self.assertIsNone(item['town_id'])

    def test_drafts_only_use_verified_municipality_and_both_links(self):
        catalog = {i['id']: i for i in json.loads((ROOT / 'immobili/catalogo.json').read_text())['items']}
        drafts = json.loads((ROOT / 'campagne/case247/territorio/bozze.json').read_text())['drafts']
        for draft in drafts:
            item = catalog[draft['listing_id']]
            self.assertEqual(item['location_status'], 'VERIFICATO_FONTE')
            self.assertEqual(item['town_id'], draft['town_id'])
            self.assertIn(draft['source_url'], draft['caption'])
            self.assertIn(draft['landing_url'], draft['caption'])

    def test_all_towns_have_landings_without_opt_in(self):
        # The public front-end uses document.body.dataset.cpTown (NOT townId).
        js = (ROOT / "assets/case247-premium.js").read_text(encoding="utf-8")
        self.assertIn("body.dataset.cpTown", js)
        self.assertIn('page==="town"', js)
        self.assertEqual(len(self.towns), 42)
        self.assertEqual(len({town["id"] for town in self.towns}), 42)
        for town in self.towns:
            with self.subTest(town=town["id"]):
                page = (ROOT / "paesi" / town["id"] / "index.html").read_text(encoding="utf-8")
                parser = LandingBody()
                parser.feed(page)
                self.assertIsNotNone(parser.body)
                self.assertEqual(parser.body.get("data-cp-page"), "town")
                self.assertEqual(parser.body.get("data-cp-town"), town["id"])
                # If a legacy alias is ever reintroduced, it must be identical.
                if "data-town-id" in parser.body:
                    self.assertEqual(parser.body["data-town-id"], town["id"])
                self.assertIn("case247-premium.js", page)
                self.assertNotIn('id="town-all"', page)
                self.assertFalse(town["auto_publish"])

if __name__ == '__main__':
    unittest.main()
