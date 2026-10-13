#!/usr/bin/env python3
"""bestandteil_regel.py — Ersatz-Weiterleitung von einem SET auf ein EINZELTEIL erkennen (13.10.2026).

ANLASS (Kauf-Strecke Klasse 18, Richter 13.10.): 10 von 535 Produkt→Produkt-Weiterleitungen führen von einem Set auf ein
Einzelteil — «Sonnenbrillen-Set» → eine Brille, «Jade-Roller & Gua-Sha-Set» → nur der Roller, «Rizinusöl-Wickel-Set mit
Bio-Öl» → der Wickel ohne Öl. Wer ein Set gesucht hat, landet auf einem Teil davon (Köderwechsel). Die Zwillingssuche
(tote_landeseiten.ersatz) kann das nicht sehen: ihre Stoppliste streicht «set», «stk», «stück» und «mit» ausdrücklich
(Ähnlichkeit 0,70 reicht, auch wenn die Hälfte des Sets fehlt); google_nachfrage_wache zählt jede 301 als Ersatz.

REGEL (rein, ohne Netz) — fehlt(quelle, ziel) → Liste der fehlenden Bestandteile, leer = in Ordnung:
  · Set-Wort in der Quelle (set/sets/kit/bundle/duo/trio/multipack, «2er», «3-paar», Komposita wie «Geschenkset»)
    und das Ziel hat weder ein Set-Wort noch eine Stückzahl                               → «Set»
  · Stückzahl in der Quelle («80 Stück», «110-teilig», «318 Teile», «10 pcs», «24 tlg») und das Ziel hat weder eine
    Stückzahl noch ein Set-Wort                                                            → «Stückzahl»
  · «mit X» / «inkl. X» / «samt X» in der Quelle und keines der (bis zu zwei) Wörter nach «mit» steht im Ziel
    (auch als Wortteil: «kissen» in «kissenbezug»)                                         → «mit X»
  Ausnahmen: Wörter, die auf «set» enden, aber kein Set sind (Headset, Sunset, Le Creuset, Korsett/Corset, Tischset …).
  Kontrolle (set_auf_menge): Quelle Set, Ziel ohne Set-Wort, aber mit Stückzahl («· 100 Stück») → kein Einzelteil, nur
  zur Kontrolle im Bericht. Umbenennung desselben Produkts (gleiche Endnummer): nur Set/Stückzahl, kein «mit X».
FOLGE: Melden, nicht automatisch drehen — weiterleitung_ziel_wache.py (Meldeliste im Bericht, täglich) und
tote_landeseiten.ersatz() (überspringt den Zwilling, merkt ihn in GEMELDET).

    python3 automation/bestandteil_regel.py --selbsttest
"""
import re
import sys

SET_WORT = {"set", "sets", "kit", "kits", "bundle", "bundles", "duo", "trio", "multipack", "sparset", "sparpack"}
# Wörter auf «set», die kein Set sind (Endung zufällig): Headset, Sonnenuntergang, Marke Le Creuset, Mieder …
KEIN_SET = {"headset", "headsets", "sunset", "sunsets", "reset", "offset", "onset", "inset", "asset", "assets", "outset",
            "upset", "closet", "closets", "corset", "corsets", "creuset", "dorset", "somerset", "basset", "gusset",
            "marmoset", "tischset", "tischsets", "platzset", "platzsets", "untersetzerset"}
MENGE_WORT = {"stuck", "stueck", "stk", "teile", "teil", "teilig", "teiliges", "teilige", "teiliger", "tlg", "pcs",
              "pieces", "piece", "pc", "pack", "packs"}
MENGE_FEST = re.compile(r"^\d+(?:stuck|stueck|stk|teilig|teiliges|teilige|tlg|pcs|pc|pack)$")
MIT = {"mit", "inkl", "inklusive", "samt", "including", "with"}
# Füllwörter nach «mit», die nichts über einen Bestandteil sagen
MIT_STOPP = {"der", "die", "das", "dem", "den", "des", "ein", "eine", "einem", "einer", "einen", "und", "oder", "fur", "fuer",
             "the", "and", "a", "an", "of", "zum", "zur", "im", "in", "auf", "viel", "vielen", "extra"}


def norm(t):
    t = (t or "").lower()
    for a, b in (("ä", "a"), ("ö", "o"), ("ü", "u"), ("ß", "ss"), ("é", "e"), ("è", "e"), ("‑", "-")):
        t = t.replace(a, b)
    return t


def tokens(t):
    return [w for w in re.split(r"[^a-z0-9]+", norm(t)) if w]


def _ist_set(w):
    if w in KEIN_SET:
        return False
    if w in SET_WORT:
        return True
    return len(w) > 5 and (w.endswith("set") or w.endswith("sets"))   # Geschenkset, Pflegesets …


def marker(text):
    """→ (hat_set, hat_menge, [mit-Wortgruppen]) für einen Titel oder Handle."""
    ws = tokens(text)
    hat_set = any(_ist_set(w) for w in ws)
    hat_menge = False
    for i, w in enumerate(ws):
        if MENGE_FEST.match(w):
            hat_menge = True
        elif w in MENGE_WORT and i > 0 and ws[i - 1].isdigit() and int(ws[i - 1]) >= 2:
            hat_menge = True
        elif w in ("paar", "pair", "pairs") and i > 0 and ws[i - 1].isdigit():
            hat_set = True
        elif re.match(r"^\d+er$", w) and int(w[:-2] or 0) >= 2 and i + 1 < len(ws) and _ist_set(ws[i + 1]):
            hat_set = True
    mits = []
    for i, w in enumerate(ws):
        if w in MIT:
            gruppe = [x for x in ws[i + 1:i + 4] if len(x) >= 3 and not x.isdigit() and x not in MIT_STOPP][:2]
            if gruppe:
                mits.append(gruppe)
    return hat_set, hat_menge, mits


def fehlt(quelle, ziel, mit_pruefen=True):
    """Fehlende Bestandteile der Quelle im Ziel (Liste, leer = in Ordnung). quelle/ziel: Titel und/oder Handle.
    mit_pruefen=False: nur Set/Stückzahl (für Umbenennungen desselben Produkts — «mit Diamanten» → «mit Strasssteinen» ist
    dort eine gewollte Korrektur, kein fehlender Bestandteil)."""
    q_set, q_menge, q_mit = marker(quelle)
    z_set, z_menge, _ = marker(ziel)
    zt = tokens(ziel)
    zs = "".join(zt)
    aus = []
    if q_set and not (z_set or z_menge):
        aus.append("Set")
    if q_menge and not (z_menge or z_set):
        aus.append("Stückzahl")
    for gruppe in (q_mit if mit_pruefen else []):
        if not any(g in zs or any(z.startswith(g[:6]) for z in zt if len(g) >= 6) for g in gruppe):
            t = "mit " + " ".join(gruppe)
            if t not in aus:
                aus.append(t)
    return aus


def set_auf_menge(quelle, ziel):
    """True: Quelle ist ein Set, das Ziel nennt kein Set, aber eine Stückzahl («Kabelschellen-Set» → «… · 100 Stück»).
    Kein Einzelteil — nur zur Kontrolle im Bericht (ob es dieselbe Ware ist, sieht nur ein Mensch)."""
    q_set, _, _ = marker(quelle)
    z_set, z_menge, _ = marker(ziel)
    return q_set and not z_set and z_menge


# Die 10 bekannten Fälle (Richter 13.10., Admin urlRedirects: Quelle hat «-set-», Ziel nicht) + Gegenproben.
KANARIEN = [
    ("jade-roller-gua-sha-premium-set-anti-aging-facelift", "jade-roller-premium-doppelseitig", True),
    ("jade-roller-gua-sha-premium-set-doppelkopf", "jade-roller-premium-doppelseitig", True),
    ("sonnenbrillen-set-retro-polarized", "retro-polarisierte-sonnenbrille-616000", True),
    ("nagel-kabelschellen-obo-bettermann-set", "kabelbinder-halterung-fur-wandmontage-612900", True),
    ("rizinusol-wickel-set-mit-bio-ol-323457", "rizinusol-wickel-wiederverwendbar-bauch-nacken", True),
    ("bausteine-set-police-racer-318-teile", "motorrad-bausteine-fur-kinder-631700", True),
    ("110-teiliges-magnet-bausteine-set-fur-kinder-461058", "magnetische-bausteine-fur-kids-376896", True),
    ("french-wear-armor-love-strass-set-610400", "french-press-on-nagel-mit-strass-und-herzen-610400", True),
    ("wear-armor-nagel-patch-set-928064", "lange-press-on-nagel-mit-gold-und-strass-deko-928064", True),
    ("akupressur-matte-mit-kissen-set", "akupressur-matte-mit-kissen-27cf6a", True),
    # Ziel-Titel nennt eine Stückzahl → kein Einzelteil (die zwei übrigen Richter-Fälle; Kontrolle über set_auf_menge)
    ("Nagel-Kabelschellen «OBO Bettermann» · Set nagel-kabelschellen-obo-bettermann-set",
     "Kabelbinder-Halterungen für Wandmontage · 100 Stück kabelbinder-halterung-fur-wandmontage-612900", False),
    ("110-teiliges Magnet-Bausteine-Set für Kinder 110-teiliges-magnet-bausteine-set-fur-kinder-461058",
     "Magnetische DIY-Bausteine für Kinder, 110–142 Teile magnetische-bausteine-fur-kids-376896", False),
    # Stückzahl
    ("cluster-wimpern-glue-free-80-stuck-986626", "3d-cluster-wimpern-schwarz-flauschig-weich-616600", True),
    # Gegenproben: kein Set, Set bleibt Set, Bestandteil im Ziel, Wortteil, Marke/Endung
    ("matterhorn-sunset-reflection-art-print-premium-semi-glossy-paper-poster-13x18-cm-5x7",
     "schweiz-poster-matterhorn-sonnenuntergang-kunstdruck", False),
    ("le-creuset-herztopf-aus-gusseisen-591872", "herztopf-aus-emailliertem-gusseisen-591872", False),
    ("bluetooth-headset-mit-mikrofon", "bluetooth-kopfhorer-mit-mikrofon", False),
    ("Tischset aus Bambus", "Platzdeckchen aus Bambus", False),
    ("Kosmetik-Set 5-teilig", "Schminkpinsel-Set 12 Stück", False),
    ("Geschenkset Duftkerzen", "Duftkerzen Geschenkbox 3er-Set", False),
    ("Geschenkset Duftkerzen", "Duftkerze Vanille", True),
    ("2er-Set Kissenbezüge", "Kissenbezug Leinen", True),
    ("Aroma-Diffuser mit Fernbedienung", "Aroma-Diffuser 300 ml mit Fernbedienung und LED", False),
    ("Hundebett mit Kissen", "Hundebett Kissenbezug waschbar", False),
    ("Rucksack mit USB-Anschluss", "Rucksack Laptopfach wasserdicht", True),
    ("Kabelbinder 100 Stück", "Kabelbinder-Set 200 Stk", False),
    ("Smartwatch Pro AMOLED", "Smartwatch Pro AMOLED schwarz", False),
    ("Korsett Spitze schwarz", "Mieder Spitze schwarz", False),
]


def selbsttest(leise=False):
    f = 0
    zusatz = [  # (Ergebnis, Soll, Name)
        (fehlt("Smartwatch mit EKG und Blutdruck", "Smartwatch mit Herzfrequenz", mit_pruefen=False), [],
         "Umbenennung: «mit X» wird nicht geprüft"),
        (fehlt("wear-armor-nagel-patch-set-928064", "lange-press-on-nagel-mit-gold-928064", mit_pruefen=False), ["Set"],
         "Umbenennung: Set wird weiter geprüft"),
        (fehlt("Mini GPS Tracker mit Echtzeit-Ortung mini-gps-tracker-mit-echtzeit-ortung", "GPS Tracker Auto"),
         ["mit echtzeit ortung"], "«mit X» aus Titel und Handle nur einmal"),
        (set_auf_menge("nagel-kabelschellen-obo-bettermann-set", "Kabelbinder-Halterungen für Wandmontage · 100 Stück"), True,
         "Set → Ziel mit Stückzahl = Kontrolle"),
        (set_auf_menge("110-teiliges Magnet-Bausteine-Set", "Magnetische DIY-Bausteine für Kinder, 110–142 Teile"), True,
         "Set → 110–142 Teile = Kontrolle"),
        (set_auf_menge("Sonnenbrillen-Set", "Retro polarisierte Sonnenbrille"), False, "Set → Einzelteil ist keine Kontrolle"),
    ]
    for ist, soll, name in zusatz:
        ok = ist == soll
        f += not ok
        if not leise or not ok:
            print(f"  {'✓' if ok else '✗'} {name} → {ist}")
    for q, z, soll in KANARIEN:
        ist = fehlt(q, z)
        ok = bool(ist) == soll
        f += not ok
        if not leise or not ok:
            print(f"  {'✓' if ok else '✗'} {q[:48]:50} → {z[:40]:42} {ist}")
    if not leise or f:
        print(f"BESTANDTEIL-SELBSTTEST {'OK' if not f else f'{f} FEHLER'} ({len(KANARIEN)} Kanarien, davon 10 Richter-Fälle, "
              f"+ {len(zusatz)} Zusatzprüfungen)")
    return f == 0


if __name__ == "__main__":
    sys.exit(0 if selbsttest() else 1)
