#!/usr/bin/env python3
"""titel_sonderzeichen.py — Titel ohne unsichtbare Sonderzeichen und ohne doppelte Stückzahl (04.10.2026).

ANLASS (Betreiber 04.10. «fix 12 h lang alles», Bereich Neuimport-Qualität): 837 aktive Neuimporte in 24 h gemessen,
121 davon mit typografischen Sonderzeichen aus dem Übersetzer — U+2011 NON-BREAKING HYPHEN (88, «12‑in‑1»,
«Handpumpen‑Pumpe») und U+202F NARROW NO-BREAK SPACE (51, «17,5 cm»). Shopweit (Voll-Export /tmp/kost28.jsonl,
50'242 Produkte): 364. Für die Kundin unsichtbar, für die Suche nicht: wer «12-in-1» tippt, findet «12‑in‑1» nicht,
und jede Haus-Regex (Multipack, Stückzahl, Kauderwelsch-Wache) liest «5‑Stück» nicht als Menge.
Zweite Klasse, 4 Neuimporte: «12 Stück Kuchenformen aus Metall · 12 Stück», «… (2 Stück) · 2 Stück» — der Importer hängte
die Menge an, obwohl sie schon dastand (Quelle: stueckzahl.mjs, am 04.10. gehärtet). Hier der Bestand.

REGELN
  * Sonderzeichen → ASCII: U+2010/2011/2012/2043 → «-», U+202F/2009/200A/00A0 → « », Mehrfach-Leerzeichen → eins.
    «–» (Gedankenstrich), «″» (Zoll), «×», «·» bleiben — das sind Aussagen, keine Übersetzerreste.
  * Doppelte Menge: endet der Titel auf «· N Stück» und nennt der Teil davor DIESELBE Zahl als Menge
    («N Stück», «N-teilig», «(N Stück)», «N-teiliges»), fällt der Anhang weg. Andere Zahl → nichts (nicht raten).
  * Kandidaten: Neuware der letzten STUNDEN (72) über created_at; mit EXPORT=<jsonl> zusätzlich alle Titel des Voll-Exports.
    Vor JEDEM Schreiben wird der Titel LIVE gelesen (Export kann alt sein), nach dem Schreiben aus der Antwort zurückgelesen.
  * Ledger dropship/_titel_sonderzeichen.tsv (Zeit, id, alt, neu, Regel, ok). Nur status ACTIVE; POD/Printful nie.
  python3 automation/titel_sonderzeichen.py                      # Trockenlauf, Neuware 72 h
  SCHARF=1 EXPORT=/tmp/kost28.jsonl python3 automation/titel_sonderzeichen.py
  python3 automation/titel_sonderzeichen.py --kanarienvogel
"""
import json, os, re, sys, time
from datetime import datetime, timedelta, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql   # Shopify-Helfer mit Wiederholung
from seo_titel_grenze import seo_titel  # 05.10.: SEO-Titel ≤ 70 aus dem neuen Titel

SCHARF = os.environ.get("SCHARF") == "1"
STUNDEN = float(os.environ.get("STUNDEN", "72"))
EXPORT = os.environ.get("EXPORT", "")
LEDGER = os.path.join(REPO, "dropship", "_titel_sonderzeichen.tsv")
POD = re.compile(r"\b(pod|printful|selbst-gestalten)\b", re.I)

SONDER = [(re.compile("[‐‑‒⁃]"), "-"), (re.compile("[    ]"), " "),
          (re.compile(r"\s{2,}"), " ")]
SONDER_TEST = re.compile("[‐‑‒⁃    ]|\\s{2,}")
ANHANG = re.compile(r"\s*·\s*(\d+)\s*St(?:ü|ue)ck\s*$")


def glaetten(t):
    for rx, ersatz in SONDER:
        t = rx.sub(ersatz, t)
    return t.strip()


def ohne_doppelmenge(t):
    m = ANHANG.search(t)
    if not m:
        return t, None
    n, vorne = m.group(1), t[:m.start()]
    # 05.10.2026 (Prüfer): enger als stueckzahl.mjs — «N-Stück», «Ner-Set/-Pack», «N Teilen» galten nicht als vorhandene Menge
    if re.search(r"(?<!\d)%s\s*-?\s*(?:St(?:ü|ue)ck|Stk|Teilen?|Paar|Rollen?)\b|(?<!\d)%s\s*-?\s*teilig|(?<!\d)%ser[- ]?(?:Set|Pack|Packung)\b|\(\s*%s\s*(?:St|x)\b"
                 % (n, n, n, n), vorne, re.I):
        return vorne.rstrip(" ·"), "doppelmenge"
    return t, None


def korrigieren(t):
    neu, regeln = glaetten(t), []
    if neu != t:
        regeln.append("sonderzeichen")
    neu2, r = ohne_doppelmenge(neu)
    if r:
        regeln.append(r); neu = neu2
    return neu, regeln


def kanarienvogel():
    faelle = [("12‑in‑1 Mini‑Schraubendreh‑Set", "12-in-1 Mini-Schraubendreh-Set"),
              ("Haarmesser 6″ – 17,5 cm, 12‑Zahn‑Schere", "Haarmesser 6″ – 17,5 cm, 12-Zahn-Schere"),
              ("12 Stück Kuchenformen aus Metall · 12 Stück", "12 Stück Kuchenformen aus Metall"),
              ("Tennis- und Badmintontaschen-Set (2 Stück) · 2 Stück", "Tennis- und Badmintontaschen-Set (2 Stück)"),
              ("12‑teiliger Kochset aus 410 Edelstahl mit Glasdeckeln · 12 Stück", "12-teiliger Kochset aus 410 Edelstahl mit Glasdeckeln"),
              ("5-teiliges Küchenhelfer-Set aus Akazienholz · 5 Stück", "5-teiliges Küchenhelfer-Set aus Akazienholz"),
              ("Luftballons bunt · 100 Stück", "Luftballons bunt · 100 Stück"),            # einzige Menge → bleibt
              ("2er-Set Handtücher · 4 Stück", "2er-Set Handtücher · 4 Stück"),              # andere Zahl → nicht raten
              ("Gummihammer mit Rundkopf, 8–24 oz, 200 mm", "Gummihammer mit Rundkopf, 8–24 oz, 200 mm"),  # Gedankenstrich bleibt
              ("Schleifer für saubere Kanten · 2 Stück", "Schleifer für saubere Kanten · 2 Stück"),
              ("Ring 18 mm · 18 Stück", "Ring 18 mm · 18 Stück")]                           # «18 mm» ist keine Menge
    ok = 0
    for t, soll in faelle:
        ist, _ = korrigieren(t)
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} {t!r} → {ist!r}")
    print(f"Kanarienvögel {ok}/{len(faelle)}")
    return 0 if ok == len(faelle) else 1


def kandidaten():
    ids = {}
    seit = (datetime.now(timezone.utc) - timedelta(hours=STUNDEN)).strftime("%Y-%m-%dT%H:%M:%SZ")
    c = None
    while True:
        d = gql('query($c:String,$q:String!){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id title}}}',
                {"c": c, "q": f"created_at:>='{seit}' AND status:active"})["products"]
        for n in d["nodes"]:
            ids[n["id"]] = n["title"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]; time.sleep(0.3)
    neu = len(ids)
    if EXPORT and os.path.exists(EXPORT):
        for z in open(EXPORT, encoding="utf-8"):
            if '"title"' not in z:
                continue
            o = json.loads(z)
            if "/Product/" in o["id"] and o["id"] not in ids:
                ids[o["id"]] = o["title"]
    return ids, neu


def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    alle, neu = kandidaten()
    treffer = [(pid, t) for pid, t in alle.items() if korrigieren(t)[0] != t]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(alle)} Titel ({neu} Neuware {STUNDEN:.0f} h"
          f"{', + Export' if EXPORT else ''}) · Kandidaten {len(treffer)} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    for pid, t in treffer[:15]:
        print(f"   {t!r} → {korrigieren(t)[0]!r}  [{','.join(korrigieren(t)[1])}]")
    if not SCHARF:
        print(f"FERTIG (trocken): {len(treffer)} Kandidaten"); return 0
    led = open(LEDGER, "a", encoding="utf-8")
    geaendert = uebersprungen = fehler = 0
    for i in range(0, len(treffer), 50):
        block = treffer[i:i + 50]
        live = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status tags seo{title description}}}}', {"ids": [p for p, _ in block]})["nodes"]
        for p in live:
            if not p or p["status"] != "ACTIVE" or any(POD.search(x) for x in p["tags"]):
                uebersprungen += 1; continue
            alt = p["title"]
            neu_t, regeln = korrigieren(alt)
            if neu_t == alt or not neu_t:
                uebersprungen += 1; continue
            eingabe = {"id": p["id"], "title": neu_t}
            # 05.10.2026 (Prüfer): auch der SEO-Titel (den Google zeigt) — immer BEIDE SEO-Felder senden (SEOInput ersetzt beide)
            seo = p.get("seo") or {}
            if seo.get("title") or seo.get("description"):
                # 05.10.2026 (Prüfer, Nachbesserung): war der SEO-Titel vom ALTEN Titel abgeleitet («Alt | LuxeStyle CH»), bleibt
                # sonst die Doppelmenge im Meta-Titel stehen («… · 5 Stück | LuxeStyle CH», 3 Fälle) → aus dem neuen Titel
                # neu bauen (70er-Grenze, seo_titel_grenze.seo_titel); bewusst abweichende SEO-Titel nur glätten.
                st = seo.get("title") or ""
                abgeleitet = st.strip() in (alt, f"{alt} | LuxeStyle", f"{alt} | LuxeStyle CH") or (len(st) == 70 and (alt + " | LuxeStyle CH").startswith(st.rstrip()))
                eingabe["seo"] = {"title": seo_titel(neu_t) if abgeleitet else glaetten(st), "description": glaetten(seo.get("description") or "")}
            r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{title} userErrors{message}}}',
                    {"i": eingabe})["productUpdate"]
            ok = not r["userErrors"] and r["product"] and r["product"]["title"] == neu_t
            geaendert += ok; fehler += not ok
            led.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{p['id']}\t{alt}\t{neu_t}\t{','.join(regeln)}\t{'ok' if ok else 'FEHLER ' + str(r['userErrors'])[:80]}\n")
            time.sleep(0.4)
        led.flush()
        print(f"  … {min(i + 50, len(treffer))}/{len(treffer)} (geändert {geaendert}, übersprungen {uebersprungen}, Fehler {fehler})", flush=True)
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {geaendert} korrigiert, {uebersprungen} übersprungen, {fehler} Fehler", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
