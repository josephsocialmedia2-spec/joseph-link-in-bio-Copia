import "server-only";
import {google} from "googleapis";
import {Readable} from "node:stream";
import {createHash} from "node:crypto";
import {env} from "./cloud";
export function auth(){
 const client=new google.auth.OAuth2(env("GOOGLE_OAUTH_CLIENT_ID"),env("GOOGLE_OAUTH_CLIENT_SECRET"));
 client.setCredentials({refresh_token:env("GOOGLE_OAUTH_REFRESH_TOKEN")});
 return client;
}
export function drive(){return google.drive({version:"v3",auth:auth()})}
export function calendar(){return google.calendar({version:"v3",auth:auth()})}
function safeName(name){
 if(!/^[a-zA-Z0-9_.-]{1,150}\.pdf$/.test(name))throw new Error("Invalid PDF filename");
 return name;
}
export async function verifyDriveFolder(){
 const id=env("GOOGLE_DRIVE_FOLDER_ID");
 const {data}=await drive().files.get({fileId:id,fields:"id,mimeType,name,capabilities/canAddChildren",supportsAllDrives:true});
 if(data?.mimeType!=="application/vnd.google-apps.folder"||!data.capabilities?.canAddChildren)throw new Error("Drive folder is not writable");
 return id;
}
export async function getFileByName(name){
 safeName(name);
 const folder=env("GOOGLE_DRIVE_FOLDER_ID");
 const q="'"+folder.replaceAll("'","\\'")+"' in parents and name = '"+name.replaceAll("'","\\'")+"' and trashed = false";
 const {data}=await drive().files.list({q,fields:"nextPageToken,files(id,name,mimeType,webViewLink,md5Checksum,size)",pageSize:20,supportsAllDrives:true,includeItemsFromAllDrives:true});
 if((data.files||[]).length>1)throw new Error("More than one Drive file with same generated filename");
 return data.files?.[0]||null;
}
export async function putPdf(name,buffer){
 safeName(name);
 const existing=await getFileByName(name);
 if(existing){
  const actual=existing.md5Checksum;
  const expected=createHash("md5").update(buffer).digest("hex");
  if(!actual||actual!==expected)throw new Error("Drive file collision or corrupted existing PDF; refusing to reuse");
  return existing;
 } // immutable deterministic filename; generation is idempotent
 const {data}=await drive().files.create({
  requestBody:{name,mimeType:"application/pdf",parents:[env("GOOGLE_DRIVE_FOLDER_ID")]},
  media:{mimeType:"application/pdf",body:Readable.from(buffer)},
  fields:"id,name,mimeType,webViewLink,md5Checksum,size",supportsAllDrives:true
 });
 if(!data?.id)throw new Error("Google Drive did not return file ID");
 return data;
}
export async function readPdf(fileId){
 if(!/^[A-Za-z0-9_-]{10,128}$/.test(fileId))throw new Error("Invalid Drive ID");
 const r=await drive().files.get({fileId,alt:"media",supportsAllDrives:true},{responseType:"arraybuffer"});
 const bytes=Buffer.from(r.data);
 if(bytes.length>15*1024*1024||bytes.subarray(0,5).toString()!=="%PDF-")throw new Error("Drive file is not an allowed PDF");
 return bytes;
}
export async function dayEvents(day){
 const calId=env("GOOGLE_CALENDAR_ID");
 // Window covers the local day with timezone offsets including DST; convert with Intl.
 const start=new Date(day+"T00:00:00Z");
 // Calendar accepts dateTime + timezone; offset resolved by querying local day ±1d.
 const from=new Date(start.getTime()-24*3600000).toISOString();
 const to=new Date(start.getTime()+48*3600000).toISOString();
 const {data}=await calendar().events.list({
  calendarId:calId,timeMin:from,timeMax:to,maxResults:200,singleEvents:true,orderBy:"startTime"
 });
 if(!Array.isArray(data.items))throw new Error("Calendar access not verified");
 const fmt=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 return data.items.filter(x=>x.status!=="cancelled"&&x.start?.dateTime).map(x=>{
  const a=fmt.format(new Date(x.start.dateTime)).replace(", "," ");
  const b=fmt.format(new Date(x.end?.dateTime||x.start.dateTime)).replace(", "," ");
  return {date:a.slice(0,10),start:a.slice(11,16),end:b.slice(11,16),
   title:String(x.summary||"Impegno calendario").slice(0,180),allDay:false};
 }).filter(e=>e.date===day && e.start>="08:00" && e.start<="20:00");
}
