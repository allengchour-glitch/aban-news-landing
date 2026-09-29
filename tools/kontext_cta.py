#!/usr/bin/env python3
"""Kontext-CTAs: ersetzt den generischen Newsletter-Kasten der Top-Tools durch einen
Text, der den Gedanken des Besuchers fortsetzt (Recherche 2026-09: gezielte Seite +
passender Hinweis ~5 % statt < 1 % beim generischen Formular).

- Ändert NUR <strong>, <p> und Knopftext im <aside data-aban-news-cta>.
- Hängt ?utm_source=abannews&utm_medium=tool&utm_campaign=<slug> an den beehiiv-Link
  (Link-Parameter, kein Cookie/Pixel auf unserer Seite) → beehiiv zeigt, welches Tool Abos bringt.
- Idempotent: Kasten bekommt data-cta-kontext="<slug>"; zweiter Lauf ändert nichts.
- Versprochen wird nur, was der Newsletter liefert: werktäglich 3 KI-Updates mit Urteil
  (lohnt sich / abwarten / ignorieren), 1 getestetes Tool, 1 Prompt.

Aufruf:  python3 tools/kontext_cta.py [--check]
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUBSCRIBE = "https://abannews.beehiiv.com/subscribe"
FOOT = "Gratis · 1-Klick-Abmeldung · kein Tracking-Pixel."

# slug: (Überschrift, Unterzeile, Knopf)
CTAS: dict[str, tuple[str, str, str]] = {
    # 🇨🇭 Geld
    "schweizer-lohnrechner": (
        "Netto ausgerechnet. Und wie holst du mehr aus deiner Arbeitszeit?",
        "Werktäglich in 5 Minuten: welche KI-Tools Selbstständigen und Angestellten in der Schweiz "
        "wirklich Stunden sparen — mit klarem Urteil, was du ignorieren kannst.",
        "Gratis mitlesen →"),
    "hypothek-tragbarkeit": (
        "Grosse Geldentscheide verdienen nüchterne Zahlen.",
        "aban news ordnet werktäglich KI- und Geld-Themen für die Schweiz ein — ohne Hype, "
        "ohne Anlageberatung, mit Urteil: lohnt sich, abwarten oder ignorieren.",
        "Nüchtern bleiben →"),
    "saeule-3a-rechner": (
        "3a optimiert. Jetzt noch die Zeit, die dich deine Arbeit kostet?",
        "Werktäglich 3 KI-Updates mit ehrlichem Urteil — für Selbstständige und KMU in der Schweiz. "
        "5 Minuten, dann weisst du, was sich lohnt.",
        "Gratis mitlesen →"),
    "pensionskasse-einkauf-rechner": (
        "Vorsorge durchgerechnet — der Rest deiner Woche verdient dasselbe.",
        "aban news: werktäglich die KI-Entwicklungen, die dein Business betreffen, mit klarem Urteil. "
        "Kein Hype, keine Anlageberatung.",
        "5-Min-Briefing holen →"),
    "krankenkassen-franchise-rechner": (
        "Franchise geklärt. Welche Abos zahlst du sonst noch zu viel?",
        "Viele KI-Tools kosten jeden Monat und bringen wenig. Ich teste sie und sage dir werktäglich "
        "klar: lohnt sich, abwarten oder ignorieren.",
        "Ehrliches Urteil holen →"),
    "arbeitgeberkosten-rechner": (
        "Jede Stelle kostet mehr als der Lohn. Was davon kann KI übernehmen — ehrlich?",
        "Werktäglich 5 Minuten für KMU in der Schweiz: welche Automatisierung echt Arbeit spart "
        "und welche nur gut aussieht.",
        "Gratis mitlesen →"),
    "mwst-rechner-schweiz": (
        "MWST erledigt. Wie viel Zeit kostet dich die restliche Buchhaltung?",
        "Ich teste KI-Tools für Selbstständige in der Schweiz und sage dir werktäglich, welche dir "
        "Büro-Stunden sparen — und welche du ignorieren kannst.",
        "Gratis mitlesen →"),
    "eigenmietwert-rechner": (
        "Steuerfragen ohne Nebel — so auch bei KI.",
        "aban news: werktäglich 3 KI-Updates für die Schweiz, jedes mit klarem Urteil. "
        "5 Minuten, kein Hype, keine erfundenen Zahlen.",
        "5-Min-Briefing holen →"),
    "mietzins-senkung-rechner": (
        "Geld zurückholen, das dir zusteht — ohne Aufwand.",
        "Genau so lese ich KI-News: was bringt dir konkret etwas? Werktäglich 5 Minuten, mit Urteil "
        "lohnt sich / abwarten / ignorieren.",
        "Gratis mitlesen →"),
    "ferien-anspruch-rechner": (
        "Ferien berechnet. Wie wäre es mit weniger Überstunden davor?",
        "Werktäglich 1 getestetes KI-Tool, das dir Routinearbeit abnimmt — plus die News, die du "
        "getrost ignorieren kannst. 5 Minuten.",
        "Gratis mitlesen →"),
    # 💼 Selbstständige
    "stundenlohn-rechner": (
        "Dein Stundenlohn steht. Jetzt die Stunden, die er nicht bezahlt.",
        "Einmal pro Werktag: 1 KI-Tool, das Selbstständigen messbar Zeit spart — selbst getestet, "
        "mit ehrlichem Urteil. 5 Minuten.",
        "Zeit zurückholen →"),
    "margen-rechner": (
        "Marge gerechnet. KI-Kosten sind die neue versteckte Ausgabe.",
        "Ich sage dir werktäglich, welche KI-Tools ihr Geld wert sind und welche nicht — "
        "für Selbstständige und KMU im DACH-Raum.",
        "Ehrliches Urteil holen →"),
    "break-even-rechner": (
        "Break-even gefunden. Was drückt deine Fixkosten als Nächstes?",
        "Werktäglich 3 KI-Updates mit Urteil: welche Automatisierung sich für kleine Betriebe "
        "rechnet — nüchtern, in 5 Minuten.",
        "Gratis mitlesen →"),
    "skonto-rechner": (
        "Skonto lohnt sich meistens. Viele KI-Tools nicht.",
        "Ich teste sie für dich und sage werktäglich klar: lohnt sich, abwarten oder ignorieren. "
        "5 Minuten, für Selbstständige.",
        "Ehrliches Urteil holen →"),
    "verzugszinsen-rechner": (
        "Zahlungen hinterherlaufen kostet Zeit. KI kann einen Teil davon.",
        "Werktäglich 1 getestetes Tool plus 1 Prompt zum Kopieren — etwa für Mahnungen, Offerten und "
        "E-Mails. 5 Minuten, ohne Hype.",
        "Gratis mitlesen →"),
    "roi-rechner": (
        "ROI gerechnet? Dann rechnen wir KI-Tools genauso nüchtern.",
        "Werktäglich: welche KI-Entwicklung sich für dein Business lohnt, mit klarem Urteil. "
        "Keine Buzzwords, keine erfundenen Zahlen.",
        "Nüchtern bleiben →"),
    "seo-roi-rechner": (
        "SEO rechnet sich langsam. KI-Sichtbarkeit ist das neue SEO.",
        "Ich beobachte werktäglich, wie ChatGPT, Perplexity & Co. Anbieter empfehlen — und was das "
        "für kleine Betriebe im DACH-Raum heisst.",
        "Gratis mitlesen →"),
    "impressum-generator": (
        "Impressum steht. Der nächste Pflicht-Punkt heisst KI-Richtlinie.",
        "Werktäglich 5 Minuten: was sich bei KI, DSGVO und Tools für Selbstständige ändert — "
        "ehrlich eingeordnet, mit Urteil.",
        "Auf dem Laufenden bleiben →"),
    # 🤖 KI direkt
    "ki-kosten-rechner": (
        "KI-Kosten durchgerechnet. Preise ändern sich aber jede Woche.",
        "Ich melde werktäglich, wenn ein Anbieter die Preise senkt oder ein günstigeres Modell reicht — "
        "mit Urteil: lohnt sich, abwarten oder ignorieren.",
        "Preis-Updates holen →"),
    "automatisierung-rechner": (
        "Potenzial gesehen. Jetzt das passende Werkzeug.",
        "Werktäglich 1 selbst getestetes KI-Tool mit „für wen / für wen nicht“ — plus 1 Prompt "
        "zum Kopieren. 5 Minuten.",
        "Gratis mitlesen →"),
    "was-automatisieren": (
        "Du weisst jetzt, was sich automatisieren lässt. Welche Tools taugen dafür?",
        "Ich teste sie und sage dir werktäglich ehrlich, was sich lohnt — für Selbstständige und KMU "
        "im DACH-Raum. 5 Minuten.",
        "Ehrliches Urteil holen →"),
    "email-vorlagen": (
        "Vorlage kopiert. Morgen gibt es den nächsten Prompt.",
        "Werktäglich 1 Prompt zum Kopieren, 1 getestetes KI-Tool und 3 Updates mit klarem Urteil. "
        "5 Minuten, gratis.",
        "Prompts holen →"),
}

ASIDE_RE = re.compile(r"<aside data-aban-news-cta(?P<attrs>[^>]*)>(?P<body>.*?)</aside>", re.S)
STRONG_RE = re.compile(r"(<strong[^>]*>)(.*?)(</strong>)", re.S)
P_RE = re.compile(r"(<p[^>]*>)(.*?)(</p>)", re.S)
A_RE = re.compile(r'(<a href=")' + re.escape(SUBSCRIBE) + r'[^"]*("[^>]*>)(.*?)(</a>)', re.S)


def rewrite(text: str, slug: str) -> tuple[str, bool]:
    head, sub, btn = CTAS[slug]
    m = ASIDE_RE.search(text)
    if not m:
        raise ValueError("kein <aside data-aban-news-cta>")
    attrs, body = m.group("attrs"), m.group("body")
    if "data-cta-kontext" in attrs:
        return text, False
    e = html.escape
    new_body, n1 = STRONG_RE.subn(lambda x: x.group(1) + e(head, quote=False) + x.group(3), body, count=1)
    new_body, n2 = P_RE.subn(
        lambda x: x.group(1) + e(sub, quote=False)
        + f'<br><span style="font-size:.82rem;color:#6b7280">{e(FOOT, quote=False)}</span>'
        + x.group(3), new_body, count=1)
    url = f"{SUBSCRIBE}?utm_source=abannews&amp;utm_medium=tool&amp;utm_campaign={slug}"
    new_body, n3 = A_RE.subn(lambda x: x.group(1) + url + x.group(2) + e(btn, quote=False) + x.group(4),
                             new_body, count=1)
    if (n1, n2, n3) != (1, 1, 1):
        raise ValueError(f"Kasten unerwartet aufgebaut (strong/p/a = {n1}/{n2}/{n3})")
    new_aside = f'<aside data-aban-news-cta data-cta-kontext="{slug}"{attrs}>{new_body}</aside>'
    return text[:m.start()] + new_aside + text[m.end():], True


def main() -> int:
    check = "--check" in sys.argv
    changed, errors = 0, 0
    for slug in CTAS:
        p = ROOT / f"{slug}.html"
        if not p.exists():
            print(f"⚠️  fehlt: {p.name}")
            errors += 1
            continue
        src = p.read_text(encoding="utf-8")
        try:
            out, did = rewrite(src, slug)
        except ValueError as ex:
            print(f"❌ {p.name}: {ex}")
            errors += 1
            continue
        if did:
            changed += 1
            if not check:
                p.write_text(out, encoding="utf-8")
            print(f"{'würde ändern' if check else '✅ geändert'}: {p.name}")
    print(f"\n{changed} geändert · {len(CTAS) - changed - errors} schon kontextuell · {errors} Fehler")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
