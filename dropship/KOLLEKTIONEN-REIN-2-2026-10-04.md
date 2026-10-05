# Undichte Kollektionen, Runde 2 — 04.10.2026 (23:10–00:30 UTC)

Betreiber 22:17 UTC: «fix 12 h lang alles». Bereich `kollektionen-rein-2`: die Menü-Kollektionen ohne Preis-/Geschenk-Logik,
die laut Produkttyp-Filter-Messung (`/tmp/menue_filter.json`, 153 Menü-Kollektionen) am meisten Fremdware zeigten.

## Vorher (gemessen 23:15 UTC)

Befehl (je Kollektion): `collectionByIdentifier(handle){ruleSet, products}` + `productsCount(query:"collection_id:… status:active")`,
Typverteilung lokal aus dem Voll-Abzug der Mitglieder (`scratchpad/<handle>.json`).

| Kollektion | Handle | aktiv | Regel (alt) | Fremdware gemessen |
|---|---|---:|---|---|
| Kinder & Baby | `sub-baby-kids` | 3'716 | ODER: Tag baby-kids/kinder/spielzeug, Titel Baby/Kinder/Spielzeug | 39 Typen; **291× Haustierbedarf** (Katzen-/Hundespielzeug über Titel «Spielzeug»), 34 Pet-Plüsch als «Spielzeug & Spiele», «Baby Pink Kunstnägel», «Smartwatch für Kinder» ok |
| Haustierwelt | `sub-haustier` | 3'254 | ODER: Tag haustier/pet, Typ Haustierbedarf | Kinderkostüm Katze/Hund (5), Denim-Shorts mit Welpen-Design, BRUDER CAT (Bagger), bworld-Figuren, Katzenpfoten-Anhänger, Sonnenbrille |
| Hunde | `haustier-hunde` | 419 | Tag sub-hund | kaum Fremde (3) — aber **~1'270 Hundeartikel fehlten** (Tag nie nachgezogen) |
| Katzen | `haustier-katzen` | 215 | Tag sub-katze | 3 Kostüme + 3 Plüsch-Overalls, Handy-Schutzhülle, Anhänger; ~530 Katzenartikel fehlten |
| Handy-Zubehör | `handy-zubehoer` | 621 | ODER: 7 Titelwörter (handyhülle … wireless charger) | 81 Fremde, fast alle der Form «X **mit** Handyhalter/Powerbank/Ladekabel»: Yogamatte, Bauchmuskelrad, Nagellampe, Tattoo-Pen, LED-Weste, Xbox-Kühlstation; dazu Akku-/E-Scooter-/Smartwatch-Lader |
| Ladegeräte & Powerbanks | `elektronik-laden` | 697 | ODER: 5 Titelwörter | 84 Fremde: PS5-/Controller-Ladestationen (22), Li-Ion-Akkulader, «Salz- und Pfeffermühle mit Ladestation», «Lederarmband mit USB-C-Ladekabel», Katzenball |
| Aroma & Diffuser | `sub-aroma-diffuser` | 284 | ODER: Titel Diffuser/Aroma/Luftbefeuchter | Seifen-/Kerzenform, Cologne, Massageöl, «240W Datenkabel mit Aromatherapie», Terrarien-Befeuchter, Aromakerze, Uhrenarmband; Typen falsch (154× Beauty-Tools) |
| Büro & Home Office | `buro-home-office` | 80 | ODER: Tag buero/notizbuch/laptop-sleeve/wireless-charger | Büro-Kleider/-Rock/-Bluse (5), Autokissen «für Auto und Büro», Lunchbox, Heizschal; nur 42 echte Bürotypen |

Bewusst NICHT angefasst: «Sets & Bundles» (48 Typen — Sets sind per Definition quer durch alle Warenarten), «Lifestyle & Trends»
`trends-gadgets` (Tag `trend`, Kuratierung), «Premium ab CHF 80» und alle Geschenk-/Preisseiten (gewollt gemischt),
«Vasen & Deko» und «Kissen & Wohntextilien» (schon in `kategorie_rein.py`, Lauf 23:17 UTC: 193 bzw. 1'598, 0 raus).

## Regel (neu) — `automation/kategorie_rein_2.py`

Schwester von `kategorie_rein.py` (dessen Datei lief gerade und blieb unberührt). Drei Stufen statt Titel ∧ Typ, weil hier der
TYP allein Mitglied macht (Kinderschuhe gehören zu Kinder & Baby, auch ohne «Kinder» im Titel):

    gehört ⇔ (Typ ∈ KERN ∨ [Tag spielzeug ∧ Typ Spass-Elektronik] ∨ Titel trifft ECHT) ∧ kein BAN ∧ Typ ∉ FREMD
    KERN-Typen und «vertraute» Typen (Haustierbedarf bei Hunde/Katzen) zählen ohne BAN (ausser kern_ban: Pet-Plüsch bei Kindern)
    haupt=True (Handy, Ladegeräte, Aroma): ECHT nur im Titel-HAUPTTEIL vor «mit/inkl./plus/+»
    → «Yogamatte mit Handyhalter» ist eine Yogamatte. «und»/«&» trennen NICHT («Solar- und Kurbel-Powerbank» ist eine Powerbank).
    Editor/POD (Titel «Selbst gestalten», Tag printful_*) wird nie getaggt oder enttaggt.

Dann eigener Tag `kat-…`, die Kollektion zeigt nur noch diesen Tag. Schutz: > 40 % Schrumpfen → nicht umgestellt; > 4'800 aktive
(Filtergrenze 5'000, `filtergrenze_wache.py`) → nicht umgestellt. Eimer-Etikette: eigener `gql()` liest `throttleStatus`
(`eimer_etikette.nachlauf`), 10 Mutationen je Anfrage, wartet bei THROTTLED.

## Trockenlauf (gelesen, 4 Runden Kanarienvögel)

Offline gegen den Voll-Abzug (`scratchpad/offline.py`), dann einmal über die API. Gefunden und behoben, bevor etwas geschrieben wurde:

- `\bjunge[ns]?\b` traf «für **junge** Männer», «**Junges**, lässiges T-Shirt» → Adjektiv-Formen gebannt; «Mädchenherz-Bett» (Erwachsenen-Stil) raus.
- Hauptteil-Split an «mit» tötete Haustier-Titel («Plüschtier **mit** Sound für Hunde», «Halsband Schwarz **mit** Nieten für kleine Hunde») → Split nur für Handy/Laden/Aroma.
- `\bhund` verpasste Komposita (Zweihundeleine, Lederhundeleine, Arbeitshunde) → `hund(?!ert)`.
- `\bkabel` traf «**Kabel**loser Luftbefeuchter» → `\bkabel\b`; `kerze` traf «Kerzenlicht-Aromadiffuser» → `kerzen?\b`.
- «lüfter» bannte «50W Multi-Port Ladegerät mit Lüfter» (echter Lader) → raus aus dem Ban; «weste» bannte «Powerbank für Heizwesten» → nur LED-/Warn-/beheizbare Weste.
- `\bpets?\b` traf «Medikamenten-Organizer aus **PET**»; `katzenauge` traf «Hundehalsband mit Katzenaugenstein» → nur Brille/Nagel.
- «Universal Diffusor für **Locken**» (Haartrockner) wäre in Aroma gelandet; «Riesenrad Aroma Diffuser mit Wireless Charger» bleibt bei Aroma, nicht bei Ladegeräten.
- Bare «laptop» hätte ~170 Laptop-Rucksäcke in Büro gespült → nur Laptop-Sleeve/-Ständer/-Tasche/-Unterlage.
- bworld/BRUDER CAT sind Kinderspielzeug (Bruder-Figuren), nicht Haustier → in Kinder behalten, aus Haustier raus.
- «Bausatz», «Holzmodell», «3D Holzpuzzle», RC-Hubschrauber (Typ Spass-Elektronik, Tag spielzeug) hätten Kinder & Baby verlassen (433) → Tag spielzeug ∧ Typ zählt als Spielzeug (alte Kuratierung bleibt).

Trockenlauf über die API (23:40 UTC), Zahlen vor dem Schreiben:

| Kollektion | jetzt | gehört | raus | neu |
|---|---:|---:|---:|---:|
| sub-baby-kids | 3'715 | 3'451 | 350 | 86 |
| sub-haustier | 3'254 | 3'308 | 25 | 79 |
| haustier-hunde | 419 | 1'691 | 2 | 1'274 |
| haustier-katzen | 215 | 741 | 8 | 534 |
| handy-zubehoer | 621 | 648 | 116 | 143 |
| elektronik-laden | 697 | 587 | 131 | 21 |
| sub-aroma-diffuser | 284 | 283 | 21 | 20 |
| buro-home-office | 80 | ~120 | 29 | ~69 (nach Laptop-Korrektur; API-Lauf zeigte 295 mit Rucksäcken) |

## Scharf (SCHARF=1, 23:51–00:25 UTC) — Nachher

Erster Versuch einzeln (10 Mutationen je Anfrage): **210 Tags in 5 min**, Eimer gemessen 351/2000 bei restoreRate 100 —
vier andere Schreiber liefen (cj_perpetual, cj_versand_ch_sichtbar, parallele Agenten). 11'000 Tags hätten ~4 h gebraucht,
der Lauf wäre im Timeout gestorben. Abgebrochen, Bulk-Weg aus `preis_senken.py` eingebaut (stagedUpload JSONL →
`bulkOperationRunMutation tagsAdd`): Büro 133 Tags in 27 s, Haustier 3'306 in 289 s, 0 Fehler überall.

Nachmessung `--nachmessen` (00:27 UTC; Regel live gelesen, `productsCount(collection_id … status:active)` = `productsCount(tag:kat-…)`):

| Kollektion | vorher aktiv | nachher aktiv | raus | neu | Typen vorher → nachher | Regel |
|---|---:|---:|---:|---:|---|---|
| Kinder & Baby | 3'716 | **3'450** | 350 | 85 | 39 → 37 (Haustierbedarf 291 → 0; Rest sind Kinder-Artikel mit anderem Typ) | TAG kat-kinder-baby ✅ |
| Haustierwelt | 3'254 | **3'306** | 25 | 77 | 10 → 13 (Kostüme 5 → 0, Damenmode 3 → 0, Schmuck 1 → 0) | TAG kat-haustier ✅ |
| Hunde | 419 | **1'689** | 2 | 1'272 | 5 → 11 (Haustierbedarf 1'634) | TAG kat-hunde ✅ |
| Katzen | 215 | **740** | 8 | 533 | 7 → 8 (Kostüme 3 → 0, Schmuck 1 → 0) | TAG kat-katzen ✅ |
| Handy-Zubehör | 621 | **650** | 115 | 144 | 19 → 11 (Nageldesign/Gaming-Controller/Sport raus) | TAG kat-handy ✅ |
| Ladegeräte & Powerbanks | 697 | **585** | 131 | 19 | 14 → 5 | TAG kat-laden ✅ |
| Aroma & Diffuser | 284 | **281** | 22 | 19 | 20 → 16 (Werkzeug/Partydeko/Uhren raus; Beauty-Tools 152 bleibt, siehe unten) | TAG kat-aroma ✅ |
| Büro & Home Office | 80 | **133** | 29 | 82 | 13 → 13 (Damenmode 5 → 0, Auto-Zubehör 4 → 0) | TAG kat-buero ✅ |

`filtergrenze_wache.py` 00:28 UTC: «FILTERGRENZE: ok (alle Menü-Kollektionen < 4800 aktiv)». Tag-Ledger: 10'824 Zeilen (alle tagsAdd,
Status bulk:COMPLETED; tagsRemove gab es noch keines, weil die Tags neu sind — ab morgen entfernt der Tageslauf `kat-…` von Ware,
die nicht mehr passt). «Kinder & Baby» steht im Vorher-Ledger zweimal (3'715 + 3'715: abgebrochener Einzel-Lauf + Bulk-Lauf) — harmlos.

Ledger: `dropship/_kategorie_rein_2_vorher.tsv` (alle Mitglieder vor der Umstellung: handle, id, Typ, Titel),
`dropship/_kategorie_rein_2_tags.tsv` (jede Tag-Änderung: Zeit, handle, tagsAdd/tagsRemove, Tag, id),
`dropship/_kategorie_rein_regeln_alt.json` (alte Regelsätze, gemeinsam mit kategorie_rein.py), Summen in `dropship/_kategorie_rein.tsv`.
Rückweg: alte Regel aus der JSON per `collectionUpdate` zurücksetzen — Tags stören dann nicht.

## Bewusst nicht gemacht

- Produkttyp der 154 Aroma-Diffuser (Beauty-Tools → Aroma-Diffuser) NICHT geändert: `produkttyp_vereinheitlichen.py` hat die
  Sperre gegen TYPE-Regeln (17 Smart-Kollektionen hängen an Typen); eine Typ-Änderung gehört dort hinein, nicht in einen Kollektions-Lauf.
- Keine Produkte gedraftet, keine Titel geändert. Nur Tags `kat-…` und die acht Regelsätze.
- «Hunde»/«Katzen» wachsen stark (419 → ~1'690, 215 → ~740): das ist Füllung, nicht Leck — die Tags `sub-hund`/`sub-katze`
  wurden seit Monaten nicht nachgezogen; `grep` findet kein Skript, das sie setzt.

## Betreiber

Nichts nötig. Optional: in Search & Discovery die Filter der acht Kollektionen ansehen — die Produkttyp-Facette zeigt jetzt
weniger Fremdtypen.
