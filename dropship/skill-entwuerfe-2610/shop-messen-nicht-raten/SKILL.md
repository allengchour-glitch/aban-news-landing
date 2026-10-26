---
name: shop-messen-nicht-raten
description: Immer wenn bei LuxeStyle eine Zahl, ein "alles grün", ein "0 Befunde" oder eine Massenänderung ansteht - vor jedem Lauf, der mehr als ein Dutzend Produkte, Collections oder Seiten ändert, bei jedem Fehler 429/404/Throttled, bei jedem Messgerät oder Wächter, den man neu baut oder dem man glaubt. Enthält das Messverfahren (Bulk-Abfrage statt Seiten, Drosselung ist keine Antwort, Gegenprobe in beide Richtungen, Diff lesen, nach dem Schreiben frisch lesen), die vier Fälle des stummen Skips, die Shopify-Felder, die täuschen (seo ist ein Ersetzen, Metafeld-Filter, Wildcard, resourcePublications) und die Regeln für Subagenten.
---

# Messen, nicht raten: das Verfahren hinter jeder Zahl im Shop

Fast jede teure Lehre dieses Projekts hat dieselbe Form: **ein Messgerät oder eine Annahme war falsch, und das Ergebnis sah plausibel aus.**
Die Zahlen unten sind der dokumentierte Stand (CLAUDE.md, 17.-26.10.2026), hier **nicht neu am Live-Shop gemessen**. Darum gilt vor jeder Zahl, die in eine Entscheidung geht: Marke dazuschreiben - **GEMESSEN** (hier selbst nachgeprüft, mit Befehl und Zahl) · **QUELLE** (fremde Angabe) · **BEHAUPTUNG** (ungeprüft) · **SETZUNG** (gewählte Schwelle) · **unbekannt** (nicht gemessen; kein Befund, keine Freigabe).
Node = `/opt/node22/bin/node`. Zugang: `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` (Client-Credentials, Token rund 24 h; `lib/shopify_secret.mjs` schneidet das echte `shpss_…` aus vertauschten Env-Feldern), für CJ `CJ_EMAIL`, `CJ_API_KEY`.

## 1. Den Katalog messen: Bulk-Abfrage, nicht Seiten

- `node automation/katalog_bulk.mjs [ziel.json]` liest alle aktiven Produkte (id, handle, title, productType, tags, Google-Kategorie) per `bulkOperationRunQuery`: **56 636 Produkte in unter 1 Minute** (GEMESSEN, CLAUDE.md-Stand 25./26.10.2026; mit Metafeld ~99 MB), kostet keinen CJ-Punkt. Vorgabe-Datei `/tmp/katalog_frisch.json`; Inhalt `{gelesen, vollstaendig, produkte[]}` - `vollstaendig:false` heisst: Zahlen sind Untergrenzen.
- Dasselbe Muster mit eigener Abfrage und Zwischenspeicher: `auswahl_kandidaten.mjs` (`/tmp/auswahl_bulk.jsonl`, 3 h, `NEU=1`), `bewertung_zuerst.mjs` (`/tmp/bewertung_bulk.jsonl`, 6 h, `NEU=1`). Kinderzeilen der JSONL tragen `__parentId` (z. B. Varianten).
- **Es läuft nur eine Bulk-Abfrage zugleich** («Es läuft schon eine Bulk-Abfrage — abwarten»).
- Seitenweise (`katalog_titel_scan.mjs`, 250 je Seite) braucht 20+ Minuten und teilt sich das Punkte-Budget - nur wenn Bulk nicht geht.
- **Eine Stichprobe beantwortet keine Katalogfrage:** «Sperr-Tag bei 200 Produkten: 67 %» - Vollzählung über 1890: **10,6 %**. Standardsortierung schiebt die zuletzt geänderten nach vorn. Fenster-Läufe immer mit `SORT=CREATED_AT REVERSE=0` und ausgeschriebener Region im Bericht; `productsCount` zählt nur bis 10 000.
- **Punkte-Eimer** (GEMESSEN 18.10.): 2000 Punkte, 100/s Nachfüllung; eine Seite `first:50` kostet 51, ohne das nie gelesene `featuredMedia` 44, ohne Bildprüfung 16. Der Eimer wird auch **von aussen** geleert (Parallelsitzungen, Apps) → bei Massenarbeit die billigste Abfrage wählen. Beispiel-Schalter: `DRY_RUN=1 LIMIT=1 BILDCHECK=0 SORT=CREATED_AT REVERSE=0 node automation/seo-optimizer.mjs`.

## 2. Drosselung ist keine Antwort

| Quelle | Regel | Wo im Code |
|---|---|---|
| Shopify `Throttled`/429/5xx | wachsende Pausen (6 Versuche, 1,5 s ·2ⁿ), danach `taktPause` aus `extensions.cost` (Deckel 10 s); **echte GraphQL-Fehler fliegen sofort** (sonst verschwindet ein falsches Feld in der Warteschleife) | `lib/shopify_gql.mjs` |
| Seite 429/5xx/Netzfehler | nachfassen, bleibt es dabei → **«nicht messbar»**, kein Befund; **ein echter 404 gilt sofort**. HTTP 429 ist nicht 404 (schlug an einem Tag dreimal zu) | `lib/url_status.mjs → statusMitGeduld()` → `{status, nachgefasst, unsicher}` |
| CJ 429/5xx | Pausen, dann `CJ_THROTTLED` (Lauf beenden, nicht hundert Produkte als «Fehler» durchreichen); **erschöpfte Tagespunkte → `CJ_QUOTA` sofort**; Codes 1602001/1602002/1602003 sind **Antworten** (`WEICHE_CODES`), keine Fehler | `lib/cj_fetch.mjs` |
| CJ-Anmeldung | `getAccessToken` nur alle **5 Minuten**; `16900202` sieht aus wie ein kaputter Zugang, ist Drosselung → Zwischenspeicher `/tmp/cj_token.json` | `lib/cj_token.mjs` |

Lieferbarkeit (`lib/lieferbarkeit.mjs`): `1602001 Product not found` = **unbekannt**, nicht unlieferbar (zwei der 30 besuchten Produkte tragen eine interne UUID statt einer CJ-SKU). Nur **0 Frachtlinien CN→CH** heisst «nicht lieferbar»; Status und Lagerbestand taugen nicht (das als verboten zurückgeschickte Taschenmesser trug `status 3`, 5628 Stück Lager und eine Frachtlinie). Wächter: `PQUERY='…' MAXPRUEF=50 node automation/lieferbarkeit_guard.mjs` (Trockenlauf; `HANDLES`, `ERNEUT=1`, `LIVE=1`; jede Prüfung kostet CJ-Punkte).

## 3. Der stumme Skip - vier Fälle derselben Klasse (alle GEMESSEN)

1. CJ-Anmeldung sendete `apiKey` statt `password` → leere Listen → die Schlussfolgerung «CJ hat keine Kommentare» stand wochenlang im Gedächtnis.
2. 4466 von 12 000 Produkten haben als SKU eine **reine Ziffernfolge = die CJ-pid**; der Resolver verwarf sie still («keine CJ-pid → skip»), 37 % des Katalogs unsichtbar.
3. Der Präfix `^cj-?` schnitt von der blanken SKU `CJLY…` das «CJ» ab: 18 von 25 Produkten «ohne CJ-Daten». Der Test hatte nur `CJ-uuid` geprüft. (`strategien()` in `lib/fakten_block.mjs` trägt die Gegenprobe.)
4. `SHOPIFY_CLIENT_SECRET` kam als `shpss_…=SHOPIFY_CLIENT_SECRET` (60 statt 38 Zeichen) → HTTP 400 → **60 Skripte** meldeten «keine Shopify-Creds → No-op».

Daraus **vier Pflichten:** (a) ein Guard darf aussteigen, aber **muss den Grund nennen** (Status, Antworttext, Länge); (b) jeder Bericht nennt, **wie viele Produkte angefasst wurden** («gelesen 1000, geprüft 0» ist keine Freigabe - der Lieferbarkeits-Wächter ist auf Fortura mit 0 von 2371 CJ-Nummern nicht anwendbar); (c) der Ausnahmefall steht als Test (Gegenprobe), nicht nur der Normalfall; (d) **auch der stille Erfolg tritt auf**: SEO-Titel gleich Produkttitel wird nicht gespeichert (3009 Produkte «offen»), Judge.me antwortete 201 ohne ID (7 Bewertungen live, Lauf meldete 0) - dann steht die Lücke im Messgerät, nicht im Shop.

## 4. Vor jeder Massenänderung (mehr als ein Dutzend Objekte)

1. **Messgerät zuerst gegenprüfen - in beide Richtungen.** Ein bekannter Fall muss anschlagen, ein bekannt harmloser nicht. Beispiele: erfundene Adresse abfragen (muss 404 liefern), Bildmessung mit künstlich 50 % transparentem Bild (muss ausschlagen; `page.screenshot({clip})` rechnet in Dokumentkoordinaten - das Gerät meldete überall 0,00), harmlose Chargen-Tags (`rueckhol-0907`) dürfen **nicht** sperren.
2. **Trockenlauf ist Vorgabe** (`LIVE=1` schreibt) und die Liste wird **gelesen - beide Seiten** (rein und raus), nicht die Zahl. Ein Muster mit einfachem Bindestrich machte aus «3-5 Minuten, kein Hype.» ein «3.» auf 264 Seiten; Zahl und html-validate sahen unauffällig aus.
3. **Muster sind Messgeräte.** Wortgrenze prüfen: «SSD» in «Stossdämpfend», «Tasse» in «Tassel», `/ring\b/` in «Spring», `rueckhol` traf `rueckhol-0907` (78 % des Katalogs weg), `schweiz` traf `schweiz-versand`, `sticker` schickte 265 Produkte zu «Schweiz-Edition». Reihenfolge: **das Spezifische zuerst**. Auffällige Verteilung (89 % auf ein Ziel) = Warnsignal. Auch ein Such-Grep ist ein Messgerät: «Throttle» traf «Full Throttle» (ein Ducati-Modell).
4. **Stichprobe am Rohergebnis** (5-10 Objekte ganz lesen), Fundstelle im Kontext ansehen (der Scanner las Theme-Kommentare als Produkttext).
5. **Schreiben, dann FRISCH lesen** - nie dem Rückgabewert der Mutation glauben. Shopify meldet Abgelehntes teils in `userErrors` INNERHALB einer Erfolgsantwort.
6. **Nachher:** die offene Zahl sinkt **genau** um die geschriebene; ein zweiter Trockenlauf meldet 0. Eine Dublette fällt so sofort auf.
7. **Ledger statt Gedächtnis:** `dropship/*_ledger.txt` (`handle · Zeit · ERGEBNIS · Grund`) macht Läufe wiederholbar; ein Ledger, das Fehlschläge nicht vermerkt, ist wertlos, und eines, das Erfolg überspringt, braucht `FORCE=1` für den Neulauf (siehe `kategorien_anlegen.mjs`).

## 5. Shopify-Felder, die täuschen

- **`ProductInput.seo` ist ein ERSETZEN.** Nur `{description}` senden löscht den SEO-Titel (live 24.10. mit frischem Lesen belegt; dabei ging eine vorhandene Beschreibung verloren). Immer beide Felder; Helfer `seoNachtrag()`, `seoOffen()`, `seoTitel()` in `lib/seo_titel.mjs` (`node automation/lib/seo_titel_test.mjs`). Ein Titel, der dem Produkttitel gleicht, wird von Shopify nicht gespeichert (`seo.title` bleibt `null`).
- **Der Metafeld-Filter der Produktsuche wird still ignoriert** (`metafields.…:*Shopping_ads*` lieferte dieselbe Zahl wie ohne Filter; Gegenprobe `tag:gaming`: 369 = 369). Metafelder per Bulk lesen und lokal filtern.
- **Wildcard-Suche** (`title:*Armatur*`) findet «Küchenarmatur» nicht → lokal auf der Titelliste auswerten.
- **`resourcePublicationsV2`** meldete 169 «nicht im Onlineshop»; live waren 4 von 5 Stichproben 200 → **nur der HTTP-Abruf** (mit Cache-Buster `?cb=<zeit>`; Rand-Cache ~20 s) sagt, ob eine Seite lebt.
- Judge.me-Admin-Liste ignoriert jeden Produktfilter (sogar ein erfundenes `handle`); die öffentliche Widget-Antwort `reviews_for_widget?product_id=…` filtert wirklich.
- Playwright: **neuer Kontext je Seite** (der Preview-Cookie des Themes färbt den «Live»-Vergleich ein); `domcontentloaded` + feste Wartezeit (`networkidle` hängt auf luxestyle.ch). Der Browser kommt aus `PLAYWRIGHT_BROWSERS_PATH` (hier `/opt/pw-browsers`, GEMESSEN 26.10.2026); **nie** `playwright install`.
- Ein Draft hat meistens einen Grund (90 % der Drafts tragen einen Sperr-Tag): **Tags zählen, dann urteilen**; eine Liste bekannter Gründe ist nie vollständig.

## 6. Tests und Verdrahtung

- **Zusammenfassung und `process.exit` ans ENDE** der Testdatei - sonst laufen neu angehängte Tests nie und «alle grün» kommt aus dem alten Block.
- Ein Test, der in keinem Workflow läuft, ist keiner: `grep -rn "<testname>" .github/workflows/` (`seo_titel_test.mjs` lief monatelang nirgends). Ein neues Gate (`APPROVE_PUBLISH`, `DRY_RUN`): `grep -rn "<SCHALTER>" .github/workflows/`, sonst wird aus dem Wächter still ein Trockenlauf.
- `pull_request`-Workflows feuern auf Claude-PRs nicht zwingend: **nachsehen, welche Läufe es gab**, nicht auf fehlende rote Checks vertrauen. Immer rot sind `Workers Builds: aban-news-landing | aban-a | ki-verzeichnis` - nicht jagen.
- Mutationsprobe: eine Wortgrenze entfernen oder einen Vergleich drehen - **ein Test muss rot werden**; bleibt alles grün, schützt der Test nichts (Python: `python3 -B`, sonst läuft alter Bytecode).
- Ein Lauf ohne Ausgabe ist nicht hängend (Punkte-Budget bremst: 200 Boxen in 2,5 h bei leerem Eimer, 145 in 90 s bei freiem) - Fortschrittszeile vor jeder Runde schreiben, nicht abbrechen.

## 7. Delegation (CLAUDE.md, «Modellwahl»)

Mechanisches an Subagenten mit `model: "haiku"`: zählen, Seiten/Links/Bilder abklopfen (HEAD, Status), Listen umformatieren, Dateien suchen, Messläufe nur lesend auswerten.
**Beim Hauptmodell:** jedes Urteil (Bildqualität, Rechtliches, Lieferbarkeit, Titel-Wahrheit), Code mit Geldwirkung, Shop-/Theme-Schreibzugriffe, Reviews.
**Ein Haiku-Befund ist eine Behauptung:** Zahlen, die in eine Entscheidung gehen, am Rohergebnis stichprobenartig gegenprüfen - und das Messgerät des Agenten zuerst prüfen (bekannter Fall in, erwartetes Ergebnis heraus).
Preise, Rechtliches, Veröffentlichung und alles mit Kundenkontakt entscheidet der Besitzer; lokale Bereitschaft ist keine Live-Freigabe.

## Kurzcheck vor «fertig»

Zahl mit Marke? · Messgerät in beide Richtungen geprüft? · Trockenlauf-Liste gelesen? · wie viele Objekte **angefasst**? · nach dem Schreiben frisch gelesen? · offene Zahl um genau die geschriebene gesunken? · 429/Throttled nicht als Befund gewertet? · was ist **unbekannt** und steht so im Bericht?
