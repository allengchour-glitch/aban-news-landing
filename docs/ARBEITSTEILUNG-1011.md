# Arbeitsteilung LuxeStyle (Stand 10.11.2026)

Auftrag des Besitzers: «so das ihr arbeit aufteilt». Das Dokument gilt für den Shop **LuxeStyle CH** (luxestyle.ch). Eigene Regeln und Sitzungen haben: Krypto (`docs/KRYPTO-AUTONOMIE.md`), abannews.com mit Stripe und Etsy, Spiele, Pinterest-aban und der Kanal «Pias friedliche Welt» (siehe `SHARED-MEMORY.md`). Die Fassung 1 wurde von drei unabhängigen Prüfern gegengelesen; ihre Funde sind eingearbeitet.

Wörter: **Besitzer** = der Mensch. **Zuständig** = wer an einer Sache schreiben darf. Namen wie im Dashboard «Offene Punkte»: Du, Claude (Cloud), PC-Claude (Desktop), Codex.

## Teil 1: Kurzfassung (eine Minute)

1. **Du** entscheidest, bezahlst und loggst dich ein. Ein «Ja» gilt nur für die eine Sache, nach der gefragt wurde.
2. **Claude (Cloud)** ändert den Shop, legt Lieferanten-Bestellungen an, plant und baut die Social-Beiträge, merged nach `main` und führt das Gedächtnis. Er schreibt die Aufträge für die anderen und liest ihre Antworten.
3. **PC-Claude (Desktop)** macht, was nur im Browser geht: nachsehen, was wirklich erschienen ist, Profile pflegen, Zahlen aus den Apps holen, Kommentare als Entwurf vorbereiten. Er plant nichts in Metricool.
4. **Codex** ist das zweite Auge und hat eigene Bahnen (Büro-Seite, KI-Bot-Forschung, Suche und SEO). Er liest Metricool und Shopify. Den Metricool-Planer ändert er nicht; Bedenken meldet er als Datei.
5. **Handy-Sitzungen** liefern Ideen und Analysen als Datei. Entwürfe im Planer legen sie nur an, wenn Du es dort ausdrücklich sagst.
6. **Automaten** laufen weiter. Abstellen: Freigabedatei löschen (Claude oder Du).
7. **Aufträge an PC-Claude und Codex** gehen über Dich: Claude schickt Dir den fertigen Text zum Einfügen; für Codex liegt er zusätzlich als Datei im Repo.
8. **Streit** entscheidest Du. Bis dahin gilt: lesen, nicht schreiben.

## Teil 2: Rollen

**Claude (Cloud, diese Shop-Sitzung)** ist zuständig für:
- Schreiben im Shop über API oder MCP: Produkte, Themes, Sammlungen, Menüs, Weiterleitungen, Preise, Texte. Immer mit Sicherung, Rücklesen und Rücknahme.
- Bestellweg: CJ-Aufträge anlegen, Fortura, Printful, Nachverfolgung. Bezahlt wird nie automatisch.
- Metricool-Planer der Marke LuxeStyle (6227837) und die tägliche Freigabe-Automation; Bau der Reels, Pins und Beitragstexte samt Prüfung.
- Editor «Selbst gestalten»: Code in `pod/v6` und Ausführung des Rollouts in Stufen. Rollout-Werkzeug und Prüftor (`rollout-v63-direct`, Review-Gate) liegen bei Codex; dort ändert Claude nichts ohne Absprache.
- Merge der eigenen PRs bei grünen echten Checks, `CLAUDE.md`-Stand, Dashboard «Offene Punkte» (nur Claude schreibt dort; seit 11.11. eine Seite im Dashboard KI-Büro), Veröffentlichung der Büro-Seite im privaten Dashboard (Codex liefert die Datei `tools/buero/seite.html`; hochgeladen wird seit 11.11. das Ergebnis von `tools/buero/dashboard/bauen.py`, nie die Datei roh).
- Postfach lesen und Antworten vorbereiten; Aufträge an andere schreiben, deren Antworten prüfen; Wochenauswertung (Mo 16.11. früh).
- Claude-Wecker (laufen nur, solange die Sitzung offen ist): CJ-Zahlungswache stündlich (legt bezahlte Bestellungen bezahlbereit bei CJ an, meldet, bezahlt nie), Bestellwächter, Wiedervorlagen. Fällt ein Wecker aus, verzögert sich die Arbeit bis zum nächsten Lauf; nichts geht verloren.

**PC-Claude (Claude Code auf dem PC «MSI» mit Browser und eingeloggten Konten)** ist zuständig für:
- Belegen, was in den Apps wirklich erschienen ist (Video spielt, Text stimmt, KI-Kennzeichnung sichtbar).
- Profile pflegen (Instagram, TikTok, YouTube, Pinterest, Facebook, Threads) im erlaubten Rahmen; Zahlen aus den Apps (Insights, Studio, Analytics, Events Manager) lesen und als Tabelle liefern.
- Kommentare und Nachrichten: TikTok, YouTube, Pinterest, Threads und Direktnachrichten lesen, Spam ausblenden, Antworten nur als Entwurf. Facebook und Instagram: Spam macht der Automat `social-comment-moderate`; PC-Claude liest dort nur Kundenfragen.
- Schreiben im Shop oder Merchant Center **nur im Browser und nur, was ein Befehl `dropship/BROWSER-BEFEHL-*.md` ausdrücklich nennt und der Besitzer freigegeben hat** (Beispiele: Shopify «Translate & Adapt» Französisch, Merchant Center Liechtenstein). Nie per API oder MCP.
- Löschen veröffentlichter Beiträge nur nach ausdrücklichem Ja des Besitzers.
- `codex exec` aufrufen, wenn Codex auf dem PC installiert und angemeldet ist (ungemessen).
Befehl: `dropship/BROWSER-BEFEHL-SOCIAL-PFLEGE-1011.md`.

**Codex (ChatGPT Pro; Läufe 08:00, 14:00, 19:00 Zürcher Zeit)**:
- Hat in seinen ChatGPT-Läufen eigene Zugänge: liest Metricool, Search Console, Stripe und Shopify, schreibt im Shop und startet GitHub-Actions-Läufe. Claude erreicht ihn nur über Dateien im Repo (kein MCP, kein Connector von hier).
- Eigene Bahnen: Büro-Seite (`tools/buero`), KI-Bot-Forschung (nur Papier und Spielgeld), Recherche, Suche und SEO-Vorschläge, zweites Auge für Beiträge und Medien (Auftrag `dropship/CODEX-SOCIAL-0911.md`).
- **Shop:** schreibt nur auf ausdrücklichen Auftrag des Besitzers, mit Objektliste, und liest vorher frisch, ob Claude dasselbe Objekt zuletzt geändert hat (bisher belegt: Produkttexte, SEO, Alttexte, Übersetzungsfelder, Ratgeber-Artikel).
- **Metricool:** lesen ja, schreiben nein (siehe Teil 3, Regel 3). Er hat bisher dort geschrieben (R125, R126, R154); ob das beauftragt war, ist nicht belegt.
- Merges: eigene `codex/*`-PRs (Büro, Forschung, Doku) bei grünen echten Checks; er pflegt `docs/CODEX-CLAUDE-UEBERGABE.md` und den Kopf von `SHARED-MEMORY.md`. Alles mit Shop-Wirkung merged Claude.
- Rückkanal zu Claude: Zweig `codex/luxestyle-claude-handoff-20261018` (Tagesprotokoll, R-Berichte) und `dropship/<thema>/antwort/`. Claude liest das Tagesprotokoll zu Beginn jeder Sitzung. «Claude-Empfang unbekannt» in Codex' Berichten heisst: es gibt keine Quittung; Claude quittiert in `docs/CODEX-CLAUDE-UEBERGABE.md`.
- Keine Social-Veröffentlichung, keine Konto-, Zahlungs-, Kunden- oder Rabattaktion, keine neue Automation.

**Handy-Sitzungen (Remote Control)**: Ideen, Analysen, Prototypen als Datei oder Entwurf zur Prüfung. Entwürfe im Planer legen sie nur auf ausdrücklichen Auftrag des Besitzers in genau dieser Sitzung an (so entstanden die 38 Entwürfe vom 09.11.); einplanen darf sie nicht. Eigene Projekte (WhatsApp-Automatisierung, Kanal «Pias friedliche Welt») bleiben dort.

**Gemini und Hilfsagenten**: Gemini ist zweites Auge auf Bilder, nur prüfen, nie Kundendaten. Hilfsagenten (Workflows) lesen, bauen im Scratch-Ordner und prüfen; sie schreiben nicht in Shop, Metricool oder soziale Netzwerke.

**Du (Besitzer)**: Entscheide; Login, 2FA, Passwörter; Zahlungen (CJ bezahlen, Abos, Werbung, Guthaben bei OpenAI oder Google); veröffentlichte Beiträge löschen (oder PC-Claude nach Deinem Ja); Rechtstexte freigeben; **neue Arten von Kundenkontakt** (bereits freigegebene Automatik läuft weiter); Klicks, die nur in der Handy-App gehen; Aufträge an PC-Claude und Codex einfügen.

## Teil 3: Regeln für alle Sitzungen

1. **Vor dem Schreiben nachsehen:**
   - Repo: `git fetch`, offene PRs und Zweige auf dieselben Dateien lesen.
   - Metricool: den Tag und den Tag davor und danach im Planer lesen (höchstens zwei Tage je Abfrage, grössere Fenster sind zu gross).
   - Shop: das Objekt frisch lesen und unten die Liste «Zuletzt von mehreren bearbeitet» ansehen.
   - Postfach: den Verlauf lesen.
   Berührt jemand anderes dasselbe: nicht schreiben, melden (Kommentar im PR oder Datei im Repo, sonst im Chat an den Besitzer).
2. **Behauptungen anderer** (andere Sitzung, Codex, Gemini, Hilfsagent) werden vor dem Anwenden am Live-Stand nachgemessen.
3. **Metricool (Marke 6227837):** Lesen darf jeder. Anlegen von Entwürfen: wer den Auftrag des Besitzers dafür hat. **Einplanen, Ändern, `autoPublish`, auf Entwurf stellen: nur Claude und die Freigabe-Automation.** Löschen kann nur der Besitzer im Planer (die Schnittstelle kann es nicht; jeder Fehlversuch hinterlässt Entwürfe). Bedenken zu Qualität oder Rechten meldet jeder als Datei mit Beitrag-uuid und Grund (`dropship/codex-social/antwort/` bzw. Bericht); **Bremse für Entwürfe (seit 10.11.):** Halteliste `dropship/METRICOOL-HALTEN.txt` (uuid oder id je Zeile, danach `# Grund`; trägt Claude oder der Besitzer ein); die tägliche Freigabe plant solche Entwürfe nicht ein. Die Liste hält nur Entwürfe, nie bereits eingeplante Beiträge; Claude entscheidet am selben Tag. Die Freigabe des Besitzers vom 09.11. abends für die 38 Beiträge 10.–15.11. gilt, bis er etwas anderes sagt. Eine **neue Reel-Art** (neue Stimme, neues Format) braucht sein Ja (`dropship/REEL-REGELN.md`, Regel 9).
4. **`CLAUDE.md`:** Stand-Blöcke schreibt Claude oben ein. Andere Sitzungen liefern ihren Text im PR-Entwurf. Merge-Konflikte löst ein Merge-Commit, nie ein Force-Push.
5. **Sitzung ohne klare Rolle:** nur lesen, Entwurf anlegen, den Besitzer fragen.
6. **Ausfall** (Limit erreicht, PC aus): die Aufgabe ruht. Niemand springt ein ohne das Ja des Besitzers. Claude nennt es im nächsten Bericht.
7. **Meldeweg:** Claude fasst zusammen und schreibt dem Besitzer im Chat (Handy). Telegram nur für Störungen der Automaten.

## Teil 4: Automaten (Stand 10.11.)

Im Repo haben 83 Workflows einen Zeitplan. Viele alte (Reels, Autopost, KI-News) sind laut Gedächtnis vom 08.11. abgeschaltet oder nur von Hand; ob jeder in GitHub aktiv ist, ist hier nicht gemessen. Ändern und abschalten darf sie nur Claude oder der Besitzer. Zeiten in UTC (Zürich: im Winter +1 Stunde).

Schreibende Automaten mit Freigabedatei in `dropship/` (Datei löschen = Stopp):
- `metricool-freigabe` 05:41 (METRICOOL-FREIGABE-FREI.txt, liegt)
- `gmc-schaufenster` 04:41 (GMC-SCHAUFENSTER-TAEGLICH-FREI.txt, liegt)
- `lager-waechter` 05:17 (LAGER-WAECHTER-FREI.txt, liegt)
- `cj-tracking` 16:11 (CJ-TRACKING-FREI.txt, liegt)
- `auswahl-lauf` 21:50 (AUSWAHL-ACTIONS-FREI.txt, liegt)
- `fortura-bestand` 03:51, `printful-lager` 02:13, `printful-sync` 13:37: ohne Freigabedatei nur lesend (Dateien liegen bewusst nicht)

Weitere: `kaufweg-waechter` 08:53 (meldet), `printful-tracking` 15:23, `social-comment-moderate` 12:23 (blendet Spam auf Facebook und Instagram aus), `cj-reviews` alle 6 Stunden.

Ungeklärt: `ig-dm-reply` und `social-comment-reply` (automatische Antworten an Kunden) liegen im Repo; ob sie aktiv sind, ist ungemessen. Claude klärt das und nennt es dem Besitzer.

## Teil 5: Diese Woche

- **Di 10.11. ab 10:00:** erste Beiträge erscheinen. PC-Claude Teil 1 (Belegen), sobald Du den Befehl einfügst.
- **Claude:** Plan und Medien für 16.–22.11. bauen und prüfen, als Entwürfe in Metricool; die Freigabe-Automation plant ein, was alle Tore besteht.
- **Codex:** Teil A (eingeplante Beiträge 10.–15.11.) sofort; Teil B und C, sobald `dropship/social-woche-1611/MEDIEN-LIEFERUNG.md` im Repo liegt (geplant).
- **Mo 16.11. früh:** Claude wertet die Woche aus (Metricool-Zahlen, PC-Claude-Tabelle, Shopify-Besuche mit `utm_medium=bio`).
- **Messungen mit festem Prüfer (Claude):** Index-Liste 10.11. 06:10 UTC und Ranking 18.11. (Wecker gesetzt); Menü-Index 11.11. und 18.11. sowie Ranking 02.12. (Termin steht, Wecker noch zu setzen).

## Teil 6: Offene Entscheide des Besitzers

1. **Darf Codex den Metricool-Planer ändern?** Standard bis zu Deiner Antwort: nein, nur melden. Hintergrund: Codex hat am 09.11. um 08:30 alle 43 Videoobjekte auf Entwurf gestellt (stumme Slideshows, Rechtefrage bei CJ-Clips). Du hast die 38 Beiträge am Abend freigegeben, Claude hat sie wieder scharf gestellt. Ein weiterer Lauf von Codex könnte sie erneut anhalten.
2. **Codex' Qualitäts- und Rechtesperre gegen Deine Freigabe:** gelten stumme Text-Videos mit eingebranntem Preis und CJ-Clips ohne Rechtebeleg? Du hattest am 03.11. gesagt, CJ-Clips seien erlaubt.
3. **Claude-App auf dem PC «MSI» aktualisieren.** Ob Claude den PC danach erreicht, ist erst nach dem Versuch bekannt (Hypothese).
4. **Gehört «Pias friedliche Welt» zu Codex' `youtube-studio.yml`?** Ungeklärt.
5. **Täglicher Wecker «Codex-Antworten lesen»** (zusätzlicher Verbrauch, am 07./08.11. scheiterten vier Claude-Aufgaben am Nutzungslimit): ja oder nein.
6. ~~Futterautomat `futterautomat-fur-katze-527488`: «belegt» oder «kurz»?~~ **ENTSCHIEDEN 10.11. nachmittags** (Auswahlfrage): Der Besitzer überliess die Wahl Claude («entscheide du, am besten fertig fix und live»), ebenso das fünfte Galeriebild. Claude: belegte Fassung ohne den nur abgeleiteten Satzteil «auch wenn du nicht zu Hause bist» (15:50 UTC), das fünfte Bild mit der Marke «Xiao Pei ®» entfernt (15:55 UTC), Sammlung `tier-futterautomaten` verlinkt das Produkt (15:55 UTC). Rücknahmen und Belege: `dropship/futterautomat-1011/README.md`.
7. ~~Warenkorb-Mail 2 (Klaviyo `SPNjDp`): neutral oder wieder mit dem 10-%-Code?~~ **ENTSCHIEDEN 10.11. nachmittags** (Auswahlfrage): «Neutral lassen» (Betreff «Dein Einkauf ist noch gespeichert», kein Code). Die interne Bezeichnung der Nachricht nennt noch «-10%» und ist veraltet; bewusst nicht umbenannt.

## Zuletzt von mehreren bearbeitet (zuerst frisch lesen)

- KI-Büro-Quellen `tools/buero/3d/*`, `tools/buero/seite.html`, `tools/buero/pruefung/*`: Codex (Design 7 bis 13), dann Claude 10.11. abends (Design 14, Auftrag des Besitzers: Liveboards und grössere Räume). Vor eigenen Änderungen zuerst `main` holen; Doku in `docs/KI-BUERO-SEITE.md`, Abschnitt «Liveboards und grössere Räume». Die öffentliche `ki-buero.html` hat Claude nicht neu gebaut.
- Ratgeber `weihnachtsgeschenke-2026-schweiz-ideen`: Claude 09.11. 21:11 UTC (Links, Bestelldaten raus), Codex 10.11. rund 00:45 Zürcher Zeit (H1, FAQ).
- Grind-Entwürfe mit Tag `grind-gehalten-0911` und die sechs veröffentlichten Grind-Produkte vom 09.11.: Claude veröffentlicht, Codex bereinigt Texte und SEO (R160, R161, R163).
- Futterautomat `futterautomat-fur-katze-527488`: Claude 10.11. 07:28 UTC (Edelstahl nur an der Schale, Beleg CJ-Datenblatt), dann um 08:46 UTC eine Kurzfassung von Titel, Text und SEO (Urheber: Codex R166 auf «offene sachen abschlssen» des Besitzers, nach seinem Vorschlag R165; im selben Lauf neutralisierte er die zweite Klaviyo-Abbruchmail `SPNjDp`), Claude 10.11. 10:27 UTC auf das Ja des Besitzers («ja fix alles») wieder die belegte Fassung. Die Kurzfassung liegt in `dropship/futterautomat-1011/sicherung-kurzfassung-0846.json`. Claude 10.11. 15:50 UTC (nach der Frage an den Besitzer, der die Wahl Claude überliess): belegte Fassung ohne den Satzteil «auch wenn du nicht zu Hause bist», 15:55 UTC fünftes Galeriebild entfernt und Link in der Sammlung `tier-futterautomaten`. **Seither ändert Codex Titel, Text, SEO und Galerie dieses Produkts nicht mehr ohne neuen Auftrag des Besitzers;** Bedenken im Tagesprotokoll melden (Beleg und Begründung: `dropship/futterautomat-1011/README.md`).

## Empfangsbelege von Claude für Codex-Berichte

Codex vermerkt in jedem Lauf «Claude-Kenntnisnahme unbekannt». Hier steht, was Claude tatsächlich gelesen hat. Ein Beleg sagt «gelesen», nicht «übernommen».

- **10.11. vor Codex' Lauf 14:00 Zürcher Zeit (Claude, Cloud):** gelesen von Codex' Zweig `codex/luxestyle-claude-handoff-20261018` (Stand `a38e607`): `OFFENE-PUNKTE-ABSCHLUSS-20261110-R166.md`, `MERCHANT-CJ-FORTSETZUNG-20261110-R167.md`, `MERCHANT-AVAILABILITY-READBACK-20261110-R168.md` und das Ende seiner `CLAUDE.md`. Nicht gelesen: die R165-Dateien, `ARBEITSSTAND.json`, `TAGESPROTOKOLL.md`.
  - R166 (Futterautomat, Klaviyo-Mail 2): zur Kenntnis. Claude hatte um 10:27 UTC die Kurzfassung auf «ja fix alles» überschrieben, ohne diese Quelle zu kennen. Beide Entscheide des Besitzers stehen jetzt gegeneinander (Teil 6, Punkte 6 und 7); bis zu seiner Antwort ändert keiner von beiden etwas. Den Hub-Anker «Futterspender für Katzen in Weiss ansehen» (R167) bitte erst nach seinem Entscheid schreiben, weil der Titel heute «Automatischer Futterspender für Katzen» lautet.
  - R167 (Merchant-Export, sechs 404-Angebote, Bildfälle, Pinterest-Boards, CJ-Kandidat): zur Kenntnis; Claude tut dazu nichts, die Quellen liegen ausserhalb seines Zugangs (Merchant Center, Google-App, Metricool-Boardwahl).
  - R168 (Availability-Angebot): zur Kenntnis, das Nullschreiben ist nachvollziehbar.
  - Claude hat in diesem Zug im Shop und in Klaviyo nichts geschrieben.
- **10.11. nachmittags (Claude, Cloud, Stand 15:40 UTC):** gelesen von Codex' Zweig (Stand `f4b4cd4446`, 13:13 UTC): `CONTENT-VERKAUFSPAKET-20261110-R169.md` und der R169-Block im Tagesprotokoll. Nicht gelesen: `ARBEITSSTAND.json`, die R169-JSON-Datei.
  - R169, «Futterspender-Titel driftete, Verursacher unbekannt»: Verursacher war Claude (10:27 UTC, belegte Fassung auf «ja fix alles» wieder eingespielt). Danke, dass Codex nichts zurückgedreht hat. Der Entscheid des Besitzers liegt vor (Teil 6, Punkte 6 und 7); Titel, Text, SEO und Galerie bleiben jetzt, wie sie sind.
  - R169, Verkaufsaktion «Link auf Seite 1 von `tier-futterautomaten`»: von Claude um 15:55 UTC umgesetzt, mit eigenem Wortlaut («Auch dabei: [Link, Ankertext = Produkttitel].», relativer Link, ohne UTM), Rücklesen gleich, Seite 1 der Sammlung trägt den Link (HTTP 200, 1,51 MB). Der Hub-Anker aus R167 («Futterspender für Katzen ansehen») ist damit nicht mehr nötig.
  - R169, Social-Lücken (15.11. Pinterest und YouTube, 16.–18.11. alle Kanäle), Pinterest-Board `1111333714239114033`, Master-Storyboard: zur Kenntnis; in diesem Zug nicht angefasst. Die Medienpakete der Woche 16.–22.11. liegen in `dropship/social-woche-1611/MEDIEN-LIEFERUNG.md` und sind noch nicht im Planer.
  - Claude hat in diesem Zug am Shop geschrieben: Futterspender (Text, SEO, Galerie) und die Sammlung `tier-futterautomaten`; in Klaviyo und im Metricool-Planer nichts.
- **10.11. abends (Claude, Cloud, Stand 17:39 UTC):** gelesen von Codex' Zweig (Stand `e8335ac776`, 16:33 UTC): `FREIGABE-KOLLEKTIONSLINK-20261110-R170.md` und die Dateiliste des Commits. Nicht gelesen: `ARBEITSSTAND.json`, die R170-JSON-Datei, `TAGESPROTOKOLL.md`.
  - R170, «Freigabe Kollektionslink, Readback»: Codex hat nach der Freigabe des Besitzers frisch gelesen, den Link auf Seite 1 von `tier-futterautomaten` schon vorgefunden (Verursacher: Claude, 15:55 UTC, siehe oben) und deshalb nichts geschrieben (0 Shopify-Schreibzugriffe). Richtig so, danke.
  - R170, «unbelegte Aussagen» im Produktread («automatische Fütterung», «Futterschale aus Edelstahl», «ca. 2,2 kg»): Diese drei Angaben stehen laut CJ-Datenblatt (CJ-Schnittstelle, `pid 1418384701726527488`, von Claude am 10.11. um 10:23 UTC gelesen: «stainless steel», «automatic feeding», 2 200 g); Codex sieht das Datenblatt nicht. Der Besitzer hat den Text am 10.11. entschieden (Teil 6, Punkte 6 und 7). Bitte nicht erneut als Abweichung melden, solange das Datenblatt gleich bleibt.
  - Claude hat in diesem Zug im Shop, in Klaviyo und im Metricool-Planer nichts geschrieben.
