#!/usr/bin/env python3
"""Mutationsprobe für die reinen Funktionen der Cockpit-Übersicht (Block `uebersicht:start … uebersicht:ende` in cockpit.html).

Jeder Mutant verändert EINE Stelle des Blocks (Vergleich, Konstante, Zweig, Reihenfolge …) und muss von uebersicht_rein.pruefen() erkannt werden
(mindestens eine Prüfung schlägt fehl). Ein überlebender Mutant heisst: die Prüfung ist an dieser Stelle blind — dann Fall ergänzen oder den Mutanten
als gleichwertig (kein sichtbarer Unterschied) begründen und in GLEICHWERTIG eintragen.

  python3 docs/cockpit-uebersicht-pruefung/mutationsprobe.py            # alle Mutanten, Exit 1 bei einem Überlebenden
"""
from __future__ import annotations

import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WURZEL / "tools" / "trading" / "krypto_bot"))
import uebersicht_rein as U  # noqa: E402

# (Name, alter Text, neuer Text) — der alte Text muss im Block GENAU einmal vorkommen
MUTANTEN = [
    # ampelStufe
    ("ampelStufe: Warnungen zählen nicht für gelb", 'stufe: rot ? "rot" : warn ? "gelb" : "gruen"', 'stufe: rot ? "rot" : "gruen"'),
    ("ampelStufe: Info-Zeilen zählen als Warnung", "x.ok == null && x.warnung).length;\n  const gut", "x.ok == null || x.warnung).length;\n  const gut"),
    ("ampelStufe: «in Ordnung» zählt jeden ausser rot", "const gut = g.filter(x => x.ok === true).length;", "const gut = g.filter(x => x.ok !== false).length;"),
    ("ampelStufe: rot nur bei ok === true", "const rot = g.filter(x => x.ok === false).length;", "const rot = g.filter(x => x.ok === true).length;"),
    # kurzSymbol / positionsArt
    ("kurzSymbol: Vorsilbe 1000 bleibt", '.replace(/^1000000/, "").replace(/^1000/, "")', '.replace(/^1000000/, "")'),
    ("kurzSymbol: Vorsilbe 1000000 bleibt (nur 1000 entfernt)", '.replace(/^1000000/, "").replace(/^1000/, "")', '.replace(/^1000/, "")'),
    ("kurzSymbol: USDT bleibt stehen", '.replace(/USDT$/, "")', '.replace(/USDX$/, "")'),
    ("positionsArt: Pilot-Märkte gelten als andere", 'if (PILOT_SYMBOLE.includes(sym)) return "pilot";', 'if (!PILOT_SYMBOLE.includes(sym)) return "pilot";'),
    ("positionsArt: Satelliten und andere vertauscht", '.includes(sym) ? "satellit" : "andere";', '.includes(sym) ? "andere" : "satellit";'),
    # stopAbstand / kursAbstand
    ("stopAbstand: Short und Long vertauscht", 'seite === "SHORT" ? (stop - mark) / mark : (mark - stop) / mark', 'seite === "SHORT" ? (mark - stop) / mark : (stop - mark) / mark'),
    ("stopAbstand: Anteil vom Stop statt vom Kurs", ': (mark - stop) / mark;', ': (mark - stop) / stop;'),
    ("kursAbstand: Verhältnis statt Abstand", "return preis / mark - 1;", "return preis / mark;"),
    # kursleiter
    ("kursleiter: Rand 10 statt 16 %", "(hi - lo) * 0.16", "(hi - lo) * 0.10"),
    ("kursleiter: Liquidation immer in der Achse", "if (l >= lo - spanne && l <= hi + spanne)", "if (l >= lo - spanne || l <= hi + spanne)"),
    ("kursleiter: Spanne als Summe statt Differenz", "const spanne = hi > lo ? hi - lo : hi * 0.02;", "const spanne = hi > lo ? hi + lo : hi * 0.02;"),
    ("kursleiter: links und rechts vertauscht", 'aussen = l < lo ? "links" : "rechts";', 'aussen = l < lo ? "rechts" : "links";'),
    ("kursleiter: Long/Short vertauscht", 'const lang = pos.seite !== "SHORT";', 'const lang = pos.seite === "SHORT";'),
    ("kursleiter: Gewinn erst bei Kurs über Einstieg (nicht gleich)", "gewinn: lang ? m >= e : m <= e", "gewinn: lang ? m > e : m < e"),
    ("kursleiter: Risikozone endet am Stop", "risiko = s != null && e != null ? {von: x(Math.min(s, e)), bis: x(Math.max(s, e))} : null;", "risiko = s != null && e != null ? {von: x(Math.max(s, e)), bis: x(Math.max(s, e))} : null;"),
    ("kursleiter: Achse ohne Rand", "const a = lo - rand, b = hi + rand;", "const a = lo, b = hi;"),
    ("kursleiter: Kurs-Marke fehlt", 'if (m != null) marken.push({art: "jetzt", wert: m, x: x(m)});', 'if (false) marken.push({art: "jetzt", wert: m, x: x(m)});'),
    # auslastung
    ("auslastung: freier Teil negativ", "const frei = k && gesamt < k ? k - gesamt : 0;", "const frei = k && gesamt < k ? gesamt - k : 0;"),
    ("auslastung: Skala = kleinerer Wert", "const skala = Math.max(k || 0, gesamt) || 1;", "const skala = Math.min(k || 0, gesamt) || 1;"),
    ("auslastung: Short-Nennwert negativ", "Math.abs(+p.wert) || 0", "(+p.wert) || 0"),
    ("auslastung: Kontomarke relativ zur Summe", "kontoMarke: k ? k / skala * 100 : null", "kontoMarke: k ? k / gesamt * 100 : null"),
    ("auslastung: Faktor verkehrt", "faktor: k ? gesamt / k : null", "faktor: k ? k / gesamt : null"),
    ("auslastung: Satelliten zählen als Pilot", "sum[positionsArt(p.symbol, satSymbole)] += Math.abs(+p.wert) || 0;", "sum[positionsArt(p.symbol, []) === \"andere\" ? \"pilot\" : positionsArt(p.symbol, [])] += Math.abs(+p.wert) || 0;"),
    # kontoKurve
    ("kontoKurve: Polster 20 % statt 10 %", "const pad = (hi - lo) * 0.1;", "const pad = (hi - lo) * 0.2;"),
    ("kontoKurve: X ohne rechten Rand", "const X = i => rand.l + (W - rand.l - rand.r) * i / (pts.length - 1);", "const X = i => rand.l + (W - rand.l) * i / (pts.length - 1);"),
    ("kontoKurve: Grundlinie am unteren Bildrand", "const grund = H - rand.u;", "const grund = H;"),
    ("kontoKurve: flache Reihe ±2 statt ±1", "if (hi - lo < 1e-9) { lo -= 1; hi += 1; }", "if (hi - lo < 1e-9) { lo -= 2; hi += 2; }"),
    ("kontoKurve: schon ein Punkt genügt", "if (pts.length < 2) return null;\n  const werte", "if (pts.length < 1) return null;\n  const werte"),
    ("kontoKurve: Y nicht gespiegelt", "const Y = v => rand.o + (H - rand.o - rand.u) * (1 - (v - lo) / (hi - lo));", "const Y = v => rand.o + (H - rand.o - rand.u) * ((v - lo) / (hi - lo));"),
    # sparkGeometrie
    ("sparkGeometrie: Polster 5 % statt 6 %", "const pad = (hi - lo) * 0.06 || hi * 0.01;", "const pad = (hi - lo) * 0.05 || hi * 0.01;"),
    ("sparkGeometrie: ein Schnittpunkt genügt für die Linie", 'schnitt: sm.length > 1 ? pfad(sm) : ""', 'schnitt: sm.length > 0 ? pfad(sm) : ""'),
    ("sparkGeometrie: Schnitt ohne passenden Kurstag", "pos0(q[1]) && idx.has(q[0]));", "pos0(q[1]));"),
    ("sparkGeometrie: Stop 0 zählt als Stop", "const st = pos0(stop);", "const st = istZahl(stop) ? stop : null;"),
    # fgZone / fgWinkel
    ("fgZone: 20 ist schon Angst", 'w <= 20 ? "extreme Angst"', 'w < 20 ? "extreme Angst"'),
    ("fgZone: 55 ist schon Gier", 'w <= 55 ? "neutral"', 'w < 55 ? "neutral"'),
    ("fgZone: 80 ist noch Gier", 'w < 80 ? "Gier"', 'w <= 80 ? "Gier"'),
    ("fgWinkel: ohne Begrenzung", "-90 + Math.max(0, Math.min(100, w)) * 1.8", "-90 + w * 1.8"),
    ("fgWinkel: 1.7 Grad je Punkt", "* 1.8 : null", "* 1.7 : null"),
    # wochentagKurz / zeitstrahl
    ("wochentagKurz: Montag und Dienstag vertauscht", '["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]', '["So", "Di", "Mo", "Mi", "Do", "Fr", "Sa"]'),
    ("wochentagKurz: ungültiges Datum liefert Fragezeichen", 'isNaN(t) ? "" :', 'isNaN(t) ? "?" :'),
    ("zeitstrahl: höchstens 6 statt 8 je Aufruf", "liste.slice(0, n || 8)", "liste.slice(0, n || 6)"),
    ("zeitstrahl: Kauf und Verkauf vertauscht", 'seite === "BUY" ? "kauf" : seite === "SELL" ? "verkauf"', 'seite === "BUY" ? "verkauf" : seite === "SELL" ? "kauf"'),
    ("zeitstrahl: Uhrzeit um eine Stelle zu kurz", "uhr: zeit.slice(11, 16)", "uhr: zeit.slice(11, 15)"),
    ("zeitstrahl: Einträge ohne Zeit bleiben", 'typeof a === "object" && a.zeit)', 'typeof a === "object")'),
    ("zeitstrahl: Fehler zählt nicht vorrangig", 'a.fehler ? "fehler" : a.nur_verkleinern ? "verkleinern" :', 'a.nur_verkleinern ? "verkleinern" : a.fehler ? "fehler" :'),
    # ampelGruppen
    ("ampelGruppen: grau und gut vertauscht", "const rang = {rot: 0, gelb: 1, grau: 2, gut: 3};", "const rang = {rot: 0, gelb: 1, grau: 3, gut: 2};"),
    ("ampelGruppen: Original wird verändert", ".map(e => ({...e.x, art: e.art}))", ".map(e => Object.assign(e.x, {art: e.art}))"),
    ("ampelGruppen: nur rot braucht Aufmerksamkeit", 'liste.filter(e => e.art === "rot" || e.art === "gelb")', 'liste.filter(e => e.art === "rot")'),
    ("ampelGruppen: Warnung ohne Merkmal «warnung»", 'x.ok == null && x.warnung ? "gelb"', 'x.ok == null ? "gelb"'),
    # aktiverAbschnitt
    ("aktiverAbschnitt: Oberkante genau auf der Schwelle zählt nicht", "if (q.top <= schwelle) aktiv = q.id;", "if (q.top < schwelle) aktiv = q.id;"),
    ("aktiverAbschnitt: am Seitenende der erste", "if (amEnde) return L[L.length - 1].id;", "if (amEnde) return L[0].id;"),
    ("aktiverAbschnitt: vor dem ersten Abschnitt keiner", "let aktiv = L[0].id;", "let aktiv = null;"),
    ("aktiverAbschnitt: ungültige Einträge bleiben", '.filter(q => q && typeof q.id === "string" && istZahl(q.top));', ".filter(q => q);"),
    # zellenBeschriftung
    ("zellenBeschriftung: Zelle über zwei Spalten bekommt einen Namen", 'breite > 1 ? "" :', 'breite > 2 ? "" :'),
    ("zellenBeschriftung: Spaltenzähler wächst nur um 1", "spalte += breite;", "spalte += 1;"),
    ("zellenBeschriftung: fehlender Name wird «undefined»", 'String((Array.isArray(namen) ? namen[spalte] : "") || "")', "String(Array.isArray(namen) ? namen[spalte] : \"\")"),
    # blasenPosition
    ("blasenPosition: besetzte Höhe unten wird ignoriert", "<= f.h - (frei || 0);", "<= f.h;"),
    ("blasenPosition: links/rechts-Begrenzung vertauscht", "Math.max(rand, Math.min(f.w - b - rand, mitte - b / 2))", "Math.min(rand, Math.max(f.w - b - rand, mitte - b / 2))"),
    ("blasenPosition: oben ohne Randbegrenzung", "Math.max(rand, r.top - 8 - h)", "r.top - 8 - h"),
    ("blasenPosition: Abstand zum Auslöser 0 statt 8", "r.bottom + 8 : Math.max", "r.bottom + 0 : Math.max"),
]

# Mutanten ohne sichtbaren Unterschied (hier begründet; leer = keiner)
GLEICHWERTIG: dict[str, str] = {}


def main():
    html = (WURZEL / "tools" / "trading" / "krypto_bot" / "cockpit.html").read_text(encoding="utf-8")
    block = U.block_von(html)
    if block is None:
        print("Block nicht gefunden")
        return 2
    node = U.node_finden()
    if not node:
        print("node nicht gefunden — keine Mutationsprobe möglich")
        return 2
    basis = [e for e in U.pruefen(html, node) if not e[1]]
    if basis:
        print("Vorab-Kontrolle gescheitert: schon die unveränderte Fassung hat Fehler:", [e[0] for e in basis])
        return 2
    erkannt, ueberlebt, ungueltig = [], [], []
    for name, alt, neu in MUTANTEN:
        n = block.count(alt)
        if n != 1:
            ungueltig.append((name, n))
            continue
        gefunden = [e[0] for e in U.pruefen(html.replace(block, block.replace(alt, neu)), node) if not e[1]]
        (erkannt if gefunden else ueberlebt).append((name, gefunden))
        print(("erkannt   " if gefunden else "ÜBERLEBT  ") + name + (f"  ← {gefunden[0]}" if gefunden else ""))
    for name, n in ungueltig:
        print(f"UNGÜLTIG  {name}: Text kommt {n}× vor (erwartet genau 1×)")
    echt = [u for u in ueberlebt if u[0] not in GLEICHWERTIG]
    print(f"\n{len(MUTANTEN)} Mutanten: {len(erkannt)} erkannt, {len(ueberlebt)} überlebt ({len(ueberlebt) - len(echt)} als gleichwertig begründet), {len(ungueltig)} ungültig")
    return 1 if (echt or ungueltig) else 0


if __name__ == "__main__":
    sys.exit(main())
