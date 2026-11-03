"""Synchronize the complete public partner inventory; never overwrite on failure."""
import argparse
import datetime as dt
import html
import json
from pathlib import Path
import re
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://lasacraimmobiliare.it'

def fetch_page(page):
    url = f'{SOURCE}/products.json?limit=250&page={page}'
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Case247-Partner-Catalog/1.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(request, timeout=45) as response:
                data = json.load(response)
            assert isinstance(data.get('products'), list), 'Invalid source response'
            return data['products']
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def normalize(product):
    title = product['title'].strip()
    description = html.unescape(re.sub('<[^>]*>', ' ', product.get('body_html') or ''))
    description = re.sub(r'\s+', ' ', description).strip()
    variants = product.get('variants') or []
    prices = {float(v['price']) for v in variants if v.get('price') is not None}
    price = next(iter(prices)) if len(prices) == 1 and next(iter(prices)) > 0 else None
    title_lower = title.lower()
    commercial = any(w in title_lower for w in ('attivit', 'capannone', 'negozio', 'magazzino', 'ufficio', 'commerciale'))
    contract = 'Affitto' if any(w in title_lower for w in ('affitto', 'locazione')) else 'Vendita' if 'vendita' in title_lower else 'Da verificare'
    # Only numeric characteristics explicitly printed in the source are imported.
    def number(pattern):
        match = re.search(pattern, description, re.I)
        return float(match.group(1).replace(',', '.')) if match else None
    return {
        'id': str(product['id']), 'title': title, 'price': price,
        'url': f"{SOURCE}/products/{product['handle']}",
        'image': next((i['src'] for i in product.get('images', []) if i.get('src')), ''),
        'description': description, 'category': 'Impresa' if commercial else 'Residenziale',
        'contract': contract, 'surface': number(r'\bsuperficie\s+(?:commerciale\s+)?(?:di\s+)?(\d+(?:[.,]\d+)?)\s*(?:mq\b|m²|metri quadrati)'),
        'rooms': number(r'\b(\d+)\s+locali\b'), 'baths': number(r'\b(\d+)\s+bagn[oi]\b'),
        'published_at': product.get('published_at'), 'source_updated_at': product.get('updated_at'),
    }

def synchronize(snapshot=None):
    products = []
    if snapshot:
        products = json.loads(Path(snapshot).read_text())['products']
    else:
        seen_pages = set()
        for page in range(1, 101):
            batch = fetch_page(page)
            if not batch:
                break
            signature = tuple(p['id'] for p in batch)
            if signature in seen_pages:
                raise RuntimeError('Source repeated a page; keeping last successful catalog')
            seen_pages.add(signature)
            products.extend(batch)
        else:
            raise RuntimeError('Pagination safety limit reached')
    if not products:
        raise RuntimeError('Empty catalog: keeping last successful inventory')
    items = list({str(p['id']): normalize(p) for p in products}.values())
    output = ROOT / 'immobili' / 'catalogo.json'
    if output.exists():
        previous = json.loads(output.read_text()).get('items', [])
        if len(items) < len(previous) * .5:
            raise RuntimeError('Inventory unexpectedly fell by more than 50%; manual review required')
    payload = {'source': SOURCE, 'last_success_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'count': len(items), 'items': items}
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix('.tmp')
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    temp.replace(output)
    print(f'Synchronized {len(items)} source listings')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', help='Local source snapshot for initial import and validation')
    synchronize(parser.parse_args().snapshot)
