"""GitHub Releases staging, NOT git commits. Deleting release assets actually frees staging storage."""
from __future__ import annotations
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote
from urllib.error import HTTPError
from .core import load_json, atomic_json, sha256, utc_now


class GitHubReleaseStaging:
    def __init__(self, repo: str, token: str | None = None):
        self.repo=repo
        self.token=token or os.getenv('GITHUB_TOKEN')
        if not self.token: raise RuntimeError('GITHUB_TOKEN missing — GitHub staging disabled')
        if '/' not in self.repo: raise ValueError('Repository must be owner/name')

    def request(self, method: str, url: str, payload: bytes | None = None, content_type: str = 'application/json'):
        hdr={'Authorization':f'Bearer {self.token}','Accept':'application/vnd.github+json',
             'User-Agent':'JosephSocialEngine/1.0','X-GitHub-Api-Version':'2022-11-28'}
        if payload is not None: hdr['Content-Type']=content_type
        try:
            with urlopen(Request(url, data=payload, headers=hdr, method=method),timeout=60) as resp:
                data=resp.read();return json.loads(data) if data else {}
        except HTTPError as e:
            detail=e.read().decode('utf-8',errors='replace')[:300]
            raise RuntimeError(f'GitHub HTTP {e.code}: {detail}') from e

    def create_or_get_release(self, campaign: str):
        api=f'https://api.github.com/repos/{self.repo}/releases'
        tag=f'joseph-staging-{campaign.lower()}'
        try:
            return self.request('GET',api+'/tags/'+tag)
        except RuntimeError as e:
            if '404' not in str(e):raise
        data={'tag_name':tag,'name':f'PREPUBBLICAZIONE {campaign}','body':'Asset temporanei da rimuovere dopo conferma Later. Non sono post già pubblicati.','draft':False,'prerelease':True}
        return self.request('POST',api,json.dumps(data).encode('utf8'))

    def upload(self, release: dict, path: Path):
        link=release['upload_url'].split('{')[0]+'?name='+quote(path.name)
        return self.request('POST',link,path.read_bytes(),'image/png')

    def remove(self, asset_id: int):
        self.request('DELETE',f'https://api.github.com/repos/{self.repo}/releases/assets/{asset_id}')

    def remove_release(self, release_id: int):
        self.request('DELETE',f'https://api.github.com/repos/{self.repo}/releases/{release_id}')


def stage_to_github(root: Path, campaign: str, client: GitHubReleaseStaging):
    folder=root/'outbox'/campaign
    manifest=load_json(folder/'manifest.json')
    if manifest.get('status') != 'ready_for_later_import':
        raise ValueError('Only complete, ready campaigns can be uploaded')
    if len(manifest.get('assets',{}))!=7: raise ValueError('Expected seven images')
    staged=folder/'github_staging.json'
    state=load_json(staged) if staged.exists() else {'campaign':campaign,'files':{},'staged_at':utc_now()}
    release=client.create_or_get_release(campaign)
    state['release_id']=release['id'];state['release_html_url']=release.get('html_url','')
    for file in sorted(folder.glob('*.png')):
        checksum=sha256(file)
        if file.stem not in manifest['assets'] or checksum!=manifest['assets'][file.stem]['sha256']:
            raise ValueError('Unverified media or unexpected PNG in outbox')
        if file.name in state['files']:
            if state['files'][file.name]['sha256']!=checksum:
                raise ValueError('Upload state conflicts with changed file')
            continue
        asset=client.upload(release,file)
        state['files'][file.name]={'asset_id':asset['id'],'sha256':checksum,'download_url':asset.get('browser_download_url','')}
        atomic_json(staged,state)
    return state


def remove_staged(root: Path, campaign: str, client: GitHubReleaseStaging):
    folder=root/'outbox'/campaign
    manifest=load_json(folder/'manifest.json')
    if manifest.get('status') not in {'delivered_confirmed','published_confirmed','cleaned'}:
        raise PermissionError('GitHub asset deletion blocked without confirmed Later deliveries')
    staged=folder/'github_staging.json'
    if not staged.exists(): return {'deleted':0,'reason':'No GitHub release staged'}
    state=load_json(staged)
    deleted=0
    for name, info in list(state['files'].items()):
        client.remove(info['asset_id']);deleted+=1
        del state['files'][name];atomic_json(staged,state)
    # Keep empty release as a durable tombstone so autopilot never regenerates this campaign.
    state['cleaned_at']=utc_now();atomic_json(staged,state)
    return {'deleted':deleted,'release_removed':False,'release_retained_as_tombstone':True}