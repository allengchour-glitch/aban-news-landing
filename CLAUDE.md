# CLAUDE.md — Projekt-Gedächtnis für `aban-news-landing`

> Diese Datei wird von Claude Code automatisch geladen. Sie hält den Kontext fest,
> damit jede Session sofort weiß, worum es geht — ohne das ganze Repo neu zu lesen.

## Was ist das?

Statische Marketing-Website für **aban news** — einen täglichen, deutschsprachigen
KI-Newsletter für DACH-Profis ("Mo–Fr, 5 Minuten, kein Hype"). Kein Build-Step,
kein Framework: reines HTML + Inline-CSS, deployt auf **Cloudflare Pages**.

- **Domain:** `abannews.com` (neuere Dateien). Ältere Texte referenzieren teils
  `abannews.de` — bei Neuanlage **immer `.com`** verwenden.
- **Betreiber:** Allen Chour ("Aban"), Belp (CH).
- **Newsletter-Backend:** beehiiv (`https://abannews.beehiiv.com/subscribe`).

## Architektur / Konventionen

- **Eine Seite = eine `.html`-Datei** im Root. Sprach-Varianten in `en/`, `fr/`, `it/`.
- **CSS ist inline** im `<head>` jeder Seite (Subpages) bzw. in `css/styles.css`
  (Hauptlanding-Komponenten). Kein externes Framework, **kein Google Fonts**
  (DSGVO: System-Font-Stack `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,…`).
- **Kein Tracking, keine 3rd-Party-Requests** außer Subscribe-POST (beehiiv) und
  ggf. Stripe-Redirect. JS nur inline, minimal, vanilla.
- **Brand-Farben:** `--amber:#d97706`, `--amber-dk:#b45309`, `--amber-lt:#fde9c8`,
  `--cream:#fef3c7`, `--ink:#1f2937`/`#1c2530`, `--bg:#fffbf5`/`#fffaf2`.
- **Subpage-Layout-Muster:** siehe `geld-verdienen-mit-ki.html` (max-width 760px,
  sticky Header mit `.brand` + `.btn`, Footer mit Impressum/Datenschutz-Links).
- **a11y/SEO Pflicht:** `<link rel="canonical">`, OG-Tags, JSON-LD (`schema.org`),
  `lang="de"`, hreflang bei mehrsprachigen Seiten.

## Aban-Voice (wichtig!)

Pragmatisch, direkt, anti-hype. **Verbotene Phrasen** (Build bricht im Audit sonst):

```
revolution | bahnbrechend | game-changer | disruptiv | quantensprung |
meilenstein | tauche ein | hallo zusammen | liebe community
```

Vor jedem Commit prüfen:
```bash
grep -iE "revolution|bahnbrechend|game.changer|disruptiv|quantensprung|meilenstein|tauche ein|hallo zusammen|liebe community" *.html
# muss 0 Treffer geben
```

## Lead-Magnets / PDFs

- `downloads/*.pdf` werden mit **reportlab** generiert (`pip install reportlab`).
- `generate_pdfs.py` → 5 Lead-Magnet-PDFs (Prompts, Glossar, Checkliste, Tool-Stack,
  Cold-Email). Gemeinsame Helfer: `make_styles()`, `cover_page()`, `new_doc()`,
  `footer_canvas()`. Brand-Farben oben in der Datei.
- `generate_ebook.py` → `downloads/anti-hype-ebook.pdf` (das "Anti-Hype"-eBook,
  beworben auf `ebook.html` und in `roadmap.html`).
- `generate_launch_manual_pdf.py` → `downloads/launch-manual.pdf`.
- Regenerieren: `python3 generate_ebook.py` (idempotent, schreibt nach `downloads/`).

## Seiten-Inventar (Auswahl)

| Datei | Zweck |
|-------|-------|
| `index.html` | Haupt-Landing (Hero + Sample-Switcher + Subscribe) |
| `ebook.html` | eBook-Lead-Magnet-Landing (Email-Capture + Founding-Upsell + Lese-Memory via localStorage) |
| `geld-verdienen-mit-ki.html` | SEO-Money-Page (Layout-Referenz für Subpages) |
| `ki-tools-fuer-selbststaendige.html` | SEO-Money-Page „KI-Tools für Selbstständige“ |
| `chatgpt-fuer-solopreneure.html` | SEO-Money-Page „ChatGPT für Solopreneure“ |
| `founding.html` | €149 Founding-Member-Angebot |
| `sponsoring.html` / `werbung.html` | Werbe-Rate-Card / Policy |
| `preview.html` | Beispiel-Ausgabe |
| `roadmap.html` | Produkt-Roadmap (erwähnt das eBook) |
| `impressum.html` / `datenschutz.html` | CH-Impressum / DSGVO |
| `404.html` | Aban-Voice 404 |

## Wenn du eine neue Seite anlegst

1. Layout aus `geld-verdienen-mit-ki.html` kopieren (Header/Footer/Style-Token).
2. `<link rel="canonical">`, OG-Tags, JSON-LD setzen, `abannews.com`.
3. **Eintrag in `sitemap.xml`** ergänzen.
4. Optional Pretty-URL in `_redirects` ergänzen.
5. Falls relevant: Nav-Link in `index.html` (`.hnav`) + Footer-Link.
6. Forbidden-Phrases-Grep laufen lassen.

## Git / Deployment

- Branch-Konvention dieser Session: `claude/...` Feature-Branches, **nie** direkt
  nach `main` pushen.
- Cloudflare Pages: kein Build-Command, Output = Repo-Root. `_redirects` + `_headers`
  werden automatisch erkannt. Jeder Push auf `main` triggert Auto-Deploy.
