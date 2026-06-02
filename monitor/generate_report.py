#!/usr/bin/env python3
"""
monitor/generate_report.py — KI-Sichtbarkeits-Monitor (Abo-Produkt #1).

Erzeugt pro Abonnent:in einen monatlichen Report: Wirst du in KI-Antworten genannt?
Was hat sich seit letztem Monat verändert? Was als Nächstes tun? Reuse der Logik aus
`functions/_visibility-engine.mjs` (hier in Python gespiegelt, bewusst klein gehalten).

- Ohne `ANTHROPIC_API_KEY`: Report mit Such-Prompts + Selbst-Test-Anleitung + Maßnahmen
  (deterministisch). Mit Key: zusätzlich eine Stellvertreter-Einschätzung eines Modells
  (kennt es die Firma?) + Veränderung ggü. Vormonat.
- Ehrlich: keine Garantie, kein Live-ChatGPT — klar markiert.

Eingabe:  `monitor/abos.json`  (git-ignored; Vorlage: `abos.example.json`)
Ausgabe:  `monitor/ausgabe/<id>-<YYYYMM>.html`  (git-ignored)
Verlauf:  `monitor/verlauf.json`  (git-ignored; speichert je Abo den letzten genannt-Status)

Versand: bewusst NICHT fest verdrahtet. Reports landen als Dateien; Anbindung an einen
Mail-Weg (Lemon Squeezy / Stripe-Webhook / SMTP / Make-Webhook) steht im README.
Reine stdlib (+ optional `anthropic`).
"""
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "ausgabe"
ABOS = ROOT / "abos.json"
VERLAUF = ROOT / "verlauf.json"
MODELL = "claude-haiku-4-5-20251001"
SITE = "abannews.com"


def esc(s):
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def prompts_for(branche, ort, leistungen):
    inort = f" in {ort}" if ort else ""
    ps = []
    if branche:
        ps += [f"Welche {branche}{inort} kannst du empfehlen?",
               f"Ich suche eine gute {branche}{inort} — wen schlägst du vor?",
               f"Beste {branche}{inort}: worauf sollte ich achten?"]
        if ort:
            ps.append(f"Wer ist die seriöseste {branche} in {ort}?")
    for l in (leistungen or [])[:3]:
        ps.append(f"Wer bietet {l}{inort} an?")
    out, seen = [], set()
    for p in ps:
        if p not in seen:
            seen.add(p); out.append(p)
    return out[:8]


MASSNAHMEN = [
    ("Beantworte die Such-Fragen auf deiner Seite", "Pro Frage oben ein klarer FAQ-/Abschnitt, der Branche + Ort wörtlich nennt. KI zitiert Quellen, die eine Frage direkt beantworten."),
    ("Strukturierte Daten (Schema.org)", "LocalBusiness-/FAQPage-JSON-LD mit Name, Adresse, Leistungen, Öffnungszeiten — macht dich für Maschinen eindeutig."),
    ("Name/Adresse/Leistung überall identisch", "Website, Google-Profil, Branchenverzeichnisse exakt gleich. Widersprüche verwässern dein Signal."),
    ("Echte Bewertungen sammeln", "Aktiv um Bewertungen bitten; Menge und Aktualität fließen in das ein, was Modelle als empfehlenswert aufgreifen."),
    ("Von Dritten erwähnt werden", "Lokale Presse, Fachblog, Partner-Seite — unabhängige Quellen wiegen schwerer als Eigenlob."),
]


def claude_check(firma, branche, ort, leistungen, env):
    import urllib.request
    system = ("Du bist ein nüchterner KI-Sichtbarkeits-Prüfer (anti-hype, du-Form). Antworte NUR mit JSON: "
              '{"genannt": true|false, "einschaetzung": "1-2 Sätze"}. Stütz dich nur auf dein Trainingswissen. '
              "Kennst du die Firma nicht, sag das klar (genannt=false). Erfinde nichts.")
    user = (f"Firma: {firma}\nBranche: {branche or '—'}\nOrt: {ort or '—'}\n"
            f"Leistungen: {', '.join(leistungen or []) or '—'}\n\nKennst du diese Firma? Würdest du sie nennen? JSON.")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps({"model": MODELL, "max_tokens": 300, "system": system,
                         "messages": [{"role": "user", "content": user}]}).encode(),
        headers={"content-type": "application/json", "x-api-key": env["ANTHROPIC_API_KEY"],
                 "anthropic-version": "2023-06-01"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    txt = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    m = re.search(r"\{[\s\S]*\}", txt)
    parsed = json.loads(m.group(0) if m else txt)
    return bool(parsed.get("genannt")), str(parsed.get("einschaetzung", ""))[:400]


CSS = ("body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#1f2937;"
       "background:#fffbf5;max-width:680px;margin:0 auto;padding:24px}h1{font-size:1.5rem}"
       "h2{font-size:1.1rem;margin-top:24px;color:#b45309}.box{background:#fff;border:1px solid #ece3d4;"
       "border-radius:12px;padding:16px;margin:12px 0}.flag{display:inline-block;border-radius:999px;"
       "padding:2px 10px;font-weight:700;font-size:.85rem}.ja{background:#dcfce7;color:#15803d}"
       ".nein{background:#fcd9d9;color:#a01616}.muted{color:#6b7280;font-size:.88rem}"
       "li{margin:5px 0}code{background:#fef3c7;padding:1px 6px;border-radius:5px}")


def render(abo, ym, ki, vorher):
    firma = abo.get("firma", "deine Firma")
    ps = prompts_for(abo.get("branche", ""), abo.get("ort", ""), abo.get("leistungen", []))
    delta = ""
    if ki is not None and vorher is not None:
        if ki[0] and not vorher:
            delta = '<p class="flag ja">Neu: Das Modell nennt dich jetzt — letzten Monat noch nicht. 👍</p>'
        elif not ki[0] and vorher:
            delta = '<p class="flag nein">Achtung: Letzten Monat genannt, diesen Monat nicht mehr.</p>'
        else:
            delta = '<p class="muted">Keine Veränderung ggü. Vormonat.</p>'
    kibox = ""
    if ki is not None:
        cls = "ja" if ki[0] else "nein"
        lbl = "Modell kennt dich" if ki[0] else "Modell kennt dich (noch) nicht"
        kibox = (f'<div class="box"><span class="flag {cls}">{lbl}</span>'
                 f'<p>{esc(ki[1])}</p>{delta}'
                 '<p class="muted">Stellvertreter-Einschätzung eines Sprachmodells aus Trainingswissen — '
                 'kein Live-ChatGPT/Perplexity. Teste die Prompts unten selbst.</p></div>')
    prompts_html = "".join(f"<li>{esc(p)}</li>" for p in ps)
    mass_html = "".join(f"<li><b>{esc(t)}</b> — {esc(d)}</li>" for t, d in MASSNAHMEN)
    return f"""<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KI-Sichtbarkeits-Report {esc(ym)} — {esc(firma)}</title><style>{CSS}</style></head><body>
<h1>KI-Sichtbarkeits-Report — {esc(firma)}</h1>
<p class="muted">Monat {esc(ym)} · erstellt von aban news · {esc(SITE)}</p>
{kibox}
<h2>So sucht KI nach dir — teste diese Prompts</h2>
<p class="muted">Stell jede Frage in ChatGPT, Perplexity und Google. Wirst du genannt?</p>
<ul>{prompts_html}</ul>
<h2>Was du tun kannst, damit KI dich nennt</h2>
<ul>{mass_html}</ul>
<h2>Nächster Monat</h2>
<p>Dieser Report kommt automatisch wieder. KI-Antworten ändern sich — nur die Entwicklung zählt.
Keine Garantie auf Nennung; Sichtbarkeit ist beeinflussbar, nicht kaufbar.</p>
<p class="muted">Abo verwalten/kündigen: jederzeit per Mail an hallo@abannews.com.</p>
</body></html>"""


def main():
    if not ABOS.exists():
        print(f"Keine {ABOS.name} gefunden. Vorlage: monitor/abos.example.json "
              "(je Abo: id, firma, branche, ort, leistungen[], email). Trockenlauf mit der Vorlage:")
        src = ROOT / "abos.example.json"
        if not src.exists():
            sys.exit(1)
        abos = json.loads(src.read_text(encoding="utf-8"))
    else:
        abos = json.loads(ABOS.read_text(encoding="utf-8"))
    env = os.environ
    has_key = bool(env.get("ANTHROPIC_API_KEY"))
    verlauf = json.loads(VERLAUF.read_text(encoding="utf-8")) if VERLAUF.exists() else {}
    OUT.mkdir(parents=True, exist_ok=True)
    ym = date.today().strftime("%Y-%m")
    for abo in abos:
        ki = None
        if has_key and abo.get("firma"):
            try:
                ki = claude_check(abo["firma"], abo.get("branche", ""), abo.get("ort", ""),
                                  abo.get("leistungen", []), env)
            except Exception as e:
                print(f"  KI-Check übersprungen für {abo.get('id')}: {e}")
        vorher = verlauf.get(abo.get("id", ""), {}).get("genannt")
        html = render(abo, ym, ki, vorher)
        f = OUT / f"{abo.get('id','abo')}-{ym.replace('-','')}.html"
        f.write_text(html, encoding="utf-8")
        if ki is not None:
            verlauf.setdefault(abo.get("id", ""), {})["genannt"] = ki[0]
        print(f"  ✓ Report: {f.name}" + ("  [Versand: Mail-Weg im README anbinden]" if not env.get("MONITOR_DELIVERED") else ""))
    VERLAUF.write_text(json.dumps(verlauf, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{len(abos)} Report(s) → {OUT}" + ("" if has_key else "  (ohne KI-Check — kein ANTHROPIC_API_KEY)"))
    print("Versand nicht automatisch — siehe monitor/README.md (Stripe/Lemon-Squeezy + Mail).")


if __name__ == "__main__":
    main()
