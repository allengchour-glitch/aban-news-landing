# Startseite: Saisonreihen + Saison-Pools (24.11.2026)

Betreiber 24.11.: «jaa mache solche sachen auch in startseite» / «ergänze mehr sachen auf startseite?».

**Live seit 24.11. ~18:55 UTC (Theme MAIN 214565814663):** drei neue Produktreihen in `sections/luxe-edit-home.liquid`
(Reihenfolge: Saison-Kacheln → «Weihnachtszauber» → «Warm durch den Winter» → Schmuck → «Geschenkideen für deine Liebsten» → Zuhause).
Je 4 Karten aus einem eigenen manuellen Pool (Fenster 12, Wechsel alle 4 h, Rechnung wie Schmuck/Wohnen):
`startseite-pool-weihnachten` (20), `startseite-pool-winter` (26), `startseite-pool-geschenke` (19) — versteckt (seo.hidden), nur Online Store.
Karten direkt aus dem Pool-Produkt (`snippets/lx-edit-karte.liquid`), NICHT über `all_products` (Grenze 20 Handles/Seite; Trends + Schmuck/Wohnen brauchen 17).
Fehlt ein Pool oder hat er < 12 Produkte, verschwindet die Reihe von selbst. Texte de/fr/en in `luxe_home.extra.{christmas,winter,gifts}_{eyebrow,heading,intro}`.

Auswahl: Workflow wf_b099f4ba-6dc (3 Auswähler + 3 unabhängige Prüfer mit eigenem Kontaktbogen): 30/30/30 vorgeschlagen, 20/26/19 behalten.
Abgelehnte mit Befund: `PRODUKTDATEN-MAENGEL.md`. Doppelte aus `startseite-pool-trends` (−5) und `-mehr` (−2) entfernt.
Geprüft für Besucher per WebFetch (eigene IP bekommt alte Kopie): drei Überschriften + je 4 Karten, kein «Liquid error».

**Rückweg:** `sicherung/` = Live-Dateien vor dem Schreiben (section, de/fr/en) → per themeFilesUpsert zurück, Snippet löschen; oder einfach einen Pool leeren/löschen (Reihe verschwindet).
Pools vor dem ersten Saison-Schritt (17:40): `pools_vorher.json`. Theme-Kopie war nicht möglich: Shop hat das Maximum von 20 Themes.
**Nach Weihnachten:** Pool weihnachten leeren oder Reihe aus `lx_edit_groups` nehmen (Enddatum nicht eingebaut).
