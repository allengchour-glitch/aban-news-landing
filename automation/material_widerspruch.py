#!/usr/bin/env python3
"""material_widerspruch.py — Titel verspricht ein echtes Material, die Materialangabe sagt ausdrücklich Ersatz (08.10.2026).

ANLASS (Betreiber «weiter sauber machen»): GEMESSEN am Voll-Export (51'720 aktive): 38 Produkte mit «Leder» im Titel
(«Mädchen Lederschuhe», «Leder Aktenkoffer», «Kurze Lederjacke») und «Material: PU-Leder / PU / Lederimitat» in den
Produktdetails, dazu «Kissenbezug aus Wolle» bei 100 % Acryl, «Seiden-Slipdress» bei Polyester, «Ladegerät aus Holz» bei
ABS, «Kupfer-925 Silber» bei versilbertem Kupfer. Wer Leder kauft und Plastik bekommt, schickt zurück — und eine falsche
Materialbezeichnung ist irreführend (UWG Art. 3 Abs. 1 lit. b). Bei 9 Produkten widerspricht sich schon der Lieferant
(«aus echtem Rindsleder» im Text, «PU-Leder» als Material): dann gilt die vorsichtigere Angabe — kein Leder-Versprechen.

REGEL (nur Leder wird automatisch umgeschrieben, alle anderen Materialien nur gemeldet):
  Treffer = Titel nennt Leder (ohne «PU», «Kunst-», «-imitat», «vegan», «Optik», «Wildleder-Obermaterial» in der Angabe)
            ∧ Materialzeile nennt PU/Kunstleder/Polyurethan/Lederimitat/synthetisch ∧ kein echtes Leder in der Materialzeile.
  Titel: kunstleder_titel() — «aus (gewaschenem) Leder» → «aus (gewaschenem) Kunstleder», «Leder-» → «Kunstleder-»,
         «Lederschuhe» → «Kunstlederschuhe», «Rindleder/Echtleder/Vollnarbenleder» → «Kunstleder».
  Text:  Behauptungen «echtem (Rinds)Leder», «Echtleder», «Rindsleder», «aus (hochwertigem) Leder» → Kunstleder.
  Handverlesene Fassungen (schönere Titel) in automation/data/material_widerspruch.json → «von_hand» gewinnt.
DRY (Standard) zeigt den Plan; SCHARF=1 schreibt (Titel, Text, SEO-Titel), liest zurück. Ledger
dropship/_material_widerspruch.tsv (id, alt_titel, neu_titel). Bericht dropship/MATERIAL-WIDERSPRUCH.md.
Quelle: /tmp/versprechen_export.jsonl (Bulk von versprechen_wache.py, < 30 h) — sonst eigener Export.
  python3 automation/material_widerspruch.py --selbsttest
"""
import json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
SCHARF = os.environ.get("SCHARF") == "1"
DATEN = json.load(open(os.path.join(HIER, "data", "material_widerspruch.json"), encoding="utf-8"))
LEDGER = os.path.join(REPO, "dropship", "_material_widerspruch.tsv")
BERICHT = os.path.join(REPO, "dropship", "MATERIAL-WIDERSPRUCH.md")

MATERIALZEILE = re.compile(r"Material:\s*([^·|\n]{2,80}?)(?:\s{2,}|Gewicht:|Muster:|Farbe:|Grösse:|Stil:|Masse:|$)")
TITEL_LEDER = re.compile(r"leder", re.I)
TITEL_SCHON_EHRLICH = re.compile(r"\bpu\b|kunst-?leder|lederimitat|kunstleder|vegan|faux|optik|look|imitat|öko-?leder", re.I)
ERSATZ = re.compile(r"\bpu\b|pu-?leder|kunstleder|polyurethan|lederimitat|synthetisch\w*\s+(?:leder|pu)|synthetisches leder", re.I)
ECHT_IN_MATERIAL = re.compile(r"(?<![a-z])(?:echt|rinds?|kalbs|schafs|ziegen|vollnarben|nappa|wild)?leder(?![a-z])", re.I)
ANDERE = {   # nur melden
    "wolle": (re.compile(r"\bwolle\b|\bwoll-|merino|schurwolle", re.I), re.compile(r"^\s*(?:100\s*%\s*)?(?:acryl|polyester)", re.I), re.compile(r"wolle", re.I)),
    "seide": (re.compile(r"\bseide\b|\bseiden-|maulbeerseide", re.I), re.compile(r"polyester|kunstseide|satin", re.I), re.compile(r"(?<!kunst)seide", re.I)),
    "holz": (re.compile(r"\bholz\b|massivholz|echtholz", re.I), re.compile(r"^\s*(?:abs|kunststoff|plastik|pvc|pp|mdf)\b", re.I), re.compile(r"holz|bambus", re.I)),
    "silber": (re.compile(r"925|sterling", re.I), re.compile(r"kupfer|messing|legierung|zink", re.I), re.compile(r"925|sterling", re.I)),
}
ANDERE_AUSN = re.compile(r"optik|look|gefühl|haptik|print|seidenmatt|seidig|leine|halsband|hunde|katzen|für (?:glas|holz|seide)", re.I)


def kunstleder_titel(t):
    """Leder-Versprechen im Titel → Kunstleder (deterministisch, für Neuzugänge)."""
    VOR = r"(?:(?:Echt|Rinds?|Kalbs|Vollnarben|Vollschale|Nappa)[- ]?)*"
    n = t
    n = re.sub(r"\b(aus\s+(?:\w+(?:em|er)\s+)?)" + VOR + r"[Ll]eder\b", r"\1Kunstleder", n)
    n = re.sub(r"\b(?:Echt|Rinds?|Kalbs|Vollnarben|Nappa)[- ]?leder\b", "Kunstleder", n)
    n = re.sub(r"\bLeder(?=-\w)", "Kunstleder", n)
    n = re.sub(r"\bLeder(?=[a-zäöü])", "Kunstleder", n)
    n = re.sub(r"\bLeder\b(?=\s+[A-ZÄÖÜ])", "Kunstleder", n)
    n = re.sub(r"(?<=[a-zäöü])(?<![Kk]unst)leder(?=[a-zäöü]|\b)", "-Kunstleder", n)   # «Flachledertasche» → «Flach-Kunstledertasche»
    n = re.sub(r"--+", "-", n)
    return n


TEXT_REGELN = [
    (re.compile(r"\baus\s+(?:hochwertigem\s+|echtem\s+|weichem\s+|glattem\s+)?(?:echtem\s+)?(?:(?:Echt|Rinds?|Kalbs|Vollnarben|Vollschale)[- ]?)*[Ll]eder\b"), "aus Kunstleder"),
    (re.compile(r"\b(?:hochwertigem\s+)?Echtleder\b"), "Kunstleder"),
    (re.compile(r"\becht(?:em|es|er|en)?\s+(?:Rinds?|Kalbs)?[Ll]eder\b"), "Kunstleder"),
    (re.compile(r"\b(?:zweilagigem\s+)?Rinds?leder\b"), "Kunstleder"),
]


def text_kunstleder(h):
    n = h
    for rx, e in TEXT_REGELN:
        n = rx.sub(e, n)
    return n


def befund(p):
    """→ (klasse, materialzeile) | None"""
    t = p["title"]; h = re.sub(r"<[^>]+>", " ", p.get("descriptionHtml") or "")
    m = MATERIALZEILE.search(h)
    if not m:
        return None
    mat = m.group(1).strip().lower()
    if TITEL_LEDER.search(t) and not TITEL_SCHON_EHRLICH.search(t) and ERSATZ.search(mat) \
            and not ECHT_IN_MATERIAL.search(re.sub(r"pu-?leder|polyurethan-?leder|kunstleder|synthetisches leder|wildleder-obermaterial", "", mat)) \
            and not re.search(r"wildleder-?obermaterial", mat):
        return "leder", mat
    if not ANDERE_AUSN.search(t):
        for k, (rt, rm, echt) in ANDERE.items():
            if rt.search(t) and rm.search(mat) and not echt.search(mat):
                return k, mat
    return None


def selbsttest():
    f = 0
    for ein, soll in DATEN["kanarien_titel"]:
        ist = kunstleder_titel(ein)
        if ist != soll:
            f += 1; print(f"  ✗ Titel {ein!r} → {ist!r} (soll {soll!r})")
    for ein, soll in DATEN["kanarien_text"]:
        ist = text_kunstleder(ein)
        if ist != soll:
            f += 1; print(f"  ✗ Text {ein!r} → {ist!r} (soll {soll!r})")
    for titel, mat, soll in DATEN["kanarien_befund"]:
        b = befund({"title": titel, "descriptionHtml": f"<p>Material: {mat}</p>"})
        if (b[0] if b else None) != soll:
            f += 1; print(f"  ✗ Befund {titel!r} / {mat!r} → {b} (soll {soll!r})")
    n = len(DATEN["kanarien_titel"]) + len(DATEN["kanarien_text"]) + len(DATEN["kanarien_befund"])
    print(f"Selbsttest: {n - f}/{n} ok")
    return f == 0


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if not selbsttest():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    import versprechen_wache as vw
    if not (os.path.exists(vw.CACHE) and time.time() - os.path.getmtime(vw.CACHE) < 30 * 3600):
        vw.export()
    from kollektionstexte_nachbessern import gql
    hand = DATEN.get("von_hand", {})
    plan, melden = [], []
    for p in vw.produkte():
        b = befund(p)
        if not b:
            continue
        k, mat = b
        if k != "leder":
            if p["handle"] in hand:
                plan.append((p, k, mat))
            else:
                melden.append((p, k, mat))
            continue
        plan.append((p, k, mat))
    ok = fehl = 0
    zeilen = []
    for p, k, mat in plan:
        h = hand.get(p["handle"], {})
        if h.get("skip"):
            continue
        neu_t = h.get("titel") or kunstleder_titel(p["title"])
        html = p.get("descriptionHtml") or ""
        neu_h = html
        for a, b in h.get("text", []):
            neu_h = neu_h.replace(a, b)
        if k == "leder":
            neu_h = text_kunstleder(neu_h)
        if neu_t == p["title"] and neu_h == html:
            continue
        zeilen.append(f"- `{p['handle']}` ({k}, Material «{mat[:40]}»): «{p['title']}» → «{neu_t}»" + (" · Text angepasst" if neu_h != html else ""))
        print(f"  {k:6} {p['title'][:55]:55} → {neu_t[:60]}" + ("  [+Text]" if neu_h != html else ""), flush=True)
        if not SCHARF:
            ok += 1; continue
        seo = p.get("seo") or {}
        eingabe = {"id": p["id"], "title": neu_t}
        if neu_h != html:
            eingabe["descriptionHtml"] = neu_h
        if seo.get("title") and re.search(r"leder|wolle|seide|holz|925|silber", seo["title"], re.I):
            eingabe["seo"] = {"title": neu_t[:70], "description": seo.get("description")}
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title} userErrors{message}}}", {"p": eingabe})["productUpdate"]
        if r["userErrors"] or (r.get("product") or {}).get("title") != neu_t:
            fehl += 1; print("    ⛔", r["userErrors"]); continue
        ok += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{p['id']}\t{p['title']}\t{neu_t}\t{time.strftime('%Y-%m-%d')}\n")
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Material-Widerspruch Titel ↔ Materialangabe — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Regel: `automation/material_widerspruch.py` (Leder automatisch, Rest gemeldet). "
                f"{'Geändert' if SCHARF else 'Zu ändern'}: {ok} · Fehler: {fehl} · nur gemeldet: {len(melden)}\n\n## Änderungen\n\n"
                + "\n".join(zeilen) + "\n\n## Nur gemeldet (Sichtprüfung)\n\n"
                + "\n".join(f"- `{p['handle']}` ({k}): «{p['title']}» — Material «{m[:50]}»" for p, k, m in melden) + "\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {ok} {'geändert' if SCHARF else 'zu ändern'}, {fehl} Fehler, {len(melden)} gemeldet")


if __name__ == "__main__":
    main()
