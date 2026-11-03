"""Prepare town-specific editorial drafts. Never publishes or creates social accounts."""
import datetime as dt
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]

def folded(value):
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c))).strip()

def matches(item, town):
    # A mention is not a verified address: captions explicitly say so.
    title = ' ' + folded(item['title']) + ' '
    return any(' ' + folded(alias) + ' ' in title for alias in town['aliases'])

def mention_ids(item, towns):
    title = ' ' + folded(item['title']) + ' '
    hits = [(town['id'], folded(alias)) for town in towns for alias in town['aliases'] if ' ' + folded(alias) + ' ' in title]
    # "Susa" inside "Sant'Antonino di Susa" is not a separate town mention.
    return sorted({town_id for town_id, alias in hits if not any(other_id != town_id and len(other_alias) > len(alias) and ' ' + alias + ' ' in ' ' + other_alias + ' ' for other_id, other_alias in hits)})

def build():
    config = json.loads((ROOT / 'config/case247-territorio.json').read_text())
    catalog = json.loads((ROOT / 'immobili/catalogo.json').read_text())
    for item in catalog['items']:
        item['town_mentions'] = mention_ids(item, config['towns'])
    (ROOT / 'immobili/catalogo.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    drafts = []
    for town in config['towns']:
        listings = [p for p in catalog['items'] if town['id'] in p['town_mentions']]
        for item in listings:
            price = 'Prezzo su richiesta' if item['price'] is None else f"{item['price']:,.0f} €".replace(',', '.')
            drafts.append({
                'id': f"{town['id']}:{item['id']}", 'town_id': town['id'], 'town': town['name'],
                'listing_id': item['id'], 'source_url': item['url'], 'media_url': item['image'],
                'caption': f"{town['name']} · Dal catalogo La Sacra Immobiliare\n\n{item['title']}\n{price}\n\nL’annuncio cita {town['name']} nel titolo: verifica posizione, caratteristiche e disponibilità nella scheda originale.\n{item['url']}\n\nCase in Pubblicità 24/7 · Comunicazione immobiliare. Intermediazione: La Sacra Immobiliare.",
                'landing_url': town['landing_url'], 'status': 'BOZZA_DA_REVISIONARE',
                'publishing_status': 'DESTINAZIONE_TERRITORIALE_DA_COLLEGARE',
                'approved': False, 'auto_publish': False,
                'source_snapshot_at': catalog['last_success_at'],
            })
    output = {'generated_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'source_snapshot_at': catalog['last_success_at'], 'count': len(drafts), 'auto_publish': False, 'drafts': drafts}
    target = ROOT / 'campagne/case247/territorio/bozze.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    print(f"Prepared {len(drafts)} town-specific drafts; no external publication")

if __name__ == '__main__':
    build()
