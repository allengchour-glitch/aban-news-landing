# Silber «925» vorläufig auf Entwurf (17.11.2026, Besitzer «2 ja»)

**Zweck:** Bis die Schweizer Edelmetallkontrolle antwortet, stehen die Produkte mit «925» im Titel nicht mehr im Verkauf. Es wird nichts gelöscht: nur der Status ändert sich (dazu ein Arbeits-Tag). Hintergrund und Quellen: `../edel-test-1711/FRAGE-EDELMETALLKONTROLLE.md`, Brief: `ANFRAGE-EDELMETALLKONTROLLE.md`.

## Stand (GEMESSEN, unabhängig vom Skript nachgelesen)

- **LIVE 17.11.2026 09:48 bis 09:53 UTC:** **207 aktive Produkte** mit «925» im Titel stehen auf ENTWURF und tragen den Tag `bazg-gehalten-1711` (206 im Massenlauf, 1 in der Probe). Frischer Bulk-Katalog danach: 56 288 aktive Produkte (56 495 minus 207), **0 aktive mit «925» im Titel**; Admin-Zählung: 207 Entwürfe mit Tag, 0 aktive mit Tag.
- **Zahl korrigiert:** meine erste Angabe «129» stammte aus der Shopify-Suche `title:*925*`. Sie findet «S925…»-Titel nicht (78). Die Zahl aus einer Suche ist keine Zählung: der ganze Katalog wird per Bulk gelesen und lokal gefiltert (`liste.mjs`).
- **Kundensicht (curl mit Browser-Kopf):** die Produktseiten antworten HTTP 302 auf die Startseite (nicht 404: Plattformverhalten für Entwürfe, an fünf früheren Entwürfen bestätigt). Sammlungen im Hauptmenü: Silberringe 49 → 23, Silber-Ohrringe 46 → 11, Silberketten 47 → 12, Silberarmbänder 89 → 23 (Admin-Zählung = Storefront); die Chips «Silber-Ohrstecker», «Herz-Schmuck aus Silber», «Silber-Blumen & -Schmetterlinge» haben je 6; «Premium Schmuck» 78 → 52 aktive. Startseite HTTP 200 (die «925»-Treffer im HTML sind Ziffern in Bild-URLs). `moissanit-schmuck` (5 von 5 betroffen) hatte schon vorher eine 301-Weiterleitung auf `moissanit`: kein neuer leerer Kundenzugang.
- **Kanäle (GEMESSEN an einem Produkt mit 8 Kanälen, Shopify-Seite):** im Entwurf bleiben die Verknüpfungen erhalten, aber nur «vorgemerkt» (veröffentlicht 0 von 8 Einträgen); beim Aktivieren sind alle 8 sofort wieder veröffentlicht (Probe und Rücknahme-Test, je ohne Wartezeit und ohne erneutes Veröffentlichen). **Ungemessen:** ob Google & YouTube, Facebook & Instagram, TikTok und Pinterest die Artikel nach einer Rücknahme wieder annehmen (Merchant-Prüfung, Katalog-Abgleich: ein bis drei Tage beobachten).
- **Nichts betroffen:** 0 der 39 Bestellungen seit 21.06. enthalten eines dieser Produkte; der Metricool-Planer (80 Beiträge in 24 Tagen) verlinkt keines direkt; 7 feste Sammlungen enthielten welche (premium-schmuck 26, startseite-pool-schmuck 6 von 16, moissanit-schmuck 5, frauen-favoriten 2, bestseller, highlights und abend-look je 1).

## ⚠️ Umfang: «925 im Titel» ist nur etwa die Hälfte des Silbers (Entscheid des Besitzers offen)

Der Besitzer sagte Ja zu «925 im Titel». Zwei unabhängige Prüfer haben nachgemessen, was damit online bleibt (Bulk 17.11., Beschreibungen per Admin-API):

- rund **190 weitere aktive Schmuckprodukte** nennen 925, S925, Sterling oder 999 in Beschreibung oder Option, aber nicht im Titel (186 mit klarer Materialangabe);
- **30 Titel mit «Sterling…»** ohne 925 und 7 mit «999» (Sterlingsilber ist per Definition 925); mit der erweiterten Regel `925 | sterling | 999/990/950/900/835/800 + Silber` wären es **240 Titel, also 33 mehr** (alle 33 einzeln gelesen: eindeutig Silberware);
- in den vier Silber-Menüs bleiben **69 aktive Produkte**, bei 50 davon steht 925/Sterling/999 in Titel oder Beschreibung;
- **18 Sammlungen** sprechen weiter von «925er Sterlingsilber» (premium-schmuck, sub-ringe, sub-ohrringe, sub-halsketten, sub-armbaender, schmuck-sets, luxus-highend, luxestyle-premium, moissanit, moissanit-schmuck, frauen-favoriten, unter-30, creolen-ohrclips, zirkonia-moissanit-ketten und die vier Silber-Sammlungen), mehrere nennen Produkte der Liste beim Namen (`sub-armbaender`: «Cerchio» und «Onda»);
- Gold-/Platin-«plattiert» (115 Titel mit vergoldet/plattiert/18K) ist ein getrenntes, ungeklärtes Thema (Plaquéwaren stehen in der BAZG-FAQ, ob die Regel für sie greift, ist nicht gemessen).

Ich habe **nur die 207 genehmigten** auf Entwurf gesetzt. Eine Erweiterung ist ein weiterer, eigener Entscheid (die Silber-Menüs wären danach fast leer).

## Werkzeug

```
node dropship/silber-bazg-1711/liste.mjs                       Liste frisch lesen (nur lesen, Bulk ~1 Minute) → liste.json
node dropship/silber-bazg-1711/apply.mjs                       Trockenlauf (Vorgabe)
SICHERN=1 node …/apply.mjs                                     nur die Sicherung schreiben (Status, Tags, Kanäle je Produkt), der Shop bleibt unverändert
LIVE=1 PROBE=1 ONLY=<handle> node …/apply.mjs                  Probe an einem Produkt (Entwurf → aktiv → Kanäle prüfen → Entwurf); endet immer im Entwurf
LIVE=1 node …/apply.mjs                                        Massenlauf in Paketen zu 10, je Paket zurückgelesen (bis 5 Versuche), Halt beim ersten Fehler; verlangt eine bestandene Probe (Ledger, höchstens 24 Stunden alt)
ZURUECK=1 [LIVE=1] node …/apply.mjs                            Rücknahme, fortsetzbar
```

- **Sicherung vor dem Schreiben, atomar, im Repo:** `sicherung.json` (Status, Tags, Kanäle der 207 vor der Änderung) wurde mit `SICHERN=1` geschrieben und im Zweig committet und gepusht, bevor irgendetwas im Shop geändert wurde (Commit `7a9d471fc7`). Erledigte Rücknahmen wandern nach `sicherung_erledigt.json`. Ohne Sicherung endet die Rücknahme mit Exit 2 (nicht still mit 0).
- **Fortsetzbar nach Teilausfall:** «aktiv mit Tag» wird (wieder) auf Entwurf gesetzt, «Entwurf ohne Tag» nur dann nachgetaggt, wenn die Sicherung zeigt, dass wir ihn entworfen haben; fremde Entwürfe, ARCHIVED und UNLISTED werden nie angefasst.
- **Rücknahme in zwei Phasen:** erst Status und Tag, dann die Kanäle gegen die Sicherung prüfen (bis 60 Sekunden warten, ob sie von selbst kommen) und fehlende **einzeln** veröffentlichen (eine Verweigerung blockiert die anderen nicht). Exit 6, solange irgendwo Kanäle fehlen.
- **Ledger:** `ledger.txt` (`ISO|ART|handle|Text`); die Probe schreibt eine `PROBE`-Zeile, die das Tor des Massenlaufs liest.
- **Der Arbeits-Tag ist bewusst KEIN Sperr-Tag** (kein «nicht-live-…», kein «compliance-…»): die Kategorie-Engine und `sperr_sort_tags_entfernen.mjs` nehmen von Produkten mit Sperr-Tag die `sort-`-Tags weg; nach der Rücknahme fehlten sie dann in allen Sammlungen. Die Sperre ist der Status ENTWURF; kein Zeitplan-Automat setzt Entwürfe wieder auf aktiv (alle lesen `status:active`).
- **Rücknahme (ein Befehl):** `ZURUECK=1 LIVE=1 node dropship/silber-bazg-1711/apply.mjs`. Danach die Kanal-Apps (Google, Meta, TikTok, Pinterest) ein bis drei Tage beobachten.

## Prüfung

- **Test:** `node dropship/silber-bazg-1711/apply_test.mjs` (206 Prüfungen, im CI) gegen eine strenge Attrappe des Shops (Variablentypen und Argumentnamen, `first`-Grenze, `onlyPublished`, Felder in Dokumentreihenfolge, Lesen mit Verzögerung, Kanalverlust und späte Rückkehr, Fehler nur beim Status oder nur beim Tag, Ausnahmen mitten im Lauf, ein Produkt, das nach der Prüfung wieder aktiv wird). **Mutationsprobe:** `python3 dropship/silber-bazg-1711/mutationsprobe.py` (84 Mutanten, 84 erkannt, 0 überlebt; der erste Test liess 12 von 18 Mutanten eines Prüfers überleben, bevor die Attrappe verschärft wurde). Alle Mutationsformen zusätzlich offline gegen das echte Schema validiert (graphql-js, Introspektion der API 2025-01).
- **Vier unabhängige Prüfer (31 Agenten, jeder gewichtige Fund einzeln gegengeprüft; nur lesend):** Code, Shopify-Semantik, Folgen für den Shop, Brief. **Eingearbeitet:** Zwischenzustände fortsetzbar, Lesen mit Wiederholung statt einer Lesung nach 1,5 s, Rücknahme in zwei Phasen, Sicherung atomar und vor dem Schreiben im Repo, Rücknahme ohne Sicherung = Exit 2, Probe als Tor mit try/finally (endet immer im Entwurf), Gegenprobe über alle, Fehler im Ledger mit Handle, Brief gekürzt und neu gefasst. **Abgelehnt:** Arbeits-Tag als Sperr-Tag (siehe oben); Weiterleitungen für die 207 Adressen anlegen (die Rücknahme müsste sie wieder löschen, und eine Weiterleitung hat Vorrang vor einem veröffentlichten Produkt); die Titelregel stillschweigend erweitern (Entscheid des Besitzers). Mehrere Funde wurden von der Gegenprüfung herabgestuft oder widerlegt (Probe-Wartezeit «wichtig» → kein Fund: zwei live gelaufene Skripte lesen ohne Pause; Kanäle ausserhalb des Shops: Marktplatz-Inserate kein Fund).
- **Die echte Probe fand einen Fehler, den Test, Mutationsprobe und alle vier Prüfer übersehen hatten:** eine reine Status-Mutation deklarierte die Variable `$g` ohne sie zu benutzen, Shopify lehnt das ab (`variableNotUsed`). Die Probe brach ab und endete wie vorgesehen im Entwurf mit Tag. Behoben (`$g` nur bei Tag-Feldern), Attrappe und Test verschärft, Mutant ergänzt.

## Offen (Entscheide des Besitzers)

1. **Umfang erweitern?** Entwurf auch für «Sterling»/«999» im Titel (+33, eindeutig Silber) und/oder 925 in der Beschreibung (rund 190)? Dann sind die Silber-Menüs fast leer; die Alternative ist bewusst bei 207 zu bleiben.
2. **Brief senden?** Entwurf in Gmail, nichts gesendet; vorher die drei Entscheide in `ANFRAGE-EDELMETALLKONTROLLE.md` lesen (Name und Strafbestimmungen, Weg ohne Namen, Verkaufsstopp-Satz).
3. **Texte der 18 Sammlungen** («925er Sterlingsilber», Produktnamen) entschärfen oder stehen lassen.
4. **Neue 925-Produkte:** der Import und der nächtliche Grind können wieder Produkte mit «925» im Titel aktivieren; dieses Werkzeug erfasst nur den Stand von heute. Eine Wiedervorlage misst am 18.11. früh nach und setzt neue Treffer nach derselben Regel auf Entwurf, sofern es wenige sind.
5. Gold-/Platin-Plaqué: ungeklärt (Frage an die Behörde gehört nicht in den ersten Brief).

## Lehren

1. **Die erste echte Berührung findet, was Test und Prüfer nicht sehen:** die Attrappe prüfte «benutzt, aber nicht deklariert», nicht «deklariert, aber nicht benutzt». Jede Form einer erzeugten Anfrage gegen das echte Schema validieren (nicht nur die, die der Test benutzt), und die Probe an genau einem Produkt zuerst.
2. **Eine Zahl aus einer Suche ist keine Zählung** (129 gegen 207). Bulk-Katalog lokal filtern.
3. **Ein Arbeits-Tag darf kein Sperr-Tag sein**, wenn Automaten Sperr-Tag-Produkte aus Sammlungen oder ihren `sort-`-Tags nehmen.
4. **Die Sicherung gehört vor dem ersten Schreiben ins Repo**, atomar geschrieben, und ihr Fehlen ist ein Fehler.
5. **Eine Zusage an eine Behörde («vorsorglich vom Verkauf genommen») darf nur im Brief stehen, wenn sie für den ganzen Umfang gilt:** ein Prüfer fand, dass sie für etwa die Hälfte des Silbers nicht stimmte.
