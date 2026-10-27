"""Joseph Social Engine: GPT Image only, sequential, auditable campaign engine."""
from __future__ import annotations

import base64
import csv
import hashlib
import json
import os
import re
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from typing import Protocol
from .branding import verify_brand_archive, extract_master_image, visual_review, BrandViolation, validate_copy

TZ = ZoneInfo('Europe/Rome')
SUPPORTED = {'facebook', 'instagram', 'linkedin'}
ALLOWED_MODEL = {'gpt-image-2', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'}
WHATSAPP = '393713708294'


def utc_now() -> str:
    return datetime.now(TZ).isoformat(timespec='seconds')


def atomic_json(path: Path, obj: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf8')
    tmp.replace(path)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf8'))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_posts(paths: list[Path]) -> list[dict]:
    posts: list[dict] = []
    seen = set()
    for path in paths:
        with path.open(encoding='utf-8-sig', newline='') as f:
            for row in csv.DictReader(f):
                code = row.get('Codice', '').strip().upper()
                channel = row.get('Social network', '').strip().lower()
                url = row.get('URL landing', '').strip()
                copy = row.get('Testo proposto', '').strip()
                if not re.fullmatch(r'(IMM|COM)\d\d', code) or channel not in SUPPORTED:
                    raise ValueError(f'Invalid campaign/platform in {path}: {code}/{channel}')
                if not (url.startswith('https://') and 'josephsocialmedia2-spec.github.io/' in url):
                    raise ValueError(f'Unexpected landing URL for {code}: {url}')
                if len(copy) < 20:
                    raise ValueError(f'Missing copy for {code}/{channel}')
                key = (code, channel)
                if key in seen:
                    raise ValueError(f'Duplicate {key}')
                seen.add(key)
                posts.append({'code': code, 'channel': channel, 'title': row['Angolo comunicativo'].strip(), 'copy': copy, 'landing': url})
    return posts


def alternate_campaigns(posts: list[dict]) -> list[dict]:
    """Cycle IMM and COM campaign groups; each group has native FB/IG/LI variants."""
    grouped: dict[str, list[dict]] = {}
    for p in posts:
        grouped.setdefault(p['code'], []).append(p)
    imm = sorted((k for k in grouped if k.startswith('IMM')))
    com = sorted((k for k in grouped if k.startswith('COM')))
    codes = []
    while imm or com:
        if imm: codes.append(imm.pop(0))
        if com: codes.append(com.pop(0))
    return [p for c in codes for p in sorted(grouped[c], key=lambda p: {'facebook':0,'instagram':1,'linkedin':2}[p['channel']])]


def build_calendar(posts: list[dict], start: str, hours: int = 6) -> list[dict]:
    if hours < 1: raise ValueError('Minimum cadence is 1 hour')
    dt = datetime.fromisoformat(start)
    if dt.tzinfo is None: raise ValueError('Start must have time zone offset')
    dt = dt.astimezone(TZ)
    result = []
    for i, p in enumerate(alternate_campaigns(posts)):
        when = dt + timedelta(hours=i*hours)
        result.append({**p, 'id': f"{p['code']}_{p['channel']}", 'scheduled_for': when.isoformat(timespec='minutes'), 'status': 'draft_unpublished', 'platform_receipt': None})
    return result


def plan(root: Path, csv_paths: list[Path], start: str, hours: int = 6) -> list[dict]:
    items = load_posts(csv_paths)
    calendar = build_calendar(items, start, hours)
    if len({p['code'] for p in calendar}) != 39 or len(calendar) != 117:
        raise ValueError(f'Expected 39 campaign topics and 117 variants; got {len({p["code"] for p in calendar})} / {len(calendar)}')
    root.mkdir(parents=True, exist_ok=True)
    atomic_json(root / 'queue.json', calendar)
    with (root / 'later_handoff.csv').open('w', encoding='utf-8-sig', newline='') as f:
        fields = ['id','code','channel','scheduled_for','title','copy','landing','status','media_folder']
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
        for p in calendar:
            w.writerow({**{k:p.get(k,'') for k in fields}, 'media_folder':f"outbox/{p['code']}"})
    return calendar


def style_for(code: str) -> str:
    if code.startswith('IMM'):
        return 'Real estate educational visual: Valle di Susa landscape, verified data, respectful real estate context.'
    return 'Local enterprise visual: a credible small business setting, customers and operations, no fictitious clients.'


def prompt_for(item: dict, kind: str, slide: int | None = None) -> str:
    title = item['title']
    copy = item['copy'][:600].replace('\n',' ')
    stage = ['Apertura: domanda incisiva e leggibile.', 'Problema pratico del target.',
             'Spiegazione e fattori concreti senza dati inventati.',
             'Il Metodo Remarketing: visibilità, interesse, richiesta, opportunità e misurazione.',
             'CTA: Scopri la guida; scrivi a Joseph su WhatsApp 371 370 8294.']
    detail = stage[slide-1] if kind == 'carousel' and slide else (
        'Grafica statica: una headline + sottotitolo + CTA.' if kind == 'static' else 'Cover Story: headline breve, composizione verticale, CTA visibile.')
    return f'''Create ONE premium Italian social media image for Joseph Digital Strategist. Campaign {item['code']} — {title}.
Use attached Joseph portrait as EXACT face identity reference; keep same identifiable face, no invented new identity. Scene: Joseph actually working (presenting a strategy, reviewing web analytics, filming marketing content). AI illustration must not imply a real witnessed event or customer testimonial.
Use strictly approved REAL MEDIA PRO visual identity from branding/brand.json and the supplied brand MASTER image: navy #082C58 and #061A36, cobalt #1587E3, sky #59B9F6, pure white, subdued green only for WhatsApp CTA. Logo with blue geometric alpine mountains. Use clean, airy premium editorial composition, never copy overloaded flyer layouts. Confident, editorial, contemporary, photorealistic work scene with uncluttered typography, not a generic template. Professional look. Respect accurate spelling in Italian.
{style_for(item['code'])}
Source message: {copy}
Visual narrative for {kind} {slide or ''}: {detail}
Display mark 'JOSEPH DIGITAL STRATEGIST'; subline 'IL METODO REMARKETING'. Max 22 words of large text. Text must remain legible on phone, with safe margins. Do not include a printed web URL (CTA link is in post caption). No fake badges, sales guarantees, real-estate mediation promises, fabricated numbers, screenshots of invented dashboards, third-party logos, or watermark. Avoid overly busy decorative vectors.
Generate portrait composition 2:3 allowing center crop to 4:5 for feed. Produce real pixels, no SVG substitutes.'''


class Generator(Protocol):
    def generate(self, prompt: str, output: Path, reference: Path, previous: Path | None = None) -> None: ...


class OpenAIOnlyGenerator:
    """Production generator. No Pillow drawings, external design sites, or fallback models."""
    def __init__(self, model: str = 'gpt-image-2'):
        if model not in ALLOWED_MODEL:
            raise ValueError('Only authorized OpenAI GPT Image models are allowed')
        if not os.getenv('OPENAI_API_KEY'):
            raise RuntimeError('OPENAI_API_KEY missing: live image generation blocked, never silently mocked')
        from openai import OpenAI
        self.client = OpenAI()
        self.model = model
        self.brand = verify_brand_archive()
        self.master_image = extract_master_image(Path(os.getenv("RUNNER_TEMP", "/tmp")) / "rmp_brand_reference", self.brand)

    def generate(self, prompt: str, output: Path, reference: Path, previous: Path | None = None) -> None:
        if not reference.exists(): raise FileNotFoundError(f'Portrait reference missing: {reference}')
        from contextlib import ExitStack
        with ExitStack() as stack:
            inputs=[stack.enter_context(reference.open('rb'))]
            inputs.append(stack.enter_context(self.master_image.open('rb')))  # mandatory official brand master
            if previous and previous.exists():
                inputs.append(stack.enter_context(previous.open('rb')))
                prompt += '\nMaintain layout, palette, typographic hierarchy and face identity from the previous successfully brand-audited image, while preserving the verified Joseph face and true identity from the portrait reference and REAL MEDIA PRO master branding.'
            result = self.client.images.edit(model=self.model, image=inputs,
                prompt=prompt, size='1024x1536', quality='high', output_format='png')
        data = result.data[0].b64_json
        if not data: raise RuntimeError('OpenAI did not return image bytes')
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(base64.b64decode(data))


def validate_image(path: Path) -> dict:
    """Mechanical media QA; optical/layout review remains separate."""
    from PIL import Image
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        width, height=im.size
        if width < 800 or height < 1000: raise ValueError(f'Image too small: {path} {im.size}')
        return {'width':width,'height':height,'bytes':path.stat().st_size,'sha256':sha256(path)}


def generate_campaign(root: Path, campaign: str, reference: Path, generator: Generator, max_images: int = 7) -> dict:
    queue = load_json(root/'queue.json')
    items = [p for p in queue if p['code']==campaign]
    if not items: raise ValueError(f'Unknown campaign {campaign}')
    if not reference.is_file(): raise FileNotFoundError('Use an approved photo of Joseph; no synthetic placeholder in production')
    if max_images < 1 or max_images > 7: raise ValueError('max_images must be in 1..7')
    folder=root/'outbox'/campaign
    folder.mkdir(parents=True, exist_ok=True)
    manifestfile=folder/'manifest.json'
    manifest=load_json(manifestfile) if manifestfile.exists() else {'code':campaign,'created':utc_now(),'status':'generating','image_engine':'openai_gpt_image_only','assets':{},'platform_receipts':{},'quality':{}}
    plans=[('static',None), *[('carousel',i) for i in range(1,6)], ('story',None)]
    previous=None
    for kind, number in plans[:max_images]:
        name=kind+(f'_{number:02d}' if number else '')+'.png'
        output=folder/name
        key=kind+(f'_{number:02d}' if number else '')
        if output.exists() and key in manifest['assets']:
            if sha256(output)==manifest['assets'][key]['sha256']:
                previous=output
                continue
        prompt=prompt_for(items[0], kind, number)
        (folder/(key+'.prompt.txt')).write_text(prompt,encoding='utf8')
        generator.generate(prompt,output,reference,previous)
        # The actual production generator is subject to a separate independent multimodal
        # brand critic. Every slide uses the last ACCEPTED slide autoregressively.
        if isinstance(generator, OpenAIOnlyGenerator):
            audit=None
            for attempt in range(3):
                audit=visual_review(generator.client, output, generator.master_image, reference)
                if audit['pass']:
                    break
                if attempt == 2:
                    output.unlink(missing_ok=True)
                    raise BrandViolation('Brand identity QA failed: '+str(audit['issues']))
                repair='Recreate this visual correcting ALL brand audit failures: '+audit['repair_prompt']+'; '+', '.join(audit['issues'])
                generator.generate(prompt+'\\n'+repair,output,reference,previous)
            manifest.setdefault('quality',{})[key]=audit
        manifest['assets'][key]=validate_image(output)
        previous=output
        atomic_json(manifestfile,manifest)
    if isinstance(generator, OpenAIOnlyGenerator) and len(manifest['assets']) == 7:
        from .caption_engine import create_social_captions
        # Existing draft copy is an editorial seed, not permission to fabricate or infer market data.
        # If any dated/statistical claims are present, the caption engine requires verified sources.
        captions=create_social_captions(generator.client, items[0]['title'], items[0]['copy'],
                                        items[0]['landing'], items[0].get('source_url'),
                                        items[0].get('source_date'))
        for channel,caption in captions.items():
            (folder/('caption_'+channel+'.txt')).write_text(caption, encoding='utf8')
        manifest['caption_status']='generated_not_published'
        manifest['caption_sources']={'url':items[0].get('source_url'), 'date':items[0].get('source_date')}
    elif not isinstance(generator, OpenAIOnlyGenerator):
        for item in items:
            (folder/('caption_'+item['channel']+'.txt')).write_text(item['copy'], encoding='utf8')
    if len(manifest['assets'])==7:
        manifest['status']='ready_for_later_import'
    atomic_json(manifestfile,manifest)
    return manifest


def record_receipt(root: Path, campaign: str, channel: str, confirmation: str, state: str) -> dict:
    """Record evidence: later media imported or public post URL. No inferred success."""
    if channel not in SUPPORTED: raise ValueError('Invalid channel')
    if state not in {'media_imported','scheduled','published'}: raise ValueError('Invalid receipt state')
    if len(confirmation.strip()) < 8: raise ValueError('External Later ID or proof URL required')
    path=root/'outbox'/campaign/'manifest.json'
    manifest=load_json(path)
    if manifest.get('status') not in {'ready_for_later_import','delivered_confirmed','published_confirmed'}:
        raise ValueError('Campaign images are not complete')
    manifest['platform_receipts'][channel]={'state':state,'evidence':confirmation.strip(),'verified_at':utc_now()}
    receipts=manifest['platform_receipts']
    if all(ch in receipts and receipts[ch]['state']=='published' for ch in SUPPORTED):
        manifest['status']='published_confirmed'
    elif all(ch in receipts and receipts[ch]['state'] in {'media_imported','scheduled','published'} for ch in SUPPORTED):
        manifest['status']='delivered_confirmed'
    atomic_json(path,manifest)
    return manifest


def cleanup(root: Path, campaign: str) -> dict:
    """Deletes derivatives only after 3 independent delivery receipts. Keeps archive and reference intact."""
    path=root/'outbox'/campaign/'manifest.json'
    manifest=load_json(path)
    if manifest['status'] not in {'delivered_confirmed','published_confirmed'}:
        raise PermissionError('Deletion blocked: Later delivery or publication not confirmed on all 3 platforms')
    images=list(path.parent.glob('*.png'))
    for f in images:
        k=f.stem
        if k not in manifest['assets'] or sha256(f)!=manifest['assets'][k]['sha256']:
            raise ValueError('Unexpected or modified media; no deletion')
    archive={**manifest,'archive_date':utc_now(),'cleanup_deleted':[f.name for f in images]}
    atomic_json(root/'archive'/f'{campaign}.json',archive)
    for f in images: f.unlink()
    manifest['status']='cleaned'
    atomic_json(path,manifest)
    return {'deleted':len(images),'retained':str(root/'archive'/f'{campaign}.json')}


def audit(root: Path) -> dict:
    queue=load_json(root/'queue.json')
    plans=len(queue); assets=0; status={}
    for path in (root/'outbox').glob('*/manifest.json') if (root/'outbox').exists() else []:
        m=load_json(path);assets+=len(m['assets']);status[m['code']]=m['status']
    return {'posts_planned':plans,'campaigns':len({q['code'] for q in queue}),'images_generated':assets,'campaign_status':status,'all_scheduled':all(bool(p.get('platform_receipt')) for p in queue)}
