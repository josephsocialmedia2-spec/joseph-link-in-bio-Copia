import test from "node:test";
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {encryptToken,decryptToken} from "../src/lib/token-crypto.mjs";
test("Google offline token is encrypted and authenticated with AES-256-GCM",()=>{
 const key=randomBytes(32).toString("hex");
 const secret="1//my-long-example-refresh-token-value";
 const r=encryptToken(secret,key);
 assert.notEqual(r.encrypted_refresh_token,secret);
 assert.equal(decryptToken(r,key),secret);
 assert.throws(()=>decryptToken({...r,tag:Buffer.alloc(16).toString("base64")},key));
 assert.throws(()=>decryptToken(r,randomBytes(32).toString("hex")));
});
test("Reject missing or weak encryption keys",()=>{
 assert.throws(()=>encryptToken("example-refresh-token","1234"));
 assert.throws(()=>decryptToken({encrypted_refresh_token:"x",nonce:"y",tag:"z"},"1234"));
});
