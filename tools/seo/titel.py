#!/usr/bin/env python3
# =============================================================================
#  titel.py — Seiten-Titel SEO-tauglich machen
# -----------------------------------------------------------------------------
#  Zwei Befunde vom Titel-Check am 2026-10-05 (2717 Seiten gescannt):
#
#  1. 1908 Titel waren laenger als 65 Zeichen und wurden in der Google-Suche
#     abgeschnitten. Am schlimmsten die uebersetzten Branchenseiten in fr/ und
#     it/ (bis 123 Zeichen) — Uebersetzungen sind laenger als die deutsche
#     Vorlage, der Titel wuchs dabei ueber jede Grenze.
#
#  2. 39 Gruppen trugen denselben Titel, obwohl jede Seite ein eigenes
#     Canonical auf sich selbst hat — die Seiten konkurrieren also wirklich
#     gegeneinander. URSACHE GEMESSEN: nicht die Seiten sind doppelt, sondern
#     die Uebersetzung hat zwei UNTERSCHIEDLICHE deutsche Titel auf denselben
#     Zieltitel abgebildet. Beispiel: "KI fuer die Eisdiele — wo sie beim
#     Buero-Kram hilft" und "KI fuer Eisdielen — wo sie wirklich Zeit spart"
#     wurden beide zu "AI for ice cream parlours — where it really saves time".
#     Die Inhalte der beiden Seiten sind verschieden (andere Anwendungsfaelle,
#     andere FAQ). Darum waere ein Canonical der falsche Eingriff: er wuerfe
#     eine inhaltlich eigene Seite aus dem Index. Richtig ist, den Zieltitel
#     wieder am eigenen deutschen Titel auszurichten — Liste in
#     tools/seo/titel_dubletten.json, von Hand geschrieben, eine Zeile je Seite.
#
#  Kuerzungsregel (die laengste Variante, die passt, gewinnt — nie mitten
#  im Wort schneiden):
#    a) Titel ohne Marken-Suffix "| aban news" kurz genug -> den nehmen.
#       Das Suffix steht hinten und wird in der Suche sowieso abgeschnitten;
#       12 Zeichen weniger Marke kaufen 12 Zeichen echte Stichwoerter.
#    b) Sonst Kopf vor dem Gedankenstrich + Jahr, mit Suffix wenn es passt.
#    c) Ist dieser Kopf sehr kurz (< 45), lieber den vollen Titel am WORTENDE
#       kuerzen — sonst wird aus 67 Zeichen ein nackter 27-Zeichen-Titel und
#       die halbe Suchergebnis-Zeile bleibt leer.
#
#  Es wird geprueft, dass keine NEUE Titel-Dublette entsteht: faellt eine
#  Kuerzung mit einer anderen Seite derselben Sprache zusammen, greift
#  stattdessen die Wortgrenzen-Variante, die den Unterschied erhaelt.
#
#  Aufruf:
#    python3 tools/seo/titel.py            # nur pruefen (aendert nichts)
#    python3 tools/seo/titel.py --anwenden # schreibt die Seiten
#  Danach: python3 tools/build_search_index.py   (Suchindex traegt die Titel)
# =============================================================================

import collections
import html
import subprocess
import json
import os
import re
import sys

MAX = 65                 # Zeichen, ab hier schneidet Google ab
MIN_KOPF = 45            # kuerzer als das ist ein Kopf-Titel Verschwendung
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HANDARBEIT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "titel_handarbeit.json")

# Nicht ausgelieferte oder fremde Ordner: Spiele, Videos, App, bezahlte Pakete,
# das Archiv alter Ausgaben und der Build-Ordner.
SKIP = {"node_modules", ".git", "_site", "downloads", "content", "spiele-dev",
        "video-prototypes", "apps", "reels", "archive"}

# Auch die abgeschnittene Form "| aban" (77 Seiten tragen sie) gilt als Marke —
# sonst bleibt sie als Bruchstueck am Ende des gekuerzten Titels stehen.
SUFFIX = re.compile(r"\s*[|·]\s*aban(\s*news)?\s*$", re.I)
JAHR = re.compile(r"\(((?:19|20)\d\d(?:/\d\d)?)\)")
TITLE = re.compile(r"(<title[^>]*>)(.*?)(</title>)", re.S | re.I)

# Woerter, die am Schnittende haengen bleiben wuerden ("... — KI-Sichtbarkeit fuer")
HAENGER = {"für", "und", "mit", "oder", "the", "for", "and", "with", "de", "des",
           "du", "la", "le", "les", "di", "e", "per", "pour", "con", "da", "in",
           "im", "zu", "von", "a", "of", "&", "—", "–", "-", ":", ",", "·", "|",
           "à", "et", "che", "il", "lo", "su", "dei", "delle", "der", "den",
           # Negationen und Gegen-Konjunktionen: stehen nie am Satzende
           # ("… e gli eventi, non"), gemessen im Diff.
           "nicht", "not", "non", "no", "kein", "keine", "ohne", "sans",
           "senza", "statt", "sondern", "aber", "mais", "ma", "però",
           "invece", "instead", "nor", "ni", "né",
           # haeufige attributive Adjektive ohne eigenes Bezugswort
           # ("… Lattenrost & Schweizer"), ebenfalls gemessen
           "schweizer", "schweizerische", "schweizerischen", "echte", "echten",
           "beste", "besten", "richtige", "richtigen", "ganze", "ganzen",
           # nackte Artikel und Pronomen am Schluss ("… nicht die",
           # "… mehr Zeit am", "… ob ChatGPT & Co. dich") — im Diff gefunden
           "die", "das", "dem", "am", "im", "beim", "zum", "zur", "ans",
           "aufs", "dich", "dir", "mich", "mir", "sich", "uns", "euch",
           "ihn", "ihm", "them", "its", "il", "la", "lo", "gli", "une", "un"}


# Beim Schneiden am Wortende kann ein Marken-Bruchstueck uebrig bleiben:
# "… Akku, Kabel & Benzin | aban Kaufberater" wurde zu "… | aban". Eine halbe
# Marke ist schlechter als keine, also fliegt sie weg.
MARKE_REST = re.compile(r"\s*[|·]\s*aban(?!\s*news\s*$)\s*\S*\s*$", re.I)


def ohne_marken_rest(titel):
    return MARKE_REST.sub("", titel).rstrip(" ,;:–—&·|-")


def am_wortende(text, budget):
    """Kuerzt auf hoechstens budget Zeichen, ohne ein Wort zu zerschneiden —
    und ohne einen angefangenen Teilsatz stehen zu lassen."""
    out = ""
    for wort in text.split(" "):
        naechste = (out + " " + wort).strip()
        if len(naechste) > budget:
            break
        out = naechste

    woerter = out.split(" ")
    while woerter and woerter[-1].strip(".,;:").lower() in HAENGER:
        woerter.pop()
    return ohne_marken_rest(" ".join(woerter).rstrip(" ,;:–—&·|-"))


def kuerzen(titel):
    """Gibt (neuer Titel, angewandte Regel) zurueck."""
    m = SUFFIX.search(titel)
    suffix = " | aban news" if m else ""
    kern = (titel[: m.start()] if m else titel).strip()
    if len(kern) <= MAX:
        return kern, "ohne-marke"

    jm = JAHR.search(kern)
    jahr = jm.group(0) if jm else ""
    kopf = re.split(r"\s+[—–]\s+", kern)[0].strip(" ,;:·|")
    kopf = re.sub(r"\s{2,}", " ", JAHR.sub("", kopf)).strip(" ,;:·|")

    varianten = [kopf + " " + jahr + suffix, kopf + " " + jahr] if jahr else []
    varianten += [kopf + suffix, kopf]
    passend = [v.strip() for v in varianten if len(v.strip()) <= MAX]
    beste = max(passend, key=len) if passend else ""
    if len(beste) >= MIN_KOPF:
        return beste, "kopf"

    gekuerzt = am_wortende(kern, MAX)
    if len(gekuerzt) > len(beste):
        return gekuerzt, "wortgrenze"
    return (beste or am_wortende(kopf, MAX)), "kopf-kurz"


def seiten():
    """Nur eingecheckte Seiten. Ueber os.walk kamen die 10 310 generierten
    Seiten aus ki-tools-radar/ mit (gitignorierte Build-Ausgabe, je nachdem
    ob gerade ein Generator gelaufen ist) — und damit waere das Ergebnis
    davon abhaengig, was vorher lief."""
    roh = subprocess.run(["git", "-C", ROOT, "ls-files", "*.html"],
                         capture_output=True, text=True, check=True).stdout
    for pfad in sorted(roh.split("\n")):
        if not pfad:
            continue
        if pfad.split("/")[0] in SKIP:
            continue
        if os.path.exists(os.path.join(ROOT, pfad)):
            yield pfad


def titel_von(text):
    m = TITLE.search(text)
    if not m:
        return None, None
    return m, html.unescape(re.sub(r"\s+", " ", m.group(2))).strip()


def sprache(pfad):
    teil = pfad.split("/")[0]
    return teil if teil in ("en", "fr", "it") else "de"


def lies(pfad):
    with open(os.path.join(ROOT, pfad), encoding="utf-8", errors="replace") as f:
        return f.read()


def schreib(pfad, text):
    with open(os.path.join(ROOT, pfad), "w", encoding="utf-8") as f:
        f.write(text)


def ohne_jahr(titel):
    return JAHR.sub("", titel).replace("  ", " ").strip(" ,;:·|")


def dubletten_plan():
    """Neue Titel-Kerne fuer die zusammengefallenen Uebersetzungen."""
    with open(HANDARBEIT, encoding="utf-8") as f:
        daten = json.load(f)
    daten.pop("_doku", None)
    plan = []
    for pfad, neu in sorted(daten.items()):
        if not os.path.exists(os.path.join(ROOT, pfad)):
            plan.append({"file": pfad, "fehler": "Datei fehlt"})
            continue
        text = lies(pfad)
        _, titel = titel_von(text)
        if titel is None:
            plan.append({"file": pfad, "fehler": "kein <title>"})
            continue
        # Ohne Jahresklammer ersetzen: <title> fuehrt "(2026)" mit, og:title,
        # twitter:title, JSON-LD "name" und <h1> nicht. Der jahreslose Kern
        # steckt in allen fuenf — ein Ersetzen haelt sie damit zusammen.
        alt = ohne_jahr(SUFFIX.sub("", titel))
        # Im Dokument kann derselbe Text roh ("&") oder maskiert ("&amp;")
        # stehen — beide Formen probieren, sonst trifft das Ersetzen nichts.
        formen = [alt, html.escape(alt, quote=False)]
        gefunden = next((f_ for f_ in formen if f_ in text), None)
        plan.append({"file": pfad,
                     "alt": gefunden or alt,
                     "neu": html.escape(ohne_jahr(neu), quote=False)
                            if gefunden and gefunden != alt else ohne_jahr(neu),
                     "treffer": text.count(gefunden) if gefunden else 0})
    return plan


def dubletten_anwenden(plan):
    """Ersetzt den alten Titel-Kern ueberall, wo er im Dokument steht:
    <title>, og:title, twitter:title, JSON-LD "name" und <h1>. Alle fuenf
    tragen bei diesen Seiten denselben jahreslosen String — ein gezieltes
    Zeichenketten-Ersetzen haelt sie damit automatisch zusammen. Sonst bliebe
    die Dublette in der Ueberschrift und in der Social-Vorschau stehen."""
    geschrieben = 0
    for e in plan:
        if "fehler" in e or e["alt"] == e["neu"]:
            continue
        text = lies(e["file"])
        schreib(e["file"], text.replace(e["alt"], e["neu"]))
        geschrieben += 1
    return geschrieben


MARKE_KAPUTT = re.compile(r"\s*([|·])\s*aban\s*$", re.I)


def marke_plan():
    """75 Seiten enden auf das Bruchstueck "| aban" statt auf "| aban news".
    Passt die vollstaendige Marke in 65 Zeichen, wird sie ergaenzt; sonst
    faellt das Bruchstueck weg — eine halbe Marke nuetzt niemandem.
    Betrifft nur <title>; og:title und <h1> tragen die Marke ohnehin nicht."""
    plan = []
    for pfad in seiten():
        _, titel = titel_von(lies(pfad))
        if not titel:
            continue
        m = MARKE_KAPUTT.search(titel)
        if not m:
            continue
        kern = titel[: m.start()].strip()
        voll = f"{kern} {m.group(1)} aban news"
        plan.append({"file": pfad, "alt": titel,
                     "neu": voll if len(voll) <= MAX else kern,
                     "regel": "ergänzt" if len(voll) <= MAX else "Bruchstück entfernt"})
    return plan


def marke_anwenden(plan):
    for e in plan:
        text = lies(e["file"])
        m, _ = titel_von(text)
        schreib(e["file"], text[: m.start(2)]
                + html.escape(e["neu"], quote=False) + text[m.end(2):])
    return len(plan)


def kuerzungs_plan():
    alle = {}
    for pfad in seiten():
        _, titel = titel_von(lies(pfad))
        if titel:
            alle[pfad] = titel

    plan = []
    for pfad, titel in alle.items():
        if len(titel) <= MAX:
            continue
        neu, regel = kuerzen(titel)
        plan.append({"file": pfad, "alt": titel, "neu": neu, "regel": regel})

    # Keine NEUE Dublette erzeugen: Kollision -> Wortgrenzen-Variante, die den
    # Unterschied zwischen den beiden Titeln erhaelt.
    belegt = collections.defaultdict(set)
    for pfad, titel in alle.items():
        belegt[(sprache(pfad), titel)].add(pfad)
    for e in plan:
        andere = belegt[(sprache(e["file"]), e["neu"])] - {e["file"]}
        gleich = [q for q in plan
                  if q is not e and q["neu"] == e["neu"]
                  and sprache(q["file"]) == sprache(e["file"])]
        if andere or gleich:
            ausweich = am_wortende(SUFFIX.sub("", e["alt"]).strip(), MAX)
            if ausweich and ausweich != e["neu"]:
                e["neu"], e["regel"] = ausweich, "wortgrenze (Dublette vermieden)"
    return plan, alle


def kuerzungs_plan_anwenden(plan):
    for e in plan:
        text = lies(e["file"])
        m, _ = titel_von(text)
        schreib(e["file"], text[: m.start(2)]
                + html.escape(e["neu"], quote=False) + text[m.end(2):])
    return len(plan)


def bericht():
    """Zustand nach der Arbeit: zu lange Titel, fehlende Titel, echte Dubletten."""
    lang, fehlt = [], []
    nach_titel = collections.defaultdict(list)
    canonical = {}
    for pfad in seiten():
        text = lies(pfad)
        _, titel = titel_von(text)
        if not titel:
            fehlt.append(pfad)
            continue
        if len(titel) > MAX:
            lang.append((len(titel), pfad, titel))
        nach_titel[(sprache(pfad), titel)].append(pfad)
        cm = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', text, re.I)
        canonical[pfad] = cm.group(1) if cm else None
    dubletten = []
    for (_, titel), pfade in nach_titel.items():
        if len(pfade) < 2:
            continue
        ziele = {canonical.get(p) for p in pfade}
        if len(ziele) == 1 and None not in ziele:
            continue   # zeigen alle auf dieselbe URL -> keine Konkurrenz
        dubletten.append((titel, pfade))
    return lang, fehlt, dubletten


def main():
    anwenden = "--anwenden" in sys.argv

    dpl = dubletten_plan()
    fehler = [e for e in dpl if "fehler" in e]
    ohne_treffer = [e for e in dpl if "fehler" not in e and e["treffer"] == 0]
    print(f"Dubletten-Liste: {len(dpl)} Einträge, "
          f"{len(fehler)} Fehler, {len(ohne_treffer)} ohne Treffer im Dokument")
    for e in (fehler + ohne_treffer)[:10]:
        print("  !", e["file"], e.get("fehler", f"alter Titel nicht gefunden: {e['alt']!r}"))
    if anwenden:
        print("  Dubletten geschrieben:", dubletten_anwenden(dpl))

    mpl = marke_plan()
    regeln_m = collections.Counter(e["regel"] for e in mpl)
    print(f"Abgeschnittene Marke \"| aban\": {len(mpl)} Seiten · {dict(regeln_m)}")
    if anwenden:
        print("  Marke repariert:", marke_anwenden(mpl))

    plan, alle = kuerzungs_plan()
    regeln = collections.Counter(e["regel"] for e in plan)
    print(f"Seiten mit Titel: {len(alle)} · über {MAX} Zeichen: {len(plan)}")
    print("  Regeln:", dict(regeln))
    zu_lang = [e for e in plan if len(e["neu"]) > MAX]
    zu_kurz = [e for e in plan if len(e["neu"]) < 30]
    print(f"  danach noch zu lang: {len(zu_lang)} · unter 30 Zeichen: {len(zu_kurz)}")
    if anwenden:
        print("  Titel gekürzt:", kuerzungs_plan_anwenden(plan))

    lang, fehlt, dub = bericht()
    print(f"\nBefund: {len(lang)} Titel über {MAX} Zeichen · "
          f"{len(fehlt)} ohne Titel · {len(dub)} konkurrierende Dubletten-Gruppen")
    for n, pfad, titel in sorted(lang, reverse=True)[:5]:
        print(f"  {n} {pfad} :: {titel}")
    for titel, pfade in dub[:5]:
        print(f"  Dublette: {titel[:60]} -> {', '.join(pfade)}")
    return 1 if (anwenden and (lang or dub)) else 0


if __name__ == "__main__":
    sys.exit(main())
