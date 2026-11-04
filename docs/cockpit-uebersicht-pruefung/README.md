# Cockpit-Übersicht: Prüfwerkzeuge (04.11.2026)

Alles hier prüft `tools/trading/krypto_bot/cockpit.html`, eine einzige Datei ohne Netzzugriff (nur `/api/stand` und `/api/profit`, kein Skript und kein Stil von aussen).
Die Übersicht steht ganz oben, der alte Inhalt darunter unter «Details». Sie hat eine eigene **Handy-Fassung** (bis 700 px Breite), keine geschrumpfte Desktop-Seite.

## Ablauf

```
python3 docs/cockpit-uebersicht-pruefung/fixtures.py          # schreibt fx/<Fall>/{stand,profit,protokoll}.json neben das Skript (nicht im Repo)
node    docs/cockpit-uebersicht-pruefung/uebersicht.test.js   # Desktop und Allgemeines (Chromium, Playwright)
node    docs/cockpit-uebersicht-pruefung/handy.test.js        # Handy: 360×640, 390×844, 412×915, hell und dunkel, Berührung, Faktor 2
node    docs/cockpit-uebersicht-pruefung/messwerte.js         # die gemessenen Zahlen (Scrollen, Tippfläche, Kontrast, Konsole, reduzierte Bewegung), 30 Messungen
node    docs/cockpit-uebersicht-pruefung/bilder_alle.js docs/cockpit-uebersicht-pruefung/bilder   # alle 24 Bilder (Faktor 2)
node    docs/cockpit-uebersicht-pruefung/smoke_echt.js        # Rauchprobe mit dem ECHTEN Server (cockpit.py aus einer Kopie des Baums, leeres data/): echte JSON-Antworten, echte Seite
python3 tools/trading/krypto_bot/test_cockpit.py              # Selbsttest des Cockpits (enthält die Übersicht)
python3 tools/trading/krypto_bot/uebersicht_rein.py           # nur die reinen Funktionen (node), Erwartungswerte von Hand gerechnet
python3 docs/cockpit-uebersicht-pruefung/mutationsprobe.py    # 64 Mutanten der reinen Funktionen, jeder muss erkannt werden
node    docs/cockpit-uebersicht-pruefung/mobil_bilder.js voll 390 844 dunkel bilder/m oben,positionen,satellit,auftraege,maerkte,lage,details,ampelauf,blase
node    docs/cockpit-uebersicht-pruefung/schnellbild.js  voll 1440 900 hell bilder/d.png     # Desktop (mit CLIP=x,y,b,h und VOLL=0 für Ausschnitte)
```

`COCKPIT_HTML=<Datei>` prüft eine andere Fassung, `ABSCHNITT=2,3` lässt `handy.test.js` nur diese Abschnitte laufen (1 Größen und Designs, 2 Blase/Kurve/Tastatur, 3 Ränder, 4 Größenänderung, 5 Fälle, 6 Desktop). Playwright kommt aus `require('playwright')` oder `/opt/node-tools/node_modules/playwright`.

**Letzter Lauf (04.11.2026, Stand mit der Labor-Kachel):** `uebersicht.test.js` 127/0 · `handy.test.js` 407/0 · `test_cockpit.py` 336/0 · `uebersicht_rein.py` 41/0 · `mutationsprobe.py` 64 von 64 erkannt (Stand vor der Labor-Kachel) · `smoke_echt.js` ok · `tools/trading/test_paket_bauen.py` 35/0.

## Bilder (`bilder/`, Faktor 2)

24 Bilder des ersten Bildschirms: Desktop `desktop-1440x900-<dunkel|hell>-<normal|keine-positionen|echtgeld>.png` und Handy `handy-<360x640|390x844|412x915>-<dunkel|hell>-<normal|keine-positionen|echtgeld>.png`. Erzeugt mit `bilder_alle.js` aus den Fixtures (nicht aus einem laufenden Konto).

## Fälle (`fixtures.py`)

| Fall | Inhalt |
|---|---|
| `voll` | Testnetz-Konto 5'122.95 USDT, BTC und ETH long mit Stop, drei Satelliten-Positionen, ein ausgestoppter Coin, ein gescheiterter Auftrag, Ampel mit 4 roten Punkten und 1 Warnung, ein Zeitraum ohne gemerkten offenen Stand (Stern) |
| `leer` | keine Positionen, keine Aufträge, kein Satellit-Lauf, Ampel grün |
| `echtgeld` | Betriebsart ECHTGELD (roter Streifen, «ECHTGELD» in Pille und Konto-Karte, Satellit «nur Testnetz») |
| `daten_fehlen` | Server liefert nichts Brauchbares: kein Konto, kein Profit, kein Satellit, keine Kurse |
| `xss` | Schadtext in jedem Feld, das ausgegeben wird |

Jeder Fall trägt auch `scalp` (Scalping-Labor, Papier): `voll` mit den echten Oktober-Zahlen (8 Bücher, «durchgefallen»), `leer` nie gelaufen, `daten_fehlen` ohne `scalp`, `xss` mit Schadtext in Grund, Hinweis und Markt, `gross` mit 12'345'678 Handeln.
| `gross` | Millionenkonto (lange Zahlen dürfen nichts abschneiden oder überlaufen) |

## Was gemessen wird

**Allgemein (`uebersicht.test.js`)**: keine Konsolenfehler und keine Anfrage ausserhalb von 127.0.0.1; kein seitliches Scrollen bei 390, 768 und 1440 px, hell und dunkel; jede Zahl der Übersicht gleich dem von Hand gerechneten Wert (Kontowert, vier Zeiträume, Engagement 1.32×, Stop-Abstände, Kursleiter-Lagen in Prozent der Achse, Satelliten-Zeilen, Zeitstrahl, Angst-und-Gier-Zeiger −23.4°); Ampel mit Tastatur (Enter, Leertaste, Escape); Design-Schalter; Schadtext erscheint als Text, nie als Markup; Fälle leer, Echtgeld, Daten fehlen, Server weg; Kontrast jedes sichtbaren Textes ≥ 4,5:1 (gross ≥ 3:1) in beiden Designs.

**Handy (`handy.test.js`)**, je 360×640, 390×844, 412×915 und hell/dunkel:
- Daumenzone: Not-Aus und Auto-Handel ≥ 48 px hoch, ≥ 96 px breit, mindestens 16 px Abstand zu jedem anderen Knopf, im ersten Bildschirm über der Sprungleiste; der Design-Schalter liegt nicht mehr neben dem Not-Aus.
- Kontostand ≥ 40 px, im ersten Bildschirm, de-CH («5'122.95 USDT»), nicht abgeschnitten; auch als Millionenkonto.
- Gesundheit als breite Kachel (≥ 56 px) mit Zählern ✕ 4 · ! 1 · ○ 2 · ✓ 6; die Liste öffnet nur die 5 Punkte mit Handlungsbedarf, «8 weitere Punkte» klappen separat auf und bleiben beim Neuzeichnen offen.
- Sprungleiste: fest am unteren Rand, fünf Ziele (Übersicht, Positionen, Satellit, Aufträge, Details), jedes ≥ 48 px, Beschriftung passt hinein, Anker existiert (auch ohne Positionen und ohne Daten); Tippen bringt den Abschnitt nach oben und markiert ihn; am Seitenende liegt nichts unter der Leiste; der Verlauf bleibt unberührt (`replaceState`).
- Tabellen werden Karten (Block, Kopfzeile aus, Zeile als Raster, jede Zelle mit Spaltennamen, Hinweiszeilen ohne Namen); nirgends ein waagerecht scrollender Behälter; kein Element ragt aus dem Fenster.
- Kursleiter gross (Höhe ≥ 60 px, Kurs-Marke ≥ 28 px), Legende in zwei Spalten mit Werten ≥ 17 px; Satelliten-Positionen als Karten mit Leiter über die ganze Breite.
- Kein Mauszeiger nötig: Hinweis-Knöpfe ≥ 44×44 px öffnen die Blase per Tippen und Enter, schliessen mit Tippen daneben, Escape und Scrollen; die Blase bleibt im Fenster und über der Sprungleiste; Fokusring sichtbar; keine Auskunft hängt nur an einem `title`; die Konto-Kurve zeigt Tag und Wert per Finger und lässt senkrechtes Wischen durch (`touch-action: pan-y`).
- Sichere Ränder: `viewport-fit=cover`; mit überschriebenen Variablen (Kerbe 47 px, Home-Balken 34 px) weichen Sprungleiste und Inhalt aus, ohne Überstand. Zwei `theme-color`-Angaben, die dem Design folgen (auch nach dem Umschalten). Reduzierte Bewegung: kein weiches Scrollen.
- Größenänderung: nur die Höhe (Adressleiste) zeichnet nicht neu, die Breite schon; ab 701 px verschwindet die Sprungleiste, quer (640×360) bleibt alles nutzbar.
- Die Seite wird **nie breiter als das Fenster**, auch nicht für ein einzelnes Bild: ein Fühler misst in jedem Bild `max(innerWidth, scrollWidth)`; nach einem Neuzeichnen der alten Abschnitte muss er genau die Fensterbreite zeigen, die Skalierung 1.
- Desktop bleibt Desktop: keine Sprungleiste, echte Tabellen, klebendes Kopfband, Live-Markt im Kopf.

**Rauchprobe (`smoke_echt.js`)**: startet das echte `cockpit.py` aus einer Kopie des Baums (leeres `data/`, ohne Schlüssel, ohne Telegram), liest `/api/stand` und `/api/profit` und lädt die echte Seite am Handy und am Desktop: alle neuen Schlüssel (`satellit`, `kurse`, `kurse_schnitt`) sind da, 7 Karten, keine Konsolenfehler, kein Überstand.

**Reine Funktionen (`uebersicht_rein.py`, `mutationsprobe.py`)**: 19 Funktionen (Kursleiter, Auslastung, Kurven, Ampel-Gruppen, Sprungleiste, Karten-Tabellen, Hinweis-Blase, …) rechnen ohne DOM und werden mit node ausgeführt; 41 Prüfungen mit von Hand gerechneten Erwartungswerten. Die Mutationsprobe verändert je eine Stelle (64 Mutanten); im ersten Durchlauf überlebten 2 (Vorrang «Fehler» im Zeitstrahl, ungültige Einträge der Sprungleiste): dafür gibt es jetzt je einen Fall, seither 64 von 64 erkannt.

## Gemessene Werte (`messwerte.js`, 04.11.2026)

30 Messungen: 2 Designs × 3 Fälle (normal, keine Positionen, Echtgeld) × 5 Breiten (360, 390, 412, 768, 1440 px), Ampel geöffnet.

| Messgrösse | Ergebnis |
|---|---|
| Seitliches Scrollen (`scrollWidth` > `innerWidth`) | 0 von 30; die Seite wird auch nie breiter als das Fenster (Fühler in `handy.test.js`) |
| Konsolenfehler und -warnungen | 0 |
| Kontrast, schlechtester normaler Text | dunkel 4,80:1 (weisser Text auf dem roten Not-Aus, 16 px); hell 4,54:1 (grüne Zahl auf grünem Grund, 15 px); Ziel 4,5:1 |
| Kontrast, schlechtester grosser Text | dunkel 5,99:1; hell 4,54:1; Ziel 3:1 |
| Kleinste Tippfläche (kürzere Seite) | Handy 44 px (Zusammenfassungen 302×44, Hinweis-Knöpfe 44×44, Sprungleiste ≥ 52 px hoch); Tablet und Desktop 44 px (Live-Markt 126×44, Auto-Handel 195×44, Design-Schalter 44×44) |
| Not-Aus und Auto-Handel am Handy | je ≥ 56 px hoch, 18 px Abstand untereinander, ≥ 16 px zu jedem anderen Knopf |
| Reduzierte Bewegung (`prefers-reduced-motion`) | `scroll-behavior: auto`, Übergänge 0 s |
| Tastatur | Tab-Reihenfolge Live-Markt → Auto-Handel → Not-Aus → Ampel → Design-Schalter; Ampel mit Enter, Leertaste, Escape; Auto-Handel mit Leertaste und Enter (fragt nach, sendet `auto_aus`); Not-Aus mit Enter (fragt zuerst nach, sendet erst dann); Design-Schalter mit Enter |

## Funde der Prüfung (Stand 04.11.2026)

1. **Kurz zu breite Tabelle zoomte die Seite heraus.** Die Karten-Darstellung der Tabellen hing zuerst an einer Klasse, die ein Skript erst im nächsten Bild setzte; in der Zwischenzeit stand die 8-spaltige Positions-Tabelle in voller Breite (891 px) im Handy-Fenster, und Chromium vergrösserte die Layout-Breite (`innerWidth` 890 statt 390). Das Neuzeichnen wurde dadurch teils übersprungen (Unterschrift mit falscher Breite: 7 von 12 Läufen), eine Kurve hätte mit der falschen Breite gezeichnet werden können. Die ersten Handy-Prüfungen sahen es nicht: sie verglichen `scrollWidth` mit `innerWidth`, und beide wachsen zusammen. Behoben (reines CSS ab dem ersten Layout), Fühler eingebaut; **der Fühler schlägt an der alten Fassung in allen 6 Kombinationen an** (max 890–891 px), an der neuen nie.
2. **Kontrast im hellen Design:** Warn-Bernstein auf Bernstein-Grund hatte 3,96:1 (Ziel 4,5:1). Neue Variable `--amber-ink` (hell `#7a5200`, dunkel unverändert). Die alten Abschnitte unter «Details» benutzen jetzt dieselben lesbaren Grün- und Rottöne wie die Übersicht (das alte Grün hatte im hellen Design rund 3,4:1), und das gedämpfte Grau (`--ink-3`) ist im hellen Design etwas dunkler.
3. **Mutationsprobe, erste Runde:** 62 von 64 erkannt. Die zwei Überlebenden (Vorrang «Fehler» vor «nur verkleinern» im Zeitstrahl, ungültige Einträge der Sprungleiste) zeigten blinde Stellen der Prüfung; jetzt je ein Fall, seither 64 von 64.
4. **Tastatur-Prüfung:** ein erster Lauf drückte Enter, während das weiche Scrollen zum Fokus noch lief; das Scrollen schliesst die Blase absichtlich. Die Prüfung wartet jetzt, bis die Seite ruht (Fehler der Prüfung, nicht der Seite).
5. **«ECHTGELD» zu blass (nur die Messung sah es):** die rote Pille hatte dunkel 3,93:1 und hell 4,36:1 (Ziel 4,5:1); die Kontrastprüfung lief zuerst nur im Normalfall. Jetzt `--loss` (dunkel hell-rot, hell dunkel-rot) und die Prüfung läuft auch in «keine Positionen», «Echtgeld» und «Daten fehlen», am Desktop und am Handy. Der Design-Schalter war am Desktop 44×39 px gross, jetzt 44×44.

## Nicht gemessen

- Echtes Windows und der Browser des Besitzers, Safari auf dem iPhone (WebKit), Chrome auf einem echten Android-Gerät: alles hier läuft in Chromium mit Berührungs-Emulation. `env(safe-area-inset-*)` wurde über die Variablen überschrieben, nicht auf einem Gerät mit Kerbe gesehen.
- Echte Schriften der Geräte (Roboto, San Francisco): die Beschriftung der Sprungleiste bei 360 px passt in Chromium mit der Systemschrift dieses Rechners hinein.
- Echte Läufe: alle Zahlen stammen aus den Fixtures; der echte Server wurde nur mit leerem `data/` (ohne Konto, ohne Positionen) geprüft, nicht mit einem laufenden Konto.
- Wirkung auf den Alltag des Besitzers (liest er auf dem Handy anders?): offen.
