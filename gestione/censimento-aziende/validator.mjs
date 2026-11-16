/* CASE247: validator shared by GitHub Pages UI and offline Node tests. No network and no sends. */
export function parseSemicolonCSV(text) {
  if (typeof text !== "string") throw new Error("CSV non valido");
  const rows=[]; let row=[],cell="",quoted=false;
  text=text.replace(/^\uFEFF/,"");
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"' && text[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    } else if(ch==='"' && cell==="")quoted=true;
    else if(ch===";"){row.push(cell);cell=""}
    else if(ch==="\n" || ch==="\r"){
      if(ch==="\r"&&text[i+1]==="\n")i++;
      row.push(cell);cell="";
      if(row.some(x=>x!==""))rows.push(row);
      row=[];
    } else cell+=ch;
  }
  if(quoted)throw new Error("CSV con virgolette non chiuse");
  if(row.length || cell!==""){row.push(cell);if(row.some(x=>x!==""))rows.push(row)}
  if(!rows.length)throw new Error("CSV vuoto");
  const width=rows[0].length;
  if(rows.slice(1).some(r=>r.length!==width))throw new Error("CSV con numero di colonne incoerente");
  return {headers:rows[0], rows:rows.slice(1)};
}
export function validateManifest(m, files) {
  if(!m || typeof m!=="object" || !m.lotto || !m.files)throw new Error("Manifest incompleto");
  if(m.daily_send_cap!==280)throw new Error("Tetto giornaliero difforme da 280");
  if(m.sending_enabled!==false)throw new Error("Il manifest tenta di abilitare invii");
  const need=["aziende_avigliana_20km.csv","IMMOBILIARE_LA_SACRA_CENSIMENTO_AZIENDE_AVIGLIANA_20KM.pdf"];
  const problems=[];
  for(const n of need){
    if(!m.files[n] || !/^[a-f0-9]{64}$/i.test(m.files[n].sha256||""))problems.push("SHA mancante per "+n);
    if(!files[n])problems.push("File non caricato: "+n);
  }
  return {ok:!problems.length,problems};
}
export function analyzeRecords(csv, manifest) {
  const i=Object.fromEntries(csv.headers.map((h,j)=>[h.trim().toLowerCase(),j]));
  for(const h of ["ragione sociale / attività","email pubblica","stato campagna","base giuridica marketing","prova consenso","stato revoca / opposizione"]){
    if(!(h in i))throw new Error("Colonna obbligatoria mancante: "+h);
  }
  if(manifest.records !== csv.rows.length)throw new Error("Numero righe CSV diverso dal manifest");
  const seen=new Set();let email=0,piva=0,duplicateEmail=0,eligibleCandidates=0,blocked=0;
  for(const r of csv.rows) {
    const get=h=>(r[i[h]]||"").trim();
    const addr=get("email pubblica").toLowerCase();
    if(addr){email++;if(seen.has(addr))duplicateEmail++;else seen.add(addr)}
    if(i["partita iva"]!==undefined&&get("partita iva"))piva++;
    const status=get("stato campagna").toUpperCase();
    const basis=get("base giuridica marketing").toUpperCase();
    const proof=get("prova consenso").toUpperCase();
    const optout=get("stato revoca / opposizione").toUpperCase();
    if(status==="AUTORIZZATO" && addr && basis && basis!=="NON_DOCUMENTATA" && proof && proof!=="MANCANTE" && ["NESSUNA","NO","NON_OPPOSTO"].includes(optout))eligibleCandidates++;
    else blocked++;
  }
  return {rows:csv.rows.length,email,piva,duplicateEmail,eligibleCandidates,blocked,sendingEnabled:false,dailyCap:280};
}
export async function sha256Hex(fileOrBuffer) {
  const b=fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
  const h=await crypto.subtle.digest("SHA-256",b);
  return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,"0")).join("");
}
