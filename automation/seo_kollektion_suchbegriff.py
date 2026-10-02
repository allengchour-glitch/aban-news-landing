#!/usr/bin/env python3
"""seo_kollektion_suchbegriff.py — SEO-Titel + Meta-Beschreibung von Kollektionsseiten mit dem Schweizer Suchbegriff
mit dem meisten Volumen (02.10.2026, Semrush-Testabo).

ANLASS: Bei Schweizer Kategorie-Suchen («stiefeletten damen», «schrank organizer») stehen auf Rang 1 fast immer
Kategorie-/Kollektionsseiten (dropship/semrush/semrush_serp_ch_2026-10-02.csv) — unsere Kollektionen trugen als SEO-Titel
meist nur ihren Menü-Namen («Hemden», «Sets»). Vorschläge kommen aus dem Workflow semrush-kopie-einbau (ein Agent schlägt
vor, ein zweiter prüft gegen die echten Produkttitel); DIESES Skript ist das Tor: es prüft jede Zeile hart und schreibt
nur, was alle Regeln erfüllt.

  Eingabe dropship/semrush/kollektion_seo_final_<datum>.tsv
          (handle, keyword, volumen, seo_titel, seo_text — nur von beiden Agenten bestätigte Zeilen)
  Regeln  Titel ≤ 60 Zeichen, endet « | LuxeStyle», enthält den Suchbegriff; Text 110–160 Zeichen, enthält ihn;
          kein ß, kein «!», keine Preise/CHF, keine Werbe-Floskeln, keine Sie-Form; seo{title,description} immer
          ZUSAMMEN (Gehirn-Regel seo-teil: ein seo-Objekt ohne title löscht den Titel).
  Ledger  dropship/semrush/_seo_kollektion_ledger.tsv (datum, handle, keyword, alter Titel, alter Text, neuer Titel, Status)
  python3 automation/seo_kollektion_suchbegriff.py [datei]            Trockenlauf (Standard) → Prüfliste
  SCHARF=1 python3 automation/seo_kollektion_suchbegriff.py [datei]   schreiben + zurücklesen
  python3 automation/seo_kollektion_suchbegriff.py --zurueck          alte Werte aus dem Ledger wiederherstellen (SCHARF=1)
"""
import csv, datetime as dt, glob, os, re, sys, unicodedata

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

ORDNER = os.path.join(REPO, "dropship", "semrush")
LEDGER = os.path.join(ORDNER, "_seo_kollektion_ledger.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
SIE = re.compile(r"\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b")
FLOSKEL = re.compile(r"leistungsstark|\bbeste[nrs]?\b|hochwertig|perfekt|beeindruck|träume|\btraum|\bideal|optimal|premium|"
                     r"luxus|luxuriös|\bdein|\bdeine", re.I)
VERBOTEN = re.compile(r"chf|\d+[.,]\d0\b|schnell|express|bestseller|\btop\b|garantiert|gratis|kostenlos|\bsale\b|rabatt|"
                      r"heilt|wirkt|ß|!", re.I)
MEDIZIN = re.compile(r"therapie|heil|schmerz|orthes|bandage|massage|hörgerät|cellulite", re.I)
Q = "query($h:String!){c:collectionByHandle(handle:$h){id title seo{title description}}}"
M = "mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{seo{title description}} userErrors{field message}}}"


def norm(t):
    t = unicodedata.normalize("NFKC", t).lower().replace("ß", "ss")
    return re.sub(r"[\s\-–]+", " ", t).strip()


def pruefen(kw, t, x):
    f = []
    if len(t) > 60: f.append(f"Titel {len(t)} Zeichen")
    if not t.endswith(" | LuxeStyle"): f.append("Titel ohne « | LuxeStyle»")
    if norm(kw) not in norm(t): f.append("Titel ohne Suchbegriff")
    if not (110 <= len(x) <= 160): f.append(f"Text {len(x)} Zeichen")
    if norm(kw) not in norm(x): f.append("Text ohne Suchbegriff")
    for feld, s in (("Titel", t), ("Text", x)):
        for rx, name in ((FLOSKEL, "Floskel"), (VERBOTEN, "verboten"), (MEDIZIN, "Medizin")):
            m = rx.search(s)
            if m: f.append(f"{feld}: {name} «{m.group(0)}»")
        if SIE.search(s): f.append(f"{feld}: Sie-Form")
    return f


def schreiben(cid, t, x):
    r = gql(M, {"i": {"id": cid, "seo": {"title": t, "description": x}}})["collectionUpdate"]
    s = (r.get("collection") or {}).get("seo") or {}
    return (not r["userErrors"]) and s.get("title") == t and s.get("description") == x, r["userErrors"]


def zurueck():
    zeilen = [z.rstrip("\n").split("\t") for z in open(LEDGER, encoding="utf-8")] if os.path.exists(LEDGER) else []
    for f in zeilen:
        if len(f) < 7 or f[6] != "ok":
            continue
        c = gql(Q, {"h": f[1]})["c"]
        print(f"  {f[1]}: «{c['seo']['title']}» → «{f[3]}»" + ("" if SCHARF else " (trocken)"))
        if SCHARF and c:
            gut, err = schreiben(c["id"], f[3] or None, f[4] or None)
            print("    ok" if gut else f"    FEHLER {err}")


def main():
    if "--zurueck" in sys.argv:
        return zurueck()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    datei = args[0] if args else sorted(glob.glob(os.path.join(ORDNER, "kollektion_seo_final_*.tsv")))[-1]
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'} · {os.path.basename(datei)}", flush=True)
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[1] for z in open(LEDGER, encoding="utf-8") if z.rstrip("\n").endswith("\tok")}
    ok = geschrieben = fehler = 0
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for z in csv.DictReader(open(datei, encoding="utf-8"), delimiter="\t"):
        h, kw, t, x = z["handle"].strip(), z["keyword"].strip(), z["seo_titel"].strip(), z["seo_text"].strip()
        if h in erledigt:
            continue
        f = pruefen(kw, t, x)
        c = gql(Q, {"h": h})["c"]
        if not c:
            f.append("Kollektion nicht gefunden")
        print(f"  {'✓' if not f else '✗'} {h} [{kw}] «{t}» · {len(x)} Z." + (f" — {'; '.join(f)}" if f else ""))
        if f:
            fehler += 1
            continue
        ok += 1
        if SCHARF:
            alt = c["seo"] or {}
            gut, err = schreiben(c["id"], t, x)
            geschrieben += gut
            led.write(f"{dt.date.today()}\t{h}\t{kw}\t{alt.get('title') or ''}\t{(alt.get('description') or '').replace(chr(9), ' ')}\t"
                      f"{t}\t{'ok' if gut else 'FEHLER ' + str(err)}\n")
            led.flush()
    print(f"FERTIG: {ok} regelkonform · {geschrieben} geschrieben · {fehler} verworfen")


if __name__ == "__main__":
    main()
