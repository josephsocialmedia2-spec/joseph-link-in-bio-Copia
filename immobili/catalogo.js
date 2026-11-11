(() => {
  'use strict';
  const root = document.getElementById('case-preview');
  const $ = selector => root.querySelector(selector);
  const storageKey = 'case247-property-favourites-v1';
  let saved = new Set(), data = [], page = 1, mode = 'all';
  const townId = root.dataset.townId || '';
  try { saved = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch (_) {}
  const money = new Intl.NumberFormat('it-IT', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0});
  const fold = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const grid = $('#property-grid');

  // Town landing scope is deliberately conservative: every corner of the source
  // municipality's verified bounding box must be within 20 km of this landing's
  // town centre. Do not publish unverifiable or out-of-radius ads here.
  const MAX_RADIUS_KM = 20;
  function distanceKm(aLat,aLon,bLat,bLon){
    const rad = Math.PI / 180;
    const p1 = aLat * rad, p2 = bLat * rad;
    const h = Math.sin((bLat - aLat) * rad / 2) ** 2
      + Math.cos(p1)*Math.cos(p2)*Math.sin((bLon - aLon) * rad / 2) ** 2;
    return 6371.0088 * 2 * Math.asin(Math.min(1,Math.sqrt(Math.max(0,h))));
  }
  function hasVerifiedGeo(geo){
    return geo && Number.isFinite(+geo.lat) && Number.isFinite(+geo.lon)
      && Array.isArray(geo.bbox) && geo.bbox.length === 4
      && geo.bbox.every(x => Number.isFinite(+x))
      && +geo.bbox[0] <= +geo.bbox[1] && +geo.bbox[2] <= +geo.bbox[3];
  }
  function localRadiusEligible(item, town, geo){
    if(item.location_status !== 'VERIFICATO_FONTE' || !item.town_id) return false;
    const source = geo[item.town_id];
    if(!hasVerifiedGeo(source) || !hasVerifiedGeo(town)) return false;
    const [south,north,west,east] = source.bbox.map(Number);
    return [south,north].every(lat => [west,east].every(lon =>
      distanceKm(+town.lat,+town.lon,lat,lon) <= MAX_RADIUS_KM + 1e-9
    ));
  }

  // Add only actual, provider-verified territorial social accounts.
  // This single shared script powers all 41 town landings.
  async function renderVerifiedSocialLinks(){
    if(!townId)return;
    const subtitle=root.querySelector('.sub');
    if(!subtitle)return;
    try{
      const api='https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-public-territory-social?town_id='+encodeURIComponent(townId);
      const response=await fetch(api,{cache:'no-cache'});
      if(!response.ok)return;
      const data=await response.json();
      if(!data.verified||!data.facebook_url||!data.instagram_url)return;
      const fb=new URL(data.facebook_url),ig=new URL(data.instagram_url);
      if(!['facebook.com','www.facebook.com'].includes(fb.hostname.toLowerCase()))return;
      if(!['instagram.com','www.instagram.com'].includes(ig.hostname.toLowerCase()))return;
      const nav=element('nav','town-social-links');
      nav.setAttribute('aria-label','Social ufficiali del territorio');
      const lead=element('strong','', 'Segui Case in Pubblicità 24/7 · '+(root.dataset.townName||townId));
      const facebook=element('a','town-social-facebook','Facebook '+(root.dataset.townName||townId));
      facebook.href=fb.href;facebook.target='_blank';facebook.rel='noopener noreferrer';
      const instagram=element('a','town-social-instagram','Instagram '+(root.dataset.townName||townId));
      instagram.href=ig.href;instagram.target='_blank';instagram.rel='noopener noreferrer';
      nav.append(lead,facebook,instagram);
      subtitle.insertAdjacentElement('afterend',nav);
    }catch(_){/* No verified links available: do not display placeholders. */}
  }
  function setMode(value) {
    mode = value; page = 1;
    root.querySelectorAll('[data-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
      button.setAttribute('aria-pressed', button.dataset.mode === mode);
    });
    render();
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function card(item) {
    const article = element('article');
    const photo = element('div', 'photo');
    const photoLink = element('a'); photoLink.href = item.url; photoLink.target = '_blank'; photoLink.rel = 'noopener noreferrer';
    const image = element('img'); image.alt = item.title; image.loading = 'lazy';
    if (item.image) { const url = new URL(item.image); url.searchParams.set('width', '800'); image.src = url.href; }
    image.addEventListener('error', () => { image.remove(); photoLink.append(element('span', 'mobile-note', 'Foto disponibile sul sito La Sacra')); });
    photoLink.append(image); photo.append(photoLink, element('span', 'badge', item.category));
    const info = element('div', 'info'), priceRow = element('div', 'price-row');
    const heart = element('button', 'heart', saved.has(item.id) ? '♥' : '♡'); heart.type = 'button';
    heart.setAttribute('aria-label', (saved.has(item.id) ? 'Rimuovi dai' : 'Salva nei') + ' preferiti: ' + item.title);
    heart.setAttribute('aria-pressed', saved.has(item.id));
    heart.onclick = () => { saved.has(item.id) ? saved.delete(item.id) : saved.add(item.id); try { localStorage.setItem(storageKey, JSON.stringify([...saved])); } catch (_) {} render(); };
    // Preserve the exact source price; source contract inconsistencies must not turn into invented monthly prices.
    priceRow.append(element('span', 'price', item.price === null ? 'Prezzo su richiesta' : money.format(item.price)), heart);
    const facts = element('div', 'facts');
    if (item.rooms) facts.append(element('span', '', item.rooms + ' locali'));
    if (item.surface) facts.append(element('span', '', item.surface + ' mq'));
    if (item.baths) facts.append(element('span', '', item.baths + (item.baths === 1 ? ' bagno' : ' bagni')));
    const source = element('div', 'source'), link = element('a', '', 'Vedi immobile su La Sacra ↗');
    link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    source.append(element('span', '', 'Annuncio originale'), link);
    info.append(priceRow, element('p', 'location', item.location_status === 'VERIFICATO_FONTE' ? 'Comune verificato nella fonte: ' + item.municipality : 'Comune da verificare nella fonte'), element('h2', '', item.title.charAt(0) + item.title.slice(1).toLowerCase()), facts, element('div', 'agency', 'Partner · La Sacra Immobiliare'), source);
    article.append(photo, info); return article;
  }
  function render() {
    let list = data.filter(item => {
      const text = fold(item.title + ' ' + item.description);
      return text.includes(fold($('#property-search').value)) &&
        (!+$('#property-budget').value || (item.price !== null && item.price <= +$('#property-budget').value)) &&
        (!$('#property-type').value || item.category === $('#property-type').value) &&
        (mode !== 'saved' || saved.has(item.id)) && (mode !== 'business' || item.category === 'Impresa') &&
        (mode !== 'homes' || item.category === 'Residenziale') &&
        (mode !== 'rent' || item.contract === 'Affitto');
    });
    const order = $('#property-sort').value;
    list.sort((a, b) => order === 'asc' ? (a.price ?? Infinity) - (b.price ?? Infinity) : order === 'desc' ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : String(b.published_at || '').localeCompare(String(a.published_at || '')));
    const totalPages = townId ? 1 : Math.max(1, Math.ceil(list.length / 12)); page = Math.min(page, totalPages);
    $('#result-count').textContent = list.length + (list.length === 1 ? ' immobile' : ' immobili');
    $('#saved-count').textContent = data.filter(i => saved.has(i.id)).length;
    grid.replaceChildren();
    if (townId) {
      grid.classList.remove('grid');
      const local = list.filter(i => i.location_status === 'VERIFICATO_FONTE' && i.town_id === townId);
      const other = list.filter(i => !(i.location_status === 'VERIFICATO_FONTE' && i.town_id === townId));
      for (const [title, items, empty] of [
        ['Immobili a ' + root.dataset.townName, local, 'Nessun immobile con comune verificato disponibile per questo paese e questi filtri. Qui sotto trovi gli altri annunci.'],
        ['Immobili dei comuni vicini entro 20 km', other, 'Nessun altro immobile entro 20 km corrisponde ai filtri selezionati.']
      ]) {
        const section = element('section', 'territorial-section');
        section.append(element('h2', '', title));
        const cards = element('div', 'grid');
        cards.append(...items.map(card));
        if (!items.length) cards.append(element('p', 'empty', empty));
        section.append(cards); grid.append(section);
      }
    } else {
      grid.append(...list.slice((page - 1) * 12, page * 12).map(card));
      if (!list.length) grid.append(element('p', 'empty', 'Nessun immobile con questi filtri. Prova a modificare la ricerca.'));
    }
    const pages = $('#property-pages'); pages.replaceChildren();
    for (let n = 1; !townId && n <= totalPages; n++) {
      const button = element('button', n === page ? 'active' : '', String(n)); button.type = 'button';
      button.setAttribute('aria-label', 'Pagina ' + n); if (n === page) button.setAttribute('aria-current', 'page');
      button.onclick = () => { page = n; render(); $('#result-count').scrollIntoView({block: 'start'}); }; pages.append(button);
    }
  }
  if(townId)renderVerifiedSocialLinks();
  root.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));
  for (const selector of ['#property-search', '#property-budget', '#property-type', '#property-sort']) $(selector).addEventListener('input', () => { page = 1; render(); });
  $('#reset-filters').onclick = () => { $('#property-search').value = ''; $('#property-budget').value = '0'; $('#property-type').value = ''; $('#property-sort').value = 'recent'; setMode('all'); };
  Promise.all([
    fetch(root.dataset.feed, {cache: 'no-cache'}).then(response => {
      if(!response.ok) throw new Error('Catalog HTTP ' + response.status);
      return response.json();
    }),
    townId ? fetch(new URL('../../config/case247-geo-verified.json', location.href),{cache:'no-cache'}).then(response=>{
      if(!response.ok)throw new Error('Geografia territoriale HTTP '+response.status);
      return response.json();
    }) : Promise.resolve(null)
  ]).then(([payload,geography])=>{
    if (!Array.isArray(payload.items)) throw new Error('Invalid inventory');
    data = [...new Map(payload.items.map(i => [i.id || i.url, i])).values()];
    if(townId){
      const geo=geography?.towns||{};
      const center=geo[townId];
      if(!hasVerifiedGeo(center))throw new Error('Coordinate del comune non verificate');
      data=data.filter(item=>localRadiusEligible(item,center,geo));
      const subtitle=root.querySelector('.sub');
      if(subtitle)subtitle.textContent='Prima gli immobili di '+(root.dataset.townName||'questo paese')+', poi gli annunci dei comuni vicini ammessi entro 20 km dalla località. Distanza verificata in modo prudente con i confini comunali disponibili.';
    }
    const date = new Date(payload.last_success_at);
    $('#catalog-status').textContent = (townId?'Catalogo territoriale entro 20 km · ':'') + 'Ultimo aggiornamento riuscito: ' + date.toLocaleString('it-IT', {timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short'}) + ' · Fonte: La Sacra Immobiliare';
    if (Date.now() - date.getTime() > 48 * 3600 * 1000) $('#catalog-status').textContent += ' · Aggiornamento in ritardo: verifica la disponibilità sul sito del partner.';
    render();
  }).catch(() => { $('#catalog-status').textContent = 'Catalogo momentaneamente non disponibile. Consulta tutti gli immobili sul sito La Sacra.'; grid.replaceChildren(); const link = element('a', '', 'Apri il catalogo La Sacra ↗'); link.href = 'https://lasacraimmobiliare.it/collections/all'; grid.append(link); });
})();
