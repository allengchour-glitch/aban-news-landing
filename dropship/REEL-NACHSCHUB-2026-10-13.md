# Reel-Nachschub 13.10.2026 — R1, R9, R11 (Schritt 1) umgesetzt

Grundlage: Richter-Urteil des Prüf-Workflows (Reihenfolge R1 → R9 → R11). Geändert: `automation/cj_video_reel_engine.mjs`,
`automation/reel/schnitt.py`. Nichts gepostet, keine Kadenz geändert, kein `_SOCIAL_STOPP`.

## Befund (GEMESSEN)

- Seit 09.10. stand in jedem Runner-Lauf «562 offene Treffer → 0 Kandidaten». Alle 1'012 Zeilen in
  `dropship/_cj_reel_index_tot.txt` stammen vom 08.10.
- Ursache: Der Motor suchte Index-Produkte nur mit `sku:CJ-<pid>`. Bei rund 146 aktiven Produkten mit sicherem CJ-Video
  hat die SKU aber die Varianten-Form `CJ-CJxx…`. Der Motor fand sie nicht und buchte sie als «nicht-im-shop».
- Shopify-Suche, live geprüft: `sku:CJ-CJJT153827201AZ` findet die Haarbürste. `sku:CJ-1555107261473894400` (die echte pid)
  findet nichts. Die Kennung muss also der SKU-Rest sein. Auch eine SKU mit Leerzeichen ist auffindbar
  (`sku:CJ-CJYDQTJM00565-Black` und `sku:"CJ-CJYDQTJM00565-Black Set"`).
- `cjVideo()` buchte jeden Fehler und jeden Timeout als «kein Video».

## Was geändert ist

**R1 — versteckte Index-Videos** (`cj_video_reel_engine.mjs`)
- Z. 118–145: Umkehrtabelle pid → Shop-SKU aus `dropship/_cj_pid_cache.json`, dazu die direkten pid-SKUs.
  Die Kennung ist die SKU ohne «CJ-», bis zum ersten Zeichen ausserhalb von [0-9A-Za-z-].
  Sperr-Tags und Heilwörter sind wie in `metricool_pinterest_pin.mjs`.
- Z. 165–191: `cjVideo()` kennt jetzt drei Ergebnisse: Video gefunden, «leer» oder «fehler».
  - Nur «leer» (Code 0/200 ohne Video) kommt ins kein-Video-Ledger, und zwar mit der echten pid.
  - «fehler» kommt in die Tagessperre `/tmp/cj_reel_fehler_<datum>.txt` und wird am nächsten Tag neu gefragt.
- Jeder Kandidat hat zwei Schlüssel:
  - `k.pid` = Kennung. Sie gilt für die Queue-ID `cjreel-<Kennung>`, den Dateinamen und die Ledger.
  - `k.cjpid` = echte pid. Sie wird nur für `cjVideo()` und den Server-Weg benutzt.
- Z. 538: Die Sperre prüft beide Schlüssel. kein-Video-Zeilen in Varianten-Form stammen aus falsch gestellten Fragen und
  sperren nicht mehr. Sie bleiben aber in der Datei.
- Z. 543: Poster-Probe vor dem Bau. `products(first:1, query:"sku:CJ-<Kennung>")` muss genau dieses Produkt liefern, mit
  ACTIVE und onlineStoreUrl. Fällt die Probe durch, wird das Produkt übersprungen, ohne Eintrag im Ausfall-Ledger.
- Z. 570: Alte «nicht-im-shop»-Zeilen mit einem Treffer in der Umkehrtabelle werden beim Lesen neu bewertet (338 Stück).
  Gelöscht wird nichts. Findet auch die Umkehrtabelle nichts, lautet der neue Grund `nicht-im-shop-auch-umkehr`.
- Nach dem Bau stehen beide Schlüssel in `dropship/_cj_reel_gebaut.txt`. Das gilt auch beim Nachtrag verwaister Dateien.
- Scan und NUR_PID: CJ wird nur noch mit der echten pid gefragt. Eine Varianten-SKU ohne Eintrag in der Umkehrtabelle
  wird übersprungen, ohne CJ-Frage. Das ist der Kern von R7 Schritt 1. Ohne diese Regel würde die neue Tagessperre falsche
  Fragen täglich wiederholen.
- Der Modus NEU_RENDERN fragt CJ jetzt ebenfalls mit der echten pid.

**R9 — Hook und Titelzeilen**
- Z. 247–339: `hookFuer()` baut zuerst einen Produkt-Hook: Produktwort aus `kurzTitel()` plus kurzer Nutzen, höchstens
  24 Zeichen, ohne Heilwörter.
  - Der Nutzen kommt zuerst aus dem Titel («Schneidebrett mit Deckel»), sonst aus der Warengruppe.
  - Der Nutzen der Warengruppe wird nur mit einer strengen Titel-Prüfung gesetzt. So entsteht nie «Mini-Drohne fürs Zuhause»
    oder «Sparbüchse für Hunde».
  - Die Themen-Hooks bleiben nur als Rückfall. Dabei gilt eine Raum- und Tier-Prüfung, zum Beispiel «Gassi» nur bei
    hund/leine/gassi im Titel.
- Z. 345: `zeilen()` lässt die erste Zeile nie leer und setzt nie «…». Ein überlanges Wort wird am Bindestrich getrennt.
  Eine Präposition am Zeilenende wandert in Zeile 2.
- Z. 444: Die Sprecherstimme sagt den Hook nicht, wenn er den Namen wiederholt.

**R11 Schritt 1** (`schnitt.py` Z. 91–94): Die MARKEN-Liste kennt jetzt auch `DROPSHIPPERS?`.

## Zahlen

- **DRY-Lauf des Motors:**
  - 145 Index-Kandidaten, alle mit Varianten-SKU. Vorher waren es 0.
  - 1 Produkt fiel durch die Poster-Probe (Kennung `CJYDQTJM00052-Red-600x50x0`, Suche findet nichts).
  - 44 Produkte würden ins Ausfall-Ledger gehen (DRAFT, Verbots-Titel, nicht im Shop).
- **Stichprobe pid → Kennung → Titel:**
  - 49EB45C0… → CJYDQTJM00295-Black-L → Haltungs-Korrektor
  - 1722087574300270592 → CJYD189137001AZ → Elektrische Reinigungsbürste 4-in-1
  - 98069BEA… → CJYDQTJM00539-150 → Fitness Widerstandsband-Set
  - 1380390398677094400 → CJZN107200001AZ → Damen-Armbanduhr
  - 32536768… → CJYDQTJM00565-Black → Aufblasbarer Box-Standboxsack
  - 2046A69E… → CJYDQTJM00537-Black-Set → Yoga Dehnungsband
  - 1633393678565781504 → CJCJ170137301AZ → Knoblauch- und Zwiebelhacker
  - 1738468600836526080 → CJYD192819601AZ → Elektrische Zitruspresse
- **DRY Hook** an 97 von der Jury gerügten Zeilen (jury-skip, stimmigkeit < 5, Grund nennt Hook oder Text):
  97 von 97 tragen das Produktwort (100 %, Ziel ≥ 90 %).
  Gegenprobe an 3'175 aktiven Titeln:
  - 0 leere erste Zeilen
  - 0 «…»
  - 0,5 % Rückfall auf einen Themen-Hook (zu lang oder Heilwort, z. B. «Aromatherapie-Gerät»)
- **Scharfer Lauf** (wie im Runner: `LAUTHEIT_2PASS=1 BATCH=3`, Stimme Azure 0,5):
  - 12 Kandidaten, 8 CJ-Fragen, 0 CJ-Fehler.
  - **3 Reels gebaut und `ready`:**
    - `cjreel-CJSY102348201AZ` (Herren Business Quarzuhr)
    - `cjreel-CJYDQTJM00295-Black-L` (Haltungs-Korrektor)
    - `cjreel-CJYD189137001AZ` (Reinigungsbürste)
  - Alle 3 liegen im Shopify-CDN.
  - Die Poster-Abfrage meldet für alle 3 ACTIVE und onlineStoreUrl.
  - Beide Schlüssel stehen im gebaut-Ledger. Es gibt keine doppelte Zeile.
  - 5 Quellen hat das Schnitt-Tor zu Recht abgewiesen: 3× Exit 4 (Loop-Naht), 2× Exit 3 (CJK-Text/Logo,
    nur 5,5 s sauberes Material). Sie stehen in `_reel_tor_abgelehnt.txt`.
  - 7 Produkte kamen neu ins Ausfall-Ledger.
  - Gepostet wurde nichts. Jury und Tor prüfen die Reels beim Posten.
- **Selbsttest:** `schnitt_test.py` 59 von 59 grün. `node --check` und `py_compile` sind ok.

## Server (luxe-waechter)

Der Server zieht den Code über git. Das zeigen drei Stellen:
- Der systemd-Timer macht alle 10 Minuten `git fetch` und startet `engine_keepalive.sh`.
- `autocommit.sh` merged `origin/claude/luxestyle-status-tztnn1` bei jedem Ledger-Commit, also etwa alle 5–10 Minuten.
- Der Runner startet `node` bei jedem Durchlauf neu und lädt dabei die neue Datei.

Der Push genügt also. Am Server wurde nichts geändert.

## Offen

- **R11 Schritt 2** (OCR auf der festen Bildmitte) ist nicht gebaut. Von den drei Prüfquellen liegt nur 7D610C7D noch lokal
  (`auftraege/ergebnis/`). Die Quellen von 50E414C6 und ADAC0E5D wurden nach dem Bau gelöscht. Ein sauberer Nachweis
  (3 abgewiesen, 32 durchgelassen) ist so nicht möglich.
- **R9 Schritt 2** (Hook-Typ produkt|thema als Lernschlüssel für `social_lernen.mjs`) ist nicht gebaut.
- Zwei der drei Reels wurden noch vor der Stimm-Korrektur gebaut. Darin sagt die Stimme den Namen zweimal
  («Herren Business Quarzuhr. Herren Business Quarzuhr mit …»). Das Bild ist davon nicht betroffen.
- Container und Server arbeiten jetzt dieselbe Index-Liste ab. Bisher hat der Server nie ein Reel gebaut.
  - Baut er künftig mit, können beide Rechner dasselbe Produkt bauen.
  - Ein Doppelpost bleibt trotzdem ausgeschlossen: Der Dateiname ist gleich, `post_guard` sperrt über Basename und Produktname.
  - Verloren geht dann nur ein Bau. Die Abstimmung zwischen den Rechnern ist R8.
- Messung in Woche 1 (Urteil):
  - Runner-Log «→ N Kandidaten» mit N > 0
  - mindestens 5 `cjreel-CJ…` ready pro Tag
  - Jury-Quote mindestens 25 %
  - 0 «produkt-nicht-aktiv» bei `cjreel-CJ…`
