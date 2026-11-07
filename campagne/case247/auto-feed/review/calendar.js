(async()=>{
 const section=document.createElement('section');section.id='calendario-30-giorni';section.className='note';
 const h=document.createElement('h2');h.textContent='Calendario 30 giorni · Privati e Aziende';section.append(h);
 const note=document.createElement('p');note.textContent='Bozze da revisionare: testi e immagini devono essere approvati prima dell’invio. Gli orari indicano una proposta, non una pubblicazione confermata. Le date scadute non vengono recuperate automaticamente.';section.append(note);
 document.querySelector('main').prepend(section);
 try{
  const manifest=await fetch('../../editorial-queue/manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()});
  const root=new URL('../../../../',location.href);
  for(const path of manifest.queues){
   const q=await fetch(new URL(path,root),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()});
   if(q.schema_version!==1)continue;
   const edit=document.createElement('a');edit.href='https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/edit/main/'+path;edit.textContent='Apri coda su GitHub per revisione autorizzata ↗';section.append(edit);
   for(const j of q.jobs.filter(j=>j.platform==='facebook')){
    const d=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p');
    summary.textContent=new Date(j.scheduled_at_local).toLocaleString('it-IT',{timeZone:'Europe/Rome'})+' · '+j.audience+' · '+j.title+' · '+(j.approved?'APPROVATO':'BOZZA');
    p.textContent=j.caption;p.style.whiteSpace='pre-wrap';d.append(summary,p);
    const state=document.createElement('p');state.textContent=j.media_jpeg?'Immagine: '+j.media_jpeg:'Immagine da associare e approvare · invio bloccato';d.append(state);section.append(d);
   }
  }
 }catch(_){note.textContent='Calendario non disponibile. Ricarica per riprovare.'}
})();
