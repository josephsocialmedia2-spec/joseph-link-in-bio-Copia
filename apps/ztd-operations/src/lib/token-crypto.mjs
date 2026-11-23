import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
export function encryptToken(plaintext,secretHex){
 if(typeof plaintext!=="string"||plaintext.length<10)throw new Error("Invalid OAuth refresh token");
 if(!/^[a-f0-9]{64}$/i.test(secretHex||""))throw new Error("Invalid encryption key");
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",Buffer.from(secretHex,"hex"),iv);
 cipher.setAAD(Buffer.from("ztd:google:refresh-token:v1","utf8"));
 const result=Buffer.concat([cipher.update(plaintext,"utf8"),cipher.final()]);
 return {encrypted_refresh_token:result.toString("base64"),nonce:iv.toString("base64"),
  tag:cipher.getAuthTag().toString("base64")};
}
export function decryptToken(record,secretHex){
 if(!/^[a-f0-9]{64}$/i.test(secretHex||""))throw new Error("Invalid encryption key");
 const iv=Buffer.from(record.nonce,"base64");
 const ciphertext=Buffer.from(record.encrypted_refresh_token,"base64");
 const tag=Buffer.from(record.tag,"base64");
 if(iv.length!==12||tag.length!==16||ciphertext.length>8192)throw new Error("Invalid encrypted credentials");
 const decipher=createDecipheriv("aes-256-gcm",Buffer.from(secretHex,"hex"),iv);
 decipher.setAAD(Buffer.from("ztd:google:refresh-token:v1","utf8"));
 decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString("utf8");
}
