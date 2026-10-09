# Blog-Links & Bewertungen — Fix-12h Punkte 18 + 19 (05.10.2026, 04:50–05:25 UTC)

Alle Zahlen gemessen (Befehl → Zahl), nichts geschätzt. Bereich «blog-bewertungen» des 12-h-Fixlaufs.

## Punkt 18 — tote Links in Blogartikeln

### Messung vorher (zwei unabhängige Wege)
| Weg | Befehl | Ergebnis |
|---|---|---|
| Live (curl -L von unserer IP, Originalskript) | `nohup timeout 1800 python3 automation/blog_tote_links.py` (Probelauf, 334 Artikel, ~7 min) | **9 tote Ziele** (alle 9 = DRAFT-Produkte), 0 offen, 0 mit Zuordnung → «werden NICHT angefasst» (Skript kennt nur die Hand-Zuordnungen vom 14.08.) |
| Ursprung (Admin-API, neu) | `python3 automation/blog_linkziele_wache.py` | **10 tote Ziele in 11 Artikeln** (9 DRAFT-Produkte + 1 «fehlt»), 321 Ziele geprüft, 20 per Redirect lebendig |

Die 9 DRAFTs haben alle einen bewussten Grund (Tags): 4× `marge-verlust-draft`/`verlust-auto-draft`, 3× `cj-nicht-versendbar-ch`, 1× `cj-entfernt`, 1× ohne Grund-Tag (Cord-Hundebett, DRAFT 30.09.) → **kein Republizieren**, Links umbiegen.
Das 10. Ziel `/collections/ft-pluesch/ch-lager` war ein **Fehlalarm der neuen Wache**: Shopify-Tag-Filterroute (Kollektion + Tag), live 221 Artikel (WebFetch) — siehe «Fehler auf dem Weg».

### Geändert (Skript `scratchpad/blog_tote_links_fix.py`, Trockenlauf 13/13 Treffer → scharf, 11 Artikel geschrieben 05:08 UTC)
Fakten in neuen Kartentexten nur aus den Produktseiten (gemessen 05.10.). Ersatz = aktives, im Online Store veröffentlichtes Produkt desselben Typs, sonst Kategorie.

| Artikel | alt (DRAFT) | neu | Anker/Text |
|---|---|---|---|
| bluetooth-speaker-wasserdicht-outdoor-guide, thermosflasche-edelstahl-vorteile-vergleich | 25l-auto-kuhlbox-fur-unterwegs-631200 | tragbare-15l-kuhlbox-fur-camping-outdoor-619900 | «tragbare 15-Liter-Kühlbox» |
| geschenke-fuer-kaffeeliebhaber, weihnachtsgeschenke-2026-schweiz-ideen | handgewobene-wolldecke-635800 | wolldecke-mit-hahnentrittmuster-und-quasten-334336 | «Decke mit Hahnentrittmuster (CHF 20.90)» — bewusst «Decke», Produkt ist Polyacryl |
| minimalistisch-einrichten-wohnaccessoires | leinwandbild-im-massivholzrahmen-611000 | leinwandbild-weg-der-wahrheit-und-des-lebens-648192 | «Leinwandbild mit Holzrahmen (CHF 18.90)» |
| powerbank-kaufen-mah-schwindel-2026 | magnetische-3-in-1-wireless-powerbank-606500 | magnetische-10000mah-powerbank-mit-20w-967745 | Satz neu: «Fürs iPhone: … lädt kabellos und haftet per MagSafe am Handy» (kein 3-in-1 mehr im Sortiment) |
| wohn-ideen-herbst-2026 | geflochtener-aufbewahrungskorb-604900 | grosser-tragbarer-aufbewahrungskorb-611600 | «grosse Aufbewahrungskorb in Beige (ab CHF 29.90)» — nicht «geflochten» (Produkt: Kunststoff) |
| kratzbaum-kaufen-groesse-stabilitaet-sisal-ratgeber | Karte katzenkratzbaum-mit-sisalsaulen-65-cm-764866 | Karte kratzbaum-mit-kuschelhohle-099520 (CHF 89.90) | 40 × 40 × 54 cm, E1-Holz, Kratzstamm + Höhle — der Sisal-40-cm war schon als Karte da |
| hundebett-kaufen-oder-selber-bauen-ratgeber | Karte kuscheliges-cord-hundebett-6038af | Karte beruhigendes-hundebett-fur-sofa-wasserdicht-504578 (CHF 24.90) | kleine–mittelgrosse Hunde/Katzen, rutschfest, wasserdicht |
| hundebett-kaufen-oder-selber-bauen-ratgeber | Karte hundebett-mit-blachen-sonnendach-598849 | Karte hundebett-sofa-5ede8d (CHF 84.90) | erhöhter Liegeplatz, Polyester, S–XL |
| nagellack-entfernen-ohne-aceton-entsorgen | Karte abziehbarer-nagellack-…-823809 (Peel-off) | Karte 3-in-1-nagellackstift-5er-set-625700 (CHF 15.90) | kein Peel-off-Nagellack mehr aktiv (nur Peel-off-Lippenprodukte); Text: ohne UV-Lampe, Entfernen mit acetonfreiem Entferner |
| kuscheltiere-waschen-plueschtiere-ratgeber | /collections/ft-pluesch/ch-lager | **zurückgesetzt auf das Original** (05:19) | Filterroute war korrekt |

Umkehrbar: Vorher-Bodies `dropship/_blog_artikel_vorher_2026-10-05.json` (11 Artikel, 87'284 Zeichen); Ledger `dropship/_blog_tote_links.txt` (+11 Zeilen `artikel`, +1 `artikel-rueckgaengig`).

### Nachher
- Ursprung: `python3 automation/blog_linkziele_wache.py` → **0 tote Ziele** (318 Ziele, 334 Artikel, 20 Redirects) — zweimal gemessen (05:11 und 05:21 nach Filterrouten-Patch).
- Besucher-Sicht: WebFetch `/blogs/ratgeber/kratzbaum-kaufen-groesse-stabilitaet-sisal-ratgeber` zeigt 5 Karten mit neuen Preisen «(Stand 2026-10-05)», «Kratzbaum mit Kuschelhöhle» drin, 65-cm-Karte weg (nur noch im Bild-Untertitel des Headers genannt).
- Live nachher (Originalskript, Probelauf 05:13–05:20): `Artikel: 334 | tote Ziele live: 0 | ohne Antwort (offen): 0` — **9 → 0**.

### Nebenbefund → gleich behoben: veraltete Preise in Artikeln
Messung über alle 334 Artikel (Admin-API): **143 Preisangaben an 103 Produkten, 84 ausserhalb des Live-Preisbandes in 32 Artikeln** (54 tiefer als live = Leserin sieht einen Preis, den der Shop nicht hält; 28 höher). Ursache: Preissenkung 02.10., Preis-Verlustschutz, einmalig geschriebene Artikel.
Neues Werkzeug `automation/blog_preise_aktualisieren.py` (Trockenlauf → `SCHARF=1`): ersetzt die Zahl im Anker/der Karte durch den Live-Preis (eine Variante «CHF x», mehrere «ab CHF min»), zieht «(Stand JJJJ-MM-TT)» und «Preise Stand TT.MM.JJJJ» auf heute, fasst DRAFT/fehlende Produkte nicht an. Scharf 05:12: **84 korrigiert**, Nachmessung **0 abweichend**. Ledger `dropship/_blog_preise_ledger.tsv` (84 Zeilen alt→neu), Vorher-Bodies `dropship/_blog_preise_vorher/` (32 Dateien, 344 KB).
Auffällig grosse Sprünge (>50 %, 14 Stellen) — der Live-Preis gilt, aber zwei sind ein **Preis-Verdacht fürs Sortiment**: `herren-quarzuhr-mit-kalender-und-edelstahlarmb-626700` alle 3 Varianten CHF 15.90 (Artikel nannte 129.90), `kompakte-schmuckbox-mit-spiegel-602500` CHF 15.90 (Artikel 69.90). Beide ohne compareAt, updatedAt 30.09./02.10.

### Zweites Fertig-Kriterium (Artikel ohne Produktlink)
Plan nennt 231 (Zählung `seo_autopilot.py --messen`). Meine Wache zählt **247 Artikel ohne einen einzigen lebenden Produktlink** (andere Zählweise: auch Artikel, die nur Kollektionen verlinken). Der Tageslauf `seo_autopilot.py --auffrischen` (15/Tag) liegt im Aufseher — heute nicht angestossen (gehört dem Hauptlauf; Groq-Kontingent unklar).

## Punkt 19 — Judge.me: 12 Namen unmaskiert

Befund gelesen (`dropship/JUDGEME-WACHE.md`, 04.10. 21:17): 0 hart, **12 weich**, 1 ausgeblendet, 13'891/13'891 gelesen. Die 12 sind CJ-Nutzernamen (keine Klarnamen unserer Kunden): AliExpress Müşterisi (= «AliExpress-Kunde», türkisch — Lieferanten-Leak), Darksin (2×), Unishkhyaju, crugggzz, entiretyboutique, R3D2, Adeebay, jingan, jeaneneE, UKStyleStore, junru — alle 5★, alle über `cj-import…@luxestyle.ch` importiert, alle veröffentlicht.

**Kann die API den Namen ändern? Nein — zweimal gemessen (Token aus `/tmp/judgeme.env`, nie im Repo):**
1. `PUT /api/v1/reviews/1287667782` mit `reviewer.name = "R***2"` → HTTP 200 «Action performed successful», GET danach: name weiterhin «R3D2» (nur `curated` wird geschrieben, wie die Wache dokumentiert).
2. `PUT /api/v1/reviewers/2532875740` mit `name` → HTTP 200, aber **die Antwort war ein NEUER Reviewer** (id 2661593760, name «R***2», E-Mail `fulfilled_…@example.com` von Judge.me vergeben, external_id null); der echte Reviewer 2532875740 heisst weiterhin «R3D2». Mein `DELETE /reviewers/2661593760` wurde vom Berechtigungs-Klassifizierer blockiert → **Betreiber-Klick** (unten). Der Datensatz hängt an keiner Bewertung; ⚠️ Judge.me spiegelt Reviewer nach Klaviyo (Kommentar in `cj_reviews_import.mjs`) → dort könnte ein Profil `fulfilled_…@example.com` auftauchen.

Keine Bewertung ausgeblendet, gelöscht oder erfunden. Wache bleibt bei «12 Namen unmaskiert», bis der Betreiber entscheidet.

## Betreiber-Klicks
1. **Judge.me-Admin → Reviews**, die 12 IDs 1316672656, 1315625975, 1313874473, 1288261379, 1287668857, 1287667782, 1287641354, 1287640531, 1286443803, 1286443638, 1286441206, 1286441197 öffnen → Reviewer-Namen auf «Vorname N.»-Form kürzen (z. B. «R3D2» → «R.», «UKStyleStore» → «U. K.»), falls der Admin das Feld freigibt; sonst Entscheid Ausblenden («Hide») oder Freigabe (`dropship/_judgeme_freigabe.txt`, ID + Grund). Empfehlung: **1316672656 «AliExpress Müşterisi» mindestens ausblenden** (Lieferanten-Leak im Namen).
2. **Judge.me-Admin → Reviewers**: Streu-Datensatz id 2661593760 («R***2», `fulfilled_dx4n2vr7_r_2@example.com`) löschen — von mir versehentlich per API angelegt; dazu in Klaviyo prüfen, ob ein Profil mit dieser Adresse entstand, und es löschen.
3. Preis-Verdacht prüfen: Herren-Quarzuhr 626700 (CHF 15.90) und Schmuckbox 602500 (CHF 15.90) — Lieferpreis gegen Verkaufspreis.

## Fehler auf dem Weg (ehrlich)
- Die neue Wache meldete `/collections/ft-pluesch/ch-lager` als «fehlt»; ich prüfte die ersten 60 Produkte der Kollektion (alle `cj-real`, neueste zuerst) und schloss «CJ-Ware, kein CH-Lager» — falsch: 188 von 250 sind Fortura mit Tag `ch-lager`, die Filterroute zeigt live 221 Artikel. Ich hatte beide Links schon umgebogen (05:08) und habe sie um 05:19 zurückgesetzt (Ledger `artikel-rueckgaengig`); die Wache kennt jetzt Filterrouten (Kollektion veröffentlicht + ≥1 aktives Produkt mit dem Tag). **Lehre: eine Stichprobe «erste N» einer nach Datum sortierten Liste ist keine Stichprobe der Kollektion.**
- Der Judge.me-Reviewer-PUT legte statt zu ändern einen neuen Datensatz an (oben).
- Der Auto-Committer (5-Min-Loop) hat die neuen Dateien bereits in «CJ-Ledger auto»-Commits aufgenommen (aaffd5311, 12862f76d) — ich habe selbst weder committet noch gepusht.

## Nach 16:00 UTC (CJ-Punkte)
Nichts aus diesem Bereich braucht CJ.

## Nachbesserung 07:15–07:35 UTC (Prüferbefunde)
**Befund 1 — Untererfassung absolute Links.** `HREF_RE` (blog_linkziele_wache.py) und das `findall` in `blog_tote_links.py` (Z. 309)
lasen nur `href="/products/…"`; 49 Links in den Artikeln sind absolut (`https://luxestyle.ch/…`). Beide Regex jetzt
`href="(?:https?://(?:www\.)?luxestyle\.ch)?(/(?:products|collections)/[^"#?]+)` (Selbsttest: relativ, absolut, www, fremder Host → 4/4).
Erster Lauf der erweiterten Wache (07:20): **2 tote Ziele in 9 Artikeln, 344 Ziele** — der vom Prüfer gefundene absolute
Paar-Armband-Link UND neu `sternenhimmel-projektor-galaxy-led-nachtlicht-527681` (um 06:42 UTC vom CJ-Versandwächter
gedraftet, Tag `cj-nicht-versendbar-ch`, 8 Artikel; nach dem Prüferlauf 06:25 entstanden).
- Partner-Artikel: Abschnitt 3 neu «Geflochtene Armbänder» → `handgewobenes-amulett-armband-fur-paare-613700` (aktiv, CHF 21.90,
  Fakten Kordel/Rot oder Kaffeebraun/einzeln verpackt von der Produktseite); kein aktives Naturstein-Paar-Armband im Sortiment.
- 8 Sternenhimmel-Artikel → `sternenhimmel-projektor-cosmos-led-nachtlicht-240961` (aktiv, CHF 32.90, Fernbedienung/Timer/USB laut
  Produktseite); Texte ohne die alten Behauptungen (6 Melodien, 8 Lichtfarben, Bluetooth, Panda, «statt 60-80 bei anderen Brands»);
  im Lampen-Test ein zweiter Link auf die Kollektion `licht-nachtlicht-projektor` (181 Produkte, veröffentlicht).
- Skript `scratchpad/blog_nachbesserung_fix.py` (Trockenlauf 13/13 Treffer → scharf 07:25, 10 Artikel geschrieben), Ledger
  `_blog_tote_links.txt` +10 Zeilen (`nachbesserung-pruefer`), Vorher-Bodies `dropship/_blog_artikel_vorher_2026-10-05b.json`.

**Befund 2 — Nagellackstift-Karte.** «fünf Stifte im Set» + «ab CHF 15.90» (= Variante 1 Stück; 5er-Set CHF 24.90, 44 Varianten).
Karte neu: Titel «3-in-1 Nagellackstift · einzeln oder 5er-Set», Text «Einzeln oder als 5er-Set wählbar, der Preis je Variante
steht auf der Produktseite», Preiszeile «ab CHF 15.90» bleibt (ab = kleinste Variante). Produkt selbst (Multipack-Regel):
Titel «(5er-Set)» → «3-in-1 Nagellackstift · einzeln oder 5er-Set», Beschreibung 2 Sätze, SEO-Beschreibung (war Sie-Form),
6 verstümmelte Optionswerte («Farbton 19 · 5 Stück-1 Stück», «11to15 color-5pcs» …) → «Farbton 19-1 Stück», «Farbton 11–15-5 Stück» …;
alt/neu in `dropship/_nagellackstift_vorher_nachher_2026-10-05.json`.

**Nachher (gemessen):** Wache 07:28 `BLOG-LINKS: 0 tote Ziele in 0 Artikeln · 349 Ziele in 334 Artikeln · 21 per Redirect lebendig
· 237 Artikel ohne Produktlink`; `blog_preise_aktualisieren.py` Trockenlauf `BLOG-PREISE: 0 abweichend · 143 Preisangaben`;
absolute Produktlinks mit Preisangabe: 0 (A_RE des Preis-Aktualisierers braucht darum keine Erweiterung). WebFetch live:
Partner-Artikel zeigt den Amulett-Link, Nagellack-Karte den neuen Text, Produktseite den neuen Titel + Optionswerte,
`handgewobenes-amulett…` und `…cosmos…` HTTP 200.

**Fehler auf dem Weg:** `--scharf` versehentlich zweimal gestartet — zweiter Lauf schrieb nichts (0 Treffer), überschrieb aber
die Vorher-Dateien mit dem Nachher-Stand; aus den Rohdumps (`stern_artikel.json`, `alle_artikel.json` 06:23, Trockenlauf-Protokoll)
rekonstruiert (10/10 mit Alt-Marker). Lehre: Vorher-Datei nie überschreiben, wenn sie schon existiert.

## Nachtrag 09.10.2026, 20:15–20:30 UTC — Seidenkissenbezug (8 Artikel)

**GEMESSEN:** Ampel «BLOG-LINKS: 1 tote Ziele in 8 Artikeln». Das Ziel war `seidenkissenbezug-aus-100-maulbeerseide-128704`
(DRAFT; `besuchte_seiten_lieferbar` 4× «vom Lieferanten ausgelistet»). Verlinkt war es in: Silk-Pillowcase-Ratgeber,
9 Geschenkideen, Anti-Aging-Routine, Cashmere-Decke, Einschlaf-Ritual, Geschenkboxen, Geschenke für Frauen, Hochzeitsgeschenke.
Die Preise in den Artikeln waren schon uneinheitlich (CHF 21.90 bzw. 32.90).

**Ersatz-Auswahl:** 11 aktive Seidenkissen-Produkte angesehen. Gewählt wurde `doppelseitiger-seiden-kissenbezug-mit-reissver-1401d1`,
weil er **jede** Angabe der Artikel erfüllt: 100 % Maulbeerseide, 19 Momme, doppelseitig. Die anderen Kandidaten nennen kein
Momme oder sind einseitig.

**Befund am Ersatz:** Alle vier geprüften Kandidaten hatten im Shop **eine** Variante. Bei CJ haben sie aber mehrere:
- 1401d1: 48 Varianten (17 Farben × 3 Grössen)
- 600400: 13 Farben

Eine Bestellung über den Blog hätte der Bestell-Automat nicht ausführen können («manuell prüfen»).

**Getan:**
1. 1401d1 bei CJ gemessen (`LISTE=… auswahl_fehlt_messen.py`, Vorrang-Weg).
2. Auswahl nachgerüstet (`NUR_HANDLE=… auswahl_nachruesten.py`): Farbe (17) × Grösse (3), 48 Varianten, CHF 31.90–43.90 je
   nach Lieferantenkosten, Bilder je Variante.
3. Ein Makel aus dem Nachrüster behoben: CJ schreibt «Sky blue-51x66» ohne Einheit, deshalb standen «51×66 cm» und «51×66»
   nebeneinander. Die Variante wurde umgehängt, jetzt gibt es 3 Grössen.
   - An der Quelle: `auswahl_werte.einheit_angleichen()`. Masse ohne Einheit bekommen die EINE Einheit der Liste, aber nur,
     wenn dadurch keine zwei CJ-Varianten zusammenfallen.
   - 3 neue Kanarien, Selbsttest 52/52.
   - Bestand (Export 04:28, 51'805 Produkte): 0 weitere Fälle.
4. 8 Artikel umgeschrieben: href getauscht, Preis «ab CHF 31.90» (auch in der h3 «2. Seidenkissenbezug … — ab CHF 31.90»).
   Ergebnis 8/8, je Artikel zurückgelesen. Ledger `_blog_tote_links.txt`, Vorher-Bodies `_blog_preise_vorher/*_seide.html`.
5. Werkzeug fürs nächste Mal: `automation/blog_link_ersetzen.py` (ALT/NEU, trocken/`--scharf`, Blog-Lock, Live-Preis,
   Rücklesen, Vorher-Datei wird nie überschrieben). Der Kommentar der Wache zeigt darauf.

**Fehler auf dem Weg:** Mein Einzel-Trockenlauf `NUR_HANDLE=… auswahl_nachruesten.py` hat den Tagesbericht
`AUSWAHL-NACHRUESTEN.md` überschrieben, denn BERICHT hat einen Standardwert. Der Autocommitter hat den falschen Stand schon
committet. Wiederhergestellt aus `259f876f3^` und gepusht.

**Lehre:** Ein Ersatzprodukt muss zwei Prüfungen bestehen.
- Stimmen die Fakten im Text auch für den Ersatz?
- Ist es ohne Rückfrage bestellbar? Eine Variante im Shop gegen 48 bei CJ heisst nein.
