# Kauf-Strecke, Tag 13 (vorgezogen 12.10.2026) — Abendkleid-Seiten und Versandtext

Plan: `dropship/WEBSEITE-12-TAGE-BILANZ.md` §6, Punkt 13.10. («Abendkleid-Seiten prüfen»), vorgezogen.
Messbar fertig: je Seite ein Ursachenbefund mit Zahl. Alle Zahlen **GEMESSEN** mit den genannten Befehlen.

## 1. Gemessen

| Kennzahl | Sirène | Aurora | Provence-Set | Quelle |
|---|---:|---:|---:|---|
| TikTok-Produktsitzungen 01.10.–heute | 58 · **0 Warenkörbe** | 46 · **0** | 40 · 2 | ShopifyQL `utm_source` × `landing_page_path` |
| Preis (Shopify) | 49,90 | 69,90 | 39,90 | `productByHandle`, `priceRangeV2` |
| Bewertungen (Metafeld `reviews.rating_count`) | keine | keine | keine | `productByHandle` |
| Bilder | 10 | 8 | 12 | `media` |
| Produktspezifische Grössentabelle | nein (nur allgemeine Damen-Tabelle) | nein | — | Live-Seite, WebFetch |

**Ohne Herkunft** (kein `utm_source`, Produktseite, 01.10.–heute): 189 Sitzungen, **0 Warenkörbe**, davon
177 mobil und 14 Desktop (`session_device_type`). Spitze 01.10. (59) und 02.10. (36).

**Kasse** (`draftOrderCalculate`, nur lesend, CH-Adresse, keine Bestellung angelegt):

| Warenwert (eine Position) | Versandraten |
|---|---|
| 39,90 / 44,90 | Standard 7,00 |
| 45,00 | Kostenloser Versand 0,00 **und** Standard 7,00 |
| 49,90 / 49,99 / 50,00 | Kostenloser Versand 0,00 **und** Standard 7,00 |

→ Die Kasse gibt Einzelbestellungen ab **45 CHF** gratis. Die öffentliche Zusage bleibt **ab 50 CHF**
(Betreiber 02.10.; Begründung in `automation/versandaussagen_wahrheit.py`, `warenkorb_gratisversand.py`).

## 2. Befunde

**F1 — BESTÄTIGT, Fehler im Text.** Das Sirène (49,90) schreibt «Versand CHF 7, ab CHF 50 gratis — mit einem
zweiten Artikel ist er bei diesem Kleid also inklusive.» Die Kasse verlangt für das Kleid **keine** 7 CHF.
Der Satz kostet also Kaufbereitschaft (7 CHF Versand scheint dazuzukommen) und ist sachlich falsch.
Gleiche Klasse: das Wecker-Armband (49,90) schreibt in der FAQ «darunter kostet der Versand CHF 7».
Klassengröße (Voll-Export 53'568 aktive Produkte): 1'464 in der Spanne 45–49,99 CHF, davon **2** mit dem Fehler.
Unter 45 CHF sind 10 Texte mit «Versand CHF 7» richtig. → Regel und Wächter: `automation/versand_band_wache.py`.

**F2 — WIDERLEGT (Warnung an uns selbst).** Die Zusammenfassung «Angebotspreis» im Live-Seitentext war falsch:
Das Wort steht im Theme nur als `visually-hidden`-Text für Screenreader (`snippets/price.liquid`,
Schlüssel `content.price_sale`). Für Käufer sichtbar ist es nicht. Kein Handlungsbedarf für den Verkauf.

**F3 — BESTÄTIGT, Quelle außerhalb des Themes.** «No reviews» (Englisch) und «⭐ Bestbewertet» stehen nicht im
Theme. Die Bewertungs-Blöcke `shopify://apps/judge-me-reviews/…` (in `templates/product.json`) rendern sie.
Textänderung nur im Judge.me-Admin → **Betreiber-Klick**. «Bestbewertet» ohne Bewertungen ist eine unbelegte
Aussage; sie gehört weg, solange keine Bewertung vorliegt.

**F4 — keine Bewertungen auf allen drei Seiten** (Befund oben). Echte Kommentare von CJ: Prüfung läuft (Gegenprobe).

**F5 — keine produktspezifische Grössentabelle** bei Kleidern (Live-Seite: «Steht auf der Produktseite eine
eigene Tabelle, gilt immer die dort angegebene» — hier aber keine). Rückgabe-Risiko bei Kleidern. Ob CJ
Grössenmasse liefert, prüft die Gegenprobe.

## 3. Änderungen heute

- Keine Änderung am Shop in dieser Notiz. Die Gegenprobe (Workflow `kaufstrecke-abendkleid-gegenprobe`) prüft
  F1–F5 unabhängig, bevor geschrieben wird.
- Neu im Repo: `automation/versand_band_wache.py` (Trockenlauf findet genau die zwei Produkte; `SCHARF=1` schreibt
  nur exakt einmal vorkommende Sätze und liest zurück; Ledger `dropship/_versand_band.tsv`). Noch nicht im Aufseher.

## 4. Offen

- **Betreiber:** Judge.me-Texte («No reviews», «Bestbewertet») im Admin ändern oder die Badge abschalten.
- **Betreiber:** Google-Ads «sirene-test» (Stop-Regel: 24 Sitzungen, 0 Warenkorb, rund CHF 30 → pausieren) und
  Produktgruppe «Alles andere» ausschließen. Nur im Google-Ads-Konto möglich.
- **Nachmessen** nach 24 h: Warenkörbe der beiden Seiten gegen die 0 von heute.
