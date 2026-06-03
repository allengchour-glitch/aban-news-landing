# Deutsche KI-Prompt-Bibliothek

Statische, durchsuchbare Sammlung praxistauglicher deutscher Prompts, sortiert
nach Beruf und Aufgabe. Teil des Aban-Netzwerks. Monetarisierung ausschliesslich
ueber Newsletter-Opt-in (kein Affiliate, kein Tracking).

- **Domain:** `prompts.abannews.com`
- **Newsletter-CTA:** `https://abannews.com/gratis-ki-tools.html`
- **Stack:** reines Python stdlib, kein Build-Step, kein Framework, System-Fonts.

## Aufbau

```
prompts-bibliothek/
├── generate.py        # Generator (stdlib-only), baut nach dist/
├── data/prompts.json  # Inhalt: redaktionell verfasste Prompts (Quelle der Wahrheit)
├── README.md          # diese Datei
├── .gitignore         # ignoriert dist/
└── dist/              # generiert (nicht eingecheckt)
```

## Bauen

```bash
python3 generate.py            # -> dist/
python3 generate.py --out dist # alternatives Ausgabeverzeichnis
```

Erzeugt:
- Startseite mit Live-Suche und Beruf-/Aufgabe-Filter (Vanilla-JS, inline)
- eine Detailseite je Prompt mit Copy-Button (Vanilla-JS, inline)
- Kategorie-Seiten nach Beruf und nach Aufgabe
- `sitemap.xml`, `robots.txt`, `feed.xml` (RSS)

JSON-LD je Seite: `HowTo` (Detailseiten), `ItemList` (Listen), `BreadcrumbList`,
`WebSite` + `Organization` (Startseite). `canonical`, OG-Tags, `lang="de"`.

## Inhalt pflegen

Prompts liegen in `data/prompts.json`. Pro Eintrag:

| Feld | Bedeutung |
|------|-----------|
| `id` | eindeutig, dient als Slug |
| `titel` | Anzeigetitel |
| `kategorie` | Beruf (Gruppierung) |
| `aufgabe` | Aufgabentyp (z.B. E-Mail, Angebot, Recherche) |
| `prompt_text` | der nutzbare Prompt mit `[Platzhaltern]` |
| `erklaerung` | kurz: wann/warum nutzen |
| `tipp` | ein Satz Praxis-Hinweis |

Voice: pragmatisch, anti-hype, du-Form. Keine Hype-Woerter (Sperrliste in
`automation/brand-voice-validator-api.py`, Variable `FORBIDDEN`).

## Deployment

Cloudflare Pages, Output-Verzeichnis `dist/`, kein Build-Command noetig
(bzw. `python3 generate.py`). `robots.txt`/`sitemap.xml` werden mitgeneriert.
