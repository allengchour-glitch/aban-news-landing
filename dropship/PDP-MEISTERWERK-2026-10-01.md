# Produktseiten-Meisterwerk (01.10.2026) — Betreiber «nutze grow plan und mache ein meisterwerk»

**Auswahl = wo Geld und Kaufwille ankommen:** Sirène, Aurora, Provence (bezahlter TikTok-Verkehr: 112 Sitzungen, 0 Warenkörbe)
und die zwei Kleider mit Tatis echten Fotos (Blumenkleid, Midikleid).

**Messgerät:** `tools/pdp_meisterwerk.py` (8 Punkte: SEO-Titel, ≥6 Bilder, HD-Hauptbild, HD-Anteil, Video, Variantennamen,
Versandzusage passend zum Preis, Beschreibung ≥900 Zeichen). Selbsttest 7/7 auf einer Kopie an anderem Pfad
(Schlechtfall < 3/10, Rohnamen «Color»/«Pink 1» erkannt, XL/XXL kein Rohname, Versand ohne Text = «?» statt ok).

| Seite | vorher | nachher | was fehlt noch |
|---|---:|---:|---|
| Sirène CHF 49.90 | 8,8 | **10,0** | — |
| Aurora CHF 69.90 | 3,8 | **7,5** | HD-Bilder: CJ hat nur 800 px (gemessen, 7 Bilder) — nicht hochgerechnet |
| Provence CHF 39.90 | 8,8 | 8,8 | HD-Anteil 4/11 |
| Blumenkleid CHF 24.90 | 6,2 | **10,0** | — |
| Midikleid CHF 39.90 | 3,8 | **8,8** | HD-Anteil |
| **Schnitt** | **6,3** | **9,0** | |

## Was geändert wurde
1. **Versandzusage am Preis (Theme `templates/product.json`, Blöcke `lux_trust` + Lieferdatum, Backup vorher gezogen):**
   Preis ≥ CHF 50 → «🚚 Gratis Versand für diesen Artikel» / «Gratis Versand inklusive»; 45–49.99 → dasselbe «(ohne Gutschein)»;
   darunter unverändert «Versand CHF 7 · gratis ab CHF 50». Wahr in jedem Fall: Shopify-Regel gratis ≥ 45 nach Rabatt,
   50 × 0,9 = 45 (WELCOME10). Gilt für ALLE Produkte ab CHF 45. Live per WebFetch bestätigt (Aurora).
   **Sirène-Preis bewusst NICHT auf 50.00** — die laufende TikTok-Anzeige zeigt CHF 49.90 im Bild (Preisbekanntgabe).
2. **SEO-Titel + -Beschreibung** für Sirène, Aurora, Blumenkleid, Midikleid (zusammen geschrieben — `seo:{}` ist ein Ganzes);
   «schnelle Lieferung» (falsch, 10–20 WT) raus.
3. **Midikleid-Farben:** «Color» → «Rosenprint», «Pink 1» → «Bunt» (am Variantenbild bestimmt; CJ-Bestellung läuft über SKU).
4. **Beschreibungen** Aurora/Blumenkleid/Midikleid: «So trägst du es», Passform (asiatische Grössen), Material & Pflege —
   nur belegte Angaben (Satin, Polyester); Tati-Kleider mit Hinweis «Echte Fotos an unserer Kundin».
5. **Grow-Videos:** zwei Produktvideos aus Tatis Fotos (ruhige Kamerafahrt, ohne Text/Ton, 1080×1440, 11,2 s / 8,2 s;
   Foto 7 nur als Kleid-Detail, Gesicht angeschnitten), je an Position 2, READY 1080p. Dateinamen `tati-model-…` (Markierungspflicht).

## Ehrlich offen
- **Bewertungen 0 auf allen fünf** — bei CJ GEMESSEN 0 Kommentare (product/productComments). Nicht erfinden (UWG).
  Echter Weg: Tati (falls Käuferin) bittet der Betreiber um eine Bewertung über Judge.me.
- **HD-Bilder Aurora/Provence/Midikleid:** keine grösseren Originale beim Lieferanten.
- **Wirkung:** misst `KAUFWILLE`-Zeile + ShopifyQL `utm_campaign=lernen-okt26` (Warenkörbe je Anzeige) in den nächsten Tagen.
