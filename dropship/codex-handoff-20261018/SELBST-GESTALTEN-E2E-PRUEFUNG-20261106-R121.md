# LuxeStyle: Read-only E2E-Prüfung «Selbst gestalten»

Stand: 06.11.2026, 17:37 Uhr Europe/Zurich

Lauf: R121

Shop: LuxeStyle · luxestyle.ch · CHF · Europe/Zurich · metrisch · Deutsch primär

## Ergebnis und Gesamturteil

Der öffentliche Desktop-Pfad vom Editor über den Design-Warenkorb bis zum Checkout ist in drei begrenzten Fällen erreichbar. Das ist ein Nachweis der Storefront- und Checkout-Erreichbarkeit, aber kein Nachweis korrekter Druckmasse oder einer autonomen Produktion. Das Gesamturteil lautet deshalb **NO-GO** für die Freigabe als verlässlich druckfertiger und autonom produzierbarer End-to-End-Prozess.

Der Header-Katalog zeigt live 22 Modelle. 17 `ACTIVE`-Produkte mit `wunschdesign` sind online und kaufbar. Zusätzlich lieferten alle 18 sichtbaren Shopartikel HTTP 200 und zeigten sowohl den Editor als auch den Design-Warenkorb-CTA. Diese Zählungen betreffen unterschiedliche sichtbare Flächen und werden nicht zu einer gemeinsamen Katalogquote verrechnet.

## Belegte Desktop-Pfade

| Prüfung | Produkt und Option | Warenkorb / Ausgabe | Abschluss |
|---|---|---|---|
| Hauptprüfung | Klassisches T-Shirt, Grösse S, Textdesign | CHF 24.90; 1200 × 1200 PNG ohne DPI-Metadaten auf Cloudinary; Line-Properties `Vorne · 🎨 Design` und `Vorne · 🖼️ Druckdatei` vorhanden | Checkout in `de-CH` und CHF erreicht |
| Zusätzliche Agentenprüfung | T-Shirt | CHF 27.90 | End-to-End bis Checkout erreicht |
| Zusätzliche Agentenprüfung | Tasse, 444 ml | CHF 25.90 | End-to-End bis Checkout erreicht |

Eine zusätzliche Root-Gegenprobe lud im Live-v5 über den Filechooser ein eigenes 300 × 300-PNG; das Bild erschien im Editor. Auch die Sticker-Auswahl `❤️` funktionierte. Die generierte Cart-Druckdatei war öffentlich erreichbar und hatte 1200 × 1200 Pixel, RGBA, 45’197 Bytes sowie keine DPI-Metadaten.

Zusätzlich erreichte der Agentenpfad bei 375 px technisch den Checkout. Wegen horizontalem Überlauf und abgeschnittenen Bedienelementen gilt dieser Mobilpfad dennoch nicht als zuverlässig vollständig bedienbar.

Es wurden keine Kunden-, Adress- oder Zahlungsdaten eingegeben und keine Bestellung ausgelöst. Temporäre Warenkorb-/Checkoutzustände und die beobachtete Cloudinary-Ausgabe belegen weder Printful-Übernahme noch Produktion oder Versand.

## Technische NO-GO-Blocker

| Bereich | Befund | Folge |
|---|---|---|
| Live-Editor v5 | Bekannte Abweichung zwischen Printvorschau und Druck von Faktor 2,8–3,4; 18 von 37 älteren Produkten liegen unter der Mindest-DPI | Vorschau, physische Druckgrösse und Auflösung sind nicht zuverlässig freigegeben |
| Editor v6.2 | Zentimeter-/Millimeterführung und DPI-Lock vorhanden; Tests 348/348 und 388/388 bestanden | Nur `DRAFT`-Canary, nicht live; die Korrekturen schützen den öffentlichen Pfad noch nicht |
| Printful-Übergabe | Sync nur als Dry-run; `PRINTFUL-SYNC-FREI.txt` fehlt; `PRINTFUL_AUTO_CONFIRM=0` | Kein autonomer Produktionserfolg und keine freigegebene automatische Bestätigung belegt |
| Mobil, 375 px | Checkout technisch erreicht; horizontaler Überlauf; Editor, `2XL`, `Sticker`, `Bild`, `Wiederholen`, `Vorschau` und Warenkorb-CTA teilweise abgeschnitten | Der mobile Gestaltungs- und Kaufpfad ist nicht zuverlässig vollständig bedienbar |

## Katalog-, Sprach- und Versprechenfehler

- `sg-alle` enthält 465 `ACTIVE`-Produkte, davon 447 Festdesigns ohne `wunschdesign`. Einstiegskollektionen sind doppelt vorhanden und zeigen abweichende Zählwerte. Ein Fan-Seiten-Link zum `DRAFT`-Produkt `wm-trikot` leitet per HTTP 301 auf eine Collection weiter.
- Alt- und ARIA-Texte verwenden «Weißes …» beziehungsweise «Weiße …» statt Schweizer `ss`; der Breadcrumb nennt `Home`. Sichtbar bleiben zudem `Disclaimer`, `White`, `Natural`, `On-demand`, `Originalmodell White Glossy Mug` sowie die Collection-Labels `CUT-SEW`, `EMBROIDERY` und `T-SHIRT`.
- Die Landingpage enthält «Viele Größen» und die gemischte Anrede «Sparen Sie … bei deiner». `WELCOME10` wird uneinheitlich verwendet.
- Die Massangaben sind überwiegend metrisch in cm/ml. Die Live-Spezifikation des klassischen T-Shirts nennt dennoch `5.8 oz`; `sg-alle` enthält ausserdem Festdesigns sowie `11oz`/`15oz`. Die globale Grössentabelle mit Asiengrössen-Warnung ist generisch und nicht als Bella-spezifisch belegt.
- Die Landingpage nennt 7–14 Tage, das Live-T-Shirt 10–20 Tage sowie den datierten Zeitraum 23. November bis 7. Dezember. Eine globale 30-Tage-Rückgabe steht der Regel gegenüber, dass personalisierte Produkte nicht wegen Meinungsänderung zurückgegeben werden können.
- Das Detailmodal der Tasse nennt gleichzeitig «3 bestellbare Ausführungen» und «Jetzt selbst gestalten», aber auch «Diese Angabe bestätigt noch keine Bestell- oder Liefermöglichkeit in der Schweiz» sowie «Druckbereiche und Druckvorlagen ... noch nicht ... freigegeben». Zusätzlich steht dort englisch «Originalmodell: White Glossy Mug».

## Koordination und nächste Freigabeschritte

`origin/main` stand bei `e6fc42e40`. Sämtliche Claude-Arbeit zu «Selbst gestalten» bis PR 2911 ist gemergt; R121 dupliziert diese Arbeit nicht und nahm keine Shop-, Produkt- oder Theme-Änderung vor.

Vor einem neuen GO müssen die v6.2-Schutzmechanismen kontrolliert auf dem öffentlichen Pfad nachgewiesen, die 18 DPI-Fälle und der reale Druckmassstab geklärt, der 375-px-Pfad vollständig bedienbar gemacht und die Printful-Freigabe samt kontrollierter Produktionsquittung belegt werden. Danach bleiben die Katalogabgrenzung, Schweizer Sprache, Einheiten, Liefer-/Rückgabeaussagen, `WELCOME10` und die Verfügbarkeitskommunikation zu vereinheitlichen.

## Grenzen dieses Laufs

R121 war eine read-only Prüfung der bestehenden Live-Flächen und der bereits vorliegenden Canary-/Sync-Belege. Es gab keine Shop-, Produkt-, Preis-, Collection-, Theme-, Merchant-, Feed-, Metricool-, Klaviyo-, DNS-, Rabatt-, Budget- oder Printful-Produktionsänderung, keine Kundennachricht und keine Bestellung. Checkout-Erreichbarkeit ist ausdrücklich kein Nachweis von Lieferantenverfügbarkeit, Druckgenauigkeit, physischer Qualität oder erfolgreichem Fulfillment.
