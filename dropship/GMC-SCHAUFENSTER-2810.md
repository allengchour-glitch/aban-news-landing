# Google-Schaufenster: Merchant-Center-Quote einhalten (28.10.2026)

Marken: **GEMESSEN** = hier selbst gemessen (Befehl/Zahl), **QUELLE** = fremde Angabe mit Fundort, **SETZUNG** = gewählte Schwelle, **unbekannt** = nicht gemessen.

## Der Befund

Der Besitzer zeigte am 28.10.2026 das Merchant Center («Products › Needs attention»): **«Shopping ads quota limit reached (outside of CSS program)»** und **«Over capacity for Shopping ads (in CSS program)»**, je 236 000 Produkte (60 %). Betroffene Artikel sind «Limited», laufen also nicht in Shopping-Anzeigen. Für Google Ads hat der Besitzer noch CHF 58 (Angabe des Besitzers).

- QUELLE Google Merchant Center Help «Understanding quotas in Google Merchant Center» (support.google.com/merchants/answer/16564100, abgerufen 28.10.2026): Standardgrenze **150 000 Artikel je Bereich** (Anzeigen in CSS-Ländern, Anzeigen ausserhalb, kostenlose Einträge). Erhöhung nur bei mindestens 80 % Auslastung, unter 20 % abgelehnten/ausstehenden Artikeln, ohne Sperre und bei ausreichender Leistung. Für überzählige Artikel nennt Google: «remove products you no longer intend to sell or advertise» (answer/14968709).
- **Ein Artikel ist eine Variante, nicht ein Produkt.**
- GEMESSEN 28.10.2026 (Bulk-Abfrage, 56 618 aktive Produkte): auf dem Kanal «Google & YouTube» (`gid://shopify/Publication/302872297857`) liegen **54 745 Produkte mit 514 931 Varianten**, also das 3,4-fache der Grenze. 20 433 davon tragen `mm-google-shopping.excluded_destination = ["Shopping_ads"]` (207 114 Varianten); 778 sind Fortura/CH-Lager. Die nächtlichen Auswahl-Läufe fügen laufend Varianten hinzu.
- unbekannt: wie genau das Merchant Center zählt (der Bildschirm nennt 236 000 = 60,1 %, das ergibt rund 393 000 Artikel, die Shopify-Lesung 514 931 Varianten). Ob die Google-App das Ausschlussfeld beachtet, ist unbelegt. Die Regel unten hängt von beidem nicht ab: sie nimmt Produkte vom Kanal.

## Die Lösung: ein Schaufenster unter der Grenze

`automation/gmc_schaufenster.mjs` (Logik und Begründung: `automation/lib/gmc_schaufenster.mjs`, 136 Tests der Regel, 38 des Ablaufs mit Attrappen-Shop) hält die Zahl der Varianten auf dem Kanal unter einem **Budget von 90 000** (SETZUNG; Grenze 150 000, der Rest ist Platz für das Wachstum der Auswahl-Läufe bis zum nächsten Lauf).

| Stufe | Wer | Regel |
|---|---|---|
| nie | Sperrtag (`lib/kanal_sperren.mjs`), keine Google-Kategorie, `cj-ausgelistet`, `bild-zu-klein`, offene Prüf-Tags (`PRUEF_TAGS`: `stecker-unklar`, `versand-pruefen`, `lieferumfang-unklar` …), Lizenzname im Titel (`LIZENZ` aus `gmc_feed_item.mjs`, wie im Feed), Variantenzahl unbekannt | gilt vor allem anderen, auch vor Fortura und «bewährt» |
| 1 | Fortura/CH-Lager (Tags `fortura`, `ch-lager`) | immer, auch mit Ausschlussfeld |
| 0 | **bewährt**: in einer bezahlten, nicht stornierten/erstatteten Bestellung, oder mindestens 4 Sterne bei mindestens 3 Bewertungen (`reviews.rating`/`rating_count`) | immer, auch mit Ausschlussfeld, ohne Kategorie-Deckel |
| 2 | Marge A oder B (Tags `mengenrabatt-a`/`-b`) | immer, ausser mit Ausschlussfeld |
| 3 | der Rest ohne Ausschlussfeld | bis das Budget voll ist; wenige Varianten zuerst; je Google-Kategorie (zwei Ebenen) höchstens 15 % des Budgets |

**Warum Stufe 0 (Prüfer «Auswahl», 28.10., von einem zweiten Prüfer nachgestellt):** ohne sie wären 7 von 14 verkauften Produkten auf Google (Hängematte, Midikleid, Blumenkleid, Leinen-Set, Gemüseschneider, LED-Wasserwellen-Leuchte, Jeanskleid) und 971 von 1 993 gut bewerteten abgewählt worden, zu 904 allein wegen des Ausschlussfelds. Ob der Kanal diese Verkäufe gebracht hat, ist nicht belegt (Herkunft laut Shopify: Google-Suche, direkt, ChatGPT); Stufe 0 ist ein Qualitäts- und Nachfragehinweis, kein Umsatzbeleg. Die Bestellungen liest das Werkzeug selbst (`orders`, nur lesen) und vergleicht die gelesene Zahl mit `ordersCount`: stimmt sie nicht (Shopify liefert ältere Bestellungen als 60 Tage nur mit dem Recht `read_all_orders`), bricht ein Schreiblauf ab. GEMESSEN 28.10.: 29 von 29 Bestellungen gelesen, 18 bezahlte Produkte, 14 davon auf Google (die anderen vier waren nie dort), 0 im Abwahl-Plan.

**Bewusst NICHT gesperrt:** `auto-entwurf-0926` (die Charge vom 26.09. ist die einzige Entwurfs-Familie ohne harten Grund, 30 aktive Produkte, mehrere verkauft). Ein Prüfer hatte es vorgeschlagen; am Plan nachgemessen (3 verkaufte Produkte wären gegangen) und verworfen.

GEMESSEN im Trockenlauf gegen den echten Shop (nur lesen, 28.10.2026, 56 618 aktive Produkte, 29 Bestellungen): **27 911 Produkte gehen vom Kanal** (Ausschlussfeld 19 712, Kategorie-Deckel 7 935, Lieferbarkeit/Bild 100, Prüf-Tag 80, Sperrtag 31, ohne Google-Kategorie 43, Lizenzname 10); im Schaufenster bleiben Stufe 0: 1 438 Produkte / 12 231 Varianten, Stufe 1: 774 / 814, Stufe 2: 2 054 / 7 029, Stufe 3: 22 649 / 64 020. Die Varianten auf Google sinken von **514 931 auf 83 911** (Budget 90 000, Quote 150 000). Der Deckel je Google-Kategorie (15 % des Budgets = 13 500 Varianten) greift bei Schuhen, Kleidung und Schmuck; die Mode im Schaufenster sinkt dadurch von rund 34 % auf rund 18–22 % der Google-Produkte (Prüfer «Auswahl»: der Hauptteil kommt vom Budget, nicht vom Deckel).

## Ablauf und Sicherheit

1. `node automation/gmc_schaufenster.mjs` (Vorgabe `PHASE=plan`, nur lesen): Zahlen, Gründe, Beispiele auf beiden Seiten, Plan nach `/tmp/gmc_schaufenster_plan.json`.
2. `LIVE=1 PHASE=abwaehlen [ONLY=handle,handle] [MAX=n|alle]`: `publishableUnpublish`, 10 je Anfrage. Nur mit der Freigabedatei `dropship/GMC-SCHAUFENSTER-FREI.txt` (löschen = Stopp). Das Manifest `dropship/gmc_schaufenster_manifest.jsonl` bekommt vor jedem Aufruf eine Zeile `ab-versucht` (ein Absturz verliert nichts); ein Produkt gilt erst nach frischem Rücklesen als abgewählt.
3. `PHASE=pruefen`: liest frisch und vergleicht mit Manifest und Plan (Exit 3 bei Abweichung).
4. **Rücknahme:** `LIVE=1 PHASE=aufnehmen` stellt zurück, was das Werkzeug abgewählt hat und was wieder passt (nie ein Produkt ohne Manifest-Eintrag, nie eines mit Sperrtag). `LIVE=1 PHASE=zuruecksetzen` ist die volle Rücknahme: alles zurück, was das Werkzeug abgewählt hat (ausser Sperrtag), auch Produkte mit Ausschlussfeld oder ausserhalb des Budgets.
5. Ein Plan mit Fehlern (unter 1 000 Zeilen, unter 500 Schaufenster-Produkten, über 140 000 Varianten danach, über 2 % unklare Zeilen, über 70 % abzuwählen, über 5 % ohne Google-Kategorie) schreibt nichts. Drosselung wird nie umgangen (Exit 4, der nächste Lauf macht idempotent weiter).
6. Der Publish-Guard (`INCLUDE_GOOGLE` aus) und `kanal_sperren.mjs` ziehen Google nicht nach, abgewählte Produkte kommen also nicht von selbst zurück.

## Offen / Entscheide

- **Wirkung im Merchant Center** ist von hier nicht messbar (kein Zugang): nach dem Lauf braucht Google Stunden bis Tage. Der Besitzer schickt dann den Screenshot «Needs attention» und «All products» (Zahl der Artikel).
- **Wiederholung:** die Auswahl-Läufe fügen Varianten hinzu (rund 9 500 je Nacht bei Volllast, QUELLE CLAUDE.md 26.10.). Ein Prüfer rechnete: ohne Wiederholung ist die Quote nach etwa 12–13 Tagen wieder erreicht; mit einem Lauf nach 7 Tagen bleiben rund 29 000 Varianten Reserve (Gegenrechnung des zweiten Prüfers). Mindestens wöchentlich `PHASE=plan`, dann `abwaehlen`/`aufnehmen`, besser täglich nach dem Auswahl-Lauf (21:50 UTC; der Plan allein kostet eine Minute und schreibt nichts). Noch kein Workflow. Neue Produkte landen trotz `autoPublish=false` weiter auf dem Kanal (GEMESSEN: 820 von 824 seit 20.10.); wer sie dorthin legt, ist unbekannt.
- **Anzeigen mit CHF 58:** erst nach dem Lauf und nach einer Messung im Merchant Center sinnvoll (Standard-Shopping-Kampagne auf Stufe 1 und 2). Ein Label (`custom_label_0`) für die Stufen ist ein möglicher Folgeschritt; ob die Google-App das Metafeld liest, ist unbelegt.
- Das Ausschlussfeld: **wer es schreibt, ist unbekannt** (Oktober-Produkte tragen es nachträglich, in Schüben von Sekunden, Stunden nach der Anlage). Gemessen am Preis: bei neuen Produkten tragen es alle mit Mindestpreis bis CHF 18.90 und keines ab CHF 19.90, also eine Preisregel eines Stapels ausserhalb des Repos. Es schliesst laut Google nur Shopping-Anzeigen aus (QUELLE support.google.com/merchants/answer/6324486); `Free_listings` ist ein eigener Wert, der hier nicht gesetzt ist. Dieses Werkzeug behandelt es trotzdem als «weg vom Kanal» (spart Platz für Produkte, die Anzeigen bekommen können). **Entscheid des Besitzers, Standard «bleibt so»:** 4 424 günstige Marge-A/B-Produkte (14 035 Varianten) tragen das Feld und gehen mit; sie in den kostenlosen Einträgen zu halten würde Stufe 3 um rund 5 700 Varianten verdrängen. Der Lauf ist über das Manifest umkehrbar.
- **Offen (klein):** `social-pause-halloween` (31 Produkte) gilt hier als Sperrtag und geht vom Kanal; `aufnehmen` holt sie nach Halloween zurück, sobald das Tag entfernt ist. Die Bewertungsschwelle des `rating_guard` (höchstens 3,8 Sterne bei mindestens 3 Stimmen: rund 15 Produkte) ist nicht eingebaut.
