#!/usr/bin/env python3
# =============================================================================
#  freegen_ai — optionale Gratis-KI-Hilfe für die freegen-Tools
# -----------------------------------------------------------------------------
#  Schreibt aus einem Thema knackige Reel-Texte (Hook / 2 Benefits / CTA) via
#  einem OpenAI-kompatiblen Anbieter. Nutzt den ersten vorhandenen Key aus der
#  Umgebung (Groq gratis bevorzugt). Ohne Key → None (Tools fallen sauber zurück).
#
#  🔐 Keys NUR aus der Umgebung. Keine externen Pakete (nur stdlib urllib).
# =============================================================================

import os, json, urllib.request

# (Anbieter, URL, Key-Env, Default-Modell) — Gratis (Groq) zuerst.
_PROVIDERS = [
    ("groq", "https://api.groq.com/openai/v1/chat/completions", "GROQ_API_KEY", "openai/gpt-oss-120b"),
    ("openai", "https://api.openai.com/v1/chat/completions", "OPENAI_API_KEY", "gpt-4o-mini"),
    ("openrouter", "https://openrouter.ai/api/v1/chat/completions", "OPENROUTER_API_KEY", "meta-llama/llama-3.3-70b-instruct:free"),
    ("gemini", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "GEMINI_API_KEY", "gemini-1.5-flash"),
    ("deepseek", "https://api.deepseek.com/chat/completions", "DEEPSEEK_API_KEY", "deepseek-chat"),
    ("xai", "https://api.x.ai/v1/chat/completions", "XAI_API_KEY", "grok-2-latest"),
    ("mistral", "https://api.mistral.ai/v1/chat/completions", "MISTRAL_API_KEY", "mistral-small-latest"),
]


def provider():
    forced = os.environ.get("LLM_PROVIDER")
    cands = _PROVIDERS
    if forced:
        cands = [p for p in _PROVIDERS if p[0] == forced] + _PROVIDERS
    for name, url, keyenv, model in cands:
        key = os.environ.get(keyenv)
        if key:
            return (name, url, key, os.environ.get(name.upper() + "_MODEL", model))
    return None


def available():
    return provider() is not None


def chat(prompt, system="", max_tokens=1200, timeout=45):
    """Öffentlicher Wrapper: ein Anbieter-Aufruf. Gibt Text oder None."""
    return _chat(prompt, system, max_tokens=max_tokens, timeout=timeout)


def _chat(prompt, system, max_tokens=200, timeout=30):
    p = provider()
    if not p:
        return None
    _, url, key, model = p
    body = json.dumps({
        "model": model, "max_tokens": max_tokens, "temperature": 0.5,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": "Bearer " + key, "Content-Type": "application/json",
        # Manche Anbieter (Cloudflare-WAF) blocken den Default-"Python-urllib"-UA mit 403.
        "User-Agent": "aban-freegen/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read().decode("utf-8"))
        return d["choices"][0]["message"]["content"]
    except Exception:
        return None


def reel_copy(title, desc, timeout=30):
    """Gibt eine Liste kurzer Szenen-Texte zurück (Hook, Benefit1, Benefit2, CTA) oder None."""
    sys = ("Du bist ein nüchterner deutscher Social-Media-Texter (anti-hype, kein Clickbait). "
           "Schreibe ausschliesslich in natürlichem, korrektem Deutsch — KEINE englischen Wörter, "
           "vollständige sinnvolle Phrasen. Antworte NUR mit kompaktem JSON, keine Erklärung.")
    prompt = (
        f'Thema einer abannews-Seite: "{title}". Kontext: "{(desc or "")[:300]}".\n'
        'Schreibe Texte für ein vertikales Kurzvideo (Reel). Gib JSON mit genau diesen Schlüsseln:\n'
        '{"hook":"Aufmacher, max 6 Wörter","punkt1":"konkreter Nutzen, max 7 Wörter","punkt2":"konkreter Nutzen, max 7 Wörter","cta":"Handlungsaufruf, max 6 Wörter"}\n'
        "Regeln: natürliches Deutsch, keine englischen Wörter (kein 'faster', 'check' usw.), "
        "jede Zeile muss für sich verständlich sein, keine Stichwort-Fragmente, ohne Emojis, "
        "ohne Anführungszeichen im Text."
    )
    txt = _chat(prompt, sys)
    if not txt:
        return None
    try:
        frag = txt[txt.find("{"):txt.rfind("}") + 1]
        o = json.loads(frag)
        out = [o.get("hook"), o.get("punkt1"), o.get("punkt2"), o.get("cta")]
        out = [str(x).strip() for x in out if x and str(x).strip()]
        return out if len(out) >= 3 else None
    except Exception:
        return None


def image_copy(title, desc, timeout=30):
    """Gibt {kicker, headline, subline} für ein Social-Image zurück oder None."""
    sys = ("Du bist ein nüchterner deutscher Social-Media-Texter (anti-hype). "
           "Schreibe ausschliesslich natürliches, korrektes Deutsch — keine englischen Wörter. "
           "Antworte NUR mit kompaktem JSON.")
    prompt = (
        f'Thema einer abannews-Seite: "{title}". Kontext: "{(desc or "")[:300]}".\n'
        'Texte für ein quadratisches Social-Image. Gib JSON mit genau diesen Schlüsseln:\n'
        '{"kicker":"1-2 Wörter Kategorie","headline":"prägnant, max 6 Wörter","subline":"konkreter Nutzen, max 12 Wörter"}\n'
        "Natürliches Deutsch, ohne Emojis, ohne Anführungszeichen im Text."
    )
    txt = _chat(prompt, sys)
    if not txt:
        return None
    try:
        frag = txt[txt.find("{"):txt.rfind("}") + 1]
        o = json.loads(frag)
        head = str(o.get("headline") or "").strip()
        if not head:
            return None
        return {"kicker": str(o.get("kicker") or "").strip(), "headline": head, "subline": str(o.get("subline") or "").strip()}
    except Exception:
        return None


def carousel_copy(topic, desc="", timeout=30):
    """Gibt Slides für ein Social-Karussell zurück: [hook, punkt1..3, cta] oder None."""
    sys = ("Du bist ein nüchterner deutscher Social-Media-Texter (anti-hype, kein Clickbait). "
           "Schreibe ausschliesslich natürliches, korrektes Deutsch — keine englischen Wörter. "
           "Erfinde KEINE Fakten/Zahlen. Antworte NUR mit kompaktem JSON.")
    prompt = (
        f'Thema: "{topic}". Kontext: "{(desc or "")[:400]}".\n'
        'Erstelle ein 5-Slide-Social-Karussell. Gib JSON mit genau diesen Schlüsseln:\n'
        '{"hook":"neugierig machender Aufmacher, max 7 Wörter","punkt1":"konkreter Tipp, max 9 Wörter",'
        '"punkt2":"konkreter Tipp, max 9 Wörter","punkt3":"konkreter Tipp, max 9 Wörter","cta":"Handlungsaufruf, max 6 Wörter"}\n'
        "Natürliches Deutsch, jede Zeile für sich verständlich, ohne Emojis, ohne Anführungszeichen im Text."
    )
    txt = _chat(prompt, sys, max_tokens=300)
    if not txt:
        return None
    try:
        o = json.loads(txt[txt.find("{"):txt.rfind("}") + 1])
        out = [o.get("hook"), o.get("punkt1"), o.get("punkt2"), o.get("punkt3"), o.get("cta")]
        out = [str(x).strip() for x in out if x and str(x).strip()]
        return out if len(out) >= 4 else None
    except Exception:
        return None
