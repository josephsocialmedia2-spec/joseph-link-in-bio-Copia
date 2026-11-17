/* Test unitari senza credenziali reali né richieste esterne.
   Eseguire: node gestione/volantini-premium/test-link-cliente.cjs */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const PUBLIC_FOLDER='1fk3pG5Pci0AQGhqbCiFr8eN7axwxsbO7';
const FILE_ID='ExamplePublicFile12345';
const PUBLIC_URL='https://drive.google.com/file/d/'+FILE_ID+'/view';
const saved=new Map();
let permissionType='anyone',permissionRole='reader',parent=PUBLIC_FOLDER;
let permissionCreateAllowed=true;
global.localStorage={
  getItem:key=>saved.get(key)||null,
  setItem:(key,value)=>saved.set(key,value)
};
global.google={accounts:{oauth2:{
  initTokenClient:options=>({
    requestAccessToken:()=>options.callback({access_token:'mock-token',expires_in:3600})
  }),
  hasGrantedAllScopes:()=>true
}}};
global.fetch=async(url,options={})=>{
  const value=String(url);
  let data={};
  if(value.includes('upload/drive/v3/files')){
    data={id:FILE_ID,name:'Volantino.pdf'};
  }else if(value.includes('/permissions?fields=id')){
    if(!permissionCreateAllowed)return {ok:false,status:403,json:async()=>({error:{message:'permission denied'}})};
    data={id:'permissionMock'};
  }else if(value.includes('/permissions?pageSize=')){
    data={permissions:[{type:permissionType,role:permissionRole}]};
  }else if(value.includes('/drive/v3/files/'+FILE_ID)){
    data={id:FILE_ID,name:'Volantino.pdf',mimeType:'application/pdf',parents:[parent],
      trashed:false,webViewLink:PUBLIC_URL};
  }else{
    throw Error('Chiamata API non prevista: '+value);
  }
  return {ok:true,status:200,json:async()=>data};
};
require(path.join(__dirname,'drive-publisher.js'));
const drive=global.CASE247_DRIVE;
(async()=>{
  await drive.authorize();
  assert.equal((await drive.verifyPublicPdf(FILE_ID)).url,PUBLIC_URL);
  permissionType='user';
  await assert.rejects(drive.verifyPublicPdf(FILE_ID),/NON confermato/);
  permissionType='anyone';permissionRole='writer';
  await assert.rejects(drive.verifyPublicPdf(FILE_ID),/NON confermato/);
  permissionRole='reader';parent='another-folder';
  await assert.rejects(drive.verifyPublicPdf(FILE_ID),/cartella VOLANTINO/);
  parent=PUBLIC_FOLDER;
  assert.equal(await drive.restorePublishedLink(),null);
  const uploaded=await drive.uploadVerifiedPdf(new Uint8Array([37,80,68,70]),'Volantino.pdf');
  assert.equal(uploaded.url,PUBLIC_URL);
  const restored=await drive.restorePublishedLink();
  assert.equal(restored.url,PUBLIC_URL);
  assert.ok(restored.publishedAt);
  permissionCreateAllowed=false;
  await assert.rejects(drive.uploadVerifiedPdf(new Uint8Array([37,80,68,70]),'Volantino.pdf'),/non condiviso/);
  console.log('OK: permesso reader, rifiuto writer/privato, cartella, recupero link, errore condivisione');
})().catch(error=>{console.error(error);process.exitCode=1;});
