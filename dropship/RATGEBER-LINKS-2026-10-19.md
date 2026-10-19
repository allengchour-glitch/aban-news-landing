# Ratgeber-Links repariert — 19.10.2026 (Betreiber «verbessere mehr sichtbarkeit», Freigabe «Beides»)

**Ergebnis in einem Satz:** 38 Linkziele (16 × 404, 4 × 301-Produkt, 18 × 301-Kollektion) = 95 Link-Vorkommen in 60 Artikeln zeigen jetzt direkt auf lebende Seiten;
Nachmessung 665 Ziele = 665 × HTTP 200, 0 × 404, 0 × 301. Geändert wurden ausschliesslich `href`-Werte.

> **Ehrliche Einordnung (Sichtbarkeit):** Das ist Hygiene an der internen Verlinkung (Googlebot und Leserinnen laufen nicht mehr in 404 bzw. in einen
> 301-Umweg). Eine messbare Wirkung auf Rankings/Indexierung ist **NICHT belegt**. Nachmessen in 4–8 Wochen (GSC «Gefunden – zurzeit nicht indexiert»
> und Klicks der 60 Artikel).

## 1. Messung vorher (19.10. 21:23–21:27 UTC)
| Was | Befehl / Quelle | Ergebnis |
|---|---|---|
| Artikel | Admin-API `articles(first:50)` ×7 (`body` mitgeladen) | 346 Artikel (334 veröffentlicht; Blog ratgeber 316, magazin 30) |
| Interne Links | `href`-Regex (relativ, `https://luxestyle.ch`, `www.`, `//`) | 1'686 Vorkommen, 688 verschiedene Pfade (856 Produkt, 661 Kollektion, 159 Blog, 10 Seite, 1 Startseite) |
| Status je Ziel | `curl -s -o /dev/null -w "%{http_code}"` ohne und mit `-L` (4 Threads, 429er einzeln nachgeprobt) | 650 × 200 · **22 × 301 (alle → 200)** · **16 × 404** |
| Gegenprobe am Ursprung | `blog_linkziele_wache.py` (Admin) | 16 tot (alle DRAFT), 22 per Redirect — **Mengen identisch zu curl** (404-Menge, 301-Menge, Differenz leer) |

Abweichung zum Spähtrupp: keine (16 + 4 + 18 = 38). Ein «000» im ersten Lauf (`magnetische-handyhalterung-furs-auto-luftung-8be18e`) war ein Netz-Hänger, nachgeprobt 200.

## 2. Reparatur (21:41–21:43 UTC) — Tabelle alt → neu
Quelle der Entscheidungen: `dropship/_ratgeber_links_ersatz_2026-10-19.tsv` (39 Zeilen, Begründung je Zeile in Spalte 5). Regel: **301 → Endziel; 404-Produkt → nur ein aktiver Zwilling,
dessen Aussagen im Text wahr bleiben, sonst die passende Kollektion.** Jedes Ziel vorher am Ursprung geprüft: Produkt ACTIVE + im Online Store + nicht in `_werbetest_sperre.txt` + ohne
Risiko-Tags (Klinge/Tabak/Kostüm/ausverkauft/nicht-versendbar/auswahl-offen), Kollektion veröffentlicht + ≥ 5 Produkte; zusätzlich curl 200.

### 2a. 18 × 301-Kollektion → Endziel der Weiterleitung (alle 200, veröffentlicht)
| alt | neu | Artikel |
|---|---|---|
| /collections/bastel-diy | /collections/basteln-diy | 1 |
| /collections/beleuchtung-lampen | /collections/sub-beleuchtung | 4 |
| /collections/buero-schreibwaren | /collections/buro-home-office | 1 |
| /collections/caps-hute | /collections/caps-huete | 1 |
| /collections/elektronik-computer | /collections/elektronik-technik | 5 |
| /collections/fitness | /collections/fitness-training | 3 |
| /collections/geschenke-unter-30 | /collections/%F0%9F%8E%81-geschenke-bis-chf-30 (prozentkodiert) | 2 |
| /collections/haarstyling-tools | /collections/haarstyling-geraete | 2 |
| /collections/kinderspielzeug | /collections/spielzeug | 1 |
| /collections/kuche-kochen | /collections/sub-kueche | 2 |
| /collections/kuechengeraete | /collections/sub-kueche | 2 |
| /collections/pool-schwimmen | /collections/pool | 1 |
| /collections/schuhe-sandalen | /collections/sub-sandalen | 1 |
| /collections/schuhe-stiefel | /collections/sub-stiefel-boots | 1 |
| /collections/sonnenbrillen-eyewear | /collections/sonnenbrillen-alle | 4 |
| /collections/spielzeug-bausets | /collections/spielzeug | 1 |
| /collections/sub-uhren | /collections/uhren | 2 |
| /collections/trainingsanzuege-sets | /collections/sport-outdoor | 2 |

Hinweis: `trainingsanzuege-sets → sport-outdoor` und `kuechengeraete → sub-kueche` sind die Entscheide der bestehenden Weiterleitungen (breit). Spezifischere Ziele
(z. B. `haushaltsgeraete` für Küchengeräte) wären möglich — nicht angefasst, da Regel «Endziel».

### 2b. 4 × 301-Produkt
| alt (DRAFT + 301 auf Kollektion) | neu | Art | Begründung |
|---|---|---|---|
| /products/galaxy-aurora-led-projektor-360-sternenhimmel | /products/aurora-borealis-sternenlicht-projektor-365824 | Zwilling | Text: «Nordlicht-Stimmung ins Schlaf-/Wohnzimmer»; Zielseite = Aurora-Borealis-Sternenlicht-Projektor (CHF 40.90) |
| /products/premium-leder-geldborse-slim (11 Artikel!) | /collections/portemonnaie | Kollektion | Slim Wallet Echtleder: DRAFT (ausverkauft-lieferant), die ganze Familie gedraftet; Texte nennen Vollnarbenleder/8 Fächer/7 Farben/CHF 49.90 = kein sicherer Zwilling; die 301 ging auf «Taschen» — «Portemonnaie & Kleinleder» (192) passt besser und ist im Ratgeber schon verlinkt |
| /products/reed-diffuser-aroma-duftstabchen-ohne-flamme | /collections/sub-aroma-diffuser | Kollektion | kein aktiver Reed-Diffuser; = Endziel der 301 |
| /products/resistance-bands-set-5-teilig-fitnessbander-heim-training | /products/widerstandsband-set-fur-fitness-649410 | Zwilling | «Loop Set of 5», 5 Widerstandsstufen, CHF 14.90, kein `auswahl-offen` |

### 2c. 16 × 404-Produkt (alle DRAFT; 14 × `cj-nicht-versendbar-ch`, 2 × `ausverkauft-lieferant`)
| alt | neu | Art | Begründung |
|---|---|---|---|
| 2er-set-schrank-organizer-…-502337 | /collections/schrank-organizer | Kollektion | Listenpunkt nennt «2er-Set» + Preis, kein aktives 2er-Set; exakte Kollektion (7) |
| 30000mah-powerbank-mit-integrierten-kabeln-132482 | Artikel *powerbank-handgepaeck-regeln-flug*: /collections/elektronik-laden · Artikel *powerbank-kaufen-mah-schwindel-2026*: /products/kompakte-10000-mah-powerbank-mit-integriertem-600900 | Kollektion / Zwilling | Flug-Karte behauptet 30'000 mAh = 111 Wh MIT vier Kabeln + Airline-Regel → kein sicherer Zwilling; im Kauf-Ratgeber steht nur «Variante mit eingebauten Kabeln (CHF 31.90)» — Zwilling kostet ebenfalls CHF 31.90 |
| befestigungsriemen-fur-pool-abdeckungsroller-8-456321 | /collections/pool | Kollektion | Spezialzubehör, kein Zwilling |
| pool-bodensauger-1-2-m-453570 | /collections/pool | Kollektion | kein aktiver Bodensauger 1.2 m |
| poolschlauch-adapter-2-stk-882497 | /collections/pool | Kollektion | kein Zwilling |
| getrocknete-blumen-deko-kerzen-969408 | /collections/sub-deko | Kollektion | kein aktiver Zwilling; «Vasen & Deko» führt Trockenblumen-Ware |
| kompakte-hand-kaffeemaschine-fur-kapseln-pulve-934784 | /products/kompakte-tragbare-mini-kaffeemaschine-370a99 | Zwilling | manuell, «7 g Pulver oder eine Kapsel», kein `auswahl-offen` (CHF 36.90) |
| magnetische-10000mah-powerbank-mit-20w-967745 | /products/ultradunne-magsafe-powerbank-10-000-mah-627600 | Zwilling | 10'000 mAh, MagSafe-kompatibel, kabellos (CHF 28.90); **«20 W» im Anker steht nicht auf der Zielseite** |
| powerbank-10000-mah-mit-schnellladefunktion-795202 | /products/power-bank-pd20w-dual-port-10000-mah-621400 | Zwilling | 10'000 mAh + PD20W-Schnellladen (CHF 28.90) |
| solar-powerbank-10-000-mah-wasserdicht-076161 | /products/wasserdichte-solar-powerbank-mit-wireless-char-623500 | Zwilling | 10'000 mAh, Solar, wasserdicht, LED-Taschenlampe (CHF 19.90); «LED-Ladestandsanzeige»/«Doppelklick» im Text auf der Zielseite nicht bestätigt |
| rauchfreie-sojawachskerze-geschenk-fur-aromath-627500 | /collections/wohnen-dekoration | Kollektion | einzige aktive Sojakerze trägt `auswahl-offen` und nennt Fremdmarken in der Duftliste → nicht verlinkt |
| sisal-kratzbaum-fur-katzen-40-cm-463298 | /collections/kratzbaeume | Kollektion | Karte nennt 30×30×40 cm / Säule Ø 5 cm / Plüsch → kein sicherer Zwilling |
| skelett-lebensgross-fga97800 | /collections/halloween | Kollektion | aktive Skelette (Gerippe 165 cm, beweglich 90 cm) stehen schon als eigene Karten im Artikel |
| slim-wallet-mit-rfid-schutz-und-kartenautomati-532929 | /collections/portemonnaie | Kollektion | Text verspricht «Karten auf Knopfdruck», kein aktiver Zwilling |
| wasserdichtes-zelt-fur-2-personen-617600 | /collections/camping-schlafen | Kollektion | aktive 2-Personen-Zelte sind nur «wasserabweisend» / `auswahl-offen` und CHF 45–135 |
| yoga-matte-mit-grip-632000 | /collections/yoga-pilates | Kollektion | Karte nennt PU-Gummi + CHF 80.90 (Reinigungsratgeber); die andere Matte steht schon als Karte im Artikel |

**Verworfen:** `wallets-sub` («Wallets», 20) — die Kollektion ist **verschmutzt** (Jeanskleid, Herren-Lederschuhe, Slim-Fit-Hose als «Wallets»); `handy-powerbanks` und `pool-schwimmen` sind nicht veröffentlicht.
**Nebenbefund (nicht angefasst):** Kollektionsregel `wallets-sub` prüfen (Kleider/Schuhe unter «Wallets»).

## 3. Sicherung, Prüfung, Rückweg
* **Sicherung vorher:** `dropship/_ratgeber_links_vorher_2026-10-19.json` (60 Artikel: id, handle, blog, body; 412 KB) — vorhandene Einträge werden nie überschrieben.
* **Schreiben:** `bash automation/shopify_schranke.sh python3 automation/ratgeber_links_reparieren.py --scharf` (nimmt den Blog-Lock selbst), `articleUpdate(body)` je Artikel, 60/60 ok, Rücklesen **identisch** (Body == erwarteter Body).
* **Differenz unabhängig geprüft** (Vorher-Messung 21:23 vs Nachher-Messung 21:43, alle 346 Artikel): 60 Artikel geändert; Differenz **nur in href-Werten** (Maske «alle href-Werte leeren» ergibt für alt/neu identische Texte); 95 href-Werte, 41 verschiedene Paare (Schreibweisen relativ/absolut getrennt gezählt); die 286 übrigen Artikel unverändert; `handle`, `title`, `isPublished`, `publishedAt` aller Artikel unverändert.
* **Rückweg:** `python3 automation/ratgeber_links_reparieren.py --zurueck --scharf` — spielt die Originaltexte nur zurück, wenn seither ausschliesslich href geändert wurden (sonst «von Hand prüfen»). Trockenlauf bestätigt: alle 60 wären zurückspielbar. Ledger: `dropship/_ratgeber_links_ledger.tsv`.
* Wiederholung ist ein No-Op (Trockenlauf nach der Reparatur: 0 Artikel).

## 4. Nachmessung (Admin 21:43 UTC, curl 21:47 UTC)
| Messung | Ergebnis |
|---|---|
| curl, alle internen Ziele (ohne/mit Folge) | **665 Ziele: 665 × 200**, 0 × 404, 0 × 301 (1 × 429 vom Proxy, einzeln nachgeprobt: 200) |
| `blog_linkziele_wache.py` (Admin) | `RATGEBER-LINKS: 0 tot · 0 umgeleitet (346 Artikel, 1686 Links)` · Kanarienvogel ok (18 offline + 4 live) |
| Öffentlicher Stand | Storefront von unserer IP nur eingeschränkt prüfbar (Bot-Cache, Edge-Cache bis ~Minuten): Admin-API ist die Wahrheit am Ursprung; WebFetch am 19.10. ~21:57 UTC lieferte HTTP 429 (zweimal, Retry-After 60 — nicht wiederholt). Ersatz: ein curl-GET von `/blogs/ratgeber/pool-schwimmen-2026-ratgeber` um ~21:58 UTC (HTTP 200): enthält `/collections/pool`, keine der alten Pfade (befestigungsriemen/pool-bodensauger/poolschlauch/`/collections/pool-schwimmen`) — **nur Stichprobe, Seiteninhalt von unserer IP ist laut Hausregel nicht belastbar**; Änderung 21:41–21:43, Messung 21:58 |

## 5. Wächter: warum er die Altlinks nicht meldete — und was jetzt anders ist
Gemessen am Log `/tmp/blog_linkziele_wache.log` und am Code (Stand vor 19.10.):
1. **Blindfleck 301:** `redirects()` markierte jedes Ziel mit Redirect als «lebendig» («ein 301 ist eine funktionierende Verlinkung»). Die 22 umgeleiteten Ziele (18 Kollektionen, 4 Produkte; zusammen in 49 Artikeln) tauchten in der Ampel **nie** auf.
2. **404 wurden gezählt, aber nicht abgearbeitet:** Letzter Lauf 18.10. 22:16 → «BLOG-LINKS: 14 tote Ziele in 13 Artikeln», Aufseher-Zeile «⚠️ Blog verlinkt tote Ziele — Hand-Zuordnung». Es gab keinen Reparaturweg ausser `blog_link_ersetzen.py` (ein Paar pro Aufruf, schreibt auch Preise). Seither kamen 2 weitere Drafts dazu (16).
3. **Eingeschränkter Messbereich:** nur `/products/` und `/collections/`, nur doppelte Anführungszeichen; `/pages/` und `/blogs/` (169 Links) wurden nie geprüft.

**Behoben in `automation/blog_linkziele_wache.py`:**
* Ampel getrennt nach **tot** und **umgeleitet**: `RATGEBER-LINKS: N tot · M umgeleitet (A Artikel, L Links)` (Zeile 1), Details in `RATGEBER-DETAIL`, JSON-Schlüssel `tote`/`mit_redirect` unverändert.
* Prüft zusätzlich `/pages/` (existiert + veröffentlicht) und `/blogs/` (Artikel existiert + veröffentlicht); erkennt `href='…'`, `HREF`, `//luxestyle.ch`, `www.`, Zeilenumbruch im Tag.
* **Kanarienvogel bei jedem Lauf** (Hausregel «eine 0 braucht einen Positiv-Kanarienvogel»): offline 18 Mutationen (tot, fehlt, Draft mit Redirect, unveröffentlichte Kollektion, Seite/Blogartikel weg, 6 Schreibweisen, Fremdlink zählt nicht) + live 4 (echtes Entwurfsprodukt = tot, echtes aktives = ok, erfundener Handle = fehlt, echte Weiterleitung wird erkannt). Fällt einer durch → `RATGEBER-LINKS: unklar (…)`, nie «0».
* **Testkopie:** Die neue Logik auf dem Vorher-Stand (346 Artikel aus der Messung 21:23, echte Admin-Abfragen) findet **16 tot + 22 umgeleitet** — exakt die curl-Mengen (Differenz leer). Auf dem Nachher-Stand: 0/0.
* **Unbekannter Schalter startet keinen Lauf:** `argparse` — `--bogus` → Exit 2; einziger Schalter `--selbsttest`.
* Aufseher (`automation/fixer_keepalive.sh`, ersetzt per Datei-Austausch statt In-Place, da drei Aufseher liefen; `bash -n` ok): zeigt die Zeile, ⚠️ bei tot > 0 oder umgeleitet > 0 (mit Befehl), ⚠️ wenn der Kanarienvogel nicht «ok» ist, «noch nicht im neuen Format» bis zum ersten Lauf. Gegen fünf Testlogs geprüft (sauber / 16+22 / altes Format / unklar / Kanarienvogel unklar). Erster Lauf im echten Log: 19.10. 21:52 UTC.

## 6. Neue Dateien / Änderungen
`automation/ratgeber_links_reparieren.py` (neu), `dropship/_ratgeber_links_ersatz_2026-10-19.tsv`, `dropship/_ratgeber_links_vorher_2026-10-19.json`, `dropship/_ratgeber_links_ledger.tsv`,
`automation/blog_linkziele_wache.py` (erweitert), `automation/fixer_keepalive.sh` (Block RATGEBER-LINKS), dieser Bericht.

**Betrieb künftig:** Aufseher meldet ⚠️ → `python3 automation/ratgeber_links_reparieren.py --vorschlag > liste.tsv` (301 → Endziel vorbefüllt, tote Produkte mit Kollektions-Kandidat der Wache) → Zeilen prüfen (Zwilling oder Kollektion, Aussagen im Text prüfen) → trocken → `--scharf`.

## 7. Text-Reste (Freigabe war «nur href» — sichtbarer Text blieb stehen)
Die Reparatur ändert Ziele, nicht Texte. Folgen, die du entscheiden kannst (Textänderung = eigene Freigabe):
1. **Kollektions-Ersatz (Namen/Preise des toten Produkts stehen weiter im Text):** 11 Artikel empfehlen weiter die eingestellte «Slim Wallet Echtleder (CHF 49.90, Vollnarbenleder, 7 Farben)»; dazu Zelt (CHF 83.90), Kratzbaum 40 cm (CHF 64.90), Yoga-Matte mit Grip (CHF 80.90), Skelett lebensgross (CHF 128.00), Pool-Zubehör (3 Listenpunkte), 2er-Set Organizer (CHF 22.90), Sojawachskerze (CHF 16.90), Trockenblumen-Kerze (CHF 14.90), Reed-Diffuser (CHF 23.90), 30'000-mAh-Karte. Empfehlung: Texte kürzen/neutral formulieren («Wallets & Portemonnaies ansehen») — redaktionelle Runde.
2. **Zwilling mit anderem Preis, den `blog_preise_aktualisieren.py` NICHT nachzieht** (es greift nur «(CHF x)» in Klammern und Preisfelder in Karten): Resistance Bands «CHF 24.90» (live 14.90; 2 Artikel), Kaffeemaschine «CHF 34.90» (live 36.90). Trockenlauf des Preisjobs zeigt, was er täglich selbst korrigiert: 3 Preise in 2 Artikeln (MagSafe 27.90→28.90 ×2, PD20W-Karte 31.90→28.90).
3. **Zwilling mit nicht bestätigten Details:** «mit 20 W» (MagSafe-Powerbank), «LED-Ladestandsanzeige/Doppelklick» (Solar-Powerbank).
4. Ältere Fundstelle: `/collections/trainingsanzuege-sets` / `kuechengeraete` zeigen jetzt auf breite Kollektionen (siehe 2a).

## 8. Nachmessen
* `python3 automation/blog_linkziele_wache.py --selbsttest` und der Aufseher-Lauf (täglich) — Soll: `RATGEBER-LINKS: 0 tot · 0 umgeleitet`.
* Fortlaufend: jeder neue Draft (`cj-nicht-versendbar-ch`, `ausverkauft-lieferant`) kann neue Altlinks erzeugen (16 von 38 Fällen kamen so zustande) — die Ampel meldet es spätestens nach 24 h.
* Wirkung auf Sichtbarkeit: **nicht belegt**, GSC-Vergleich in 4–8 Wochen.
