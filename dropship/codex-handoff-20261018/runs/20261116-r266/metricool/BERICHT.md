# R266 – Metricool-Abendkontrolle, 16.11.2026

Ausschliesslich lesend, Datenstand der acht Tagesabfragen um **19:09 Uhr Europe/Zurich**. Zuerst R264/Core5 aus der frischen R265-Arbeitskopie sowie R253/R259 im Tagesprotokoll gelesen. R265-Dokumentation und laufende R266-Designarbeit nicht verändert. Marke **6227837**, Europe/Zurich und alle sechs erwarteten Kanalidentitäten frisch passend.

**57 Objekte / 57 UUIDs / 71 Kanalzustände** im vollständigen Tageskontext 16.–23.11.: **5 PUBLISHED, 1 PUBLISHING, 65 PENDING**. Zwei vorhandene Posts bleiben DRAFT/global AP=false. Keine eigenen Social-Schreibaufrufe, Neuanlagen, Löschungen oder Veröffentlichungen.

## Was sich seit R259 geändert hat

Alle 57 UUIDs sind erhalten, keine neue/fehlende UUID. 19 Objekte unterscheiden sich in geprüften Feldern: **15 frühere Drafts wurden zu draft=false / autoPublish=true reaktiviert**, jeweils neue numerische ID bei unveränderter UUID; vier weitere Objekte haben neue Providerzustände. Die 15 Reaktivierungen umfassen die sechs in R259 noch gehaltenen Posts und die neun damals neu hinzugekommenen Drafts. Der aktuelle Auslöser und menschliche Freigabewille dieser späteren Änderungen wurden hier nicht untersucht und bleiben unbekannt.

Medien-URLs, Inhalte und Termine sind gegenüber dem vollständigen R259-Snapshot in den geprüften Feldern unverändert. Kein aktueller Mediendownload: identische URL ist kein neuer MP4-Byte-/Qualitätsnachweis. Alte IDs und frühere Zustände bleiben im Vergleich erhalten.

## Planung und konkrete Lücken

Rollierend **16.11.19:08:59–23.11.19:08:59**: **48 Objekte / 59 aktive PENDING-Kanalplatzierungen**. Mit vollständigem 23.11. bis 24.11.00:00: **50 Objekte / 62 aktive PENDING-Platzierungen**. Aktiv verlangt DRAFT=false, global AP=true und keinen gelieferten kanalbezogenen AP=false-Wert. Dies ist technische Planung, keine Freigabe.

Vom 17. bis 23.11. liefern alle sechs Kanäle mindestens einen technisch aktiven Termin täglich. Heute nach dem Stichtakt ist noch Pinterest um 20:00 aktiv; Facebook/Instagram/Threads/TikTok haben bereits heutige Auslieferungszustände. Kein tägliches Mindestvolumen erzwingen.

**Qualität separat:** Alle 14 früheren Qualitäts-Hold-UUIDs tragen exakt dieselben Medien-URLs wie im R259-Holdbeleg. Ihre historischen Stumm-/Musik-/Produkt-/Rechteblocker sind durch PENDING nicht erledigt. Nach Herausnahme dieser bekannten QC-Fälle bleiben **45 rollierende / 48 kalenderbezogene** aktive Platzierungen. Dabei hat **YouTube am 17.–20.11. keinen Termin ohne diesen bekannten QC-Blocker**. Für YouTube am 21.–23.11. existieren technische Termine; deren aktuelle Film-/Rechteabnahme ist hier ebenfalls nicht belegt.

| Datum Zürich | FB | IG | Pinterest | Threads | TikTok | YouTube |
|---|---:|---:|---:|---:|---:|---:|
| 2026-11-16 | 0 | 0 | 1 | 0 | 0 | 0 |
| 2026-11-17 | 1 | 1 | 1 | 1 | 1 | 0 |
| 2026-11-18 | 1 | 1 | 1 | 1 | 1 | 0 |
| 2026-11-19 | 1 | 1 | 1 | 1 | 1 | 0 |
| 2026-11-20 | 1 | 1 | 1 | 1 | 1 | 0 |
| 2026-11-21 | 2 | 2 | 1 | 1 | 2 | 1 |
| 2026-11-22 | 2 | 2 | 1 | 1 | 2 | 1 |
| 2026-11-23 | 2 | 2 | 1 | 1 | 2 | 1 |

Tabelle: aktive zukünftige PENDING-Platzierungen nach Herausnahme der 14 historisch qualitätsblockierten UUIDs; 16.11. nur Resttag. Keine Zusicherung kreativer/rechtlicher Freigabe für die übrigen Termine. Frühere R259-Zähler mit anderem rollierendem Stichtakt nicht direkt als Zu-/Abnahme vergleichen.

## Heute fällig / Auslieferung

- **Instagram 430111185**, UUID `4156060813550767248`, 19:00: **PUBLISHING**, keine Plattform-ID oder Publikations-URL geliefert. Abschluss unbekannt; kein Retry/Ersatzpost.
- **Facebook 430111296**, UUID `6680239273933357186`, 19:00: **PUBLISHED**, Plattform-ID `1130119220008240`, https://facebook.com/reel/1130119220008240 . Historische Qualitäts-/Tonfrage bleibt trotz tatsächlicher Auslieferung offen.
- Weitere ausdrücklich gelieferte PUBLISHED-Zustände: Threads 11:00, Facebook und Instagram 16:00, TikTok 18:00. Plattform-IDs/URLs stehen im bereinigten Beleg. Das sind bestehende fremde Planungsabläufe, keine eigenen Veröffentlichungen.
- Zwei ältere DRAFTs bleiben gehalten: **428827820** (IG 14:00; UUID `2242731246724795766`) und **429731963** (TikTok/YouTube 18:30; UUID `-1463494076488727798`). PENDING eines Drafts ist kein aktiver Termin und kein Auslieferungsfehlerbeweis.
- Kein expliziter nativer ERROR-/FAILED-Status oder Fehlerdetail in diesem aktuellen Snapshot geliefert. Das ist kein Beleg für Fehlerfreiheit oder reparierte historische Medienprobleme.

## Doppelposts, Ton und Publikationsgrenzen

Keine exakte UUID-, kanalgleiche Medien-URL-, querybereinigte Medien-URL-, normalisierte Caption- oder Slot-Doppelung in den 57 gelieferten Objekten und separat im Zukunftsfenster gefunden. Gleiche Inhalte über andere URLs/Exporte oder frühere Publikationen bleiben ohne aktuelle Filmhash-/Masterhistorie unbekannt.

Keine TikTok-Plattformmusikfelder geliefert; das beweist weder vorhandene Pflichtmusik noch Tonfreiheit im Film. **R259-Tonkonflikt bleibt offen:** verbindliche Pflichtmusik gegenüber Repo-Notiz «Ton aus». Die stummen Repo-Clips werden nicht als neue Chatfreigabe interpretiert. Master-/Kanal-Ledger nicht neu geprüft oder initialisiert; fehlender Nachweis ist unbekannt, keine leere Vergangenheit. Ohne fertigen, abgenommenen Master, Rechte-/Tonklärung und Ledger-/Kanalprüfung kein neuer Autopush.

YouTube `madeForKids=false` ist bei allen zurückgegebenen YouTube-Daten erhalten; keine erneute Zielgruppenfrage. Pinterest-Planner-Boardfelder ersetzen keine Kontoboard-Prüfung. Bioziele wurden nicht neu geprüft.

**Aktivität:** 1 Markenread, 8 kleine native Tagesplanungsreads, 0 Kennzahl-/Klaviyo-/Orderreads, 0 Kontowrites, 0 Mediendownloads/Uploads/Render/Workflowstarts. Tagesdaten aus R253 nicht erneut erhoben. Keine Bearbeitung anderer Marken.

Nächster konkreter Schritt: den bestehenden Instagram-Post bei einem späteren vorgesehenen Statusread gezielt anhand unveränderter UUID nachlesen; zuerst denselben professionellen Master und den offenen Ton-/Freigabekonflikt lösen. Keine Ersatzposts oder pauschale Aktivierungen.

Beleg: [PLANUNG-AUSWERTUNG.json](PLANUNG-AUSWERTUNG.json), [IDENTITAET.json](IDENTITAET.json). Private Rohantworten bleiben ausschliesslich im lokalen Unterordner private und sind nicht zum Upload vorgesehen.

Unabhängige Offline-Gegenprobe bestätigt UUIDs/Änderungen/Flags/59–62-Platzierungen und den begrenzten historischen QC-Ausschluss45–48. [INDEPENDENT-REVIEW.json](INDEPENDENT-REVIEW.json).
