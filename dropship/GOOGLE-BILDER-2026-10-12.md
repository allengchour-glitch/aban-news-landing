# Google-Gratis-Einträge: Bild-Blocker — Messung und Behebung (12.10.2026, «weiter»)

Ausgangslage (Google-Scan 12.10. 00:35 UTC): 1'035 Free-Listings-Blocker. Grösste Klassen: Image under review 439 ·
Inappropriate image 318 · Unable to show image 107 · Restricted adult content 107 (heute früh schon aus dem Google-Kanal) ·
Promotional overlay on image 31.

## 1. Wirkt der Bildtausch überhaupt? (Messgerät `automation/google_bildtausch_bilanz.py`)
GEMESSEN: getauschte Produkte sind nach dem Scan zu **76–91 % frei** (tausch 78 %, tausch-g 76 %, tausch-q 91 %),
die unberührte Vergleichsgruppe nur zu **46–47 %** (behalten 46 %, uneinig 47 %). Der Tausch wirkt — also weitermachen.

## 2. «Inappropriate image»: die 39 noch unbehandelten Produkte
- Trockenlauf: 18 Tausch + 1 Tausch-u · 10 Motiv (Artikel selbst ist der Grund) · 3 uneinig · 7 nur ein Bild.
- **Neue Regel:** Waffenzubehör wird nie per Bildtausch an Google vorbeigeschoben (Fall: «Outdoor Tactical Bauchtasche mit
  Holster» — beide Modelle wollten tauschen). Muster `WAFFENZUBEHOER` in `google_bild_tausch.py`; Kanarien 8/8 Treffer,
  0 Fehlalarme (Waffeleisen, Druckerpatronen, Auspuff-Schalldämpfer, Hochdruckreiniger-Pistole bleiben frei).
- Scharfer Lauf: siehe Nachtrag unten.

## 3. «Promotional overlay on image» (31): Werbetext auf hellem Grund entfernen
- Neues Messgerät `tools/bild_text_weg.py` (Tesseract): füllt Text NUR, wenn der Rand gleichmässig ist, der Text höchstens
  15 % belegt, die Füllfarbe zum nächsten Bildrand passt (kein leerer Werbebalken) und danach 0 Wörter gelesen werden.
  Selbsttest 4/4 (Etikett auf hellem Grund → weg, Artikel pixelgleich · Text auf Foto → abgelehnt · ohne Text → unberührt ·
  Text auf grauem Balken → abgelehnt).
- Ablauf `automation/google_overlay_bereinigen.py`: 31 gemeldet → 7 durch Bildtausch gesperrt · **1 bereinigt** ·
  21 abgelehnt (Text auf dem Artikel / Foto / Balken) · 2 ohne lesbaren Text (Logo-Grafik).
- Live: «Magnetische Lesebrille» — «RED» weg, neues Bild vorne (zurückgelesen), Original als Bild 2. Ledger-Art «bereinigt»
  sperrt andere Umsortierer (`bildtausch_sperre.py`).
- Ehrliche Grenze: Die meisten Werbetexte liegen auf dem Artikel oder auf Fotos — dort hilft nur ein anderes Bild vom
  Lieferanten. Fremdmarken im Bild (Samsung, USPS, UGREEN, bruder, ROSEER, HANDAIYAN) sind eine Markenfrage, kein Bildfehler.

## 4. «Unable to show image» (107): nicht bei uns
GEMESSEN (Stichprobe 40): alle Hauptbilder HTTP 200, `image/jpeg`, ≤ 493 KB, angelegt Juni–August (nicht kürzlich geändert),
nur 1 Handle mit Sonderzeichen. Kein Fehler auf unserer Seite → Abruf-/Prüfstand bei Google; nicht angefasst.

## 5. «Image under review» (439)
Googles laufende Prüfung (u. a. nach Bildwechseln). Kein Handgriff möglich, ausser keine unnötigen Bildwechsel auszulösen.
