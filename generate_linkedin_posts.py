#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_linkedin_posts.py - LinkedIn-Content-Engine fuer aban news
===================================================================

Macht aus einer Tagesausgabe (3 KI-Items) fuenf fertige LinkedIn-Post-
Entwuerfe in der aban-Stimme: pragmatisch, direkt, anti-hype, du-Form.

NUR Python-Standardbibliothek. Keine Pakete, keine Netzwerk-Aufrufe,
keine Drittanbieter-APIs (die Marke verbietet 3rd-Party-Calls).

NUTZUNG
-------
    python3 generate_linkedin_posts.py [ausgabe-datei]

Ohne Argument wird ``linkedin/beispiel-ausgabe.txt`` verwendet.
Die Entwuerfe landen als einzelne .txt-Dateien in ``linkedin/drafts/``
und werden zusaetzlich auf der Konsole ausgegeben.

EINGABE-FORMAT
--------------
Bloecke (Items) getrennt durch eine Zeile mit nur ``---``. Jedes Item
hat vier Felder, eingeleitet durch ein Stichwort am Zeilenanfang:

    THEMA:     Kurzer Titel
    WAS:       Was ist passiert (1-2 Saetze, nuechtern)
    BEDEUTUNG: Warum relevant fuer Solopreneure
    TIPP:      Konkreter naechster Schritt

Folgezeilen, die kein neues Stichwort starten, gehoeren zum letzten Feld
(erlaubt also mehrzeilige Werte). Zeilen mit ``#`` am Anfang sind Kommentare.

DIE 5 WINKEL (pro Ausgabe ein anderer Blickwinkel)
--------------------------------------------------
    1) News-Reaktion   - Was passiert ist + nuechterne Einordnung
    2) How-to          - Ein konkreter Schritt aus dem TIPP
    3) Contrarian      - Was alle hypen vs. was wirklich zaehlt
    4) Mini-Case       - "Statt X mache ich jetzt Y"
    5) Frage           - Offene Frage an die Zielgruppe

Jeder Post: starke erste Zeile (Hook, weil LinkedIn nach ~210 Zeichen
abschneidet), kurze Zeilen, ein klares Takeaway, weiche CTA und 0-3
passende Hashtags. Unter ~1300 Zeichen.
"""

import os
import re
import sys
import random

# --- Konstanten ------------------------------------------------------------

HIER = os.path.dirname(os.path.abspath(__file__))
STANDARD_EINGABE = os.path.join(HIER, "linkedin", "beispiel-ausgabe.txt")
AUSGABE_DIR = os.path.join(HIER, "linkedin", "drafts")

CTA = "Taeglich in 5 Min: abannews.com"
MAX_ZEICHEN = 1300

# Feld-Stichwoerter im Eingabeformat
FELDER = ("THEMA", "WAS", "BEDEUTUNG", "TIPP")
FELD_RE = re.compile(r"^\s*(THEMA|WAS|BEDEUTUNG|TIPP)\s*:\s*(.*)$", re.IGNORECASE)

# Anti-Hype-Sperrliste. Bewusst eigenstaendig gepflegt; die kanonische
# Quelle ist automation/brand-voice-validator-api.py. Hier dient sie als
# Selbstkontrolle, damit kein generierter Post Hype-Vokabular enthaelt.
HYPE_WOERTER = [
    "revolutionaer", "revolution", "bahnbrechend", "game-changer",
    "gamechanger", "disruptiv", "disruption", "quantensprung",
    "einzigartig", "unglaublich", "tauche ein", "tauch ein",
    "der heilige gral", "weltneuheit", "sensationell", "atemberaubend",
    "der naechste grosse", "alles veraendern", "wird alles veraendern",
    "must-have", "must have", "geheimwaffe", "ultimativ", "mind-blowing",
    "verrueckt", "krass", "wahnsinn", "the next big thing",
]


# --- Eingabe parsen --------------------------------------------------------

def parse_ausgabe(text):
    """Zerlegt den Eingabetext in eine Liste von Item-Dicts.

    Robust gegen Kommentare (#), Leerzeilen, Gross-/Kleinschreibung der
    Stichwoerter und mehrzeilige Feldwerte. Leere Items werden verworfen.
    """
    # Kommentarzeilen entfernen (ganze Zeile, die mit # beginnt).
    zeilen = [z for z in text.splitlines() if not z.lstrip().startswith("#")]
    reiner_text = "\n".join(zeilen)

    # In Bloecke aufteilen: eine Zeile, die (nur) aus --- besteht.
    bloecke = re.split(r"(?m)^\s*-{3,}\s*$", reiner_text)

    items = []
    for block in bloecke:
        item = {f: "" for f in FELDER}
        aktuelles_feld = None
        for zeile in block.splitlines():
            m = FELD_RE.match(zeile)
            if m:
                aktuelles_feld = m.group(1).upper()
                item[aktuelles_feld] = m.group(2).strip()
            elif aktuelles_feld and zeile.strip():
                # Folgezeile gehoert zum laufenden Feld.
                item[aktuelles_feld] = (item[aktuelles_feld] + " "
                                        + zeile.strip()).strip()
        # Whitespace in den Werten normalisieren.
        for f in FELDER:
            item[f] = re.sub(r"\s+", " ", item[f]).strip()
        # Nur Items mit mindestens THEMA oder WAS behalten.
        if item["THEMA"] or item["WAS"]:
            items.append(item)
    return items


# --- Hilfsfunktionen fuer den Text ----------------------------------------

def ersten_satz(text):
    """Gibt den ersten Satz eines Textes zurueck (fuer knappe Hooks)."""
    if not text:
        return ""
    teile = re.split(r"(?<=[.!?])\s+", text.strip())
    return teile[0].strip() if teile else text.strip()


def klein_anfang(text):
    """Kleinschreibung des ersten Buchstabens (fuer Satz-Fortsetzungen).

    Akronyme/Versalwoerter (z. B. "KI", "ChatGPT") bleiben unangetastet,
    damit kein "kI" entsteht.
    """
    if not text:
        return text
    erstes_wort = text.split(" ", 1)[0]
    # Wenn das erste Wort mehrere Grossbuchstaben hat, ist es vermutlich
    # ein Akronym/Eigenname -> nicht kleinschreiben.
    if sum(1 for c in erstes_wort if c.isupper()) >= 2:
        return text
    return text[:1].lower() + text[1:]


def ohne_punkt(text):
    """Entfernt einen schliessenden Satzpunkt (fuer Hook-Einbau)."""
    return text.rstrip().rstrip(".")


# Worte, mit denen ein Hook nicht enden darf (sonst klingt er abgehackt).
HAENGER = {
    "und", "oder", "aber", "statt", "so", "dass", "weil", "denn", "wenn",
    "als", "wie", "der", "die", "das", "ein", "eine", "einen", "einem",
    "im", "in", "am", "auf", "mit", "fuer", "von", "zu", "zum", "zur",
    "auch", "noch", "schon", "sehr", "mehr",
}


def kuerzen(text, max_woerter):
    """Kuerzt einen Text auf ganze Saetze/Woerter fuer saubere Hooks.

    Bevorzugt einen Schnitt am Satzende; sonst auf die Wortzahl, wobei
    Satzzeichen und haengende Funktionswoerter am Ende entfernt werden,
    damit der Hook nie abgehackt klingt (kein "... So." o. Ae.).
    """
    text = text.strip()
    woerter = text.split()
    if len(woerter) <= max_woerter:
        return ohne_punkt(text)
    # Versuche, am ersten Satzende innerhalb des Limits zu schneiden.
    teilsatz = ersten_satz(text)
    if teilsatz and len(teilsatz.split()) <= max_woerter:
        return ohne_punkt(teilsatz)
    # Sonst hart auf die Wortzahl, dann Satzzeichen + Haenger abschneiden.
    rest = woerter[:max_woerter]
    while rest and rest[-1].strip(",;:.").lower() in HAENGER:
        rest.pop()
    return " ".join(rest).rstrip(" ,;:.")


# Hook-Bibliothek: Muster mit {x}-Platzhalter, die der Generator rotiert.
# Pro Winkel eine eigene Liste, damit der Ton zum Format passt.
HOOKS = {
    "news": [
        "Kurz und ohne Hype: {x}.",
        "Heute gelesen, nuechtern eingeordnet: {x}.",
        "Eine Schlagzeile, ein Realitaetscheck: {x}.",
        "Das ist passiert: {x}. Was es wirklich bedeutet, steht unten.",
    ],
    "howto": [
        "Ein Schritt, den du heute machen kannst: {x}.",
        "Weniger lesen, mehr testen. Konkret: {x}.",
        "So gehst du es praktisch an: {x}.",
        "Kein Tutorial-Marathon noetig. Nur das hier: {x}.",
    ],
    "contrarian": [
        "Alle reden ueber {x}. Ich finde, das ist der falsche Fokus.",
        "Unpopulaere Meinung: {x} ist weniger wichtig, als alle tun.",
        "Der Hype sagt {x}. Die Praxis sagt etwas anderes.",
        "Spar dir die Aufregung um {x}. Wichtig ist etwas anderes.",
    ],
    "case": [
        "Statt {x} mache ich es jetzt anders.",
        "Frueher: {x}. Heute laeuft es bei mir so.",
        "Ein kleines Beispiel aus meinem Alltag: {x}.",
        "Ich habe etwas umgestellt. Vorher: {x}.",
    ],
    "frage": [
        "Eine ehrliche Frage an dich: {x}?",
        "Mal angenommen: {x}. Wie machst du das?",
        "Kurze Umfrage in die Runde: {x}?",
        "Ich bin neugierig: {x}?",
    ],
}


def waehle_hook(winkel, fuellung, rng):
    """Waehlt zufaellig (aber reproduzierbar) ein Hook-Muster und fuellt es."""
    muster = rng.choice(HOOKS[winkel])
    return muster.format(x=fuellung)


# --- Post-Bauer pro Winkel ------------------------------------------------

def hashtags(*tags):
    """Baut eine Hashtag-Zeile aus 0-3 Tags (ohne Hype-Tags)."""
    tags = [t for t in tags if t][:3]
    return " ".join("#" + t for t in tags)


def baue_news(item, rng):
    """Winkel 1: News-Reaktion - was passiert ist + nuechterne Einordnung."""
    hook = waehle_hook("news", ohne_punkt(ersten_satz(item["WAS"]) or item["THEMA"]), rng)
    zeilen = [
        hook,
        "",
        item["WAS"],
        "",
        "Einordnung: " + (item["BEDEUTUNG"] or "Nuetzlich, aber kein Selbstlaeufer."),
        "",
        "Takeaway: Neugier ja, aber erst pruefen, dann uebernehmen.",
        "",
        CTA,
        "",
        hashtags("KI", "Newsletter", "Selbststaendigkeit"),
    ]
    return "\n".join(zeilen)


def baue_howto(item, rng):
    """Winkel 2: How-to - ein konkreter Schritt aus dem TIPP."""
    tipp = item["TIPP"] or "Such dir eine kleine, echte Aufgabe und teste sie heute."
    hook = waehle_hook("howto", ohne_punkt(klein_anfang(kuerzen(tipp, 10))), rng)
    zeilen = [
        hook,
        "",
        "Worum geht es: " + (item["THEMA"] or ersten_satz(item["WAS"])),
        "",
        "Dein Schritt:",
        "- " + tipp,
        "",
        "Takeaway: Ein getesteter Schritt schlaegt zehn gespeicherte Tipps.",
        "",
        CTA,
        "",
        hashtags("KI", "Produktivitaet", "Solopreneur"),
    ]
    return "\n".join(zeilen)


def baue_contrarian(item, rng):
    """Winkel 3: Contrarian / Anti-Hype - Hype vs. was wirklich zaehlt."""
    thema = item["THEMA"] or ersten_satz(item["WAS"])
    hook = waehle_hook("contrarian", ohne_punkt(klein_anfang(thema)), rng)
    was_zaehlt = (item["BEDEUTUNG"]
                  or "Ob es dir konkret Zeit spart oder nur gut klingt.")
    zeilen = [
        hook,
        "",
        "Die News ist nett. Aber sie aendert deinen Montag nicht von allein.",
        "",
        "Was wirklich zaehlt: " + was_zaehlt,
        "",
        "Takeaway: Frag bei jedem Tool, ob es ein echtes Problem von dir loest.",
        "",
        CTA,
        "",
        hashtags("KI", "antiHype"),
    ]
    return "\n".join(zeilen)


def baue_case(item, rng):
    """Winkel 4: Mini-Case - 'Statt X mache ich jetzt Y'."""
    alt = ohne_punkt(klein_anfang(kuerzen(ersten_satz(item["WAS"]) or item["THEMA"], 12)))
    hook = waehle_hook("case", alt, rng)
    neu = item["TIPP"] or "Ich teste die Funktion an einer echten Aufgabe, bevor ich sie lobe."
    zeilen = [
        hook,
        "",
        "Statt darauf zu warten, dass es sich von selbst lohnt, mache ich das:",
        "- " + neu,
        "",
        "Ergebnis bisher: weniger Klicks, mehr Kontrolle.",
        "",
        "Takeaway: Kleine, echte Tests zeigen schneller, was taugt.",
        "",
        CTA,
        "",
        hashtags("KI", "Praxis", "Selbststaendigkeit"),
    ]
    return "\n".join(zeilen)


def baue_frage(item, rng):
    """Winkel 5: Frage / Engagement - offene Frage an die Zielgruppe."""
    thema = ohne_punkt(klein_anfang(item["THEMA"] or ersten_satz(item["WAS"])))
    frage_kern = "nutzt du " + thema + " schon im Alltag, oder wartest du noch ab"
    hook = waehle_hook("frage", frage_kern, rng)
    zeilen = [
        hook,
        "",
        "Kurzer Kontext: " + (ersten_satz(item["WAS"]) or item["THEMA"]),
        "",
        "Bei mir ist es so: erst testen, dann entscheiden.",
        "",
        "Wie haeltst du es? Schreib es in die Kommentare.",
        "",
        CTA,
        "",
        hashtags("KI", "Community"),
    ]
    return "\n".join(zeilen)


# Reihenfolge + Dateinamen der fuenf Winkel.
WINKEL = [
    ("news", "post-1-news.txt", baue_news),
    ("howto", "post-2-howto.txt", baue_howto),
    ("contrarian", "post-3-contrarian.txt", baue_contrarian),
    ("case", "post-4-case.txt", baue_case),
    ("frage", "post-5-frage.txt", baue_frage),
]


# --- Qualitaetskontrolle ---------------------------------------------------

def pruefe_post(text):
    """Gibt eine Liste von Warnungen zurueck (Hype-Wort, Laenge, !!)."""
    warnungen = []
    klein = text.lower()
    for w in HYPE_WOERTER:
        if w in klein:
            warnungen.append("Hype-Wort gefunden: '%s'" % w)
    if "!!" in text:
        warnungen.append("Mehrfach-Ausrufezeichen gefunden")
    if len(text) > MAX_ZEICHEN:
        warnungen.append("Zu lang: %d Zeichen (max %d)" % (len(text), MAX_ZEICHEN))
    return warnungen


# --- Hauptlauf -------------------------------------------------------------

def waehle_item(items, index):
    """Ordnet jedem Winkel ein Item zu; rotiert, falls weniger als 5 Items."""
    if not items:
        return {f: "" for f in FELDER}
    return items[index % len(items)]


def main(argv):
    pfad = argv[1] if len(argv) > 1 else STANDARD_EINGABE

    if not os.path.exists(pfad):
        print("FEHLER: Eingabedatei nicht gefunden: %s" % pfad, file=sys.stderr)
        return 1

    with open(pfad, "r", encoding="utf-8") as f:
        roh = f.read()

    items = parse_ausgabe(roh)
    if not items:
        print("FEHLER: Keine Items in der Eingabe gefunden (Format pruefen).",
              file=sys.stderr)
        return 1

    print("Gelesen: %d Item(s) aus %s\n" % (len(items), pfad))

    os.makedirs(AUSGABE_DIR, exist_ok=True)

    # Deterministischer Zufall: gleiche Eingabe -> gleiche Hooks (reproduzierbar),
    # aber ueber die Ausgaben hinweg variantenreich.
    rng = random.Random(len(roh) + sum(len(i["THEMA"]) for i in items))

    geschrieben = 0
    for index, (name, dateiname, bauer) in enumerate(WINKEL):
        item = waehle_item(items, index)
        post = bauer(item, rng).rstrip() + "\n"

        warnungen = pruefe_post(post)
        zielpfad = os.path.join(AUSGABE_DIR, dateiname)
        with open(zielpfad, "w", encoding="utf-8") as out:
            out.write(post)
        geschrieben += 1

        trenner = "=" * 60
        print(trenner)
        print("WINKEL %d (%s)  ->  %s  [%d Zeichen]"
              % (index + 1, name, dateiname, len(post)))
        print(trenner)
        print(post)
        if warnungen:
            print("  WARNUNG:")
            for w in warnungen:
                print("   - " + w)
        print()

    print("Fertig: %d Entwuerfe in %s geschrieben." % (geschrieben, AUSGABE_DIR))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
