"""Legt die Szene einer Kurzfolge der Reihe «Warum vegan leben?» an.

Aufruf (aus video-pipeline/motion3d):  python3 -I projekte/pia-warum/anlegen.py <ordner>
Beispiel:                               python3 -I projekte/pia-warum/anlegen.py pia-warum-1-tiere

Schreibt projekte/<ordner>/szene.html: eine Kopie von projekte/pia-folge3/szene.html (zehn fertige Bühnen) mit gezielten
Änderungen. Die Kurzfolge spielt nur die Szenen, die in ihrer stimme.txt stehen, und liest ihre Einstellungen aus folge.js.
Jede Ersetzung muss ihren Anker genau einmal finden, sonst Abbruch (dann hat sich die Vorlage geändert).
Fehlen stimme.txt oder folge.js im Ordner, legt das Skript je ein Muster an; vorhandene Dateien bleiben unberührt.
"""
import io
import os
import sys

if len(sys.argv) != 2 or "/" in sys.argv[1] or sys.argv[1].startswith("."):
    sys.exit("Aufruf: python3 -I projekte/pia-warum/anlegen.py <ordner>   (Ordnername ohne Pfad)")
hier = os.path.dirname(os.path.abspath(__file__))
projekte = os.path.dirname(hier)
quelle = os.path.join(projekte, "pia-folge3", "szene.html")
ziel = os.path.join(projekte, sys.argv[1])
os.makedirs(ziel, exist_ok=True)
text = io.open(quelle, encoding="utf-8").read()


def ersetze(alt, neu):
    global text
    n = text.count(alt)
    if n != 1:
        sys.exit(f"Anker {n}-mal gefunden statt einmal: {alt[:90]!r}")
    text = text.replace(alt, neu)


# Titel und Einstellungen der Folge (folge.js wird nach zeiten.js geladen und darf die Zeiten lesen)
ersetze("<title>Pia, Folge 3: Dein Teller ist eine Stimme (3D)</title>", f"<title>Pia, Kurzfolge {sys.argv[1]} (3D)</title>")
ersetze('<script src="zeiten.js"></script>', '<script src="zeiten.js"></script>\n<script src="folge.js"></script>')

# Nur die Szenen aus stimme.txt spielen; fehlende Bühnen bekommen ein Zeitfenster nach dem Filmende.
ersetze("const SC = IDS.map((id) => Z.szenen.find((s) => s.id === id));",
        "const F = window.__FOLGE || {};\n"
        "const SC = IDS.map((id, n) => Z.szenen.find((s) => s.id === id) || { id, t0: G + 10 + n, t1: G + 11 + n, zeilen: [], fehlt: true });\n"
        "const FOLGE = Z.szenen.map((s) => IDS.indexOf(s.id));   // Reihenfolge im Film als Nummern der Bühnen\n"
        "if (FOLGE.includes(-1) || new Set(FOLGE).size !== FOLGE.length) throw new Error('stimme.txt: unbekannte oder doppelt verwendete Szene');\n"
        "// Eine Szene endet, wo die nächste beginnt (Bühne und Kamera wechseln im selben Bild); die letzte endet mit dem Film.\n"
        "const ENDE = IDS.map((_, n) => { const j = FOLGE.indexOf(n); return j < 0 ? SC[n].t1 : (j + 1 < FOLGE.length ? SC[FOLGE[j + 1]].t0 : G); });")

# Kamera: dieselben Grenzen wie die Szenen; je Bühne in folge.js überschreibbar (kamera: { S5: [[u, Ort, Blickpunkt, Bildwinkel], …] })
ersetze("const KS = (i, ease, shake, keys) => ({ t0: SC[i].t0, t1: SC[i].t1 + (i === 9 ? 0.01 : 0), ease, shake, keys: keys.map(",
        "const KS = (i, ease, shake, keys) => ({ t0: SC[i].t0, t1: ENDE[i] + (ENDE[i] >= G ? 0.01 : 0), ease, shake, keys: ((F.kamera || {})[IDS[i]] || keys).map(")

# S5: Zeitpunkt, ab dem die zehn Hühner erscheinen (passend zum Satz «rund zehn für jeden Menschen»)
ersetze("const t0 = 1.0 + k * 0.45; anim[4].push(",
        "const t0 = (F.huehnerAb ?? 1.0) + k * (F.huehnerTakt ?? 0.45); anim[4].push(")

# Karten je Bühne in folge.js überschreibbar (karten: { S5: ({ zahl, tl, D }) => [[gross, klein, Sekunde], …] })
ersetze("  const a = [];\n  switch (i) {",
        "  const a = [];\n  const eigene = (F.karten || {})[IDS[i]]; if (eigene) return eigene({ zahl, tl, D });\n  switch (i) {")

# Aktuelle Szene = die letzte, die schon begonnen hat (keine Lücke, in der Bühne 1 kurz aufblitzt)
ersetze("const i = Math.max(0, SC.findIndex((s) => t >= s.t0 && t < s.t1)), sc = SC[i], tl = t - sc.t0, D = sc.t1 - sc.t0, u = tl / D;",
        "let j = 0; for (let k = 0; k < FOLGE.length; k++) if (t >= SC[FOLGE[k]].t0) j = k;\n"
        "  const i = FOLGE[j], sc = SC[i], tl = t - sc.t0, D = ENDE[i] - sc.t0, u = tl / D;")

# Das erste Schild steht ab dem ersten Bild voll da (kein Einblenden am Anfang). Ein Schild gehört zu seiner Szene:
# es blendet mit ihr aus und steht nie über der nächsten Bühne.
ersetze("let aktiv = null; for (const z of zl) if (z.titel && t >= z.start - 0.15 && t <= z.start + z.dauer + 0.5) aktiv = z;\n"
        "  if (aktiv) { schild.textContent = aktiv.titel; pop(schild, (t - (aktiv.start - 0.15)) / (aktiv.dauer + 0.65)); } else schild.style.opacity = 0;",
        "let aktiv = null; for (const z of zl) if (z.titel && sc.zeilen.includes(z) && t >= z.start - 0.15 && t <= z.start + z.dauer + 0.5) aktiv = z;\n"
        "  if (!aktiv && t < zl[0].start) aktiv = zl[0];\n"
        "  if (aktiv) { schild.textContent = aktiv.titel; const us = (t - (aktiv.start - 0.15)) / (aktiv.dauer + 0.65);\n"
        "    if (aktiv === zl[0] && us < 0.12) { schild.style.opacity = 1; schild.style.transform = 'scale(1)'; } else pop(schild, us);\n"
        "    if (j < FOLGE.length - 1) schild.style.opacity = schild.style.opacity * Math.min(1, Math.max(0, (D - tl) / 0.22)); } else schild.style.opacity = 0;")

# Oberkante der drei Karten je Bühne einstellbar (kartenTop: { S10: [1260, 1435, 1610] }), damit sie nichts Wichtiges verdecken
ersetze("kk.forEach((el, n) => { const k = ks[n];",
        "kk.forEach((el, n) => { el.style.top = ((F.kartenTop || {})[IDS[i]] || [980, 1180, 1380])[n] + 'px'; const k = ks[n];")

# Eine Karte darf früher enden: viertes Feld = Sekunde in der Szene, bis zu der sie ausblendet ([gross, klein, von, bis])
ersetze("const aus = glatt(lin(0, 0.25, D - 0.3 - tl));",
        "const aus = glatt(lin(0, 0.25, D - 0.3 - tl)) * (k[3] != null ? glatt(lin(0, 0.25, k[3] - tl)) : 1);")

# Kein Schwarz am Anfang: das erste Bild ist voll hell. Am Ende kurze Blende (0,35 s).
ersetze("const blende = Math.min(1, t / 0.5) * Math.min(1, (G - t) / 0.5) * (0.15 + 0.85 * glatt(lin(0, 0.22, tl))) * (0.15 + 0.85 * glatt(lin(0, 0.22, D - tl)));",
        "const blende = (j === 0 ? 1 : 0.15 + 0.85 * glatt(lin(0, 0.22, tl))) * (j === FOLGE.length - 1 ? Math.min(1, (G - t) / 0.35) : 0.15 + 0.85 * glatt(lin(0, 0.22, D - tl)));")

io.open(os.path.join(ziel, "szene.html"), "w", encoding="utf-8").write(text)
print("geschrieben:", os.path.join(ziel, "szene.html"), "|", len(text), "Zeichen")

muster = {
    "stimme.txt": "S1\tErster Satz (Bühne S1).\tSchild zum ersten Satz\nS10\tSchlusssatz (Bühne S10).\tSchild zum Schlusssatz\n",
    "folge.js": "/* Einstellungen dieser Folge, siehe ../pia-warum/README.md */\nwindow.__FOLGE = {};\n",
}
for name, inhalt in muster.items():
    pfad = os.path.join(ziel, name)
    if not os.path.exists(pfad):
        io.open(pfad, "w", encoding="utf-8").write(inhalt)
        print("Muster angelegt:", pfad)
