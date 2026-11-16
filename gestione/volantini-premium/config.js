/* Configurazione indipendente dal motore grafico. Non introdurre dati fittizi. */
window.CASE247_CONFIG = Object.freeze({
  brand: 'IMMOBILIARE LA SACRA',
  subtitle: 'Valle di Susa e territorio torinese',
  portfolio: 'Immobili e opportunità · Immobiliare La Sacra',
  contactName: 'Joseph Malafronte',
  contactRole: 'Digital Strategist',
  phone: '3713708294',
  whatsappText: 'VENDO',
  partner: 'Comunicazione immobiliare · Immobiliare La Sacra',
  agencyAddress: 'Piazza del Comune XXV Aprile, 1 · 10057 Sant’Ambrogio di Torino (TO)',
  catalogPath: '/joseph-link-in-bio-Copia/immobili/catalogo.json',
  allowedHostnames: ['lasacraimmobiliare.it', 'www.lasacraimmobiliare.it'],
  imageFallback: './assets/foto-non-disponibile.svg',
  panoramaFallback: './assets/territorio-placeholder.svg',
  portraitFallback: '/joseph-link-in-bio-Copia/assets/joseph-malafronte.webp',
  // Inserire nel progetto un panorama fotografico originale e autorizzato, poi aggiornare qui:
  panoramaReal: '',
  outputName: 'Immobiliare_La_Sacra_volantino_premium_A4.pdf',
  agencyLogo:"https://lasacraimmobiliare.it/cdn/shop/files/Untitled_design_14.png?height=108&v=1766316153",
  profiles:{
    joseph:{id:"joseph",name:"Joseph",role:"Digital Strategist",brand:"case247",phone:"3713708294",displayPhone:"371 370 8294",whatsappText:"VENDO"},
    cristian:{id:"cristian",name:"Christian",role:"Titolare",brand:"lasacra",phone:"3462568685",displayPhone:"346 256 8685",whatsappText:"VENDO"},
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
