(() => {
  'use strict';
  const root = document.getElementById('case247-territorio'); if (!root) return;
  const base = new URL('../', document.currentScript.src).href;
  const rows = root.querySelector('[data-town-rows]'), status = root.querySelector('[role=status]'), search = root.querySelector('input');
  let towns = [], drafts = [];
  const node = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  const label = value => ({DA_CREARE:'Da creare', DA_COLLEGARE:'Da collegare', COLLEGATO_E_VERIFICATO:'Collegato e verificato'}[value] || 'Da verificare');
  const complete = t => ['facebook','instagram'].every(k => t.channels[k].url && t.channels[k].status === 'COLLEGATO_E_VERIFICATO') && t.fb_ig_link?.status === 'COLLEGATO_E_VERIFICATO' && t.joseph_control?.status === 'COLLEGATO_E_VERIFICATO';
  function link(cell, href, text) {
    try { const u = new URL(href); if (u.protocol !== 'https:' || u.username || u.password) return; const a = node('a',text); a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';cell.append(a); } catch (_) {}
  }
  function render() {
    rows.replaceChildren();
    for (const t of towns.filter(t => t.name.toLocaleLowerCase('it').includes(search.value.toLocaleLowerCase('it')))) {
      const tr=node('tr'), name=node('td'), site=node('td');name.append(node('strong',t.name),node('br'),node('small',t.social_page_name));
      link(site,t.landing_url,'Apri landing ↗');tr.append(name,site);
      for (const k of ['facebook','instagram']) {
        const cell=node('td'), c=t.channels[k];if(c.url){link(cell,c.url,'Apri canale ↗');cell.append(node('br'));}cell.append(node('span',label(c.status)));tr.append(cell);
      }
      for (const k of ['fb_ig_link','joseph_control','metricool']) {const c=node('td',label(t[k]?.status));if(t[k]?.reason)c.title=t[k].reason;tr.append(c);}
      const contents=node('td'), count=drafts.filter(d=>d.town_id===t.id).length;
      link(contents,base+'campagne/case247/territorio/bozze.json',count+' bozze da revisionare');contents.append(node('small',' · Pubblicazione non attivata'));tr.append(contents);
      const state=node('td',complete(t)?'Collegato e verificato':'Da verificare');if(!complete(t))state.append(node('br'),node('small',t.blocker || 'Configurazione incompleta'));tr.append(state);rows.append(tr);
    }
    if(!rows.children.length){const tr=node('tr'),td=node('td','Nessun paese con questo nome');td.colSpan=9;tr.append(td);rows.append(tr);}
  }
  Promise.all(['config/case247-territorio.json','campagne/case247/territorio/bozze.json','immobili/catalogo.json'].map(p=>fetch(base+p,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}))).then(([config,queue,catalog])=>{
    towns=config.towns;drafts=queue.drafts||[];root.querySelector('[data-town-count]').textContent=towns.length;root.querySelector('[data-draft-count]').textContent=drafts.length;
    status.textContent=towns.filter(complete).length+' / '+towns.length+' terne sito–Facebook–Instagram verificate. Canali centrali separati dai territoriali. Ultimo catalogo riuscito: '+new Date(catalog.last_success_at).toLocaleString('it-IT',{timeZone:'Europe/Rome'})+'. Aggiornamento giornaliero previsto alle '+config.catalog_schedule+'. Nessuna pubblicazione territoriale attivata.';render();
  }).catch(()=>{status.textContent='Registro temporaneamente non disponibile. Ricarica la pagina.';});
  search.addEventListener('input',render);
})();
