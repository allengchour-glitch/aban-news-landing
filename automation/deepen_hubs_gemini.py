#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Branchen-Hubs mit Gemini vertiefen (ehrlich, anti-hype, idempotent).

Sucht ki-fuer-*.html ohne Tiefen-Abschnitt (Marker data-aban-deep), nimmt eine kleine
Charge und lässt Gemini je Hub einen substanziellen, in ganzen Sätzen geschriebenen
Abschnitt + FAQ schreiben (JSON), den wir markenkonform rendern und vor dem Funnel-Block
einfügen. No-op-sicher: ohne GEMINI_API_KEY/GCP wird nichts generiert (Exit 0).

WICHTIG (Prompt-Regeln): keine erfundenen Zahlen/Studien, du-Form, ehrlich, konkret.

  python3 automation/deepen_hubs_gemini.py            # eine Charge (Default 8)
  ABAN_DEEP_BATCH=6 python3 automation/deepen_hubs_gemini.py
  python3 automation/deepen_hubs_gemini.py --dry-run  # nur zeigen, welche Hubs dran wären
"""
from __future__ import annotations

import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "automation"))

MARKER = "data-aban-deep"
BATCH = int((os.environ.get("ABAN_DEEP_BATCH") or "8").strip() or "4")


def branche(path: str, src: str) -> str | None:
    """Branchenname aus <h1> bzw. <title> ziehen (nach 'KI für ')."""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", src, re.S | re.I) or re.search(r"<title>(.*?)</title>", src, re.S | re.I)
    if not m:
        return None
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    t = re.split(r"[|–—·:]| - ", t)[0].strip()
    t = re.sub(r"^(KI|AI)\s+f[üu]r\s+", "", t, flags=re.I).strip()
    return t or None


PROMPT = """Du schreibst für „aban news" — einen ehrlichen, anti-hype KI-Newsletter für den deutschsprachigen Raum.
Schreibe für die Branche/Zielgruppe: „{branche}".

Ton: sachlich, konkret, du-Form, ohne Buzzwords, ohne Übertreibung. KEINE erfundenen Zahlen, Prozentwerte
oder Studien. Keine Heilsversprechen. Wenn KI bei etwas nicht hilft, darfst du das sagen.

Gib AUSSCHLIESSLICH gültiges JSON in genau diesem Format zurück (kein Markdown, keine Erklärung drumherum):
{{
 "intro": "2 zusammenhängende Absätze (je 3-5 Sätze) dazu, wie KI in dieser Branche konkret im Alltag hilft — mit echten, alltäglichen Aufgaben, nicht abstrakt. Trenne die zwei Absätze mit \\n\\n.",
 "faq": [
   {{"q": "Eine echte Frage, die jemand aus dieser Branche zu KI hätte", "a": "ehrliche, konkrete Antwort in 2-3 Sätzen"}},
   {{"q": "...", "a": "..."}},
   {{"q": "...", "a": "..."}}
 ]
}}"""


def e(s):
    return html.escape(str(s), quote=True)


def render(branche_name, data, heading=None) -> str:
    intro = (data.get("intro") or "").strip()
    paras = "".join(
        f'<p style="color:var(--ink2,#374151);margin-bottom:14px">{e(p.strip())}</p>'
        for p in intro.split("\n\n") if p.strip())
    faqs = ""
    for item in (data.get("faq") or [])[:4]:
        q = (item.get("q") or "").strip()
        a = (item.get("a") or "").strip()
        if not q or not a:
            continue
        faqs += (f'<details style="border:1px solid var(--line,#ece3d4);border-radius:10px;padding:12px 14px;'
                 f'margin-bottom:8px"><summary style="font-weight:700;cursor:pointer">{e(q)}</summary>'
                 f'<p style="color:var(--ink2,#374151);margin-top:8px">{e(a)}</p></details>')
    if not paras or not faqs:
        return ""
    head = heading if heading else f"KI in der Praxis: {branche_name}"
    return (f'\n<section {MARKER} style="max-width:760px;margin:30px auto;padding:0 20px;line-height:1.75">'
            f'<h2 style="font-size:1.3rem;margin-bottom:10px">{e(head)}</h2>'
            f'{paras}<h2 style="font-size:1.3rem;margin:22px 0 12px">Häufige Fragen</h2>{faqs}</section>\n')


def faq_jsonld(data) -> str:
    items = []
    for it in (data.get("faq") or [])[:4]:
        q = (it.get("q") or "").strip(); a = (it.get("a") or "").strip()
        if q and a:
            items.append({"@type": "Question", "name": q,
                          "acceptedAnswer": {"@type": "Answer", "text": a}})
    if not items:
        return ""
    j = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": items}
    return '\n<script type="application/ld+json">\n' + json.dumps(j, ensure_ascii=False) + '\n</script>'


def parse_json(txt: str):
    # Markdown-Code-Fences entfernen, JSON-Objekt extrahieren, tolerant parsen
    # (strict=False erlaubt echte Zeilenumbrueche in Strings — Gemini liefert die oft so).
    t = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
    start = t.find("{")
    if start == -1:
        return None
    # Vom ersten '{' bis zum LETZTEN '}' (gierig) — robust gegen Vor-/Nachtext.
    end = t.rfind("}")
    raw = t[start:end + 1] if end > start else t[start:]
    cands = [raw, raw.replace("\n", " ")]
    # Notfall: bei abgeschnittener Antwort (Thinking-Budget) wenigstens intro + faq retten.
    obj = _salvage(t)
    if obj:
        cands.append(json.dumps(obj))
    for cand in cands:
        try:
            return json.loads(cand, strict=False)
        except Exception:  # noqa: BLE001
            continue
    return obj or None


def _salvage(t: str):
    """Aus evtl. unvollstaendigem JSON intro + komplette faq-Eintraege herausziehen."""
    intro_m = re.search(r'"intro"\s*:\s*"((?:[^"\\]|\\.)*)"', t, re.S)
    intro = intro_m.group(1) if intro_m else ""
    faq = []
    for q, a in re.findall(r'"q"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"a"\s*:\s*"((?:[^"\\]|\\.)*)"', t, re.S):
        faq.append({"q": q, "a": a})
    if not intro or not faq:
        return None

    def _dec(s):
        return json.loads(f'"{s}"', strict=False)
    try:
        intro = _dec(intro)
        faq = [{"q": _dec(x["q"]), "a": _dec(x["a"])} for x in faq]
    except Exception:  # noqa: BLE001
        return None
    return {"intro": intro, "faq": faq}


def insert(src: str, section: str, jsonld: str) -> str | None:
    # Abschnitt vor dem Funnel-Block (data-aban-tools-cta) bzw. vor dem letzten </main>
    idx = src.find('<aside data-aban-tools-cta')
    if idx == -1:
        idx = src.rfind("</main>")
    if idx == -1:
        return None
    out = src[:idx] + section + src[idx:]
    if jsonld:
        h = out.find("</head>")
        if h != -1:
            out = out[:h] + jsonld + "\n" + out[h:]
    return out


def main():
    dry = "--dry-run" in sys.argv
    todo = []
    for f in sorted(glob.glob(os.path.join(ROOT, "ki-fuer-*.html"))):
        src = open(f, encoding="utf-8").read()
        if MARKER in src:
            continue
        b = branche(f, src)
        if b:
            todo.append((f, b))
    print(f"{len(todo)} Hubs ohne Tiefen-Abschnitt; Charge: {BATCH}")
    batch = todo[:BATCH]
    if dry:
        for f, b in batch:
            print("  würde vertiefen:", os.path.basename(f), "→", b)
        return 0
    try:
        from gemini_text import generate
    except Exception as ex:  # noqa: BLE001
        print(f"gemini_text nicht ladbar: {ex} → no-op"); return 0
    done = 0
    for f, b in batch:
        # thinking_budget=0: volles Output-Budget fuer die JSON-Antwort (2.5-Flash denkt
        # sonst die Tokens leer → abgeschnittenes JSON). response_json: natives JSON.
        txt = generate(PROMPT.format(branche=b), max_tokens=2048, temperature=0.5,
                       thinking_budget=0, response_json=True)
        if not txt:
            print(f"  (keine Gemini-Antwort für {b} — übersprungen)"); continue
        data = parse_json(txt)
        if not data:
            print(f"  (kein gültiges JSON für {b} — übersprungen)"); continue
        section = render(b, data)
        if not section:
            print(f"  (unvollständig für {b} — übersprungen)"); continue
        src = open(f, encoding="utf-8").read()
        out = insert(src, section, faq_jsonld(data))
        if not out:
            continue
        open(f, "w", encoding="utf-8").write(out)
        done += 1
        print(f"  ✓ vertieft: {os.path.basename(f)} ({b})")
    print(f"{done} Hubs vertieft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
