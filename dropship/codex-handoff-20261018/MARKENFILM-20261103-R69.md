# LuxeStyle – tatsächlich gerenderter Website-Markenfilm, 03.11.2026 / R69

Der Inhaber bestätigt «LuxeStyle als Marke zeigen» und ausdrücklich vorhandene Website-Inhalte, geschnitten und bearbeitet. Diese Fassung setzt das um. Für diese Website-Montage sind neue Originaldrehs nicht erforderlich. Ein Schnitt mit zwei passenden Bildaufteilungen, stabile Master-ID `luxe_website_brand_master_20261103`.

- [Desktop-MP4](luxestyle-brand-desktop-r69.mp4): 1280 × 1120, 2.24 MB.
- [Handy-MP4](luxestyle-brand-mobile-r69.mp4): 810 × 1080, 1.50 MB.
- [Lokale Abspielansicht](MARKENFILM-ANSICHT-20261103-R69.html): HTML, beide MP4s und beide Poster in denselben Ordner laden; keine gehostete Website behauptet.

Beide Dateien sind tatsächlich gerendert: genau 20 Sekunden, 600 Frames, gleichmässige 30 fps, H.264/yuv420p, Rec.709 und Faststart. Stumm für die Startseite. Keine neue Musik, kein Voiceover, keine kostenpflichtige Generierung. Desktop und Handy zeigen denselben Master mit passend angeordneten Bildern und Texten.

## Inhalt und Gestaltung

| Zeit | Szene | Bild / Text |
|---|---|---|
| 0.0–2.8 s | Marke | Bestehendes Logo, «Schön leben. Schlau shoppen.», Mode/Wohnen/Geschenke |
| 2.8–6.8 s | Dein Stil. | Mode, Accessoires und Beauty aus vorhandenen Website-Bildern |
| 6.8–10.8 s | Dein Zuhause. | Wohnen, Küche und Technik; Kategorien korrekt bezeichnet |
| 10.8–14.1 s | Dein Alltag. | Freizeit, Familie und Gestaltung; ruhige Sport-/T-Shirt-Bilder |
| 14.1–17.5 s | Deine Ideen. | Selbst gestalten, Schenken, Entdecken |
| 17.5–20.0 s | Abschluss | «Deine nächste Lieblingsidee.» und luxestyle.ch |

Creme/Taupe, grosse Serifenschrift, präzise Schnitte und kurze maskierte Bildenthüllungen. Mobile Kategoriezeilen sind auf 30 px, Fusszeilen auf 27 px vergrössert. Bestehende Bilder werden zugeschnitten und angeordnet; keine erfundene Produktbewegung oder zusätzliche Produkteigenschaft. Alte Sommer-/Rabattbanner, Katalogzahlen und unpassende Fremdtexte wurden nicht übernommen. Die aktuelle Modequelle ist bereits am Haaransatz eng gefasst; dieser vorhandene Quellrand wird nicht als vollständig neue Aufnahme ausgegeben.

## Prüfung und Grenzen

30 technische Bedingungen und 26 Browserbedingungen bestanden, keine fehlgeschlagenen Bedingungen im benannten Umfang. Beide MP4s vollständig mit FFmpeg dekodiert. Tatsächliche Browserwiedergabe bis zum Ende, Pause und Sprung auf Sekunde8 bei1440/390px geprüft. Kein horizontaler Überlauf in der Abspielansicht, keine automatische Wiedergabe, native Bedienelemente und Tastaturfokus. Echte MP4-Szenen und fünf Schnittgrenzen visuell in Stichproben angesehen; keine kreative Vollabnahme durch den Inhaber daraus ableiten. Der Browsertest nutzte exakt dieselben lokalen MP4-Bytes und ist keine native Shopify-Einbindungsabnahme.

14 verwendete Quellbilder stimmen exakt mit dem Manifest überein; alle29 erfassten Textbegrenzungen liegen innerhalb des Bildes. Im geteilten Headless-Testsystem wurden4/879 bzw.8/871 Browser-Wiedergabeframes verworfen. Kodierte Zeitstempel und vollständige Dekodierung sind fehlerfrei; daraus kein Null-Drop-Versprechen für jedes Endgerät ableiten.

Shop und alle sechs Metricool-Kanalidentitäten frisch passend. Keine erneuten Kennzahl-/Flow-/Verkaufsreports oder Kauf-Watch-Abfragen. Keine Theme-/Produkt-/Flow-/Budget-/DNS-/Socialänderungen. Noch nicht auf der Website eingebunden. Fertiger Schnitt zur Ansicht, kreative Inhaberabnahme offen. Die bestehende Website-Materialwahl wird respektiert; sie ist keine unabhängige Drittanbieter-Lizenzbescheinigung. Der separate Social-Projektor-Master bleibt unverändert, keine Ausspielungsfreigabe übertragen.

## Dateien für die Fortsetzung

[Export-/Quellhashes](MARKENFILM-MANIFEST-20261103-R69.json), [24 aktuelle Website-Quellen](MARKENFILM-QUELLEN-20261103-R69.json), [Render-Skript](MARKENFILM-RENDER-20261103-R69.py), [selektiver Restore-Helfer](MARKENFILM-QUELLEN-LADEN-20261103-R69.py), [Prüfbelege](MARKENFILM-BELEGE-20261103-R69.json) und [präzisierter eigener Qualitäts-Skill](LUXESTYLE-VIDEO-QUALITY-SKILL-20261103-R69.md).

Die vorhandenen offiziellen Text-Skills aus R68 bleiben lokal erhalten. Kein neuer Runtime-/Hook-/Dienststart oder neue Installation. Der eigene Skill1.1 präzisiert ausschliesslich die aktuelle Website-Materialanweisung. Claude-Kenntnisnahme unbekannt. Nicht ungeprüft einen alten Theme-Stand veröffentlichen.

Für einen expliziten lokalen Neubau sind Python3/Pillow, FFmpeg mit libx264/zscale und die im Manifest per SHA gebundenen bestehenden Schriften erforderlich. Zuerst nur die14 manifestierten Bilder mit unveränderten Prüfsummen laden:

```sh
python MARKENFILM-QUELLEN-LADEN-20261103-R69.py --sources MARKENFILM-QUELLEN-20261103-R69.json --film-manifest MARKENFILM-MANIFEST-20261103-R69.json --output-dir assets
cp MARKENFILM-QUELLEN-20261103-R69.json assets/SOURCES.json
python MARKENFILM-RENDER-20261103-R69.py --assets assets --output film --preview --render desktop mobile
```

Dieser dokumentierte Neubau wird nicht automatisch gestartet. Kein Schlüssel nötig; HTTP-/Hashfehler bleiben Fehler. Vorhandene abweichende Dateien werden vom Restore-Helfer nicht überschrieben. Exakte frühere MP4-Dateien und deren Hashes bleiben der verbindliche Reviewbeleg, auch wenn eine andere FFmpeg-Version einen anderen Exporthash erzeugt. Vor der Websiteeinbindung sind aktueller Theme-Diff, passender Quellaustausch, Poster, Pause und Reduced-motion separat zu prüfen.
