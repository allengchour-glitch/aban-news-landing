#!/usr/bin/env python3
"""masstabelle_probe.py — Messung: liefert CJ für unsere Mode eine Masstabelle (cm), die wir nicht zeigen? (09.10.2026)

ANLASS («weiter», 09.10.): Die Seite mit dem meisten Kaufwillen ohne Kauf (Leinen-Set «Provence», 41 Sitzungen, 2 Warenkörbe,
0 Käufe) zeigt nur die allgemeine Theme-Tabelle (Richtwerte) und «Asiatische Konfektion fällt kleiner aus – bitte eine Grösse
grösser wählen». Bei CJ liegt die echte Tabelle (Bust/Length/Waist/Relax/Sleeve je Grösse in cm) als BILD in der
Produktbeschreibung — unser Importer übernimmt nur `productImageSet`, nicht die Beschreibungsbilder. Für Mode ohne Anprobe
ist die Masstabelle das wichtigste Kaufargument.

WAS GEMESSEN WIRD (nur lesen, nichts schreiben): Stichprobe aktiver CJ-Mode mit Grössen-Option (Standard 40, jüngste zuerst
gemischt mit Zufall), je Produkt EIN CJ-Abruf, OCR der Beschreibungsbilder (tesseract eng; kleines Bild ×4 vergrössern,
Schwelle 150, --psm 11 — am Provence-Bild 386×205 px kalibriert: ohne Vergrösserung 0 Treffer, so 6 Messwörter + 30 Zahlen).
Tabelle = ≥ 2 Messwörter (bust/length/waist/hip/sleeve/shoulder/chest/inseam/thigh/relax) UND ≥ 12 Zahlen (2–3 Stellen).
Ergebnis: dropship/MASSTABELLE-PROBE.md + dropship/_masstabelle_probe.json (Grundlage für den Nachrüst-Entscheid).
Läuft im CJ-Vorrang-Fenster (cj_takt VORRANG_SKRIPTE), das Tagesbudget ist sonst ab ~04 UTC leer.
ENV: N=40 · SEED=<Zahl>
"""
import json, os, random, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from PIL import Image  # noqa: E402

N = int(os.environ.get("N") or 40)
TMP = "/tmp/masstabelle_probe"
BERICHT = os.path.join(REPO, "dropship", "MASSTABELLE-PROBE.md")
ROH = os.path.join(REPO, "dropship", "_masstabelle_probe.json")
MESSWORT = re.compile(r"(bust|length|waist|sleeve|relax|hip|hips|shoulder|chest|inseam|thigh)", re.I)


def ocr_tabelle(pfad):
    """(messwörter, zahlen) oder None. Kalibriert am Provence-Bild (386×205 px)."""
    os.makedirs(TMP, exist_ok=True)
    try:
        im = Image.open(pfad).convert("L")
    except Exception:
        return None
    w, h = im.size
    k = 4 if max(w, h) < 900 else (2 if max(w, h) < 1600 else 1)
    big = im.resize((w * k, h * k), Image.BICUBIC)
    woerter, zahlen = set(), 0
    for thr in (150, None):
        b = big if thr is None else big.point(lambda v: 255 if v > thr else 0)
        b.save(f"{TMP}/_t.png")
        try:
            t = subprocess.run(["tesseract", f"{TMP}/_t.png", "-", "--psm", "11"], capture_output=True, text=True,
                               timeout=90, env={**os.environ, "OMP_THREAD_LIMIT": "1"}).stdout
        except subprocess.TimeoutExpired:
            continue
        woerter |= {x.lower() for x in MESSWORT.findall(t)}
        zahlen = max(zahlen, len(re.findall(r"\b\d{2,3}(?:\.\d)?\b", t)))
    return woerter, zahlen


def ist_tabelle(r):
    return bool(r) and len(r[0]) >= 2 and r[1] >= 12


def kandidaten(gql):
    """Aktive CJ-Mode mit Grössen-Option: die 250 jüngsten + 250 aus der Mitte des Bestands, daraus N gemischt."""
    q = ('query($a:String,$r:Boolean){products(first:250,after:$a,reverse:$r,sortKey:CREATED_AT,query:"status:active '
         '(tag:damen-mode OR tag:herren-mode OR tag:kleid OR tag:damen OR tag:herren)"){pageInfo{hasNextPage endCursor} '
         'nodes{id handle title options{name} variants(first:1){nodes{sku}}}}}')
    pool = []
    for rev in (True, False):
        r = gql(q, {"a": None, "r": rev})["products"]
        pool += r["nodes"]
    out = []
    for p in pool:
        sku = (p["variants"]["nodes"] or [{}])[0].get("sku") or ""
        if sku.upper().startswith("CJ") and any(o["name"].lower().startswith(("grö", "gro", "size")) for o in p["options"]):
            out.append((p, sku))
    random.seed(int(os.environ.get("SEED") or time.strftime("%Y%m%d")))
    random.shuffle(out)
    return out[:N]


def main():
    from kaufwille_zeile import gql
    from cj_stecker_pruefen import cj, cj_url        # Takt + Retry + Tagesbudget → SystemExit
    os.makedirs(TMP, exist_ok=True)
    kand = kandidaten(gql)
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(kand)} CJ-Modeprodukte mit Grössen-Option", flush=True)
    erg = []
    for p, sku in kand:
        d = cj(cj_url(sku))
        x = (d or {}).get("data") or {}
        if not x:
            erg.append({"handle": p["handle"], "titel": p["title"], "cj": "keine Antwort"}); continue
        dimgs = re.findall(r'<img[^>]+src="([^"]+)"', x.get("description") or "")
        pset = {u.split("?")[0] for u in (x.get("productImageSet") or [])}
        chart = None
        for i, u in enumerate(dimgs[:14]):
            f = f"{TMP}/_d{i}.jpg"
            subprocess.run(["curl", "-s", "--max-time", "30", "-o", f, u])
            if ist_tabelle(ocr_tabelle(f)):
                chart = u
                break
        erg.append({"handle": p["handle"], "titel": p["title"], "desc_bilder": len(dimgs), "tabelle": chart,
                    "in_produktbildern": bool(chart and chart.split("?")[0] in pset)})
        print(f"  {'📏' if chart else '· '} {p['title'][:60]}", flush=True)
    n = sum(1 for e in erg if "tabelle" in e)
    mit = [e for e in erg if e.get("tabelle")]
    drin = sum(1 for e in mit if e["in_produktbildern"])
    json.dump(erg, open(ROH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Masstabellen bei CJ — Stichprobe {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Werkzeug `automation/masstabelle_probe.py` (nur lesen). CJ-Mode mit Grössen-Option geprüft: **{n}** · mit "
                f"Masstabelle (Bild in der CJ-Beschreibung, OCR): **{len(mit)}** · davon schon in unseren Produktbildern: "
                f"**{drin}**.\n\nEntscheid danach: liegt der Anteil «Tabelle bei CJ, nicht bei uns» hoch, das Tabellenbild als "
                f"letztes Produktbild nachrüsten (Alt «Masstabelle (cm)») + Importer übernimmt es künftig.\n\n## Mit Tabelle\n\n")
        for e in mit:
            f.write(f"- `{e['handle']}` — {e['titel']} · {'schon da' if e['in_produktbildern'] else '**fehlt bei uns**'} · {e['tabelle']}\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {n} geprüft, {len(mit)} mit Masstabelle bei CJ, "
          f"{drin} davon schon in unseren Bildern", flush=True)


if __name__ == "__main__":
    main()
