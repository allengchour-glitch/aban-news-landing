#!/usr/bin/env python3
"""dein_bezug.py — «dein Design» am Satzanfang heisst fast immer «das Design (der Ware)» (09.10.2026, Betreiber «weiter»).

ANLASS: GEMESSEN am Export 05:01 UTC: 596 aktive Beschreibungen (599 Stellen) beginnen einen Satz mit kleinem «dein/deine».
Quelle ist kollektionstexte_du_form.um(): «Ihr» → «dein» ohne Blick auf den Satzanfang. Am Satzanfang ist «Ihr» aber oft
«ihr/sein» = der Ware: «Ihr minimalistisches Design …» (die Maske), «Ihr schlanker Schnitt …» (die Hose). Ergebnis im Shop:
223× «dein … Design», 33× «dein … Schnitt», 26× «deine … Grösse», 12× «dein Gehäuse», «dein mechanisches Uhrwerk» — die
Kundin wird als Besitzerin eines Uhrwerks angesprochen, und der Satz beginnt klein. Nur ~15 % meinen wirklich sie
(«deine Katze liebt es …», «dein Kunstdruck wird ungerahmt geliefert»).
REGEL (automation/data/dein_bezug_regel.json): Satzanfang + «dein/deine/deiner» + bis zu 2 Adjektive + Nomen.
  Nomen der Kundin (Liste) → nur gross («Dein»). Merkmal der Ware → bestimmter Artikel: «deine …» → «Die …» (Adjektiv bleibt),
  «dein …es N» → «Das …e N», «dein …er N» → «Der …e N», «dein N» → Geschlecht aus der Nomen-Endung (Liste); unklar → bleibt
  und wird gemeldet. «deinem/deinen/deines» am Satzanfang → nur gemeldet.
QUELLE: `ihr_satzanfang()` wird in kollektionstexte_du_form.um() VOR dem Ihr→dein-Tausch aufgerufen (gleiche Regel).
WÄCHTER: täglich im Aufseher (VSW, gleicher Export), Beschreibung + SEO-Beschreibung, live entschieden, Ledger
dropship/_dein_bezug.tsv, Bericht dropship/DEIN-BEZUG.md.
  python3 automation/dein_bezug.py --kanarien · (trocken) · SCHARF=1 python3 automation/dein_bezug.py
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
R = json.load(open(os.path.join(HIER, "data", "dein_bezug_regel.json"), encoding="utf-8"))
SCHARF = os.environ.get("SCHARF") == "1"
EXPORT = os.environ.get("EXPORT") or "/tmp/versprechen_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_dein_bezug.tsv")
BERICHT = os.path.join(REPO, "dropship", "DEIN-BEZUG.md")
POD = re.compile(r"printful|\bpod\b|selbst-gestalten|editor", re.I)
KUNDIN = set(R["kundin"])
NEUTR = re.compile(R["neutrum_endung"] + r"$", re.I)
MASK = re.compile(R["maskulin_endung"] + r"$", re.I)
ADVERB = {"immer", "wieder", "weiter", "aber", "oder", "unter", "über", "hinter", "später", "vorher", "nachher", "leider",
          "sicher", "besonders", "extra", "super"}
ANFANG = r"(?:(?<=[.!?]\s)|(?<=[.!?])|(?<=<p>)|(?<=<li>)|(?<=<br>)|^)"
NACH = r"\s+(?P<adj>(?:[a-zäöü][\wäöüß-]*\s+|[A-ZÄÖÜ]-[a-zäöüß-]+(?:es|er|e|en)\s+){0,3})(?P<n>[A-ZÄÖÜ][\wäöüß-]*)"
KLEIN = re.compile(ANFANG + r"(?P<pos>dein(?:e[mnrs]?)?)" + NACH)
GROSS_IHR = re.compile(ANFANG + r"(?P<pos>Ihr(?:e[mnrs]?)?)" + NACH)


def _artikel(pos, adj, n):
    """→ Ersatz für «pos adj n» oder None (unklar)."""
    p = pos.lower()
    if n in KUNDIN or p == "deiner" or p == "ihrer":
        return None if p in ("deinem", "deinen", "deines", "ihrem", "ihren", "ihres") else "K"
    if p in ("deinem", "deinen", "deines", "ihrem", "ihren", "ihres"):
        return None
    worte = adj.split()
    if p in ("deine", "ihre"):
        return "Die " + (adj if adj else "") + n
    # «dein/Ihr» = Nominativ maskulin oder neutrum
    letzt = worte[-1] if worte else ""
    if letzt.endswith("es"):
        art = "Das"
    elif letzt.endswith("er"):
        art = "Der"
    elif not worte and NEUTR.search(n):
        art = "Das"
    elif not worte and MASK.search(n):
        art = "Der"
    else:
        return None
    neu = [w[:-1] if (w.endswith("es") or w.endswith("er")) and len(w) > 4 and w not in ADVERB else w for w in worte]
    return " ".join([art] + neu + [n])


def _ersetze(m, gross_ihr=False, gemeldet=None):
    pos, adj, n = m.group("pos"), m.group("adj"), m.group("n")
    r = _artikel(pos, adj, n)
    if r == "K":
        neu_pos = ("D" + pos[1:]) if not gross_ihr else ("Dein" + pos[3:])
        return neu_pos + " " + adj + n
    if r is None:
        if gemeldet is not None:
            gemeldet.append(m.group(0))
        if gross_ihr:
            return "Dein" + pos[3:] + " " + adj + n          # bisheriges Verhalten (Ihr→dein), aber gross am Satzanfang
        return "D" + pos[1:] + " " + adj + n                # unklar: Bezug bleibt, aber nie klein am Satzanfang
    return r


def repariere(text, gemeldet=None):
    """Kleines «dein…» am Satzanfang → Artikel (Ware) oder gross (Kundin)."""
    if not text or "dein" not in text:
        return text
    return KLEIN.sub(lambda m: _ersetze(m, False, gemeldet), text)


def ihr_satzanfang(text):
    """QUELLE (kollektionstexte_du_form.um, vor Ihr→dein): «Ihr minimalistisches Design» → «Das minimalistische Design»,
    «Ihre Haut» → «Deine Haut». Unklar → «Dein …» (gross; vorher klein)."""
    if not text or "Ihr" not in text:
        return text
    return GROSS_IHR.sub(lambda m: _ersetze(m, True), text)


def kanarien(still=False):
    f = 0
    for alt, soll in R["kanarien"]:
        ist = repariere(alt)
        if ist != soll:
            f += 1
            print(f"  ✗ {alt!r}\n      ist  {ist!r}\n      soll {soll!r}")
    # Quelle: dieselben Fälle mit grossem «Ihr»
    for alt, soll in [("Kompakt. Ihre kompakte Grösse hilft.", "Kompakt. Die kompakte Grösse hilft."),
                      ("Weich. Ihr minimalistisches Design passt.", "Weich. Das minimalistische Design passt."),
                      ("Pflege. Ihre Haut fühlt sich weich an.", "Pflege. Deine Haut fühlt sich weich an."),
                      ("Hallo. Ihr Unbekanntes Ding.", "Hallo. Dein Unbekanntes Ding."),
                      ("Wir lieben Ihr Zuhause.", "Wir lieben Ihr Zuhause.")]:
        ist = ihr_satzanfang(alt)
        if ist != soll:
            f += 1
            print(f"  ✗ [Quelle] {alt!r}\n      ist  {ist!r}\n      soll {soll!r}")
    if not still:
        print(f"DEIN-KANARIEN {len(R['kanarien']) + 5 - f}/{len(R['kanarien']) + 5}")
    return f == 0


Q = 'query($id:ID!){product(id:$id){id title status tags descriptionHtml seo{title description}}}'


def main():
    if not kanarien():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if "--kanarien" in sys.argv:
        return 0
    from kaufwille_zeile import gql
    kand = []
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" in o or "title" not in o:
            continue
        d = o.get("descriptionHtml") or ""; sd = (o.get("seo") or {}).get("description") or ""
        if repariere(d) != d or repariere(sd) != sd:
            kand.append(o["id"])
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(kand)} Kandidaten · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    st = collections.Counter(); bsp = []; unklar = collections.Counter()
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for pid in kand:
        p = gql(Q, {"id": pid})["product"]
        if not p or p["status"] != "ACTIVE" or POD.search(" ".join(p.get("tags") or [])):
            continue
        gem = []
        d = p.get("descriptionHtml") or ""; dn = repariere(d, gem)
        seo = p.get("seo") or {}; sd = seo.get("description") or ""; sdn = repariere(sd, gem)
        for g in gem:
            unklar[g.split()[-1]] += 1
        if (dn, sdn) == (d, sd):
            continue
        st["produkte"] += 1
        st["stellen"] += sum(1 for _ in KLEIN.finditer(d)) - sum(1 for _ in KLEIN.finditer(dn))
        if len(bsp) < 25:
            m = KLEIN.search(d)
            if m:
                bsp.append(f"«{m.group(0)}» → «{_ersetze(m)}» ({p['title'][:40]})")
        if not SCHARF:
            continue
        inp = {"id": pid}
        if dn != d:
            inp["descriptionHtml"] = dn
        if sdn != sd:
            inp["seo"] = {"title": seo.get("title") or None, "description": sdn or None}
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{message}}}", {"p": inp})
        ok = not r["productUpdate"]["userErrors"]
        st["ok" if ok else "fehler"] += 1
        led.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), pid, p["title"][:60], "ok" if ok else "FEHLER"]) + "\n")
        led.flush(); time.sleep(0.25)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# «dein» am Satzanfang — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Werkzeug `automation/dein_bezug.py`, Regel `automation/data/dein_bezug_regel.json`, Quelle repariert in "
                f"`kollektionstexte_du_form.um()` (`ihr_satzanfang`). {'Geändert' if SCHARF else 'Zu ändern'}: {dict(st)}\n\n"
                f"## Beispiele\n\n" + "\n".join(f"- {b}" for b in bsp) +
                "\n\n## Unklar (bleibt, Nomen in die Regeldatei aufnehmen)\n\n" +
                "\n".join(f"- {n} ({c}×)" for n, c in unklar.most_common(40)) + "\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {dict(st)} · unklar {sum(unklar.values())}", flush=True)
    return 1 if st["fehler"] else 0


if __name__ == "__main__":
    sys.exit(main())
