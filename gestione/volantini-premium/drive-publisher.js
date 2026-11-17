/* Google Drive publisher for final, verified PDFs only.
 * OAuth tokens remain in memory; the OAuth Client ID (public identifier) is local to this browser.
 * The Google OAuth client ID is public. No access tokens or client secrets are stored in code.
 */
(function (global) {
  'use strict';
  const SCOPE='https://www.googleapis.com/auth/drive';
  // User-owned existing folder created on Drive. Broader scope is needed because drive.file
  // alone does not grant the app access to a folder created outside this OAuth application.
  const FOLDER_ID='1fk3pG5Pci0AQGhqbCiFr8eN7axwxsbO7';
  const FOLDER_URL='https://drive.google.com/drive/folders/'+FOLDER_ID;
  const DEFAULT_CLIENT_ID='329979188953-pp3odbtatu7hen8pni86grui0bevt8dg.apps.googleusercontent.com';
  const PUBLICATION_KEY='case247-last-verified-pdf-v1';
  const validClientId=value=>/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(String(value||'').trim());
  let token=null,expiresAt=0,clientId='',client=null;
  let currentLink=null;
  const getConfiguredId=()=>DEFAULT_CLIENT_ID;
  function configure(id){
    const value=String(id||'').trim();
    if(!validClientId(value))throw Error('Inserisci un OAuth Client ID web valido (*.apps.googleusercontent.com).');
    if(value!==DEFAULT_CLIENT_ID)throw Error('Il progetto CASE247 utilizza il Client ID già configurato: non occorre cambiarlo.');
    clientId=value;client=null;token=null;expiresAt=0;
  }
  function isConnected(){return Boolean(token&&Date.now()<expiresAt-60000);}
  function authorize(){
    const id=getConfiguredId();
    if(!validClientId(id))throw Error('Prima configura il Client ID OAuth web di Google Cloud.');
    if(!global.google?.accounts?.oauth2)throw Error('Libreria di accesso Google non disponibile: controlla la connessione.');
    if(id!==clientId){client=null;clientId=id;token=null;expiresAt=0;}
    return new Promise((resolve,reject)=>{
      client=global.google.accounts.oauth2.initTokenClient({
        client_id:id,scope:SCOPE,include_granted_scopes:false,
        callback:response=>{
          if(!response||response.error||!response.access_token){
            reject(Error('Accesso Google non autorizzato: '+(response?.error_description||response?.error||'nessun token')));return;
          }
          if(!global.google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE)){
            reject(Error('Autorizzazione Drive non concessa.'));return;
          }
          token=response.access_token;
          expiresAt=Date.now()+Math.max(120,Number(response.expires_in)||3600)*1000;
          resolve(true);
        },
        error_callback:()=>reject(Error('Finestra di autenticazione Google chiusa o bloccata.'))
      });
      // Solo da clic diretto dell'utente, mai durante la generazione asincrona del PDF.
      client.requestAccessToken({prompt:'consent'});
    });
  }
  async function googleFetch(url,options={}){
    if(!isConnected())throw Error('Sessione Drive scaduta: premi «Collega Google Drive» prima di riprovare.');
    const headers=new Headers(options.headers||{});
    headers.set('Authorization','Bearer '+token);
    const response=await fetch(url,{...options,headers,cache:'no-store'});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error('Google Drive HTTP '+response.status+': '+(body.error?.message||'operazione rifiutata'));
    return body;
  }
// A customer link is considered usable only after a fresh Drive API permission check.
  // Saving the file ID locally is safe; OAuth access tokens are never persisted.
  async function verifyPublicPdf(fileId){
    const id=String(fileId||'').trim();
    if(!/^[a-zA-Z0-9_-]{15,}$/.test(id))throw Error('ID PDF Google Drive non valido.');
    const encoded=encodeURIComponent(id);
    const info=await googleFetch('https://www.googleapis.com/drive/v3/files/'+encoded+
      '?fields=id,name,mimeType,parents,trashed,webViewLink');
    if(info.trashed||info.mimeType!=='application/pdf'||!Array.isArray(info.parents)||!info.parents.includes(FOLDER_ID)){
      throw Error('Il PDF non è presente nella cartella VOLANTINO oppure non è più utilizzabile.');
    }
    const permissions=await googleFetch('https://www.googleapis.com/drive/v3/files/'+encoded+
      '/permissions?pageSize=100&fields=nextPageToken,permissions(type,role)');
    const publicReader=Array.isArray(permissions.permissions)&&
      permissions.permissions.some(p=>p.type==='anyone'&&p.role==='reader');
    if(!publicReader)throw Error('Accesso pubblico in sola lettura NON confermato da Google Drive.');
    if(!/^https:\/\/(?:drive|docs)\.google\.com\//.test(String(info.webViewLink||''))){
      throw Error('Google Drive non ha restituito un link cliente verificabile.');
    }
    return {id:info.id,name:info.name,url:info.webViewLink};
  }
  async function restorePublishedLink(){
    if(!isConnected())throw Error('Autorizza Google Drive per verificare l’ultimo link pubblicato.');
    let saved=null;
    try{saved=JSON.parse(global.localStorage?.getItem(PUBLICATION_KEY)||'null');}catch(_){}
    if(!saved?.id)return null;
    const verified=await verifyPublicPdf(saved.id);
    currentLink=verified.url;
    return {...verified,publishedAt:saved.publishedAt||''};
  }
  async function uploadPrivateDraft(bytes,filename){
    if(!isConnected())throw Error('Autorizza prima Google Drive.');
    if(!(bytes instanceof Uint8Array)&&!(bytes instanceof ArrayBuffer))throw Error('Dati PDF non validi.');
    const blob=new Blob([bytes],{type:'application/pdf'});
    if(!blob.size)throw Error('PDF vuoto.');
    const name=String(filename||'BOZZA_Volantino_La_Sacra.pdf').replace(/[\\/]/g,'_');
    const metadata={name,mimeType:'application/pdf',parents:[FOLDER_ID],description:'BOZZA NON DISTRIBUIRE. Revisione immobili incompleta. File privato.'};
    const boundary='case247_draft_'+Math.random().toString(36).slice(2);
    const payload=new Blob([
      '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),'\r\n',
      '--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n',
      blob,'\r\n--'+boundary+'--'
    ],{type:'multipart/related; boundary='+boundary});
    const result=await googleFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType',{
      method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body:payload
    });
    if(!result.id)throw Error('Caricamento non confermato da Drive.');
    const location=await googleFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(result.id)+'?fields=id,name,parents,webViewLink,permissions(id,type,role)');
    if(!Array.isArray(location.parents)||!location.parents.includes(FOLDER_ID))throw Error('File non trovato nella cartella VOLANTINO dopo upload.');
    // Never share the draft. If it already has public permission, fail closed.
    if(Array.isArray(location.permissions)&&location.permissions.some(p=>p.type==='anyone'))throw Error('Il file bozza presenta permessi pubblici inattesi: verifica Drive.');
    return {id:result.id,name:location.name,url:location.webViewLink||'',private:true};
  }
  async function uploadVerifiedPdf(bytes,filename){
    if(!isConnected())throw Error('Google Drive non collegato. Collega l’account prima di generare il PDF definitivo.');
    if(!(bytes instanceof Uint8Array)&&!(bytes instanceof ArrayBuffer))throw Error('Dati del PDF non validi');
    const blob=new Blob([bytes],{type:'application/pdf'});
    if(!blob.size)throw Error('PDF vuoto: caricamento interrotto');
    const name=String(filename||'Volantino_Immobiliare_La_Sacra.pdf').replace(/[\\/]/g,'_');
    const metadata={name,mimeType:'application/pdf',parents:[FOLDER_ID],description:'Volantino immobiliare definitivo verificato · Immobiliare La Sacra'};
    // Google Drive uploadType=multipart requires multipart/related (not multipart/form-data).
    const boundary='case247_pdf_'+Math.random().toString(36).slice(2);
    const payload=new Blob([
      '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),'\r\n',
      '--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n',
      blob,'\r\n--'+boundary+'--'
    ],{type:'multipart/related; boundary='+boundary});
    const uploaded=await googleFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',{
      method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body:payload
    });
    if(!uploaded.id)throw Error('Drive non ha restituito l’ID file: link non creato');
    const location=await googleFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(uploaded.id)+'?fields=id,name,parents');
    if(!Array.isArray(location.parents)||!location.parents.includes(FOLDER_ID)){
      throw Error('Drive ha caricato il PDF, ma non nella cartella VOLANTINO. Condivisione sospesa; controlla i permessi Google.');
    }
    currentLink=null;
    // Public read-only link is an explicit choice in the UI. No editor permission is created.
    try{
      await googleFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(uploaded.id)+'/permissions?fields=id,type,role',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'anyone',role:'reader',allowFileDiscovery:false})
      });
      const verified=await verifyPublicPdf(uploaded.id);
      currentLink=verified.url;
      try{
        global.localStorage?.setItem(PUBLICATION_KEY,JSON.stringify({
          id:verified.id,publishedAt:new Date().toISOString()
        }));
      }catch(_){/* Se la memoria locale è bloccata, il link appena verificato resta visibile. */}
      return verified;
    }catch(error){
      // File intentionally remains PRIVATE if publishing was denied. Never return a public link.
      throw Error('PDF caricato su Drive, ma non condiviso con il cliente. '+error.message);
    }
  }
  const publisher={configure,getConfiguredId,validClientId,isConnected,authorize,uploadVerifiedPdf,uploadPrivateDraft,verifyPublicPdf,restorePublishedLink,getLastLink:()=>currentLink,getFolderUrl:()=>FOLDER_URL,getFolderId:()=>FOLDER_ID};
  global.CASE247_DRIVE=publisher;
  if(typeof module!=='undefined'&&module.exports)module.exports={validClientId,getConfiguredId};
})(typeof window!=='undefined'?window:globalThis);
