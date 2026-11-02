# Reel-Vorlage «Karte» (2.11.2026)

Foto-Reel aus drei eigenen Produktfotos: 9,4 s, 1080×1920, 30 fps, deutscher Text, wahlweise mit Stimme, Musik rotiert. Gestaltung von Codex (PR #2829, Wasserwellen-Lampe), hier verallgemeinert und verbessert (Besitzer 2.11.: «neue, bessere»): sanfter Zoom, Text blendet ein, Fenster mit unscharfem Hintergrund, helle oder dunkle Variante (`INVERS=1`).

**Nichts veröffentlicht, nichts in der Queue.** Das Skript schreibt nur die lokale MP4 (und mit `MUSIK_LOG_SCHREIBEN=1` eine Zeile ins Musik-Log). Es ruft weder `product-reel.yml` noch `reel-render.yml` noch Git auf.

## Aufruf
```bash
FOTO_A=https://… FOTO_B=https://… FOTO_C=https://… \
TITEL1="Tennis-" TITEL2="Armband" TAGLINE="Funkelnd, leicht, zeitlos." TEXT_MITTE="Mit Zirkon." NAME_KURZ="Tennisarmband mit Zirkon" \
OUT=/pfad/reel.mp4 MUSIK_LOG_SCHREIBEN=1 bash dropship/reel-vorlage/reel_karte.sh
```
`TROCKEN=1` prüft nur (Text, Zuschnitt, Musikwahl) und druckt den Filtergraphen. Optional: `CROP_B`/`CROP_C` (`x:y:breite:hoehe` im Original), `SHA_A/B/C`, `INVERS=1`, `MUSIK=<Datei>`, `ENDZEILE`.

## Stimme (optional, seit 2.11.2026)
Besitzer 2.11.: «mit Hochdeutsch … gesprochene Stimme». `SPRECHER="Text"` (≤ 160 Zeichen, Hochdeutsch, ≈ 20 Wörter) lässt **Piper** (lokal, gratis, `pip install piper-tts`) sprechen; Vorgabe `STIMME=de_DE-thorsten-high` (männlich), Alternative `de_DE-ramona-low` (weiblich, einfacher). Die Modelle (114 MB / 63 MB) lädt das Skript einmalig von huggingface in `PIPER_MODELLE` (Vorgabe `~/.local/share/luxe-stimmen`); sie liegen **nicht** im Repo. Die Stimme setzt nach 0,6 s ein, wird auf −16 LUFS angeglichen, die Musik duckt darunter (Sidechain). Das Skript bricht ab, wenn der Text länger als 8,3 s dauert. Marken- und Produktnamen so schreiben, wie sie klingen (z. B. «Luxe Style»). **Nicht belegt:** wie gut die Stimme klingt (kein Gehör hier), Aussprache einzelner Wörter; Azure-, OpenAI- und Gemini-Sprachausgabe gingen am 2.11. nicht (Schlüssel 401, Guthaben leer). Ohne `SPRECHER` bleibt das Reel stumm.

## Fotos (der heikle Punkt, nicht automatisierbar)
**Jedes Foto vorher von Hand ansehen:** keine Fremdschrift, keine Marken, keine Personen, keine privaten Bilder. Das Claude-Muster vom 2.11. hatte das übersehen (Polaroids mit Personen, Markentasche) und ist nicht verwendbar; Codex hat es mit Zuschnitten gelöst (`CROP_B`/`CROP_C`). Die Produktseiten-Videos sind Fremdmaterial und tabu.

## Text
Kein `'` `:` `%` `\` (drawtext), keine Emoji; Längen: Titel je ≤ 16, Tagline ≤ 30, Mitte ≤ 18, Name ≤ 36, Endzeile ≤ 28 Zeichen (das Skript lehnt Verstösse ab, Exit 2). Keine Preise, Rabatte, Lieferzeiten, Bewertungen oder Versprechen im Reel.

## Musik: fremde Stücke (Mixkit), rotieren, nie zweimal hintereinander dasselbe
Besitzer 2.11.2026: «kann man andere Musik nehmen … nie das gleiche» und zu den selbst synthetisierten Stücken: «das Schrecklichste, was ich gehört habe, nimm von irgendwo lieber». Darum **keine Eigenproduktionen mehr in den Reels**. `musik_waehlen.sh` rotiert über fünf Stücke von **Mixkit** (`mixkit-serene-view-443`, `-majestic-475`, `-dreamy-jazz-645`, `-new-york-427`, `-violin-uplift-675`): das zuletzt benutzte nie, sonst das am wenigsten und am längsten nicht benutzte (Log `musik-log.txt`). Lizenz (QUELLE mixkit.co/license, «Mixkit Stock Music Free License», am 2.11. gelesen): kostenlos, auch kommerziell und in Social-Media-Videos, **keine Namensnennung nötig**; nicht erlaubt: das Stück allein weiterverkaufen oder verteilen, und Content-ID-Registrierung. Die Dateien sind deshalb nur als Reel-Ton im Repo.

**Startsekunde:** die Stücke beginnen leise; `musik-start.txt` nennt je Stück die Sekunde, ab der der Hauptteil einsetzt (gemessen am Pegelverlauf: 16 / 14 / 11 / 24 / 9 s). Das Skript schneidet 10 s ab dort, blendet 0,4 s ein und 1 s aus und gleicht auf **−22 LUFS** an (`loudnorm`, Einzeldurchgang; Besitzer 2.11.: «Musik leiser», −16 war zu laut; gemessen −22,2 / −22,1 / −22,8 LUFS an drei Reels; mit `MUSIK_LUFS=-18` lauter). Mit Stimme duckt die Musik zusätzlich..

**Grenzen:** mit fünf Stücken heisst «nie das gleiche» «nie zweimal hintereinander und gleichmässig verteilt». **Gehört hat sie niemand von uns** (kein Gehör hier): ob ein Stück zum Produkt passt, entscheidet der Besitzer; unpassende Stücke einfach aus `tracks=` in `musik_waehlen.sh` streichen. Die älteren Eigenproduktionen und Kevin-MacLeod-Stücke (CC BY, mit Quellenangabe) bleiben im Verzeichnis für andere Zwecke, werden von der Vorlage aber nicht gewählt.

## Tests
`bash dropship/reel-vorlage/reel_karte_test.sh` (Trockenlauf, ohne Netz; prüft u. a., dass die Startsekunde im `atrim`-Filter ankommt) und `bash dropship/reel-vorlage/musik_waehlen_test.sh` (30 Wahlen, Verteilung, Sonderfälle). Mutationsprobe: acht absichtliche Schutzbrüche (u. a. Zuschnitt vertauscht, Zeichenprüfung weg, Pfad in `MUSIK` erlaubt, letztes Stück nicht ausgeschlossen, `INVERS` ohne Wirkung, `atrim` ohne Startsekunde) werden alle erkannt; Lücken der ersten Fassungen wurden dabei gefunden und geschlossen. Diese Tests laufen noch **nicht** in der CI.

## Ungetestet / offen
Hörabnahme der Musik am Reel (kein Gehör hier); Wirkung auf Verkäufe unbekannt; Plattform-Vorschau (IG/TikTok) nicht geprüft. Veröffentlichen entscheidet der Besitzer.
