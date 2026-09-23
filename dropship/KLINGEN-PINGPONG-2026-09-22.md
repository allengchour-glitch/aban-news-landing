# Klingen-Ping-Pong geschlossen — 22./23.09.2026

Gemessen und behoben am 2026-09-23 00:06 UTC (Sub-Agent «klingen», Branch `claude/luxestyle-status-tztnn1`). Keine Kundendaten, keine Geheimnisse.

## 1. Der Befund (gemessen, nicht geglaubt)

| Frage | Befehl / Quelle | Zahl |
|---|---|---|
| Handles im Quittungs-Ledger `dropship/_klinge_verboten_ch_0916.txt` | `cut -f1 … \| sort -u` | **207** eindeutig (244 Zeilen; 136 «Hausregel», 95 «keine CH-Versandoption», 12 «Klasse #1017», 1 «#1017 zurueckgeschickt») |
| Davon live DRAFT | productByHandle ×207 (22.09.) | **207/207** |
| Davon **nackt** (nur die zwei Sperr-Tags) | Live-Tags ⊆ {cj-nicht-versendbar-ch, handklinge-kein-ch-versand} | **104** (der Befund der Gegenpruefung sagte 37 — Teilzaehlung) |
| «wiederbelebt»-Zeilen im Revive-Ledger `_cj_versand_ch_revive.txt` | `grep -c wiederbelebt` | **314**, davon rund 300 Klingen (04.–16.09.) — das Ausmass VOR der Wache |
| Die fuenf vom 16.09. | Revive-Ledger, Block nach der Wache-Quittung | kochmesser-damaststahl-olivenholz-609400, damast-kochmesser-set-602200, damast-kuchenmesser-set-619600, **fuda-taschenmesser-aus-damaststahl-634100** (#1017!), klingen-set-mit-metallgriff-604200 |
| Der Katana vom 21.09. | `product.events` | «Japanischer Samurai mit Katana-Schwert, 30 cm», SKU CJ-CJYZ1501889 — draft→active **21.09. 22:10:40Z** (autopilot2 = Revive), erneut DRAFT 22.09. 21:14Z |
| Verursacher Fuda | `product.events` | draft→active **16.09. 11:13:26Z** (autopilot2 = Revive), DRAFT 17.09. 08:17Z |
| `ist_handklinge` ueber alle 207 Ledger-Titel | klingenregel.py | **206 True**, 1 False: «Baeren-Messer-Set mit Schneidebrett, 5-teilig» (Kontext-Ausnahme `schneidebrett`) |
| Retraktionsmesser im Revive erreichbar? | Pruef-Ledger hat vid, Revive-Ledger hat sie nicht | ja, beide (alu-retraktionsmesser-…-244098, aluminium-einziehmesser-…-108289) |
| Rueckholpfad in `cj_verfuegbarkeit.py` | `grep '"ACTIVE"'` + `git log -S` | **es gab keinen** — der 68er vom 21.09. (Commit 131a6ca65) aenderte nur das Ledger, der Lauf war von Hand |
| Baseline vor der Arbeit | `productsCount(query:"status:active tag:handklinge-kein-ch-versand")` | 0 (EXACT); `…tag:cj-nicht-versendbar-ch` 0 (EXACT); draft 104 / 983 |

Alle Reaktivierungen liefen ueber DIESELBE Custom-App («autopilot2»): `appTitle` allein unterscheidet die Skripte nicht, der Zeitstempel tut es (Revive-Log).

## 2. Ursachen und Fixes

| # | Ursache | Datei | Fix |
|---|---|---|---|
| a | Wache las nur `status:active` → gedraftete Klingen ohne Sperr-Tag blieben fuer jeden Rueckholer «ohne Risiko-Tag» reaktivierbar | `automation/klinge_ch_wache.py` | Voll-Export `status:active OR status:draft` mit `tags`; `klingen_sortieren()` trennt aktive Klingen (→ DRAFT) und Drafts ohne Sperr-Tag (→ nur `tagsAdd`) |
| b | Wache setzte Tags per `productUpdate(input:{tags})` = ERSETZT alle Tags → 104 nackte Produkte | `klinge_ch_wache.py` | `productUpdate` nur noch fuer den Status, Tags nur `tagsAdd`; danach RUECKLESEN (status + tags) statt Antwort glauben |
| c | Niemand sah, WER reaktiviert | `klinge_ch_wache.py` | `verursacher(pid)` aus `product.events` (juengstes «draft to active») im Bericht und in der Quittungszeile |
| d | Revive: RISIKO kannte `handklinge-kein-ch-versand` nicht; `ist_handklinge` kam nicht vor; «freightCalculate ok» galt als Beweis | `automation/cj_versand_ch_revive.py` | Sperr-Tag im RISIKO-Set; `klingen_tor()` bei der Kandidatensammlung (kein CJ-Punkt fuer Klingen) UND unmittelbar vor der ACTIVE-Mutation; Zaehler «Klingen-Tor N» in der Schlusszeile |
| e | 68er-Rueckholer war ein Einmal-Lauf ohne Tor | `automation/cj_verfuegbarkeit.py` | neuer Pfad `RUECKHOL=<ids.txt>` (DRY=1) mit `klingen_tor()` vor ACTIVE, Ruecklesen, Ledgerzeile `zurueckgeholt-<datum>` wie am 21.09. |
| — | Das EINE Tor | `klinge_ch_wache.klingen_tor(titel, tags)` → (gesperrt, grund) | Sperr-Tag ODER `ist_handklinge` → nie reaktivieren; Revive und RUECKHOL importieren es |
| — | Kanarienvoegel | `automation/test_klingen_tor.py` (`--live` liest die 8 Handles frisch) | 2 Retraktionsmesser, 5 vom 16.09., Katana (Titel UND nur-Tag), Teppich-/Cuttermesser, Messerset → True; Messerblock, Knoblauchpresse, Schaeler, Schere, Herzfrequenzmesser, Messerschaerfer → False |

**Bewusst NICHT im RISIKO-Set:** `cj-nicht-versendbar-ch`. Das ist der Abfrage-Tag des Revive (`tag:cj-nicht-versendbar-ch AND status:draft`); im RISIKO-Set waere die Kandidatenliste immer leer und das Skript Dekoration. Das Unterscheidungsmerkmal ist `handklinge-kein-ch-versand` (die Wache setzt immer beide).

## 3. Trockenlaeufe und Messungen nach dem Fix

- `python3 automation/test_klingen_tor.py --live` → **OK, Exit 0** (18 Regelfaelle + 8 Live-Handles, alle DRAFT mit Sperr-Tag).
- `DRY=1 CAP=2 python3 automation/cj_versand_ch_revive.py` → **«wiederbelebt 0 · Klingen-Tor 15 (nie reaktiviert)»**, «0 pruefbar». Die 15 sind Drafts OHNE Sperr-Tag (Klasse a; die 104 mit Tag faengt schon RISIKO), z. B. japanisches-sashimi-und-fischfiletiermesser-601700, edelstahl-messerset-6-teilig-270784.
- `DRY=1 RUECKHOL=<3 Klingen + 1 harmlos> python3 automation/cj_verfuegbarkeit.py` → **3 vom Klingen-Tor gehalten, 0 zurueck**, das harmlose Produkt «schon ACTIVE».
- Wache-Funktionstest mit Fake-Export (ohne Bulk-Lauf; Waechter nicht von Hand gestartet): aktive Klinge → [a], Draft ohne Tag → [b], Draft mit Tag und Fortura-Deko-Katana → nichts. Verursacher live: Fuda 16.09. 11:13:26Z, Katana 21.09. 22:10:40Z.
- **Abschluss:** `productsCount(query:"status:active tag:handklinge-kein-ch-versand")` = **0 (EXACT)**, `…tag:cj-nicht-versendbar-ch` = **0 (EXACT)**; draft: 104 / 983.

## 4. Mutation: Tags der 104 nackten Produkte zurueckgegeben

Quelle: `/tmp/marge_export.jsonl` (Voll-Export **15.09.2026 18:54**, Felder id/tags/title — der juengste VOR dem 16.09.; `/tmp/kost_bulk_0913.jsonl` als Rueckfall, nicht gebraucht: 104/104 im 15.09.-Export). Trockenlauf-Tabelle vorher gedruckt, dann `tagsAdd` (748 Tags), dann frischer `nodes(ids:)`-Query: **104/104 vollstaendig** (alte Tags + beide Sperr-Tags), **0 nackt**, Status **104× DRAFT** unveraendert.

Weggelassen mit Absicht: `bildmass-ok-0906` (103×) und `rueckhol-0907` (23×) — das sind die Marker des Rueckhol-Pools (Aufgaben #53–#55, «gedraftete Ware nach Messung zurueckholen … kein Risiko-Tag»). Sie zurueckzugeben haette die Klingen wieder in genau den Pool gelegt, der sie zurueckholt. Alles andere kam zurueck: `cj-real` (98), `bild-ok` (104), `dropship`, Kategorien (`haushalt`/`kueche`/`kochen`/`messer`/`heimwerken`/`werkzeug`/…), `neuheit`/`neu`, `google-kanal-klinge-outdoor`.

| Produkt-ID | Handle | zurueckgegebene Tags |
|---|---|---|
| 15448845353345 | `fuda-taschenmesser-aus-damaststahl-634100` | bild-ok, cj-real, dropship, google-kanal-klinge-outdoor, messer, messer-outdoor, outdoor-messer |
| 15454650892673 | `luxus-messer-set-edelstahl-628600` | bild-ok, cj-real, dropship, haushalt, kochen, kueche |
| 15458646983041 | `24-teiliges-edelstahl-gedeck-mit-western-messe-637200` | bild-ok, cj-real, dekoration, dropship, haushalt, kueche, wohnen |
| 15524777886081 | `damaskes-messer-fur-obst-80-cm-stahlklinge-624300` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15454133092737 | `klingen-set-mit-metallgriff-604200` | aufbewahrung, bild-ok, cj-real, dropship, haushalt, organizer, wohnen |
| 15448842764673 | `kochmesser-damaststahl-olivenholz-609400` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15448844599681 | `alu-retraktionsmesser-mit-5-ersatzklingen-244098` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15448844665217 | `aluminium-einziehmesser-mit-5-ersatzklingen-108289` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15448845058433 | `damast-kochmesser-set-602200` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15448845189505 | `damast-kuchenmesser-set-619600` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, kuechenmesser, messer |
| 15490617180545 | `vintage-kochmesser-set-605300` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15493251826049 | `damastmesser-rohling-hohe-harte-605000` | bild-ok, cj-real, dropship, haerte, haushalt, kochen, kueche, messer |
| 15493810553217 | `aluminium-gurtmesser-616900` | bild-ok, heimwerken, messer, neu, neuheit, werkzeug |
| 15493848924545 | `7-teiliges-kuchenmesser-set-aus-edelstahl-606400` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, kuechenmesser, messer, neuheit |
| 15493929697665 | `handgeschmiedetes-kochmesser-tang-dao-476736` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15493930385793 | `geschmiedetes-kuchenmesser-edelstahl-mangan-ko-342912` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, kuechenmesser, messer, neuheit |
| 15493930713473 | `handgeschmiedetes-ausbeinmesser-mit-hammerschl-250176` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15493931041153 | `handgeschmiedetes-ausbeinmesser-382400` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15493931401601 | `handgeschmiedetes-kuchenmesser-mit-holzgriff-965696` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, kuechenmesser, messer, neuheit |
| 15495105347969 | `knochenbeil-mit-integriertem-kupfergriff-511808` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15495105479041 | `geschmiedetes-edelstahl-hackmesser-mit-hammers-335488` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15495105610113 | `kuchenmesser-set-aus-keramik-und-edelstahl-321152` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, kuechenmesser, messer, neuheit |
| 15495120650625 | `mongolisches-fleischmesser-604800` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15495230882177 | `handgeschmiedetes-holzfallermesser-740352` | bild-ok, cj-real, dropship, haushalt, holzfaellermesser, kochen, kueche, messer, neuheit |
| 15496130396545 | `kochmesser-edelstahl-gehammert-723200` | bild-ok, cj-real, dropship, gehaemmert, haushalt, kochen, kueche, messer, neuheit |
| 15496381759873 | `elektromagnetisches-wachsmesser-742528` | bild-ok, cj-real, dropship, elektronik, gadget, messer, neuheit, tech |
| 15496403452289 | `8-teiliges-retro-kuchenmesserset-aus-edelstahl-690304` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, kuechenmesserset, neuheit |
| 15496409874817 | `a4-papierschneidemesser-klein-handlich-610700` | bild-ok, heimwerken, messer, neu, neuheit, werkzeug |
| 15496520335745 | `handgemachtes-kuchenmesser-bambusgriff-077120` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, kuechenmesser, messer, neuheit |
| 15499897635201 | `traditionelle-kuchenmesser-715008` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15500371198337 | `portugiesisches-steakmesser-set-aus-edelstahl-256064` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, neuheit |
| 15500956729729 | `wolframstahlmesser-zum-trimmen-von-keramik-345600` | bild-ok, heimwerken, messer, neu, werkzeug |
| 15501002899841 | `drechselmesser-set-928384` | bild-ok, heimwerken, messer, neu, werkzeug |
| 15502129627521 | `hand-aufreibbohrfutter-mit-fasenmessern-522624` | bild-ok, heimwerken, messer, neu, werkzeug |
| 15503282962817 | `elektrisches-tranchiermesser-fur-grillfleisch-119552` | bild-ok, cj-real, dropship, elektronik, gadget, kueche, messer, tech, trend |
| 15504114811265 | `klappbares-universalmesser-aus-edelstahl-174208` | bild-ok, heimwerken, messer, neu, werkzeug |
| 15509380858241 | `kochmesser-western-stil-8-zoll-a547f6` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15509382431105 | `japanische-damast-kuchenmesser-a0b8c1` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15509382758785 | `hezhen-fischkopfmesser-180mm-d33251` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15509713813889 | `handgeschmiedetes-kochmesser-aus-edelstahl-b41d62` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15510919348609 | `8-teiliges-kochmesser-set-im-western-stil-8-st-29bb98` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15510926492033 | `kuchenmesser-aus-edelstahl-schleiffrei-d991e4` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15510926721409 | `handgeschmiedetes-edelstahl-spezialmesser-a0f523` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15510926852481 | `geschmiedetes-verbundstahl-haushaltsmesser-78aef8` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15511871422849 | `xinzuo-8-zoll-vg10-damast-kochmesser-06cb45` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15512280007041 | `metzgermesser-set-zum-zerlegen-enthauten-2d6904` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15512281383297 | `pearl-life-kasemesser-gelb-75ef24` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516071002497 | `handgeschmiedetes-scimitar-ausbeinmesser-696c89` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516071395713 | `chefmesser-mit-blauem-harzgriff-8-zoll-cd1c0e` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516071592321 | `japanisches-kochmesser-mit-damastmuster-2b519f` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516113568129 | `profi-fischmesser-aus-edelstahl-66b9ea` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516114354561 | `klappbares-rustmesser-mit-g10-griff-b69382` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516167733633 | `handgeschmiedetes-hackmesser-aus-hochmangansta-96dcca` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516168520065 | `forge-longquan-kuchenmesser-handgefertigt-03e8e7` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516168978817 | `handgeschmiedetes-hackmesser-aus-karbonstahl-4eea62` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516169208193 | `knochen-fleisch-und-fischmesser-097273` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516206137729 | `leder-kochmesser-rolltasche-012a99` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer, tasche, taschen |
| 15516206530945 | `mangan-edelstahl-tranchiermesser-0bfbf3` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516217147777 | `universal-schalmesser-8a5eea` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516217278849 | `japanisches-kochmesser-mit-anti-rutsch-griff-41ceb6` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516235039105 | `rahmatia-stahlmesser-holzgriff-50-stuck-61a3aa` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516235137409 | `damaststahl-kuchenmesser-mit-achteckigem-griff-3e9e25` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516235301249 | `geschmiedetes-edelstahl-kuchenmesser-b7a41e` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516235334017 | `handgeschmiedetes-fisch-und-filetiermesser-142c78` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516235465089 | `damaststahl-kuchenmesser-20c9e1` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15516235497857 | `yangjiang-haushaltsmesser-d505c3` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517531996545 | `damast-kochmesser-im-western-stil-66144b` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517532094849 | `kochmesser-aus-rostfreiem-stahl-311b9c` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517532225921 | `stahlmesser-mit-ebenholzgriff-e10f58` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517532422529 | `fischfiletiermesser-fur-kuche-haushalt-8a9c4a` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517532684673 | `kuchenmesser-aus-edelstahl-7b40fa` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517532782977 | `faltbares-rustmesser-871abf` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517555851649 | `kochmesser-mit-wengeholzgriff-31025f` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15517577642369 | `handgeschmiedetes-hackmesser-hohe-harte-557559` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15520396280193 | `geschmiedetes-ausbeinmesser-mit-lederhulle-603900` | aufbewahrung, bild-ok, cj-real, dropship, haushalt, huelle, messer, organizer, wohnen |
| 15520399393153 | `damastmesser-set-6ac1ea` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15520406929793 | `kuchenmesser-set-5-teilig-edelstahl-601600` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, messer |
| 15522215035265 | `profi-palettenmesser-fur-make-up-031808` | beauty, bild-ok, cj-real, dropship, kosmetik, makeup, messer |
| 15523903668609 | `handgeschmiedetes-kuchenmesser-618400` | aufbewahrung, bild-ok, cj-real, dropship, haushalt, organizer, wohnen |
| 15524695867777 | `kuchenmesser-aus-edelstahl-24-m-lange-601700` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524778115457 | `kuchenmesser-mit-holzgriff-handgefertigt-625001` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524852662657 | `zweischneidiges-obstmesser-602000` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524853088641 | `damaskstahl-santoku-kuchenmesser-617200` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524871242113 | `sato-kochmesser-613600` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524887134593 | `kuchenmesser-aus-chrom-carbon-edelstahl-621200` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524887593345 | `damaststahl-kochmesser-614900` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524887757185 | `stahl-tranchiermesser-fur-die-kuche-620200` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524888314241 | `japanisches-kochmesser-617300` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524929896833 | `ausbeinmesser-mit-fingerschutz-619700` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15524930290049 | `grosses-ausbeinmesser-aus-geschmiedetem-stahl-613200` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525488853377 | `geschmiedetes-kuchenmesser-mit-rundkopf-197184` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525491638657 | `schinkenmesser-aus-edelstahl-mit-palisandergri-180352` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525491802497 | `fischmesser-zum-schaben-von-fisch-300224` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525492130177 | `metzgermesser-aus-karbonholz-mit-hammerschlag-777152` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525492228481 | `geschmiedetes-3-in-1-stahl-kuchenmesser-242752` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525492294017 | `schlachtmesser-mit-hammerschlagmuster-040512` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525492392321 | `geschmiedetes-ausbeinmesser-864960` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525492523393 | `hackmesser-mit-holzgriff-und-hammerschlagmuste-609472` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525493375361 | `geschmiedetes-ausbeinmesser-aus-stahl-293440` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525493473665 | `damast-sanhe-stahl-kuchenmesser-381440` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525493965185 | `damast-kuchenmesser-mit-wabenmuster-griff-888576` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525494260097 | `aussenbereich-edelstahl-boniermesser-507072` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15525494489473 | `haushalts-kochmesser-aus10-stahlkern-745600` | bild-ok, cj-real, dropship, haushalt, kochen, kueche, neuheit |
| 15433464512897 | `samurai-schwert-deko-089216` | bild-ok, cj-real, cj-realname, dropship, geschenk, hype-2026 |

## 5. Offen / gemeldet (nicht meine Dateien)

- `automation/klingenregel.json`: «Baeren-Messer-Set mit Schneidebrett» faellt durch die Kontext-Ausnahme `schneidebrett` (Titel-Regel False; nur der Tag haelt es). Und «Elektrischer Fleischschneider mit Doppelklinge» gilt als Handklinge, ist aber ein Geraet — `handklinge_geraet` kennt «fleischschneider»/«schneidemaschine» nur teilweise. Beides Regelpflege in der EINEN Quelle, nicht hier.
- Weitere Reaktivierer ohne Klingen-Tor (gemessen per grep `"status": "ACTIVE"` + productUpdate): `cj_versand_ch_guard.py` (REVIVE=1, Z. 262), `ohne_lieferantenref_guard.py` (Z. 150), `bb_revive_scan.py`, `bb_tool_activate.py`. Die beiden CJ-Guards koennen CJ-Klingen zurueckholen, wenn sie ohne Sperr-Tag gedraftet wurden — das schliesst die Wache jetzt ueber den Tag (Klasse a), ein eigenes Tor haben sie nicht.
- Der Bulk-Export der Wache liest jetzt ACTIVE+DRAFT (~50k+ Produkte) — laengere Laufzeit, gleiche 30-Minuten-Zeitgrenze. Erster echter Lauf ueber den Aufseher (FIX=1, taeglich, `fixer_keepalive.sh` Z. 948 ff.) im Log `/tmp/klinge_ch_wache.log` nachlesen: erwartet «15 gedraftete Klingen OHNE Sperr-Tag … 15 Drafts mit Sperr-Tag versehen».
- Die 5 vom 16.09. und der Katana stehen im Revive-Ledger als «wiederbelebt» — Ledgerzeilen bleiben (Quittung fuer die Welt von damals); das Tor haelt sie jetzt unabhaengig vom Ledger.
