import "server-only";
import {db,env} from "./cloud";
import {createHash} from "node:crypto";
const MAX=15*1024*1024;
export async function savePdf(folder,day,bytes){
 if(!["magazine","letters"].includes(folder)||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error("Invalid storage path");
 if(bytes.length>MAX||bytes.subarray(0,5).toString()!=="%PDF-")throw new Error("Invalid PDF body");
 const hash=createHash("sha256").update(bytes).digest("hex");
 const path=folder+"/"+day+"-"+hash.slice(0,24)+".pdf";
 const bucket=env("SUPABASE_STORAGE_BUCKET");
 const {error}=await db().storage.from(bucket).upload(path,bytes,{contentType:"application/pdf",upsert:false,cacheControl:"3600"});
 if(error && !/already exists|duplicate|409/i.test(String(error.message||error)))throw error;
 return path;
}
export async function loadPdf(path){
 if(!/^(magazine|letters)\/\d{4}-\d{2}-\d{2}-[a-f0-9]{24}\.pdf$/.test(path))throw new Error("Invalid storage asset path");
 const {data,error}=await db().storage.from(env("SUPABASE_STORAGE_BUCKET")).download(path);
 if(error||!data)throw new Error("Private PDF missing in application storage");
 const bytes=Buffer.from(await data.arrayBuffer());
 if(bytes.length>MAX||bytes.subarray(0,5).toString()!=="%PDF-")throw new Error("Corrupt storage PDF");
 return bytes;
}
