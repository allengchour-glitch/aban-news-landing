# LuxeStyle: kleine Textpolitur der Startseite

Stand: 2026-11-08. Entwurf von Codex, **keine Gemini-Antwort**. Nicht live umgesetzt.
Quelle: https://luxestyle.ch/ — Startseiteninhalt am 2026-11-08 frisch abgerufen.
Die Vorschläge betreffen Texte. Layout, Kontrast und Abstände wurden hier nicht visuell geprüft.

## Konkrete Änderungen

| Stelle | Aktuell beobachtet | Vorschlag |
| --- | --- | --- |
| Hero-Unterzeile | Mode, Wohnen, Geschenke und mehr. Entdecke deine nächste Lieblingsidee. | Mode für deinen Stil, Ideen für dein Zuhause und Geschenke für deine Liebsten. |
| Hero-Hauptbutton | Alle Kategorien | Einkaufswelten ansehen |
| Schmuck-Link | Ganze Auswahl ansehen | Schmuck ansehen |
| Wohnen-Link | Ganze Auswahl ansehen | Wohnen und Deko ansehen |
| Wiederholte Zwischenüberschrift vor weiteren Kategorien | Mehr von LuxeStyle entdecken | Für deine tägliche Routine |
| Späterer Produktmix | Noch mehr entdecken | Kleine Ideen für jeden Tag |
| Einleitung zu diesem Produktmix | Für unterwegs, für deine Routine oder für deinen Hund. Entdecke weitere Produkte und ihre Auswahl. | Praktisches für unterwegs und neue Ideen für deinen Alltag. |
| Hinweis bei horizontalen Produktreihen | Seitlich wischen und mehr entdecken. | Wischen für weitere Produkte. |

Der Hero-Titel „Schön leben. Schlau shoppen.“ und „Winterzeit. Geschenkzeit.“ bleiben als Ausgangspunkt erhalten.
Die Linkziele bleiben erhalten. Die letzten beiden Vorschläge nur in der mobilen Darstellung verwenden,
falls dort tatsächlich gewischt werden kann; auf Desktop den Hinweis ausblenden oder passend formulieren.

## Umfang

Keine neuen Lieferzeit-, Preis-, Bewertungs-, Material- oder Rabattversprechen.
Keine Änderungen an Produkten, Katalog, Checkout, Preisen, Rechtstexten oder Personalisierungseditor.
Dies sind redaktionelle Vorschläge; keine gemessene Conversion-Verbesserung.
Vor Umsetzung die aktuelle Theme-Datei und den darin verwendeten Text erneut lesen.
Neue Texte im Entwurf auf Mobilgerät und Desktop prüfen; insbesondere Button-Umbruch und vorhandene Übersetzungen.

## Auftrag für Gemini

Prüfe ausschliesslich die obige Tabelle für LuxeStyle CH. Deutsch (Schweiz), du-Ansprache,
hochwertig und zurückhaltend. Suche unnötige Wiederholungen, vage Aussagen und zu lange Buttons.
Liefere höchstens fünf konkrete Korrekturen als Alt → Neu mit je einem kurzen Grund.
Erfinde keine Produkte, Bewertungen oder Leistungsversprechen. Behaupte keine visuelle Prüfung.
Die Quelle beschreibt den beobachteten Inhalt am Datum oben, nicht einen unveränderlichen Live-Stand.

## Gemini-Zugang

GitHub-Secret: GEMINI_API_KEY2. Workflow: .github/workflows/luxestyle-gemini-assistent.yml, PR #2915.
Noch kein Gemini-Lauf. Free-Tier-Zuordnung des Schlüssels weiterhin unbestätigt.
Nur nach Prüfung des Free Tier ohne verknüpftes Abrechnungskonto starten.
Der Workflow kann den Abrechnungsstatus nicht automatisch prüfen.
