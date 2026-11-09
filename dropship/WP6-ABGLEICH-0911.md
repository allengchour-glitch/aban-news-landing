# WP6 (Bestellweg «Selbst gestalten»): Abgleich des alten Zweigs mit main (09.11.2026)

Auslöser: Seite «LuxeStyle Offene Punkte», Zeile «Bestellweg» («vor dem Weiterbauen gegen den neuen Editor 6.3.1 abgleichen»), Besitzer «mach mal etwas weiter». Nur gelesen: nichts eingespielt, nichts an Shopify, Printful, CJ oder Cloudinary geschrieben.

## Der Zweig
`claude/luxestyle-wp6-bestellweg-0611` @ `1976706c1f`: zwei WIP-Commits («nichts live»), am 06.11. von `e6fc42e409` abgezweigt; 27 Dateien, +6 804 / −86.
Probe-Zusammenführung mit `main` (`git merge-tree --write-tree --name-only origin/main <Zweig>`, ohne Arbeitsbaum, 09.11.): **nur zwei Konflikte**, `CLAUDE.md` und `pod/v6/test/vorschau_test.mjs`.

| Paket | Dateien | Stand |
|---|---|---|
| A: Parser und Sync gehärtet | `automation/lib/printful_bestellweg.mjs` und Test, `automation/printful_sync.mjs` (nur Kopfkommentar) und Test, `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs`, `dropship/wp6-0611/SYNC.md`, `OHNE-DESIGN.md` | laut `SYNC.md` 492 und 206 Prüfungen, Mutationsprobe 207 von 207 (heute **nicht** nachgemessen). `main` hat diese Dateien seit 06.11. nicht geändert (GEMESSEN: `git rev-list` je Datei) |
| B: Editor 6.2.1 | `pod/v6/lspod-designer-v6-6.2.1.js`, `pod/v6/test/*` | **überholt**: `main` führt 6.3.0 und 6.3.1 |
| C: Warenkorb-Miniatur im Theme | `dropship/wp6-0611/theme/*` (Einspielskript, Patches, Tests, Sicherung `cart-products`) | nichts live; das Theme hat sich seither bewegt: vor dem Einspielen frisch gegen das MAIN-Theme |
| Workflow | `.github/workflows/luxestyle-automation-tests.yml` (+27 Zeilen) | die Datei haben seit 06.11. neun Änderungen auf `main` berührt: nicht blind übernehmen |

## Vertrag Live-Editor ↔ Parser auf main (GEMESSEN am Quelltext)
- Editor 6.3.1 (`pod/v6/lspod-designer-v6-6.3.1.js`, `eigenschaften()` und `podKarteWert()`) schreibt in den Warenkorb: `🎨 Design (<ID>)`, `🖼️ Druckdatei (<ID>)` (die **alte** Schreibweise), `_pod_karte` als JSON mit `v, m, pv, sv, pl, dt, px, ap, qd`, und `_vorschau` (Adresse des Vorschau-JPEG).
- Der Parser (`dateienAusEigenschaften` in `automation/lib/printful_bestellweg.mjs`) liest `_pod_karte` (`v, pl, dt, o, pv, m`) und die Druckdatei-Schlüssel; `_vorschau`, `ap`, `qd`, `sv` stören nicht, sie werden ignoriert. `printful_sync.mjs` erkennt eine Position mit `Druckdatei` oder `_pod_karte` als Editor-Position.
- Ergebnis: **der Weg Live-Editor → Parser stimmt.** Nicht gemessen: eine echte Bestellung über den Editor (Stand 05.11.: keine unter 34 Bestellungen), ob die Admin-Schnittstelle Eigenschaften mit führendem Unterstrich liefert (siehe `SYNC.md` Abschnitt 5, Punkt 1; sie stehen für `_pod_karte` schon im Live-Editor).

## Was Paket A zusätzlich brächte
Der neue Schlüssel `_Druckdatei (<ID>)` (blendet die Zeile in Kasse und Mail aus; **kein Live-Editor schreibt ihn**), `qd` als weicher Befund, der Widerspruch Karte ↔ SKU als **harter** Befund (statt weich), eine klare Meldung bei bezahlter Bestellung ohne Design. Nutzen heute klein: der Sync legt nur Entwürfe an und läuft nur per Handstart.

## Entscheid (meiner, nicht bestätigt)
**Geparkt, nichts eingespielt.** Gründe: bisher kein Kauf über den Editor belegt, die Tasse wartet auf den Besitzer («warten», 06.11.), und der neue Schlüssel hat keinen Schreiber.

## Wiederaufnahme (vor der Tasse oder dem ersten POD-Auftrag)
1. Neuer Zweig von `origin/main`.
2. Nur Paket A holen: `git checkout origin/claude/luxestyle-wp6-bestellweg-0611 -- automation/lib/printful_bestellweg.mjs automation/lib/printful_bestellweg_test.mjs automation/printful_sync.mjs automation/printful_sync_test.mjs dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs dropship/wp6-0611/SYNC.md dropship/wp6-0611/OHNE-DESIGN.md`
3. Tests selbst fahren (`node automation/lib/printful_bestellweg_test.mjs`, `node automation/printful_sync_test.mjs`, `node automation/lib/printful_platzierung_test.mjs`, Mutationsprobe `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs`, rund 13 Minuten) und den Vertrag gegen den **dann** gültigen Editor neu lesen (Schlüssel, Karte).
4. `_Druckdatei` nur mitnehmen, wenn ein Editor ihn wirklich schreibt; sonst den Teil weglassen und die Tests entsprechend kürzen.
5. Paket C (Miniatur) getrennt: Sicherung und Rücklesen wie bei jedem Theme-Schreibzugriff, Kasse und Bestätigungsmail vorher und nachher messen.
