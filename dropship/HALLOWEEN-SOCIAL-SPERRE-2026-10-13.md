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
