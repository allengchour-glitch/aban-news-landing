# Tagesauftrag an Codex · Mo 16.11.2026 (von Claude, Auftrag des Besitzers)

Besitzer 16.11. ca. 09:50 UTC: «arbeite mit codex, er hat nur heute zeit nutze das voll aus».

Die Pakete sind nach Wert geordnet: A zuerst. Jedes Paket hat einen eigenen Zweig `codex/…-1611` und endet mit einem PR nach `main` oder mit einer Antwortdatei. Was Shop-Wirkung hat, merged Claude nach Prüfung gegen den Live-Stand. Claude liest deine PRs heute laufend und merged sie zeitnah (Rollen: `docs/ARBEITSTEILUNG-1011.md`).

**Grenzen für alle Pakete:**
- Keine Metricool-Writes. Beiträge nie direkt mit `autoPublish` anlegen; am 15.11. um 14:31 Zürich entstanden so drei Videos mit Musik an der Freigabe vorbei, der Urheber ist unbekannt.
- Keine Social-Veröffentlichung, keine Kundenansprache, keine Budgets, Flows oder DNS, keine neue Automation.
- Kein Theme-Write auf MAIN `213991391623`.
- Neue Musik oder Stimme in Videos nur mit Ja des Besitzers (Regel 10.11., `dropship/REEL-REGELN.md`).
- Quittiere jedes Paket unten unter «Antwort Codex» (Paket, PR oder Datei, Run-ID, was offen ist).

## A · Rollout-Pfad Editor 6.4.2 (höchster Wert, schon bestellt)

Auftrag und Grenzen: `dropship/CODEX-ROLLOUT-V642-1611.md`, Kurzfassung:
- `EDITOR_VERSION=6.4.2` im Werkzeug `dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/`. Der 6.4.0-Pfad bleibt bytegleich als Rückweg.
- Stufen `canary-tasse`, `canary-jutebeutel` und `full` (16 Seiten), je mit eigenen Bestätigungen. Die BLOCKLIST (Bügeltransfer, Dad-Cap, Magnet) bleibt.
- Tests mit den 16 echten Live-Blöcken (frisch aus dem Shop) und eine Mutationsprobe.
- **Ein `mode=plan`-Lauf in Actions als Beleg, keine Apply-Läufe.**

Sobald der PR grün ist, holt Claude das Ja des Besitzers je Stufe und führt die Stufen heute noch aus. **Ohne A bleibt der fertige Editor 6.4.2 liegen.**

## B · Drei gehaltene Videos stumm und korrigiert neu rendern

> **Stand 16.11. 11:30 UTC (Claude):** Medizin-Box und Wasserwellen sind erledigt. Claude hat die Musik durch Stille ersetzt (Bild bytegleich) und das Medium in den Entwürfen getauscht, der Besitzer hat beides freigegeben. Das gilt auch für Sternenlicht und den Knoblauch-Hacker. **Paket B ist nur noch «3 Ideen für Hund und Katze»:** neue Einblendungen, «für» statt «fuer», ein Titel passend zum Bild, ohne den Textrest «darf», stumm.

Gemessen 16.11.: Die drei Videos vom 15.11. tragen durchgehend Hintergrundmusik und stehen darum auf der Halteliste. Analyse: `dropship/social-analyse-1611/README.md`.

| Video | Quelle (Metricool) | Was zu tun ist |
|---|---|---|
| «3 Ideen für Hund und Katze» (21 s) | `static.metricool.com/common/202611/6227837-mtr_2628806899308737576.mp4` | Ton weg; «fuer» → «für» in allen Einblendungen; der Titel muss zum Bild passen (über dem Hund mit Saugnapf-Spielzeug steht heute «Spielzeit fuer deine Katze»); den fremden Textrest «darf» im ersten Abschnitt entfernen |
| Medizin-Box 8 Fächer (7 s) | `…mtr_13422080667703116992.mp4` | nur Ton weg |
| Wasserwellen-Wiederholung (7 s) | `…mtr_1421788049342258293.mp4` | nur Ton weg |

- **Liefern:** Dateien in `dropship/social-analyse-1611/antwort/`, je MP4 ohne Tonspur, 1080×1920, H.264. Dazu je ein Kontaktbogen (6 Bilder), SHA-256 und eine Zeile «was geändert».
- **Nicht in Metricool hochladen.** Claude tauscht die Medien in den Entwürfen und plant über die Freigabe ein, sobald der Besitzer die stummen Fassungen annimmt.
- Wenn du die Videos selbst gebaut hast: bitte den Bauweg nennen. Wenn nicht: «Urheber unbekannt».

## C · Deine offenen Entwurfs-PRs aufräumen

Offen sind rund 20 `codex/*`-Entwürfe vom 08. bis 15.11., viele davon `unknown`/`unstable` gegen das heutige `main`. Für jeden einzeln:
1. **Überholt** (heute schon anders gelöst oder durch neue Regeln ersetzt): schliessen, mit einem Satz Grund.
2. **Eigene Bahn** (Büro, Forschung, Doku, reine Tests): `main` einmergen (kein Rebase, kein Force-Push), echte Checks grün, selbst mergen.
3. **Shop-, Workflow- oder Bestellweg-Wirkung:** `main` einmergen, Checks grün, als bereit markieren und unten in die Liste für Claude setzen. Claude prüft und merged.

Bekannte Punkte:
- **#2932** würde `social-comment-moderate.yml` auf `if: false` setzen. Der Besitzer hat den Spam-Wächter am 06.11. bejaht. Ohne neuen Beleg: schliessen oder diesen Teil herausnehmen.
- **#2919** («Social-Videos strikt ohne Sprache»): Seit 02.11. ist Hochdeutsch-Stimme erlaubt, seit 10.11. Musik ausgesetzt. Auf die heutige Regel anpassen oder schliessen.
- **#3152** (Merchant: Produktbilder, Ringgrössen-Hilfe) und **#3145** (Editor-Fokus): bitte zuerst, beide mit Shop-Wirkung, also für Claude.
- **#2689** (Wissensbranch, 682 000 Zeilen, `dirty`): nicht mergen. Bleibt dein Rückkanal.

**Liefern:** eine Tabelle «PR · Entscheid · Grund · Run-ID» unten unter «Antwort Codex».

## D · SEO-Bahn: nächste belegte Seiten (deine Bahn, grösster Verkaufshebel)

Die Social-Analyse zeigt: 0 Käufe aus Social in 45 Tagen, die Käufe kommen aus Google, direkt und ChatGPT (die ChatGPT-Zuordnung ist widersprüchlich). Deine 36-Seiten-Liste ist fertig (R255).
- **Nächste Auswahl:** Seiten mit Search-Console-Position 5 bis 20 und mindestens 30 Impressionen in 28 Tagen, ohne die 36 bearbeiteten und ohne Rizinusöl-Wickel.
- **Je Seite:** Titel, Meta, Einleitung und eine Kaufhilfe, jede Aussage aus Datenblatt oder Produktdaten belegt. Keine Preise oder Lieferzeiten im Text, keine Gesundheitsversprechen.
- **Live:** nur Produkt- und Sammlungsfelder, wie bei R251 bis R255. Vorher frisch lesen, ob Claude das Objekt zuletzt geändert hat. Sicherung und Rücklesen wie bisher.
- **Offener Fund aus R252 (Waage `og:price` 101.90 statt Angebot 127.90 CHF):** als Patch-Datei mit Test liefern. Claude spielt ihn ins Theme ein.

## E · Social-Messung mit gleichem Alter (Werkzeug, keine Automation)

- **Werkzeug:** `automation/social_messung.py`, nur lesend über die Metricool-REST-Schnittstelle (Muster: `automation/metricool_freigabe.py`, Klasse `Metricool`).
- **Ablauf:** je Beitrag der letzten 10 Tage und je Netzwerk die Kennzahlen lesen und als Zeile mit Beitragsalter in Stunden nach `dropship/social-messung/<datum>.json` schreiben. Netzwerke: IG Reels/Posts, TikTok, YouTube, Facebook-Reels, Pinterest, Threads.
- **Eine Zeile enthält:** uuid oder URL, Netzwerk, Format, Aufrufe/Reichweite, Sehdauer, Wegwisch-Anteil, falls vorhanden.
- **Tests:** mit Attrappe, ohne Netz.
- **Workflow:** Claude baut ihn danach (täglich), du nicht.

Ziel: Vergleiche bei 48 Stunden und 7 Tagen statt Alter gegen Alter.

## F · Büro (klein, eigene Bahn)

- `tools/buero/pruefung/test_liveboard.js` erwartet noch Design 16: auf `main` sind deshalb 3 Prüfungen rot. Auf den heutigen Stand bringen.
- Bis zur Baugrenze von `tools/buero/seite.html` bleiben 1 431 Byte. Den Büro-Stil beim Bauen in eine eigene Datei auslagern (README `tools/buero/dashboard`).

## Was Claude heute dafür tut

- PRs von A bis F laufend lesen, gegen den Live-Stand prüfen und mergen, was Shop-Wirkung hat.
- Nach A die Rollout-Stufen 6.4.2 mit dem Ja des Besitzers ausführen: Tasse, Jutebeutel, Beobachtung, Full.
- Nach B die Medien tauschen und nach dem Ja des Besitzers einplanen.
- Nach D den Theme-Patch einspielen, nach E den Workflow bauen.

## Max-Modus (Besitzer 16.11. ca. 10:05 UTC: «codex in max modus heute»)

Du hast heute die volle Kapazität. Arbeite unabhängige Pakete parallel ab; A bleibt zuerst. Zusätzlich zu A bis F:

### G · Metricool-Zweitmeinung (nur lesen, dein eigener Zugang)

Claude macht heute selbst eine Metricool-Analyse mit Social-Pflege. Deine Fassung ist das unabhängige zweite Auge: bitte nicht Claudes Ergebnis abwarten.
- **Planer 16.11. bis 06.12.:** jeden Beitrag prüfen.
  - Ist es ein Video? (Fotos, Karussells, Threads- und TikTok-Fotos nur, wenn sie schon eingeplant waren)
  - Steht die uuid auf der Halteliste `dropship/METRICOOL-HALTEN.txt`?
  - Ist das Produkt ACTIVE und in der Schweiz lieferbar? Stimmt der Link? Stimmt der Preis mit dem Shop überein, falls einer genannt ist?
  - TikTok: Titel gesetzt, `autoAddMusic` aus, Eigenwerbung an?
  - Instagram: höchstens 5 Hashtags?
  - Gibt es zu jedem Video eine YouTube-Short-Fassung?
  - Haben automatisch geplante Beiträge im selben Netzwerk mindestens 3 Stunden Abstand?
- **Veröffentlicht 01. bis 15.11.:** Kennzahlen je Beitrag mit Alter in Stunden, verglichen bei 48 Stunden und bei 7 Tagen. Was trägt, was nicht?
- **Liefern:** `dropship/social-analyse-1611/antwort/codex-zweitmeinung.md`, eine Tabelle «uuid · Netzwerk · Termin · Befund · Vorschlag».
- Kein Schreiben in Metricool, keine Antworten auf Kommentare.

### H · Stumme Produktvideos für Tage ohne Video (nur Dateien)

- **Lücken finden:** Lies im Planer, welche Tage zwischen 23.11. und 06.12. noch kein Video haben.
- **Bis zu 6 neue Videos:** aus CJ-Gratisvideos (`product/queryVideosByProductId`, wie in `dropship/tiktok-cj-videos-0311/PAKET.md`).
- **Produktwahl:**
  - Das Produkt ist ACTIVE und hat eine Frachtlinie CN nach CH.
  - Bereich Gadget, Haustier oder Wohnen (laut Analyse trägt das).
  - Im Bild keine Fremdmarke, keine Gesichter, keine Fremdschrift.
  - Nicht auf der Halteliste und nicht schon im Planer.
- **Je Video:**
  - MP4 1080×1920, H.264, **ohne Tonspur**, 7 bis 20 Sekunden.
  - Kontaktbogen mit 6 Bildern, SHA-256, Produkt-Handle.
  - Beitragstexte für Instagram/Facebook, für TikTok (mit Titel) und für YouTube (Titel mit `#Shorts`). Höchstens 5 Hashtags, kein Preis, kein Lieferversprechen, keine Gesundheitsaussage.
- **Ablage:** `dropship/social-woche-2311/antwort/` mit einer Zeile «Quelle (pid, Video-ID)» je Datei.
- **Nicht in Metricool hochladen.** Claude prüft, legt Entwürfe an, und die Freigabe plant ein.

### I · SEO ausweiten

Paket D heute auf bis zu 20 Seiten statt einer kleinen Auswahl, gleiche Regeln. Je fertiger Fünfergruppe ein R-Bericht.

## Max push: alles gleichzeitig (Besitzer 16.11. ca. 10:10 UTC: «codex max push bitte nur heute zeit»)

Wenn du mehrere Aufgaben gleichzeitig laufen lassen kannst, ist jedes Paket eine eigene Aufgabe mit eigenem Zweig `codex/<paket>-1611`.
- **Quittung bei parallelen Aufgaben:** nicht hier unten, sondern in `dropship/codex-antwort-1611/<Paket>.md` (eine Datei je Paket), damit die Aufgaben sich nicht in derselben Datei stossen.
- **Reihenfolge, wenn nur eine Aufgabe läuft:** A, B, C, J, D/I, K, L, G, H, E, F.

### J · Samichlaus und Schmutzli (6.12.), nur Dateien

GEMESSEN 16.11. 10:09 UTC: `/collections/samichlaus`, `samichlaus-schmutzli`, `samichlaus-kostueme` und `nikolaus-kostueme` liefern HTTP 404. Google schlägt in der Schweiz «Samichlaus» und «Schmutzli» vor (09.11.).
- **Produkte finden:** aktive Produkte, die wirklich zum Samichlaus passen (Kostüm, Bart, Mütze, Sack, Rute, Laterne, Schmutzli-Kutte). Fortura-Ware aus dem Schweizer Lager zuerst.
- **Prüfen je Produkt:**
  - ACTIVE und kaufbar.
  - Der Lieferhinweis der Produktseite reicht bis 6.12.
  - Keine Lizenzfigur, kein Echtfell.
- **Liefern:** Vorschlag für eine Sammlung (Handle, Titel, SEO-Titel bis 60 Zeichen, Meta bis 155 Zeichen, Einleitung mit belegten Aussagen, Produktliste mit Reihenfolge) und einen Absatz für den Weihnachts-Ratgeber, abgelegt unter `dropship/samichlaus-1611/antwort/`.
- **Nicht selbst anlegen:** Claude legt Sammlung und Menüeintrag an.

### K · Offene Funde vom 28.10. (`dropship/CODEX-FUNDE-2810.md`)

- **Prüfen:** jeden Fund gegen das heutige `main`. Stand dort: «alle offen»; seither wurde einiges anders gelöst.
- **`automation/printful_sync.mjs` und `automation/lib/printful_platzierung.mjs` nicht anfassen:** Daran arbeitet der Zweig `claude/luxestyle-bestellweg-haertung-1011`. Dort nur auflisten, welche Funde der Zweig schon löst.
- **Übrige offene Funde** (Printful-Neupreise, Material, CJ-Varianten, Fortura-Sperre, Google-Feed, Bewertungen): je Datei einen PR.
  - Der Test ist am alten Code rot und am neuen grün.
  - Dazu eine Mutationsprobe.
  - Keine Live-Läufe.
- **Shop-Wirkung:** alles hier hat Shop-Wirkung. Die PRs sind also für Claude; als bereit markieren und in der Quittung auflisten.

### L · Hauptbilder ohne Werbetext (Merchant), nur Datei

- **Auswahl:** die 100 Produkte mit den meisten Google-Einblendungen oder Shop-Besuchen der letzten 28 Tage, ohne die Produkte aus #3152.
- **Prüfen:** das Hauptbild auf Werbetext, Wasserzeichen, Fremdlogo, Collage und Infografik.
- **Je Fund:** welches Bild aus der eigenen Galerie besser ist (Index und URL) und warum.
- **Liefern:** `dropship/hauptbild-1611/antwort/liste.md`. Claude tauscht die Bilder nach Sichtung.

## Antwort Codex

(offen)
