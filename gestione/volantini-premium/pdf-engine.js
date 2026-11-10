/* Esportazione A4 landscape: il contenuto illustrativo è rasterizzato a 3×,
   ma tutti i 19 QR vengono sovrapposti con veri rettangoli PDF vettoriali. */
(function (global) {
  'use strict';
  const W=841.8898,H=595.2756; // A4 landscape in punti PDF (297 × 210 mm).
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  async function waitForImg(img, timeout=9000){
    if(!img) return false;
    if(img.complete && img.naturalWidth>0) return true;
    return Promise.race([
      new Promise(resolve=>{img.addEventListener('load',()=>resolve(true),{once:true});img.addEventListener('error',()=>resolve(false),{once:true});}),
      sleep(timeout).then(()=>false)
    ]);
  }
  async function waitAllImages(flyer){
    const images=[...flyer.querySelectorAll('img')];
    const ok=await Promise.all(images.map(x=>waitForImg(x)));
    return ok.every(Boolean);
  }
  function download(bytes,filename,type='application/pdf'){
    const blob=new Blob([bytes],{type}),u=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=u;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),25000);
  }
  async function addExternalPage(doc,file,pageNumber){
    if(!file)return;
    const pdf=global.PDFLib,page=doc.addPage([W,H]),bytes=await file.arrayBuffer();
    let obj,w,h,draw;
    if(file.type==='application/pdf'){
      const src=await pdf.PDFDocument.load(bytes,{ignoreEncryption:false});
      const idx=Math.max(0,Math.trunc(Number(pageNumber)||1)-1);
      if(idx>=src.getPageCount())throw Error('Numero pagina esterna fuori intervallo');
      const [embedded]=await doc.embedPdf(bytes,[idx]);
      w=embedded.width;h=embedded.height;
      draw=(x,y,width,height)=>page.drawPage(embedded,{x,y,width,height});
    } else if(file.type==='image/png'||file.type==='image/jpeg'){
      obj=file.type==='image/png'?await doc.embedPng(bytes):await doc.embedJpg(bytes);
      w=obj.width;h=obj.height;draw=(x,y,width,height)=>page.drawImage(obj,{x,y,width,height});
    }else throw Error('Esterno non supportato: usare PDF, PNG o JPEG');
    const scale=Math.min(W/w,H/h);const ww=w*scale,hh=h*scale;
    page.drawRectangle({x:0,y:0,width:W,height:H,color:pdf.rgb(1,1,1)});
    draw((W-ww)/2,(H-hh)/2,ww,hh);
  }
  async function exportPdf({flyer, properties, externalFile=null,externalPage=1,watermark=true, filename}){
    if(!global.PDFLib||!global.html2canvas||!global.CASE247_QR)throw Error('Librerie PDF/QR non disponibili. Serve una connessione Internet o le librerie JS locali.');
    if(!flyer)throw Error('Anteprima non trovata');
    const urls=global.CASE247_QR.verifyAssociations(properties,`https://wa.me/39${global.CASE247_CONFIG.phone}?text=${encodeURIComponent(global.CASE247_CONFIG.whatsappText)}`);
    if(urls.length)throw Error(urls.join('; '));
    if(!(await waitAllImages(flyer)))throw Error('Una o più immagini non sono state caricate. Attendi o sostituiscile.');
    const {PDFDocument,rgb,degrees,StandardFonts}=global.PDFLib;
    const pdf=await PDFDocument.create();
    if(externalFile)await addExternalPage(pdf,externalFile,externalPage);
    const capture=await global.html2canvas(flyer,{
      backgroundColor:'#ffffff',scale:3,useCORS:true,allowTaint:false,logging:false,
      width:1122,height:794,windowWidth:1400,scrollX:0,scrollY:0,
      onclone:doc=>{
        const copy=doc.getElementById('flyer');
        copy.style.transform='none';copy.style.top='0';copy.style.left='0';
        // Nel bitmap si nascondono i QR; il motore PDF li ridisegna vettorialmente.
        doc.querySelectorAll('.qr-box svg').forEach(svg=>svg.style.visibility='hidden');
      }
    });
    const page=pdf.addPage([W,H]);
    const image=await pdf.embedPng(capture.toDataURL('image/png'));
    page.drawImage(image,{x:0,y:0,width:W,height:H});
    // Filigrana sotto i QR: i moduli neri rimangono puri e privi di sovrastampe.
    if(watermark){
      const font=await pdf.embedFont(StandardFonts.HelveticaBold);
      page.drawText('BOZZA - NON DISTRIBUIRE',{
        x:205,y:290,size:29,font,rotate:degrees(27),color:rgb(.78,.08,.08),opacity:.23
      });
    }
    const report=[];
    for(let i=0;i<18;i++){
      const node=flyer.querySelector(`[data-qr-id="listing-${i}"]`);
      if(!node)throw Error(`QR non trovato nel riquadro ${i+1}`);
      report.push(global.CASE247_QR.drawPdf(page,node,`listing-${i}`,flyer,W,H,global.PDFLib));
    }
    const waNode=flyer.querySelector('[data-qr-id="whatsapp"]');
    if(!waNode)throw Error('QR WhatsApp non trovato');
    report.push(global.CASE247_QR.drawPdf(page,waNode,'whatsapp',flyer,W,H,global.PDFLib));
    const bytes=await pdf.save();download(bytes,filename||global.CASE247_CONFIG.outputName);
    return {pdfBytes:bytes.length, pages:pdf.getPageCount(),qrCount:report.length,
      minModuleMm:Math.min(...report.map(x=>x.moduleMm)),qrs:report};
  }
  global.CASE247_PDF = {exportPdf,waitForImg};
})(window);
