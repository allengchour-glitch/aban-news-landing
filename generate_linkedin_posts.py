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
EINZEL-MODUS (eine Ausgabe -> 5 Entwuerfe):

    python3 generate_linkedin_posts.py [ausgabe-datei]

Ohne Argument wird ``linkedin/beispiel-ausgabe.txt`` verwendet.
Die Entwuerfe landen als einzelne .txt-Dateien in ``linkedin/drafts/``
und werden zusaetzlich auf der Konsole ausgegeben.

WOCHEN-MODUS / BATCH (eine ganze Woche auf einmal):

    python3 generate_linkedin_posts.py --woche [ordner]
    python3 generate_linkedin_posts.py --batch [ordner]   # Alias

Liest alle ``*.txt`` aus ``ordner`` (Standard: ``linkedin/woche/``),
sortiert nach Dateiname, und baut pro Datei die 5 Entwuerfe. Die
Entwuerfe landen in ``linkedin/drafts/woche/<dateiname>/post-N-*.txt``.
Zusaetzlich entsteht ``linkedin/drafts/woche/wochenplan.txt`` - ein
Copy-Sheet mit allen Tagen, allen 5 Winkeln und einem Vorschlag,
welcher Winkel an welchem Wochentag laeuft (5 Winkel = 1 Post pro Tag).

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

# Wochen-/Batch-Modus: Standard-Eingabeordner und Ausgabe-Unterordner.
STANDARD_WOCHE_DIR = os.path.join(HIER, "linkedin", "woche")
WOCHE_AUSGABE_DIR = os.path.join(AUSGABE_DIR, "woche")

# Flags, die den Wochen-/Batch-Modus ausloesen.
WOCHE_FLAGS = ("--woche", "--batch")

# Wochentage fuer den Posting-Plan (1 Post pro Tag).
WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag",
              "Samstag", "Sonntag"]

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


def rng_fuer(roh, items):
    """Baut den deterministischen Zufallsgenerator fuer eine Ausgabe.

    Gleiche Eingabe -> gleiche Hooks (reproduzierbar), aber ueber die
    einzelnen Ausgaben hinweg variantenreich.
    """
    return random.Random(len(roh) + sum(len(i["THEMA"]) for i in items))


def baue_alle_winkel(items, rng):
    """Erzeugt die 5 Entwuerfe fuer eine Ausgabe.

    Gibt eine Liste von Tupeln zurueck:
    ``(index, name, dateiname, post_text, warnungen)``.
    Kapselt die Winkel-Schleife, damit Einzel- und Wochen-Modus
    exakt dieselbe Engine nutzen.
    """
    ergebnisse = []
    for index, (name, dateiname, bauer) in enumerate(WINKEL):
        item = waehle_item(items, index)
        post = bauer(item, rng).rstrip() + "\n"
        warnungen = pruefe_post(post)
        ergebnisse.append((index, name, dateiname, post, warnungen))
    return ergebnisse


def verarbeite_ausgabe(roh, ausgabe_dir, drucken=True):
    """Parst eine Ausgabe, schreibt die 5 Entwuerfe nach ``ausgabe_dir``.

    Gibt ``(ergebnisse, warn_gesamt)`` zurueck oder ``(None, None)``, wenn
    keine Items gefunden wurden. ``drucken`` steuert die Konsolenausgabe.
    """
    items = parse_ausgabe(roh)
    if not items:
        return None, None

    os.makedirs(ausgabe_dir, exist_ok=True)
    rng = rng_fuer(roh, items)
    ergebnisse = baue_alle_winkel(items, rng)

    warn_gesamt = 0
    for index, name, dateiname, post, warnungen in ergebnisse:
        zielpfad = os.path.join(ausgabe_dir, dateiname)
        with open(zielpfad, "w", encoding="utf-8") as out:
            out.write(post)
        warn_gesamt += len(warnungen)
        if drucken:
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
    return ergebnisse, warn_gesamt


def main(argv):
    pfad = argv[1] if len(argv) > 1 else STANDARD_EINGABE

    if not os.path.exists(pfad):
        print("FEHLER: Eingabedatei nicht gefunden: %s" % pfad, file=sys.stderr)
        return 1

    with open(pfad, "r", encoding="utf-8") as f:
        roh = f.read()

    print("Gelesen aus %s\n" % pfad)

    ergebnisse, _ = verarbeite_ausgabe(roh, AUSGABE_DIR, drucken=True)
    if ergebnisse is None:
        print("FEHLER: Keine Items in der Eingabe gefunden (Format pruefen).",
              file=sys.stderr)
        return 1

    print("Fertig: %d Entwuerfe in %s geschrieben."
          % (len(ergebnisse), AUSGABE_DIR))
    return 0


# --- Wochen-/Batch-Modus ---------------------------------------------------

def ausgabe_name(dateipfad):
    """Macht aus einem Dateinamen einen sauberen Ordner-/Anzeigenamen."""
    basis = os.path.splitext(os.path.basename(dateipfad))[0]
    return basis.strip() or "ausgabe"


def schreibe_wochenplan(plan_pfad, tage):
    """Schreibt das kombinierte Copy-Sheet ``wochenplan.txt``.

    ``tage`` ist eine Liste von Dicts mit ``name``, ``ordner`` und
    ``ergebnisse`` (Rueckgabe von ``baue_alle_winkel``). Das Sheet listet
    pro Tag alle 5 Winkel zum direkten Kopieren plus einen Vorschlag,
    welcher Winkel an welchem Wochentag laeuft (5 Winkel = 1 Post/Tag).
    """
    breit = 74
    linie = "=" * breit
    duenn = "-" * breit
    zeilen = []
    zeilen.append(linie)
    zeilen.append("aban news - Wochenplan LinkedIn")
    zeilen.append(linie)
    zeilen.append("")
    zeilen.append("%d Ausgabe(n) verarbeitet. Pro Ausgabe 5 Winkel."
                  % len(tage))
    zeilen.append("Idee: 5 Winkel = waehle 1 Post pro Tag und mische die")
    zeilen.append("Winkel ueber die Woche. Kopiere den Block direkt in")
    zeilen.append("deinen Planer und wuerze jeden Post mit einem echten Detail.")
    zeilen.append("")

    # Posting-Vorschlag: ein Wochentag pro Ausgabe, rotierender Start-Winkel,
    # damit ueber die Woche unterschiedliche Winkel oben stehen.
    zeilen.append(duenn)
    zeilen.append("POSTING-VORSCHLAG (1 Post pro Tag, Winkel gemischt)")
    zeilen.append(duenn)
    for i, tag in enumerate(tage):
        wochentag = WOCHENTAGE[i % len(WOCHENTAGE)]
        if tag["ergebnisse"]:
            n = len(tag["ergebnisse"])
            empf_index = i % n
            _, winkelname, dateiname, _, _ = tag["ergebnisse"][empf_index]
        else:
            winkelname, dateiname = "-", "-"
        zeilen.append("  %-11s %-22s -> Winkel: %s  (%s)"
                      % (wochentag + ":", tag["name"], winkelname, dateiname))
    zeilen.append("")
    zeilen.append("Die uebrigen 4 Winkel pro Ausgabe sind Reserve fuer ")
    zeilen.append("Folgetage, A/B-Tests oder als Vorrat.")
    zeilen.append("")

    # Voller Copy-Block pro Tag mit allen 5 Entwuerfen.
    for i, tag in enumerate(tage):
        wochentag = WOCHENTAGE[i % len(WOCHENTAGE)]
        zeilen.append("")
        zeilen.append(linie)
        zeilen.append("TAG %d - %s  (%s)" % (i + 1, tag["name"], wochentag))
        zeilen.append("Quelle-Entwuerfe: linkedin/drafts/woche/%s/" % tag["ordner"])
        zeilen.append(linie)
        if not tag["ergebnisse"]:
            zeilen.append("")
            zeilen.append("  (keine Items gefunden - Datei pruefen)")
            zeilen.append("")
            continue
        for index, name, dateiname, post, warnungen in tag["ergebnisse"]:
            zeilen.append("")
            zeilen.append(duenn)
            zeilen.append("  WINKEL %d - %s  [%s]" % (index + 1, name, dateiname))
            if warnungen:
                zeilen.append("  WARNUNG: " + "; ".join(warnungen))
            zeilen.append(duenn)
            for postzeile in post.rstrip("\n").splitlines():
                zeilen.append("  " + postzeile if postzeile else "")
            zeilen.append("")

    inhalt = "\n".join(zeilen).rstrip() + "\n"
    with open(plan_pfad, "w", encoding="utf-8") as out:
        out.write(inhalt)


def main_woche(argv):
    """Batch-Modus: alle *.txt in einem Ordner -> Woche an Entwuerfen."""
    # Ordner ist das erste Nicht-Flag-Argument nach dem Skriptnamen.
    ordner = STANDARD_WOCHE_DIR
    for arg in argv[1:]:
        if arg not in WOCHE_FLAGS:
            ordner = arg
            break

    if not os.path.isdir(ordner):
        print("FEHLER: Ordner nicht gefunden: %s" % ordner, file=sys.stderr)
        return 1

    dateien = sorted(
        os.path.join(ordner, n) for n in os.listdir(ordner)
        if n.lower().endswith(".txt")
    )
    if not dateien:
        print("FEHLER: Keine *.txt-Dateien in %s gefunden." % ordner,
              file=sys.stderr)
        return 1

    os.makedirs(WOCHE_AUSGABE_DIR, exist_ok=True)
    print("Wochen-Modus: %d Ausgabe-Datei(en) aus %s\n"
          % (len(dateien), ordner))

    tage = []
    warn_gesamt = 0
    geschrieben = 0
    for dateipfad in dateien:
        with open(dateipfad, "r", encoding="utf-8") as f:
            roh = f.read()
        name = ausgabe_name(dateipfad)
        tag_dir = os.path.join(WOCHE_AUSGABE_DIR, name)
        ergebnisse, warn = verarbeite_ausgabe(roh, tag_dir, drucken=False)
        if ergebnisse is None:
            print("  uebersprungen (keine Items): %s" % dateipfad)
            tage.append({"name": name, "ordner": name, "ergebnisse": []})
            continue
        warn_gesamt += warn
        geschrieben += len(ergebnisse)
        tage.append({"name": name, "ordner": name, "ergebnisse": ergebnisse})
        print("  %-22s -> %d Entwuerfe in %s%s"
              % (name, len(ergebnisse), tag_dir,
                 "  [%d Warnung(en)]" % warn if warn else ""))

    plan_pfad = os.path.join(WOCHE_AUSGABE_DIR, "wochenplan.txt")
    schreibe_wochenplan(plan_pfad, tage)

    print("")
    print("Fertig: %d Entwuerfe fuer %d Tag(e) geschrieben."
          % (geschrieben, len(tage)))
    print("Wochenplan (Copy-Sheet): %s" % plan_pfad)
    if warn_gesamt:
        print("Hinweis: %d Warnung(en) insgesamt - bitte pruefen."
              % warn_gesamt)
    return 0


if __name__ == "__main__":
    if any(a in WOCHE_FLAGS for a in sys.argv[1:]):
        sys.exit(main_woche(sys.argv))
    sys.exit(main(sys.argv))
