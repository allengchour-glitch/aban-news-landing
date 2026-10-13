# Werbetest A «geschenke-test»: Vorbereitung (13.10.2026, 21:20 UTC)

**Stand:** nur gemessen und gelesen. Keine Kampagne aktiviert, kein Produkt geändert, `dropship/_werbetest_aktiv.json` unverändert
(steht weiter auf `sirene-test`, pausiert). `dropship/BETREIBER-ENTSCHEIDE-2026-10-13.md` vermerkt «A ja» (~21:00 UTC). Der Auftrag
dieser Vorbereitung lautete trotzdem «Budget-Entscheid steht aus». Umgestellt wird deshalb erst im nächsten Schritt.
Grundlage: Richter «mehr Käufer» Abschnitt 4A (`dropship/MEHR-KAEUFER-2026-10-13.md`).

> **Nachtrag 13.10. ~22:40 UTC — scharf vorbereitet (Sitzung).** `dropship/_werbetest_aktiv.json` steht jetzt auf
> `geschenke-test` (Start 14.10., Ende 21.10., CHF 10/Tag, Marge 21, Abbruch CHF 30 ohne Warenkorb, 13 `handles`).
> Die Schreibsperre ist umgesetzt: `dropship/_werbetest_sperre.txt` (13 IDs, Ende 24.10.), gelesen von
> `automation/werbetest_sperre.py` / `automation/lib/werbetest_sperre.mjs` in `cj_specs_backfill.mjs`, `auswahl_nachruesten.py`,
> `geschenk_unterwelten.py`, `hype_kuratieren.py`, `nachfrage_liebling.py`, `variantenwert_ki.py` (Abschnitt 10).
> Das Selbsttest-Tor von `variantenwert_ki.py` ist repariert (Abschnitt 8). Klickweg: Abschnitt «Für den Betreiber» unten.

## 1. Kurzfassung

1. **13/13 aktiv, 13/13 im Kanal «Google & YouTube», 0/13 mit einer Meldung für CH** (GEMESSEN 21:05 UTC, `product.feedback`).
   Zwei Produkte tragen nur eine Meldung für **LI** («Missing shipping info … [LI]»: Elegante Damenuhr, Ladestation). Für eine
   Kampagne «Schweiz» spielt das keine Rolle.
2. **Es sind 39 Artikel-IDs. `ZZ` ist das echte Länderkürzel, kein Platzhalter.** Die App «Google & YouTube» gibt seit Shopify
   Markets `shopify_ZZ_<Produkt-ID>_<Varianten-ID>` aus. Belege: Merchant-Export vom 31.08. (`GEDAECHTNIS-JOURNAL.md`, Abschnitt
   «Merchant-Export Over capacity»), die Google-Ads-Artikelliste vom 10.10. für Sirène (`shopify_zz_15412915110273_…`, 8 Stück,
   `WERBETEST-PLAN-2026-10-10.md`) und die Doku von Feed-Anbietern (Quellen unten). Die Varianten-IDs sind live neu gelesen und
   stimmen 13/13 mit der Liste von 20:15 UTC überein.
3. **Kein Produkt trägt einen `hype-seit-*`-Tag.** Bis 25.10. läuft also bei keinem ein Hype-Tag ab. Die Ladestation passt auf
   kein Hype-Thema (Regex geprüft), und der tägliche Hype-Lauf räumt nur ab (`NUR_RAEUMEN=1`).
4. **Ohne Sperre wird geschrieben.** 95 % der 933 aktiven Geschenk-Produkte hatten in den letzten 7 Tagen ein neues `updatedAt`,
   100 % in 14 Tagen (GEMESSEN). Von den 13 wurden 11 in den letzten 30 h geschrieben, die meisten vom Geschenke-Welten-Lauf
   am 12.10. zwischen 19 und 22 UTC.
5. **Ein Schreibvorgang wirft ein Produkt nicht sicher aus der Werbung.** Trotz der 11 Schreibvorgänge hat heute keines der 13
   «Over capacity [CH]». Sirène stand am 12.10. auf «Over capacity» und ist heute frei. Aurora (geschrieben 13.10. 09:18) steht
   weiter drauf (GEMESSEN). Jeder Schreibvorgang ist offenbar ein neuer Zug um das Kontingent (VERMUTUNG). Die Sperre senkt
   das Risiko, sie garantiert nichts.
6. **Sicher geplant in den nächsten 7 Tagen:** `cj_specs_backfill.mjs` trägt den Faktenblock nach, zuerst beim Silberarmband
   (frühestens 14.10. abends), danach Elegante, Sonne & Mond, Holzuhr und Moissanit. **Vom Test selbst ausgelöst:**
   `auswahl_nachruesten.py` baut bei 18K, Retro und Silberarmband Varianten an, sobald Werbeklicks sie zu «besuchten Seiten»
   machen.
7. **Text der Übersetzungs-Kopfhörer:** keine Heil-, Garantie- oder Nr.-1-Aussage. Restrisiko: das Funktionsversprechen
   «sofortige Sprachübersetzung» ohne Hinweis auf eine App. Kein Ausschlussgrund (Abschnitt 7).

## 2. ID-Liste zum Einfügen (39 Zeilen)

Google Ads → Kampagne «Sales-Shopping-1» → Produktgruppen → «Alle Produkte» nach **Artikel-ID** unterteilen → diese 39
einschliessen und «Alles andere» **ausschliessen**. Die Kleinschreibung entspricht der Ads-Liste vom 10.10. Im Merchant Center
heissen dieselben Artikel `shopify_ZZ_…`. Ob Ads beim Einfügen Gross- und Kleinschreibung unterscheidet, ist nicht belegt.
Sicher ist: Taucht beim Einfügen eine ID nicht als «gefunden» auf, sucht man sie in der Liste über die Produkt-ID (Ziffern).

```
shopify_zz_15450839286145_55889836212609
shopify_zz_15450839286145_55889836245377
shopify_zz_15450839286145_55889836278145
shopify_zz_15450839286145_55889836310913
shopify_zz_15450839286145_55889836343681
shopify_zz_15450839286145_55889836376449
shopify_zz_15450839286145_55889836409217
shopify_zz_15450839286145_55889836441985
shopify_zz_15450839286145_55889836474753
shopify_zz_15454132961665_55907626090881
shopify_zz_15449444057473_56054887448961
shopify_zz_15449444057473_56054887481729
shopify_zz_15455791907201_56069355995521
shopify_zz_15455791907201_56069356028289
shopify_zz_15455791907201_56069356061057
shopify_zz_15455791907201_56069356093825
shopify_zz_15480824037761_56005007442305
shopify_zz_15454414111105_56067446145409
shopify_zz_15454414111105_56067446178177
shopify_zz_15454414111105_56067446210945
shopify_zz_15454414111105_56067446243713
shopify_zz_15454414111105_56067446276481
shopify_zz_15454414111105_56067446309249
shopify_zz_15454414111105_56067446342017
shopify_zz_15454414111105_56067446374785
shopify_zz_15495239106945_56087393239425
shopify_zz_15497460810113_56099968450945
shopify_zz_15465984491905_55951570862465
shopify_zz_15449430851969_55881785901441
shopify_zz_15412915110273_55747898114433
shopify_zz_15412915110273_55747898147201
shopify_zz_15412915110273_55747898179969
shopify_zz_15412915110273_55747898212737
shopify_zz_15412915110273_55747898245505
shopify_zz_15412915110273_55747898278273
shopify_zz_15412915110273_55747898311041
shopify_zz_15412915110273_55747898343809
shopify_zz_15493830443393_56080322724225
shopify_zz_15453601890689_55903191204225
```

Für den Screenshot vor dem Einschalten gilt: 39 Zeilen «eingeschlossen» und 1 Zeile «Alles andere: ausgeschlossen». Am 10.10.
war es genau umgekehrt.

## 3. Messung je Produkt (GEMESSEN 13.10. 21:05 UTC)

| # | Produkt | Produkt-ID | Var. | Preis | Status | Google-Kanal | Meldung CH | sonstige Meldung | `updatedAt` | hype-Tag |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Mechanische Skelett-Herrenuhr | 15450839286145 | 9 | 86.90 | ACTIVE | ja | keine | – | 13.10. 04:42 | – |
| 2 | Elegante Quarz-Armbanduhr Damen | 15454132961665 | 1 | 71.90 | ACTIVE | ja | keine | Missing shipping info [LI] | 05.10. 05:02 | – |
| 3 | Herren-Geldbörse Leder | 15449444057473 | 2 | 75.90 | ACTIVE | ja | keine | – | 12.10. 21:48 | – |
| 4 | Herrenholzarmbanduhr | 15455791907201 | 4 | 56.90 | ACTIVE | ja | keine | – | 12.10. 21:47 | – |
| 5 | Bluetooth Übersetzungs-Kopfhörer | 15480824037761 | 1 | 38.90 | ACTIVE | ja | keine | – | 12.10. 19:13 | – |
| 6 | Herrenuhr «Sonne & Mond» | 15454414111105 | 8 | 41.90 | ACTIVE | ja | keine | – | 12.10. 21:48 | – |
| 7 | Damenuhr Strass-Zifferblatt | 15495239106945 | 1 | 48.90 | ACTIVE | ja | keine | – | 12.10. 21:36 | – |
| 8 | Quadratische Damenuhr 18K | 15497460810113 | 1 | 46.90 | ACTIVE | ja | keine | – | 12.10. 21:44 | – |
| 9 | Moissanit-Ring 925 | 15465984491905 | 1 | 31.90 | ACTIVE | ja | keine | – | 12.10. 19:07 | – |
| 10 | 3-in-1 Falt-Ladestation | 15449430851969 | 1 | 34.90 | ACTIVE | ja | keine | Missing shipping info [LI] | 06.10. 20:34 | – |
| 11 | Abendkleid «Sirène» | 15412915110273 | 8 | 49.90 | ACTIVE | ja | keine (12.10.: Over capacity) | – | 13.10. 04:47 | – |
| 12 | Retro-Damenuhr | 15493830443393 | 1 | 44.90 | ACTIVE | ja | keine | – | 12.10. 21:50 | – |
| 13 | Silberarmband | 15453601890689 | 1 | 45.90 | ACTIVE | ja | keine | – | 12.10. 21:47 | – |

Bei allen 13 gilt: alle Varianten `availableForSale`, Policy CONTINUE, nicht bestandsgeführt, kein `excluded_destination`, kein
`custom_label_0`, zwischen 5 und 20 Bildern. Die Google-Kategorie ist jeweils schon ein Endzweig (Watches, Wallets, Headphones,
Rings, Bracelets, Power Adapters & Chargers, Dresses).
Mit der Formel von `verkauf_gewinn_wache.py` liegt der Gewinn je Verkauf zwischen CHF 16.63 (Silberarmband) und 30.60
(Elegante). Gerechnet ist mit dem höchsten EK und 15 % Rabattreserve.

## 4. Ausschlüsse

| Produkt | Grund |
|---|---|
| Spot UV-Sterilisator (15500372771201) | `hype-seit-2026-09-23`: läuft nach 21 Tagen am **14.10.** ab. `hype_kuratieren` nimmt dann `hype-jetzt` weg, also ein Schreibvorgang zum Teststart. Dazu enthält der Text «Sterilisation» (Gesundheitsbezug). |
| Selfie-Stick mit Ringlicht (15480830755201) | `hype-jetzt` und `hype-seit-2026-10-13`, geschrieben heute 07:33. Der Ablauf am **03.11.** liegt zwar ausserhalb des Fensters. Hype-Ware hat aber einen zusätzlichen täglichen Schreibweg: `reviews_hype_lauf.sh` holt CJ-Bewertungen zu Judge.me, und das schreibt Metafelder. Der Ausschluss des Richters bleibt. |

Von den 13 schliesse ich keines aus. Es gab weder eine CH-Meldung noch einen Richtlinienverstoss oder eine Preisfalle. Die
Schreib-Risiken stehen in Abschnitt 5. Das höchste trägt das **Silberarmband**: zwei geplante Strukturänderungen, Faktenblock
und Auswahl. Ohne Sperre wird es wahrscheinlich schon in den ersten zwei Testtagen geschrieben.

## 5. Läufe, die diese Produkte in den nächsten 7 Tagen ändern würden

Gelesen habe ich die Startliste des Aufsehers (`automation/fixer_keepalive.sh`, 216 Skripte, davon etwa 130 mit Schreib-Mutationen)
und die Auswahlregeln der Läufe, die zu Uhren, Schmuck, Lederwaren, Elektronik oder Kleidern passen. Wo möglich habe ich die
Auswahl gegen den Live-Stand gerechnet. Nicht jeder der rund 130 Schreiber ist Zeile für Zeile gelesen. Ein Restrisiko bleibt.

### 5a. Geplant, mit Zeitpunkt

| Lauf | Takt | betroffen | voraussichtlich | schreibt | Beleg |
|---|---|---|---|---|---|
| `cj_specs_backfill.mjs` (Faktenblock aus CJ-Daten) | alle 12 h, `LIMIT=400`, Prio-Liste der Reihe nach | Silberarmband (offen Pos. 499), Elegante (2'831), Sonne & Mond (3'362), Holzuhr (4'327), Moissanit (5'670); dahinter Kopfhörer (9'188), Retro (12'565), 18K (18'360), Ladestation (41'242), Geldbörse (41'394) | nächster Lauf frühestens 14.10. ~09:00 (Pos. 1–400), dann 12-stündlich je 400 → Silberarmband ~14.10. abends, Elegante ~17.10., Sonne & Mond ~18.10., Holzuhr ~19.10., Moissanit ~21.10., Kopfhörer ~25.10. (VERMUTUNG: Takt wie letzter Lauf, «geprüft 400 · gesetzt 301», endete 20:56) | `productUpdate(descriptionHtml)`. Der Block «Produktdetails» wird angehängt | `dropship/_cj_specs_prio.txt` minus `_cj_specs_done.txt` live gezählt: 42'009 offen. Skelett und Sirène sind schon erledigt, die Strass-Uhr steht nicht in der Prio-Liste |
| `geschenk_unterwelten.py` (Tags `geschenkwelt-*`) | täglich, scharf | potenziell alle 12 Geschenk-Produkte | heute 13/13 unverändert. Die Welten stehen am Deckel von 400 Produkten, Neuimporte mit mehr Bildern können verdrängen (VERMUTUNG) | `tagsAdd`/`tagsRemove` | Trockenauswahl `auswahl()` gegen den Export vom 13.10. 00:38, verglichen mit den Live-Tags |

### 5b. Vom Test selbst ausgelöst (Besuch, Warenkorb, Verkauf)

| Lauf | Auslöser | betroffen | schreibt | Bewertung |
|---|---|---|---|---|
| `auswahl_nachruesten.py` (stündlich, CAP 150) | Ein Werbeklick macht die Seite zur «besuchten Seite». `auswahl_besucht_liste.py` baut die Vorrangliste neu, sobald sie älter als 20 h ist, und das Produkt rückt im nächsten Lauf nach vorn | 18K (CJ 2 Varianten), Retro (CJ 4), Silberarmband (CJ 30). Elegante steht bis ~19.10. in `_auswahl_manuell.tsv` (KI-Übersetzung abgelehnt). Ohne Besuch liegen sie auf Pos. 2'048 / 1'485 / 1'316 von 2'977 und wurden seit 10.10. nicht erreicht | `productOptionsCreate` mit neuen Varianten, dazu Preise, Bilder und Metafelder | **Hoch.** Die ursprüngliche Varianten-ID bleibt (Rückbau-Logik im Skript), sie bleibt also im Test. Neue Varianten haben neue IDs, die NICHT in der Liste stehen. Bei Ausfall nicht nachtragen (Richter-Regel) |
| `nachfrage_liebling.py` (täglich) | ≥ 2 Warenkorb-Sitzungen oder 1 Kassen-Sitzung in 90 T | jedes der 12 ohne den Tag (Sirène hat ihn schon) | `tagsAdd nachfrage-liebling` | Ein Erfolg des Tests schreibt also das Produkt. Danach zieht `social_saison_vorrang` es in die Social-Queues |
| `besuchte_seiten_lieferbar.py` (täglich) | Besuch | alle | (1) Fragt bei CJ, ob in die CH geliefert wird. DRAFT erst nach zweimal NEIN mit zeitlichem Abstand. (2) «Politur»: du-Form-Umbau und Prio-Eintrag für den Faktenblock | (1) nicht ausnehmen, Lieferbarkeit geht vor. (2) `um()` ändert 0/13 (GEMESSEN). Bei der Strass-Uhr entstünde nur ein Prio-Eintrag am Listenende, kein Shop-Schreiben |
| `cj_lager_abgleich.py` (00:00–01:30 UTC) | CJ-Bestand einer Variante = 0 | Skelett, Geldbörse, Holzuhr, Sonne & Mond, Ladestation, Sirène (die anderen 7: «keine-cj-sku», werden nicht geprüft) | Variante auf DENY | nicht ausnehmen. Ausverkauft muss ausverkauft zeigen |
| `verkauf_gewinn_wache.py` | bezahlter Verkauf | alle | Preis heben | **0/13 würden gehoben.** Mit `ziel_preis()` aus dem Skript nachgerechnet, der Zielpreis liegt überall unter dem heutigen Preis |
| `gfeed_anstupsen.py` | Google meldet «Product page unavailable» | – | Tag | heute 0/13 |

### 5c. Geprüft, heute kein Schreibvorgang zu erwarten

- `hype_kuratieren.py`: läuft täglich mit `NUR_RAEUMEN=1`, aufgenommen wird nur in betreuten Sitzungen. 0/13 treffen ein Thema.
  Das Thema «Ladestation 3-in-1» verlangt `\d-in-\d … Ladestation` direkt hintereinander. Der Titel lautet aber
  «3-in-1 Magnetische Falt-Ladestation».
- `such_boost.py`: Familien «Geschenk für Frau/Mann» = Top 8 von `geschenke-fuer-sie/-ihn`. Von unseren Produkten steht dort nur
  18K, auf Platz 24 in «für Sie». Damit wird nichts gesetzt.
- `google_ads_kuration.py`: schliesst nur Produkte mit 1 Bild, unter CHF 19 oder Spielware von Shopping-Ads aus. Trifft 0/13.
- `preis_verlustschutz.py`, `preisboden.py`, `verlustbringer.py`: die Marge reicht (Abschnitt 3).
- `variantenwert_ki.py`: Sonne & Mond wäre Kandidat («Gold Black Noodles», «… Surface» = englisch, `braucht_ki` = True). Der Lauf
  **steht seit 09.10. still**: Das Selbsttest-Tor bricht mit exit 1 ab, weil `auswahl_werte.selbsttest()` `True` zurückgibt und
  das Tor `not b` verlangt (GEMESSEN). Repariert jemand das Tor, ist Sonne & Mond früh dran, denn besuchte Seiten kommen zuerst.
- `farbcode_praefix.py`: hat Sonne & Mond am 10.10. bearbeitet und am 10./11.10. zweimal «live nichts zu tun» gemeldet.
- `farbcode_modell.py`: ändert die Werte nicht (Skelett «A…J», Holzuhr «Modell 1–4»). Mit `neu_werte()` gerechnet.
- `masstabelle_schreiben.py`: Sirène «keine Masstabelle gefunden», Sicherheit hoch (`_masstabellen.json`).
- `wahlversprechen.py` (täglich `FIX=1`, Arbeitsliste): Retro steht auf der Liste, das Ledger zeigt aber keine Bereinigung. Der
  Satz wird nur gemeldet, nicht automatisch gestrichen. Elegante («in verschiedenen Farben erhältlich») und 18K («in Weiss oder
  Grün erhältlich») haben dieselbe Klasse, stehen aber nicht auf der Liste. Wird die Klassenliste neu gebaut, ist ein Textschnitt
  möglich (VERMUTUNG).
- `produktdetails_vereinen.py`: Sirène steht 9× als «vereint» im Ledger 4 (Zombie-Klasse «Block kommt zurück»). Auf der
  heutigen Doppelt-Liste steht sie nicht.
- Alt-Text-Läufe (`alt_text_backfill`, `alt_titel_abgleich`): Alle Alt-Texte stehen im eigenen Schema mit dem aktuellen Titel
  oder sind handgeschrieben (Sirène). Geschrieben würde erst nach einer Titeländerung.
- Lieferanten-Video (`cj_video_backfill`): 0/13 im Video-Index (`_cj_video_index.json` → `shop_video`).
- Kategorie-Läufe (`uhren_fein`, `shopify_fein`, `kategorie_*`, `google_kategorie_*`): Die Kategorien sind schon Zielzweige.
  Laut Regeln wird nichts geändert (VERMUTUNG, nicht gerechnet).
- Social-Tags (`ig_gepostet_tags.py`): Von den 13 steht nur Sirène in einer Social-Queue (gepostet 29.09. und 06.10.). Heute
  kein Tag gesetzt.

### 5d. Nicht planbar und das grösste Einzelrisiko

Es gibt Sitzungen und Routinen: die «Autonome Verbesserungsrunde» alle 4 h, parallele Workflows und Klassen-Reparaturen von
Hand. Der Geschenke-Welten-Lauf vom 12.10. schrieb 11 der 13 an einem Abend. Kein Aufseher-Lauf erreicht diese Grösse.

## 6. Schreibsperre-Liste (nur beschrieben, nichts umgesetzt)

**Mechanik (Vorschlag):** eine Datei `dropship/_werbetest_sperre.txt`, eine Zeile je Produkt-GID mit Enddatum (Testende + 3 T).
Jeder unten genannte Lauf überspringt diese IDs und protokolliert «gesperrt (Werbetest)». Ein zentraler Riegel im gemeinsamen
GraphQL-Helfer reicht nicht. Von 142 Schreibern nutzen nur 28 `kaufwille_zeile.gql`, `seo_autopilot.gql` oder
`kollektionstexte_nachbessern.gql`, 114 bauen ihren HTTP-Aufruf selbst (gezählt). Die Ampel vergleicht täglich `updatedAt`
(laut Richter vorgesehen) und nennt den Schreiber nachträglich.

| Lauf | ausnehmen? | betroffene Produkte | Begründung |
|---|---|---|---|
| `automation/cj_specs_backfill.mjs` | **ja** | Silberarmband, Elegante, Sonne & Mond, Holzuhr, Moissanit (+ Kopfhörer, falls der Test bis 25.10. läuft) | sicherer, terminierter Textschreiber. Einfachster Weg: die Handles bis Testende überspringen, sie bleiben in der Prio-Liste |
| `automation/auswahl_nachruesten.py` | **ja** | 18K, Retro, Silberarmband, Elegante; alle Ein-Varianten-Produkte mit CJ-SKU | Strukturumbau mit neuen Varianten. Der Test löst ihn selbst aus (Vorrangliste aus Besuchen) |
| `automation/geschenk_unterwelten.py` | **ja** (Tags der 13 einfrieren) | 12 Geschenk-Produkte | tägliche Tag-Neuwahl bei vollem Deckel |
| `automation/nachfrage_liebling.py` | **ja** (Tag erst nach Testende) | 12 | Ein Erfolg des Tests würde sonst sofort geschrieben |
| `automation/wahlversprechen.py` | **ja** | Retro, Elegante, 18K | `FIX=1` streicht Sätze |
| `automation/variantenwert_ki.py` | **ja**, falls das Tor repariert wird | Sonne & Mond | KI-Übersetzung der Varianten |
| `automation/produktdetails_vereinen.py`, `automation/produktdetails_wahrheit.py` | **ja** | Skelett, Sirène (haben einen Block) und alle, die `cj_specs` erreicht | Folgeschreiber auf `descriptionHtml` |
| `automation/hype_kuratieren.py` (betreute Aufnahme), `automation/such_boost.py`, `automation/ig_gepostet_tags.py`, `automation/gfeed_anstupsen.py`, `automation/alt_titel_abgleich.py` | **ja** | alle 13 | Tags, Metafelder, Alt-Texte: Kosmetik, die bis nach dem Test warten kann |
| `automation/besuchte_seiten_lieferbar.py` (DRAFT bei «nicht in die CH») | **nein** | alle | Ein unlieferbares Produkt zu bewerben ist schlimmer als ein Kontingent-Verlust. Wird ein Produkt gedraftet, Kampagne prüfen |
| `automation/cj_lager_abgleich.py` | **nein** | 6 mit Varianten-SKU | Ausverkauft muss ausverkauft zeigen |
| `automation/verkauf_gewinn_wache.py`, `automation/preis_verlustschutz.py` | **nein** (nötig wäre es nicht) | – | heben bei 0/13. Eine Preishebung wäre ein echter Grund |
| Sitzungen und Routine «Autonome Verbesserungsrunde» | **ja** | alle 13 | Eine Zeile in CLAUDE.md «Aktueller Stand» und in SHARED-MEMORY.md: «Werbetest A: diese 13 Produkt-IDs bis <Ende> nicht schreiben, Liste `dropship/_werbetest_sperre.txt`» |

## 7. Text der Übersetzungs-Kopfhörer und die Google-Richtlinien

Gelesen wurden Titel, Beschreibung, SEO-Beschreibung und die Google-Metafelder (live, 21:05 UTC).

| Prüfpunkt | Befund |
|---|---|
| Gesundheits- oder Heilaussagen | keine |
| Superlative («beste», «Nr. 1», «einzigartig») | keine. «idealer Begleiter» und «perfekt für den täglichen Gebrauch» sind übliche Werbesprache |
| Garantie- oder Gewährleistungsversprechen | keine. Nur «30 Tage Rückgabe» (Shop-Regel) und der shopweite Kasten «✅ Geprüfte Angaben» |
| Liefer- und Preisangaben | «Lieferung 10–20 Werktage» passt zum CH-Tarif. SEO «Gratis-Versand ab CHF 50» passt zum Band |
| Kategorie und Merkmale | Electronics › Audio › Headphones, unisex, adult, new. Keine Marke, kein Fremdlogo im Text |
| **Funktionsversprechen** | «sofortige Sprachübersetzung», «mühelose Kommunikation». Solche Geräte übersetzen in der Regel nur über eine Smartphone-App mit Internet und mit Verzögerung (VERMUTUNG, die CJ-Daten wurden heute nicht abgefragt: keine CJ-Aufrufe vor 00:00 UTC). Der Text nennt weder App noch Sprachen. Ein Verstoss gegen «Falsche Darstellung» ist das nicht sicher, eine Ablehnung halte ich für unwahrscheinlich. Es ist aber ein Retouren-Risiko |

**Empfehlung:** Die Kopfhörer bleiben im Test, der Text bleibt während des Tests unverändert. Nach dem Test folgt der Satz «Die
Übersetzung läuft über die App auf dem Smartphone (Internetverbindung nötig); Sprachen laut Hersteller: …», aber nur mit belegten
CJ-Angaben.

## 8. Nebenbefunde (nichts geändert)

- **Selbsttest-Tor von `variantenwert_ki` ist kaputt.** Seit 09.10. gibt es keinen Lauf, das Log ist 0 Byte groß.
  `aw.selbsttest()` gibt `True` zurück, das Tor in `variantenwert_ki.py` Zeile ~155 prüft `not b`. Eine Reparatur würde
  englische Variantenwerte wieder übersetzen, darunter Sonne & Mond.
- **Auswahlversprechen ohne Auswahl** auf drei Test-Landeseiten: Elegante, 18K und Retro versprechen Farben, die es nicht zu
  kaufen gibt. Wer über die Anzeige kommt, sucht die Farbe und findet sie nicht. Das betrifft die Kaufquote, nicht die
  Richtlinien.
- Ladestation: «passt zu allen Handys, egal ob Apple, Samsung oder Android». Kabelloses Laden braucht ein Qi- oder
  MagSafe-fähiges Gerät, «alle» ist also zu weit gefasst (VERMUTUNG).
- Skelett-Uhr: Die Auswahl heisst «A, B, C, D, E, G, H, I, J» (kein F). Der Faktenblock sagt «Material: Metall, Leder», der
  Titel nennt ein Silikonband.

## 9. Messweg

Nur Lese-Abfragen über `automation/seo_autopilot.gql` (Admin GraphQL): `productByHandle` mit Status,
`publishedOnPublication(Google & YouTube 302872297857)`, `feedback`, Varianten, Metafeldern, Tags, Medien und Kategorie.
`geschenk_unterwelten.auswahl()`, `farbcode_*.neu_werte()`, `variantenwert_ki.braucht_ki()`, `kollektionstexte_du_form.um()`,
`verkauf_gewinn_wache.ziel_preis()` und die `WAHL`-Regex wurden ohne `SCHARF` im Prozess aufgerufen. Gelesen wurden die Ledger
`_cj_specs_*`, `_auswahl_*`, `_cj_lager.tsv`, `_farbcode_praefix.tsv`, `_masstabellen.json` und `_produktdetails_vereint4.txt`.
Die Grundrate (933 Geschenk-Produkte) stammt aus einer Abfrage `updatedAt` über `tag:geschenkwelt-ihn|sie|alle`. Die Skripte
liegen im Scratchpad der Sitzung (`werbetest_a/`), nicht im Repo.

Quellen zum Format `shopify_ZZ_`:
[Bidnamic: Shopify item ID changes](https://www.bidnamic.com/resources/shopify-item-id-changes-google-merchant-centre) ·
[GoDataFeed Help Center](https://help.godatafeed.com/hc/en-us/articles/360042128851) ·
[Google: Product and listing groups](https://support.google.com/merchants/answer/3517331)

## 10. Umsetzung der Schreibsperre (13.10. ~22:40 UTC)

**Datei** `dropship/_werbetest_sperre.txt`: Kopf `# ende: 2026-10-24` (Pflicht — ohne gültiges Ende gilt nichts), je Zeile
Produkt-ID + Handle. Nach dem 24.10. (UTC) ignorieren alle Leser die Datei von selbst; aufräumen ist nicht nötig.
**Leser:** `automation/werbetest_sperre.py` (`gesperrt(id|gid|handle)`, `gesperrte_ids()`) und `automation/lib/werbetest_sperre.mjs`
(gleiche Regeln), Selbsttest je 17/17 (`--selbsttest`, inkl. Endtag, abgelaufen, fehlende Datei, fremder Handle).

| Schreiber | was gesperrt wird | Nachweis (trocken, GEMESSEN 13.10. ~22:20 UTC) | Gegenprobe ohne Sperre |
|---|---|---|---|
| `cj_specs_backfill.mjs` | Faktenblock; keine Quittung → bleibt in der Prio-Liste, kommt nach dem 24.10. dran | `DRY=1 LIMIT=0`: 10 × «übersprungen (Werbetest-Sperre)» (Silberarmband zuerst), 0 CJ-Aufrufe | `WERBETEST_SPERRE=/nonexistent`: 0 übersprungen |
| `auswahl_nachruesten.py` | Varianten-Umbau (kein MANUELL-Eintrag) | `CAP=0`: 18K, Retro, Silberarmband übersprungen (Elegante steht bis ~19.10. ohnehin in `_auswahl_manuell.tsv`) | – |
| `geschenk_unterwelten.py` | `geschenkwelt-*`-Tags der 13 eingefroren (weder + noch −), nicht in die Reihenfolge | heute +0 −0 (eingefroren 6/5/5/3/7 mit Tag); provoziert mit `MAX_JE_WELT=40`: 14 Entfernungen übersprungen | gleicher Lauf ohne Sperre: 0 Hinweise |
| `hype_kuratieren.py` | Aufnahme, Ablauf, Regelbruch, Rest-Räumen | Probe-Thema «Silberarmband\|Herrenholzarmbanduhr\|Retro-Damenuhr» (DRY, im Prozess): 3 übersprungen, fremdes «Kupferbeschichtetes Silberarmband» bleibt Kandidat | – |
| `nachfrage_liebling.py` | Tag `nachfrage-liebling` + / − | `DRY=1`: **Sirène hätte den Tag heute VERLOREN** (unter Schwelle) → übersprungen | – |
| `variantenwert_ki.py` | KI-Übersetzung der Varianten | `IDS=…Sonne & Mond`: Kandidat → «übersprungen»; `bearbeiten()` zweite Wache | ohne Sperre: Sonne & Mond ist Kandidat |

**Nicht gesperrt (bewusst):** `besuchte_seiten_lieferbar.py` (DRAFT bei «nicht in die CH»), `cj_lager_abgleich.py` (DENY),
`verkauf_gewinn_wache.py` / `preis_verlustschutz.py` — Lieferbarkeit und Preis gehen vor dem Kontingent.

**Wache:** `python3 tools/werbetest_trichter.py --wache` prüft alle 13 Handles: fremde Landeseiten der Kampagne, Google-Meldung
«Shopping ads [CH]», `updatedAt` seit Teststart. Heute: «Testprodukte 13/13 aktiv». Gegenprobe mit der alten Kampagne
(sirene-test ab 10.10., Aurora): 25 Sitz. auf fremden Produkten, Aurora «nicht bewerbbar [CH]», Aurora geschrieben 13.10. 09:18 —
alles bekannte Fakten, also misst sie richtig.

### Eintragen (Dateien, die diese Sitzung nicht anfassen durfte)

> **✅ Erledigt 13.10. ~23:00 UTC:** `betreiber_ampel.werbetest()` prüft alle `handles` über `werbetest_trichter.wache()` und zählt
> erst ab Aktivierung (erster Tag mit Sitzungen der utm_campaign, oder Feld `aktiviert`); vorher «wartet auf Aktivierung», ab 3 Tagen
> ohne Sitzungen ⚠️. Warnt, wenn die Schreibsperre vor Testende + 3 T abläuft. `ql()` wirft jetzt RuntimeError statt `sys.exit`
> (SystemExit hätte die ganze Ampel beendet). Sperre zusätzlich in `variant_value_clean.py`, `styling_floskel_wache.py` (beide
> Schleifen) und `hauptbild_ohne_text.py` (beide Schleifen, ohne Ledger-Eintrag → nach dem Test wieder Kandidat). Proben: heute
> «startet frühestens 14.10. — wartet auf Aktivierung · Testprodukte 13/13 aktiv»; simuliert 16.10. ohne Sitzungen → ⚠️ «3 T 0
> Sitzungen»; alte Kampagne sirene-test mit Plan 09.10. → «Tag 4 seit 10.10.» (Aktivierung richtig erkannt), fremde 25 Sitz. gemeldet.
> CLAUDE.md-Zeile «Werbetest A bis 24.10.» steht. Offen bleibt (niedrig, Vermutung): ob Bestand/Verkauf `updatedAt` hochsetzt —
> die Meldung sagt deshalb «geändert … Schreiber oder nur Bestand/Verkauf».

- `automation/betreiber_ampel.py` `werbetest()`: liest nur `handle` (ein String). Für `geschenke-test` steht absichtlich kein
  `handle` in der JSON (sonst zählten 12 der 13 als «fremd»), damit fallen Fremd- und Kontingent-Prüfung dort weg. Zeile vor dem
  `return`: `try: from werbetest_trichter import wache, zeile; regel += " · " + zeile(wache(w)).split(": ", 1)[1] if w.get("handles") else ""`
  `except Exception: pass` — und vor dem Start (`heute < start`) «startet am …» statt «Tag 1 … 0 Sitzungen» melden.
- `automation/variant_value_clean.py` (täglich, schreibt Optionswerte): Sonne & Mond hat 4 englische Werte («6012B All Black
  Black Surface», «Gold Black Noodles» …), die die Tabelle heute NICHT übersetzt (`wert_de` = None, GEMESSEN) → heute kein
  Schreiben. Wächst die Tabelle, wäre es eines. Zeile in der Schreibschleife:
  `from werbetest_sperre import gesperrt; if gesperrt(pid): continue`.
- `automation/styling_floskel_wache.py` (4 Schreibstellen, `productUpdate`): gleiche Zeile vor dem Schreiben. Heute nicht gemessen,
  ob einer der 13 die Floskel trägt (VERMUTUNG: nein, alle 13 nach dem 23.09. importiert oder neu getextet).
- `automation/hauptbild_ohne_text.py` (Hauptbild-Tausch): gleiche Zeile; ein Bildtausch wäre der teuerste Schreibvorgang
  (Google prüft das Bild neu).
- `automation/bildtext_pruefen.py`, `automation/auswahl_fehlt_messen.py`: 0 Produkt-Mutationen (gezählt) → kein Eintrag nötig.
- Sitzungen / Routine «Autonome Verbesserungsrunde»: eine Zeile in CLAUDE.md «Aktueller Stand»: «Werbetest A bis 24.10.: die
  13 Produkte in `dropship/_werbetest_sperre.txt` nicht schreiben; Helfer `automation/werbetest_sperre.py`».
- Nicht auf der Liste, aber Schreiber ohne Sperre (heute 0/13 betroffen, Abschnitt 5c): `wahlversprechen.py` (Retro steht auf der
  Arbeitsliste), `produktdetails_vereinen.py`, `produktdetails_wahrheit.py`, `such_boost.py`, `ig_gepostet_tags.py`,
  `gfeed_anstupsen.py`, `alt_titel_abgleich.py` — Einbau je eine Zeile, falls die Ampel-Wache «geschrieben» meldet.

## Für den Betreiber (Google Ads am Handy, ≈ 20 Min.)

Am Handy im Browser **ads.google.com** öffnen und unten auf der Seite (oder im Browser-Menü) **«Desktop-Version»** wählen —
die App kann Produktgruppen nicht unterteilen. Konto 719-826-3241.

**1. Konto verknüpfen (Shopify, einmalig).** Shopify-Admin → **Vertriebskanäle → Google & YouTube** → **Einstellungen** →
Abschnitt **«Dein Google-Konto»** / «Google Ads-Konto» → Konto **719-826-3241** wählen → **Verbinden**. Ohne diesen Schritt
kommen Käufe nicht als Conversion zu Google zurück (bisher «übersprungen»). Steht dort schon ein Ads-Konto, nichts ändern.

**2. Kampagne öffnen.** Google Ads → links **Kampagnen** → **«Sales-Shopping-1»** → Anzeigengruppe öffnen → links/oben
**Produktgruppen**.

**3. Nach Artikel-ID unterteilen.** Neben «Alle Produkte» auf **+** (bzw. das Stiftsymbol, wenn schon unterteilt — die alte
Unterteilung nach Label «werbetest» vom 10.10. zuerst entfernen) → **«Alle Produkte» unterteilen nach: Artikel-ID**.
Unten links **«Werte manuell im Bulk-Verfahren hinzufügen»** (falls angezeigt) → die 39 Zeilen unten einfügen → **Bestätigen**.
Ist das Feld nicht da: im Suchfeld die Produkt-ID (die lange Zahl in der Mitte) eingeben und alle Treffer anhaken.
→ **Fortfahren und Gebote überprüfen** → Gebot **0.50** für alle → **Speichern**.

```
shopify_zz_15450839286145_55889836212609
shopify_zz_15450839286145_55889836245377
shopify_zz_15450839286145_55889836278145
shopify_zz_15450839286145_55889836310913
shopify_zz_15450839286145_55889836343681
shopify_zz_15450839286145_55889836376449
shopify_zz_15450839286145_55889836409217
shopify_zz_15450839286145_55889836441985
shopify_zz_15450839286145_55889836474753
shopify_zz_15454132961665_55907626090881
shopify_zz_15449444057473_56054887448961
shopify_zz_15449444057473_56054887481729
shopify_zz_15455791907201_56069355995521
shopify_zz_15455791907201_56069356028289
shopify_zz_15455791907201_56069356061057
shopify_zz_15455791907201_56069356093825
shopify_zz_15480824037761_56005007442305
shopify_zz_15454414111105_56067446145409
shopify_zz_15454414111105_56067446178177
shopify_zz_15454414111105_56067446210945
shopify_zz_15454414111105_56067446243713
shopify_zz_15454414111105_56067446276481
shopify_zz_15454414111105_56067446309249
shopify_zz_15454414111105_56067446342017
shopify_zz_15454414111105_56067446374785
shopify_zz_15495239106945_56087393239425
shopify_zz_15497460810113_56099968450945
shopify_zz_15465984491905_55951570862465
shopify_zz_15449430851969_55881785901441
shopify_zz_15412915110273_55747898114433
shopify_zz_15412915110273_55747898147201
shopify_zz_15412915110273_55747898179969
shopify_zz_15412915110273_55747898212737
shopify_zz_15412915110273_55747898245505
shopify_zz_15412915110273_55747898278273
shopify_zz_15412915110273_55747898311041
shopify_zz_15412915110273_55747898343809
shopify_zz_15493830443393_56080322724225
shopify_zz_15453601890689_55903191204225
```

Gross-/Kleinschreibung: Ads zeigte die IDs am 10.10. klein (`shopify_zz_…`), das Merchant Center gross (`shopify_ZZ_…`).
Meldet Ads eine Zeile als «nicht gefunden», die Zahl suchen statt der ganzen Zeile.

**4. «Alles andere» ausschliessen.** In der Produktgruppen-Liste die Zeile **«Alles andere in ‹Alle Produkte›»** → in der
Spalte «Max. CPC» auf den Wert tippen → **Ausgeschlossen** → **Speichern**. Diese Zeile lässt sich nicht löschen, nur
ausschliessen. Am 10.10. lief genau sie mit — 25 Klicks auf fremde Ware.

**5. Budget und URL-Suffix.** Kampagne → **Einstellungen** → **Budget: 10** (CHF/Tag) → Speichern. Dann
**Kampagnen → Kampagnen → Tab «Einstellungen»** → bei «Sales-Shopping-1» in der Spalte **«Tracking-Vorlage»** das Stiftsymbol →
Feld **«Suffix der finalen URL»**:

```
utm_source=google&utm_medium=cpc&utm_campaign=geschenke-test
```

→ **Speichern**. (Alternativ: Kampagne → Einstellungen → «Weitere Einstellungen» → «Kampagnen-URL-Optionen».)

**6. Screenshot VOR dem Einschalten** an die Sitzung schicken. Richtig ist: 39 Zeilen «eingeschlossen» mit 0.50, 1 Zeile
«Alles andere … Ausgeschlossen», Budget 10, Suffix wie oben.

**7. Aktivieren.** Kampagne → Status **Aktiviert**. Kein Nachladen ohne neuen Entscheid; Abbruch bei CHF 30 ohne Warenkorb
(die Ampel meldet «STOPP-REGEL»). Den Tag musst du nirgends eintragen: die Ampel zählt ab dem ersten Tag, an dem Besuche mit
`utm_campaign=geschenke-test` ankommen, und schiebt das Testende um gleich viele Tage nach hinten (Nachtrag 13.10. 23:00 UTC).
Schreib der Sitzung kurz «aktiviert», dann trägt sie das Datum zusätzlich in `_werbetest_aktiv.json` ein.

Menüpfade geprüft am 13.10. gegen die Google-Ads-Hilfe: Produktgruppen unterteilen / Bulk-Werte
([support.google.com/google-ads/answer/6275317](https://support.google.com/google-ads/answer/6275317?hl=de)), Suffix der finalen
URL ([answer/9054021](https://support.google.com/google-ads/answer/9054021?hl=de)), Shopify-App «Your Google Account → Connect»
([answer/13494537](https://support.google.com/google-ads/answer/13494537)). Ob das Bulk-Feld für die Artikel-ID erscheint, sagt die
Hilfe nicht ausdrücklich («für bestimmte Attribute») — deshalb der Ersatzweg über die Suche. «Alles andere» ausschliessen steht in
der Hilfe nicht wörtlich; belegt ist es durch Feed-Anbieter-Doku und die Ads-Ansicht vom 10.10.
