# Faltbare LED-Nachtlichtlampe: Varianten-Bilder erledigt, Umbau (Preise, Namen, Kabel) wartet auf Freigabe (03.11.2026)

Marken: **GEMESSEN** = hier abgefragt (03.11.2026) · **Hypothese** = nicht belegt · **unbekannt** = nicht gemessen.
Produkt: `faltbare-led-nachtlichtlampe-beruhrungsempfind-38ce45` (`gid://shopify/Product/15449427902849`), CJ-pid `FFECC353-7B60-4D7C-A2AC-E93F1138CE45`, 18 Varianten (Option «Farbe»), ACTIVE. **0 Bestellungen** mit dieser Lampe (GEMESSEN, `orders(query:"sku:CJ-CJJZSNSN00275*")`).

## Erledigt (ausgeführt)
- **Alle 18 Varianten haben ein eigenes Bild** (vorher 0 von 18). Mit dem reparierten `automation/cj_variantenbilder.mjs` (siehe unten) und einer Einzelkorrektur: die Variante «White 2pcs» zeigte das «3PCS»-Bild und trägt jetzt ihr eigenes «2PCS»-Bild aus dem CJ-Datenblatt. Die Bilder wurden als Kontaktbogen angesehen. Preise, Namen, SKUs, Status, Tags, Text unverändert (frisch nachgelesen).
- Ein fehlgeschlagenes Medium (`77942322692487`, FAILED, falsche URL im ersten Versuch) liegt noch an dem Produkt; es wird nicht angezeigt.

## Befund Preise (GEMESSEN): 13 von 18 Varianten liegen unter 10 % Bruttomarge, 4 davon unter dem Einstand
Einstand = (CJ-Preis + Fracht CN→CH, günstigste Linie mit höchstens 20 Tagen: «CJPacket EQ Sensitive») × Kurs 0.82435, wie `automation/lib/grind_preis.mjs`; Marge = (Preis − Einstand) / Preis, **brutto, vor Zahlungsgebühren** (2,99 % + CHF 0.35 kommen dazu). Fracht je Variante mit `logistic/freightCalculate` gemessen.

| CJ-Variante | Neuer Name | CJ $ | Fracht $ | Einstand CHF | Preis heute | Marge heute | Preis neu | Marge neu |
|---|---|---|---|---|---|---|---|---|
| Red-0.3 watts | Rot, 1 Stück | 5.94 | 10.58 | 13.62 | 18.90 | 27.9 % | – | – |
| Grey-0.5wattsX4pcs | Grau, 4 Stück | 20.00 | 28.27 | 39.79 | 40.90 | 2.7 % | 57.90 | 31.3 % |
| Grey-0.5wattsX6pcs | Grau, 6 Stück | 27.00 | 38.83 | 54.27 | 54.90 | 1.1 % | 78.90 | 31.2 % |
| USB data cable-1pc | (Variante entfällt) | 0.25 | 6.49 | 5.56 | 18.90 | 70.6 % | – | – |
| Grey 5PC-0.5watts | Grau, 5 Stück | 22.50 | 34.19 | 46.73 | 45.90 | -1.8 % | 67.90 | 31.2 % |
| White 5PC-0.5watts | Weiss, 5 Stück | 22.50 | 32.93 | 45.69 | 45.90 | 0.5 % | 67.90 | 32.7 % |
| 2grey 1white-0.5 watts | 2 Grau + 1 Weiss, 3 Stück | 13.50 | 22.09 | 29.34 | 29.90 | 1.9 % | 44.90 | 34.7 % |
| Set1-0.5 watts | Grau mit Netzteil | 8.90 | 12.03 | 17.25 | 18.90 | 8.7 % | 23.90 | 27.8 % |
| Set2-0.5 watts | Weiss mit Netzteil | 6.97 | 11.76 | 15.44 | 18.90 | 18.3 % | 23.90 | 35.4 % |
| 2white 1grey-0.5 watts | 2 Weiss + 1 Grau, 3 Stück | 13.50 | 21.85 | 29.14 | 29.90 | 2.5 % | 44.90 | 35.1 % |
| White 2pcs-0.5 watts | Weiss, 2 Stück | 9.00 | 15.92 | 20.54 | 18.90 | -8.7 % | 30.90 | 33.5 % |
| Grey-0.5 watts | Grau, 1 Stück | 6.26 | 11.39 | 14.55 | 18.90 | 23.0 % | – | – |
| White 3pcs-0.5 watts | Weiss, 3 Stück | 13.50 | 21.59 | 28.93 | 29.90 | 3.2 % | 44.90 | 35.6 % |
| Grey 2pcs-0.5 watts | Grau, 2 Stück | 9.00 | 16.43 | 20.96 | 18.90 | -10.9 % | 30.90 | 32.2 % |
| Grey 3pcs-0.5 watts | Grau, 3 Stück | 13.50 | 23.55 | 30.54 | 29.90 | -2.1 % | 44.90 | 32.0 % |
| White-0.5 watts | Weiss, 1 Stück | 4.50 | 10.98 | 12.76 | 18.90 | 32.5 % | – | – |
| Grey white-0.5 watts | Grau + Weiss, 2 Stück | 10.80 | 16.17 | 22.23 | 23.90 | 7.0 % | 30.90 | 28.1 % |
| White 4pcs-0.5 watts | Weiss, 4 Stück | 18.00 | 27.26 | 37.31 | 39.90 | 6.5 % | 57.90 | 35.6 % |

Preisregel für «Preis neu»: Einstand × Aufschlag 1,45, auf .90 aufgerundet (Regel für neue CJ-Produkte, `grind_preis.mjs`), je Packungsgrösse für beide Farben auf den höheren Wert vereinheitlicht; Einzellampen (Marge 23–33 %) und «0.3 W Rot» bleiben unverändert. Nie wird ein Preis gesenkt.

## Vorbereiteter Umbau — NICHT ausgeführt
Der Auto-Modus der Sitzung hat den Lauf am 03.11. blockiert («Modify Shared Resources»: Variante löschen und 14 Preise ändern). Er wurde nicht umgangen und auch nicht in Teilen ausgeführt (die Umbenennung allein würde die 2er-Packung zu CHF 18.90 gleichen Preises wie die Einzellampe erst recht sichtbar machen). Das Skript liegt als `nacht_umbau.mjs.txt`; es prüft vor jedem Schritt (unbekannte SKU, nicht eindeutige Namen, Preis nicht höher → Abbruch) und liest am Ende frisch nach.
1. **Variante «USB data cable-1pc» löschen** (CJ $0.25, CHF 18.90 verlangt; jeder Lampe liegt laut CJ-Datenblatt ohnehin «1*USB Cable» bei: «Package Content 1*Night light 1*USB Cable»; 0 Bestellungen).
2. **14 Preise anheben** (Tabelle: die 13 Varianten unter 10 % Marge und Set2 mit 18 %).
3. **Optionswerte auf Deutsch** («Weiss, 2 Stück» statt «White 2pcs-0.5 watts»). «Set1»/«Set2» heissen «Grau mit Netzteil»/«Weiss mit Netzteil»: **Hypothese**, abgeleitet aus den CJ-Bildern (Lampe neben einem Netzteil mit EU-Stecker) und dem Mehrgewicht von 40–49 g gegenüber der Einzellampe; das Datenblatt nennt die Sets nicht.
Rücknahme: Vorher-Stand (Titel, SKU, Preis, Bild je Variante) sichert das Skript als `nacht_backup_vor_umbau.json`; Preise per `productVariantsBulkUpdate`, Namen per `productOptionUpdate`; eine gelöschte Variante müsste neu angelegt werden (1 Variante Budget).
**Entscheid beim Besitzer:** A) Umbau wie beschrieben; B) Mehrstück-Varianten (2 bis 6 Stück, 3er-Mischungen) ganz entfernen, nur Einzellampen und Sets behalten; C) nur die Namen und das Kabel, Preise bleiben (dann verkauft das Produkt Mehrstück-Packungen mit Verlust).

## Werkzeug-Befund: `automation/cj_variantenbilder.mjs` schrieb neue Bilder nie (GEMESSEN)
- Der Pfad «neues Bild» benutzte `mediaSrc` in `productVariantsBulkUpdate`; Shopify ignoriert das stillschweigend (kein Fehler, kein Medium). Folge im Ledger `dropship/cj_variantenbilder_ledger.txt`: von 888 GESCHRIEBEN-Zeilen sind 414 vollständig, **436 teilweise und 38 ohne ein einziges Bild**. Stichprobe live am 03.11.: `led-wasserwellen-projektionsleuchte-677504` 12/18, `925-silber-armband-onda-kleeblatt-glieder` 2/3, `waffelstrick-hoodie-mit-v-ausschnitt-622800` 20/35 (gleicher Stand wie beim Schreiben).
- Zweiter Fehler: Fotos, die sich nur durch eine Aufschrift unterscheiden («2PCS»/«3PCS»), hatten fast denselben Hash und dieselbe Farbe; die 2er-Variante bekam das 3er-Bild.
- Dritter Fehler: die SKU-Prüfung verlangte «CJ» + 2 Buchstaben + Ziffern und übersprang Kennungen mit Buchstabenblock («CJJZSNSN00275», «CJJJCFCF00364»).
- **Behoben in diesem PR** (43 Tests, 5 Mutationsproben erkannt): neue Bilder zuerst als Medium anlegen (`productCreateMedia`, warten bis READY), dann per `mediaId` binden; Dateiname-Abgleich (gehört ein Medium dem Dateinamen eines anderen CJ-Bilds, ist es dort zuhause; gleicher Dateiname gewinnt); SKU-Prüfung `istCjVariantenSku`; Ledger-Zeile `TEILWEISE` (höchstens dreimal) statt dauerhaftem `GESCHRIEBEN` bei unvollständigem Ergebnis; `NACHFUELLEN=1` holt die früheren Teilergebnisse nach.
- **Fortschrittsanzeige korrigiert** (`automation/fortschritt_daten.mjs`): «Variantenbilder verknüpft» zählte alle GESCHRIEBEN-Zeilen als erledigt (888 von 890); jetzt nur vollständige Läufe: **415 von 890** (GEMESSEN am Ledger mit meinen zwei neuen Zeilen).
- **Noch nicht ausgeführt:** das Nachholen der rund 474 betroffenen Produkte (`NACHFUELLEN=1 HANDLES_DATEI=… node automation/cj_variantenbilder.mjs`, zuerst Trockenlauf und eine Stichprobe von 10 mit `LIVE=1` und Kontaktbogen). Es braucht CJ-Punkte (je Produkt 1 Abfrage) und legt Medien an (kein Variantenbudget). Jeder Lauf erst nach Sichtprüfung der Kontaktbögen; das Werkzeug kann ein Bild nur an Varianten ohne Bild binden, falsch gebundene Bilder wie bei «White 2pcs» müssen von Hand korrigiert werden.
