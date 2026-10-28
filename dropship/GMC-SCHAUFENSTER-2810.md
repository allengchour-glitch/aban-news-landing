# Google-Schaufenster: Merchant-Center-Quote einhalten (28.10.2026)

Marken: **GEMESSEN** = hier selbst gemessen (Befehl/Zahl), **QUELLE** = fremde Angabe mit Fundort, **SETZUNG** = gewählte Schwelle, **unbekannt** = nicht gemessen.

## Der Befund

Der Besitzer zeigte am 28.10.2026 das Merchant Center («Products › Needs attention»): **«Shopping ads quota limit reached (outside of CSS program)»** und **«Over capacity for Shopping ads (in CSS program)»**, je 236 000 Produkte (60 %). Betroffene Artikel sind «Limited», laufen also nicht in Shopping-Anzeigen. Für Google Ads hat der Besitzer noch CHF 58 (Angabe des Besitzers).

- QUELLE Google Merchant Center Help «Understanding quotas in Google Merchant Center» (support.google.com/merchants/answer/16564100, abgerufen 28.10.2026): Standardgrenze **150 000 Artikel je Bereich** (Anzeigen in CSS-Ländern, Anzeigen ausserhalb, kostenlose Einträge). Erhöhung nur bei mindestens 80 % Auslastung, unter 20 % abgelehnten/ausstehenden Artikeln, ohne Sperre und bei ausreichender Leistung. Für überzählige Artikel nennt Google: «remove products you no longer intend to sell or advertise» (answer/14968709).
- **Ein Artikel ist eine Variante, nicht ein Produkt.**
- GEMESSEN 28.10.2026 (Bulk-Abfrage, 56 618 aktive Produkte): auf dem Kanal «Google & YouTube» (`gid://shopify/Publication/302872297857`) liegen **54 745 Produkte mit 514 931 Varianten**, also das 3,4-fache der Grenze. 20 433 davon tragen `mm-google-shopping.excluded_destination = ["Shopping_ads"]` (207 114 Varianten); 778 sind Fortura/CH-Lager. Die nächtlichen Auswahl-Läufe fügen laufend Varianten hinzu.
- unbekannt: wie genau das Merchant Center zählt (der Bildschirm nennt 236 000 = 60,1 %, das ergibt rund 393 000 Artikel, die Shopify-Lesung 514 931 Varianten). Ob die Google-App das Ausschlussfeld beachtet, ist unbelegt. Die Regel unten hängt von beidem nicht ab: sie nimmt Produkte vom Kanal.

## Die Lösung: ein Schaufenster unter der Grenze

`automation/gmc_schaufenster.mjs` (Logik und Begründung: `automation/lib/gmc_schaufenster.mjs`, 87 Tests der Regel, 30 des Ablaufs mit Attrappen-Shop) hält die Zahl der Varianten auf dem Kanal unter einem **Budget von 90 000** (SETZUNG; Grenze 150 000, der Rest ist Platz für das Wachstum der Auswahl-Läufe bis zum nächsten Lauf).

| Stufe | Wer | Regel |
|---|---|---|
| 1 | Fortura/CH-Lager (Tags `fortura`, `ch-lager`) | immer, auch mit Ausschlussfeld |
| 2 | Marge A oder B (Tags `mengenrabatt-a`/`-b`) | immer (ohne Ausschlussfeld) |
| 3 | der Rest ohne Ausschlussfeld | bis das Budget voll ist; wenige Varianten zuerst; je Google-Kategorie (zwei Ebenen) höchstens 15 % des Budgets |
| nie | Sperrtag (`lib/kanal_sperren.mjs`), keine Google-Kategorie, `cj-ausgelistet`, `bild-zu-klein`, Variantenzahl unbekannt | |

GEMESSEN im Trockenlauf (Bulk-Daten 28.10.2026, 56 618 aktive Produkte): **28 105 Produkte gehen vom Kanal** (Ausschlussfeld 20 377, Kategorie-Deckel 7 554, Lieferbarkeit/Bild 100, Sperrtag 31, ohne Google-Kategorie 43), 26 640 bleiben (Stufe 1: 782, Stufe 2: 2 079, Stufe 3: 23 892 Produkte). Die Varianten auf Google sinken von **514 931 auf 80 117** (Budget 90 000, Quote 150 000). Der Deckel je Google-Kategorie (15 % des Budgets = 13 500 Varianten) greift bei Schuhen, Kleidung und Schmuck.

## Ablauf und Sicherheit

1. `node automation/gmc_schaufenster.mjs` (Vorgabe `PHASE=plan`, nur lesen): Zahlen, Gründe, Beispiele auf beiden Seiten, Plan nach `/tmp/gmc_schaufenster_plan.json`.
2. `LIVE=1 PHASE=abwaehlen [ONLY=handle,handle] [MAX=n|alle]`: `publishableUnpublish`, 10 je Anfrage. Nur mit der Freigabedatei `dropship/GMC-SCHAUFENSTER-FREI.txt` (löschen = Stopp). Das Manifest `dropship/gmc_schaufenster_manifest.jsonl` bekommt vor jedem Aufruf eine Zeile `ab-versucht` (ein Absturz verliert nichts); ein Produkt gilt erst nach frischem Rücklesen als abgewählt.
3. `PHASE=pruefen`: liest frisch und vergleicht mit Manifest und Plan (Exit 3 bei Abweichung).
4. **Rücknahme:** `LIVE=1 PHASE=aufnehmen` stellt zurück, was das Werkzeug abgewählt hat und was wieder passt (nie ein Produkt ohne Manifest-Eintrag, nie eines mit Sperrtag). `LIVE=1 PHASE=zuruecksetzen` ist die volle Rücknahme: alles zurück, was das Werkzeug abgewählt hat (ausser Sperrtag), auch Produkte mit Ausschlussfeld oder ausserhalb des Budgets.
5. Ein Plan mit Fehlern (unter 1 000 Zeilen, unter 500 Schaufenster-Produkten, über 140 000 Varianten danach, über 2 % unklare Zeilen, über 70 % abzuwählen, über 5 % ohne Google-Kategorie) schreibt nichts. Drosselung wird nie umgangen (Exit 4, der nächste Lauf macht idempotent weiter).
6. Der Publish-Guard (`INCLUDE_GOOGLE` aus) und `kanal_sperren.mjs` ziehen Google nicht nach, abgewählte Produkte kommen also nicht von selbst zurück.

## Offen / Entscheide

- **Wirkung im Merchant Center** ist von hier nicht messbar (kein Zugang): nach dem Lauf braucht Google Stunden bis Tage. Der Besitzer schickt dann den Screenshot «Needs attention» und «All products» (Zahl der Artikel).
- **Wiederholung:** weil die Auswahl-Läufe Varianten hinzufügen, braucht es mindestens wöchentlich einen Lauf (`PHASE=plan`, dann `abwaehlen`/`aufnehmen`). Noch kein Workflow; die Prüfroutine des Auswahl-Laufs ist der natürliche Ort.
- **Anzeigen mit CHF 58:** erst nach dem Lauf und nach einer Messung im Merchant Center sinnvoll (Standard-Shopping-Kampagne auf Stufe 1 und 2). Ein Label (`custom_label_0`) für die Stufen ist ein möglicher Folgeschritt; ob die Google-App das Metafeld liest, ist unbelegt.
- Das Ausschlussfeld: **wer es schreibt, ist unbekannt** (Oktober-Produkte tragen es nachträglich). Betroffen sind vor allem Spielzeug, Gadgets, Klemmbausteine und `viral`/`video-hit`-Produkte.
