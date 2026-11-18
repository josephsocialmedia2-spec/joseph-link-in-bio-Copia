/* CASE247 · Agenda 50. Componente aggiuntivo isolato: non modifica la SPA o l'agenda settimanale. */
(function () {
  'use strict';

  const SCHEMA = 'case247.agenda.v1';
  const PREFIX = 'case247_agenda_';
  const TIME_ZONE = 'Europe/Rome';
  const GROUPS = [
    { id: 'morning', time: 'Mattina · 09:30 – 11:30 · Acquisizione', limit: 30, items: [
      { id: 'email', label: 'Email ad aziende', limit: 10, hint: 'Censimento, distribuzione e Gmail', links: [
        ['Censimento aziende', './censimento-aziende/'],
        ['Email volantini', './email-volantini/'],
        ['Gmail', 'https://mail.google.com/']
      ] },
      { id: 'linkedin', label: 'Contatti LinkedIn', limit: 10, hint: 'Registrare l’esito nel CRM B2B', links: [
        ['LinkedIn', 'https://www.linkedin.com/'],
        ['CRM B2B', './case247-operazioni/']
      ] },
      { id: 'dm', label: 'Messaggi diretti (DM)', limit: 10, hint: 'Facebook, Instagram, TikTok e YouTube', links: [
        ['Canali CASE247', './canali-case247/'],
        ['Quadro 2 · Social', './quadro-social/']
      ] }
    ] },
    { id: 'calls', time: 'Tarda mattina · 11:30 – 12:30 · Acquisizione diretta', limit: 10, items: [
      { id: 'calls', label: 'Telefonate, vocali o visite', limit: 10,
        hint: 'CRM proprietari / Seller Radar · invia volantino soltanto dopo il contatto', links: [
          ['CRM / Seller Radar', './case247-operazioni/'],
          ['Volantini WhatsApp', './whatsapp-volantini/'],
          ['WhatsApp 371 370 8294', 'https://wa.me/393713708294']
        ] }
    ] },
    { id: 'afternoon', time: 'Pomeriggio · 14:00 – 15:30 / 15:30 – 16:30 · Sviluppo e Follow-up', limit: 10, items: [
      { id: 'comments', label: 'Commenti sui profili social', limit: 5, hint: 'Interazioni pertinenti sui profili collegati', links: [
        ['Canali CASE247', './canali-case247/'],
        ['Quadro 2 · Social', './quadro-social/']
      ] },
      { id: 'followups', label: 'Follow-up', limit: 5, hint: 'Ricontatti via social o email, registrare l’esito', links: [
        ['CRM B2B / Proprietari', './case247-operazioni/'],
        ['Gmail', 'https://mail.google.com/']
      ] }
    ] }
  ];
  // Fasce orarie in minuti locali (Europe/Rome). Fine intervallo esclusa.
  const WINDOWS = [
    { group: 'morning', start: 9 * 60 + 30, end: 11 * 60 + 30, label: '09:30–11:30', priority: 'Completa Acquisizione Mattina' },
    { group: 'calls', start: 11 * 60 + 30, end: 12 * 60 + 30, label: '11:30–12:30', priority: 'Completa Acquisizione diretta' },
    { group: 'afternoon', item: 'comments', start: 14 * 60, end: 15 * 60 + 30, label: '14:00–15:30', priority: 'Completa i Commenti Social' },
    { group: 'afternoon', item: 'followups', start: 15 * 60 + 30, end: 16 * 60 + 30, label: '15:30–16:30', priority: 'Completa i Follow-up' }
  ];
  function romeMinutes(now) {
    const parts = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now || new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return Number(values.hour) * 60 + Number(values.minute);
  }
  function activeWindow(now) {
    const minutes = romeMinutes(now);
    return WINDOWS.find(window => minutes >= window.start && minutes < window.end) || null;
  }
  // Promemoria serale, indipendente dalle 50 azioni e dai loro contatori.
  const SLEEP_START = 22 * 60 + 30;
  function sleepReminderActive(now) {
    return romeMinutes(now) >= SLEEP_START;
  }
  const ITEMS = GROUPS.flatMap(group => group.items);
  const CAPS = Object.fromEntries(ITEMS.map(item => [item.id, item.limit]));
  const MAX_TOTAL = ITEMS.reduce((sum, item) => sum + item.limit, 0);
  const clamp = (value, max) => Number.isFinite(Number(value)) ?
    Math.max(0, Math.min(max, Math.trunc(Number(value)))) : 0;
  function romeDay(now) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now || new Date());
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return [map.year, map.month, map.day].join('-');
  }
  function normalizeCounts(raw) {
    const result = {};
    ITEMS.forEach(item => { result[item.id] = clamp(raw && raw[item.id], item.limit); });
    return result;
  }
  function total(counts) {
    return ITEMS.reduce((sum, item) => sum + clamp(counts && counts[item.id], item.limit), 0);
  }
  function groupTotal(counts, group) {
    return group.items.reduce((sum, item) => sum + clamp(counts && counts[item.id], item.limit), 0);
  }
  function nextCounts(counts, id, direction) {
    const next = normalizeCounts(counts);
    if (!Object.hasOwn(CAPS, id) || (direction !== 1 && direction !== -1)) return next;
    next[id] = clamp(next[id] + direction, CAPS[id]);
    return next;
  }
  function fresh(date) {
    return { schema: SCHEMA, date, time_zone: TIME_ZONE, revision: 0,
      updated_at: null, counters: normalizeCounts({}), journal: [] };
  }
  function normalizeState(raw, date) {
    if (!raw || raw.schema !== SCHEMA || raw.date !== date || raw.time_zone !== TIME_ZONE) return fresh(date);
    return {
      schema: SCHEMA, date, time_zone: TIME_ZONE,
      revision: clamp(raw.revision, 100000000),
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
      counters: normalizeCounts(raw.counters),
      journal: Array.isArray(raw.journal) ? raw.journal.slice(-120).filter(e =>
        e && typeof e === 'object' && Object.hasOwn(CAPS, e.item) &&
        (e.direction === 1 || e.direction === -1)) : []
    };
  }
  function report(date, counts) {
    const lines = ['CASE247 · Agenda Operativa Giornaliera', 'Data: ' + date + ' · ' + TIME_ZONE, ''];
    GROUPS.forEach(group => {
      lines.push(group.time + ' — ' + groupTotal(counts, group) + '/' + group.limit);
      group.items.forEach(item => lines.push('• ' + item.label + ': ' +
        clamp(counts && counts[item.id], item.limit) + '/' + item.limit));
      lines.push('');
    });
    lines.push('TOTALE CONFERMATE: ' + total(counts) + '/' + MAX_TOTAL);
    lines.push('Solo operazioni confermate manualmente; nessuna bozza conteggiata.');
    return lines.join('\n');
  }

  // Le funzioni pure sono verificabili con i test Node senza istanziare il DOM.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GROUPS, ITEMS, CAPS, MAX_TOTAL, romeDay, normalizeCounts,
      total, groupTotal, nextCounts, fresh, normalizeState, report, WINDOWS, romeMinutes, activeWindow, sleepReminderActive };
  }
  if (typeof document === 'undefined') return;

  let date = romeDay();
  let todayDate = date;
  let state = fresh(date);
  let memoryOnly = false;
  const storageKey = day => PREFIX + day;
  function load(day) {
    try { return normalizeState(JSON.parse(localStorage.getItem(storageKey(day))), day); }
    catch (_) { memoryOnly = true; return fresh(day); }
  }
  function save() {
    try { localStorage.setItem(storageKey(date), JSON.stringify(state)); memoryOnly = false; }
    catch (_) { memoryOnly = true; }
  }
  state = load(date);

  function node(tag, className, textContent) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent !== undefined) element.textContent = textContent;
    return element;
  }
  function anchor(label, href) {
    const a = node('a', 'a50-link', label);
    a.href = href;
    if (/^https:\/\//.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    return a;
  }
  function mount() {
    if (document.getElementById('case247-agenda50')) return true;
    const center = document.getElementById('case247-control-center');
    const main = center && center.querySelector('.cc-main');
    const calendar = main && main.querySelector('#cc-calendar');
    const weekGrid = calendar && calendar.querySelector('#cc-week');
    const filters = calendar && calendar.querySelector('.cc-filters');
    if (!main || !weekGrid || !filters) return false;

    const section = node('section', 'cc-card a50-panel');
    section.id = 'case247-agenda50';
    section.setAttribute('aria-labelledby', 'a50-title');
    const header = node('div', 'a50-head');
    const heading = node('div', 'a50-heading');
    heading.append(node('p', 'a50-kicker', 'AGENDA · CASE IN PUBBLICITÀ 24/7'));
    const title = node('h2', '', 'Agenda Operativa Giornaliera · Obiettivo ');
    title.id = 'a50-title';
    const bigTotal = node('output', 'a50-grand-total', '0 / 50');
    bigTotal.setAttribute('aria-live', 'polite');
    title.append(bigTotal);
    heading.append(title);
    const dayLabel = node('div', 'a50-date');
    header.append(heading, dayLabel);
    // Notifica compatta sotto il titolo. I contatori continuano a rappresentare solo conferme reali.
    const liveBanner = node('div', 'a50-live-banner');
    liveBanner.id = 'a50-live-banner';
    liveBanner.setAttribute('role', 'status');
    liveBanner.setAttribute('aria-live', 'off'); // Evita annunci ripetuti ogni 20 secondi.
    const liveIcon = node('span', 'a50-live-icon', '●');
    liveIcon.setAttribute('aria-hidden', 'true');
    const liveText = node('span', 'a50-live-text', 'Nessuna fascia operativa attiva in questo momento');
    liveBanner.append(liveIcon, liveText);
    const progress = node('progress', 'a50-progress');
    progress.max = MAX_TOTAL;
    progress.value = 0;
    progress.setAttribute('aria-label', 'Avanzamento totale delle 50 operazioni confermate');
    const groupsGrid = node('div', 'a50-grid');
    GROUPS.forEach(group => {
      const card = node('article', 'a50-group');
      card.dataset.group = group.id;
      const row = node('div', 'a50-group-head');
      row.append(node('h3', '', group.time));
      const activeBadge = node('span', 'a50-active-badge', '● ORA IN CORSO');
      activeBadge.hidden = true;
      activeBadge.setAttribute('aria-hidden', 'true');
      row.append(activeBadge);
      const sum = node('output', 'a50-group-sum', '0 / ' + group.limit);
      sum.dataset.subtotal = group.id;
      row.append(sum);
      card.append(row);
      group.items.forEach(item => {
        const entry = node('div', 'a50-item');
        entry.dataset.item = item.id;
        const top = node('div', 'a50-item-head');
        top.append(node('strong', '', item.label));
        const count = node('output', 'a50-count', '0 / ' + item.limit);
        count.dataset.counter = item.id;
        top.append(count);
        const help = node('p', 'a50-hint', item.hint);
        const links = node('div', 'a50-links');
        item.links.forEach(([label, href]) => links.append(anchor(label, href)));
        const actions = node('div', 'a50-actions');
        const minus = node('button', 'a50-decrement', '−1');
        minus.type = 'button';
        minus.dataset.direction = '-1';
        minus.dataset.forItem = item.id;
        minus.setAttribute('aria-label', 'Annulla una conferma: ' + item.label);
        const plus = node('button', 'a50-increment', '+1 Confermata');
        plus.type = 'button';
        plus.dataset.direction = '1';
        plus.dataset.forItem = item.id;
        plus.setAttribute('aria-label', 'Conferma operazione eseguita: ' + item.label);
        actions.append(minus, plus);
        entry.append(top, help, links, actions);
        card.append(entry);
      });
      groupsGrid.append(card);
    });
    const toolbar = node('div', 'a50-toolbar');
    const copy = node('button', 'a50-tool', 'Copia resoconto');
    copy.id = 'a50-copy';
    copy.type = 'button';
    const reset = node('button', 'a50-tool a50-reset', 'Azzera giornata');
    reset.id = 'a50-reset';
    reset.type = 'button';
    const note = node('p', 'a50-disclaimer',
      'Conta solo l’azione realmente eseguita: le bozze non valgono. Registro aggregato nel browser, senza dati personali, invii o pubblicazioni automatiche.');
    const feedback = node('p', 'a50-feedback');
    feedback.id = 'a50-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    toolbar.append(copy, reset);
    section.append(header, liveBanner, progress, groupsGrid, toolbar, note, feedback);
    // Pannello aggiuntivo sotto la griglia settimanale, prima dei comandi export/import.
    // Non modifica, sposta o ricrea alcuna card esistente.
    calendar.insertBefore(section, filters);
    section.addEventListener('click', event => {
      const button = event.target.closest('button[data-for-item]');
      if (!button || !section.contains(button)) return;
      change(button.dataset.forItem, Number(button.dataset.direction));
    });
    copy.addEventListener('click', async () => {
      rollover();
      const text = report(date, state.counters);
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const temp = node('textarea');
          temp.value = text;
          temp.style.cssText = 'position:fixed;left:-9999px;opacity:0';
          document.body.append(temp);
          temp.select();
          if (!document.execCommand('copy')) throw new Error('Copia non riuscita');
          temp.remove();
        }
        status('Resoconto copiato negli appunti.');
      } catch (_) {
        status('Copia non disponibile: controlla i permessi del browser.');
      }
    });
    reset.addEventListener('click', () => {
      rollover();
      if (!window.confirm('Azzera tutti i contatori confermati del ' + date + '?')) return;
      state = fresh(date);
      state.revision = 1;
      state.updated_at = new Date().toISOString();
      save();
      render();
      status('Contatori della giornata azzerati.');
    });
    function status(value) { feedback.textContent = value; }
    function rollover() {
      const current = romeDay();
      if (current === todayDate) return;
      const wasToday = date === todayDate;
      todayDate = current;
      if (wasToday) {
        date = current;
        state = load(date);
        status('Nuova giornata: caricati i contatori del ' + date + '.');
      }
      render();
    }
    function change(item, direction) {
      rollover();
      if (!Object.hasOwn(CAPS, item) || ![-1, 1].includes(direction)) return;
      // Rilegge la revisione più recente, per ridurre le collisioni fra schede aperte.
      if (!memoryOnly) state = load(date);
      const next = nextCounts(state.counters, item, direction);
      if (next[item] === state.counters[item]) return;
      state.counters = next;
      state.revision += 1;
      state.updated_at = new Date().toISOString();
      state.journal.push({ item, direction, at: state.updated_at, source: 'manual' });
      state.journal = state.journal.slice(-120);
      save();
      render();
      status(memoryOnly ?
        'Conferma registrata in questa scheda. Memoria locale non disponibile.' :
        'Operazione aggiornata. Nessun messaggio è stato inviato automaticamente.');
    }
    function updateTiming(now) {
      const isToday = date === romeDay(now);
      const sleep = isToday && sleepReminderActive(now);
      const active = isToday && !sleep ? activeWindow(now) : null;
      const group = active && GROUPS.find(entry => entry.id === active.group);
      const item = active && active.item && ITEMS.find(entry => entry.id === active.item);
      const target = item ? item.limit : (group ? group.limit : 0);
      const achieved = item ? state.counters[item.id] : (group ? groupTotal(state.counters, group) : 0);
      const done = !!group && achieved >= target;
      section.querySelectorAll('.a50-group').forEach(card => {
        const shouldPulse = !!active && !done && card.dataset.group === active.group;
        card.classList.toggle('fascia-attiva-lampeggiante', shouldPulse);
        const badge = card.querySelector('.a50-active-badge');
        if (badge) badge.hidden = !shouldPulse;
      });
      liveBanner.classList.toggle('a50-sleep-alert', sleep);
      liveBanner.classList.toggle('fascia-attiva-lampeggiante', !!active && !done);
      liveBanner.classList.toggle('a50-live-complete', !!active && done);
      liveBanner.classList.toggle('a50-live-idle', !active && !sleep);
      liveIcon.textContent = sleep ? '●' : (active ? (done ? '✓' : '●') : '✓');
      liveText.textContent = sleep
        ? '22:30 · DORMIRE — È ora di riposare'
        : active
        ? (done
          ? 'Fascia completata (' + active.label + '): ' + target + '/' + target
          : 'Fascia attiva (' + active.label + '): ' + active.priority +
            ' · ' + achieved + '/' + target)
        : 'Nessuna fascia operativa attiva in questo momento';
    }
    function render() {
      bigTotal.textContent = total(state.counters) + ' / ' + MAX_TOTAL;
      progress.value = total(state.counters);
      dayLabel.textContent = 'Data: ' + date + ' · ' + TIME_ZONE;
      GROUPS.forEach(group => {
        const el = section.querySelector('[data-subtotal="' + group.id + '"]');
        el.textContent = groupTotal(state.counters, group) + ' / ' + group.limit;
      });
      ITEMS.forEach(item => {
        section.querySelector('[data-counter="' + item.id + '"]').textContent =
          state.counters[item.id] + ' / ' + item.limit;
        section.querySelector('[data-direction="-1"][data-for-item="' + item.id + '"]').disabled =
          state.counters[item.id] === 0;
        section.querySelector('[data-direction="1"][data-for-item="' + item.id + '"]').disabled =
          state.counters[item.id] >= item.limit;
      });
      updateTiming();
      document.dispatchEvent(new CustomEvent('case247:agenda50-render', {detail:{date,counts:{...state.counters}}}));
    }
    window.CASE247Agenda50 = {
      selectDay(day) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
        const d = new Date(day + 'T12:00:00Z');
        if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==day || d.getUTCDay()===0) return false;
        date = day; state = load(date); render(); return true;
      },
      getDay:()=>date,
      getCounts:()=>({...state.counters}),
      refresh:()=>render()
    };
    render();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { rollover(); if (!memoryOnly) { state = load(date); render(); } }
    });
    window.addEventListener('storage', event => {
      if (event.key === storageKey(date)) { state = load(date); render(); }
    });
    // Rilevamento regolare, indipendente da click, refresh o modifiche ai contatori.
    window.setInterval(() => { rollover(); updateTiming(); }, 20000);
    return true;
  }
  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      if (mount()) observer.disconnect();
    }, { once: true });
  }
})();
