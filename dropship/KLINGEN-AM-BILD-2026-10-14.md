# Klingen, die man nur am Bild erkennt (14.10.2026, ~19:00–20:10 UTC)

Das ist die Fortsetzung von Journal 14.10. 🔗 («Klingen nur am Bild»). Die Hausregel stammt von #1017: Klingen gehen von CN nicht in die CH.
Die Titelregel (`automation/klingenregel.json`, `ist_handklinge`) sieht nur Wörter. Fehlt das Klingenwort im Titel, lässt sie das Produkt durch.

## GEMESSEN vorher
- Eine weite Titelsuche (Zange, Hobel, Schnitz, Survival, Schaber, Kamm, Rasier …) fand **306 aktive Treffer**. Davon kamen
  **193 mit allen Bildern auf 49 Kontaktbögen** (`scratchpad/kl/bogen_00–48.jpg`). Geprüft hat sie Workflow wf_1225cc56: Bildleser,
  dann eine unabhängige Gegenprobe je Verdacht, dann meine eigene Sichtprüfung vor jeder Änderung.
- Ergebnis: **25 Verdachtsfälle, 11 bestätigt.** Die übrigen 14 sind Fehlalarme oder Grenzfälle ohne freie Klinge.
- Bei einem Messlauf von `klinge_ch_wache.py` kam ein weiteres Produkt zum Vorschein: **«Messerset aus Edelstahl mit Sternmuster,
  6-teilig» war ACTIVE.**
  - Die Ereignisliste zeigt: Der Import (`autopilot2`) hat es am **07.10. 20:11 UTC aktiv angelegt**. Gedraftet war es nie.
  - Der Handle `stahlsatz-mit-sternmuster…` verrät den damaligen Titel «Stahlsatz …», darin steht kein Klingenwort.
  - Erst eine spätere Titel-Politur machte daraus «Messerset». Seit dem 13.10. fragen die Importer auch `productNameEn` ab
    (Journal 13.10. 🔪), deshalb käme das Produkt heute nicht mehr durch.

## GETAN
- **13 Produkte gedraftet**, alle mit den Tags `cj-nicht-versendbar-ch` und `handklinge-kein-ch-versand` und mit einer Zeile in
  `dropship/_klinge_handliste.tsv`:
  - 2 Holzschnitz-Sets (offene Schnitzmesser)
  - Schneidebrett-Set (Hack- und Küchenmesser im Lieferumfang)
  - Notfall-Kit 8-in-1 und Survival-Set 60-in-1 (Multitool mit Klinge)
  - Rasierhobel mit 20 losen Klingen
  - Kamm mit Stahlklinge (Springmesser-Form)
  - Keramik-Sparschäler mit Zirkonia-Klinge
  - 2 Klapp- bzw. Multifunktionszangen (Messerklinge im Griff)
  - Käseschaber-Set (3 Käsemesser)
  - **Rasiermesser** «Rasierhobel für Augenbrauen und Körperhaar»
  - **Messerset Sternmuster**, gedraftet über `klinge_ch_wache.py FIX=1` (Rücklesen: ACTIVE mit beiden Tags = 0, EXACT)
- **Die Regel ist breiter geworden:** `handklinge_stamm` deckt jetzt auch `schnitz-(werkzeug|eisen|set|satz)…` und
  `(wood) carving tools/sets/chisels/kits` ab.
  - Neue Kanarien in `handklingenregel_test.py`:
    - sperren: Holzschnitz-Set, Schnitzwerkzeug-Set, «Wood Carving Tools»
    - durchlassen: «Lederarmband mit Schnitzereien», «Handstück für Schnitzmaschine», «Fräser-Set für Holzschnitzereien»,
      «Holzgeschnitzte Bärenfigur»
  - **84/84 richtig**. Python und JS lesen dieselbe JSON-Datei, gleich gemessen.
- **Der Wächter nennt die Ursache jetzt richtig:** `verursacher()` kannte nur «draft → active». Hat der Import ein Produkt aktiv
  angelegt, stand bisher «reaktiviert von unbekannt», und die Spur zeigte auf einen Rückholer statt auf den Import.
  - Jetzt steht dort «im Verkauf durch Import (aktiv angelegt) autopilot2 <Zeit>». Gemessen am Messerset.
  - Die falsche Zeile in `_klinge_verboten_ch_0916.txt` ist korrigiert.

## Bewusst AKTIV gelassen (Grenzfälle, keine freie Klinge)
- Camping-Notfall-Set mit Kreditkarten-Werkzeug: Die Karte hat eine Sägezahn-Kante, keine Klinge.
- Hobelmesser und Schneidplotter-Klingen: Ersatzteile für Maschinen, das Bild zeigt eingebaute Teile.
  **Wenn CJ eines davon zurückschickt, wandert es in die Regel.**
- Gemüsehobel und Mandolinen: eingebaute Klinge, für die Werbung ohnehin `ist_klinge`.

## NACHGEMESSEN
- `status:active tag:cj-nicht-versendbar-ch` = 0, `status:active tag:handklinge-kein-ch-versand` = 0 (EXACT, 19:58 UTC).
- Der tägliche Wächter (`fixer_keepalive.sh`, `FIX=1`) liest den Voll-Export und hält die Regel am Bestand.

## OFFEN
- **113 der 306 Titel-Treffer** wurden nicht am Bild geprüft (offensichtliche Fehltreffer der weiten Wortsuche, z. B. «Strand-Cardigan»).
  Ein Rest-Risiko bleibt bei Titeln, die überhaupt kein Verdachtswort tragen.
- **Altbestand vor dem 13.10.:** Ware, die vor der `productNameEn`-Prüfung importiert wurde, kann noch einen harmlosen deutschen
  Titel und einen englischen Klingennamen tragen (wie «Stahlsatz»). Ein Abgleich gegen den CJ-Namen braucht eine Quelle ohne neue
  API-Last, zum Beispiel einen Namens-Cache aus dem Grind. Noch nicht gebaut.
- ~~Der Wächter lief mehrmals ohne Schlusszeile~~ → **behoben:** Im Log `/tmp/klinge_ch_wache.log` stand nach «Voll-Export
  gelesen» nichts mehr. Der Lauf starb beim Container-Neustart, und `absturz_nachholen` sieht nur Traceback/Error, also kam der
  nächste Versuch erst nach 24 h.
  - Das Skript schreibt jetzt «START …» als erste und «FERTIG rc=…» als letzte Zeile, mit Zeilenpuffer.
  - Der Aufseher fragt zusätzlich `still_gestorben`.
  - Probe mit zwei Logs: ohne FERTIG und vor dem Boot → nachholen; mit FERTIG → kein Nachholen.
