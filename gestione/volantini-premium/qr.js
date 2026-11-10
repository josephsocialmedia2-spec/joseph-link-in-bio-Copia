/* 19 QR reali. La matrice è la stessa sia nel DOM SVG sia nel PDF vettoriale. */
(function (global) {
  'use strict';
  const matrices = new Map();
  const MARGIN = 4; // quiet zone di 4 moduli, oltre al bordo bianco CSS.
  function matrixFor(id, url) {
    if (typeof global.qrcode !== 'function') throw Error('Libreria qrcode-generator non disponibile');
    if (typeof url !== 'string' || !url) throw Error(`QR senza URL: ${id}`);
    const qr = global.qrcode(0, 'L');
    qr.addData(url, 'Byte'); qr.make();
    matrices.set(id, { qr, url });
    return qr;
  }
  function svgFor(qr) {
    const n = qr.getModuleCount(), size = n + 2 * MARGIN;
    const parts = [];
    for (let r = 0; r < n; r++) {
      let start = -1;
      for (let c = 0; c <= n; c++) {
        const on = c < n && qr.isDark(r, c);
        if (on && start < 0) start = c;
        if (!on && start >= 0) {
          parts.push(`M${start + MARGIN} ${r + MARGIN}h${c - start}v1h-${c - start}z`);
          start = -1;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Codice QR"><rect width="${size}" height="${size}" fill="#fff"/><path d="${parts.join('')}" fill="#000"/></svg>`;
  }
  function paint(container, id, url) {
    const qr = matrixFor(id, url);
    container.innerHTML = svgFor(qr);
    container.dataset.qrId = id;
    container.dataset.targetUrl = url;
    return qr;
  }
  function get(id) { return matrices.get(id); }
  function deleteId(id) { matrices.delete(id); }
  function verifyAssociations(properties, wa) {
    const issues = [];
    for (let i = 0; i < 18; i++) {
      const url = properties[i]?.url;
      const item = matrices.get(`listing-${i}`);
      if (!item || item.url !== url) issues.push(`QR annuncio ${i + 1} non associato all'URL`);
    }
    if (matrices.get('whatsapp')?.url !== wa) issues.push('QR WhatsApp errato');
    return issues;
  }
  // Questi sono i veri moduli vettoriali PDF, non un'immagine bitmap ricampionata.
  function drawPdf(page, dom, id, flyer, pageWidth, pageHeight, pdf) {
    const item = matrices.get(id);
    if (!item) throw Error(`Matrice QR assente: ${id}`);
    const rect = dom.getBoundingClientRect(), root = flyer.getBoundingClientRect();
    const x = (rect.left - root.left) / root.width * pageWidth;
    const y = pageHeight - (rect.bottom - root.top) / root.height * pageHeight;
    const w = rect.width / root.width * pageWidth, h = rect.height / root.height * pageHeight;
    const box = Math.min(w, h), x0 = x + (w - box)/2, y0 = y + (h - box)/2;
    const n = item.qr.getModuleCount(), pitch = box / (n + 2 * MARGIN);
    page.drawRectangle({ x:x0, y:y0, width:box, height:box, color:pdf.rgb(1,1,1) });
    const black = pdf.rgb(0,0,0);
    for (let r=0;r<n;r++) {
      let start=-1;
      for (let c=0;c<=n;c++) {
        const on=c<n && item.qr.isDark(r,c);
        if(on&&start<0)start=c;
        if(!on&&start>=0){
          page.drawRectangle({x:x0+(start+MARGIN)*pitch, y:y0+(n+MARGIN-r-1)*pitch,
            width:(c-start)*pitch, height:pitch, color:black});
          start=-1;
        }
      }
    }
    return {id, url:item.url, physicalMm:box/pageWidth*297, moduleMm:pitch/pageWidth*297};
  }
  global.CASE247_QR = { MARGIN, matrixFor, paint, get, deleteId, verifyAssociations, drawPdf };
})(window);
