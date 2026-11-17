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
  for(const id of ['googleOAuthClientId','connectDrive','driveStatus','driveResult','driveCustomerLink','driveLinkValue','driveLinkTitle','copyDriveLink','whatsappDriveLink'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/src="https:\/\/accounts\.google\.com\/gsi\/client"/);
  assert.match(html,/drive-publisher\.js/);
});
test('OAuth tokens are kept in memory, no service account on public site',()=>{
  assert.match(js,/https:\/\/www\.googleapis\.com\/auth\/drive'/);
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
  // Access checks are centralized in verifyPublicPdf rather than inline in upload.
  assert.match(js,/async function verifyPublicPdf\(fileId\)/);
  assert.match(js,/permissions\.some\(p=>p\.type==='anyone'&&p\.role==='reader'\)/);
  assert.match(js,/if\(!publicReader\)throw Error/);
  assert.match(js,/const verified=await verifyPublicPdf\(uploaded\.id\)/);
  assert.match(js,/info\.webViewLink/);
});
test('Only a validated final PDF is made public; Drive drafts stay private',()=>{
  const body=app.slice(app.indexOf('async function exportPdf('),app.indexOf('function downloadBlob('));
  assert.ok(body.includes('if(proof&&definitive===true){')&&body.includes('throw Error('));
  assert.ok(body.includes('if((definitive===true||draftToDrive)&&!Drive?.isConnected())'));
  assert.ok(body.includes('else if(definitive===true){')&&body.includes('Drive.uploadVerifiedPdf'));
  assert.match(body,/watermark:definitive!==true/);
  assert.match(body,/PDF di prova scaricato/);
});
test('No real ID hardcoded, token client ID validated',()=>{
 const module={exports:{}};
 vm.runInNewContext(js,{module,localStorage:{getItem:()=>''},Date,window:undefined});
 assert.equal(module.exports.validClientId('1234567890-test-abc.apps.googleusercontent.com'),true);
 assert.equal(module.exports.validClientId('secret-token'),false);
 assert.equal(module.exports.validClientId(''),false);
 assert.equal(module.exports.getConfiguredId(),'329979188953-pp3odbtatu7hen8pni86grui0bevt8dg.apps.googleusercontent.com');
});

test('Uploaded PDFs are directed to the actual VOLANTINO folder and parent is verified',()=>{
 const folder='1fk3pG5Pci0AQGhqbCiFr8eN7axwxsbO7';
 assert.match(js,new RegExp(folder));
 assert.match(js,/parents:\[FOLDER_ID\]/);
 assert.match(js,/location\.parents\.includes\(FOLDER_ID\)/);
 assert.match(html,/Cartella VOLANTINO/);
 assert.match(html,new RegExp(folder));
});

test('Web client is preconfigured, without user needing to paste the ID',()=>{
 assert.match(js,/const DEFAULT_CLIENT_ID='329979188953-pp3odbtatu7hen8pni86grui0bevt8dg\.apps\.googleusercontent\.com'/);
 assert.match(html,/id="googleOAuthClientId"[^>]+readonly/);
 assert.match(html,/Autorizza Google Drive/);
 assert.doesNotMatch(html,/id="configureDrive"/);
 assert.match(app,/await Drive\.authorize\(\)/);
});

test('Private draft upload remains separate from public permission update',()=>{
 const start=js.indexOf('async function uploadPrivateDraft(');
 const end=js.indexOf('async function uploadVerifiedPdf(',start);
 assert.ok(start>0&&end>start);
 const body=js.slice(start,end);
 assert.match(body,/parents:\[FOLDER_ID\]/);
 assert.doesNotMatch(body,/permissions\?fields/);
 assert.match(body,/private:true/);
 assert.match(html,/id="uploadDraftDrive"/);
 assert.match(app,/Drive\.uploadPrivateDraft\(result\.bytes/);
});


test('Restoring a published link rechecks permissions and never stores an OAuth token',()=>{
  assert.match(js,/async function restorePublishedLink\(\)/);
  assert.match(js,/const verified=await verifyPublicPdf\(saved\.id\)/);
  assert.match(js,/localStorage\?\.setItem\(PUBLICATION_KEY/);
  assert.match(js,/publishedAt:new Date\(\)\.toISOString\(\)/);
  assert.match(app,/await Drive\.restorePublishedLink\(\)/);
  assert.match(app,/showDriveLink\(previous\.url,true\)/);
  assert.match(html,/Ultimo PDF pubblicato|driveLinkTitle/);
});


test('Public client flyer offers a WhatsApp message and never exposes unverified listing data',()=>{
  const flyer=read('gestione/volantini-premium/volantino-digitale/index.html');
  const controls=['publicFlyerOpen','publicFlyerWhatsApp','publicFlyerCopy','publicFlyerLink','publicFlyerStatus'];
  for(const id of controls){
    assert.ok(html.includes('id="'+id+'"'),'Missing studio control '+id);
    assert.ok(app.includes("$('"+id+"')"),'Missing control handler '+id);
  }
  assert.ok(app.includes("new URL('./volantino-digitale/',global.location.href)"));
  assert.ok(app.includes('https://wa.me/?text='));
  for(const id of ['shareWhatsapp','copyMessage','flyerUrl','printFlyer','officialLogo']){
    assert.ok(flyer.includes('id="'+id+'"'),'Missing public flyer control '+id);
  }
  assert.ok(flyer.includes('Geom. Christian Raimondi'));
  assert.ok(flyer.includes('Volantino digitale informativo'));
  assert.ok(flyer.includes('https://lasacraimmobiliare.it/'));
  assert.ok(flyer.includes('class="front"'));
  assert.ok(flyer.includes('class="back"'));
  assert.ok(!flyer.includes('data-price'));
  assert.ok(!flyer.includes('class="property-card"'));
  const inline=flyer.split('<script>')[1]?.split('</script>')[0];
  assert.ok(inline,'Public flyer inline script is missing');
  assert.doesNotThrow(()=>new vm.Script(inline));
});
