# «Selbst gestalten»: Material (mit Preis) und Handymodelle zur Auswahl

Stand 27.10.2026. Auftrag des Besitzers (drei Screenshots): Poster nur «Grösse» (er will **Material**), Handyhülle nur iPhone-Modelle (er will auch **Samsung**),
Hoodie nur «Grösse» (er will **Material mit Preis** und «alle anderen Produkte auch zur Auswahl»). Druckpartner ist **Printful**.

**Zustand: gebaut, nach zwei unabhängigen Prüfungen korrigiert (Korrekturrunden 1 und 2, 27.10.2026), dazu Korrekturrunde 3 (28.10.2026) nach den Funden eines zweiten Modells (Codex, nur Lesen) und des ersten Prüfers der zweiten Runde (Tageslimit/Halbzustand, Lesegrenze, Vorab-Prüfung, Budget, Mutanten) und Korrekturrunde 4 (28.10.2026) nach dem Fund des Prüfers der dritten Runde (Optionswerte ohne Variante waren über `ProductOption.values` unsichtbar, siehe «Optionen lesen»); im Trockenlauf geprüft. Nichts wurde im Shop, bei Printful oder sonst wo geschrieben.**
Der Schreibweg (`LIVE=1`) ist nur gegen eine Attrappe getestet, nie gegen den echten Shop.
**LIVE ist für vier der fünf Produkte gesperrt, bis der Besitzer entschieden hat** (Abschnitt «Blocker-Befunde»). Frei ist nur die neue Samsung-Hülle (bleibt auch dann DRAFT, siehe «Freischalten»).

## Was das Werkzeug tut

`automation/pod_auswahl.mjs` (Trockenlauf ist die Vorgabe) legt je Produkt eine Option **«Material»** an Position 1 an und ergänzt neue Varianten.
Vorhandene Varianten bleiben unverändert (ID, SKU, Preis); sie bekommen nur den ersten Material-Wert.

| Produkt | Material-Werte | neu | gesamt | LIVE |
|---|---|---|---|---|
| `poster-zum-selbstgestalten` | Poster matt (vorhanden) · Foto-Glanzpapier · Leinwand · Gerahmt · Schwarz / Weiss / Eiche | 14 | 18 | **gesperrt (1 Befund)** |
| `unisex-hoodie-selbst-gestalten` | Baumwoll-Mix (vorhanden) · Premium-Baumwolle · Bio-Baumwolle | 11 | 19 | **gesperrt (3 Befunde)** |
| `unisex-t-shirt-selbst-gestalten` | Ringgarn-Baumwolle (vorhanden) · Klassische Baumwolle · Bio-Baumwolle · Heavyweight-Baumwolle | 24 | 33 | **gesperrt (1 Befund)** |
| `hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten` | Hartschale MagSafe (vorhanden) · Hartschale (601 matt) · Klare Hülle (181) | 32 | 48 | **gesperrt (2 Befunde)** |
| `samsung-huelle-selbst-gestalten` (**neu, DRAFT**) | Hartschale matt · Hartschale glänzend · Klare Hülle · Slim-Hülle × 23 Galaxy-Modelle (3 Bilder, siehe unten) | 84 | 84 | frei |

Dazu je Produkt ein Block **«Materialien im Vergleich»** in der Beschreibung, nur zwischen `<!-- lx-material-v1 -->` und `<!-- /lx-material-v1 -->` (idempotent).
Jede Angabe trägt einen Beleg (Printful-Produkt + wörtliche Textstelle); der Test prüft, dass die Textstelle in `beschreibungen.json` steht und jede Zahl im Beleg vorkommt.
Gibt es mehrere Materialien, sagt der Block ausdrücklich, dass sich der Text weiter oben auf das **vorhandene** Material bezieht.

## Ablauf des Schreibwegs, Tageslimit und Wiederaufnahme

Je vorhandenem Produkt (`erweitern`), alles gegen den frisch gelesenen Zustand und mit Rücklesen am Ende:
1. **Vorab prüfen** (ohne Schreibzugriff): Produkt-ID, vorhandene Varianten (SKU, Preis), Beschreibung ausserhalb unseres Blocks UND eine schon vorhandene Option «Material» wie im Plan, sonst Exit 3 vor dem ersten Schreibaufruf. Zur Option «Material»: alle ihre Werte müssen im Plan stehen (auch ein Wert **ohne** Variante, siehe «Optionen lesen»), die ursprünglichen Varianten tragen den Bestandswert (z. B. «Poster matt»), schon angelegte ihr Plan-Material. Eine von Hand angelegte Option (z. B. mit dem Wert «Holz») wird so abgelehnt, statt erst nach elf Schreibaufrufen aufzufallen; dieselbe Prüfung macht schon der **Trockenlauf** (Verstoss im Plan, Exit 1). Liest die Abfrage 250 Varianten oder gibt es eine weitere Seite (die Abfrage blättert nicht; alle Produkte des Plans haben höchstens 84), bricht das Werkzeug kontrolliert mit Exit 3 und klarer Meldung ab, statt eine falsche Wiederaufnahme zu berechnen.
2. Sicherung des Ausgangszustands nach `dropship/pod-sicherung/<handle>.json` (nie überschrieben).
3. Option «Material» anlegen (nur mit dem vorhandenen Wert; vorhandene Varianten bekommen ihn) und **die Optionsreihenfolge herstellen**: steht «Material» danach nicht an Position 1 (die Shopify-Doku verspricht für `position` nur «Position of the option»), sortiert `productOptionsReorder` alle Optionen in Planreihenfolge; wirkt das nicht, Exit 3, bevor irgendein Wert oder eine Variante entsteht. Der Schritt läuft bei **jeder** Ausführung, auch bei der Wiederaufnahme.
4. **Je neues Material, in Planreihenfolge: erst sein Optionswert, direkt danach seine Varianten** (Stücke zu 50). Anlegen des Wertes, Zurücklesen und Variantenanlage stehen in **einer** Fehlerbehandlung: jeder Abbruch dort löst das Aufräumen aus, auch ein Netzfehler **nach** dem Anlegen, dessen Antwort verloren ging. Das Aufräumen ist **zustandsbasiert**: nach frischem Lesen werden alle Werte der Option «Material» ohne jede Variante entfernt (nach der Vorab-Prüfung ist diese Option die eigene; nur Werte des Plans), Werte anderer Optionen (Grösse, Modell) nur, wenn dieser Aufruf sie ergänzt hat. Ein Wert mit mindestens einer Variante wird nie gelöscht, ein fremder Wert nie angefasst (er wird nur genannt). «Leer» heisst: Shopify meldet `hasVariants: false` **und** keine der frisch gelesenen Varianten trägt den Wert; gelöscht wird mit `optionValuesToDelete` über die Wert-ID aus `optionValues`. Ob ein Wert schon **existiert**, entscheidet `optionValues` (auch ein Wert ohne Variante): ein liegengebliebener leerer Wert wird beim nächsten Lauf nicht noch einmal angelegt (Shopify antwortete `OPTION_VALUE_ALREADY_EXISTS`), sondern mit seinen Varianten gefüllt. Darum repariert auch eine Wiederaufnahme, die sofort wieder am Tageslimit scheitert, einen liegengebliebenen leeren Wert. Vorher legte der Lauf **alle** neuen Werte an und erst dann die erste Variante: ein Limit bei der ersten Anlage hätte ein ACTIVE-Produkt mit ausgegrauten Werten zurückgelassen (Theme-Liquid `option_value.available = false`).
   **Was nicht zugesagt wird:** Ein Material mit nur **Teil** seiner Grössen (Abbruch zwischen zwei Stücken zu 50, z. B. 50 von 60) **bleibt bestehen**: Varianten werden nie gelöscht. Die Ausgabe nennt es «TEILWEISE angelegt: Leinwand (50 von 60 Grössen)»; die Wiederaufnahme legt die übrigen an. Kunden sehen bis dahin für dieses Material nur die angelegten Grössen. Auch ein Prozessabsturz (kill) mitten im Aufruf kann einen leeren Wert zurücklassen; den entfernt oder füllt die nächste Ausführung.
5. Beschreibung: nur der Block zwischen den Kommentarmarken, **vorher frisch gelesen**: hat ein anderer Prozess (Text-Pipeline, Lieferzeit-Korrektur, Editor-Skript) den Text ausserhalb des Blocks geändert, Exit 3 und nichts überschrieben.
6. Zurücklesen und mit dem Plan vergleichen (Abweichung = Exit 3).

**Das Produkt bleibt ACTIVE**: es wird nie auf DRAFT gesetzt (das nähme ein verkaufendes Produkt aus dem Shop). Neue Produkte (Samsung) entstehen als DRAFT. Ein vorhandener Handle wird nur übernommen, wenn es das eigene halb fertige DRAFT ist (Status, Titel, Verkäufer, Produktart, Tags, Optionsnamen wie im Plan, jede SKU aus dem Plan); sonst Exit 3 ohne jeden Schreibzugriff.

**Nach Exit 4 (Tageslimit) NICHT sofort wiederholen, sondern später denselben Befehl.** (Gilt ebenso nach einem anderen Abbruch, sobald die Ursache behoben ist.) Jeder Schritt legt nur an, was fehlt. Der Plan-Hash zählt neue und schon angelegte Varianten zusammen und bleibt darum bei der Wiederaufnahme **gleich** (der geprüfte Plan gilt weiter, kein neuer Trockenlauf nötig, **solange die Daten höchstens 72 Stunden alt sind**: sonst verweigert LIVE, zuerst `DATEN=holen`; ein Stand in der Zukunft gilt als nicht frisch). Die Ausgabe nennt den Zustand, aus dem frisch gelesenen Shop gebaut («n von m geplanten neuen Varianten im Shop, TEILWEISE angelegt: …, leerer Wert wieder entfernt, Wiederaufnahme: …»). Bleibt nach dem Aufräumen ein leerer Wert stehen, steht «ACHTUNG: leerer Wert …» da; die Wiederholung **sieht** ihn (Existenz über `optionValues`) und füllt ihn mit Varianten, oder sie entfernt ihn, wenn sie wieder am Tageslimit scheitert.
**Variantenbudget:** `VARIANT_BUDGET` wird bei jedem Produkt um das gekürzt, was es im Shop angelegt hat, auch wenn es mit einem gewöhnlichen Fehler endet (gezählt wird, was frisch gelesen im Shop steht, nicht nur was bestätigt wurde).
Shopify nennt den Rest des Tageslimits **nicht** (gemessen ca. 9 500 neue Varianten je Tag für den ganzen Shop, geteilt mit dem Nachtlauf um 21:50 UTC). Ist er bekannt (z. B. aus dem Nachtlauf-Protokoll), gibt `VARIANT_BUDGET=<n>` ihn vor: ein Produkt, das nicht mehr hineinpasst, wird gar nicht begonnen (Exit 4, nichts Halbes). Empfehlung: **nicht parallel zum Nachtlauf starten** und das erste echte Produkt allein (`ONLY=`), mit Blick auf das Protokoll.

### Optionen lesen: `optionValues { id name hasVariants }`, nie `ProductOption.values` (Korrekturrunde 4)

Der Prüfer der dritten Runde fand eine falsche Annahme über Shopify: Das Werkzeug las `options { name position values }`, und die Attrappe der Tests lieferte dort auch Werte **ohne** Variante. Shopify tut das nicht.
Beleg (Schema und Doku, am 28.10.2026 abgefragt): `ProductOption.values` = «The corresponding value to the product option name», `ProductOption.optionValues` = «Similar to values, option_values returns all the corresponding option value objects to the product option,
including values not assigned to any variants». Die Doku von `productOptionUpdate` (Beispiel «Add and update product option values», Version 2026-01) zeigt es: nach dem Anlegen von «Yellow» und «Red» antwortet Shopify
`values: ["Purple"]`, aber `optionValues`: Purple `hasVariants: true`, Yellow `false`, Red `false`. `optionValuesToDelete` verlangt die ID aus `optionValues` (`ProductOptionValue`), die Option wird über ihre ID genannt.
Ein liegengebliebener leerer Wert war über `values` für die Wiederaufnahme **unsichtbar**: sie legte ihn erneut an, Shopify antwortete `OPTION_VALUE_ALREADY_EXISTS`, der Lauf endete mit Exit 1 statt 0 oder 4, und der Wert wurde erst im übernächsten Lauf gefüllt.

Seitdem gilt in **allen** Lesepfaden (`BESTAND_Q`, `Q_PRODUKT`, `leseFrisch`, Antworten der Schreibaufrufe; eine Stelle: `OPTIONEN_FELDER` in `lib/pod_auswahl_daten.mjs`):
- **Existenz** eines Werts = er steht in `optionValues` (die Namen heissen im Werkzeug `values`, bewusst **nicht** Shopifys `values`);
- **leer** = `hasVariants: false` (und keine gelesene Variante trägt ihn), unbekannt (Angabe fehlt) wird nie angefasst;
- **Löschen** = `optionValuesToDelete` mit der ID aus `optionValues`;
- fehlt `optionValues` in einer Antwort, bricht das Werkzeug mit klarer Meldung ab (kein stiller Rückgriff auf `values`).
Die Tests-Attrappe verhält sich jetzt wie Shopify: `values` nennt nur Werte mit mindestens einer Variante, `optionValues` alle mit `hasVariants` (auch nach `productVariantsBulkCreate`), es kommen nur die Felder der Abfrage, ein schon vorhandener Name beim Anlegen
ergibt `OPTION_VALUE_ALREADY_EXISTS`, das Löschen eines Werts mit Varianten `OPTION_VALUE_HAS_VARIANTS` (beide Codes stehen in `ProductOptionUpdateUserErrorCode`). Strenger als Shopify bleibt sie bei einem Punkt:
`productVariantsBulkCreate` legt laut Doku einen fehlenden Optionswert selbst an, die Attrappe verlangt ihn vorher.

**Datenpaket und Plan-Hash blieben unverändert.** Am 28.10.2026 gelesen (`values` neben `optionValues`): in den vier Bestandsprodukten und in den 100 zuletzt geänderten Produkten des Shops trägt jeder Wert mindestens eine Variante, `values` und die Namen aus
`optionValues` sind gleich. `bestand.json` behält darum die Form `{name, position, values}` (der Plan braucht nur die Namen der vorhandenen Werte; IDs und `hasVariants` gehören zum frischen Lesen des Schreibwegs, nicht in ein Paket, das veraltet).
Gemessen ist damit nur der Normalfall; den **leeren** Wert belegen Schema und Doku, nicht eine Live-Messung (es wurde keiner gefunden, und der Test schreibt nichts).
Folgen: (a) die Wiederaufnahme füllt einen liegengebliebenen leeren Wert, ohne ihn neu anzulegen; (b) scheitert sie wieder am Tageslimit, wird er entfernt; (c) eine von Hand angelegte Option «Material» mit leerem Fremdwert («Holz») meldet schon der **Trockenlauf** (Verstoss) und der Schreibweg **vor dem ersten Schreibaufruf** (Exit 3).
**Grenze:** Blieb nach einem doppelten Fehler (Antwort verloren und Aufräumen gescheitert) ein leerer Wert einer anderen Option (Grösse, Modell) stehen, den dieser Aufruf ergänzt hatte, gehört er beim nächsten Trockenlauf zu den vorhandenen Werten dieser Option; der Plan-Hash kann sich dann ändern (neuer Trockenlauf nötig, statt dass der Rest unbemerkt bleibt).

## Blocker-Befunde: LIVE für das Produkt gesperrt, bis der Besitzer entschieden hat

Jeder Befund wird **einzeln** bestätigt: `BEFUND_OK=<handle>:<code>` (nie pauschal für ein Produkt, sonst deckt eine alte Bestätigung einen neuen Befund zu).
Der Befundtext in `nicht_angelegt.md` nennt die Wege samt gerechneten Zahlen. `LIVE=1` ohne Bestätigung beendet den Lauf mit Exit 5.

| Produkt | Code | Was | Wege |
|---|---|---|---|
| Hoodie | `sku-anderes-produkt` | Die vorhandenen SKUs `1726823_5426–5433` sind bei Printful das **Crewneck-Sweatshirt** (Produkt 145, Gildan 18000), nicht der Hoodie Gildan 18500 (146, White = 5522–5529). | (1) Material ehrlich «Sweatshirt (Rundhals)» nennen, SKUs bleiben; (2) SKUs auf 5522–5529 umstellen: Einkauf 22.63–30.63 statt 19.17–27.17 USD, Preise nach Regel S–XL 46.90 statt 38.90 … 5XL 63.90 statt 55.90 (Versand 11.39 USD gemessen); (3) Sweatshirt und Hoodies als zwei Produkte. Umstellung und Umbenennung sind nicht Teil des Werkzeugs. |
| Hoodie | `sku-in-anderem-produkt` | «Premium-Baumwolle» (Cotton Heritage M2580, White): 6 der Varianten gibt es im Shop schon als eigenes Produkt `premium-hoodie-selbst-gestalten` (DRAFT, Tags u. a. `ghost-sale-risiko`, `keine-lieferanten-ref`, deren Bedeutung nicht im Repo steht), Preis dort 56.90–64.90, hier geplant 57.90–66.90. | `OHNE=unisex-hoodie-selbst-gestalten:Premium-Baumwolle` (Einzelprodukt bleibt) oder Einzelprodukt ablösen/umleiten, Preise angleichen, dann `BEFUND_OK=…:sku-in-anderem-produkt` |
| T-Shirt | `sku-in-anderem-produkt` | «Klassische Baumwolle» (Gildan 5000, White): 8 Varianten gibt es schon als `klassisches-unisex-t-shirt-selbst-gestalten` (ACTIVE), Preis dort 23.90–38.90, hier 24.90–36.90. Der dortige Preis 23.90 (S–XL) liegt mit Netto 11.70 unter der Regel von 12. | `OHNE=unisex-t-shirt-selbst-gestalten:Klassische Baumwolle` oder Einzelprodukt ablösen, Preise angleichen (Netto prüfen), dann `BEFUND_OK=…` |
| Poster, Hoodie, iPhone | `material-metafeld` | Das Produkt-Metafeld `mm-google-shopping.material` ist **ein** Wert je Produkt (Poster «Papier (matt)», Hoodie «Baumwolle, Polyester, Elastan», iPhone «Polycarbonat, Polyurethan (TPU)», T-Shirt leer; am 27.10.2026 frisch gelesen) und speist das Merchant-Attribut «material» UND die Zeile «Material» in «Spezifikationen & Details». Nach LIVE gäbe es mehrere Materialien, der Wert stimmt nur für das vorhandene: **ein stilles Falschbild** in Feed und Produktseite. **Das Werkzeug schreibt dieses Feld NIE** (weder leeren noch überschreiben; ein Test hält es fest). | (a) Feld vor LIVE leeren (dann entfallen Zeile und Merchant-Attribut; der Befund verschwindet von selbst), oder (b) bewusst stehen lassen und `BEFUND_OK=<handle>:material-metafeld` setzen: Feed und Spezifikationen nennen dann auch für die neuen Materialien nur den alten Wert (bei personalisierter Ware ohne Rückgabe). Der Text im Haupttext ausserhalb des Blocks bleibt davon getrennt (Hinweis `text-ausserhalb-block`). |
| iPhone | `magsafe-irrefuehrend` | Titel und Fliesstext versprechen MagSafe®; nur «Hartschale MagSafe» hat die Magnete, «Hartschale» (601) und «Klare Hülle» (181) nicht. 32 der 48 Varianten betroffen. Bei personalisierter Ware ist die Rückgabe ausgeschlossen (`ls-pod-retoure`), ein Fehlkauf wäre nicht rückgängig zu machen. | (1) Titel und Text von Hand «entmagsafen», MagSafe® nur beim Material «Hartschale MagSafe» nennen (danach verschwindet der Befund von selbst); (2) `OHNE=<handle>:Hartschale,<handle>:Klare Hülle`; (3) statt Printful 181 die MagSafe®-Klarhülle 799 nehmen (Änderung der Spezifikation). Der Materialblock sagt bei «Hartschale» und «Klare Hülle» schon «ohne MagSafe®-Magnete». |

Mit `ONLY=samsung-huelle-selbst-gestalten` läuft das freie Produkt (oder ein Produkt, dessen Befunde bestätigt sind); die gesperrten werden dann nicht angefasst und der Lauf endet mit Exit 0.

**Samsung-Metafeld «material»:** ein Wert für vier Ausführungen. Der Plan nennt nur, was für alle vier belegt ist: «Polycarbonat (PC), bei der Hartschale mit Innenfutter aus Polyurethan (TPU)» (das TPU-Innenfutter steht nur in der Printful-Beschreibung der Hartschale 686; vorher stand für alle vier «Polycarbonat, Polyurethan (TPU)»).
**Samsung-Bilder:** drei statt vier. Die Bilder «Hartschale matt» (686/21474) und «Hartschale glänzend» (686/21473) sind byte-identisch (md5 `40a33932fc6a72b8dc93722d5c7de61e`, je 31 841 Byte, am 27.10.2026 erneut gemessen); zwei Medien mit den Alt-Texten «matt» und «glänzend» behaupteten etwas, das das Bild nicht zeigt. Es bleibt eines mit dem neutralen Alt-Text «Hartschale – blanko».

### Freischalten der Samsung-Hülle (Besitzer, nach dem Anlegen)
Das Werkzeug legt das Produkt als **DRAFT** an; ein DRAFT ist in keinem Verkaufskanal. Das iPhone-Produkt hängt in 8 Verkaufskanälen und 7 Sammlungen (gelesen 27.10.2026: bestseller-unter-50, selbst-gestalten, selbst-gestalten-1, sg-accessoires, sg-alle, handy-huellen, handy-halterungen). Nach dem Aktivieren von Hand:
1. Bilder und Editor ansehen (Vorschau), Status auf ACTIVE setzen.
2. In den Verkaufskanälen veröffentlichen (mindestens Online Store und Google & YouTube; Merchant-Center prüft danach das Material-Metafeld).
3. Sammlungsmitgliedschaft prüfen (handy-huellen, selbst-gestalten, sg-accessoires, sg-alle; `sort-handy-halterungen` fehlt mit Absicht: das ist die MagSafe-Sammlung der iPhone-Hülle).
4. Das Tag `bild-ok` (Stempel der Bildprüfung) fehlt mit Absicht, bis die Bildprüfung für dieses Produkt gelaufen ist.

## Hinweise (sperren nicht, stehen in `nicht_angelegt.md`)

- **Text ausserhalb des Blocks** (`text-ausserhalb-block`): Der Haupttext beschreibt weiter nur das vorhandene Material. Poster: «Mattes Premium-Papier», «Premium-Matt-Papier, randlos bedruckt», «30×40 bis 70×100 cm».
  T-Shirt: 142 g/m², «100 % gekämmte und ringgesponnene Baumwolle», «Vorgewaschener Stoff», «Material: Baumwolle, Polyester». Hoodie: «Sweatshirt», 50 % Baumwolle / 50 % Polyester, «Elastan». iPhone: «Mattes oder glänzendes Finish» (es gibt nur matt und klar).
  Titel und Haupttext werden **nicht angefasst** (Auftrag: nur zwischen den Kommentarmarken ändern). Der Plan sucht die Stellen frisch im Shop-Text und zitiert sie wörtlich; der Block verweist auf den Unterschied.
  **Besitzerentscheid:** Texte materialneutral fassen und Zahlen nur im Block nennen.
- **Preisleiter** (`preisleiter-nicht-monoton`): Foto-Glanzpapier A2 (CHF 25.90) ist grösser und billiger als 30×40 (CHF 28.90), wegen Printfuls Katalogpreis (A2 10.25 USD, 12×16″ 13.53 USD); auch billiger als Poster matt A2 (28.90). Die Regel ist eingehalten, im Shop wirkt es unstimmig.
  Besitzer: A2 auf mindestens den Preis von 30×40 anheben (weicht von «kleinster X.90» ab) oder weglassen.
- **Katalog-Lücken** (fünf Kombinationen des Posters, die Printful nicht führt): Foto-Glanzpapier/70×100, Leinwand/A2, Gerahmt Schwarz/Weiss/Eiche je 70×100. Dazu Gerahmt Schwarz 50×70 (Printful 9358, in der EU nicht lieferbar). Alle stehen in `nicht_angelegt.md`; nichts wurde erfunden.
- **Netto ohne Kundenversand** (`netto-nur-mit-kundenversand`): siehe Preisregel.

## Preisregel (`automation/lib/pod_preise.mjs`)

USD→CHF 0.90 · Richtwert = max(Einkauf × 2.3, Einkauf + 12) · Netto ≥ 12 CHF nach Printful-Versand (CH, je Variante, `STANDARD`) und Zahlungsgebühr (3.4 % + 0.30 CHF auf den Erlös) ·
Erlös = Preis + (Preis < 50 ? 7 : 0) · Endpreis = kleinster Wert X.90, der beides erfüllt · über 149.90 oder ohne EU-Lager bei Printful: nicht angelegt (steht im Bericht).
`printful_reprice.priced()` rundet mit `ceil(x) − 0.10` und kann den Richtwert um bis zu 0.10 unterschreiten (Richtwert 21.00 → 20.90); hier nicht.
Die MwSt. ist in der Regel nicht abgezogen (so war der Auftrag formuliert).

**Annahme der Vorgabe: Netto ≥ 12 gilt unter CHF 50 nur, solange der Kunde die CHF 7 Versand zahlt**, die Variante also allein im Warenkorb liegt. Liegt sie mit anderer Ware im Warenkorb ab CHF 50, entfällt der Versandbeitrag
und das Netto sinkt (Beispiel 5599797_11576: Preis 24.90, Erlös 31.90 → Netto 12.67; ohne die 7 CHF 5.90). Gemessen am Plan (27.10.2026): 144 der 165 neuen Preise liegen unter CHF 50, bei 140 davon wäre das Netto ohne Kundenversand unter 12 CHF
(tiefstes 5.69: iPhone- und Samsung-Hüllen 21.90). Die Tabelle weist deshalb eine zweite Spalte **«Netto ohne Kundenversand CHF»** aus, der Plan einen Hinweis je Produkt. Das ist die vorgegebene Regel, kein Fehler im Code.

## Dateien

| Datei | Inhalt |
|---|---|
| `automation/pod_auswahl.mjs` | Kommando: Trockenlauf, `DATEN=holen`, `DATEN=skuindex`, `LIVE=1` |
| `automation/lib/pod_auswahl_spec.mjs` | Spezifikation (nur Daten): Materialien, Printful-Nummern, Belegtexte, Textkonflikte, Samsung-Produkt |
| `automation/lib/pod_auswahl_plan.mjs` | Planrechnung, rein (Spezifikation + Katalog + Versand + Bestand + SKU-Index → Aktionen mit Preisen und Befunden) |
| `automation/lib/pod_preise.mjs` | Preisregel, rein |
| `automation/lib/pod_auswahl_daten.mjs` | Datenpaket laden/auffrischen (nur lesende Abfragen), SKU-Index |
| `automation/lib/pod_auswahl_gql.mjs` | GraphQL-Zugang des Schreibwegs: Mutationen werden **nie still wiederholt** (siehe unten) |
| `automation/lib/pod_auswahl_schreiben.mjs` | Schreibweg (nur hinter `LIVE=1`), mit hineingereichtem `gql`; Exit-Codes |
| `automation/lib/printful_platzierung.mjs` + `automation/printful_sync.mjs` | Fix der Druckplatzierung (siehe unten) |
| `dropship/pod-auswahl/*.json` | Datenpaket (Katalog, Beschreibungen, Versand, Bestand mit Material-Metafeld, SKU-Prüfung, SKU-Index), gemessen 27.10.2026; `platzierung_mitschnitte.json` = ECHTE Printful-Antworten (GET /products/variant/<id>, gekürzt) als Prüfdaten der Platzierung |
| `automation/printful_sync_test.mjs` | Verhaltenstest des Bestellwegs: `printful_sync.mjs` läuft in einem Kindprozess gegen gefälschtes `fetch` (Hülle/Tasse/Poster/Shirt, 503/429/404/Netzfehler); geprüft wird, was an Printful geht |
| `automation/pod_auswahl_mutation.mjs` | Mutationsprobe (197 absichtliche Fehler) |

`sku_index.json`: welche der neuen Printful-Nummern im Shop schon in **anderen** Produkten als SKU stehen (Abfrage `tag:wunschdesign OR tag:printful_personalized_product OR sku:*_*`, 491 Produkte gelesen).
Ohne den Index meldet der Plan «nicht geprüft» statt zu raten.

## Befehle

```bash
# Trockenlauf mit frischer Shopify-Abfrage (nur lesend); schreibt nach /tmp/pod_auswahl/ (plan.json, tabelle.md/.csv, nicht_angelegt.md, beschreibungen/, samsung_payload.json)
/opt/node22/bin/node automation/pod_auswahl.mjs
OFFLINE=1 /opt/node22/bin/node automation/pod_auswahl.mjs          # nur mit dem Datenpaket
ONLY=samsung-huelle-selbst-gestalten /opt/node22/bin/node automation/pod_auswahl.mjs
OHNE='unisex-t-shirt-selbst-gestalten:Klassische Baumwolle' /opt/node22/bin/node automation/pod_auswahl.mjs   # Material nicht aufnehmen (ändert den Plan-Hash)
DATEN=holen /opt/node22/bin/node automation/pod_auswahl.mjs        # Datenpaket auffrischen (Printful GET/Versandberechnung, Shopify-Abfrage); holt ALLES neu, auch alle Versandraten (sonst wäre der Stand «heute» gelogen)
DATEN=skuindex /opt/node22/bin/node automation/pod_auswahl.mjs     # nur den SKU-Index auffrischen (Shopify-Abfrage)
```

LIVE (erst nach Ansehen des Plans und nach den Entscheiden; Reihenfolge Poster, Hoodie, T-Shirt, iPhone, Samsung; mit `ONLY=` zuerst ein einzelnes Produkt, das erste echte Produkt zwingend allein, z. B. das Poster, und das Protokoll ansehen):
`LIVE=1 PLAN=/tmp/pod_auswahl/plan.json ONLY=poster-zum-selbstgestalten BEFUND_OK=poster-zum-selbstgestalten:material-metafeld node automation/pod_auswahl.mjs`. Der frisch berechnete Plan muss dem geprüften (Hash) gleichen, sonst Exit 3.
`OHNE=` muss im Trockenlauf und bei `LIVE=1` gleich gesetzt sein.
**Vor dem Schreiben prüft LIVE zwei Dinge über die Printful-Daten** (der Plan-Hash prüft sie nicht, Trockenlauf und LIVE lesen dieselbe Datei):
(1) **Alter**: Katalog (EU-Lager, Einkaufspreise), Beschreibungen, Versandraten und SKU-Prüfung dürfen höchstens `DATEN_MAX_ALTER_H` Stunden alt sein (Vorgabe **72**; Stand 0 Uhr UTC); ältere oder undatierte Daten verweigert LIVE mit Exit 1 («zuerst DATEN=holen, Trockenlauf neu ansehen»). Der Trockenlauf warnt nur. Die Grenze lässt sich ausdrücklich ändern.
(2) **Gegenprüfung**: mit `PRINTFUL_API_KEY` wird jede NEUE Variante des Plans per `GET /products/variant/<id>` gegen Einkaufspreis und EU-Lager gelesen (rund 0,7 s je Variante); jede Abweichung ist Exit 3. Abschaltbar mit `PRINTFUL_PRUEFEN=0` (dann schützt nur die Altersgrenze; die Ausgabe sagt es).
`VARIANT_BUDGET=<n>`: siehe «Ablauf des Schreibwegs». Vor dem ersten Schreiben: Sicherung `dropship/pod-sicherung/<handle>.json` (nie überschrieben). Danach frisch zurücklesen und mit dem Plan vergleichen (Abweichung → Exit 3).
Ledger `dropship/pod_auswahl_ledger.txt` (nur Erfolge werden übersprungen). Rückgängig ist nicht automatisiert: die neuen SKUs stehen im Plan, die Ausgangszustände in `pod-sicherung/`.

**Exit-Codes** (die letzte Zeile der Ausgabe nennt den Grund: «ENDE: Exit n – …»; ein Wrapper darf «0» nur sehen, wenn wirklich alles Geplante ausgeführt ist):

| Exit | Bedeutung |
|---|---|
| 0 | alles Geplante ausgeführt (oder laut Ledger schon erledigt) |
| 1 | mindestens ein Produkt mit FEHLER, drei Fehler in Folge, Eingabefehler oder Verstoss im Plan |
| 3 | Abweichung: Zustand im Shop ≠ Plan (Lauf sofort beendet); auch eine fremde Option «Material», ein Produkt mit 250 oder mehr Varianten (nicht vollständig lesbar) |
| 4 | `VARIANT_THROTTLE_EXCEEDED`: Tageslimit für neue Varianten erreicht, oder `VARIANT_BUDGET` reicht für das nächste Produkt nicht (heute nicht weiter; **nicht sofort wiederholen, später derselbe Befehl setzt den Lauf fort**, der Plan-Hash bleibt gleich, solange die Daten höchstens 72 Stunden alt sind; der Auswahl-Lauf der Nacht braucht dasselbe Limit, 165 neue Varianten) |
| 5 | mindestens ein Produkt im Lauf GESPERRT (Blocker-Befund nicht bestätigt); mit `ONLY=` ausserhalb der gesperrten Produkte wird daraus 0 |

**Mutationen werden nie still wiederholt** (`pod_auswahl_gql.mjs`). `lib/shopify_gql.mjs` ist für lesende Wächter gebaut und wiederholt bei Netzfehler, Zeitüberschreitung und HTTP 5xx bis zu sechsmal. Bei einer Mutation wäre das gefährlich:
war die erste Anfrage schon ausgeführt und nur die Antwort ging verloren, legt die Wiederholung zum Beispiel mit `productSet` ein zweites Samsung-Produkt mit 84 Varianten an und verbraucht das Tageslimit. Darum bekommen Mutationen `versuche: 1`;
nur eine nachweislich nicht ausgeführte Anfrage (`Throttled`, HTTP 429) wird mit wachsender Pause wiederholt, das Tageslimit nie. Der nächste Lauf liest den Shop frisch und ergänzt, was fehlt.

## Platzierung der Druckdatei (`printful_sync.mjs`)

`placementFor()` verglich die Shopify-`productType`-Zeichenkette («Handy-Zubehör», «Tassen & Becher», «Accessoires») mit Printful-Typen (`PHONE-CASE`, `MUG` …); Hüllen, Tassen, Flaschen gingen als `front` an Printful. **Belegt** ist nur, dass der Printful-Katalog für diese Produkte ausschliesslich `default` (und `preview`) führt; eine Ablehnung der Bestellung durch Printful ist im Repo nicht belegt (`dropship/ABEND-TODO.md` Zeile 26 verlangt noch 1–2 Test-Bestellungen).
Jetzt: echter Printful-Typ der Variante (`GET /products/variant/<id>` → `product.type`, `product.files`), mit Zwischenspeicher, Rückfall auf die alte Zuordnung (`lib/printful_platzierung.mjs`).
Eine Platzierung → diese; Einzel-Typ → `default`; Bekleidung → `front`/`back` (die Printful-Doku zeigt `"type": "front"` am T-Shirt 4011; der Katalog nennt dieselbe Vorderseite `default`; die Datei trägt dort id `default`, type `front`).

**Wann der Auftrag Entwurf bleibt statt bestätigt zu werden** (`needReview`: kein `?confirm=1`, Tag `printful-review`, Telegram-Meldung):
- Die Variantenabfrage scheitert (Netzfehler, Zeitlimit 20 s, 408, 429, 5xx) und bleibt nach **drei Versuchen** mit wachsender Pause (bei 429 gilt `Retry-After`, höchstens 30 s) erfolglos, oder Printful antwortet 404/ohne Produktangaben, **und** die Shop-Produktart steht nicht in der alten Liste (MUG, PHONE-CASE, STICKER, POSTER, CANVAS, MAGNET): dann wäre `front`/`back` aus Unwissen geraten. Vorübergehende Fehler werden **nicht** dauerhaft gemerkt (404 schon).
- Die Dateiliste des Printful-Produkts kennt die gewünschte Seite nicht (vorne: weder `default` noch `front`; hinten: kein `back`). Gemessen: Jogginghose Printful 400 (right_leg, left_leg, label_inside), Rucksack 279 (nur vorne), Baumwolltasche 1553 (embroidery_apparel_front/back). Die Antwort bleibt wie bisher (`front`/`back`), aber ungesichert.
- Die Kontrolle der Druckdatei (Gemini) meldet FAIL (wie bisher).
Der Bestellweg ist **per Verhaltenstest** abgesichert (`automation/printful_sync_test.mjs`, gefälschtes `fetch`), nicht mehr per Regex auf den Quelltext.
**Nicht gelöst (gemessen, nicht Teil dieses Auftrags):** 9 POD-Produkte tragen eine SKU ohne «_<Zahl>» (MUGSET-KINGQUEEN-11, MUGSET-MRMRS-11, MUGSET-HERHIS-11, MUGSET-HUBWIF-11, SHIRT-KQ-KING-S, SHIRT-MM-MR-S, SHIRT-HH-HERKING-S, SHIRT-HW-HUBBY-S, WM-TRIKOT-RO-S); `printful_sync` kann dort keine Printful-Variante decodieren, sie landen immer in «SKU ohne Printful-Variante» und damit in der Prüfung. Für sie wird nie eine Platzierung ermittelt.

## NICHT anwenden: `printful_reprice` auf «Selbst gestalten»

Der manuelle Workflow «Printful-Reprice» (`.github/workflows/printful-reprice.yml`, `automation/printful_reprice.mjs`, Vorgabe-Tag `wunschdesign`) setzt mit `apply=true` jeden Preis auf `ceil(max(Einkauf × 2.3, Einkauf + 12)) − 0.10`,
**ohne Versand und Gebühr**. Er würde 43 der 165 neuen Preise senken, 40 davon unter Netto 12 CHF (Beispiele: Glanz-A2 von 25.90 auf 21.90, Netto 8.95; gerahmt A2 von 106.90 auf 100.90, Netto 6.73).
Darum **überspringt `printful_reprice.mjs` die fünf Produkte aus `pod_auswahl_spec.mjs`**; `AUCH_AUSWAHL=1` hebt die Sperre auf (nur mit Absicht). Die Preise dieser Produkte kommen aus `lib/pod_preise.mjs` (`endpreis()`).

## Prüfung

```bash
for t in automation/lib/pod_preise_test.mjs automation/lib/printful_platzierung_test.mjs automation/lib/pod_auswahl_plan_test.mjs \
         automation/lib/pod_auswahl_daten_test.mjs automation/lib/pod_auswahl_gql_test.mjs automation/lib/pod_auswahl_schreiben_test.mjs automation/pod_auswahl_test.mjs \
         automation/printful_sync_test.mjs; do /opt/node22/bin/node $t | tail -1; done
/opt/node22/bin/node automation/pod_auswahl_mutation.mjs     # alle Mutanten müssen erkannt werden (Zahl: siehe Schrittname im Workflow)
bash automation/ci_simulation.sh                              # CI nachspielen (nach dem Commit)
```

## Offen (Entscheide des Besitzers, keine Fehler im Code)

- **Samsung ohne Wiederaufnahme für fehlende Varianten.** Die Wiederaufnahme (Aufräumen, Nachziehen, Hash) gilt nur für die vier vorhandenen Produkte (`erweitern`). Die neue Samsung-Hülle entsteht mit **einem** `productSet`; ob Shopify bei Erreichen des Tageslimits atomar scheitert (alles oder nichts), ist **nicht belegt**. Ein vorhandenes eigenes DRAFT mit weniger Varianten als geplant besteht die Vorprüfung des Handles, schreibt die Metafelder erneut und endet mit Exit 3 («Variantenzahl 44 ≠ 84»), **ohne Varianten nachzuziehen**. Ein solcher Teilzustand ist von Hand zu bereinigen (das DRAFT löschen und neu anlegen lassen, oder fehlende Varianten ergänzen). Schutz davor: `VARIANT_BUDGET` (Vorprüfung, optional) und das Anlegen als DRAFT.
- Die sieben Blocker-Befunde oben (Poster 1, Hoodie 3, T-Shirt 1, iPhone 2).
- Texte ausserhalb des Blocks materialneutral fassen (Poster, T-Shirt, Hoodie, iPhone); Preisleiter Foto-Glanzpapier A2.
- Vorhandene Preise tragen teils unter 12 CHF Netto (nur Hinweis, nicht geändert): Poster 30×40 (11.74), mehrere T-Shirt-Grössen (z. B. 5599797_9526: 10.44).
- **Produkt-Metafeld `mm-google-shopping.material`** (Befund `material-metafeld`, sperrt LIVE): ein Wert je Produkt für Merchant-Attribut UND Zeile «Material» in den Produktdetails. Das Werkzeug schreibt es nie; der Besitzer leert es vor LIVE oder bestätigt bewusst, dass es stehen bleibt (siehe Blocker-Tabelle). Der Text ausserhalb des Blocks (z. B. Hoodie «Sweatshirt, 50 % Baumwolle/50 % Polyester») bleibt davon getrennt (Hinweis `text-ausserhalb-block`).
- **Variantentitel ändern sich zwangsläufig** (Besitzerentscheid vor LIVE): `productOptionsCreate` setzt für jede vorhandene Variante den ersten Wert der neuen Option; aus dem Titel «30×40 cm» wird «Poster matt / 30×40 cm» (Shopify-Doku, Beispiel LEAVE_AS_IS). ID, SKU, Preis und Bestellungen bleiben, aber **Bestellbestätigungen, Rechnungen, Admin-Listen und Versandetiketten zeigen den Titel mit «Material / …»**. Theme-Abschnitte, die `option1` oder den Variantentitel auswerten, vorher prüfen (das Theme liegt nicht im Repo). Das Werkzeug vergleicht nur ID, SKU, Preis und Optionswerte, nicht den Variantentitel.
- **Samsung «Freischalten»** (Besitzer): siehe Abschnitt oben (ACTIVE, Verkaufskanäle, Sammlungen, `bild-ok`). Das Werkzeug lässt das Produkt bewusst DRAFT.
- **Gewicht, HS-Code und «Bestandsführung» der neuen Varianten bewusst nicht gesetzt**: Vorhandene Varianten tragen Gewicht (Hoodie 11,7–23,1 oz, T-Shirt 3,6–9 oz, iPhone 1,6 oz), HS-Code (iPhone 392310, Hoodie 620332, T-Shirt 610910) und teils `tracked: true`; neue Varianten haben `tracked: false`, kein Gewicht, keinen HS-Code (Poster: bei den vorhandenen ebenfalls keiner). Gewichte unterscheiden sich je Material und Grösse und sind im Datenpaket nicht belegt (es gäbe nur geschätzte Werte); der Versand ist pauschal, die Bestandsführung ohne Wirkung (`inventoryPolicy CONTINUE`). Wirkung allenfalls auf Gewicht/Zoll-Angaben im Merchant-Feed. Wer es einheitlich will, setzt es nach LIVE von Hand oder gibt Gewichte vor.
- **Platzierung der Druckdatei:** dass Printful bei Hüllen/Tassen eine Platzierung `front` ablehnt, ist nicht belegt (nur, dass der Katalog dort ausschliesslich `default` führt). Ob der Auftrag die Platzierungs-`id` (`default`) oder den `type` (`front`) verlangt, zeigt erst eine Test-Bestellung (`dropship/ABEND-TODO.md` Zeile 26). Die 9 POD-Produkte ohne «_<Zahl>»-SKU (siehe Platzierung) sind davon unberührt und bleiben in der Prüfung.
- Leinwand 70×100 cm = Printful 28″×40″ (19321, ≈ 71×102 cm), CHF 141.90, als «abgeleitet» gekennzeichnet.
- Slim-Hülle nur matt (Printful 684 gibt es auch glänzend: 104 Varianten wären über der Grenze von 100).
- Wenige Materialangaben sind wörtlich belegt, aber knapp formuliert (Leinwand «insgesamt 3,18 cm dick» ist die Herstellerangabe zur ganzen Leinwand; Grössenhinweise stehen nur «bei diesem Material»).
