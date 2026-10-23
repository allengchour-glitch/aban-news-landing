# Halloween: CJ-Kostüme und -Partydeko vom 15.10. bis 01.11. aus Social (13.10.2026)

**Betreiber 13.10. abends:** «cj kostüme ja, versandprofil ja mache es sauber und so» (Antwort auf Frage 1 in
`dropship/KAUFSTRECKE-SEITEN-2026-10-13.md`, Klasse 3).
**Heute:** gebaut und im Trockenlauf geprüft. Im Shop wurde nichts geschrieben: 0 Produkte tragen den Tag, das Ledger ist leer.
Wirkung erst ab **Do 15.10. 00:00 UTC**, Ende **So 01.11. 00:00 UTC**.

## Was passiert

| Wann | Was `automation/anlass_social_sperre.py --scharf` tut |
|---|---|
| vor 15.10. | Nichts im Shop. Nur `dropship/_social_pause.txt` wird vorbereitet. Die Poster lesen das Fenster selbst, die Sperre greift also um 00:00 UTC. |
| 15.10.–31.10. | Abmelden aus **TikTok**, **Facebook & Instagram** und **Pinterest** (je 20 in einer Anfrage, Ledger `dropship/_anlass_social_sperre.tsv`). Tag `social-pause-halloween` setzen. Wartende Queue-Zeilen werden `social-pause-skip`. Neue Importe kommen täglich dazu. Ware, die herausfällt (z. B. jetzt CH-Lager), wird sofort wieder angemeldet. |
| ab 01.11. | Genau die Paare aus dem Ledger wieder anmelden, Tag entfernen, Pause-Datei leeren. Queue-Zeilen bleiben gesperrt, denn Halloween-Texte im November wären Saison von gestern. |

- **Nie angefasst:** Online Store, Shop, Google & YouTube, Point of Sale, Inbox, Headless. Das Skript bricht ab, wenn die Regel einen dieser Kanäle nennt.
- **Publikationen:** Das Skript löst sie live über den Namen auf (gemessen: TikTok `302032716161`, Facebook & Instagram `302566834561`, Pinterest `302994456961`).
- **Ampelzeile:** `SOCIAL-SPERRE halloween: n gesperrt / m offen (bis 2026-11-01)`. Mit ⚠️, sobald etwas offen ist. `--ampel` liest nur die Stand-Datei.

## Auswahl (GEMESSEN 13.10. ~20:40 UTC, Voll-Export per Bulk-Operation, 49'904 aktive `cj-real`)

**49 Produkte**, alle 49 in allen drei Social-Kanälen publiziert. Das ergibt **147 Kanal-Einträge**.
Aufteilung: Kostüm 19, Partydeko 26, Verkleidungsteil 4.

Die Regel (`automation/data/anlass_social_sperre.json`):
- aktiv, Tag `cj-real`, **ohne** `ch-lager` und **ohne** `profil-ch-lager`.
- **Kostüm:**
  - `google_sperrliste.ist_kostuem()` mit Halloween-Bezug (Tag `halloween`, starkes oder schwaches Wort im Titel).
  - Oder ein Verkleidungsteil (Outfit, Umhang, Cape, Kopfbedeckung, Hexenhut, Haarreif, Stirnband) mit starkem Wort.
- **Partydeko:**
  - Deko-Typ (Partydeko & Ballone, Beleuchtung, Wohnen & Deko) oder Deko-Wort (deko, Ornament, Kranz, Countdown, Adventskalender, Schild …).
  - Dazu entweder ein starkes Wort (Halloween, Hexe, Geist, Gespenst, Spuk, Grusel, Zombie, Vampir …) oder ein schwaches Wort (Totenkopf, Skull, Skelett, Fledermaus, Horror …) zusammen mit Tag `halloween` oder «Kürbis».
- **«Kürbis» allein ist Herbst** und bleibt.

Zum Vergleich: `productsCount` für «aktiv + halloween + cj-real − ch-lager» = 92. Davon gehen nur Kostüm und Partydeko raus, der Rest steht unten bei den Grenzfällen.

**20 Beispiele aus der Liste:**

| Klasse | Titel | Typ |
|---|---|---|
| Kostüm | Halloween-Kostüm für Hunde | Haustierbedarf |
| Kostüm | Hexenkostüm mit Kleid, Hut und Halskette | Damenmode |
| Kostüm | Halloween-Kostüm: Mittelalterliches Korsett-Dress | Damenmode |
| Kostüm | Aufblasbares Halloween-Kostüm für zwei Personen | Kostüme & Verkleidung |
| Kostüm | Skelett-Halloween-Kostüm – schulterfrei | Partydeko & Ballone |
| Kostüm | Latex-Horrormaske «Verrottete Fratze» · Halloween | Hautpflege |
| Kostüm | Horror Zombie Maske | Hautpflege |
| Kostüm | Lustiges Teddy Cape Geist Kostüm | Haustierbedarf |
| Kostüm | Tier-Halloween-Mantel | Haustierbedarf |
| Kostüm | Göttinnen-Kleid für Mottopartys und Halloween | Damenmode |
| Verkleidungsteil | Halloween-Outfit für Mädchen | Baby & Kinder |
| Verkleidungsteil | Halloween-Umhang «Kleiner Teufel» aus Flanell | Damenmode |
| Verkleidungsteil | Lolita-Stirnband mit Hexenhut und Rosen | Damenmode |
| Partydeko | 31-Nacht-Schrecken Halloween Countdown-Box mit Puppe | Partydeko & Ballone |
| Partydeko | Halloween Adventskalender Zwerge | Partydeko & Ballone |
| Partydeko | Halloween-Dekoration Hexenbeine mit Stiefeln | Partydeko & Ballone |
| Partydeko | Skelett-Gerippe für Halloween-Deko | Partydeko & Ballone |
| Partydeko | Kürbis Totenkopf Grimasse Ornament | Partydeko & Ballone |
| Partydeko | Schwingendes Geisterlicht für Halloween | Beleuchtung |
| Partydeko | Süssigkeitenschale Geist Halloween Tischdeko | Küche & Bar |

Die volle Liste mit Handle, Kanälen und Grund steht in `dropship/_anlass_social_sperre.json` → `liste`.

## Grenzfälle (73, bleiben in Social) — bitte bei Bedarf entscheiden

- **45: Halloween-Bezug, aber weder Kostüm noch Partydeko.**
  - Halloween-Sweatshirts, -Kleider und -Pullis, Hunde-Halsbänder und -Pullover mit Halloween-Print.
  - Diamond Paintings, 3D-Puzzle, Bausteine, Glasbecher, Silikonformen, Hexen-Wandkalender, «Katzennest Hexen Hut».
  - **Nah am Kostüm:**
    - «Baby-Strampler Halloween mit Kapuze»
    - «Halloween Haustier-Set mit Fliege»
    - «Gelber Leopard-Hoodie mit Teufelshörnern»
    - «Fliegende Hexe» (Bastelset)
  - Diese vier zu sperren heisst: das Wort in `verkleidung_wort` aufnehmen und einen Kanarienvogel dazuschreiben.
- **14: CJ-Kostüm ohne Halloween-Bezug.**
  - Beispiele: «Tiger Kostüm für Golden Retriever», «Steampunk Cosplay Maske», «Viking Ugly Latex Maske», «Maskenball-Kleid für Kostümparty», «Latex-Gesichtsmaske mit Kopfband».
  - Bleiben, weil sie Fasnacht und Mottopartys dienen und nicht an den 31.10. gebunden sind.
- **14: Kürbis- und Herbst-Deko ohne Halloween-Wort.**
  - Kürbis-Kissen, «Leuchtende Kürbis-Laterne», «Sprechende Kürbis-Süssigkeitenschale», «Kürbis-Schatulle».
  - Herbst-Deko bleibt (Betreiber-Entscheid).
- **Ausserhalb der Regel:** «Halloween Aufkleber Set – 2 Stück» hat keinen Lieferanten-Tag. Lieferant unklar, es bleibt.

Den ersten Lauf mit 47 Produkten habe ich nachgeschärft: «Skull» ist jetzt ein schwaches Wort. Dadurch kamen «Skull Maske» und «Skull Punk Nieten Performance Maske» dazu.

**Kanarien:** 34 Stück (16 Sperre, 18 bleibt, je mindestens 15 sind Pflicht). Dazu kommen 8 Fälle für die Zuordnung von Queue-Zeilen.
`--selbsttest` ist grün. Ist er rot, schreibt das Skript nichts.

## Social-Warteschlangen (GEMESSEN 13.10.)

| Queue | Poster | Prüft der Poster das Produkt? | Treffer |
|---|---|---|---|
| `automation/reels_seed.csv` | meta_reel_post (IG+FB), metricool_tiktok_post (TikTok, YouTube, IG) | nur ACTIVE + onlineStoreUrl | 4 Zeilen, alle schon `jury-skip`/`posted-tiktok`, **0 ready** |
| `social/posts_image.csv` | social-autopost-meta (IG+FB) | nur «kaufbar» (Storefront/Admin) | 0 |
| `social/ig_karussell.csv` | ig_karussell_post | nur ACTIVE + onlineStoreUrl | 1 (`top-4-unter-20-halloween-0923`, schon `preis-veraltet`), 0 ready |
| `social/story_queue.csv` | story-autopost-meta | gar nicht | 0 |
| `social/video_queue.csv`, `social/tiktok_queue.csv` | (alt) | – | 0 |
| Pinterest-Pins | metricool_pinterest_pin | **`publishedOnPublication(Pinterest)`** | nicht nötig, die Abmeldung reicht |

**Folge:**
- Für **Pinterest reicht die Abmeldung**.
- Alle anderen Poster prüfen nur ACTIVE oder «kaufbar». Für sie **reicht die Abmeldung NICHT**. Ein Halloween-Kostüm bleibt ACTIVE im Onlineshop, und ein Reel würde weiter auf TikTok, YouTube und IG gepostet.
- Schutz in zwei Schichten:
  1. Die Tagesläufe setzen ready-Zeilen auf `social-pause-skip`.
  2. Die Poster lesen die Pause-Datei über `automation/lib/social_pause.mjs`. Das ist ein neues Modul, gleiche Zuordnung wie in Python, mit node getestet: 9/9 Fälle, die Fenstergrenzen stimmen. Dafür braucht jeder Poster eine Zeile, siehe «Eintragen». Diesen Patch habe ich nicht selbst gemacht, weil andere Workflows an den Postern arbeiten.

**Nachschub:** `queue_new_products.mjs` reiht neue `cj-real`-Ware ein. Es hat die Tags schon in der Antwort und sollte `social-pause-*` überspringen (Patch unten).

## Andere Schreiber, die wieder anmelden könnten (GEPRÜFT)

- **`unpublizierte_finden.py`** (täglich) meldet in TikTok, FB/IG und Pinterest an, aber nur Ware, die **nicht im Online Store** ist. Unsere Ware bleibt im Online Store, es gibt also keinen Konflikt.
- **`hype_kuratieren.py` und `herbst_kuratieren.py`** melden nur bei **Neuaufnahme** in allen Kanälen an. Im Aufseher laufen beide nur mit `NUR_RAEUMEN=1`. Ein betreuter Lauf könnte ein gesperrtes Produkt wieder anmelden. Der nächste Tageslauf meldet es dann wieder ab und schreibt es ins Ledger.

## Rückweg

- **Vorzeitig beenden:** In der Regeldatei `bis` auf jetzt setzen und `--scharf` laufen lassen. Das meldet genau die Ledger-Paare wieder an, entfernt den Tag und leert die Pause-Datei.
- **Queue-Zeilen:** Sie stehen auf `social-pause-skip` und lassen sich von Hand auf `ready` zurücksetzen. Es wird nichts gelöscht.
- **Risiko:** Ein Produkt, das im Fenster von einem anderen Werkzeug absichtlich aus Social genommen wurde, meldet die Freigabe am 01.11. wieder an, sofern es im Ledger steht. Das betrifft nur Paare, die dieses Skript selbst abgemeldet hat.

## Prüfen (ab 15.10.)

- `python3 automation/anlass_social_sperre.py --ampel` soll «49 gesperrt / 0 offen» zeigen, oder mehr bei neuen Importen.
- `productsCount(query:"tag:social-pause-halloween")` = Auswahl.
- Stichprobe `publishedOnPublication` (TikTok, FB/IG, Pinterest) = false, Online Store = true.
- WebFetch auf eine Kostüm-Produktseite: HTTP 200, die Seite lebt.
- Am 01.11.: das Ledger hat gleich viele «an»- wie «ab»-Zeilen, und der Tag ist an 0 Produkten.

## Nachtrag 13.10. abends (~22:15–23:30 UTC): Prüfer-Befunde, Poster-Wache, Aufseher

Grundlage: Prüfung des Commits af54e13c7 (6 Befunde «ok: false»). Alles Folgende ist gebaut und gepusht. **Im Shop ist weiterhin nichts geschrieben** (Phase «vor», das Skript prüft das Fenster selbst).

### 1. Auswahl genauer (`automation/anlass_social_sperre.py`, Regeldatei)
- **Lieferant:** CJ heisst jetzt Tag `cj-real` **oder** eine Varianten-SKU `^CJ`. GEMESSEN: `productsCount(status:active AND -tag:cj-real AND sku:CJ*)` = 1'266, das ist dieselbe Zahl wie beim Prüfer. Der Export fragt `status:active AND (tag:cj-real OR sku:CJ*)` ab (51'185 statt 49'904) und liefert die Varianten-SKU mit (Export-Version 2; der alte Cache ohne SKU wird nicht mehr benutzt).
- **Kostüm-Signal:** zusätzlich Tag `kostuem`, Typ «Kostüme & Verkleidung» und das Wort «Verkleidung» in der Beschreibung. Den Halloween-Bezug liefert jetzt auch die Beschreibung («für Halloween», «Halloween-Party», «Halloween-Nacht», «Verkleidung an Halloween»).
- **Beschreibung:** Sie wird nur für 247 Kandidaten gelesen, die schon ein Signal in Titel, Tag oder Typ haben. Der angehängte Ratgeber-Verweis («📖 Passend dazu im Ratgeber: Halloween-Deko selber machen …») wird abgeschnitten. Ohne diesen Schnitt wäre die «Leuchtende Kürbis-Laterne» (Herbst-Deko) gesperrt worden; das hat der erste Trockenlauf gezeigt.
- **Kürbis:** Kürbis zusammen mit Halloween-Party in der Beschreibung gilt als Halloween. Kürbis plus Tag `halloween` allein bleibt Herbst.
- **Schmuck:** Wörter wie Anhänger, Kette, Halskette, Ring, Armband, Ohrring sowie die Schmuck-Tags sind nie Partydeko, ausser der Titel nennt ausdrücklich Deko, Licht oder Beleuchtung.
- **Kanarien 47/47** (vorher 34, davon 22 Sperre / 25 bleibt):
  - Neu: Projektionslampe (nur SKU), Aufkleber-Set ohne `cj-real` (mit CJ-SKU gesperrt, mit Fremd-SKU bleibt es), Süssigkeitenschale, Tiermaske, Papageienkopf-Haube (nur Tag `kostuem`), Retro-Geist-Anhänger mit Beleuchtung.
  - Neue Gegenproben (bleiben): Herbstkranz, Hexenkostüm ab CH-Lager, schwarzes Kleid mit «Halloween-Party» in der Beschreibung, Wandverkleidung, Kürbis-Laterne mit Ratgeber-Verweis, Fledermaus-Anhänger (mit und ohne Schmuck-Tags).
  - «Fledermaus-Pendelen» ist ersetzt durch «Fledermaus-Anhänger aus Metall», Urteil jetzt **bleibt**.
- **Gegenprobe:** Schaltet man eine einzelne Regel ab (Ratgeber-Schnitt, Schmuckwort, Beschreibungs-Bezug, SKU, Kostüm-Tag, Schmuck-Deko-Ausnahme), wird jedes Mal mindestens eine Kanarie rot.

**Trockenlauf (GEMESSEN 13.10. ~22:40 UTC):** 49 → **54 Produkte** (Kostüm 24, Partydeko 28, Verkleidungsteil 2), **162 Kanal-Einträge** (je 54 bei TikTok, FB/IG, Pinterest), 76 Grenzfälle.

| | Produkt | Typ | Grund |
|---|---|---|---|
| + | Halloween Aufkleber Set – 2 Stück | Werkzeug & Heimwerken | Partydeko (CJ nur über SKU) |
| + | Kürbis-Totenkopf-Projektionslampe | Beleuchtung | Partydeko (CJ nur über SKU) |
| + | Sprechende Kürbis-Süssigkeitenschale | Partydeko & Ballone | Partydeko («Halloween-Party» in der Beschreibung) |
| + | Realistische Tiermaske | Hautpflege | Kostüm (Tag `kostuem` + «Verkleidung an Halloween») |
| + | Steampunk Halbmaske für Maskenbälle | Kostüme & Verkleidung | Kostüm («Halloween-Partys» in der Beschreibung) |
| + | Viking Ugly Latex Maske | Hautpflege | Kostüm («Ideal für Halloween» in der Beschreibung) |
| − | Fledermaus-Pendelen (heute «Fledermaus-Anhänger aus Metall») | Partydeko & Ballone (Typ falsch) | Schmuck, bleibt |

**Grenzfälle, neu oder geändert (bleiben, Betreiber-Entscheid möglich):**
- Fledermaus-Anhänger aus Metall, Drei Hexen Anhänger aus Acryl: Schmuck.
- Cold Light Eva Half Face Glow Mask Holiday, Rock Field CS Spike Leder Maske, Schuluniform-Set (Cosplay): Kostüm ohne Halloween-Bezug.
- 3D Totenkopf-Backform, Hunde-Pullover mit Kürbis-Muster: Halloween-Bezug, aber weder Kostüm noch Deko.
- Weiter Grenzfall wie vom Prüfer als Betreiber-Entscheid genannt: Halloween-Glasbecher, Totenkopf-Messerhalter, Haustier-Set mit Fliege, Baby-Strampler.

**Pause-Datei:** `dropship/_social_pause.txt` ist neu geschrieben (Phase «vor»): 168 Schlüssel, 54× pid/h/titel und 6 `zeile:`.

### 2. Poster-Wache (gilt ab 15.10. 00:00 UTC, auch wenn der Shop-Lauf hängt)
- `socialPause()` aus `automation/lib/social_pause.mjs` steht jetzt in allen Postern als Bedingung im Filter der wartenden Zeilen:
  - `meta_reel_post.mjs` (IG/FB-Reels)
  - `metricool_tiktok_post.mjs` (TikTok, YouTube, IG über Metricool)
  - `ig_karussell_post.mjs`
  - `social-autopost-meta.mjs` (Bild-Posts, Meta und Metricool)
  - `story-autopost-meta.mjs`
- `queue_new_products.mjs` übernimmt keine Ware mit Tag `social-pause-*` mehr in die Warteschlange.
- **Story-Fix:** Das Präfix `story-` ist jetzt im Python- und im JS-Matcher. Gekürzte Handles (`story-<handle[:74]>`) werden per Präfix verglichen. Je eine Kanarie in beiden.
- **Selbsttest** `node automation/lib/social_pause.mjs --selbsttest`: 12 Zuordnungsfälle und alle 168 Schlüssel der echten Datei mit simuliertem Datum. 1 s vor «ab» kein Treffer, ab «ab» und bis 1 s vor «bis» alle, ab «bis» keiner. Ergebnis OK.
- **Fenster-Probe über die echten Warteschlangen:**
  - 14.10. 23:59: 0 Treffer.
  - 15.10. 00:00 und 20.10.: 4 Zeilen in reels_seed und 2 in ig_karussell. Keine davon ist «ready» (jury-skip, posted, preis-veraltet).
  - 01.11.: 0 Treffer.
- **DRY aller Poster** (`DRY=1` bzw. `DRY_RUN=1`): alle rc 0, nichts gepostet. md5 von reels_seed.csv, social/*.csv und den Post-Ledgern vorher und nachher gleich.

### 3. Aufseher (`automation/fixer_keepalive.sh`) und Ampel
- **Tagesliste:** `anlass_social_sperre` ist eingetragen, mit `SCHARF=1` und in der NACH-Liste (Exit 0 → FERTIG; Exit 1 bei offenen Einträgen → der nächste Tick versucht es erneut).
- **Erster scharfer Lauf kurz nach 00:00 UTC:** Der 20-h-FERTIG-Takt hätte den Lauf vom 14.10. abends bis in den 15.10. hinein geschoben. Deshalb gibt es `anlass_social_sperre.py --faellig`.
  - Es vergleicht die Phase im **Repo-Stand** `dropship/_anlass_social_sperre.json` (vom letzten scharfen Lauf) mit der Phase jetzt.
  - Ist eine Fenstergrenze überschritten, setzt der Aufseher `ZN=1`. Das ist dasselbe Muster wie der Zombie-Nachlauf von versand_jenachland: Der Lauf startet trotz FERTIG < 20 h, also beim ersten Tick nach 00:00 (Takt ~2 min).
  - Am 01.11. greift dasselbe für den Rückweg.
  - Warum nicht `/tmp/_start_*`: Diese Marke löscht `dreht_sich_im_kreis()` vor jedem Neustart. Fehlt sie, würde der Lauf bei jedem Tick erzwungen.
  - Selbsttest +8 Fälle (Stand vor/im/nach, scharf/trocken, kein Stand).
- **Gültigkeit:** Der laufende Aufseher (gestartet ~22:09) hat die alte Fassung geladen. Die neue gilt nach dem nächsten Container-Neustart (~stündlich), also lange vor 15.10. 00:00 UTC. VERMUTUNG, nicht gemessen: Danach soll `ps` den Aufseher mit jüngerem Alter zeigen; nachprüfen am 14.10. mit `grep anlass_social_sperre /tmp/anlass_social_sperre.log`.
- **Druck-Profil:** Der Block `druck_profil.py --scharf` läuft täglich nach `ch_lager_profil`, nach demselben Muster. `bash -n` ok.
- **Ampel** (`betreiber_ampel.py social_sperre()`, Teil von «BRAUCHT DICH»): Sie meldet nur in drei Fällen:
  - offen > 0;
  - die Fenstergrenze ist seit über 1 h überschritten und es gab danach noch keinen scharfen Lauf;
  - im Fenster ist der Stand älter als 30 h.

  Auf dem Server und ohne Stand-Datei bleibt sie still. 8 simulierte Zeitpunkte geprüft. Der echte Ampel-Lauf rc 0, heute keine Zeile.

### 4. Reel-Nacharbeit (Prüfer «Empfohlen» 1–5, Commit 91a7f0e38)
- `produktMerkenReel` steht nach `writeLedger` in einem eigenen try/catch (Meta und TikTok).
- `meta_reel_post` prüft die Handle-Gleichheit wie TikTok.
- **Set-Regel enger:** Nur Bauteil-Varianten zählen; Grössen-, Farb- und Mengenspannen nicht. Eine Set-Absage ist «set-einzelteil», also nur Tagescache (am Folgetag neu) und nicht mehr endgültig «ungeeignet».
- `social_queue_saeubern.preis_veraltet` nutzt die «ab»-Regel wie der Poster: 15 von 15 Fällen gleich in Python und JS.
- **catKey:** Velo-, Einweg- und Auto-Waschhandschuhe → allgemein, Gartenhandschuhe → home, Box-, Gewichtheber- und Schwimmhandschuhe → fitness. Live an 99 Handschuh-Titeln: «mode» 68 → 56, der Rest ist echte Mode.
- **Tests:** `bild_reel_auswahl.py --selbsttest` 62/62, `schnitt_test.py` 60/60.
- **Nebenbefund (ehrlich):** Für einen Paritätstest habe ich `social_queue_saeubern.py` einmal per `import` geladen. Das Skript hat keinen `__main__`-Schutz und lief dabei einmal **scharf** durch, mit dem Ergebnis «GESAMT:» ohne Änderungen. Die Queue-CSVs sind laut md5 unverändert. Der eigentliche Test lief danach isoliert (nur die Funktion per ast).

### 5. Kaufweg-Testlog
- In `dropship/_kaufweg_tests.txt` stehen 8 Zeilen vom 13.10. 21:09–21:18 jetzt auf `blockiert-cloudflare` statt `ok`; gelöscht ist nichts.
- **6 davon sind belegt:** Ihre Screenshots sind identisch, je 17'287 B (Cloudflare-Sperrseite).
- **2 sind VERMUTET:** Bei 21:09:00 und 21:09:29 wurde der Screenshot unter gleichem Dateinamen überschrieben. Sie liegen aber zwischen dem letzten echten Kassenbild (21:08:37, 115 KB) und dem ersten Sperrbild (21:09:44). Das steht so in der Bemerkungsspalte.

### Offen
- **Rückweg-Risiko (Prüfer-VERMUTUNG, nicht behoben):** Bei einem Teilfehler eines 20er-Bündels oder einem Container-Neustart zwischen Antwort und Ledger-Zeile könnten abgemeldete Paare ohne Ledger-Eintrag bleiben. Dann würden sie am 01.11. nicht wieder angemeldet.
  - Möglicher Fix: die Absicht vor der Mutation ins Ledger schreiben, oder den Rückweg zusätzlich aus `liste` im Stand ableiten.
  - Prüfen am 15.10.: Anzahl «ab»-Zeilen im Ledger = 162 (bzw. Auswahl × Kanäle).
- **Lücke bei Neuimporten:** Neue Importe kommen erst mit dem nächsten Tageslauf (≤ 20 h) in Sperre und Pause-Datei. Ein im selben Tag gebautes Reel für ein neues Halloween-Produkt sperrt bis dahin nur `queue_sperren` bzw. der Poster über die Pause-Datei.
- **Prüfen am 15.10. (Punkte oben unter «Prüfen» gelten weiter):**
  - `--ampel` zeigt «54 gesperrt / 0 offen» (oder mehr).
  - `productsCount(tag:social-pause-halloween)` = 54+.
  - `/tmp/anlass_social_sperre.log` hat einen START kurz nach 00:00 UTC.

## Nachtrag 23.10.2026 (Verbesserungsrunde 12:25 UTC) — Ampel nannte die falsche Ursache
- GEMESSEN 23.10. 12:20 UTC: Ampel «⚠️ SOCIAL-SPERRE halloween: Fenstergrenze 15.10. überschritten, kein scharfer Lauf danach», obwohl das Log «FERTIG 22.10. 15:33Z — 56 gesperrt / 0 offen» zeigte. Ursache: `betreiber_ampel.social_sperre()` fragte `faellig()`, und das ist auch dann wahr, wenn der letzte scharfe Lauf nur ≥ 20 h her ist (Tageslauf fällig, lief um 12:23 gerade). Die Sperre selbst war nie lückenhaft.
- Fix: `anlass_social_sperre.grenze_ohne_lauf()` (nur «kein scharfer Stand» oder «Stand-Phase ≠ Phase jetzt»); die Ampel nutzt sie statt `faellig()`. Der fehlende Tageslauf bleibt über die bestehende Zeile «Stand > 30 h — Tageslauf fehlt» sichtbar. `python3 automation/anlass_social_sperre.py --selbsttest` prüft jetzt zusätzlich 4 Fälle + 2 Mutanten (Phase nicht verglichen / scharf nicht verlangt), beide erkannt. Ampel danach: keine SOCIAL-SPERRE-Zeile.
