# Unabhängige lokale Schlussprüfung vom 01.11.2026

Geprüft wurden die tatsächlich gespeicherten lokalen API-Belege und Entwürfe unter `lauf-20261101`. Für diese Schlussprüfung keine weitere API-, Kennzahl- oder Flowabfrage. Keine zusätzlichen externen Writes.

| Bereich | Prüfung | Ergebnis |
| --- | --- | --- |
| Erster neuer Kauf | `products/orders.json`, Query und Variablen gegen sämtliche Inhaberkriterien geprüft | BESTANDEN: elf unabhängige Bedingungen. #1032 ist der früheste qualifizierende Treffer nach Baseline: 30.10.2026 22:00:11 Zürich, CHF 31.80, PAID, Nicht-Test, nicht storniert, keine Erstattung, positive erfolgreiche Nicht-Test-SALE über Shopify Payments. #1033 qualifiziert ebenfalls. Keine Verursachung behauptet |
| Abfragescope | Baseline-/Endfenster, first20, CREATED_AT aufsteigend, pageInfo, ausgewählte Felder | BESTANDEN: zwei Datensätze, keine Folgeseite; keine Personen-/Adress-/Zahlungsinstrumentfelder |
| Kauf-Watch | Tatsächliche Toolantworten `automation-before.json` und `automation-readback.json` bytegenau verglichen | BESTANDEN: exakt eine Prompt-Ersetzung der OFFEN-Zeile durch ERREICHT + belegte Bestellung + Ende ausschliesslich des Watchteils. Alle übrigen Promptbytes, ID, Titel, Schedule, Zeitzone, Enabled, TimingMode und Threadbezug unverändert. Nur zulässige updated_at/run_details-Metadaten unterscheiden sich |
| Produktbezug | Aktuelle Produktberichte, Referenzen und Sperrentscheidungen gelesen | BESTANDEN: Projektor CHF 34.90 mit passenden IDs; Kaufbarkeit ist kein Lager-/Lieferzeitbeleg. Pyjama rueckhol sperrt neue Social-Ausspielung |
| Metricool | Ergebnis auf unvollständige Tagesabdeckung, Status und Doppelpost-Scope geprüft | BESTANDEN: acht bestehende Posts / 15 PENDING; keine eigene Publikation. Nur Teilwerte; alle vollständigen Wochenwerte bleiben unbekannt. Medien-URL-Abgleich beweist keine universelle kreative Einzigartigkeit |
| Master / Texte | Storyboard, sechs Caption-/UTM-Verträge und Originaltake-Prüfer gegengelesen | BESTANDEN: gleiche Master-ID, exakte Variante, sechs eindeutige UTMs, keine fertige MP4 oder Rechtefreigabe behauptet. YouTube-Entscheidung allgemein/nicht speziell Kinder erhalten |
| Originaltake-Prüfer | Unabhängige Typfehler-Gegenlese und erneuter Testlauf | BEHOBEN/GEPRÜFT: Objekt-/Listen-Take-ID löste zunächst TypeError aus. Agent korrigierte Typprüfung; alle 14 synthetischen Fälle unabhängig erneut bestanden. documentationConsistent bedeutet ausdrücklich keine Render-/Publikationsfreigabe |
| Klaviyo | Report, Flowzustände und exakter Welcome-Diff gegen lokale Antworten | BESTANDEN: USD getrennt; nur Welcome liefert Reportzeile mit 3 Zustellungen, 1 Klick, explizit 0 zugerechneten Conversions. Fehlende andere Zeilen unbekannt. Genau zwei einzelne HTML-Zeilen ändern sich im bestehenden, nicht angewendeten Vorschlag |
| Ads | Bericht gegen Konfigurationsantworten gelesen | BESTANDEN: Auto-Tagging neu True geliefert; Kampagne PAUSED, CHF 58 Gesamtlimit und Enddatum 05.11. Keine Start- oder echte Kaufereignisfreigabe aus Kontokonfiguration abgeleitet |
| DNS | Öffentliche Vier-Record-Stichprobe gelesen | GRENZE EINGEHALTEN: kein Vollzonen-/Schreibzugangsbeleg und keine Umsetzung; bereits genehmigte Ergänzungen nicht erneut zur Genehmigung vorgelegt |

Nachweise: `REVIEW-ORDERS.json` und `REVIEW-AUTOMATION.json`. Bestehende Teilberichte wurden geprüft; ein später erstelltes konsolidiertes Paket und spätere Repository-Rücklesungen sind durch diesen Stand noch nicht geprüft.

Offen bleiben die fachlichen Produktionsblocker (Originaltakes, exakte Geräte-/Motiv-/Stromzuordnung, kommerzielle Rechte, fertige Filmabnahme und dauerhaftes Publikationsregister), passende Bio-/Boardziele, kampagnenspezifische Kaufzielbindung und authentifizierter DNS-Schreibzugang. Keine dieser Grenzen hindert die Meldung des tatsächlich belegten ersten neuen Kaufs.

Kein unbelegter Kauf- oder Publikationserfolg im geprüften Umfang. Keine Freigabe für produktive Shop-/Flow-/Ads-Änderungen durch diese Prüfung.

