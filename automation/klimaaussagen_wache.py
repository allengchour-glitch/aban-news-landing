#!/usr/bin/env python3
"""klimaaussagen_wache.py — unbelegte Klimaaussagen aus Produkttexten nehmen, auf Seiten melden (08.10.2026).

ANLASS (Plan Tag 9 «Versand-/Rückgabe-FAQ schärfen», Betreiber «weiter verbessern»). Seit 01.01.2025 gilt Art. 3 Abs. 1
lit. x UWG: Angaben über die Klimabelastung sind unlauter, wenn sie nicht durch objektive und überprüfbare Grundlagen
belegt werden können; die BAFU-Vollzugshilfe (03/2026) behandelt «klimaneutral» als nicht beweisbar. GEMESSEN 08.10.:
die öffentliche Versandseite versprach «spart CO2» und «Direkt-Versand reduziert Transport-CO2» (Ware kommt per Luftpost
aus Asien), 9 Gelato-Poster «klimaneutral gedruckt», ein Holzkocher «reduziert den CO2-Fussabdruck». Unser Beleg dafür: keiner.

REGEL: automation/data/klima_regel.json (EINE Datei, auch für den Importer cj_copy_prompt.mjs klimaSicher). Satzweise:
Ausnahme (Messgerät, CO2-Kartusche, «gibt CO2 frei») → bleibt; sonst Wort/Nebensatz weg («klimaneutral und»,
«, was den CO2-Fussabdruck reduziert»); bleibt danach eine Aussage, fällt der ganze Satz. Produkte: SCHARF=1 schreibt
descriptionHtml (Altwert im Ledger), Seiten/Blog/Kollektionen/Richtlinien: nur melden (Hand-Korrektur mit Sicherung).
Allgemeine Umweltwörter («umweltfreundlich», 476 Produkte) sind NICHT diese Klasse (lit. b, Lieferantenangaben) — offen.

  python3 automation/klimaaussagen_wache.py --kanarien
  python3 automation/klimaaussagen_wache.py                 # Trockenlauf über /tmp/seo_voll_export.jsonl (seo_voll_audit)
  SCHARF=1 python3 automation/klimaaussagen_wache.py        # Produkte schreiben + Seiten melden
"""
import html as htmlmod, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
REGEL = json.load(open(os.path.join(HIER, "data", "klima_regel.json"), encoding="utf-8"))
ANSPRUCH = re.compile(REGEL["anspruch"], re.I)
AUSNAHME = re.compile(REGEL["ausnahme"], re.I)
WORT_WEG = [(re.compile(a, re.I), b) for a, b in REGEL["wort_weg"]]
EXPORT = os.environ.get("EXPORT", "/tmp/seo_voll_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_klimaaussagen.tsv")
BERICHT = os.path.join(REPO, "dropship", "KLIMAAUSSAGEN.md")
SCHARF = os.environ.get("SCHARF") == "1"
BLOCK = re.compile(r"(<(p|li|h[1-6]|td|span|div|strong|em)\b[^>]*>)(.*?)(</\2>)", re.S | re.I)


def klartext(s):
    return re.sub(r"\s+", " ", htmlmod.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def ist_anspruch(satz):
    t = klartext(satz)
    return bool(ANSPRUCH.search(t)) and not AUSNAHME.search(t)


def satz_saeubern(satz):
    """Ein Satz (darf Inline-Tags tragen) → bereinigt, '' wenn er fallen muss."""
    if not ist_anspruch(satz):
        return satz
    neu = satz
    for rx, ers in WORT_WEG:
        neu = rx.sub(ers, neu)
    if ist_anspruch(neu):
        return ""
    a, b = klartext(satz), klartext(neu)
    if a[:1].isupper() and b[:1].islower():                # «Klimaneutral gedruckt …» → «Gedruckt …»
        i = neu.find(b[0])
        neu = neu[:i] + neu[i].upper() + neu[i + 1:]
    return neu


def text_saeubern(inner):
    teile = re.split(r"(?<=[.!?])(\s+)", inner)
    raus = []
    for i in range(0, len(teile), 2):
        s = satz_saeubern(teile[i])
        raus.append(s)
        if i + 1 < len(teile) and s.strip():
            raus.append(teile[i + 1])
    return "".join(raus).strip()


def saeubern(html):
    """HTML → (neu, geaendert). Nur Blöcke mit Aussage werden angefasst; leere <p>/<li> fallen."""
    if not any(ist_anspruch(s) for s in re.split(r"(?<=[.!?])\s+", klartext(html))):
        return html, False
    def blk(m):
        auf, tag, inner, zu = m.group(1), m.group(2), m.group(3), m.group(4)
        if re.search(r"<(p|li|div|h[1-6]|td)\b", inner, re.I):          # verschachtelter Block: innen bearbeiten
            return auf + BLOCK.sub(blk, inner) + zu
        if not ist_anspruch(inner) and not any(ist_anspruch(s) for s in re.split(r"(?<=[.!?])\s+", inner)):
            return m.group(0)
        neu = text_saeubern(inner)
        return "" if not klartext(neu) else auf + neu + zu
    neu = BLOCK.sub(blk, html)
    if any(ist_anspruch(s) for s in re.split(r"(?<=[.!?])\s+", klartext(neu))):   # ausserhalb jedes Blocks
        neu = text_saeubern(neu)
    neu = re.sub(r"<(ul|ol)\b[^>]*>\s*</\1>", "", neu)
    return neu, neu != html


def kanarien():
    ok = 0
    for text, soll_anspruch, soll_text in REGEL["kanarien"]:
        a = any(ist_anspruch(s) for s in re.split(r"(?<=[.!?])\s+", text))
        neu, _ = saeubern(f"<p>{text}</p>")
        ist_text = klartext(neu)
        gut = a == soll_anspruch and (soll_text is None or ist_text == soll_text)
        ok += gut
        if not gut:
            print(f"  ✗ {text!r}: Anspruch {a} (soll {soll_anspruch}) → {ist_text!r} (soll {soll_text!r})")
    print(f"KLIMA-KANARIEN {ok}/{len(REGEL['kanarien'])}")
    return ok == len(REGEL["kanarien"])


def produkte_pruefen():
    from kaufwille_zeile import gql
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 30 * 3600:
        print(f"PAUSE: {EXPORT} fehlt oder ist älter als 30 h (entsteht im seo_voll_audit)"); return None
    plan = []
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        h = p.get("descriptionHtml") or ""
        neu, geaendert = saeubern(h)
        if geaendert:
            plan.append((p["id"], p.get("handle", ""), h, neu))
    print(f"Produkte mit Klimaaussage: {len(plan)}")
    for pid, hd, alt, neu in plan[:40]:
        print(f"  {hd[:55]:55} − {len(klartext(alt)) - len(klartext(neu))} Zeichen")
    gesetzt = fehler = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as led:
            for pid, hd, alt, neu in plan:
                r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id descriptionHtml} userErrors{message}}}',
                        {"p": {"id": pid, "descriptionHtml": neu}})
                pu = r["productUpdate"]
                zurueck = ((pu or {}).get("product") or {}).get("descriptionHtml") or ""
                st = "gesetzt" if pu and not pu["userErrors"] and not saeubern(zurueck)[1] else "fehler"
                gesetzt += st == "gesetzt"; fehler += st == "fehler"
                led.write("\t".join([pid.split("/")[-1], st, hd, time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()),
                                     json.dumps(alt, ensure_ascii=False)]) + "\n")
    return len(plan), gesetzt, fehler


def seiten_pruefen():
    """Veröffentlichte Seiten, Blogartikel, Kollektionen, Richtlinien — nur melden."""
    from kaufwille_zeile import gql
    funde = []
    def zeig(art, h, body):
        for s in re.split(r"(?<=[.!?])\s+|\n", klartext(body)):
            if ist_anspruch(s):
                funde.append((art, h, s[:160]))
    for art, feld, filt in (("Seite", "pages", "isPublished"), ("Artikel", "articles", "isPublished")):
        cur = None
        while True:
            d = gql('query($c:String){%s(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{handle isPublished body}}}' % feld,
                    {"c": cur})[feld]
            for n in d["nodes"]:
                if n[filt]:
                    zeig(art, n["handle"], n["body"])
            if not d["pageInfo"]["hasNextPage"]:
                break
            cur = d["pageInfo"]["endCursor"]
    cur = None
    while True:
        d = gql('query($c:String){collections(first:200,after:$c){pageInfo{hasNextPage endCursor} nodes{handle descriptionHtml}}}',
                {"c": cur})["collections"]
        for n in d["nodes"]:
            zeig("Kollektion", n["handle"], n["descriptionHtml"])
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    for x in gql('{shop{shopPolicies{type body}}}')["shop"]["shopPolicies"]:
        zeig("Richtlinie", x["type"], x["body"])
    return funde


def main():
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    if not kanarien():
        print("PAUSE: Kanarienvögel scheitern — nichts geschrieben"); sys.exit(1)
    pr = produkte_pruefen()
    funde = seiten_pruefen()
    stand = time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime())
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Klimaaussagen — Stand {stand}\n\nRegel: `automation/data/klima_regel.json` (Art. 3 Abs. 1 lit. x UWG). "
                "Produkte bereinigt `klimaaussagen_wache.py` selbst; Seiten unten bitte von Hand (mit Sicherung).\n\n")
        f.write(f"Produkte: {pr if pr is not None else 'Export fehlt'}\n\n## Veröffentlichte Seiten/Texte mit Klimaaussage ({len(funde)})\n\n")
        for art, h, s in funde:
            f.write(f"- {art} `{h}`: «{s}»\n")
    for art, h, s in funde:
        print(f"  ⚠️ {art} {h}: {s[:120]}")
    if pr is None:
        print(f"PAUSE: Produkte ungeprüft · Seiten {len(funde)}")
    else:
        n, g, fe = pr
        print(f"FERTIG: KLIMA Produkte {n}{f' · gesetzt {g} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · Seiten {len(funde)}")


if __name__ == "__main__":
    main()
