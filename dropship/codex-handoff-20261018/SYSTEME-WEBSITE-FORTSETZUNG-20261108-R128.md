# LuxeStyle Systeme und Website – 08.11.2026, R128

Stand: 01:27 Uhr Europe/Zurich. Dieser Lauf übernimmt Revision 127, vermeidet offene Claude-/Codex-PR-Doppelarbeit und setzt zwei unabhängig sichere Grundlagen um. Es gab keinen Shop-, Theme-, Produkt-, Social-, Kunden-, Flow-, DNS-, Budget-, Rabatt-, Bestell- oder Renderwrite.

## Identität und Koordination

- Shopify ist frisch als `LuxeStyle`, `au3j0y-hq.myshopify.com`, CHF und Primärdomain `luxestyle.ch` bestätigt.
- Metricool ist frisch als brandId `6227837`, Europe/Zurich und mit den sechs erwarteten Kanalidentitäten bestätigt.
- Die kanonischen Dateien von Revision 127 wurden frisch gelesen. Es gibt weiterhin keinen Beleg, dass Claude Code diese Revision übernommen hat; `receiptState` bleibt `unknown_missing_receipt`.
- R125 bis R127 wurden nicht als neue Umsetzung wiederholt. Tageskennzahlen, Klaviyo, Bestellungen und der beendete Kauf-Watch wurden nicht erneut gelesen.

## Sicherer lokaler Obsidian-Vault

- Zwei alte Vaults aus PR 1608 beziehungsweise PR 2514 sind veraltet, divergiert und enthalten historische Geschäfts-/Bestelldaten. Sie wurden nicht importiert.
- Der neue Builder auf Draft-PR [2922](https://github.com/allengchour-glitch/aban-news-landing/pull/2922), Commit `9a2c075a65363bc8c2571d47ddb98f4285dedc8a`, erzeugt ausserhalb des öffentlichen Repositorys nur eine allowlistete Aufgabenübersicht sowie Quellpfade und Prüfsummen.
- Eine unabhängige Gegenprobe fand im ersten Draft fünf Sicherheitslücken: ungeschütztes Löschen von `.previous`, Secretwerte in Task-Titeln, Ziele in fremden Git-Repositories, nicht kanonische/dirty Quellen und fehlende CI-Einbindung. Commit `9a2c075a65363bc8c2571d47ddb98f4285dedc8a` schliesst diese fail-closed: bestehende Ziele werden nie ersetzt oder gelöscht, Quellen müssen kanonisch/HEAD-sauber sein, jedes Git-Ziel wird blockiert, Task-Titel werden mitgescannt, Pfade shell-gequotet und die Tests laufen im Workflow.
- Lokal bestätigt: Revision 128, 24 Aufgaben, keine Rohdateien, keine erkannten Kunden-/Secretwerte, Sync/Publish aus und keine Community-Plugins. Elf Unit-Tests, Python-Compile sowie echter Build und Check sind grün. Die Repo-CI-Simulation stoppt vor Tests an `unshare: Operation not permitted`; das ist kein grüner Voll-CI-Beleg.
- Obsidian Desktop/CLI ist in dieser Laufzeit nicht installiert. Der lokale Vault ist vorbereitet und prüfbar; eine Desktop-App, Cloud-Sync oder Veröffentlichung wurde nicht installiert oder aktiviert.

## Mega-Menü: vollständige Gruppenmessung vor Kürzung

- Draft-PR [2924](https://github.com/allengchour-glitch/aban-news-landing/pull/2924), Commit `e2f856c7d75674da37118007e5c003ddce577882`, ergänzt einen rein lesenden, fail-closed Abdeckungsprüfer.
- Live gemessen: 86 Gruppen-Knoten, 84 eindeutige Gruppen-URLs, 520 Kind-Kanten. Alle 84 Landingpages antworteten HTTP 200 ohne Redirect und mit erwartetem Canonical.
- Nur 13 Gruppenpages decken alle Kinder im Hauptinhalt ab; 397 von 520 Kanten fehlen dort. Ein Cap von sechs würde 44 eindeutige Ziele ohne belegten Ersatzlink verstecken.
- Im Mobile Drawer ist für 0 von 86 Gruppen ein expliziter «Alle in …»-Link belegt; `active/current` bleibt ohne unveröffentlichten Theme-Entwurf unbekannt. Deshalb kein Menü-Cap und kein Theme-Write.
- 36 fokussierte Prüfungen inklusive positiver/negativer Mutationsprobe sind grün. HTTP 429/5xx, Redirects, falsche Canonicals oder fehlende mobile/active-Belege sperren die Freigabe.

## Gemini und CJ

- In dieser Laufzeit gibt es keinen direkten Gemini- oder CJdropshipping-MCP und keine gebundenen Gemini-/CJ-Secrets. Windsors `cj` ist CJ Affiliate und kein CJdropshipping-Ersatz.
- Draft-PR 2915 verwendet `GEMINI_API_KEY2`, `gemini-2.5-flash-lite`, genau einen begrenzten Request, keine Wiederholung und nur ein kurzlebiges Artefakt. Das Schlüsselprojekt und dessen Free-Tier-/Billing-Zuordnung sind nicht bestätigt; kein Dispatch oder API-Aufruf.
- Die aktuell dokumentierten Pro-Modelle sind kostenpflichtig; `gemini-2.5-pro` ist veraltet. Ohne ausdrückliches Kostenbudget und geprüfte Billing-Zuordnung wurde kein Pro-Aufruf vorbereitet oder gestartet.
- Draft-PR 2896 stellt einen eng begrenzten CJ-Nur-Lese-MCP bereit. Zwei historische Read-only-Läufe vom 05.11. waren erfolgreich, der PR liegt aber 55 Main-Commits zurück. Vor Aktivierung auf aktuelles Main bringen, feste Hashes und Tests erneut prüfen; danach zuerst nur den netzlosen Status, anschliessend höchstens ein bekanntes Produkt lesen. Schlüsselwerte nie im Chat senden.

## Nächste sichere Schritte

1. PR 2922 reviewen; lokal kann der vorbereitete Vault in einer vorhandenen Obsidian-Desktop-App geöffnet werden. Kein Sync/Publish aktivieren.
2. PR 2924 reviewen. Danach zuerst mobile «Alle in …»-Ziele in einem unveröffentlichten Theme entwerfen und die 44 Cap-6-Lücken auf Gruppen-/Alternativseiten schliessen; erst dann einen Cap erneut prüfen.
3. PR 2896 auf aktuelles Main aktualisieren und seine festen Hashes/Tests neu bestätigen. Für die spätere lokale Bindung wird nur der bestehende `CJ_API_KEY` über einen sicheren Secret-Speicher benötigt, nicht im Chat.
4. Gemini Pro nur nach ausdrücklichem Kostenbudget und sicherer Projekt-/Billing-Gegenprobe; der kostenlose Flash-Lite-Weg bleibt bis zur Free-Tier-Bestätigung Draft.
