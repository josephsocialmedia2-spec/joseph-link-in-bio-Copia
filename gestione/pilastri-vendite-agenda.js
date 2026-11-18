/* Pilastri delle Vendite — pannello a sinistra dell'agenda CASE247. */
(function () {
  'use strict';
  const groups = [
    ['I Fondamenti', [
      ['I', 'La Ricerca Attiva', 'Bisogna parlare con le persone (fare ricerca): questa è la vera base del lavoro.'],
      ['II', 'Rispetto delle Basi', 'Le basi non si toccano. Si possono implementare, sono d’accordo, ma non si toccano.'],
      ['III', 'Disciplina e Onestà', 'Darsi da fare ogni giorno, sia che se ne abbia voglia sia che non se ne abbia. Le persone più facili da prendere in giro siamo noi stessi.'],
      ['IV', 'Il Potere della Routine', 'Nel campo delle vendite immobiliari è la costanza a fare davvero la differenza. "La routine è segno di successo."'],
      ['V', 'Obiettivo Numerico', 'Entrare in contatto con almeno 30, 40, 50 persone ogni giorno.']
    ]],
    ['I 5 Segreti', [
      ['VI', 'Motivazione Profonda', 'Segreto n. 1: trova il tuo perché.'],
      ['VII', 'Gestione dell’Agenda', 'Segreto n. 2: pianifica e segui l’agenda, non viceversa.'],
      ['VIII', 'Blocchi Vincolanti', 'Segreto n. 3: utilizza il sistema dei blocchi vincolanti.'],
      ['IX', 'Controllo del Mercato', 'Segreto n. 4: chi ha gli incarichi di vendita controlla il mercato.'],
      ['X', 'Sviluppo Nuovi Affari', 'Segreto n. 5: concentrati ogni giorno nello sviluppare nuovo business.']
    ]],
    ['Le 4 Regole Operative', [
      ['XI', 'Cicli di Focus', 'Prima regola: focus di 50 minuti sull’attività di ricerca, poi stacca 10 minuti.'],
      ['XII', 'Tracciamento Dati', 'Seconda regola: tieni traccia di tutti i dati relativi alla tua ricerca.'],
      ['XIII', 'Pianificazione Anticipata', 'Terza regola: pianifica la sera prima le persone che andrai a contattare.'],
      ['XIV', 'Zero Distrazioni', 'Quarta regola: tieniti lontano dalle distrazioni.']
    ]]
  ];
  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function mount() {
    const control = document.getElementById('case247-control-center');
    if (!control || !control.parentNode || document.getElementById('cc-pilastri')) return !!document.getElementById('cc-pilastri');
    const aside = create('aside', 'sidebar-comandamenti');
    aside.id = 'cc-pilastri';
    aside.setAttribute('aria-label', 'I Pilastri delle Vendite');
    aside.append(create('h2', '', 'I Pilastri delle Vendite'));
    const columns = create('div', 'pilastri-gruppi');
    for (const [label, items] of groups) {
      const group = create('section', 'pilastri-gruppo');
      group.append(create('div', 'sezione-label', label));
      for (const [numeral, title, description] of items) {
        const card = create('article', 'comandamento');
        const header = create('div', 'comandamento-header');
        header.append(create('span', 'numero-romano', numeral), create('span', 'concetto-titolo', title));
        card.append(header, create('p', '', description));
        group.append(card);
      }
      columns.append(group);
    }
    aside.append(columns);
    control.parentNode.insertBefore(aside, control);
    return true;
  }
  if (mount()) return;
  const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
  observer.observe(document.documentElement, {childList: true, subtree: true});
  document.addEventListener('DOMContentLoaded', () => { if (mount()) observer.disconnect(); }, {once: true});
})();
