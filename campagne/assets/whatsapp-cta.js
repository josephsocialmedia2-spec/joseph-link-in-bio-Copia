/* Joseph Digital Strategist — invito WhatsApp condiviso per landing.
   Riutilizza il link WhatsApp già presente nella pagina: nessun tracciamento o invio automatico. */
(() => {
  "use strict";
  if (document.querySelector("[data-jds-whatsapp-cta]")) return;
  const links = Array.from(document.querySelectorAll('a[href*="wa.me/"]'));
  const selected = links.find((a) => {
    try {
      const u = new URL(a.href, location.href);
      return (u.hostname === "wa.me" || u.hostname === "www.wa.me") &&
        /^\/\d{8,15}$/.test(u.pathname) && u.searchParams.has("text");
    } catch { return false; }
  }) || links.find((a) => {
    try {
      const u = new URL(a.href, location.href);
      return (u.hostname === "wa.me" || u.hostname === "www.wa.me") &&
        /^\/\d{8,15}$/.test(u.pathname);
    } catch { return false; }
  });
  if (!selected) return;

  const css = document.createElement("style");
  css.textContent = `
    .jds-wa-cta {
      position: fixed !important; inset: auto max(14px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) auto !important;
      z-index: 9998; display: inline-flex !important; align-items: center; justify-content: center;
      gap: 9px; max-width: calc(100vw - 28px); min-height: 54px;
      box-sizing: border-box; border: 2px solid rgba(255,255,255,.9) !important;
      border-radius: 999px !important; padding: 12px 18px !important;
      background: #087c3e !important; color: #ffffff !important;
      box-shadow: 0 5px 20px rgba(0,0,0,.28) !important;
      font: 800 15px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif !important;
      text-align: center; text-decoration: none !important;
      letter-spacing: 0 !important;
    }
    .jds-wa-cta:hover {background:#06632f !important; transform:translateY(-2px);}
    .jds-wa-cta:focus-visible {outline: 3px solid #ffca43 !important; outline-offset: 4px;}
    .jds-wa-arrow {display:inline-block; font-size:24px; line-height:1; font-weight:900; animation:jds-wa-arrow-pulse 2.4s ease-in-out infinite;}
    @keyframes jds-wa-arrow-pulse {
      0%, 60%, 100% {opacity:1; transform:translateX(0);}
      30% {opacity:.35; transform:translateX(5px);}
    }
    body.jds-wa-over-sticky .jds-wa-cta {bottom: max(84px, calc(env(safe-area-inset-bottom) + 80px)) !important;}
    @media (max-width: 420px) {
      .jds-wa-cta {font-size:14px !important; padding:11px 14px !important; min-height:52px;}
      .jds-wa-arrow {font-size:21px;}
    }
    @media (prefers-reduced-motion: reduce) {
      .jds-wa-arrow {animation:none !important;}
      .jds-wa-cta {transition:none !important;}
      .jds-wa-cta:hover {transform:none;}
    }
  `;
  document.head.appendChild(css);

  if (document.querySelector(".stickyContact")) document.body.classList.add("jds-wa-over-sticky");
  const button = document.createElement("a");
  button.dataset.jdsWhatsappCta = "true";
  button.className = "jds-wa-cta";
  button.href = selected.href;
  button.target = "_blank";
  button.rel = "noopener noreferrer";
  button.setAttribute("aria-label", "Contattami su WhatsApp, si apre WhatsApp");
  const arrow = document.createElement("span");
  arrow.className = "jds-wa-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "➜";
  const label = document.createElement("span");
  label.textContent = "Contattami su WhatsApp";
  button.append(arrow, label);
  document.body.appendChild(button);
})();
