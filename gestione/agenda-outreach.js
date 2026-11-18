/* CASE247 - modulo operativo giornaliero nell'agenda. Dati aggregati solo nel browser. */
(function () {
  'use strict';
  const REPO = 'josephsocialmedia2-spec/joseph-link-in-bio-Copia';
  const REPO_URL = 'https://github.com/' + REPO;
  const DAILY_PREFIX = 'CASE247 Radar · Riepilogo 06:00 · ';
  const STORAGE_PREFIX = 'case247-outreach-counter-v1:';
  const BLOCKS = [
    { time: '08:30–10:00', tasks: [
      { id: 'email', label: 'Email ad attività', max: 10, action: 'Gmail', url: 'https://mail.google.com/' },
      { id: 'linkedin', label: 'Contatti LinkedIn', max: 10, action: 'LinkedIn', url: 'https://www.linkedin.com/mynetwork/' },
      { id: 'dm', label: 'Messaggi diretti (DM)', max: 10, action: 'Instagram', url: 'https://www.instagram.com/direct/inbox/' }
    ] },
    { time: '10:30–11:30', tasks: [
      { id: 'calls', label: 'Telefonate, vocali o visite', max: 10, action: 'CRM Excel', crm: true }
    ] },
    { time: '14:30–15:15', tasks: [
      { id: 'comments', label: 'Commenti ai profili social', max: 5, action: 'Facebook', url: 'https://www.facebook.com/' },
      { id: 'followups', label: 'Follow-up via social o email', max: 5, action: 'Gmail', url: 'https://mail.google.com/' }
    ] }
  ];
  const CHANNELS = [
    ['Facebook', 'https://www.facebook.com/'],
    ['Instagram', 'https://www.instagram.com/'],
    ['TikTok', 'https://www.tiktok.com/'],
    ['YouTube', 'https://www.youtube.com/'],
    ['LinkedIn', 'https://www.linkedin.com/']
  ];
  function todayRome() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const d = {};
    parts.forEach(p => { d[p.type] = p.value; });
    return d.year + '-' + d.month + '-' + d.day;
  }
  function el(tag, className, value) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (value != null) n.textContent = value;
    return n;
  }
  function external(label, url) {
    const a = el('a', 'cc-outreach-link', label);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function readCount(date) {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_PREFIX + date) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }
  function storeCount(date, data) {
    try { localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(data)); return true; }
    catch (_) { return false; }
  }
  async function copyReport(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const input = el('textarea');
        input.value = text;
        input.style.cssText = 'position:fixed;opacity:0;left:-10000px';
        document.body.append(input); input.select();
        if (!document.execCommand('copy')) throw new Error('Copia fallita');
        input.remove();
      }
      return true;
    } catch (_) { return false; }
  }
  function mount() {
    const calendar = document.getElementById('cc-calendar');
    if (!calendar || document.getElementById('cc-daily-outreach')) return;
    const panel = el('section', 'cc-daily-outreach');
    panel.id = 'cc-daily-outreach';
    panel.setAttribute('aria-label', 'Operazioni commerciali quotidiane');
    const header = el('div', 'cc-outreach-head');
    const left = el('div');
    left.append(el('h3', '', 'Operazioni quotidiane · 50 contatti e interazioni'));
    const dateLabel = el('p', 'cc-outreach-date');
    left.append(dateLabel);
    const progress = el('strong', 'cc-outreach-total', '0 / 50');
    header.append(left, progress);
    const source = el('div', 'cc-outreach-source');
    const sourceText = el('span', 'cc-outreach-source-status', 'Ricerca del riepilogo del giorno…');
    const issueLink = external('Apri riepilogo 06:00', REPO_URL + '/issues');
    issueLink.id = 'cc-outreach-daily-link';
    source.append(el('b', '', 'Fonte automatica giornaliera'), sourceText, issueLink,
      external('Lotto aziende (Excel/CSV)', './censimento-aziende/decripta-lotto.html'));
    const grid = el('div', 'cc-outreach-grid');
    const counters = new Map();
    BLOCKS.forEach(block => {
      const card = el('div', 'cc-outreach-card');
      card.append(el('h4', '', block.time));
      block.tasks.forEach(t => {
        const row = el('div', 'cc-outreach-task');
        const desc = el('div', 'cc-outreach-desc');
        desc.append(el('span', '', t.label));
        if (t.crm) {
          const crm = el('button', 'cc-outreach-link', t.action);
          crm.type = 'button';
          crm.addEventListener('click', () => {
            const open = document.getElementById('cc-crm-open');
            if (open) open.click();
          });
          desc.append(crm);
        } else desc.append(external(t.action, t.url));
        const controls = el('div', 'cc-outreach-controls');
        const minus = el('button', '', '−');
        const amount = el('output', '', '0 / ' + t.max);
        const plus = el('button', '', '+');
        minus.type = plus.type = 'button';
        minus.setAttribute('aria-label', 'Riduci ' + t.label);
        plus.setAttribute('aria-label', 'Aumenta ' + t.label);
        controls.append(minus, amount, plus);
        row.append(desc, controls);
        card.append(row);
        counters.set(t.id, { amount, minus, plus, max: t.max, label: t.label });
      });
      grid.append(card);
    });
    const foot = el('div', 'cc-outreach-foot');
    const social = el('div', 'cc-outreach-networks');
    CHANNELS.forEach(c => social.append(external(c[0], c[1])));
    const copyButton = el('button', 'cc-outreach-copy', 'Copia resoconto');
    copyButton.type = 'button';
    const info = el('small', 'cc-outreach-note', 'Segna solo operazioni realmente eseguite. Contatori locali al dispositivo; nessun invio o commento automatico.');
    const feedback = el('span', 'cc-outreach-feedback');
    feedback.setAttribute('role', 'status');
    foot.append(social, copyButton, info, feedback);
    panel.append(header, source, grid, foot);
    calendar.insertBefore(panel, document.getElementById('cc-day-nav') || document.getElementById('cc-week'));
    let day = '';
    let counts = {};
    function refresh() {
      if (todayRome() !== day) {
        day = todayRome();
        counts = readCount(day);
        dateLabel.textContent = 'Oggi · ' + new Intl.DateTimeFormat('it-IT', {
          dateStyle: 'full', timeZone: 'Europe/Rome'
        }).format(new Date()) + ' · Europe/Rome';
        lookupDailyReport(day);
      }
      let done = 0;
      counters.forEach((node, id) => {
        const value = Math.max(0, Math.min(node.max, Number(counts[id]) || 0));
        node.amount.textContent = value + ' / ' + node.max;
        node.minus.disabled = value === 0;
        node.plus.disabled = value === node.max;
        done += value;
      });
      progress.textContent = done + ' / 50';
    }
    counters.forEach((node, id) => {
      node.minus.addEventListener('click', () => change(id, -1));
      node.plus.addEventListener('click', () => change(id, +1));
    });
    function change(id, delta) {
      const item = counters.get(id);
      counts[id] = Math.min(item.max, Math.max(0, (Number(counts[id]) || 0) + delta));
      if (!storeCount(day, counts)) feedback.textContent = 'Salvataggio non disponibile su questo browser.';
      else feedback.textContent = '';
      refresh();
    }
    copyButton.addEventListener('click', async () => {
      const lines = ['CASE247 · ' + day];
      BLOCKS.forEach(b => {
        lines.push(b.time);
        b.tasks.forEach(t => lines.push(t.label + ': ' + (Number(counts[t.id]) || 0) + '/' + t.max));
      });
      lines.push('Totale: ' + progress.textContent);
      feedback.textContent = await copyReport(lines.join('\n')) ? 'Resoconto copiato.' : 'Copia non disponibile.';
    });
    async function lookupDailyReport(date) {
      sourceText.textContent = 'Verifica link del ' + date + '…';
      issueLink.href = REPO_URL + '/issues?q=' + encodeURIComponent('is:issue CASE247 Radar ' + date);
      issueLink.textContent = 'Cerca report del giorno su GitHub';
      try {
        const request = await fetch('https://api.github.com/repos/' + REPO +
          '/issues?state=all&sort=created&direction=desc&per_page=100', {
          cache: 'no-store', headers: { Accept: 'application/vnd.github+json' }
        });
        if (!request.ok) throw new Error('GitHub HTTP ' + request.status);
        const items = await request.json();
        const found = Array.isArray(items) && items.find(x => !x.pull_request && x.title === DAILY_PREFIX + date);
        if (todayRome() !== date) return;
        if (found && found.html_url) {
          issueLink.href = found.html_url;
          issueLink.textContent = 'Apri il riepilogo automatico di oggi';
          sourceText.textContent = 'Report disponibile · ' + date;
        } else sourceText.textContent = 'Report di oggi non trovato: verifica l’automazione.';
      } catch (_) {
        if (todayRome() === date) sourceText.textContent = 'Verifica automatica non riuscita: usa la ricerca GitHub.';
      }
    }
    refresh();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.setInterval(refresh, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();