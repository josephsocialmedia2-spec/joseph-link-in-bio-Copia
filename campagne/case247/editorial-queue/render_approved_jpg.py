#!/usr/bin/env python3
"""Render only the 12 approved CASE247 editorial SVGs into Instagram/Facebook JPEGs.
No calls to Meta, no private tokens, no publication or queue state changes.
"""
from io import BytesIO
from pathlib import Path
from PIL import Image
import cairosvg

ROOT = Path(__file__).resolve().parent / "2026-11-01_2026-11-04" / "assets"
files = sorted(ROOT.glob("CASE247-???.svg"))
if len(files) != 12:
    raise SystemExit(f"EXPECTED_12_SVG_ASSETS_GOT_{len(files)}")
for source in files:
    png = cairosvg.svg2png(url=str(source), output_width=1080, output_height=1350)
    with Image.open(BytesIO(png)) as opened:
        image = opened.convert("RGB")
    if image.size != (1080, 1350):
        raise RuntimeError(f"WRONG_RENDER_SIZE {source.name}: {image.size}")
    target = source.with_suffix(".jpg")
    image.save(target, "JPEG", quality=92, optimize=True, progressive=True, subsampling=0)
    with Image.open(target) as check:
        check.verify()
    print(f"RENDER_OK: {target.relative_to(ROOT.parent)} [{target.stat().st_size} bytes]")
print("READY_JPEG_ASSETS: 12")
