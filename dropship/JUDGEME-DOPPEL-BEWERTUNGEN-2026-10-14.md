# Doppelt importierte Bewertungen ausgeblendet (14.10.2026, Verbesserungsrunde 20:25 UTC)

## GEMESSEN vorher
- Die Messrunde (Workflow wf_3c125add-ef9, 5 Messer und Gegenproben) fand **296 Doppel unter 11'513 veröffentlichten
  Bewertungen auf 67 Produkten** (Gegenprobe über den ganzen Bestand). Auf den 59 aktiven davon waren **277 von 591 Bewertungen
  Kopien (47 %)**. Beispiele:
  - Teleskop-Organizer: 10 Bewertungen = 5 Kommentare, zweimal eingestellt
  - Laufshirt: 17 Bewertungen = 5 + 6 + 6 aus drei Läufen
  - Hunde-Winterjacke: 24 Bewertungen = 8 × 3
- Herkunft der Doppel:
  - Sie stammen von 12 Tagen zwischen 29.08. und 08.10. Schwerpunkte sind der 21.09. (68) und der 22.09. (169). Alle 169 Doppel
    vom 22.09. entstanden **nach** der Reparatur vom 21.09.
  - Zwei Zeitmuster: Kopien unter 60 s nach der Vorlage (zwei Instanzen gleichzeitig) und Kopien nach 10 min bis 3 h
    (Wiederholungsläufe).
- **Wirkung:** `reviews.rating_count` geht im Theme als `ratingCount`/`reviewCount` in die strukturierten Daten
  (sections/product-information.liquid). Kundinnen und Google sahen eine aufgeblähte Zahl. Das verstösst gegen die Hausregel
  «nie Fake-Bewertungen» (UWG Art. 3), denn eine Kopie zählt dieselbe Stimme doppelt.
- **Ursache:** `cj_reviews_import.mjs` prüfte vor dem POST nur sein lokales Ledger, nie Judge.me selbst. Zwei Instanzen oder
  ein verlorenes Ledger (Snapshot-Rewind) posteten dieselben CJ-Kommentare neu übersetzt noch einmal. Kein Wächter zählte Doppel.
  Der Stopp vom 12.10. (`dropship/_bewertungen_stopp.txt`) verhindert nur neue Importe.

## GETAN
1. **Wächter `automation/judgeme_doppel_wache.py`** (Regel im Skriptkopf, Selbsttest 14/14):
   - Erfasst werden nur Bewertungen mit Importer-Adresse; echte Kundenbewertungen bleiben unberührt.
   - **Lauf** = Zeitstempel höchstens 3 s auseinander.
   - **Kopie:** späterer Lauf, gleiche Sterne, Ähnlichkeit ≥ 0,6 (difflib in beide Richtungen, autojunk aus).
     Die Paare werden nach bestem Treffer zugeordnet, eine Kopie je Gruppe und Lauf.
   - Der Lauf muss als Wiederholung erkennbar sein. Ein-Bewertungs-Läufe zählen nur bei Ähnlichkeit ≥ 0,9 oder mindestens 12 Zeichen.
   - Von jeder Gruppe bleibt die früheste **veröffentlichte** Bewertung stehen.
   - Ausgeblendet wird per `PUT curated=spam` und danach zurückgelesen.
   - Bremsen: höchstens 8 % des Bestands, höchstens 400 je Lauf, Kanarienvogel (erste Ausblendung wird geprüft), Abbruch nach
     3 Fehlschlägen.
   - Freigabe-Datei `dropship/_judgeme_doppel_freigabe.txt`, Ledger `dropship/_judgeme_doppel.tsv`, Tagesbericht
     `dropship/JUDGEME-DOPPEL.md`.
2. **Eichung gegen die Wahrheit** (Workflow wf_45efc012-356). Den Autornamen gibt es nur im Widget-Metafeld
   `judgeme.review_widget_ssr_html`; in der API tragen 690 von 709 Bewertungen den Namen «C***t».
   - Erste Regel: 272 von 273 richtig gepaart, keine echte Stimme verloren.
   - Die Prüfer fanden 5 Schwächen, alle behoben und als Selbsttest-Fälle aufgenommen:
     - autojunk machte Texte über 200 Zeichen unvergleichbar
     - 8 s Lücke liess zwei Läufe verschmelzen
     - Zuordnung in Zeitreihenfolge statt nach bestem Treffer
     - keine Sperre für echte Kunden
     - der Bericht meldete «vollständig» trotz Seitendeckel
   - **Neue Regel: 299 von 299 prüfbaren Kopien autorengleich, 0 falsch.** Paare innerhalb eines Laufs: 6 von 6 prüfbaren von
     verschiedenen Autoren. Dort wird deshalb nie ausgeblendet, sie stehen nur im Bericht.
3. **Ausgeblendet: 310 Kopien auf 66 Produkten** (Lauf 22:57–23:06 UTC). Alle 310 zurückgelesen mit `published=false`,
   `curated=spam`, 0 Fehlschläge.
4. **Importer-Tor** (`automation/cj_reviews_import.mjs` + `automation/lib/review_doppel.mjs`, Test `lib/review_doppel_test.mjs` 16/16):
   - Vor dem Posten liest der Importer **alle** Judge.me-Bewertungen dieses Produkts, auch ausgeblendete.
   - Er überspringt jeden Kommentar mit gleichen Sternen und ähnlichem Text (Trigramm-Dice ≥ 0,5, Original **und** Übersetzung).
   - Ist Judge.me nicht lesbar, wird nichts gepostet und nichts quittiert.
   - Eine Lauf-Sperre (O_EXCL, argv-geprüft) lässt nur eine Instanz zur Zeit laufen.
   - Der STOPP-Schalter bleibt oben wirksam. Das Tor gilt für den Tag, an dem der Betreiber ihn aufhebt.
5. **Aufseher:** `fixer_keepalive.sh` startet die Wache täglich mit `FIX=1` (START/FERTIG, `still_gestorben`, flock) und meldet
   eine Zeile «JUDGEME-DOPPEL: …», mit ⚠️ bei «unklar» oder STOPP.

## NACHGEMESSEN
- Judge.me selbst (veröffentlichte Bewertungen und Widget-Zahl, sofort):
  - Laufshirt 17 → **6**
  - Hunde-Winterjacke 24 → **8**
  - Teleskop-Organizer 10 → **5**
- **Shopify übernimmt es von selbst:** Judge.me schrieb `reviews.rating_count`, `reviews.rating` und das Widget-Metafeld
  `judgeme.review_widget_ssr_html` rund 2 Minuten nach dem Lauf neu (Laufshirt 23:08:35 UTC: 6, Ø 4,5).
- **Alle 66 Produkte nachgemessen (Admin-API, 23:20 UTC):**
  - Bei 64 ist `reviews.rating_count` = veröffentlichte Judge.me-Bewertungen ohne Kopien.
  - Summe veröffentlicht 631 → **332**. 60 der 66 Produkte sind aktiv.
  - Zwei Produkte zählen bei Shopify mehr als im Lese-Dump: 15450851148161 (6 statt 3) und der Augenbrauen-Epilierer
    15450851967361 (10 statt 2). Dort stehen alte Bewertungen mit 5★, die die API nicht herausgibt (siehe OFFEN). Shopify ist
    dort die richtige Zahl, nicht der Dump.
- Damit stimmt die Zahl in den strukturierten Daten für Google (ratingCount aus `reviews.rating_count`) wieder mit dem Bestand.

## OFFEN
- **1'283 Bewertungen mit 5★ vor dem 29.08. nicht lesbar.**
  - Die API klemmt `page` bei 100 und ignoriert jede Sortierung.
  - Die Bewertungen tragen je eine eigene Platzhalter-Adresse (bis 04.09. `cj-import+<zufall>@`), deshalb hilft das Zerlegen
    nach Rezensent nicht.
  - Weg: Shopify-Bulk-Export von `reviews.rating_count` und je Produkt mit Zählung > gelesen über `product_id` nachlesen.
  - Die Eichung fand dort mindestens 4 Doppel (Augenbrauen-Epilierer).
- **Kurze Umschreibungen unter 0,6** («Hervorragend.» ↔ «Ausgezeichnet.») bleiben stehen. Das ist eine bekannte Lücke.
- **Nebenbefund für den Betreiber: 2'904 Bewertungen sind ausgeblendet (`curated=spam`), 2'895 davon mit 1–3★, 2'842 vom
  24.09. (Nachhol-Lauf).**
  - Veröffentlicht sind nur 295 Bewertungen mit 1–3★, gegenüber 11'218 mit 4–5★. Das ist eine Rosinenauswahl.
  - Ursache vermutlich die Judge.me-Einstellung «nur 4–5★ automatisch veröffentlichen». Nicht geprüft, Entscheid Betreiber.
  - Zusammen mit dem offenen Bewertungs-Stopp vom 12.10. gehört das in denselben Entscheid.
- `bewertungen_nachholen.sh` sucht «^Fertig», der Importer schreibt seit 08.10. «FERTIG:». Das ist harmlos, solange der Stopp gilt.
