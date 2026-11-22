/* Frontend del funnel Zero to Diamond: esclusivamente API sintetiche /__staging__.
 * Nessuna integrazione con CRM di produzione, Supabase, email, WhatsApp o social.
 */
(() => {
  'use strict';
  const API='/__staging__/api/';
  const byId=id=>document.getElementById(id);
  const statuses={
    NUOVO:'Nuovo',QUALIFICATO:'Qualificato',FOLLOW_UP:'Follow-up',
    APPUNTAMENTO:'Appuntamento',TRASFERITO:'Trasferito ad AGENTE TEST',
    CHIUSO:'Chiuso',NON_CONTATTARE:'Non contattare'
  };
  const metricTitles={
    requests:'Richieste TEST',qualified_current:'Qualificati attuali',
    followups_simulated:'Follow-up simulati',appointments_simulated:'Appuntamenti simulati',
    handoffs_simulated:'Handoff simulati',closed_simulated:'Processi chiusi',
    blocked_by_policy:'Operazioni bloccate',non_contactable:'Opposizioni',
    marketing_optins:'Permessi marketing TEST'
  };
  let snapshot={leads:[],events:[],kpi:{}},selectedId=null,working=false;
  function notify(message,level='ok'){
    const el=byId('feedback');el.textContent=message;el.dataset.level=level;
  }
  async function request(path,body){
    const opts={cache:'no-store'};
    if(body!==undefined){
      opts.method='POST';
      opts.headers={'Content-Type':'application/json','X-Staging-Lab':'synthetic-only'};
      opts.body=JSON.stringify(body);
    }
    const response=await fetch(API+path,opts);
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.message||'Errore del laboratorio');
    if(data.simulated===false)throw new Error('Risposta fuori dal perimetro sintetico');
    return data;
  }
  function text(tag,value,className){
    const node=document.createElement(tag);
    node.textContent=String(value??'');
    if(className)node.className=className;
    return node;
  }
  function renderKpis(){
    const parent=byId('kpis');parent.replaceChildren();
    for(const [key,title] of Object.entries(metricTitles)){
      const node=text('div','', 'kpi');
      node.append(text('span',title),text('b',snapshot.kpi[key]??0));
      parent.append(node);
    }
  }
  function choose(id){
    selectedId=id;
    renderLeads();
    renderSelection();
  }
  function renderLeads(){
    const parent=byId('leads');parent.replaceChildren();
    if(!snapshot.leads.length){parent.append(text('p','Nessun contatto TEST. Crea la prima richiesta sintetica.','muted'));return;}
    for(const lead of snapshot.leads){
      const wrap=text('div','', 'lead'+(selectedId===lead.id?' selected':''));
      const button=text('button','Seleziona '+lead.name, 'secondary');
      button.type='button';button.dataset.leadId=String(lead.id);
      button.addEventListener('click',()=>choose(lead.id));
      wrap.append(button,text('small',lead.email+' · '+lead.source+' · '+lead.scenario),
        text('span',statuses[lead.status]||lead.status,'pill'));
      const permissions=text('small',
        'Marketing: '+(lead.marketing_optin?'TEST sì':'TEST no')+
        ' · Handoff: '+(lead.transfer_optin?'TEST sì':'TEST no'));
      wrap.append(permissions);parent.append(wrap);
    }
  }
  function renderSelection(){
    const lead=snapshot.leads.find(x=>x.id===selectedId);
    const label=byId('selected');
    label.textContent=lead?lead.name+' — '+(statuses[lead.status]||lead.status):
      'Seleziona o crea un contatto TEST.';
    byId('selectedMarketing').checked=Boolean(lead?.marketing_optin);
    byId('selectedTransfer').checked=Boolean(lead?.transfer_optin);
    const allowed={
      qualify:['NUOVO'],followup:['QUALIFICATO','FOLLOW_UP'],
      appointment:['QUALIFICATO','FOLLOW_UP'],
      handoff:['QUALIFICATO','FOLLOW_UP','APPUNTAMENTO'],
      close:['TRASFERITO'],
      stop:['NUOVO','QUALIFICATO','FOLLOW_UP','APPUNTAMENTO','TRASFERITO']
    };
    for(const button of byId('leadActions').querySelectorAll('button')){
      button.disabled=working||!lead||!(allowed[button.dataset.action]||[]).includes(lead.status);
    }
    for(const id of ['selectedMarketing','selectedTransfer','updatePermissions']){
      byId(id).disabled=working||!lead||['CHIUSO','NON_CONTATTARE'].includes(lead.status);
    }
  }
  function renderEvents(){
    const parent=byId('events');parent.replaceChildren();
    if(!snapshot.events.length){parent.append(text('p','Nessun evento ancora registrato.','muted'));return;}
    for(const event of snapshot.events){
      parent.append(text('div',
        '#'+event.id+' · '+event.created_at+' · TEST '+(event.lead_id||'—')+
        ' · '+event.action+' · '+event.outcome+' · '+event.detail,'event'));
    }
  }
  function render(){
    renderKpis();renderLeads();renderSelection();renderEvents();
  }
  async function refresh(){
    const data=await request('state');
    if(data.mode!=='SYNTHETIC_ONLY'||data.external_deliveries!==0){
      throw new Error('Sorgente dati non sintetica: operazione interrotta');
    }
    snapshot=data;
    if(selectedId!==null&&!snapshot.leads.some(x=>x.id===selectedId))selectedId=null;
    render();
  }
  async function perform(action,body={}){
    if(working)return;
    const lead=snapshot.leads.find(x=>x.id===selectedId);
    if(!lead)throw new Error('Seleziona un contatto TEST');
    working=true;renderSelection();
    try{
      await request('leads/'+lead.id+'/'+action,body);
      await refresh();
      notify('Azione '+action+' registrata nel database sintetico. Nessuna comunicazione inviata.');
    }catch(error){
      await refresh();
      notify(error.message,'error');
    }finally{working=false;renderSelection();}
  }
  byId('createLead').addEventListener('submit',async e=>{
    e.preventDefault();
    if(working)return;working=true;
    try{
      const data=await request('requests',{
        source:byId('source').value,
        scenario:byId('scenario').value,
        marketing_optin:byId('marketing').checked,
        transfer_optin:byId('transfer').checked
      });
      selectedId=data.lead.id;
      await refresh();
      notify('Richiesta '+data.lead.name+' creata. I dati sono inventati e salvati solo nello staging.');
    }catch(error){notify(error.message,'error')}
    finally{working=false;renderSelection()}
  });
  for(const button of byId('leadActions').querySelectorAll('button')){
    button.addEventListener('click',()=>perform(button.dataset.action));
  }
  byId('updatePermissions').addEventListener('click',()=>perform('permissions',{
    marketing_optin:byId('selectedMarketing').checked,
    transfer_optin:byId('selectedTransfer').checked
  }));
  byId('reload').addEventListener('click',async()=>{
    try{await refresh();notify('Database sintetico ricaricato.')}catch(e){notify(e.message,'error')}
  });
  byId('reset').addEventListener('click',async()=>{
    if(!window.confirm('Azzerare esclusivamente i dati inventati del laboratorio?'))return;
    try{
      await request('reset',{confirm:'RESET_SYNTHETIC_ONLY'});
      selectedId=null;
      await refresh();
      notify('Dati di prova azzerati. Nessuna modifica a sistemi esterni.');
    }catch(e){notify(e.message,'error')}
  });
  refresh().then(()=>notify('CRM SQLite sintetico pronto. Nessuna integrazione di produzione attiva.'))
    .catch(e=>notify('Database di prova non disponibile: '+e.message,'error'));
})();
