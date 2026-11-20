
/* CASE247 - vetrina pubblicitaria A5 e lettore PDF, senza backend aggiuntivo. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cards = [
    {title:"Stai pensando di vendere casa ad Avigliana?",red:"VENDERE CASA",first:"STAI PENSANDO DI",last:"AD AVIGLIANA?",lead:"Scopri quanto può valere il tuo immobile nel mercato di oggi.",short:"Valutazione immobiliare e consulenza iniziale.",side:"Valutazione orientata al mercato locale",benefits:["Analisi del contesto immobiliare","Promozione professionale","Gestione dei contatti","Supporto alla compravendita"],symbol:"⌂",category:"valore",photo:"10549571617095.jpg"},
    {title:"Il prezzo sbagliato può costarti caro",red:"PUÒ COSTARTI CARO",first:"IL PREZZO SBAGLIATO",last:"",lead:"Prima di vendere scegli una strategia di prezzo fondata sul mercato.",short:"Prezzo e posizionamento commerciale.",side:"Valorizza al meglio il tuo immobile",benefits:["Analisi del prezzo di mercato","Presentazione dell'immobile","Promozione sui canali principali","Supporto nella gestione richieste"],symbol:"€",category:"valore",photo:"10549582070087.jpg"},
    {title:"Hai una casa da ristrutturare ad Avigliana?",red:"RISTRUTTURARE",first:"HAI UNA CASA DA",last:"AD AVIGLIANA?",lead:"Valuta il valore attuale prima di affrontare lavori importanti.",short:"Vendere nello stato in cui si trova.",side:"Anche un immobile da ristrutturare ha valore",benefits:["Stima dello stato attuale","Analisi dei punti di forza","Promozione verso gli interessati","Assistenza nella vendita"],symbol:"⌂",category:"scelte",photo:"10552459985223.jpg"},
    {title:"Affittare o vendere? Valuta costi e rischi",red:"TI RENDE DAVVERO",first:"AFFITTARE CASA",last:"O È UN RISCHIO?",lead:"Confronta rendimento, tasse, costi e scenari di vendita.",short:"Una decisione informata sul patrimonio.",side:"Valuta con chiarezza se tenere o vendere",benefits:["Confronto tra obiettivi","Valore di mercato locale","Analisi delle alternative","Supporto professionale"],symbol:"⇄",category:"scelte",photo:"10552683856199.jpg"},
    {title:"Cerchiamo case nella zona di Avigliana",red:"IN QUESTA ZONA",first:"CERCHIAMO CASE",last:"DI AVIGLIANA",lead:"Stai pensando di vendere? Conosci le opportunità della tua zona.",short:"Campagna di acquisizione territoriale.",side:"Quando c'è interesse conta farsi trovare pronti",benefits:["Valutazione dell'immobile","Posizionamento commerciale","Presentazione professionale","Gestione dei contatti"],symbol:"⌖",category:"metodo",photo:"10552748212551.jpg"},
    {title:"Quanto denaro stai lasciando sul tavolo?",red:"LASCIANDO",first:"QUANTO DENARO STAI",last:"SUL TAVOLO?",lead:"Una strategia può aiutare a esprimere il potenziale dell'immobile.",short:"Presentazione, prezzo e promozione.",side:"Valorizzare non significa improvvisare",benefits:["Analisi del potenziale","Posizionamento adatto","Comunicazione mirata","Supporto nella vendita"],symbol:"€",category:"valore",photo:"10552768561479.jpg"},
    {title:"La tua casa vale davvero quanto pensi?",red:"DAVVERO QUANTO",first:"LA TUA CASA VALE",last:"PENSI?",lead:"Il valore di mercato potrebbe essere diverso dal prezzo immaginato.",short:"Analisi comparativa prima della vendita.",side:"Capire il valore è il primo passo",benefits:["Mercato immobiliare locale","Valutazione orientativa","Presentazione efficace","Consulenza iniziale"],symbol:"?",category:"valore",photo:"10552805753159.jpg"},
    {title:"Ogni mese invenduta ha un costo",red:"INVENDUTA",first:"OGNI MESE",last:"HA UN COSTO",lead:"Il tempo può incidere sui costi e sul tuo progetto di vendita.",short:"Strategia commerciale e tempi.",side:"Il tempo conta nella vendita",benefits:["Analisi della situazione","Strategia di lancio","Promozione chiara","Gestione delle richieste"],symbol:"◷",category:"metodo",photo:"10552816369991.jpg"},
    {title:"La prima offerta è davvero quella giusta?",red:"DAVVERO QUELLA",first:"LA PRIMA OFFERTA È",last:"GIUSTA?",lead:"Valuta prezzo, condizioni, tempi e affidabilità complessiva.",short:"Confronto delle proposte d'acquisto.",side:"Una proposta va valutata nel suo insieme",benefits:["Lettura degli elementi","Valutazione delle condizioni","Confronto delle opportunità","Supporto decisionale"],symbol:"≡",category:"scelte",photo:"10552842780999.jpg"},
    {title:"Non vendere una casa: valorizza il patrimonio",red:"VALORIZZA IL TUO",first:"NON VENDERE SOLO UNA CASA",last:"PATRIMONIO",lead:"Fotografie, comunicazione e promozione valorizzano la presentazione.",short:"Campagna di promozione integrata.",side:"Un immobile merita una presentazione all'altezza",benefits:["Fotografie e presentazione","Promozione ordinata","Selezione dei contatti","Approccio professionale"],symbol:"⌂",category:"metodo",photo:"10555043021127.jpg"}
  ];

  // Le 20 facciate sono derivate dagli originali del 20/11/2026, non ricostruite in HTML.
  const originals = window.CASE247_ORIGINAL_FLYERS;
  const root = $("flyerProducts");
  const validOriginals = Array.isArray(originals) && originals.length===cards.length
    && originals.every(pair => Array.isArray(pair) && pair.length===2 && pair.every(v => /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(v)));
  if (root && !validOriginals) {
    root.innerHTML = '<p class="flyer-error" role="alert">Le grafiche originali non sono disponibili. Ricarica la pagina per riprovare.</p>';
  }
  if (root && validOriginals) {
    const lightbox = document.createElement("dialog");
    lightbox.className = "flyer-lightbox";
    lightbox.setAttribute("aria-labelledby","flyerLightboxTitle");
    lightbox.innerHTML =
      '<div class="flyer-lightbox-header"><div><small>IMMOBILIARE LA SACRA · ORIGINALE A5</small><h3 id="flyerLightboxTitle"></h3></div><button type="button" class="flyer-lightbox-close" aria-label="Chiudi anteprima">Chiudi ×</button></div>' +
      '<div class="flyer-lightbox-image-wrap"><img class="flyer-lightbox-image" alt=""></div>' +
      '<div class="flyer-lightbox-controls"><button type="button" data-side="0">Fronte</button><button type="button" data-side="1">Retro</button><button type="button" class="flyer-lightbox-prev">← Volantino precedente</button><button type="button" class="flyer-lightbox-next">Volantino successivo →</button></div>';
    document.body.appendChild(lightbox);
    const lightImage=lightbox.querySelector(".flyer-lightbox-image");
    const lightTitle=lightbox.querySelector("#flyerLightboxTitle");
    let activeIndex=0, activeSide=0;
    function showOriginal(index,side) {
      activeIndex=(index+cards.length)%cards.length;
      activeSide=side===1?1:0;
      lightImage.src=originals[activeIndex][activeSide];
      lightImage.alt="Volantino originale "+(activeIndex+1)+" · "+(activeSide===0?"fronte":"retro")+" · "+cards[activeIndex].title;
      lightTitle.textContent=String(activeIndex+1).padStart(2,"0")+" · "+cards[activeIndex].title;
      lightbox.querySelectorAll("[data-side]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.side)===activeSide)));
      if(!lightbox.open)lightbox.showModal();
    }
    lightbox.querySelector(".flyer-lightbox-close").addEventListener("click",()=>lightbox.close());
    lightbox.querySelector(".flyer-lightbox-prev").addEventListener("click",()=>showOriginal(activeIndex-1,activeSide));
    lightbox.querySelector(".flyer-lightbox-next").addEventListener("click",()=>showOriginal(activeIndex+1,activeSide));
    lightbox.querySelectorAll("[data-side]").forEach(b=>b.addEventListener("click",()=>showOriginal(activeIndex,Number(b.dataset.side))));
    lightbox.addEventListener("click",e=>{if(e.target===lightbox)lightbox.close();});
    lightbox.addEventListener("keydown",e=>{
      if(e.key==="ArrowRight"){e.preventDefault();showOriginal(activeIndex+1,activeSide);}
      if(e.key==="ArrowLeft"){e.preventDefault();showOriginal(activeIndex-1,activeSide);}
    });
    const fragment=document.createDocumentFragment();
    cards.forEach((item,index)=>{
      const article=document.createElement("article");
      article.className="flyer-product";
      article.dataset.category=item.category;
      const eyebrow=document.createElement("p");
      eyebrow.className="flyer-label";
      eyebrow.textContent="VOLANTINO ORIGINALE · "+String(index+1).padStart(2,"0")+" / 10";
      article.appendChild(eyebrow);
      const visuals=document.createElement("div");
      visuals.className="flyer-visuals";
      ["Fronte","Retro"].forEach((label,side)=>{
        const button=document.createElement("button");
        button.type="button";
        button.className="flyer-preview";
        button.setAttribute("aria-label","Ingrandisci "+label.toLowerCase()+" del volantino "+(index+1));
        const img=document.createElement("img");
        img.src=originals[index][side];
        img.alt=label+" del volantino originale La Sacra: "+item.title;
        img.loading="lazy";
        img.decoding="async";
        img.width=420;
        img.height=590;
        const caption=document.createElement("span");
        caption.textContent=label+" · Ingrandisci";
        button.append(img,caption);
        button.addEventListener("click",()=>showOriginal(index,side));
        visuals.appendChild(button);
      });
      article.appendChild(visuals);
      const heading=document.createElement("h3");
      heading.textContent=item.title;
      const summary=document.createElement("p");
      summary.className="flyer-summary";
      summary.textContent=item.short;
      article.append(heading,summary);
      const controls=document.createElement("div");
      controls.className="flyer-controls";
      const view=document.createElement("button");
      view.type="button";
      view.textContent="Sfoglia fronte e retro";
      view.addEventListener("click",()=>showOriginal(index,0));
      const wa=document.createElement("a");
      wa.href="https://wa.me/393462568685?text="+encodeURIComponent("Buongiorno, ho visto il volantino "+(index+1)+" «"+item.title+"» e vorrei informazioni.");
      wa.target="_blank";
      wa.rel="noopener noreferrer";
      wa.textContent="Richiedi informazioni";
      controls.append(view,wa);
      article.appendChild(controls);
      fragment.appendChild(article);
    });
    root.replaceChildren(fragment);
    document.querySelectorAll(".flyer-filter").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.querySelectorAll(".flyer-filter").forEach(x=>x.setAttribute("aria-pressed",String(x===btn)));
        const filter=btn.dataset.filter;
        root.querySelectorAll(".flyer-product").forEach(card=>card.hidden=filter!=="all"&&card.dataset.category!==filter);
      });
    });
  }
  // Download form backend loads only after a visitor explicitly requests the guide.
  // This avoids an unsolicited API request while browsing the property catalog.
  const guideOpen = $("guideOpen");
  if (guideOpen) {
    let guideBoot = null;
    guideOpen.addEventListener("click", () => {
      if (guideBoot) return;
      guideOpen.disabled = true;
      guideBoot = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "../gestione/volantini-premium/volantino-digitale/guida-download.js?v=20261120";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Impossibile caricare il modulo guida."));
        document.body.appendChild(script);
      });
      guideBoot.then(() => {
        guideOpen.disabled = false;
        guideOpen.click();
      }).catch(() => {
        guideBoot = null;
        guideOpen.disabled = false;
        $("guideAvailabilityNote").textContent = "Modulo temporaneamente non disponibile. Riprova.";
      });
    });
  }
  const reader = $("pdfBook"), open = $("pdfStart");
  if(!reader || !open) return;
  const prev = $("pdfPrev"), next = $("pdfNext"), count = $("pdfCount"), status = $("pdfStatus"), jump = $("pdfJump");
  const paper = $("pdfPaper"), canvas = $("pdfCanvas");
  const pdfUrl = new URL("./La_Sacra_Catalogo_Tutti_Immobili.pdf", document.baseURI).href;
  const pdfJsUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
  const workerUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  let pdf=null, page=1, rendering=false, nextRequested=null, fallback=false;
  function update() {
    const total=pdf ? pdf.numPages : null;
    count.textContent="Pagina "+page+(total?" di "+total:"");
    prev.disabled=page<=1;
    next.disabled=!!total&&page>=total;
    jump.value=page;
    jump.max=total||9999;
  }
  async function render(n) {
    if(!pdf || fallback) return;
    page=Math.min(pdf.numPages,Math.max(1,n)); update();
    if(rendering){nextRequested=page;return;}
    rendering=true;
    const targetPage=page;
    status.textContent="Caricamento pagina "+targetPage+"…";
    try{
      const p=await pdf.getPage(targetPage), natural=p.getViewport({scale:1});
      const available=Math.max(220, paper.clientWidth-26);
      const ratio=Math.min(2,window.devicePixelRatio||1);
      const scale=Math.min(2.4,available/natural.width)*ratio;
      const viewport=p.getViewport({scale});
      canvas.width=Math.ceil(viewport.width);
      canvas.height=Math.ceil(viewport.height);
      canvas.style.width=(viewport.width/ratio)+"px";
      canvas.style.height=(viewport.height/ratio)+"px";
      await p.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport}).promise;
      status.textContent="Pagina "+targetPage+" di "+pdf.numPages+". Usa le frecce o scorri con il dito.";
      if (targetPage!==page) nextRequested=page;
    }catch(err){
      status.textContent="Visualizzatore non disponibile. Puoi aprire il PDF originale.";
      setFallback();
    }finally{
      rendering=false;
      if(nextRequested!==null){const n=nextRequested;nextRequested=null;if(n!==targetPage)render(n);}
    }
  }
  function setFallback(){
    fallback=true;
    canvas.hidden=true;
    const frame=document.createElement("iframe");
    frame.title="Catalogo PDF immobiliare";
    frame.loading="lazy";
    frame.id="pdfNative";
    frame.src=pdfUrl+"#page="+page+"&view=FitH";
    paper.appendChild(frame);
    count.textContent="PDF aperto nel lettore del dispositivo";
    jump.hidden=true;
    prev.disabled=true;next.disabled=true;
  }
  open.addEventListener("click",async()=>{
    reader.classList.add("is-open");
    reader.hidden=false;
    open.textContent="Catalogo PDF aperto";
    reader.scrollIntoView({block:"start",behavior:"smooth"});
    if(pdf||fallback)return;
    open.disabled=true;
    status.textContent="Apertura del catalogo PDF…";
    try{
      const lib=await import(pdfJsUrl);
      lib.GlobalWorkerOptions.workerSrc=workerUrl;
      pdf=await lib.getDocument({url:pdfUrl,withCredentials:false}).promise;
      update();
      await render(page);
    }catch(error){
      status.textContent="Il lettore avanzato non è disponibile: visualizzazione PDF standard.";
      setFallback();
    }finally{open.disabled=false;}
  });
  prev.addEventListener("click",()=>render(page-1));
  next.addEventListener("click",()=>render(page+1));
  jump.addEventListener("change",()=>{if(pdf)render(Number(jump.value)||1);});
  reader.addEventListener("keydown",(e)=>{
    if(!pdf || e.target===jump)return;
    if(e.key==="ArrowRight"){e.preventDefault();render(page+1);}
    if(e.key==="ArrowLeft"){e.preventDefault();render(page-1);}
  });
  let touchX=null;
  paper.addEventListener("touchstart",(e)=>{if(pdf&&e.touches.length===1)touchX=e.touches[0].clientX;},{passive:true});
  paper.addEventListener("touchend",(e)=>{
    if(touchX===null || !pdf)return;
    const delta=e.changedTouches[0].clientX-touchX;touchX=null;
    if(Math.abs(delta)>65)render(page+(delta<0?1:-1));
  },{passive:true});
  update();
})();
