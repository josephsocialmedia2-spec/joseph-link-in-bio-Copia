/* OCME shared Visual Mnemonic Engine 5.0 — local, no dependencies */
window.OCMEVisualEngine=(function(){
"use strict";
const palette=["#bc6cff","#95f82c","#ffda39","#14e7ff","#ff60ad","#ff843c"];
const directions=["right","left","bottom","top"];
function positions(n){return Array.from({length:n},(_,i)=>{const a=-Math.PI/2+2*Math.PI*i/n;return{x:50+39*Math.cos(a),y:50+38*Math.sin(a)}})}
function graph(groups){const list=[],ids=new Set();for(const g of groups){if(!g.id||!g.items?.length)throw Error("Ramo senza schede");for(const item of g.items){if(ids.has(item.id))throw Error("ID duplicato");ids.add(item.id);list.push({...item,group:g.id,index:list.length})}}return list}
function reveal(previous,index,count){return Math.max(previous||0,Math.min(count,index+1))}
const earth='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 270" aria-hidden="true"><path d="M44 132Q4 36 101 44M304 55Q389 60 363 159M111 230Q195 285 290 230" fill="none" stroke="#e9ff36" stroke-width="9" stroke-linecap="round"/><circle cx="200" cy="135" r="104" fill="#6b38f7" stroke="#19142c" stroke-width="9"/><path d="M112 94L146 51 181 61 195 86 167 105 179 127 145 146 106 125Z M203 155L236 143 253 163 245 184 230 222 198 227 185 190Z M255 59L290 80 304 115 268 124 239 102Z" fill="#b7ff29" stroke="#19142c" stroke-width="5"/><ellipse cx="164" cy="119" rx="26" ry="32" fill="#fff" stroke="#19142c" stroke-width="6"/><ellipse cx="225" cy="116" rx="26" ry="32" fill="#fff" stroke="#19142c" stroke-width="6"/><circle cx="173" cy="126" r="11" fill="#19142c"/><circle cx="216" cy="124" r="11" fill="#19142c"/><path d="M164 169Q204 213 243 162Q206 179 164 169Z" fill="#ff55a5" stroke="#19142c" stroke-width="6"/><path d="M107 166L65 208 37 198M294 162L336 207 368 193" fill="none" stroke="#ff61a9" stroke-width="16" stroke-linecap="round"/><path d="M53 37L70 12 87 35 78 51Z M326 25L343 2 362 23 349 46Z" fill="#ffeb35" stroke="#19142c" stroke-width="4"/></svg>';
const css=`
body.ocme-visual-open {margin:0;background:#100e22 !important}
body.ocme-visual-open>#toolbar,body.ocme-visual-open>main{display:none!important}
.ocv[hidden]{display:none!important}
.ocv{--ink:#130f26;--mut:#c1bce0;--lime:#baff39;--pink:#ff6bc6;--panel:#22193a;--line:#514178;position:relative;color:#f8f6ff;background:#100e22;min-height:100vh;font:16px/1.45 system-ui,Segoe UI,sans-serif;box-sizing:border-box}
.ocv *{box-sizing:border-box}
.ocv button,.ocv select{font:inherit;color:inherit}
.ocv button{cursor:pointer}
.ocv button:focus-visible,.ocv select:focus-visible{outline:3px solid #fff;outline-offset:4px}
.ocv-toolbar{position:sticky;top:0;z-index:30;background:#19142e;border-bottom:1px solid #514178;padding:10px clamp(10px,2vw,30px);display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.ocv-brand{font-size:13px;font-weight:900;letter-spacing:.08em;margin-right:auto;color:#baff39;white-space:nowrap}
.ocv-btn,.ocv-select{border:1px solid #6d5d91;border-radius:9px;background:#2d2347;color:white;padding:8px 11px;min-height:39px;font-size:13px!important}
.ocv-btn:hover,.ocv-btn[aria-pressed=true]{border-color:#baff39;background:#3a3150}
.ocv-btn.primary{background:#baff39;border-color:#baff39;color:#100e22;font-weight:900}
.ocv-btn:disabled{opacity:.4;cursor:default}
.ocv-progress{height:4px;background:#32284b;flex-basis:100%;overflow:hidden;border-radius:9px}
.ocv-progress>div{height:100%;width:0;background:linear-gradient(90deg,#bd6aff,#ff55ba,#baff39);transition:width .25s}
.ocv-subbar{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:13px clamp(12px,3vw,40px) 0;flex-wrap:wrap}
.ocv-kicker{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#baff39;font-weight:800}
.ocv-heading{font-size:clamp(20px,3vw,34px);margin:3px 0;font-weight:900;line-height:1.12}
.ocv-count{color:#c1bce0;font-size:12px}
.ocv-map-scroll{overflow:auto;overscroll-behavior:contain;padding:5px 10px 10px}
.ocv-map{position:relative;width:min(100%,1180px);min-width:760px;aspect-ratio:1000/610;min-height:460px;margin:0 auto;isolation:isolate;background:radial-gradient(ellipse at center,#302150 0%,#18142c 55%,#100e22 80%);border:1px solid #392d56;border-radius:22px;overflow:hidden}
.ocv-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
.ocv-line{stroke-dasharray:1000;stroke-dashoffset:0;animation:ocv-draw .55s ease-out both}
@keyframes ocv-draw{from{stroke-dashoffset:1000;opacity:.1}to{stroke-dashoffset:0;opacity:.8}}
.ocv-node{position:absolute;z-index:2;width:clamp(91px,12%,139px);transform:translate(-50%,-50%);border:2px solid var(--accent);border-radius:15px;padding:5px;background:#221b38;box-shadow:0 4px 0 #090716;color:white;display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center}
.ocv-node[aria-current=true]{border-color:#efffb1;outline:4px solid var(--accent);box-shadow:0 0 23px var(--accent);z-index:4}
.ocv-node:hover{z-index:5;outline:2px solid #fff}
.ocv-thumb{width:100%;aspect-ratio:400/260;overflow:hidden;border-radius:10px;background:#fff;display:grid;place-items:center}
.ocv-art svg,.ocv-art img{display:block;width:100%;height:100%;object-fit:contain}
.ocv-art svg{filter:invert(.93) hue-rotate(135deg) saturate(2.4) contrast(1.13)}
.ocv[data-palette=acid] .ocv-art svg{filter:hue-rotate(70deg) saturate(2.25) contrast(1.1)}
.ocv[data-palette=original] .ocv-art svg{filter:none}
.ocv-label{font-size:clamp(10px,1.15vw,13px);font-weight:900;line-height:1.08;overflow-wrap:anywhere}
.ocv[data-labels=off] .ocv-label,.ocv[data-labels=off] .ocv-center-label{display:none}
.ocv-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:clamp(220px,35%,395px);z-index:3;border:3px solid var(--accent,#baff39);background:#211936;border-radius:24px;padding:10px;box-shadow:0 8px 0 #070614,0 0 26px #7154c740}
.ocv-center-art{aspect-ratio:400/260;overflow:hidden;border-radius:15px;background:#fff;display:grid;place-items:center}
.ocv-center-label{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:7px 3px 0;font-weight:900;font-size:clamp(13px,1.65vw,22px)}
.ocv-center-label small{font-size:11px;color:#c8bfeb;font-weight:600}
.ocv-enter-right{--dx:60px;--dy:0px}.ocv-enter-left{--dx:-60px;--dy:0px}.ocv-enter-bottom{--dx:0px;--dy:55px}.ocv-enter-top{--dx:0px;--dy:-55px}
.ocv-arrive{animation:ocv-arrive .42s cubic-bezier(.16,.83,.27,1) both;animation-delay:var(--delay,0ms)}
@keyframes ocv-arrive{from{opacity:0;translate:var(--dx,0px) var(--dy,0px);scale:.87}to{opacity:1;translate:0 0;scale:1}}
.ocv-caption{margin:8px auto 0;max-width:1000px;min-height:0;padding:8px 16px;color:#fff;background:#211936;border-radius:10px;line-height:1.6}
.ocv-caption[hidden]{display:none}
.ocv-caption mark{background:#baff39;color:#130f26}
.ocv-bottom{display:flex;justify-content:center;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 12px 18px}
.ocv-status{font-size:12px;color:#c1bce0;max-width:950px;margin:0 auto;padding:0 12px 16px;text-align:center}
.ocv-dialog{color:#f8f6ff;background:#211936;border:1px solid #7c67a7;border-radius:16px;width:min(800px,94vw);max-height:90vh;overflow:auto;padding:18px;font:16px/1.6 system-ui,sans-serif}
.ocv-dialog::backdrop{background:#080611c9}
.ocv-dialog h2{margin:12px 0;font-size:24px}
.ocv-dialog .ocv-art{width:min(100%,480px);margin:auto;background:white;border-radius:12px;overflow:hidden}
.ocv-dialog p{margin:12px 0}
.ocv-legacy-return{background:#baff39!important;color:#1a1330!important;font-weight:800!important}
.ocv[data-motion=off] *{animation:none!important;transition:none!important;scroll-behavior:auto!important}
@media(prefers-reduced-motion:reduce){.ocv *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media(max-width:760px){.ocv-map-scroll{padding:8px;scrollbar-color:#8e69bd #1f1835}.ocv-map{min-width:680px;min-height:414px}.ocv-toolbar{gap:5px}.ocv-brand{flex-basis:100%}.ocv-btn,.ocv-select{padding:6px 8px}.ocv-heading{font-size:23px}.ocv-subbar{padding-top:9px}}
@media print{.ocv{display:none!important}body.ocme-visual-open>main{display:block!important}}
`;
function mount(config){
const groups=config.groups,list=graph(groups),byId=new Map(list.map(x=>[x.id,x])),byGroup=new Map(groups.map(g=>[g.id,g]));
const key="ocme-visual-v1:"+config.id;
const read=()=>{try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return{}}};
let pref=read();let paletteMode=["inverse","acid","original"].includes(pref.palette)?pref.palette:"inverse",labels=pref.labels!==false,motion=pref.motion!==false,caption=false;
let revealed={...pref.revealed},current=list.find(x=>x.id===pref.current)?.index??0,view="overview",isOpen=false,timer=null,transition=0;
const store=()=>{try{localStorage.setItem(key,JSON.stringify({palette:paletteMode,labels,motion,current:list[current].id,revealed}))}catch{}};
const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
const button=(txt,fn,cls="")=>{const n=e("button",txt,"ocv-btn "+cls);n.type="button";n.addEventListener("click",fn);return n};
const style=e("style");style.id="ocme-visual-engine-style";style.textContent=css;if(!document.getElementById(style.id))document.head.append(style);
const root=e("section",null,"ocv");root.id="ocme-visual-first";root.hidden=true;root.setAttribute("aria-label","Mappa mnemonica interattiva");
const toolbar=e("header",null,"ocv-toolbar"),progress=e("div",null,"ocv-progress"),fill=e("div");progress.append(fill);
const barTitle=e("div","OCME STUDIO · "+config.title,"ocv-brand");
const play=button("▶ Lezione",()=>{stopBuild();if(config.audio.state().paused){config.audio.pause();return}if(config.audio.state().playing)return;focus(current);config.audio.start(current,false)},"primary");
const pause=button("Ⅱ Pausa",()=>config.audio.pause()),stop=button("■ Stop",()=>{config.audio.stop();stopBuild();refreshAudio()});
const prev=button("‹",()=>navigate(-1)),next=button("›",()=>navigate(1));
prev.setAttribute("aria-label","Scena precedente");next.setAttribute("aria-label","Scena successiva");
const speed=e("select",null,"ocv-select");speed.setAttribute("aria-label","Velocità audio");for(const v of ["0.6","0.8","1","1.2","1.4"]){const o=e("option",v+"×");o.value=v;speed.append(o)}speed.value=config.audio.speed();speed.onchange=()=>config.audio.setSpeed(speed.value);
const captionBtn=button("Sottotitoli",()=>{caption=!caption;captionBox.hidden=!caption;captionBtn.setAttribute("aria-pressed",String(caption))});captionBtn.setAttribute("aria-pressed","false");
const tools=button("Strumenti",()=>close("tools")),theory=button("Teoria",()=>close("theory"));
const full=button("Schermo intero",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen()}catch{status.textContent="Schermo intero non disponibile."}});
toolbar.append(barTitle,play,pause,stop,prev,next,speed,captionBtn,theory,tools,full,progress);
const sub=e("div",null,"ocv-subbar"),headingArea=e("div"),kicker=e("div","O · Mappa generale","ocv-kicker"),heading=e("h1",config.title,"ocv-heading"),count=e("span","","ocv-count");headingArea.append(kicker,heading,count);
const back=button("Mappa generale",()=>{stopBuild();if(config.audio.state().playing)config.audio.stop();view="overview";render()});
sub.append(headingArea,back);
const scroller=e("div",null,"ocv-map-scroll"),map=e("div",null,"ocv-map");scroller.append(map);
const captionBox=e("div",null,"ocv-caption");captionBox.hidden=true;
const bottom=e("div",null,"ocv-bottom");
const build=button("Costruisci mappa",()=>{if(view==="overview"){focus(current);return buildBranch()}buildBranch()});
const listen=button("Ascolta scena",()=>{stopBuild();focus(current);config.audio.start(current,true)});
const more=button("Dettagli",()=>openDetails());
const labelBtn=button("Solo immagini",()=>{labels=!labels;settings()});
const colorBtn=button("Palette: invertita",()=>{paletteMode=({inverse:"acid",acid:"original",original:"inverse"})[paletteMode];settings()});
const motionBtn=button("Movimento: sì",()=>{motion=!motion;settings()});
bottom.append(build,listen,more,labelBtn,colorBtn,motionBtn);
const status=e("div","Seleziona un ramo per iniziare.","ocv-status");status.setAttribute("role","status");
root.append(toolbar,sub,scroller,captionBox,bottom,status);config.anchor.before(root);
function settings(){root.dataset.palette=paletteMode;root.dataset.labels=labels?"on":"off";root.dataset.motion=motion?"on":"off";labelBtn.setAttribute("aria-pressed",String(!labels));colorBtn.textContent="Palette: "+({inverse:"invertita",acid:"acida",original:"originale"})[paletteMode];motionBtn.textContent="Movimento: "+(motion?"sì":"no");motionBtn.setAttribute("aria-pressed",String(motion));store()}
function art(node,source){const picture=typeof source==="function"?source():source;if(picture instanceof Node){const copy=picture.cloneNode(true);copy.removeAttribute?.("id");copy.querySelectorAll?.("[id]").forEach(n=>n.removeAttribute("id"));node.append(copy)}else if(typeof picture==="string"&&picture.startsWith("<svg"))node.innerHTML=picture;else node.textContent="Immagine non disponibile"}
function line(svg,p,color,delay){const n=document.createElementNS("http://www.w3.org/2000/svg","path");const x=p.x*10,y=p.y*6.1;n.setAttribute("d",`M500 305 Q${500+(x-500)*.44} ${305+(y-305)*.08} ${x} ${y}`);n.setAttribute("fill","none");n.setAttribute("stroke",color);n.setAttribute("stroke-width","4");n.setAttribute("stroke-linecap","round");n.setAttribute("pathLength","1000");n.setAttribute("class","ocv-line");n.style.animationDelay=delay+"ms";svg.append(n)}
function addNode(item,p,color,i,overview,animate=true){const n=button("",()=>{stopBuild();if(overview){const first=list.find(x=>x.group===item.id);select(first.index)}else select(item.index)});n.className="ocv-node"+(animate?" ocv-arrive ocv-enter-"+directions[i%4]:"");n.style.setProperty("--accent",color);n.style.setProperty("--delay",overview?i*75+"ms":"0ms");n.style.left=p.x+"%";n.style.top=p.y+"%";n.setAttribute("aria-label",item.title);n.setAttribute("title",item.title);n.setAttribute("aria-current",String(!overview&&item.index===current));n.dataset.node=item.id;
const thumb=e("div",null,"ocv-art ocv-thumb");art(thumb,item.image);n.append(thumb,e("span",item.short||item.title,"ocv-label"));map.append(n)}
function center(item,overview,animate){const c=e("div",null,"ocv-center"+(animate?" ocv-arrive ocv-enter-"+directions[transition++%4]:""));c.style.setProperty("--accent",overview?"#baff39":palette[groups.findIndex(g=>g.id===item.group)%palette.length]);const pic=e("div",null,"ocv-center-art ocv-art");art(pic,overview?(config.centralImage||earth):item.image);const title=e("div",null,"ocv-center-label");title.append(e("span",overview?config.title:item.short||item.title),e("small",overview?groups.length+" rami":(current+1)+" / "+list.length));c.append(pic,title);map.append(c)}
function render(animate=true){map.replaceChildren();const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("class","ocv-lines");svg.setAttribute("viewBox","0 0 1000 610");svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("aria-hidden","true");map.append(svg);const overview=view==="overview",item=list[current],g=byGroup.get(item.group);
const nodes=overview?groups:list.filter(x=>x.group===g.id),p=positions(nodes.length),n=overview?nodes.length:Math.min(nodes.length,revealed[g.id]||1);
for(let i=0;i<n;i++){const color=palette[(overview?i:groups.indexOf(g)+i)%palette.length];line(svg,p[i],color,overview&&animate?i*75:0);addNode(nodes[i],p[i],color,i,overview,animate)}
center(item,overview,animate);
kicker.textContent=overview?"O · Mappa generale":"Mappa in costruzione · "+g.id;
heading.textContent=overview?config.title:g.title;
count.textContent=overview?groups.length+" rami · "+list.length+" scene":n+" / "+nodes.length+" nodi";
back.hidden=overview;build.disabled=!overview&&n===nodes.length;listen.disabled=overview;more.disabled=overview;prev.disabled=current===0&&!overview;next.disabled=current===list.length-1&&!overview;store();refreshAudio()}
function focus(index,animate=true){current=Math.max(0,Math.min(list.length-1,index));const item=list[current],g=byGroup.get(item.group),local=g.items.findIndex(x=>x.id===item.id);view="branch";revealed[g.id]=reveal(revealed[g.id],local,g.items.length);render(animate)}
function select(index){const was=config.audio.state();focus(index);if(was.playing)config.audio.start(index,was.single)}
function navigate(d){stopBuild();select(Math.max(0,Math.min(list.length-1,current+d)))}
function stopBuild(){if(timer!==null){clearTimeout(timer);timer=null}}
function buildBranch(){stopBuild();if(config.audio.state().playing)config.audio.stop();const group=list[current].group,g=byGroup.get(group),nodes=list.filter(x=>x.group===group);let step=revealed[group]||1;const nextStep=()=>{if(step>=nodes.length){timer=null;return}focus(nodes[step].index);step++;timer=setTimeout(nextStep,motion?620:80)};nextStep()}
function openDetails(){const item=list[current];const d=e("dialog",null,"ocv-dialog"),closeBtn=button("Chiudi",()=>d.close());const pic=e("div",null,"ocv-art");art(pic,item.image);d.append(closeBtn,e("h2",item.title),pic);for(const t of config.details(item))d.append(e("p",t));d.addEventListener("close",()=>d.remove());document.body.append(d);d.showModal()}
function refreshAudio(){const a=config.audio.state();play.disabled=!!a.playing&&!a.paused;play.textContent=a.paused?"▶ Riprendi":"▶ Lezione";pause.disabled=!a.playing;pause.textContent=a.paused?"▶ Riprendi":"Ⅱ Pausa";stop.disabled=!a.playing;fill.style.width=a.progress||"0%";status.textContent=a.status||"Seleziona un ramo.";if(caption){captionBox.replaceChildren();const cap=config.audio.caption();if(cap)captionBox.append(...Array.from(cap.childNodes).map(n=>n.cloneNode(true)))}}
function open(){isOpen=true;root.hidden=false;document.body.classList.add("ocme-visual-open");settings();render(false);window.scrollTo({top:0,behavior:"auto"});requestAnimationFrame(()=>{if(scroller.scrollWidth>scroller.clientWidth)scroller.scrollLeft=(scroller.scrollWidth-scroller.clientWidth)/2})}
function close(target){stopBuild();isOpen=false;root.hidden=true;document.body.classList.remove("ocme-visual-open");config.onLegacy(target,list[current]);}
function follow(index){stopBuild();if(index<0||index>=list.length)return;if(isOpen)focus(index);else{current=index;const g=byGroup.get(list[index].group);revealed[g.id]=reveal(revealed[g.id],g.items.findIndex(x=>x.id===list[index].id),g.items.length);store()}}
let queued=false;const observer=new MutationObserver(()=>{if(!isOpen||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refreshAudio()})});if(config.audio.watch)observer.observe(config.audio.watch,{childList:true,subtree:true,characterData:true,attributes:true});
root.addEventListener("keydown",ev=>{if(["INPUT","SELECT","TEXTAREA","BUTTON"].includes(ev.target.tagName))return;if(ev.key==="ArrowRight"){ev.preventDefault();navigate(1)}if(ev.key==="ArrowLeft"){ev.preventDefault();navigate(-1)}});
settings();isOpen=true;root.hidden=false;document.body.classList.add("ocme-visual-open");render(true);requestAnimationFrame(()=>{if(scroller.scrollWidth>scroller.clientWidth)scroller.scrollLeft=(scroller.scrollWidth-scroller.clientWidth)/2});
return {open,close,follow,refreshAudio,isOpen:()=>isOpen,root,select};
}
return {mount,positions,graph,reveal,version:"5.0"};
})();
