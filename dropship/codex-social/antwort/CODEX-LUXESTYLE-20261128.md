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
| ChatGPT-Suche | CH-Einstiegsseiten ausgewertet und die Prüfung von Weiterleitungszielen auf dem Branch korrigiert. | Fell- und Plüschjacken mit 10 Sitzungen und einem abgeschlossenen Checkout. Ein genaueres Weiterleitungsziel als Shop-Entwurf. |
| ChatGPT-Suche live | Bestehende Weiterleitung der alten Wellness-Geschenkbox aktualisiert und zurückgelesen. | Öffentlicher Aufruf landet auf Geschenk-Sets & Bundles (HTTP 200). |
| Shop und Suche | Versandhinweis in zwei live erreichbaren ChatGPT-Zielseiten präzisiert. 53 Google-Pilotvarianten einzeln geprüft. | Zwei öffentliche Gegenproben erfolgreich. Kapazitätsbeleg für Google weiterhin offen. |
| Morgenlauf 08:02 | Planung, Produktauswahl und Textlayout des Cascade-Masters frisch geprüft. | 4 bestehende Publikationen bestätigt. 13 künftige Kanaltermine. Sichere Textpositionen ermittelt. |

| Kundengewinnung | Cascade-Suchtext gespeichert und im Shop sowie öffentlich geprüft. Schweizer Suchbegriffe mit den bereits gemessenen Landeseiten und kaufbaren Varianten abgeglichen. | Cascade-Metadaten live. Priorität für die organische Kundengewinnung sind Fell- und Plüschjacken. Suchvolumen unbekannt. |

| Kaufweg Wintermode | Zwei konkrete Jackenvarianten vom Kollektionsraster bis zum öffentlichen Warenkorb-Formular geprüft und einen mehrdeutigen Mantelabsatz zur Korrektur vorbereitet. | Beide Varianten kaufbar gemeldet. Entwurf betrifft einen Absatz am Wintermantel. |

| CJ-Support | Mailverlauf zu LX1047 gelesen und den bestehenden Ticketzugang geprüft. | CJ-Mail verweist auf den Supportbereich. Der Ticketstand ist wegen der CJ-Menschprüfung unbekannt. |

| Versandstatus #1047 | Shopify-Bestellung und Produkt geprüft. CJPacket zu der im CJ-Fall genannten Nummer abgefragt. | Shopify `UNFULFILLED`, Produkt `DRAFT`. CJPacket zeigt nur ein erstelltes Etikett. |

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

## ChatGPT-Suche · gezielte Weiterarbeit 28.11.2026

ShopifyQL, 29.10.–27.11., menschliche Sitzungen aus der Schweiz mit `utm_source=chatgpt.com`. Begrenzte Abfrage der zwölf häufigsten Landeseiten. Diese zwölf Zeilen zeigen zusammen 94 Sitzungen, 11 mit Warenkorb, 7 mit erreichtem und 2 mit abgeschlossenem Checkout. Das sind Sitzungskennzahlen des Ausschnitts. Die letzten Tage und URL-Werte können durch Shopify nachträglich ergänzt werden.

| Landeseite | Sitzungen | Warenkorb | Kasse erreicht | Kasse abgeschlossen |
| --- | ---: | ---: | ---: | ---: |
| [Felljacken & Plüschjacken](https://luxestyle.ch/collections/damen-jacken-kunstfell) | 10 | 4 | 3 | 1 |
| [Punk- und Gothicschmuck](https://luxestyle.ch/collections/punk-gothic-schmuck) | 8 | 2 | 1 | 0 |
| [Alte heizbare Kuscheldecke](https://luxestyle.ch/products/heizbare-kuscheldecke-mit-armeln-und-kapuze-606000) | 5 | 0 | 0 | 0 |
| [Alte Wellness-Geschenkbox](https://luxestyle.ch/products/geschenkbox-mit-decke-und-wellness-produkten-605100) | 4 | 0 | 0 | 0 |

Die Fell- und Plüschjacken-Kollektion war in Shopify Online Store veröffentlicht (35 Produkte). Fünf häufige Fragen und Antworten sind bereits im Beschreibungstext. Der öffentliche Suchtreffer ist vorhanden. Die Antworttexte bleiben als Grundlage erhalten. `robots.txt` lieferte HTTP 200. Die Regeln erlauben den vier geprüften Kollektionspfaden den Zugriff für OAI-SearchBot. Die tatsächlichen Bot-Abrufe wurden hier nicht gemessen. [Fell- und Plüschjacken](https://luxestyle.ch/collections/damen-jacken-kunstfell) · [Robots-Datei](https://luxestyle.ch/robots.txt) · [OpenAI-Regeln für die Suche](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt)

**Umgesetzt auf dem Branch:** Die vorhandene Landeseiten-Prüfung liest jetzt bei Weiterleitungen auch den Veröffentlichungsstand des ersten Produkt- oder Kollektionsziels. Im alten Code erschienen ein Draft-Zielprodukt und eine versteckte, gefüllte Kollektion in den Gegenproben als normale Weiterleitung. Beide werden jetzt gemeldet. 20 Selbsttests und die lokalen Integrations-Gegenproben bestanden. Die produktive Ausführung bleibt ungeprüft. [Geprüfter Code](https://github.com/allengchour-glitch/aban-news-landing/blob/c3601e175edb5586e26bedbc5b935f575998b83a/automation/chatgpt_landeseiten_wache.py)

**Ein Shop-Entwurf zur Freigabe:** Weiterleitung `gid://shopify/UrlRedirect/2135651320199` für die alte Wellness-Geschenkbox vom Ziel `/collections/premium-geschenke` (400 Produkte) auf `/collections/sets-bundles` (154, Online Store veröffentlicht) umstellen. Die Zielkollektion nennt ausdrücklich Geschenkboxen und Pflegesets. Die engere Kollektion `wellness-bundles` ist im Online Store unveröffentlicht. Der andere ältere Link zur Kuscheldecke führt bereits zur passenden veröffentlichten Kollektion mit 36 Artikeln. Shopify-Weiterleitungen wurden in diesem Lauf gelesen. [Geschenk-Sets & Bundles](https://luxestyle.ch/collections/sets-bundles) · [Kuscheldecken & Heizdecken](https://luxestyle.ch/collections/kuschel-heizdecken)

### Freigabe umgesetzt am 28.11.2026

Auf «push alles» die einzelne, zuvor geprüfte Shopify-Weiterleitung `gid://shopify/UrlRedirect/2135651320199` aktualisiert. Alter Zielpfad `/collections/premium-geschenke`, neuer Zielpfad `/collections/sets-bundles`. Shopify meldete keine Fehler. ID, Quellpfad und neues Ziel anschliessend über Admin zurückgelesen. Im frischen öffentlichen Aufruf öffnet der alte Link die veröffentlichte Zielkollektion mit HTTP 200 und dem Titel «Geschenk-Sets & Bundles kaufen». Das ist ein Auslieferungsbeleg für die Weiterleitung. Auswirkungen auf Suchtraffic sind noch nicht messbar. [Alter Link zur Gegenprobe](https://luxestyle.ch/products/geschenkbox-mit-decke-und-wellness-produkten-605100) · [Öffentliches Ziel](https://luxestyle.ch/collections/sets-bundles)

Der Google-Pilot wartet auf eine neue belegte Kapazitätsrechnung. Der jüngste Schaufenster-Lauf war weiterhin `46014333824` vom 27.11. Der Shopify-Admin für Shop Campaigns zeigte erneut die Anmeldeseite. Google-Kanal und Autopilot erhielten keine Änderung. [Schaufenster-Lauf](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/46014333824)

## Versandhinweise auf ChatGPT-Zielseiten · 28.11.2026

Auf «verb. alles» zwei veröffentlichte Kollektionsseiten gezielt korrigiert. In «Geschenk-Sets & Bundles» steht jetzt in der Seitenbeschreibung und der Suchbeschreibung «Gratisversand in der Schweiz ab CHF 50 nach Rabatt». In «Kuscheldecken & Heizdecken» ist der sichtbare Versandhinweis genauso präzisiert. In Shopify zurückgelesen und für beide Seiten per frischem öffentlichen HTTP-200-Abruf verifiziert. Die Fell- und Plüschjacken sowie die Punk- und Gothicschmuck-Kollektion nannten den Rabattabzug bereits. [Geschenk-Sets & Bundles](https://luxestyle.ch/collections/sets-bundles) · [Kuscheldecken & Heizdecken](https://luxestyle.ch/collections/kuschel-heizdecken)

**Google-Pilot:** Die 53 Varianten der drei ausgewählten Produkte im Shopify-Admin einzeln gelesen. Kapuzenjacke 12 von 12, Leinenhemd 30 von 30, LED-Makeup-Spiegel 11 von 11 als kaufbar gemeldet. Die Produkte sind im Online Store veröffentlicht, besitzen ein Produktbild und haben aktuell kein `excluded_destination`-Feld. Tracking ist aus, `inventoryPolicy=CONTINUE`. Der jüngste vollständige Schaufenster-Lauf bleibt `46014333824` vom 27.11. Die frische Google-Gesamtzahl fehlt, die Produkte sind in Shopify weiterhin ausserhalb des Google-Kanals. [Schaufenster-Lauf](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/46014333824)

Für Shop Campaigns bleibt ein angemeldeter Autopilot-Admin die Voraussetzung. Es gab keine Änderungen an Shop-Kampagnen oder am Google-Kanal.

## Morgenlauf 28.11.2026 · 08:02 Uhr Zürich

Shopify 94368563585 und alle sechs Metricool-Kanalidentitäten der Marke 6227837 mit Zeitzone Europe/Zurich frisch bestätigt. Vier fällige bestehende Beiträge sind kanalbezogen `PUBLISHED`. Instagram 01:34, 01:36 und 07:49, Facebook 01:36. Keine neuen Termine durch Codex. 13 künftige Kanaltermine in 11 Bildobjekten mit `draft=false` und `autoPublish=true`. Zwei verschiedene Threads-Beiträge stehen zeitgleich am 28.11. um 11:00 (IDs 439081423 und 442296598). Keine identischen sichtbaren Medien-URLs oder Beitragstexte pro Kanal im geprüften Fenster. [Instagram-Beleg 07:49](https://www.instagram.com/p/DgRphq3jUIx/)

| Datum | Bestätigte künftige Planung |
| --- | --- |
| 28.11. | Threads 11:00 zweimal, Instagram und Facebook 17:00, TikTok 18:00, Pinterest 19:10 und 20:00. YouTube offen. |
| 29.11. | Instagram und Facebook 17:00, TikTok 18:00, Pinterest 19:10. Threads und YouTube offen. |
| 30.11. | Pinterest 19:10 und 20:00. Die übrigen fünf Kanäle offen. |
| 01.–05.12. | Alle sechs Kanäle offen. |

Die am selben Zürcher Kalendertag erhobenen Kennzahlen 21.–27.11. gelten weiter. Für den Klaviyo-Flowreport verlangt der Connector eine Neuanmeldung. Die vier öffentlichen DNS-Werte waren im heutigen Abgleich bereits bestätigt.

### Cascade · Textpositionen für den gleichen 18-Sekunden-Master

Modell 1, Produkt 15431606829441, Variante 67870931517831, SKU CJLX293479401AZ. Shopify ACTIVE, CHF 26.90, Tracking aus, `CONTINUE`, 16 Tags ohne Sperrtreffer inklusive `rueckhol`. Der frische öffentliche Aufruf bestätigte HTTP 200, Modell 1, CHF 26.90 und den Warenkorb-Button. [Produkt](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831) · [Aktuelles Originalfoto der Variante](https://cdn.shopify.com/s/files/1/0943/6856/3585/files/ec5377d7-40ed-42d4-8e8b-07c4873e3d91.jpg?v=1790745331)

Aufnahmefolge 0–2 s Einstieg, 2–6 s Licht über das ruhende Paar, 6–10 s reales Makro von Verschluss über Kugel zum Tropfen, 10–15 s Paar im Profil, 15–18 s Abschluss. Warmes Taupe, dunkler Stoff, ruhige Kamera. Pflicht für den Dreh ist ein farb- und formgetreues Originalpaar. Die vorhandene 2,125-s-Vorschau (718 × 1282, 24 fps, stumm, SHA-256 `aa3792897c2540decfcaa5141ca2e8838973b19e8b6a8058c54187386747d2c2`) bleibt Lichtreferenz. Es gibt keine neuen Originaltakes im Suchfenster von Drive und kein neues Varianten-Video in Shopify. Filmaufnahmen und kommerzielle Nutzungsrechte fehlen weiterhin. Für Musik zusätzlich Herkunft der Samples und Freigabe der Pflichtdatei klären. Die alte lokale Kristall-Korrekturdatei war am dokumentierten Pfad nicht lesbar.

| Schnitt | Einblendung | Position auf 1080 × 1920 |
| --- | --- | --- |
| 0–2 s, Hook A | Ein Akzent in / Goldfarbe | x144, y476, 68 px, zwei Zeilen |
| 0–2 s, Hook B | Vom Verschluss / zum Tropfen | x144, y476, 68 px, zwei Zeilen |
| 10,20–14,60 s | Creolen Cascade | x144, y496, 66 px |
| 15–18 s | Cascade entdecken | x144, y1315, 58 px |

Text als DejaVu Sans Bold auf 1080 × 1920 vermessen. Längste Zeile 632 px bei 732 px verfügbarer Breite. Die Textblöcke liegen ausserhalb der gemessenen Produktzone y630–1225 und bleiben in zentrierten 4:5- und 1:1-Ausschnitten. Kleinste Schriftgrösse bei 360 px Bildschirmbreite rund 19 px. App-Steuerelemente und Kontrast erst im echten Export abnehmen. Es wurde kein neuer Film gerendert oder hochgeladen.

| Kanal | Textentwurf | Produktlink |
| --- | --- | --- |
| Instagram | Ein warmer Reflex auf dunklem Stoff. Die goldfarbenen Creolen «Cascade» aus der Nähe. Link in Bio. | [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=instagram&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=instagram_cascade_modell1) |
| TikTok | Vom Verschluss bis zum Tropfen. «Cascade» ganz nah. Link in Bio. | [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=tiktok&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=tiktok_cascade_modell1) |
| YouTube Shorts | Titel «Cascade Creolen – vom Verschluss zum Tropfen». Beschreibung «Goldfarbene Creolen im Detail.» Shop-Link im Kanalprofil. | [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=youtube&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=youtube_cascade_modell1) |
| Facebook | Goldfarbene Creolen mit Tropfen. Schau dir Modell 1 und die Produktdetails im Onlineshop an. | [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=facebook&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=facebook_cascade_modell1) |
| Threads | Welches Detail fällt dir zuerst auf, die Kugel oder der Tropfen? Entdecke Modell 1 im Shop. | [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=threads&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=threads_cascade_modell1) |
| Pinterest | Titel «Goldfarbene Creolen Cascade mit Tropfen». Beschreibung «Schmuck-Detailaufnahme auf dunklem Stoff.» Produktlink als Pin-Ziel. | [UTM-Ziel](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831&utm_source=pinterest&utm_medium=organic_social&utm_campaign=cascade_master_18s&utm_content=pinterest_cascade_modell1) |

Instagram und TikTok erst mit bestätigtem Bio-Ziel. Pinterest erst mit bestätigtem passenden Kontoboard. YouTube-Entwurf richtet sich an allgemeines Schmuckpublikum, geplantes `madeForKids=false` vor Einsatz im konkreten Beitrag bestätigen.

### Zur Freigabe · Cascade-Suchtext präzisieren

Der aktuelle Shopify-SEO-Titel endet mit «Gold». Die vorhandene Produktbeschreibung nennt «Goldoptik» und als Material «Metall». Die bisherige Suchbeschreibung endet mit einem abgeschnittenen Rabatttext. Geprüfter neuer SEO-Titel für das einzelne Produkt 15431606829441 lautet «Creolen Cascade mit Tropfen, goldfarben». Die neue Meta-Beschreibung lautet «Goldfarbene Creolen Cascade mit Tropfenanhängern. Modell 1 ansehen und die Produktdetails entdecken.» Der Entwurf wurde nicht im Shop gespeichert. [Produktseite](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831)


## Kunden gewinnen · 08:09 Uhr Zürich

Cascade, Produkt `15431606829441`. Shopify und öffentlicher Produktaufruf (HTTP 200) bestätigen den SEO-Titel «Creolen Cascade mit Tropfen, goldfarben» und die Meta-Beschreibung «Goldfarbene Creolen Cascade mit Tropfenanhängern. Modell 1 ansehen und die Produktdetails entdecken.» Der öffentliche Tab-Titel ergänzt «– LuxeStyle». Der sichtbare Produktname und der Handle sind beim Rücklesen identisch. [Produktseite](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831)

1. **Felljacke Damen Schweiz / Plüschjacke Damen Schweiz.** Für ChatGPT-Besuche aus der Schweiz vom 29.10. bis 27.11. zeigt die Kategorie 10 Sitzungen, 4 mit Warenkorb, 3 mit erreichtem und 1 mit abgeschlossenem Checkout. Als Ziel eignet sich die Kategorie mit 35 Produkten. Die kurze Kapuzenjacke in Blau, S und M, ist laut Shopify kaufbar (CHF 34.90). [Kategorie](https://luxestyle.ch/collections/damen-jacken-kunstfell) · [Kapuzenjacke, Blau M](https://luxestyle.ch/products/kurze-kapuzenjacke-mit-fellkragen-626300?variant=67737574343047)
2. **Wintermantel Damen mit Fellkragen Schweiz.** Die Suchstichprobe lieferte die LuxeStyle-Produktseite. Die Varianten Grau M und L sind laut Shopify kaufbar (CHF 30.90). [Wintermantel, Grau M](https://luxestyle.ch/products/gefutterter-wintermantel-mit-fellkragen-606600?variant=67737571819911)
3. **Goldfarbene Creolen mit Tropfen kaufen.** Die Suchstichprobe lieferte die Cascade-Seite mit dem früheren Titel. Modell 1 ist laut Shopify kaufbar (CHF 26.90). Der überarbeitete Suchtext ist im Shop öffentlich sichtbar. Die Aktualisierung in Suchergebnissen bleibt offen. [Cascade Modell 1](https://luxestyle.ch/products/creolen-ohrhanger-cascade-mit-tropfen-gold?variant=67870931517831)

Die Suchstichprobe zeigt, für welche dieser Begriffe bereits passende LuxeStyle-Seiten auffindbar waren. Google-Impressionen, Google-Klicks und Suchvolumen bleiben unbekannt. HYPD hat keine ausgewählte Search-Console-Property. Semrush meldet keine verfügbaren API-Einheiten für die Keyword-Berichte. [Search Console freigeben](https://app.hypd.ai/sources?select=search-console&utm_source=mcp&utm_content=none_selected)


## Schweizer Suchbesuche · Kaufweg geprüft · 08:14 Uhr Zürich

Die beiden Modelle stehen zuerst im öffentlichen Kollektionsraster. Die direkten Variantenlinks liefern HTTP 200, zeigen die ausgewählte Farbe und Grösse und haben ein aktives Warenkorb-Formular. Shopify meldet beide Varianten als kaufbar. Der Prüfumfang war die Produktauswahl bis zum Formular. [Felljacken & Plüschjacken](https://luxestyle.ch/collections/damen-jacken-kunstfell)

| Suchabsicht | Geprüfte Variante | Ziel |
| --- | --- | --- |
| Kurze Damenjacke mit Kapuze und Fellkragen | Blau / M, CHF 34.90 | [Produkt ansehen](https://luxestyle.ch/products/kurze-kapuzenjacke-mit-fellkragen-626300?variant=67737574343047) |
| Gefütterter Wintermantel für Damen mit Fellkragen | Grau / M, CHF 30.90 | [Produkt ansehen](https://luxestyle.ch/products/gefutterter-wintermantel-mit-fellkragen-606600?variant=67737571819911) |

**Ein Textentwurf zur Freigabe.** Wintermantel `gid://shopify/Product/16652033491335`, Feld `descriptionHtml`, nur der erste Absatz. Die bestehende Formulierung «Er besteht aus Baumwolle und ist nicht abnehmbar» lässt offen, was gemeint ist. Die Grössen M bis 6XL sowie Grau und Schwarz sind über die Varianten belegt. Für dieses Modell fehlen verifizierte Masse.

> Dieser gefütterte Wintermantel mit Fellkragen ist schmal geschnitten. Das Modell gibt es in Grau und Schwarz, in den Grössen M bis 6XL.

Die Gegenprobe des konkreten HTML-Diffs lässt den Text nach dem ersten Absatz bytegenau gleich. Shopify-`updatedAt` zum Zeitpunkt der Gegenprobe `2026-10-28T20:50:18Z`. Status des Textes ist Entwurf. [Wintermantel](https://luxestyle.ch/products/gefutterter-wintermantel-mit-fellkragen-606600?variant=67737571819911)


## CJ-Ticket zu LX1047 · 08:16 Uhr Zürich

Laut Projektjournal wurde das Ticket `T202611271548558321` für CJ-Auftrag `SD2611251301040644900` am 27.11. um 16:48 Uhr Zürich eröffnet. Der Termin am 28.11. um 06:39 Uhr Zürich war als Nachkontrolle vorgesehen. Die jüngste Mail im geprüften Verlauf kam am 27.11.2026 um 13:32 Uhr Zürich. CJ verweist auf den Supportbereich. Die Frage zur Markenkennzeichnung der Augencreme und der Versandstatus bleiben in der Mail offen. [CJ-Mail](https://mail.google.com/mail/#all/1a21b832510ebb07) · [Ticketbeleg im Projektjournal](https://github.com/allengchour-glitch/aban-news-landing/blob/dc8a8ee3f8b1e49f256386e10532525e897b9799/GEDAECHTNIS-JOURNAL.md#L114-L116)

Der Browser wurde auf «Human verification» umgeleitet. Die Ticketantwort und der aktuelle Status sind unbekannt. [CJ-Supportbereich](https://cjdropshipping.com/mine/ticket)

### Versandgegenprobe LX1047 · 08:23 Uhr Zürich

Shopify-Bestellung `19183838396807` ist `UNFULFILLED`. Das System enthält keine Sendung oder Trackingnummer für die Bestellung. Der Fulfillment-Auftrag ist `OPEN`. Die einzige Produktposition `15453766877569` steht auf `DRAFT`. Der CJ-seitige Haltestatus bleibt unbekannt. [Shopify-Bestellung](https://admin.shopify.com/store/au3j0y-hq/orders/19183838396807)

CJPacket zeigte bei der Prüfung «Processing» und «Label created. Warehouse is processing this order.» Das belegt die Etiketterstellung. Eine Paketübergabe an den Frachtführer ist dabei nicht bestätigt. Im geprüften Mailverlauf traf keine weitere CJ-Antwort ein. [CJPacket](https://www.cjpacket.com/?trackingNumber=EQKPT8613518515YQ)

Text für die bestehende Ticketnummer `T202611271548558321`, als Entwurf.

> Could you confirm whether order LX1047 / SD2611251301040644900 is on hold and whether tracking EQKPT8613518515YQ has a first carrier scan? Please attach current photos of the exact item and outer packaging so we can verify the branding before dispatch.
