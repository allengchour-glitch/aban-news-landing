# R259 – Projektor, Social-Status und Klärungsblocker

Belegstand 2026-11-16T14:32:04.536Z (Planner-Rücklese, 16.11.2026, 15:32 Europe/Zurich). Vierzehn erfolgreiche eigene Hold-Schreibereignisse sind belegt. Der aktuelle Stand ist davon abgewichen: sechs Posts mit sieben Providerplatzierungen bleiben Draft und Auto-Publish aus; acht Posts mit neun Platzierungen wurden wieder aktiviert. Die aktuelle Planner-Rücklese umfasst 57 UUIDs, 71 Providerzustände (70 PENDING, 1 PUBLISHED), 17 Drafts und 40 aktive Posts.

## Primärer Blocker: widersprüchliche Tonanweisung

Die acht Reaktivierungen sind den erfolgreichen PUTs des bestehenden zeitgesteuerten Metricool-Freigabelaufs 43881112008 zugeordnet. Der Lauf war am 16.11. 13:59:19–14:00:30 UTC erfolgreich; die geprüften Logzeilen zeigen die acht betroffenen Planner-IDs als FREI und HTTP 200, passend zur UUID-Zuordnung. Damit ist die technische Ursache der acht Reaktivierungen belegt. Eine menschliche Auslösung oder Absicht ist nicht belegt.

Der aktuelle Automationstask verlangt Pflichtmusik. Eine im Repository als Besitzeranweisung vom 16.11. bezeichnete Notiz verlangt für Sternenlicht, Hacker, Box und Welle Ton aus. Diese Anweisung bleibt widersprüchlich; eine Klärung ist angefragt und ausstehend. Deshalb sind weitere Freigaben oder gegensätzliche Schreibversuche pausiert. Die sechs verbliebenen Holds bleiben im aktuellen Snapshot bestätigt. Der frühere Zwischenstand mit acht Holds/neun Platzierungen ist nur historische Evidenz und kein aktueller Endstand. Neun weitere UUIDs sind neu gegenüber dem ursprünglichen 48-UUID-Snapshot und stehen aktuell als Draft; Quelle/Urheber ist UNKNOWN. Von den ursprünglichen 48 UUIDs sind alle 48 vorhanden; 34 UUIDs ausserhalb der 14 eigenen Änderungen sind exakt unverändert.

## Aktuelle Planungsabdeckung

Cutoff 2026-11-16T15:32:04.536000+01:00 Europe/Zurich; rollierendes Fenster endet 2026-11-23T15:32:04.536000+01:00. Die rohe aktuelle Rücklese enthält 44 Pending-Platzierungen im rollierenden Siebentagesfenster und 4 weitere am 23.11., insgesamt 48 im Kalender 16.–23.11. Zieht man die neun technisch fehlgeschlagenen Providerplatzierungen der acht reaktivierten Musikproblem-Posts ab, bleiben 35 rollierende und 39 Kalender-Platzierungen. Das sind Providerplatzierungen, nicht eindeutige Posts.

| Kanal | Roh rollierend | Abzgl. 8 fehlgeschlagene Posts | Später am 23.11. | Roh Kalender | Abzgl. fehlgeschlagene |
|---|---:|---:|---:|---:|---:|
| Facebook | 9 | 7 | 1 | 10 | 8 |
| Instagram | 9 | 7 | 1 | 10 | 8 |
| Pinterest | 7 | 7 | 1 | 8 | 8 |
| Threads | 7 | 7 | 0 | 7 | 7 |
| Tiktok | 9 | 7 | 1 | 10 | 8 |
| Youtube | 3 | 0 | 0 | 3 | 0 |

Im begrenzten aktuellen Snapshot gibt es keine exakten Doppelungen aus gleichem Kanal, Caption und geordneter Medien-URL. Das beweist keine vollständige Film-/Publikationshistorie; diese bleibt unbekannt. Das bereits veröffentlichte Threads-Placement stammt aus einem bestehenden Ablauf, nicht aus einer Veröffentlichung dieses Laufs. Rohe YouTube-Tageslücken: 16., 18. und 21.–23.11. Nach Ausschluss der drei aktiven YouTube-Einträge mit bekanntem Tonproblem ist an keinem Datum 16.–23.11. ein geeigneter aktiver YouTube-Termin belegt.

## Medien, Master und Caption-Entwürfe

Zehn bestehende Medien wurden bei den Post-Updates serverseitig kopiert; alle zehn SHA-256-Gegenproben bestätigen Bytegleichheit. Darunter sind vier Projektor-Dateien. Keine lokalen Uploads oder neuen Posts. Der zusätzliche YouTube-Clip ist vollständig stumm (616,448 decodierte AAC-Samples, alle null). Die korrigierte Bildnotiz nennt einen sichtbaren leuchtenden lampenartigen Würfel bei 0,2 s; der belegte Hold-Grund ist die Tonspur ohne Pflichtmusik, Rechte bleiben unbekannt. Die neue Projektordatei ist mit rund −91 dB praktisch stumm und kein fertiger Master.

Sechs kanalbezogene Captions mit eindeutigen UTM-Source- und Content-Werten sind DRAFT_ONLY und unveröffentlicht. Instagram und TikTok verweisen auf Bio-Links, deren Ziel nicht frisch geprüft wurde. Shorts-Caption-URLs werden nicht als klickbar behandelt.

Der geplante Master bleibt 18 Sekunden, 1080 × 1920, 30 fps / 540 Frames. Aktuelle Shopify-Auswahl A ist [Sternenlicht-Projektor](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719), Variante 68122445283719 / SKU CJSN139239101AZ. Physische Probe, A-spezifischer Lieferumfang, Motivbindung, Film-/Grafik-/Musikrechte, SoundFont-/Build-Provenienz, neue Aufnahme und kreative Abnahme bleiben offen. Kein Master-MP4 wurde gerendert.

## Bedingter Google-Kategorieentwurf und Datenlimits

Ein Entwurf für Work Lights / Kategorie 5592 ist ungeschrieben; nur das einzelne Shopify-Google-Metafeld war Gegenstand der Prüfung. Das aktuelle Merchant-Angebot wurde nicht erneut geprüft. Keine Freigabe oder Fehlerauflösung behauptet.

Metricool-/Klaviyo-Daten wurden aus R253 (9.–15.11.) wiederverwendet. Keine neuen Tagesreports, GSC-, Verkaufs- oder Bestellreports. Eine leere Klaviyoantwort bedeutet UNKNOWN, nicht null Umsatz oder Bestellungen. Die R258-Produktarbeitsliste mit 44 Zeilen blieb unverändert; nicht erfasste Produkt- oder Plannerhistorie bleibt UNKNOWN.

[Belege](PROJEKTOR-SOCIAL-BELEGE-20261116-R259.json) · [Mastergates](PROJEKTOR-A-PRODUKTIONSGATES-20261116-R259.md) · [Caption-Entwürfe](PROJEKTOR-KANALCAPTIONS-20261116-R259.json) · [Taxonomieentwurf](LED-WORKLIGHT-GOOGLE-KATEGORIE-ENTWURF-20261116-R259.md).
