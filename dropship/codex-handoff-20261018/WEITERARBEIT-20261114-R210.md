# LuxeStyle: konkreter Feed-Codefehler korrigiert als Entwurf (R210)

**Neuer tatsächlicher Fortschritt:** Ein Fehler im bestehenden Merchant-Feed-Generator ist am unveränderten aktuellen Main-Code reproduziert und in einer isolierten Kopie korrigiert. Der Zwei-Datei-Patch samt Tests ist gespeichert. **Keine produktive Feed-Änderung und kein Google-Fall als behoben bestätigt.** Das bereits freigegebene SEO-Theme bleibt unveröffentlicht.

## Konkreter Feed-Fix

Quelle: aktueller Main-Commit90d0ea75bf2e1e864b3964c7983e3908961011d6, Dateien `automation/lib/gmc_feed_item.mjs` und zugehöriger Test. Root hat den Remote-Main-Pin frisch geprüft; Baseline-Dateien sind bytegleich mit diesem Commit.

Mit einem synthetischen gültigen Feed-Testobjekt (Titel, Bild-URL, Preis, Marke, Tags, ID; GTIN und SKU fehlen) erzeugt der bestehende Code **`<g:identifier_exists>no</g:identifier_exists>`**. Das Vorhandensein einer GTIN/SKU ist unbekannt; aus fehlenden Angaben folgt nicht, dass keine Herstelleridentifikatoren existieren. Das widerspricht der ausdrücklichen Inhabervorgabe.

Der minimale Entwurf entfernt genau diese automatische Negativbehauptung. Ohne GTIN/SKU bleibt das Attribut weg. Vorhandene gültige GTIN und SKU/MPN werden weiterhin ausgegeben; weder Preise, Tags, Länder, Versandwerte noch bestehende Sperren werden geändert. Es wird auch kein automatisches `identifier_exists=true` ergänzt. Keine neuen Herstellerdaten oder GTINs erfunden.

Prüfung am isolierten tatsächlichen Code: Baseline-Suite83Assertions grün, wobei eine davon den alten falschen Standard erwartete. Im Entwurf ist diese Erwartung korrigiert, fehlende/leere Kennungen sind zusätzlich geprüft:85Assertions grün. Root hat unabhängig acht weitere Assertions ausgeführt, einschliesslich ungültiger GTIN ohne SKU, bytegleicher GTIN-/MPN-Ausgabe, erhaltener Sperrtags und Preis0-Ablehnung. Alle acht bestehen. Es sind synthetische Funktionsprüfungen, keine85Shop-Produkte, kein End-to-End- oder Live-Google-Test.

Die vollständige CI-Simulation wurde vor möglicher Ausführung gelesen. Sie spielt weitere Workflow-Jobs samt Paketinstallationen ab und wurde in diesem isolierten Schritt nicht gestartet. **Vollständige CI bleibt vor operativer Integration erforderlich; der Patch ist nicht als merge-/deploymentfertig freigegeben.** Kein PR, Merge, Workflowstart, Deployment, Feed-Upload oder Produkt-Write ausgeführt. Nur die dokumentierte Patchdatei wird ins Handoff geschrieben, nicht die operative Automation verändert.

Dieser Codefehler ist nachgewiesen. Seine Verbindung zu den2’005rohen Artikel-IDs oder einer der19CSV-Problemarten ist nicht belegt; keine Anzahl dadurch behobener Artikel erfunden. Die R209-CSV-Klassifizierung, Quellen und drei DRAFT-Stichproben werden datiert weiterverwendet.

## Vorhandene Helfer und Zugang

Die erste lokale Sicht war wegen sparse checkout unvollständig. Danach wurden genau fünf vorhandene Dateien direkt aus dem gepinnten Git-Commit gelesen: Merchant-Probe, Shopify-Feedgenerator, Feed-Item-Modul, Merchant-Probe-Workflow und Versandhelfer. Ein fehlendes lokales Verzeichnis ist kein fehlender Connector oder Beweis fehlender Repo-Helfer.

Die Merchant-Probe liest Kontoinformationen, enthält aber bei `REGISTRIEREN=true` einen Registrierungs-Write. Der Versandhelfer enthält explizite Schreib-/Rücksetzmodi. Beide wurden nicht ausgeführt. Der Shopify-Generator baut lokales XML aus Shopify; seine Handle-IDs beweisen keine aktive Quelle der CSV-Offers. Keiner der fünf geprüften Helfer bietet den benötigten Einzelartikel-zu-Datenquelle-Read. Das ist ein begrenzter Quellbefund, kein globaler Beweis fehlender Helfer.

Nur die Präsenz der konkret benötigten lokalen Umgebungsvariablen wurde geprüft: GCP_SA_KEY, MERCHANT_ID, GOOGLE_APPLICATION_CREDENTIALS und die Shopify-Runtimevariablen sind in diesem Prozess nicht gesetzt. Keine Werte gelesen/ausgegeben, keine Secrets angefordert und keine Aussage über GitHub-Secret-Inhalte oder die weiterhin vorhandenen Connectoren. Kein Installations-, Auth-, Register-, Versand- oder Workflow-Start. Die R209-Windsor-Timeouts wurden nicht erneut angefragt.

## SEO-Theme: Zustimmung bleibt, letzter Klick ausstehend

Shopify luxestyle.ch/CHF und Metricool6227837/EuropeZurich samt allen sechs Kanalidentitäten frisch bestätigt. Aktueller Rollen-Read: bisheriges213013037447 bleibt MAIN; **«LuxeStyle – SEO 14.11.2026» /213991391623 bleibt UNPUBLISHED**. Die beiden gespeicherten SEO-Dateichecksums stimmen mit R208/R209 überein.

Die konkrete Inhaberfreigabe bleibt gültig; sie wurde nicht nochmals erfragt. Der R209-Publishversuch war ausdrücklich abgewiesen worden («Only agent-created themes can be published here»). In R210 kein weiterer Publishversuch und keine alternative Publishing-API oder Umgehung.

Browser-Skill und tatsächliche Tools geprüft: keine aufrufbaren Extension-js-/Tab-Steuerwerkzeuge; übergebener Companion-Kontextpage_id/document_view jeweilsnull. Kein behaupteter steuerbarer Browser und kein neuer ablaufender Remote-Login-Link. Der Inhaber wurde um den notwendigen technischen Klick gebeten: **Shopify → Onlineshop → Themes → «LuxeStyle – SEO 14.11.2026» → Veröffentlichen**. Das ist keine weitere Freigabefrage. Erfolg erst nach tatsächlichem Rollen-/Live-Readback melden. Vor einem späteren Wechsel müssen zwischenzeitliche MAIN-Änderungen erneut geprüft werden.

## Tageszwischenstand

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Feed-Code | Fehler mit fehlenden Kennungen im echten Main-Modul reproduziert; minimalen Zwei-Datei-Entwurf erstellt | Unbelegtes identifier_exists=no entfällt im Entwurf.85gezielteAssertions und8Root-Gegenproben grün; vollständigeCI offen. Kein produktiver Feedlauf |
| Helfer | Genau5Repo-Quellen ausGit statt nur Sparse-Dateisicht geprüft; credential presence ohne Werte gelesen | Helfer vorhanden, aber unter diesen5kein benötigter Einzelartikel-Source-Read und keine lokaleGCP-Runtime. Keine Auth-/Versand-/Registrierungsausführung |
| SEO / Zugang | Shopify und Metricool verifiziert, Theme-Rollen und gespeicherten Stand gelesen; Browserfähigkeiten geprüft | SEO-Kopie weiterUNPUBLISHED; bestehendeFreigabe bleibt. Technischer Owner-Klick ausstehend, kein erneuter Publishversuch |
| Kontinuität | R209-CSV/Quellenbefunde datiert weiterverwendet,24Task-IDs/Historien erhalten | Keine neuen Tagesreports/Kauf-Watchabfragen/Socialposts/Render/Budget-/Rabatt-/DNS-/Flow-/Shop-/Feedänderungen. Kein Merchant-Fall als behoben gezählt |

ÖffentlicheCHF50/interneCHF45, Kundendomäne und bestehende08/14/19-Läufe bleiben unverändert. Keine neue Automation oder Frequenzänderung. Vier DNS-Ergänzungen weiterhin bereits genehmigt, Writer unbestätigt. Master-/Rechte-/Qualitäts-/Kanal-/Ledgerregeln bleiben bestehen. Claude-Empfang ohne Beleg unbekannt.

Belege: [Feed-Patch](MERCHANT-IDENTIFIKATOREN-20261114-R210.patch), [Reproduktion und Tests](MERCHANT-IDENTIFIKATOREN-20261114-R210.json), [Helferprüfung](MERCHANT-HELFER-20261114-R210.json), [Zugang und Rollen](ZUGRIFF-20261114-R210.json).
