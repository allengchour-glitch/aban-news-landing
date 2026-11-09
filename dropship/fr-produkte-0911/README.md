# Französisch Stufe 5 und 6: Produkte und Produktseiten-Bausteine (09.11.2026)

Besitzer 09.11. nachts: «produkte doch mit übersetztung?», «arbeite ohne pause durch» und, nach einer Sperre des Berechtigungsprüfers, «ja mach fix fertig». Auslegung (meine, nicht bestätigt): die Produkte der französischen Sprache selbst mitübersetzen, ohne auf den Browser-Auftrag für PC-Claude zu warten, und die festen Bausteine der Produktseite im Theme zweisprachig machen. Für die Masse (56 492 aktive Produkte) bleibt Shopifys eigener Übersetzer der Weg (Auftrag `dropship/BROWSER-BEFEHL-UEBERSETZEN-FR-0911.md`), weil jede Übersetzung einzeln über die Schnittstelle geschrieben werden muss (siehe «Grenzen»).

## Ergebnis (GEMESSEN 09.11. 22:42 bis 23:23 UTC)

- **Stufe 5a: 121 von 121 Produkten live**, je frisch zurückgelesen (Werte gleich, nicht `outdated`): 593 Produktfelder, 120 Optionsnamen, 489 Optionswerte. Ledger `lauf/ledger.json`, Vorschau `lauf/vorschau/<id>.json` (was geschrieben wurde).
- **Lauf:** der letzte Stapel (87 Produkte) dauerte 381 s (4,4 s je Produkt), 171 Gemini-Aufrufe, 127 152 Tokens ein, 25 922 aus: geschätzt 0,023 USD (Annahme 0,10 und 0,40 USD je Million Tokens, nicht belegt). Der Übersetzungsspeicher (`tm.json`, 1 119 Einträge) spart Aufrufe.
- **Storefront** (`curl` mit Browser-Kopf, Hauptbereich, fünf Seiten): `lang="fr"`, französischer Titel und `<h1>`, HTTP 200, `noindex` weiter gesetzt; in vier der fünf Seiten 0 deutsche Sätze, in der fünften nur die deutschen Kundenbewertungen (Judge.me, Originaltexte).
- **Abdeckung des ganzen Katalogs** (`abdeckung.py PRODUCT`, 23:2x UTC): 87 783 Produkte aller Status; **191 mit französischem Titel (0,2 %), 121 mit französischer Beschreibung (0,1 %)**; 76 mit veralteten Übersetzungen (nicht aus diesem Lauf: keines der 121 ist veraltet, einzeln geprüft).

## Was dieses Werkzeug tut (`fr_produkte.py`)

Je Produkt, Sprache `fr`: `title`, `body_html`, `meta_title`, `meta_description`, `product_type` sowie `name` der Optionen und der Optionswerte.

- **Gerüst bleibt:** die Beschreibung wird wie bei den Seiten (`dropship/fr-seiten-0911/fr_lib.py`) in Läufe zerlegt; nur die Texte zwischen den Tags werden ersetzt, Gerüst, Stile und Kommentare (`<!-- ls-text-v2 -->` und andere Markierungen) bleiben Zeichen für Zeichen gleich.
- **Übersetzer:** Gemini (`llm.py`, Modell `gemini-flash-lite-latest`, JSON-Antwort, Wörterbuch für Schweizer Französisch, «vous»). Ein ganzes Produkt (Titel, Typ, Optionen, 20 bis 40 Läufe) in einem Aufruf, rund 1 bis 2 s.
- **Übersetzungsspeicher** (`tm.json`, Texte in HTML-Form): was schon einmal geprüft übersetzt wurde (Etiketten, Vertrauensblock, Lieferumfang, Optionswerte), kommt beim nächsten Produkt von dort.
- **Vorlagen:** `meta_title` (« | LuxeStyle CH»), `meta_description` (Werbezeile mit Gratis-Versand, 30 Tage Rückgabe, WELCOME10) und der Block «Das könnte dir auch gefallen» werden nicht von Gemini übersetzt: Etikett fest, Linktexte = die **französischen Sammlungstitel** (gleiche Namen wie im Menü), nur wenn der deutsche Linktext dem deutschen Sammlungstitel entspricht.
- **Klartext oder HTML:** Läufe der Beschreibung sind HTML (nackte `&` werden `&amp;`, interne Links bekommen `/fr`); Titel, Produkttyp, Meta-Texte und Optionen sind **Klartext** (`klartext()`: Entities aufgelöst, nichts maskiert, siehe «Korrekturen»).
- **Prüfung vor dem Schreiben** (je Eintrag und für die ganze Beschreibung): gleiche Ziffern, gleiche Inline-Tags und Link-Ziele, kein deutscher Rest, nicht leer, nicht viermal so lang; Etiketten beginnen gross wie im Deutschen; fremde `<br>` ohne Vorbild im Deutschen werden zu Leerzeichen. Fehler lösen höchstens drei Gemini-Runden aus, danach wird das Produkt **nicht** geschrieben.
- **Feste Titel:** `ueberschreiben.json` setzt einen französischen Titel von Hand (nach Sichtung); Meta-Texte folgen dem Titel.
- **Schreiben:** `translationsRegister` mit frisch gelesenem Digest, gebündelt als Aliase einer Mutation (`stapel_schreiben`); danach frisch zurücklesen. Ist eine Übersetzung gleich dem deutschen Text (z. B. «Sport & Outdoor»), wird nichts geschrieben und eine ältere Übersetzung dieses Felds entfernt (`plan_felder`). Standard-Option «Title/Default Title» wird nicht angefasst. Sicherung = Ledger (Produkt, Felder, Options- und Wert-IDs).
- **Rücknahme:** `ZURUECK=1 LIVE=1` entfernt genau diese Übersetzungen (`translationsRemove`); die Produkte hatten vorher keinen französischen Text.

```
python3 dropship/fr-produkte-0911/fr_produkte.py --selbsttest        # 53 Prüfungen ohne Netz und ohne Schlüssel
python3 dropship/fr-produkte-0911/auswahl.py                         # Auswahl Stufe 5a neu bauen (nur lesend)
IDS=dropship/fr-produkte-0911/auswahl-stufe5a.json LIMIT=10 python3 dropship/fr-produkte-0911/fr_produkte.py          # Trockenlauf: übersetzt und prüft, Vorschau in lauf/vorschau/
LIVE=1 IDS=… python3 …                                               # schreibt (nutzt die Vorschau, wenn der deutsche Text gleich blieb); NEU=1 schreibt Produkte im Ledger neu
ZURUECK=1 LIVE=1 IDS=… python3 …                                     # entfernt die geschriebenen Übersetzungen
python3 dropship/fr-produkte-0911/abdeckung.py [PRODUCT COLLECTION ARTICLE PAGE]   # misst die Abdeckung (nur lesend)
python3 dropship/fr-produkte-0911/pruefe_klartext.py                 # liest alle Ledger-Produkte frisch, meldet Entities in Klartextfeldern (nur lesend)
python3 dropship/fr-produkte-0911/qualitaet.py PRODUCT 4             # Gerüst/Ziffern/deutscher Rest bei fertigen Übersetzungen (z. B. nach Shopifys Übersetzer)
```

Zugang: `GEMINI_API_KEY` (und `GEMINI_API_KEY2` als Ersatz) und `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` aus der Umgebung, nie ausgeben. Bei Hintergrundläufen `python3 -u`, sonst bleibt die Ausgabe im Puffer.

## Stufe 5a: die meistgesehenen Produkte (`auswahl-stufe5a.json`)

121 aktive Produkte: Wegweiser-Sammlung (Bio-Links Instagram, TikTok, YouTube) 24, die vier Startseiten-Pools 68 (Trends 22, Mehr 19, Schmuck 16, Wohnen 11), verkaufte Produkte seit 05.10. 15, Rizinusöl 3, Bestseller bis CHF 50 11. Auswahl nach Sichtbarkeit (wer von Social und Startseite kommt, sieht diese Produkte zuerst), nicht nach Umsatz.

## Stufe 6: Bausteine der Produktseite im Theme zweisprachig (`vorlage_fr/`)

Die festen Bausteine der Produktseite stehen als **Custom Liquid** in `templates/product.json` und sind nicht über die Übersetzung erreichbar. Sieben davon sind LIVE (MAIN-Theme 213013037447): `lux_delivery` (Lieferbox mit Verfügbarkeit und Lieferdatum), `lux_trust` (Vertrauenszeilen), `lux_rueckgabe_text`, `lux_spezifikationen`, `lux_mengenrabatt`, `lux_breadcrumb`, `lux_sizeguide`.

- **Verfahren** (`bauen.py`): der ursprüngliche Baustein wird in `{%- capture x -%}…{%- endcapture -%}` eingefangen und nur bei `request.locale.iso_code == 'fr'` Wortgruppe für Wortgruppe ersetzt (`phrasen.py`); **der deutsche Zweig gibt die eingefangene Ausgabe unverändert aus**, alle Bedingungen im Baustein rechnen weiter mit den deutschen Zeichenketten. Daten («24. Nov. – 8. Dez.») werden mit französischen Monaten gesetzt.
- **Test mit dem echten Ruby-Liquid 5.14.0** (`test_vorlage.py`, Referenz von Shopify): strenge Syntaxprüfung; für Lieferbox (11 Fälle, zwei Stichtage), Vertrauenszeilen, Rückgabe-Text und Mengenrabatt: deutscher Zweig **byte-gleich** dem ursprünglichen Baustein, französischer Zweig ohne deutschen Rest (enge Wortliste plus die allgemeine Funktionswörter-Liste von `fr_lib.rest_deutsch`); Rundreise einwickeln/auspacken; zweites Einwickeln ändert nichts. CI: `.github/workflows/fr-produkte-test.yml` (eigene Datei).
- **Einspielen:** `python3 dropship/fr-produkte-0911/vorlage_fr/apply.py` (Trockenlauf Vorgabe; prüft, dass live nicht von dem Stand abweicht, den das Werkzeug zuletzt schrieb; `LIVE=1` schreibt, Sicherung in `sicherung/product.json.vor`, Rücklesen). LIVE 23:01:27 UTC; **zweite Fassung 23:20:00 UTC** (Mengenrabatt-Satz, siehe «Korrekturen»), Rücklesen gleich.
- **Rücknahme:** `ZURUECK=1 LIVE=1 python3 dropship/fr-produkte-0911/vorlage_fr/apply.py` stellt die Sicherung wieder her (nur wenn live noch dem Stand des Werkzeugs entspricht).
- **Dazu LIVE:** sechs Felder der Theme-Übersetzung der Vorlage (`OnlineStoreThemeJsonTemplate/product`): Aufklapp-Überschriften «Expédition et livraison» und «Retour et échange», der Lieferhinweis dazu, «Produits similaires», «Voir plus dans {kategorie}», «Vidéos». Rücknahme: die sechs Schlüssel in `lauf/vorlage_keys.json` per `translationsRemove` auf dieser Ressource.
- **Wirkung auf die deutsche Seite:** keine (Byte-Gleichheit im Test; Stichprobe an drei deutschen Live-Seiten vor und nach dem Einspielen gleich).

## Korrekturen während des Laufs (jede mit Test, damit sie nicht wiederkommt)

1. **`&amp;` in Klartextfeldern (GEMESSEN an der Live-Seite):** `nachbearbeiten()` maskierte `&` auch in Titel, Meta und Produkttyp; im `<title>` wurde daraus «zircone &amp;amp; topaze» und im Browser-Tab stand wörtlich «&amp;». Behoben mit `klartext()` (Klartextfelder) und `html_form()` (Übersetzungsspeicher bleibt in HTML-Form); **32 Produkte neu geschrieben** (`vorschau_klartext.py`, `lauf/betroffen-klartext.json`), Vollscan `pruefe_klartext.py` danach: 121 Produkte, 1 081 Klartextfelder, **0 Befunde**; Storefront: `&amp;amp;` 0-mal. Ein Fehler im ersten Entwurf der Korrektur (die Schleifenvariable `art` stammte stumm aus der vorherigen Schleife) wurde vom Ablauftest gefunden.
2. **Alte Übersetzung bleibt stehen:** war die korrigierte Übersetzung gleich dem deutschen Text («Sport & Outdoor»), schrieb das Werkzeug nichts, und die ältere mit `&amp;` blieb (drei Produkte, vom Vollscan gefunden). Jetzt entfernt `plan_felder` solche Übersetzungen; die drei sind bereinigt.
3. **Eingeschobene `<br>`:** Gemini setzt vor Aufzählungsstriche eigene Umbrüche, wo die Quelle reinen Text hat; die Gerüstprüfung lehnte das Produkt dreimal zu Recht ab (Rennrad-Figur). `umbrueche_wie_quelle()` macht daraus Leerzeichen, wie das Deutsche dargestellt wird.
4. **Mengenrabatt-Satz blieb Deutsch (GEMESSEN an der Live-Seite 23:2x UTC):** im Quelltext steht ein Leerzeichen vor `&ndash;`, die Liquid-Zeichen `-%}` entfernen es aber; der Schlüssel der Tabelle hatte es und passte nie auf die Ausgabe («… 10 %– auch gemischt aus dieser Auswahl, im Warenkorb automatisch abgezogen»). Der Test hatte nur eine enge Wortliste und prüfte die Schlüssel gegen den Quelltext statt gegen die Ausgabe. Jetzt: allgemeine Deutschreste-Prüfung in jedem Block (der verschärfte Test fand genau diese eine Lücke und sonst nichts), Schlüssel korrigiert, Baustein neu eingespielt, `apply.py` kann eingewickelte Bausteine mit geänderter Tabelle erneuern.

## Was auf den französischen Produktseiten noch Deutsch ist (GEMESSEN 23:2x UTC, `led-wasserwellen-projektionsleuchte-677504`)

- **Merklisten-Knopf** «♡ Merken», «Merkliste ansehen» (Custom-Liquid-Block in `templates/product.json`) und das Skript dazu in `layout/theme.liquid` (Hinweis «Gemerkt …», `aria-label`): nicht angefasst, weil `theme.liquid` eine globale Datei ist, die viele Sitzungen ändern.
- **Newsletter-Fenster** (Text in `sections/footer-group.json`: «Abmeldung jederzeit. Siehe Datenschutz», «Willkommen! Dein 10 %-Code …»).
- **Kundenbewertungen** (Judge.me): Originaltexte, bleiben.
- Nicht mit dieser Messung prüfbar: kurze Beschriftungen ohne Funktionswörter (Messgerät ist die Funktionswörter-Liste), Zustände nach dem Klick (Warenkorb-Schublade, Kasse), Safari/Handy.
- Andere Ressourcen: Sammlungsbeschreibungen (29 von 1 724), Artikel (0 von 351) und rund 75 Ratgeberseiten sind weiter Deutsch.

## Grenzen

- **Masse:** Schreiben und Prüfen dauerten im letzten Lauf 4,4 s je Produkt (mit Stapelschreiben und Übersetzungsspeicher); 56 492 aktive Produkte wären rund drei Tage Dauerlauf; Gemini-Kosten für alle grob 10 bis 40 USD (Annahme, nicht belegt; die Abrechnung des Schlüssels ist nicht einsehbar). Darum: Auswahl hier, Rest über Shopifys Übersetzer.
- Maschinelle Übersetzung, **keine muttersprachliche Gegenlesung**; Titel gesichtet bei den ersten Produkten, nicht bei allen (eine Auffälligkeit: «Hoodie-Decke» wurde einmal zu «Sweat-plaids», dort mit `ueberschreiben.json` korrigiert). Das Produkt `kissenbezug-in-weiss-…` heisst im Shop «Teppich in unregelmässiger Form» (der Handle ist veraltet), die Übersetzung folgt dem Titel.
- Die französischen Produktseiten tragen weiter `noindex` (Regel in `layout/theme.liquid`), bis mindestens 95 % übersetzt sind: bei 0,1 % bleibt das richtig.
- Veraltete Übersetzungen (deutscher Text nach der Übersetzung geändert) fallen in Shopify auf Deutsch zurück; ändert der Autopilot den deutschen Text eines dieser 121 Produkte, wird die Übersetzung `outdated` (`abdeckung.py` zählt sie; Auffrischen: `LIVE=1 NEU=1 IDS=…`).
- Ungemessen: Aussehen auf dem Handy und in Safari, Wirkung auf Käufe und Suche (die Seiten sind `noindex`), Qualität des Französischen durch Muttersprachler.
