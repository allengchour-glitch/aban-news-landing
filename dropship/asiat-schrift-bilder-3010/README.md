# Asiatische Schrift auf Produktfotos (30.10.2026)

Anlass: Reklamation #1021 (blaue Uhr). Geliefert wurde eine «TIGERAO»-Uhr mit chinesischem Wochentag im Datumsfenster,
abgebildet war die NIBOSI. Besitzer-Auftrag 30.10.: «alle asiatischen Schrift bei produkten löschen».

## Gemessen (GEMESSEN 30.10.2026, Bulk-Abfrage und Bildscan)

- **Text** (Titel, Beschreibung, SEO, Tags, Hersteller, Produktart, Optionen, Bildbeschreibung, Varianten) aller 56 622 aktiven Produkte:
  **0** Produkte mit chinesischen, japanischen oder koreanischen Zeichen. Nur Satzzeichen in Vollbreite (`，` `、` `（` `）`) bei 6 Produkten,
  am 30.10. auf ASCII-Zeichen umgestellt (4 Beschreibungen, 2 Optionslisten, frisch nachgelesen, Varianten und SKUs unverändert).
- **Fotos:** 5 348 Bilder gelesen (817 besuchte Produktseiten der letzten 30 Tage mit je 3 Bildern, Uhren-Sammlung mit je 1 Bild).
  344 Bilder mit asiatischer Schrift, 313 Produkte. Danach alle 2 834 Bilder dieser 313 Produkte gelesen (1 455 mit Schrift).
- **Messgerät:** Gemini (`gemini-2.5-flash`). Tesseract (chi_sim) fiel durch die Kontrolle (fand «星期五» auf dem Uhrenfoto nicht, meldete
  Text auf dem sauberen NIBOSI-Foto). Gemini fand «星期五» und meldete das NIBOSI-Foto sauber.
- **Einstufung** (zweiter Lauf, 700 px Breite): von 1 455 Treffer-Bildern **1 162 deutlich**, 155 klein, 54 winzig, 84 keine.
  Die erste Fassung hätte auch winzige Schrift gelöscht (Kühlschrank-Etikett, Beutel in einer Tasche); davon sind nur
  «deutlich» betroffen. Stichprobe von 7 Bildern angesehen: Preisschild «统一零售价 ¥3988», Wochentage im Zifferblatt, Packungsfront.

## Regel

Nur Bilder mit **deutlicher** Schrift. Pro Produkt:
- Mindestens 3 saubere Bilder bleiben: deutliche Bilder löschen (ausser sie sind das Bild einer Variante), saubere nach vorn.
- Weniger als 3 saubere Bilder: Produkt auf **Entwurf**, Bilder bleiben unberührt.
- Variantenbilder mit deutlicher Schrift bleiben stehen (sonst verlöre die Variante ihr Bild), sie stehen in `treffer-liste.csv`.

## Rückweg

`plan-mit-bild-ids.json` hält je Produkt alle Medien-IDs, Bildadressen, Positionen und die Variantenverknüpfung vor dem Lauf.
Ein gelöschtes Bild lässt sich in Shopify nicht zurückholen; die Originale kommen von CJ (`product/query`, `productImage`). Entwürfe: Status wieder auf ACTIVE.

## Dateien

- `plan-mit-bild-ids.json` Plan und Sicherung, `einstufung.jsonl` Einstufung je Bild, `treffer-liste.csv` erste Fassung (alle Treffer, vor der Einstufung)
- `gem.mjs`, `stufe.mjs`, `phaseA.mjs` Messläufe, `apply.mjs` Anwenden (`LIVE=1`, `ONLY=handle,…`, `MAX=n`; Vorgabe Trockenlauf)
- Die Skripte lesen `/tmp/advbau-claude/sh.mjs` (Token-Helfer) und Pfade unter `/tmp/cm/cjk/`; ohne diese Umgebung nicht lauffähig.
