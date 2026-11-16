'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('gestione/volantini-premium/drive-publisher.js');
const app=read('gestione/volantini-premium/app.js');
const html=read('gestione/volantini-premium/index.html');
test('Drive publisher and editor scripts are valid Javascript',()=>{
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.doesNotThrow(()=>new vm.Script(app));
});
test('Drive setup UI and customer link actions exist',()=>{
  for(const id of ['googleOAuthClientId','configureDrive','connectDrive','driveStatus','driveResult','driveCustomerLink','copyDriveLink','whatsappDriveLink'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/src="https:\/\/accounts\.google\.com\/gsi\/client"/);
  assert.match(html,/drive-publisher\.js/);
});
test('OAuth tokens are kept in memory, no service account on public site',()=>{
  assert.match(js,/https:\/\/www\.googleapis\.com\/auth\/drive\.file/);
  assert.match(js,/initTokenClient/);
  assert.match(js,/hasGrantedAllScopes/);
  assert.match(js,/requestAccessToken\(\{prompt:'consent'\}\)/);
  assert.doesNotMatch(js,/localStorage\.setItem\([^\n]*token/);
  assert.doesNotMatch(js,/client_secret|private_key/);
});
test('Upload is multipart/related and public link requires confirmed read-only permission',()=>{
  assert.match(js,/uploadType=multipart/);
  assert.match(js,/multipart\/related/);
  assert.match(js,/type:'anyone',role:'reader',allowFileDiscovery:false/);
  assert.match(js,/info\.permissions\.some\(p=>p\.type==='anyone'&&p\.role==='reader'\)/);
  assert.match(js,/!allowed\|\|!info\.webViewLink/);
});
test('Only a validated final PDF is auto-uploaded, draft is local only',()=>{
  const body=app.slice(app.indexOf('async function exportPdf('),app.indexOf('function downloadBlob('));
  assert.match(body,/if\(proof&&definitive\)throw Error/);
  assert.match(body,/if\(definitive&&!Drive\?\.isConnected\(\)\)/);
  assert.match(body,/if\(definitive\)\{[\s\S]*Drive\.uploadVerifiedPdf/);
  assert.match(body,/watermark:!definitive/);
  assert.match(body,/PDF di prova scaricato/);
});
test('No real ID hardcoded, token client ID validated',()=>{
 const module={exports:{}};
 vm.runInNewContext(js,{module,localStorage:{getItem:()=>''},Date,window:undefined});
 assert.equal(module.exports.validClientId('1234567890-test-abc.apps.googleusercontent.com'),true);
 assert.equal(module.exports.validClientId('secret-token'),false);
 assert.equal(module.exports.validClientId(''),false);
});
