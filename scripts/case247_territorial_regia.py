#!/usr/bin/env python3
"""CASE247 territorial scheduling: fail-closed planning, never publish by itself."""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("Europe/Rome")
SLOTS = ("00:00", "04:00", "08:00", "12:00", "16:00", "20:00")
RADIUS_KM = 20.0

def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))

def distance_km(a, b):
    p1, l1, p2, l2 = map(math.radians, (float(a[0]),float(a[1]),float(b[0]),float(b[1])))
    h = math.sin((p2-p1)/2)**2 + math.cos(p1)*math.cos(p2)*math.sin((l2-l1)/2)**2
    return 6371.0088 * 2 * math.asin(min(1, math.sqrt(h)))

def coord(value):
    if not isinstance(value, dict): return None
    lat = value.get("latitude", value.get("lat"))
    lon = value.get("longitude", value.get("lon"))
    try:
        a,b=float(lat),float(lon)
        if -90 <= a <= 90 and -180 <= b <= 180: return (a,b)
    except (TypeError, ValueError): pass
    return None

def connected(town, network):
    cfg = town.get("channels",{}).get(network,{})
    return bool(cfg.get("url")) and cfg.get("status") in ("VERIFICATO","CONNECTED","ATTIVO") and town.get("auto_publish") is True

def listing_active(item):
    state = str(item.get("status", item.get("availability", ""))).strip().lower()
    return state not in ("venduto","sold","ritirato","removed","deleted","non disponibile","in trattativa") and bool(item.get("image")) and bool(item.get("url"))

def plan(catalog, territory, media, coordinates, day, existing=None):
    existing = existing or []
    towns = territory.get("towns",[])
    town_coords = coordinates.get("towns",{})
    slots = [("facebook" if day.toordinal()%2 == 0 else "instagram", "instagram" if day.toordinal()%2 == 0 else "facebook")]
    accounts = []
    for town in towns:
        for network in ("facebook","instagram"):
            if connected(town,network):
                accounts.append((town,network))
    occupancy = {(x["town_id"],x["network"],x["time"]) for x in existing if x.get("date")==day.isoformat() and all(k in x for k in ("town_id","network","time"))}
    already = {str(x.get("listing_id")) for x in existing if x.get("date")==day.isoformat() and x.get("listing_id")}
    assigned, blocked = [], []
    for item in sorted(catalog.get("items",[]),key=lambda i:str(i["id"])):
        ident = str(item["id"])
        if ident in already: continue
        if not listing_active(item):
            blocked.append({"id":ident,"reason":"UNAVAILABLE_OR_MISSING_MEDIA"}); continue
        if item.get("location_status")!="VERIFICATO_FONTE" or item.get("town_id") not in town_coords:
            blocked.append({"id":ident,"reason":"MISSING_VERIFIED_LOCATION"}); continue
        source = coord(item)  # Exact property location, not merely town-center guesswork.
        if source is None:
            blocked.append({"id":ident,"reason":"PROPERTY_COORDINATES_REQUIRED_FOR_STRICT_20KM"});continue
        options=[]
        preferred = slots[0][0]
        for town, network in accounts:
            dest=coord(town_coords.get(town["id"]))
            if dest is None: continue
            km=distance_km(source,dest)
            if km>RADIUS_KM: continue
            for index,time in enumerate(SLOTS):
                if index%2 != 0: continue # Three property slots, three creative slots.
                if (town["id"],network,time) in occupancy: continue
                load=sum(x["town_id"]==town["id"] and x["network"]==network for x in assigned)
                score=(0 if network==preferred else 1,0 if town["id"]==item["town_id"] else 1,load,round(km,4),index,town["id"])
                options.append((score,town,network,time,km))
        if not options:
            blocked.append({"id":ident,"reason":"NO_VERIFIED_CONNECTED_ACCOUNT_WITH_FREE_LOCAL_SLOT"});continue
        _,town,network,time,km=min(options,key=lambda x:x[0])
        occupancy.add((town["id"],network,time))
        assigned.append({"date":day.isoformat(),"time":time,"listing_id":ident,"town_id":town["id"],"network":network,"distance_km":round(km,2),"landing_url":town["landing_url"],"source_url":item["url"],"media_url":item["image"],"source_updated_at":item.get("source_updated_at"),"status":"PLANNED_NOT_PUBLISHED"})
    creative=[x for x in media.get("entries",[]) if x.get("public_image_url") and x.get("ai_generated") and x.get("status")=="JPG_REPOSITORY_PRESENT"]
    creative_slots=[]
    if creative:
        for n,(town,network) in enumerate(accounts):
            for index in (1,3,5):
                time=SLOTS[index]
                if (town["id"],network,time) in occupancy: continue
                asset=creative[(day.toordinal()*3+n*3+index//2)%len(creative)]
                creative_slots.append({"date":day.isoformat(),"time":time,"town_id":town["id"],"network":network,"creative_id":asset["id"],"media_url":asset["public_image_url"],"ai_generated":True,"label":"Ricostruzione illustrativa generata con IA","status":"PLANNED_NOT_PUBLISHED"})
    return {"date":day.isoformat(),"catalog_count":len(catalog.get("items",[])),"eligible_accounts":len(accounts),"property_posts":assigned,"creative_posts":creative_slots,"blocked":blocked,"published_count":0,"status":"PLAN_ONLY_NO_SOCIAL_API_CALL"}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--date",default=dt.datetime.now(TZ).date().isoformat())
    p.add_argument("--output",default="campagne/case247/territorio/regia-plan.json")
    args=p.parse_args()
    day=dt.date.fromisoformat(args.date)
    coords_path=ROOT/"config/case247-verified-coordinates.json"
    coordinates=json.loads(coords_path.read_text()) if coords_path.exists() else {"towns":{}}
    catalog=load("immobili/catalogo.json")
    territory=load("config/case247-territorio.json")
    media=load("campagne/case247/dietro-le-quinte/manifest-60.json")
    result=plan(catalog,territory,media,coordinates,day)
    out=ROOT/args.output
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"CASE247 plan: {len(result['property_posts'])} property posts, {len(result['blocked'])} blocked; no posts sent.")

if __name__=="__main__":
    main()
