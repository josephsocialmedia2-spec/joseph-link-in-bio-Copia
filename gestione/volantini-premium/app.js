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
  let external=null,selected=-1,catalog=null,loading=false;
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
    const energy=put('energy energy-'+(p.energy||'unknown').toLowerCase().replace(/\d/g,''),'');
    const cl=document.createElement('b');cl.className='class';cl.textContent='Classe '+(p.energy||'da verificare');
    const ep=document.createElement('span');ep.textContent='EPgl,nren '+(p.ep||'da verificare');
    energy.append(cl,document.createElement('br'),ep);
    const qrBox=document.createElement('div');qrBox.className='qr-box';qrBox.dataset.qrId=`listing-${i}`;
    qrBox.title='QR: '+(p.url||'URL da inserire');card.append(qrBox);
    if(p.url){try{QR.paint(qrBox,`listing-${i}`,p.url);}catch(e){qrBox.textContent='QR ?';}}
    else QR.deleteId(`listing-${i}`);
    return card;
  }
  function showPreflight(){
    const issues=Core.checkSheet(model.properties);
    document.querySelectorAll('.card.has-fallback').forEach(card=>issues.push(`Scheda ${Number(card.dataset.slot)+1}: foto non caricabile`));
    if(CFG.panoramaReal===''&&model.panorama===CFG.panoramaFallback)issues.push('Panorama illustrativo: caricare fotografia reale prima della diffusione');
    const target=$('preflight');
    target.innerHTML='<strong>'+model.properties.filter(p=>p?.title).length+'/18 annunci · '+issues.length+' controlli aperti</strong>'+
      (issues.length?'<ul>'+issues.slice(0,10).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>Tutti i campi verificati secondo le dichiarazioni dell’operatore.</p>');
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
    $('staffFooterPartner').textContent=staff.brand==='lasacra'?'Immobiliare La Sacra · promozione in collaborazione con Case in Pubblicità 24/7':'Partner commerciale di Immobiliare La Sacra';
    $('flyer').querySelector('.brand-partner').textContent=staff.brand==='lasacra'?'Case in Pubblicità 24/7 · partner commerciale di Immobiliare La Sacra':'Selezione immobili dal portafoglio La Sacra Immobiliare';
    $('staffCta').textContent='Contatta '+staff.name+' su WhatsApp';
    $('staffPhone').textContent=staff.displayPhone;
    $('staffHint').textContent=staff.brand==='lasacra'?'Logo La Sacra · Nessun ritratto · WhatsApp '+staff.displayPhone:'Foto Joseph · Case in Pubblicità 24/7 · WhatsApp '+staff.displayPhone;
    const portrait=$('portrait');
    portrait.onerror=()=>{portrait.onerror=null;portrait.src=CFG.portraitFallback;};
    portrait.src=model.portrait||CFG.portraitFallback;
    const footerPortrait=$('footerPortrait');
    if(footerPortrait){footerPortrait.onerror=()=>{footerPortrait.onerror=null;footerPortrait.src=CFG.portraitFallback;};footerPortrait.src=model.portrait||CFG.portraitFallback;}
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
    if(found)return Core.makeEntry({title:found.title,city:found.municipality||'',
      price:found.contract==='Affitto'?null:found.price,
      contract:found.contract,img:found.image||'',url,
      energy:found.energy_class||found.energyClass||found.energy||'',
      ep:found.epgl_nren||found.epgl||found.ep||'',
      envelope:found.epe_invol||found.envelope||''});
    // Best effort: endpoint Shopify product.js può essere bloccato da CORS su GitHub Pages.
    try{
      const r=await fetch(url+'.js',{mode:'cors',cache:'no-store'});
      if(!r.ok)throw Error('HTTP '+r.status);
      const j=await r.json();
      return Core.makeEntry({title:j.title||'DA COMPILARE',price:j.price!=null?Number(j.price)/100:null,
        url,img:j.featured_image||j.images?.[0]||'',city:''});
    }catch{
      return Core.makeEntry({title:'DA COMPILARE — lettura URL non riuscita',url});
    }
  }
  function firstFree(){return model.properties.findIndex(x=>!x?.title)}
  async function bulkImport(urls){
    let added=0,invalid=0,dups=0;
    for(const candidate of urls){
      const url=Core.canonicalUrl(candidate);
      if(!url){invalid++;continue;}
      if(model.properties.some(p=>p?.url===url)){dups++;continue;}
      const index=firstFree();if(index<0)break;
      model.properties[index]=await readUrl(url);added++;
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
    $('fieldVerified').checked=!!p.checked;$('fieldPhoto').value='';$('dialogError').textContent='';$('listingDialog').showModal();
  }
  function readEditor(){
    const old=model.properties[selected]||{};
    return Core.makeEntry({title:$('fieldTitle').value,city:$('fieldCity').value,price:$('fieldPrice').value,
      energy:$('fieldEnergy').value,ep:$('fieldEp').value,envelope:$('fieldEnvelope').value,
      url:$('fieldUrl').value,contract:$('fieldContract').value,checked:$('fieldVerified').checked,img:old.img||''});
  }
  async function onEditorSubmit(event){
    event.preventDefault();const p=readEditor();
    if(!p.title||!p.url){$('dialogError').textContent='Titolo e URL La Sacra diretto sono obbligatori.';return;}
    if(model.properties.some((x,i)=>i!==selected&&x?.url===p.url)){$('dialogError').textContent='Annuncio già presente nella griglia.';return;}
    const photo=$('fieldPhoto').files[0];if(photo)p.img=await loadPhoto(photo,900);
    model.properties[selected]=p;save();$('listingDialog').close();render();
  }
  function jsonDownload(data,name){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),12000);
  }
  async function exportPdf(){
    if(loading)return;loading=true;$('exportPdf').disabled=true;setStatus('Preparazione PDF in corso...');
    try{
      const issues=showPreflight();
      if(model.properties.some(x=>!x?.title)||model.properties.some(x=>!x?.url))throw Error('Per creare 19 QR occorrono 18 schede con URL diretti.');
      const qrProblems=QR.verifyAssociations(model.properties,whatsappFor(activeProfile()));
      if(qrProblems.length)throw Error(qrProblems.join(' · '));
      const proof=issues.length>0;
      if(proof&&!confirm(`Sono aperte ${issues.length} verifiche. Generare solo un PDF BOZZA non distribuibile?`))return;
      const result=await PDF.exportPdf({flyer:$('flyer'),properties:model.properties,externalFile:external,
        externalPage:Number($('outerPage').value)||1,watermark:proof,whatsappUrl:whatsappFor(activeProfile()),filename:'Volantino_A4_'+activeProfile().name+'.pdf'});
      const q=Math.round(result.minModuleMm*100)/100;
      setStatus(`PDF esportato: ${result.pages} pagine, ${result.qrCount} QR vettoriali. Modulo minimo ${q} mm. ${proof?'BOZZA — NON DISTRIBUIRE.':'Verificare comunque la stampa su carta.'}`,'good');
    }catch(e){setStatus('Esportazione interrotta: '+e.message,'warn');console.error(e);}finally{loading=false;$('exportPdf').disabled=false;}
  }
  
  function downloadBlob(blob,name){
    const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);
  }
  async function exportAll(){
    if(loading)return;loading=true;
    const buttons=[$('exportPdf'),$('generateAll')];buttons.forEach(b=>b.disabled=true);
    const saved=model.profile;
    try{
      if(!window.JSZip)throw Error('Libreria ZIP non disponibile: verifica la connessione.');
      const issues=showPreflight();
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
          externalFile:external,externalPage:Number($('outerPage').value)||1,watermark:issues.length>0,
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

  function init(){
    showStaff();showThemes();render();
    window.addEventListener('resize',resizePreview);
    $('addUrls').onclick=async()=>{if(loading)return;loading=true;try{
      const urls=$('listingUrls').value.split(/\s+/).map(x=>x.trim()).filter(Boolean);
      await bulkImport(urls);$('listingUrls').value='';
    }catch(e){setStatus('Importazione fallita: '+e.message,'warn')}finally{loading=false}};
    $('loadCatalog').onclick=async()=>{if(loading)return;loading=true;setStatus('Lettura catalogo La Sacra...');
      try{const items=await loadCatalog(true);const urls=items.filter(x=>Core.canonicalUrl(x.url)).slice(0,18).map(x=>x.url);
        await bulkImport(urls);}catch(e){setStatus('Impossibile leggere il catalogo: '+e.message,'warn')}finally{loading=false}};
    $('addManual').onclick=()=>openDialog(Math.max(0,firstFree()));
    $('clearAll').onclick=()=>{if(confirm('Svuotare le 18 posizioni?')){model.properties=blank();save();render();}};
    $('portraitInput').onchange=async e=>{try{model.portrait=await loadPhoto(e.target.files[0],1200);save();render();}catch(err){setStatus(err.message,'warn')}};
    $('panoramaInput').onchange=async e=>{try{model.panorama=await loadPhoto(e.target.files[0],1800);save();render();}catch(err){setStatus(err.message,'warn')}};
    $('outerInput').onchange=e=>{external=e.target.files[0]||null;$('outerDescription').textContent=external?'Esterno selezionato: '+external.name:'Nessun esterno caricato';};
    $('listingEditor').onsubmit=onEditorSubmit;
    $('closeDialog').onclick=()=>$('listingDialog').close();
    $('deleteListing').onclick=()=>{if(selected<0)return;model.properties[selected]=null;save();$('listingDialog').close();render();};
    $('saveProject').onclick=()=>{save();setStatus('Progetto salvato nel browser.','good')};
    $('downloadProject').onclick=()=>jsonDownload({...model,savedAt:new Date().toISOString()},'CASE247_studio_volantini.json');
    $('exportPdf').onclick=exportPdf;
    $('generateAll').onclick=exportAll;
    setStatus('Editor pronto. Le immagini mancanti saranno sostituite con segnaposto dichiarati.');
  }
  document.addEventListener('DOMContentLoaded',init);
})(window);
