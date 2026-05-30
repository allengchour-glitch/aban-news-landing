#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
30-Tage-Plan  ->  30 fertige LinkedIn-Post-Entwuerfe (volle Automation)

Liest linkedin/30-tage-plan.txt, nimmt pro Tag das Thema + die Hook + den
Post-Typ und erzeugt mit den Bausteinen aus generate_linkedin_posts.py
einen passenden, fertigen Entwurf. Ergebnis: ein ganzer Monat Content auf
einen Schlag, statt taeglich von Hand.

Output:
  linkedin/drafts/monat/tag-01.txt ... tag-NN.txt
  linkedin/drafts/monat/00-uebersicht.txt   (alle Posts in einer Datei)

Verwendung:
  python3 generate_month_posts.py
  python3 generate_month_posts.py --plan linkedin/30-tage-plan.txt

Voice bleibt anti-hype (nutzt pruefe_post aus dem Generator). Jeder Post
ist ein Startentwurf - vor dem Posten kurz mit eigener Stimme nachfeilen
und ein echtes Detail ergaenzen.
"""
import argparse
import os
import random
import re

import generate_linkedin_posts as g

HIER = os.path.dirname(os.path.abspath(__file__))
STANDARD_PLAN = os.path.join(HIER, "linkedin", "30-tage-plan.txt")
MONAT_DIR = os.path.join(g.AUSGABE_DIR, "monat")

# Post-Typ aus dem Plan -> Generator-Winkel (Name, Bauer-Funktion)
TYP_MAP = {
    "news-reaktion": ("news", g.baue_news),
    "news": ("news", g.baue_news),
    "how-to": ("howto", g.baue_howto),
    "howto": ("howto", g.baue_howto),
    "contrarian": ("contrarian", g.baue_contrarian),
    "mini-case": ("case", g.baue_case),
    "case": ("case", g.baue_case),
    "frage": ("frage", g.baue_frage),
    "frage/engagement": ("frage", g.baue_frage),
    "story": ("case", g.baue_case),
    "story/lektion": ("case", g.baue_case),
}

# Eine Tag-Kopfzeile, z.B.:  "Tag 1  (Mo) - News-Reaktion"
TAG_RE = re.compile(r"^\s*Tag\s+(\d+)\s*\(([^)]*)\)\s*[-–]\s*(.+?)\s*$", re.IGNORECASE)
FELD_RE = re.compile(r"^\s*(Thema|Hook)\s*:\s*(.*)$", re.IGNORECASE)


def parse_plan(text):
    """Liest die nummerierten Tagesbloecke aus dem 30-Tage-Plan."""
    tage = []
    aktuell = None
    feld = None
    for zeile in text.splitlines():
        m = TAG_RE.match(zeile)
        if m:
            if aktuell:
                tage.append(aktuell)
            aktuell = {"nr": int(m.group(1)), "tag": m.group(2).strip(),
                       "typ": m.group(3).strip(), "thema": "", "hook": ""}
            feld = None
            continue
        if aktuell is None:
            continue
        fm = FELD_RE.match(zeile)
        if fm:
            feld = fm.group(1).lower()
            wert = fm.group(2).strip()
            aktuell[feld] = (aktuell.get(feld, "") + " " + wert).strip()
        elif feld and zeile.strip():
            # Folgezeile gehoert zum laufenden Feld (Thema/Hook mehrzeilig).
            aktuell[feld] = (aktuell[feld] + " " + zeile.strip()).strip()
        elif not zeile.strip():
            feld = None
    if aktuell:
        tage.append(aktuell)
    # Hooks tragen oft Anfuehrungszeichen - entfernen.
    for t in tage:
        t["hook"] = t["hook"].strip().strip('"').strip()
        t["thema"] = re.sub(r"\s+", " ", t["thema"]).strip()
    return tage


def typ_winkel(typ):
    """Findet den passenden Winkel zu einem Post-Typ (robust gegen Schreibweise)."""
    key = typ.lower().strip()
    if key in TYP_MAP:
        return TYP_MAP[key]
    # erstes Wort versuchen (z.B. "Frage/Engagement" -> "frage")
    erstes = re.split(r"[\s/]+", key)[0]
    return TYP_MAP.get(erstes, ("news", g.baue_news))


def tag_zu_item(t):
    """Baut aus einem Plan-Tag ein Generator-Item (THEMA/WAS/BEDEUTUNG/TIPP)."""
    thema = t["thema"] or t["hook"] or "KI im Solo-Alltag"
    # Kurztitel = erste ~7 Woerter des Themas
    kurz = g.kuerzen(thema, 7)
    return {
        "THEMA": kurz,
        "WAS": thema,
        "BEDEUTUNG": "",   # bewusst leer -> Bauer setzt eine neutrale Einordnung
        "TIPP": thema,
    }


def baue_tag(t, rng):
    """Erzeugt den fertigen Post fuer einen Plan-Tag."""
    winkel_name, bauer = typ_winkel(t["typ"])
    item = tag_zu_item(t)
    post = bauer(item, rng)
    # Wenn der Plan eine Hook vorgibt, ersetze die generierte erste Zeile.
    if t["hook"]:
        rest = post.split("\n", 1)
        post = t["hook"] + ("\n" + rest[1] if len(rest) > 1 else "")
    warnungen = g.pruefe_post(post)
    return post, winkel_name, (not warnungen), "; ".join(warnungen)


def main():
    p = argparse.ArgumentParser(description="30-Tage-Plan in 30 fertige LinkedIn-Posts umwandeln.")
    p.add_argument("--plan", default=STANDARD_PLAN, help="Pfad zum Plan (Default: linkedin/30-tage-plan.txt)")
    args = p.parse_args()

    if not os.path.exists(args.plan):
        raise SystemExit("! Plan nicht gefunden: %s" % args.plan)
    with open(args.plan, "r", encoding="utf-8") as f:
        tage = parse_plan(f.read())
    if not tage:
        raise SystemExit("! Keine Tagesbloecke im Plan erkannt (erwarte Zeilen wie 'Tag 1 (Mo) - News-Reaktion').")

    os.makedirs(MONAT_DIR, exist_ok=True)
    rng = random.Random(1234)  # deterministisch -> reproduzierbare Entwuerfe
    uebersicht = ["aban news - 30 LinkedIn-Posts aus dem Content-Plan",
                  "=" * 60, ""]
    warnungen = 0
    for t in tage:
        post, winkel, ok, befund = baue_tag(t, rng)
        name = "tag-%02d.txt" % t["nr"]
        with open(os.path.join(MONAT_DIR, name), "w", encoding="utf-8") as f:
            f.write(post + "\n")
        kopf = "Tag %02d (%s) - %s  [Winkel: %s]" % (t["nr"], t["tag"], t["typ"], winkel)
        uebersicht += [kopf, "-" * 60, post, "", ""]
        if not ok:
            warnungen += 1
            uebersicht += ["  ! Voice-Hinweis: %s" % befund, ""]

    with open(os.path.join(MONAT_DIR, "00-uebersicht.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(uebersicht))

    print("✓ %d Posts erzeugt in %s" % (len(tage), MONAT_DIR))
    print("  Sammeldatei: %s" % os.path.join(MONAT_DIR, "00-uebersicht.txt"))
    if warnungen:
        print("  ! %d Post(s) mit Voice-Hinweis - in der Uebersicht markiert." % warnungen)
    else:
        print("  Alle Posts voice-sauber (kein Hype, keine doppelten Ausrufezeichen).")


if __name__ == "__main__":
    main()
