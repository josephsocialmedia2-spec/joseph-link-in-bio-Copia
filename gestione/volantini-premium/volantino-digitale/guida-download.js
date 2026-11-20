/* CASE247 — Form guides: only the API can issue a download token. */
(() => {
  "use strict";
  const api = "https://nqnmlsmeiynxbdojeyjt.supabase.co/functions/v1/case247-guida-download";
  const $ = (id) => document.getElementById(id);
  const gate = $("guideGate");
  const open = $("guideOpen");
  const status = $("guideStatus");
  const counter = $("guideCount");
  const form = $("guideRequest");
  const submit = $("guideSubmit");
  const success = $("guideSuccess");
  const download = $("guideDownload");

  function updateCounter(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 12) return;
    counter.textContent = String(n);
    const copy = $("guideAvailabilityNote");
    if (copy) copy.textContent = n === 0
      ? "Nuove richieste terminate. Se sei già registrato puoi richiedere nuovamente il link."
      : n === 1 ? "È disponibile 1 copia." : "Sono disponibili " + n + " copie.";
  }
  async function refreshCounter() {
    try {
      const response = await fetch(api, {cache:"no-store",headers:{"Accept":"application/json"}});
      if (!response.ok) throw new Error("Contatore non disponibile");
      const data = await response.json();
      updateCounter(data.available);
    } catch (_) {
      counter.textContent = "—";
      $("guideAvailabilityNote").textContent = "Disponibilità temporaneamente non verificabile.";
    }
  }
  open.addEventListener("click", () => {
    gate.hidden = false;
    gate.scrollIntoView({behavior:"smooth",block:"start"});
    $("guideName").focus({preventScroll:true});
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!$("guidePrivacy").checked) {
      status.textContent = "Leggi e conferma l'informativa sul trattamento dati.";
      return;
    }
    status.textContent = "Registrazione della richiesta…";
    success.hidden = true;
    submit.disabled = true;
    const body = {
      name:$("guideName").value,
      email:$("guideEmail").value,
      phone:$("guidePhone").value,
      privacy:$("guidePrivacy").checked,
      marketing:$("guideMarketing").checked,
      website:$("guideWebsite").value
    };
    try {
      const response = await fetch(api, {
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        cache:"no-store",
        body:JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok || !data.success || !/^https:\/\//.test(data.downloadUrl || "")) {
        throw new Error(data.error || "Impossibile completare la richiesta.");
      }
      if (!data.downloadUrl.startsWith(api + "?token=")) throw new Error("Link ricevuto non valido.");
      updateCounter(data.available);
      download.href = data.downloadUrl;
      success.hidden = false;
      status.textContent = data.alreadyRegistered
        ? "Contatto già registrato: nuovo link valido per 24 ore."
        : "Richiesta registrata. La guida è pronta da scaricare.";
      download.focus();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Errore durante la registrazione.";
    } finally {
      submit.disabled = false;
      refreshCounter();
    }
  });
  refreshCounter();
})();
