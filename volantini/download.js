/* CASE247 | Download PDF di presentazione aziendale.
   Non contiene dati di immobili e non registra alcun consenso marketing.
   Per sostituire il PDF dopo la verifica del catalogo, pubblicare il PDF
   approvato in /volantini/ e impostare APPROVED_PDF_PATH qui sotto. */
(() => {
  "use strict";
  const APPROVED_PDF_PATH = "";
  const button = document.getElementById("downloadFlyer");
  const confirm = document.getElementById("downloadConfirm");
  const status = document.getElementById("downloadStatus");
  if (!button || !confirm || !status) return;
  const clean = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "");
  const escapePdf = s => clean(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
  const color = hex => {
    const h = hex.replace("#","");
    return [0,2,4].map(i=>(parseInt(h.slice(i,i+2),16)/255).toFixed(3)).join(" ");
  };
  function presentationPdf() {
    const commands = [];
    const rect = (x,y,w,h,fill) => commands.push(color(fill)+" rg "+x+" "+y+" "+w+" "+h+" re f");
    const line = (x1,y1,x2,y2,stroke,width=1) => commands.push(color(stroke)+" RG "+width+" w "+x1+" "+y1+" m "+x2+" "+y2+" l S");
    const txt = (x,y,s,size=12,bold=false,fill="#102e47") =>
      commands.push(color(fill)+" rg BT /F"+(bold?2:1)+" "+size+" Tf 1 0 0 1 "+x+" "+y+" Tm ("+escapePdf(s)+") Tj ET");
    rect(0,0,595,842,"#f7f9fc");
    rect(0,582,595,260,"#082b48");
    rect(0,575,595,7,"#f3b954");
    txt(43,782,"CASE IN PUBBLICITA 24/7",25,true,"#ffffff");
    txt(43,749,"DIGITAL STRATEGY  |  PROMOZIONE IMMOBILIARE",11,false,"#bfdcef");
    txt(43,682,"LA VISIBILITA",31,true,"#ffffff");
    txt(43,641,"DEL TUO IMMOBILE",31,true,"#ffffff");
    txt(43,607,"Avigliana - Valle di Susa - Torino",13,false,"#f3b954");
    txt(43,529,"UNA STRATEGIA DI COMUNICAZIONE SU MISURA",16,true);
    txt(43,503,"Presentiamo gli immobili in modo chiaro, riconoscibile e professionale.",11);
    txt(43,486,"Ogni azione promozionale parte da obiettivi, contenuti e canali adeguati.",11);
    const cards = [
      {x:43,num:"01",title:"ANALISI",a:"Target, contesto e",b:"posizionamento"},
      {x:220,num:"02",title:"CONTENUTI",a:"Testi, visual e",b:"video immobiliari"},
      {x:397,num:"03",title:"VISIBILITA",a:"Campagne digitali",b:"e monitoraggio"}
    ];
    for (const c of cards) {
      rect(c.x,320,155,132,"#e9f1f7");
      rect(c.x,444,155,8,"#0b6a96");
      txt(c.x+13,416,c.num,17,true,"#0a638f");
      txt(c.x+13,384,c.title,12,true,"#092f4c");
      txt(c.x+13,357,c.a,10,false,"#365d78");
      txt(c.x+13,341,c.b,10,false,"#365d78");
    }
    txt(43,273,"VUOI CONOSCERE IL NOSTRO APPROCCIO?",16,true);
    txt(43,246,"Esplora il progetto online o richiedi informazioni tramite WhatsApp.",11);
    rect(43,146,509,70,"#082b48");
    txt(60,189,"Joseph Malafronte  |  Personal Digital Strategist",14,true,"#ffffff");
    txt(60,163,"WhatsApp +39 371 370 8294",12,false,"#f3b954");
    txt(43,114,"case in pubblicita 24/7  |  catalogo e informazioni sul sito",10,true);
    txt(43,96,"josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/",9,false,"#23577c");
    line(43,77,552,77,"#b6ccdb");
    txt(43,58,"Servizi di marketing, comunicazione e pubblicita immobiliare.",9);
    txt(43,43,"Non svolgiamo attivita di intermediazione. Nessuna promessa di vendita.",9);
    const stream=commands.join("\n")+"\n";
    const objects=[
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
      "<< /Length "+stream.length+" >>\nstream\n"+stream+"endstream"
    ];
    let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", offsets=[0];
    objects.forEach((value,i)=>{offsets.push(pdf.length);pdf+=(i+1)+" 0 obj\n"+value+"\nendobj\n";});
    const xref=pdf.length;
    pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
    for(let i=1;i<offsets.length;i++) pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
    pdf+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n";
    return new Blob([Uint8Array.from(pdf, c=>c.charCodeAt(0))],{type:"application/pdf"});
  }
  button.addEventListener("click", () => {
    if (!confirm.checked) {
      status.textContent="Per procedere conferma la richiesta di download.";
      confirm.focus();return;
    }
    let link;
    try {
      const approved = APPROVED_PDF_PATH.trim();
      if (approved && !/^\.?\/?[\w./-]+\.pdf$/i.test(approved)) throw Error("Percorso PDF non valido");
      link=document.createElement("a");
      link.download=approved ? "CASE247_Volantino_Immobiliare.pdf" : "CASE247_Presentazione_Servizio.pdf";
      if(approved) {
        const target=new URL(approved, document.baseURI);
        if(target.origin!==location.origin)throw Error("Il PDF deve essere ospitato sul sito CASE247");
        link.href=target.href;
      }else {
        link.href=URL.createObjectURL(presentationPdf());
      }
      document.body.append(link);
      link.click();
      link.remove();
      status.textContent="Download avviato. Se il browser lo blocca, consenti i download per questo sito.";
      if(!approved) setTimeout(()=>URL.revokeObjectURL(link.href), 30000);
    }catch(err){status.textContent="Impossibile avviare il download: "+err.message;}
  });
})();