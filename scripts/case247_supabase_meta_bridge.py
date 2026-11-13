#!/usr/bin/env python3
"""Read Meta authorization from a secured Supabase Edge Function (no token in Git).

Only authorized registry rows are usable. Fail closed on secret/network/Meta error.
Metadata is written to config/case247-territorio.json ONLY after server validation.
"""
from __future__ import annotations

import argparse
import copy
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

from case247_territorial_engine import ROOT, atomic_write, read_json

CONFIG=ROOT / "config/case247-territorio.json"
DEFAULT_URL="https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-regia-meta-bridge"
CHANNELS=("facebook","instagram")


class BridgeError(RuntimeError):
    pass


def verified_bridge_url():
    url=os.getenv("CASE247_META_BRIDGE_URL", DEFAULT_URL)
    parts=urllib.parse.urlsplit(url)
    if (parts.scheme!="https" or parts.hostname!="qmeftxsdfeyqozwoivzo.supabase.co"
        or parts.path!="/functions/v1/case247-regia-meta-bridge" or parts.query or parts.fragment):
        raise BridgeError("META_BRIDGE_URL_NOT_ALLOWED")
    return url


def fetch_verified_channels(mode="metadata"):
    """Fetch server-verified account metadata or ephemeral tokens. Never log response."""
    if mode not in ("metadata","credentials"):
        raise BridgeError("INVALID_BRIDGE_MODE")
    secret=os.getenv("CASE247_REGIA_BRIDGE_KEY","")
    if len(secret)<48:
        raise BridgeError("CASE247_REGIA_BRIDGE_KEY_MISSING")
    req=urllib.request.Request(verified_bridge_url(), data=b"{}", method="POST",
        headers={"x-case247-regia-key":secret,"x-case247-bridge-mode":mode,
                 "accept":"application/json","content-type":"application/json",
                 "user-agent":"CASE247-regia/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=35) as response:
            doc=json.load(response)
    except urllib.error.HTTPError as exc:
        # Headers, URLs with credentials, secret and API body are never logged.
        raise BridgeError("SUPABASE_BRIDGE_HTTP_"+str(exc.code)) from None
    except (OSError,TimeoutError,ValueError,json.JSONDecodeError):
        raise BridgeError("SUPABASE_BRIDGE_UNAVAILABLE") from None
    if not isinstance(doc,dict) or doc.get("ok") is not True:
        raise BridgeError("META_BRIDGE_PROVIDER_NOT_READY")
    accounts=doc.get("accounts")
    if not isinstance(accounts,dict):
        raise BridgeError("META_BRIDGE_INVALID_RESPONSE")
    for town_id,channels in accounts.items():
        if not isinstance(town_id,str) or not isinstance(channels,dict):
            raise BridgeError("META_BRIDGE_INVALID_ACCOUNT")
        for network,account in channels.items():
            if network not in CHANNELS or not isinstance(account,dict):
                raise BridgeError("META_BRIDGE_INVALID_ACCOUNT")
            if (not str(account.get("provider_id","")).isdigit()
                or not str(account.get("url","")).startswith("https://")
                or account.get("status")!="ACTIVE_VERIFIED"
                or account.get("publishing_enabled") is not True):
                raise BridgeError("META_BRIDGE_INVALID_VERIFICATION")
            if mode=="credentials":
                pid=account.get("page_id") if network=="facebook" else account.get("ig_user_id")
                if (str(pid)!=str(account["provider_id"])
                    or not isinstance(account.get("access_token"),str)
                    or len(account["access_token"])<20):
                    raise BridgeError("META_BRIDGE_INVALID_TOKEN")
    return accounts,doc.get("token_state","UNKNOWN")


def effective_config(config, accounts):
    """Return copies of public config with live status set ONLY from broker."""
    result=copy.deepcopy(config)
    towns=result.get("towns",[])
    allowed={t["id"] for t in towns}
    if any(t not in allowed for t in accounts):
        raise BridgeError("META_BRIDGE_UNKNOWN_TERRITORY")
    for town in towns:
        granted=accounts.get(town["id"],{})
        enabled=False
        for network in CHANNELS:
            channel=town.setdefault("channels",{}).setdefault(network,{})
            verified=granted.get(network)
            if verified:
                channel.update({
                    "status":"ACTIVE_VERIFIED","provider_id":str(verified["provider_id"]),
                    "url":verified["url"],
                })
                enabled=True
            else:
                channel["status"]="DA_VERIFICARE"
                channel.pop("provider_id",None)
                # URL stays informative but never authorizes publishing.
        town["auto_publish"]=enabled
    return result


def sync_config():
    config=read_json(CONFIG)
    if not isinstance(config,dict):
        raise BridgeError("META_CONFIG_MISSING")
    try:
        accounts,token_state=fetch_verified_channels("metadata")
    except BridgeError as error:
        print("META_METADATA_BLOCKED "+str(error))
        accounts={}
        token_state="UNAVAILABLE"
    updated=effective_config(config,accounts)
    if updated!=config:
        atomic_write(CONFIG,updated)
    verified=sum(len(channels) for channels in accounts.values())
    print(f"META_METADATA_SYNC verified={verified} token_state={token_state} only_verified_channels_enabled=true")
    return verified


def credentials_for_publisher(config):
    accounts,_=fetch_verified_channels("credentials")
    # The public configuration must agree with the runtime-verified backend.
    checked=effective_config(config,accounts)
    for original,latest in zip(config.get("towns",[]),checked.get("towns",[])):
        for network in CHANNELS:
            old=original.get("channels",{}).get(network,{})
            new=latest.get("channels",{}).get(network,{})
            if (new.get("status")=="ACTIVE_VERIFIED" and
                (old.get("status")!="ACTIVE_VERIFIED"
                 or str(old.get("provider_id",""))!=str(new.get("provider_id"))
                 or old.get("url")!=new.get("url") or not original.get("auto_publish"))):
                raise BridgeError("TERRITORIAL_CONFIG_NOT_SYNCHRONIZED")
    # Return a conventional map to the existing publisher, only in RAM.
    return accounts


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--sync-config",action="store_true")
    args=p.parse_args()
    if args.sync_config:
        sync_config()
    else:
        accounts,state=fetch_verified_channels("metadata")
        print(json.dumps({"meta_verified_channels":sum(map(len,accounts.values())),
                          "token_state":state},sort_keys=True))


if __name__=="__main__":
    main()
