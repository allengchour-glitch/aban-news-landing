#!/usr/bin/env python3
"""Test für tools/buero/dashboard/bauen.py: ohne Browser, ohne Netz.

    python3 -I tools/buero/dashboard/test_bauen.py

Prüft das Bauergebnis (drei Abschnitte, Büro unverändert eingebettet, eindeutige Namen, Grösse unter der Grenze des Dashboards)
und dass die Schutzprüfungen des Baus anschlagen. Der Browsertest der fertigen Seite ist test_dashboard.mjs (braucht Playwright).
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import bauen as B  # noqa: E402

FEHLER, GEPRUEFT = [], [0]


def pruefe(name, ok, info=None):
    GEPRUEFT[0] += 1
    if not ok:
        FEHLER.append(name)
        print(f"FEHLER: {name}" + (f"\n        {info!r}" if info is not None else ""))


def wirft(fn, wort):
    try:
        fn()
    except B.Baufehler as ex:
        return wort in str(ex)
    return False


def anmeldungen(text):
    """Namen, unter denen ein Skript Zeichnungen anmeldet (dash.draw mit zweitem Argument), mit Wiederholungen."""
    return re.findall(r"dash\.draw\(\s*'([^']+)'\s*,", text)


def main():
    d = B.bauen()
    index = d["index.html"]
    buero = B.QUELLE_BUERO.read_text(encoding="utf-8")
    pruefe("Fünf Dateien: die Seite und je Stil und Skript der zwei neuen Seiten",
           sorted(d) == ["index.html", "lx-offen.css", "lx-offen.js", "lx-suche.css", "lx-suche.js"], sorted(d))
    pruefe("Die Seite beginnt mit der Meta-Zeile «ein Schreiber» und trägt sie genau einmal", index.startswith(B.META + "\n") and index.count(B.META) == 1)
    abschnitte = re.findall(r'<section class="lx-seite" id="([\w-]+)" data-lx-seite="(\w+)"( hidden)?>', index)
    pruefe("Drei Abschnitte in fester Reihenfolge, nur das Büro ist offen",
           abschnitte == [("buero", "buero", ""), ("offen", "offen", " hidden"), ("suche", "suche", " hidden")], abschnitte)
    pruefe("Jeder Abschnitt trägt den Namen seines Links als id (nur dann nennt das Dashboard Claude den Ort, an dem jemand ist)",
           [a[0] for a in abschnitte] == [k for k, _ in B.SEITEN] and all(index.count(f'id="{k}"') == 1 for k, _ in B.SEITEN), abschnitte)
    knoepfe = re.findall(r'<button type="button" class="lx-tab" id="lx-tab-(\w+)" data-lx-ziel="(\w+)" aria-current="(\w+)">([^<]+)</button>', index)
    pruefe("Drei Knöpfe mit festem Text im HTML, der erste ist markiert",
           knoepfe == [("buero", "buero", "page", "KI-Büro"), ("offen", "offen", "false", "Offene Punkte"), ("suche", "suche", "false", "Suchanfragen")], knoepfe)
    pruefe("Die Büro-Seite steht unverändert in ihrem Abschnitt (Zeichen für Zeichen)", buero[len(B.META):].strip("\n") in index)

    a, b, c = index.index('<section class="lx-seite" id="buero"'), index.index('<section class="lx-seite" id="offen"'), index.index('<section class="lx-seite" id="suche"')
    ende = index.index('<script src="lx-offen.js">')
    teil_offen, teil_suche = index[b:c], index[c:ende]
    pruefe("Reihenfolge: Büro, Offene Punkte, Suchanfragen, dann die Skripte der neuen Seiten, dann die Hülle",
           a < b < c < ende < index.index('<script src="lx-suche.js">') < index.index("const LX_SEITEN"))
    pruefe("Die Stile der neuen Seiten hängen als eigene Dateien vor dem ersten Abschnitt",
           index.index('<link rel="stylesheet" href="lx-offen.css">') < index.index('<link rel="stylesheet" href="lx-suche.css">') < a)
    pruefe("Offene Punkte: die Zeichnungen heissen op-zahl, op-balken, op-tabelle (im Gerüst und im Skript)",
           set(re.findall(r'data-draw="([^"]+)"', teil_offen)) == {"op-zahl", "op-balken", "op-tabelle"}
           and set(anmeldungen(d["lx-offen.js"])) == {"op-zahl", "op-balken", "op-tabelle"}
           and "dash.draw('op-tabelle')" in d["lx-offen.js"] and "dash.draw('tabelle')" not in d["lx-offen.js"], anmeldungen(d["lx-offen.js"]))
    pruefe("Suchanfragen: Gerüst und Skript sind bis auf das Zerlegen unverändert (die Zeichnung «zahl» bleibt)",
           'data-draw="zahl"' in teil_suche and "zahl" in anmeldungen(d["lx-suche.js"]) and "op-" not in teil_suche)
    quelle_suche = B.QUELLE_SUCHE.read_text(encoding="utf-8")
    pruefe("Stil und Skript der Suchanfragen stehen Zeichen für Zeichen in ihren Dateien",
           d["lx-suche.css"].strip("\n") in quelle_suche and d["lx-suche.js"].strip("\n") in quelle_suche)

    alle = anmeldungen(buero) + anmeldungen(d["lx-offen.js"]) + anmeldungen(d["lx-suche.js"])
    je_seite = [set(anmeldungen(buero)), set(anmeldungen(d["lx-offen.js"])), set(anmeldungen(d["lx-suche.js"]))]
    pruefe("Keine Zeichnung ist auf zwei Seiten angemeldet", not (je_seite[0] & je_seite[1] or je_seite[0] & je_seite[2] or je_seite[1] & je_seite[2]), alle)
    ids = re.findall(r'\bid="([^"]+)"', index)
    pruefe("Keine id kommt in der Seite doppelt vor", len(ids) == len(set(ids)), sorted({i for i in ids if ids.count(i) > 1})[:5])
    berechnungen = re.findall(r"dash\.calc\(\s*'([^']+)'", buero + d["lx-offen.js"] + d["lx-suche.js"])
    pruefe("Keine Berechnung ist doppelt benannt", len(berechnungen) == len(set(berechnungen)) and set(berechnungen) >= {"uebersicht", "abdeckung", "klassen"}, berechnungen)

    huelle = index[index.index("const LX_SEITEN"):]
    pruefe("Die Hülle setzt nur `hidden` und `aria-current` und schreibt keinen Text (Regel «ein Schreiber»)",
           ".hidden = " in huelle and "setAttribute('aria-current'" in huelle
           and not re.search(r"textContent|innerHTML|innerText|append\(|replaceChildren|createElement|insertAdjacent", huelle))
    pruefe("Die Hülle setzt beim Wechsel den Link und öffnet beim Laden den Ort aus der Adresse, ohne einen Link zu setzen",
           "if (!ohneLink) dash.setLink(ziel);" in huelle and "lxZeige(lxOrt, true)" in huelle and "lxZeige('suche', true)" in huelle)
    pruefe("Die Hülle kennt die Unter-Reiter der Suchanfragen, und jeder steht im Gerüst",
           all(f'id="ks-tab-{r}"' in teil_suche and f'"{r}"' in huelle for r in B.SUCHE_REITER))

    groessen = {n: len(json.dumps({"text": t, "edit": {"via": "claude", "at": "2026-01-01T00:00:00Z"}}, ensure_ascii=False).encode("utf-8")) for n, t in d.items()}
    pruefe("Jedes Dokument bleibt unter 250 000 Byte (Grenze des Dashboards: 256 KB)", max(groessen.values()) <= B.MAX_DOKUMENT == 250_000, groessen)

    # ---- Schutzprüfungen des Baus ----
    seite = B.META + "\n<style>\n.op { color: red; }\n</style>\n<main class=\"op\"><b data-draw=\"zahl\">—</b></main>\n<script>\ndash.draw('zahl', (el) => {});\n</script>\n"
    stil, geruest, skript = B.teile(seite, "x")
    pruefe("teile: Stil, Gerüst und Skript kommen getrennt und vollständig", stil == ".op { color: red; }\n" and geruest == '<main class="op"><b data-draw="zahl">—</b></main>\n'
           and skript == "dash.draw('zahl', (el) => {});\n", (stil, geruest, skript))
    pruefe("teile: ohne Meta-Zeile bricht der Bau ab", wirft(lambda: B.teile(seite[len(B.META):], "x"), "beginnt nicht"))
    pruefe("teile: zwei Skriptblöcke brechen den Bau ab", wirft(lambda: B.teile(seite + "<script>\n1\n</script>\n", "x"), "genau einen"))
    pruefe("teile: ein Skript mit Attribut bricht den Bau ab", wirft(lambda: B.teile(seite.replace("<script>", '<script src="a.js">'), "x"), "genau einen"))
    pruefe("teile: ein zweites Skript mit Attribut neben dem einen bricht den Bau ab", wirft(lambda: B.teile(seite + '<script src="a.js"></script>\n', "x"), "genau einen"))
    pruefe("teile: ein zweiter Stilblock mit Attribut bricht den Bau ab", wirft(lambda: B.teile(seite + '<style media="print">\n.op { }\n</style>\n', "x"), "genau einen"))
    g2, s2 = B.zeichnungen_umbenennen(geruest, skript, {"zahl": "op-zahl"}, "x")
    pruefe("Umbenennen ändert Gerüst und Skript", 'data-draw="op-zahl"' in g2 and "dash.draw('op-zahl'" in s2 and "'zahl'" not in s2)
    pruefe("Umbenennen: fehlt der Name im Skript, bricht der Bau ab", wirft(lambda: B.zeichnungen_umbenennen(geruest, "", {"zahl": "op-zahl"}, "x"), "fehlt"))
    pruefe("Umbenennen: fehlt der Name im Gerüst, bricht der Bau ab", wirft(lambda: B.zeichnungen_umbenennen("", skript, {"zahl": "op-zahl"}, "x"), "fehlt"))
    pruefe("Eigene Klassen und eigener Stil bestehen", not wirft(lambda: B.klassen_pruefen('<p class="op op-a">', ".op { } .op-a b { }", "op", "x"), ""))
    pruefe("Eine fremde Klasse im Gerüst bricht den Bau ab", wirft(lambda: B.klassen_pruefen('<p class="op kb-head">', ".op { }", "op", "x"), "Klassen ohne Präfix"))
    pruefe("Eine Klasse, die nur mit dem Präfix beginnt («opfer»), gilt als fremd", wirft(lambda: B.klassen_pruefen('<p class="opfer">', ".op { }", "op", "x"), "Klassen ohne Präfix"))
    pruefe("Ein Stil auf ein nacktes Element bricht den Bau ab", wirft(lambda: B.klassen_pruefen('<p class="op">', ".op { }\nbutton { color: red; }", "op", "x"), "Stil-Selektor"))
    pruefe("Ein Stil, dessen zweiter Selektor nackt ist, bricht den Bau ab", wirft(lambda: B.klassen_pruefen('<p class="op">', ".op, table { }", "op", "x"), "Stil-Selektor"))
    pruefe("Regeln mit @ und Schlüsselbilder zählen nicht als fremder Stil",
           not wirft(lambda: B.klassen_pruefen('<p class="op">', "@media (max-width: 9px) { .op { } }\n@keyframes a { from { } 50% { } to { } }", "op", "x"), ""))

    leer = {"zeichnung": set(), "berechnung": set(), "id": set()}
    pruefe("Seiten ohne Namen der Hülle bestehen", not wirft(lambda: B.huelle_namen_pruefen({"A": dict(leer, id={"op-tabelle", "kb-tab-3d"}), "B": leer}), ""))
    pruefe("Eine Seite mit einer id der Hülle («lx-…») bricht den Bau ab", wirft(lambda: B.huelle_namen_pruefen({"A": leer, "B": dict(leer, id={"lx-nav"})}), "Namen der Hülle"))
    pruefe("Eine Seite mit einer Zeichnung «lx-…» bricht den Bau ab", wirft(lambda: B.huelle_namen_pruefen({"A": dict(leer, zeichnung={"lx-x"})}), "Namen der Hülle"))
    pruefe("Eine Seite, die den Namen eines Abschnitts als id trägt («offen»), bricht den Bau ab", wirft(lambda: B.huelle_namen_pruefen({"A": dict(leer, id={"offen"})}), "offen"))

    plan = dict(B.OFFEN_ZEICHNUNGEN)
    try:
        B.OFFEN_ZEICHNUNGEN.clear()
        pruefe("Ohne das Umbenennen meldet der Bau die doppelte Zeichnung «zahl» und bricht ab", wirft(B.bauen, "zeichnung doppelt") and wirft(B.bauen, "zahl"))
    finally:
        B.OFFEN_ZEICHNUNGEN.update(plan)
    reiter = B.SUCHE_REITER
    try:
        B.SUCHE_REITER = reiter + ("gibt-es-nicht",)
        pruefe("Nennt die Hülle einen Unter-Reiter, den die Suchanfragen-Seite nicht hat, bricht der Bau ab", wirft(B.bauen, "gibt-es-nicht"))
    finally:
        B.SUCHE_REITER = reiter
    seiten = B.SEITEN
    try:
        B.SEITEN = seiten + (("kb-tab-3d", "Fremd"),)   # diese id trägt die Büro-Seite
        pruefe("Belegt eine Seite den Namen eines Abschnitts, bricht schon der Bau ab (die Prüfung hängt in bauen())", wirft(B.bauen, "Namen der Hülle"))
    finally:
        B.SEITEN = seiten
    grenze = B.MAX_DOKUMENT
    try:
        B.MAX_DOKUMENT = 1000
        pruefe("Ein zu grosses Dokument bricht den Bau ab und nennt die Grenze", wirft(B.bauen, "256 KB"))
    finally:
        B.MAX_DOKUMENT = grenze

    with tempfile.TemporaryDirectory() as tmp:
        code = B.main([tmp, "--dokumente"])
        dok = json.loads((Path(tmp) / "dok" / "index.html.json").read_text(encoding="utf-8"))
        pruefe("Aufruf mit --dokumente: Exit 0, Dateien und Dokumente {text, edit} zum Hochladen",
               code == 0 and (Path(tmp) / "lx-suche.js").read_text(encoding="utf-8") == d["lx-suche.js"] and dok["text"] == index
               and dok["edit"]["via"] == "claude" and re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", dok["edit"]["at"])
               and sorted(p.name for p in (Path(tmp) / "dok").iterdir()) == sorted(n + ".json" for n in d))
    pruefe("Aufruf ohne Ordner: Hilfe und Exit 2", B.main([]) == 2)

    if FEHLER:
        print(f"\n{len(FEHLER)} von {GEPRUEFT[0]} Prüfungen FEHLGESCHLAGEN")
        return 1
    frei = B.MAX_DOKUMENT - groessen["index.html"]
    print(f"dashboard-bau: {GEPRUEFT[0]} Prüfungen bestanden (index.html {groessen['index.html']} Byte als Dokument, {frei} Byte Luft bis zur Baugrenze)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
