# LuxeStyle – Startseitenentwurf

Stand: 29.10.2026. Gestaltungsgrundlage für eine unveröffentlichte Vorschau. Kein Live-Umbau und kein Video-Freigabebeleg.

## Quellen und Beobachtungen

Die [LuxeStyle-Startseite](https://luxestyle.ch/) und die [Referenz Meyer & Hässig](https://meyerhaessig.ch/) wurden im selben Lauf abgerufen. Die gespeicherten Desktop-Aufnahmen mit 1440 px Breite wurden visuell geprüft. Die Aufnahmen zeigen Momentzustände; Videobewegung, Ton, mobile Ansichten und die Qualität des Kaufprozesses sind dadurch nicht geprüft.

| Bereich | Beobachtung | Konsequenz für den Entwurf |
| --- | --- | --- |
| Referenz: Einstieg | Grosses einzelnes Produktmotiv, dunkler Bildraum, kurze grosse Überschrift, zwei klar erkennbare Handlungslinks | Eine echte LuxeStyle-Bildgeschichte pro Einstieg; ein klarer Hauptweg und ein zurückhaltender zweiter Weg |
| Referenz: Navigation | Fünf Produktfamilien in einer horizontalen Hauptnavigation | LuxeStyle-Sortiment in wenige Einstiege gliedern, weitere Kategorien über einen vollständigen Katalogzugang erreichbar halten |
| Referenz: Rhythmus | Helle Produktflächen wechseln mit dunklen, grosszügigen Produktgeschichten | Wenige klar unterschiedliche Abschnitte statt wiederholter Produktkarussells |
| LuxeStyle: Marke | Cremefarbener Hintergrund, taupefarbene Akzente, Serif-Überschriften und schlichter Fliesstext | Die eigene Markenwelt weiterentwickeln; keine schwarzweisse Kopie der Referenz |
| LuxeStyle: Einstieg | Viele Navigationseinträge und eine Bildcollage mit zahlreichen Kategorien konkurrieren um Aufmerksamkeit | Ein Motiv mit eindeutigem Ziel, weniger Beschriftungen und mehr Abstand |
| LuxeStyle: Seitenlänge | Die Aufnahme ist 13’221 px hoch und enthält viele gleich aufgebaute horizontale Produktreihen | Erste Vorschau auf fünf bis sieben bewusst ausgewählte Abschnitte konzentrieren |
| LuxeStyle: Inhalte | Liefer-, Rabatt-, Lager- und Bewertungsangaben erscheinen auf der bestehenden Seite | Diese Angaben nicht ungeprüft in neue Module übernehmen; sichtbare Shop-Angaben allein bestätigen keine neuen Werbeaussagen |

Das automatische Branding-Ergebnis der Referenz enthält Blauwerte, die im sichtbaren Hauptlayout keine prägende Rolle spielen. Sie werden deshalb nicht als verifizierte Markenfarben übernommen. Die unten genannten LuxeStyle-Basiswerte stammen aus der Extraktion und passen zur sichtbaren Seite; neue Detailwerte sind ausdrücklich Entwurfsentscheidungen.

## Gestaltungsziel

Ruhiger Einstieg, schnelleres Finden und verständliche Produktauswahl. Die Startseite soll Lust auf das Sortiment machen und direkt zu erreichbaren Produkt- oder Kategorieseiten führen. Eine bessere Verkaufswirkung ist eine zu prüfende Hypothese, kein belegter Effekt.

Leitidee: **«Schönes für deinen Alltag.»** Kurze, konkrete Ergänzung: **«Entdecke Mode, Wohnen und Geschenkideen bei LuxeStyle.»** Keine Qualitäts-, Herkunfts- oder Materialbehauptung ohne Produktbeleg.

## Design-Tokens

```css
:root {
  /* Aus LuxeStyle-Extraktion; zur sichtbaren Markenwelt passend. */
  --ls-cream: #FAF7F2;
  --ls-taupe: #8B7355;
  --ls-sand: #E7D8C4;
  --ls-gold: #D4B896;
  /* Entwurfswerte. Dunkler Text erhöht Lesbarkeit auf hellen Flächen. */
  --ls-ink: #292722;
  --ls-muted: #635C52;
  --ls-line: #DED6CA;
  --ls-surface: #FFFFFF;
  --ls-heading: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
  --ls-body: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --ls-page: 1320px;
  --ls-gutter: clamp(20px, 4.5vw, 72px);
  --ls-section: clamp(56px, 7vw, 112px);
  --ls-radius: 8px;
}
```

Bestehende lizenzierte Schriftdateien wiederverwenden. Keine neue externe Font-Verbindung erforderlich. Überschriften mit `clamp()` skalieren; Hero ungefähr 44–80 px, Abschnittstitel 32–48 px, Fliesstext 16–18 px. Normaler Text benötigt mindestens 4.5:1 Kontrast. Taupe nicht ungeprüft für kleine Schrift auf Creme einsetzen. Produktbilder sollen bei fehlenden zugesicherten Zuschnitten mit `object-fit: contain` sichtbar bleiben; Editorialbilder dürfen nach Sichtprüfung `cover` verwenden.

## Aufbau der Vorschau

1. **Kompakter Kopf.** Eine ruhige Informationszeile; öffentliche Gratisversandschwelle CHF 50 unverändert. Logo, Suche, Kundenkonto und Warenkorb. Fünf Einkaufszugänge plus «Alle Kategorien»; Vorschlag: Mode, Wohnen, Geschenkideen, Accessoires, Technik. Kategorien und Links nur verwenden, wenn tatsächliche Zielseiten bestätigt sind. Keine neue Konto-Domain.
2. **Ein grossflächiger Einstieg.** Authentisches LuxeStyle-Motiv mit dokumentierter Zuordnung. Links eine kurze Serif-Headline und maximal zwei Zeilen Text, rechts oder im Hintergrund das Motiv. Hauptlink «Kollektion entdecken» nur auf eine geprüfte passende Kollektion. Zweiter Link «Alle Kategorien». Auf Mobil Text oberhalb des Bildes, keine für Text abgeschnittenen Produkte.
3. **Drei Einkaufswelten.** Drei grössere Bildkarten mit Titel und einem klaren Link. Beispielsweise Mode, Wohnen und Geschenke, falls diese Ziele belegt erreichbar sind. Keine erfundenen Produktmerkmale in Kartentexten.
4. **Eine kuratierte Produktauswahl.** Vier bis sechs tatsächlich geprüfte Produkte. Preis in CHF, eindeutige Produktnamen und echte Bilder. Keine unbestätigten Badges wie «Bestseller» oder «Nur noch wenige». Nur zur tatsächlich auswählbaren Variante passende Preisangaben. Kein automatisches Rotieren.
5. **Eine Produktgeschichte.** Grosse echte Detailaufnahme, kurzer belegbarer Text und direkter Produktlink. Hier kann später der eine professionelle, freigegebene Master eingesetzt werden. Bis dahin ein korrektes Foto ohne Play-Symbol oder angebliche Videolaufzeit.
6. **Orientierung und Service.** Kurze Links zu bestehenden Versand-, Rückgabe- und Kontaktseiten. Keine ungeprüften Leistungsversprechen und keine neue Rabattaktion. Kompakter Footer mit den bestehenden rechtlichen Zielen.

Die Detailreihenfolge kann der geprüften Bild- und Produktlage folgen. Fehlende echte Motive sind ein Materialblocker und kein Anlass, fremde Produkte oder generisches Stockmaterial einzusetzen.

## Video und Bewegung

Es ist noch kein neues Premiumvideo nachgewiesen. Die Quelle des bekannten Projektor-Masters war 960×540 bei 25 fps; Rechte, Ausführung und die Freigabe des fertigen Films waren offen. Ein Layoutwechsel löst diese Produktionsblocker nicht.

- Freigegebenes Video erst nach Prüfung von Produktform, Farbe, Logo, Funktion, Handlung, Lesbarkeit, Ton, Ausschnitten und kommerziellen Bearbeitungsrechten einbinden.
- Kein Voiceover. Ausschliesslich die erneut gegen Datei und Rechte geprüfte `automation/music/luxe-premium.wav` verwenden.
- Der bekannte 18-Sekunden-Master bleibt derselbe Master. Für eine breite Websitefläche nicht automatisch einen vertikalen Export beschneiden; passendes Querformat oder ein unbeschnittenes Hochformat-Modul nach Sichtprüfung wählen.
- Statisches `poster` muss das echte Produkt zeigen. `preload="none"`; Laden und Abspielen nach ausdrücklicher Nutzeraktion. Sichtbare Play/Pause-Steuerung nur bei vorhandener abspielbarer MP4. Ton erst nach Nutzeraktion.
- Für `prefers-reduced-motion: reduce` statische Darstellung verwenden. Kein automatisch laufendes Karussell, kein Parallax-Zwang.
- Dezente CSS-Übergänge für Buttons und Navigation sind UI-Bewegung, kein Ersatz für einen Produktfilm.

## Mobile und Bedienung

- Unter 900 px übersichtliches Menü mit echten Links, deutlichem Schliessen und Escape-Unterstützung. Fokus im geöffneten Dialog führen und danach zum Auslöser zurückgeben.
- Suchfeld direkt nutzbar; keine dekorative Suchschaltfläche ohne Funktion.
- Tastaturfokus deutlich sichtbar, Sprunglink zum Inhalt, sinnvolle Überschriftenhierarchie und mindestens 44×44 px grosse Bedienelemente.
- Bildkarten ohne versteckte Hover-Pflicht. Bei vier Produkten auf Mobil zweispaltig, sehr schmale Displays notfalls einspaltig.
- Keine horizontal überlaufenden Navigations- oder Textzeilen bei 360 px.
- Ein bis zwei wichtige Bilder priorisiert laden, weitere Bilder lazy. Breite/Höhe und passende `srcset`-Grössen setzen. Videodownload nicht für den ersten Bildaufbau erzwingen.

## Asset-Regeln und offene Belege

Die Logos, Fotos, Videos, Produkttexte und Kundenstimmen von Meyer & Hässig sind ausschliesslich Referenzmaterial und werden nicht übernommen. Bestehende LuxeStyle-CDN-URLs beweisen eine aktuelle Veröffentlichung, aber keine zusätzliche Bearbeitungs- oder Werbelizenz. Für eine private Gestaltungsvorschau können nach Zuordnungsprüfung unveränderte bestehende Produktbilder referenziert werden; Produktion und Social-Ausspielung benötigen die jeweiligen Freigaben.

Die lokalen Quellen `reference.png`, `luxestyle.png` und `SOURCES.json` dienen dem internen Abgleich. `SOURCES.json` enthält den vollständigen Seitenextrakt und wird wegen darin enthaltener fremder Login-/Zahlungslinks nicht als öffentliches Asset ausgeliefert.

## Abnahme vor Live-Nutzung

Eine tatsächliche Vorschau ist bei 1440, 768 und 390 px auf Bilder, Lesbarkeit, Linkziele, Suchfunktion, Menübedienung, Fokus und horizontalen Überlauf zu prüfen. Produktstatus, Variantenpreis und Kaufbarkeit nochmals aktuell gegenprüfen. Vorlage und Tests sind keine Freigabe für eine Veröffentlichung oder ein Verkaufsversprechen.
