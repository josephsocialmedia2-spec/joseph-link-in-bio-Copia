"""Source-aware social captions with separate native variants and strict contact checks."""
from __future__ import annotations
import json
import os
import re
from pathlib import Path
from .branding import validate_copy, BrandViolation

PLATFORMS = ("facebook", "instagram", "linkedin")
CONVERSION_CONFIG = Path(__file__).resolve().parents[3] / "branding" / "conversion-cta.json"


def load_conversion_cta() -> dict:
    """Require an actual published form and free-guide URL, never invent a URL."""
    if not CONVERSION_CONFIG.is_file():
        raise BrandViolation("Missing required branding/conversion-cta.json")
    policy = json.loads(CONVERSION_CONFIG.read_text(encoding="utf-8"))
    for key in ("form_url", "guide_url"):
        if not policy.get(key, "").startswith("https://josephsocialmedia2-spec.github.io/"):
            raise BrandViolation(f"Unverified mandatory CTA URL: {key}")
    if not policy.get("consent", {}).get("optional") or policy["consent"].get("default_checked") is not False:
        raise BrandViolation("Marketing consent must be optional and never preselected")
    return policy


def attach_mandatory_cta(caption: str, policy: dict | None = None) -> str:
    """Append honest conversion links without representing disabled marketing opt-in as live."""
    p = policy or load_conversion_cta()
    missing = []
    if p["form_url"] not in caption:
        missing.extend(["📝 Compila il modulo per chiedere informazioni sul tuo immobile:", p["form_url"]])
    if p["guide_url"] not in caption:
        missing.extend(["📘 Scarica subito la guida gratuita «Quanto vale la mia casa?»:", p["guide_url"]])
    if p["consent"].get("enabled") is False:
        disclaimer = ("Il consenso facoltativo alle comunicazioni promozionali non è "
                      "ancora attivabile: l'iscrizione resta sospesa. "
                      "Modulo e guida sono disponibili senza aderire al marketing.")
    else:
        disclaimer = ("Il consenso facoltativo alle comunicazioni promozionali è separato "
                      "dalla richiesta e non serve per scaricare la guida.")
    if disclaimer not in caption:
        missing.append(disclaimer)
    return caption.strip() + ("\n\n" + "\n".join(missing) if missing else "")


def validate_mandatory_cta(caption: str, policy: dict | None = None) -> None:
    p = policy or load_conversion_cta()
    if p["form_url"] not in caption or p["guide_url"] not in caption:
        raise BrandViolation("Caption REJECTED: compulsory form and guide PDF URLs missing")
    if "consens" not in caption.lower() or "facoltativ" not in caption.lower():
        raise BrandViolation("Caption REJECTED: optional consent notice missing")
    if p["consent"].get("enabled") is False:
        if "non è ancora attivabile" not in caption.lower() or "iscrizione resta sospesa" not in caption.lower():
            raise BrandViolation("Caption REJECTED: privacy gate must say promotional opt-in is unavailable")
        risky_claims = (
            r"spunta(?:re)? la casella", r"seleziona (?:la )?casella del consenso",
            r"scegli di ricevere comunicazioni", r"acconsenti (?:a |alle )?comunicazioni",
        )
        if any(re.search(pat, caption, flags=re.I) for pat in risky_claims):
            raise BrandViolation("Caption REJECTED: implies currently active marketing signup")
    validate_copy(caption)

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
with 3-5 relevant hashtags and BOTH compulsory FULL text URLs in the caption even if non-clickable,
LinkedIn 100-140 words with an informative professional angle.
For Facebook and LinkedIn include the landing. If a verified source was provided,
attribute it naturally with its date, and provide the URL when useful.
MANDATORY CTA for EVERY social caption: include full link to the form, explain that optional marketing consent is currently DISABLED until privacy compliance is reviewed (no opt-in can be given today), AND direct free-guide PDF download link, for Facebook, Instagram and LinkedIn. NEVER tell visitors to tick the disabled marketing checkbox.\nForm URL: {load_conversion_cta()['form_url']}\nGuide PDF URL: {load_conversion_cta()['guide_url']}\nNever represent marketing consent as mandatory for download or inquiries.\nReturn ONLY JSON of exactly this shape:
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
        data[platform] = attach_mandatory_cta(cap)
        validate_mandatory_cta(data[platform])
    return data
