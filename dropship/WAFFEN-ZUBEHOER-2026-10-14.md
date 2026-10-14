# Schusswaffen-Zubehör — Lücke im Waffen-Schutz (14.10.2026)

Auftrag aus Runde 12:26 (Prüfer, `ergebnis.json → wahl.weitere`): «AK74 Zielfernrohrbrücke» und «Glock-Holster» stehen auf
Pinterest, FB/IG und TikTok; «Zielfernrohr-Halterungszubehör» steht ohne `waffe-pruefen` im Google-Kanal.
Nichts im Shop geschrieben (nur gelesen). Nichts gedraftet.

## 1. Messung (nur lesen)

| Was | Zahl | Befehl / Beleg |
|---|---|---|
| Aktive Produkte, ganz gelesen (Titel, Typ, Tags, Beschreibung, Kanäle G/T/F/P, Hauptbild) | **54'523** | `productsCount(status:active)` = 54'523; Paging 273 Seiten à 200 (scratchpad `waffen/pager.py`) |
| Grobe Vorauswahl (breites Muster inkl. Text: taktisch, Pistole, Jagd, Militär, Magazin, Holster …) | 1'170 | `waffen_treffer.jsonl` |
| Davon Schusswaffen-Zubehör nach der neuen Regel | **10** | `python3 automation/ueberwachung_waffen_guard.py` mit `DRY=1` (Abschnitt 3) bzw. Prototyp |
| … von Hand am Hauptbild bestätigt | **10 / 10** | Kontaktbögen (PIL), 428 Bilder angesehen |
| … ohne `waffe-pruefen` | **7** | |
| … ohne `waffe-pruefen` UND im Google-Kanal | **6** | |
| … auf TikTok + Facebook/Instagram + Pinterest | **10 / 10** | `publishedOnPublication` je Kanal |
| Aktive Produkte mit `waffe-pruefen` insgesamt | 5 (davon 4 auf T/F/P, 0 bei Google) | Voll-Export |

Die 10 Treffer (Bild jeweils angesehen):

| ID | Kanäle | Tag | Titel | Was das Bild zeigt |
|---|---|---|---|---|
| 16609737867655 | G T F P | – | Zielfernrohr-Halterungszubehör | Zielfernrohr-Montagen (Cantilever + Rotpunkt-Erhöhungen) |
| 16617703014791 | T F P | ja | AK74 Zielfernrohrbrücke aus Metall | AK-Seitenschienen-Montage |
| 16612324344199 | T F P | ja | Glock-Holster mit Infrarot-Ziel | **rotes Laser-Zielgerät** mit Schienenklemme — kein Holster |
| 15477425176961 | T F P | ja | Nylon Gewehrriemen, 2-Punkt | Gewehrriemen |
| 15480340185473 | G T F P | – | Taktisches Outdoor-Stativ, faltbar, V8 | **Gewehr-Zweibein** (Bipod, Schienenaufnahme) |
| 15449030984065 | T F P | – | Taktisches Outdoor-Stativ, faltbar & ausziehbar | **Gewehr-Zweibein**; Google hat es selbst gemeldet (Tags `google-policy-flag`, `google-policy-waffen`) |
| 15453953032577 | G T F P | – | Taktische Brusttasche | **Schulterholster** mit Pistolen- und Magazintasche |
| 15490615542145 | G T F P | – | Outdoor Tactical Bauchtasche mit Holster | Bauchtasche mit verstecktem Holster (Bild: Soldat mit Gewehr) |
| 16612764352903 | G T F P | – | Multifunktionale taktische Aufbewahrungstasche | taktische Hüfttasche; Text «Platz für eine Pistole und vier Magazine» |
| 15493778735489 | G T F P | – | Taktischer Modularer Schnellverschluss-Adapter | Holster-Montagesatz (Adapterplatten, Beinriemen, Schrauben) |

Kanarien, die das Muster treffen würde, aber KEIN Waffenzubehör sind (alle als Kanarie in der Regel): Handy-/Taschenlampen-/
Erste-Hilfe-/Werkzeug-Holster, Kostüm-Holster (Fortura «Holster schwarz für rechtes», Typ Kostüme), «Rotpunkt» im Kleid,
«Socken/Nägel im Magazin-Stil», «Golfball-Magazin», «Korn-Grid»-Sesselbezug, Teleskop/Mikroskop/«Scope», TV-/Kamera-/Handy-Mount,
taktische Rucksäcke/Westen/Uhren/Hundehalsbänder (Text «Schiesssport» in 15 davon), Airsoft-/Paintball-Masken und -Brillen,
Gaming-Pistolen, Wasch-/Sprüh-/Kleb-/Massagepistolen, «Gun Gray» als Farbe, «Kaliber» bei Tassen und Uhrwerken,
Pneumatik-/Auspuff-Schalldämpfer, Revolver-Lochzange, Zweibeiner-Hundejacke, Spielzeug-Figuren mit Pistole/Gewehr.

## 2. Regel

`google_sperrliste.ist_schusswaffen_zubehoer(titel, typ, tags, text, en="")` → Grund (wahr) oder `""`.
Daten + 93 Kanarien EINMAL in `automation/data/schusswaffen_zubehoer_regel.json`; JS-Zwilling `automation/schusswaffen_zubehoer.mjs`.

Ablauf: (1) `nicht_hart` am Titel/Typ (Kostüm, Spielzeug, Druckware, Werkzeug-/Wasch-/Gaming-Pistole, Haustier, Auspuff …) → nie.
(2) `stark` in Titel/Typ/Tags (Zielfernrohr, Picatinny, Weaver-Schiene, AK-47/74, AR-15, Glock, Laser-/Rotpunkt-/Reflexvisier,
Boresight, Mündungsbremse, Gewehrriemen …, Munition, Magazintasche, Zweibein/Bipod, Softair-Kugeln, «taktisches Stativ»
= Zweibein) → ja. (3) `stark` nur im englischen CJ-Namen → ja, ausser `nicht_weich` am Titel. (4) mehrdeutiges Titelwort
(Holster, Magazin, taktisch, Laser, Montage, Halterung, Schiene, Scope, Mount, Riemen, Schalldämpfer, Airsoft …) + Waffen-
Kontext (Pistole/Revolver/Gewehr/Glock/Kaliber .xx/Picatinny/«verstecktes Holster»/«Platz für eine Pistole») und kein
`nicht_weich` (Handy, Taschenlampe, Erste Hilfe, Werkzeug, Brille, Maske, Weste, Rucksack, Uhr …) → ja.
**Der Beschreibungstext entscheidet nie allein**, er liefert nur den Kontext für ein mehrdeutiges Titelwort.
Wortgrenzen sind ausgeschrieben (kein `\b`, `\w`, `\d`): JS ist dort ASCII, Python Unicode — sonst entschieden Importer und
Wächter verschieden.

Prüfung:
- Kanarien 93/93 (`python3 automation/ueberwachung_waffen_guard.py --selbsttest` → «93/93 · heikel()-Stichprobe ok»).
  Gegenprobe: eine falsche Kanarie eingeschleust → `selbsttest()` = False, `zubehoer_lauf` schreibt nichts.
- Gleichlauf py=js: `node automation/schusswaffen_zubehoer_gleichlauf_test.mjs` → 0 Abweichungen über 93 Kanarien;
  mit `EXPORT=…waffen_treffer.jsonl` 0 über 1'263 Proben (mit Text), mit `EXPORT=…waffen_alle.jsonl` 0 über 54'616 Proben.
- Bestehende Kanarien unverändert grün: Kostüm 88/88, Feuerzeug 16/16, Heil-Schmuck 38/38; `gesperrte_ids()` = 17.

Konsequenz: Tag **`waffe-pruefen`** (bestehend). Wer liest ihn (gemessen, `grep -rn waffe-pruefen automation`):

| Leser | Wirkung | vorher | jetzt |
|---|---|---|---|
| `google_sperrliste.AUSSCHLUSS_TAGS` → `google_sperrtags_durchsetzen` | raus aus Google | ja | ja |
| `google_sperrtags_durchsetzen.ALLE_WERBEKANAELE` | raus aus TikTok, FB/IG, Pinterest | **nein** (die Lücke) | **ja** (eine Zeile, 14.10.) |
| `bild_reel_auswahl.py`, `metricool_pinterest_pin.mjs`, `cj_video_reel_engine.mjs` | Poster überspringen | ja | ja |
| `tiktok_karussell.py` (Sets auch für das IG-Karussell) | überspringt | **nein** | ja (eine Zeile) |
| `queue_new_products.mjs` (Bild-Post-Nachschub IG/FB) | überspringt | **nein** — prüfte nur `social-pause-*` | ja für `waffe-pruefen`/`waffengesetz-verboten`/`verdeckte-ueberwachung` (eine Zeile) |
| `social_queue_wache.py` (fremde Redaktions-Queue) | pausiert mit FIX=1 | **nein** | ja (eine Zeile) |
| `cj_versand_ch_revive.py`, `bestseller_auffuellen.py`, `querbeet_kuratieren.py` | kein Rückholen / keine Bestseller-/Querbeet-Reihe | ja | ja |

`DRY=1 python3 automation/google_sperrtags_durchsetzen.py` (nur lesen) mit der neuen Zeile: «4 mit Alle-Kanäle-Tag nur noch in
Werbekanälen» — Gewehrriemen, Schutzweste für Training, Glock-Holster, AK74-Montage. ⚠️ **Diese Zeile wirkt ohne Commit**:
der Aufseher spiegelt `automation/*.py` nach /tmp und startet den Durchsetzer im Reiniger-Ring (Abkühlzeit 4 h) scharf.

**Wie die Ware überhaupt in die Social-Kanäle kam (belegt):** `dropship/_nachpubliziert.txt` Zeilen 327 (Glock-Holster) und 366
(AK74). `cj_category_fill.mjs` publiziert einen heikel-Treffer in GAR KEINEN Kanal, also auch nicht im Onlineshop → die Seite ist
404 → `unpublizierte_finden.py` «repariert» das und publiziert in Onlineshop + Shop + TikTok + FB/IG + Pinterest, ohne Sperr-Tags
zu lesen. Mit der ALLE_WERBEKANAELE-Zeile nimmt der Durchsetzer sie wieder heraus; `unpublizierte_finden` fasst dank seines
Ledgers dasselbe Produkt nicht zweimal an. **Offen (nicht eine Zeile, nicht umgebaut):** `unpublizierte_finden.py` sollte Ware
mit Alle-Kanäle-Tag nur in Onlineshop + Shop publizieren, und der heikel-Zweig in `cj_category_fill.mjs` sollte selbst in
Onlineshop + Shop publizieren statt eine 404-Seite zu hinterlassen.

## 3. Wächter + Importer

- `automation/ueberwachung_waffen_guard.py`: zweiter Teil `zubehoer_lauf()`. Live-Abfrage holt jetzt auch Typ + Tags.
  Meldet jeden Treffer mit Kanälen; **schreibt nur mit `SCHARF=1`** (und nicht `DRY=1`): `tagsAdd waffe-pruefen` in Alias-Bündeln
  à 20, Ledger-Zeile `…\twaffe\tschusswaffen-zubehoer\ttag:waffe-pruefen\t<Titel>\t<Grund>` in `dropship/_ueberwachung_waffen.txt`,
  fragt `werbetest_sperre.gesperrt()` (⚠️ die Sperrdatei verbietet ausdrücklich auch TAGS — «Tags sind erlaubt» stimmt dort nicht;
  keiner der 13 Werbetest-Artikel ist ein Treffer), Kanarien-Tor (rot → nichts geschrieben), `eimer_etikette.nachlauf` im gql.
  Draftet nie. `--selbsttest` ohne Netz. Der bisherige heikel-Teil ist unverändert (läuft weiter ohne SCHARF scharf).
- `cj_category_fill.mjs` (CJ-Runner): `heikelZweck(...) || schusswaffenHeikel(title, g.html, productNameEn)` → gleiche Folge wie
  heikel «waffe»: Tag `waffe-pruefen`, kein Kanal. `node --check` ok.
- `cj_sku_import.mjs` (Queue-Runner) prüfte bis heute weder heikel_zweck noch Schusswaffen: jetzt Tag `waffe-pruefen`, kein
  trend/viral/video-hit, Publikation nur Onlineshop + Shop; `--selbsttest` enthält die Kanarien («SCHUSSWAFFEN-SELBSTTEST: grün»,
  Exit 0; rot hält die Queue zu).
- Nicht geändert: `cj_trending_import.mjs` (in keiner Startliste), Fortura-/BigBuy-Importer (nicht geprüft, ob deren Feeds
  Schusswaffen-Zubehör führen).

## 4. Falsch benannte Waffenteile — Kandidaten für einen Draft durch die Hauptsitzung (NICHT gedraftet)

Bild = Waffenteil, Titel = etwas anderes. Vorschlag Tag wie am Morgen: `fehlklasse-waffenteil`.

| Vorrang | ID | Kanäle | Titel | Bild | Fängt die Regel es? |
|---|---|---|---|---|---|
| 1 | 16612324344199 | T F P | Glock-Holster mit Infrarot-Ziel | Laser-Zielgerät mit Schienenklemme — gleiche Klasse wie die am 06.10. gedraftete ohhunt-Boresight (`BILDGEPRUEFT`, «schusswaffen-laser» → DRAFT) | ja (Glock), aber nur als waffe-pruefen |
| 1 | 16608485638535 | G T F P | Infrarot-Kalibrator | Box «Laser bore sighter» + Kaliber-Adapter = Laser-Einschiessgerät (dieselbe Ware wie ohhunt); Text erfindet «Haushalt und Industrie» | **nein** (kein Waffenwort; nur mit EN-Namen beim Import) |
| 2 | 15480340185473 | G T F P | Taktisches Outdoor-Stativ, faltbar, V8 | Gewehr-Zweibein | ja |
| 2 | 15449030984065 | T F P | Taktisches Outdoor-Stativ, faltbar & ausziehbar | Gewehr-Zweibein (Google-Meldung «waffen») | ja |
| 2 | 15453953032577 | G T F P | Taktische Brusttasche | Schulterholster mit Pistolentasche | ja |
| 2 | 16606107337095 | G T F P | Aluminium-Schienenhalter 25,4 mm | 1-Zoll-Ring auf Schienenklemme (Lampen-/Zielfernrohr-Montage); Text erfindet «Ferngläser an Fahrzeugen» | **nein** |
| 3 | 15462220595585 | G T F P | Kettenpistole (Typ Aufbewahrung & Organizer) | Kettenwaffe mit Speerspitze (Seilpfeil) — keine Schusswaffe, Klingen-/Waffenklasse | nein (nicht diese Regel) |

Grenzfälle, bewusst NICHT in der Regel (Entscheid Hauptsitzung/Betreiber): «Schiessdecke Training 200x75 cm» 16617638789511
(Schiessmatte), «Multifunktionaler Brustgurt mit Zubehörtasche» 15510791389569 (Chest-Rig mit Gewehrmagazin-Taschen),
«Taktische Schutzweste JPC» 15506273108353 (Plattenträger), «8-förmige Rohrschelle» 16609856192903 (Offset-Klemme für
Laser/Lampe), «ANPVS-31 Nachtsichtgerät Modell» 15505019601281 (Attrappe), «Magnetisches Schnellverschluss Holster für Herren»
15449070731649 (Umhängetasche mit Klett-Innenwand, kein Waffenbezug sichtbar).

Nebenbefund Klingen (#1017-Klasse, nicht Schusswaffe, nicht dieser Auftrag), alle G T F P, Bild angesehen:
16617696887175 «Klappzange aus Edelstahl» = Klappmesser; 16608567853447 «Rostfreie Zange mit flacher Backe» = Multitool mit
Wellenschliff-Klinge; 16608490619271 «Smaragd-Pfeil Spielpfeil» = Jagdspitzen (Broadheads). Dazu Nebenbefund Nachbildung:
«Baustein-Spielzeugpistole mit Schussfunktion» 15493856559489 — `waffennachbildung-bausatz` verlangt `\bPistole\b`, «Spielzeugpistole»
fällt durch.

## 5. Aufseher

Schon eingeplant: `automation/fixer_keepalive.sh:3374` startet den Wächter täglich (Neuimporte 3 Tage, jede Woche der ganze
Bestand). Damit der neue Teil schreibt, dort `SCHARF=1` ergänzen:
`SEIT=$UW_SEIT EXPORT=/nonexistent SCHARF=1 python3 automation/ueberwachung_waffen_guard.py`
Erster scharfer Lauf von Hand (Hauptsitzung): `SEIT=2020-01-01 EXPORT=/nonexistent SCHARF=1 python3 automation/ueberwachung_waffen_guard.py`
→ erwartet 7 × `tagsAdd waffe-pruefen`; danach nimmt `google_sperrtags_durchsetzen` die 10 aus Google/TikTok/FB-IG/Pinterest.
