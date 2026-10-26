# Prüfbericht Mode-Taxonomie: Damen, Herren, Kinder, Schuhe & Accessoires

Stand 26.10.2026. Datensatz `/tmp/mode_daten.json` (28 300 Produkte, davon 20 335 im Mode-Universum: Kleidung, Schuhe, Taschen, Accessoires, Gepäck). Werkzeug `pruefen.mjs` mit EINER Auswertungsfunktion (`pruef_kern.mjs`, `passt`). Alles gemessen am Rohergebnis; die Zahlen unten stehen in `pruef_zahlen/`.

## 1. Kurzfassung

- Die vier Abteilungsdateien sind zusammengeführt: **100 Kategorien** (vorher 98), **214 aktive Unterfilter**, Menübaum Damen / Herren / Kinder / Schuhe / Accessoires (`ALLES.json`). Dazu `ZUORDNUNG.json` (Produkt zu Kategorien) und `g_korrekturen.json` (41 Produkte mit falscher Google-Kategorie).
- **Überschneidungen**: Innerhalb einer Zielgruppe landet kein Produkt in zwei Blatt-Kategorien (vorher 0, nachher 0). Zwischen den Zielgruppen gab es 1 Konflikt (Vater-Tochter-Shirt in Damen UND Familien-Looks), jetzt 0.
- **Der eigentliche Befund gegeneinander**: Die drei Geschlechtsregeln der Bekleidung (Damen, Herren, Kinder) antworteten bei **92 von 11 901 Kleidungsprodukten verschieden**. Folgen: 10 Produkte («Herren Halterneck Top», «Herren-Relax-Schulterfreier Langarm-Jacke» …) standen in KEINER Kategorie; 28 Paar-Produkte («King & Queen Partner-Shirts») standen höchstens bei Damen (als «unisex»), nie bei Herren; ein Mädchenstil-Nachthemd (Erwachsenenware) war heimatlos. Jetzt gilt **eine gemeinsame Geschlechtsregel** (`geschlecht_gemeinsam.mjs`), 0 Konflikte.
- **Lücken**: Produkte ohne Kategorie im Mode-Universum **711 (3.5 %) → 629 (3.1 %) in den Rohdaten → 596 (2.9 %) mit den Google-Korrekturen**. Der Rest ist überwiegend Fremdware (Abschnitt 5). Dabei sind 13 «taktisch»-Produkte der Herren-Abteilung bewusst neu ausgeschlossen (Linie der Damen-Regel).
- **Gegengelesen**: rund 2 560 Titel (Abschnitt 6). Fehlerarten stehen mit Grund und Status in der Tabelle; 25 Titel je Kategorie beweisen keine Fehlerquote.

## 2. Zahlen vorher / nachher

| Kennzahl | vorher | nachher (Rohdaten) | nachher (mit g_korrekturen) |
|---|---|---|---|
| Kategorien / aktive Unterfilter | 98 / 238 | 100 / 214 | 100 / 214 |
| (1) Produkte in mehr als einer Blatt-Kategorie je Abteilung | 0 | 0 | 0 |
| (1) Produkte in Kategorien verschiedener Zielgruppen ohne Unisex-Grund | 1 | 0 | 0 |
| Unisex-Produkte, bewusst bei Damen UND Herren | 1 326 | 1 368 | 1 370 |
| (1b) Kleidung, bei der die drei Geschlechtsregeln verschieden antworten | 92 | gemeinsame Regel: 0 Konflikte | 0 Konflikte |
| (2) Produkte ohne Kategorie (Universum 20 335, mit Korrektur 20 339) | 711 (3.5 %) | 629 (3.1 %) | 596 (2.9 %) |
| davon «Kleidung ohne erkennbares Geschlecht» | 112 | 42 | 42 |
| (3) Kategorien unter 15 Produkten | 0 | 1 (kinder-accessoires, 14) | 0 |
| (3) aktive Unterfilter unter 15 | 24 | 0 (31 vorgemerkt, nicht aktiv) | 0 |
| (4) Handle-Kollisionen mit vorhandenen Collections | 6 | 6 | 6 |
| doppelte Handles in der neuen Taxonomie | 0 | 0 | 0 |

Kleinste Kategorien jetzt (alle ≥ 15, aber nahe an der Schwelle): kinder-baby-kleider-oberteile 15, herren-guertel 15, kinder-accessoires 15 (mit Korrektur), damen-reisetaschen 17, herren-reisetaschen 18, herren-shopper 18, damen-shopper 18, herren-hausschuhe 19.

## 3. Was geändert wurde (reproduzierbar: `anpassen.mjs` liest `*.json.vorher`, schreibt `*.json`)

1. **Gemeinsame Geschlechtsregel** (`geschlecht_gemeinsam.mjs`, nur 9 Kombinationen kommen im Datensatz vor, jede mit Begründung im Kopf der Datei). Löst: 10 weibliche Schnitte mit Herren-Etikett (Halterneck, Off-Shoulder, High-Waist; Evidenz am Datensatz: von den Titeln mit «high waist» nennen 3 Herren und 38 Damen/Frauen, von den übrigen tragen 180 ein Damen-Tag und keiner ein Herren-Tag) → Damen; Mädchenstil-Nachthemd → Damen; Vater-Tochter-Shirt → nur Familien-Looks.
2. **NEU `partnerlook-paare`** (28 Produkte, Geschlecht «partner», Hauptplatz im Menü unter Damen, Querverweis unter Herren). Die Herren-Abteilung hatte 76 Paar-/Familien-Produkte «in keiner Kategorie» gemeldet; 47 davon sind Familien (stehen in Familien-Looks), 29 sind Paare und hatten keine Heimat (Damen nahm sie als «unisex» auf, Herren nicht); 28 davon stehen jetzt in der neuen Kategorie, eines hat die nackte Google-Kategorie «Clothing».
3. **NEU `kinder-accessoires`** (14, mit Korrektur 15): Kinder-Mützen, -Handschuhe, -Haarschmuck, -Taschen. Die Kinder-Bekleidung nimmt nur Google «Clothing > …», die Schuh-Abteilung hatte nur Kinderschuhe. Grenzfall: knapp über der Schwelle, deshalb im Menü nur als Querverweis unter Kinder.
4. **Unbekanntes Geschlecht**: 112 Kleidungsprodukte ohne jedes Zielgruppen-Wort (Kuschel-Hoodie, Winterjacke, Freizeithose …). Regel in zwei Stufen, nie geraten: weiblich kodiertes Wort (Spitze, Rüschen, Cape, Poncho, Umhang, Chiffon, hohe Taille …) → Damen; geschlechtsneutrale Kleidungsart ohne Fremdwort (taktisch, Tarn, Kostüm, kühl, Badehose …) → unisex, also in Damen UND Herren. 75 Produkte erhalten so eine Zielgruppe (59 unisex, 16 Damen), 42 bleiben ohne. **Das ist eine Entscheidung, keine Messung** (Abschnitt 7).
5. **Teilwort-Falle «verkleid»**: Das Ausschlussmuster `(kostüm|cosplay|verkleid|maskenball)` traf mitten im Wort: «Pailletten-Pulloverkleid» und «Locken-Pulloverkleid» (Pullo-VERKLEID) fielen aus Damen-Kleider. Muster jetzt nur am Wortanfang (in 28 Kategorien, am Datensatz kein weiterer Treffer).
6. **damen-sets**: 2 Titelmuster für «Top mit Satin-Midirock», «Wickel-Minirock mit Kurzarm-Top» (Set-Teile ohne Set-Wort fielen durch). Beim Test fielen zwei Überschneidungen auf (ein Muster traf «Schnell**trock**nung» wegen «rock»; ein Set mit Google «Skirts» stand auch in Röcke). Beides behoben, die Vorrangregel der Abteilung (Sets vor Einzelteilen) gilt jetzt in 10 weiteren Kategorien.
7. **«taktisch/tactical»** in allen 14 Herren-Kategorien ausgeschlossen (13 Produkte: 4 Westen, 4 Hosen, 3 Jacken, 1 Overall, 1 T-Shirt). Die Damen-Regel schloss es überall aus, die Herren-Regel nirgends.
8. **Tags `fortura` und `kostuem`** in Damen und Herren gesperrt (Kinder und Schuhe sperrten `fortura` schon). Sonst wären «T-Shirt England/Algerien» (Fanartikel) und das «Göttinnen-Kleid für Mottopartys und Halloween» in der Alltagsmode gelandet.
9. **Unterfilter unter 15 Treffern nicht aktiv** (31 vorgemerkt in `unterfilter_vorgemerkt`, nichts gelöscht): 24 bei Kinder-Bekleidung (Mädchen/Jungen je 6 bis 10; 3 davon bei Partnerlook), 3 bei Herren, 4 bei Kinder-Accessoires.
10. **Taschen**: In der Gruppe Tasche/Geldbörse gilt ohne Beleg unisex (Design der Schuh-Abteilung). Neun Taschen tragen aber ein eindeutig weibliches Wort (Stroh, Rattan, Korbtasche, Baguette, Bow, Schalenhandtasche, Henkeltasche, Kettenriemen, Plüsch) → Damen; sie verschwinden aus Herren-Shopper, -Handtaschen, -Umhängetaschen, -Weitere Taschen.
11. **`g_korrekturen.json`** (41): Produkte, deren Google-Kategorie offensichtlich falsch ist: 8 Kleidungsstücke mit «Belts», 11 mit «Handbags» («Maxirock **mit Taschen**»), 3 mit «Dolls», 8 mit «Shoes» (7 Socken, 1 Freizeithose), 4 Röcke/Cape mit «Dresses», 4 mit «Shirts & Tops» (3 Jacken, 1 Badetop), je 1 Fitnesshose, Hotpants und Mütze-Schal-Set Ohne Korrektur stehen nur 4 dieser 41 in einer Kategorie, mit Korrektur alle 41. Es sind Daten, keine Regeln: erst `g' = g_korrekturen[handle].g` setzen, dann die Regeln auswerten (oder g im Shop korrigieren). 8 Vorschläge der Analysten wurden verworfen: «Damen Jacke silbrig mit Glitzer», 3 Strickjacken, «Trachtenbluse Damen», «Raver Set» sind Fasnachts-Kostüme von Fortura.

## 4. Handle-Kollisionen (gleiches Handle, anderer Inhalt)

Empfehlung für alle sechs: **Handle behalten** (URL, Verlinkung, Suchmaschinen-Stand), Regel auf den neuen Tag umstellen. Gemessen an den Mitgliedern im Datensatz:

| Handle | alt (live) | gemeinsam | nur alt | nur neu | Urteil |
|---|---|---|---|---|---|
| damen-sets | «Damen-Sets & 2-Teiler» 191 | 88 | 66 | 45 | neu sauberer: alt enthält Bikini-Sets, Familien-Pyjamas, Winter-Sets (Mütze/Schal) |
| damen-jacken-maentel | «Damen-Jacken & Mäntel» 900 | 367 | 198 | 110 | alt enthält Cardigans (haben jetzt «Strickjacken & Cardigans»); neu bringt Westen und Capes dazu |
| damen-hosen | «Damen-Hosen» 299 | 189 | 91 | 28 | alt enthält Ledergürtel «für Jeans und Hosen», Strumpfhosen, Latzhosen, Yoga-Hosen (Sport) |
| herren-hemden | «Herren-Hemden» 1000 | 822 | 70 | 57 | fast gleich; alt enthält Polohemden (haben «Poloshirts») und Hemdjacken |
| herren-jeans | «Herren-Jeans» 150 | 143 | 7 | 3 | praktisch gleich |
| herren-hosen | «Herren-Hosen» 189 | 123 | 26 | 32 | alt enthielt Sets und drei **Spielfiguren** («bworld Mann mit hellem Hauttyp und brauner Hose»); neu bringt Workpants, Chinos |

Themengleiche alte Collections mit anderem Handle (Detail in `ALLES.json` → `themengleiche_vorhandene_collections`): `damenschuhe` (2 194 im Datensatz) liegt zu 99.5 % in den 13 neuen Damen-Schuhkategorien, `sub-kleider` (3 213) zu 98 % in damen-kleider, `kinderschuhe` (1 401) zu 97 %, `herrenschuhe` (1 916) zu 93 %. `sonnenbrillen-damen` (287 live) misst nur 93 Produkte im Datensatz und deckt sich mit 3 der 41 neuen: Die alte Regel ist Titel-Suche («cat-eye», «oversized»), die neue folgt der Google-Kategorie; vor einem Umstellen Stichprobe nehmen.

## 5. Lücken: was ohne Kategorie bleibt (596 mit Korrektur, nach Grund)

| Grund | Anzahl | Wohin gehört es |
|---|---|---|
| Arbeits-/Sicherheitsschuhe | 144 | bestehende Collection `arbeitsschuhe` (138 live), im Menü unter Schuhe als «vorhanden» geführt |
| Sport-, Foto-, Werkzeug-, Camping-, Kühl-, Motorradtaschen (Google «Handbags», keine Modetasche) | 82 | Outdoor / Foto / Werkzeug |
| Rest (Einzelfälle, bare Google-Kategorie «Clothing» 24, Herren-Gewänder und -Roben, Westen für Arbeit/Angeln, Weitere) | 130 | Einzelentscheid; 37 Produkte haben die nackte Google-Kategorie «Clothing», dort kann keine Regel greifen |
| Rollsport (Rollschuhe, Inline-Skates) | 26 | Sport |
| Schlüsselanhänger / Schlüsseletuis | 24 | Accessoires-Geschenke, kein Modethema |
| Einsatzware «taktisch» | 24 | Arbeitskleidung / Sport & Outdoor |
| Perücken, Fächer, Manschettenknöpfe, Krawatten | 24 | je unter 15 |
| Schuhzubehör (Einlagen, Schnürsenkel, Überzüge) | 18 | Schuhpflege |
| Kleidung ohne erkennbares Geschlecht | 42 | Tag nachtragen |
| Kostüme (Fortura) | 47 | `ft-*`-Kategorien |
| Kostüme, Puppenkleider | 16 | Spielzeug / Kostüme |
| Sperr-Tag | 18 | bewusst ohne Themenkategorie |
| Partnerlook (nackte Google-Kategorie) | 1 | «Winterkleidung für Paare» |

Fachlich echte Mode, die an der Gruppengrösse oder am Zuschnitt scheitert: Herren-Wäsche, -Nachtwäsche und -Bademode (15 Produkte zusammen, davon 5 unisex, thematisch gemischt: genau an der Schwelle, deshalb keine Kategorie), Herren-Gewänder (4), Umstandsgürtel (5). Sie bleiben über Suche und die vorhandenen Collections `unterwaesche`, `nachtwaesche-pyjamas`, `sub-bademode` erreichbar.

## 6. Gegenlesen

**Methode.** Je Kategorie 25 Zufallstitel mit festem Seed («pruefer-25:» + Handle, andere Stichprobe als die der Analysten), Dateien in `pruef_stichproben/<handle>.txt` (nach den Korrekturen und mit g_korrekturen neu gezogen; gelesen wurde Runde 1 mit demselben Seed auf den Mitgliedern vor den Korrekturen). Runde 1: 98 Kategorien, 2 380 Titel, alle einzeln gelesen. Runde 2 nach den Änderungen: 8 Kategorien neu gezogen (183 Titel), alle Zu- und Abgänge je Kategorie (Differenz alt/neu: 173 Zugänge, 50 Abgänge) und alle Mitglieder der beiden neuen Kategorien. Dazu mechanische Nachscans über ALLE Mitglieder: Kopfwort-Test (Titel ohne Kleid/Rock/Hose/Jacke … in der passenden Kategorie), Fremdwort-Scan, Tag-Scan.

**Fehlzuordnungen mit Grund.**

| Kategorie | Befund | Grund | Status |
|---|---|---|---|
| herren-westen | «Asymmetrische Taktische Weste», «Taktische Quick Release Outdoor-Weste» | Einsatzware; Herren-Regel schloss «taktisch» nicht aus | behoben (Ausschluss in allen Herren-Kategorien, 13 Produkte) |
| herren-t-shirts | «Crochet-Top mit Blumenmuster» | Damenschnitt mit Herren-Tag | offen (1; Quelle ist der Tag) |
| damen-jacken-maentel | «Damen Blazer und Hose mit geradem Bein» | Zweiteiler mit Google «Coats & Jackets»; der Set-Ausschluss greift nur bei Shirt-/Hosen-Kategorien | offen (1 im Datensatz) |
| damen-sets, herren-sets | «3-teiliges Cozy Pyjama Set» (in beiden) | gehört in Nachtwäsche; die verlangt Google «Sleepwear», dieses hat «Outfit Sets» | offen (1) |
| damen-dessous | «Anti-Rutsch Basketballsocken» (Sportsocken; 20 Socken-Titel in der Kategorie) | Google «Underwear & Socks» | offen, Unterfilter «Strümpfe & Socken» fängt es ab |
| herren-shopper, -handtaschen | «Mini-Bow-Tasche», «Strohtasche», «Korbtasche» u. a. | Zielgruppe unbekannt → unisex → auch Herren | 11 behoben; «Krokodilmuster-Tote», «Handheld Chain Tote» offen |
| damen-kleider | 3 Röcke («Velours-Kolbenrock», «Bead-…-Rock», «Shirtrock») und «Mesh Maxi Cape» | Google «Dresses» falsch | in `g_korrekturen.json` |
| damen-kleider | «Göttinnen-Kleid für Mottopartys und Halloween» | Tag `kostuem`, kein Kostüm-Wort im Titel | behoben (Tag gesperrt) |
| damen-/herren-t-shirts | «T-Shirt England», «T-Shirt Algerien» | Fanartikel von Fortura, durch meine Neuregel eingedrungen | behoben (Tag `fortura` gesperrt) |
| damen-jacken-maentel, herren-jacken-maentel | «Kapuzencape mit Jacquardmuster» als unisex | Muster erkannte «Kapuzen…cape» nicht (Fehler meiner Neuregel) | behoben |
| kinder-accessoires | «UV-Desinfektionstasche für Babyflaschen» | Haushaltsgerät mit Google «Handbags» | behoben |
| kinder-nachtwaesche-bademode | «Zuckersüss Mädchenstil … Nachthemd» | Reihenfolge in meiner Regel (Ausnahme kam zu spät) | behoben, jetzt Damen-Nachtwäsche |

Grenzfälle, nicht als Fehler gezählt: damen-wanderschuhe «Outdoor-Sneaker für Damen», «Flache Outdoor-Schuhe mit Schleife»; damen-pantoletten «Clogs Schuhe für Comic-Convention»; herren-sneaker «Couple Sneakers» (Herren statt unisex); herren-anzuege «Japanischer Segler-Anzug», «Koreanischer Slim-Anzug» (unisex nur wegen «Anzug»); herren-sets «Tarnweste Set»; damen-sturmhauben «Taktische Halbgesichtsmaske», herren-guertel «Taktischer Gürtel» (Schuh-Abteilung lässt «taktisch» zu); damen-dessous «Tüll-Ballkleiderschürze».

**Grenze.** 0 Fehler in 25 Titeln heisst bei 95 % Sicherheit nur: Fehlerquote wahrscheinlich unter rund 12 %. Die mechanischen Nachscans über alle Mitglieder sind die stärkere Aussage: Kopfwort-Test über 15 Kategorien fand 25 Titel ohne passendes Warenwort (alle durchgesehen, 4 echte Fehler: 3 Röcke und 1 Cape in Kleider).

## 7. Offene Entscheide für den Besitzer

1. **Unisex ohne Beleg**: 59 Kleidungsprodukte (Punkt 4 oben) und 810 Taschen/Geldbörsen stehen in Damen UND Herren, weil kein Titel, Tag oder Typ eine Zielgruppe nennt. Bequem für die Kundin, aber geraten; Alternative: nur mit Tag. Schalter: die Zeile mit `NEUTRAL_ART` in `geschlechtKleidung` entfernen, dann bleiben die 59 «unbekannt».
2. **Handle-Umstellung** der sechs Kollisionen (Abschnitt 4): ändert den Inhalt live (im Datensatz z. B. damen-jacken-maentel 565 alt gegen 477 neu; die Live-Zahl 900 enthält Produkte, die nicht im Datensatz stehen).
3. **`g_korrekturen.json` anwenden** (41 Produkte): im Shop die Google-Kategorie setzen oder beim Tag-Schreiben als Vorstufe auswerten. Ohne sie bleiben 37 echte Kleidungsstücke ohne Kategorie.
4. **kinder-accessoires** (14 / 15) aktivieren oder bis zu weiteren Importen warten.
5. Gleiche Linie bei «taktisch» (Damen und Herren schliessen aus) und bei den 810 unbelegten Taschen: Entscheid, ob Einsatzware in einer eigenen Kategorie «Outdoor & Taktik» stehen soll.

## 8. Dateien und Befehle (alle in `/tmp/mode_taxonomie/`)

- Ergebnis: `ALLES.json` (Kategorien, Semantik, Geschlechtsregel, Menü, Kollisionen, Ausserhalb), `ZUORDNUNG.json`, `g_korrekturen.json`; geänderte Abteilungsdateien `damen-bekleidung.json`, `herren-bekleidung.json`, `kinder-baby-bekleidung.json`, `schuhe-accessoires.json` (Sicherungen `*.json.vorher`, Änderungsprotokoll je Datei in `nachtrag_pruefung`).
- Werkzeug: `pruefen.mjs` (Bericht (1) bis (4); Schalter `--vorher`, `--mit-korrektur`, `--stich`, `--zeige`, `--ohne-alle`, `--fremd`, `--alles`), `pruef_kern.mjs`, `geschlecht_gemeinsam.mjs`, `anpassen.mjs`, `alles_bauen.mjs`, `g_korrekturen_bauen.mjs`, `pruef_diff.mjs`, `pruef_warum.mjs`, `pruef_lies.mjs`; Belege in `pruef_zahlen/` und `pruef_stichproben/`, Einmal-Analysen in `pruef_hilfen/` (einige brauchen vorher `node pruefen.mjs --dump`).
- Achtung: Die `*_bauen.mjs` der Abteilungen überschreiben die JSON. Danach die Datei nach `*.json.vorher` kopieren und `node anpassen.mjs` erneut laufen lassen. Die Mess-Skripte der Abteilungen rechnen mit der eigenen Geschlechtsfunktion; massgeblich ist `pruefen.mjs`.
