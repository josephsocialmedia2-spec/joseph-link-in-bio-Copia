"""One GitHub Actions iteration; never floods GitHub storage or spends without a configured key."""
from __future__ import annotations
import argparse
import os
from pathlib import Path
from .core import plan, generate_campaign, OpenAIOnlyGenerator, utc_now
from .github_release import GitHubReleaseStaging, stage_to_github


def select_next(queue: list[dict], releases: list[dict], max_pending: int = 2):
    """Returns next not-yet-produced campaign, or None if staging quota is full."""
    staged = {}
    for release in releases:
        tag = release.get('tag_name','')
        if not tag.startswith('joseph-staging-'):continue
        code=tag[len('joseph-staging-'):].upper()
        staged[code] = release
    def is_unfinished(value):
        if not value.get('assets'):
            return False
        try:
            record = __import__('json').loads(value.get('body') or '{}')
        except (TypeError, ValueError):
            record = {}
        receipts = record.get('receipts', {})
        return not all(ch in receipts and receipts[ch].get('post_id') for ch in ('facebook', 'instagram', 'linkedin'))
    pending=sum(1 for value in staged.values() if is_unfinished(value))
    if pending>=max_pending: return None, f'Paused: {pending} pending campaigns not yet imported into Later'
    codes=list(dict.fromkeys(p['code'] for p in queue))
    for code in codes:
        if code not in staged: return code, f'Generating campaign {code}; {pending}/{max_pending} pending'
    return None, 'All campaigns generated at least once'


def run(root: Path, csv_paths: list[Path], portrait: Path, start: str, repo: str, max_pending: int = 2):
    if not os.getenv('OPENAI_API_KEY'):
        return {'status':'not_configured','detail':'OPENAI_API_KEY missing; no charge or generated images'}
    if not os.getenv('GITHUB_TOKEN'):
        return {'status':'not_configured','detail':'GITHUB_TOKEN missing; no remote staging'}
    queue=plan(root,csv_paths,start)
    github=GitHubReleaseStaging(repo)
    releases=github.request('GET',f'https://api.github.com/repos/{repo}/releases?per_page=100')
    code,why=select_next(queue,releases,max_pending)
    if not code:return {'status':'paused','reason':why}
    manifest=generate_campaign(root,code,portrait,OpenAIOnlyGenerator(),max_images=7)
    staged=stage_to_github(root,code,github)
    return {'status':'staged_on_github','code':code,'image_count':len(manifest['assets']),
            'release':staged.get('release_html_url'),'at':utc_now(),
            'next_action':'Await verified Later media import for all social profiles'}


def main():
    parser=argparse.ArgumentParser(description='Safe OpenAI-only campaign autopilot')
    parser.add_argument('--root',type=Path,default=Path('.'))
    parser.add_argument('--input',nargs=2,required=True,type=Path)
    parser.add_argument('--portrait',type=Path,required=True)
    parser.add_argument('--repo',default='josephsocialmedia2-spec/joseph-link-in-bio-Copia')
    parser.add_argument('--start',default='2026-11-01T08:00:00+01:00')
    parser.add_argument('--max-pending',type=int,default=2)
    opts=parser.parse_args()
    import json
    print(json.dumps(run(opts.root,opts.input,opts.portrait,opts.start,opts.repo,opts.max_pending),ensure_ascii=False,indent=2))

if __name__=='__main__':main()