# Webbaukasten-Radar

Statischer Vergleich von **KI- & No-Code-Website-Baukästen** mit DACH-Fokus
(EU-Hosting, deutsche Oberfläche, KI-Generierung, Online-Shop). Gleiches Muster wie
die anderen Radars (`voice-radar` etc.): reines Python-stdlib, DSGVO-safe, Aban-Voice.

- **Daten:** `data/anbieter.json` — 15 echte Anbieter (Jimdo, IONOS, STRATO, one.com,
  Webnode, Hostinger, Wix, Squarespace, Webflow, Framer, Durable, 10Web, Carrd, Softr,
  GoDaddy). EU/DE-Anbieter sortieren vorn. **`preis_eur`/`worth_it_score` = `null`**,
  Konditionen mit `[Redaktion: prüfen]` — keine erfundenen Zahlen, bis ein Mensch prüft.
- **Affiliate:** `affiliate.json` — alle Slots `_`-deaktiviert (Mail-Fallback, keine Provision).
  Echte Partnerprogramme in `_programme` gelistet (Webflow/Framer/10Web = wiederkehrend).
  Anmelden → Link bei `affiliate_url` eintragen, `_` vor dem Key entfernen, neu bauen.
- **Build:** `cd webbaukasten-radar && python3 generate.py` → `dist/` (28 Seiten: Home +
  Anbieter + Kategorien + Schwerpunkte + sitemap/robots/RSS/Impressum/Datenschutz/404).
- **Domain:** `webbaukasten.abannews.com` — **CF-Projekt noch anzulegen.**

⚠️ Vor dem Bewerben: Anbieter-Fakten (EU-Hosting, Preise) menschlich verifizieren
(`[Redaktion: prüfen]`-Marker auflösen). Cross-Link-Ziel fürs Netzwerk + Futter für die
KI-Tool-Reels (`video-pipeline/tool_reel.py`).
