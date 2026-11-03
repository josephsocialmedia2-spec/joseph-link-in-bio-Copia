"""Only reviewed source descriptions can establish a municipality, never titles."""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def apply_locations(items):
    registry = json.loads((ROOT / 'config/case247-location-verifications.json').read_text())['items']
    for item in items:
        record = registry.get(item['id'])
        item.update(town_id=None, municipality=None, location_status='DA_VERIFICARE', location_evidence=None)
        # Invalidate the full review whenever the source description changes.
        digest = hashlib.sha256(item.get('description', '').encode()).hexdigest()
        if record and record['source_url'] == item['url'] and record['description_sha256'] == digest and record['evidence'] in item.get('description', ''):
            item.update(town_id=record['town_id'], municipality=record['municipality'], location_status='VERIFICATO_FONTE', location_evidence=record['evidence'])
    return items
