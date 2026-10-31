#!/usr/bin/env python3
"""CASE247: zero-paid-API nightly draft renderer and unattended queue selector.
Creates proposals; NEVER sends posts to Meta. Photos must be approved local or free-license with attribution.
"""
import argparse, datetime as dt, hashlib, html, json, os, random, re, sys, textwrap, urllib.parse, urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance
from io import BytesIO
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[2]
HOME=ROOT/"campagne"/"case247"/"auto-feed"
BANK=ROOT/"campagne"/"case247"/"photo-bank"
TZ=ZoneInfo("Europe/Rome")
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BASE=dt.date(2026,11,1)
TOPICS=[
 ("Quanto vale la tua casa?","Il prezzo richiesto da altri venditori non è una valutazione. Contano caratteristiche, contesto e confronti pertinenti.","valutazione immobiliare"),
 ("Una casa racconta una storia.","Fotografie curate e un messaggio chiaro aiutano le persone a immaginare un nuovo inizio.","fotografie immobiliari"),
 ("Vendere casa richiede metodo.","Dalla presentazione alla promozione: ogni passaggio merita attenzione e organizzazione.","vendere casa"),
 ("La visibilità non nasce per caso.","Comunicare un immobile con continuità significa scegliere contenuti, pubblico e frequenza con criterio.","marketing immobiliare"),
 ("Il territorio fa la differenza.","Una casa si racconta anche attraverso i servizi, il contesto e le caratteristiche della zona.","mercato immobiliare locale"),
 ("Il primo sguardo conta.","Una presentazione ordinata mette in evidenza i punti di forza reali dell’immobile.","presentazione immobiliare")
]
QUERIES=["modern home interior living room photograph","modern residential architecture photographed","bright apartment living room photo","mountain house interior architectural photography","residential house garden photography"]
ALLOWED=("cc0","public domain","public domain mark","pd-self","pd-author")
UA="CASE247-public-editor/1.0 (automated free-media license verification)"
def req(url,timeout=15):
    return urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=timeout).read()
def atomic_json(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def font(sz,bold=True):
    return ImageFont.truetype(BOLD if bold else FONT,sz)
def wrap(draw,txt,f,max_width):
    lines=[]; part=""
    for word in txt.split():
        candidate=(part+" "+word).strip()
        if draw.textbbox((0,0),candidate,font=f)[2]>max_width and part:
            lines.append(part);part=word
        else:part=candidate
    if part:lines.append(part)
    return lines
def strip_tags(s):
    return re.sub(r"<[^>]*>","",html.unescape(s or "")).strip()
def photos_local():
    result=[]
    for p in sorted(BANK.glob("*")):
        if p.suffix.lower() not in (".jpg",".jpeg",".png",".webp"):continue
        try:
            with Image.open(p) as im:
                if min(im.size)<780:continue
            result.append({"path":str(p),"license":"Owned or independently authorized — verify source register","credit":"Foto archivio CASE247","origin":p.as_posix(),"key":p.name})
        except Exception:pass
    return result
def photos_commons():
    # Wikimedia license metadata is not a warranty. Skip unknown/SA/NC licensing.
    photos=[]
    for term in QUERIES:
        qs=urllib.parse.urlencode({"action":"query","generator":"search","gsrsearch":term,"gsrnamespace":6,"gsrlimit":35,"prop":"imageinfo","iiprop":"url|extmetadata|size|mime","iiurlwidth":1600,"format":"json"})
        try:data=json.loads(req("https://commons.wikimedia.org/w/api.php?"+qs).decode("utf-8"))
        except Exception:continue
        pages=(data.get("query") or {}).get("pages") or {}
        for p in pages.values():
            inf=(p.get("imageinfo") or [{}])[0];ext=inf.get("extmetadata") or {}
            lic=strip_tags((ext.get("LicenseShortName") or {}).get("value","")).lower()
            if not any(lic.startswith(x) for x in ALLOWED):continue
            if inf.get("mime") not in ("image/jpeg","image/png"):continue
            if min(int(inf.get("width") or 0),int(inf.get("height") or 0))<900:continue
            url=inf.get("thumburl") or inf.get("url")
            if not url or not url.startswith("https://"):continue
            title=p.get("title","")
            if not title or "logo" in title.lower() or "diagram" in title.lower():continue
            photos.append({"url":url,"license":lic,"credit":strip_tags((ext.get("Artist") or {}).get("value",""))[:100] or "Autore indicato da Wikimedia","origin":"https://commons.wikimedia.org/wiki/"+urllib.parse.quote(title.replace(" ","_")),"key":title})
    return list({p["key"]:p for p in photos}.values())
def get_photo(photo):
    if "path" in photo:
        im=Image.open(photo["path"]).convert("RGB")
    else:
        raw=req(photo["url"],timeout=20)
        if len(raw)>12_000_000:raise ValueError("large photo")
        im=Image.open(BytesIO(raw)).convert("RGB")
    if min(im.size)<900:raise ValueError("image too small")
    return ImageOps.exif_transpose(im)
def recent_keys():
    seen=set()
    for p in sorted((HOME/"days").glob("*/manifest.json"),reverse=True)[:30]:
        try:seen.update(x["photo"]["key"] for x in json.loads(p.read_text())["candidates"])
        except Exception:pass
    return seen
def choose_topic(date):
    # News headlines only influence a theme; NEVER infer facts from a headline.
    index=(date-BASE).days%len(TOPICS); news=None
    query="mercato immobiliare Piemonte Torino mutui case"
    rss="https://news.google.com/rss/search?"+urllib.parse.urlencode({"q":query,"hl":"it","gl":"IT","ceid":"IT:it"})
    try:
        root=ET.fromstring(req(rss,timeout=12))
        for item in root.findall("./channel/item")[:15]:
            title=item.findtext("title") or ""
            if re.search(r"immobil|casa|mutui|prezz|affitt|mercato",title,re.I):
                news={"headline":title[:200],"url":item.findtext("link") or "","source":"Google News RSS — spunto tematico, non riproduzione della notizia"}
                test=title.lower()
                if "mutu" in test:index=2
                elif "prezz" in test:index=0
                elif "affitt" in test:index=4
                elif "vend" in test:index=2
                break
    except Exception:pass
    return TOPICS[index],news
def make_visual(photo,header,sub,path,variant=0,slide_num=None):
    w,h=1080,1350
    im=ImageOps.fit(photo.convert("RGB"),(w,h),method=Image.Resampling.LANCZOS,centering=((.5,.5),(.35,.55),(.5,.36))[variant])
    im=ImageEnhance.Color(im).enhance(1.04)
    overlay=Image.new("RGBA",(w,h),(0,0,0,0));dr=ImageDraw.Draw(overlay)
    # bottom architectural editorial band; warm restrained accent, not a poster collage
    colors=[(5,23,58),(8,37,86),(25,17,65)]
    r,g,b=colors[variant]
    for y in range(675,1350):
        alpha=int(80+166*(y-675)/675)
        dr.line((0,y,w,y),fill=(r,g,b,min(246,alpha)),width=1)
    dr.rounded_rectangle((44,48,665,151),radius=24,fill=(255,255,255,235))
    dr.text((68,76),"CASE IN PUBBLICITÀ 24/7",font=font(32),fill=(8,44,88))
    accent=[(21,135,227,255),(151,60,197,255),(245,148,65,255)][variant]
    dr.rounded_rectangle((68,753,190,763),radius=4,fill=accent)
    headline_f=font(63 if len(header)<28 else 52)
    lines=wrap(dr,header,headline_f,930)[:3]
    y=792
    for line in lines:dr.text((68,y),line,font=headline_f,fill=(255,255,255,255),stroke_width=1,stroke_fill=(0,0,0,60));y+=79
    detail_f=font(32,False)
    for line in wrap(dr,sub,detail_f,920)[:4]:
        dr.text((68,y+16),line,font=detail_f,fill=(235,244,255,255));y+=49
    dr.line((68,1220,1012,1220),fill=(255,255,255,125),width=2)
    dr.text((68,1254),"AVIGLIANA  ·  VALLE DI SUSA",font=font(23),fill=(240,242,255))
    dr.text((645,1254),"WA 371 370 8294",font=font(23),fill=(255,255,255))
    if slide_num:
        dr.rounded_rectangle((852,52,1016,119),radius=20,fill=(8,44,88,200))
        dr.text((876,67),f"{slide_num}/5",font=font(30),fill=(255,255,255))
    im=Image.alpha_composite(im.convert("RGBA"),overlay).convert("RGB")
    path.parent.mkdir(parents=True,exist_ok=True)
    im.save(path,"JPEG",quality=86,optimize=True,subsampling=0)
def main():
    ar=argparse.ArgumentParser()
    ar.add_argument("mode",choices=["generate","queue"])
    ar.add_argument("--date",default=None)
    ar.add_argument("--choice",choices=["auto","A","B","C"],default="auto")
    args=ar.parse_args()
    date=dt.date.fromisoformat(args.date) if args.date else dt.datetime.now(TZ).date()
    dest=HOME/"days"/date.isoformat()
    is_carousel=((date-BASE).days%2)!=0
    if args.mode=="generate":
        if (dest/"manifest.json").exists():
            print("ALREADY_GENERATED",date);return
        topic,news=choose_topic(date)
        selected=[];seen=recent_keys()
        all_photos=photos_local()+photos_commons()
        all_photos.sort(key=lambda p:((p["key"] in seen),hashlib.sha256((date.isoformat()+p["key"]).encode()).hexdigest()))
        for p in all_photos:
            if len(selected)==3:break
            try: photo=get_photo(p)
            except Exception:continue
            selected.append((p,photo))
        if len(selected)<3:
            raise RuntimeError("NO_AUTHORIZED_PHOTOS: prepare at least 3 approved originals in photo-bank or check Commons licensing/connectivity")
        caption=(f"{topic[0]}\n\n{topic[1]}\n\n"
                 "CASE IN PUBBLICITÀ 24/7: comunicazione e promozione immobiliare "
                 "tra Avigliana e la Valle di Susa. L'intermediazione resta riservata ai professionisti abilitati.\n\n"
                 "Scrivici indicando il tuo Comune: WhatsApp 371 370 8294 — https://wa.me/393713708294\n\n"
                 "#CaseInPubblicita247 #Avigliana #ValleDiSusa #MarketingImmobiliare")
        if news:caption+="\n\nSpunto di attualità (approfondimento): "+news["url"]
        candidates=[]
        for i,(p,photo) in enumerate(selected):
            id="ABC"[i];image=f"candidate-{id}.jpg"
            make_visual(photo,topic[0],topic[1],dest/image,i)
            candidates.append({"id":id,"preview":image,"photo":{k:v for k,v in p.items() if k!="path"},"score":95-i*3,"visual_variant":i})
            (dest/f"photo-{id}.jpg").write_bytes((lambda im:(lambda out:(im.save(out,"JPEG",quality=88),out.getvalue())[1])(BytesIO()))(photo))
        atomic_json(dest/"manifest.json",{
            "date":date.isoformat(),"brand":"CASE IN PUBBLICITÀ 24/7",
            "format":"carousel" if is_carousel else "post","status":"AWAITING_MORNING_SELECTION",
            "choice_deadline_rome":"09:30","queue_start_rome":"09:45","scheduled_publication_rome":"10:00",
            "theme":topic[0],"headline":topic[0],"detail":topic[1],"caption":caption,
            "news_source":news,"candidates":candidates,"estimated_paid_api_cost_eur":0,
            "policy":"Do not substitute invented photos; candidates are previews pending selection; never publish via Meta here."
        })
        print("CREATED",dest)
        return
    manifest_path=dest/"manifest.json"
    if not manifest_path.exists():raise RuntimeError("NO_NIGHTLY_MANIFEST")
    manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
    output=HOME/"queue"/(date.isoformat()+".json")
    if output.exists():print("ALREADY_QUEUED",output);return
    selected=args.choice
    if selected=="auto":
        endpoint="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-feed-choice?date="+date.isoformat()
        try:
            data=json.loads(req(endpoint,timeout=12))
            choice=data.get("candidate")
            if choice in ("A","B","C"):selected=choice
        except Exception:pass
    if selected=="auto":
        # Learns from the editor's prior real selections, while avoiding repetitive grids.
        history=[]
        for x in sorted((HOME/"queue").glob("*.json"),reverse=True)[:90]:
            try:history.append(json.loads(x.read_text(encoding="utf-8")))
            except Exception:pass
        recent=[x.get("candidate") for x in history[:6]]
        manually_approved=[x.get("candidate") for x in history if x.get("selection_mode")=="MORNING_APPROVAL"]
        options=manifest["candidates"]
        selected=max(options,key=lambda c:(
            c["score"]+min(18,4*manually_approved.count(c["id"]))-9*recent.count(c["id"]),
            c["id"]
        ))["id"]
        route="AUTOMATIC_FALLBACK"
    else:route="MORNING_APPROVAL"
    chosen=next(x for x in manifest["candidates"] if x["id"]==selected)
    finaldir=HOME/"ready"/date.isoformat()
    finaldir.mkdir(parents=True,exist_ok=True)
    original=Image.open(dest/f"photo-{selected}.jpg").convert("RGB")
    if manifest["format"]=="post":
        import shutil
        shutil.copy2(dest/chosen["preview"],finaldir/"post.jpg")
        files=["post.jpg"]
    else:
        messages=[
            (manifest["headline"],manifest["detail"]),
            ("Cosa sta cambiando?","Partiamo dalle domande reali che si pongono i proprietari."),
            ("Ogni immobile è diverso.","Zona, caratteristiche e obiettivi meritano un messaggio su misura."),
            ("Una strategia chiara.","Presentazione, continuità dei contenuti e promozione ragionata."),
            ("Parliamo della tua casa.","Scrivici indicando il Comune: WhatsApp 371 370 8294.")
        ]
        files=[]
        for n,(h,sub) in enumerate(messages,1):
            filename=f"slide-{n:02d}.jpg"
            make_visual(original,h,sub,finaldir/filename,chosen["visual_variant"],slide_num=n)
            files.append(filename)
    attribution="Foto: "+chosen["photo"]["credit"]+"; licenza "+chosen["photo"]["license"]+"; fonte "+chosen["photo"]["origin"]
    capsule={"date":date.isoformat(),"brand":manifest["brand"],"format":manifest["format"],
             "candidate":selected,"selection_mode":route,"selected_at_rome":dt.datetime.now(TZ).isoformat(),
             "scheduled_at_rome":date.isoformat()+"T10:00:00","caption":manifest["caption"]+"\n\n"+attribution,
             "files":["campagne/case247/auto-feed/ready/"+date.isoformat()+"/"+p for p in files],
             "source_photo":chosen["photo"],"state":"QUEUED_NOT_PUBLISHED",
             "meta_publish_enabled":False,"external_post_id":None}
    atomic_json(output,capsule);print("QUEUED",output,route,selected)
if __name__=="__main__":main()
