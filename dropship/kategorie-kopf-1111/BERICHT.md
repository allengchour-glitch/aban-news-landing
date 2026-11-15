# Teil 2: Kompakter Kategorie-Kopf am Handy (Stand 15.11.2026, nach der Korrekturrunde)

Auftrag: Besitzer-Entscheid 11.11. ca. 22:37 UTC «Kategorieseiten am Handy kompakter → Jetzt umsetzen».
Grundlage: Plan Rang 1 und Gegenprüfung (`tasks/wyd296bdo.output`), `dropship/kategorie-banner-v2/README.md`,
Prüferbericht `PRUEFUNG.md` (12.11., «mit Änderungen», 3 wichtig, 7 klein). Erste Fassung des Berichts: `alt2/BERICHT-1111.md`.

## Stand in einem Satz

Alles liegt als **neue Dateien im MAIN-Theme** und ist über `/collections/<handle>?view=lxkopf` sichtbar.
**Kundinnen sehen noch den alten Kopf**: keine bestehende Theme-Datei wurde geändert. Das Umschalten (Hauptsitzung)
ändert `templates/collection.json` und setzt einen Block direkt in `sections/main-collection.liquid` (kein Typwechsel mehr).

## Wichtig: neues MAIN-Theme seit 14.11.

GEMESSEN 15.11. 20:19 UTC (Admin-API): MAIN ist jetzt **213991391623 «LuxeStyle – SEO 14.11.2026»** (bis 12.11.:
213013037447). Alle Dateien tragen `updatedAt` 14.11. 13:42:22 UTC (Kopie beim Veröffentlichen). Wer es veröffentlicht
hat: unbekannt (in `origin/main` kein Hinweis). Unsere sechs Dateien wurden unverändert mitkopiert. Die Ausgangsstände sind
gleich wie am 12.11.: `templates/collection.json` md5 63dd0f31…, `sections/main-collection.liquid` 84a055d5…,
`layout/theme.liquid` 79a586ab…, `snippets/lx-verdichten.liquid` a75634a1…. `umschalten.mjs` liest MAIN bei jedem Lauf frisch.

## Prüfer-Funde: Stand

| # | Schwere | Fund | Stand | Beleg |
|---|---|---|---|---|
| 1 | wichtig | aktiver Tag-Filter am Handy nicht sichtbar | **behoben** (12.11.): Skript rollt die Zeile beim Laden zum aktiven Filter, sonst zur aktuellen Unterkategorie, sonst zur aktuellen Nachbar-Kategorie. Reihenfolge im HTML (Tastatur) unverändert. Rollt die Kundin selbst, springt nichts zurück. | GEMESSEN: `damen-kleider/neu` 390×664 «✨ Neu ✕» bei x 145–233 sichtbar (live 12.11. 00:48 und Wiedergabe 15.11.). Tests B1–B4, B7; 4 Mutanten. |
| 2 | wichtig | Section-Kopie hängt an `lx-verdichten` | **behoben**: `umschalten.mjs` setzt den Eager-Block direkt in `sections/main-collection.liquid`, `main.type` bleibt `main-collection`. Die Kopie dient nur noch der Testvorlage. | Patch = getestete Kopie Byte für Byte (U2). Neu: Funktionstest des Blocks mit LiquidJS (U27, 7 Prüfungen, 6 Mutanten). QUELLE `dropship/seo-kopf-0411/apply2.mjs` Zeile 73: dessen Rücknahme bricht ab, wenn die Section nicht exakt seinem Stand entspricht; nach dem Umschalten löscht es also `lx-verdichten` nicht. |
| 3 | wichtig | Rücknahme überschreibt `theme.liquid` ganz | **behoben**: Rücknahme entfernt nur die eine Zeile vor `</head>`, vergleicht das Ergebnis mit der Sicherung und bricht sonst ab. `FREMD_UEBERSCHREIBEN=1` entfernt auch dann nur die Zeile, nie die ganze Sicherung. | Tests U12–U18b; 2 Mutanten. |
| 4 | klein | Umschalten prüft Snippet-Inhalt nicht | **behoben**: md5 der vier Snippets im Skript (`SNIPPET_MD5`), Abbruch bei Abweichung. | Trockenlauf 15.11. 20:32 UTC: «Snippets geprueft (md5): 3», mit `ANKUENDIGUNG=1` 4. Test U25. |
| 5 | klein | Desktop ohne JS: Chips verborgen | **behoben**: Ausblenden nur mit Klasse `lx-kc-js`, die das Skript setzt. | GEMESSEN 15.11. Wiedergabe `damen-kleider/neu` 1440 ohne JS: 58 von 58 Links sichtbar, 0 Knöpfe; mit JS 10 von 58 + 2 Knöpfe. Tests B5/B6. |
| 6 | klein | ohne `:has()` ins Leere / doppelt | **behoben**: Kürzung und Deckel nur in `@supports selector(:has(*))`; Einzelabsatz ohne Knopf (12.11.). **Neu 15.11.:** Link-Fall: ein Skript setzt beim Öffnen `lx-kk--offen` und blendet die Textkopie aus. | Nachgestellt (Chromium, `:has` im CSS umbenannt): alte Fassung zeigt offen den ersten Absatz **doppelt** (K8 rot gegen `alt2/`), neue Fassung 1-mal. Live-Seite `haarstyling-geraete` 15.11.: ohne `:has()` offen 3 sichtbare Absätze wie mit `:has()`, Klasse gesetzt. Grenze: ohne `:has()` UND ohne JS bleibt die Kopie stehen. |
| 7 | klein | Tippfläche 20 px | **behoben**: Trefferfläche per `::before`, 6 px rundum. Die Box bleibt 20 px hoch. | GEMESSEN: 4 px über und unter dem Text trifft den Knopf, 10 px darüber nicht (K4); am Handy 7 von 7 Nachher-Seiten (15.11.) und 6 von 6 (12.11.). |
| 8 | klein | Nachbar-Kategorien und Versandzeile ausser Bild | **Versandzeile behoben (15.11.)**: am Handy zeigt der Pfad nur noch die Eltern-Kategorie («‹ Damen», ohne Eltern «‹ Home»). «Home ›» und der Seitentitel (steht direkt darunter als H1) sind dort ausgeblendet. JSON-LD und Desktop unverändert. **Nachbar-Kategorien: teilweise** (siehe Fund 1: das Rollen zeigt die aktuelle Nachbar-Kategorie, wenn es keine Unterkategorie und keinen aktiven Filter gibt). Auf Seiten mit Unterfiltern (`damen-kleider`) stehen die Nachbarn weiter hinten: **Entscheid Hauptsitzung**. | GEMESSEN 390×664, sichtbare Breite des Eintrags «Gratis-Versand», Stand 12.11. → 15.11.: kleider/neu 187 → 293, gemustert 0 → 148, creolen 43 → 282, uhren-herren 159 → 299, weihnachten 0 → 154, poloshirts 170 → 294 px; live `haarstyling-geraete` 239 px. Tests P1–P4 (JSON-LD, Text und Links gleich `lux_breadcrumb`), V1/V2; 5 Mutanten. |
| 9 | klein | «Weniger anzeigen» mitten im Text | **behoben** (12.11.): zweiter Knopf am Ende des Rests (nur mit JS), gibt den Fokus an «Mehr anzeigen» zurück. | K5/K5b, K6; live 12.11. an 2 von 2 gemessenen Seiten (creolen, uhren-herren): Knopf unter dem Rest, schliesst, Fokus zurück. |
| 10 | klein | Kaufhilfen-Nachmessung 25.11. vermischt | **nicht im Code lösbar.** Empfehlung: erst nach der Nachmessung vom Mi 25.11. umschalten, oder die Messung der 11 Kaufhilfe-Sammlungen neu festlegen. | Entscheid Hauptsitzung/Besitzer. |

## Dateien im MAIN-Theme 213991391623 (alle neu, frisch zurückgelesen, md5 = lokale Datei)

| Datei | md5 | Stand | Zweck |
|---|---|---|---|
| `snippets/lx-kopf-kompakt.liquid` | 3b125c20… | 15.11. 20:26 UTC | neuer Kopf (ersetzt Inhalt von `lux_hero`) |
| `snippets/lx-kopf-chips.liquid` | 74104de0… | 12.11. | Unterfilter, Tag-Filter, Nachbar-Kategorien (ersetzt `lux_subchips`) |
| `snippets/lx-kopf-pfad.liquid` | 430438e2… | 15.11. 20:26 UTC | Pfad samt JSON-LD + Versandzeile (ersetzt `lux_breadcrumb` und `lux_usp_coll`) |
| `snippets/lx-ankuendigung-stabil.liquid` | 0ada26e7… | 11.11. | Ankündigungsleiste Desktop ohne Sprung (nur mit `ANKUENDIGUNG=1`) |
| `sections/lx-main-collection-kompakt.liquid` | 0b0256a3… | 12.11. | **nur für die Testvorlage**; nach dem Umschalten löschen |
| `templates/collection.lxkopf.json` | Shopify 2f74af60… (JSON gleich lokal) | 11.11. | Testvorlage |

Quelltexte: `neu/`. Vorstand 12.11.: `alt2/neu/`. Ledger `hochgeladen.json`, `upload.log`.

## Messungen 15.11.2026

**Seitenabrufe:** 12 von 12 verbraucht (6 am 12.11. 00:45–00:47, 6 am 15.11. 20:27–20:31 UTC, je ≥ 27 s Abstand, kein 429,
keine Prüfseite; `abrufe.log`). **Panne:** mein Abrufskript schnitt bei 4 Adressen `?view=lxkopf` zu `?view` ab (Fehler beim
Zerlegen am «=»). Diese 4 Abrufe lieferten die normale Vorlage. Ich nutze sie als frische **Vorher-Seiten im neuen MAIN**
(kleider/neu, creolen, moissanit, haarstyling). Nur 1 Abruf zeigt den neuen Stand live: `haarstyling-geraete?view=lxkopf`
(20:31 UTC, Theme 213991391623, Link-Fall).

**Nachher-Seiten der übrigen 6 Sammlungen:** die live gerenderten Testvorlagen-Seiten vom 12.11. 00:45, mechanisch auf den
Snippet-Stand 15.11. nachgebildet (`k3/nachbilden.py`: zwei CSS-Zeilen, ein Skriptteil, Klassen im Pfad). Die Stil- und
Skriptblöcke sind **bytegleich** zur live gerenderten Seite vom 15.11. (6 von 6 geprüft). Produktdaten Stand 12.11.

**Methode:** Wiedergabe in Chromium (Dokument aus der Datei, Bilder/CSS/JS live vom CDN, jede weitere HTML-Anfrage an
luxestyle.ch abgebrochen), Chrome-141-Kennung, deviceScaleFactor 1. **Kein WebKit: iPhone/Safari ungemessen.**

GEMESSEN 15.11. 20:32–20:58 UTC:

| Seite | nachher aus | 1. Kartenbild unten 390×664 (Ziel ≤ 664), vorher = alter Kopf live 15.11. | Versandzeile sichtbar 390 px, Stand 12.11. → 15.11. | Pfad am Handy | LCP gedrosselt Median (3 Läufe) | CLS gedrosselt |
|---|---|---|---|---|---|---|
| haarstyling-geraete | live 15.11. | 1044 → **625** | alter Kopf: eigene Zeile bei y 431 → 239 px in der Pfadzeile bei y 201 | ‹ Beauty & Pflege | 2268 → **1804** ms (LCP-Element P → Kartenbild) | 0–0,0077 → 0,0265 |
| creolen-ohrclips | nachgebildet | 1284 → **621** | 43 → 282 px | ‹ Ohrringe | 1972 → **1716** ms | 0–0,0046 → 0,025–0,027 |
| damen-kleider/neu (Tag) | nachgebildet | 1012 → **625** | 187 → 293 px | ‹ Damen | 2076 → **1656** ms | 0,004–0,008 → 0,0399 |
| damen-kleider-gemustert | nachgebildet | → **621** | 0 → 148 px | ‹ Kleider nach Material & Muster | – | – |
| uhren-herren | nachgebildet | → **625** | 159 → 299 px | ‹ Uhren | – | – |
| weihnachten-2026 | nachgebildet | → **625** | 0 → 154 px | ‹ 🎁 Geschenke & Weihnachten | – | – |
| herren-poloshirts | nachgebildet | → **625** | 170 → 294 px | ‹ Herren | – | – |
| moissanit-schmuck | nur vorher | 1074 → nicht gemessen | – | (ohne Eltern: «‹ Home», nur Test P3) | – | – |

- **Ziel ≤ 664 px: 7 von 7 Nachher-Seiten**, auch bei 390×844 gleich. Gedrosselt (CPU ×4, 1,6 Mbit/s, 150 ms): LCP an
  3 von 3 Paaren **schneller** (−256 bis −464 ms), Ziel «höchstens +500 ms» erfüllt.
- **CLS ≤ 0,1 in allen 56 Wiedergaben vom 15.11.** Höchster Wert 0,0877 bei `weihnachten-2026` 390×844 (2 von 10 Läufen,
  sonst 0,0117). Quelle in beiden Fällen die **Produktkarten** (`PRODUCT-CARD` @main: die zweite Kartenreihe rutscht beim
  Laden 53 px nach unten, weil der Textblock der ersten Reihe wächst). Das ist Theme-Verhalten der Karten, unverändert.
  Neu ist nur, dass die Karten jetzt im ersten Bildschirm stehen. Der Ausreisser 1,02 vom 11.11. trat nicht wieder auf.
- **Kein seitliches Scrollen** (0 px) bei 390 und 1440. **Keine neuen Konsolenfehler** (nur «Blocked autofocusing … in a
  cross-origin subframe», vorher wie nachher, und Wiedergabe-Artefakte).
- **Link-Fall live** (`haarstyling-geraete`, Link im ersten Absatz): zu 1 sichtbarer Absatz, 0 fokussierbare Links;
  «Mehr anzeigen» nach 13 Tabs; Enter öffnet; offen 3 Absätze, 3 Links fokussierbar; Leertaste schliesst. Ohne `:has()`
  dieselben Zahlen, keine Doppelung. Ohne `:has()` ist der Kopf 162 px hoch und das erste Kartenbild endet bei 725 px
  (nur alte Browser, gewollt: dort wird nicht gekürzt).
- **Desktop 1440:** Kopf 230 px, erstes Kartenbild unten 963 statt 1079 px (haarstyling); Pfad vollständig (Home, Eltern,
  Titel); Versandzeile wie bisher als eigene Reihe.
- **Beschreibung vollständig:** offline mit den **frisch gelesenen 1 732 Beschreibungen** (Admin-API 15.11. 20:25 UTC;
  9 neue und 9 geänderte seit 11.11.) ohne Verlust: 1 724 Anriss + Rest, 7 Textkopie (Link im ersten Absatz), 1 kurz ohne
  Knopf. Live 12.11. an 6 Seiten: Anriss + Rest = `descriptionHtml`, `ls-verwandt`/`gd2` vorhanden (weihnachten-2026),
  Kaufhilfen «So wählst du» vorhanden (creolen, uhren-herren).

Bilder (angesehen): `k3/bilder/vergleich_kleider_m664.png` (vorher | nachher Tag-Seite | nachher Unterkategorie),
`k3/bilder/haarstyling_vorher_m664.png`, `haarstyling_nachher_m664.png`, `haarstyling_nachher_d.png`. Rohdaten
`k3/erg/serie15.json`, `nachlauf15.json`, `diag15.json`, `usp12.json`.

## Tests (alle am 15.11. gefahren)

- `test_kopf.mjs` (LiquidJS): **72 Prüfungen + 1 über alle 1 732 Beschreibungen**, alle grün
  (`LXK_DESC=k3/desc_html.json node test_kopf.mjs --alle`). Neu: P1–P4 Pfad (JSON-LD, Text, Links gleich `lux_breadcrumb`;
  Klassen am Handy), K5 Link-Fall.
- `verhalten.cjs` (Chromium, gerenderte Snippets): **23 Prüfungen** grün. Neu: K8 Link-Fall mit/ohne `:has()`, V1/V2 Pfad
  Handy/Desktop. Gegen den Stand 12.11. (`alt2/`): K8 ohne `:has()`, V1 und V2 rot (Funde 6 und 8 nachgestellt).
- `test_umschalten.mjs` (offline): **37 Prüfungen** grün. Neu: U27 Eager-Block funktional (Seite 1: Karten 1–2 eager +
  high, 3–4 eager, ab 5 lazy, zweites Bild unverändert; Seite 2 alles lazy).
- `mutation.py`: **46 von 46 Mutanten erkannt** (33 bisherige + 13 neue für Link-Fall, Pfad und Eager-Block; beim
  Eager-Block werden Lib und Testkopie gleich verändert, damit nur der Funktionstest greift). Ausgangslage vorher grün.

## Umschalten (Hauptsitzung)

Skript: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/kopf1111/umschalten.mjs`
(Logik in `umschalten_lib.mjs`, offline getestet).

```
node umschalten.mjs                         # Trockenlauf (15.11. 20:32 UTC gelaufen: MAIN 213991391623, Basis und Snippet-md5 stimmen)
LIVE=1 node umschalten.mjs                  # Sicherung nach sicherung/, schreiben (eine Anfrage), frisch zurücklesen
LIVE=1 ANKUENDIGUNG=1 node umschalten.mjs   # zusätzlich 1 Zeile in layout/theme.liquid vor </head>
ZURUECK=1 LIVE=1 node umschalten.mjs        # Rücknahme: nur eigene Teile raus, Vergleich mit der Sicherung, sonst Abbruch
```

Geändert werden nur:

1. `templates/collection.json`: `lux_breadcrumb` → `{% render 'lx-kopf-pfad' %}`, `lux_hero` → `{% render 'lx-kopf-kompakt' %}`,
   `lux_subchips` → `{% render 'lx-kopf-chips' %}`, `lux_usp_coll` entfällt, `order` = `lux_breadcrumb, lux_hero,
   lux_subchips, luxe_review_assets, main, lux_faq`. `main` bleibt `main-collection` (Einstellungen und Blöcke gleich).
2. `sections/main-collection.liquid`: die 2 Zeilen der Karte (`content_for '_product-card'` + `theme-check-enable`) werden
   durch den 18-zeiligen Block ersetzt (Karte erfassen, Seite 1 Karten 1–4 eager, 1–2 `fetchpriority=high`). 6 779 → 7 807 Zeichen.
3. Optional (`ANKUENDIGUNG=1`): `{%- render 'lx-ankuendigung-stabil' -%}` vor `</head>` (Desktop-CLS der Leiste 0,002
   statt 0,010–0,033, gemessen 11.11.).

Danach: ≥ 60 s warten, 2–3 Kategorieseiten ohne `?view` und eine Tag-Seite am Handy messen (Seitencache bis rund 20 min).
Dann `templates/collection.lxkopf.json` und `sections/lx-main-collection-kompakt.liquid` löschen (die Kopie ruft
`lx-verdichten` und bekäme spätere Änderungen nicht). **Reihenfolge bei Rücknahmen:** zuerst `ZURUECK=1 LIVE=1 node
umschalten.mjs`, erst danach eine Rücknahme von `dropship/seo-kopf-0411/apply2.mjs` (sonst bricht diese zu Recht ab).

## Offen und ungemessen

- **iPhone/Safari ungemessen** (kein WebKit). `:has()` braucht Safari ≥ 15.4 (ohne: Rückfall gemessen nur als Nachstellung
  in Chromium). Ob Safari Text im geschlossenen `<details>` mit der Seitensuche findet: unbekannt.
- **Termin wegen Kaufhilfen-Nachmessung Mi 25.11.** (Fund 10): Entscheid Hauptsitzung/Besitzer.
- **Nachbar-Kategorien** auf Seiten mit vielen Unterfiltern stehen am Handy weit hinten (Fund 8, Entscheid Hauptsitzung).
- **Karten-Verschiebung** (Textblock der ersten Kartenreihe, CLS bis 0,0877 bei 390×844): eigener kleiner Fix an den
  Karten nötig, betrifft eine bestehende Datei.
- Nur 1 Seite des neuen Stands live gerendert; 6 weitere nachgebildet (Stil/Skript bytegleich geprüft, Produktdaten 12.11.).
  `moissanit-schmuck` (ohne Eltern-Kategorie, 2-zeiliger Titel) nachher nicht gemessen, nur Test P3.
- Ohne `:has()` UND ohne JS bleibt im Link-Fall die Textkopie neben dem echten Absatz stehen (7 Sammlungen).
- Wirkung auf Absprung und Käufe: unbekannt (Hypothese). Messplan der Gegenprüfung: Absprung der ChatGPT-Handy-Landungen
  auf Sammlungen, je 28 Tage vor und nach dem Umschalten.
- Desktop-Chipbreite ist aus der Zeichenzahl geschätzt (bei 750–1000 px oder sehr langen Namen 2 Zeilen möglich).
- Handy-Sprung der Ankündigungsleiste (Text 2 → 3 Zeilen) bleibt; nicht mit neuer Datei lösbar.
- `luxe.kopf_produkte` mit Entwürfen nur über `p.available` abgesichert, nicht live an einem Entwurf gemessen.
- Die Hauptsitzung übernimmt `neu/`, Werkzeuge und Bericht bei Bedarf ins Repo.
