#!/usr/bin/env python3
"""Render 60 calendar JPEG drafts, no Meta publishing."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
ROOT=Path("campagne/case247/editorial-queue/2026-11-10_2026-12-09")
Q=ROOT/"queue.json"; OUT=ROOT/"assets"
REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(n,b=False):return ImageFont.truetype(BOLD if b else REG,n)
def lines(draw,title,width,f):
 output=[];cur=""
 for word in title.split():
  trial=(cur+" "+word).strip()
  if draw.textbbox((0,0),trial,font=f)[2]<=width:cur=trial
  else:
   if cur:output.append(cur)
   cur=word
 if cur:output.append(cur)
 return output
def house(draw,cx,cy):
 p=[(cx-95,cy),(cx,cy-70),(cx+95,cy),(cx+77,cy),(cx+77,cy+86),(cx-77,cy+86),(cx-77,cy)]
 draw.line(p,fill=(237,193,94),width=9,joint="curve")
 draw.rectangle((cx-22,cy+24,cx+27,cy+85),outline=(237,193,94),width=7)
def render(item,i):
 navy=(15,30,52);gold=(237,193,94);white=(255,255,255)
 img=Image.new("RGB",(1080,1350),navy);d=ImageDraw.Draw(img)
 for y in range(1350):
  t=y/1350
  d.line((0,y,1080,y),fill=(int(14+9*(1-t)),int(29+29*(1-t)),int(52+57*(1-t))))
 accent=(0,116,193) if item["audience"]=="privati" else (38,100,166)
 mode=i%4
 if mode%2==0:d.polygon([(570,0),(1080,0),(1080,720),(760,795)],fill=accent)
 else:d.ellipse((540,20,1260,740),outline=accent,width=90)
 d.rectangle((0,0,1080,16),fill=gold)
 d.rounded_rectangle((74,88,1006,215),radius=21,fill=(18,56,98))
 d.text((97,119),"CASE IN PUBBLICITÀ 24/7",font=font(46,True),fill=white)
 d.text((78,264),"PRIVATI · IMMOBILI" if item["audience"]=="privati" else "AZIENDE · ATTIVITÀ",font=font(31,True),fill=gold)
 d.rectangle((78,326,230,337),fill=gold)
 size=74
 while size>=40:
  titlefont=font(size,True); wrapped=lines(d,item["title"],894,titlefont)
  if len(wrapped)*(size+18)<=450:break
  size-=2
 y=385
 for line in wrapped:
  d.text((78,y),line,font=titlefont,fill=white)
  y+=size+18
 paneltop=845
 d.rounded_rectangle((75,paneltop,1004,1083),radius=24,fill=(15,65,112),outline=(65,140,191),width=3)
 house(d,247,paneltop+74)
 d.text((411,paneltop+45),"COMUNICAZIONE",font=font(36,True),fill=white)
 d.text((411,paneltop+102),"E VISIBILITÀ",font=font(40,True),fill=white)
 d.text((411,paneltop+168),"TORINO · VALLE DI SUSA",font=font(24),fill=(205,225,242))
 d.rounded_rectangle((75,1115,1004,1218),radius=22,fill=gold)
 d.text((105,1143),"SCRIVI CASA SU WHATSAPP",font=font(40,True),fill=navy)
 d.text((80,1265),"Case in Pubblicità 24/7 · Comunicazione digitale",font=font(23),fill=(208,220,235))
 p=OUT/(item["content_id"]+".jpg")
 img.save(p,"JPEG",quality=90,optimize=True,subsampling=0)
 if p.stat().st_size<25000:raise RuntimeError("Invalid rendered JPEG")
def main():
 q=json.loads(Q.read_text(encoding="utf-8"));OUT.mkdir(parents=True,exist_ok=True)
 byid={}
 for j in q["jobs"]:
  if j["platform"]=="instagram":byid[j["content_id"]]=j
 if len(byid)!=60:raise RuntimeError("Expected 60 distinct content items")
 for i,j in enumerate(byid.values()):render(j,i)
 print("RENDERED_60_JPEGS_NO_AUTOPUBLISH")
if __name__=="__main__":main()
