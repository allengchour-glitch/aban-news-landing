# Eine konkrete Verkaufsverbesserung zur Freigabe: Welcome ohne ungeprüftes Rabattversprechen

**Nur Entwurf; nicht angewandt, keine Flow-Aktivierung oder Sendung.** Aktuelle Quelle: Flow `VbLQj6` («Welcome Series»), Status `draft`, Trigger «Added to List»; E-Mail-Aktion `108029461`, Nachricht `TTuuTS`, Vorlage `VZnxDz`, ebenfalls `draft`.

Der vorhandene Betreff verspricht «10%»; ein aktuell genehmigter Rabatt ist nicht belegt. Vorgeschlagener konkreter Inhalts-Diff für ausschliesslich diese Nachricht:

| Feld | Vorher (frisch gelesen) | Vorschlag |
|---|---|---|
| Betreff | `Willkommen U+1F49B Hier sind deine 10%` (Symbol als Codepoint notiert) | Willkommen bei LuxeStyle |
| Vorschautext | leer | Entdecke dein nächstes Lieblingsstück und prüfe die passende Ausführung. |

Der aktuelle Originalbetreff lautet exakt «Willkommen », dann Unicode U+1F49B, dann « Hier sind deine 10%»; der Codepoint wird hier ausgeschrieben, damit der Bericht ohne Emojis bleibt. Diese einzelne Verbesserung entfernt das ungeprüfte Rabattversprechen aus Betreff/Preheader. Der Nachrichtenkörper wurde in diesem Lauf nicht neu gelesen: vor einer später freigegebenen Anwendung auf widersprüchliche Rabatttexte prüfen; keine nicht gelesene Gesamtmail als rabattfrei bezeichnen. Keine Rabatte erstellen, keine Nachricht/Flow aktivieren, bestehende Abbruch-Mail `VPmnEB` («Dein Einkauf ist noch gespeichert») unverändert lassen.

Vor einer gesondert erlaubten Welcome-Aktivierung müssen Live-Einwilligung, bestehendes Capture-Formular, konkrete Liste und Zuordnung zum Trigger nachvollziehbar sein. Die kleine Formularantwort war leer; das beweist weder fehlende Formulare noch eine funktionierende Aufnahme. Diese Voraussetzungen bleiben Blocker, keine zweite Verkaufsaktion und keine Aufforderung zu Testsendungen oder Kundenkontakt.

Berichtsgrenze: Nach frischer Placed-Order-Metrik `W7XTVD` wurde genau ein Flow-Report für 09.–15.11. gelesen. Leere `results`/`flow_aggregation` bleiben unbekannt. Abandoned Checkout `Vse76a`, Welcome `VbLQj6` und Post-Purchase `RnTvsY` sind aktuell alle `draft`; keinen historischen Live-Status oder fehlenden Bestell-Sync behaupten. Shopify CHF und Klaviyo-Kontowährung USD bleiben getrennt.
