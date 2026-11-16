#!/usr/bin/env python3
"""Censimento notturno La Sacra: 20 km Avigliana, lotti massimo 280, solo archivi cifrati.
Nessun destinatario autorizzato per inferenza; nessuna email viene inviata.
Fonte OSM: https://www.openstreetmap.org/copyright (ODbL).
"""
from __future__ import annotations
import argparse, base64, csv, datetime as dt, io, json, math, os, re, sys, time, urllib.parse, urllib.request, urllib.robotparser, zipfile
from pathlib import Path
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
import socket
socket.setdefaulttimeout(9)
from xml.sax.saxutils import escape

CENTER=(45.0800,7.3980)
RADIUS=20.0
LIMIT=280
ROME=ZoneInfo("Europe/Rome")
OVERPASS=("https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.nchc.org.tw/api/interpreter")
AMENITY="restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten|bank|pharmacy|fuel|car_wash|veterinary|dentist|doctors|clinic|nightclub|cinema|post_office|marketplace|events_venue"
TOURISM="hotel|motel|hostel|guest_house|camp_site|caravan_site|apartment|chalet"
COLUMNS=["N.","AZIENDA / ATTIVITA","PARTITA IVA","EMAIL PUBBLICA","TELEFONO","COMUNE","INDIRIZZO","CAP","SITO","DISTANZA KM","STATO DATI","QUADRANTE","FONTE P.IVA","FONTE EMAIL","FONTE OSM","VERIFICA P.IVA","CONSENSO MARKETING","DATA","ID OSM","GOOGLE DORK"]
VAT_RE=re.compile(r"(?i)(?:P\.?\s*I\.?V\.?A\.?|PARTITA\s+IVA|VAT\s*(?:NO|NUMBER|ID)?)[\s:.#-]*(?:IT\s*)?(\d{11})(?!\d)")
EMAIL_RE=re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
PHONE_RE=re.compile(r"\+?\d[\d ()/.-]{5,20}\d")

def dist(lat,lon):
    p1,p2=math.radians(CENTER[0]),math.radians(lat)
    a=math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin(math.radians(lon-CENTER[1])/2)**2
    return 6371.0088*2*math.atan2(math.sqrt(a),math.sqrt(max(0,1-a)))

def quadrant(lat,lon):
    return ("N" if lat>=CENTER[0] else "S")+("E" if lon>=CENTER[1] else "W")

def vat_ok(s):
    if not re.fullmatch(r"\d{11}",s or ""):return False
    d=list(map(int,s))
    total=sum(d[::2][:5])
    for k in d[1:10:2]:
        t=2*k;total+=t if t<10 else t-9
    return (10-total%10)%10==d[10]

def pick(tags,*keys):
    for k in keys:
        v=str(tags.get(k) or "").strip()
        if v:return v[:300]
    return ""

def normalize_site(value):
    s=str(value or "").strip().split(";")[0]
    if not s:return ""
    if not re.match(r"^https?://",s,re.I):s="https://"+s
    try:
        u=urllib.parse.urlsplit(s);host=(u.hostname or "").lower()
        if u.scheme not in ("https","http") or "." not in host or host.endswith((".local",".localhost",".internal")) or u.username or u.password:return ""
        return urllib.parse.urlunsplit((u.scheme,u.netloc,u.path or "/","",""))
    except Exception:return ""

def email_of(s):
    match=EMAIL_RE.search(str(s or "").replace("mailto:",""))
    return match.group().lower() if match else ""

def from_osm(el,day):
    t=el.get("tags") or {};name=pick(t,"name","official_name","brand","operator")
    p=el if el.get("type")=="node" else el.get("center") or {}
    if not name or "lat" not in p or "lon" not in p:return None
    lat,lon=float(p["lat"]),float(p["lon"])
    d=dist(lat,lon)
    if d>RADIUS:return None
    oid=f'{el.get("type","node")}/{el.get("id","")}'
    if oid.endswith("/"):return None
    raw=pick(t,"ref:vatin","vat","tax:vat","ref:vat","contact:vat")
    vm=re.search(r"(?:IT)?(\d{11})",raw)
    vat=vm.group(1) if vm and vat_ok(vm.group(1)) else ""
    email=email_of(pick(t,"contact:email","email"))
    osm="https://www.openstreetmap.org/"+oid
    return {"id":oid,"name":name,"vat":vat,"town":pick(t,"addr:city","addr:town","addr:village","addr:municipality"),
      "address":" ".join(filter(None,[pick(t,"addr:street"),pick(t,"addr:housenumber")])),
      "cap":pick(t,"addr:postcode"),"email":email,"phone":pick(t,"contact:phone","phone","contact:mobile","mobile"),
      "site":normalize_site(pick(t,"contact:website","website","url")),"distance":round(d,2),"quadrant":quadrant(lat,lon),
      "osm_url":osm,"vat_url":osm if vat else "","email_url":osm if email else "",
      "vat_status":"CHECKSUM_OK_NON_UFFICIALE" if vat else "NON_TROVATA","date":day}

def tiles(n=4):
    s,north=CENTER[0]-.185,CENTER[0]+.185
    w,e=CENTER[1]-.264,CENTER[1]+.264
    for i in range(n):
        for j in range(n):
            yield (s+(north-s)*i/n,w+(e-w)*j/n,s+(north-s)*(i+1)/n,w+(e-w)*(j+1)/n)

def make_query(box):
    bbox=",".join(f"{v:.6f}" for v in box)
    selectors=[f'nwr({bbox})["{k}"];' for k in ("shop","craft","office","healthcare","industrial")]
    selectors+=[f'nwr({bbox})["amenity"~"^({AMENITY})$"];',f'nwr({bbox})["tourism"~"^({TOURISM})$"];']
    return "[out:json][timeout:95];("+"".join(selectors)+");out center tags;"

def fetch_tile(box,deadline):
    body=urllib.parse.urlencode({"data":make_query(box)}).encode()
    for host in OVERPASS:
        if time.monotonic()>deadline-20:break
        try:
            req=urllib.request.Request(host,data=body,headers={"User-Agent":"LaSacraCompanyResearch/2.0 (public data; no emails sent)","Content-Type":"application/x-www-form-urlencoded"})
            with urllib.request.urlopen(req,timeout=105) as res:r=json.load(res)
            if not isinstance(r.get("elements"),list):raise ValueError("Overpass senza elementi")
            return r["elements"]
        except Exception as ex:
            print("FONTE NON DISPONIBILE",urllib.parse.urlsplit(host).hostname,type(ex).__name__,flush=True)
            time.sleep(2)
    return None

class SiteParser(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.text=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":self.links.append(dict(attrs).get("href",""))
    def handle_data(self,text):self.text.append(text)

ROBOTS={}
def robots_ok(url):
    u=urllib.parse.urlsplit(url);origin=f"{u.scheme}://{u.netloc}"
    if origin not in ROBOTS:
        p=urllib.robotparser.RobotFileParser();p.set_url(origin+"/robots.txt")
        try:p.read();ROBOTS[origin]=p
        except Exception:ROBOTS[origin]=False
    return ROBOTS[origin] is not False and ROBOTS[origin].can_fetch("LaSacraCompanyResearch",url)

def enrich(r,deadline):
    site=r["site"]
    if not site or time.monotonic()>deadline-30 or not robots_ok(site):return r
    try:
        rq=urllib.request.Request(site,headers={"User-Agent":"LaSacraCompanyResearch/2.0","Accept":"text/html"})
        with urllib.request.urlopen(rq,timeout=9) as res:
            if "text/html" not in res.headers.get("Content-Type",""):return r
            raw=res.read(250000).decode("utf-8","replace")
            if urllib.parse.urlsplit(res.geturl()).hostname!=urllib.parse.urlsplit(site).hostname:return r
        parser=SiteParser();parser.feed(raw)
        targets=[(site," ".join(parser.text),parser.links)]
        for link in parser.links:
            if time.monotonic()>deadline-20:break
            if re.search(r"(?i)(contatt|privacy|legal|impressum)",link):
                url=urllib.parse.urljoin(site,link)
                if urllib.parse.urlsplit(url).hostname!=urllib.parse.urlsplit(site).hostname or not robots_ok(url):continue
                try:
                    with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"LaSacraCompanyResearch/2.0"}),timeout=8) as res:
                        if "text/html" not in res.headers.get("Content-Type",""):break
                        fragment=res.read(200000).decode("utf-8","replace")
                    p2=SiteParser();p2.feed(fragment);targets.append((url," ".join(p2.text),p2.links))
                except Exception:pass
                break
        for url,text,links in targets:
            if not r["vat"]:
                match=VAT_RE.search(text)
                if match and vat_ok(match.group(1)):
                    r["vat"]=match.group(1);r["vat_url"]=url;r["vat_status"]="CHECKSUM_OK_NON_UFFICIALE"
            if not r["email"]:
                for link in links:
                    if link.lower().startswith("mailto:"):
                        r["email"]=email_of(urllib.parse.unquote(link));r["email_url"]=url if r["email"] else "";break
                if not r["email"]:
                    r["email"]=email_of(text);r["email_url"]=url if r["email"] else ""
            if not r["phone"]:
                for link in links:
                    if link.lower().startswith("tel:"):
                        m=PHONE_RE.search(urllib.parse.unquote(link[4:]))
                        if m:r["phone"]=m.group();break
    except Exception:pass
    return r

def rotate(rows,seen,day):
    # Giri geografici, poi priorita a record con recapito/sito/P.IVA
    remaining=[x for x in rows if x["id"] not in seen]
    buckets={x:[] for x in ("NE","NW","SE","SW")}
    for x in remaining:buckets[x["quadrant"]].append(x)
    for b in buckets.values():
        b.sort(key=lambda r:(-(bool(r["email"])*4+bool(r["phone"])*2+bool(r["site"])+bool(r["vat"])*3),r["name"].casefold(),r["id"]))
    order=list(buckets);shift=day.toordinal()%4;order=order[shift:]+order[:shift]
    out=[]
    while any(buckets.values()):
        for name in order:
            if buckets[name]:out.append(buckets[name].pop(0))
    return out

def values(r,index):
    dork="https://www.google.com/search?q="+urllib.parse.quote('"'+r["name"]+'" "partita iva" "'+r["town"]+'"')
    status="PARZIALE / DA_VERIFICARE" if not (r["vat"] and r["email"] and r["phone"]) else "CHECKSUM_OK / ALTRI_CONTROLLI"
    return [index,r["name"],r["vat"],r["email"],r["phone"],r["town"],r["address"],r["cap"],r["site"],r["distance"],status,r["quadrant"],
            r["vat_url"],r["email_url"],r["osm_url"],r["vat_status"],"NON_DOCUMENTATO",r["date"],r["id"],dork]

def make_csv(rows):
    out=io.StringIO();w=csv.writer(out,delimiter=";",lineterminator="\n");w.writerow(COLUMNS)
    for i,r in enumerate(rows,1):
        vals=values(r,i)
        w.writerow([("'"+v if v.startswith(("=","+","-","@","\t")) else v) if isinstance(v,str) else v for v in vals])
    return out.getvalue().encode("utf-8-sig")

def excel_column(i):
    s="";i+=1
    while i:i,n=divmod(i-1,26);s=chr(65+n)+s
    return s

def xmlsheet(grid,wide=False):
    widths=[7,40,17,34,24,23,40,11,42,15,27,13,45,45,45,26,22,17,22,60]
    parts=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>']
    for j in range(len(grid[0])):
        width=widths[j] if wide else (36 if j==0 else 72)
        parts.append(f'<col min="{j+1}" max="{j+1}" width="{width}" customWidth="1"/>')
    parts.append('</cols><sheetData>')
    for i,row in enumerate(grid,1):
        parts.append(f'<row r="{i}" ht="{28 if i==1 else 21}" customHeight="1">')
        for j,val in enumerate(row):
            c=excel_column(j)+str(i);style=1 if i==1 else (2 if i%2 else 3)
            if isinstance(val,(int,float)):
                parts.append(f'<c r="{c}" s="{style}"><v>{val}</v></c>')
            else:
                safe=escape(''.join(k for k in str(val or "") if ord(k)>=32 or k in "\t\n\r"))
                parts.append(f'<c r="{c}" s="{style}" t="inlineStr"><is><t>{safe}</t></is></c>')
        parts.append('</row>')
    parts.append('</sheetData>')
    if wide:parts.append(f'<autoFilter ref="A1:T{len(grid)}"/>')
    return ("".join(parts)+"</worksheet>").encode()

def make_xlsx(rows,day):
    first=[COLUMNS]+[values(r,i) for i,r in enumerate(rows,1)]
    summary=[["IMMOBILIARE LA SACRA — LOTTO 280","VALORE"],["DATA",str(day)],
     ["CONTATTI DEL GIORNO",len(rows)],["EMAIL PUBBLICHE",sum(bool(r["email"]) for r in rows)],
     ["TELEFONI PUBBLICI",sum(bool(r["phone"]) for r in rows)],["PARTITE IVA CON CHECKSUM",sum(bool(r["vat"]) for r in rows)],
     ["CONSENSI MARKETING VERIFICATI",0],["CAMPAGNA EMAIL","DISATTIVATA"],["AREA","20 km dal centro di Avigliana"],
     ["NOTA","Non tutti i contatti hanno P.IVA/email/telefono. Ricerca e invio sono separati."],
     ["LICENZA","© OpenStreetMap contributors — ODbL"]]
    types='''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'''
    wb='''<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="LOTTO 280" sheetId="1" r:id="rId1"/><sheet name="RIEPILOGO" sheetId="2" r:id="rId2"/></sheets></workbook>'''
    rels='''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'''
    styles='''<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF113957"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF1F8"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0"/></cellXfs></styleSheet>'''
    output=io.BytesIO()
    with zipfile.ZipFile(output,"w",zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",types)
        z.writestr("_rels/.rels",'''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>''')
        z.writestr("xl/workbook.xml",wb);z.writestr("xl/_rels/workbook.xml.rels",rels);z.writestr("xl/styles.xml",styles)
        z.writestr("xl/worksheets/sheet1.xml",xmlsheet(first,True))
        z.writestr("xl/worksheets/sheet2.xml",xmlsheet(summary))
    return output.getvalue()

def encrypted(payload,keybytes):
    from cryptography.hazmat.primitives.serialization import load_pem_public_key
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    k=os.urandom(32);nonce=os.urandom(12)
    wrapped=load_pem_public_key(keybytes).encrypt(k,padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
    header=json.dumps({"version":1,"wrapped_key":base64.b64encode(wrapped).decode(),"nonce":base64.b64encode(nonce).decode()}).encode()
    return b"CASE247ENC1\n"+len(header).to_bytes(4,"big")+header+AESGCM(k).encrypt(nonce,payload,None)

def package(rows,day):
    stem=f"LA_SACRA_AV20_{day.isoformat()}_LOTTO_{len(rows):03d}"
    summary={"data":str(day),"aziende":len(rows),"email_pubbliche":sum(bool(r["email"]) for r in rows),
     "telefoni_pubblici":sum(bool(r["phone"]) for r in rows),"piva_checksum":sum(bool(r["vat"]) for r in rows),
     "consensi_documentati":0,"massimo_giornaliero":LIMIT,"invii_effettuati":0,
     "note":"Nessun invio pubblicitario automatizzato; dati pubblici senza consenso marketing."}
    o=io.BytesIO()
    with zipfile.ZipFile(o,"w",zipfile.ZIP_DEFLATED) as z:
        z.writestr(stem+".csv",make_csv(rows));z.writestr(stem+".xlsx",make_xlsx(rows,day))
        z.writestr("CAMPAGNA_AUTORIZZATI.csv","email;consenso;prova;data_consenso\n")
        z.writestr("RIEPILOGO.json",json.dumps(summary,ensure_ascii=False,indent=2))
    return o.getvalue(),summary

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--guard-rome",action="store_true");p.add_argument("--dry-run",action="store_true")
    p.add_argument("--fixture");p.add_argument("--state",default="state/la-sacra-av20-processed.json")
    p.add_argument("--out",default="artifacts/la-sacra-nightly");p.add_argument("--public-key",default="config/la-sacra-census-public.pem")
    p.add_argument("--max-rows",type=int,default=280);args=p.parse_args(argv)
    if not 1<=args.max_rows<=280:p.error("max-rows deve essere 1..280")
    now=dt.datetime.now(ROME);day=now.date()
    if args.guard_rome and now.hour!=23 and not args.fixture:
        print("SKIP non sono le 23 a Roma",now.isoformat());return 0
    deadline=time.monotonic()+max(0,min(4*3600+50*60,(dt.datetime.combine(day+dt.timedelta(days=1),dt.time(3,55),ROME)-now).total_seconds()))
    statepath=Path(args.state)
    state=json.loads(statepath.read_text(encoding="utf-8")) if statepath.exists() else {"seen":[],"batches":[]}
    if any(x.get("date")==str(day) for x in state["batches"]) and not args.fixture:
        print("SKIP lotto gia registrato per la data locale");return 0
    if args.fixture:
        elements=json.loads(Path(args.fixture).read_text(encoding="utf-8"))["elements"];ok=1
    else:
        elements=[];ok=0
        for b in tiles():
            if time.monotonic()>deadline-160:break
            found=fetch_tile(b,deadline)
            if found is not None:ok+=1;elements.extend(found)
            time.sleep(1.4)
    if not ok:
        print("ERRORE nessuna fonte Overpass disponibile; stato invariato",file=sys.stderr);return 2
    unique={}
    for el in elements:
        try:
            r=from_osm(el,str(day))
            if r:unique.setdefault(r["id"],r)
        except (ValueError,TypeError,KeyError):pass
    rows=[]
    for r in rotate(list(unique.values()),set(state["seen"]),day):
        if len(rows)>=args.max_rows or time.monotonic()>deadline-60:break
        if not args.fixture:enrich(r,deadline)
        rows.append(r)
    if not rows:
        print("ZERO nuovi nominativi; non creare lotti vuoti");return 0
    blob,summary=package(rows,day)
    archive=Path(args.out);archive.mkdir(parents=True,exist_ok=True)
    target=archive/f"LA_SACRA_AV20_{day.isoformat()}_{len(rows):03d}.case247"
    target.write_bytes(encrypted(blob,Path(args.public_key).read_bytes()))
    if not args.dry_run:
        state["seen"]=sorted(set(state["seen"])|{r["id"] for r in rows})
        state["batches"].append({"date":str(day),"count":len(rows),"file":target.name,"source_tiles_ok":ok})
        statepath.parent.mkdir(parents=True,exist_ok=True)
        statepath.write_text(json.dumps(state,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("LOTTO CIFRATO GENERATO",json.dumps(summary,ensure_ascii=False),"tiles_ok",ok,flush=True)
    return 0

if __name__=="__main__":sys.exit(main())
