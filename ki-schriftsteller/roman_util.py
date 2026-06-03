#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gemeinsame Helfer fuer den KI-Schriftsteller (eine Quelle der Wahrheit).

Hier liegt alles, was sonst in mehreren Werkzeugen dupliziert wuerde:

  - lade_roman()      : JSON-Plot-Bibel laden.
  - slugify()         : Titel -> dateisystem-tauglicher Slug.
  - ist_trilogie()    : hat die Bibel eine Mehrband-Struktur (baende)?
  - baende_aus_roman(): NORMALISIERT auf eine Bandliste. Einzelbuch-Bibeln
                        (flaches "kapitel") werden in genau einen Band gewickelt,
                        damit der restliche Code IMMER mit Baenden rechnen kann.
  - kapitel_pfad()    : Pfad einer Kapiteldatei - rueckwaertskompatibel.

Rueckwaertskompatibilitaet ist Absicht: Bibeln mit flachem "kapitel" (roman.json,
roman-thriller.json) verhalten sich exakt wie bisher. Erst das optionale Feld
"baende" schaltet den Trilogie-Modus frei.

Schema einer Mehrband-Bibel (zusaetzlich zu den geteilten Top-Level-Feldern
titel/genre/sprache/praemisse/ton/erzaehlperspektive/stilregeln/welt/figuren):

  "baende": [
    { "nummer": 1, "titel": "...", "untertitel": "...",
      "kapitel": [ {"nummer":1,"titel":"...","ziel":"...","beats":[...]}, ... ] },
    ...
  ]
"""
import json
import os
import re


# ------------------------------------------------------------------
# Laden
# ------------------------------------------------------------------
def lade_roman(pfad):
    """Liest die Plot-Bibel (JSON) und gibt das dict zurueck."""
    with open(pfad, "r", encoding="utf-8") as f:
        return json.load(f)


# ------------------------------------------------------------------
# Slug
# ------------------------------------------------------------------
def slugify(text):
    """Macht aus einem Titel einen dateisystem-tauglichen Slug.

    Umlaute werden transliteriert, alles andere auf [a-z0-9-] reduziert.
    """
    text = (text or "").lower()
    ersetzungen = {
        "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
        "á": "a", "à": "a", "â": "a", "é": "e", "è": "e", "ê": "e",
        "í": "i", "ó": "o", "ô": "o", "ú": "u", "ñ": "n", "ç": "c",
    }
    for alt, neu in ersetzungen.items():
        text = text.replace(alt, neu)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "roman"


# ------------------------------------------------------------------
# Trilogie / Normalisierung
# ------------------------------------------------------------------
def ist_trilogie(roman):
    """True, wenn die Bibel eine nicht-leere baende-Liste hat."""
    return bool(roman.get("baende"))


def baende_aus_roman(roman):
    """Normalisiert die Bibel auf eine Liste von Baenden.

    Mehrband: gibt die deklarierten Baende zurueck (mit aufgefuellten Defaults).
    Einzelbuch: wickelt das flache "kapitel" in einen einzigen Band, dessen
    Titel der Romantitel ist. So sieht aufrufender Code immer Baende und braucht
    keine Sonderfaelle - der Einzelbuch-Pfad faellt einfach auf "ein Band" zusammen.
    """
    if ist_trilogie(roman):
        baende = []
        for i, b in enumerate(roman["baende"], 1):
            nummer = b.get("nummer", i)
            baende.append({
                "nummer": nummer,
                "titel": b.get("titel", "Band %d" % nummer),
                "untertitel": b.get("untertitel", ""),
                "kapitel": b.get("kapitel", []),
            })
        return baende
    return [{
        "nummer": 1,
        "titel": roman.get("titel", "Roman"),
        "untertitel": "",
        "kapitel": roman.get("kapitel", []),
    }]


# ------------------------------------------------------------------
# Pfade
# ------------------------------------------------------------------
def kapitel_pfad(basis_dir, band_nr, kap_nr, einzelbuch, suffix="md"):
    """Pfad einer Kapiteldatei.

    Einzelbuch: basis_dir/kapitel-NN.<suffix>           (wie bisher, unveraendert).
    Mehrband:   basis_dir/band-0N/kapitel-NN.<suffix>   (ein Unterordner je Band).

    suffix kann auch zusammengesetzt sein (z. B. "lektorat.md", "bak.md").
    """
    name = "kapitel-%02d.%s" % (kap_nr, suffix)
    if einzelbuch:
        return os.path.join(basis_dir, name)
    return os.path.join(basis_dir, "band-%02d" % band_nr, name)
