#!/usr/bin/env python3
"""google_reiztitel.py — Reizwörter aus Produkttiteln im Google-Kanal nehmen (04.10.2026, «fix 12 h lang alles»).

GEMESSEN 04.10. 22:25 UTC (productsCount, status:active AND publication_ids:302872297857):
  «Sexy» im Titel 44 · «Spicy Girl» 6 · «verführerisch» 1 — davon 7 im Google-Blocker «Restricted adult content» /
  «Personalized advertising: Sexual interests» (299 Produkte, dieselbe Menge in beiden Klassen).
Der Google-Klassifikator liest Titel UND Bild; «Sexy» im Titel trägt nichts zum Verkauf bei (03.10. gemessen: 0×
«Inappropriate title»), aber es ist das billigste Signal, das wir Google geben. Ein sachlicher Titel verliert nichts.

REGELN (nur ganze Wörter, deutsch gedacht — «Sexy» steckt in keinem Kompositum, «Hot» bleibt: Hot Wheels):
  «Sexy & Cool» → weg · «, sexy» → weg · «Sexy & X» → «X» · «Sexy X» → «X» · «X Sexy Y» → «X Y»
  «Spicy Girl» / «Spicy-Girl» (auch in «…») → weg · «verführerisch\\w*» → weg (Komma davor mit)
  danach: doppelte Leerzeichen, hängende «&,–-·» an Anfang/Ende weg, erster Buchstabe gross. Ergebnis < 8 Zeichen → übersprungen.
SEO-Titel (seo.title) wird gleich behandelt, wenn er ein Reizwort trägt. Ledger dropship/_google_reiztitel.tsv (alt → neu,
Rückweg = alt). Ohne SCHARF=1 nur Anzeige. --kanarienvogel prüft die Regeln an festen Fällen.
"""
import os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_google_reiztitel.tsv")
GOOGLE = "302872297857"
SCHARF = os.environ.get("SCHARF") == "1"

REGELN = [
    (re.compile(r"\s*[,–-]?\s*\bSexy\s*&\s*Cool\b", re.I), ""),
    (re.compile(r",\s*sexy\b", re.I), ""),
    (re.compile(r"\bSexy\s*&\s*", re.I), ""),
    (re.compile(r"\s*&\s*Sexy\b", re.I), ""),
    (re.compile(r"[«»\"']?\bSpicy[- ]Girl\b[«»\"']?", re.I), ""),
    (re.compile(r",?\s*\bverführerisch\w*", re.I), ""),
    (re.compile(r"\bSexy\b", re.I), ""),
]
REIZ = re.compile(r"\bSexy\b|\bSpicy[- ]Girl\b|\bverführerisch", re.I)


def sachlich(t):
    neu = t
    for rx, ersatz in REGELN:
        neu = rx.sub(ersatz, neu)
    neu = re.sub(r"\s{2,}", " ", neu).strip()
    neu = re.sub(r"^[\s&,–\-·]+|[\s&,–\-·]+$", "", neu).strip()
    neu = re.sub(r"\s+,", ",", neu)
    if neu:
        neu = neu[0].upper() + neu[1:]
    return neu


def kanarienvogel():
    faelle = [("Hot Wheels Drift Board Skateboard", "Hot Wheels Drift Board Skateboard"),
              ("Sexy & Vielseitiger Spitzen-Rock mit hoher Taille", "Vielseitiger Spitzen-Rock mit hoher Taille"),
              ("Damen Denim Rock Midi Sexy & Cool", "Damen Denim Rock Midi"),
              ("Traglose, rueckenfreie, sexy Figurkleid in Gelb/Weiss", "Traglose, rueckenfreie Figurkleid in Gelb/Weiss"),
              ("Süsses, verführerisches Rüschenkleid", "Süsses Rüschenkleid"),
              ("Spicy Girl Mini-Kleid mit Schnürung", "Mini-Kleid mit Schnürung"),
              ("Minikleid «Spicy-Girl» im Bodycon-Stil", "Minikleid im Bodycon-Stil"),
              ("Sexy Jumpsuit · Damen", "Jumpsuit · Damen"),
              ("Elegante Träger Sexy Damenkleid", "Elegante Träger Damenkleid"),
              ("Sexysmart Hülle", "Sexysmart Hülle")]
    ok = 0
    for alt, soll in faelle:
        ist = sachlich(alt)
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} {alt!r} → {ist!r}" + ("" if ist == soll else f"  (soll {soll!r})"))
    print(f"Kanarienvögel {ok}/{len(faelle)}")
    return ok == len(faelle)


def main():
    if "--kanarienvogel" in sys.argv:
        sys.exit(0 if kanarienvogel() else 1)
    if not kanarienvogel():
        sys.exit("ABBRUCH: Kanarienvögel schlagen fehl")
    q = f"status:active AND publication_ids:{GOOGLE} AND (title:Sexy OR title:\"Spicy Girl\" OR title:verführerisch*)"
    nodes, cursor = [], None
    while True:
        d = gql("query($q:String,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} "
                "nodes{id handle title seo{title description}}}}", {"q": q, "c": cursor})
        pg = d["products"]; nodes += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cursor = pg["pageInfo"]["endCursor"]
    treffer = [n for n in nodes if REIZ.search(n["title"]) or REIZ.search(n["seo"].get("title") or "")]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(nodes)} Suchtreffer · {len(treffer)} mit Reizwort · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    ok = uebersprungen = fehler = 0
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for n in treffer:
        alt, neu = n["title"], sachlich(n["title"])
        seo_alt = n["seo"].get("title") or ""
        seo_neu = sachlich(seo_alt) if REIZ.search(seo_alt) else seo_alt
        if len(neu) < 8 or (neu == alt and seo_neu == seo_alt):
            uebersprungen += 1; print(f"  übersprungen {n['handle'][:50]}: {alt!r} → {neu!r}"); continue
        print(f"  {n['handle'][:50]:50} {alt!r} → {neu!r}" + (f"  SEO {seo_alt!r} → {seo_neu!r}" if seo_neu != seo_alt else ""), flush=True)
        if not SCHARF:
            continue
        eingabe = {"id": n["id"], "title": neu}
        if seo_neu != seo_alt:
            # 05.10.2026 (Prüfer): SEOInput ERSETZT title UND description — {"title": …} allein löschte bei 17 Produkten die
            # Meta-Beschreibung. Immer beide Felder senden, Reizwort auch aus der Beschreibung.
            eingabe["seo"] = {"title": seo_neu, "description": sachlich(n["seo"].get("description") or "")}
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title seo{title}} userErrors{message}}}", {"p": eingabe})
        err = r["productUpdate"]["userErrors"]
        ist = (r["productUpdate"]["product"] or {}).get("title")
        if err or ist != neu:
            fehler += 1; print(f"    ⚠️ {err or ist}", flush=True); continue
        ok += 1
        led.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{n['handle']}\t{n['id']}\t{alt}\t{neu}\t{seo_alt}\t{seo_neu}\n"); led.flush()
        time.sleep(0.4)
    print(f"FERTIG: {ok} umbenannt · {uebersprungen} übersprungen · {fehler} Fehler" + ("" if SCHARF else " (TROCKEN)"))


if __name__ == "__main__":
    main()
