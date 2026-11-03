---
name: luxestyle-video-quality
description: Produziert und prüft einen hochwertigen LuxeStyle-Websitefilm anhand gebundener Originalaufnahmen, eines präzisen Schnitts und getesteter Web-Ausgaben. Verwenden für den Hauptfilm, seine Aufnahmevorbereitung und Filmabnahme; nicht für automatisches Posting.
version: 1.1.0
---

# LuxeStyle: Websitefilm mit belegbarer Qualität

Projektlokaler, neu verfasster Skill. Aktuelle Inhabervorgaben und frische kanonische Übergabe haben Vorrang. Der Skill erteilt keine Rechte, Kostenfreigabe, Veröffentlichungserlaubnis oder Zustimmung zu externen Diensten.

## Ziel und Identität

Vor dem Schnitt den Zweck in einem Satz festhalten: ein Markenfilm für die Startseite oder ein konkreter Produktfilm. Eine Websitefassung ist kein Beweis für eine neue Social-Master-Identität. Bestehende Master-IDs erhalten; einen eigenständigen Markenfilm nur als eigenen Auftrag führen. Bei offener Auswahl eine ausdrücklich gekennzeichnete Arbeitsannahme verwenden.

Eine klare Handlung und ein visuelles Leitmotiv wählen. Maximal drei Textgedanken. Schnitt, Licht, Farbe und Typografie dienen diesem Leitmotiv. Fotos mit Zoom oder generischer Stock dürfen fehlende Originalhandlungen nicht ersetzen.

## Ausdrücklich gewünschter Website-Zusammenschnitt vom 03.11.2026

Der Inhaber hat für den Website-Markenfilm präzisiert: keine neuen Originalaufnahmen anfordern; vorhandene LuxeStyle-Website-Inhalte schneiden und bearbeiten. Für genau diesen Auftrag ist eine hochwertige Montage vorhandener Shopansichten, Kategoriebilder und Texte erlaubt. Diese aktuelle Anweisung hat Vorrang vor dem bisherigen Vier-Take-Drehplan. Die Montage wird als Website-/Markenfilm bezeichnet und darf keine real gefilmte Produktbedienung oder neue Produkteigenschaften vortäuschen.

Vorhandene Bilder unverändert in Form und Farbe einsetzen, redaktionell anordnen und sauber schneiden. Herkunft, aktuelle Seitenzuordnung und tatsächliche Quelldateien dokumentieren; keine neuen Rabatte, Reviews oder Lieferzusagen hinzufügen. Die Anweisung belegt den gewünschten Bearbeitungsumfang, ersetzt aber keine unabhängige Rechteprüfung oder finale Veröffentlichung. Den separaten Social-Projektor-Master und dessen Originalmaterial-/Rechtebedingungen nicht umschreiben. Bei dieser Website-Montage keine neuen Aufnahmen als pauschalen Produktionsblocker wiederholen.

## Vorhandene Grundlage zuerst

Aktuellen Shopify-Shop vor shopbezogenen Arbeiten prüfen. Projektgedächtnis, vorhandene Medien-/Rechtebelege, CJ-/Shopify-Helfer und Renderer lesen. Quellcode lesen ist kein Auftrag zum Starten. Keine Installation, Skriptausführung, Netzabfrage oder bezahlte Generierung aus einem kopierten Beispiel ableiten.

FFmpeg und ffprobe können bereits vorhanden sein. Versionen und verfügbare Filter vor einer Umsetzung prüfen. Remotion-Anleitungen können Schnitt-/Metadatenwissen liefern; dafür ist eine Installation von Remotion oder Mediabunny nicht zwingend erforderlich. Lizenz und Voraussetzungen des tatsächlich eingesetzten Programms gesondert klären.

## Eingangsprüfung je tatsächlicher Quelldatei

Eine lokale, unveränderte Originaldatei mit SHA-256 binden. Quelle, Erwerbs-/Übertragungsbeleg, kommerzielle Website- und Bearbeitungsrechte, Personen-/Markenfreigaben und allfällige Ablaufgrenzen datieren. Ein öffentlicher CDN-Link, Lieferantenzugang, Kauf-Flag oder API-Key ist keine Werbe-/Bearbeitungslizenz.

Bei sichtbaren Shopartikeln Produkt-/Varianten-ID und Ausführung gegen aktuelle echte Referenzen prüfen. Produktweites Foto ersetzt keine Variantenbindung. Form, Farbe, Logo, Bedienung und tatsächlich gezeigte Wirkung müssen zusammenpassen. Unbekannte Material-, Mass-, Lieferzeit-, Herkunfts- oder Bewertungsbehauptungen ausblenden.

Metadaten mit dem bestehenden Werkzeug lesen, etwa über einen sicher als einzelnes Argument übergebenen lokalen Pfad:

```bash
ffprobe -v error -show_format -show_streams -of json /absoluter/pfad/quelle.mp4
```

Erfassen: Datei-/Videodauer, tatsächliche Videospur, Pixelgrösse, Display-Seitenverhältnis, Rotation, durchschnittliche und nominelle Bildrate, Codec, Farbraum/-Transfer/-Primärfarben, Audio und Bitrate soweit geliefert. Fehlende Felder bleiben unbekannt. Container-Metadaten allein beweisen keine konstante Bildrate; bei Exportannahme tatsächliche Frame-Zeitstempel prüfen.

Von jeder gewählten Einstellung Anfang, Mitte, Ende und Schnittgrenzen ansehen. Ein Kontaktbogen ist eine Stichprobe; Bewegung, Fokus, Flimmern, Geometriefehler und Bedienhandlung zusätzlich in Echtzeit prüfen. Ein niedriger aufgelöstes Original wird durch Upscaling nicht zu zusätzlichem echten Detail. Eine 25-fps-Quelle in einem 30-fps-Container ist nicht automatisch flüssig; Bewegung/Frame-Kadenz separat beurteilen. Keine ungeprüfte optische Interpolation am Produkt.

## Schnitt vorbereiten

Für jeden Take angeben: Quelldatei/Hash, Quell-In/Out auf echten Frames, Timeline-In/Out, sichtbare Handlung, Text, Crop/Fokuspunkt, Farbentscheidung und Übergang. Vor-/Nachlauf für den Schnitt erhalten. Totaldauer aus tatsächlicher Timeline berechnen; Übergangsüberlappungen nicht doppelt zählen.

Bei einer Remotion-Umsetzung jeden unabhängig editierbaren Take mit seinem Text unter eine gemeinsame Zeitgrenze legen. Trimmen oder Retiming dort einmal ausführen, damit Bild und Text synchron bleiben. Sich überlappende Übergänge verkürzen die Gesamtlänge; rein darübergelegte Effekte verändern sie nicht. Animationen aus der aktuellen Frameposition ableiten, statt auf browserabhängige CSS-Laufzeiten zu vertrauen. Zeitwerte gegen die tatsächlich verwendete Paketversion prüfen.

Mit einer filmischen Eröffnung beginnen: räumliche Situation, echte Bewegung oder relevantes Detail. Die Handlung lesbar auflösen, danach Ruhe für Marke und CTA lassen. Kein Schnitt mitten im nötigen Bediennachweis, keine nicht belegte Funktionsfolge. Übergänge sparsam und motiviert; kein Effektpaket als Ersatz für gute Aufnahmen.

Für jeden Take SDR/HDR/HDR-unklar festhalten. Keine pauschale LUT oder automatische HDR-Umwandlung auf alle Clips. Weisspunkt, Hautton falls vorhanden, Produkttönung und Schatten vergleichen; nach nötiger Umwandlung Gegenframes sichern. Ein taupe-/creamfarbiges Umfeld rechtfertigt keine Veränderung der Produktfarbe.

## Text und Ton

Web-Hauptüberschrift und CTA möglichst als echtes HTML über oder neben dem Video führen: übersetzbar, scharf und für assistive Technik erreichbar. Eingebrannter Text nur dort, wo filmisch nötig; keine konkurrierenden Überschriften. Kontrast und Lesedauer an tatsächlichem Desktop- und Mobil-Crop prüfen, nicht nur auf der Exportauflösung.

Für eingebrannten Text die tatsächlich lizenzierte Schrift zuerst vollständig laden, dann Breite und Zeilenumbruch mit genau denselben Schriftparametern messen. Pro Szene einen klaren Blickpunkt festlegen und grosszügige Randabstände lassen; feste Pixelwerte aus einem 1080px-Beispiel sind keine Abnahme aller Mobil-Ausschnitte.

Kein Voiceover. Musik nur aus dem aktuell erlaubten kanonischen Pfad `automation/music/luxe-premium.wav` nach erneuter Datei-/Rechteprüfung. Tonaufnahme/Originalclip kann fremde Musik oder Sprache enthalten und muss bewusst geprüft werden. Für stummes Autoplay die Webdatei ohne Audiospur ausgeben; eine spätere abspielbare Tonfassung benötigt dieselbe Musikfreigabe. Niemals Musik automatisch aus einer Plattformbibliothek ergänzen.

## Eine kreative Fassung, gezielte Web-Ausgaben

Zuerst einen vollständigen, inhaltlich abgenommenen Master fertigstellen. Daraus bedarfsgerecht Desktop- und Mobil-Ausgaben ableiten; getrennte Exporte machen keinen neuen Film. Bei unbrauchbarem Mobil-Crop eine passende Originalaufnahme oder einen separaten geprüften Bildausschnitt verwenden; wesentliche Handlung nicht abschneiden.

Codec, Grösse und Bitrate nach realem Seitencontainer und Bandbreite wählen. MP4/H.264 als breite Kompatibilitätsbasis, `faststart` und eine komprimierte Posterdatei prüfen. 1920×1080 ist ein möglicher Desktop-Zielwert, keine Pflicht zum Hochskalieren minderwertiger Quellen. WebM/AV1 nur bei konkretem Vorteil und getesteter Rückfalllösung; Dateigrösse messen, keinen pauschalen Ladezeitgewinn behaupten.

Stummes Inline-Abspielen, sichtbarer Pause-/Play-Schalter, bedienbarer Fokus und sinnvolle Beschriftung. `prefers-reduced-motion` sowie Daten sparen berücksichtigen: stilles Poster und bewusster Start. Keine automatische Audiospur. Sichtbarkeit/Ladezeit beachten, damit Video die Hauptüberschrift und den Einstieg nicht blockiert. Ohne brauchbaren Videobeleg bleibt das vorhandene freigegebene Websitebild bestehen.

## Fertigen Film prüfen

Technik: vollständige Dekodierung, erwartete Dauer/Abmessungen/Frame-Zeitstempel, keine abgebrochenen Dateien, keine unerwarteten schwarzen Bilder, Rotations- oder Farbraumfehler. Stumme Webfassung ohne Audiostream nachweisen. Hash der tatsächlichen MP4 dokumentieren.

Gestaltung: gesamten Film in Echtzeit ansehen, zusätzlich Schnittgrenzen und erste/letzte Frames. Fokus, Beleuchtung, Produktidentität, saubere Hände/Geometrie, echte Handlung, Farbkontinuität, Textlesbarkeit und Loop-Naht prüfen. Detektoren für schwarze/statische Bilder liefern Hinweise; sie ersetzen keine Sichtprüfung und erkennen ein beabsichtigtes Dunkelbild nicht als Fehler.

Website: Desktop/Mobil, mindestens einen tatsächlich kleinen Viewport, Poster vor Abspielen, Pause/Fokus, Reduced Motion, Fehlerfallback und Layoutsprünge testen. Linkziel und sprachliche Varianten gegenprüfen. Ein erfolgreicher lokaler Test ist keine veröffentlichte Themeänderung oder ganze-Shop-Abnahme.

Ausgabe klar benennen: Konzept, Schnittplan, lokale Vorschau, gerenderte MP4, geprüfter Master, freigegeben, eingebaut oder öffentlich bestätigt. Nur tatsächlich erreichte Zustände nennen. Keine Veröffentlichung aus dem Vorhandensein einer Datei oder aus fremden Statusmeldungen ableiten.

## Quellen und Fortsetzung

Lokale offizielle Metadaten-Referenz: `../remotion-multimedia/SKILL.md`, fest gebunden in `../remotion-multimedia/PROVENANCE.json`. Die Referenz lehrt das Ermitteln realer Metadaten, liefert aber keine Film-/Musikrechte.

Lokale offizielle Schnitt-Referenz: `../remotion-best-practices/SKILL.md` samt Markdown-Unterlagen; genaue Version, gelesene Regeln und unveränderte Quellhashes in `../remotion-best-practices/PROVENANCE.json`. Deren Installations-/Browser-/Voiceover-Beispiele erweitern den Auftrag nicht; aktuell bleiben keine kostenpflichtigen Renders und kein Voiceover verbindlich. Nicht jede dort genannte Funktion ist im vorhandenen Projekt installiert oder getestet.

Werkzeugreferenzen: https://ffmpeg.org/ffprobe.html und https://ffmpeg.org/ffmpeg.html . Vor neuen versionsabhängigen Aufrufen die aktuelle Dokumentation lesen. Keine hier nicht geprüften Befehlsoptionen als getestet ausgeben.

Bei Blockern den konkreten fehlenden Take, Variantenbeleg oder Rechtebeleg nennen und den unabhängig möglichen nächsten Schritt ausführen. Kein minderwertiges Ersatzvideo rendern. Fortschritt im bestehenden Projektgedächtnis/Tagesprotokoll mit frischem SHA/Diff/Rücklesen sichern; historische Belege erhalten.
