"""Deterministic local-time schedule and channel-specific captions. No network or secrets."""
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo

ROME = ZoneInfo("Europe/Rome")
SLOTS = ("10:00", "16:00", "20:00")
PLATFORMS = ("facebook", "instagram", "linkedin")
AGENT = "https://www.agentpricing.com/j.malafronte"
WHATSAPP = "https://wa.me/393713708294"
DISCLAIMER = "L'analisi iniziale è orientativa, non una perizia certificata. Mediazione e valutazioni professionali spettano ai soggetti abilitati."
HOOKS = (
    "Stai pensando di vendere casa ad Avigliana o in Valle di Susa?",
    "Prima di pubblicare l'annuncio, informati sul valore della tua casa.",
    "La tua casa merita una promozione pensata per le sue caratteristiche."
)
BODIES = {
    "facebook": (
        "Puoi iniziare con un'analisi orientativa gratuita su AgentPricing. Se decidi di vendere, posso aiutarti a presentare e pubblicizzare l'immobile sui canali digitali.",
        "Il prezzo richiesto non basta. Conta anche come si presenta l'immobile. Io mi occupo della sua promozione e comunicazione, non della mediazione.",
        "Foto, descrizione e scelta dei canali aiutano a far conoscere la casa. Possiamo parlarne senza impegno."
    ),
    "instagram": (
        "Vuoi conoscere un primo riferimento sul mercato della tua zona? Usa AgentPricing. Per la promozione digitale della casa puoi contattarmi.",
        "Non partire soltanto dal prezzo dei vicini. Ogni casa è diversa: un'analisi orientativa può essere il primo passo.",
        "Raccontare bene la casa conta. REAL MEDIA PRO cura la comunicazione e la promozione immobiliare."
    ),
    "linkedin": (
        "Un percorso di vendita consapevole comincia dalla comprensione del mercato. Metto a disposizione AgentPricing per un primo riferimento orientativo; seguo le attività di marketing immobiliare.",
        "Presentazione dell'immobile e posizionamento pubblicitario richiedono una strategia. REAL MEDIA PRO lavora sulla comunicazione, non sull'intermediazione.",
        "Una strategia di promozione può valorizzare le caratteristiche di ogni immobile. Opero nel marketing immobiliare ad Avigliana e in Valle di Susa."
    )
}

def caption(platform: str, slot_index: int) -> str:
    if platform not in PLATFORMS or slot_index not in range(3):
        raise ValueError("Unknown platform or slot")
    text = (f"{HOOKS[slot_index]}\n\n{BODIES[platform][slot_index]}\n\n"
            f"Prima analisi: {AGENT}\n"
            f"Contattami su WhatsApp: {WHATSAPP}\n\n"
            "Joseph Digital Strategist — REAL MEDIA PRO | Avigliana e Valle di Susa\n\n"
            f"{DISCLAIMER}")
    if text.count(AGENT) != 1 or text.count(WHATSAPP) != 1:
        raise AssertionError("Required links missing or duplicated")
    return text

def daily_posts(day: date):
    rows = []
    for i, hhmm in enumerate(SLOTS):
        instant = datetime.combine(day, time.fromisoformat(hhmm), tzinfo=ROME)
        for platform in PLATFORMS:
            rows.append({
                "id": f"rmp-{day:%Y%m%d}-{hhmm.replace(':','')}-{platform}",
                "local_date": day.isoformat(), "local_time": hhmm,
                "platform": platform, "scheduled_at": instant.isoformat(),
                "caption": caption(platform, i), "status": "READY"
            })
    return rows

def due(posts, now=None, max_lag_minutes=45):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    result = []
    for post in posts:
        target = datetime.fromisoformat(post["scheduled_at"])
        delta = (now - target).total_seconds()
        if 0 <= delta <= max_lag_minutes * 60 and post["status"] == "READY":
            result.append(post)
    return result

if __name__ == "__main__":
    import json, sys
    day = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.now(ROME).date()
    print(json.dumps({"mode": "OFFLINE_DRY_RUN", "timezone": "Europe/Rome",
                      "posts": daily_posts(day)}, ensure_ascii=False, indent=2))
