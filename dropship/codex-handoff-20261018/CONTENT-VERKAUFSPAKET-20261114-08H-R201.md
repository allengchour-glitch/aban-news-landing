# LuxeStyle – Morgenlauf 14.11.2026, R201

**Keine Plattformänderungen.** Shopify lieferte erneut die falsche Shopidentität; nur die Identität wurde gelesen. Metricool-Marke, Zeitzone und alle sechs LuxeStyle-Kanäle stimmen. Die heutige Planung wurde frisch gelesen; Kennzahlen und Klaviyo stammen aus dem bereits gespeicherten heutigen R200-Report und wurden nicht nochmals abgefragt.

## Planung und Kontinuität

48 Objekte, davon 39 aktive mit 49 Kanalplatzierungen und neun Entwürfe. Der Snapshot ist bytegleich zum R200-Ausgangssnapshot. Instagram, Facebook, TikTok und Pinterest sind täglich vom 14.–21. November terminiert. YouTube fehlt am 15.–21., Threads am 15. November. Alle gelieferten Providerzustände sind PENDING; vor 08:05 Uhr war kein aktiver Slot fällig. Keine exakten Text-/Medienlisten-Doppelungen je Kanal im geprüften Fenster. Frühere Masterhistorie und kreative Gleichheit unter anderen URLs bleiben damit unbekannt. Keine Löschung oder Ersatzposts.

Von elf R200-Halte-UUIDs sind fünf in diesem Fenster frisch als draft=true/autoPublish=false bestätigt; sechs sind hier nicht enthalten und werden nicht als gelöscht, veröffentlicht oder freigegeben behandelt. Vier weitere Holds im aktuellen Hauptbranch sind ebenfalls als inaktive Entwürfe vorhanden. Der R200-Schutzpatch bleibt auf Prüfbranch b45049a und ist nicht im aktuellen main-Haltefile. Kein Merge, Workflowstart oder Deployment.

Die sieben abgeschlossenen Messtage 07.–13.11. bleiben der heutige Kennzahlbeleg. R200-Datenlücken bleiben unbekannt, CHF und USD getrennt. Klaviyo-Report und Statusangaben werden datiert übernommen, ohne neue Flowabfrage oder Sendung. Der einzige bestehende Klaviyo-Vorschlag bleibt der neutrale Welcome-Betreff; keine neue Aktivierung oder Rabattmassnahme. Der Kauf-Watch bleibt beendet.

## Eine konkrete Verkaufsaktion zur Freigabe

Die frisch gelesene CJ-Quelle unterscheidet die Ausstattung von A–G, enthält aber zusätzlich eine allgemeine, keiner Ausführung zugeordnete Packliste. Die öffentliche Beschreibung wiederholt diese pauschale Zubehörliste an zwei Stellen. Daraus lässt sich der tatsächliche Zubehörumfang von A nicht sicher ableiten.

Vorbereitet ist genau dieser enge Produkttext-Diff für Produkt15521256604033:

1. Den Satz «Der volle Lieferumfang umfasst ein Nachtlicht, sechs Farbscheiben, ein wiederaufladbares Bluetooth-Drehteil und eine Galaxie-Scheibe …» ersetzen durch: **«Die Ausstattung hängt von der gewählten Ausführung ab. Die Angaben zu den anderen Modellen gelten nicht automatisch für das Grundmodell.»**
2. Die allgemeine Lieferumfangsliste ersetzen durch: **«Wähle die gewünschte Ausführung oben aus. Ausstattung und Zubehör unterscheiden sich je Modell; beachte die Angaben unter ‹Die Ausführungen›.»**

Vorher-/Nachher-Hashes, zwei exakte Ersetzungen und ein reversibler Diff liegen vor. Der restliche Beschreibungstext bleibt bytegleich; das ist keine neue Bestätigung aller übrigen Produktangaben. Keine Preis-, Varianten-, Material-, Mass-, Versand-, Bestands-, Tag- oder Kanaländerung. Umsetzung erst nach Freigabe dieses konkreten Diffs und korrekter frischer Shop-/Feldgegenprobe; aktuell kein Write.

## Produktions- und Content-Fortschritt

Neu sind die technische Audio-Vorprüfung und die sechs nachstehenden Caption-/Titelentwürfe für denselben Master. Keine neue Serie, kein fertiger Film, keine Ausspielungsfreigabe. Die bekannten Film-/Rechte-/Zugangsblocker bleiben erhalten. Die vier bereits genehmigten DNS-Ergänzungen bleiben mangels authentifiziertem Writer offen; die R200-DNS-Gegenprobe wird datiert wiederverwendet, keine neue Genehmigung verlangt.

# LuxeStyle – derselbe 18-Sekunden-Master, Stand 14.11.2026, 08-Uhr-Lauf

**Redaktioneller Entwurf zur Abnahme, kein fertiger Film und keine neue Queue.** Master-ID: `luxe_sternenprojektor_master_20261018`. R200 wird fortgesetzt; die beiden Hooks bleiben Alternativen für denselben Film.

## Frisch geprüfte Produktreferenz

Produkt 15521256604033, A-Variante 68122445283719, SKU CJSN139239101AZ. Die öffentliche Produktquelle meldet CHF 34.90 und `available=true`; CJ bestätigt dieselbe SKU als A-USB. Sieben öffentliche Varianten sind über ihre SKUs mit sieben CJ-Varianten gebunden. Das beweist keine aktuelle Admin-Identität, keinen ACTIVE-Status und keine inventoryPolicy. Öffentlich steht `inventory_management=null`; daraus wird kein vollständiger Admin-Trackingbeleg und keine Bestandszusage abgeleitet.

[Echtes aktuelles Bild der A-Variante](https://cdn.shopify.com/s/files/1/0943/6856/3585/files/752b9e0c-e2c0-40d0-a56a-1ae8aa4c2a15.jpg?v=1788153090), 800×654, SHA-256 `5fa8b110b3115cd0a98324c42a06a8fdd41981e3536010f9d657b93bd1539612`. Die Bildbytes sind identisch zur datierten R194-Referenz. Das Bild ist eine Collage: Nur das links sichtbare weisse Gerät im Bügel mit blauem Leuchtbereich dient als Form-/Farbreferenz. Packung und Motiv-Inset beweisen nicht den Lieferumfang oder das tatsächlich enthaltene Projektionsmotiv der A-Ausführung. Keine kommerziellen Bild-/Filmbearbeitungsrechte daraus abgeleitet.

Nicht leere aktuelle öffentliche Tags wurden mit dem gepinnten `automation/lib/kanal_sperren.mjs` geprüft; keine Treffer. Die zusätzliche Inhabersperre für jedes `rueckhol` wurde separat geprüft, ebenfalls ohne Treffer. Die übrigen Publikationsbedingungen bleiben offen.

## Ein einziges Storyboard

Geplantes Endformat: 1080×1920, 30 fps, 18 Sekunden und 540 Frames. Taupe/cream, kontrolliertes weiches Licht, konstante Farbkorrektur und klare Produktkonturen. Die erforderlichen echten Takes liegen noch nicht qualifiziert vor. Die alte 960×540-/25-fps-Quelle wird weder als native 1080p-/30-fps-Aufnahme ausgegeben noch durch eine Foto-Zoom-Serie ersetzt.

| Zeit / Ausgabeframes | Aufnahme und Schnitt | Overlay |
|---|---|---|
| 0–2.4 s / 0–71 | Vollständige, exakt gebundene A-Einheit auf neutralem Nachttisch; ruhiger Einstieg | Hook A: «Licht im Detail.» Oder Hook B, zweizeilig: «Ein Detail für / deinen Nachttisch.» |
| 2.4–6 s / 72–179 | Kleine reale Kamerafahrt entlang der dokumentierten Vorderseite; Bügel und Bedienelemente erkennbar | Kein neuer Featureclaim |
| 6–10.2 s / 180–305 | Saubere Detailaufnahme derselben Einheit und des bereits dokumentierten blauen Leuchtbereichs | «Sternenlicht-Projektor» |
| 10.2–14.4 s / 306–431 | Rückkehr zur ganzen Einheit; gleiches Gerät, gleiche Beleuchtung | LuxeStyle als Marken-Overlay, kein erfundenes Produktlogo |
| 14.4–18 s / 432–539 | Stabiles vollständiges Endbild mit freier Textfläche | «Produkt ansehen» |

Keine erfundene Bedienung, Haubenabnahme, andere Rückseite, unbestätigte Projektion oder Zubehörhandlung. Ein tatsächlicher Bedienungstake darf nur ergänzt werden, wenn die Funktion am exakt gebundenen Gerät belegt und gefilmt ist. Das Storyboard selbst ist kein Handlungs- oder Qualitätsbeleg.

Text zunächst in einer ruhigen Fläche oberhalb beziehungsweise unterhalb des Produkts setzen, nicht über Konturen oder Bedienelemente. Endgültige Schriftgrösse, Kontrast, UI-Überlagerungen und Ausschnitte müssen am fertigen MP4 je Plattform geprüft werden. Noch keine Plattform-Abnahme behauptet.

## Neuer technischer Fortschritt: die vorgesehenen 18 Sekunden Musik

Die kanonische WAV wurde unverändert lokal analysiert; SHA-256 vor/nach ist `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`. PCM, 44.1 kHz, Stereo; ganze Quelle 64.307664 Sekunden. Im vorgesehenen Ausschnitt 0–18 s: −13.27 LUFS integriert, −1.59 dBTP True Peak; Sample-Peak −1.61 dBFS. Ein Analyseziel von −16 LUFS war nur eine Messkonfiguration, keine angewandte Änderung und keine plattformübergreifende Vorgabe.

Bei −50 dBFS und mindestens 50 ms wurde im Ausschnitt keine Stille erkannt. Die letzten 20 ms vor 18 s sind nicht stumm (RMS −15.51 dBFS). Ein harter Endschnitt könnte deshalb ausklingende Noten abschneiden; ein hörbarer Fehler wird aus der Messung nicht behauptet. Vorbereiteter Vorschlag zur späteren Hörabnahme: 0.10 s Einblendung und Ausblendung 17.4–18 s. Noch nicht angewandt. Der fertige Export muss erneut auf tatsächliche Peaks und Hörqualität geprüft werden.

Es wurde kein Audio und kein Video exportiert. Messung und Hash beweisen weder Sprachfreiheit noch Musikrechte, Autorschaft oder kreative Hörabnahme. Nur die vorgeschriebene kanonische Musik bleibt vorgesehen; kein Voiceover und kein Ersatztrack.

## Ausspielung bleibt gesperrt

Shopify ist mit einem anderen Shop verbunden. Für LuxeStyle fehlen damit der frische Admin-Status, das vollständige Tracking-/Policy-Gate und die geforderte Identitätsbestätigung. Ausserdem fehlen ein freigegebener professioneller Master, qualifizierte reale Takes sowie die Rechte-/Hörabnahme. CJ liefert weiterhin nur Video-ID 1602963697889193984, keine aufgelöste Video-URL oder kommerzielle Lizenz.

Der bestehende YouTube-Masterentwurf wurde gezielt gelesen: ID 427288119, UUID `-7647174116509334899`, draft=true, autoPublish=false, madeForKids=false. Die Zielgruppe ist damit bekannt; sie wird nicht erneut als unbekannt bezeichnet. Keine Änderung oder Kopie dieses Posts. IG-/TikTok-Bio-Ziele und ein aktuelles Pinterest-Kontoboard sind vor Ausspielung separat zu verifizieren.

## Sechs kanalbezogene Textentwürfe

Die folgenden Entwürfe sind ausschliesslich redaktionelle Abnahmeunterlagen. Kein importierbares Publisher-Paket, kein Termin, keine neue UUID und keine Freigabe für einen noch fehlenden Film. Alle Links beziehen sich auf dieselbe frisch gelesene A-Variante; keine Preise oder Liefer-/Bestandsversprechen in den Captions. Die Master-ID bleibt über Re-Encoding und spätere Exporte erhalten.

### Instagram

```text
Licht im Detail. Entdecke den Sternenlicht-Projektor von LuxeStyle.

Produktdetails: Link in Bio.

#LuxeStyle #Wohnideen
```

Produkt-UTM: [instagram](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=instagram&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a)

Bio-Ziel vor Freigabe frisch verifizieren; Text ist nur redaktioneller Entwurf. Der UTM-Link gehört ins bestätigte Bio-Ziel, nicht als angeblich klickbarer Caption-Link.

### TikTok

Titel: Ein Detail für deinen Nachttisch

```text
Ein Detail für deinen Nachttisch. Der Sternenlicht-Projektor von LuxeStyle im Detail.

Produktdetails: Link in Bio.

#LuxeStyle #Beleuchtung
```

Produkt-UTM: [tiktok](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=tiktok&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a)

Bio-Ziel vor Freigabe frisch verifizieren. Keine behauptete Caption-Klickbarkeit; keine Bio-Änderung vorgenommen.

### YouTube Shorts

Titel: Sternenlicht-Projektor: Licht im Detail | LuxeStyle

```text
Der Sternenlicht-Projektor von LuxeStyle im Detail.

Produktangaben auf luxestyle.ch: https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=youtube&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a

#Shorts
```

Produkt-UTM: [youtube](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=youtube&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a)

Shorts-Beschreibungslinks nicht als klickbar bewerben. Titel und bestätigte Zielgruppe allein ersetzen keine Film-/Rechtefreigabe.

Bestehender Master-Entwurf UUID-7647174116509334899 frisch mit madeForKids=false gelesen. Keine neue Zielgruppenänderung.

### Facebook

Titel: Licht im Detail

```text
Ein Detail für deinen Nachttisch: Entdecke den Sternenlicht-Projektor von LuxeStyle.

Ausführungen und Produktangaben ansehen: https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=facebook&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a
```

Produkt-UTM: [facebook](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=facebook&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a)

Produktlink ist als direkter Link vorgesehen; keine Liefer-/Bestands-/Funktionsversprechen.

### Threads

```text
Ein Detail für deinen Nachttisch. Der Sternenlicht-Projektor von LuxeStyle im Detail.

Produktangaben und Ausführungen: https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=threads&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a
```

Produkt-UTM: [threads](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=threads&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a)

Direkter Produktlink, kein Review-/Material-/Wirkungsclaim.

### Pinterest

Titel: Sternenlicht-Projektor für deinen Nachttisch | LuxeStyle

```text
Licht im Detail: Entdecke den Sternenlicht-Projektor und die angebotenen Ausführungen bei LuxeStyle. Produktangaben findest du auf der Produktseite.
```

Produkt-UTM: [pinterest](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=pinterest&utm_medium=organic_social&utm_campaign=luxe_sternenprojektor_master_20261018&utm_content=master18s_hook_a)

UTM-Produktlink erst nach aktueller Board-/Rechte-/Produktfreigabe als Pin-Ziel verwenden.

Historisch bestätigtes Board1111333714239531706; heutige vorhandene Queue verwendet u.a.1111333714239114020. Kein aktueller Kontoboard-Read verfügbar, daher kein Board für diesen Entwurf eingesetzt.
