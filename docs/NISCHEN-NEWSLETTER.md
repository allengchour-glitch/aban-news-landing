# Nischen-Newsletter-Netzwerk (Grundgerüst)

**Idee:** Die komplette aban-Maschine (Roh­material → Gemini-Entwurf → Bilder → Ausgabe → Autopost)
läuft schon. Für jede enge DACH-Nische einen eigenen kleinen Newsletter aufsetzen — fast ohne Mehrkosten.

## Wieder­verwendbar (schon da)
- `automation/news_aggregator.py` (Quellen), `automation/draft_with_gemini.py` (Entwurf),
  `automation/build_issue.py` (bild-reiche Ausgabe), `automation/gemini_text.py`, Bild-Pipeline,
  Telegram/LinkedIn-Autopost, Brand-Voice-Linter.
- `data/niches.example.json` — Vorlage je Nische (Name, beehiiv, Feeds, Keywords, Takt).

## So spinnst du eine Nische hoch
1. In beehiiv eine **neue Publikation** je Nische anlegen (eigene Subscribe-URL).
2. `data/niches.json` aus der Vorlage befüllen (Feeds/Keywords der Nische).
3. Pipeline je Nische laufen lassen (Erweiterung: `--niche <id>` in news_aggregator/draft → eigene
   Roh-/Entwurf-/Ausgabe-Dateien pro Nische). Versand pro Nische über die jeweilige beehiiv-Publikation.
4. Eigene kleine Landingpage je Nische (Muster: bestehende `ki-fuer-*`-Hubs).

## Geld
- Pro Nische: **Sponsoring** (Rate-Card), **Affiliate** (passende Tools), später **Premium**.
- Skaliert: derselbe Code, andere Quellen/Themen → mehrere Einnahme-Ströme.

## Ehrlich
- Jede Nische braucht etwas **Kuratierung** (Themen passend halten) + die ersten Leser (Mensch).
- Lieber 2 Nischen richtig als 10 halbherzig — sonst dünner Content.

## Nächster Ausbau (optional)
- `--niche`-Flag in `news_aggregator.py` + `draft_with_gemini.py` (eigene Dateinamen je Nische).
- Pro Nische ein Cron-Workflow (wöchentlich) analog zu den bestehenden.
