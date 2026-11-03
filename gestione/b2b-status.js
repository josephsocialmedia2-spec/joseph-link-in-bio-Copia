(async()=>{
 const panel=document.createElement('section');panel.className='case-hub';panel.setAttribute('aria-label','Pubblicazioni aziende');
 const title=document.createElement('h2');title.textContent='Pubblicazioni aziende · Facebook e Instagram';panel.append(title);
 const body=document.createElement('div');body.textContent='Caricamento stato verificabile…';panel.append(body);
 (document.querySelector('.hero')||document.querySelector('.topbar')).after(panel);
 const base='../campagne/case247/';
 try{
  const get=async p=>{const r=await fetch(base+p,{cache:'no-store'});if(!r.ok)throw Error('Stato non disponibile (HTTP '+r.status+')');return r.json()};
  const [q,s]=await Promise.all([get('editorial-queue/2026-11-01_2026-11-04/queue.json'),get('auto-feed/b2b-status.json')]);
  const jobs=q.jobs.filter(j=>j.approved===true&&j.audience==='aziende');
  const records=s.records||{};const published=jobs.filter(j=>records[j.id]?.status==='PUBLISHED');
  body.textContent='';
  const lines=[['Approvati',jobs.length],['Pubblicati verificati',published.length],['In attesa o bloccati',jobs.length-published.length],['Ultima diagnosi',s.checked_at_utc],['Autenticazione',s.authentication],['Configurazioni mancanti',(s.missing_configuration||[]).join(', ')||'Nessuna rilevata'],['Programmazione automatica','Non attiva: richiesto test reale verificato'],['Prossimo invio effettivo','Nessuno confermato']];
  for(const [label,value] of lines){const p=document.createElement('p');const b=document.createElement('strong');b.textContent=label+': ';p.append(b,document.createTextNode(String(value)));body.append(p)}
  for(const j of published){const r=records[j.id];if(!/^https:\/\/(www\.)?(facebook|instagram)\.com\//.test(r.permalink||''))continue;const a=document.createElement('a');a.href=r.permalink;a.textContent=j.id+' ↗';a.className='btn';body.append(a)}
 }catch(e){body.textContent=e.message+'. Nessuna pubblicazione confermata da questo pannello.'}
 const a=document.createElement('a');a.href='https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/workflows/case247-b2b-meta.yml';a.textContent='Simulazione / Pubblica ora su GitHub ↗';a.className='btn';panel.append(a);
})();
