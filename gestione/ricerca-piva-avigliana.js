/* CASE247 — Richiesta integrale per ricerca manuale Partita IVA Avigliana. Nessun scraping, invio o raccolta. */
(function () {
  'use strict';
  const PROMPT = "agisci come un analista di ricerche di mercato locali e lead generation B2B. Il tuo compito è mappare le attività commerciali B2C attive nel comune di Avigliana (TO) e nei comuni limitrofi situati nel raggio di 20 km (in particolare lungo l'asse della bassa Val di Susa e la cintura ovest di Torino, come ad esempio: Sant'Ambrogio di Torino, Chiusa di San Michele, Vaie, Sant'Antonino di Susa, Borgone Susa, Condove, Caprie, Villar Dora, Almese, Rubiana, Caselette, Alpignano, Rivoli, Rosta, Buttigliera Alta, Reano, Trana, Giaveno, Coazze, Sangano, Bruino, Piossasco). Target della ricerca: Concentrati sulle attività commerciali con sede fisica aperta al pubblico: negozi al dettaglio, bar, caffetterie, ristoranti, pizzerie, parrucchieri, centri estetici, palestre e servizi alla persona. Per Avigliana, dai priorità alle principali arterie commerciali (Corso Laghi, Corso Torino, Piazza Conte Rosso, Via IV Novembre, Viale Mareschi e la zona dei laghi). Regole per la raccolta dati: 1. Niente invenzioni: Se un dato (in particolare la Partita IVA) non è reperibile con certezza da fonti pubbliche verificabili, scrivi esattamente \"Non trovata\". Non generare mai codici casuali. 2. Fonti da consultare: Cerca le Partite IVA nei footer dei siti web ufficiali, nelle sezioni \"Informazioni\" delle pagine Facebook/Instagram, oppure su elenchi pubblici italiani (es. PagineGialle, UfficioCamerale, FatturatoItalia, Registro Imprese). 3. Format dei dati: Riporta la Partita IVA nel formato standard italiano a 11 cifre (es. 01234567890). Inserisci URL completi e cliccabili per siti web e social. Output richiesto: Crea una tabella Markdown con esattamente queste 7 colonne: 1. Nome Insegna / Ragione Sociale 2. Comune e Indirizzo (es. Avigliana - Corso Laghi 10) 3. Tipologia di attività (es. Ristorazione, Abbigliamento, Parrucchiere) 4. Partita IVA 5. Sito Web (scrivi \"Assente\" se non presente) 6. Pagine Social (link a Facebook e/o Instagram; scrivi \"Assenti\" se non presenti) 7. Fonte del dato (indica brevemente dove hai trovato la P.IVA, es. Footer sito web, UfficioCamerale, Pagina Facebook) Modalità di esecuzione: Poiché l'area geografica è molto vasta, procedi in modo sistematico e approfondito. Inizia fornendo un elenco completo attività partendo da Avigliana e dai comuni immediatamente confinanti (Buttigliera Alta, Rosta, Sant'Ambrogio di Torino, Almese, Villar Dora), per poi proseguire con gli altri comuni su mia richiesta";
  const FALLBACK = 'https://www.google.com/search?q=partita+iva+avigliana';
  const GOOGLE_URL = 'https://www.google.com/search?q=' + encodeURIComponent(PROMPT);
  const SELECTOR = 'a[href="' + FALLBACK + '"], a[data-case247-google-piva]';
  function updateLinks() {
    document.querySelectorAll(SELECTOR).forEach(link => {
      link.href = GOOGLE_URL;
      link.setAttribute('data-case247-google-piva', '');
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('title', 'Apri Google con la richiesta completa di ricerca (20 km da Avigliana)');
    });
  }
  window.CASE247GooglePiva = Object.freeze({ prompt: PROMPT, url: GOOGLE_URL });
  const ready = () => {
    updateLinks();
    // Le schede CASE247 generano pulsanti dinamici; aggiorniamo anche quelli.
    const observer = new MutationObserver(() => updateLinks());
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href="' + FALLBACK + '"], a[data-case247-google-piva]');
    if (link) {
      link.href = GOOGLE_URL;
      return;
    }
    const copy = event.target.closest('[data-case247-copy-prompt]');
    if (!copy) return;
    if (!navigator.clipboard?.writeText) {
      copy.textContent = 'Copia non disponibile';
      return;
    }
    navigator.clipboard.writeText(PROMPT).then(() => {
      copy.textContent = 'Prompt copiato';
    }).catch(() => {
      copy.textContent = 'Copia non disponibile';
    });
  }, true);
})();
