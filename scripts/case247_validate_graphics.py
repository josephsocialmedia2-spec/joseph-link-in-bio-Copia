#!/usr/bin/env python3
"""Strict, reproducible CASE247 JPG technical audit (no editorial claims).

Technical approval is not consent, rights clearance, content accuracy or
approval to publish. Editorial gates are preserved.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageFile, UnidentifiedImageError
from case247_territorial_engine import ROOT, atomic_write

Image.MAX_IMAGE_PIXELS=22_000_000
ImageFile.LOAD_TRUNCATED_IMAGES=False
MANIFEST=ROOT/"campagne/case247/dietro-le-quinte/manifest-60.json"


def validate_image(file:Path,width:int,height:int):
    if not file.exists() or file.is_symlink() or not file.is_file():
        return None,"MISSING_IMAGE"
    if file.stat().st_size<1024 or file.stat().st_size>15_000_000:
        return None,"IMAGE_SIZE_LIMIT"
    raw=file.read_bytes()
    if raw[:3]!=b"\xff\xd8\xff" or raw[-2:]!=b"\xff\xd9":
        return None,"JPEG_MAGIC_OR_TRUNCATED"
    try:
        with Image.open(file) as im:
            if im.format!="JPEG" or im.size!=(width,height):
                return None,"IMAGE_FORMAT_OR_DIMENSIONS"
            exif=im.getexif()
            if exif and 34853 in exif:
                return None,"EXIF_GPS_PRESENT"
            im.verify()
        with Image.open(file) as im:
            im.load()  # Verify all scan data, not just JPEG headers.
            if im.size!=(width,height) or im.mode not in ("RGB","L"):
                return None,"JPEG_COLOR_MODE_UNSUPPORTED"
    except (UnidentifiedImageError,ValueError,OSError,SyntaxError,Image.DecompressionBombError):
        return None,"IMAGE_DECODE_FAILURE"
    return hashlib.sha256(raw).hexdigest(),None


def review_manifest(root:Path,manifest:dict):
    entries=manifest.get("entries",[])
    width,height=manifest.get("expected_width"),manifest.get("expected_height")
    if (manifest.get("total")!=60 or len(entries)!=60
        or not all(type(n) is int and 200<=n<=5000 for n in (width,height))):
        raise ValueError("EXPECTED_60_JPEG_DIMENSIONS_MISSING")
    seen_ids,seen_hashes=set(),set()
    counts={"technical_approved":0,"editorial_approved":0,"blocked":0}
    errors=[]
    for e in entries:
        ident=e.get("id")
        asset=e.get("asset")
        if not isinstance(ident,str) or ident in seen_ids:
            errors.append("DUPLICATE_OR_MISSING_ID")
            counts["blocked"]+=1
            continue
        seen_ids.add(ident)
        if (not isinstance(asset,str) or asset.startswith("/") or ".." in Path(asset).parts
            or not asset.startswith("campagne/case247/dietro-le-quinte/assets/")):
            errors.append("INVALID_ASSET_PATH:"+ident)
            counts["blocked"]+=1
            continue
        path=(root/asset).resolve()
        if not path.is_relative_to(root.resolve()):
            errors.append("ASSET_PATH_OUTSIDE_REPOSITORY:"+ident)
            counts["blocked"]+=1
            continue
        sha,reason=validate_image(path,width,height)
        if sha is not None and sha in seen_hashes:
            reason="DUPLICATE_IMAGE_BYTES"
        if reason:
            e.update(technical_status="REJECTED",technical_reason=reason)
            # Any change/defect invalidates the prior editorial approval.
            e.update(approval="PENDING",requires_fact_check=True)
            counts["blocked"]+=1
            errors.append(reason+":"+ident)
            continue
        seen_hashes.add(sha)
        if e.get("sha256") not in (None,sha):
            # Modified image: old editorial approval must be renewed.
            e.update(approval="PENDING",requires_fact_check=True)
        e.update(technical_status="APPROVED",sha256=sha,
                 technical_width=width,technical_height=height)
        e.pop("technical_reason",None)
        counts["technical_approved"]+=1
        if e.get("approval")=="APPROVED" and e.get("requires_fact_check") is False:
            counts["editorial_approved"]+=1
    return counts,errors


def main():
    manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
    before=json.dumps(manifest,sort_keys=True,ensure_ascii=False)
    counts,errors=review_manifest(ROOT,manifest)
    if json.dumps(manifest,sort_keys=True,ensure_ascii=False)!=before:
        atomic_write(MANIFEST,manifest)
    print("CASE247_MEDIA_AUDIT "+json.dumps({"counts":counts,"error_count":len(errors),
         "errors":errors[:10]},ensure_ascii=False,sort_keys=True))
    if errors or counts["technical_approved"]!=60:
        raise SystemExit(2)

if __name__=="__main__":
    main()
