import argparse
import json
from pathlib import Path
from .core import (plan, OpenAIOnlyGenerator, generate_campaign, record_receipt, cleanup, audit)
from .github_release import GitHubReleaseStaging, stage_to_github, remove_staged


def main():
    ap=argparse.ArgumentParser(description='Joseph Social Engine — OpenAI generated graphics only')
    ap.add_argument('--root',type=Path,default=Path('.').resolve(),help='Working root for outbox/queue/archive')
    sub=ap.add_subparsers(dest='cmd',required=True)
    p=sub.add_parser('plan', help='Build real 117-post 6-hour queue from existing GitHub CSVs')
    p.add_argument('--input',type=Path,nargs='+',required=True)
    p.add_argument('--start',required=True,help='ISO 8601 aware datetime, e.g. 2026-11-01T08:00:00+01:00')
    p.add_argument('--hours',type=int,default=6)
    p=sub.add_parser('generate',help='Render exactly with OpenAI GPT Image, using approved Joseph portrait')
    p.add_argument('--campaign',required=True)
    p.add_argument('--portrait',type=Path,required=True)
    p.add_argument('--model',choices=['gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare'],default='gpt-image-2')
    p.add_argument('--max-images',type=int,default=7)
    p=sub.add_parser('receipt', help='Register a verified delivery, scheduled, or publication receipt from Later')
    p.add_argument('--campaign',required=True)
    p.add_argument('--channel',choices=['facebook','instagram','linkedin'],required=True)
    p.add_argument('--state',choices=['media_imported','scheduled','published'],required=True)
    p.add_argument('--proof',required=True)
    p=sub.add_parser('cleanup',help='Erase images only after receipts for every channel')
    p.add_argument('--campaign',required=True)
    p=sub.add_parser('stage-github',help='Upload temporary PNGs as GitHub release assets, not Git commits')
    p.add_argument('--campaign',required=True)
    p.add_argument('--repo',default='josephsocialmedia2-spec/joseph-link-in-bio-Copia')
    p=sub.add_parser('remove-github',help='Delete temporary GitHub release assets only after Later receipts')
    p.add_argument('--campaign',required=True)
    p.add_argument('--repo',default='josephsocialmedia2-spec/joseph-link-in-bio-Copia')
    sub.add_parser('status',help='Show statuses and media inventory')
    opts=ap.parse_args();root=opts.root
    if opts.cmd=='plan': result={'posts':len(plan(root,opts.input,opts.start,opts.hours)),'queue_file':str(root/'queue.json'),'handoff':str(root/'later_handoff.csv')}
    elif opts.cmd=='generate': result=generate_campaign(root,opts.campaign,opts.portrait,OpenAIOnlyGenerator(opts.model),opts.max_images)
    elif opts.cmd=='receipt': result=record_receipt(root,opts.campaign,opts.channel,opts.proof,opts.state)
    elif opts.cmd=='cleanup': result=cleanup(root,opts.campaign)
    elif opts.cmd=='stage-github': result=stage_to_github(root,opts.campaign,GitHubReleaseStaging(opts.repo))
    elif opts.cmd=='remove-github': result=remove_staged(root,opts.campaign,GitHubReleaseStaging(opts.repo))
    else: result=audit(root)
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()