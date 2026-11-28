# LuxeStyle · Abendabgleich 27./28.11.2026

Gemessen ab 28.11.2026, 00:09 Uhr, Europe/Zurich. Seit dem Abendbriefing auf dem übergebenen Branch weitergearbeitet. [Übergabe](https://github.com/allengchour-glitch/aban-news-landing/blob/claude/luxestyle-status-tztnn1/docs/UEBERGABE-CODEX-2711.md)

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
| --- | --- | --- |
| Identität | Shopify und Metricool im verbundenen Konto gelesen. | Shopify 94368563585, luxestyle.ch, CHF. Metricool 6227837, Europe/Zurich. Instagram, Threads und TikTok luxestyle.ch, Facebook 1049840534888592, Pinterest luxestyleCH, YouTube UCSfCEYjAsdOyYxyfTClXRZA. |
| Social | Planer 27.11.–05.12. auf Status, Terminüberschneidungen und Wiederholungen der Medien-URLs und Texte geprüft. | 14 Publikationen vom 27.11. bestätigt. 11 künftige Bildobjekte mit 13 Kanalterminen. Terminüberschneidung auf Threads und ein Instagram-Fehler gemeldet. Kein neuer Termin oder Upload durch Codex. |
| Cascade | Aktive Variante und Produktfoto abgeglichen, Vorschau vermessen und Aufnahme und Bildfolge für denselben Master präzisiert. | CHF 26.90. Shopify meldet Kaufbarkeit für die Variante. 2,125 Sekunden KI-Vorschau als Lichtreferenz. Vor Filmerstellung fehlen produktgetreue Takes und dokumentierte Nutzungsrechte. |
| Google-Schaufenster | Bestehende Auswahlregeln und zwei dokumentierte Nachfrage-Produkte in Shopify stichprobenartig abgeglichen. | Bei beiden gilt ein Shopping-Ads-Ausschluss. Entwurf zur Vorrangregel unter bestehenden Sperren. |
| Klaviyo und DNS | Placed-Order-Metrik gesucht und vier ursprünglich genehmigte DNS-Einträge öffentlich abgefragt. | Vier von vier DNS-Sollwerten bestätigt. Laut Übergabe ist die Sendedomain aktiv. Klaviyo-Connector verlangt Neuanmeldung. Flow-Status und Umsatz im aktuellen Konto unbekannt. |
| Nachfrage-Pilot | 18 markierte Produkte mit Shopify, dem aktuellen Manifest und dem archivierten Plan abgeglichen. | 11 ausserhalb des Kanals, davon 7 mit Anzeigen-Ausschluss. Drei Standardprodukte mit 53 Varianten zur Freigabe vorbereitet. |
| Pilot-Budget | Letzten Workflow-Stand, aktuelle Aufnahmegrenzen und die gemeinsame Google-Sperrliste geprüft. | 11 lokale Kontrollfälle bestanden. Frischer Gesamtstand für Aufnahme weiterhin offen. |

## Metricool

| Datum | Bestehende Termine · Europe/Zurich | Lücken |
| --- | --- | --- |
| 28.11. | Threads 11:00 (zwei verschiedene Beiträge), Instagram und Facebook 17:00, TikTok 18:00, Pinterest 19:10 und 20:00. | YouTube |
| 29.11. | Instagram und Facebook 17:00, TikTok 18:00, Pinterest 19:10. | Threads, YouTube |
| 30.11. | Pinterest 19:10 und 20:00. | Instagram, Facebook, TikTok, Threads, YouTube |
| 01.–05.12. | Im abgefragten Kalender keine Termine. | Alle sechs Kanäle |

Die 11 künftigen Objekte sind Bildbeiträge mit `draft=false`, `autoPublish=true`. Bei Instagram ist Auto-Publish auch kanalbezogen aktiv. In den neun Tagen gab es pro Kanal keine identischen Medien-URLs nach Entfernen der Queryparameter und keine identischen nicht leeren Beitragstexte. Das Prüfintervall deckt die Planung bis einschliesslich 05.12. ab.

- **Threads, 28.11., 11:00:** `439081423`, UUID `4369801234232984645`, und `442296598`, UUID `-7257587017558111869`. Zwei verschiedene Beiträge im selben Zeitslot. Vor einer Änderung durch den zuständigen Planer die Aktivität beider UUIDs erneut prüfen.
- **Instagram, 27.11., 10:39:** `444123282`, UUID `2617033623294002916`, `ERROR` beim Abruf des Shopify-CDN-Bildes. Erst bei bestätigtem Medienabruf und neuer Prüfung der bestehenden UUID wieder für einen späteren Termin berücksichtigen.
- **27.11. als `PUBLISHED` bestätigt:** Instagram 5, Facebook 3, TikTok 2, Pinterest 3, Threads 1. Beispiele um 17:00, 18:00 und 20:00. [Instagram](https://www.instagram.com/p/DgQEsKDCokn/) · [TikTok](https://www.tiktok.com/@luxestyle.ch/video/7712900274079239457) · [Pinterest](https://www.pinterest.es/pin/1111333645586765888)

### Kennzahlen 21.–27.11.

Teilsummen der gelieferten Tageswerte, mit Anzahl belegter Tage. Alle übrigen Tage sind unbekannt. Die Definitionen unterscheiden sich je Kanal. Die Kennzahlen erlauben keine Verkaufszuordnung.

| Kanal | Reichweite oder Aufrufe | Interaktionen |
| --- | --- | --- |
| Instagram | 1’399 Aufrufe (6/7, IGEV05) | 5 Feed- und Reel-Interaktionen (4/7, IGEV38) |
| Facebook | 838 Medienaufrufe (6/7, FBEV49) | 0 am 27.11. (1/7, FBEV34) |
| TikTok | 3’770 Videoaufrufe (6/7, TKEV02) | 10 Video-Interaktionen (6/7, TKEV06) |
| Threads | 8 Beitragsaufrufe (3/7, THEV06) | 0 am 27.11. (1/7, THEV05) |
| Pinterest | 468 Impressionen (4/7, PIEV01) | 8 Interaktionen (4/7, PIEV04) |
| YouTube | 408 Videoaufrufe (4/7, YTEV02) | 3 Likes, 0 Kommentare, 3 Shares (je 5/7, YTEV14/16/18) |

YouTube meldete 0 gewonnene und 0 verlorene Abos am 21.–24.11. (YTEV05/06), die anderen drei Tage bleiben unbekannt. Wiedergabedauer ist in dieser Abfrage nicht belegt. Bei TikTok ist der grösste gelieferte Tageswert 1’208 Aufrufe am 23.11. Für Cascade wird im ersten Einzelbeitrag besonders der Verbleib nach dem Einstieg geprüft, sobald nach Veröffentlichung Daten vorliegen. Pinterest lieferte Werte nur bis 24.11.

## Cascade · Produktionsentwurf für 18 Sekunden

Modell 1, goldfarben, Shopify-Produkt 15431606829441, Variante 67870931517831, SKU CJLX293479401AZ. CHF 26.90. ACTIVE, `availableForSale=true`, Tracking aus, `CONTINUE`, Onlineshop-URL in Shopify aktiv. 16 Tags, kein Treffer nach aktuellem Kanalwächter inklusive `rueckhol`. Der unabhängige öffentliche Abruf war technisch nicht verifizierbar. [Produkt](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831) · [Exaktes Variantenbild, 750 × 750](https://cdn.shopify.com/s/files/1/0943/6856/3585/files/ec5377d7-40ed-42d4-8e8b-07c4873e3d91.jpg?v=1790745331) · [Kanalwächter](https://github.com/allengchour-glitch/aban-news-landing/blob/main/automation/lib/kanal_sperren.mjs)

Die bestätigte dunkle Stoff- und Lichtstimmung aus der 2,125-Sekunden-Vorschau auf reale Aufnahmen übertragen. Bei Bildprüfung nach 0,70 Sekunden weichen die Verbindungsstücke und die Konturen der KI-Tropfen vom Originalfoto ab. Für den Dreh orientiert sich die Form am Originalfoto. Beide Creolen zentral etwa x338–775, y630–1225 auf 1080 × 1920 platzieren. Weiches Licht seitlich durch Diffusion bewegen, Kamera ruhig, dunkler Stoff vor warmem Taupe. Kein Kopf, Papierhalter oder Voiceover.

| Schnitt | Bild und Text |
| --- | --- |
| 0–2 s | Hook A, beide Creolen mit warmem Lichtsaum · «Ein Akzent in Goldfarbe». Hook B, seitliche Makroaufnahme der Verbindung · «Cascade, ganz nah». Je Export nur ein Einstieg. |
| 2–6 s | Weiches Streiflicht über das ruhende Paar führen. Beide Tropfen bleiben vollständig im Bild. |
| 6–10 s | Makro über den seitlichen Verschluss, die Kugel und die tatsächlich sichtbare Verbindung zum Tropfen. |
| 10–15 s | Ruhige seitliche Fahrt auf das gesamte Paar. Einblendung «Creolen Cascade · Modell 1» oberhalb des Motivs. |
| 15–18 s | Paar im Querlicht halten. CTA «Cascade entdecken» unterhalb des Motivs. |

Ziel 1080 × 1920, 30 fps, 540 Bilder, H.264-MP4. Die vorliegende Vorschau bleibt internes Anschauungsmaterial. Drei reale Takes mit Originalpaar und Nutzungsbeleg fehlen. Die vorhandene Pflichtmusik-Datei wurde auf Dateiebene geprüft. Die SoundFont-Herkunft bleibt offen. Für die weitere Planung gilt die dokumentierte Freigabe stummer Planer-Videos. [Produktionsreferenz](https://github.com/allengchour-glitch/aban-news-landing/blob/codex/luxestyle-claude-handoff-20261018/dropship/codex-handoff-20261018/R319-EDLER-SCHMUCKMASTER-20261122.md) · [Arbeitsregeln](https://github.com/allengchour-glitch/aban-news-landing/blob/claude/luxestyle-status-tztnn1/AGENTS.md)

| Kanal | Entwurf | Platzierung |
| --- | --- | --- |
| Instagram Reels | Ein warmer Lichtreflex folgt der Tropfenform. Entdecke die goldfarbenen Creolen «Cascade» über den Link in Bio. | Bio-Ziel vor Einsatz bestätigen · [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=instagram&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=instagram_cascade_modell1) |
| TikTok | Von der Kugel bis zum Tropfen. «Cascade» im Detail. Link in Bio. | Bio-Ziel vor Einsatz bestätigen · [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=tiktok&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=tiktok_cascade_modell1) |
| YouTube Shorts | Titel: «Cascade» – goldfarbene Creolen im Detail. Beschreibung: Ein Blick auf das Paar, den Verschluss und die Tropfenform. | Produktlink im Kanalprofil. Zielgruppe allgemeines Schmuckpublikum (madeForKids=false als Entwurf) · [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=youtube&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=youtube_cascade_modell1) |
| Facebook | So sehen die goldfarbenen Creolen «Cascade» aus der Nähe aus. Entdecke Modell 1 im Shop. | Produktlink im Beitrag · [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=facebook&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=facebook_cascade_modell1) |
| Threads | Was fällt dir zuerst auf: die Kugel oder der Tropfen? Hier sind die goldfarbenen «Cascade»-Creolen im Detail. | Produktlink im Beitrag · [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=threads&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=threads_cascade_modell1) |
| Pinterest | Titel: Goldfarbene Creolen «Cascade» mit Tropfen. Beschreibung: Das Paar auf dunklem Stoff, mit Nahaufnahmen von Verschluss, Kugel und Tropfen. | Produktlink als Pin-Ziel. Passendes Konto-Board vor Einsatz bestätigen · [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=pinterest&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=pinterest_cascade_modell1) |

Der Planer zeigt Boards aus bestehenden Pinterest-Beiträgen. Für Cascade ist kein passendes Konto-Board bestätigt. Für Instagram und TikTok muss das Bio-Ziel beim jeweiligen Profil vor Veröffentlichung aufgelöst werden.

## Eine Verkaufsaktion zur Freigabe

**Google-Schaufenster – Nachfrage als zusätzliches Signal für Stufe 0.** Die im Journal genannten 11 Fälle gegen den aktuellen Manifeststand und ihre Variantenzahl abgleichen. Nur grundsätzlich zulässige Varianten einbeziehen. Bestehende Shopping-Ads-Ausschlüsse, Bildsperren und das Limit von 78’000 Varianten beim Vergleich erhalten. Der Dry-Run soll exakt zeigen, welche Produkte hinzukämen und welche im Budget Platz machen müssten. Rangänderungen allein veröffentlichen keine Produkte, der geplante Workflow wählt ab.

Zwei Gegenproben bestätigen den Bedarf für diese Prüfung: Die Adventskalender-Geschenkbox hat zwei Varianten und einen ausdrücklichen `Shopping_ads`-Ausschluss. Die Wasserwellen-Projektionsleuchte hat 18 Varianten, denselben Ausschluss und `google-bild-abgelehnt`. Für beide bleibt der Google-Kanal in der Stichprobe aus. [Nachfragebericht](https://github.com/allengchour-glitch/aban-news-landing/blob/claude/luxestyle-status-tztnn1/dropship/NACHFRAGE-LIEBLING.md) · [Auswahlregeln](https://github.com/allengchour-glitch/aban-news-landing/blob/main/automation/lib/gmc_schaufenster.mjs#L127) · [Adventskalender](https://luxestyle.ch/products/adventskalender-geschenkbox-603200) · [Projektionsleuchte](https://luxestyle.ch/products/led-wasserwellen-projektionsleuchte-677504)

Die vier DNS-Sollwerte (`send`, `mtd1._domainkey`, `mtd2._domainkey`, `TXT @`) waren im öffentlichen DNS vorhanden. Die laufenden Abbruch-, Welcome/Capture- und Post-Purchase-Flows lassen sich beim Codex-Klaviyo-Zugang wegen `UNAUTHORIZED` nicht aktuell lesen. [Klaviyo-Domain in der Übergabe](https://github.com/allengchour-glitch/aban-news-landing/blob/claude/luxestyle-status-tztnn1/docs/UEBERGABE-CODEX-2711.md#6-stand-heute-2711--was-erledigt-ist)

## Nachfrage-Pilot für Google · Abgleich 28.11.2026

Um 00:15 Uhr Europe/Zurich wurden die 18 markierten Handles aus dem Nachfragebericht in drei kleinen Shopify-Admin-Abfragen gelesen. Alle 18 sind `ACTIVE` mit aktuellem `nachfrage-liebling`-Tag. Sieben sind bereits im Shopify-Google-Kanal veröffentlicht. Die übrigen elf haben im aktuellen Manifest zuletzt den Eintrag `ab-versucht`. Hier bedeutet «im Google-Kanal» der Status der Shopify-Publikation `302872297857`. Der Anzeigen- oder Free-Listings-Status in Merchant Center folgt daraus nicht. [Nachfragebericht](https://github.com/allengchour-glitch/aban-news-landing/blob/claude/luxestyle-status-tztnn1/dropship/NACHFRAGE-LIEBLING.md) (Manifeststand `6b7cd63fc4a6`) · [Aktuelles Manifest auf main](https://github.com/allengchour-glitch/aban-news-landing/blob/main/dropship/gmc_schaufenster_manifest.jsonl)

| Produkt ausserhalb des Google-Kanals | Shopify-ID | Varianten | Prüfergebnis |
| --- | --- | ---: | --- |
| [LED Wasserwellen Projektionsleuchte](https://luxestyle.ch/products/led-wasserwellen-projektionsleuchte-677504) | `15450836566401` | 18 | google-bild-abgelehnt und `Shopping_ads` |
| [Kurze Kapuzenjacke mit Fellkragen](https://luxestyle.ch/products/kurze-kapuzenjacke-mit-fellkragen-626300) | `16652034769287` | 12 | Pilotkandidat |
| [Polygel-Set mit 3 Farben und Dual Tips](https://luxestyle.ch/products/polygel-set-mit-3-farben-und-dual-tips-5bb219) | `15495230423425` | 1 | `Shopping_ads` |
| [T-Shirt bedrucken & selbst gestalten · dein Foto oder Motiv](https://luxestyle.ch/products/shirt-zum-selbstgestalten) | `15427283157377` | 15 | POD separat prüfen |
| [Adventskalender Geschenkbox](https://luxestyle.ch/products/adventskalender-geschenkbox-603200) | `16603866694023` | 2 | `Shopping_ads` |
| [PolyGel Nagelverlängerungs-Kit](https://luxestyle.ch/products/polygel-nagelverlangerungs-kit-caefd5) | `15495081722241` | 6 | `Shopping_ads` |
| [Bondi Blue Katzenpullover für Katzen](https://luxestyle.ch/products/bondi-blue-petpullover-fur-katzen-760576) | `16652425560455` | 10 | `Shopping_ads` |
| [Scheinwerfer-Vernebler-Becher](https://luxestyle.ch/products/scheinwerfer-vernebler-becher-a1978c) | `15496509522305` | 1 | `Shopping_ads` |
| [Leinenhemd Langarm – Lässig & Bequem](https://luxestyle.ch/products/leinenhemd-langarm-lassig-bequem-621700) | `15448715723137` | 30 | Pilotkandidat |
| [Dreifach LED-Makeup-Spiegel mit USB-Ladefunktion](https://luxestyle.ch/products/dreifach-led-makeup-spiegel-mit-usb-ladefunkti-605600) | `15500457247105` | 11 | Pilotkandidat |
| [Y2K Harajuku Hoodie mit Nieten](https://luxestyle.ch/products/y2k-harajuku-hoodie-mit-nieten-629700) | `15449150292353` | 3 | `Shopping_ads` |

**Vorschlag zur Freigabe:** Nur Kapuzenjacke, Leinenhemd und LED-Makeup-Spiegel in den begrenzten Stufe-0-Pilot aufnehmen (53 Varianten). Der Probeplan führt das personalisierbare T-Shirt separat (15 Varianten). Die sieben Produkte mit `Shopping_ads`-Ausschluss (41 Varianten) bleiben ausserhalb des Pilots. Direkte Freischaltung hängt zusätzlich vom aktuellen Gesamtplan ab.

**Gegenprobe am gespeicherten Plan.** Das geprüfte Actions-Artefakt vom 27.11., 15:16 Uhr Schweiz, führt das Polygel-Set mit 3 Farben trotz `Shopping_ads`-Ausschluss bereits als Stufe 0 in `aufnehmen`. Der aktive Code prüft `bewaehrt()` vor dem Ausschlussfeld. Für den Pilot deshalb den Ausschluss vor der neuen Nachfrage-Regel prüfen und eine feste Liste der drei freigegebenen Handles verwenden. Die bestehende Ausnahme bleibt ausserhalb des Pilotumfangs. [Actions-Lauf und Planartefakt](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/46014333824) · [Reihenfolge der Stufen](https://github.com/allengchour-glitch/aban-news-landing/blob/main/automation/lib/gmc_schaufenster.mjs#L127)

Der letzte belegte Vollplan lag bei 77’995 von 78’000 Varianten einschliesslich seiner Aufnahmen. Keines der drei Pilotprodukte stand darin auf der Aufnahmeliste. Unter genau diesem Planstand wären mindestens 48 anderweitig eingeplante Varianten zu ersetzen. Der tatsächliche Lauf hat nur abgewählt und zuletzt 76’949 Varianten auf Google gemessen. Die heutige Kapazität und die konkret zu ersetzenden Produkte bleiben bis zum frischen Vollplan offen. Dieser Abgleich umfasst Shopify-Feedfelder und den gespeicherten Plan. Es gab keine Shop- oder Feed-Änderung.

## Budgetprüfung des Google-Pilots · 28.11.2026

Um 00:39 Uhr Europe/Zurich den letzten Lauf auf `main` nachgelesen. Der jüngste abgeschlossene Lauf bleibt `46014333824` vom 27.11. Die nachgewiesenen Bestände gelten für diesen Lauf. Ein neuer vollständiger Snapshot liegt für die Budgetfreigabe noch nicht vor. Der Shopify-Variantenzähler unterstützt hier keinen Filter je Veröffentlichung. [Letzter Lauf](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/46014333824)

**Befund aus dem Code:** Der bestehende Live-Aufnahmecheck stoppt oberhalb von 140’000 Varianten. Die Auswahlgrenze von 78’000 wird im aktuellen Selektor erst bei Stufe 3 geprüft. Eine lokale Quellenprobe mit 77’948 geschützten Varianten und den 53 Pilotvarianten auf Stufe 0 ergab 78’001 Varianten. Der Workflow akzeptiert `MAX` als Stückzahl und hat kein Eingabefeld für die drei konkreten Handles. [Selektor](https://github.com/allengchour-glitch/aban-news-landing/blob/main/automation/lib/gmc_schaufenster.mjs#L146) · [Aufnahmecheck](https://github.com/allengchour-glitch/aban-news-landing/blob/main/automation/gmc_schaufenster.mjs#L226) · [Workflow-Eingaben](https://github.com/allengchour-glitch/aban-news-landing/blob/main/.github/workflows/gmc-schaufenster.yml)

**Ausgearbeitete Freigabebedingung:** Aktuelle Auswahl und Sperrquelle für exakt die drei Produkt-IDs aus dem Pilot prüfen. Alle drei stehen im zuvor geprüften Shopify-Stand ausserhalb des Google-Kanals, haben das Nachfrage-Tag und ergeben 53 Varianten. Der Abgleich dieser Produktdaten mit der gemeinsamen Google-Sperrliste und dem Merchant-Ledger ergab keinen Treffer. Der konservative Gesamtstand der auf Google liegenden und unklar zugeordneten Varianten darf vor einer Aufnahme von 53 Varianten höchstens 77’947 betragen. Unbekannte Variantenzahlen, neu gesetzte Sperren oder andere Aufnahmeziele sperren den Pilot. Den globalen Auswahlplan mit Pilotvorrang mitprüfen, da der bestehende Zeitplan die Produkte sonst wieder abwählen kann. [Gemeinsame Sperrliste](https://github.com/allengchour-glitch/aban-news-landing/blob/claude/luxestyle-status-tztnn1/automation/google_sperrliste.py) · [Merchant-Ledger](https://github.com/allengchour-glitch/aban-news-landing/blob/claude/luxestyle-status-tztnn1/dropship/_merchant_issue_done.txt)

**Lokal geprüft:** 11 Fälle mit Grenzwert, Überschreitung, fehlendem Bestand, Doppel-ID, bereits veröffentlichtem Produkt, abweichender Variantenzahl, Anzeigen-Ausschluss, Ledger-Sperre und Sperrtag. Die Änderung bleibt ein Freigabeentwurf. Der heutige Gesamtbestand, der komplette Auswahl-Diff und der Produktionslauf sind offen.
