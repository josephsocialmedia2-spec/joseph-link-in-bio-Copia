(async()=>{
 const panel=document.createElement('section');panel.className='case-hub';panel.setAttribute('aria-label','Pubblicazioni Privati e Aziende');
 const title=document.createElement('h2');title.textContent='Regia pubblicazioni · Privati e Aziende';panel.append(title);
 const body=document.createElement('div');body.textContent='Caricamento diagnosi…';panel.append(body);
 (document.querySelector('.hero')||document.querySelector('.topbar')).after(panel);
 const base='../campagne/case247/';
 const line=(label,value)=>{const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+': ';p.append(b,document.createTextNode(String(value)));body.append(p)};
 const link=(url,label)=>{const a=document.createElement('a');a.href=url;a.textContent=label;a.className='btn';body.append(a)};
 try{
  const get=async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
  const [manifest,s,ledger]=await Promise.all([get(base+'editorial-queue/manifest.json'),get(base+'auto-feed/b2b-status.json'),get(base+'auto-feed/publish-ledger-b2b.json')]);
  const queues=await Promise.all(manifest.queues.map(p=>get('../'+p)));
  const jobs=queues.flatMap(q=>q.jobs.map(j=>({...j,queue_enabled:q.meta_enabled===true&&q.no_automatic_meta_publish===false})));
  const records=ledger.records||{},values=Object.values(records),published=values.filter(r=>r.status==='PUBLISHED');
  body.textContent='';
  const fresh=Date.now()-Date.parse(s.checked_at_utc)<86400000;
  const identity=fresh&&s.authentication==='ACCOUNT_LINK_VERIFIED_PUBLISH_PERMISSIONS_UNTESTED';
  const pilot=published.some(r=>r.source==='meta_graph_api'&&r.permalink&&['facebook','instagram'].every(platform=>published.some(k=>k.source==='meta_graph_api'&&k.content_id===r.content_id&&k.platform===platform&&k.permalink&&k.target_id===(platform==='facebook'?'1402024242991896':'17841415827906266'))));
  const auto=identity&&s.schedule_requested===true&&pilot;
  const scheduled=jobs.filter(j=>j.approved===true&&j.queue_enabled&&!records[j.id]&&Date.parse(j.scheduled_at_local)>Date.now()).sort((a,b)=>Date.parse(a.scheduled_at_local)-Date.parse(b.scheduled_at_local));
  line('Facebook / Instagram',identity?'Identità e collegamento verificati nell’ultima diagnosi':'Collegamento non verificato attualmente');
  line('Autenticazione',s.authentication||'NON VERIFICATA');
  line('Ultima diagnosi',s.checked_at_utc+(fresh?'':' · OBSOLETA: non prova lo stato attuale'));
  line('Configurazione mancante',(s.missing_configuration||[]).join(', ')||'Nessuna segnalata');
  for(const audience of ['privati','aziende']){
   const j=jobs.filter(j=>j.audience===audience);line(audience==='privati'?'Privati':'Aziende',j.filter(j=>j.approved===true).length+' invii approvati · '+j.filter(j=>j.approved!==true).length+' invii in bozza');
  }
  line('Post verificati nel registro',published.length);
  line('Tentativi incerti / corrispondenze da esaminare',values.filter(r=>r.status!=='PUBLISHED').length);
  line('Automazione',auto&&scheduled.length?'Abilitata secondo diagnosi recente':'Sospesa o senza contenuti futuri approvati');
  line('Prossimo invio',auto&&scheduled[0]?scheduled[0].scheduled_at_local:'Nessuno confermato');
  line('Ultima pubblicazione registrata',published.map(r=>r.at_utc).filter(Boolean).sort().at(-1)||'Nessuna');
  for(const r of published)if(/^https:\/\/(www\.)?(facebook|instagram)\.com\//.test(r.permalink||''))link(r.permalink,r.content_id+' · '+r.platform+' ↗');
  link(base+'auto-feed/review/#calendario-30-giorni','Revisiona calendario di 30 giorni ↗');
  try{const audit=await get(base+'auto-feed/operational-audit.json');line('Landing territoriali',audit.territory.healthy_landings+' / '+audit.territory.total+' rispondono HTTP 200 · verifica '+audit.checked_at_utc);line('Profili territoriali',audit.territory.verified_pairs+' coppie verificate');line('CRM',audit.crm.status)}catch(_){line('Audit territoriale / CRM','Non disponibile')}
 }catch(e){body.textContent='Diagnosi non disponibile: '+e.message+'. Nessuna operatività confermata.'}
 const a=document.createElement('a');a.href='https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/workflows/case247-b2b-meta.yml';a.textContent='Apri GitHub Actions · Test / Pubblicazione ↗';a.className='btn';panel.append(a);
})();
