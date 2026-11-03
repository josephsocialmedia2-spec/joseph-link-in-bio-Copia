(() => {
  'use strict';
  const root = document.getElementById('case-preview');
  const $ = selector => root.querySelector(selector);
  const storageKey = 'case247-property-favourites-v1';
  let saved = new Set(), data = [], page = 1, mode = 'all';
  const townId = root.dataset.townId || '';
  let localOnly = Boolean(townId);
  const townAll = root.querySelector('#town-all');
  if (townAll) townAll.addEventListener('change', () => { localOnly = !townAll.checked; page = 1; render(); });
  try { saved = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch (_) {}
  const money = new Intl.NumberFormat('it-IT', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0});
  const fold = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const grid = $('#property-grid');
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
    info.append(priceRow, element('h2', '', item.title.charAt(0) + item.title.slice(1).toLowerCase()), facts, element('div', 'agency', 'Partner · La Sacra Immobiliare'), source);
    article.append(photo, info); return article;
  }
  function render() {
    let list = data.filter(item => {
      const text = fold(item.title + ' ' + item.description);
      return (!localOnly || (item.town_mentions || []).includes(townId)) && text.includes(fold($('#property-search').value)) &&
        (!+$('#property-budget').value || (item.price !== null && item.price <= +$('#property-budget').value)) &&
        (!$('#property-type').value || item.category === $('#property-type').value) &&
        (mode !== 'saved' || saved.has(item.id)) && (mode !== 'business' || item.category === 'Impresa') &&
        (mode !== 'homes' || item.category === 'Residenziale') &&
        (mode !== 'rent' || item.contract === 'Affitto');
    });
    const order = $('#property-sort').value;
    list.sort((a, b) => order === 'asc' ? (a.price ?? Infinity) - (b.price ?? Infinity) : order === 'desc' ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : String(b.published_at || '').localeCompare(String(a.published_at || '')));
    const totalPages = Math.max(1, Math.ceil(list.length / 12)); page = Math.min(page, totalPages);
    $('#result-count').textContent = list.length + (list.length === 1 ? ' immobile' : ' immobili');
    $('#saved-count').textContent = data.filter(i => saved.has(i.id)).length;
    grid.replaceChildren(...list.slice((page - 1) * 12, page * 12).map(card));
    if (!list.length) grid.append(element('p', 'empty', localOnly ? 'Nessun annuncio con il nome del paese nel titolo per questi filtri. Puoi mostrare tutto il catalogo La Sacra con la casella qui sopra.' : 'Nessun immobile con questi filtri. Prova a modificare la ricerca.'));
    const pages = $('#property-pages'); pages.replaceChildren();
    for (let n = 1; n <= totalPages; n++) {
      const button = element('button', n === page ? 'active' : '', String(n)); button.type = 'button';
      button.setAttribute('aria-label', 'Pagina ' + n); if (n === page) button.setAttribute('aria-current', 'page');
      button.onclick = () => { page = n; render(); $('#result-count').scrollIntoView({block: 'start'}); }; pages.append(button);
    }
  }
  root.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));
  for (const selector of ['#property-search', '#property-budget', '#property-type', '#property-sort']) $(selector).addEventListener('input', () => { page = 1; render(); });
  $('#reset-filters').onclick = () => { $('#property-search').value = ''; $('#property-budget').value = '0'; $('#property-type').value = ''; $('#property-sort').value = 'recent'; setMode('all'); };
  fetch(root.dataset.feed, {cache: 'no-cache'}).then(response => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).then(payload => {
    if (!Array.isArray(payload.items)) throw new Error('Invalid inventory');
    data = payload.items;
    const date = new Date(payload.last_success_at);
    $('#catalog-status').textContent = 'Ultimo aggiornamento riuscito: ' + date.toLocaleString('it-IT', {timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short'}) + ' · Fonte: La Sacra Immobiliare';
    if (Date.now() - date.getTime() > 48 * 3600 * 1000) $('#catalog-status').textContent += ' · Aggiornamento in ritardo: verifica la disponibilità sul sito del partner.';
    render();
  }).catch(() => { $('#catalog-status').textContent = 'Catalogo momentaneamente non disponibile. Consulta tutti gli immobili sul sito La Sacra.'; grid.replaceChildren(); const link = element('a', '', 'Apri il catalogo La Sacra ↗'); link.href = 'https://lasacraimmobiliare.it/collections/all'; grid.append(link); });
})();
