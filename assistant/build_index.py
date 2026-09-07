#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""assistant/build_index.py — Wissensindex für den „Frag aban"-Assistenten.

Baut assistant-index.json (klein, öffentlich, vom Widget client-seitig geladen):
kuratierte, ehrliche Q&A + Top-Tools (data/tools.json) + Branchen-Seiten.
Keine erfundenen Antworten — kuratiert von Hand bzw. aus Abans eigenen Daten.

    python3 assistant/build_index.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- Kuratierte Q&A (ehrlich, knapp, mit passendem Link) --------------------
CURATED = [
    ("Werde ich von ChatGPT empfohlen? Wie prüfe ich das?",
     "Mach den kostenlosen Check: Er zeigt, ob KI deine Firma nennt — und was du tun kannst.",
     "/ki-erwaehnungs-check.html", ["sichtbarkeit", "chatgpt", "check", "gefunden", "empfehlung"]),
    ("Wie werde ich von KI (ChatGPT, Perplexity, Google AI) gefunden?",
     "Konsistente Daten über Plattformen, Schema-Markup, Verzeichnisse, Bewertungen. Der Monitor verfolgt das monatlich.",
     "/ki-sichtbarkeit.html", ["sichtbarkeit", "gefunden", "seo", "aeo", "geo"]),
    ("Kann ich selbst prüfen, ob KI mich nennt? Gibt es das ohne Abo?",
     "Ja: Das KI-Sichtbarkeits-Audit ist ein einmaliges Workbook (29 €) — du prüfst in ~2 Stunden selbst und bekommst einen 90-Tage-Plan. Kein Abo.",
     "/ki-sichtbarkeit-audit.html", ["audit", "selbst", "einmalig", "kein abo", "diy", "sichtbarkeit", "workbook"]),
    ("Was ist der KI-Sichtbarkeits-Monitor und was kostet er?",
     "Monatlicher Report (9 €/Monat), ob KI dich nennt, mit Veränderung zum Vormonat und konkreten Maßnahmen. Jederzeit kündbar.",
     "/ki-sichtbarkeit-monitor.html", ["monitor", "abo", "preis", "kosten", "sichtbarkeit"]),
    ("Gibt es ein Komplett-Paket für KI-Sichtbarkeit?",
     "Ja: Buch + 3 Monate Monitor + Maßnahmen-Vorlage für 29 € (statt einzeln ~37 €).",
     "/ki-sichtbarkeit-paket.html", ["paket", "bundle", "sichtbarkeit", "preis"]),
    ("Darf ich als Arzt/Anwalt/Steuerberater KI mit Mandantendaten nutzen?",
     "Standard-KI ohne AVV ist für sensible Daten heikel. Die Compliance-Pakete geben dir Richtlinie + Checkliste + sichere Prompts (keine Rechtsberatung).",
     "/ki-compliance.html", ["compliance", "dsgvo", "recht", "arzt", "anwalt", "steuer", "berufsrecht"]),
    ("Welche KI-Tools lohnen sich für Selbstständige?",
     "Im KI-Tool-Radar findest du 140+ Tools, ehrlich bewertet auf DACH-Relevanz und Worth-it-Score.",
     "https://radar.abannews.com/", ["tools", "vergleich", "radar", "lohnt"]),
    ("Gibt es die KI-Tool-Daten als Datensatz?",
     "Ja: 326 Tools (DACH) als CSV + JSON, einmalig oder als Abo mit Updates.",
     "/ki-tools-datensatz.html", ["datensatz", "csv", "json", "daten", "api"]),
    ("Was ist aban news?",
     "Ein täglicher deutschsprachiger KI-Newsletter für DACH-Profis: Mo–Fr, 5 Minuten.",
     "https://abannews.beehiiv.com/subscribe", ["newsletter", "aban", "about", "abo"]),
    ("Was kostet der Newsletter?",
     "Der Newsletter ist kostenlos und jederzeit kündbar.",
     "https://abannews.beehiiv.com/subscribe", ["newsletter", "preis", "kosten", "gratis"]),
    ("Gibt es die Newsletter-Themen gebündelt / vertieft zum Nachlesen?",
     "Ja: die Themen-Dossiers bündeln echte Ausgaben zu In-Depth-Leserouten — Werkzeugkasten, Datenschutz im DACH-Raum, Prompts, Anti-Hype, KI-Modelle im Vergleich und KI für Selbstständige. Kostenlos.",
     "/dossiers.html", ["dossier", "dossiers", "themen", "vertieft", "archiv", "nachlesen", "guide"]),
    ("Welches KI-Modell soll ich nehmen / Claude vs. Mistral vs. Aleph Alpha?",
     "Das Dossier „KI-Modelle & Anbieter im Vergleich\" ordnet ein, wer wofür taugt — mit DACH-Datenschutz-Blick statt Benchmark-Hype.",
     "/dossier/ki-modelle-vergleich.html", ["modell", "modelle", "claude", "mistral", "aleph", "openai", "gpt", "vergleich", "anbieter"]),
    ("Wie hilft KI mir als Selbstständige:r / Solopreneur:in?",
     "Das Dossier „KI für Selbstständige\" zeigt konkrete Workflows (Akquise, Mail, Admin) — als Assistent, der Routine abnimmt, ohne dich zu ersetzen.",
     "/dossier/ki-fuer-selbststaendige.html", ["selbstständig", "solopreneur", "freelance", "leadgen", "mail", "ein-personen", "kmu"]),
    ("Welches Tool ist besser — A oder B? / Tool-Vergleiche",
     "Das Dossier „Tool-Duelle\" stellt Werkzeuge direkt gegeneinander (Cap.so vs. Loom, DeepL Write, Loops vs. Resend …) — ehrlich getestet über Tage.",
     "/dossier/tool-duelle-vergleiche.html", ["tool", "vergleich", "duell", "vs", "besser", "alternative", "loom", "deepl", "test"]),
    ("Was sind die KI-Reels?",
     "Kurze, ehrliche Video-Checks zu KI-Tools — täglich neu, stumm im Loop auf der Reels-Seite.",
     "/reels", ["reels", "video", "tool-check"]),
    ("Was ist Hype-Watch?",
     "Faktenchecks zu überzogenen KI-Behauptungen — mit Quellen, ohne Hype.",
     "/hype-watch", ["hype", "faktencheck", "claim"]),
    ("Gibt es kostenlose KI-Tools/Helfer?",
     "Ja: viele Gratis-Online-Tools (Rechner, Generatoren) ohne Login.",
     "/online-tools.html", ["gratis", "tools", "rechner", "kostenlos"]),
    ("Was kostet was? Preise / Übersicht aller Angebote?",
     "Alle Angebote + Preise auf einer Seite — vieles ist kostenlos.",
     "/angebote.html", ["preis", "preise", "kosten", "angebote", "übersicht", "pricing"]),
    ("Wie kann ich euch kontaktieren?",
     "Schreib an hallo@abannews.com — oder schau, was du suchst, direkt auf der Startseite.",
     "mailto:hallo@abannews.com", ["kontakt", "mail", "hilfe", "support"]),
    ("Sammelt ihr Daten / nutzt ihr Tracking?",
     "Nein. Kein Tracking, keine Marketing-Cookies, keine externen Schriftarten. Dieser Assistent läuft komplett auf der Seite, ohne Cloud.",
     "/datenschutz.html", ["datenschutz", "tracking", "cookies", "privacy"]),
    ("Wie führe ich KI im Betrieb ein?",
     "Der KI-Schnellstart gibt dir einen ehrlichen 30-Tage-Plan: Leitplanken, Tool-Auswahl, Team-Onboarding (29 €).",
     "/ki-schnellstart.html", ["schnellstart", "einführung", "kmu", "team", "30 tage", "enablement"]),
    ("Ich habe einen lokalen Betrieb — was bringt mir das?",
     "Immer mehr Kund:innen fragen KI nach Anbietern. Wähl deine Branche und prüf, ob du genannt wirst.",
     "/ki-sichtbarkeit.html", ["lokal", "betrieb", "branche", "handwerk", "praxis", "kanzlei"]),
]

BRANCHEN = [
    ("handwerk", "Handwerk"), ("praxen", "Arztpraxen"), ("steuerberatung", "Steuerberatung"),
    ("kanzleien", "Anwaltskanzleien"), ("gastronomie", "Gastronomie"), ("coaches", "Coaches"),
    ("immobilienmakler", "Immobilienmakler"), ("friseure", "Friseure"), ("fotografen", "Fotograf:innen"),
    ("architekten", "Architekturbüros"), ("fitnessstudios", "Fitnessstudios"),
]


def _short(t, n=150):
    t = " ".join(str(t or "").split())
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + " …"


def main():
    items = []
    for q, a, url, tags in CURATED:
        items.append({"q": q, "a": a, "url": url, "tags": tags})

    # Branchen-Seiten
    for slug, name in BRANCHEN:
        items.append({"q": f"Wirst du als {name} von KI empfohlen?",
                      "a": f"Branchen-Seite für {name}: echte Such-Fragen deiner Kund:innen + gratis Check.",
                      "url": f"/ki-sichtbarkeit-{slug}.html",
                      "tags": ["sichtbarkeit", "branche", name.lower(), slug]})

    # Top-Tools aus data/tools.json (Abans Urteile)
    try:
        tools = json.loads(open(os.path.join(ROOT, "data", "tools.json"), encoding="utf-8").read())["tools"]
        top = sorted([t for t in tools if isinstance(t.get("worth_it_score"), (int, float))],
                     key=lambda t: -t["worth_it_score"])[:50]
        for t in top:
            items.append({"q": f"Lohnt sich {t['name']}?",
                          "a": _short(t.get("aban_note", "")) or f"{t.get('vendor','')} — im Radar bewertet.",
                          "url": f"https://radar.abannews.com/tool/{t['id']}.html",
                          "tags": ["tool", t["name"].lower()] + [c.lower() for c in t.get("category", [])]})
    except Exception as e:
        print(f"  (tools.json übersprungen: {e})")

    out = {"updated": "2026-06-08", "items": items}
    open(os.path.join(ROOT, "assistant-index.json"), "w", encoding="utf-8").write(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"✓ assistant-index.json: {len(items)} Einträge")


if __name__ == "__main__":
    main()
