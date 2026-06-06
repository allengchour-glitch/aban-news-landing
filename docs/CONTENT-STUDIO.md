# Content-Studio — alle Tools an einem Ort

Ein Einstieg für die Inhalts-Werkzeuge. Reine Python-Standardlib + Pillow, no-op ohne Keys.

```
python3 automation/studio.py card  "Headline"      out.jpg     # Marken-Textkarte (immer, kein Key)
python3 automation/studio.py image "Thema"         out.png     # KI-Bild, editorial (braucht GEMINI_API_KEY)
python3 automation/studio.py chart  daten.json     out.png     # Diagramm aus ECHTEN Zahlen
python3 automation/studio.py chart-template        daten.json  # leere Diagramm-Vorlage zum Ausfüllen
python3 automation/studio.py draft                             # Ausgaben-Entwurf aus RSS (Gemini)
python3 automation/studio.py help
```

## Die Bausteine
| Tool | Datei | Zweck | Key nötig? |
|---|---|---|---|
| Textkarte | `gen_card.py` | schlichte Marken-Karte aus einem Hook (eigene Rechte) | nein |
| KI-Bild | `gen_image_gemini.py` | editoriale Illustration (keine Fake-Gesichter/Zahlen/Text) | GEMINI_API_KEY |
| Diagramm | `gen_chart.py` | Balkendiagramm aus **deinen echten Zahlen**, Quelle im Bild | nein |
| Entwurf | `draft_with_gemini.py` | Ausgaben-ENTWURF aus echtem RSS-Rohmaterial (nie Versand) | GEMINI_API_KEY |
| PDF-Geschenk | `generate_prompts_pdf.py` | 10-Prompts-PDF (Anmelde-Geschenk) | nein |

## Posten mit Bild
`automation/telegram_post.py` hängt automatisch ein Bild an: **Gemini-Bild → Textkarte → sonst nur Text**.
Workflow `telegram-autopost.yml` (Mo–Fr). LinkedIn-Bild-Upload ist noch offen (Asset-API, größerer Aufwand).

## Diagramm-Beispiel (ehrlich)
1. `python3 automation/studio.py chart-template diag.json`
2. `diag.json` mit **echten Zahlen + Quelle** füllen:
   ```json
   {"title":"KI-Nutzung im DACH-Mittelstand","source":"Quelle: Bitkom 2026, Link","unit":"%",
    "data":[["2024",19],["2025",28],["2026",35]]}
   ```
3. `python3 automation/studio.py chart diag.json diag.png`

⚠️ **Goldene Regel:** Zahlen kommen aus echten Quellen, die du einträgst — nie aus der KI. Quelle steht im Bild.

## Aktivierung der KI-Funktionen
`GEMINI_API_KEY` als GitHub-Secret (nie ins Repo). Optional `GEMINI_MODEL` / `GEMINI_IMAGE_MODEL` als Variables.
