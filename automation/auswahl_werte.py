#!/usr/bin/env python3
"""auswahl_werte.py — CJ-Variantenschlüssel → deutsche Shop-Optionen (08.10.2026).

ANLASS: Betreiber 08.10. «rot oder pink auswahl, checke das auch bei anderen produkten» — «ja fix das alles sehr sauber
ganze katalog». Gemessen: 5'511 aktive Produkte versprechen im Text eine Auswahl und haben EINE Shop-Variante; bei CJ
führen ~94 % davon mehrere Varianten. `auswahl_nachruesten.py` (24.09.) kannte nur EINE Option aus festem Wortschatz
(Farbe / Grösse / Code / Nagelform) — an 120 gecachten CJ-Antworten lösten sich damit 48 auf. Der Rest trägt
zwei Dimensionen im Schlüssel («White-70cm», «Green-L», «Red-EU»), Stecker-Varianten, Masse, Motivnamen.

Was hier entschieden wird (rein, ohne Netz — testbar mit `--selbsttest`):
  1. STECKER: Teil «EU/UK/US/Europlug/American Standard Plug …» → nur die EU-Varianten bleiben, die Dimension fällt weg
     (Schweizer Steckdosen nehmen den Eurostecker; Hausregel seit #1018). Kein EU-Teil → kein Umbau.
  2. ZERLEGEN am Bindestrich, wenn ALLE Schlüssel gleich viele Teile haben; konstante Teile fallen weg.
  3. JEDE Dimension wird übersetzt — nur wenn JEDER Wert belegt ist: Farben (Hauslexika farbe_deutsch, phrase_de,
     farblexikon), Buchstabengrössen, Masse/Mengen (Einheit bleibt, Zahl bleibt), Lieferantencodes und Zählwerte
     («Style 3», «No.1 color») → «Modell N» wie im Importer, Nagel-Wortschatz → «Ausführung».
     Ein-Teil-Werte mit Farbe UND Grössenwort («Black Large», «Small Pink») werden in zwei Dimensionen getrennt.
  4. Was danach offen ist, geht als EINE Anfrage an ein Sprachmodell (`uebersetze_ki`) — mit harter Prüfung:
     gleiche Anzahl, eindeutig, ≤ 32 Zeichen, jede Zahl bleibt, jede Farbe des Originals steht übersetzt drin,
     kein englisches Restwort. Ergebnisse liegen in `dropship/_auswahl_uebersetzt.jsonl` (nachlesbar, kein zweiter Aufruf).

plane_optionen(varianten, titel, ki=None) → (plan, None) | (None, grund)
  plan = {"optionen": [(name, [werte…]), …], "zeilen": [(variante, (wert1, …)), …], "stecker_gefiltert": n,
          "ki": bool}
"""
import json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from cj_stecker_eu_varianten import farbe_deutsch          # noqa: E402
import farblexikon                                          # noqa: E402
try:                                                        # öffnet beim Import /tmp/cj_shop_token.txt
    from farbwerte_zusammengesetzt import phrase_de         # noqa: E402
except Exception:                                           # pragma: no cover
    def phrase_de(_):
        return None

TOK = re.compile(r"[\s_\-]+")
GR = r"(?:X{0,3}S|M|X{0,3}L)"
GR_VOLL = re.compile(r"^(?:XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|[2-7]XL|0XL)$", re.I)
CODE = re.compile(r"^[A-Za-z]{0,5}\d{1,4}[A-Za-z]?$")
EINHEIT = re.compile(r"\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|cm|mm|m|pcs?|pack|stk|w|v)$", re.I)
NUR_MODIFIKATOR = {"dark", "light", "deep", "bright", "pale"}

# ── Farben ──────────────────────────────────────────────────────────────────────────────────────────────────────
FARBE_EXTRA = {"camouflage": "Tarnmuster", "camo": "Tarnmuster", "leopard": "Leopard", "rainbow": "Regenbogen",
               "colorful": "Bunt", "colourful": "Bunt", "multicolor": "Bunt", "multi color": "Bunt", "mixed color": "Bunt",
               "wood color": "Holzfarben", "wooden color": "Holzfarben", "log color": "Holzfarben", "natural": "Natur",
               "clear": "Transparent", "transparent": "Transparent", "military green": "Olivgrün", "royal blue": "Königsblau",
               "gun black": "Anthrazit", "gunmetal": "Anthrazit", "rose gold": "Roségold", "room gold": "Roségold",
               "rose golden": "Roségold", "golden": "Gold", "silvery": "Silber", "light coffee": "Hellbraun",
               "dark coffee": "Dunkelbraun", "wathet": "Hellblau", "wathet blue": "Hellblau", "sapphire blue": "Saphirblau", "fluorescent green": "Neongrün",
               "fluorescent yellow": "Neongelb", "fluorescent pink": "Neonpink", "army color": "Olivgrün"}
_STAMM = tuple(farblexikon.BASIS) + tuple(farblexikon.DE_SOLO) + ("tarnmuster", "leopard", "regenbogen", "holzfarben",
                                                                   "natur", "neon", "camel", "bunt")


def _ist_farbwort_de(x):
    xl = (x or "").lower()
    return any(xl.endswith(s) or xl == s for s in _STAMM) or "-" in xl and all(_ist_farbwort_de(t) for t in xl.split("-"))


def farbe(wert):
    """Deutsche Farbe für einen GANZEN Wert — sonst None. Ein reiner Modifikator («Dark») ist keine Farbe."""
    w = re.sub(r"\s+", " ", (wert or "").strip())
    toks = [t.lower() for t in TOK.split(w) if t]
    if not toks or all(t in NUR_MODIFIKATOR for t in toks):
        return None
    k = w.lower()
    if k in FARBE_EXTRA:
        return FARBE_EXTRA[k]
    if " " in k and k in farblexikon.EN2DE and "/" not in farblexikon.EN2DE[k]:
        return farblexikon.EN2DE[k]           # «Navy Blue» → «Marineblau» (farbe_deutsch: «Marine-Blau»)
    for f in (farbe_deutsch, phrase_de):
        try:
            r = f(w)
        except Exception:
            r = None
        if r and _ist_farbwort_de(r):          # phrase_de macht aus «Army Color» «Armee» — das ist keine Farbe
            return r
    r = farblexikon.farbe_von(w)
    if r:
        t = r.split("/")
        # «Saphirblau/Blau» = fein/grob (für Google) → fein; «Silber/Schwarz» = zwei Farben → «Silber-Schwarz»
        r = t[0] if len(t) == 2 and t[0].lower().endswith(t[1].lower()) else "-".join(t)
        # farbe_von trennt Grössen/Masse ab — hier unerwünscht («Black L» ist keine Farbe), also nur ohne solche Reste
        if not any(farblexikon.GROESSE.match(t) or farblexikon.MASS.match(t) for t in farblexikon.TRENNER.split(w) if t):
            return r
    return None


# ── Grössen (Buchstaben + Wörter) ───────────────────────────────────────────────────────────────────────────────
GROESSENWORT_DE = {"small": "Klein", "medium": "Mittel", "middle": "Mittel", "large": "Gross", "big": "Gross",
                   "mini": "Mini", "extra large": "Sehr gross", "extra small": "Sehr klein", "plus": "Übergrösse",
                   "one size": "Einheitsgrösse", "free size": "Einheitsgrösse", "average size": "Einheitsgrösse",
                   "onesize": "Einheitsgrösse", "freesize": "Einheitsgrösse"}
GROESSE_FUELL = {"size", "sized", "sizes", "code", "yards"}


def groesse(wert):
    """«XL»/«2xl» → «XL»/«2XL»; «Large Size»/«large size»/«Small» → «Gross»/«Klein»; sonst None."""
    w = (wert or "").strip()
    if GR_VOLL.match(w):
        u = w.upper()
        return {"XXXXL": "4XL", "0XL": "XL"}.get(u, u)
    toks = [t.lower() for t in TOK.split(w) if t]
    kern = [t for t in toks if t not in GROESSE_FUELL]
    if not kern:
        return None
    k = " ".join(kern)
    if k in GROESSENWORT_DE:
        return GROESSENWORT_DE[k]
    if len(kern) == 1 and GR_VOLL.match(kern[0]):
        return groesse(kern[0])
    return None


# ── Masse und Mengen ────────────────────────────────────────────────────────────────────────────────────────────
EINHEIT_DE = {"cm": ("cm", "Grösse"), "mm": ("mm", "Grösse"), "m": ("m", "Länge"), "inch": ("Zoll", "Grösse"),
              "inches": ("Zoll", "Grösse"), "in": ("Zoll", "Grösse"), "\"": ("Zoll", "Grösse"), "zoll": ("Zoll", "Grösse"),
              "l": ("L", "Volumen"), "ml": ("ml", "Volumen"), "g": ("g", "Gewicht"), "kg": ("kg", "Gewicht"),
              "w": ("W", "Leistung"), "mah": ("mAh", "Akku"), "v": ("V", "Spannung"), "gb": ("GB", "Speicher"),
              "tb": ("TB", "Speicher"), "pcs": ("Stück", "Menge"), "pc": ("Stück", "Menge"), "pieces": ("Stück", "Menge"),
              "piece": ("Stück", "Menge"), "stück": ("Stück", "Menge"), "sets": ("Sets", "Menge"), "set": ("Set", "Menge"),
              "pairs": ("Paar", "Menge"), "pair": ("Paar", "Menge"), "pack": ("er-Pack", "Menge"), "packs": ("er-Pack", "Menge"),
              "yards": ("", "Grösse"), "yard": ("", "Grösse"), "m²": ("m²", "Grösse"), "box": ("Box", "Menge"),
              "boxes": ("Boxen", "Menge"), "bottle": ("Flasche", "Menge"), "bottles": ("Flaschen", "Menge"),
              "roll": ("Rolle", "Menge"), "rolls": ("Rollen", "Menge"), "bag": ("Beutel", "Menge"), "bags": ("Beutel", "Menge"),
              "key": ("Tasten", "Tastenzahl"), "keys": ("Tasten", "Tastenzahl")}
_Z = r"\d+(?:[.,]\d+)?"
_E = r"(?:cm|mm|m|inch(?:es)?|in|\"|zoll|l|ml|g|kg|w|mah|v|gb|tb|pcs|pc|pieces?|stück|sets?|pairs?|packs?|yards?|m²|box(?:es)?|bottles?|rolls?|bags?|keys?)"
MASS_EINZEL = re.compile(rf"^({_Z})\s*({_E})?$", re.I)
MASS_SPANNE = re.compile(rf"^(?:below\s+|under\s+|up\s+to\s+)?({_Z})\s*(?:to|or|~|–|/)\s*({_Z})\s*({_E})$", re.I)
MASS_BIS = re.compile(rf"^(?:below|under|up\s+to|within)\s+({_Z})\s*({_E})$", re.I)
MASS_FLAECHE = re.compile(rf"^({_Z})\s*({_E})?\s*[x×*]\s*({_Z})\s*({_E})?(?:\s*[x×*]\s*({_Z})\s*({_E})?)?$", re.I)


def _zahl(z):
    return z.replace(",", ".")


def mass(wert):
    """→ (text, dimname) oder None. Die Zahl wird nie verändert, nur die Einheit eingedeutscht."""
    w = re.sub(r"\s+", " ", (wert or "").strip())
    m = MASS_FLAECHE.match(w)
    if m:
        einheiten = {x.lower() for x in (m.group(2), m.group(4), m.group(6)) if x}
        if len(einheiten) > 1:
            return None
        e = EINHEIT_DE.get(einheiten.pop(), ("", ""))[0] if einheiten else ""
        z = "×".join(_zahl(x) for x in (m.group(1), m.group(3), m.group(5)) if x)
        return (f"{z} {e}".strip(), "Grösse")
    m = MASS_SPANNE.match(w)
    if m:
        e, name = EINHEIT_DE[m.group(3).lower()]
        return (f"{_zahl(m.group(1))}–{_zahl(m.group(2))} {e}".strip(), name)
    m = MASS_BIS.match(w)
    if m:
        e, name = EINHEIT_DE[m.group(2).lower()]
        return (f"bis {_zahl(m.group(1))} {e}".strip(), name)
    m = MASS_EINZEL.match(w)
    if m and m.group(2):
        einheit = m.group(2).lower()
        e, name = EINHEIT_DE[einheit]
        if einheit in ("yards", "yard"):
            return (f"Gr. {_zahl(m.group(1))}", "Grösse")
        if e == "er-Pack":
            return (f"{_zahl(m.group(1))}er-Pack", name)
        if e in ("Box", "Flasche", "Rolle") and m.group(1) not in ("1", "1.0"):
            e = {"Box": "Boxen", "Flasche": "Flaschen", "Rolle": "Rollen"}[e]
        return (f"{_zahl(m.group(1))} {e}".strip(), name)
    return None


# ── Zählwerte und Lieferantencodes → «Modell N» (wie cj_category_fill.mjs, 14.08.) ─────────────────────────────────
ZAEHL = re.compile(r"^(?:(?:no\.?|nr\.?|number|colou?r|style|models?|figure|patterns?|design|type|set|option|version|picture|photo|#)"
                   r"\s*[-. ]?\s*(\d{1,6}|[A-H])|(\d{1,6}|[A-H])\s*[-. ]?\s*(?:style|models?|figure|colou?r|patterns?|design|type|sets?))"
                   r"(?:\s*colou?r)?$", re.I)
CODE_IMP = re.compile(r"^[A-Za-z][A-Za-z0-9]{2,17}$")


def ist_code(v):
    t = (v or "").strip()
    return (bool(CODE_IMP.match(t)) and len(re.findall(r"\d", t)) >= 2
            and not re.search(r"(gb|tb|mb|mah|ma|mm|cm|ml|kg|pcs|pc|pack|ports|inch|yards?|style|model|color|size|no)", t, re.I)
            and not re.search(r"(black|white|red|blue|green|yellow|grey|gray|pink|purple|brown|beige|gold|silver|orange|navy|khaki)", t, re.I))


def ist_zaehl(v):
    return bool(ZAEHL.match((v or "").strip()))


# ── Nagel-/Formwortschatz (24.09.) ──────────────────────────────────────────────────────────────────────────────
FORM = {"short": "Kurz", "long": "Lang", "square": "Eckig", "almond": "Mandel", "oval": "Oval", "ellipse": "Oval",
        "prolate": "Länglich", "round": "Rund", "coffin": "Ballerina", "ballerina": "Ballerina", "stiletto": "Stiletto"}
OBERFL = {"frosted": "matt", "matte": "matt", "matt": "matt", "glossy": "glänzend", "shiny": "glänzend", "transparent": "transparent"}
FUELL_W = {"surface", "size", "and", "&"}
GROESSENWORT = {"small": "S", "medium": "M", "large": "L"}   # nur weg, wenn es den Buchstaben daneben bestätigt


def ausfuehrung(wert):
    """«Short Ellipse XS» → «Kurz Oval · XS»; None, sobald ein Token nicht im Wortschatz steht."""
    toks = [t for t in TOK.split((wert or "").strip()) if t]
    tl = [t.lower() for t in toks]
    groesse_ = [t.upper() for t in toks if re.fullmatch(GR, t.upper())]
    if len(groesse_) > 1:
        return None
    g = groesse_[0] if groesse_ else None
    teile, i = [], 0
    while i < len(tl):
        t = tl[i]
        if re.fullmatch(GR, t.upper()):
            i += 1; continue
        if t == "extra" and i + 1 < len(tl) and tl[i + 1] == "long":
            teile.append("Extralang"); i += 2; continue
        if t == "extra" and i + 1 < len(tl) and tl[i + 1] in ("small", "large") and g in ("XS", "XL"):
            i += 2; continue
        if t in GROESSENWORT:
            if g and GROESSENWORT[t] == g:
                i += 1; continue
            if t == "medium":
                teile.append("Mittel"); i += 1; continue
            return None
        if t in FUELL_W:
            i += 1; continue
        if re.fullmatch(r"\d{1,3}mm", t):
            teile.append(t); i += 1; continue
        if t in FORM:
            teile.append(FORM[t]); i += 1; continue
        if t in OBERFL:
            teile.append(OBERFL[t]); i += 1; continue
        if t in NUR_MODIFIKATOR and i + 1 < len(tl):
            f = farbe(f"{toks[i]} {toks[i + 1]}")
            if f:
                teile.append(f); i += 2; continue
        f = farbe(toks[i])
        if f:
            teile.append(f); i += 1; continue
        return None
    if not teile:
        return g
    return " ".join(teile) + (f" · {g}" if g else "")


# ── Stecker ─────────────────────────────────────────────────────────────────────────────────────────────────────
STECKER_TEIL = re.compile(r"^(?:(?:EU|US|UK|AU|JP|KR|CN|BR|IN|AR|ZA)(?:\s*-?\s*(?:plug|standard|regulation|regulatory|gauge))?"
                          r"|euro\s*plug|europlug|european(?:\s+standard)?(?:\s+plug)?|eu\s+standard(?:\s+plug)?"
                          r"|(?:american|british|australian|european|uk|us|au|eu|japanese|korean|chinese)\s+"
                          r"(?:standard|regulatory|regulation|gauge|regular|rule|specification)?\s*plug"
                          r"|(?:american|british|australian|european)\s+(?:standard|regulation|regulatory|gauge)"
                          r"|(?:us|uk|au|eu)\s*plug)$", re.I)
STECKER_EU = re.compile(r"^(?:eu|euro\s*plug|europlug|european.*|eu\s*(?:-?\s*)?(?:plug|standard|regulation|gauge).*)$", re.I)


STECKER_WORT = re.compile(r"(?<![\w])(?:(?:european|american|british|australian|japanese|korean)\s+(?:standard|regulatory|regulation"
                          r"|gauge|rule|specification)(?:\s+plug)?|(?:eu|us|uk|au)(?:\s*-?\s*(?:plug|standard|regulation|gauge))?"
                          r"|euro\s*plug|europlug)(?![\w])", re.I)


def stecker_im_wort(vs, keys):
    """Stecker als Wortgruppe INNERHALB eines Teils: jeder Schlüssel genau eine Fundstelle → EU-Varianten, Fundstelle weg."""
    treffer = [STECKER_WORT.findall(k) for k in keys]
    if not all(len(t) == 1 for t in treffer):
        return vs, keys, 0
    nv, nk = [], []
    for v, k, t in zip(vs, keys, treffer):
        if STECKER_EU.match(t[0].strip()):
            rest = re.sub(r"\s+", " ", STECKER_WORT.sub(" ", k, count=1)).strip(" -")
            nv.append(v); nk.append(rest or "EU")
    if not nv:
        return None, None, "kein EU-Stecker bei CJ"
    return nv, nk, len(vs) - len(nv)


def stecker_filtern(vs, keys):
    """Teilt jeden Schlüssel am Bindestrich; trägt JEDER genau einen Stecker-Teil, bleiben nur EU-Varianten.
    → (vs, keys, n_gefiltert) | (None, None, grund) | unverändert, wenn kein Stecker-Teil vorkommt."""
    teile = [[t.strip() for t in (k or "").split("-")] for k in keys]
    hat = [[i for i, t in enumerate(ts) if STECKER_TEIL.match(t)] for ts in teile]
    if not any(hat):
        return vs, keys, 0
    if not all(len(h) == 1 for h in hat):
        return None, None, "Stecker-Teil nicht in jedem Schlüssel genau einmal"
    nv, nk = [], []
    for v, ts, h in zip(vs, teile, hat):
        if STECKER_EU.match(ts[h[0]]):
            rest = [t for i, t in enumerate(ts) if i != h[0]]
            nv.append(v); nk.append("-".join(rest) if rest else "EU")
    if not nv:
        return None, None, "kein EU-Stecker bei CJ"
    return nv, nk, len(vs) - len(nv)


# ── Zerlegen + Dimensionen übersetzen ───────────────────────────────────────────────────────────────────────────
def zerlege(keys):
    """Liste von Teil-Tupeln. Gleich viele Bindestrich-Teile in ALLEN Schlüsseln → je Teil eine Dimension, sonst EINE.
    «Type-C»/«T-Shirt» in nur einem Schlüssel verschiebt die Zählung → dann ganzer Schlüssel = eine Dimension."""
    teile = [[t.strip() for t in (k or "").split("-")] for k in keys]
    n = {len(ts) for ts in teile}
    if len(n) == 1 and all(all(ts) for ts in teile):
        return [tuple(ts) for ts in teile]
    return [((k or "").strip(),) for k in keys]


def _gemeinsam_kuerzen(werte, vorne=True, hinten_=True):
    """Gleiche Vorder-/Hinterwörter aller Werte weg («Chenille No.1 color-…» → «No.1 color»). Wörter, nicht Zeichen.
    Drei Formen (beide Seiten / nur vorn / nur hinten): «8901 Dark Brown» / «8901 Light Brown» braucht NUR vorn —
    beidseitig blieben «Dark»/«Light» ohne Grundfarbe übrig."""
    toks = [[t for t in re.split(r"\s+", w.strip()) if t] for w in werte]
    vorn = 0
    while vorne and all(len(ts) > vorn + 1 for ts in toks) and len({ts[vorn].lower() for ts in toks}) == 1:
        vorn += 1
    hinten = 0
    while hinten_ and all(len(ts) > vorn + hinten + 1 for ts in toks) and len({ts[-1 - hinten].lower() for ts in toks}) == 1:
        hinten += 1
    return [" ".join(ts[vorn:len(ts) - hinten]) for ts in toks]


def _eindeutig(xs):
    return len({x.lower() for x in xs}) == len(xs) and all(xs)


def dim_de(werte, titel=""):
    """Distinkte Werte EINER Dimension → (name, [übersetzt]) | None. Reihenfolge bleibt."""
    formen = []
    for k in (list(werte), _gemeinsam_kuerzen(werte), _gemeinsam_kuerzen(werte, hinten_=False),
              _gemeinsam_kuerzen(werte, vorne=False)):
        if k not in formen:
            formen.append(k)
    for nr, kandidat in enumerate(formen):
        # Nach dem Kürzen nur noch Zahlen («104 key» → «104»): das weggekürzte Wort trug die Bedeutung — keine «Modell N»
        nur_zahl_gekuerzt = nr > 0 and all(re.fullmatch(r"\d+(?:[.,]\d+)?", w) for w in kandidat)
        f = [farbe(w) for w in kandidat]
        if all(f) and _eindeutig(f):
            return "Farbe", f
        g = [groesse(w) for w in kandidat]
        if all(g) and _eindeutig(g):
            return "Grösse", g
        m = [mass(w) for w in kandidat]
        if all(m) and _eindeutig([x[0] for x in m]):
            namen = {x[1] for x in m}
            return (namen.pop() if len(namen) == 1 else "Grösse"), [x[0] for x in m]
        # reine Zahlen: Konfektions-/Schuhgrösse (EU 16–60) oder Körpergrösse (80–190), Ringgrösse bei «Ring»
        if all(re.fullmatch(r"\d{1,3}(?:[.,]5)?", w) for w in kandidat) and _eindeutig(kandidat):
            zs = [float(w.replace(",", ".")) for w in kandidat]
            if all(16 <= z <= 60 for z in zs) or all(80 <= z <= 190 for z in zs) or (
                    re.search(r"\bring", titel, re.I) and all(3 <= z <= 14 for z in zs)):
                return "Grösse", [w.replace(",", ".") for w in kandidat]
        if nur_zahl_gekuerzt:
            continue
        if all(ist_zaehl(w) for w in kandidat) and _eindeutig(kandidat):
            buchst = [ZAEHL.match(w.strip()) for w in kandidat]
            if all(re.fullmatch(r"[A-H]", (b.group(1) or b.group(2) or "")) for b in buchst):
                return "Typ", [f"Typ {(b.group(1) or b.group(2)).upper()}" for b in buchst]
            return "Modell", [f"Modell {i + 1}" for i in range(len(kandidat))]
        if all(re.fullmatch(r"[A-Ha-h]", w) for w in kandidat) and _eindeutig(kandidat):
            return "Typ", [f"Typ {w.upper()}" for w in kandidat]
        if sum(ist_code(w) for w in kandidat) >= 2 and all(ist_code(w) or groesse(w) for w in kandidat) and _eindeutig(kandidat):
            return "Modell", [f"Modell {i + 1}" for i in range(len(kandidat))]
        if all(CODE.match(w.replace(" ", "")) and not EINHEIT.search(w) for w in kandidat) and _eindeutig(kandidat) \
                and any(re.search(r"\d", w) for w in kandidat):
            return "Modell", [f"Modell {i + 1}" for i in range(len(kandidat))]
        a = [ausfuehrung(w) for w in kandidat]
        if all(a) and _eindeutig(a):
            if all(GR_VOLL.match(x) for x in a):
                return "Grösse", a
            return "Ausführung", a
    return None


GROESSEN_TOKEN = {"small", "medium", "middle", "large", "big", "mini", "plus", "size", "sized", "extra"}


def farbe_groesse_trennen(werte):
    """Ein-Teil-Werte «Black Large», «Small Size Black», «Navy Blue Small», «Blue S», «Black 15inches», «Orange 56mm»
    → ([(Farbe, Grösse)], dimname) | None. Grösse = Grössenwort/-kürzel ODER genau ein Mass-Token."""
    out, namen = [], set()
    for w in werte:
        toks = [t for t in re.split(r"\s+", w.strip()) if t]
        gtoks = [t for t in toks if t.lower() in GROESSEN_TOKEN or GR_VOLL.match(t)]
        mtoks = [t for t in toks if mass(t)]
        if gtoks and not mtoks:
            ftoks = [t for t in toks if t not in gtoks]
            g, name = groesse(" ".join(gtoks)), "Grösse"
        elif len(mtoks) == 1 and not gtoks:
            ftoks = [t for t in toks if t not in mtoks]
            g, name = mass(mtoks[0])
        else:
            return None
        f = farbe(" ".join(ftoks)) if ftoks else None
        if not f or not g:
            return None
        out.append((f, g)); namen.add(name)
    return (out, namen.pop() if len(namen) == 1 else "Grösse")


_GR_FOLGE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL", "6XL", "7XL"]
_WORT_FOLGE = ["Mini", "Sehr klein", "Klein", "Mittel", "Gross", "Sehr gross", "Übergrösse"]


def groessen_rang(w):
    """Sortierschlüssel: (Art, Wert). Art 9 = unbekannt (dann wird nicht umsortiert)."""
    t = (w or "").strip()
    if t.upper() in _GR_FOLGE:
        return (0, {"XXL": 6.5, "XXXL": 8.5}.get(t.upper(), _GR_FOLGE.index(t.upper())))
    if t in _WORT_FOLGE:
        return (1, _WORT_FOLGE.index(t))
    m = re.match(r"^(?:Gr\. )?(\d+(?:\.\d+)?)", t)
    if m:
        return (2, float(m.group(1)))
    return (9, 0)


OPTION_NAMEN = ("Farbe", "Grösse", "Ausführung", "Modell", "Typ", "Motiv", "Variante", "Volumen", "Länge", "Menge",
                "Gewicht", "Leistung", "Akku", "Spannung", "Speicher", "Material", "Muster", "Stil")
KI_NAMEN = {"Farbe", "Grösse", "Ausführung", "Modell", "Typ", "Motiv", "Variante", "Volumen", "Länge", "Menge", "Material",
            "Muster", "Stil", "Form", "Set"}


def plane_optionen(vs, titel="", ki=None):
    """vs = CJ-Varianten (dicts mit variantKey). ki(titel, [[werte…], …]) → [(name, [werte…]) | None, …] oder None."""
    keys = [(v.get("variantKey") or "").strip() for v in vs]
    if not all(keys):
        return None, "CJ-Variante ohne variantKey"
    vs2, keys2, n_st = stecker_filtern(vs, keys)
    if vs2 is None:
        return None, n_st
    if not n_st:
        vs2, keys2, n_st = stecker_im_wort(vs2, keys2)
        if vs2 is None:
            return None, n_st
    if len(vs2) < 2:
        return {"optionen": [], "zeilen": [(vs2[0], ())], "stecker_gefiltert": n_st, "ki": False}, None
    tup = zerlege(keys2)
    ndim = len(tup[0])
    dims = [[t[i] for t in tup] for i in range(ndim)]
    dims = [d for d in dims if len({x.lower() for x in d}) > 1]              # konstante Teile weg
    if not dims:
        return None, f"Schlüssel nach dem Kürzen nicht unterscheidbar: {keys2[:4]}"
    # Ein-Teil-Mischwerte «Black Large» → Farbe + Grösse
    if len(dims) == 1:
        distinct = list(dict.fromkeys(dims[0]))
        fg = farbe_groesse_trennen(distinct)
        if fg and len({a for a, _ in fg[0]}) > 1 and len({b for _, b in fg[0]}) > 1:
            m = dict(zip(distinct, fg[0]))
            dims = [[m[x][0] for x in dims[0]], [m[x][1] for x in dims[0]]]
            # schon deutsch → als «fertige» Dimensionen markieren
            return _zusammensetzen(vs2, dims, [("Farbe", None), (fg[1], None)], n_st, titel, ki)
    return _zusammensetzen(vs2, dims, [None] * len(dims), n_st, titel, ki)


def _zusammensetzen(vs, dims, fertig, n_st, titel, ki):
    if len(dims) > 3:
        return None, f"{len(dims)} Dimensionen — Shopify erlaubt drei"
    namen, abb, offen, ki_benutzt = [None] * len(dims), [None] * len(dims), [], False
    for i, d in enumerate(dims):
        distinct = list(dict.fromkeys(d))
        if fertig[i]:
            namen[i] = fertig[i][0]; abb[i] = {x: x for x in distinct}; continue
        r = dim_de(distinct, titel)
        if r:
            namen[i] = r[0]; abb[i] = dict(zip(distinct, r[1]))
        else:
            offen.append(i)
    if offen:
        if ki is None:
            return None, "Werte nicht im Wortschatz: " + " | ".join(str(list(dict.fromkeys(dims[i]))[:4]) for i in offen)
        antwort = ki(titel, [list(dict.fromkeys(dims[i])) for i in offen])
        if not antwort or len(antwort) != len(offen) or any(a is None for a in antwort):
            return None, "KI-Übersetzung fehlt/abgelehnt: " + " | ".join(str(list(dict.fromkeys(dims[i]))[:4]) for i in offen)
        for i, (name, werte) in zip(offen, antwort):
            distinct = list(dict.fromkeys(dims[i]))
            namen[i] = name; abb[i] = dict(zip(distinct, werte))
        ki_benutzt = True
    # Optionsnamen eindeutig machen (zwei «Farbe»-Dimensionen: die zweite heisst «Ausführung», dann «Variante»)
    gesehen = set()
    for i, n in enumerate(namen):
        if n in gesehen:
            for alt in ("Ausführung", "Variante", "Modell", "Typ"):
                if alt not in gesehen and alt not in namen[i + 1:]:
                    namen[i] = alt; break
            else:
                return None, f"Optionsnamen nicht eindeutig: {namen}"
        gesehen.add(namen[i])
    zeilen = []
    for j, v in enumerate(vs):
        zeilen.append((v, tuple(abb[i][dims[i][j]] for i in range(len(dims)))))
    if len({z[1] for z in zeilen}) != len(zeilen):
        return None, "zwei CJ-Varianten ergäben dieselbe Auswahl"
    optionen = [(namen[i], list(dict.fromkeys(abb[i][x] for x in dims[i]))) for i in range(len(dims))]
    # Grössen in Grössenfolge (S, M, L statt CJ-Reihenfolge «L, XL, M») — aber nur, wenn die erste Kombination aller
    # Optionen bei CJ existiert: productOptionsCreate hängt die Ursprungsvariante an die erste Kombination (08.10.2026).
    neu = [(n, sorted(ws, key=groessen_rang) if n == "Grösse" and all(groessen_rang(w)[0] < 9 for w in ws) else ws)
           for n, ws in optionen]
    if neu != optionen and tuple(ws[0] for _, ws in neu) in {z[1] for z in zeilen}:
        optionen = neu
    elif neu != optionen:
        # erste Kombination fehlt bei CJ → die Grösse der ersten CJ-Variante bleibt vorn, der Rest geordnet (die ersten
        # Werte der übrigen Optionen sind ohnehin die der ersten CJ-Variante — dict.fromkeys in Zeilenfolge)
        erste, alt = zeilen[0][1], optionen
        optionen = []
        for i, (n, ws) in enumerate(alt):
            if n == "Grösse" and all(groessen_rang(w)[0] < 9 for w in ws):
                ws = [erste[i]] + sorted([w for w in ws if w != erste[i]], key=groessen_rang)
            optionen.append((n, ws))
        if tuple(ws[0] for _, ws in optionen) not in {z[1] for z in zeilen}:
            optionen = alt
    for n, ws in optionen:
        if not _eindeutig(ws) or any(len(w) > 40 for w in ws):
            return None, f"Werte der Option {n} nicht eindeutig/zu lang: {ws[:4]}"
    return {"optionen": optionen, "zeilen": zeilen, "stecker_gefiltert": n_st, "ki": ki_benutzt}, None


# ── Sprachmodell (nur für Reste) ────────────────────────────────────────────────────────────────────────────────
KI_LEDGER = os.path.join(os.path.dirname(HIER), "dropship", "_auswahl_uebersetzt.jsonl")
EN_REST = re.compile(r"\b(?:with|without|and|or|size|sized|colou?r|style|pcs|pieces?|black|white|red|blue|green|yellow|grey|gray"
                     r"|purple|brown|silver|golden|light|dark|deep|small|large|big|single|double|package|bag|cover|edition"
                     r"|upgraded|classic|fashion|sports?|plug|cushion|seat|pillow|core|basket|pendant|no|type|set of)\b",
                     re.I)
CJK = re.compile(r"[぀-ヿ㐀-鿿가-힯]")


def _zahlen(s):
    return sorted(re.sub(r"[.,]0+$", "", z.replace(",", ".")) for z in re.findall(r"\d+(?:[.,]\d+)?", s or ""))


def _mal(s):
    return len(re.findall(r"\d\s*[x×*]\s*\d", s or "", re.I))


def _bereich(s):
    return bool(re.search(r"\d\s*(?:to|~|–|bis)\s*\d|\d\s*(?:to|~)\s*\d", s or "", re.I))


def normalisiere_ki(name, werte):
    """Sonderzeichen-Bindestriche (U+2010–2015) → «-», «Grosse» → «Grösse» (das Modell schreibt ss auch im Namen)."""
    name = {"Grosse": "Grösse", "Groesse": "Grösse", "Size": "Grösse", "Color": "Farbe"}.get(name, name)
    werte = [re.sub(r"[\u2010\u2011\u2012\u2013\u2014\u2015](?=\S)", "-", str(w)).strip() for w in werte]
    werte = [re.sub(r"(\d)-(\d)", r"\1–\2", w) for w in werte]          # Zahlenbereich mit Halbgeviertstrich
    werte = [w.replace("ß", "ss") for w in werte]                          # Schweizer Schreibweise
    werte = [re.sub(r"\s*·\s*", " · ", w) for w in werte]                   # «Hase·Lila» → «Hase · Lila»
    werte = [re.sub(r"(\d)\s*(cm|mm|ml|kg)\b", lambda m: f"{m.group(1)} {m.group(2).lower()}", w, flags=re.I) for w in werte]
    return name, werte


def pruefe_ki(original, name, werte):
    """Harte Prüfung einer KI-Übersetzung → None (gut) oder Grund."""
    if name not in KI_NAMEN:
        return f"Optionsname {name!r} nicht erlaubt"
    if not isinstance(werte, list) or len(werte) != len(original):
        return "Anzahl stimmt nicht"
    if not _eindeutig([str(w).strip() for w in werte]):
        return "Werte nicht eindeutig"
    for o, w in zip(original, werte):
        w = str(w).strip()
        if not w or len(w) > 32 or CJK.search(w) or "ß" in w:
            return f"Wert ungültig: {w!r}"
        if _zahlen(o) != _zahlen(w):
            return f"Zahl verändert: {o!r} → {w!r}"
        # «Width 45cm Height 130cm» → «45×130 cm» ist richtig (Masse benannt statt mit x) — sonst bleibt «×» wie es war
        if _mal(o) != _mal(w) and not (_mal(w) > _mal(o) and re.search(r"\b(?:width|height|length|depth|wide|high|long|"
                                                                    r"diameter|thick(?:ness)?)\b", o, re.I)):
            return f"Mass-«×» verändert: {o!r} → {w!r}"
        if _bereich(o) and not _bereich(w):
            return f"Bereich ging verloren: {o!r} → {w!r}"
        if EN_REST.search(w):
            return f"englisches Restwort: {w!r}"
        # wörtlich übernommene Originalwörter sind unübersetzt — ausser Kürzel (USB, LED), Codes und gleich geschriebene
        orig_w = {t.lower() for t in re.findall(r"[A-Za-zÄÖÜäöü']+", o)}
        for t in re.findall(r"[A-Za-zÄÖÜäöü']+", w):
            if len(t) >= 3 and t.lower() in orig_w and not t.isupper() and t.lower() not in GLEICH_DE:
                return f"englisches Restwort {t!r} in {w!r}"
        # jede Grundfarbe des Originals muss übersetzt drinstehen (Familie: «Purple» = Lila ODER Violett)
        for t in re.split(r"[\s\-/]+", o.lower()):
            fam = FAMILIE.get(t)
            if fam and not any(s in w.lower() for s in fam):
                return f"Farbe {t!r} fehlt in {w!r}"
    return None


# Wörter, die im Deutschen gleich geschrieben werden (dürfen aus dem Original übernommen werden)
GLEICH_DE = {"generation", "version", "edition", "khaki", "beige", "orange", "pink", "gold", "mini", "set", "oval", "transparent", "leopard", "camel", "nude",
             "bordeaux", "champagne", "lavendel", "magenta", "indigo", "taupe", "fuchsia", "bronze", "platin", "titan", "classic",
             "premium", "standard", "pro", "max", "plus", "basic", "deluxe", "sport", "auto", "baby", "kids", "cartoon",
             "panda", "koala", "dinosaur", "tiger", "zebra", "lama", "alpaka", "flamingo", "einhorn", "unicorn", "elefant",
             "rose", "lotus", "jasmin", "vanille", "kaktus", "kakadu", "pinguin", "delfin", "hamster", "film", "led", "usb",
             "hd", "rgb", "ring", "bluetooth", "wifi", "smart", "mix", "neon", "metall", "nylon", "polyester", "silikon",
             "upgrade", "highlight", "laser", "turbo", "mini", "power", "display", "touch", "spray", "gel",
             "velvet", "denim", "jeans", "leder", "holz", "bambus", "edelstahl", "kristall", "glitter", "satin", "rattan",
             "monster", "robot", "roboter", "astronaut", "safari", "comic", "emoji", "boho", "vintage", "retro"}

FAMILIE = {"black": ("schwarz", "anthrazit"), "white": ("weiss", "creme", "elfenbein"), "red": ("rot", "bordeaux"),
           "blue": ("blau", "marine", "türkis", "petrol"), "green": ("grün", "oliv", "mint", "petrol"), "yellow": ("gelb",),
           "grey": ("grau", "anthrazit", "silber"), "gray": ("grau", "anthrazit", "silber"), "pink": ("pink", "rosa"),
           "purple": ("lila", "violett", "purpur", "flieder"), "brown": ("braun", "kaffee", "camel", "mokka", "schoko"),
           "beige": ("beige", "creme", "sand"), "gold": ("gold",), "golden": ("gold",), "silver": ("silber",),
           "orange": ("orange",), "khaki": ("khaki",), "navy": ("marine", "blau")}


KI_VERSION = 3          # 08.10.2026 19:55: v1 liess «Bean paste → Bohnenpaste» und «90to140 → 90×140» durch → Zweitprüfer;
                        # v3 (20:15): ß → ss und «·»-Abstände normalisiert statt abgelehnt, «Upgrade»/«Pedal» sind deutsch


def _ki_ledger_lesen():
    d = {}
    try:
        for z in open(KI_LEDGER, encoding="utf-8"):
            r = json.loads(z)
            if r.get("v", 1) >= KI_VERSION:
                d[json.dumps(r["original"], ensure_ascii=False)] = r
    except FileNotFoundError:
        pass
    return d


PRUEFER_MODELL = os.environ.get("AUSWAHL_PRUEFER", "qwen/qwen3.8-27b")   # andere Modellfamilie als der Übersetzer


def _groq(modell, text):
    import time
    import urllib.request
    k = os.environ.get("GROQ_API_KEY", "")
    if not k:
        raise RuntimeError("GROQ_API_KEY fehlt")
    body = {"model": modell, "temperature": 0, "messages": [{"role": "user", "content": text}],
            "response_format": {"type": "json_object"}}
    letzter = ""
    for a in range(4):
        try:
            r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": "Bearer " + k,
                                                "User-Agent": "luxestyle-auswahl/1"})      # ohne User-Agent 403
            j = json.load(urllib.request.urlopen(r, timeout=120))
            inhalt = j["choices"][0]["message"]["content"]
            return json.loads(re.search(r"\{.*\}", inhalt, re.S).group(0))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
            time.sleep(10 * (a + 1))
    raise RuntimeError("Groq ohne Antwort — " + letzter)


def zweitpruefung(titel, paare, frage=None):
    """paare = [(original, deutsch), …] → None (alle gut) | Grund. Anderes Modell, nur Urteil, keine eigene Übersetzung."""
    frage = frage or (lambda t: _groq(PRUEFER_MODELL, t))
    text = ("Du prüfst Übersetzungen von Lieferanten-Variantennamen (Englisch, oft holprig aus dem Chinesischen) in deutsche "
            f"Auswahlwerte eines Schweizer Onlineshops. Produkt: «{titel}».\n"
            "Für JEDES Paar: Ist der deutsche Wert eine richtige, für Kundinnen verständliche Wiedergabe dessen, was gemeint "
            "ist? Typische Fehler, die du ablehnen musst: chinesische Farbnamen wörtlich übersetzt (Bean paste → «Bohnenpaste» "
            "statt Altrosa; Lotus root → «Lotuswurzel» statt Altrosa), ein Bereich als Mass geschrieben (90to140 → «90×140» "
            "statt «90–140»), etwas hinzugefügt oder weggelassen, sinnlose Wortbildungen, englische Reste. Gleich geschriebene "
            "Wörter (Khaki, Beige, Pink, Upgrade, USB) sind richtig.\n"
            "Antworte NUR mit JSON: {\"urteile\": [{\"ok\": true|false, \"grund\": \"…\"}, …]} — ein Urteil je Paar, gleiche "
            "Reihenfolge.\nPaare:\n" + json.dumps([{"original": o, "deutsch": d} for o, d in paare], ensure_ascii=False))
    a = frage(text)
    u = (a or {}).get("urteile") or []
    if len(u) != len(paare):
        raise RuntimeError(f"Zweitprüfer-Antwort unvollständig ({len(u)} statt {len(paare)})")
    schlecht = [(paare[i], (x or {}).get("grund", "")) for i, x in enumerate(u) if not (x or {}).get("ok")]
    if schlecht:
        (o, d), g = schlecht[0]
        return f"Zweitprüfer: {o!r} → {d!r} abgelehnt ({str(g)[:120]})" + (f" +{len(schlecht) - 1}" if len(schlecht) > 1 else "")
    return None


def uebersetze_ki(titel, dims, frage=None, pruefer=None):
    """dims = [[werte…], …] → [(name, [werte…]) | None, …]. Ein Übersetzer-Aufruf + ein Prüfer-Aufruf je Produkt;
    Ledger zuerst. Modell nicht erreichbar → RuntimeError (der Aufrufer zählt das als vorübergehend, kein Ledger)."""
    ledger = _ki_ledger_lesen()
    out, offen = [None] * len(dims), []
    for i, d in enumerate(dims):
        r = ledger.get(json.dumps(d, ensure_ascii=False))
        # Abgelehnte Einträge zählen nur, wenn der ZWEITPRÜFER sie verworfen hat — eine harte Prüfregel kann sich ändern
        # (08.10. 20:50: «Standard»/«Version» galten als englisch), dann wird neu gefragt.
        if r and (r.get("ok") or "Zweitprüfer" in (r.get("grund") or "")):
            out[i] = normalisiere_ki(r["name"], r["werte"]) if r.get("ok") else None
        else:
            offen.append(i)
    if not offen:
        return out
    if frage is None:
        from zweitmodell import chat_json as frage           # noqa: E402  (OpenAI → Groq gpt-oss-120b)
    text = ("Du übersetzt Lieferanten-Variantennamen (Englisch, oft holprig aus dem Chinesischen) in kurze deutsche "
            "Auswahlwerte für einen Schweizer Onlineshop (Schweizer Schreibweise: ss statt ß).\n"
            f"Produkt: «{titel}»\n"
            "Regeln:\n"
            "- Reihenfolge und Anzahl je Liste genau beibehalten; jeder Wert höchstens 32 Zeichen; Werte eindeutig.\n"
            "- Jede Zahl unverändert übernehmen. Masse mit ×: 37x26 → 37×26. Bereiche mit –: 90to140 → 90–140. inch → Zoll; "
            "L, ml, cm, mm, W, V bleiben.\n"
            "- Farben: den gemeinten Farbton nennen, NICHT wörtlich übersetzen (Bean paste → Altrosa, Lotus root → Altrosa, "
            "Wathet → Hellblau, Haze blue → Rauchblau, Army green → Armeegrün, Coffee → Kaffeebraun).\n"
            "- Enthält ein Wert ein Ding UND eine Farbe, schreibe «Ding · Farbe» (Purple Bunny → «Hase · Lila», Red Single Bag "
            "→ «Einzeltasche · Rot»). Motiv-/Figurnamen sinngemäss deutsch; Marken, Modellcodes, USB/LED bleiben.\n"
            "- Kein englisches Wort stehen lassen, keine Erklärungen, nichts hinzufügen, was nicht im Original steht.\n"
            "- Optionsname je Liste genau einer von: Farbe, Grösse, Ausführung, Modell, Typ, Motiv, Variante, Volumen, "
            "Länge, Menge, Material, Muster, Stil, Form, Set.\n"
            "Antworte NUR mit JSON: {\"listen\": [{\"name\": \"…\", \"werte\": [\"…\"]}, …]} — eine Liste je Eingabeliste.\n"
            "Eingabelisten:\n" + json.dumps([dims[i] for i in offen], ensure_ascii=False))
    try:
        a = frage(text)
        listen = (a or {}).get("listen") or []
    except Exception as e:                                   # Modell weg/gedrosselt: kein Ledger-Eintrag, später erneut —
        raise RuntimeError(f"KI nicht erreichbar: {str(e)[:100]}")   # der Aufrufer zählt das als vorübergehend
    if len(listen) != len(offen):
        raise RuntimeError(f"KI-Antwort unvollständig ({len(listen)} statt {len(offen)} Listen)")
    try:
        import zweitmodell
        wer = getattr(zweitmodell, "LETZTES_MODELL", "") or "?"
    except Exception:
        wer = "?"
    ergebnisse = []
    for i, l in zip(offen, listen):
        name, werte = normalisiere_ki(str((l or {}).get("name") or "").strip(), (l or {}).get("werte") or [])
        ergebnisse.append((i, name, werte, pruefe_ki(dims[i], name, werte)))
    # Zweitprüfer nur über das, was die harte Prüfung bestanden hat (ein Aufruf je Produkt)
    paare = [(o, w) for i, _, werte, g in ergebnisse if g is None for o, w in zip(dims[i], werte)]
    zweit = None
    if paare:
        try:
            zweit = zweitpruefung(titel, paare, pruefer)
        except Exception as e:
            raise RuntimeError(f"Zweitprüfer nicht erreichbar: {str(e)[:100]}")
    with open(KI_LEDGER, "a", encoding="utf-8") as fh:
        for i, name, werte, grund in ergebnisse:
            if grund is None and zweit:
                grund = zweit                                 # das Produkt als Ganzes fällt (Werte hängen zusammen)
            fh.write(json.dumps({"v": KI_VERSION, "original": dims[i], "name": name, "werte": werte, "ok": grund is None,
                                 "grund": grund, "titel": titel, "modell": wer, "pruefer": PRUEFER_MODELL},
                                ensure_ascii=False) + "\n")
            out[i] = (name, werte) if grund is None else None
    return out


# ── Selbsttest ──────────────────────────────────────────────────────────────────────────────────────────────────
def _v(*keys):
    return [{"variantKey": k} for k in keys]


KANARIEN = [
    (_v("Pink", "Red"), [("Farbe", ["Rosa", "Rot"])]),
    (_v("White-70cm", "Blue-90cm", "White-80cm", "Blue-70cm"), [("Farbe", ["Weiss", "Blau"]), ("Grösse", ["70 cm", "80 cm", "90 cm"])]),
    (_v("Green-L", "Green-S", "Sky Blue-L", "Sky Blue-S"), [("Farbe", ["Grün", "Himmelblau"]), ("Grösse", ["S", "L"])]),
    (_v("Red-EU", "Red-UK", "Blue-EU", "Blue-UK"), [("Farbe", ["Rot", "Blau"])]),
    (_v("Pink-Europlug", "Pink-American Standard Plug", "White-Europlug", "White-British Regulatory Plug"),
     [("Farbe", ["Rosa", "Weiss"])]),
    (_v("Orange-60L", "Sky Blue-60L", "Black-60L"), [("Farbe", ["Orange", "Himmelblau", "Schwarz"])]),
    (_v("Black-16inch", "Khaki-16inch", "Beige-16inch"), [("Farbe", ["Schwarz", "Khaki", "Beige"])]),
    (_v("Black-12 inch", "Black-13 inch", "Gray-12 inch", "Gray-13 inch"), [("Farbe", ["Schwarz", "Grau"]), ("Grösse", ["12 Zoll", "13 Zoll"])]),
    (_v("400ml", "800ml"), [("Volumen", ["400 ml", "800 ml"])]),
    (_v("60x40x2.5cm", "45x30x2.5cm"), [("Grösse", ["45×30×2.5 cm", "60×40×2.5 cm"])]),
    (_v("Black Large", "Black Small", "Gray Large", "Gray Small Size"), [("Farbe", ["Schwarz", "Grau"]), ("Grösse", ["Klein", "Gross"])]),
    (_v("Large Blue", "Small Size Black"), [("Farbe", ["Blau", "Schwarz"]), ("Grösse", ["Gross", "Klein"])]),
    (_v("Black-A", "Black-B", "White-A", "White-B"), [("Farbe", ["Schwarz", "Weiss"]), ("Typ", ["Typ A", "Typ B"])]),
    (_v("99001Style", "99002Style", "99003Style"), [("Modell", ["Modell 1", "Modell 2", "Modell 3"])]),
    (_v("Chenille No.1 color-Ushaped seat cushion", "Chenille No.2 color-Ushaped seat cushion"), [("Modell", ["Modell 1", "Modell 2"])]),
    (_v("Q524204", "Q524201", "Q524202"), [("Modell", ["Modell 1", "Modell 2", "Modell 3"])]),
    (_v("Khaki-85L", "Black-85L"), [("Farbe", ["Khaki", "Schwarz"])]),
    (_v("Blue-Below 20L", "Black-Below 20L"), [("Farbe", ["Blau", "Schwarz"])]),
    (_v("Army Green-large size", "Army Green-Small", "Black-large size", "Black-Small"),
     [("Farbe", ["Armeegrün", "Schwarz"]), ("Grösse", ["Klein", "Gross"])]),
    (_v("Ti'an Green-L", "Ti'an Green-XL", "Ti'an Green-2XL"), [("Grösse", ["L", "XL", "2XL"])]),
    (_v("Red Single Bag-20to35L", "Blue Single Bag-20to35L"), [("Farbe", ["Rot", "Blau"])]),   # gemeinsames «Single Bag» weg
    (_v("Purple Bunny-38x31x16CM", "Pink Bunny-38x31x16CM"), [("Farbe", ["Violett", "Rosa"])]),
    (_v("Red Single Bag-20to35L", "Red Rain Cover-20to35L"), None),         # «Single Bag»/«Rain Cover» → KI oder MANUELL
    (_v("Blue Mind Machine", "Red Big Mouth Monster"), None),
    (_v("Black-EU", "Black-US"), [("__eine__", [])]),                       # nur EU übrig → eine Variante
    (_v("Black-US", "Black-UK"), "kein EU-Stecker bei CJ"),
    (_v("Short Ellipse XS", "Long Almond M"), [("Ausführung", ["Kurz Oval · XS", "Lang Mandel · M"])]),
    (_v("Gold-17 Yards", "Gold-18 Yards"), [("Grösse", ["Gr. 17", "Gr. 18"])]),
    (_v("L", "XL", "M"), [("Grösse", ["M", "L", "XL"])]),
    (_v("Black-104 key", "Black-87 key", "White-104 key", "White-87 key"), [("Farbe", ["Schwarz", "Weiss"]), ("Tastenzahl", ["104 Tasten", "87 Tasten"])]),
    (_v("Red-L", "Red-M", "Blue-L", "Blue-M"), [("Farbe", ["Rot", "Blau"]), ("Grösse", ["M", "L"])]),
    (_v("Red-L", "Blue-M"), [("Farbe", ["Rot", "Blau"]), ("Grösse", ["L", "M"])]),     # Rot·M fehlt → L bleibt vorn
    (_v("Type A-Single basket", "Type B-Single basket"), [("Typ", ["Typ A", "Typ B"])]),
    (_v("Black-USB", "White-USB"), [("Farbe", ["Schwarz", "Weiss"])]),
    (_v("8901 Dark Brown", "8901 Light Brown"), [("Farbe", ["Dunkelbraun", "Hellbraun"])]),
    (_v("Black 15inches", "Black 17inches", "Blue 17inches"), [("Farbe", ["Schwarz", "Blau"]), ("Grösse", ["15 Zoll", "17 Zoll"])]),
    (_v("Light Pink-41x13cm", "Beige-35x10cm", "Beige-41x13cm"), [("Farbe", ["Rosa", "Beige"]), ("Grösse", ["41×13 cm", "35×10 cm"])]),
    (_v("European Standard Black", "European Standard White", "American Standard Black"), [("Farbe", ["Schwarz", "Weiss"])]),
    (_v("US White", "EU White", "EU Black", "UK White"), [("Farbe", ["Weiss", "Schwarz"])]),
    (_v("green-One size", "Wathet-One size", "black-One size"), [("Farbe", ["Grün", "Hellblau", "Schwarz"])]),
    (_v("Silver Black", "Gold", "Black Gray"), [("Farbe", ["Silber-Schwarz", "Gold", "Schwarz-Grau"])]),
    (_v("Navy Blue", "Sapphire Blue"), [("Farbe", ["Marineblau", "Saphirblau"])]),
    (_v("Pink Large Sized", "Small Pink", "Navy Blue Small", "Navy Blue Large Size"), [("Farbe", ["Rosa", "Marineblau"]), ("Grösse", ["Klein", "Gross"])]),
]


def selbsttest():
    fehler = 0
    for vs, soll in KANARIEN:
        plan, grund = plane_optionen(vs, "Testprodukt")
        if soll is None:
            ok = plan is None
            ist = grund
        elif isinstance(soll, str):
            ok = plan is None and grund == soll
            ist = grund
        elif soll == [("__eine__", [])]:
            ok = plan is not None and plan["optionen"] == [] and len(plan["zeilen"]) == 1
            ist = plan and plan["optionen"]
        else:
            ist = plan and plan["optionen"]
            ok = ist == soll
        if not ok:
            fehler += 1
            print(f"  ✗ {[v['variantKey'] for v in vs][:3]} → {ist!r} (soll {soll!r}; Grund {grund})")
    # KI-Prüfung
    ki_faelle = [((["Purple Bunny", "Pink Bunny"], "Motiv", ["Lila Hase", "Rosa Hase"]), None),
                 ((["Purple Bunny", "Pink Bunny"], "Motiv", ["Lila Bunny", "Rosa Hase"]), "englisch"),
                 ((["38x31x16CM", "40x30CM"], "Grösse", ["38×31×16 cm", "40×31 cm"]), "Zahl"),
                 ((["Red Single Bag", "Blue Single Bag"], "Ausführung", ["Einzeltasche", "Blaue Einzeltasche"]), "Farbe"),
                 ((["Blue Mind Machine", "Red Big Mouth Monster"], "Motiv", ["Blaue Denkmaschine", "Rotes Grossmaul-Monster"]), None),
                 ((["A", "B"], "Wunschname", ["A", "B"]), "nicht erlaubt")]
    for (orig, name, werte), soll in ki_faelle:
        g = pruefe_ki(orig, name, werte)
        if (soll is None) != (g is None) or (soll and soll.lower() not in (g or "").lower()):
            fehler += 1
            print(f"  ✗ KI-Prüfung {orig} → {werte}: {g!r} (soll {soll!r})")
    print(f"Selbsttest: {len(KANARIEN) + len(ki_faelle) - fehler}/{len(KANARIEN) + len(ki_faelle)} ok")
    return fehler == 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
