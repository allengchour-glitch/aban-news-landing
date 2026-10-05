#!/usr/bin/env python3
"""suche_wache.py — misst täglich, ob die Shop-Suche die volumenstärksten Suchbegriffe (Semrush CH) trifft (05.10.2026).

ANLASS (12-h-Fixlauf Punkt 11): Kein Werkzeug prüfte die Suchfunktion. Die erste Messung zeigte: Treffer gibt es
immer (26/26 Begriffe je 10 Vorschläge), das Problem ist die RELEVANZ oben — «schuhe» zeigte 9 Schulrucksäcke
(Shopify korrigiert «schuhe» zu «schule»), «teppich» 43 Wandteppiche über ein falsches Suchwort-Tag.

WAS ES MISST (nur lesend, Storefront, kein Admin-Token nötig)
  je Begriff: /search/suggest.json (Produkte, 10) + Kollektionen (4)
  «fremd oben» = unter den ersten 3 Produkten ist keines, dessen Titel den Wortstamm des Begriffs trägt
  (Stamm = Begriff ohne Plural-Endung, Umlaute normalisiert; bei Mehrwort-Begriffen genügt ein Wort).
AMPEL  «SUCHE: 26 Begriffe · 0 ohne Treffer · 3 fremd oben (schuhe, webcam, pool) · 7 ohne Kollektion»
Ledger dropship/_suche_wache.tsv (Datum, Begriff, Treffer, fremd, Kollektionen, Top-3) — Verlauf, nie überschrieben.
Bericht der Erstmessung + Massnahmen: dropship/SUCHE-2026-10-05.md.
"""
import datetime as dt, json, os, re, subprocess, sys, time, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_suche_wache.tsv")
# Die 26 volumenstärksten Begriffe aus dropship/semrush/ (05.10.2026; «tasch» = Fragment, «luxury for you» = Fremdmarke raus).
BEGRIFFE = ["geschenkideen", "nintendo switch", "adventskalender", "halloween", "staubsauger", "uhren", "webcam",
            "elektronik", "3d drucker", "bikini", "gaming pc", "kaffeemaschine", "parfum", "schuhe", "t-shirt",
            "teppich", "bettwäsche", "kopfhörer", "pool", "powerbank", "smartwatch", "sneaker", "ventilator",
            "vorhänge", "dirndl", "aquarium"]
# Begriffe, bei denen das Sortiment nur Zubehör führt — Titel tragen den Begriff nicht, die Treffer sind trotzdem richtig.
NUR_ZUBEHOER = {"3d drucker": "", "gaming pc": "gaming", "nintendo switch": "switch", "elektronik": ""}


def norm(s):
    """Kleinbuchstaben, Umlaute auf den Grundvokal (ä/ae → a): «Parfüm» und «parfum», «Vorhänge» und «Vorhang»
    treffen sich so — der Vergleich ist grob gewollt, er sucht nur den Wortstamm."""
    s = s.lower()
    for a, b in (("ä", "a"), ("ö", "o"), ("ü", "u"), ("ß", "ss"), ("ae", "a"), ("oe", "o"), ("ue", "u")):
        s = s.replace(a, b)
    return s


def stamm(begriff):
    w = norm(begriff)
    if w in NUR_ZUBEHOER:
        return NUR_ZUBEHOER[w] or None
    w = re.sub(r"(en|e|n|s)$", "", w) if len(w) > 5 else w
    return w


def suggest(q, typ, lim):
    url = "https://luxestyle.ch/search/suggest.json?" + urllib.parse.urlencode(
        {"q": q, "resources[type]": typ, "resources[limit]": str(lim)})
    for _ in range(3):
        r = subprocess.run(["curl", "-s", "--max-time", "40", "-A", "Mozilla/5.0 (LuxeStyle-Suchwache)", url],
                           capture_output=True, text=True)
        try:
            return json.loads(r.stdout)["resources"]["results"]
        except Exception:
            time.sleep(5)
    return None


def main():
    neu = not os.path.exists(LEDGER)
    f = open(LEDGER, "a")
    if neu:
        f.write("datum\tbegriff\ttreffer\tfremd_oben\tkollektionen\ttop3\n")
    heute = dt.datetime.utcnow().strftime("%Y-%m-%d")
    ohne, fremd, ohne_koll, fehler = [], [], [], []
    for b in BEGRIFFE:
        p = suggest(b, "product", 10)
        k = suggest(b, "collection", 4)
        if p is None:
            fehler.append(b)
            continue
        prods = p.get("products", [])
        kolls = (k or {}).get("collections", [])
        st = stamm(b)
        top3 = [x["title"] for x in prods[:3]]
        # Umlaut-Plural: «vorhänge» → Stamm «vorhaeng», die Titel sagen «Vorhang» → auch die Form ohne Umlaut gilt.
        staemme = {st, re.sub(r"ae|oe|ue", lambda m: m.group(0)[0], st)} if st else set()
        passend = sum(1 for t in top3 if any(s in norm(t) for s in staemme))
        # «fremd oben» = Mehrheit der ersten drei trägt den Begriff nicht (schuhe: 1/3 Schuh, 2/3 Schulrucksack).
        ist_fremd = bool(prods) and st is not None and passend < 2
        if not prods:
            ohne.append(b)
        if ist_fremd:
            fremd.append(b)
        if not kolls:
            ohne_koll.append(b)
        f.write(f"{heute}\t{b}\t{len(prods)}\t{'ja' if ist_fremd else 'nein'}\t{len(kolls)}\t{' · '.join(t[:40] for t in top3)}\n")
        f.flush()
        time.sleep(0.5)
    zeile = (f"SUCHE: {len(BEGRIFFE)} Begriffe · {len(ohne)} ohne Treffer"
             + (f" ({', '.join(ohne)})" if ohne else "")
             + f" · {len(fremd)} fremd oben" + (f" ({', '.join(fremd)})" if fremd else "")
             + f" · {len(ohne_koll)} ohne Kollektion"
             + (f" · ⚠️ {len(fehler)} nicht messbar ({', '.join(fehler)})" if fehler else ""))
    print(zeile)


if __name__ == "__main__":
    main()
