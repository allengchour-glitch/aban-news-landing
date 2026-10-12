# Geschenke-Einstieg, Google-Ads-Sperre, Pinterest-Stille — 12.10.2026 («weiter verbessern», Messrunde mit 5 Prüfern)

## 1. Geschenke-Einstieg (Hauptmenü Platz 1 «🎁 Geschenke & Weihnachten» → `/collections/premium-geschenke`)
**GEMESSEN:** Regel «Tag = geschenk» → 4'735 aktive (8'044 inkl. Entwürfe), neueste zuerst, Median der ersten 24 = CHF 16.90.
Oben: Gestrickter Blumenstrauss, Rosengesteck aus Garn, Hochzeitskleid-Modell, Mona-Lisa-Sisal, Schlüsselanhänger — die
CJ-Gruppe «cjpartydeko» stempelt `geschenk` auf jede Kategorie (dieselbe Klasse wie `weihnachten`, siehe WEIHNACHTEN-TAG).
Verlinkt von 49 Ratgeber-Stellen, 11 Seiten und 13 Geschenk-Kollektionen → **keine Preisgrenze ab CHF 50** (Ratgeber
«Männer-Geschenke unter 50 CHF» zeigt hierher), sondern Vielfalt.

**GETAN:**
- `geschenk_unterwelten.py` Welt «alle» (15 Warenarten reihum, CHF 19–150, Deckel Schmuck 80 / Uhren 60, nur Google-geprüfte
  Ware mit ≥ 2 Bildern) → 400 Produkte, MANUAL, erste 48 reihum. Aufseher führt das Werkzeug ohnehin täglich aus.
- Titel «Geschenkideen & Weihnachtsgeschenke», SEO-Titel/-Text deutsch (vorher «Premium Gifts kaufen»), Text mit Links auf die
  sieben Unterseiten (für Sie/Ihn/Kinder, bis CHF 30, Wichtel, Weihnachtsdeko, Adventskalender). Vorher-Stand:
  `dropship/_premium_geschenke_vorher.json`.
- **Kontaktbogen der ersten 24 (dreimal):** 12 schwache Karten → Veto-Liste `data/geschenk_veto.json` (gilt für alle Welten):
  Titel ≠ Bild («Herzanhänger» = Rose, «Blumen Topf Bausteine» = Drache, «Teeset» = Mönchsfiguren, «Sportliches Armband» =
  Uhr im Stil einer Luxusmarke), Lieferantencodes im Bild («KIT04B», «53#», «#13»), britischer Stecker, englischer Werbetext,
  Namens-Armbänder (wirken personalisierbar).
- **Wächter:** Die Gemini-Bildjury der Social-Poster (`gemini_jury.py`, Cache) entscheidet jetzt über die ersten 48 Plätze
  jeder Geschenkwelt: durchgefallen → nach hinten (bleibt in der Kollektion), kein Urteil → bleibt. Zeitdeckel 900 s je Lauf,
  danach nur gecachte Urteile.

## 2. Google Ads «0 Klicks» (Betreiber-Frage)
**GEMESSEN:** Kampagne «Sales-Shopping-1», Produktgruppe nur Label `werbetest` = Sirène. Sirène trägt bei Google
«Over capacity for Shopping ads (in CSS program) [CH]» → das Merchant-Konto hat mehr Produkte als Werbe-Kontingent in der
Schweiz; was darüber liegt, wird für Shopping-Anzeigen nicht verarbeitet (Google-Hilfe «Produkt-Kontingente»). Sitzungen
`utm_campaign=sirene-test`: 10.10. 23 (alle auf fremden Produkten, vor der Einschränkung), 11.10. 1, 12.10. 1.
**GETAN (Betreiber «umstellen»):** Label auf Aurora (keine Google-Meldung, 30/30 Varianten, CHF 69.90), bei Sirène gelöscht,
beides zurückgelesen. Ampel misst jetzt die Google-Meldung am Testprodukt und die Sitzungen gestern+heute; ein Startdatum in der
Zukunft beendete vorher die ganze Ampel (ShopifyQL «UNTIL vor SINCE»). **Offen (Betreiber):** Kontingent erhöhen lassen.

## 3. Pinterest stand 67 h still
**GEMESSEN:** Am 11.10. 22:24 lehnte die Gemini-Jury alle 5 Kandidaten ab (Halloween-Titel passten nicht zum Bild), der Poster
gab Exit 0, der Autopilot setzte die 48-h-Marke. **GETAN:** 25 Kandidaten (Urteile gecacht), Exit 3 «kein Kandidat», neuer
Versuch nach 2 h; ein Pin danach geplant (Halloween-Korsett-Kleid, 20:29 Zürich).

## Befehle
```
python3 automation/geschenk_unterwelten.py                 # Trockenlauf aller Welten
NUR=alle SCHARF=1 python3 automation/geschenk_unterwelten.py
JURY=0 …                                                   # ohne Bildjury
python3 -c "import sys;sys.path.insert(0,'automation');import betreiber_ampel as b;print(b.werbetest())"
```

## Nachtrag 12.10. spät: alle Geschenk-Seiten kuratiert und per Bild geprüft

- **Lauf:** `geschenk_unterwelten.py` über alle 11 Welten (sie, ihn, kinder, unter30, wichtel, alle, unter50, unter100, preishits, hochzeit, sets). Die Gemini-Jury warf 263 + 85 Kandidaten von den ersten 48 Plätzen.
- **Falle (GEMESSEN):** Nach dem Umstellen der Regel von «Preis < 50» auf «Tag geschenkwelt-…» rechnet Shopify die Kollektion asynchron neu. Bei «unter 50» stand der Zähler 5 Minuten später noch bei 36'317, bei «unter 100» bei 51'425. Die Reihenfolge, die in dieser Phase gesetzt wurde, galt auf dem alten Bestand: Der Kontaktbogen zeigte Messing-Kugelhahn, Crimpzange und Schuhe. **Lösung:** nach dem Konvergieren (400/400/400/189/217) die Reihenfolge ein zweites Mal setzen. Das Warten im Skript (20 × 15 s) reicht für grosse Kollektionen nicht.
- **«Sets & Bundles»:** von 2'826 Titel-Treffern («-set», «teilig») auf 217 kuratierte Sets (beauty ≤ 60, Geschenksets, Schmuck, Tee, Bettwäsche).
- **Kontaktbogen der ersten 24 je Seite, 21 neue Vetos** (`data/geschenk_veto.json`, jetzt 35):
  - Englischer oder chinesischer Text im Bild («pillowcase», «2pcs», «HD screen E88PRO», «1 gold hairband», Massangaben)
  - Adventskalender «National Parks … 2025» (falsches Jahr)
  - Fremdmarken (HiVi, DUNUF, WISE HAWK)
  - «Hot Wheels» im Titel
  - Doppelbild (Riesen-Weihnachtsmütze)
  - Stoff ab Meter als Hochzeitsgeschenk
- **Nebenfund «Hot Wheels» → Klasse:**
  - `marke_als_ware_regel.json` kennt jetzt auch Spielzeugmarken: Hot Wheels, Barbie, Mattel, Hasbro, Nerf, Playmobil, Paw Patrol, Peppa Pig, Minecraft, Fortnite, Roblox. Lizenzware von Fortura bleibt über das SKU-Präfix frei.
  - Prüfung: Kanarien 63/63, Python und JS urteilen gleich über 53'418 Titel.
  - Die 2 Treffer zeigen auf keinem Bild eine Marke. Deshalb nur umbenannt («Dreifach-Messbecher für Cocktails (15 / 22,5 / 28 ml)», «Drift Board – 2-Rad-Freestyle-Skateboard»), nicht gedraftet.
