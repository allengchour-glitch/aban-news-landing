# 🔒 Privater Ordner — bezahlte Manuskripte

**Wichtig:** Dieser Ordner enthält **verkäufliche Produkte** (E-Book-Manuskripte).
Er darf **nicht öffentlich ausgeliefert** werden.

## Schutz (mehrfach abgesichert)
- `_redirects`: `/_manuscripts/*` → 404 (Cloudflare liefert die Dateien nicht aus)
- `robots.txt`: `Disallow: /_manuscripts/` (keine Suchmaschinen-Indexierung)
- nirgends im HTML verlinkt

> Das Manuskript bleibt im Git-Repo gesichert, ist aber über die Website nicht erreichbar.

## Inhalt
- `ki-geld-2026.md` — Manuskript des E-Books „KI-Geld 2026" (Verkauf: `/ebook.html`, CHF 19)

## So machst du ein PDF daraus (dein Rechner, 1 Min)

**Option A — Pandoc (beste Qualität):**
```bash
pandoc _manuscripts/ki-geld-2026.md -o ki-geld-2026.pdf \
  --pdf-engine=wkhtmltopdf -V geometry:margin=2.5cm
```

**Option B — Online (kein Tool nötig):**
Markdown-Inhalt in einen Markdown-zu-PDF-Konverter einfügen
(z.B. md2pdf, Dillinger.io, oder VS Code „Markdown PDF"-Extension).

**Option C — Word/Docs:**
Markdown in Google Docs / Word einfügen, formatieren, als PDF exportieren.

## Auslieferung an Käufer
Wenn jemand über `/ebook.html` bestellt (mailto), schickst du das fertige PDF
per E-Mail-Anhang oder einen zeitlich begrenzten Download-Link.
