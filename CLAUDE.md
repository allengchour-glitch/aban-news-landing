# CLAUDE.md — Projekt-Gedächtnis für `aban-news-landing`

> Wird von Claude Code automatisch geladen und hält den Kontext fest, damit jede
> Session sofort weiß, worum es geht — ohne das ganze Repo neu zu lesen.

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
- **CSS ist inline** im `<head>` jeder Subpage bzw. in `css/styles.css` (Hauptlanding).
  Kein externes Framework, **kein Google Fonts** (DSGVO: System-Font-Stack
  `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,…`).
- **Kein Tracking, keine 3rd-Party-Requests** außer Subscribe-POST (beehiiv) und
  ggf. Stripe-Redirect. JS nur inline, minimal, vanilla.
- **Brand-Farben** (Hex, siehe `:root` in `index.html` / `css/styles.css`):
  Amber `d97706`, Amber-dunkel `b45309`, Amber-hell `fde9c8`, Cream `fef3c7`,
  Ink `1f2937`/`1c2530`, Background `fffbf5`/`fffaf2`.
- **Subpage-Layout-Muster:** siehe `geld-verdienen-mit-ki.html` (max-width 760px,
  sticky Header mit `.brand` + `.btn`, Footer mit Impressum/Datenschutz-Links).
- **a11y/SEO Pflicht:** `<link rel="canonical">`, OG-Tags, JSON-LD (`schema.org`),
  `lang="de"`, hreflang bei mehrsprachigen Seiten.

## Aban-Voice (wichtig!)

Pragmatisch, direkt, anti-hype. Hype-Floskeln und Buzzwords sind tabu. Die
**kanonische Sperrliste** (als Regex) steht in
`automation/brand-voice-validator-api.py` (Variable `FORBIDDEN`) — eine Quelle der
Wahrheit, hier bewusst nicht dupliziert. Der CI-Workflow `voice-linter` erzwingt
sie auf allen geänderten Content-`*.md`-Dateien (`--strict`, generic-Channel: max
5000 Zeichen, max 3 `#`-Tags, durchgehend die du-Form). Infrastruktur-/Doku-
Markdown (`CLAUDE.md`, `docs/**`, `README.md`) ist bewusst ausgenommen — dort
gelten Newsletter-Längen-/Format-Regeln nicht.

Vor dem Commit lokal prüfen:
```bash
python3 tools/brand-voice-linter.py DATEI.md --strict   # Exit 0 = sauber
```

HTML-Seiten folgen demselben Ton: keine Hype-Wörter, keine Mehrfach-Ausrufezeichen,
durchgehend die du-Form.

## Lead-Magnets / PDFs

- `downloads/*.pdf` werden mit **reportlab** generiert (`pip install reportlab`).
- `generate_pdfs.py` → 5 Lead-Magnet-PDFs (Prompts, Glossar, Checkliste, Tool-Stack,
  Cold-Email). Helfer: `make_styles()`, `cover_page()`, `new_doc()`, `footer_canvas()`.
- `generate_ebook.py` → `downloads/anti-hype-ebook.pdf` (das "Anti-Hype"-eBook,
  beworben auf `ebook.html` und in `roadmap.html`).
- `generate_launch_manual_pdf.py` → `downloads/launch-manual.pdf`.
- Regenerieren: `python3 generate_ebook.py` (idempotent, schreibt nach `downloads/`).

## Lese-Memory (Buch-Seiten)

- `js/buch-memory.js` = wiederverwendbare, buch-bewusste Memory (Download-Status,
  „zuletzt angesehen", geöffnete Abschnitte). Konfiguration über `data-*`-Attribute
  im Markup, **eigener `data-memory-key` pro Buch** (`aban_buch_v1`,
  `aban_trilogie_v1`), nur `localStorage`, kein Tracking. Genutzt von `buch.html`
  (+ `en/ fr/ it/`) und `trilogie.html`. `ebook.html` hat seine eigene Inline-Memory
  (`aban_ebook_v1`) — bewusst getrennt.

## KI-Schriftsteller (`ki-schriftsteller/`)

- Python-Generator, der Romane Kapitel für Kapitel mit `claude-opus-4-8` schreibt
  (Plot-Bibel als gecachter System-Präfix). Einzelbuch **oder** Trilogie (`baende`).
- Trilogie-Beispiel: `roman-drama-trilogie.json` → `trilogie.html`. Shared Helfer:
  `roman_util.py`. Output (Kapitel + `ausgabe/`) ist **git-ignored**, braucht
  `ANTHROPIC_API_KEY`. Details: `ki-schriftsteller/README.md`.
- **Pipeline:** `plane_kapitel.py` (Outline) → `schreibe_roman.py` (Prosa) →
  `qualitaet.py` (lokaler Prosa-Check, **ohne API/Netz**, Exit-Code → CI-tauglich)
  → `politur.py` (autonome Schleife: Gutachten-Score 0-100 + Blocker via Structured
  Outputs → `ueberarbeiten` bis Schwelle erreicht; Original als `*.politur-orig.md`
  gesichert) → `buch_bauen.py`/`buch_pdf.py`/`kdp_paket.py`. `lektor.py` = manuelle
  Einzelkritik ohne Umschrieb. Abhängigkeiten in `requirements.txt` (`pip install -r`).

## Seiten-Inventar (Auswahl)

| Datei | Zweck |
|-------|-------|
| `index.html` | Haupt-Landing (Hero + Sample-Switcher + Subscribe) |
| `ebook.html` | eBook-Lead-Magnet (Email-Capture + Founding-Upsell + Lese-Memory, inline) |
| `buch.html` | Anti-Hype als Buch (PWYW, PDF/ePub) + Lese-Memory via `js/buch-memory.js` |
| `trilogie.html` | Drama-Trilogie „Das Tal hält den Atem an" (KI-Schriftsteller-Experiment) + Memory |
| `geld-verdienen-mit-ki.html` | SEO-Money-Page (Layout-Referenz für Subpages) |
| `ki-tools-fuer-selbststaendige.html` | SEO-Money-Page „KI-Tools für Selbstständige" |
| `chatgpt-fuer-solopreneure.html` | SEO-Money-Page „ChatGPT für Solopreneure" |
| `founding.html` | €149 Founding-Member-Angebot |
| `sponsoring.html` / `werbung.html` | Werbe-Rate-Card / Policy |
| `resources.html` | Gratis-Resourcen + PDF-Downloads |
| `willkommen.html` | Post-Subscribe (eBook-Geschenk) |
| `impressum.html` / `datenschutz.html` | CH-Impressum / DSGVO |

## Neue Seite anlegen

1. Layout aus `geld-verdienen-mit-ki.html` kopieren (Header/Footer/Style-Token).
2. `<link rel="canonical">`, OG-Tags, JSON-LD setzen, `abannews.com`.
3. Eintrag in `sitemap.xml` ergänzen, optional Pretty-URL in `_redirects`.
4. Falls relevant: Nav-Link in `index.html` (`.hnav`) + Footer-Link.
5. Voice-Check laufen lassen (siehe oben).

## Monetarisierung aktivieren (3 Schalter, kostenlos zum Start)

1. **Newsletter (aktiv):** alle Subscribe-Buttons → `abannews.beehiiv.com/subscribe`.
2. **Stripe (Founding €149):** in `founding.html`, `<script>` oben,
   `STRIPE_FOUNDING_LINK` setzen. Leer → Mail-Fallback.
3. **Calendly (Sponsoring):** in `sponsoring.html`, `<script>` am Ende,
   `CALENDLY_URL` setzen. Leer → Mail-Fallback.

**Funnel:** SEO-Money-Pages + `resources.html` → Newsletter-Opt-in →
`willkommen.html` (eBook-Geschenk) → `founding.html` / `sponsoring.html`.
Social-Image fürs eBook: `og-ebook.png` (Pillow, 1200×630).

## Git / Deployment

- Branch-Konvention: `claude/...` Feature-Branches, **nie** direkt nach `main`.
- Cloudflare Pages: kein Build-Command, Output = Repo-Root. `_redirects` + `_headers`
  werden automatisch erkannt. Jeder Push auf `main` triggert Auto-Deploy.

## Geld-Projekte (Aban-Netzwerk) — zusätzlich zum Newsletter
Dieses Repo enthält neben der Newsletter-Site mehrere automatisierte KI-Geld-Projekte.
**Voller Stand in `PROJEKT.md`** (immer zuerst lesen). Kurz:
- `ki-tools-radar/` — KI-Tool-Vergleich (177 Tools, 11 Sprachen, ~10.351 Seiten). LIVE auf radar.abannews.com. Affiliate. 56 Tool-Seiten verlinken zurück aufs Newsletter-Archiv.
- `foerder-radar/` — DACH-Fördermittel (86 echte Programme). Lead-Gen. Domain foerder.abannews.com.
- `jobs-radar/` — DACH-KI-Jobboard (fetch_jobs.py: Arbeitnow+Remotive). Domain jobs.abannews.com.
- `kurse-radar/` — KI-Kurs-/Zertifikat-Vergleich (22 echte Anbieter, Preise/Score `null` bis geprüft). Affiliate (deaktiviert). Domain kurse.abannews.com. **Cloudflare-Projekt noch anzulegen.**
- `prompts-bibliothek/` — 50 selbst geschriebene deutsche Prompts (9 Berufe, 11 Aufgaben), Live-Suche + Copy-Button. Newsletter-Opt-in. Domain prompts.abannews.com. **CF-Projekt noch anzulegen.**
- `agenturen-radar/` — KI-Dienstleister-Verzeichnis DACH (startet ehrlich leer, nur markierte Platzhalter). Bezahlte Listings. Domain agenturen.abannews.com. **CF-Projekt noch anzulegen.**
- 8× `ki-fuer-*.html` im Root — Branchen-SEO-Hubs (Handwerker, Steuerberater, Ärzte, Anwälte, Makler, Coaches, Onlineshops, Gastro). Laufen direkt auf abannews.com. Newsletter + Tool-Affiliate.
- `portal/` — Hub; `social/` — Auto-Posting Telegram/Discord; `automation/werkbank.py` + `news_aggregator.py` — Newsletter-Tools.
- Jedes Geld-Projekt: `generate.py` (stdlib), eigener Auto-Build-Workflow, baut nach `dist/`.
- Daten `data/tools.json` (177 Tools, 33 neue mit „[Redaktion: prüfen]") speist den ki-tools-radar.

## Verkauf/Zahlung — Stand 2026-05-31 (Details in PROJEKT.md)
- **Founding €69** (von €149 gesenkt), Zahlung per **PayPal Payment Link** `ncp/payment/7GPXCMBCETCUY`
  in `founding.html` + `en/founding.html` (kein SDK, nur Link-Button). Rechnung per Mail-Fallback.
- **Buch „Anti-Hype"** = 13 Kapitel (de/en/fr/it), KDP-tauglich (Print ≥24 S.). Inhalt nur in
  `generate_ebook.py` ändern (Single Source); danach `generate_ebook.py` + `generate_kdp_print.py de en fr it` neu bauen.
- Buch-Verkauf via **Lemon Squeezy** (`js/buch-config.js`). KDP-Anleitung: `docs/KDP-VEROEFFENTLICHEN.md`,
  Geldkanäle: `docs/NEWSLETTER-GELD.md`.
- PayPal in `datenschutz.html` + CSP in `_headers` (`*.paypal.com`) hinterlegt.
- ⚠️ Diese Site nutzt **kein** Google Analytics / kein 3rd-Party-Tracking (DSGVO/Markenversprechen) — nie hinzufügen.
