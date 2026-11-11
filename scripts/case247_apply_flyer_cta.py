#!/usr/bin/env python3
"""Idempotent CASE247 caption update, inactive until the lead form is really approved."""
import argparse
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CONFIG=ROOT/"branding"/"flyer-cta.json"
QUEUE_DIR=ROOT/"campagne"/"case247"/"editorial-queue"

def transform(job:dict,cfg:dict)->bool:
    if cfg.get("enabled") is not True:
        return False
    if job.get("platform") not in ("facebook","instagram"):
        return False
    caption=job.get("caption")
    if not isinstance(caption,str):
        raise ValueError("Caption missing for "+str(job.get("id")))
    url=cfg.get("landing_url","")
    if not url.startswith("https://josephsocialmedia2-spec.github.io/"):
        raise ValueError("Flyer landing URL unverified")
    if url in caption:
        return False
    intro=cfg["instagram_cta"] if job["platform"]=="instagram" else cfg["facebook_cta"]
    job["caption"]=caption.rstrip()+"\n\n"+intro+"\n"+url
    return True

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--apply",action="store_true",help="Write modified JSON (only after release)")
    args=parser.parse_args()
    cfg=json.loads(CONFIG.read_text(encoding="utf-8"))
    if cfg.get("enabled") is not True:
        print("SKIPPED: form awaiting privacy & functionality release")
        return
    totals={"files":0,"captions":0}
    for file in sorted(QUEUE_DIR.glob("**/queue.json")):
        data=json.loads(file.read_text(encoding="utf-8"))
        modified=0
        for job in data.get("jobs",[]):
            if transform(job,cfg):modified+=1
        if modified:
            totals["files"]+=1
            totals["captions"]+=modified
            if args.apply:file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({**totals,"applied":args.apply},ensure_ascii=False))

if __name__=="__main__":main()
