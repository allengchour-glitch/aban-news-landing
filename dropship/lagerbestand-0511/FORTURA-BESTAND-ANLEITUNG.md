# Fortura-Bestand: Anleitung für den Besitzer (Stand 05.11.2026)

**Was der Workflow tut.** «Fortura-Bestand (Abgleich)» holt täglich um 03:51 UTC (04:51 Schweizer Winterzeit, im Sommer 05:51) den Fortura-Feed (nur lesen) und gleicht die Menge jeder Fortura-Variante im Shop damit ab (Feed minus 1 Stück Puffer minus schon verkaufte Stücke). Danach rechnet er in einem zweiten Trockenlauf nach, ob der Shop wirklich stimmt, und setzt erst dann den Frische-Stempel. Ohne Freigabedatei liest er nur und schreibt nichts.

## 1. Zwei Repo-Secrets setzen (einmalig)
GitHub → Settings → Secrets and variables → Actions → Repository secrets: **FORTURA_FTP_USER** und **FORTURA_FTP_PW** (Zugang zum Fortura-Webtransfer). Werte nur dort eintragen, nie in Chat oder Dateien. SHOPIFY_CLIENT_ID und SHOPIFY_CLIENT_SECRET nutzen andere Läufe schon; fehlt eines der vier, nennt der erste Schritt den Namen und der Lauf endet rot, ohne etwas zu tun.

## 2. Zuerst von Hand im Trockenlauf
Actions → «Fortura-Bestand (Abgleich)» → Run workflow → **schreiben** aus (false), **null_erlauben** aus. Dann die Zusammenfassung des Laufs lesen. Erwartet (Probelauf vom 05.11., der Feed ändert sich täglich, kleine Abweichungen sind normal):
- «Abgleich: 6 532 unverändert · **1 884 zu ändern (davon 161 auf 0)**»
- «ACTIVE: … verkaufbar vorher **2 258 → nachher 2 195**»
Im Log stehen die Zahlen ohne Leerzeichen (6532, 1884). Weichen die Zahlen deutlich ab, nicht freigeben, erst klären. Stoppt der Lauf mit «ABBRUCH (Nullungs-Bremse)» oder «OFFEN: Feed hat nur … Zeilen», steht der Grund im Log; geschrieben wurde nichts. Endet schon der Feed-Schritt rot (Login abgelehnt, Zertifikats-Hinweis, Netzfehler), den Wortlaut aus dem Log an Claude geben, nichts am Workflow umstellen und bei «Login abgelehnt» die Zugangsdaten nicht mehrfach neu probieren (Sperrgefahr beim Fortura-Konto).

## 3. Schreiben freigeben
Datei **dropship/FORTURA-BESTAND-FREI.txt** mit einem Satz anlegen (z. B. «Freigabe Besitzer, Datum») und nach main bringen (GitHub: Add file → Create new file → Name `dropship/FORTURA-BESTAND-FREI.txt` → Commit; oder Claude bitten, sie per Pull Request zu legen). Ab dann schreibt der tägliche Lauf. Den ersten Lauf von Hand starten: Run workflow mit **schreiben = an**. Bleibt er mit «ABBRUCH (Nullungs-Bremse)» stehen und die Zahl dort (um 161) passt zu den Zielzahlen, denselben Lauf wiederholen mit **schreiben = an UND null_erlauben = an**. Die Bremse greift beim ersten Lauf voraussichtlich nicht (Grenze mindestens 338); «null_erlauben» ist die Ausweichstelle und wirkt nie im Zeitplan. Erfolg erkennen: In der Zusammenfassung des Laufs steht unter «Stempel» die Zeile `STEMPEL gesetzt …`. Steht dort `KEIN STEMPEL gesetzt` mit Gründen, ist der Lauf rot; die Bestandszahlen verschwinden im Shop dann nach höchstens 26 Stunden von selbst (sicher), die Mengen selbst sind in diesem Fall trotzdem geschrieben.

## 4. Stoppen
Freigabedatei löschen: der nächste Lauf liest nur. Schon geschriebene Mengen bleiben stehen. Ein laufender Lauf lässt sich in Actions abbrechen.

## 5. Zurücknehmen (ehrlich: es gibt kein Rücknahme-Skript)
Jede Änderung steht im Journal `_fortura_bestand_log.tsv` im Artefakt «fortura-bestand-protokoll» des Laufs (7 Tage, danach gelöscht): Spalte 3 SKU, Spalte 4 **alt**, Spalte 5 **neu**, Spalte 9 Position. Zurücknehmen heisst, die Menge von «neu» wieder auf «alt» zu setzen, von Hand oder mit einem noch zu schreibenden Skript. Vorher die Freigabedatei löschen, sonst schreibt der nächste Lauf wieder den Feed-Stand. Das Artefakt enthält SKU und Zahlen, keine Produkttitel, keinen Feed.

## 6. Stempel und Notschalter
Der Stempel ist das Shop-Metafeld **luxe.fortura_bestand_stand** (Text, Zeit in UTC wie `2026-11-05T03:58:12Z`). Er wird nur gesetzt, wenn der Abgleich ohne offene Zeilen lief, die Nachprüfung höchstens max(40, 1 %) Abweichungen zeigt und mindestens 6 000 Varianten sah und der Feed höchstens 36 Stunden alt ist. Das Theme zeigt «Nur noch N» nur, solange der Stempel höchstens **26 Stunden** alt ist; sonst steht «Auf Lager · versandbereit» ohne Zahl. Fällt der Lauf aus, verschwinden die Zahlen also von selbst.
Notschalter: Shop-Metafeld **luxe.bestand_anzeige**. Leer, `1`, `true`, `an` (auch `ein`, `ja`, `on`) = Zahlen an; jeder andere Wert (z. B. `0`, `aus`) = Zahlen aus.
