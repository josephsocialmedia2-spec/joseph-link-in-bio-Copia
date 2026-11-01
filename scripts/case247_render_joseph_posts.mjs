import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const base="http://127.0.0.1:8731";
const assets=path.resolve("campagne/case247/auto-feed/review/joseph-personal/assets");
fs.mkdirSync(assets,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1500,height:1320},deviceScaleFactor:1});
const problems=[];
page.on("pageerror",e=>problems.push(e.message));
await page.goto(base+"/campagne/case247/auto-feed/review/joseph-personal/?render=1",{waitUntil:"networkidle"});
await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll("img")].map(img=>img.decode().catch(()=>{})));});
for(let number=1;number<=4;number++){
 const name=String(number).padStart(2,"0");
 const node=page.locator("#render-poster-"+name);
 if(await node.count()!==1)throw Error("MISSING_RENDER_NODE_"+name);
 const box=await node.boundingBox();
 if(!box||Math.round(box.width)!==1254||Math.round(box.height)!==1254)throw Error("WRONG_DIMENSIONS_"+name+"_"+JSON.stringify(box));
 const filepath=path.join(assets,"CASE247-JOSEPH-"+name+".jpg");
 await node.screenshot({path:filepath,type:"jpeg",quality:91,animations:"disabled"});
 const bytes=fs.statSync(filepath).size;
 if(bytes<20000)throw Error("EMPTY_OR_INVALID_JPEG_"+name+"_"+bytes);
 console.log("RENDER_OK",name,box.width,box.height,bytes);
}
if(problems.length)throw Error("PAGE_JS_ERRORS_"+problems.join(";").slice(0,1000));
await browser.close();
console.log("FOUR_GRAPHICS_RENDERED");
