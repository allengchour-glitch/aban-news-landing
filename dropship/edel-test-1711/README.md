# Edel-Test (17.11.2026, Besitzer «1 ja», «mach alles fix»)

Frage des Besitzers: gibt es bei CJ edle und teure Produkte, und lohnt ein kleiner Test? Auslegung (meine, nicht bestätigt): 5 bis 8 handverlesene teure CJ-Produkte **nur als ENTWURF ohne Kanal** anlegen und eine Muster-Liste vorbereiten. **Nichts bei CJ bestellen oder bezahlen, nichts veröffentlichen.** Veröffentlichen erst nach seinem späteren Ja, und erst nach einem Muster.

## Stand

**Entscheid des Besitzers 17.11.2026 (nach dem Merge von PR #3233): «keine Muster bestellen».** Damit ruht der Edel-Test: die sechs Entwürfe bleiben Entwurf (ohne Kanal, ohne Sammlung), veröffentlicht wird nichts ohne Muster und ohne sein neues Ja. Bei CJ ist nichts bestellt oder bezahlt. Die Muster-Liste bleibt als Vorrat. Die Silber-Frage lief getrennt weiter: Brief an die Edelmetallkontrolle fertig, die Silberprodukte des Shops mit «925» im Titel vorläufig auf Entwurf (`dropship/silber-bazg-1711/README.md`).

**LIVE 17.11.2026 06:47 bis 06:51 UTC: sechs Entwürfe angelegt (`status DRAFT`), ohne Kanal, ohne Sammlung, nichts bei CJ bestellt, nichts bezahlt, nichts veröffentlicht.** Unabhängig vom Skript frisch aus Shopify gelesen (Admin-Abfrage 06:5x UTC): alle sechs DRAFT, `resourcePublicationsV2` leer (0 Kanäle), `onlineStoreUrl` null, alle 40 Medien READY (5, 9, 5, 6, 9, 6), 29 Varianten mit den SKUs, Preisen und Einkaufskosten des Plans und je einem eigenen Bild; die Shop-Adressen leiten auf die Startseite um (HTTP 302, nicht erreichbar).

| Entwurf | Shopify-ID | Handle | Varianten | Preis CHF | Einkauf+Fracht CHF | Besonderes Tag |
|---|---|---|---|---|---|---|
| Tennisarmband 925 Silber | `16719590588807` | `tennisarmband-925-silber-278657` | 3 (16,5, 18, 19 cm) | 145.90 / 153.90 / 159.90 | 90.76 / 95.71 / 99.00 | `bazg-offen` |
| Halskette 925 Silber, farbiger Mittelstein | `16719590916487` | `halskette-925-silber-mittelstein-909186` | 3 (Rot, Blau, Grün) | 174.90 / 180.90 / 229.90 | 108.90 / 112.19 / 142.69 | `bazg-offen` |
| Kleine Handtasche in Boxform | `16719590982023` | `handtasche-boxform-klappe-789056` | 4 Farben | 152.90 | 95.44 | `bilder-ersetzen` |
| Handtasche mit Blumenstickerei | `16719591014791` | `handtasche-blumenstickerei-962816` | 3 Farben | 152.90 | 95.52 | `design-pruefen` |
| Strickjacke im Rippstrick | `16719591047559` | `strickjacke-rippstrick-extra-dick-604200` | 10 (5 Farben × M, L) | 174.90 | 109.19 | `faser-offen` |
| Damen-Pullover mit Polokragen | `16719591080327` | `damen-pullover-polokragen-619600` | 6 (2 Farben × M, L, XL) | 164.90 | 103.04 | `faser-offen` |

Alle tragen ausserdem `edel-test-1711` und `muster-offen`. Ledger: `ledger.txt`. **Das Anlegen lief in zwei Läufen:** der erste legte das Tennisarmband an und stoppte am Nach-Anlege-Tor «text» (Exit 4): dieses Grind-Tor verlangt den Marker der Text-Pipeline (`ls-text-v2` oder `ls-fakten-v1`), den von Hand geschriebene Texte nicht tragen. Ich habe den Marker nicht vorgetäuscht, sondern das Tor für den Edel-Lauf aus der Wertung genommen und die Mindestlänge (150 Zeichen) im Wächter geprüft; der zweite Lauf übersprang das vorhandene Tennisarmband («gibt es schon») und legte die anderen fünf an (16 Tore bestanden). Das Tennisarmband wurde deshalb nicht vom Skript, sondern von mir frisch gelesen (siehe oben).

## Was der Test gefunden hat (zwei unabhängige Prüfer, 33 Agenten, jeder Fund einzeln nachgestellt)

Die erste Fassung der Texte nannte Angaben, die nur der Lieferant behauptet. Die Prüfer fanden:

- **2 Blocker (Kaschmir):** «100 % Kaschmir» (Pullover) und «aus Kaschmir» (Strickjacke) standen als Tatsache in Titel, SEO und Text. Beleg gibt es nur beim Lieferanten; beim Strickjacken-Datenblatt führt dieselbe Jacke zugleich die Zollbezeichnung «Polyester Women's Jackets», und USD 117 Einkauf bei 820 g sind für extra dickes Kaschmir auffällig günstig (Hypothese: Mischgewebe).
- **Silber (rechtlich, Hypothese):** die Edelmetallkontrolle verlangt für in der Schweiz in den Handel gesetzte Silberwaren, auch importierte, eine Feingehaltsangabe und eine in der Schweiz registrierte Verantwortlichkeitsmarke (BAZG-FAQ, von mir am 17.11. wörtlich gelesen). Siehe `FRAGE-EDELMETALLKONTROLLE.md`.
- **Wichtig:** «Rindsleder» nur Herstellerangabe, Bilder zeigen Prägung; «Moissanit», «Rubin, Saphir, Smaragd», «im Labor gezüchtet», «Geschenkbox», «Zertifikat (GRA)», «platiniert», «D VVS1»; Kissenschliff gegen Zuckerhut-Form auf dem Bild; 5,6 g ist nur das Silbergewicht; Grössentabellen fehlten (Jacke: Brustumfang M 122 cm, der Pauschalsatz «asiatische Grössen, eine Nummer kleiner» passte nicht); Masse der Stickerei-Tasse fehlten; Fremdtext auf Herstellerbildern; Verwechslungsrisiko der Stickerei-Tasse mit einem bekannten Bambusgriff-Modell.
- **Nicht bestätigt oder abgeschwächt:** «Diamant-Gradierung täuscht Diamantqualität vor» (der Text sagte ausdrücklich «kein Naturdiamant», Schwere klein bis wichtig); «Rückgabe-Regel in den Texten» (kein Text macht ein Rückgabeversprechen); das Diamant-Beschreibungsbild liegt nur im CJ-Datenblatt, nicht im Shop.

## Was geändert wurde

- `produkte.json` neu geschrieben: nur noch Angaben, die ein strukturiertes Datenblattfeld oder ein Bild belegt (siehe Tabelle in `MUSTER-LISTE.md`, «Was nach dem Prüfen vom 17.11. NICHT mehr im Text steht»). Eigene kurze Handles. Kette: Optionswerte jetzt «Rot, Blau, Grün» statt «Labor-Rubin…».
- **`texte.mjs` (Textwächter):** `unbelegteAngaben()` stoppt jeden Lauf, bevor CJ-Punkte ausgegeben werden, wenn in Titel, Handle, SEO, Text, Tags, Farb- oder Optionswerten eines der 20 Muster steht (Kaschmir, Rindsleder, Moissanit, Diamant, Rubin/Saphir/Smaragd, Labor, Bambus, Geschenkbox, Zertifikat/GRA, platiniert, VVS, Karat, «100 %», «asiatisch», «aufwendig», «Obermaterial», «klassisch», «edel/Luxus/Premium», «fein gestrickt», «Drehverschluss/Metallperlen»). `bilderAnsEnde()` stellt ein ungeeignetes Hauptbild (Strickjacke: blaugraues Modellfoto in einer Farbe, die es nicht gibt; Kette: drei Ketten auf einem Bild) ans Ende der Galerie; die Variantenbilder bleiben gültig.
- **Tags:** `edel-test-1711`, dazu je nach Befund `muster-offen`, `faser-offen` (Strickjacke, Pullover), `bilder-ersetzen` (Boxtasche), `design-pruefen` (Stickerei-Tasse), `bazg-offen` (beide Silberstücke). Nicht `compliance-pruefen`: der Plan lehnt Sperr-Tags ab.

## Werkzeug

```
node dropship/edel-test-1711/anlegen.mjs                 # Trockenlauf (Vorgabe): CJ lesen (10 Punkte je Datenblatt und Gewichtsklasse), Pläne nach OUT, kein Shop-Zugriff
LIVE=1 node dropship/edel-test-1711/anlegen.mjs          # legt als DRAFT an (productSet ohne Kanal), liest frisch zurück, prüft die Tore, schreibt ledger.txt
ONLY=tennis,collier  AUFSCHLAG=1.6  OUT=<Ordner>
```

Wiederverwendet die Bausteine des Grind 2.0: `planeNeu` (23 Tore), Fracht CN nach CH je Gewichtsklasse (nur Linien bis 20 Tage), Preisregel `preiseFuerVarianten` (Kurs 0.82435, **Aufschlag 1.6 ist meine Setzung**, Bruttomarge rund 37,5 %, höher als der Standard 1.45 wegen Rücksendungen und Muster-Risiko), Tore nach dem Anlegen. Nie: veröffentlichen, Kanäle setzen, bei CJ bestellen. Ein bereits vorhandener Handle oder eine vorhandene SKU wird nie überschrieben. Ein unklares `productSet` wird nicht wiederholt (Exit 4).

Exit 0 in Ordnung, 1 Fehler, 2 ein Plan besteht ein Tor nicht, 3 CJ drosselt oder Punkte fehlen, 4 Rückleseprüfung nach dem Anlegen.

## Prüfung

- `node dropship/edel-test-1711/anlegen_test.mjs`: 143 Prüfungen (Optionen, Textwächter gegen alle sechs Einträge, jeder Wächter-Eintrag in Titel, Tag, Übersetzung, Optionen, Handle, Bild-Umordnung), im CI (`luxestyle-automation-tests.yml`).
- `python3 dropship/edel-test-1711/mutationsprobe.py`: 36 Mutanten, **36 erkannt, 0 überlebt**. Der erste Test liess 4 von 30 überleben (Titel, SEO-Titel, neue Optionsnamen und die Zeichenfolge «GRA» ohne «Zertifikat» wurden nicht geprüft); sie sind jetzt geschlossen.
- Trockenlauf gegen CJ als eigener Aufruf, nach jeder Textänderung wiederholt: zuletzt 6 von 6 Plänen bestehen alle 23 Tore (17.11. 06:4x UTC).
- Drei unabhängige Leser der korrigierten Texte: Ein unabhängiger Leser sah die korrigierten Texte gegen Datenblatt-Felder und Bilder durch (22 frühere Befunde behoben, 8 offene sind keine Textfragen, 0 Blocker, 2 wichtig, 11 klein). Daraufhin geändert: die Steinzahl «33» steht nur noch bei 16,5 cm; «fein gestrickt» und «Feinstrick» (Maschenfeinheit unbelegt) sind raus; «Prägung» im Titel der Boxtasche entfällt (die Schlangenmuster-Variante ist offen); «Drehverschluss» und «Metallperlen» sind neutral («Schloss», «silberfarbene Kugeln»); der Satz der Kette ist geteilt; ein Grammatikfehler der Jacke; Abweichung beim Pullover «1 bis 3 cm» (Tabelle sagt 1 cm, Datenblatt 2 bis 3 cm). Nicht im Text lösbar und in `MUSTER-LISTE.md` geführt: «925 Silber» ohne sichtbaren Stempel bei der Kette, Preis der grünen Kette (CHF 229.90 bei gleichem Datenblatt), Fremdtext auf den Herstellerbildern, Bildrechte der Modelle.

## Offen und ungemessen

- Alle Aussagen über Material, Steine und Zertifikate sind **Hypothese**, bis ein Muster da ist. Ob die Ware dem Datenblatt entspricht, ist der Zweck des Tests.
- **Silber:** Antwort der Edelmetallkontrolle fehlt; der Shop führt schon 129 aktive Produkte mit «925» im Titel (GEMESSEN 17.11.), die dieselbe Frage betreffen. Nichts daran angefasst.
- Preise: Aufschlag 1.6 ist gesetzt, nicht aus Nachfrage abgeleitet. Ob in der Schweiz jemand für Marken-fremde Ware bei CHF 150 bis 230 über einen Dropshipping-Shop kauft, ist ungemessen.
- Einfuhr-MWST und Verzollungsgebühr der Post trägt bei CJ-Direktversand voraussichtlich die Kundschaft (Hypothese): vor der Veröffentlichung klären und auf der Produktseite nennen.
- Alt-Texte aller Bilder sind der Titel (nicht je Farbe); Bildrechte der Herstellerfotos (Gesichter) ungeklärt.
- Die Google-Kategorie «Shirts & Tops» für Strickjacke und Pullover folgt der Shop-Gewohnheit, nicht gegen das Vokabular geprüft (Warnung im Plan).

## Rücknahme

Die Entwürfe löschen oder auf ARCHIVED setzen (Admin: Produkte mit Tag `edel-test-1711`). Nichts anderes wurde geändert. Sie haben keinen Kanal und keine Sammlung (`publishedOnPublication` leer), sind also im Shop nicht erreichbar.

## Lehren

1. **Der erste Entwurf klang überzeugend und war trotzdem voll unbelegter Angaben:** ein Prüfer, der jede Aussage gegen Datenblatt-Felder UND Bilder liest, fand 2 Blocker und rund 20 weitere Funde. Texte mit Material- oder Echtheitsangaben nie ohne diesen Schritt anlegen.
2. **Ein Muster klärt nicht alles:** bei Silber hängt die Verkehrsfähigkeit an einer Marke, die kein Lieferant liefert. Erst fragen, dann Muster kaufen.
3. **Eine Regel, die der Text nicht einhält, gehört in einen Test:** der Textwächter prüft 20 Muster in jedem Feld und bricht vor dem ersten bezahlten CJ-Aufruf ab.
4. Der erste Test war sofort grün und liess 4 von 30 Mutanten überleben (ganze Felder wurden nicht geprüft). Erst nach ihrer Schliessung dem grünen Test trauen.
5. Eine Frage aus der Prüfung kann grösser sein als der Auftrag: die Silberregel betrifft schon 129 Produkte, die mit dem Edel-Test nichts zu tun haben.
