#!/usr/bin/env python3
"""seo_suchbegriff_titel.py — SEO-Titel/-Text mit dem echten Suchbegriff für Seiten, die bei Google schon ranken (02.10.2026).

ANLASS (Betreiber «verbessere alles»; Semrush-Testabo): luxestyle.ch rankt für 556 Begriffe, aber fast alle auf Seite 2–10
(geschätzter Verkehr 0). Für jede Produktseite mit Semrush-Position wird der Begriff mit dem meisten Volumen in den SEO-Titel
und die Meta-Beschreibung gesetzt — die zwei Felder, die Google als Treffer zeigt. Daten bleiben nach dem Abo:
dropship/semrush/luxestyle_ch_*.csv (Spalten Keyword;Position;Search Volume;Keyword Difficulty;…;Url).

  * je URL EIN Begriff (höchstes Volumen); nur aktive, veröffentlichte Produkte; schon erledigte (Ledger) übersprungen
  * Medizin/Heil/Wirkung (Hallux, Haarwachstum, Lichttherapie, Ultraschall …) → aus (Hausregel Heilversprechen)
  * Gemini schlägt vor, REGELN prüfen hart: Titel ≤ 60 Zeichen, enthält den Suchbegriff, endet « | LuxeStyle»;
    Text 90–160 Zeichen, enthält den Suchbegriff; kein Preis/CHF, kein «schnell/express/bestseller/top/garantiert/gratis»,
    kein ß, kein «!» — Verstoss = nicht geschrieben (Bericht). seo{title,description} immer ZUSAMMEN (Gehirn-Regel seo-teil).
  python3 automation/seo_suchbegriff_titel.py            Trockenlauf → dropship/semrush/SEO-TITEL-VORSCHLAEGE.md
  SCHARF=1 python3 automation/seo_suchbegriff_titel.py   schreiben + zurücklesen → Ledger dropship/semrush/_seo_seite2_ledger.tsv
"""
import csv, datetime as dt, glob, json, os, re, sys, unicodedata

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql
from titel_kauderwelsch_wache import gemini

ORDNER = os.path.join(REPO, "dropship", "semrush")
LEDGER = os.path.join(ORDNER, "_seo_seite2_ledger.tsv")
BERICHT = os.path.join(ORDNER, "SEO-TITEL-VORSCHLAEGE.md")
SCHARF = os.environ.get("SCHARF") == "1"
MEDIZIN = re.compile(r"hallux|haarwachstum|haarwuchs|lichttherapie|ultraschall|rosmarin|schiene|korrektor|therapie|heil|"
                     r"schmerz|bandage|orthes|massage|cellulite|bartwuchs", re.I)
SIE = re.compile(r"\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b")
SCHLUSS = " Bezahlen mit TWINT oder Klarna, Versand in die ganze Schweiz."
FLOSKEL = re.compile(r"leistungsstark|beste[nr]?\b|hochwertig|perfekt|beeindruck|träume|traum|ideal|optimal|premium|luxus|dein |deine |deinen ", re.I)
VERBOTEN = re.compile(r"chf|\d+[.,]\d0\b|schnell|express|bestseller|\btop\b|garantiert|gratis|kostenlos|heilt|wirkt|ß|!", re.I)


def norm(t):
    t = unicodedata.normalize("NFKC", t).lower().replace("ß", "ss")
    return re.sub(r"[\s\-–]+", " ", t).strip()


def enthaelt(text, begriff):
    return norm(begriff) in norm(text)


def erledigt():
    if not os.path.exists(LEDGER):
        return set()
    return {z.split("\t")[1] for z in open(LEDGER, encoding="utf-8") if "\tok" in z or z.rstrip().endswith("ok")}


def kandidaten():
    beste = {}
    for p in sorted(glob.glob(os.path.join(ORDNER, "luxestyle_ch_*.csv"))):
        for z in csv.DictReader(open(p, encoding="utf-8"), delimiter=";"):
            u = z["Url"].split("?")[0]
            if "/products/" not in u:
                continue
            h = u.split("/products/")[1]
            vol = int(z["Search Volume"])
            if h not in beste or vol > beste[h]["vol"]:
                beste[h] = {"kw": z["Keyword"], "vol": vol, "pos": int(z["Position"])}
    return beste


PROMPT = """Für den Schweizer Onlineshop LuxeStyle schreibst du SEO-Titel . Je Produkt: Suchbegriff + Produkttitel.
REGELN (hart, sonst wird es verworfen):
- seo_titel: höchstens 60 Zeichen INKLUSIVE « | LuxeStyle» am Ende; enthält den Suchbegriff WÖRTLICH (Gross-/Kleinschreibung
  und Bindestriche dürfen angepasst werden, Wörter nicht); natürliches Deutsch.
- Nach dem Suchbegriff nur Merkmale aus dem Produkttitel (nichts erfinden); keine Floskeln wie «perfekt», «ideal»,
  «hochwertig», «leistungsstark», «beste», kein «dein/deine».
- VERBOTEN: Preise/CHF, «schnell», «express», «Bestseller», «Top», «garantiert», «gratis», «kostenlos», Heil-/Wirkversprechen,
  «ß» (immer «ss»), Ausrufezeichen.
Antworte NUR als JSON {{"<handle>": {{"seo_titel": "..."}}, ...}}
Produkte: {liste}"""


def pruefen(begriff, t, x):
    f = []
    if len(t) > 60: f.append(f"Titel {len(t)} Zeichen")
    if not t.endswith(" | LuxeStyle"): f.append("Titel ohne « | LuxeStyle»")
    if not enthaelt(t, begriff): f.append("Titel ohne Suchbegriff")
    if not (90 <= len(x) <= 160): f.append(f"Text {len(x)} Zeichen")
    if FLOSKEL.search(t): f.append(f"Titel: Floskel «{FLOSKEL.search(t).group(0).strip()}»")
    if SIE.search(t) or SIE.search(x): f.append("Sie-Form")
    for feld, s in (("Titel", t), ("Text", x)):
        m = VERBOTEN.search(s)
        if m: f.append(f"{feld}: verboten «{m.group(0)}»")
    return f


def main():
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    fertig = erledigt()
    k = kandidaten()
    arbeit, aus = [], []
    for h, d in sorted(k.items(), key=lambda x: -x[1]["vol"]):
        if h in fertig:
            continue
        if MEDIZIN.search(h) or MEDIZIN.search(d["kw"]):
            aus.append((h, d["kw"], "Medizin/Wirkung")); continue
        p = gql("query($h:String!){p:productByHandle(handle:$h){id status title onlineStoreUrl seo{title description}}}", {"h": h})["p"]
        if not p or p["status"] != "ACTIVE" or not p["onlineStoreUrl"]:
            aus.append((h, d["kw"], "nicht aktiv")); continue
        arbeit.append({**d, "h": h, "id": p["id"], "titel": p["title"], "alt": p["seo"]})
    vorschlag = {}
    for i in range(0, len(arbeit), 30):
        teil = arbeit[i:i + 30]
        vorschlag.update(gemini(PROMPT.format(liste=json.dumps([{"handle": a["h"], "suchbegriff": a["kw"], "produkttitel": a["titel"]}
                                                                 for a in teil], ensure_ascii=False))))
    zeilen, ok, geschrieben = [], 0, 0
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for a in arbeit:
        v = vorschlag.get(a["h"]) or {}
        t = (v.get("seo_titel") or "").strip()
        # Text = echter Produkttitel + fester Schluss: nichts Erfundenes (Gemini-Sätze hatten Grammatikfehler und
        # Versprechen wie «aus hochwertigem Leder», «lässt deine Träume wahr werden» — 02.10.2026 verworfen)
        x = a["titel"].strip().rstrip(".") + "." + SCHLUSS
        f = pruefen(a["kw"], t, x)
        zeilen.append(f"| {a['kw']} ({a['vol']}/Mt, Platz {a['pos']}) | {a['titel'][:40]} | {t} | {x} | {'; '.join(f) or 'ok'} |")
        if f:
            continue
        ok += 1
        if SCHARF:
            r = gql('mutation($p:ProductInput!){productUpdate(input:$p){product{seo{title description}} userErrors{message}}}',
                    {"p": {"id": a["id"], "seo": {"title": t, "description": x}}})["productUpdate"]
            s = (r.get("product") or {}).get("seo") or {}
            gut = not r["userErrors"] and s.get("title") == t and s.get("description") == x
            geschrieben += gut
            led.write(f"{dt.date.today()}\t{a['h']}\t{a['kw']}\t{a['pos']}\t{(a['alt'] or {}).get('title') or ''}\t"
                      f"{((a['alt'] or {}).get('description') or '')[:160]}\t{t}\t{'ok' if gut else 'FEHLER ' + str(r['userErrors'])}\n")
    with open(BERICHT, "w", encoding="utf-8") as fh:
        fh.write(f"# SEO-Titel aus Semrush-Suchbegriffen — {dt.datetime.utcnow():%Y-%m-%d %H:%M} UTC ({'SCHARF' if SCHARF else 'TROCKEN'})\n\n"
                 f"Kandidaten {len(arbeit)} · Regeln bestanden {ok} · geschrieben {geschrieben} · ausgelassen {len(aus)}\n\n"
                 "| Suchbegriff | Produkt | SEO-Titel | SEO-Text | Prüfung |\n|---|---|---|---|---|\n" + "\n".join(zeilen) +
                 "\n\n## Ausgelassen\n" + "\n".join(f"- {h} ({kw}): {g}" for h, kw, g in aus) + "\n")
    print(f"FERTIG: {len(arbeit)} Kandidaten · {ok} regelkonform · {geschrieben} geschrieben · {len(aus)} ausgelassen")


if __name__ == "__main__":
    main()
