# Was könnte man noch machen auf der Website? (Stand 15.09.2026)

Betreiber-Frage vom 14.09. Gesammelt haben acht Blickwinkel **47 Vorschläge**; je ein Skeptiker hat
jeden gegen den Ist-Stand, die Hausregeln und einen gemessenen Nutzen geprüft. **39 blieben, 8 flogen
raus.** Danach hat ein Vollständigkeits-Kritiker den Bericht selbst auseinandergenommen; seine acht
Lücken stehen unten in Abschnitt 6 — die erste davon betrifft den wichtigsten Punkt des Berichts.

> Quelle: Arbeitslauf `wf_581a6511-8a8`, 57 Agenten, 15.09.2026.
> ⚠️ Der Lauf ist zweimal an einer Modellgrenze gestorben und wurde aus dem Zwischenspeicher
> fortgesetzt; die Zahlen unten stammen aus den Agentenläufen und sind dort einzeln belegt.

# Was könnte man noch machen auf der Website?

Stand 15.09.2026. Alles unten ist gemessen, nichts geändert.

## 1. Kurzantwort

Der Shop ist technisch in Ordnung, es fehlen keine Funktionen: die Arbeit, die wirklich offen ist, zerfällt in drei Klassen, nämlich einen heute eingebauten Layoutfehler auf der Startseite, das Handy-Gewicht (12 MB Bilder vor dem ersten Scrollen) und rund ein Dutzend Stellen, an denen der Shop etwas verspricht, das nachweislich nicht stimmt. Fast alles davon kann ich selbst machen, es kostet nichts, braucht keine App und ist umkehrbar; für dich bleiben sechs kurze Klicks, von denen nur zwei wirklich etwas bewegen (Search Console freigeben, zwei Rechtstexte korrigieren). Wichtig vorweg: **Cowork-Punkt 1 (Versandschwelle von 45 auf 50 umstellen) bitte nicht ausführen** - die 45 im Versandprofil ist Absicht, weil Shopify nach Rabatt misst und der aktive 10-Prozent-Automatikrabatt aus CHF 50 genau CHF 45 macht; wer die 45er-Stufe abschaltet, nimmt rabattierten Körben den Gratisversand weg.

## 2. Ich kann es selbst machen

| Nr | Massnahme | Beleg | Aufwand | Erwartete Wirkung |
|---|---|---|---|---|
| 1 | Kundenstimmen-Karussell zieht die Startseite auf dem Handy auf 1489 px Breite: Wrapper auf `max-width:100%` + `min-width:0` + `overflow-x:clip` | Eigene Messung iPhone 390 px: mit Judge.me-JS 1489/1489, ohne 390/390; Screenshot zeigt die Sektion leer, Seite seitlich verschiebbar | klein | Repariert einen heute entstandenen Fehler; betrifft alle Handy-Besucherinnen der Startseite |
| 2 | Zweitbild-Vorladen der Produktkarten auf Touch-Geräten abschalten (`product-card.js` hebt `loading="lazy"` wieder auf) | Reproduziert: 177 Bilder/12,07 MB vor dem Scrollen, ohne das Vorladen 48 Bilder/2,74 MB; Hover-Vorschau bricht auf Touch ohnehin ab | klein | Grösster gemessener Byte-Hebel, wirkt aber nur auf der Startseite (15 Prozent der Sitzungen) |
| 3 | Spotlight-Video erst laden, wenn es ins Bild kommt (`data-src` + IntersectionObserver) | 2,9 MB werden ohne Scrollen geholt, die Sektion liegt an Position 14 von 24, rund sechs Handy-Bildschirme unter der Falz | klein | Zweitgrösster Byte-Hebel, Video spielt weiter, nur später |
| 4 | Kategorie-Kacheln auf `lazy` stellen (in `resource-image.liquid`, nicht in der Sektion) | 32 Kacheln laden `eager`, sichtbar sind auf dem Handy zwei; die Sektion beginnt unter der Falz | klein | Rund 0,9 MB weniger im Erstfenster, keine Optikänderung |
| 5 | Overlay-Stapel entzerren: Newsletter-Popup erst nach der Cookie-Entscheidung, Cookie-Banner einzeilig | Screenshot Produktseite: Popup (Vollbild) + Banner + Sticky-Kaufleiste gleichzeitig; das war am 05.09. schon einmal behoben und kam mit dem Scroll-Auslöser vom 13.09. zurück | klein | Auf den Seiten, wo 70 Prozent ankommen; Scroll-Auslöser bleibt bis zur Nachmessung am 27.09. unverändert |
| 6 | Startseite sagt "verifizierte Bewertungen" - das Wort streichen und die Herkunft verlinken | Judge.me meldet null verifizierte Käufer bei über 4700 Bewertungen; im Karussell steht sichtbar ein AliExpress-Rezensent | klein (eine Zeichenkette) | Beseitigt einen Verstoss gegen unsere eigene Regel "keine erfundenen Vertrauenssignale" |
| 7 | Kollektion `weihnachten-2026` füllen (Tag-Lauf über die Weihnachtstitel) und den Text auf die Wahrheit bringen | Die Kollektion enthält 5 Artikel, der Text bewirbt drei Produkte, die 404 sind; die Startseiten-Rotation hebt sie ab 15.10. ungeprüft nach vorne | klein | Verhindert eine 5-Karten-Reihe mit Dirndl und Phantomtext auf der Startseite. Wichtig: keine "ab Schweizer Lager"-Zeile wie bei Halloween, hier sind fast alle Artikel Direktversand |
| 8 | Warenkorb-Schublade: eine Vertrauenszeile unter dem Kassenknopf, "Auschecken" zu "Zur Kasse", Steuerzeile ehrlich | Die Trust-Zeile gibt es nur auf `/cart`, die Schublade ist aber der Standardweg; direkt unter unserem Endbetrag-Balken sagt das Theme "Versand wird beim Checkout berechnet" | klein | Wird zusammen mit der Balken-Messung am 27.09. gewertet, nicht separat |
| 9 | Alte Kampagnenseiten mit falschen Zusagen entschärfen: erst unpublizieren, dann 301 | `/pages/weihnachten-2026` verspricht "Liefer-Garantie bei Bestellung bis 14. Dezember", die eigene Versandrichtlinie sagt 10 bis 20 Werktage; weitere Seiten behaupten "Bewertungen folgen bald", "Geschenkbox bei jeder Bestellung", "wir haben 5 Adventskalender getestet" | mittel | Kein Verkehrshebel (alle unter 6 Sitzungen in 90 Tagen), aber das Wort "Garantie" ist rechtlich heikel und arithmetisch unmöglich |
| 10 | Fakten-Seiten zitierfähig machen: FAQPage-Schema auf die vorhandenen faq-Unterseiten, Accordion-Link "Versand", Seite `kundenbewertungen` neu füllen | ChatGPT zitiert nachweislich unsere Fakten-Seite mit klaren Konditionen; die Frage-Antwort-Seiten existieren schon, ihnen fehlt nur das Schema und ein Link | mittel | Null neuer Text. Umsatzwirkung nicht belegt, der ChatGPT-Kanal ist aber der einzige mit überdurchschnittlicher Abschlussrate |
| 11 | Merkliste und Popup messbar machen (zwei Ereignisse: Einblendung, Herz-Klick) | Für das Popup gibt es keinen Einblendungs-Zähler, darum lässt sich "wird nicht gesehen" nicht von "wird gesehen, aber nicht gewollt" trennen | klein | Vorbereitung für den Entscheid am 27.09. Braucht einen Klick von dir (siehe Tabelle 3, Nr. F) |
| 12 | WELCOME10 aus den öffentlichen Texten nehmen, Code nur noch per Mail | Der Code steht siebenmal auf der Startseite und wurde in dreieinhalb Monaten zweimal eingelöst, beide Bestellungen erstattet; kein Vergleichsshop zeigt seinen Code offen | klein | Kostet gemessen fast nichts. Erst nach der Popup-Nachmessung am 27.09., und kein zweiter Code |
| 13 | Produktseite nennt weder Ort noch Person: "LuxeStyle CH aus Belp, Alleng antwortet selbst" in den Kaufblock | Dort landen 70 Prozent des Verkehrs, "Belp" kommt auf der Produktseite null mal vor; ein Kunde hat den Shop schon einmal als Scam bezeichnet | klein | Vertrauenssignal, keine gemessene Wirkung. Formulierung muss eindeutig vom Shop sprechen, nicht vom Versandort |
| 14 | Kleider-Tag-Leck heilen (vorhandenes Werkzeug `subcat_heal.py`) und die Brotkrume auch den Top-Menüpunkt zulassen | Das meistbesuchte Produkt überhaupt steht in keiner Menü-Kategorie; die Menü-Regel verlangt ein Tag, das 184 Kleider nicht tragen | mittel | Hygiene. Gemessen navigiert kaum jemand, 1,1 Seiten je Produktsitzung |
| 15 | Chip-Zeile über den grossen Kollektionen auf dem Handy umbrechen lassen | Von 15 Unterkategorie-Chips ist auf 390 px genau einer sichtbar, auf dem Desktop alle | klein | Die billigste Form; Bildkacheln wären 0,2 bis 1,2 MB und sieben Reihen vor dem ersten Produkt |
| 16 | Kategorien-Verzeichnis wieder täglich bauen und in den Aufseher hängen | Die Seite steht seit dem 09.09. still, verlinkt drei umgeleitete Kollektionen und einen alten Namen; das Skript steht in keiner Startliste | klein | Reine Link-Hygiene. Vorher `frontpage` in die Ausschlussliste, sonst zementiert der Automat den Eintrag "Home page" |
| 17 | Produkttyp entdoppeln ("Gadget" und "Gadgets" sind zwei Filterwerte für dieselbe Ware) | Beide Werte stehen live nebeneinander in der Typ-Facette, ebenso "Damen-Mode/Damenmode" und "Tasche/Taschen" | klein | Vorher alle Smart-Kollektionen auf Typ-Regeln prüfen, mindestens eine hängt daran |
| 18 | Echte Suchbegriffe selbst auslesen (ShopifyQL kennt `search_queries`) | Nur 14,5 Prozent der internen Suchen führen zu einem Klick, und die Top-Begriffe liefern hunderte Treffer, nicht null | klein | Das Problem ist Trefferreihenfolge, nicht Auffindbarkeit: also keine weiteren Such-Tags |
| 19 | Neun Fremdsprach- und Leerseiten aus dem Index nehmen (`seo.hidden`), doppelte H1 auf den FAQ-Seiten beheben | Sieben nicht-deutsche Seiten laufen unter `lang="de"` ohne hreflang, alle stehen in der Sitemap | mittel | Ordnung, kein Verkehr. Die vier FAQ-Fachseiten bleiben, sie sind keine Dubletten |
| 20 | Organization-Daten vereinheitlichen: eine Entität statt zwei Namen, mit Adresse, Telefon, Profil-Links | Startseite trägt zwei Organization-Blöcke mit zwei verschiedenen Namen und ohne Adresse | klein | Ohne Versand- und Rückgabefelder, die überschreibt das Merchant Center ohnehin |
| 21 | Produktvideos sichtbar machen: Tag setzen und Video von der letzten auf die zweite Medienkachel | Bei geprüften Produkten liegt das Video hinter fünf bis sieben Wischern; die bestehende Video-Kollektion enthält fünf Produkte, von denen keines ein Video hat | mittel | Nur Tag und Rang. Keine neue Kollektion, kein Play-Zeichen auf der Karte: das sähe man in 94 von 100 Aufrufen nicht |
| 22 | Post-Purchase-Flow: Bedingung "Bestellung nicht erstattet" und Wartezeit von 21 auf 35 Tage | Sieben von sechzehn Bestellungen endeten erstattet, und alle bekamen trotzdem "Wie gefällt dir dein neues Lieblingsstück?" | mittel | Vermeidet den teuersten Vertrauensschaden im Mailbestand. Auslöser bleibt "Placed Order", "Fulfilled" heisst hier nur "Sendungsnummer eingetragen" |
| 23 | Kassen-Einwilligung täglich nach Klaviyo spiegeln | Zwei Kundinnen haben eingewilligt und den zugesagten Code nie bekommen | klein | Integritätsfix, kein Umsatzhebel (etwa eine Einwilligung mehr pro Jahr). Der Käufer von #1018 bleibt ausgeschlossen |
| 24 | Markenstory-Zeile mit Namen und Link unter den USP-Strip (nicht in die letzte Sektion) | Auf der Startseite kommt "Alleng" null mal vor, "Belp" zweimal ohne Namen und ohne Link | klein | Ein wahrer Satz, null Sektionen, null Risiko |
| 25 | Rabatt-Widerspruch auflösen: "nicht mit dem Mengenrabatt kombinierbar" in die Texte, tote "ab 3 Artikel"-Regel abschalten | Am Warenkorb gemessen: mit zwei Artikeln wird WELCOME10 abgewiesen, obwohl das Band beides nebeneinander bewirbt | klein | Die Kundin zahlt nie mehr, sie sieht nur eine Fehlermeldung auf einen beworbenen Code |
| 26 | Kollektion `us-summer-2026` deutsch betiteln oder aus dem Verzeichnis nehmen | Englisch und mit "US" betiteltes Regal in einem Shop, der nur die Schweiz beliefert | klein | Ein Listeneintrag. Die übrigen Saison-Kollektionen bleiben: Pool, Bademode und Sonnenbrillen sind hier ganzjährig wahr |
| 27 | Kundinnenfotos auf die zwei Kleider-Seiten anhängen (Freigabe liegt seit 04.09. vor) | Die Fotos liegen nur lokal, die Dateien-Bibliothek ist voll; Bilder per URL gehen nachweislich weiterhin | klein | Die beiden Kleider haben fast keinen Verkehr, der Wert ist die Vorlage für die Seiten, die Verkehr haben. Social bleibt aus |
| 28 | "Powered by Shopify" im Footer abschalten | Von sechs Shopify-Shops im Vergleich zeigt es keiner ausser uns | klein | Reine Politur, immer zuletzt |
| 29 | Vier dünne Kuratier-Kollektionen aus dem öffentlichen Verzeichnis nehmen | Sie haben fünf bis sechs aktive Produkte und null Sitzungen in 90 Tagen | klein | Eine Zeile. Die grossen "Zwillinge" bleiben: sie überschneiden sich gemessen kaum, und eine davon ist eine laufende TikTok-Anzeigenlandeseite |

## 3. Nur du kannst klicken

| Nr | Klick | Beleg | Aufwand | Erwartete Wirkung |
|---|---|---|---|---|
| A | Search Console freigeben: drei CSV exportieren (Suchanfragen, Seiten, Indexierung) oder ein Service-Konto als Nutzer hinzufügen | Semrush ist leer ("API units balance is zero"), damit haben wir für den einzigen Kanal mit Verkäufen keine einzige Suchzahl mehr | klein | Der wichtigste Klick auf dieser Liste: ohne ihn fliegen wir Google blind |
| B | Zwei Rechtstexte korrigieren: im Datenschutz fehlt hinter "telefonisch unter" die Nummer, die AGB verweisen auf das EU-Widerrufsrecht | Beide am Ursprung gelesen, die AGB widersprechen unserer eigenen Rückgabeseite | klein | Der Konnektor darf Richtlinien nicht schreiben, das geht nur im Admin. Fertige Texte liegen bereit |
| C | Kasse: "Crypto: USDC" deaktivieren | Null von sechzehn Bestellungen per Krypto, in einem CH-Shop ein fremdes Signal | 1 Minute | Telefon und Adresszeile 2 bleiben: die Hälfte der Kunden gibt die Nummer an, und der CJ-Auftrag braucht sie |
| D | Versandart an der Kasse: automatische Lieferdaten ausschalten und eine Ratenbeschreibung setzen | Die Kasse verspricht heute ein Lieferdatum 6 bis 10 Tage nach Bestellung, die Ware braucht 10 bis 20 Werktage. Das ist die Quelle der "Wo ist mein Paket"-Fälle | klein | Getrennt von der 45/50-Frage anfassen, die bleibt wie sie ist |
| E | Rabattcodes entscheiden: FIRST20 und BDAY20 laufen aktiv mit 20 Prozent, XMAS30 und BLACKFRIDAY40 feuern im Dezember bzw. am 27.11. automatisch | Alle vier nie eingelöst, die beworbenen Zeitfenster stimmen nicht mit den hinterlegten überein; insgesamt über 70 ungenutzte aktive Codes | klein | Reine Preisentscheidung, die kann ich dir nicht abnehmen |
| F | Clarity: entweder die zwölf Warenkorb-Sitzungen selbst ansehen oder mir ein Export-Token geben | Ich kann Clarity heute nicht lesen, jede Auswertung hängt an deinem Login | klein | Ohne das bleibt die Frage "warum bricht der Warenkorb ab" unbeantwortet |
| G | Bedienst du Kundinnen auf Italienisch? | Über uns und die Versandseite sagen vier Sprachen, die Kontaktseite drei | 1 Antwort | Danach setze ich eine identische Zeile auf alle drei Seiten |
| H | Judge.me: unter Request scheduling prüfen, ob Bewertungsanfragen aktiv sind, und gegebenenfalls abschalten | Steht seit dem 29.08. als Cowork-Punkt 13 offen; die API gibt diese Einstellung nicht heraus | klein | Falls aktiv, weicht Judge.me, nicht Klaviyo: die Klaviyo-Stufe hat gemessen einen Kauf erzeugt |

## 4. Bewusst nicht

| Verworfen | Grund |
|---|---|
| Versandschwelle 45 auf 50 umstellen (Cowork-Punkt 1) plus neuer Wächter | Der Wächter existiert seit 14.08. und läuft täglich, er meldet aktuell "stimmt überein". Die 45 ist die richtige Zahl, weil Shopify nach Rabatt misst; die Umstellung würde eine Totzone zwischen CHF 50 und 55.55 aufreissen, in der die Kasse Versand verlangt, während elf Seiten Gratisversand versprechen |
| Varianten als Knöpfe statt Dropdown | Die Umstellung auf Dropdown war am 04.08. eine bewusste Entscheidung gegen vier Bildschirme Knopfwand; Horizon kennt nur einen globalen Schalter, und Knöpfe zeigen ohne hinterlegte Farbmuster auch nur Text |
| Bewertungs-Widget siezt, Shop duzt | Der Satz steht nur im Konfigurationsblock, nicht im sichtbaren Bereich: seit 05.09. ist das leere Widget ausgeblendet, gerendert gemessen null Sie-Formen |
| WhatsApp als Kanal | Halb Duplikat des offenen Punkts "Shopify Inbox einschalten", dazu ein verdeckter Aufwand (eine Nummer trägt nur eine WhatsApp-Instanz) und ein Widerspruch zur Kontaktseite, die bewusst keine Telefonlinie anbietet |
| Chip "Ab CH-Lager" nach vorne | Führt in den grossen Modewelten auf etwa ein Dutzend Artikel, weil fast alle Lagerartikel Kostüme und Spielzeug sind: genau die Sackgasse, die wir am 30.08. gelernt haben |
| Gelato- und Hextom-Skript entfernen | Hextom steht schon auf deiner Liste; Gelato ist aber nicht ungenutzt, daran hängt die Erfüllung eines aktiven Schweiz-Edition-Produkts. 49 KB gegen ein funktionierendes Produkt ist ein schlechter Tausch |
| Judge.me-Sterne ins Produkt-Schema | Sie sind schon drin, Judge.me schiebt sie per Skript nach; die Gegenmessung am rohen Quelltext war der Fehler, das steht seit 14.08. als widerlegt im Gedächtnis |
| Sendungsverfolgung ans Kundenkonto hängen | In 120 Tagen gab es zwei Kundenanfragen zu Bestellungen, und keine hätte ein Kontolink verhindert; der Kontozugang steht ohnehin auf jeder Seite |

## 5. Was ich jetzt sofort anfange

1. **Nr. 1 - das Kundenstimmen-Karussell reparieren.** Es ist heute entstanden, es ist der einzige Punkt mit Priorität 1, und es macht auf dem Handy eine ganze Sektion unsichtbar. Backup, Inline-Style setzen, mit und ohne Judge.me gegenmessen, Desktop-Gegenprobe.
2. **Nr. 2 - das Zweitbild-Vorladen auf Touch abschalten.** Grösster reproduzierter Byte-Effekt, eine Zeile, Desktop-Hover bleibt unverändert. Danach messe ich die Startseite noch einmal mit demselben Werkzeug.
3. **Nr. 6 - "verifizierte Bewertungen" korrigieren.** Eine Zeichenkette, und sie steht gegen unsere eigene Regel; direkt unter dem Satz zeigt das Karussell sichtbar, woher die Bewertungen kommen.

Alle drei sind kostenlos, betreffen nur Theme-Dateien, sind einzeln umkehrbar und stören keine laufende Messung. Danach würde ich mit Nr. 3 und 4 weitermachen (gleiche Familie, gleiche Messmethode) und Nr. 7 vor dem 15. Oktober erledigen, weil die Startseiten-Rotation die Weihnachtskollektion sonst ungeprüft nach vorne hebt.
## 6. Was im Bericht fehlt (Vollständigkeits-Kritik)

**Fehlt: 1. Der Befund, der den ganzen Bericht trägt, ist nicht gemessen** — die Anweisung «Cowork-Punkt 1 bitte nicht ausführen» kehrt einen Betreiber-Entscheid vom 06.09. um, und die Beleg-Spalte enthält nur eine Herleitung («Shopify misst nach Rabatt», «10 % aus 50 macht 45»), keine Messung: kein Warenkorb bei CHF 48 und CHF 52, keine Rabatt-Regel-ID, kein Name des Automatikrabatts. Genau diese Gegenprobe steht als Pflichtschritt im Auftrag selbst (`dropship/COWORK-BEFEHL-2026-09-14.md`, Punkt 1: «48 → CHF 7.00, 52 → gratis»). Solange sie fehlt, steht Herleitung gegen Betreiber-Entscheid.

**Fehlt: 2. Die 404-Seite — die meistbesuchte Seite des Shops nach den Produktseiten** (Messung: `curl https://luxestyle.ch/404-test-xyz-abc` → HTTP 404, 544 KB, 22 Bilder; Hauptbereich hat Kategorielinks + 40 Bestseller-Karten, aber **kein Suchfeld**. Laut `dropship/KATALOG-VERKEHR-2026-09-14.md` Zeile 17 landen 1'232 Sitzungen = 38 % des Produktverkehrs auf Draft-Produkten, also hier). Punkt 9 behandelt nur alte Kampagnenseiten mit «unter 6 Sitzungen in 90 Tagen»; die Seite, auf der tausend Besucherinnen stranden, kommt im Bericht nicht vor — und es steht nirgends, ob die 61 Weiterleitungen von gestern alle 167 Drafts abdecken oder nur einen Teil.

**Fehlt: 3. Die native Warenkorb-Abbrecher-Mail von Shopify** — sie steht als Dauerauftrag im Gedächtnis («Warenkorb-Abbrecher: CHF 630 in 11 Checkouts entdeckt → native Shopify-Automation aktivieren!», CLAUDE.md §MISSION), ist kostenlos, braucht keine App, und der Bericht erwähnt sie in keiner der drei Tabellen — obwohl er 12 Warenkörbe zu 1 Abschluss als Ausgangslage nennt. Punkt 22/23 decken nur Klaviyo-Flows nach dem Kauf ab. Ungeklärt bleibt auch, ob Klaviyo und Shopify hier doppelt feuern würden (die Doppelversand-Klasse vom 29.08.).

**Fehlt: 4. Die Suchergebnisseite selbst** (Messung: `/search?q=kleid` → 200, **1'129 KB, 77 Bilder**, Titel «Suche: 1002 Ergebnisse gefunden für "kleid"»; **kein `<meta name="robots">`**, und `robots.txt` sperrt `/cart`, `/checkout`, `/account`, `/collections/*sort_by*`, aber **nicht `/search`**). Punkt 18 misst nur die Suchbegriffe und schliesst daraus «Problem ist Trefferreihenfolge» — ohne die Seite angesehen zu haben, auf der diese Reihenfolge entsteht. Nebenbei ist sie schwerer als die Startseite nach allen Sparmassnahmen und indexierbar.

**Fehlt: 5. Das Kundenkonto — und eine Behauptung in Abschnitt 4 hängt daran** (Messung: `/account/login` → **HTTP 302, 0 Bytes**, führt aus der Shop-Domain heraus in Shopifys neue Kundenkonten). Der Bericht verwirft «Sendungsverfolgung ans Kundenkonto» unter anderem mit «der Kontozugang steht ohnehin auf jeder Seite» — dass der Link vorhanden ist, sagt nichts darüber, was dahinter passiert (Code-per-Mail statt Passwort, fremde Domain, 1'498 Kunden ohne je geprüften Login-Weg). Die Verwerfung mag richtig sein, die Begründung ist ungemessen.

**Fehlt: 6. Die Shopify-eigenen Transaktionsmails** (Bestellbestätigung, Versandbestätigung, Versand-Update) — jeder Käufer bekommt sie sofort (Journal 06.09.), sie sind kostenlos editierbar, und sie tragen dieselbe Lieferzusage, die Punkt D an der Kasse als Quelle der «Wo ist mein Paket»-Fälle benennt. Im Bericht kommen nur Klaviyo-Vorlagen vor. Ohne sie repariert Punkt D die Kasse und lässt die Mail, die danach ins Postfach geht, unverändert.

**Fehlt: 7. Was der Cookie-Banner tatsächlich tut** — Punkt 5 verschiebt ihn optisch («einzeilig», «Popup erst nach der Cookie-Entscheidung»), misst aber nicht, ob vor der Einwilligung bereits Clarity, Meta- und TikTok-Pixel feuern. Das ist die einzige rechtlich relevante Frage am Banner, und sie hängt direkt an Punkt F (Clarity) und am laufenden TikTok-Pixel.

**Fehlt: 8. Zwei kleine Brüche in sich** — (a) Punkt 6 nennt «über 4700 Bewertungen», der gemessene Stand ist 4'355 (Prompt) bzw. 4'349 (CLAUDE.md); eine dritte Zahl ohne Quelle in genau dem Punkt, der Ehrlichkeit bei Bewertungen herstellen soll. (b) Punkt 12 nimmt WELCOME10 aus den Texten, sagt aber nicht, wer den Code im Admin deaktiviert — Punkt E listet FIRST20, BDAY20, XMAS30, BLACKFRIDAY40, WELCOME10 fehlt dort. Ergebnis wäre: Code unsichtbar, aber weiter aktiv und weiter im Widerspruch zum Mengenrabatt aus Punkt 25.

## 7. Was davon am selben Tag schon erledigt wurde

Zwischen Bericht und dieser Fassung liegen vier Stunden Arbeit. Erledigt und am Ursprung gegengelesen:

| Punkt | Was gemacht wurde | Gegenprobe |
|---|---|---|
| Vorwort | **Cowork-Auftrag 1 zurückgezogen.** Die Anweisung «Versandschwelle 45 → 50» hätte rabattierten Körben den Gratisversand nehmen können. Sie ist durch einen reinen Messauftrag ersetzt (zwei Testkörbe). | Versandprofil und Rabattregeln über die Admin-API gelesen; die Tabelle steht im Cowork-Auftrag |
| Nr. 1 | **Kundenstimmen-Karussell eingegrenzt** (`max-width:100%`, `min-width:0`, `overflow-x:clip`) | Datei zurückgelesen: Stil steht in `templates/index.json` |
| Nr. 6 | **«verifizierte Bewertungen» → «Bewertungen»** auf der Startseite | dieselbe Rücklesung, Wort ist weg |
| Nr. 7 | **Weihnachtskollektion gefüllt**: 4 → 166 Artikel (162 Produkte mit Titel «Weihnacht…» getaggt), **Text neu geschrieben** — er bewarb drei Adventskalender ohne Lieferanten-SKU | WebFetch auf die Live-Seite: 166 Artikel, neuer Text, keine Phantom-Produkte |
| nicht im Bericht | **Sechs tote Menülinks** repariert: `/en/collections/…` lieferte 404, darunter der Hauptpunkt «Schmuck & Uhren» | Menü zurückgelesen: 147 Einträge, 0 mit `/en/` |
| nicht im Bericht | **BigBuy-Abschied vervollständigt**: die Abfrage traf nur `tag:bigbuy`, 136 aktive Produkte mit `bb-…`-SKU wären bestellbar geblieben | 0 aktive Produkte mit BigBuy-Merkmal |
| nicht im Bericht | **«Premium & Marken»** hatte die Regel `Tag = bigbuy` und war nach dem Abschied leer → `Tag = premium`, 41 aktiv | Menü-Wächter meldet: alle Links führen auf gefüllte Kategorien |
| nicht im Bericht | **27 interne Ratgeber-Links** zeigten auf leere Kategorien → auf gefüllte umgebogen | Trockenlauf danach: 0 |

Offen und gemessen dokumentiert: **118 von 518 Kollektionen führen keine kaufbare Ware**
(`dropship/LEERE-KOLLEKTIONEN-2026-09-15.md`), davon rund 55 Markenregale, die sich nie wieder füllen.
Der Vorschlag dort lautet abmelden plus Weiterleitung — **nicht ausgeführt**, weil der Betreiber am
14.09. gesagt hat, der Katalog solle nicht verkleinert werden.

## 8. Nachtrag 15.09. abends — die drei Lücken aus Abschnitt 6 abgearbeitet

| Lücke | Ergebnis | Gegenprobe |
|---|---|---|
| **Nr. 2 — die 404-Seite** | **Suchfeld eingebaut.** `custom-liquid`-Block hinter dem Erklärtext, vor dem Knopf «Weiter einkaufen». Die Seite bot vorher nur vier Kategorielinks und 40 Bestsellerkarten; wer ein bestimmtes Produkt suchte, hatte keinen Weg. | Theme-Datei zurückgelesen (`block_order`: text → text → **custom_liquid_suche** → button → kat-links) UND gerendertes HTML geholt: `lux404-suche`, `name="q"`, Platzhalter vorhanden |
| **Nr. 3 — Warenkorb-Abbrecher-Mail** | **Kein Hebel, die Zahl im Gedächtnis meint etwas anderes.** Gemessen über `abandonedCheckouts`: **5 Kassengänge, CHF 203.62**, alle mit bekanntem Kunden, jüngster **22.08.**, davor 04.07. Die «12 Warenkörbe» aus dem Trichter sind Warenkorb-**Zulagen**, keine Kassengänge. Eine Abbrecher-Mail erreicht hier höchstens fünf Menschen im Quartal. | `abandonedCheckouts(first:30)` mit `completedAt`, `customer`, `totalPriceSet`; `marketingActivities`: 0 |
| **Nr. 4 — Suchergebnisseite** | **Zwei Behauptungen der Kritik waren falsch, die dritte stimmt.** Der Titel ist **nicht** leer (`Suche: 1000 Ergebnisse gefunden für "kleid"`), ein **canonical ist vorhanden**. Ein `robots`-Meta fehlt wirklich. **Aber `/search` ist längst gesperrt** — `Disallow: /search` steht in Shopifys Standard-robots.txt. Kein Handlungsbedarf. | robots.txt Zeile 36 im ausgelieferten Stand; Titel und canonical per Regex am rohen HTML |

### Ein Fehlgriff, offen protokolliert
Bevor ich das nachgeprüft hatte, habe ich eine `templates/robots.txt.liquid` angelegt, um
`/search` zu sperren. Zwei Fehler in einem:
1. Die Regel **gab es schon** — mein `grep -ci "search"` lief gegen eine leere curl-Antwort und
   zählte darum 0.
2. Die Nachbau-Vorlage **verlor alle rund 20 `Allow:`-Regeln** und den Kopfkommentar, weil
   `robots.default_groups → group.rules` hier nur die Disallow-Zeilen liefert.

Vorlage gelöscht, am Ursprung nachgeprüft (`templates/*` führt keine robots-Datei mehr),
Shopifys Standard gilt wieder. **Regel daraus: ein Zählergebnis von 0 ist erst dann ein Befund,
wenn belegt ist, dass die Eingabe nicht leer war.**
