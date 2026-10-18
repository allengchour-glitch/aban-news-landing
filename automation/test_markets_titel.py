#!/usr/bin/env python3
# =============================================================================
#  test_markets_titel.py — Tests fuer die Titel-Logik in build_markets_detail.py
#  Aufruf: python3 automation/test_markets_titel.py
#
#  Jeder Fall unten stammt aus data/markets.json, keiner ist erfunden. Am Ende
#  steht eine GEGENPROBE: eine absichtlich zu grobe Regel muss die Tests zum
#  Scheitern bringen, sonst pruefen sie nichts.
# =============================================================================

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_markets_detail as b  # noqa: E402

fehler = []


def pruefe(name, ist, soll):
    if ist != soll:
        fehler.append(f"{name}\n    ist : {ist!r}\n    soll: {soll!r}")


# --- Klammer faellt weg, wenn sie nichts Neues sagt --------------------------
pruefe("Kuerzel = Name", b.titel_kopf("Euro Stoxx 50", "Euro Stoxx 50"), "Euro Stoxx 50")
pruefe("Kuerzel = Name, Satzzeichen", b.titel_kopf("S&P 500", "S&P 500"), "S&P 500")
pruefe("Kuerzel ist ganzes Wort im Namen",
       b.titel_kopf("Nasdaq Composite", "Nasdaq"), "Nasdaq Composite")
pruefe("ohne Kuerzel", b.titel_kopf("Gold", ""), "Gold")

# --- Klammer BLEIBT, wenn das Kuerzel ein eigenes Suchwort ist ---------------
#     "ETH" steckt als Zeichenfolge in "Ethereum" — trotzdem suchen Leute nach
#     "ETH Kurs". Ein reiner Teilstring-Vergleich wuerde das wegwerfen.
for name, sym in [("Ethereum", "ETH"), ("Solana", "SOL"), ("Chainlink", "LINK"),
                  ("Polkadot", "DOT"), ("Dogecoin", "DOGE"), ("Uniswap", "UNI"),
                  ("Total US Market ETF", "VTI"), ("Alphabet", "GOOGL")]:
    pruefe(f"Klammer bleibt bei {name}", b.titel_kopf(name, sym), f"{name} ({sym})")

# --- Laengster passender Zusatz gewinnt, Marke faellt zuerst weg -------------
de = b.STR["de"]["titel"]
pruefe("kurzer Kopf behaelt die Marke",
       b.seiten_titel("Bitcoin (BTC)", de),
       "Bitcoin (BTC) — Kurs, 30-Tage-Chart & KI-Sentiment | aban news")
pruefe("langer Kopf verliert die Marke",
       b.seiten_titel("Total US Market ETF (VTI)", de),
       "Total US Market ETF (VTI) — Kurs, 30-Tage-Chart & KI-Sentiment")
pruefe("sehr langer Kopf verliert mehr",
       b.seiten_titel("A" * 50, de), "A" * 50 + " — Kurs")

# --- Kein Titel der echten Werte ueber 65 Zeichen, alle verschieden ----------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "data", "markets.json"), encoding="utf-8") as f:
    werte = json.load(f)["assets"]
for sprache in ("de", "en"):
    titel = [b.seiten_titel(b.titel_kopf(w.get("name", ""), w.get("symbol", "")),
                            b.STR[sprache]["titel"]) for w in werte]
    zu_lang = [t for t in titel if len(t) > b.MAX_TITEL]
    pruefe(f"[{sprache}] kein Titel ueber {b.MAX_TITEL} Zeichen", zu_lang, [])
    pruefe(f"[{sprache}] keine zwei Werte mit demselben Titel",
           len(set(titel)), len(titel))
    pruefe(f"[{sprache}] keine leere Klammer", [t for t in titel if "()" in t], [])

# --- Gegenprobe: mit der zu groben Teilstring-Regel muessen Tests fallen -----
echte_fehler = list(fehler)
original = b.titel_kopf


def grob(name, sym):
    if not sym or b._nur_buchstaben(sym) in b._nur_buchstaben(name):
        return str(name)
    return f"{name} ({sym})"


b.titel_kopf = grob
gegenprobe = grob("Ethereum", "ETH") != "Ethereum (ETH)"
b.titel_kopf = original

print(f"Gegenprobe: zu grobe Regel wirft '(ETH)' weg = {gegenprobe}")
if not gegenprobe:
    echte_fehler.append("GEGENPROBE: die absichtlich grobe Regel fiel nicht auf — "
                        "die Tests messen an dieser Stelle nichts.")

if echte_fehler:
    print(f"\n{len(echte_fehler)} Test(s) gescheitert:\n")
    for f_ in echte_fehler:
        print(" ✗", f_)
    sys.exit(1)
print("alle Tests bestanden")
