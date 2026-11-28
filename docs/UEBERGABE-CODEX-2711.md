# Übergabe Claude → Codex · 27.11.2026, ~20:30 UTC

Der Betreiber hat am 27.11.2026 geschrieben: «speichere memory für chatgpt codex er macht weiter». Ab jetzt arbeitet Codex am Shop **LuxeStyle CH** weiter. Diese Datei ist der Einstieg. Lies sie zuerst, danach nur bei Bedarf die Quellen unten.

> **Wichtig vorab:** Die Claude-Sitzung arbeitete auf dem Branch **`claude/luxestyle-status-tztnn1`** (Draft-PR **#1608** nach `main`, NICHT gemergt). Viel aktueller Code und das ganze Gedächtnis der letzten Wochen liegen NUR dort, nicht auf `main`. Arbeite von diesem Branch aus oder hole die Dateien mit `git show origin/claude/luxestyle-status-tztnn1:<pfad>`. Nie direkt nach `main` pushen.

## 1. Wo das Gedächtnis steht
| Datei | Inhalt |
|---|---|
| `CLAUDE.md` (Branch) | Kern: Regeln, Dauerauftrag, aktueller Stand, Index «📚 Jüngste Lehren» (je 1 Zeile) |
| `GEDAECHTNIS-JOURNAL.md` | Tagebuch aller Lehren, neueste oben (~2,3 MB, nicht ganz lesen) |
| `SHARED-MEMORY.md` | Parallel-Sessions, viele Zeilen sind ÜBERHOLT markiert |
| `AGENTS.md` (main + Branch) | Codex-Regeln (Rolle, harte Regeln, Arbeitsteilung) |
| `dropship/AUTONOMER-MODUS.md` | Runbook inkl. §9 Master-Lessons, §10 Kunden gewinnen |

Suche über alles: `python3 tools/gedaechtnis.py "stichwort"`. Neue Lehren: oben ins Journal, eine Einzeile in den CLAUDE.md-Index (CLAUDE.md < 70 KB halten).

## 2. Wie der Betreiber arbeiten will (wörtlich belegt)
- **Kurz antworten:** 1–3 Zeilen, Ergebnis + was er tun muss, keine Herleitung (24.11. «weniger details wie codex»).
- **Sparmodus** (22.10.): keine unnötigen Wiederholungs-Prüfungen, einmal messen und dem Messwert glauben.
- **«du bist mail chef» + «mach du alles für mich»** (24.11.): Kundenmails selbst senden (vorher den FRISCHEN Thread lesen; Absender info@luxestyle.ch) und Rückerstattungen selbst auslösen.
- **CJ NIE selbst bezahlen** (Zahl-API nie aufrufen). Offene CJ-Zahlungen nur melden: «CJ → Bestellungen → LX… → Pay».
- **Verboten:** Creator-Anfragen, eigene Gesichts-/Handyvideos (06.10.), B2B mit Kosten, Geld ausgeben ohne Betreiber-Entscheid, Heilversprechen, Rabatte > 15 %, Bot-Schutz umgehen, Marketing-Mails an Personen ohne Einwilligung, Preise senken wegen Preisvergleich (24.11.: teurer als CH-Markt ist OK).
- **Gratisversand-Text:** «ab CHF 50 nach Rabatt» (Mengenrabatt 10 % ab 2 Artikeln).
- **Editor/POD («Selbst gestalten») ist heilig:** nach jeder Änderung `automation/pod_editor_qa.mjs` (0 Befunde).
- **Theme:** Live-Theme-ID IMMER über `automation/main_theme.py` (`gid()`, fail-closed; MAIN = 214565814663 seit 21.11.). Ablauf: Trockenlauf → Sicherung → schreiben → zurücklesen.

## 3. Zugänge (nur Namen, nie Werte in Dateien)
- Shopify Admin: `SHOPIFY_SHOP` (au3j0y-hq.myshopify.com), `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` → Token per Client-Credentials-Grant (`bash automation/shop_token_refresh.sh` schreibt `/tmp/cj_shop_token.txt`; Python-Helfer `from kaufwille_zeile import gql`).
- CJ: `CJ_EMAIL`, `CJ_API_KEY` (Token `/tmp/cj_token.json`, `/tmp/_cjtok`; `getAccessToken` höchstens alle 5 Min.). Alle CJ-Aufrufe über `automation/cj_takt.mjs`/`cj_takt.py` (1/s-Drossel, Vorrang-Logik).
- Texte: `GROQ_API_KEY*` (5 Schlüssel; Limit 200k Tokens/Tag je Modell UND Organisation), DeepSeek/Gemini ohne Guthaben. `FIRECRAWL_API_KEY` (5'000 Credits/Monat bis 24.12.).
- Gmail, Klaviyo, Metricool, OpenSEO, Google Drive liefen bei Claude über claude.ai-Konnektoren. **Codex braucht dafür eigene Zugänge** — sonst diese Teile dem Betreiber melden.

## 4. Was im Hintergrund läuft (Claude-Cloud-Container)
- Start aller Motoren: `bash automation/autostart.sh` (idempotent) → Aufseher `automation/fixer_keepalive.sh`, `automation/engine_keepalive.sh` (Ampelzeilen STAND/BESTELLUNGEN/SCHAUFENSTER …), 4 CJ-Runner (Grind, `_GRIND_RUNNER_ZAHL`=4), Auto-Committer (nur `dropship/`), Reel-/Social-Motoren.
- Container startet ~stündlich neu; Prozesse sterben, Repo überlebt → nach jedem Commit sofort pushen.
- Laufen diese Motoren in Codex' Umgebung nicht, steht der Grind und der Bestell-Abgleich (`automation/cj_fulfill_runner.sh` → `cj_fulfill_engine.py`).

## 5. Geplante Aufgaben (feuern in die CLAUDE-Sitzung, nicht zu Codex)
Der Betreiber entscheidet unter claude.ai → Geplante Aufgaben, ob sie weiterlaufen. Stand 27.11. (Zeiten UTC):
- **28.11. 05:39** #1047 Augencreme: CJ-Ticket T202611271548558321 + Mail an CJ prüfen (Markenware? Produkt bleibt DRAFT).
- **28.11. 06:00** Index-Liste nächste Lieferung (`dropship/INDEX-LISTE-2211.md`).
- **29.11. 08:13** Microsoft Merchant Center (0 aktive Produkte?) + Trustpilot nachfragen.
- **29.11. 17:00** Klaviyo-Kampagne «Black Week Endspurt» ist GEPLANT (Kampagne 01M8EY3RVD7FZB4G514QKN86WR) — läuft von selbst.
- **30.11. 23:10** Black Week aufräumen (Banner `ls_announce_bw`, Kollektion `black-week`, Bilanz). Rabatt endet selbst 30.11. 22:59.
- **30.11. 23:00** Aufseher startet `mindest_stueckgewinn.py` (Preise +CHF 8 Mindest-Stückgewinn, ~35'000 Produkte, Rückweg `--zurueck`).
- **01.12. 07:07** Mindestgewinn-Lauf prüfen (`python3 tools/tore.py dropship/tore/mindestgewinn.md`).
- **01.12. 09:00** Abbruch-Mail-Filter (Wegwerf-Adressen), FAQ-Runde 3 für 8 ChatGPT-Kollektionen (erst nach dem Preislauf), Black-Week-Rückbau.
- **02.12.** SEO-Push Nachmessung 4/4 · **04.12.** #1040 Paket nachfassen · **10.12.** Campaign Autopilot nachmessen · **15.12.** Mindestgewinn-Wirkung · **05.01.2027** AHV-Unterlagen · **08.01.2027** OpenSEO-Crawler-Signatur erneuern.
- Dauerläufer: CJ-Zahlungswache (alle 3 h), Bestellwächter 08:20/18:20, Lagebeurteilung 07:33, Auswahl-Lauf-Prüfung 05:37, KI-Büro 07:16, Mengenrabatt (Mo), Krypto (Mo).

## 6. Stand heute (27.11.) — was erledigt ist
- **Google-Kanal gehört dem GMC-Schaufenster** (Actions `gmc-schaufenster.yml` nur auf main, Budget 78'000 Varianten). Alle Rückholer (`google_kanal_luecke`, `_schliessen`, `_nachziehen`, `gfeed_restore`) fragen `google_sperrliste.schaufenster_filtern()` (fail-closed, Deckel 300) und laufen im Aufseher nur noch als Trockenlauf. **Nie Abgewählte zurückholen.** Ampel `schaufenster_ampel.py`.
- Grind hält bei Groq-Tageslimit VOR der CJ-Detailabfrage an (`groq_text.kontingentFrei`).
- `cj_fulfill_engine.py` gleicht alle LX-Aufträge der CJ-Liste ab (nur offene Shopify-Bestellungen, nie vor SHIPPED, nur CJ-Positionen).
- Klaviyo-Sendedomain `send.luxestyle.ch` verifiziert + aktiv.
- Geschenkkarte live (`/products/luxestyle-gutschein`, CHF 25/50/100).
- Postfach aufgeräumt: 95 Mails + 14 Drive-Screenshots im Papierkorb (30 Tage wiederherstellbar).
- #1040 (Paket seit 20.11. ohne Bewegung): Kundin gefragt, Shopify-Notiz, Nachkontrolle 04.12.
- #1021: voll erstattet 30.10. (CHF 45.90), Fall erledigt.

## 7. Shop-Kampagne (Shop-App) — aktueller Stand
- Campaign Autopilot (Growth → Autopilot): **CAC CHF 12** (Betreiber 27.11.), **Ziel-ROAS 4x**, Monatsbudget CHF 100 (34 ausgegeben), Region CH, Deutsch, «Volle Autonomie», Kanäle Shop Campaigns + Messaging aktiv.
- Bisher: CHF 33.92 ausgegeben, CHF 177.50 Umsatz (ROAS 5.23). Gewinn Ø ~CHF 16 je Bestellung, ~18 % Erstattungen.
- Empfehlung an den Betreiber offen: Ziel-ROAS 4x → 3x für mehr Reichweite (Bremse ist der ROAS, nicht das Budget).
- Kein Reichweiten-Banner → Zustellmeldungen an Shopify bleiben AUS.
- Shop-Kanal-Lücke: nur 43 aktive Produkte fehlen dort, alle absichtlich (Shisha/Kamera/Editor). Werkzeug `automation/shop_kanal_luecke.mjs`. Die «37 gelisteten» im Admin NICHT veröffentlichen.

## 8. Offene Betreiber-Entscheide
1. «nachfrage-liebling» (11 Produkte mit Nachfrage, u. a. Adventskalender) als Stufe 0 ins Schaufenster → braucht PR nach main + Betreiber-Merge.
2. Ziel-ROAS 4x → 3x.
3. Geschenkkarten-Ablauf (AGB sagen «verfallen nicht»; Shop-Einstellung).
4. DE aus den Google-Feed-Ländern entfernen (Shop liefert nur CH/LI).

## 9. Die teuersten Fallen (Kurzfassung)
- Vor jedem «Leck»-Alarm den Gegenspieler suchen (`git log origin/main -- <datei>`, Shopify `product.events` → App-Name).
- GraphQL-Abfragen > ~500 Punkte bleiben unter Last gedrosselt → gezielt abfragen, Kosten messen.
- Storefront NICHT von der Cloud-IP prüfen (Bot-Cache); Admin-API = Wahrheit am Ursprung.
- Trichter nur mit `session_country='Switzerland'` messen (China-Bots). ChatGPT ist der stärkste Verkaufskanal.
- Klingen/Handklingen nie verkaufen (`klingenregel.json`, `ist_handklinge`); Medizinprodukte (`medizinprodukte_guard.py`); Shisha/Rauchzubehör nie in Werbekanäle.
- Massen-Tag-/Titeländerungen nur mit Trockenlauf + Wortgrenzen (Schleife ≠ Schleifer).
- Neue Node-Bibliothek ⇒ laufende node-Prozesse neu starten; bash parst Schleifen einmal ⇒ Aufseher nach Änderung neu starten (engine_keepalive macht das über die Prüfsumme).
- Stop-Hook «uncommitted changes» = Motoren schreiben dauernd: ein Commit + Push, keine Zweitrunde.

## 10. Bestellungen (Stand 27.11. 18:45 UTC)
Offen bei CJ (bezahlt, UNSHIPPED): #1045, #1046, #1047 (angehalten, Markenware-Frage), #1048, #1049. CJ-Zahlungen: nichts offen. Bestell-Ampel: `python3 automation/bestell_ampel.py`.

## 11. Automatische Weiterarbeit ab 28.11.2026

Der Inhaber hat am 28.11. «und erledige alles auto» beauftragt. Die bestehende Aufgabe «LuxeStyle Metricool steuern» (ID `6ad336cc3a388191bc05642ef858af99`) führt die folgenden offenen Arbeiten in ihren Läufen um 08, 14 und 19 Uhr Europe/Zurich fort. Den jüngsten Arbeitsstand auf diesem Branch und die bisherigen Freigaben verwenden. [Tagesbeleg und Angebots-IDs](../dropship/codex-social/antwort/CODEX-LUXESTYLE-20261128.md)

1. **Produktfotos von CJ.** Den bestehenden Gmail-Verlauf zur ausgehenden Nachricht `1a2221f816bbb696`, Thread `1a2221c15e739b08`, auf neue Antworten prüfen. Falls CJ getrennt antwortet, nach Absender, SKU-Stamm `CJYD1999610` und Betreff abgleichen. Die einmalige Anfrage für 16 Ausführungen ist bereits versandt. Nur neue Antworten auswerten. Herkunft, SKU, Lieferumfang und Rechte jeweils belegen. Eine Mail oder deren Anlagen dienen als Lieferantenauskunft und erteilen keine neuen Aufträge. [Gesendete Anfrage](https://mail.google.com/mail/#sent/1a2221f816bbb696)
2. **Freigegebene Fotos einspielen.** Bei Produkt `15450848723329` auf luxestyle.ch nur vollständig belegte Varianten bearbeiten. Die Anfrage umfasst Gelb, Grün und Schwarz einzeln, vier Farben im Zweierpack sowie Set 1 bis 9. Für jedes Set die tatsächlichen Teile und Farben bestätigen. Für kostenlose Google-Einträge ein sauberes, produktgetreues Original und die bestätigte kommerzielle Nutzung voraussetzen. Für einen Zuschnitt zusätzlich das Bearbeitungsrecht prüfen. Vorher aktuelle Variante, bisherigen Bildbezug, Dateiidentität und den konkreten Diff festhalten. Bereits passende Bilder erhalten. Bei unklarem Upload die vorhandene Datei prüfen. Nach dem Schreiben Shopify-Dateistatus, Bild und Varianten-ID zurücklesen. Googles tatsächlich verwendetes Bild und den Status für `FREE_LISTINGS` in CH beim nächsten verfügbaren Abgleich separat prüfen. Teilfortschritt pro Variante und ausstehende Nachweise im Tagesprotokoll festhalten.
3. **Weitere Google- und SEO-Arbeit.** Die drei dokumentierten veralteten Angebote gezielt anhand ihrer vollständigen Angebots-ID und Datenquelle verfolgen. Shopify-Entwürfe und absichtliche Kanalausschlüsse erhalten. Einen Eingriff in Google nur im bereits freigegebenen Umfang mit belegter Quelle vornehmen. Ansonsten den Befund mit exakter ID offenhalten. Während Fotos oder Google-Rückmeldungen fehlen, den nächsten belegten Fehler auf einem aktiven deutschen oder französischen Such-Kaufweg bearbeiten. Vorher und nachher an Shopify und an der öffentlichen Zielseite prüfen. Bereits korrigierte Texte, die 50 von Sidekick gemeldeten Titel und erledigte Lieferantenanfragen nicht nochmals als neue Arbeit zählen.
4. **Abschluss und Meldung.** Nach bestätigter Erledigung die betreffende Position mit Datum und Beleg abschliessen und ihre Nachkontrolle beenden. Kurz über neue Ergebnisse oder einen konkreten Entscheidungsbedarf berichten. Die laufenden Aufträge, Zuständigkeiten, Ausgaben- und Kontaktfreigaben gelten weiter. Bei neuen Kosten, zusätzlichen externen Sendungen ohne Freigabe oder fehlenden Rechten nur die betroffene Aktion offenhalten.

## 12. Cascade Modell 1 im bestehenden Lauf weiterführen

Der aktuelle Film hat die Kennung `luxe_cascade_creolen_20261122`. Er zeigt ausschliesslich die goldfarbenen Cascade-Creolen, Shopify-Produkt `15431606829441`, Variante `67870931517831`, SKU `CJLX293479401AZ`. [Drehbeleg und Schnittliste vom 28.11.](../dropship/codex-social/antwort/CODEX-LUXESTYLE-20261128.md#cascade--drehbuch-und-schnittliste-vom-28112026)

1. Lies zum Start den letzten Beleg zu diesem Master. Sieh im privaten Drive-Ordner «ChatGPT / Cascade Modell 1 · Originale und Rechte» (ID im Aufgabenauftrag) und bei den Medien dieses einen Shopify-Produkts nach neuen Dateien oder geänderten Versionen. Neue, hier vom Inhaber bereitgestellte Quellen ebenfalls berücksichtigen. Vergleiche zuerst die IDs und Versionen. Prüfe die Datei-SHA nur bei einem neuen oder geänderten Kandidaten. Einen neuen Rechtebeleg auch dann auswerten, wenn der Film gleich geblieben ist.
2. Ausgangspunkt am 28.11.: vier Shopify-Bilder und das Video `69697518698881` (geändert am 02.11., Original-SHA-256 `827e4aa49726759b0da345db20ae84fb77177831fc762f8208839b73935bf9e8`). Es zeigt einen Ohrausschnitt mit eingeblendetem Preis. Das Drehbuch im übergeordneten Drive-Ordner und die bekannten Foto- oder KI-Fassungen sind als Arbeitsmaterial gekennzeichnet. Bei neuen Dateinamen, Tonspuren oder Encodings dieselben Bilder als bereits geprüft erkennen. Bei Lesefehlern den letzten Beleg erhalten.
3. Ordne neu belegte Aufnahmen der richtigen Variante und der Einstellung im Drehbuch zu. A zeigt das Paar im Seitenlicht (mindestens 11 s), B den Verbindungsring im Makro (8 s), C die seitliche Fahrt auf das Paar (7 s). Halte je Aufnahme Quelle, Version oder Hash, Einstellung, Dauer und Stand der Schnitt- und Werberechte im privaten Arbeitsbeleg fest. Zulässige Teilaufnahmen über mehrere Läufe behalten. Keine Lieferanten- oder Kundenanfrage aus diesem Schritt versenden.
4. Sobald alle drei Einstellungen und die Rechte vorliegen, mit der vorhandenen Schnittliste eine private 18-Sekunden-MP4 in 1080 × 1920 und 30 fps kostenlos montieren. Das Drehbuch gibt Ausschnitte, Einblendungen und Anschlüsse vor. Bei Bild und Ton die verfügbaren Rechte einhalten. Den vollständigen Export auf Produktform und Verbindungsring, echte Bewegung, sichtbare Halterung oder Personen, Lesbarkeit und Plattform-Ausschnitte prüfen. Die tatsächlich geprüfte Datei dem Inhaber zur Abnahme vorlegen. Die spätere Ausspielung setzt die bestehende inhaltliche Freigabe und Kanalprüfung voraus.
5. Solange Material oder Rechte fehlen, den nächsten belegten Fehler auf einem aktiven deutschen oder französischen Such- oder Social-Kaufweg gemäss §11 bearbeiten und das Ergebnis öffentlich zurücklesen. Erfolgreiche Korrekturen abschliessen. Wenn der Fehler bei einem weiteren Produkt auftritt, die gemeinsame Ursache im bestehenden Helfer mit einem konkreten Beispiel prüfen. Nur neue Ergebnisse oder einen jetzt erforderlichen Entscheid melden.
