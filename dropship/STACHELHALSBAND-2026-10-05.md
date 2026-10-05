# Stachelhalsband als «Stimulationskette» (Verbesserungsrunde 05.10.2026, 00:30 UTC)

GEMESSEN: Google-Blocker 1'219 Meldungen = **888 verschiedene Produkte** (Adult «Sexual interests» und «Restricted adult content»
sind dieselben 299). Neuware seit 02.10.: 1'392/1'393 mit Google-Kategorie, 1'376 mit Shopify-Kategorie, 13 ausserhalb des
Google-Kanals alle mit Grund. Beim Lesen der Blocker-Handles: «Halsband mit Stimulationskette für Hunde» — Bild = Metallzacken
nach innen, Text «Stimulationspunkte zunächst nach aussen» → **Stachelhalsband**, in der Schweiz verboten (TSchV Art. 76),
ACTIVE in 7 Kanälen.

GETAN: Regel `stachel-wuerge-halsband` in `automation/tierschutz_geraet.json` um Umschreibungen erweitert
(stimulationskette/-punkte/-spitzen, kettenwürger, pinch/choke collar, Zacken-/Krallenhalsband). `tierschutz_guard.py` über den
ganzen Bestand: 1 Befund, 0 Fehlalarme (Leder-Brustgeschirr bleibt) → DRAFT, Tag `tierschutz-tschv76`, aus Google. Python = JS.
Der tägliche Tierschutz-Wächter läuft weiter mit der erweiterten Regel; die Importer nutzen dieselbe JSON.

LEHRE: CJ-Texte umschreiben verbotene Ware mit harmlosen Wörtern («Stimulation», «Training»). Eine Wirk-Regel braucht die
Verkaufs-Euphemismen, nicht nur den Fachbegriff.
