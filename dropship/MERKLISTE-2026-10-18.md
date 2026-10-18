# Merkliste (♥ auf den Karten + Seite /pages/merkliste): überarbeitet, getestet, bewacht (18.10.2026, ~20:25–20:40 UTC)

Marken: **GEMESSEN** = selbst gelesen/getestet, **BEHAUPTUNG** = ungeprüft.

## Anlass
Betreiber 18.10.: «merkliste wunschliste verbessern?». Die Merkliste gibt es seit 06.08. (`CJ-IMPORT-LOG.md`): Herz-Knopf auf jeder Produktkarte
(Skript in `layout/theme.liquid`, Speicher `localStorage` Schlüssel `lux_wish`), Seite `/pages/merkliste` (`sections/lux-merkliste.liquid`,
Vorlage `templates/page.merkliste.json`), Menüpunkt «♥ Merkliste». Idee Nr. 11 aus `WEBSITE-IDEEN-2026-09-15.md` («messbar machen») stand offen.

## GEMESSEN (Live-Dateien, 18.10.)
- Die Seite holte jedes Produkt per `/products/<handle>.js`; **scheiterte der Abruf (Produkt entwurfen/gelöscht), verschwand es stumm und blieb
  für immer im Speicher** — die Besucherin sah weniger Karten als gemerkt, ohne Erklärung.
- **Ausverkauftes** sah aus wie lieferbare Ware; **kein Weg in den Warenkorb** von der Liste (nur Link auf die Produktseite); **kein Zähler**, **kein «Alle entfernen»**.
- Leerer Zustand: nur der Satz, kein Weg weiter. Titel und Handle gingen als HTML in `innerHTML` (Handle kommt aus dem Speicher der Besucherin → Selbst-XSS möglich).
- **Messbar ist die Nutzung nicht:** weder Klarity/GA noch eine Kundenereignis-Senke hängt am Herz. Eine Messung braucht einen Klick des Betreibers
  (Custom Pixel / Clarity-Ereignis, Idee Nr. 11, Tabelle 3 Nr. F) — **nicht geändert**, kein Zähler-Hack über Warenkorb-Attribute.

## GETAN
1. **`sections/lux-merkliste.liquid` neu** (Live vorher geholt = Backup `dropship/theme_live_backup/lux-merkliste.liquid.vor-2026-10-18`,
   neu = `…neu-2026-10-18`; hochgeladen per `themeFilesUpsert`, Rücklesen = Soll): Handle-Prüfung (nur a–z, 0–9, «-»; Duplikate raus), Titel/Preise nur über
   `textContent`, **tote Produkte werden aus der Liste entfernt mit Hinweis** («n Artikel gibt es nicht mehr …»), **«Aktuell ausverkauft»** + blasses Bild,
   Preis mit durchgestrichenem Vorpreis, Zähler «n Artikel gemerkt», **«Alle entfernen» in zwei Schritten** (erster Klick fragt, 4 s Frist),
   leerer Zustand mit zwei Wegen (Neuheiten, Gerade im Trend), **«In den Warenkorb» nur für verfügbare Ein-Varianten-Ware und NICHT für
   «Selbst gestalten»-Produkte** (Tag `selbst-gestalten`/`personalized`/`wunschdesign`: dort führt der Weg über den Editor → Knopf «Gestalten»),
   sonst «Option wählen»/«Ansehen». Lehnt `/cart/add.js` ab, öffnet der Knopf die Produktseite.
2. **Test im echten Browser, ohne Netz:** `tools/merkliste_test.mjs` (Playwright global, Chromium, Fetch gespielt): 15 Prüfungen — gemischte Liste mit Duplikat,
   ungültigem Handle und totem Produkt → Speicher bereinigt, Zähler 5, Ausverkauft ohne Knopf, Editor-Produkt nur «Gestalten», Warenkorb-POST mit Variante 111,
   Einzel-Entfernen, «Alle entfernen» zweistufig, Warenkorb-Fehler → Rückfall, leerer/kaputter Speicher, **kein HTML aus Titeln** (`window.__xss` bleibt leer).
   Gegenprobe: die alte Sektion besteht den Test nicht.
3. **Wächter** `automation/merkliste_wache.py` (Aufseher täglich, `--selbsttest` 6 Abweichungen): liest live Seite, Herz-Skript und Vorlage; meldet Überschreiben
   der Seite (≠ Soll), geänderten Schlüssel `lux_wish`, fehlende Herz-Klasse `.lux-wish`, ausgehängte Sektion. Erster Lauf: «ok». Nur ein ⚠️ erscheint in der Keepalive-Meldung.

## Nicht gemacht (und warum)
- Herz-Skript in `theme.liquid` unverändert (grosse Datei, alle Seiten; Überarbeitung nur der Seite hat die kleine Wirkungsfläche).
- Kein Zähler am Herz im Kopf, keine «Merkliste teilen»-Funktion, kein Konto-Speicher: Der Speicher ist je Gerät (`localStorage`); bei ~1'300 Sitzungen/30 T wäre ein
  Konto-Speicher mehr Aufwand als Nutzen, solange die Nutzung nicht gemessen ist.
- Öffentliche Prüfung per WebFetch: Shop antwortete 429 (Rate-Limit), Rücklesen über die Admin-API und der Browsertest tragen die Aussage; die Seite ist `noindex`.

## OFFEN (Betreiber)
Nutzung messen (Idee Nr. 11): Herz-Klick und Seitenaufruf als Kundenereignis/Clarity-Ereignis einhängen — braucht deinen Klick im Shopify-Admin (Einstellungen → Kundenereignisse).
Bis dahin ist «wird die Merkliste genutzt?» unbekannt, nicht «nein».
