# Auftrag an Codex: optische Verbesserungen auf luxestyle.ch suchen (09.11.2026)

Auftrag des Besitzers an Claude am 09.11.2026 abends: «suche nach optische verbesserungen auf webseite» und «nutze gemini und codex». Claude kann Codex von hier nicht aufrufen, darum dieser Auftrag als Datei (wie `CODEX-VOLLGAS-2810.md`). Gemini und drei Claude-Sucher arbeiten parallel (Workflow `optik-suche-0911`); Codex ist das **dritte, unabhängige Auge**. Bitte nicht in die Ergebnisse der anderen schauen, bevor du deine Liste abgegeben hast.

## Ziel
Konkrete, sichtbare optische und Bedienungs-Mängel finden, die den Shop «billig» oder unfertig wirken lassen, mit der kleinsten sicheren Korrektur (am liebsten CSS).

## Was du ansiehst (Erstbesucher, Cookie-Hinweis und Popup nicht wegklicken)
Desktop 1440 × 900 und Handy 390 × 844 (Touch), je Seite von oben bis unten:
`/` · `/collections/uhren` · `/collections/kissen-wohntextilien` · `/products/rizinusol-wickel-wiederverwendbar-bauch-nacken` · `/products/kostum-sensemann-fgss0052` · `/products/shirt-zum-selbstgestalten` (Editor) · `/cart` · `/pages/versand-lieferung` · `/pages/ueber-uns` · `/pages/rueckgabe` · `/pages/faq` · eine nicht vorhandene Seite (404) · `/fr`.
**Messregeln:** höchstens ein Browser, normale Chrome-Kennung, Adressen ohne Query, mindestens 6 Sekunden Pause zwischen Seitenaufrufen (Cloudflare drosselt sonst mit 429 oder einer Bot-Prüfung).

## Schon behoben (04.11., `dropship/optik-0411/README.md`), nicht noch einmal melden
Newsletter-Popup nicht über dem Cookie-Hinweis, Handy-Menü ohne verdeckte Zeilen, Seitenstreifen um Fotos, quadratische Boxen, Hilfe-Knopf, Ankündigungsleiste Handy, Kartenformat 4:5, leere Sterne weg, Fusszeile zweispaltig, Preiszeile bündig, Warenkorb-Schublade, Überschriften Serif, Etikett «NO. 00X» weg.
**Bekannt und bewusst offen:** Cookie-Hinweis/Popup auf `/fr` deutsch, Hilfe-Knopf auf der Handy-Startseite hinter der unteren Leiste, Sprung der `/cart`-Leiste nach 2 bis 3 s, Kiss-Cut-Umriss als «Foto» im Editor.

## Nicht Teil des Auftrags
Preise, Versandregeln, Rechtstexte, Produktauswahl, Übersetzungen, neue Funktionen, Apps von Shopify, Rabattcodes.

## Lieferung (nur Dateien, kein Schreibzugriff im Shop)
Unter `dropship/codex-optik/antwort/`:
1. `funde.json`: Liste `{seite, geraet, was, wo (Selektor), schwere (hoch|mittel|klein), messung (Soll/Ist mit Zahlen), vorschlag (CSS)}`. Behauptungen ohne Messung kennzeichnen («vermutet»).
2. `bilder/`: eine Aufnahme je Fund (höchstens 1280 px breit).
3. `README.md`: was du gesehen hast, was du nicht prüfen konntest (Safari, Firefox, echtes Handy).

Das Theme schreibt nur Claude (Sicherung, Rücklesen, Rücknahme, Messung vor und nach dem Einspielen).
