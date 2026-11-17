/* Applicazione GitHub Pages senza backend. Codice annotato e modulare.
   Non interpreta un annuncio incompleto come automaticamente verificato. */
(function (global) {
  'use strict';
  const CFG=global.CASE247_CONFIG,Core=global.CASE247_CORE,QR=global.CASE247_QR,PDF=global.CASE247_PDF;
  const $=id=>document.getElementById(id);
  const KEY='case247-premium-studio-v2';
  const PROFILES=CFG.profiles;
  function activeProfile(){return PROFILES[model.profile]||PROFILES.joseph;}
  function whatsappFor(profile){return 'https://wa.me/39'+profile.phone+'?text='+encodeURIComponent(profile.whatsappText||'VENDO');}
  const blank=()=>Array.from({length:18},()=>null);
  const model={profile:'joseph',theme:'cobalto',properties:blank(),portrait:(CFG.portraitFallback||global.CASE247_DEFAULT_PORTRAIT),panorama:CFG.panoramaReal||CFG.panoramaFallback};
  let externalLeft=null,externalRight=null,externalLeftPreviewUrl=null,externalRightPreviewUrl=null,selected=-1,catalog=null,loading=false;
  const storedPortraits={joseph:null,cristian:null,ylenia:null};
  const portraitInputs={joseph:'portraitJosephInput',cristian:'portraitCristianInput',ylenia:'portraitYleniaInput'};
  const portraitStatuses={joseph:'portraitJosephStatus',cristian:'portraitCristianStatus',ylenia:'portraitYleniaStatus'};
  const photoStoreName='case247-referenti-foto-v1';
  function openPhotoDb(){
    return new Promise((resolve,reject)=>{
      if(!global.indexedDB)return reject(Error('IndexedDB non disponibile'));
      const req=global.indexedDB.open(photoStoreName,1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('portraits'))req.result.createObjectStore('portraits')};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error('Archivio foto non disponibile'));
    });
  }
  async function savePortrait(id,data){
    let db;
    try{
      db=await openPhotoDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('portraits','readwrite');
        tx.objectStore('portraits').put(data,id);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||Error('Salvataggio foto non riuscito'));
        tx.onabort=()=>reject(tx.error||Error('Salvataggio foto interrotto'));
      });
    }catch(err){
      try{global.localStorage.setItem(photoStoreName+'-'+id,data)}
      catch(e){throw Error('Memoria browser insufficiente per la fotografia: '+e.message)}
    }finally{if(db)db.close()}
    storedPortraits[id]=data;
  }
  async function loadPortrait(id){
    let data=null,db;
    try{
      db=await openPhotoDb();
      data=await new Promise((resolve,reject)=>{
        const tx=db.transaction('portraits','readonly'),req=tx.objectStore('portraits').get(id);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>reject(req.error||Error('Lettura foto non riuscita'));
      });
    }catch(_){/* IndexedDB non disponibile; usa localStorage. */}
    finally{if(db)db.close()}
    return data||global.localStorage.getItem(photoStoreName+'-'+id)||null;
  }
  function updatePortraitLabels(){
    for(const [id,target] of Object.entries(portraitStatuses)){
      $(target).textContent=storedPortraits[id]?'Foto '+PROFILES[id].name+' memorizzata in questo browser.':'Nessuna foto '+PROFILES[id].name+' memorizzata.';
    }
  }
  async function restorePortraits(){
    for(const id of Object.keys(portraitInputs)){
      try{
        const saved=await loadPortrait(id);
        if(saved)storedPortraits[id]=saved;
        else if(id==='joseph'&&model.portrait&&model.portrait.startsWith('data:image/'))await savePortrait('joseph',model.portrait);
      }catch(err){console.warn('Ripristino foto '+id+' non riuscito',err);setStatus('Impossibile ripristinare la foto '+PROFILES[id].name+'.','warn')}
    }
    updatePortraitLabels();render();
  }
  async function onPortraitChange(id,file){
    if(!file)return;
    const data=await loadPhoto(file,950);
    await savePortrait(id,data);
    updatePortraitLabels();render();
    setStatus('Foto di '+PROFILES[id].name+' memorizzata in questo browser e applicata al suo volantino.','good');
  }
  const NEARBY=[["avigliana"],["buttigliera alta","sant ambrogio di torino","villar dora","almese"],["caprie","rubiana","caselette","rosta","chiusa di san michele","vaie"],["rivoli","valgioie","sant antonino di susa","condove"]];
  const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it").replace(/[^a-z0-9]+/g," ").trim();
  const propertyEligible=x=>Core.canonicalUrl(x?.url)&&x.availability_status==="AVAILABLE"&&x.location_status==="VERIFICATO_FONTE"&&x.municipality&&x.image&&!/attivit|azienda|negozio|bar|tabacchi|ristorante|locale commerciale|magazzino|terreno|capannone|autorimessa/i.test(String(x.title||"")+" "+String(x.category||""));
  const priority=x=>{const name=fold(x.municipality);const i=NEARBY.findIndex(group=>group.includes(name));return i<0?99:i;};
  const eligibleListings=items=>{
    const eligible=items.filter(propertyEligible),groups=new Map();
    for(const listing of eligible){
      const tier=priority(listing),key=tier+"|"+fold(listing.municipality);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(listing);
    }
    for(const listings of groups.values())listings.sort((a,b)=>fold(a.title).localeCompare(fold(b.title),"it"));
    const result=[],tiers=[...new Set([...groups.keys()].map(x=>Number(x.split("|")[0])))].sort((a,b)=>a-b);
    for(const tier of tiers){
      const keys=[...groups.keys()].filter(k=>k.startsWith(tier+"|")).sort((a,b)=>a.localeCompare(b,"it"));
      while(keys.some(k=>groups.get(k).length))for(const key of keys){const next=groups.get(key).shift();if(next)result.push(next);}
    }
    return result;
  };
  const fromCatalog=x=>Core.makeEntry({title:x.title,city:x.municipality,price:x.price,contract:x.contract,img:x.image,url:x.url,energy:x.energy_class||x.energyClass||x.energy,ep:x.epgl_nren||x.epgl||x.ep,envelope:x.epe_invol||x.envelope,apeStatus:x.ape_status||'DA_VERIFICARE',apeExemptionReason:x.ape_exemption_reason||'',apeExemptionVerified:false});
  try{
    const old=JSON.parse(localStorage.getItem(KEY)||'null');
    if(old&&Array.isArray(old.properties)&&old.properties.length===18){
      model.theme=CFG.templates.some(t=>t.id===old.theme)?old.theme:'cobalto';
      model.profile=PROFILES[old.profile]?old.profile:'joseph';
      model.properties=old.properties.map(p=>p?Core.makeEntry(p):null);
      // Immagini utente base64 recuperabili dal browser se disponibili.
      model.portrait=old.portrait||model.portrait;model.panorama=old.panorama||model.panorama;
    }
  }catch(e){console.warn('Caricamento progetto non riuscito:',e);}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function setStatus(msg,type=''){$('status').textContent=msg;$('status').className='message '+type;}
  const Drive=global.CASE247_DRIVE;
  let customerDriveLink='';
  function driveStatus(message,type=''){
    $('driveStatus').textContent=message;
    $('driveStatus').className='message '+type;
  }
  function clearDriveLink(){
    customerDriveLink='';
    $('driveResult').hidden=true;
    $('driveCustomerLink').removeAttribute('href');
    $('driveLinkValue').value='';
  }
  function showDriveLink(url,previous=false){
    if(!/^https:\/\/(?:drive|docs)\.google\.com\//.test(String(url)))throw Error('Link di Google Drive non valido');
    customerDriveLink=url;
    $('driveCustomerLink').href=url;
    $('driveLinkValue').value=url;
    $('driveLinkTitle').textContent=previous?
      'Ultimo PDF pubblicato · verifica che corrisponda al volantino da inviare':
      'PDF definitivo pubblicato · link cliente';
    $('driveResult').hidden=false;
    driveStatus(previous?
      'Ultimo link verificato nuovamente su Drive. Potrebbe riferirsi a una versione precedente.':
      'PDF definitivo caricato e accesso pubblico in sola lettura verificato. Link cliente disponibile.','good');
  }
  function initDrive(){
    $('googleOAuthClientId').value=Drive?.getConfiguredId()||'';
    $('connectDrive').onclick=async()=>{
      try{
        const expected=$('googleOAuthClientId').value.trim();
        if(!Drive.validClientId(expected)||expected!==Drive.getConfiguredId())throw Error('Client ID CASE247 non configurato correttamente. Aggiorna la pagina.');
        await Drive.authorize();
        clearDriveLink();
        try{
          const previous=await Drive.restorePublishedLink();
          if(previous)showDriveLink(previous.url,true);
          else driveStatus('Drive autorizzato. Nessun PDF definitivo precedente da recuperare: pubblica un PDF verificato per creare il link cliente.','good');
        }catch(error){
          driveStatus('Drive autorizzato, ma il vecchio link non è stato riconfermato: '+error.message+' Pubblica una nuova versione verificata.','warn');
        }
      }catch(error){driveStatus(error.message,'warn')}
    };
    $('copyDriveLink').onclick=async()=>{
      if(!customerDriveLink)return;
      let copied=false;
      try{
        if(navigator.clipboard?.writeText){
          await navigator.clipboard.writeText(customerDriveLink);
          copied=true;
        }
      }catch(_){}
      if(!copied){
        const field=$('driveLinkValue');
        field.focus();
        field.select();
        try{copied=Boolean(document.execCommand?.('copy'));}catch(_){}
      }
      driveStatus(copied?
        'Link cliente copiato. Puoi incollarlo su WhatsApp o email.':
        'Seleziona il link nel campo qui sotto e copialo manualmente.',''+(copied?'good':'warn'));
    };
    $('whatsappDriveLink').onclick=()=>{
      if(!customerDriveLink)return;
      const message='Immobiliare La Sacra · Consulta il volantino immobili in evidenza: '+customerDriveLink;
      window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
    };
  }

  function save(){try{localStorage.setItem(KEY,JSON.stringify(model));}catch(e){setStatus('Memoria browser piena: esporta il progetto come JSON.','warn');}}
  function resizePreview(){
    const viewport=$('previewViewport'),available=Math.max(100,viewport.clientWidth-22);
    const scale=Math.min(1.3,available/1122);
    $('flyer').style.transform=`scale(${scale})`;
    $('previewSizer').style.width=`${1122*scale}px`;$('previewSizer').style.height=`${794*scale}px`;
  }
  function showStaff(){
    for(const button of document.querySelectorAll('#staffPicker [data-staff]')){
      button.setAttribute('aria-pressed',String(button.dataset.staff===model.profile));
      button.onclick=()=>{model.profile=button.dataset.staff;save();render();setStatus('Referente selezionato: '+activeProfile().name+'. Stessi 18 immobili, contatto e QR dedicati.','good');};
    }
  }
  function showThemes(){
    $('templatePicker').replaceChildren();
    for(const theme of CFG.templates){
      const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(theme.id===model.theme));
      const color=theme.id==='gold'||theme.id==='midnight'?['#06142a','#183554']:theme.id==='editorial'?['#cceaff','#fff']:['#073c78','#dff5ff'];
      b.innerHTML=`<span class="template-swatch" style="--s1:${color[0]};--s2:${color[1]}"></span><span><b>${esc(theme.name)}</b><small>${esc(theme.desc)}</small></span>`;
      b.onclick=()=>{model.theme=theme.id;save();showThemes();render();};
      $('templatePicker').append(b);
    }
  }
  function setImageSrc(img,url,onFallback){
    // L'evento Image.onload verifica che sia arrivata davvero un'immagine decodificabile.
    const applyFallback=()=>{
      if(img.dataset.fallback==='1')return;
      img.dataset.fallback='1';img.removeAttribute('crossorigin');
      img.src=CFG.imageFallback;if(onFallback)onFallback();
    };
    img.crossOrigin='anonymous';
    img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight)applyFallback();else img.dataset.loaded='1';};
    img.onerror=applyFallback;
    img.src=url||CFG.imageFallback;
  }
  function makeCard(p,i){
    const card=document.createElement('article');card.className='card'+(!p?.title?' empty':'');card.tabIndex=0;
    card.title='Apri la scheda per modificarne i dati';
    card.setAttribute('aria-label',`Modifica scheda ${i+1}`);
    card.dataset.slot=String(i);
    card.onclick=()=>openDialog(i);card.onkeydown=e=>{if(e.key==='Enter')openDialog(i)};
    card.draggable=true;
    card.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(i))};
    card.ondragover=e=>e.preventDefault();
    card.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));
      if(Number.isInteger(from)&&from>=0&&from<18){[model.properties[from],model.properties[i]]=[model.properties[i],model.properties[from]];save();render();}}
    if(!p?.title){card.innerHTML=`<b>+</b><strong>Immobile ${String(i+1).padStart(2,'0')}</strong><span>Da inserire</span>`;return card;}
    const photo=document.createElement('img');photo.className='property-photo';photo.alt=`Fotografia immobile: ${p.title}`;
    setImageSrc(photo,p.img,()=>{
      card.classList.add('has-fallback');
      const tag=document.createElement('div');tag.className='photo-fallback-label';tag.textContent='FOTO DA VERIFICARE';card.append(tag);
      showPreflight();
    });
    card.append(photo);
    function put(cls,text){const el=document.createElement('div');el.className=cls;el.textContent=text;card.append(el);return el;}
    put('property-title',p.title);
    put('property-city',p.city||'Località da verificare');
    put('price-badge'+(p.price===null?' is-unknown':''),Core.formatPrice(p.price));
    const energy=put('energy energy-'+(p.apeStatus==='PRESENTE'&&p.energy?p.energy:'unknown').toLowerCase().replace(/\d/g,''),'');
    const cl=document.createElement('b');cl.className='class';
    cl.textContent=p.apeStatus==='PRESENTE'?'Classe '+(p.energy||'da verificare'):Core.apeLabel(p);
    const ep=document.createElement('span');
    ep.textContent=p.apeStatus==='PRESENTE'?'EPgl,nren '+(p.ep||'da verificare')+(p.envelope?' · Invol. '+p.envelope:''):p.apeStatus==='ESENTE'?'Esenzione soggetta a verifica':'Nessun indice energetico pubblicabile';
    energy.append(cl,document.createElement('br'),ep);
    const qrBox=document.createElement('div');qrBox.className='qr-box';qrBox.dataset.qrId=`listing-${i}`;
    qrBox.title='QR: '+(p.url||'URL da inserire');card.append(qrBox);
    if(p.url){try{QR.paint(qrBox,`listing-${i}`,p.url);}catch(e){qrBox.textContent='QR ?';}}
    else QR.deleteId(`listing-${i}`);
    return card;
  }
  function showPreflight(){
    const issues=Core.checkSheet(model.properties);
    if(!catalog)issues.push("Catalogo ufficiale non verificato in questa sessione");
    else model.properties.forEach((p,i)=>{if(p?.title&&!eligibleListings(catalog).some(x=>Core.canonicalUrl(x.url)===p.url))issues.push(`Scheda ${i+1}: annuncio non confermato nel catalogo ufficiale`);});
    document.querySelectorAll('.card.has-fallback').forEach(card=>issues.push(`Scheda ${Number(card.dataset.slot)+1}: foto non caricabile`));
    if(CFG.panoramaReal===''&&model.panorama===CFG.panoramaFallback)issues.push('Panorama illustrativo: caricare fotografia reale prima della diffusione');
    const target=$('preflight');
    const apeInProgress=model.properties.filter(p=>p?.apeStatus==='IN_CORSO').length;
    const apeExempt=model.properties.filter(p=>p?.apeStatus==='ESENTE').length;
    const categories={ape:[],photos:[],availability:[],other:[]};
    const byCard=new Map(),general=[];
    for(const issue of issues){
      if(/APE|energetic|EPgl|involucro|esenzione/i.test(issue))categories.ape.push(issue);
      else if(/foto|fotograf|panorama|immagin/i.test(issue))categories.photos.push(issue);
      else if(/disponibilit|prezzo|annuncio|catalogo|URL|titolo|localit/i.test(issue))categories.availability.push(issue);
      else categories.other.push(issue);
      const match=issue.match(/^Scheda (\d+): /);
      const index=match?Number(match[1])-1:-1;
      if(index>=0&&index<18){
        if(!byCard.has(index))byCard.set(index,[]);
        byCard.get(index).push(issue.replace(/^Scheda \d+: /,''));
      }else general.push(issue);
    }
    const summary=document.createElement('strong');
    summary.textContent=model.properties.filter(p=>p?.title).length+'/18 annunci · '+issues.length+' verifiche aperte';
    const explanation=document.createElement('p');
    explanation.textContent='Energia/APE: '+categories.ape.length+' · Foto: '+categories.photos.length+' · Dati e disponibilità: '+categories.availability.length+' · Altri: '+categories.other.length+'. APE in redazione: '+apeInProgress+' · Esenzioni: '+apeExempt+'. Le bozze private restano disponibili.';
    target.replaceChildren(summary,explanation);
    if(issues.length){
      const details=document.createElement('details');
      details.id='preflightDetails';
      details.open=target.dataset.expanded==='true';
      details.addEventListener('toggle',()=>{target.dataset.expanded=String(details.open)});
      const heading=document.createElement('summary');
      heading.textContent='Mostra tutte le '+issues.length+' verifiche e apri le schede da correggere';
      details.append(heading);
      if(general.length){
        const list=document.createElement('ul');
        for(const issue of general){const li=document.createElement('li');li.textContent=issue;list.append(li);}
        details.append(list);
      }
      for(const [index,items] of [...byCard.entries()].sort((a,b)=>a[0]-b[0])){
        const section=document.createElement('div');
        section.className='preflight-item';
        const open=document.createElement('button');
        open.type='button';
        open.className='preflight-open';
        open.textContent='Modifica scheda '+(index+1)+' · '+(model.properties[index]?.title||'Immobile da completare');
        open.onclick=()=>openDialog(index);
        const list=document.createElement('ul');
        for(const issue of items){const li=document.createElement('li');li.textContent=issue;list.append(li);}
        section.append(open,list);details.append(section);
      }
      target.append(details);
    }else{
      const ok=document.createElement('p');ok.textContent='Nessuna verifica aperta. Controllare comunque l’anteprima prima di pubblicare.';target.append(ok);
    }
    return issues;
  }
  function render(){
    const staff=activeProfile();
    $('flyer').className=`theme-${model.theme} profile-${staff.brand}`;
    $('templateName').textContent=(CFG.templates.find(t=>t.id===model.theme)?.name||model.theme)+' · '+staff.name;
    showStaff();
    const logo=$('agencyLogo'),footerLogo=$('footerAgencyLogo');
    const laSacraLogo=global.CASE247_LA_SACRA_LOGO||CFG.agencyLogo;
    if(logo.src!==laSacraLogo)logo.src=laSacraLogo;
    if(footerLogo.src!==laSacraLogo)footerLogo.src=laSacraLogo;
    $('portraitSign').innerHTML=esc(staff.name)+'<small>'+esc(staff.role)+'</small>';
    $('staffFooterName').textContent=staff.name+' · '+staff.role;
    $('staffFooterPartner').textContent='Immobiliare La Sacra · '+(staff.id==='joseph'?'comunicazione e promozione immobiliare':'servizi immobiliari');
    $('flyer').querySelector('.brand-partner').textContent='Immobili e opportunità · Immobiliare La Sacra';
    $('staffCta').textContent='Contatta '+staff.name+' su WhatsApp';
    $('staffPhone').textContent=staff.displayPhone;
    $('staffHint').textContent='Foto di '+staff.name+(storedPortraits[staff.id]?' memorizzata':' da caricare')+' · WhatsApp '+staff.displayPhone;
    const portrait=$('portrait'),footerPortrait=$('footerPortrait');
    const photo=storedPortraits[staff.id]||(staff.id==='joseph'?model.portrait||CFG.portraitFallback:null);
    $('flyer').classList.toggle('has-staff-photo',!!photo);
    const portraitError=()=>{
      portrait.removeAttribute('src');
      if(footerPortrait)footerPortrait.removeAttribute('src');
      $('flyer').classList.remove('has-staff-photo');
      setStatus('La fotografia di '+staff.name+' non è decodificabile. Sostituiscila prima di esportare.','warn');
    };
    portrait.onerror=portraitError;
    if(footerPortrait)footerPortrait.onerror=portraitError;
    if(photo){
      portrait.src=photo;
      if(footerPortrait)footerPortrait.src=photo;
    }else{
      portrait.removeAttribute('src');
      if(footerPortrait)footerPortrait.removeAttribute('src');
    }
    $('heroPanorama').style.backgroundImage=`linear-gradient(90deg, rgba(0,33,70,.18), rgba(0,41,78,.03)), url(${JSON.stringify(model.panorama)})`;
    const grid=$('listingGrid');grid.replaceChildren();
    for(let i=0;i<18;i++)grid.append(makeCard(model.properties[i],i));
    const wa=$('waQr');QR.paint(wa,'whatsapp',whatsappFor(staff));
    showPreflight();resizePreview();
  }
  async function loadCatalog(force=false){
    if(catalog&&!force)return catalog;
    const r=await fetch(CFG.catalogPath,{cache:'no-store'});
    if(!r.ok)throw Error('Catalogo La Sacra non raggiungibile (HTTP '+r.status+')');
    const data=await r.json();
    if(!Array.isArray(data.items))throw Error('Formato catalogo non riconosciuto');
    catalog=data.items;
    return catalog;
  }
  async function readUrl(url){
    const products=await loadCatalog().catch(()=>[]);
    const found=products.find(x=>Core.canonicalUrl(x.url)===url);
    if(found&&propertyEligible(found))return fromCatalog(found);
    throw Error('Annuncio non presente tra gli immobili verificati e disponibili nel catalogo La Sacra: '+url);

  }
  function firstFree(){return model.properties.findIndex(x=>!x?.title)}
  async function bulkImport(urls){
    let added=0,invalid=0,dups=0;
    for(const candidate of urls){
      const url=Core.canonicalUrl(candidate);
      if(!url){invalid++;continue;}
      if(model.properties.some(p=>p?.url===url)){dups++;continue;}
      const index=firstFree();if(index<0)break;
      try{model.properties[index]=await readUrl(url);added++;}catch(e){invalid++;console.warn(e.message);}
    }
    save();render();setStatus(`Importazione: ${added} inseriti · ${invalid} URL non validi · ${dups} duplicati. Verifica i campi incompleti.`,added?'good':'warn');
  }
  async function loadPhoto(file,maxWidth=1400){
    if(!file||!file.type.startsWith('image/'))throw Error('Serve un file immagine');
    const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
    const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=raw});
    const scale=Math.min(1,maxWidth/im.width),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(im.width*scale));canvas.height=Math.max(1,Math.round(im.height*scale));
    canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);
    // Il PNG mantiene il canale alpha: supporta correttamente i ritratti scontornati.
    return canvas.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',.86);
  }
  function openDialog(index){
    selected=index;const p=model.properties[index]||Core.makeEntry();
    $('dialogIndex').textContent=index+1;
    for(const [id,k] of Object.entries({fieldTitle:'title',fieldCity:'city',fieldPrice:'price',fieldEnergy:'energy',fieldEp:'ep',
      fieldEnvelope:'envelope',fieldUrl:'url',fieldContract:'contract'}))$(id).value=p[k]??'';
    $('fieldApeStatus').value=p.apeStatus||'DA_VERIFICARE';
    $('fieldApeExemptionReason').value=p.apeExemptionReason||'';
    $('fieldApeExemptionVerified').checked=p.apeExemptionVerified===true;
    $('fieldVerified').checked=!!p.checked;$('fieldPhoto').value='';$('dialogError').textContent='';$('listingDialog').showModal();
  }
  function readEditor(){
    const old=model.properties[selected]||{};
    return Core.makeEntry({title:$('fieldTitle').value,city:$('fieldCity').value,price:$('fieldPrice').value,
      energy:$('fieldEnergy').value,ep:$('fieldEp').value,envelope:$('fieldEnvelope').value,
      apeStatus:$('fieldApeStatus').value,apeExemptionReason:$('fieldApeExemptionReason').value,
      apeExemptionVerified:$('fieldApeExemptionVerified').checked,
      url:$('fieldUrl').value,contract:$('fieldContract').value,checked:$('fieldVerified').checked,img:old.img||''});
  }
  async function onEditorSubmit(event){
    event.preventDefault();const p=readEditor();
    if(!p.title||!p.url){$('dialogError').textContent='Titolo e URL La Sacra diretto sono obbligatori.';return;}
    if(model.properties.some((x,i)=>i!==selected&&x?.url===p.url)){$('dialogError').textContent='Annuncio già presente nella griglia.';return;}
    if(p.apeStatus==='ESENTE'&&p.apeExemptionVerified&&!p.apeExemptionReason){
      $('dialogError').textContent='Specifica il motivo dell’esenzione APE prima di validarla.';return;
    }
    const photo=$('fieldPhoto').files[0];if(photo)p.img=await loadPhoto(photo,900);
    model.properties[selected]=p;save();$('listingDialog').close();render();
  }
  function jsonDownload(data,name){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),12000);
  }
  async function exportPdf(definitive=false){
    const draftToDrive=definitive==='draft';
    if(loading)return;loading=true;$('exportPdf').disabled=true;$('exportFinalPdf').disabled=true;$('uploadDraftDrive').disabled=true;setStatus(definitive===true?'Verifica finale prima della generazione...':draftToDrive?'Preparazione BOZZA privata per Google Drive...':'Preparazione PDF per stampa di prova...');
    if(Boolean(externalLeft)!==Boolean(externalRight)){setStatus('Carica ENTRAMBI i volantini A5 prima di esportare il fronte.','warn');loading=false;$('exportPdf').disabled=false;$('exportFinalPdf').disabled=false;$('uploadDraftDrive').disabled=false;return;}
    try{
      if(definitive===true&&(!externalLeft||!externalRight))throw Error('PDF definitivo fronte/retro: carica entrambi gli A5 esterni prima di pubblicare il link cliente.');
      await loadCatalog(true);
      const issues=showPreflight();
      if(model.properties.some(x=>!x?.title)||model.properties.some(x=>!x?.url))throw Error('Per creare 19 QR occorrono 18 schede con URL diretti.');
      const invalid=model.properties.filter(x=>!eligibleListings(catalog).some(y=>Core.canonicalUrl(y.url)===x.url));
      if(invalid.length)throw Error(invalid.length+" annunci non verificati nel catalogo ufficiale: esportazione bloccata.");
      const qrProblems=QR.verifyAssociations(model.properties,whatsappFor(activeProfile()));
      if(qrProblems.length)throw Error(qrProblems.join(' · '));
      if((definitive===true||draftToDrive)&&!Drive?.isConnected())throw Error('Google Drive non autorizzato: premi «Autorizza Google Drive» prima di salvare.');
      const proof=issues.length>0;
      if(proof&&definitive===true){$('preflight').dataset.expanded='true';showPreflight();$('preflight').scrollIntoView({behavior:'smooth',block:'start'});throw Error(`Pubblicazione sospesa: ${issues.length} verifiche aperte. Apri «Mostra tutte le verifiche» qui sotto e modifica le schede indicate. Puoi salvare una BOZZA privata su Drive.`);}
      const result=await PDF.exportPdf({flyer:$('flyer'),properties:model.properties,externalLeft,externalRight,
        externalLeftPage:Number($('outerLeftPage').value)||1,externalRightPage:Number($('outerRightPage').value)||1,watermark:definitive!==true,whatsappUrl:whatsappFor(activeProfile()),filename:(definitive===true?'DEFINITIVO':draftToDrive?'BOZZA_DRIVE_PRIVATA':'BOZZA_STAMPA')+'_Volantino_A4_'+activeProfile().name+'.pdf',
        autoDownload:!draftToDrive&&definitive!==true});
      const q=Math.round(result.minModuleMm*100)/100;
      if(draftToDrive){
        clearDriveLink();
        driveStatus('Salvataggio della BOZZA PRIVATA nella cartella VOLANTINO in corso…');
        const draft=await Drive.uploadPrivateDraft(result.bytes,'BOZZA_NON_DISTRIBUIRE_Immobiliare_La_Sacra_'+activeProfile().name+'_'+new Date().toISOString().slice(0,10)+'.pdf');
        driveStatus('BOZZA PRIVATA salvata nella cartella VOLANTINO. Nessun link cliente creato.','good');
        setStatus('BOZZA caricata su Google Drive (privata), '+result.pages+' pagine, '+issues.length+' verifiche aperte. Non distribuire ai clienti.','good');
      }else if(definitive===true){
        clearDriveLink();
        driveStatus('PDF validato. Caricamento su Google Drive in corso…');
        try{
          const uploaded=await Drive.uploadVerifiedPdf(result.bytes,'Immobiliare_La_Sacra_Immobili_in_evidenza_'+activeProfile().name+'_'+new Date().toISOString().slice(0,10)+'.pdf');
          showDriveLink(uploaded.url);
          setStatus('PDF definitivo pubblicato su Drive: link cliente verificato, solo lettura. '+result.pages+' pagine e '+result.qrCount+' QR.','good');
        }catch(error){
          driveStatus('Caricamento o condivisione Drive non completati: '+error.message,'warn');
          setStatus('Il PDF è stato generato, ma NON è disponibile un link cliente verificato. '+error.message,'warn');
        }
      }else{
        setStatus(`PDF di prova scaricato: ${result.pages} pagine, ${result.qrCount} QR. ${result.missingImages?result.missingImages+' immagini omesse. ':''}BOZZA — NON DISTRIBUIRE. Nessuna condivisione Drive.`,'good');
      }
    }catch(e){setStatus('Esportazione interrotta: '+e.message,'warn');console.error(e);}finally{loading=false;$('exportPdf').disabled=false;$('exportFinalPdf').disabled=false;$('uploadDraftDrive').disabled=false;}
  }
  
  function downloadBlob(blob,name){
    const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);
  }
  async function exportAll(){
    if(loading)return;loading=true;
    const buttons=[$('exportPdf'),$('generateAll')];
    if(Boolean(externalLeft)!==Boolean(externalRight)){setStatus('Carica ENTRAMBI i volantini A5 prima di esportare il fronte.','warn');loading=false;return;}buttons.forEach(b=>b.disabled=true);
    const saved=model.profile;
    try{
      if(!window.JSZip)throw Error('Libreria ZIP non disponibile: verifica la connessione.');
      await loadCatalog(true);
      const issues=showPreflight();
      if(model.properties.some(x=>x?.title&&!eligibleListings(catalog).some(y=>Core.canonicalUrl(y.url)===x.url)))throw Error('Lo ZIP non può includere annunci assenti o non verificati nel catalogo ufficiale.');
      if(model.properties.some(p=>!p?.title||!p?.url))throw Error('Servono 18 annunci con URL validi, uno per scheda.');
      if(issues.length&&!confirm('Sono aperti '+issues.length+' controlli. Generare solo tre bozze con filigrana NON DISTRIBUIRE?'))return;
      const zip=new JSZip();
      const summary=[];
      for(const id of ['joseph','cristian','ylenia']){
        model.profile=id;render();
        // Un frame garantisce che il motore PDF catturi il modello aggiornato, non quello precedente.
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const who=activeProfile(),number=whatsappFor(who);
        const errors=QR.verifyAssociations(model.properties,number);
        if(errors.length)throw Error('QR '+who.name+': '+errors.join(', '));
        setStatus('Genero volantino di '+who.name+'…');
        const result=await PDF.exportPdf({flyer:$('flyer'),properties:model.properties,whatsappUrl:number,
          externalLeft,externalRight,externalLeftPage:Number($('outerLeftPage').value)||1,externalRightPage:Number($('outerRightPage').value)||1,watermark:true,
          autoDownload:false,filename:'Volantino_'+who.name+'.pdf'});
        if(result.qrCount!==19)throw Error('QR incompleti per '+who.name);
        zip.file('Volantino_'+who.name+'_A4.pdf',result.bytes);
        summary.push(who.name+' ('+result.qrCount+' QR)');
      }
      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
      downloadBlob(blob,'Volantini_A4_Joseph_Cristian_Ylenia.zip');
      setStatus('ZIP creato: '+summary.join(' · ')+'. '+(issues.length?'BOZZE: verificare dati e APE prima della distribuzione.':'Verificare scansione QR e stampa al 100%.'),'good');
    }catch(e){setStatus('Generazione dei 3 volantini interrotta: '+e.message,'warn');console.error(e);}
    finally{model.profile=saved;render();loading=false;buttons.forEach(b=>b.disabled=false);}
  }

  function syncCatalog(){
    return loadCatalog(true).then(items=>{
      const eligible=eligibleListings(items),urls=new Set(eligible.map(x=>Core.canonicalUrl(x.url)));
      let removed=0;
      model.properties=model.properties.map(p=>{if(!p?.title)return null;if(!urls.has(Core.canonicalUrl(p.url))){removed++;return null;}return p;});
      if(removed)save();render();
      $("catalogAudit").textContent=eligible.length+" annunci immobiliari idonei in catalogo · "+removed+" schede senza riscontro rimosse dalla selezione · priorità Avigliana e dintorni. Presenza online dei singoli URL da confermare prima della distribuzione.";
      return eligible;
    }).catch(e=>{$("catalogAudit").textContent="Impossibile verificare catalogo: "+e.message+". Stampa bloccata finché non torna disponibile.";setStatus("Catalogo non disponibile: non considerare verificati gli annunci.","warn");});
  }
  function previewA5(side){
    const left=side==='Left',file=left?externalLeft:externalRight;
    const target=$(left?'outerLeftPreview':'outerRightPreview');
    const oldUrl=left?externalLeftPreviewUrl:externalRightPreviewUrl;
    if(oldUrl)URL.revokeObjectURL(oldUrl);
    if(left)externalLeftPreviewUrl=null;else externalRightPreviewUrl=null;
    target.replaceChildren();
    if(!file){
      const p=document.createElement('p');p.textContent='Carica A5 '+(left?'SINISTRA':'DESTRA');target.append(p);return;
    }
    if(!['application/pdf','image/png','image/jpeg'].includes(file.type)){
      const p=document.createElement('p');p.textContent='Formato non valido: usa PDF, PNG o JPG';target.append(p);return;
    }
    const url=URL.createObjectURL(file);
    if(left)externalLeftPreviewUrl=url;else externalRightPreviewUrl=url;
    const view=document.createElement(file.type==='application/pdf'?'iframe':'img');
    view.className='outer-a5-media';
    view.setAttribute('aria-label','Volantino A5 '+(left?'sinistra':'destra'));
    if(view.tagName==='IMG')view.alt='Volantino A5 '+(left?'sinistra':'destra');
    const page=Number($(left?'outerLeftPage':'outerRightPage').value)||1;
    view.src=url+(file.type==='application/pdf'?'#page='+page+'&view=FitH':'');
    target.append(view);
  }
  function previewOuter(){
    previewA5('Left');previewA5('Right');
    const count=Number(!!externalLeft)+Number(!!externalRight);
    $('outerPreviewState').textContent=count===2?'2 volantini A5 caricati · fronte pronto':count===1?'1/2 A5 · manca l’altra metà':'0/2 A5 caricati';
    $('outerDescription').textContent=count===2?'Fronte A4 composto da 2 A5 verticali: SINISTRA '+externalLeft.name+' + DESTRA '+externalRight.name:
      'Fronte incompleto: carica A5 SINISTRA e A5 DESTRA. Non verrà generata una pagina fronte con un solo A5.';
  }
  function initPublicFlyerShare(){
    // The client-facing catalogue with actual property proposals lives at the repo root.
    // Do not substitute the general-purpose brochure in ./volantino-digitale/.
    const url=new URL('../../catalogo-premium/',global.location.href).href;
    const message='Buongiorno, come concordato ti invio il catalogo digitale aggiornato di Immobiliare La Sacra con le proposte immobiliari nella Valle di Susa e nel Torinese.\n\nSfoglia le proposte qui: '+url+'\n\nPrezzi e disponibilità sono da confermare con l’agenzia. Se vuoi informazioni su un immobile, rispondi a questo messaggio.';
    $('publicFlyerOpen').href=url;
    $('publicFlyerLink').value=url;
    $('publicFlyerWhatsApp').href='https://wa.me/?text='+encodeURIComponent(message);
    $('publicFlyerCopy').onclick=async()=>{
      let copied=false;
      try{
        if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);copied=true;}
      }catch(_){}
      if(!copied){
        const field=$('publicFlyerLink');
        field.focus();field.select();
        try{copied=Boolean(document.execCommand?.('copy'));}catch(_){}
        $('publicFlyerStatus').textContent=copied?
          'Link copiato. Per inviare anche il testo usa il pulsante WhatsApp.':
          'Seleziona il link dal campo e copialo manualmente.';
      }else{
        $('publicFlyerStatus').textContent='Messaggio e link copiati: puoi incollarli su WhatsApp o email.';
      }
    };
  }
  function init(){
    initPublicFlyerShare();initDrive();showStaff();showThemes();render();syncCatalog();restorePortraits();
    window.addEventListener('resize',resizePreview);
    $('addUrls').onclick=async()=>{if(loading)return;loading=true;try{
      const urls=$('listingUrls').value.split(/\s+/).map(x=>x.trim()).filter(Boolean);
      await bulkImport(urls);$('listingUrls').value='';
    }catch(e){setStatus('Importazione fallita: '+e.message,'warn')}finally{loading=false}};
    $('loadCatalog').onclick=async()=>{if(loading)return;loading=true;setStatus('Selezione annunci immobiliari Avigliana e comuni vicini...');
      try{const items=eligibleListings(await loadCatalog(true)).slice(0,18);
        model.properties=blank();items.forEach((x,i)=>{model.properties[i]=fromCatalog(x);});
        save();render();setStatus(items.length+' annunci ufficiali idonei selezionati, Avigliana e comuni vicini in priorità. Verificare APE, foto e disponibilità prima della stampa.','good');
      }catch(e){setStatus('Impossibile leggere il catalogo: '+e.message,'warn')}finally{loading=false}};
    $('addManual').onclick=()=>openDialog(Math.max(0,firstFree()));
    $('clearAll').onclick=()=>{if(confirm('Svuotare le 18 posizioni?')){model.properties=blank();save();render();}};
    for(const [id,inputId] of Object.entries(portraitInputs)){
      $(inputId).onchange=async e=>{
        try{await onPortraitChange(id,e.target.files[0])}
        catch(err){setStatus('Foto '+PROFILES[id].name+': '+err.message,'warn');console.warn(err)}
      };
    }
    $('panoramaInput').onchange=async e=>{try{model.panorama=await loadPhoto(e.target.files[0],1800);save();render();}catch(err){setStatus(err.message,'warn')}};
    $('outerLeftInput').onchange=e=>{externalLeft=e.target.files[0]||null;previewOuter();};
    $('outerRightInput').onchange=e=>{externalRight=e.target.files[0]||null;previewOuter();};
    $('outerLeftPage').onchange=previewOuter;
    $('outerRightPage').onchange=previewOuter;
    $('clearOuter').onclick=()=>{externalLeft=null;externalRight=null;$('outerLeftInput').value='';$('outerRightInput').value='';previewOuter();};
    window.addEventListener('pagehide',()=>{if(externalLeftPreviewUrl)URL.revokeObjectURL(externalLeftPreviewUrl);if(externalRightPreviewUrl)URL.revokeObjectURL(externalRightPreviewUrl);});
    previewOuter();
    $('listingEditor').onsubmit=onEditorSubmit;
    $('closeDialog').onclick=()=>$('listingDialog').close();
    $('deleteListing').onclick=()=>{if(selected<0)return;model.properties[selected]=null;save();$('listingDialog').close();render();};
    $('saveProject').onclick=()=>{save();setStatus('Progetto salvato nel browser.','good')};
    $('downloadProject').onclick=()=>jsonDownload({...model,savedAt:new Date().toISOString()},'CASE247_studio_volantini.json');
    $('exportPdf').onclick=()=>exportPdf(false);
    $('uploadDraftDrive').onclick=()=>exportPdf('draft');
    $('exportFinalPdf').onclick=()=>exportPdf(true);
    $('generateAll').onclick=exportAll;
    setStatus('Editor pronto. Le immagini mancanti saranno sostituite con segnaposto dichiarati.');
  }
  document.addEventListener('DOMContentLoaded',init);
})(window);
