#!/usr/bin/env python3
"""Prüfung der REINEN Funktionen der Cockpit-Übersicht (cockpit.html, Block `uebersicht:start … uebersicht:ende`).

Die Funktionen rechnen nur (Kursleiter, Auslastung, Kurven, Ampel-Gruppen, Sprungleiste, Karten-Tabellen, Hinweis-Blase) und kennen weder DOM noch Sprache.
Darum führt node sie hier aus; die Erwartungswerte stehen unten in Python und sind VON HAND aus den Eingaben gerechnet (nicht aus dem Code übernommen).
  python3 tools/trading/krypto_bot/uebersicht_rein.py            # prüft cockpit.html neben dieser Datei
Genutzt von test_cockpit.py (jede Zeile = eine Prüfung) und von der Mutationsprobe (pruefen(html_text) mit verändertem Text).
Ohne node bleibt es bei der Prüfung der Bauform (Block, Funktionen, kein DOM) — ein fehlendes node darf den Selbsttest vor dem Handeln nie scheitern lassen."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HIER = Path(__file__).resolve().parent
BLOCK = re.compile(r"// uebersicht:start[^\n]*\n(.*?)// uebersicht:ende", re.S)
FUNKTIONEN = ["istZahl", "pos0", "ampelStufe", "kurzSymbol", "positionsArt", "stopAbstand", "kursAbstand", "kursleiter", "auslastung", "kontoKurve", "sparkGeometrie",
              "fgZone", "fgWinkel", "wochentagKurz", "zeitstrahl", "ampelGruppen", "aktiverAbschnitt", "zellenBeschriftung", "blasenPosition"]
DOM_WOERTER = ["document.", "window.", "getComputedStyle", "innerHTML", "querySelector", "localStorage", "fetch(", "toLocaleString"]  # nichts davon gehört in reine Funktionen


def node_finden():
    return shutil.which("node") or ("/opt/node22/bin/node" if Path("/opt/node22/bin/node").exists() else None)


JS = r"""
const R = {};
const lite = L => L && { von: L.von, bis: L.bis, marken: L.marken.map(m => [m.art, m.x, m.aussen || null]), risiko: L.risiko, bewegung: L.bewegung };
const aus = A => ({ pilot: A.pilot, satellit: A.satellit, andere: A.andere, gesamt: A.gesamt, konto: A.konto, faktor: A.faktor, skala: A.skala, frei: A.frei, freiBreite: A.freiBreite, kontoMarke: A.kontoMarke,
  breiten: A.segmente.map(s => s.breite), arten: A.segmente.map(s => s.art), anteile: A.segmente.map(s => s.anteil) });
const nl = x => x === undefined ? null : x;

R.zahlen = [istZahl(0), istZahl(NaN), istZahl(Infinity), istZahl("5"), istZahl(null), pos0(0), pos0(-1), pos0(5), pos0("5")];
R.ampel_rot = ampelStufe([{ok:false},{ok:false},{ok:null,warnung:true},{ok:true},{ok:null}]);
R.ampel_gelb = ampelStufe([{ok:null,warnung:true},{ok:true}]);
R.ampel_gruen = ampelStufe([{ok:true},{ok:null},{ok:true}]);
R.ampel_leer = [ampelStufe([]).stufe, ampelStufe(null).gesamt, ampelStufe([null, 3, "x", {ok:false}]).rot, ampelStufe([null, 3, "x", {ok:false}]).gesamt];
R.symbole = [kurzSymbol("BTCUSDT"), kurzSymbol("1000PEPEUSDT"), kurzSymbol("1000000MOGUSDT"), kurzSymbol(null), kurzSymbol("USDT"), kurzSymbol("ETHUSDC")];
R.arten = [positionsArt("BTCUSDT", []), positionsArt("ETHUSDT", null), positionsArt("SOLUSDT", ["SOLUSDT"]), positionsArt("XRPUSDT", ["SOLUSDT"]), positionsArt("SOLUSDT", null)];
R.stopabstand = [stopAbstand("LONG",100,90), stopAbstand("SHORT",100,105), stopAbstand("LONG",100,105), stopAbstand("SHORT",100,95), stopAbstand("LONG",0,90), stopAbstand("LONG",100,null), stopAbstand("LONG",100,-5), stopAbstand(undefined,100,90)];
R.kursabstand = [kursAbstand(100,90), kursAbstand(100,150), kursAbstand(0,5), kursAbstand(100,null)];

R.leiter_lang = lite(kursleiter({seite:"LONG", einstieg:100, mark:110, stop:90, liquidation:null}));
R.leiter_nah = lite(kursleiter({seite:"LONG", einstieg:100, mark:110, stop:90, liquidation:80}));
R.leiter_aussen = lite(kursleiter({seite:"LONG", einstieg:100, mark:110, stop:90, liquidation:10}));
R.leiter_short = lite(kursleiter({seite:"SHORT", einstieg:100, mark:95, stop:104, liquidation:130}));
R.leiter_ohne_stop = lite(kursleiter({seite:"LONG", einstieg:100, mark:105, stop:null, liquidation:null}));
R.leiter_nichts = kursleiter({seite:"LONG"});
R.leiter_gleich = lite(kursleiter({seite:"LONG", einstieg:100, mark:100}));
R.leiter_verlust = lite(kursleiter({seite:"LONG", einstieg:110, mark:100, stop:90}));

R.ausl_voll = aus(auslastung([{symbol:"BTCUSDT",wert:3000},{symbol:"ETHUSDT",wert:2000},{symbol:"SOLUSDT",wert:500},{symbol:"XRPUSDT",wert:250}], 5000, ["SOLUSDT"]));
R.ausl_frei = aus(auslastung([{symbol:"BTCUSDT",wert:2500}], 10000, []));
R.ausl_ohne_konto = aus(auslastung([{symbol:"BTCUSDT",wert:100}], null, []));
R.ausl_short = aus(auslastung([{symbol:"BTCUSDT",wert:-400}], 1000, []));
R.ausl_leer = aus(auslastung(null, 1000, null));

const kk = kontoKurve([["2026-01-01",100],["2026-01-02",110],["2026-01-03",105]], 200, 100, {l:10,r:10,o:10,u:20});
R.kurve = { linie: kk.linie, flaeche: kk.flaeche, lo: kk.lo, hi: kk.hi, grund: kk.grund, pts: kk.punkte.map(p => [p.tag, p.wert, p.x, p.y]) };
R.kurve_wenig = [kontoKurve([["a",1]],200,100), kontoKurve(null,200,100), kontoKurve([["a","x"],["b",2]],200,100)];
R.kurve_flach = (k => ({ endlich: k.punkte.every(p => isFinite(p.x) && isFinite(p.y)), lo: k.lo, hi: k.hi }))(kontoKurve([["a",100],["b",100]],200,100,{l:0,r:0,o:0,u:0}));
const sg = sparkGeometrie([["d1",100],["d2",110],["d3",105]], [["d2",104],["d3",106],["dX",50]], 102, 200, 100);
R.spark = { kurs: sg.kurs, schnitt: sg.schnitt, stopY: sg.stopY, lo: sg.lo, hi: sg.hi, ende: sg.ende, anzahl: sg.anzahl };
R.spark_rand = [sparkGeometrie([["a",1]],[],null,200,100), sparkGeometrie(null,null,null,200,100), (g => [g.schnitt, g.stopY])(sparkGeometrie([["a",1],["b",2]],[["a",1]],null,100,50)), sparkGeometrie([["a",1],["b",2]],[],0,100,50).stopY];

R.fg = [0, 20, 20.1, 44.9, 45, 55, 55.1, 79.9, 80, 100].map(fgZone);
R.fg_ungueltig = [fgZone(null), fgZone("x"), fgZone(NaN), fgWinkel(null), fgWinkel("5"), fgWinkel(undefined)];
R.winkel = [0, 50, 100, 37, -5, 150].map(fgWinkel);
R.wochentag = [wochentagKurz("2026-11-03"), wochentagKurz("2026-11-01"), wochentagKurz("2026-10-30"), wochentagKurz("2026-11-07"), wochentagKurz("x"), wochentagKurz(null)];

const au = [
  {zeit:"2026-11-03T18:04:15+00:00", symbol:"SOLUSDT", seite:"BUY", menge:0.7, status:"HTTP 400", fehler:true, modus:"testnetz"},
  {zeit:"2026-11-03T18:04:13+00:00", symbol:"ETHUSDT", seite:"buy", menge:0.435, status:"FILLED", modus:"ECHTGELD"},
  null, {symbol:"OHNEZEIT"},
  {zeit:"2026-11-01T02:40:55+00:00", symbol:"ADAUSDT", seite:"SELL", menge:410, nur_verkleinern:true, status:"FILLED"},
  {zeit:"2026-10-31T01:00:00+00:00", symbol:"XRPUSDT", seite:"SELL", menge:5, status:null},
  {zeit:"2026-10-30T02:40:02+00:00", symbol:"BTCUSDT", hinweis:"Kurs unter Stop"},
  {zeit:"2026-10-29T01:00:00+00:00", symbol:"DOGEUSDT", seite:"HOLD", menge:1, status:"X"},
  {zeit:"2026-10-28T01:00:00+00:00", symbol:"LTCUSDT", seite:"BUY", menge:1, status:"FILLED"},
  {zeit:"2026-10-27T01:00:00+00:00", symbol:"DOTUSDT", seite:"SELL", menge:2, nur_verkleinern:true, fehler:true, status:"HTTP 500"},
  {zeit:"2026-10-26T01:00:00+00:00", symbol:"AVAXUSDT", seite:"BUY", menge:3, status:"FILLED"},
];
R.zeit_alle = zeitstrahl(au, 20).map(e => [e.tag, e.uhr, e.symbol, e.art, nl(e.seite), nl(e.menge), nl(e.status), nl(e.modus), nl(e.text)]);
R.zeit_n = [zeitstrahl(au, 2).length, zeitstrahl(au).length, zeitstrahl(null, 3).length, zeitstrahl(au, 0).length];

const gg = [{name:"gut1",ok:true},{name:"rot1",ok:false},{name:"grau1",ok:null},{name:"gelb1",ok:null,warnung:true},{name:"rot2",ok:false},{name:"gut2",ok:true}];
const G = ampelGruppen(gg);
R.gruppen = { liste: G.liste.map(x => x.name + ":" + x.art), aufmerksam: G.aufmerksam.map(x => x.name), rest: G.rest.map(x => x.name), original_unveraendert: gg.every(x => x.art === undefined) };
R.gruppen_leer = (G0 => [G0.liste.length, G0.aufmerksam.length, G0.rest.length])(ampelGruppen(null));

const ob = [{id:"oben",top:-900},{id:"pos",top:-100},{id:"sat",top:500},{id:"auf",top:1200},{id:"det",top:2000}];
R.abschnitt = [aktiverAbschnitt(ob,337,false), aktiverAbschnitt(ob,600,false), aktiverAbschnitt(ob,-1000,false), aktiverAbschnitt(ob,337,true), aktiverAbschnitt(ob,500,false), aktiverAbschnitt([],337,false), aktiverAbschnitt(null,1,true),
  aktiverAbschnitt([{id:3,top:0},{id:"a",top:NaN},{id:"b",top:5}],10,false), aktiverAbschnitt([{id:"b",top:5},{id:3,top:6},{id:"c",top:"7"}],10,false)];

const N = ["Zeit","Markt","Seite","Menge","Status"];
R.zellen = [zellenBeschriftung(N,[1,1,1,1,1]), zellenBeschriftung(N,[1,1,3]), zellenBeschriftung(N,[2,1]), zellenBeschriftung(N,[1,0,NaN,1.7]), zellenBeschriftung(["a"],[1,1,1]), zellenBeschriftung(null,[1,1]), zellenBeschriftung(N,null)];

const F = {w:390,h:844};
R.blase = [
  blasenPosition({left:100,right:144,top:200,bottom:244}, 200, 60, F, 12, 52),
  blasenPosition({left:330,right:374,top:200,bottom:244}, 200, 60, F, 12, 52),
  blasenPosition({left:0,right:44,top:200,bottom:244}, 200, 60, F, 12, 52),
  blasenPosition({left:100,right:144,top:736,bottom:780}, 200, 60, F, 12, 52),
  blasenPosition({left:100,right:144,top:20,bottom:790}, 200, 60, F, 12, 0),
  blasenPosition({left:100,right:144,top:200,bottom:244}, 200, 60, F, 12),
  blasenPosition({left:100,right:144,top:696,bottom:740}, 200, 60, F, 12, 52),
];
process.stdout.write(JSON.stringify(R));
"""

# Erwartungswerte: von Hand gerechnet (Kommentare zeigen den Weg bei den nicht offensichtlichen)
_L = lambda von, bis, marken, risiko, bewegung: {"von": von, "bis": bis, "marken": marken, "risiko": risiko, "bewegung": bewegung}  # noqa: E731
ERWARTET = {
    "zahlen": [True, False, False, False, False, None, None, 5, None],
    "ampel_rot": {"stufe": "rot", "rot": 2, "warn": 1, "gut": 1, "grau": 1, "gesamt": 5},
    "ampel_gelb": {"stufe": "gelb", "rot": 0, "warn": 1, "gut": 1, "grau": 0, "gesamt": 2},
    "ampel_gruen": {"stufe": "gruen", "rot": 0, "warn": 0, "gut": 2, "grau": 1, "gesamt": 3},
    "ampel_leer": ["gruen", 0, 1, 1],
    "symbole": ["BTC", "PEPE", "MOG", "", "", "ETHUSDC"],
    "arten": ["pilot", "pilot", "satellit", "andere", "andere"],
    "stopabstand": [0.1, 0.05, -0.05, -0.05, None, None, None, 0.1],   # LONG (100−90)/100; SHORT (105−100)/100; Kurs 100 über Stop 105 = −5 %; SHORT mit Stop 95 unter dem Kurs = −5 %
    "kursabstand": [-0.1, 0.5, None, None],
    # Kursleiter: e=100, m=110, s=90 → Kern 90…110, Rand 16 % von 20 = 3.2 → Achse 86.8…113.2 (Breite 26.4): Stop 3.2/26.4 = 12.1212 %, Einstieg 13.2/26.4 = 50 %, Jetzt 23.2/26.4 = 87.8788 %
    "leiter_lang": _L(86.8, 113.2, [["stop", 12.1212, None], ["einstieg", 50, None], ["jetzt", 87.8788, None]], {"von": 12.1212, "bis": 50}, {"von": 50, "bis": 87.8788, "gewinn": True}),
    # Liquidation 80 liegt innerhalb einer Kernspanne (≥ 90−20) → in der Achse: 80…110, Rand 4.8 → 75.2…114.8 (Breite 39.6)
    "leiter_nah": _L(75.2, 114.8, [["stop", 37.3737, None], ["einstieg", 62.6263, None], ["jetzt", 87.8788, None], ["liquidation", 12.1212, None]], {"von": 37.3737, "bis": 62.6263}, {"von": 62.6263, "bis": 87.8788, "gewinn": True}),
    # Liquidation 10 liegt weiter als eine Kernspanne unter dem Kern → Pfeil am linken Rand (x = 0), Achse wie «lang»
    "leiter_aussen": _L(86.8, 113.2, [["stop", 12.1212, None], ["einstieg", 50, None], ["jetzt", 87.8788, None], ["liquidation", 0, "links"]], {"von": 12.1212, "bis": 50}, {"von": 50, "bis": 87.8788, "gewinn": True}),
    # SHORT: Kern 95…104, Spanne 9, Liquidation 130 > 104+9 → rechts; Rand 1.44 → 93.56…105.44 (Breite 11.88); Kurs unter Einstieg = Gewinn
    "leiter_short": _L(93.56, 105.44, [["stop", 87.8788, None], ["einstieg", 54.2088, None], ["jetzt", 12.1212, None], ["liquidation", 100, "rechts"]], {"von": 54.2088, "bis": 87.8788}, {"von": 12.1212, "bis": 54.2088, "gewinn": True}),
    "leiter_ohne_stop": _L(99.2, 105.8, [["einstieg", 12.1212, None], ["jetzt", 87.8788, None]], None, {"von": 12.1212, "bis": 87.8788, "gewinn": True}),
    "leiter_nichts": None,
    # Einstieg = Kurs = 100, sonst nichts: Spanne 2 % von 100 = 2, Rand 1 % = 1 → 99…101, beide in der Mitte
    "leiter_gleich": _L(99, 101, [["einstieg", 50, None], ["jetzt", 50, None]], None, {"von": 50, "bis": 50, "gewinn": True}),
    # Long im Minus: Kurs 100 unter Einstieg 110, Stop 90 → Bewegung ist ein Verlust
    "leiter_verlust": _L(86.8, 113.2, [["stop", 12.1212, None], ["einstieg", 87.8788, None], ["jetzt", 50, None]], {"von": 12.1212, "bis": 87.8788}, {"von": 50, "bis": 87.8788, "gewinn": False}),
    # Auslastung: 3000+2000 = Pilot 5000, Satellit 500, andere 250 → 5750 / Konto 5000 = 1.15; Skala = grösserer Wert 5750; Kontomarke 5000/5750 = 86.9565 %
    "ausl_voll": {"pilot": 5000, "satellit": 500, "andere": 250, "gesamt": 5750, "konto": 5000, "faktor": 1.15, "skala": 5750, "frei": 0, "freiBreite": 0, "kontoMarke": 86.9565,
                  "breiten": [86.9565, 8.6957, 4.3478], "arten": ["pilot", "satellit", "andere"], "anteile": [1, 0.1, 0.05]},
    "ausl_frei": {"pilot": 2500, "satellit": 0, "andere": 0, "gesamt": 2500, "konto": 10000, "faktor": 0.25, "skala": 10000, "frei": 7500, "freiBreite": 75, "kontoMarke": 100,
                  "breiten": [25, 0, 0], "arten": ["pilot", "satellit", "andere"], "anteile": [0.25, 0, 0]},
    "ausl_ohne_konto": {"pilot": 100, "satellit": 0, "andere": 0, "gesamt": 100, "konto": None, "faktor": None, "skala": 100, "frei": 0, "freiBreite": 0, "kontoMarke": None,
                        "breiten": [100, 0, 0], "arten": ["pilot", "satellit", "andere"], "anteile": [None, None, None]},
    "ausl_short": {"pilot": 400, "satellit": 0, "andere": 0, "gesamt": 400, "konto": 1000, "faktor": 0.4, "skala": 1000, "frei": 600, "freiBreite": 60, "kontoMarke": 100,
                   "breiten": [40, 0, 0], "arten": ["pilot", "satellit", "andere"], "anteile": [0.4, 0, 0]},
    "ausl_leer": {"pilot": 0, "satellit": 0, "andere": 0, "gesamt": 0, "konto": 1000, "faktor": 0, "skala": 1000, "frei": 1000, "freiBreite": 100, "kontoMarke": 100,
                  "breiten": [0, 0, 0], "arten": ["pilot", "satellit", "andere"], "anteile": [0, 0, 0]},
    # Konto-Kurve: Werte 100/110/105, Spanne 10, Polster 10 % = 1 → 99…111; X = 10 + 180·i/2; Y = 10 + 70·(1 − (v−99)/12): 74.1667 / 15.8333 / 45; Grund = 100 − 20 = 80
    "kurve": {"linie": "M10,74.17L100,15.83L190,45", "flaeche": "M10,74.17L100,15.83L190,45L190,80L10,80Z", "lo": 99, "hi": 111, "grund": 80,
              "pts": [["2026-01-01", 100, 10, 74.17], ["2026-01-02", 110, 100, 15.83], ["2026-01-03", 105, 190, 45]]},
    "kurve_wenig": [None, None, None],
    "kurve_flach": {"endlich": True, "lo": 98.8, "hi": 101.2},   # flache Reihe: ±1, dann Polster 10 % von 2 = 0.2
    # Kursverlauf: Kurs 100/110/105, Schnitt 104/106 (ein Datum ohne Kurstag wird ignoriert), Stop 102 → Spanne 100…110, Polster 6 % = 0.6 → 99.4…110.6 (11.2)
    "spark": {"kurs": "M0,94.64L100,5.36L200,50", "schnitt": "M100,58.93L200,41.07", "stopY": 76.79, "lo": 99.4, "hi": 110.6, "ende": {"x": 200, "y": 50, "wert": 105, "tag": "d3"}, "anzahl": 3},
    "spark_rand": [None, None, ["", None], None],
    "fg": ["extreme Angst", "extreme Angst", "Angst", "Angst", "neutral", "neutral", "Gier", "Gier", "extreme Gier", "extreme Gier"],
    "fg_ungueltig": [None, None, None, None, None, None],
    "winkel": [-90, 0, 90, -23.4, -90, 90],
    "wochentag": ["Di", "So", "Fr", "Sa", "", ""],
    "zeit_alle": [
        ["2026-11-03", "18:04", "SOLUSDT", "fehler", "BUY", 0.7, "HTTP 400", "testnetz", None],
        ["2026-11-03", "18:04", "ETHUSDT", "kauf", "BUY", 0.435, "FILLED", "ECHTGELD", None],
        ["2026-11-01", "02:40", "ADAUSDT", "verkleinern", "SELL", 410, "FILLED", "", None],
        ["2026-10-31", "01:00", "XRPUSDT", "verkauf", "SELL", 5, "", "", None],
        ["2026-10-30", "02:40", "BTCUSDT", "hinweis", None, None, None, None, "Kurs unter Stop"],
        ["2026-10-29", "01:00", "DOGEUSDT", "hinweis", "HOLD", 1, "X", "", None],
        ["2026-10-28", "01:00", "LTCUSDT", "kauf", "BUY", 1, "FILLED", "", None],
        ["2026-10-27", "01:00", "DOTUSDT", "fehler", "SELL", 2, "HTTP 500", "", None],   # Fehler hat Vorrang vor «nur verkleinern»
        ["2026-10-26", "01:00", "AVAXUSDT", "kauf", "BUY", 3, "FILLED", "", None],
    ],
    "zeit_n": [2, 8, 0, 8],   # 9 gültige Einträge: ohne Angabe höchstens 8 (auch bei n = 0)
    "gruppen": {"liste": ["rot1:rot", "rot2:rot", "gelb1:gelb", "grau1:grau", "gut1:gut", "gut2:gut"], "aufmerksam": ["rot1", "rot2", "gelb1"], "rest": ["grau1", "gut1", "gut2"], "original_unveraendert": True},
    "gruppen_leer": [0, 0, 0],
    "abschnitt": ["pos", "sat", "oben", "det", "sat", None, None, "b", "b"],   # Schwelle 337 → «pos»; 600 → «sat»; 500 = Oberkante zählt (≤); am Ende der Seite immer der letzte; ungültige Einträge fallen weg
    "zellen": [["Zeit", "Markt", "Seite", "Menge", "Status"], ["Zeit", "Markt", ""], ["", "Seite"], ["Zeit", "Markt", "Seite", "Menge"], ["a", "", ""], ["", ""], []],
    # Blase: Auslöser 100…144 (Mitte 122) → links 122−100 = 22; unten 244+8+60 = 312 ≤ 844−52; rechts auf 390−200−12 = 178 begrenzt; links auf 12; ohne Platz unten über dem Auslöser (736−8−60 = 668), ohne Platz oben auf den Rand 12; unten ist die Sprungleiste (52) besetzt: 740+68 = 808 > 844−52 → darüber (696−68 = 628)
    "blase": [{"left": 22, "top": 252, "unten": True}, {"left": 178, "top": 252, "unten": True}, {"left": 12, "top": 252, "unten": True}, {"left": 22, "top": 668, "unten": False},
              {"left": 22, "top": 12, "unten": False}, {"left": 22, "top": 252, "unten": True}, {"left": 22, "top": 628, "unten": False}],
}


def gleich(a, b, tol=2e-3):
    """Vergleich mit Toleranz für Zahlen (die Erwartungen sind auf 4 Stellen von Hand gerechnet); bool/None strikt."""
    if isinstance(a, bool) or isinstance(b, bool) or a is None or b is None:
        return a is b or (a == b and type(a) is type(b))
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= tol
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(gleich(a[k], b[k], tol) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(gleich(x, y, tol) for x, y in zip(a, b))
    return a == b


def block_von(html):
    m = BLOCK.search(html)
    return m.group(1) if m else None


def _node_datei(node, quelltext):
    """Skript als DATEI ausführen (ein Windows-Shim `node.cmd` verstümmelt -e-Skripte und Anführungszeichen in Argumenten); gibt (Prozess, None) oder (None, Fehlertext)."""
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / "uebersicht.js"
        f.write_text(quelltext, encoding="utf-8")
        try:
            return subprocess.run([node, str(f)], capture_output=True, text=True, encoding="utf-8", timeout=60), None
        except (OSError, subprocess.SubprocessError) as ex:
            return None, repr(ex)


def lauf(block, node):
    """Block + Prüfprogramm in node ausführen; gibt (Ergebnis-Dict, Fehlertext)."""
    r, fehler = _node_datei(node, block + "\n" + JS)
    if r is None:
        return None, fehler
    if r.returncode != 0 or not r.stdout:
        return None, (r.returncode, r.stderr[-400:])
    try:
        return json.loads(r.stdout), None
    except ValueError as ex:
        return None, repr(ex)


def pruefen(html, node=None):
    """Liste von (Name, bestanden, Info). Fehlt node oder startet es nicht, bleibt es bei der Bauform; läuft node, aber der Block bricht ab, ist das EIN ECHTER Fehler."""
    block = block_von(html)
    out = [("Block uebersicht:start … uebersicht:ende vorhanden", block is not None, None)]
    if block is None:
        return out
    fehlt = [n for n in FUNKTIONEN if f"function {n}(" not in block and f"const {n} =" not in block]
    out.append(("alle reinen Funktionen stehen im Block", not fehlt, fehlt))
    dom = [w for w in DOM_WOERTER if w in block]
    out.append(("der Block kennt kein DOM, keinen Speicher, kein Netz, keine Sprache (reine Funktionen)", not dom, dom))
    node = node or node_finden()
    if not node:
        return out + [("(node nicht gefunden — die Funktionen wurden nicht ausgeführt)", True, None)]
    # läuft node überhaupt? (ein nicht startbares node darf den Selbsttest nie scheitern lassen)
    t, _fehler = _node_datei(node, 'process.stdout.write("ok");')
    if t is None or t.returncode != 0 or t.stdout != "ok":
        return out + [("(node startet nicht — die Funktionen wurden nicht ausgeführt)", True, None)]
    ist, fehler = lauf(block, node)
    if ist is None:
        return out + [("die reinen Funktionen laufen (node läuft, aber das Skript bricht ab) — ein ECHTER Fehler", False, fehler)]
    for name, soll in ERWARTET.items():
        out.append((f"Übersicht rein: {name}", name in ist and gleich(ist[name], soll), {"ist": ist.get(name), "soll": soll}))
    return out


def main():
    html = (HIER / "cockpit.html").read_text(encoding="utf-8")
    erg = pruefen(html)
    schlecht = [e for e in erg if not e[1]]
    for name, ok, info in erg:
        print(("ok   " if ok else "FAIL ") + name + ("" if ok else f" :: {info}"))
    print(f"\n{len(erg) - len(schlecht)} bestanden, {len(schlecht)} fehlgeschlagen")
    return 1 if schlecht else 0


if __name__ == "__main__":
    sys.exit(main())
