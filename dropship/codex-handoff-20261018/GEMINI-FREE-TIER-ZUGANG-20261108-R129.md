# LuxeStyle Gemini Free Tier – 08.11.2026, R129

Stand: 01:44 Uhr Europe/Zurich. Der Inhaber verlangt ausdrücklich `GEMINI_API_KEY2` und ausschliesslich die kostenlose Gemini-Version.

## Ausgeführte Gegenprobe

- Draft-PR [2915](https://github.com/allengchour-glitch/aban-news-landing/pull/2915) wurde ohne Force-Push auf aktuelles `main` gebracht. Der finale Draft nutzt `secrets.GEMINI_API_KEY2`, `gemini-2.5-flash-lite`, genau einen begrenzten Textrequest, keine Wiederholung und kein Ersatzmodell.
- Für den einmaligen Test wurde nur ein öffentlicher, gemessener LuxeStyle-Menübefund übergeben; keine Kunden-, Bestell- oder Secretdaten.
- GitHub-Lauf [42430952176](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/42430952176) brach vor dem API-Aufruf ab: `GEMINI_API_KEY2` war im Job leer.
- Ergebnis: null Gemini-Requests, null Modellantworten, null Wiederholungen und keine belegten Kosten. Der Fehler ist ein Zugriffs-/Bindungsblocker, kein leeres Gemini-Ergebnis.

## Aktueller Blocker

Die GitHub-Integration darf Secretnamen nicht auflisten (`403 Resource not accessible by integration`). Sichtbar ist nur das Environment `github-pages`; dort ist keine Gemini-Bindung belegt. Der Key muss in GitHub als Actions-Repository-Secret für `allengchour-glitch/aban-news-landing` liegen oder als Organisations-Secret ausdrücklich für dieses Repository freigegeben sein. Den Wert niemals im Chat senden.

Der Secretname beweist weiterhin keinen kostenlosen Tarif. Vor einem neuen Lauf muss das zugehörige Google-AI-Studio-Projekt tatsächlich Free Tier ohne verknüpftes Abrechnungskonto sein. Keine blinde Wiederholung.

Keine Website-, Shopify-, Metricool-, Flow-, DNS-, Budget-, Kunden-, Bestell- oder Renderänderung in diesem Schritt.
