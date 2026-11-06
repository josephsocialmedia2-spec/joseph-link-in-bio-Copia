'use strict';
const BASE='https://nqnmlsmeiynxbdojeyjt.supabase.co';
const KEY='sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu';
const CLIENT_SLUG='antica-cappella';
const $=id=>document.getElementById(id);
let session=null,client=null,offset=0,epoch=0;
const say=text=>$('message').textContent=text;
const node=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text??'';if(cls)el.className=cls;return el;};
const date=value=>value?new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(value)):'Mai verificato';
async function request(path,options={}){
 const isAuth=path.startsWith('/auth/');
 if(!isAuth&&!session)throw Error('Accedi per continuare.');
 if(!isAuth&&Date.now()>session.expires_at-60000){
  const refreshed=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
  session={...refreshed,expires_at:Date.now()+refreshed.expires_in*1000};
 }
 const res=await fetch(BASE+path,{...options,headers:{apikey:KEY,'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{}),...options.headers},cache:'no-store'});
 const result=await res.json().catch(()=>({}));
 if(res.status===402)throw Error('Servizio Supabase sospeso: quota di spazio superata. Il titolare deve ripristinare la disponibilità del progetto. Le connessioni esistenti sono conservate.');
 if(!res.ok)throw Error(result.error_description||result.message||result.error||'Richiesta non riuscita ('+res.status+')');
 return result;
}
function scope(){if(!client||client.slug!==CLIENT_SLUG)throw Error('Cliente non autorizzato in questa area.');return encodeURIComponent(client.id);}
async function oauth(route,body){return request('/functions/v1/f1-social-oauth/'+route,body?{method:'POST',body:JSON.stringify({...body,client_id:client.id})}:{});}
async function busy(button,fn){button.disabled=true;try{await fn();}catch(e){say(e.message);}finally{button.disabled=false;}}
function safeLink(label,url){try{const u=new URL(url);if(u.protocol!=='https:')return node('span',label);const a=node('a',label,'action secondary');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return node('span',label);}}
async function loadChannels(){
 const version=epoch;
 const result=await oauth('status?client_id='+scope());
 if(version!==epoch)return;
 $('channels').replaceChildren();
 for(const platform of ['facebook','instagram']){
  const row=result.channels.find(c=>c.platform===platform);
  const card=node('article',null,'card');card.append(node('h3',platform==='facebook'?'Facebook':'Instagram'));
  const linked=!!(row?.enabled&&row?.verified);
  card.append(node('span',row?.connection_status||'Non configurato',linked?'badge':'badge warning'));
  card.append(node('p',row?.account_name||'Antica Cappella'));
  card.append(node('p','Ultima verifica registrata: '+date(row?.last_verified_at)));
  if(row?.external_channel_id)card.append(node('p','ID canale: '+row.external_channel_id));
  const actions=node('div',null,'actions');
  if(row?.profile_url)actions.append(safeLink('Apri profilo',row.profile_url));
  if(row?.provider==='buffer'){
   card.append(node('p','Associazione Buffer originale conservata. Il badge non costituisce una verifica in tempo reale del token Buffer.'));
   actions.append(safeLink('Verifica in Buffer','https://publish.buffer.com/'));
  }else{
   if(!linked){const b=node('button','Collega '+(platform==='facebook'?'Facebook':'Instagram'));b.onclick=()=>busy(b,async()=>{const data=await oauth('authorize?client_id='+scope()+'&platform='+platform);const u=new URL(data.authorization_url);if(u.protocol!=='https:'||u.hostname!=='www.facebook.com')throw Error('Indirizzo di autorizzazione inatteso.');say('Apri Meta per autorizzare il canale, poi torna qui e aggiorna i dati.');actions.append(safeLink('Continua su Meta',u.href));});actions.append(b);}
   if(linked){const b=node('button','Verifica connessione');b.onclick=()=>busy(b,async()=>{await oauth('verify',{platform});await loadChannels();say('Verifica Meta completata.');});actions.append(b);}
   const candidates=row?.oauth_metadata?.meta_candidates||[];
   for(const candidate of candidates){if(platform!=='facebook'||String(candidate.account_id)!=='61550077453442')continue;const b=node('button','Seleziona Pagina Antica Cappella');b.onclick=()=>busy(b,async()=>{await oauth('meta/select',{platform,account_id:candidate.account_id});await loadChannels();say('Pagina selezionata.');});actions.append(b);}
  }
  card.append(actions);$('channels').append(card);
 }
}
async function loadCalendar(){
 const version=epoch;const month=$('month').value;if(!/^\d{4}-\d{2}$/.test(month))return;
 // Wider UTC range, then filter by Italian calendar month to include DST boundaries.
 const [y,m]=month.split('-').map(Number);const start=new Date(Date.UTC(y,m-1,0)).toISOString(),end=new Date(Date.UTC(y,m,2)).toISOString();
 let rows=[];for(let from=0;;from+=500){const page=await request('/rest/v1/f1_content_calendar?client_id=eq.'+scope()+'&platform=in.(facebook,instagram)&publication_at=gte.'+encodeURIComponent(start)+'&publication_at=lt.'+encodeURIComponent(end)+'&select=id,content_id,platform,publication_at,status,external_url&order=publication_at,id&limit=500&offset='+from);rows.push(...page);if(page.length<500)break;}
 if(version!==epoch)return;
 rows=rows.filter(r=>new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',timeZone:'Europe/Rome'}).format(new Date(r.publication_at))===month);
 const box=$('calendar');box.replaceChildren();if(!rows.length){box.append(node('p','Nessuna pubblicazione Facebook o Instagram registrata per questo mese.'));return;}
 const table=node('table');const head=node('tr');['Data e ora','Canale','Stato','Pubblicazione'].forEach(t=>head.append(node('th',t)));const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');for(const row of rows){const tr=node('tr');tr.append(node('td',date(row.publication_at)),node('td',row.platform),node('td',row.status));const td=node('td');if(row.external_url)td.append(safeLink('Apri',row.external_url));else td.textContent='—';tr.append(td);body.append(tr);}table.append(body);box.append(table);
}
async function loadItems(reset=false){
 const version=epoch;if(reset){offset=0;$('items').replaceChildren();}
 const rows=await request('/rest/v1/f1_content_items?client_id=eq.'+scope()+'&select=id,title,description,status,created_at&order=created_at.desc,id&limit=30&offset='+offset);
 if(version!==epoch)return;
 for(const row of rows){const card=node('article',null,'card');card.append(node('h3',row.title||'Contenuto'),node('span',row.status,'badge'),node('p',row.description||'','bodytext'),node('small',date(row.created_at)));$('items').append(card);}offset+=rows.length;$('more').hidden=rows.length<30;if(!offset)$('items').append(node('p','Nessun contenuto presente.'));
}
async function load(){const rows=await request('/rest/v1/f1_content_clients?slug=eq.'+CLIENT_SLUG+'&select=id,name,slug,auto_publish,automation_status&limit=2');if(rows.length!==1)throw Error('Antica Cappella non accessibile con questo account.');client=rows[0];$('login').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;$('program').textContent=client.auto_publish?'Automazione abilitata nel database':'Automazione disabilitata nel database';await Promise.all([loadChannels(),loadCalendar(),loadItems(true)]);say('Dati originali caricati. Nessuna pubblicazione o programmazione è stata modificata.');}
$('loginForm').onsubmit=async e=>{e.preventDefault();await busy(e.submitter,async()=>{const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('email').value.trim(),password:$('password').value})});$('password').value='';session={...s,expires_at:Date.now()+s.expires_in*1000};await load();});};
$('logout').onclick=()=>{epoch++;session=null;client=null;$('workspace').hidden=true;$('login').hidden=false;$('logout').hidden=true;$('channels').replaceChildren();$('items').replaceChildren();$('calendar').replaceChildren();say('Sessione chiusa su questo dispositivo.');};
$('reload').onclick=e=>busy(e.target,load);$('more').onclick=e=>busy(e.target,()=>loadItems());$('month').onchange=()=>loadCalendar().catch(e=>say(e.message));$('month').value=new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',timeZone:'Europe/Rome'}).format(new Date());
