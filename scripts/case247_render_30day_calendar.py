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

def add_presenter(image):
 # Explicit photographic inset: do not pretend the presenter was photographed at the property.
 if not PORTRAIT.is_file():raise RuntimeError("Existing authorized Joseph portrait missing")
 source=ImageOps.exif_transpose(Image.open(PORTRAIT)).convert("RGB")
 inset=ImageOps.fit(source,(282,282),method=Image.Resampling.LANCZOS,centering=(0.5,0.22))
 alpha=Image.new("L",(282,282),0)
 mask=ImageDraw.Draw(alpha)
 mask.ellipse((8,8,274,274),fill=255)
 alpha=alpha.filter(ImageFilter.GaussianBlur(3))
 subject=inset.convert("RGBA")
 subject.putalpha(alpha)
 x,y=49,470
 border=ImageDraw.Draw(image)
 border.ellipse((x-9,y-9,x+291,y+291),fill=(13,29,51),outline=(239,193,90),width=7)
 image.paste(subject,(x,y),subject)
 border.rounded_rectangle((344,707,862,771),radius=12,fill=(13,29,51),outline=(239,193,90),width=2)
 border.text((365,721),"JOSEPH · DIGITAL STRATEGIST",font=font(26,True),fill=(255,255,255))

def render(item,listing,photo):
 navy=(13,29,51);gold=(239,193,90);white=(255,255,255)
 img=Image.new("RGB",(1080,1350),navy)
 d=ImageDraw.Draw(img)
 # Preserve the source photograph without fabricating its contents; crop only to fit.
 frame=ImageOps.fit(photo,(1080,790),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
 img.paste(frame,(0,0))
 add_presenter(img)
 d.rectangle((0,0,1080,14),fill=gold)
 d.rounded_rectangle((38,35,995,112),radius=13,fill=(14,39,70))
 d.text((66,54),"CASE IN PUBBLICITÀ 24/7",font=font(36,True),fill=white)
 d.rectangle((0,785,1080,1350),fill=navy)
 d.rectangle((62,827,170,835),fill=gold)
 d.text((62,858),"AVIGLIANA E VALLE DI SUSA",font=font(29,True),fill=gold)
 title=item["title"]
 typ=font(54,True);blocks=wrap(d,title,950,typ)
 if len(blocks)>3:typ=font(43,True);blocks=wrap(d,title,950,typ)
 y=930
 for block in blocks[:4]:
  d.text((62,y),block,font=typ,fill=white)
  y+=67 if typ.size==54 else 55
 line="FOTO DA ANNUNCIO: "+(listing.get("municipality") or "Zona da verificare").upper()
 d.text((62,1151),line,font=font(25,True),fill=(206,222,236))
 d.text((62,1202),"FONTE: IMMOBILIARE LA SACRA",font=font(24),fill=(206,222,236))
 d.rounded_rectangle((62,1251,1018,1324),radius=12,fill=gold)
 d.text((94,1272),"SCOPRI L'ANNUNCIO · LINK NEL POST",font=font(30,True),fill=navy)
 output=OUT/(item["content_id"]+".jpg")
 img.save(output,"JPEG",quality=90,optimize=True,subsampling=0)
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
  used.append({"content_id":job["content_id"],"listing_id":listing["id"],"town":listing["municipality"],"listing_title":listing["title"],"listing_url":listing["url"],"image_url":key,"rendered_jpeg":job["media_jpeg"],"verified_from_catalog_at":catalog["last_success_at"],"disclaimer":"Immagine ripresa dal catalogo La Sacra, non verificata indipendentemente come fotografia documentale"})
 (ROOT/"FONTI_IMMAGINI.json").write_text(json.dumps({"source":"https://lasacraimmobiliare.it","catalog_snapshot_at":catalog["last_success_at"],"media_type":"original listing images with clearly distinguished presenter portrait overlay, no generative recreation","presenter_asset":str(PORTRAIT),"count":len(used),"used":used},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("RENDERED_60_SOURCE_BASED_JPEGS_WITH_JOSEPH_PORTRAIT_DRAFT_ONLY")
if __name__=="__main__":main()
