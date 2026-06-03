# Aban-Netzwerk — Portal

> Eine statische Hub-Seite, die alle Aban-Properties bündelt: den Newsletter (Aban News)
> und die drei Geld-Projekte (KI-Tools Radar, Förder-Radar, KI-Jobs Radar).

## Warum
- **Interne Verlinkung / SEO:** verbindet die vier Properties zu einem Netzwerk → besseres Crawling,
  geteilte Domain-Autorität, Besucher wandern zwischen den Projekten.
- **Eine Marke, ein Einstieg:** ein sauberer Hub statt vier losen Seiten.
- **Org-Schema (sameAs):** hilft Google/LLMs, die Properties als ein Aban-Entity zu erkennen.

## Nutzung
```bash
python generate.py     # baut nach ./dist/index.html
```
Pure stdlib, keine Abhängigkeiten, DSGVO-safe (System-Fonts, kein Tracking).

## Deployment
Idee: auf der Hauptdomain-Wurzel `abannews.com` (oder als `start.abannews.com`). Cloudflare Pages,
Build `cd portal && python generate.py`, Output `portal/dist`. Links zeigen auf die Subdomains der Projekte.

## Pflege
Neue Property? Einfach einen Eintrag in `CARDS` (in `generate.py`) ergänzen und neu bauen.
