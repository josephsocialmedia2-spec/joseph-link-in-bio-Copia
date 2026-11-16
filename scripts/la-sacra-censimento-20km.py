#!/usr/bin/env python3
"""Censimento OSM delle imprese nel raggio di 20 km da Avigliana.
Nessun tetto di 50/100; nessuna email inventata; nessun invio marketing.
Destinazione CSV/JSON in artefatti GitHub Actions, NON sito pubblico.
Dati OSM: © OpenStreetMap contributors, ODbL, https://www.openstreetmap.org/copyright.
"""
from __future__ import annotations
import csv
import datetime as dt
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

CENTER = (45.0800, 7.3980)  # avigliana: centro di riferimento approssimativo
RADIUS_KM = 20.0
OVERPASS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
# Candidati: il filtro geografico sui singoli punti resta obbligatorio.
MUNICIPALITIES = [
    "Avigliana", "Almese", "Villar Dora", "Sant'Ambrogio di Torino",
    "Condove", "Caprie", "Rubiana", "Caselette", "Buttigliera Alta",
    "Rosta", "Rivoli", "Alpignano", "Villarbasse", "Trana",
    "Giaveno", "Reano", "Valgioie", "Sangano", "Bruino",
    "Chiusa di San Michele", "Vaie", "Sant'Antonino di Susa",
    "Borgone Susa", "Coazze", "Santena", "Collegno", "Grugliasco",
    "Pianezza", "Druento", "Bussoleno", "Villar Focchiardo",
    "San Didero", "Chianocco", "San Giorio di Susa",
]
COMMERCIAL_AMENITIES = (
    "restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten|"
    "bank|pharmacy|marketplace|car_wash|fuel|charging_station|"
    "veterinary|dentist|doctors|clinic|studio|nightclub|cinema|"
    "events_venue|internet_cafe|post_office"
)
COMMERCIAL_TOURISM = "hotel|motel|hostel|guest_house|apartment|camp_site|caravan_site"
FIELDS = [
    "osm_id", "nome", "comune_osm", "comune_indirizzo", "categoria",
    "tipo", "indirizzo", "cap", "latitudine", "longitudine", "distanza_km",
    "sito", "email_pubblica", "telefono_pubblico", "fonte", "data_verifica",
    "consenso_marketing", "stato", "note",
]

def distance(a, b):
    phi1, phi2 = math.radians(a[0]), math.radians(b[0])
    dphi, dl = phi2 - phi1, math.radians(b[1]-a[1])
    z = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dl/2)**2
    return 6371.0088 * 2 * math.atan2(math.sqrt(z), math.sqrt(1-z))

def query_for(town):
    escaped = town.replace('\\', '\\\\').replace('"', '\\"')
    return (
        '[out:json][timeout:90];'
        'area["boundary"="administrative"]["admin_level"="8"]["name"="' + escaped + '"]->.target;'
        '(nwr(area.target)["shop"];'
        'nwr(area.target)["craft"];'
        'nwr(area.target)["office"];'
        'nwr(area.target)["amenity"~"^(' + COMMERCIAL_AMENITIES + ')$"];'
        'nwr(area.target)["tourism"~"^(' + COMMERCIAL_TOURISM + ')$"];'
        'nwr(area.target)["healthcare"];'
        'nwr(area.target)["industrial"];'
        ');out center tags;'
    )

def request(query, town):
    payload = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for attempt in range(4):
        for endpoint in OVERPASS:
            try:
                req = urllib.request.Request(
                    endpoint, data=payload,
                    headers={"User-Agent":"LaSacraCommercialCensus/1.0 (research; no bulk emails)",
                             "Content-Type":"application/x-www-form-urlencoded"},
                )
                with urllib.request.urlopen(req, timeout=105) as resp:
                    data = json.load(resp)
                if not isinstance(data.get("elements"), list):
                    raise ValueError("Risposta senza elements")
                return data["elements"]
            except (TimeoutError, urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
                last = str(exc)
                print(f"RETRY {town} {endpoint}: {last[:120]}", flush=True)
        time.sleep(min(25, 3 * (attempt+1)))
    raise RuntimeError(last or "Tutti gli endpoint falliti")

def pick(tags, keys):
    for key in keys:
        val = str(tags.get(key) or "").strip()
        if val: return val[:350]
    return ""

def clean_email(s):
    if not s: return ""
    s=s.replace("mailto:", "").replace(" ", "")
    entries=[]
    for v in re.split(r"[;,]", s):
        if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+",v) and len(v)<250:
            entries.append(v.lower())
    return "; ".join(dict.fromkeys(entries))

def make_record(el, town, today):
    tags = el.get("tags") or {}
    name = pick(tags, ("name", "brand", "operator", "official_name"))
    if not name: return None
    coords=el.get("center") if el["type"]!="node" else el
    if not isinstance(coords,dict) or "lat" not in coords or "lon" not in coords: return None
    lat,lon=float(coords["lat"]),float(coords["lon"])
    dist=distance(CENTER,(lat,lon))
    if dist>RADIUS_KM: return None
    kind=next((k for k in ("shop","craft","office","amenity","tourism","healthcare","industrial")
               if tags.get(k)), "altro")
    address=" ".join(x for x in (
        tags.get("addr:street",""),tags.get("addr:housenumber","")
    ) if x)
    return dict(
        osm_id=f'{el["type"]}/{el["id"]}',
        nome=name,comune_osm=town,
        comune_indirizzo=pick(tags,("addr:city","addr:town","addr:village")),
        categoria=kind,tipo=tags.get(kind,""),
        indirizzo=address,cap=tags.get("addr:postcode",""),
        latitudine=f"{lat:.7f}",longitudine=f"{lon:.7f}",
        distanza_km=f"{dist:.2f}",
        sito=pick(tags,("contact:website","website","url","contact:url")),
        email_pubblica=clean_email(pick(tags,("contact:email","email"))),
        telefono_pubblico=pick(tags,("contact:phone","phone","contact:mobile","mobile")),
        fonte=f'https://www.openstreetmap.org/{el["type"]}/{el["id"]}',
        data_verifica=today,
        consenso_marketing="NON_VERIFICATO",stato="DA_VERIFICARE",
        note="Dati OSM da confermare; indirizzo email pubblico NON abilita invii marketing.",
    )

def run():
    out=Path(os.getenv("CENSUS_OUT","artifacts/la-sacra-censimento"));out.mkdir(parents=True,exist_ok=True)
    today=dt.datetime.now(dt.timezone.utc).date().isoformat()
    records={}
    reports=[]
    for ix,town in enumerate(MUNICIPALITIES,1):
        try:
            elements=request(query_for(town),town)
            inside=0
            for el in elements:
                record=make_record(el,town,today)
                if not record: continue
                inside+=1
                records.setdefault(record["osm_id"],record)
            reports.append({"comune":town,"osmdb_elementi":len(elements),
                            "dentro_raggio":inside,"esito":"OK"})
            print(f"COMUNE {ix}/{len(MUNICIPALITIES)} {town}: {inside} attività geolocalizzate nel raggio",flush=True)
        except Exception as exc:
            reports.append({"comune":town,"osmdb_elementi":0,"dentro_raggio":0,
                            "esito":"ERRORE","dettaglio":str(exc)[:200]})
            print(f"COMUNE ERRORE {town}: {exc}",flush=True)
        time.sleep(1.2)
    all_records=sorted(records.values(),key=lambda x:(x["comune_osm"],x["nome"].casefold()))
    csv_path=out/"imprese_av_search_20km.csv"
    with csv_path.open("w",newline="",encoding="utf-8-sig") as fp:
        writer=csv.DictWriter(fp,FIELDS,extrasaction="ignore",delimiter=";");writer.writeheader();writer.writerows(all_records)
    with (out/"report_comuni.csv").open("w",newline="",encoding="utf-8-sig") as fp:
        writer=csv.DictWriter(fp,["comune","osmdb_elementi","dentro_raggio","esito","dettaglio"],delimiter=";");writer.writeheader();writer.writerows(reports)
    summary={"esecuzione_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
             "centro_approssimativo":CENTER,"raggio_km":RADIUS_KM,
             "comuni_richiesti":len(MUNICIPALITIES),
             "comuni_riusciti":sum(x["esito"]=="OK" for x in reports),
             "comuni_errore":sum(x["esito"]!="OK" for x in reports),
             "attivita_osm_uniche":len(all_records),
             "email_osm_pubbliche":sum(bool(x["email_pubblica"]) for x in all_records),
             "consensi_verificati":0,
             "nota":"Nessun invio autorizzato; risultato OSM incompleto per attività non censite in OpenStreetMap.",
             "fonti":"© OpenStreetMap contributors (ODbL); https://www.openstreetmap.org/copyright",
             "comuni":reports}
    (out/"riepilogo.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print("RIEPILOGO",json.dumps({k:v for k,v in summary.items() if k!="comuni"},ensure_ascii=False),flush=True)
    if summary["comuni_errore"]:
        print("ATTENZIONE: censimento PARZIALE, vedere report_comuni.csv",flush=True)
    return 1 if summary["comuni_riusciti"]==0 else 0

if __name__=="__main__":
    sys.exit(run())
