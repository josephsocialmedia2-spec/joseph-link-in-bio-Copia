/* Configurazione indipendente dal motore grafico. Non introdurre dati fittizi. */
window.CASE247_CONFIG = Object.freeze({
  brand: 'CASE IN PUBBLICITÀ 24/7',
  subtitle: 'Avigliana e territorio circostante',
  portfolio: 'Selezione immobili dal portafoglio La Sacra Immobiliare',
  contactName: 'Joseph Malafronte',
  contactRole: 'Digital Strategist',
  phone: '3713708294',
  whatsappText: 'VENDO',
  partner: 'Partner commerciale di Immobiliare La Sacra',
  agencyAddress: 'Piazza del Comune XXV Aprile, 1 · 10057 Sant’Ambrogio di Torino (TO)',
  catalogPath: '/joseph-link-in-bio-Copia/immobili/catalogo.json',
  allowedHostnames: ['lasacraimmobiliare.it', 'www.lasacraimmobiliare.it'],
  imageFallback: './assets/foto-non-disponibile.svg',
  panoramaFallback: './assets/territorio-placeholder.svg',
  portraitFallback: '/joseph-link-in-bio-Copia/assets/joseph-malafronte.webp',
  // Inserire nel progetto un panorama fotografico originale e autorizzato, poi aggiornare qui:
  panoramaReal: '',
  outputName: 'CASE247_volantino_premium_A4.pdf',
  agencyLogo:"https://lasacraimmobiliare.it/cdn/shop/files/Untitled_design_14.png?height=108&v=1766316153",
  profiles:{
    joseph:{id:"joseph",name:"Joseph",role:"Digital Strategist",brand:"case247",phone:"3713708294",displayPhone:"371 370 8294",whatsappText:"VENDO"},
    cristian:{id:"cristian",name:"Cristian",role:"Funzionario",brand:"lasacra",phone:"3462568685",displayPhone:"346 256 8685",whatsappText:"VENDO"},
    ylenia:{id:"ylenia",name:"Ylenia",role:"Funzionaria",brand:"lasacra",phone:"3462568685",displayPhone:"346 256 8685",whatsappText:"VENDO"}
  },
  templates: [
    { id:'cobalto', name:'01 · Cobalto premium', desc:'Blu editoriale e panorama' },
    { id:'editorial', name:'02 · Editoriale chiaro', desc:'Bianco e azzurro' },
    { id:'gold', name:'03 · Luxury oro', desc:'Navy, oro, profili' },
    { id:'impact', name:'04 · Impatto commerciale', desc:'Contrasti energici' },
    { id:'midnight', name:'05 · Prestige scuro', desc:'Neon blu/oro' },
    { id:'signature', name:'06 · Personal brand', desc:'Ritratto in primo piano' }
  ]
});
