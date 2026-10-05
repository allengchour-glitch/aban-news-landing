# Neue Landeseiten, Runde 3 (05.10.2026, 08:40–09:20 UTC)

Betreiber: «fix mal weiter semrush». Bereich «kollektionen-runde2» des Workflows; Vorbild Runde 2 (`NEUE-KOLLEKTIONEN-2026-10-05.md`,
/collections/teppiche …). Nichts committet (Workflow-Vorgabe).

## 1 · Messung
- **Kollektionen live:** 541 (`collections(first:250)`, Titel + SEO-Titel + Handle normalisiert gegen die Begriffe). Keine Seite für
  Etagere, USB-Stick, Wanduhr, Wok, Abendkleid, Lunchbox, Winterschuhe, Bauchtasche; keine Redirects auf die acht geplanten Pfade
  (`urlRedirects path:/collections/<handle>` = 0), keine Handles belegt.
- **Ware:** `/tmp/export.jsonl` (04.10. 21:10; 50'760 ACTIVE, 48'979 im Google-Kanal), strenge Regel ECHT ∧ ¬BAN ∧ Produkttyp
  (deutsche Wortgrenzen, POD-Tags ausgeschlossen), danach **jedes Produkt live** (`product(id)`: ACTIVE ∧ `availableForSale` ∧
  Google-Publikation):

| Begriff (Semrush ch) | Suchen/Mt | KD | streng Export | live kaufbar + Google |
|---|---:|---:|---:|---:|
| etagere | 5'400 | 23 | 15 | 15 |
| usb stick / usb sticks | 4'400 | 24 | 42 | 42 |
| wanduhr | 4'400 | 16 | 20 | 20 |
| wok (+ wok pfanne 1'300) | 4'400 | 21 | 15 | 15 |
| abendkleid/abendkleider (+ lang 1'900, cocktailkleid 2 × 1'300) | 3'600 | 29 | 102 | 102 |
| lunchbox | 3'600 | 19 | 37 | 35 |
| winterschuhe damen (+ winterstiefel damen 1'600) | 3'600 | 19 | 78 (65 ohne Kinderschuhe) | 65 |
| bauchtasche (+ gürteltasche damen 480) | 2'900 | 16 | 212 lose → **78 eng** | 78 |

- **Bauchtasche eng gemessen:** 128 der 206 losen Treffer sind Brusttaschen/Sling-Bags («Brusttasche», «Sling») — eigene Warenart,
  nicht «Bauchtasche» → Regel nur bauchtasche|gürteltasche|hüfttasche|belt bag|hip bag|laufgürtel.
- **Weitere geprüfte Begriffe ≥ 590/Mt, KD ≤ 35, nicht umgesetzt:** lederjacke damen 1'900 (18 Treffer, 15 davon Herren → Begriff passt
  nicht), externe festplatte 3'600 (25, darunter Festplatten-Gehäuse/Rekorder), klimmzugstange 4'400 (10 < 12), reiskocher 5'400 (3),
  schlafsack/zelt 4'400 (Seite camping-schlafen vorhanden), hundebett 4'400 (Seite hundebetten vorhanden), lockenstab 4'400 + haarglätter
  880 (Seite haarstyling-geraete), werkzeugkoffer 4'400 (Seite werkzeugkoffer-sets, unveröffentlicht, 59), schneidebrett 2'400 (85, Rule
  «Schneidebrett» in sub-kueche/wohnen-kueche vorhanden), wandteppich 720 (59 Treffer, Volumen unter 1'000).
- **Kontaktbogen (je 24 Hauptbilder, selbst angesehen — `kb_r3_*.jpg` im Scratchpad):** Fehltreffer → BAN + Kanarienvögel:
  «Drehbarer Tortenständer zum Dekorieren» (Drehteller, keine Etagere); «Gas Wok Kocher aus Gusseisen» (Brenner); «Brotbox aus Bambus»
  und «Brotbox aus Metall mit Bambusdeckel» (Brotkasten, keine Lunchbox); «Taktische Brusttasche für Trail Running» + «Sport-Brusttasche»
  (Laufwesten); «Leder-Gürteltasche für Coiffeur-Werkzeuge» (Holster). Rest der Bögen passt (USB: Motiv-Sticks sind Sticks; Wanduhren:
  Duschuhr, Stoffuhr, Uhr-Lampe sind Wanduhren; Abendkleider 24/24 Kleider; Winterschuhe 24/24 ohne Kinder).
- **Semrush `phrase_organic` ch, 10 Zeilen:** 6 Aufrufe à 100 Einheiten = **600**; «abendkleid» und «lunchbox» lieferten
  «NOTHING FOUND» (0 Einheiten, nicht wiederholt). Kategorie-Seiten in den Top 10: etagere 9/10 (+ Wikipedia), usb stick 7/10 (+ Wikipedia,
  YouTube, Hersteller), wanduhr 10/10, winterschuhe damen 10/10, bauchtasche 8/10 (+ YouTube, Produkt), wok 4/10 Shops + 4 Rezeptseiten
  + Wikipedia + Marke (gemischte Absicht, Seite trotzdem sinnvoll: IKEA/Kuhn Rikon ranken mit Kategorie).
- **⚠️ GEMESSEN: `metadata.usage.api_units` fiel über die sechs Aufrufe 700 → 600 → 500 → 500 → 400 → 400 — das Feld ist der
  Kontostand (Runde 2: «api_units = Konto-Differenz»). Rest ≈ 400 Einheiten.** Die Nachmessung am 08.10. (`resource_organic`, ~4'400)
  ist damit NICHT bezahlbar; kein weiterer Semrush-Aufruf in dieser Runde.

## 2 · Umgesetzt (8 Kollektionen, Regel TAG, BEST_SELLING, 6 Kanäle wie diamond-painting)
| Kollektion | Suchen/Mt | Regel-Treffer SCHARF | live (WebFetch) | Menü |
|---|---:|---:|---|---|
| /collections/etageren «Etageren» | 5'400 | 14 | ✅ Titel, H1, 14 Artikel, kein 404 | Wohnen & Garten › nach Küche & Kochen |
| /collections/usb-sticks «USB-Sticks» | 4'400 | 42 → **41** (Nachbesserung 09:39, s. § 5) | ✅ 41 Artikel (WebFetch 09:4x) | Technik & Gaming › nach PC & Homeoffice |
| /collections/wanduhren «Wanduhren» | 4'400 | 21 | ✅ 21 Artikel | Wohnen & Garten › nach Wanddeko |
| /collections/woks «Woks & Wokpfannen» | 4'400 | 14 | ✅ 14 Artikel | Wohnen & Garten › nach Küche & Kochen |
| /collections/abendkleider «Abendkleider & Cocktailkleider» | 3'600 | 104 | ✅ 104 Artikel | Damen › nach Midikleider |
| /collections/lunchboxen «Lunchboxen & Bento-Boxen» | 3'600 | 33 | ✅ 33 Artikel | Wohnen & Garten › nach Küchenhelfer & Gadgets |
| /collections/winterschuhe «Winterschuhe & Winterstiefel» | 3'600 | 58 → 64 (zweiter Lauf 09:11 nach `suche` + «gefüttert», «snowboots»: gehört 64, neu 6; `products` zeigte 2 Min später noch 58 — Mitgliedschaft hinkt nach) | ✅ 58 Artikel (vor dem zweiten Lauf) | Schuhe › nach Stiefel & Boots |
| /collections/bauchtaschen «Bauchtaschen & Gürteltaschen» | 2'900 | 77 | ✅ 77 Artikel | Damen › nach Taschen & Rucksäcke |

- Regeln: Block «Runde 3» in `automation/kategorie_rein_semrush.py` (CFG jetzt 16 Semrush-Kategorien + 9 Menü-Kategorien = 25 im
  täglichen `kategorie_rein.py`); Kanarienvögel 134/134 (nach § 5: 137/137). Anlegen + Menü: `automation/neue_kollektionen_runde3.py` (nutzt die Runde-2-Werkzeuge
  mit eigenem Ledger/Backup; `--zurueck` = unpublish, nie löschen).
- Alle 8 zurückgelesen: SEO-Titel 45–58 Zeichen mit Begriff, Meta 148–155 Zeichen mit Begriff (ohne Preise, «Versand in die Schweiz»),
  Text 115–137 Wörter, Regel TAG=kat-…, 6 Kanäle (Online Store, Shop, TikTok, Facebook & Instagram, Google & YouTube, Pinterest).
- Menü: Backup `_hauptmenue_backup_2026-10-05_runde3.json`, 8 HTTP-Links, zurückgelesen 8/8; `menue_links.py`: «202 Einträge,
  161 Kollektionen, alle Menülinks führen auf veröffentlichte, gefüllte Kollektionen».
- Zahlen in den Texten: keine Grössen-/GB-Angaben aus Beschreibungen übernommen («16–128 GB» aus der Meta gestrichen); Richtwerte
  (28–32 cm Wok, 17 cm Handyfach) sind Rat, keine Sortimentsbehauptung.

## 3 · Bestehende Seiten auf Begriffe gezogen (statt neuer Kollektion)
| Kollektion | Begriff | gemessen | vorher → nachher |
|---|---|---|---|
| /collections/sub-stiefel-boots | stiefeletten damen 2'900 + stiefeletten 1'900 | 16 «Stiefelette» in den ersten 250 von 685; chelsea 4, overknee 6, absatz 14, gefüttert/winter 46 | SEO «Stiefel & Boots kaufen \| LuxeStyle Schweiz» → «Stiefeletten, Stiefel & Boots für Damen & Herren \| LuxeStyle» (60), Meta 152, Einleitung vorangestellt; WebFetch: Titel + erster Satz neu, 685 Artikel |
| /collections/licht-tischlampe | nachttischlampe 3'600 | 14 «Nachttisch» von 59 gelesen; LED 13, Touch 8, Akku/USB 13 | «Nachttischlampe, Tisch- & Schreibtischlampen \| LuxeStyle» (56), Meta 151, Einleitung; WebFetch: neu, 59 Artikel |
| /collections/haarstyling-geraete | haarglätter 880 (glätteisen 2'400 schon im Titel) | Haarglätter 29, Glätteisen 49, Lockenstab 123 von 212 | Titel unverändert, Meta mit «Haarglätter» (132, alter Code WELCOME10 raus), Einleitung; WebFetch zeigt noch die alte Meta (Cache) |
| /collections/vr-ai-neuheiten | vr brille 3'600 | Kollektion hielt **1** VR-Brille; Export: 15 VR-Brillen/Headsets ohne Tag → 14 live kaufbar + Google **mit `vr-ai-neu` getaggt** (Kamera draussen) | «VR-Brille, AI-Gadgets & Tech-Neuheiten \| LuxeStyle» (50), Meta 148 (zweimal gekürzt, erste Fassung 166 — Länge jetzt VOR dem Schreiben geprüft), Einleitung; zurückgelesen: 16 VR-Titel in der Kollektion, WebFetch 15 |

Ledger-Zeilen `seo-bestand` tragen den Altwert (SEO + descriptionHtml) — Rückweg: Altwert per `collectionUpdate` zurückschreiben,
Tags per `tagsRemove` (IDs in der Zeile `tagsAdd vr-ai-neu`).

## 4 · Offen / Lehren
- **Semrush-Rest ≈ 400 Einheiten (gemessen über `api_units`)** → Nachmessung 08.10. (~4'400) nicht möglich; Betreiber entscheidet
  (Einheiten nachkaufen oder Nachmessung nach dem Abo lokal über die gespeicherten CSVs + Search Console). Kündigung vor 09.10. bleibt.
- Nicht umgesetzt (Grenze 8): Schneidebretter 2'400 (85 Treffer, Küche-Seiten tragen den Begriff nur als Regel), Wandteppiche 720 (59),
  Externe Festplatten 3'600 (Regel müsste Gehäuse/Rekorder trennen), Lederjacken (Herren-Bestand, Begriff «damen»).
- Brusttaschen/Sling-Bags: 128 kaufbare Produkte ohne eigene Seite — Volumen «brusttasche»/«sling bag» ch nicht gemessen (kein Budget).
- `kategorie_rein.py` läuft täglich mit jetzt 25 Kategorien im Aufseher (timeout 3000 s); der Lauf der 8 neuen dauerte heute ~2,5 min
  (08:56–08:58), der Gesamtlauf ist erst beim nächsten Tick belegt.
- Haarstyling-Meta: WebFetch lieferte noch die alte Meta (Admin-API = neu) — Cache, in 1–2 h erneut prüfen.
- Kontaktbögen zeigen nur die ersten 24 — bei Abendkleidern (104) und Bauchtaschen (77) sind 80 bzw. 53 Produkte nur per Regel geprüft — § 5 zeigt, dass genau dort ein Fehltreffer stehen kann (USB: Position 40).

## 5 · Nachbesserung 09:30–09:45 UTC (Prüferbefund «mittel»)
- **Befund bestätigt:** «USB-Stick für Host-Systeme» (gid …/Product/15480344641921) stand auf Position 40 von /collections/usb-sticks —
  ausserhalb des Kontaktbogens. Text: «Direkt einsetzbar bei Systemversionen FW 9.0 bis 11.00 … unterstützt den Wechsel zwischen den
  Systemversionen» = PS4-Jailbreak-Dongle, kein Speicherstick. Der Titel verrät nichts, die USB-Regel prüft nur Titel.
- **Zwilling gefunden** (Volltext-Suche über `desc_export.jsonl`, 49'925 aktive Produkte): «U-Disk Archiv für Nintendo Switch»
  (…/15481842401665) — «ermöglicht den Start von CFW wie Atmosphere, ReiNX oder SXOS», RCMloader/RCMclip; aktiv, im Google-Kanal und in
  /collections/nintendo-switch. Gleiche Klasse: Umgehung technischer Schutzmassnahmen (Art. 39a Abs. 3 URG verbietet schon das Anbieten).
- **Regel:** BAN von `usb-sticks` in `automation/kategorie_rein_semrush.py` + `host-system|firmware|\bfw\b|jailbreak|systemversion|\bcfw\b|
  konsole|nintendo|\bswitch\b|\bps[2-5]\b|playstation|xbox`, 3 Kanarienvögel (u. a. «USB-Stick für PS4 Jailbreak FW 9.0») →
  `python3 automation/kategorie_rein_semrush.py` = 137/0. `kategorie_rein.py usb-sticks` TROCKEN: «jetzt 42 · gehört 41 · raus 1 · neu 0»
  (nur dieser Titel), dann SCHARF → `tagsRemove kat-usb-sticks`; Ledger `dropship/_kategorie_rein.tsv` 09:39.
- **Quelle (Importer + täglicher Wächter):** neue Treffer-Regel `kopierschutz-umgehung-konsole` in `automation/heikel_zweck.json`
  (Anker 1: Custom Firmware/CFW/Jailbreak/Homebrew/«Systemversion(en) FW n»/«FW n.n»/RCM-loader/Mod-Chip; Anker 2: Konsole/Switch/PS2–5/
  PlayStation/Xbox/Wii/Nintendo/Host-System/E-Sport/Gaming). Trockenlauf über 49'925 aktive Texte: Anker 1 allein 2, Regel 2 — genau diese
  beiden, 0 Fehltreffer; Gegenproben Metall-USB-Stick / WLAN-Router mit «Firmware-Update, Gaming-Modus» / PS4-Controller → null.
  `heikel_zweck.mjs`: Regel in VERBOTEN, Gruppe `umgehung`; `cj_category_fill.mjs`: Tag `kopierschutz-umgehung` + DRAFT statt Publizieren;
  `ueberwachung_waffen_guard.py`: diese Regel draftet ohne Bildliste (der Text IST die Funktion), Tag `kopierschutz-umgehung`.
  `node --check` + `py_compile` ok. (`cj_sku_import.mjs` nutzt `heikel_zweck` nicht — dort greift nur die USB-Kollektionsregel.)
- **Vollzug:** `ueberwachung_waffen_guard.py` mit Export (Status aus `/tmp/export.jsonl` ergänzt) TROCKEN «Zu ändern: 2 von 4», dann SCHARF:
  beide «google-kanal-entfernt, tag:kopierschutz-umgehung, draft» (Ledger `dropship/_ueberwachung_waffen.txt`). Nicht gelöscht.
- **Live zurückgelesen:** beide `status DRAFT`, Tag `kopierschutz-umgehung`, ohne `kat-usb-sticks`, keine Google-Publikation;
  `collection(usb-sticks).products` = 41, alle ACTIVE, Host-Stick nicht drin (`productsCount` zeigt noch 42 — hinkt nach).
  WebFetch /collections/usb-sticks: «41 Artikel», kein Host-/Switch-Titel; /products/usb-stick-fur-host-systeme-618300 → 404.
- **Lehre:** Eine Kategorie-Regel über den TITEL hält nur, was der Titel sagt. Bei Elektronik-Kollektionen gehört eine Volltext-
  Stichprobe über die Beschreibung (Funktionswörter) dazu, nicht nur der Kontaktbogen der ersten 24.

