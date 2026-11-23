import "server-only";
import {createHash} from "node:crypto";
import QRCode from "qrcode";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import {baseUrl,env} from "./cloud";
function sourceParts(){
 const repo=env("GITHUB_REPOSITORY");
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw new Error("Invalid repository");
 const ref=env("GITHUB_DRAFT_REF");
 if(!/^[\w./-]{1,120}$/.test(ref)||ref.includes(".."))throw new Error("Invalid draft branch");
 return {repo,ref};
}
async function githubContent(path){
 const {repo,ref}=sourceParts();
 if(!/^[\w./-]{1,230}$/.test(path)||path.includes("..")||path.startsWith("/"))throw new Error("Unsafe source path");
 const api="https://api.github.com/repos/"+repo+"/contents/"+path+"?ref="+encodeURIComponent(ref);
 const headers={"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 if(process.env.GITHUB_TOKEN)headers.Authorization="Bearer "+process.env.GITHUB_TOKEN;
 const r=await fetch(api,{headers,cache:"no-store",signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error("GitHub draft unavailable: "+r.status);
 const data=await r.json();
 if(data.encoding!=="base64"||!data.content)throw new Error("GitHub did not provide file bytes");
 const bytes=Buffer.from(data.content.replace(/\s/g,""),"base64");
 if(bytes.length>15*1024*1024)throw new Error("Draft is too large");
 return bytes;
}
export async function currentDraft(){
 const manifest=JSON.parse((await githubContent("gestione/rivista/edizioni/auto/latest.json")).toString("utf8"));
 const name=manifest.magazine;
 if(!/^Real-Estate-Weekly-\d{4}-\d{2}-\d{2}\.pdf$/.test(name))throw new Error("Unexpected magazine path");
 const pdf=await githubContent("gestione/rivista/edizioni/auto/"+name);
 if(pdf.subarray(0,5).toString()!=="%PDF-"||!pdf.subarray(-4096).includes(Buffer.from("%%EOF")))throw new Error("Source PDF invalid");
 const sha256=createHash("sha256").update(pdf).digest("hex");
 return {pdf,sha256,name,issue:manifest.issue_date||"",sourceStatus:"DRAFT"};
}
function lines(text,font,size,max){
 const rows=[];
 for(const paragraph of text.split("\n")){
  let line="";
  for(const word of paragraph.split(/\s+/)){
   const trial=line?line+" "+word:word;
   if(font.widthOfTextAtSize(trial,size)>max&&line){rows.push(line);line=word}
   else line=trial;
  }
  rows.push(line);
 }
 return rows;
}
export async function letterPdf({day,qrUrl,issue}){
 const pdf=await PDFDocument.create(),page=pdf.addPage([595.28,841.89]);
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.09,.21,.34),gold=rgb(.72,.52,.25);
 page.drawRectangle({x:0,y:784,width:595,height:58,color:ink});
 page.drawText("ZERO TO DIAMOND  |  COMUNICAZIONE TERRITORIALE",{x:40,y:806,size:12,font:bold,color:rgb(1,1,1)});
 page.drawRectangle({x:40,y:765,width:515,height:2,color:gold});
 page.drawText("LETTERA INFORMATIVA NON NOMINATIVA",{x:40,y:735,size:15,font:bold,color:ink});
 page.drawText("Avigliana e Valle di Susa  |  "+day,{x:40,y:710,size:10,font,color:ink});
 const copy=[
  "Gentile residente,",
  "le presentiamo una rivista digitale dedicata al territorio di Avigliana e della Valle di Susa.",
  "Il fascicolo contiene informazioni locali e riferimenti a dati pubblici sul mercato immobiliare.",
  "Può consultare la rivista tramite il codice QR, senza lasciare dati personali.",
  "La presente lettera non è un'offerta di intermediazione, una proposta o una stima professionale.",
  "Per visite, valutazioni o compravendite collaboriamo esclusivamente con agenti abilitati.",
  "",
  "Edizione di riferimento: "+(issue||"fascicolo in revisione")+".",
  "Cordiali saluti,",
  "Joseph Malafronte - Real Media Pro"
 ];
 let y=678;
 for(const row of copy.flatMap(t=>lines(t,font,10.5,505))){
  page.drawText(row,{x:40,y,size:10.5,font,color:ink});y-=19;
 }
 const png=await QRCode.toBuffer(qrUrl,{type:"png",margin:2,width:350,errorCorrectionLevel:"M"});
 const image=await pdf.embedPng(png);
 page.drawImage(image,{x:42,y:190,width:132,height:132});
 page.drawText("SFOGLIA LA RIVISTA",{x:192,y:305,size:12,font:bold,color:ink});
 for(const row of lines(qrUrl,font,9,340)){page.drawText(row,{x:192,y:282,size:9,font,color:ink})}
 page.drawRectangle({x:40,y:98,width:515,height:1,color:gold});
 page.drawText("Marketing, comunicazione e pubblicita. Nessuna intermediazione immobiliare.",{
  x:40,y:80,size:9,font,color:ink
 });
 page.drawText("QR operativo soltanto dopo approvazione editoriale del fascicolo.",{x:40,y:60,size:8,font,color:ink});
 const bytes=Buffer.from(await pdf.save());
 return bytes;
}
export function publicMagazineUrl(day){
 return baseUrl()+"/api/publications/"+day;
}
