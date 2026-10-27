"""Source-aware social captions with separate native variants and strict contact checks."""
from __future__ import annotations
import json
import os
import re
from .branding import validate_copy, BrandViolation

PLATFORMS = ("facebook", "instagram", "linkedin")


def _json(text: str) -> dict:
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise BrandViolation("Caption generator returned no JSON object")
    return json.loads(m.group(0))


def create_social_captions(client, topic: str, confirmed_facts: str,
                           landing: str, source_url: str | None = None,
                           source_date: str | None = None,
                           previous_captions: list[str] | None = None) -> dict:
    """Produce three distinct drafts without inventing current market data.

    If specific market statistics / news are involved, provide verified source URL + date.
    No text is automatically considered published, verified or platform-approved.
    """
    if not landing.startswith("https://josephsocialmedia2-spec.github.io/"):
        raise BrandViolation("Unrecognized landing URL")
    if re.search(r"\b(?:20[12]\d|[+-]?\d+(?:[.,]\d+)?\s*%)\b", confirmed_facts) and not (source_url and source_date):
        raise BrandViolation("A dated market/statistical claim requires an attributed source URL and date")
    if source_url and not source_url.startswith("https://"):
        raise BrandViolation("Source must be a verified HTTPS URL")
    previous = "\n".join((previous_captions or [])[-4:])[:3000]
    prompt = f"""Write three distinct high-quality ITALIAN captions (Facebook, Instagram, LinkedIn)
for REAL MEDIA PRO — Joseph Digital Strategist. Topic: {topic}
VERIFIED / APPROVED facts ONLY: {confirmed_facts}
Verified source URL: {source_url or "none (evergreen educational content only)"}
Source publication date: {source_date or "not applicable"}
Landing: {landing}
Approved WhatsApp CTA: 371 370 8294.
Commercial partner: Immobiliare La Sacra; the licensed agents perform valuations,
appointments and real-estate mediation. Joseph does marketing and communications only.
Avoid prices/statistics not contained in the approved facts; do not invent quotations,
properties, customer reviews, guarantees or third-party phone numbers.
Do not repeat these recent captions: {previous}
Write clear compelling first lines. Facebook 80-120 words, Instagram 55-100 words
with 3-5 relevant hashtags and 'link in bio' instead of a clickable caption URL,
LinkedIn 100-140 words with an informative professional angle.
For Facebook and LinkedIn include the landing. If a verified source was provided,
attribute it naturally with its date, and provide the URL when useful.
Return ONLY JSON of exactly this shape:
{{"facebook":"caption", "instagram":"caption", "linkedin":"caption"}}
"""
    response = client.responses.create(model=os.getenv("OPENAI_CAPTION_MODEL", "gpt-4.1-mini"),
                                      input=prompt)
    data = _json(response.output_text)
    if set(data) != set(PLATFORMS):
        raise BrandViolation("Caption variants incomplete")
    for platform in PLATFORMS:
        cap = data[platform]
        if not isinstance(cap, str) or len(cap.strip()) < 90:
            raise BrandViolation(f"Caption too short or missing: {platform}")
        validate_copy(cap)
        if platform in ("facebook", "linkedin") and landing not in cap:
            raise BrandViolation(f"Landing URL missing in {platform}")
        if source_url and source_date and source_date[:4] not in cap and source_date not in cap:
            raise BrandViolation(f"Source period missing in {platform}")
    return data
