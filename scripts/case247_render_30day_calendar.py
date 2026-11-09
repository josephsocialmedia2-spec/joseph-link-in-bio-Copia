#!/usr/bin/env python3
"""CASE247: render listing-based 1080x1350 draft creatives using actual La Sacra catalog image URLs.
Do not claim photos are documentary unless source verifies it. No invented houses, no Meta posting.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
from urllib.request import Request, urlopen
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from io import BytesIO
import json, re, hashlib

ROOT=Path("campagne/case247/editorial-queue/2026-11-10_2026-12-09")
Q=ROOT/"queue.json"
CATALOG=Path("immobili/catalogo.json")
OUT=ROOT/"assets"
PORTRAIT=Path("assets/joseph-malafronte.webp")
REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def font(size,bold=False):
 return ImageFont.truetype(BOLD if bold else REG,size)

def wrap(draw,txt,maxwidth,typ):
 out=[]; line=""
 for word in txt.split():
  nxt=(line+" "+word).strip()
  if draw.textbbox((0,0),nxt,font=typ)[2]<=maxwidth:line=nxt
  else:
   if line:out.append(line)
   line=word
 if line:out.append(line)
 return out

def candidates(items,audience):
 # Strictly local, source-verified, non-AI-named JPEG images.
 area={"Avigliana","Sant’Ambrogio di Torino","Villar Dora","Caprie","Rubiana","Rivoli","Sant’Antonino di Susa"}
 selected=[]
 for p in items:
  if p.get("location_status")!="VERIFICATO_FONTE" or p.get("municipality") not in area:continue
  if p.get("category")!=("Impresa" if audience=="aziende" else "Residenziale"):continue
  u=p.get("image") or ""
  if urlparse(u).hostname!="cdn.shopify.com":continue
  name=urlparse(u).path.rsplit("/",1)[-1].lower()
  if not name.endswith((".jpg",".jpeg")) or any(v in name for v in ("chatgpt","generated","ai_","render")):continue
  selected.append(p)
 selected.sort(key=lambda p:(0 if p["municipality"]=="Avigliana" else 1,p["municipality"],p["title"]))
 return selected

def get_photo(url):
 # Shopify image transformations are served from the same listing source; lower byte size prevents CDN read timeouts.
 parsed=urlparse(url)
 params=dict(parse_qsl(parsed.query));params["width"]="1200"
 optimized=urlunparse(parsed._replace(query=urlencode(params)))
 req=Request(optimized,headers={"User-Agent":"Mozilla/5.0","Accept":"image/avif,image/webp,image/*"})
 with urlopen(req,timeout=18) as response:
  if response.status!=200:raise RuntimeError("Image source unavailable HTTP "+str(response.status))
  data=response.read(6000001)
 if len(data)>6000000:raise RuntimeError("Image oversized")
 im=Image.open(BytesIO(data));im.load()
 if im.width<400 or im.height<300:raise RuntimeError("Image resolution too low")
 return ImageOps.exif_transpose(im).convert("RGB")

def money(price):
 if not isinstance(price,(int,float)) or price<=0:return "PREZZO NON INDICATO"
 return "€ "+f"{price:,.0f}".replace(",",".")

def fit_headline(draw,text,max_w,max_lines):
 for size in (55,51,47,43,39,35,31):
  f=font(size,True);ln=wrap(draw,text,max_w,f)
  if len(ln)<=max_lines:return f,ln
 return font(31,True),wrap(draw,text,max_w,font(31,True))[:max_lines]

def render(item,listing,photo):
 # Enforce official Case247 brand.json navy/cobalt/sky/white, with WhatsApp green CTA.
 navy=(8,44,88); deep=(6,26,54);cobalt=(21,135,227);sky=(89,185,246);green=(0,186,102);white=(255,255,255)
 img=Image.new("RGB",(1080,1350),navy);d=ImageDraw.Draw(img)
 frame=ImageOps.fit(photo,(1080,785),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
 img.paste(frame,(0,310))
 # Structured masthead, location and real listing title.
 d.rectangle((0,0,1080,310),fill=navy)
 d.polygon([(0,0),(1080,0),(1080,12),(0,168)],fill=cobalt)
 d.rounded_rectangle((40,33,1040,119),radius=17,fill=cobalt)
 d.text((65,51),"CASE IN PUBBLICITÀ 24/7",font=font(42,True),fill=white)
 d.text((65,140),"AVIGLIANA · VALLE DI SUSA",font=font(27,True),fill=cobalt)
 town=listing.get("municipality") or "Località da verificare"
 d.rounded_rectangle((45,187,1035,252),radius=22,fill=deep,outline=sky,width=3)
 locfont=font(36,True)
 d.text((64,202),town.upper(),font=locfont,fill=white)
 d.text((62,270),"IMMOBILE DAL CATALOGO LA SACRA",font=font(24,True),fill=white)
 # A clear gradient-style navy lower panel, not a synthetic replacement property.
 d.rectangle((0,1080,1080,1350),fill=navy)
 d.rectangle((0,1080,1080,1089),fill=cobalt)
 # Title is in a dedicated full-width protected navy panel; no image elements may cover it.
 title=str(listing.get("title") or item["title"]).strip()
 titlefont,lines=fit_headline(d,title,960,2)
 ty=1106
 for line in lines:
  d.text((56,ty),line,font=titlefont,fill=white)
  ty+=titlefont.size+7
 # Footer CTA and photographer distinction.
 d.rounded_rectangle((300,1253,1031,1335),radius=19,fill=green)
 d.text((333,1263),"WHATSAPP 371 370 8294",font=font(34,True),fill=white)
 d.text((335,1304),"SCRIVI CASA + CODICE IMMOBILE",font=font(19,True),fill=white)
 # Photo presenter, deliberately placed as composited inset, not on-site portrayal.
 if not PORTRAIT.is_file():raise RuntimeError("Joseph portrait asset unavailable")
 subject=ImageOps.exif_transpose(Image.open(PORTRAIT)).convert("RGB")
 inset=ImageOps.fit(subject,(230,230),method=Image.Resampling.LANCZOS,centering=(0.5,0.26))
 mask=Image.new("L",(230,230),0)
 ImageDraw.Draw(mask).ellipse((4,4,226,226),fill=255)
 mask=mask.filter(ImageFilter.GaussianBlur(2))
 rgba=inset.convert("RGBA");rgba.putalpha(mask)
 # Portrait must stay wholly ABOVE the title band (title starts at y=1106).
 x,y=45,792
 assert y+238 < 1080, "Presenter must never overlap the text panel"
 d.ellipse((x-8,y-8,x+238,y+238),fill=deep,outline=sky,width=7)
 img.paste(rgba,(x,y),rgba)
 d.rounded_rectangle((276,1032,626,1078),radius=14,fill=deep,outline=sky,width=2)
 d.text((290,1044),"JOSEPH · DIGITAL STRATEGIST",font=font(19,True),fill=white)
 # High-contrast 100%-sourced price badge prominent over the photo.
 label=money(listing.get("price"))
 price_size=80 if len(label)<14 else 46
 pf=font(price_size,True)
 label_w=d.textbbox((0,0),label,font=pf)[2]
 bx1,bx2=420,1030
 by1,by2=907,1033
 d.rounded_rectangle((bx1,by1,bx2,by2),radius=29,fill=cobalt,outline=deep,width=5)
 d.text(((bx1+bx2-label_w)/2,by1+(by2-by1-price_size)/2-8),label,font=pf,fill=white)
 # Do not invent price or locality. No sales-contract statement or fake physical visit.
 output=OUT/(item["content_id"]+".jpg")
 img.save(output,"JPEG",quality=92,optimize=True,subsampling=0)
 if output.stat().st_size<25000:raise RuntimeError("Output JPEG too small")

def main():
 q=json.loads(Q.read_text(encoding="utf-8"))
 catalog=json.loads(CATALOG.read_text(encoding="utf-8"))
 assert q.get("meta_enabled") is False and q.get("no_automatic_meta_publish") is True, "Meta publication must remain disabled"
 unique={}
 for job in q["jobs"]:
  if job["platform"]=="instagram":unique[job["content_id"]]=job
 if len(unique)!=60:raise RuntimeError("Expected exactly 60 distinct drafts")
 pools={a:candidates(catalog["items"],a) for a in ("privati","aziende")}
 if any(not v for v in pools.values()):raise RuntimeError("Missing verified source listing JPG photos")
 print("VERIFIED_SOURCE_PHOTOS",json.dumps({a:len(v) for a,v in pools.items()}))
 OUT.mkdir(parents=True,exist_ok=True)
 cache={};usable={}
 for audience,pool in pools.items():
  usable[audience]=[]
  for listing in pool:
   key=listing["image"]
   try:
    cache[key]=get_photo(key)
    usable[audience].append(listing)
    print("PHOTO_OK",audience,listing["id"],cache[key].size,flush=True)
   except Exception as e:
    print("PHOTO_SKIP_UNAVAILABLE",audience,listing["id"],type(e).__name__,flush=True)
  if not usable[audience]:raise RuntimeError("No accessible actual listing photos for "+audience)
 used=[];count={"privati":0,"aziende":0}
 for job in unique.values():
  a=job["audience"];pool=usable[a];listing=pool[count[a]%len(pool)];count[a]+=1
  key=listing["image"]
  render(job,listing,cache[key])
  used.append({"content_id":job["content_id"],"listing_id":listing["id"],"town":listing["municipality"],"listing_title":listing["title"],"listing_url":listing["url"],"price":listing.get("price"),"price_label":money(listing.get("price")),"image_url":key,"rendered_jpeg":job["media_jpeg"],"verified_from_catalog_at":catalog["last_success_at"],"disclaimer":"Immagine ripresa dal catalogo La Sacra, non verificata indipendentemente come fotografia documentale"})
 (ROOT/"FONTI_IMMAGINI.json").write_text(json.dumps({"source":"https://lasacraimmobiliare.it","catalog_snapshot_at":catalog["last_success_at"],"media_type":"original listing images with clearly distinguished presenter portrait overlay, no generative recreation","presenter_asset":str(PORTRAIT),"count":len(used),"used":used},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("RENDERED_60_REAL_LA_SACRA_LISTING_JPEGS_WITH_SOURCE_PRICES_AND_JOSEPH_DRAFT_ONLY")
if __name__=="__main__":main()
