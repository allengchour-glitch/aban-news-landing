# Hoodie-Druckvorschau mit Gemini (Tanja Keller / Wikingsbrothers, 26.10.2026)

Rezept für «echte Fotos statt Skizze». Die Skripte sind Referenz (feste Pfade nach /tmp und ins Scratchpad, KEINE Kundendaten im Repo: Kundenvorlage, Logo und Bögen liegen nur ausserhalb).

## Ablauf (das hat funktioniert)
1. **Kundenlogo abdecken, bevor etwas an Gemini geht** (`prep_logo_abdecken.py`: die Logo-Rechtecke werden mit dem Stoffton der Umgebung gefüllt, nicht mit einem flachen Rechteck — ein flaches Rechteck zeichnet Gemini als hellen «Aufnäher» nach). Beim ersten Durchgang gingen drei Ausschnitte noch mit sichtbarem Logo hinaus (Fehler, siehe CLAUDE.md).
2. **Muster entfernen / hochskalieren:** `gen.mjs <aus.png> 4:5 2K "<Prompt>" <ein.png>` mit `GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview` (Seitenverhältnis und `imageSize` gehen nur mit den Gemini-3-Modellen; `gemini-2.5-flash-image` liefert ~1 MP). Je Foto 2–3 Wiederholungen mit `TEMP=0.1/0.3/0.5`, das beste wählen — die Ausgabe ist nicht deterministisch.
3. **Logo hochaufgelöst:** kleiner Ausschnitt der Vorlage → 2K-Aufbereitung → Hochskalierung auf 4K. Schreibweise prüfen; Details (Knotenwerk, Symbol, Risse im Helm) weichen vom Original ab: nur Vorschau, nie Druckdatei ohne Freigabe der Kundin.
4. **Logo und Name nach dem Gemini-Lauf einsetzen** (`compose2.py`, 19 px je cm bei Grösse L; Brust 9 cm, Name 12 mm, Rücken 24 cm). Weil das Logo NACH der KI sitzt, bleibt es exakt wie die Datei.
5. **Bögen** (`sheets2.py`): Fotos, Detailansichten (Logo in der Vergrösserung neu gesetzt), Kostentabelle, Fussnote. Hosting über `automation/upload_to_shopify_cdn.mjs` mit unratbarem Dateinamen; alte Fassungen per `fileDelete` entfernen.

## Fallen
- **Rückansicht wird zur Vorderansicht** (Kordel, Kapuzenöffnung) → Prompt «seen from BEHIND … NO drawstrings».
- **Gesicht im Kapuzenausschnitt** → «NO face, NO chin, NO skin».
- **Fremdärmel am Bildrand** (Nachbar-Hoodie der Kundenvorlage): Gemini-Bearbeitung «remove the sleeve of a second person … replace with background» funktioniert, danach Rumpf-Abweichung messen (~5/255 ist Rauschen).
- **Muster-Bildteile kommen als Streifen am Rand zurück**, wenn man sie nur beschneidet; Rest per Zeilenmittel des Hintergrunds füllen.
- **Das Muster der Variante A ist von der KI nachgezeichnet, nicht die Vorlage** → in der Mail so benennen.
- Gmail-Entwurf: `<img>` aus fremden Adressen wird entfernt (nur Links bleiben); Anhänge gehen nur als Base64 im Aufruf (zu gross) → Links.
- Offerte-Fehler, die erst die Prüfung fand: Material A (70/30 war falsch, 96/4 bzw. 95/5), Mustertext A, «innen angeraut» unbelegt bei B. Produktseiten der Basis-Hoodies sind die Quelle: `recycelter-unisex-allover-hoodie-selbst-gestalten` (L CHF 84.90), `unisex-hoodie-selbst-gestalten` (L CHF 38.90).
