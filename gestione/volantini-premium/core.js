/* Funzioni pure e testabili in Node, browser o GitHub Pages. */
(function (global) {
  'use strict';
  const config = global.CASE247_CONFIG || {};
  const hosts = new Set(config.allowedHostnames || ['lasacraimmobiliare.it','www.lasacraimmobiliare.it']);
  function canonicalUrl(input) {
    try {
      const u = new URL(String(input).trim());
      if (u.protocol !== 'https:' || !hosts.has(u.hostname)) return '';
      if (!/^\/products\/[a-z0-9-]+\/?$/.test(u.pathname)) return '';
      u.search = ''; u.hash = '';
      return u.href.replace(/\/$/, '');
    } catch { return ''; }
  }
  function normalizedMoney(input) {
    if (input === null || input === undefined || String(input).trim() === '') return null;
    if (typeof input === 'number') return Number.isFinite(input) && input > 0 ? input : null;
    let text = String(input).replace(/[€\s]/g, '').replace(/[^\d.,]/g, '');
    if (!text) return null;
    text = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/\.(?=\d{3}(?:\.|$))/g, '');
    const val = Number(text);
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  function normalizedEnergy(input) {
    const s = String(input ?? '').toUpperCase().replace(/\s/g, '');
    return /^(?:A[1-4]|[B-G])$/.test(s) ? s : '';
  }
  function normalizedEp(input) {
    if (input === null || input === undefined || String(input).trim() === '') return '';
    const t = String(input).replace(/kwh.*$/i, '').replace(/\s/g, '').replace('.', ',');
    return /^\d+(?:,\d+)?$/.test(t) && Number(t.replace(',','.')) >= 0 ? t : '';
  }
  function formatPrice(input) {
    const p = normalizedMoney(input);
    return p === null ? 'In fase di definizione' : new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(p);
  }
  function makeEntry(obj = {}) {
    return {
      title: String(obj.title || '').trim(),
      city: String(obj.city || obj.municipality || '').trim(),
      price: normalizedMoney(obj.price),
      energy: normalizedEnergy(obj.energy),
      ep: normalizedEp(obj.ep),
      envelope: normalizedEp(obj.envelope),
      url: canonicalUrl(obj.url),
      img: String(obj.img || obj.image || '').trim(),
      contract: ['Vendita', 'Affitto'].includes(obj.contract) ? obj.contract : 'Da verificare',
      checked: obj.checked === true
    };
  }
  function checkEntry(entry, i) {
    const issues = []; const n = i + 1;
    if (!entry || !entry.title) { issues.push(`Scheda ${n}: titolo mancante`); return issues; }
    if (!canonicalUrl(entry.url)) issues.push(`Scheda ${n}: URL La Sacra non valido`);
    if (!entry.city) issues.push(`Scheda ${n}: località mancante`);
    if (normalizedMoney(entry.price) === null) issues.push(`Scheda ${n}: prezzo da verificare`);
    if (!normalizedEnergy(entry.energy)) issues.push(`Scheda ${n}: classe energetica mancante`);
    if (!normalizedEp(entry.ep)) issues.push(`Scheda ${n}: EPgl,nren mancante`);
    if (!entry.img || /foto-non-disponibile\.svg/.test(entry.img)) issues.push(`Scheda ${n}: fotografia da sostituire`);
    if (!entry.checked) issues.push(`Scheda ${n}: APE, disponibilità e foto non confermati`);
    return issues;
  }
  function checkSheet(entries) {
    const issues = [];
    if (!Array.isArray(entries) || entries.length !== 18) return ['Il foglio deve contenere esattamente 18 posizioni'];
    const seen = new Set();
    entries.forEach((p, i) => {
      issues.push(...checkEntry(p, i));
      const url = p?.url ? canonicalUrl(p.url) : '';
      if (url && seen.has(url)) issues.push(`Scheda ${i + 1}: URL duplicato`);
      if (url) seen.add(url);
    });
    return issues;
  }
  const exported = { canonicalUrl, normalizedMoney, normalizedEnergy, normalizedEp, formatPrice, makeEntry, checkEntry, checkSheet };
  global.CASE247_CORE = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
})(typeof window !== 'undefined' ? window : globalThis);
