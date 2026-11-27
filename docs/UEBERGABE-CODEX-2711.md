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
