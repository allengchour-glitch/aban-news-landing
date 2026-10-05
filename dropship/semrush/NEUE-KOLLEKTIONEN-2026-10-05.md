# Neue Landeseiten aus der Semrush-Ernte (05.10.2026, 07:12–07:40 UTC)

Betreiber: «das geht mehr verbesserung mit semrush». Bereich «neue-kollektionen», Vorbild /collections/diamond-painting (04.10.).

## 1 · Messung
- Quelle: `kategorie_suchvolumen_ch*_2026-10-02.csv` (836 + 478 + 4 × verwandt). Filter Volumen ≥ 590 und KD ≤ 35: **799 Begriffe**,
  ohne Konkurrenz-Marke/Hausregel-Klasse (Regex, Kostüm/Erotik/Tabak/Klingen/Arznei/Lebensmittel) **765**.
- Seiten-Abgleich: alle **533 Kollektionen** live gelesen (Titel + SEO-Titel + Online-Store-Veröffentlichung + productsCount),
  Begriff normalisiert (ä→ae, ss) gegen Titel/SEO-Titel mit Wortgrenzen.
- Ware: `/tmp/export.jsonl` (04.10. 21:10, 48'972 aktive Google-Produkte ohne POD), lockere Wortregel je Begriff →
  **129 Begriffe ohne Seite mit ≥ 12 Treffern**. Für die 16 volumenstärksten davon strenge Regel (ECHT ∧ ¬BAN, deutsche
  Wortgrenzen, 84 Kanarienvögel) und live nachgezählt (`variants.availableForSale`, Google-Flag).
- Kontaktbogen (24 Hauptbilder) für 14 Kandidaten selbst angesehen. Fehltreffer gefunden und in den BAN genommen:
  Picknick-/Camping-«Teppich», Teppich-Tufting-Leim, DIY-Knüpfset, Kehrroboter, Baumwollstoff «für Bettwäsche», Sofa-Bettbezug,
  Armbanduhren als «Wecker» (Curren/Sanda), Nachtlicht/Lautsprecher «mit Wecker», Hunde-Rollleine «mit Taschenlampe»,
  T6-Taschenlampe mit Waffenschiene, «Wintermantel ohne Ärmel» (Weste).
- Semrush-Kontrolle (`phrase_organic` ch, 10 Zeilen = **100 Einheiten je Aufruf, 8 Aufrufe = 800 Einheiten**, einzeln nacheinander):
  bei teppich, bettwäsche, wäschekorb, duschvorhang, wandregal, winterjacke stehen **10/10 Kategorie-Seiten** in den Top 10
  (IKEA, Jysk, Pfister, Micasa, auch Shopify-`/collections/`-Seiten wie teppana.ch, kaqtu.ch, intersport.ch); bei wecker 6/10
  (dazu Apps, Wikipedia) und taschenlampe 6/10 (dazu App, Wikipedia, Hersteller) — gemischte Absicht, Seite trotzdem sinnvoll.

## 2 · Umgesetzt (8 Kollektionen, Regel TAG, 6 Kanäle wie diamond-painting, Sortierung BEST_SELLING)
Sortierung BEST_SELLING wie das Vorbild: die Ware ist Monate alt, Verkaufssignal schlägt Neuheit; CREATED_DESC hätte die
jüngsten Grind-Importe nach oben gestellt.

| Kollektion | Suchen/Mt | KD | Regel-Treffer (SCHARF) | live (WebFetch) | Menü |
|---|---:|---:|---:|---|---|
| /collections/teppiche «Teppiche» | 14800 | 21 | 38 | ✅ H1 + Produkte, kein 404 | Wohnen & Garten › nach Kissen & Wohntextilien |
| /collections/bettwaesche «Bettwäsche» | 14800 | 23 | 32 | ✅ H1 + Produkte, kein 404 | Wohnen & Garten › nach Kissen & Wohntextilien |
| /collections/waeschekoerbe «Wäschekörbe» | 9900 | 15 | 15 | ✅ H1 + Produkte, kein 404 | Wohnen & Garten › nach Aufbewahrung |
| /collections/wecker «Wecker» | 9900 | 31 | 21 | ✅ H1 + Produkte, kein 404 | Wohnen & Garten › nach Beleuchtung |
| /collections/duschvorhaenge «Duschvorhänge» | 8100 | 18 | 16 | ✅ H1 + Produkte, kein 404 | Wohnen & Garten › nach Vorhänge |
| /collections/taschenlampen «Taschenlampen & Stirnlampen» | 6600 | 20 | 27 | ✅ H1 + Produkte, kein 404 | Sport & Party › nach Camping & Outdoor |
| /collections/wandregale «Wandregale» | 6600 | 18 | 16 | ✅ H1 + Produkte, kein 404 | Wohnen & Garten › nach Aufbewahrung |
| /collections/winterjacken «Winterjacken & Daunenjacken» | 5'400 ×3 + 2'900 + 2'400 | 15 | 45 | ✅ H1 + Produkte, kein 404 | Herbst & Übergang › nach Jacken & Mäntel |

- Regeln: `automation/kategorie_rein_semrush.py` (CFG wie kategorie_rein.py; `kategorie_rein.py` lädt sie per `CFG.update` und
  läuft täglich im Aufseher «KATEGORIEN REIN» → neue Ware rein, Fremdware raus). Kanarienvögel 56/56.
- Anlegen: `automation/neue_kollektionen_anlegen.py` (idempotent, `--zurueck` = unpublish, nie löschen). Alle 8 zurückgelesen:
  SEO-Titel ≤ 60 Z. mit Suchbegriff, Meta 151–159 Z. mit Suchbegriff (Prüfer aus seo_kollektion_suchbegriff.py: 8/8 ok),
  Text 105–128 Wörter, Regel TAG, 6 Kanäle.
- Menü: `automation/menue_semrush_kollektionen.py`, Backup `dropship/semrush/_hauptmenue_backup_2026-10-05.json`, 8 HTTP-Links,
  `menue_links.py` danach: «194 Einträge, 153 Kollektionen, alle Menülinks führen auf veröffentlichte, gefüllte Kollektionen».
- Ledger: `dropship/semrush/_neue_kollektionen_2026-10-05.tsv` (create/publish/menu/Semrush), Tags in `dropship/_kategorie_rein.tsv`.
- ⚠️ `productsCount` stand 10 Minuten nach dem Taggen noch auf 0, während `products(first:3)` und die Live-Seite die Ware
  zeigten («38 Artikel») — der Zähler hinkt der Mitgliedschaft nach; für Soll/Ist die Live-Seite oder `products` lesen.

## 3 · Kandidatenliste (ohne Seite, ≥ 12 lose Treffer; Top 60 nach Volumen) mit Entscheid
| Begriff | Suchen/Mt | KD | lose Treffer | Entscheid |
|---|---:|---:|---:|---|
| teppich | 14800 | 21.0 | 32 | ✅ umgesetzt → /collections/teppiche |
| bettwäsche | 14800 | 23.0 | 32 | ✅ umgesetzt → /collections/bettwaesche |
| aquarium | 12100 | 21.0 | 13 | verworfen: Treffer sind Quallen-Lampen, keine Aquarien |
| wäschekorb | 9900 | 15.0 | 15 | ✅ umgesetzt → /collections/waeschekoerbe |
| wecker | 9900 | 31.0 | 38 | ✅ umgesetzt → /collections/wecker |
| duschvorhang | 8100 | 18.0 | 17 | ✅ umgesetzt → /collections/duschvorhaenge |
| taschenlampe | 6600 | 20.0 | 26 | ✅ umgesetzt → /collections/taschenlampen |
| wandregal | 6600 | 18.0 | 18 | ✅ umgesetzt → /collections/wandregale |
| winterjacke herren | 5400 | 15.0 | 18 | ✅ umgesetzt → /collections/winterjacken |
| etagere | 5400 | 23.0 | 14 | Kandidat Runde 2 (14 kaufbar, strenge Regel gemessen) |
| winterjacke damen | 5400 | 16.0 | 18 | ✅ umgesetzt → /collections/winterjacken |
| winterjacke | 5400 | 15.0 | 18 | ✅ umgesetzt → /collections/winterjacken |
| usb stick | 4400 | 24.0 | 51 | Kandidat Runde 2 (42 kaufbar) |
| rucksack damen | 4400 | 16.0 | 1308 | nicht geprüft (unter den Top 8 nach Volumen nicht dran) |
| wanduhr | 4400 | 16.0 | 23 | Kandidat Runde 2 (22 kaufbar) |
| wok | 4400 | 21.0 | 13 | 13 Treffer, Regel nicht gebaut |
| vr brille | 3600 | 28.0 | 15 | Seite «VR, AI & Neuheiten» nahe → SEO-Titel dort ergänzen |
| winterschuhe damen | 3600 | 19.0 | 21 | Kandidat Runde 2, mit winterstiefel damen (60) zusammen |
| abendkleid | 3600 | 29.0 | 93 | Kandidat Runde 2 (98 kaufbar, KD 29) |
| nachttischlampe | 3600 | 15.0 | 13 | «Tisch- & Schreibtischlampen» nahe → SEO dort |
| saugroboter | 3600 | 31.0 | 16 | Treffer sind Ersatzakkus/Zubehör |
| gps tracker | 3600 | 24.0 | 31 | verworfen: Klasse Abhör-Tracker (StGB 179sexies, 02.10.) |
| lunchbox | 3600 | 19.0 | 28 | Kandidat Runde 2 (36 kaufbar) |
| bracelet | 3600 | 23.0 | 18 | englisch, Armbänder-Seite vorhanden |
| concealer | 2900 | 19.0 | 36 | Make-up-Seite vorhanden (Kosmetik-Werbung nur Google-Regel) |
| bauchtasche | 2900 | 16.0 | 28 | Kandidat Runde 2 (28 lose) |
| schulrucksack | 2900 | 12.0 | 36 | Rucksäcke-SEO trägt «Schul-» |
| daunenjacke damen | 2900 | 16.0 | 16 | ✅ umgesetzt → /collections/winterjacken |
| in ear kopfhörer | 2900 | 21.0 | 13 | Kopfhörer-Seite vorhanden |
| bratpfanne | 2900 | 21.0 | 42 | Pfannen & Töpfe vorhanden |
| badeanzug damen | 2900 | 14.0 | 28 | Saison vorbei (Oktober), Bademode-Seite vorhanden |
| sonnenhut | 2900 | 17.0 | 12 | Saison vorbei; Caps & Hüte vorhanden |
| seifenspender | 2900 | 15.0 | 12 | Treffer sind Küchenbürsten |
| wandlampe | 2900 | 13.0 | 26 | Beleuchtung-Seiten vorhanden |
| blumentopf | 2900 | 21.0 | 13 | Treffer Stiftehalter u. ä. |
| stiefeletten damen | 2900 | 11.0 | 44 | Stiefel & Boots vorhanden → SEO-Titel dort um «Stiefeletten» ergänzen |
| hut | 2400 | 21.0 | 12 | Caps & Hüte vorhanden |
| wanderrucksack | 2400 | 15.0 | 48 | Sport- & Wanderrucksäcke vorhanden |
| wintermantel damen | 2400 | 14.0 | 12 | ✅ umgesetzt → /collections/winterjacken |
| schneidebrett | 2400 | 14.0 | 76 | Kandidat Runde 2 (80 kaufbar, Klingen-Ban drin) |
| anzug herren | 2400 | 23.0 | 31 | Treffer sind Pyjama-/Homewear-Anzüge |
| plaid | 2400 | 17.0 | 68 | Mehrdeutig (Karo-Muster vs. Decke) |
| aufbewahrungsbox | 2400 | 23.0 | 93 | Aufbewahrung-Seiten vorhanden |
| badeanzug | 1900 | 12.0 | 28 | Saison vorbei |
| bluetooth lautsprecher | 1900 | 21.0 | 54 | Lautsprecher & Boxen vorhanden |
| massagegerät | 1900 | 32.0 | 36 | Massage & Wellness vorhanden |
| schraubenzieher | 1900 | 17.0 | 13 | 13 Treffer, Werkzeug-Seite vorhanden |
| strandkleid | 1900 | 11.0 | 44 | Saison vorbei (44 Treffer, Kandidat Frühjahr) |
| rucksack herren | 1900 | 16.0 | 1308 | Rucksäcke vorhanden |
| lederjacke damen | 1900 | 13.0 | 17 | Kandidat Runde 2 (17 lose) |
| zierkissen | 1900 | 14.0 | 15 | Kissen-Seite vorhanden |
| sport bh | 1900 | 15.0 | 12 | POD-Ware (selbst gestalten) dominiert |
| handtuchhalter | 1900 | 15.0 | 14 | Badezimmer-Seite vorhanden |
| duschkopf | 1900 | 15.0 | 13 | Badezimmer-Seite vorhanden |
| fernbedienung | 1900 | 23.0 | 113 | Beigabe-Wort, keine Warenart |
| eyeliner | 1900 | 16.0 | 46 | Make-up vorhanden |
| pfeffermühle | 1900 | 21.0 | 12 | 12 Treffer, Küchenhelfer vorhanden |
| stiefeletten | 1900 | 14.0 | 44 | s. stiefeletten damen |
| armbanduhr | 1600 | 25.0 | 352 | Uhren-Seiten vorhanden |
| yoga matte | 1600 | 22.0 | 18 | Yoga & Fitness vorhanden |

Strenge Zählung (live, kaufbar + Google) der nicht umgesetzten Kandidaten: Etagere 14, USB-Stick 42, Wanduhr 22, Abendkleid 98,
Lunchbox 36, Schneidebrett 80, Haarglätter 158, Wandteppich 58. Kontaktbögen dafür gebaut, aber nicht angesehen
(Grenze «höchstens 8»). Nächste Runde: Abendkleider (3'600, KD 29, 98 Produkte) und USB-Sticks (4'400, 42) zuerst.

## 4 · Offen / Betreiber
- Nachmessung 08.10. (`resource_organic`): tauchen /collections/teppiche … in den Rankings auf? Google braucht Wochen.
- Nicht gemacht (anderer Bereich): SEO-Titel bestehender Seiten um Begriffe erweitern («Stiefeletten» in sub-stiefel-boots,
  «Nachttischlampe» in licht-tischlampe, «VR-Brille» in vr-ai-neuheiten).
- Semrush-Einheiten diese Runde: 800 (Budget 2'000).
