#!/usr/bin/env python3
"""
monitor/live_check.py — echte Live-Sichtbarkeitsprüfung (das „echte SaaS"-Upgrade).

Statt nur stellvertretend (ein Modell aus Trainingswissen) fragt dieses Modul die
realen Antwort-Maschinen ab und prüft, ob eine Firma in der Antwort GENANNT wird:
  - OpenAI / ChatGPT          (OPENAI_API_KEY)
  - Perplexity (mit Websuche) (PERPLEXITY_API_KEY)  ← am aussagekräftigsten
  - Google Gemini             (GEMINI_API_KEY)

Pro Anbieter mit gesetztem Key werden die echten Such-Prompts gestellt, die Antwort
geholt und auf den Firmennamen geprüft. Anbieter ohne Key werden sauber übersprungen.
Reine Python-stdlib (urllib). Wird von generate_report.py genutzt, wenn Keys da sind;
sonst bleibt der bisherige Stellvertreter-Check (claude_check) der Fallback.

EHRLICH: Das ist eine echte Momentaufnahme der jeweiligen API — nicht garantiert
identisch mit der Web-Oberfläche (Personalisierung, Region, A/B). Der Report nennt
immer, welche Engines wirklich geprüft wurden und wann.
"""
import json
import os
import re
import urllib.request

TIMEOUT = 40


def _post(url, payload, headers):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", **headers}, method="POST")
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read())


def ask_openai(prompt, env):
    key = env.get("OPENAI_API_KEY")
    if not key:
        return None
    model = env.get("OPENAI_MODEL", "gpt-4o-mini")
    data = _post("https://api.openai.com/v1/chat/completions",
                 {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 500},
                 {"Authorization": "Bearer " + key})
    return data["choices"][0]["message"]["content"]


def ask_perplexity(prompt, env):
    key = env.get("PERPLEXITY_API_KEY")
    if not key:
        return None
    model = env.get("PERPLEXITY_MODEL", "sonar")
    data = _post("https://api.perplexity.ai/chat/completions",
                 {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 500},
                 {"Authorization": "Bearer " + key})
    return data["choices"][0]["message"]["content"]


def ask_gemini(prompt, env):
    key = env.get("GEMINI_API_KEY")
    if not key:
        return None
    model = env.get("GEMINI_MODEL", "gemini-1.5-flash")
    url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s" % (model, key)
    data = _post(url, {"contents": [{"parts": [{"text": prompt}]}]}, {})
    return data["candidates"][0]["content"]["parts"][0]["text"]


PROVIDERS = [("ChatGPT (OpenAI)", ask_openai), ("Perplexity", ask_perplexity), ("Google Gemini", ask_gemini)]


def _mentioned(answer, firma):
    """Robuster Namens-Treffer: case-insensitiv, Wortgrenze, Sonderzeichen tolerant."""
    if not answer or not firma:
        return False
    a = answer.lower()
    f = firma.lower().strip()
    if f in a:
        return True
    # auch ohne Rechtsform/Sonderzeichen versuchen
    core = re.sub(r"\b(gmbh|ag|kg|ohg|ug|ltd|inc|e\.k\.|gbr)\b", "", f)
    core = re.sub(r"[^a-z0-9 ]", "", core).strip()
    return bool(core) and core in re.sub(r"[^a-z0-9 ]", "", a)


def run_live(input_data, prompts, env=None):
    """Fragt alle Anbieter mit Key ab. Rückgabe: dict mit pro-Engine-Ergebnis + Aggregat.
    Gibt None zurück, wenn KEIN Live-Key gesetzt ist (dann nutzt der Aufrufer den Fallback)."""
    env = env or os.environ
    firma = (input_data.get("firma") or "").strip()
    if not firma:
        return None
    if not any(_has_key(name, env) for name, _ in PROVIDERS):
        return None

    engines = []
    genannt_irgendwo = False
    for name, fn in PROVIDERS:
        if not _has_key(name, env):
            continue
        treffer, geprueft = 0, 0
        beispiel = ""
        for p in prompts[:5]:  # Kosten-Deckel: max 5 Prompts/Engine
            try:
                ans = fn(p, env)
            except Exception as e:
                engines.append({"engine": name, "fehler": _safe(e)})
                geprueft = -1
                break
            if ans is None:
                break
            geprueft += 1
            if _mentioned(ans, firma):
                treffer += 1
                if not beispiel:
                    beispiel = p
        if geprueft >= 0:
            g = treffer > 0
            genannt_irgendwo = genannt_irgendwo or g
            engines.append({"engine": name, "geprueft": geprueft, "treffer": treffer,
                            "genannt": g, "beispiel_prompt": beispiel})
    if not engines:
        return None
    return {"live": True, "genannt": genannt_irgendwo, "engines": engines}


def _has_key(name, env):
    return ((name.startswith("ChatGPT") and env.get("OPENAI_API_KEY"))
            or (name == "Perplexity" and env.get("PERPLEXITY_API_KEY"))
            or (name.startswith("Google") and env.get("GEMINI_API_KEY")))


def _safe(e):
    m = str(e)[:160]
    return re.sub(r"(key|token)=[A-Za-z0-9_\-]+", r"\1=***", m, flags=re.I)
