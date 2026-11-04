# Optik-Politur «Webseite 1A» (LIVE 04.11.2026 ~13:35 UTC, Stufe 1)

Auftrag des Besitzers (04.11.): «solche wie das kleine verbesserung automatisch suchen und ergänzen bitte, so dass webseite 1A ist und nicht billig» (später: «perfekter lebende webseite»). Nicht angefasst, weil nicht Teil des Auftrags: Preise, Versandschwellen-Texte, Rabattcodes, AGB/Impressum/Datenschutz, Produkte und ihre Texte, Menüstruktur, Kategoriebilder, Social-Beiträge.

## Verfahren
Workflow `optik-suche` (`wf_fb10406e-0a1`): drei Sucher sahen den Live-Shop als Mensch an (Desktop 1440, Handy 390 mit Touch, Startseite · Kategorie/Produkt/Suche · Warenkorb/Inhaltsseiten/404/Typografie) und meldeten Funde; **jeder Fund wurde von einem zweiten, unabhängigen Prüfer selbst nachgestellt** (Playwright am Live-Shop, Fix per Style-Einschub im Browser, nichts geschrieben), oft mit einem besseren Fix als dem vorgeschlagenen. Eingebaut wurde nur, was nachgestellt, gemessen und umkehrbar ist. Rohberichte: Journal des Workflows (nicht im Repo).

## Stufe 1: was live ist (`apply.mjs`, Änderungen in `patches.mjs`)
| Fund | Wo | Wirkung (GEMESSEN vom Prüfer) |
|---|---|---|
| Newsletter-Popup erschien gleichzeitig mit dem eigenen Cookie-Hinweis (die Prüfung fragte nur nach einem Shopify-Banner, den es nicht gibt) | `sections/footer-group.json`, Block `custom_liquid_lxpopup` (3 Ersetzungen, +136 Byte) | Popup bleibt weg, solange der Hinweis offen ist, und kommt erst 8 s nach der Entscheidung (zwei Prüfer unabhängig; beim sofortigen Erscheinen nach dem Klick lag der erste Vorschlag zu knapp) |
| Handy-Menü: untere Leiste verdeckte die letzten Zeilen und die Sprach-/Währungswahl (der Vorschlag «nur Polster» liess 6 Untermenüs und das Sprachfeld verdeckt) | `assets/luxe-edit.css` (nur Startseite und `/fr`) | Leiste verschwindet bei offener Schublade, 24 px Luft am Ende: 0 von 19 Untermenüs verdeckt |
| «Mode im Detail» und «Mach es persönlich»: graue/helle Seitenstreifen um die Fotos | `assets/luxe-edit.css` | Foto 487×649 und Kollage 384×480 füllen ihre Fläche (Desktop 1440 live nachgemessen) |
| «Schmuck entdecken»/«Für dein Zuhause»: quadratische Fotos in zu flacher Box (Streifen bis 248 px), Zweier-Reihe 872 px hoch | `assets/luxe-edit.css` | Boxen quadratisch (421 und 302 px), Zweier-Reihe ab 1100 px als Querkarte (Foto links, Text rechts), Seite bei 1440 px −143 px; unter 1100 px quadratische Karten untereinander (+109 bis +257 px) |
| Hilfe-Knopf deckte am Seitenende drei von vier Social-Symbolen | `layout/theme.liquid`, Style-Block `lx-optik-0411` | 52 px Platz unter der Fusszeile statt Verschiebung: Symbole bei y 776, Knopf bei y 828 (live: alle anklickbar) |
| Ankündigungsleiste Handy: dreizeilige Texte mit Zeilenhöhe 12 px bei Schrift 12 px | gleicher Block | Zeilenhöhe 15,6 px, Leiste 67 → 66 px (live), Umbrüche unverändert |
| Karten mit adaptivem Bildformat (Ähnliche Produkte, Suche, Warenkorb-Empfehlungen, 404): Karten bis 745 px hoch mit Leerraum | gleicher Block | einheitlich 4:5 (live: alle Galerien 329 px, alle Karten 423 px) |
| Leere Sterne und «Noch keine Bewertungen» auf fast jeder Kartenzeile (Damen-Schuhe: 46 von 48) | gleicher Block | ausgeblendet (live 46 von 46 unsichtbar, die 2 bewerteten bleiben), Seite −6 % Desktop, −14 % Handy; Fortsetzung der Besitzer-Antwort 03.11. («leere Sterne ja»), erfunden wird nichts |
| Fusszeile: drei Überschriftstile, 15 Links einspaltig, 687 px hoch | gleicher Block | einheitlich Serif 24/500 (live), Linkliste zweispaltig, wenn die Spalte breit genug ist (`columns:150px 2`), Fusszeile 687 → 490 px |

## Stufe 2: was zusätzlich live ist (LIVE 04.11. ~14:20 UTC, `STUFE=2 LIVE=1 node dropship/optik-0411/apply.mjs`, Änderungen in `patches2.mjs`)
Ein weiterer Style-Block `lx-optik-0411-b` in `layout/theme.liquid` (+2 088 Byte, nach dem Block von Stufe 1), Sicherung `sicherung/*.vor-stufe2`, Rücklesen GLEICH (Theme md5 `6ce17070…`).
| Fund | Wirkung (live gemessen) |
|---|---|
| Preiszeile sprang je nach Titelzeilen, in der höchsten Karte klebte der Preis am Kartenrand (Kategorie, Suche, Ähnliche Produkte) | Preis bündig am Kartenboden mit 12 px Luft, Listenansicht ausgenommen: Damen-Schuhe Desktop 5 von 5 Reihen und Handy 12 von 12 Reihen gleich (vorher 9 von 10 bzw. 13 von 24 ungleich, Prüfer) |
| Produktseite: leere Custom-Liquid-Hüllen und leerer Judge.me-Block kosteten je 24–28 px Abstand in der Kaufbox | 4 von 11 Hüllen ausgeblendet (die übrigen tragen Klasse/ID oder Inhalt), 0 sichtbare Hüllen mit Höhe 0; Mengenrabatt, Lieferzeit, Variantenwahl unverändert (Prüfer an 9 Produktseiten) |
| Lange Variantenlisten: 52 Farbwerte als Vollbreite-Knöpfe, rund 3 000 px | ab 13 Werten Knopf-Mindestbreite auf 8 rem gedeckelt: Haarbürste 52 Werte in 18 Zeilen, 1 153 px; Blumenkleid (4 Werte) unverändert. Der Vorschlag des Suchers (Raster mit 130 px) hätte kurze Grössenlisten ab 13 Werten verlängert und wurde verworfen |
Rücknahme je Stufe: `STUFE=2 ZURUECK=1 LIVE=1 node dropship/optik-0411/apply.mjs` (zuerst Stufe 2, dann Stufe 1). Offline geprüft: Roundtrip beider Stufen byte-gleich.

## Stufe 3: was zusätzlich live ist (LIVE 04.11. ~15:45 UTC, `STUFE=3 LIVE=1 node dropship/optik-0411/apply.mjs`, Änderungen in `patches3.mjs`)
Zwei Blöcke in `layout/theme.liquid` (+2 299 Byte, hinter dem Block von Stufe 2): `lx-optik-0411-c` (reines CSS) und `lx-optik-0411-c-etikett` (nur auf neun Seiten, per Liquid-Liste). Sicherung `sicherung/*.vor-stufe3`, Rücklesen GLEICH (Theme md5 `beb02fc4…`, CSS und Footer unverändert).
| Fund | Wirkung (live gemessen, Chromium) |
|---|---|
| Warenkorb-Schublade: «Zur Kasse» nur zu 41 %, die Express-Zahlung zu 0 % im Bild (bei jedem Warenkorb, jeder Fenstergrösse), das Schliessen-Kreuz lag über dem Leistentext | «Zur Kasse» und Shop/PayPal/GPay zu 100 % sichtbar und oberstes Element: 1440×900 (y 762/824), 1366×680 (542/604), Handy 390×844 (714/776); die Gratisversand-Leiste steht im Fluss (116 px), das Kreuz im 56-px-Polster. Texte und Schwellen unverändert |
| Warenkorb-Seite: Gratisversand-Leiste am Bildschirmrand statt im Seitenraster | Leiste bündig mit dem Seitentitel: x=40 (1440) bzw. x=16 (390) |
| Überschriften gleicher Grösse teils Serif, teils Sans | einheitlich Serif (Stärke unberührt): «Ähnliche Produkte», «Das könnte dir auch gefallen», Schubladentitel «Warenkorb», «Unsere Bestseller» (404), «Selbst gestalten – Deine Design-Produkte» |
| Internes Etikett «NO. 00X · …» über den Seitentiteln (Handy zweizeilig) | ausgeblendet auf neun Seiten (`versand-lieferung`, `garantie`, `ueber-uns`, `faq`, `rueckgabe`, `kontakt-support`, `tracking`, `pflegehinweise`, `groessenberatung`, auch `/fr`): live 0 von 9 sichtbar; **Impressum, Cookie-Richtlinie und Newsletter-Seite bewusst nicht in der Liste** (je 1 Etikett weiter sichtbar) |
| «Selbst gestalten»: Materialkacheln abgeschnitten («Gerahmt · …») | Poster: 6 von 6 Kacheln nicht abgeschnitten (T-Shirt und Hoodie nicht einzeln nachgemessen) |
Live nachgemessen: alle genannten Seiten HTTP 200, 0 «Liquid error», kein seitliches Scrollen (1440, 1366, 390). Konsole: nur `importScripts` des Shopify-Web-Pixels und einmal «Section … header_section not found» (nicht aus dieser Änderung). Rücknahme: `STUFE=3 ZURUECK=1 LIVE=1 node dropship/optik-0411/apply.mjs` (vor Stufe 2 und 1). Offline: Roundtrip byte-gleich, zweites Anwenden abgelehnt.

**Nebenwirkung der Schublade (vom Prüfer gemessen):** bei sehr niedrigen Fenstern (unter rund 650 px Höhe) bekommt die Artikelliste weniger Platz und scrollt innen (1280×550: 11 von 125 px sichtbar); vorher war dort «Zur Kasse» gar nicht erreichbar. Hochformat-Handy und Desktop ab 650 px sind nicht betroffen.

**Nicht eingebaut, bewusst:** Sprung der /cart-Leiste nach 2–3 s (Teil 2 des Prüfer-Fixes arbeitet mit festen Pixelhöhen, die an die heutigen Leistentexte gebunden sind), Straffung des Abstands unter dem Seitentitel (träfe auch Rechtstexte), Emoji vor Zwischentiteln (Texte, im Admin), Login-Seite von Shopify (nur im Admin unter Einstellungen → Branding), Kontrast des Primärbrauns (Geschmackssache, Markenfarbe).
**Von den Suchern gemeldet, von keinem zweiten Prüfer nachgestellt, darum nicht eingebaut:** Cookie-Hinweis und Newsletter-Popup auf `/fr` deutsch (braucht Übersetzungen), Preise der Trends-Reihe bei Karten mit Sternen, Rahmen-Übergang beim Überfahren, doppeltes Suchfeld auf der Handy-Suchseite und auf der 404-Seite, Facette «kategorie» klein geschrieben, Überschriften im Beschreibungsbereich der Produktseite.

## Live nachgemessen (Stufe 1, 04.11. 13:37–13:50 UTC, Playwright, Chromium)
Rücklesen aller drei Dateien GLEICH (md5 `3bc2da31…` Theme, `91cd0d7a…` CSS, `41781248…` Footer); Startseite, `/fr`, Kategorie, Produkt HTTP 200, 0 «Liquid error», 0 Seitenfehler; kein seitliches Scrollen (1440 und 390); Handy-Schublade: Leiste `display:none`, CHF/DE treffbar; Popup: 42 s lang Cookie-Hinweis offen und Popup zu, nach «Nur notwendige» Popup erst nach +11 s; `pruefen_live.mjs` (Rotation) weiter GLEICH.

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/optik-0411/apply.mjs` schreibt die Sicherungen (`sicherung/*.vor`) zurück, aber nur, wenn alle drei Dateien noch exakt dem eingespielten Stand entsprechen (sonst Exit 3: von Hand mit `zuruecknehmen()` aus `patches.mjs`, das die eingefügten Blöcke gezielt entfernt; offline gegen die Live-Dateien geprüft: Roundtrip byte-gleich).

## Bewusst offen / Grenzen
- Nur Chromium gemessen (kein Safari, Firefox, echtes iPhone); `:has()` wird für Menü-Leiste verwendet (ältere Browser: Verhalten wie bisher).
- Wer den Cookie-Hinweis nie beantwortet, sieht das Popup nie (so war es im Code von Anfang an beabsichtigt, vorher aber wirkungslos). Wirkung auf Newsletter-Anmeldungen **ungemessen**; die Klaviyo-Flows stehen seit 02.11. auf `draft` (Popup verspricht eine Mail).
- Auf der Handy-Startseite liegt der Hilfe-Knopf fast ganz hinter der unteren Leiste (nicht antippbar, Nebenbefund eines Prüfers, nicht geändert).
- Wirkung auf Verkäufe **ungemessen** (Kontrolle Mi 05.11., Mo 10.11.).
