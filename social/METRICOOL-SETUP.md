# 📲 Metricool — Auto-Posting für LuxeStyle (Setup & Queue)

Ziel: vollautomatisches Posten auf **Instagram, Facebook, Pinterest** (später TikTok mit Video)
für die bestbewerteten LuxeStyle-Produkte.

## Was NUR der User kann (Claude kann es nicht — Zahlung + OAuth)
1. **Metricool-Konto + Pro-Abo** auf metricool.com anlegen (Zahlung mit Karte). Pro nötig für Planung/Analytics.
2. **Social-Profile in Metricool verbinden**: Instagram (Business/Creator), Facebook-Seite „LuxeStyle CH",
   Pinterest-Business. (Meta verlangt IG↔FB-Verknüpfung — sollte bereits bestehen.)
3. **Metricool als Connector in Claude verbinden**: claude.ai → Einstellungen → Connectors → Metricool → verbinden.
   Danach erscheinen die Metricool-Tools in der Session und Claude plant vollautomatisch ein.

## Was Claude dann automatisch macht (nach dem Verbinden)
- Liest `social/metricool_plan.csv` und legt pro Zeile einen **geplanten Post** an (Text + Bild + Link + Zeit + Netzwerke).
- Aktuell **12 fertige Posts** (25.09.–06.10., je 18:00, IG+FB+Pinterest) — beste Produkte, Preis-Anker-Captions,
  Hashtags, echte Produktbilder, Trust-Zeile „Gratis-Versand ab CHF 50".
- Danach laufend nachfüllen (neue Top-Produkte, Saison, 1. August etc.).

## Alternative OHNE Claude-Connector (rein manuell)
Metricool kann CSV-Bulk-Import: In Metricool → Planung → „Importieren" → `social/metricool_plan.csv` hochladen
und Spalten zuordnen (Datum, Zeit, Text, Bild-URL, Link, Netzwerke). Dann sind alle 12 Posts auf einmal geplant.

## Queue-Datei
`social/metricool_plan.csv` — Spalten: Datum, Zeit, Netzwerke, Produkt, Text, Hashtags, Bild-URL, Link.
Idempotent nachpflegbar; Captions ohne Voiceover-Bezug, Trust-Zeile immer „ab CHF 50" (feste Versand-Entscheidung).

## Hinweise
- **TikTok** braucht Video (kein Foto-Post) → dafür die Reels aus `reels/` bzw. `social/video_queue.csv` nutzen.
- Beste CH-Zeiten grob: 12:00, 18:00–20:00. Kadenz 1×/Tag reicht für den Start (Spam-Schutz).
- Nur **≥4★-Produkte** bewerben (Regel §10). Quelle für Bilder: `automation/good_products.csv`.
