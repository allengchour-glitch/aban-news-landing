# LuxeStyle – neue Startseite zur Beurteilung, 29.10.2026

[Shopify-Vorschau öffnen](https://luxestyle.ch/?preview_theme_id=212752499079&view=luxe-edit)

Die Gestaltung ist als separat aufrufbare alternative Startseite im bereits vorhandenen **UNPUBLISHED**-Theme `212752499079` gespeichert und exakt zurückgelesen. Es ist keine Änderung an der öffentlichen Startseite und keine vollständige Theme-Veröffentlichung. Das weiterhin aktive MAIN-Theme ist `212656488839`. Shopidentität `94368563585`, `au3j0y-hq.myshopify.com`, Domain `luxestyle.ch` und CHF wurden vor dem Schreiben frisch bestätigt.

## Was sich im Entwurf verbessert

- Ein grosses, eindeutig zugeordnetes Produktmotiv mit klarer Handlungsfläche ersetzt die Collage als Einstieg.
- Vier Einkaufswege führen zu Mode, Wohnen, Geschenkideen und allen Kategorien. Suche, Kundenkonto und Warenkorb bleiben direkt zugänglich.
- Eine kurze Produktauswahl und eine eigenständige Modegeschichte lösen viele ähnliche Produktreihen ab. Das Kleidfoto ist dem aktiven Produkt «Blumenkleid mit Schnürung» nativ als Hauptbild zugeordnet.
- Creme, Taupe, dunkle Schrift, grosse Serif-Überschriften und dezente Bedienungsübergänge führen die LuxeStyle-Marke weiter. Logos, Texte, Fotos und Videos von Meyer & Hässig wurden nicht übernommen.
- Mobile Menü-/Suchdialoge bieten Escape, Fokus-Rückgabe, sichtbaren Tastaturfokus und vergrösserte Klickflächen. Reduzierte Bewegung wird berücksichtigt.

Eine bessere Verkaufswirkung ist eine zu prüfende Hypothese. Dieser Lauf misst keine Conversionsteigerung und bestätigt keine neuen Käufe.

## Tatsächlicher Shopify-Diff

Fünf neue Dateien: `templates/index.luxe-edit.liquid`, `layout/luxe-edit-preview.liquid`, `sections/luxe-edit-home.liquid`, `assets/luxe-edit.css`, `assets/luxe-edit.js`. Die beiden vorhandenen Sprachdateien erhalten ausschliesslich einen neuen Namensraum `luxe_home`; ihre vorherigen Werte bleiben semantisch und textuell erhalten. Der neue Namensraum ist für diese deutschsprachige Vorschau auch im Fallback deutsch.

`templates/index.json`, `layout/theme.liquid`, Header- und Footergruppe wurden nicht verändert; ihre MD5-Werte wurden nachher mit dem Ausgangsstand verglichen. Damit bleiben frühere Schema-/Versandkorrekturen und die ursprüngliche Vorschau erhalten. Kein Duplikat des ganzen Themes, keine Produktaktivierung, kein Workflowstart und keine neue Automation.

Alle sieben Dateien wurden nach dem Write exakt zurückgelesen. Eine beim nativen Aufruf entdeckte SVG-Konvertierungsabweichung wurde gezielt in der neuen Section korrigiert, erneut validiert und exakt zurückgelesen. Die Vorschau ist mit `noindex, nofollow` gekennzeichnet. Der Parameter `preview_theme_id` setzt Shopifys Vorschaucookie; nach der Weiterleitung darf die Adresszeile nur noch `?view=luxe-edit` zeigen. Ohne Vorschaucookie immer den vollständigen Link oben öffnen. «Exit preview» beendet die Vorschau. Eine Vorschauleiste kann im Test den Cookie-Dialog überdecken; zuerst die echte Schaltfläche «Hide bar» betätigen.

## Produkt- und Linkgegenprobe

| Produkt | Aktueller enger Befund |
|---|---|
| Sternenlicht-Projektor, Produkt 15521256604033 / Variante 56197916361089 | ACTIVE, Tags vorhanden, CHF 34.90; `CONTINUE`, Tracking aus, Zähler 0; Storefront-Variante `available=true`. Die Preisfläche wird in Shopify aus dem aktuellen Produktpreis erzeugt |
| Weihnachts-Pyjama, Produkt 15447971430785 / Variante 55873727627649 | ACTIVE, Storefront verfügbar; gewählte Ausführung «Weiss · Papa S» CHF 16.90. Gesamter Storefront-Preisbereich CHF 14.90–17.90. Die Karte behauptet keinen Familien-Setpreis. `rueckhol-0907` bleibt erhalten und sperrt weiterhin neue Social-Ausspielung |
| Blumenkleid, Produkt 15460760191361 / Variante 55930607042945 | ACTIVE, Tags vorhanden, identisches Tati-Hauptbild; XS CHF 24.90, Storefront verfügbar. Kein neuer Material-/Grössen-/Lieferclaim |

13 verwendete Shop-/Kategorie-/Service-/Rechtsziele wurden gezielt per HEAD geprüft: HTTP 200 ohne Zieländerung. Das ist eine Erreichbarkeitsprobe, keine vollständige inhaltliche oder rechtliche Abnahme. Drei öffentliche Produkt-JSONs bestätigten die jeweils passende Varianten-ID und Verfügbarkeit. Keine Warenkorbmutation, Bestellung oder Kontaktformularnachricht ausgeführt. Die öffentliche Gratisversandschwelle CHF 50 und `account.luxestyle.com.co` bleiben erhalten. Interne CHF 45, Rabatte, Zahlungen und Versandregeln wurden nicht verändert.

## Prüfungen und Grenzen

Lokale Vorschau bei 1440, 390 und 360 px unabhängig geprüft: kein horizontaler Überlauf, vier Bilder nach Scrollen geladen, Menü und Suche mit Escape/Fokus-Rückgabe funktionsfähig. Zunächst fehlende Unicode-Pfeile wurden durch SVG ersetzt und zu kleine mobile/Footerklickflächen vergrössert.

Shopify-Liquid-Prüfung: sieben geänderte/neue Dateien erfolgreich; nach SVG-Korrektur erneute erfolgreiche Section-Prüfung. Die Aktualisierung des externen Schema-Manifests war nicht erreichbar; das Werkzeug nutzte vorhandene Shopify-Schemadateien. Kein vollständiger Theme- oder Checkout-Audit und kein Lighthouse-/Core-Web-Vitals-Vergleich behauptet. Native Browsergegenprobe bei 1440, 390 und 360 px: HTTP 200, genau eine H1, kein horizontaler Überlauf, alle vier Bilder direkt vom echten CDN geladen, keine Liquid-/Übersetzungsfehler und keine JavaScript-PageErrors. Such-/Menüdialog, Escape und Fokus-Rückgabe funktionieren. GET-Suchziel mit q und type=product kontrolliert, nichts abgesendet. Die Vorschauleiste wurde über ihre echte Hide-bar-Schaltfläche ausgeblendet. Kein Kauf-/Kontakt-/Checkouttest. Siehe separaten Prüfbeleg.

Die Gestaltung hat einen neuen eigenen Layout-Rahmen. Vor Übernahme in MAIN muss die endgültige Integration mit vorhandenen App-/Cookie-/Sprach-/Navigationserweiterungen gemeinsam geprüft werden. Diese Vorschau ersetzt keine vorhandenen Checkout- oder Themefunktionen im Liveshop.

## Video und nächster konkreter Schritt

Kein neues Video wurde gerendert oder veröffentlicht. Der gleiche professionelle 18-Sekunden-Master `luxe_sternenprojektor_master_20261018` bleibt offen. Hochwertige eindeutig zugeordnete Originaltakes und kommerzielle Bearbeitungsrechte fehlen weiterhin. Deshalb zeigt der Entwurf ein echtes Produktfoto ohne Play-Attrappe und übernimmt keine alten Collageclips.

[Konkrete Film-/Web-Vorgabe](STARTSEITEN-VIDEO-20261029.md): zwei Hook-Optionen, präziser 18-Sekunden-Schnitt, unveränderte Produktfarben, kein Voiceover und nur erneut geprüfte Pflichtmusik. Ein späterer Hochformatfilm wird vollständig gezeigt, nicht ungeprüft breit beschnitten.

Nächster Schritt: Inhaber beurteilt diese konkrete Gestaltung; danach freigegebenes Originalmaterial für denselben Master beschaffen/zuordnen und die endgültige Startseitenintegration prüfen. Kein MAIN-Publish aus diesem Lauf. Claude-Kenntnisnahme ist ohne Quittung unbekannt.

## Merchant-Fortsetzung

[Zweiter Export vollständig gelesen](MERCHANT-ZWEITER-EXPORT-20261029.md): 96’530 Fehlerzeilen, 31’083 IDs, anderer Scope als die erste Datei. Keine Preisfehlertitel und keine exakte Item-ID-Überschneidung in Datei 2. Quellen-ID und eingereichte URL fehlen weiter; damit ist kein Preisfehler als behoben belegt. Der frühere 32-MiB-Inhaltsblocker ist durch den bereitgestellten Drive-Zugang gelöst. Keine weiteren täglichen Kennzahl-/Flow-/Bestellabfragen für diesen Nachtrag.
