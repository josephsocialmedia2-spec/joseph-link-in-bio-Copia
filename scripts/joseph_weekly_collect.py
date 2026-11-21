#!/usr/bin/env python3
"""Candidati verificabili alla rassegna settimanale Joseph Malafronte.
La ricerca RSS non equivale a fact checking, né attribuisce metriche di popolarità.
"""
import datetime as dt
import email.utils
import json
import os
import pathlib
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUTPUT=ROOT / "gestione" / "rivista" / "data" / "latest.json"
QUERIES=[
 ("Immobiliare.it","site:immobiliare.it/news/ (Avigliana OR Torino OR mutui OR mercato immobiliare)"),
 ("idealista/news","site:idealista.it/news/ (Avigliana OR Valle di Susa OR Torino OR mutui)"),
 ("Casa.it","site:casa.it (Avigliana OR Valle di Susa OR mercato immobiliare)"),
 ("Il Sole 24 Ore","site:ilsole24ore.com (casa OR mutui OR immobiliare OR fiscalità)"),
 ("Stampa locale","(Avigliana OR 'Valle di Susa' OR Susa OR Condove) (casa OR immobiliare OR urbanistica OR ferrovia)"),
]

PROPERTY_PATTERNS=(
    "mercato immobiliare", "settore immobiliare", "agente immobiliare",
    "mediazione immobiliare", "prezzi delle case", "prezzi delle abitazioni",
    "prezzi immobiliari", "case occupate", "comprare casa", "vendere casa",
    "compravendit", "mutui", "mutuo", "ipotec", "cessione del credito",
    "ristruttur", "efficientamento energetico", "risparmio energetico",
    "permesso edilizio", "locazione", "contratti d'affitto", "affitti",
    "affitto", "condomin", "fisc", "agevolazioni prima casa",
    "bonus casa", "bonus ediliz", "salva casa", "abitazion",
    "ediliz", "tassi d'interesse", "aste immobil", "case all’asta",
    "case all'asta", "investimenti immobiliari", "immobili residenziali",
    "riqualificazione urbana", "rigenerazione urbana",
)
LISTING_PATTERNS=(
    " in vendita in via ", " in affitto in via ", "case in vendita a ",
    "in vendita a ", "villa in vendita", "capannoni in vendita",
    "bilocale in affitto", "trilocale in vendita", "box/posto auto in vendita",
    "appartamento in vendita", "casa indipendente in vendita",
    "attico, mansarda in vendita", "villetta a schiera in vendita",
)
LOCAL_TERMS=(
    "avigliana", "valle di susa", "valsusa", "susa", "condove", "almese",
    "bardonecchia", "bussoleno", "oulx", "sant'ambrogio", "sant’ ambrogio",
    "sant'antonino", "rubiana", "villar dora", "rivoli", "orbassano",
)
LOCAL_IMPACT=(
    "urbanistica", "urbanistico", "ferrovia", "stazione", "infrastrutt",
    "mobilità", "trasporti", "riqualificazione", "consumo di suolo",
    "edilizia", "intervento edilizio", "efficienza energetica", "valore delle case",
    "lavori di messa in sicurezza", "torrente", "alluvion", "frana",
    "servizi sanitari", "ospedale", "lavori per l'efficientamento",
)
def editorial_score(title):
    """Strict, auditable relevance gate. Off-topic lifestyle and listings are discarded."""
    t=title.casefold()
    if any(p in t for p in LISTING_PATTERNS):
        return 0
    local=any(p in t for p in LOCAL_TERMS)
    property_topic=any(p in t for p in PROPERTY_PATTERNS)
    territory_topic=any(p in t for p in LOCAL_IMPACT)
    if local and property_topic:
        return 5
    if local and territory_topic:
        return 4
    if property_topic:
        return 3
    return 0

def fetch_rss(query):
    url="https://news.google.com/rss/search?"+urllib.parse.urlencode({"q":query+" when:7d","hl":"it","gl":"IT","ceid":"IT:it"})
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; JosephWeekly/1.0)"})
    with urllib.request.urlopen(req,timeout=22) as f:
        return ET.fromstring(f.read(2_000_000))
def main():
    now=dt.datetime.now(dt.timezone.utc)
    cutoff=now-dt.timedelta(days=7)
    items=[];seen=set();errors=[]
    for source,query in QUERIES:
        try:
            root=fetch_rss(query)
            for item in root.findall(".//channel/item")[:20]:
                title=(item.findtext("title") or "").strip()
                url=(item.findtext("link") or "").strip()
                raw=(item.findtext("pubDate") or "").strip()
                try:published=email.utils.parsedate_to_datetime(raw).astimezone(dt.timezone.utc)
                except (ValueError,TypeError):continue
                if not title or not url or not (cutoff<=published<=now):continue
                relevance=editorial_score(title)
                if relevance==0:continue
                key=(title.lower(),published.date().isoformat())
                if key in seen:continue
                seen.add(key)
                items.append({
                    "title":title,
                    "source":source,
                    "date":published.date().isoformat(),
                    "url":url,
                    "summary":"Candidato individuato tramite rassegna RSS. Aprire la fonte originale, controllare contenuto, data, dati e impatto su Avigliana / Valle di Susa prima di approvare.",
                    "priority":relevance,
                    "territory":"Avigliana / Valle di Susa" if relevance>=4 else "Trend nazionale",
                    "status":"pending",
                    "discovery":"Google News RSS, non fact-checking",
                    "original_url_verified":False,
                })
        except Exception as exc:
            errors.append({"source":source,"reason":type(exc).__name__})
    items.sort(key=lambda x:(x["priority"],x["date"]),reverse=True)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    payload={"generated_at":now.isoformat(),"window_start":cutoff.date().isoformat(),"window_end":now.date().isoformat(),"items":items[:45],"errors":errors,"notice":"Fonti candidate non verificate. Non sono dimostrate classifiche di letture, commenti o condivisioni. È necessaria approvazione umana."}
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Candidati: {len(items)}, esportati: {len(payload['items'])}, errori feed: {len(errors)}")
if __name__=="__main__":main()
