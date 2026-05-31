# KI-Tools Radar

> Automatisierte deutschsprachige KI-Tool-Vergleichsseite (programmatic SEO).
> Verdient passiv über Affiliate-Links + Ad-Network. Maximal automatisiert:
> baut sich selbst neu, kein laufender manueller Aufwand.

Eigenständiges Projekt (zum Auslagern in ein eigenes Repo vorbereitet). Strategie:
siehe [`../ki-geld-projekt/MARKTRECHERCHE.md`](../ki-geld-projekt/MARKTRECHERCHE.md)
(Hebel: recurring AI-Tool-Affiliate + Distribution über den bestehenden Newsletter).

## Idee in einem Satz

Aus der bereits kuratierten Tool-Datenbank (`data/tools.json`, 143 Tools mit
Bewertung, DACH-Relevanz, DSGVO-Note, Pricing) automatisch eine SEO-Seite pro
Tool, pro Kategorie und eine Startseite generieren — monetarisiert über
Affiliate-Links zu denselben Tools.

## Warum das passt

- **Asset existiert schon:** 143 redaktionell bewertete Tools, deutsch, mit
  persönlichen Notizen (`aban_note`) → echter Content-Vorsprung gegen generische Listen.
- **Maximale Automation:** Generator + GitHub-Actions-Rebuild (wöchentlich + bei
  Datenänderung). Kein Handanlegen pro Seite.
- **Passive Monetarisierung:** Affiliate (recurring Programme bevorzugt — Jasper,
  GetResponse, Systeme.io …) + später Display/Newsletter-Ad-Network.
- **DACH/DSGVO-Angle** steckt bereits in den Daten (`dach_relevance`, `dsgvo_note`).
- **Distribution:** über den bestehenden Newsletter anteasern → Cold-Start gelöst.

## Nutzung

```bash
python generate.py                         # baut nach ./dist
python generate.py --out /tmp/site         # eigenes Output-Verzeichnis
```

Liest standardmäßig `../data/tools.json` und `./affiliate.json`. Output: statisches
HTML (kein Build-Tool, keine Abhängigkeiten), DSGVO-safe (System-Fonts, kein Tracking).

## Struktur

```
ki-tools-radar/
├── generate.py        # Generator (stdlib-only): index + tool/<id> + kategorie/<slug>
├── affiliate.json     # tool-id -> Affiliate-URL (fehlt -> normale URL, kein *-Marker)
├── README.md
└── dist/              # generiert (gitignored, baut CI)
```

Auto-Build: [`../.github/workflows/tools-radar-build.yml`](../.github/workflows/tools-radar-build.yml).

## Monetarisierung einrichten

1. Bei recurring Affiliate-Programmen bewerben (siehe `affiliate.json` → `_programs`).
2. Affiliate-URLs in `affiliate.json` → `links` eintragen: `"jasper": {"affiliate_url": "https://..."}`.
   Der Generator markiert solche Links mit `*` und `rel="sponsored nofollow"` und
   blendet automatisch die Affiliate-Transparenz-Notiz ein (UWG/DSGVO-konform).
3. Rebuild → die CTAs zeigen auf deine Affiliate-Links.

## Vor dem Auslagern in ein eigenes Repo

- `data/tools.json` mitkopieren (oder als Submodule/Sync einbinden).
- `datenschutz.html` / `impressum.html` aus dem Newsletter-Repo übernehmen.
- `BASE_URL` in `generate.py` auf die echte Domain setzen.
- Deployment-Step im Workflow aktivieren (Cloudflare Pages / GitHub Pages).

## Mehrsprachig (11 Sprachen)

Die Seite wird in **11 Sprachen** generiert: Deutsch (Root), Englisch, Französisch,
Spanisch, Italienisch, Portugiesisch, Niederländisch, Polnisch, Türkisch, Japanisch,
Chinesisch — mit `hreflang`-Tags, Sprachumschalter und sprachübergreifender Sitemap.
Pro Tool gibt es übersetzte Notizen + **Pro/Contra („Rat & Kritik")**.

- UI-Strings + Tool-Übersetzungen: `lang/<code>.json` (eine Datei pro Sprache)
- Deutsches Pro/Contra: `content/critique.de.json`
- Neue Sprache hinzufügen: Code in `LANGUAGES` (generate.py) ergänzen + `lang/<code>.json` anlegen.

## Seitentypen (alle in 11 Sprachen)

- **Startseite** — alle Tools nach Bewertung, + Navigation zu DACH-Bestenliste & Use-Cases
- **Tool-Seite** — Bewertung, Pro/Contra, Pricing, DSGVO-Hinweis, Alternativen, Vergleichs-Links, JSON-LD
- **Kategorie-Seite** — „Beste {Kategorie}-Tools"
- **Vergleichsseite** „A vs B" — Pro/Contra-Duell + Fazit (aus den `alternatives` der Tools)
- **Use-Case-Seite** „Beste KI für {Zweck}" — programmatic SEO
- **DACH-Bestenliste** — Top-Tools nach DACH-Relevanz (ehrlich, kein Compliance-Versprechen)
- **Vergleichsseiten** — aus `alternatives` + kategorieübergreifende Top-Paare (389 Paare)
- **Vergleichs-Hub** (`vergleiche.html`) — verlinkt alle Vergleiche (Crawling/interne Links)
- **Use-Case-Seiten** „Beste KI für {Zweck}"
- **Berufs-Stacks** — „KI-Stack für Entwickler/Texter/Marketing/Designer/Video/Podcast/Forschung/Gründer"
- **„Neu & Trending"** — zuletzt im Newsletter besprochene Tools (aus `ausgaben_mentions`)
- **Budget-Seiten** „Kostenlos" + „unter 10/20/50 €" — fängt Preis-Suchen ab
- **A–Z-Index** (`tools.html`) aller Tools · **404-Seite**
- **RSS-Feed** pro Sprache (`feed.xml`) — Frische-Signal + Abonnenten
- **FAQ pro Tool** — sichtbarer Akkordeon + FAQPage-Schema (Preis, Einsatz, Alternativen, DACH)
- **Tool des Monats** (Auto-Rotation) + **verwandte Tools** je Tool-Seite
- **Live-Suche** auf der Startseite (`search.js`, ohne Tracking, DSGVO-safe)
- **OG-Vorschaubilder** (1200×630 PNG pro Tool) für schöne Link-Previews beim Teilen
- **Newsletter-Box** auf jeder Seite → baut eigene Audience auf + bewirbt abannews.de

## SEO-Strukturdaten (JSON-LD)

Pro Seite je nach Typ: SoftwareApplication + Review, BreadcrumbList, FAQPage, ItemList,
WebSite + Organization — maximale „Rich Snippet"-Fläche in Google.

## Status

🟢 Generator + Auto-Build laufen — **6.512 Seiten + 144 OG-Bilder** (143 Tools × 11 Sprachen + Vergleiche/Stacks/Use-Cases/Trending/Budget/A–Z).
🟢 SEO: JSON-LD (SoftwareApplication/Review/Breadcrumb/FAQ/ItemList/WebSite/Org), Sitemap-Index + 11 Sprach-Sitemaps, robots.txt, hreflang, RSS, OG/Twitter-Cards, interne Verlinkung, Live-Suche.
🟡 Offen: Affiliate-Programme beantragen + Links eintragen, Domain + Deployment, Impressum/Datenschutz (deine Daten), Newsletter-Teaser.

> Hinweis: OG-Bilder brauchen Pillow (`requirements.txt`). Der HTML/RSS/Sitemap-Build
> läuft auch ohne — der OG-Schritt wird dann sauber übersprungen.
