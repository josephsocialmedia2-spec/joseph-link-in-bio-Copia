#!/usr/bin/env python3
"""CASE247: private, read-only Supabase export into a PRIVATE Google Sheet.
Requires protected credentials in GitHub Actions. Never put credentials or contacts in the repository.
"""
import json
import os
import sys
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

SHEET_ID="1ZLgeIqJzupfk4Q1VnIZmPbitKOvNZaUwxeNG9Zx3qfY"
API="https://sheets.googleapis.com/v4/spreadsheets/"+SHEET_ID
SUPABASE="https://qmeftxsdfeyqozwoivzo.supabase.co"
KEY=os.environ.get("CASE247_NEWSLETTER_SERVICE_ROLE_KEY", "")
GOOGLE=os.environ.get("CASE247_SHEETS_SERVICE_ACCOUNT_JSON", "")
if not KEY or not GOOGLE:
    print("SKIP: protected Supabase and Google Sheets credentials not configured.")
    sys.exit(0)

creds=service_account.Credentials.from_service_account_info(
    json.loads(GOOGLE),
    scopes=["https://www.googleapis.com/auth/spreadsheets"])
gs=AuthorizedSession(creds)
headers={"apikey":KEY,"Authorization":"Bearer "+KEY,"Accept":"application/json"}

def read_table(table, fields, order_col='created_at'):
    out=[]
    for offset in range(0,10000,1000):
        response=requests.get(SUPABASE+"/rest/v1/"+table,
            params={"select":",".join(fields),"order":order_col+".asc","limit":1000,"offset":offset},
            headers=headers,timeout=25)
        response.raise_for_status()
        batch=response.json()
        out.extend(batch)
        if len(batch)<1000:
            return out
    raise RuntimeError("Export exceeds permitted 10,000 rows; extend pagination safely.")

def val(row,key):
    v=row.get(key)
    return "" if v is None else str(v)

def api_json(method,endpoint,payload=None):
    response=gs.request(method,API+endpoint,json=payload,timeout=40)
    response.raise_for_status()
    return response.json() if response.content else {}

def sheet_get(range_name):
    return api_json("GET","/values/"+requests.utils.quote(range_name,safe="!:'")) .get("values",[])

def write_table(name,rows,width):
    endpoint="/values/"+requests.utils.quote(name+"!A2",safe="!:'")+"?valueInputOption=RAW"
    # Write new rows first, then clear the stale tail only.
    if rows:
        api_json("PUT",endpoint,{"majorDimension":"ROWS","values":rows})
    last=len(rows)+2
    api_json("POST","/values:batchClear",{"ranges":[name+"!A"+str(last)+":"+chr(64+width)+"10000"]})

subscribers=read_table("case247_newsletter_subscribers",[
    "id","requested_at","contact_name","email","phone","interest","consent_source",
    "state","confirmed_at","last_sent_month","unsubscribed_at"])
notes={}
try:
    old=sheet_get("CONTATTI!A2:N10000")
    for row in old:
        if len(row)>=14 and row[13] and len(row)>=13:
            notes[row[13]]=row[12]
except Exception as error:
    # Fail rather than risk discarding manually entered notes.
    raise RuntimeError("Cannot read existing CRM notes; sync canceled.") from error

contacts=[]
for x in subscribers:
    contacts.append([
        val(x,"id"),val(x,"requested_at"),val(x,"contact_name"),val(x,"email"),
        val(x,"phone"),val(x,"interest"),val(x,"interest"),val(x,"consent_source"),
        val(x,"state"),val(x,"confirmed_at"),val(x,"last_sent_month"),
        val(x,"unsubscribed_at"),notes.get(val(x,"id"),""),val(x,"id")])

events=read_table("case247_newsletter_events",["id","subscriber_id","event_at","event_type","notice_version"],"event_at")
consent_rows=[[val(x,"id"),val(x,"subscriber_id"),val(x,"event_at"),val(x,"event_type"),"EMAIL",val(x,"notice_version"),"Newsletter web",""] for x in events]
dispatch=read_table("case247_newsletter_dispatches",["id","subscriber_id","issue_month","state","sent_at","provider_id","error_code"],"id")
dispatch_rows=[[val(x,"id"),val(x,"subscriber_id"),val(x,"issue_month"),val(x,"state"),val(x,"sent_at"),val(x,"provider_id"),val(x,"error_code")] for x in dispatch]

write_table("CONTATTI",contacts,14)
write_table("CONSENSI",consent_rows,8)
write_table("INVII_MENSILI",dispatch_rows,7)
print("CRM sheets synchronized; counts:",len(contacts),len(consent_rows),len(dispatch_rows))
