# Sauber-Bilanz 22.10.2026 — «mache zuerst alles sauber bevor mehr Grind»

Auftrag des Betreibers (22.10.): erst alles sauber, dann mehr Grind. Der CJ-Grind steht deshalb seit 22.10. still (`dropship/_GRIND_PAUSE_BIS` = 1792942700 → **25.10.2026 15:38 UTC**,
`_GRIND_RUNNER_ZAHL` unverändert 3). Zum Weiterlaufen früher: Datei auf `0` setzen.

Vorgehen: sieben Spähtrupps (Workflow `wf_3377b092-605`: Katalog, Google, Theme, Betrieb, Social, Repo, Texte) haben gemessen, nicht vermutet; jeder Befund trägt die Marke
**GEMESSEN** (Zahl + Befehl im Spähtrupp-Journal), die Behebung folgt dem Hausmuster *Regel + Wächter (Selbsttest mit Mutanten) + Bericht*.
Stand beim Schreiben: 5 von 7 Spähtrupps abgeliefert (Repo, Texte laufen noch — ihre Befunde kommen in die nächste Runde, `OFFEN` unten).

## GETAN (belegt, zurückgelesen)

| # | Klasse | Vorher | Nachher | Wächter / Rückweg |
|---|---|---|---|---|
| 1 | **Hetzner-Server Platte voll** (Ursache des stillen Agenten, des toten Wächters, der mitten im Lauf gestorbenen Aufträge) | `df`: 20.10. 99 % (718 MB), 21.10. **100 % (115 MB)** | Wächter + Ampelzeile `SERVER-PLATTE` (≥ 95 % oder < 1 GB frei → ⚠️ mit Abhilfe); `bot_puls` nennt die Platte zuerst; `server_waechter()` unterscheidet «nie gelaufen» von «STILL seit 6,3 Tagen» (früher falsch «Setup nötig») | `server_platte_wache.py` (11 Fälle, 5 Mutanten), im Aufseher |
| 2 | **Hänger-Alarm «BOT-AUFTRAG HAENGT»** für lesende Dauer-Wartung (12 h) | rot, Ursache unbelegt | geschlossen; Regel «lesend + wiederkehrend → schliessen, zweimal hintereinander gestorben → bleibt rot» | `auftrag_haenger_schliessen.py` (9 Fälle, 5 Mutanten) |
| 3 | **Filtergrenze 5'000** (Shopify blendet dort ALLE Filter aus) | Herren-Mode **5'323**, Schmuck & Uhren **5'656**, Wohnen & Dekoration **5'307** (0× `name=filter.*` im HTML) | **3'412**, **2'631**, **2'837** Artikel laut Besucheransicht (WebFetch 22.10. ~17:35: Filter Verfügbarkeit, Preis, Produkttyp, Farbe, Grösse, Kategorie sichtbar; Schätzung aus dem Export stimmte auf ±1 %). Der Text von «Wohnen & Dekoration» sagt noch «über 4'900 Artikel» — `kollektion_mengen_wache` (täglich) führt ihn nach | `filtergrenze_reparieren.py` (6 Fälle, 4 Mutanten, Rückweg `--zurueck`, Sicherung `dropship/_filtergrenze_regeln_alt.json`); `filtergrenze_wache.py` schreibt jetzt `_filtergrenze_stand.json` + Ampelzeile `FILTERGRENZE` |
| 4 | **Unterkategorien grosser Kategorien** (Betreiber-Screenshot «Elektronik & Technik») | ohne Unterkollektion: Technik 31 %, Herren 26 %, Schmuck & Uhren 21 %, Beauty 29 %, Kinder 20 % | Technik **17 %**, Herren **7 %**, Schmuck & Uhren **9 %**, Beauty 22 %, Kinder 19 %; Menü 190 → **218** Einträge, 0 verlorene IDs; Chips nach Relevanz geordnet; neue Kollektion **Herren-Jeans** (150 aktiv) | `unterkat_abdeckung.py`, `menue_unterkat_ordnen.py` (Rückweg `--zurueck`), Feeder-Regeln im Schlagwort-System, Ampel `UNTERKATEGORIEN` |
| 5 | **Medizinprodukte im Google-Kanal** (Hörverstärker, Vernebler, Atemtrainer, Spirometer) | 7 aktiv | 7 gedraftet; Klasse jetzt täglich im Aufseher | `medizinprodukte_guard.py` |
| 6 | **Menü/Footer** | Footer-Link «Daten-Weitergabe ablehnen» → 404 (jede Seite); Seiten-Links im Menü ungeprüft | Link entfernt (Sicherung `dropship/menu_backup_2026-10-22_1651_…`); `menue_links.py` prüft jetzt `/pages/…` auf Veröffentlichung | `menue_links.py` |
| 7 | **Google: Sperr-Tags mit Präfix** (`google-kanal-markenware-unklar`) | Seagate Exos 10 TB ACTIVE und im Google-Kanal | aus dem Google-Kanal genommen (Laden bleibt); Durchsetzer liest jetzt alle `google-kanal-*`/`google-gesperrt-*` über `productTags` (4'141 Tags, 7 s) | `google_sperrtags_durchsetzen.py --kanarien` (+Präfix-Selbsttest, 2 Mutanten) |
| 8 | **Social: Lizenzfiguren** (Eiskönigin, Top Gun …) im Ready-Vorrat und im Vorrang bis 30.11. | 2 Lizenz-Reels `ready`, 3 Vorrang-Slugs | beide Reels `lizenz-skip`, Slugs entfernt; `LIZENZ_FIGUR` in 3 Dateien um 16 Figuren erweitert (Selbsttest 65/65) | Wörterbuch in `bild_reel_auswahl.py`, `tiktok_karussell.py`, `metricool_pinterest_pin.mjs` |
| 9 | **Social: Doppelpost** XXL Leselupe (Bild-Post 07.10 + Pin 08.10, dann Reel IG+FB geplant 24.10.) | 2 Planer-Einträge | gelöscht (399467813/-816, zurückgelesen) | siehe `OFFEN` (Prüfer-Lücke) |
| 10 | **Pinterest-Agent Doppelpins** (13 überzählige Pins auf 10 Produkten seit 05.10.) | abgebrochene Quittung ohne Handle sperrte nichts | Vorab-Quittung VOR dem Klick (`pinterest-pin-vorab-<handle>.json`), `schonGepinnt()` liest sie (Funktionstest) | `pinterest_pin_erstellen.mjs` |
| 11 | **Platzhalter «Color»** in der Farbauswahl | 60 aktive Produkte | 60 → «Wie abgebildet» (0 Fehler, Preise/SKUs unverändert), 2 ausgenommen (Zielname schon da) | `platzhalter_farbwert.py` (8 Fälle, 4 Mutanten), täglich im Aufseher |
| 12 | **Tote Produktlinks in Ratgeber-Seiten** (2 gedraftete Produkte in 4 Seiten) | 2 | 0 (2 Listenpunkte gestrichen, 2 Links auf `/collections/portemonnaie`) | `seiten_tote_produktlinks.py` (4 Fälle, 3 Mutanten), Sicherung `dropship/_ratgeber_vorher/` |
| 13 | **Cloud-Platte** (diese Sitzung) | 96 % (1,8 GB frei), 8,3 GB Scratch unter `/tmp/claude-0` | 81 % (7,1 GB frei); Aufseher/Keepalive räumt ab 85 % Ordner ohne Änderung seit 3 Tagen | `engine_keepalive.sh` `claude_scratch_raeumen` (Wegwerf-Test: alt weg, neu bleibt) |

## OFFEN — nach Art getrennt

**Nur der Betreiber kann (Klick):**
1. **Hetzner-Server, root:** `curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/platte-schlank.sh | bash` — danach läuft der Agent wieder (letzter Puls 22.10. 11:00 UTC), der Wächter seit 16.10. nicht.
2. **Die App von «Elektronik & Technik»:** Name/Anbieter? Die Filter dort (Sortieren/Preis/Nur lieferbar) sind die der App; Farbe/Grösse/Produkttyp kann nur der Anbieter ergänzen. Die Daten liegen bereit. (Die Web-Filter sind jetzt für Herren/Schmuck/Wohnen wieder da.)
3. **Entscheide** (kein Selbstläufer): K1 21 Dubletten-Paare (Preis/Sirène-Aurora-Landeseiten), K4 Fortura 708 ausverkauft + 535 Kostüme, G2 CH-Lager Stufe 2→3 (seit 17.10. überfällig, heikel), G4 Liechtenstein «Missing shipping info» 27'628, BET-7 Bewertungs-Stopp nur auf dem Arbeitsbranch.
4. **Theme-heikel (nur mit Live-Datei, Sicherung, ausdrücklichem Ja):** T1 `/fr/`-Spiegel mit deutschem Text unter `lang=fr` (hoch), T3 Startseite: Fussleiste 317 KB hinter Googlebots 2-MiB-Grenze (Plan #76), T5 Layoutverschiebungen, T9 doppeltes Article-JSON-LD in 23 Ratgebern, T10 `/h` leitet auf ein Skript im öffentlichen Repo.

**Automat kann, hat noch nicht (nächste Runde):**
- K5 445 Produkte mit bytegleichem Hauptbild (Malen nach Zahlen: leere Leinwand; Yoga-Hosen mit Grössentabelle), K6 2'538 Produkte mit englischen Farbwerten (14'553 verschiedene Werte, Tabelle greift nur bei restlos bekannten Wörtern — KI-Weg nötig, mit Gegenlesen), K7 Rest: 110 Produkte mit Lieferantencodes, K9 2 Produkte ohne Kategorie (bewusst nicht geraten), K11 Titel-Reste, K12 212 Gruppen gleicher Titel.
- Beauty & Pflege 22 % ohne Unterkollektion (Make-up-Pinsel, Haarschneider, Gloss): neue Such-Kollektionen im Schlagwort-System.
- SOC-02 Prüfer-Lücke: der Vorlauf-Prüfer vergleicht nur Slots untereinander, nicht mit bereits Veröffentlichtem (die Ursache für «Leselupe» ist **unbelegt**; der Produkt-Ledger trägt keinen Zeitstempel). SOC-04 744 MB `social/reels` + 610 MB `reels/` im Arbeitsbaum, 45 geplante Medien an einer Branch-URL (Grow-Plan: Reel-Ablage zurück auf den Shopify-CDN = Plan-Tag 8). SOC-07 `social_qualitaet_wache` meldet 42 von 47 DOPPEL zu Unrecht (Zeitzone, Entwürfe, Zwillinge).
- BET-1 CJ-Nachprüfung 329 von 1'080 offen (CJ-Punkte leer bis 00:00 UTC), BET-8 Klickliste verstreut.

**Beim nächsten Lauf prüfen (kein Eingriff nötig):**
- Filtergrenze: `python3 automation/filtergrenze_wache.py` (Stand `dropship/_filtergrenze_stand.json`) — Web-Probe am 22.10. bestanden (siehe oben), Text «über 4'900 Artikel» in wohnen-dekoration folgt der Mengen-Wache.
- Social-Plan: der Prüfer (`social_vorlauf.py --pruefen`) bereinigt die Hülle des gelöschten Slots `reel_igfb-20261024T1015` von selbst; ich habe ihn nicht von Hand gestartet (der Berechtigungsprüfer lehnte den Aufruf ab; kein Umgehungsversuch).

## Fallen dieser Runde
- Ein Wächter, dessen Ergebnis nur in ein `/tmp`-Log geschrieben wird, ist keiner: `filtergrenze_wache` lief seit 04.10. täglich, drei Kollektionen standen 18 Tage über der Grenze.
- Ein Text in der Ampel («Setup nötig»), der aus einer Zeitfenster-Abfrage statt aus dem Zustand abgeleitet ist, lügt beim ersten Ausfall.
- Mutanten-Suchtexte stehen im eigenen Quelltext: per Verkettung teilen, sonst treffen sie doppelt.
- Variantensuche (`title:*Color*`) trifft auch «Multicolor»: erst am Feld `selectedOptions` filtern, dann Produkte lesen (400 → 60 Abrufe).
- `productsCount` einer Kollektion zählt Entwürfe mit; die Neuberechnung grosser Smart-Kollektionen dauert Minuten (4'408 → 3'400).
