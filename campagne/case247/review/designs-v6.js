/* CASE IN PUBBLICITÀ 24/7 — Sei layout social 1080×1350.
   Ogni variante cambia realmente la composizione, non solo la palette.
   Usa esclusivamente fotografie dell'annuncio e ritratto approvato. */
(function(global){
"use strict";
const W=1080,H=1350;
const PANORAMA="https://upload.wikimedia.org/wikipedia/commons/6/6f/Lago_Grande_di_Avigliana_%281%29.jpg";
const PANORAMA_CREDIT="Panorama Avigliana: Tournasol7 / CC BY 4.0";
const OPTIONS=[
 {id:1,title:"Evidenza territoriale",note:"Panorama + fascia blu + immobile protagonista"},
 {id:2,title:"Eleganza blu e oro",note:"Cornici oro, tipografia elegante"},
 {id:3,title:"Prestige notturno",note:"Fondo scuro e luci azzurre"},
 {id:4,title:"Editoriale bianco",note:"Spazi bianchi, fotografia e testo distinti"},
 {id:5,title:"Impatto commerciale",note:"Titolo forte e fotografia dominante"},
 {id:6,title:"Personal brand",note:"Joseph protagonista con annuncio"}
];
const cache=new Map();
function loadImage(url){
 if(!url)return Promise.reject(Error("Immagine non specificata"));
 if(cache.has(url))return cache.get(url);
 const prom=new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin="anonymous";im.onload=()=>im.naturalWidth>0?resolve(im):reject(Error("Immagine vuota"));im.onerror=()=>reject(Error("Immagine non disponibile: "+url));im.src=url});
 cache.set(url,prom);return prom;
}
function cover(ctx,im,x,y,w,h,fx=.5,fy=.5){
 const s=Math.max(w/im.width,h/im.height),sw=w/s,sh=h/s;
 const sx=Math.max(0,Math.min(im.width-sw,(im.width-sw)*fx)),sy=Math.max(0,Math.min(im.height-sh,(im.height-sh)*fy));
 ctx.drawImage(im,sx,sy,sw,sh,x,y,w,h);
}
function fill(ctx,x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function stroke(ctx,x,y,w,h,color,r=0,line=2){ctx.strokeStyle=color;ctx.lineWidth=line;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke()}
function grad(ctx,x,y,w,h,a,b,horiz=false){
 const g=ctx.createLinearGradient(x,y,horiz?x+w:x,horiz?y:y+h);g.addColorStop(0,a);g.addColorStop(1,b);fill(ctx,x,y,w,h,g);return g;
}
function text(ctx,s,x,y,size,color="#fff",bold=true,maxWidth=null,align="left"){
 ctx.fillStyle=color;ctx.font=(bold?"800 ":"400 ")+size+"px Arial, sans-serif";ctx.textAlign=align;ctx.textBaseline="alphabetic";
 if(maxWidth)ctx.fillText(String(s??""),x,y,maxWidth);else ctx.fillText(String(s??""),x,y);ctx.textAlign="left";
}
function fitLines(ctx,s,maxWidth,fontSize,maxLines=3){
 const source=String(s||"ANNUNCIO IMMOBILIARE").trim();
 let size=fontSize,lines=[];
 for(let k=0;k<12;k++){
  ctx.font="800 "+size+"px Arial, sans-serif";lines=[];let line="";
  for(const word of source.split(/\s+/)){const next=(line+" "+word).trim();if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word}else line=next}
  if(line)lines.push(line);
  if(lines.length<=maxLines)break;size-=3;
 }
 return {lines:lines.slice(0,maxLines),size:Math.max(24,size)};
}
function titleLines(ctx,s,x,y,w,size=51,color="#fff",max=3,lineHeight=1.13){
 const d=fitLines(ctx,s,w,size,max);d.lines.forEach((line,i)=>text(ctx,line,x,y+i*d.size*lineHeight,d.size,color,true,w));return y+(d.lines.length-1)*d.size*lineHeight;
}
function waves(ctx,y,navy,accent){
 ctx.save();ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(260,y-55,620,y+55,W,y-12);ctx.lineTo(W,y+105);ctx.bezierCurveTo(650,y+112,345,y+5,0,y+110);ctx.closePath();ctx.fillStyle=navy;ctx.fill();
 ctx.strokeStyle=accent;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(260,y-55,620,y+55,W,y-12);ctx.stroke();ctx.restore();
}
function halo(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r)}
function badge(ctx,label,x,y,w,h,c1="#0879c7",c2="#063a70",light="#fff"){
 const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,c1);g.addColorStop(1,c2);fill(ctx,x,y,w,h,g,18);
 stroke(ctx,x,y,w,h,"rgba(255,255,255,.55)",18,2);
 text(ctx,label,x+w/2,y+h*.71,h*.52,light,true,w-26,"center");
}
function tiny(ctx,message,baseY,color="#d9e9f6"){
 text(ctx,message,40,baseY,18,color,false,1000);
}
function label(ctx,str,x,y,color="#fff",size=25){text(ctx,str,x,y,size,color,true)}
function photo(ctx,img,x,y,w,h,r=18,fx=.5,fy=.5){
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();cover(ctx,img,x,y,w,h,fx,fy);ctx.restore();
}
function circlePhoto(ctx,img,cx,cy,r,border="#b1e8ff"){
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();cover(ctx,img,cx-r,cy-r,r*2,r*2,.5,.1);ctx.restore();
 ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=border;ctx.lineWidth=6;ctx.stroke();
}
function mountain(ctx,top,base,color="#4ba0bd"){
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,base);
 [[0,base-55],[120,top+125],[250,top+25],[380,top+105],[490,top-10],[645,top+140],[760,top+20],[875,top+85],[1080,top+10],[1080,base]].forEach(p=>ctx.lineTo(...p));
 ctx.closePath();ctx.fill();
}
function intro(ctx,color="#fff",sub="#cbefff"){
 text(ctx,"CASE IN PUBBLICITÀ",47,83,34,color,true,770);
 text(ctx,"24/7",825,84,57,"#12c2ff",true,235);
 text(ctx,"AVIGLIANA E TERRITORIO CIRCOSTANTE",48,119,18,sub,false);
}
function footer(ctx,item,pal){
 const line=pal?.line||"#0795e3",bg=pal?.bg||"#06294b",fg=pal?.fg||"#fff";
 fill(ctx,0,1210,W,140,bg);fill(ctx,0,1210,W,5,line);
 text(ctx,"Joseph Malafronte · Digital Strategist",42,1248,23,fg,true,800);
 text(ctx,"Partner commerciale di Immobiliare La Sacra",42,1279,18,fg,false,850);
 text(ctx,"WhatsApp 371 370 8294",42,1313,25,"#fff",true);
 text(ctx,"Marketing e pubblicità · Mediazione a cura di professionisti abilitati",530,1331,15,fg,false,530);
}
function renderQR(ctx,url,x=914,y=1209,size=113){
 if(!global.QRCode||!/^https:\/\/lasacraimmobiliare\.it\/products\//.test(String(url||"")))return false;
 const div=document.createElement("div");
 div.style.cssText="position:absolute;left:-9999px;top:-9999px";
 document.body.appendChild(div);
 try{
  new global.QRCode(div,{text:url,width:256,height:256,colorDark:"#000000",colorLight:"#ffffff",correctLevel:global.QRCode.CorrectLevel.L});
  const canvas=div.querySelector("canvas");if(!canvas)return false;
  fill(ctx,x-9,y-9,size+18,size+18,"#fff",8);
  ctx.drawImage(canvas,x,y,size,size);return true;
 }finally{div.remove()}
}
function addQR(ctx,item,x=914,y=1220,size=100){return renderQR(ctx,item.listing_url,x,y,size)}
function legal(ctx,color="#c7dcf3"){text(ctx,"Foto immobile: catalogo La Sacra. Prezzo e disponibilità da confermare.",42,1186,16,color,false,980)}
function classicHead(ctx){grad(ctx,0,0,W,210,"#061e44","#057bc2",true)}
function showPano(ctx,pano,x,y,w,h,blend){if(pano){photo(ctx,pano,x,y,w,h,0);if(blend)fill(ctx,x,y,w,h,blend)}else{grad(ctx,x,y,w,h,"#1d5689","#78c6f2",true);mountain(ctx,y+55,y+h,"#3f8eb9")}}
function styleTerritorio(ctx,item,img,portrait,pano){
 grad(ctx,0,0,W,H,"#eff9ff","#d7eefe");showPano(ctx,pano,0,0,W,310,"rgba(1,28,70,.48)");waves(ctx,135,"rgba(0,45,100,.93)","#1fc2ff");
 intro(ctx);text(ctx,"IMMOBILE IN EVIDENZA",45,251,43,"#fff",true,925);
 photo(ctx,img,36,330,1008,670,20,.5,.48);stroke(ctx,36,330,1008,670,"#7ad8ff",20,6);
 fill(ctx,0,983,W,230,"#f4faff");fill(ctx,0,983,W,7,"#0585d4");
 text(ctx,item.town.toUpperCase(),46,1033,26,"#0873b4",true,700);
 titleLines(ctx,item.listing_title,44,1098,800,43,"#081e3b",2,1.12);
 badge(ctx,item.price_label||"PREZZO SU RICHIESTA",770,1034,272,83);
 if(portrait)circlePhoto(ctx,portrait,949,245,98);
 text(ctx,"Joseph Malafronte",735,158,25,"#fff",true,270);legal(ctx,"#27435c");footer(ctx,item);
 addQR(ctx,item);
}
function styleOro(ctx,item,img,portrait,pano){
 grad(ctx,0,0,W,H,"#03101f","#173b5c");halo(ctx,835,255,390,"rgba(255,184,40,.14)");
 stroke(ctx,18,15,1044,1318,"#e7bb65",18,7);stroke(ctx,28,25,1024,1298,"#8e6523",16,2);
 showPano(ctx,pano,50,147,980,165,"rgba(4,16,33,.62)");
 text(ctx,"CASE IN PUBBLICITÀ",53,92,35,"#fff",true);text(ctx,"24/7",817,100,54,"#f8ce74",true);
 photo(ctx,img,52,344,976,666,20);stroke(ctx,52,344,976,666,"#d2a54b",20,5);
 fill(ctx,50,936,980,96,"rgba(3,17,37,.92)");text(ctx,item.town.toUpperCase(),73,991,30,"#e8c37a",true);
 titleLines(ctx,item.listing_title,57,1100,650,45,"#fff",2);
 badge(ctx,item.price_label||"PREZZO SU RICHIESTA",732,1054,292,94,"#f0bb53","#8a5d17","#10213c");
 if(portrait)circlePhoto(ctx,portrait,900,226,80,"#e7be73");
 text(ctx,"SELEZIONE IMMOBILIARE",64,281,25,"#fff",true);
 legal(ctx,"#d3c8a4");footer(ctx,item,{line:"#d7a958",bg:"#07152b",fg:"#f3e4c8"});
 addQR(ctx,item);
}
function styleNotte(ctx,item,img,portrait,pano){
 grad(ctx,0,0,W,H,"#010817","#071f46");halo(ctx,160,440,370,"rgba(0,180,255,.15)");halo(ctx,995,600,330,"rgba(0,114,255,.18)");
 ctx.strokeStyle="#03c7ff";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,110);ctx.bezierCurveTo(380,46,665,151,1080,55);ctx.stroke();
 intro(ctx,"#fff","#84d6ff");
 ctx.save();ctx.beginPath();ctx.moveTo(55,221);ctx.lineTo(1020,208);ctx.lineTo(1020,951);ctx.quadraticCurveTo(485,1004,58,960);ctx.closePath();ctx.clip();cover(ctx,img,30,205,1040,780);ctx.restore();
 ctx.strokeStyle="#07c9fa";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(55,221);ctx.lineTo(1020,208);ctx.lineTo(1020,951);ctx.quadraticCurveTo(485,1004,58,960);ctx.closePath();ctx.stroke();
 fill(ctx,0,936,W,275,"rgba(1,12,29,.94)");
 text(ctx,"PRESTIGE · "+item.town.toUpperCase(),55,1005,28,"#48d8ff",true);
 titleLines(ctx,item.listing_title,52,1073,693,49,"#fff",2,1.13);
 badge(ctx,item.price_label||"PREZZO SU RICHIESTA",742,1057,291,91,"#009bd1","#09366a");
 if(portrait)circlePhoto(ctx,portrait,937,151,69,"#29d7ff");
 legal(ctx,"#d0ecf7");footer(ctx,item,{line:"#05dfff",bg:"#020b1d",fg:"#d2edff"});
 addQR(ctx,item);
}
function styleBianco(ctx,item,img,portrait,pano){
 fill(ctx,0,0,W,H,"#fff");ctx.fillStyle="#eef8ff";ctx.beginPath();ctx.moveTo(660,0);ctx.lineTo(1080,0);ctx.lineTo(1080,320);ctx.closePath();ctx.fill();
 text(ctx,"CASE IN PUBBLICITÀ",47,100,42,"#092e5a",true);text(ctx,"24/7",810,100,63,"#067fd0",true);
 fill(ctx,46,124,968,5,"#06a8e7");text(ctx,"SELEZIONE IMMOBILIARE · "+item.town.toUpperCase(),52,189,24,"#146fa4",true);
 photo(ctx,img,455,245,585,745,16);stroke(ctx,455,245,585,745,"#86cdeb",16,5);
 fill(ctx,44,236,386,728,"#f1f7fd",18);
 titleLines(ctx,item.listing_title,65,339,340,43,"#072e58",4,1.19);
 text(ctx,"LA TUA PROSSIMA OPPORTUNITÀ",66,254,19,"#1380c6",true,326);
 badge(ctx,item.price_label||"PREZZO SU RICHIESTA",65,765,340,93);
 if(portrait)circlePhoto(ctx,portrait,234,919,81,"#2aa9df");
 text(ctx,"Joseph Malafronte",46,1057,30,"#08345e",true,420);text(ctx,"Digital Strategist",48,1092,24,"#29678d",false);
 text(ctx,"Marketing e promozione in collaborazione",465,1070,23,"#174b72",true);text(ctx,"con Immobiliare La Sacra",465,1104,23,"#174b72",true);
 legal(ctx,"#456174");footer(ctx,item,{line:"#23bce4",bg:"#073d68",fg:"#fff"});addQR(ctx,item);
}
function styleImpatto(ctx,item,img,portrait,pano){
 grad(ctx,0,0,W,H,"#0479e2","#042451");photo(ctx,img,0,195,W,815,0,.53,.48);
 const overlay=ctx.createLinearGradient(0,290,0,1020);overlay.addColorStop(0,"rgba(0,33,79,.23)");overlay.addColorStop(1,"rgba(2,18,47,.91)");fill(ctx,0,195,W,815,overlay);
 fill(ctx,0,0,W,195,"#052a5e");intro(ctx);
 fill(ctx,0,185,W,20,"#19b6ff");text(ctx,"IN EVIDENZA",44,285,54,"#fff",true);
 fill(ctx,25,825,1030,367,"rgba(1,26,65,.92)",22);
 text(ctx,item.town.toUpperCase(),56,894,27,"#35d1ff",true);
 titleLines(ctx,item.listing_title,53,962,775,58,"#fff",3,1.08);
 badge(ctx,item.price_label||"PREZZO SU RICHIESTA",648,1101,367,77,"#00b8ed","#05447c");
 if(portrait)circlePhoto(ctx,portrait,953,116,75,"#fff");
 legal(ctx,"#d5eeff");footer(ctx,item,{line:"#05b4f8",bg:"#07305e"});addQR(ctx,item);
}
function stylePersonal(ctx,item,img,portrait,pano){
 grad(ctx,0,0,W,H,"#e9f8ff","#a0d9f4");showPano(ctx,pano,0,0,W,267,"rgba(1,34,69,.57)");
 waves(ctx,178,"#073868","#36cfff");intro(ctx);
 fill(ctx,24,286,1032,718,"#fff",25);
 photo(ctx,img,418,304,616,676,18,.5,.5);stroke(ctx,418,304,616,676,"#078cdb",18,6);
 grad(ctx,39,305,365,675,"#063060","#0794d8",true);fill(ctx,40,304,365,2,"#76e0ff");
 if(portrait)circlePhoto(ctx,portrait,219,526,150,"#e9faff");
 text(ctx,"Joseph",72,763,55,"#fff",true);text(ctx,"Malafronte",70,813,48,"#fff",true);
 text(ctx,"Digital Strategist",74,858,29,"#c9f0ff",false);text(ctx,"PROMOZIONE 24/7",70,934,27,"#fff",true);
 fill(ctx,32,1010,1016,194,"#f7fcff",16);
 text(ctx,item.town.toUpperCase(),54,1053,23,"#066ca8",true);
 titleLines(ctx,item.listing_title,52,1110,690,38,"#0a2c50",2,1.04);
 badge(ctx,item.price_label||"PREZZO SU RICHIESTA",737,1064,288,95);
 legal(ctx,"#24485c");footer(ctx,item,{line:"#0ab8f2",bg:"#052c55"});addQR(ctx,item);
}
const LAYOUTS=[styleTerritorio,styleOro,styleNotte,styleBianco,styleImpatto,stylePersonal];
async function render(item,styleId,settings={}){
 const model=Number(styleId);
 if(!Number.isInteger(model)||model<1||model>6)throw Error("Modello grafico non valido");
 if(!item||!/^https:\/\/lasacraimmobiliare\.it\/products\//.test(item.listing_url||""))throw Error("Scheda originale La Sacra non valida");
 if(!/^https:\/\/cdn\.shopify\.com\//.test(item.image_url||""))throw Error("Foto sorgente non valida");
 const [img,portrait,pano]=await Promise.all([
  loadImage(item.image_url),
  loadImage(settings.portraitUrl||"").catch(()=>null),
  loadImage(settings.panoramaUrl||PANORAMA).catch(()=>null)
 ]);
 const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d",{alpha:false});
 LAYOUTS[model-1](ctx,item,img,portrait,pano);
 if(pano&&[1,2,6].includes(model))text(ctx,PANORAMA_CREDIT,552,1305,12,"#b4d5e8",false,480);
 return c.toDataURL("image/jpeg",.93);
}
global.CASE247_MODELS=Object.freeze({options:OPTIONS,render,version:"editorial-six-20261110-v1",panoramaCredit:PANORAMA_CREDIT});
})(window);
