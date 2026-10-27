"""Brand identity gate, reference archive and automated visual review (fail closed)."""
from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import tempfile
from pathlib import Path
from zipfile import ZipFile

REPO_ROOT = Path(__file__).resolve().parents[3]
BRAND_RULES = REPO_ROOT / "branding" / "brand.json"


class BrandViolation(RuntimeError):
    pass


def load_brand_rules(config: Path = BRAND_RULES) -> dict:
    if not config.is_file():
        raise BrandViolation("Brand rules missing: branding/brand.json")
    data = json.loads(config.read_text(encoding="utf-8"))
    if data.get("brand") != "REAL MEDIA PRO":
        raise BrandViolation("Unknown brand identity")
    return data


def verify_brand_archive(config: dict | None = None) -> dict:
    """Never allow generation/publishing if reference archive is absent or corrupted."""
    data = config or load_brand_rules()
    name = data["archive"]["path"]
    archive = REPO_ROOT / name
    if not archive.is_file():
        raise BrandViolation(
            f"Brand archive missing: {name}. Upload the approved archive to GitHub before running the autopilot."
        )
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != data["archive"]["sha256"]:
        raise BrandViolation(f"Brand archive SHA256 mismatch: {archive}")
    with ZipFile(archive) as z:
        master = data["archive"]["master"]
        if master not in z.namelist():
            raise BrandViolation(f"Brand master image missing from archive: {master}")
        manifest = json.loads(z.read("manifest.json"))
        if manifest.get("unique_image_count") != data["archive"]["unique_images"]:
            raise BrandViolation("Unexpected number of approved brand assets")
    return data


def extract_master_image(dest: Path, config: dict | None = None) -> Path:
    data = verify_brand_archive(config)
    dest.mkdir(parents=True, exist_ok=True)
    with ZipFile(REPO_ROOT / data["archive"]["path"]) as z:
        ref = data["archive"]["master"]
        path = dest / "real_media_pro_brand_master.webp"
        path.write_bytes(z.read(ref))
    return path


def visual_review(client, image_file: Path, master_image: Path, portrait_image: Path) -> dict:
    """Autoregressive review by an independent multimodal model, never self-certify success."""
    for path in (image_file, master_image, portrait_image):
        if not path.is_file():
            raise BrandViolation(f"QA reference file missing: {path}")
    def encoded(path: Path) -> str:
        mime = "image/webp" if path.suffix.lower() == ".webp" else "image/png"
        if path.suffix.lower() in (".jpg", ".jpeg"):
            mime = "image/jpeg"
        return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode("ascii")
    content = [
        {"type": "input_text", "text": (
            "Review the third image for compliance with REAL MEDIA PRO visual branding. "
            "The first image is the brand MASTER, the second image is Joseph's REAL approved portrait. "
            "Assess color consistency (navy blue, cobalt, sky blue, white), brand legibility, "
            "typographic accuracy, uncluttered premium design, consistency with the master, "
            "whether a represented Joseph face is faithful to the portrait, no invented real estate facts, "
            "no third-party telephone numbers and no unapproved broker logo. "
            "Use a strict 0-100 score. Return ONLY JSON in the exact format "
            "{\"score\": 0, \"pass\": false, \"issues\": [\"...\"], \"repair_prompt\": \"...\"}. "
            "Pass only when score >= 90 and NO blocking issues. Do not approve unreadable text."
        )},
        {"type": "input_image", "image_url": encoded(master_image)},
        {"type": "input_image", "image_url": encoded(portrait_image)},
        {"type": "input_image", "image_url": encoded(image_file)},
    ]
    model = os.getenv("OPENAI_BRAND_QA_MODEL", "gpt-4.1-mini")
    reply = client.responses.create(model=model, input=[{"role": "user", "content": content}])
    output = reply.output_text.strip()
    found = re.search(r"\{[\s\S]*\}", output)
    if not found:
        raise BrandViolation("Visual QA did not return machine-readable JSON")
    try:
        result = json.loads(found.group(0))
        score = int(result["score"])
        passed = result["pass"] is True and score >= 90 and not result["issues"]
        return {
            "score": score, "pass": passed,
            "issues": result.get("issues", []),
            "repair_prompt": str(result.get("repair_prompt", "")).strip(),
            "model": model,
        }
    except (ValueError, KeyError, TypeError) as exc:
        raise BrandViolation("Invalid visual QA schema") from exc


def validate_copy(text: str, brand: dict | None = None) -> str:
    config = brand or load_brand_rules()
    numbers = re.findall(r"(?:\+39[\s.-]*)?3\d{2}[\s.-]*\d{3}[\s.-]*\d{3,4}", text)
    whitelist = {"3713708294", "3522024365", "393713708294", "393522024365"}
    for number in numbers:
        if re.sub(r"\D", "", number) not in whitelist:
            raise BrandViolation("Contact text contains a telephone number other than Joseph's")
    if any(p in text.lower() for p in ("vendita garantita in 90 giorni", "prezzo certo garantito")):
        raise BrandViolation("Unverifiable sales guarantee")
    return text
