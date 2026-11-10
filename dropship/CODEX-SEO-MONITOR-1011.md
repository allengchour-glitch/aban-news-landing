# Auftrag an Codex: SEO-Monitor mit allen Suchanfragen füllen (10.11.2026)

Der Besitzer schickte am 10.11.2026 ein Bild des SEO-Monitors aus dem Büro-Dashboard: Abschnitt «Suchanfragen und durchschnittliche Position» mit **15 Anfragen**, «Teilauszug» und dem Satz «Keine vollständige Keywordliste». Claude kann Codex von hier nicht aufrufen, darum dieser Auftrag als Datei (wie `CODEX-OPTIK-0911.md`).

## Was gemessen ist (10.11.2026, Search Console über OpenSEO)
- Der Auszug mit 15 Zeilen war **kein Fehler der Anzeige, sondern der Abfrage**. Die Search Console liefert bis zu 1 000 Zeilen je Aufruf (`rowLimit`), weitere über `startRow`. Für luxestyle.ch gibt es vom 04.10. bis 07.11.2026 (35 Tage) **4 442 Anfragen**.
- Auch die vollständige Liste ist nicht das Ganze: sie deckt **87,0 % der Impressionen, aber nur 20,5 % der Klicks**. Vier Fünftel der Klicks stammen aus Anfragen, die Google nicht nennt (anonymisiert). Eine vollständige Keywordliste gibt es nicht; der Deckungssatz muss sichtbar bleiben.
- Claude hat die Vorlage `tools/buero/seo_monitor.html` erweitert (PR #3050, gemergt): Suche über die Anfragen, «Mehr anzeigen» (50 Zeilen je Schritt), ein Satz zur Deckung der Website-Summe, Tagesbalken folgen der Zahl der Tage (vorher fest 28 Spalten). Alles Übrige ist unverändert, die Content-Security-Policy bleibt streng (`default-src 'none'`, `connect-src 'none'`).
- Test der Vorlage: `dropship/keywordliste-1011/monitor_test.mjs` (Browser, nur synthetische Daten, Mutationsprobe 16 von 16 in `mutationsprobe_monitor.py`).

## Was du tun sollst
Den **Datenstand** für die Vorlage neu bauen, mit allen Zeilen statt dem Teilauszug. Format (so liest die Vorlage `__SNAPSHOT__`):

```json
{
  "von": "2026-10-04", "bis": "2026-11-07", "gemessen": "2026-11-10T00:24:43Z",
  "prompt": "<dein eigener Verbesserungsauftrag>",
  "sites": [{
    "domain": "luxestyle.ch",
    "total": {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0},
    "days": [{"keys": ["2026-10-04"], "clicks": 0, "impressions": 0, "ctr": 0, "position": 0}],
    "queries": [{"keys": ["suchanfrage"], "clicks": 0, "impressions": 0, "ctr": 0, "position": 0}],
    "truncated": false,
    "finalThrough": "2026-11-06"
  }]
}
```

Regeln:
1. **`queries` mit allen Zeilen**: Seiten von 1 000 Zeilen holen (`startRow` 0, 1000, 2000 …), bis eine Seite weniger als 1 000 Zeilen liefert. `truncated: true` nur, wenn du wirklich nicht alles holen konntest.
2. **`total` aus dem Aufruf ohne Dimension** (Summe der Website), nicht aus der Summe der Anfragen: so rechnet die Vorlage die Deckung.
3. **`days`** je Tag des Fensters (gemeldete Null bleibt Null, fehlende Tage bleiben schraffiert, Position ohne Impressionen ist nicht messbar).
4. **Keine Messwerte ins Git.** Der Datenstand wird beim Bau in die Vorlage eingesetzt und gehört nur ins private Dashboard (Codex-Regel aus `docs/CODEX-CLAUDE-UEBERGABE.md`). Claude hat dem Besitzer eine fertige Datei geschickt (`seo-monitor-datenstand-1011.json`, 4 442 Anfragen); sie liegt nicht im Repo.
5. **Die Vorlage nicht lockern**: keine Netzzugriffe, keine fremden Skripte, kein `connect-src`. Wenn du etwas an der Vorlage änderst, den Browsertest `monitor_test.mjs` mitführen und die Mutationsprobe erneut laufen lassen (ein sofort grüner Test beweist nichts).
6. `prompt` setzt du selbst (dein Verbesserungsauftrag); er steht nicht in Claudes Datenstand.

## Wenn du nicht alles holen kannst
Dem Besitzer sagen, welche Abfrage fehlt (`rowLimit`, `startRow`, Land, Zeitraum) und den Teilauszug weiter als solchen kennzeichnen (`truncated: true`). Nichts glätten oder schätzen.

## Nicht Teil des Auftrags
Die Keywordliste, Stichwörter, Chancen und Ideen: das ist das Claude-Dashboard «LuxeStyle Suchanfragen» (`dropship/keywordliste-1011/README.md`, Rezept zum Neumessen dort). Keine Schreibzugriffe im Shop, keine Änderung an Texten oder Preisen.

## Lieferung
Nur Dateien: der neue Datenstand im privaten Dashboard oder, falls das nicht geht, eine kurze Anleitung, wie der Besitzer ihn einsetzt; dazu eine Zeile in `docs/CODEX-CLAUDE-UEBERGABE.md`, sobald es läuft.
