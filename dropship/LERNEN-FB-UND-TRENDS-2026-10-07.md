# Lernen im Netz — Facebook-Reichweite + Oktober-Trends (07.10.2026)

Betreiber 07.10. 18:00: «lerne im internet». Marken: **GEMESSEN** = hier selbst geprüft, **QUELLE** = fremde Angabe,
**BEHAUPTUNG** = ungeprüft.

## 1. Facebook: Links im Beitragstext
- **QUELLE** [Social Media Examiner 2026](https://www.socialmediaexaminer.com/what-facebooks-new-link-rules-mean-for-your-2026-strategy/):
  Meta *testet*, Seiten und Profis ohne Meta Verified auf «2 Links pro Monat» im Beitragstext zu begrenzen. Kommentare,
  Story-CTAs und Messenger sind nicht begrenzt. Zitiert Metas «Widely Viewed Content Report»: nur 2 % der meistgesehenen
  Beiträge enthalten Links. Länder sind nicht genannt.
- **BEHAUPTUNG** (mehrere Blogs, ohne Beleg): Ein Link im Text drosselt die Reichweite, der Link gehört in den ersten Kommentar.
- **GEMESSEN** (Graph `/{seite}/videos`, 97 FB-Videos unserer Seite):
  - 24.09.–05.10.: **27 Reels mit `https://`-Link im Text → 0–4 Aufrufe** (Median 1).
  - 06.–07.10.: **3 Reels nur mit «luxestyle.ch/products/…» als Text → 206, 232, 221 Aufrufe.**
  - ⚠️ Nicht sauber getrennt: Gleichzeitig wechselte der Weg von Graph-API direkt zu Metricool. Die «domain»-Reels vom Juli
    (Graph direkt) hatten ebenfalls 0–1 Aufrufe. Der Link ist also ein Verdächtiger, nicht bewiesen.
- **ENTSCHEID:** Ich hatte heute um 17:50 den klickbaren https-Link wieder eingebaut (`lib/fb_text.mjs`). Das ist
  **zurückgenommen.** FB-Texte tragen die Adresse jetzt als reinen Text (gemessen funktionierende Form), ohne
  «(Link in Bio)», plus Folge-Zeile. Gilt für Reels, Bildposts und Karussells. `FB_KLICKBAR=1` schaltet den alten Weg zurück.
- **Link als ersten Kommentar** über Metricool: kein Beleg im Repo, dass die Metricool-API das kann (Firecrawl ohne Guthaben)
  → offen, nicht geraten.

## 2. Facebook allgemein (QUELLE, nicht nachgeprüft)
- Reels erreichen Nicht-Follower über den Entdecken-Feed. Die Abschlussquote ist die wichtigste Reel-Kennzahl
  ([socialpilot](https://www.socialpilot.co/blog/facebook-algorithm), [metadatareactor](https://metadatareactor.com/blog/facebook-algorithm-2026/)).
- Kadenz für Seiten < 50k: 2–3 Reels, 3–5 Feed-Posts pro Woche, täglich Stories. Unsere Kadenz (Reel 8 h, Bild 6 h,
  Story täglich) liegt **darüber** — Menge ist nicht der Engpass.
- Die ersten 30–60 Minuten nach dem Post entscheiden. **Jeden Kommentar in der ersten Stunde beantworten** (geht nur, wenn
  Kommentare kommen: gemessen 0 in 10 Tagen).
- Meta 2026 belohnt Originalinhalt. Aneinandergereihte Clips mit Untertiteln zählen NICHT als eigen
  (schon im Skill `videoschnitt`, QUELLE about.fb.com 13.03.2026).

## 3. Oktober-Trends → Hype-Reihe
- **QUELLE** [sellthetrend Oktober 2026](https://www.sellthetrend.com/blog/winning-products) (Stand 22.09.),
  [eprolo](https://eprolo.com/best-tiktok-dropshipping-products), [shiptothemoon](https://www.shiptothemoon.com/10-trending-products-for-dropshipping-in-2026-with-google-trends-insights/).
- **GEMESSEN** (productsCount, status:active, Kanarie title:*Haarbürste* = 3):

| Trend | Bestand | Entscheid |
|---|---|---|
| Schleckmatte / Lick Mat | 11 (5 ab CHF 19) | **NEU Thema «Schleckmatte Haustier»** → «Leckmatte für Hunde & Katzen» CHF 39.90 in der Reihe |
| Claw-Clip | 9, alle CHF 15.90 | nein (unter Reihen-Boden 19) |
| Silikon-Gesichtsbürste | 23 | steckt schon in «Beauty-Gerät» |
| Halloween-Deko | 60 | Saison-Reihe, nicht Hype (Partydeko-Regel) |
| Haar-Lametta, Haarkreide, Schuhwaschbeutel | 0 | nichts zu zeigen |
| Y2K-Schild-Sonnenbrille, Grillschürze | je 1 | zu dünn |

- Lauf scharf: 20 Produkte neu, Reihe 47.
- Nebenbefund (alte Regeln, nicht heute): «Magnetischer Kartenhalter mit MagSafe» läuft als «Ladestation 3-in-1»,
  «Britischer Oversize Hoodie mit Polo-Kragen» als «Hoodie-Decke». Das sind Regex-Fehltreffer → nächste Hype-Runde.
