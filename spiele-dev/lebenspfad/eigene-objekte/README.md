# Eigene Lebenspfad-Objekte

Eigenständig mit `bpy` modellierte lokale Spielobjekte, ohne Texturen oder externe Assets. Autorisierter Umfang: `models/lebenspfad-eigen/` und dieser Ordner. Die HTML-/JS-Integration gehört Linnaeus.

**FERTIG / FREEZE, 16.11.2026:** finale GLBs und Vorschau geprüft; keine weiteren Änderungen durch diesen Agenten. Die Dateiprüfsummen der vollständigen Lieferung stehen in `FREEZE.sha256`.

## Modelle

- **Willkommenstor:** gerundeter Holzrahmen, Petrol-Einlagen, helle Fußmanschetten, Holznägel, zwei kleine Laternen und ein erhabener Stern auf einem Medaillon. Der Durchgang ist geometrisch offen.
- **Erinnerungsplatz:** kleiner Kalksteinplatz, Holzlattenbank mit Kupfergestell, offenes Buch mit Einband/Seiten/Falz/Leseband, Kupfertopf mit gefalteten Blättern und kleiner Sternstein.
- **Sternwarte:** runder Sockel, cremefarbener Rundbau, facettierte Petrolkuppel mit offenem Beobachtungsschlitz und Messingrippen, Teleskop mit Gabelmontierung/Sucher/Objektiv, Rundfenster und Sternportal.

Die Farbwerte sind feste Materialfarben. Die feinen Details bestehen aus Geometrie. Pro Modell wird jedes Material in genau einem statischen Mesh zusammengefasst.

## GEMESSEN: exportierte GLBs

Quelle: `messwerte.json`, direkt aus den erneut gelesenen GLB-Binärdaten. Blender 4.3.2, Maße in Spiel-/Blender-Einheiten. kB bedeutet hier 1000 Bytes. Die Budgets `<2500` Dreiecke und `<100000` Bytes sind SETZUNG aus dem Auftrag, im Skript als Exportprüfung erzwungen.

| Datei unter `models/lebenspfad-eigen/` | Breite × Höhe × Tiefe | Vertices Quelle / GLB | Dreiecke | Materialien / Meshes / Primitives | Bytes |
| --- | --- | ---: | ---: | --- | ---: |
| `willkommenstor.glb` | 5.4 × 4.0 × 1.066 | 780 / 2560 | 1440 | 5 / 5 / 5 | 74788 |
| `erinnerungsplatz.glb` | 4.8 × 2.0 × 2.65 | 910 / 3096 | 1588 | 5 / 5 / 5 | 88580 |
| `sternwarte.glb` | 5.0 × 5.0 × 5.0 | 1402 / 2966 | 2487 | 5 / 5 / 5 | 90788 |

GLB-Vertices zählen die tatsächlich exportierten POSITION-Einträge, einschließlich notwendiger Duplikate für unterschiedliche Flächennormalen. Quellvertices zählen die Blender-Meshvertices vor dem Export. Beide Werte sind daher absichtlich verschieden. Fünf Primitives ergeben im normalen Renderpass fünf Draw Calls je Modell; Schatten-/Zusatzpässe sind darin nicht enthalten.

| Modell | glTF Bounds Minimum (X, Y, Z) | glTF Bounds Maximum (X, Y, Z) |
| --- | --- | --- |
| Willkommenstor | (-2.7, 0, -0.5) | (2.7, 4, 0.566) |
| Erinnerungsplatz | (-2.4, 0, -1.325) | (2.4, 2, 1.325) |
| Sternwarte | (-2.5, 0, -2.5) | (2.5, 5, 2.5) |

**Integration:** glTF hat Y oben und die Vorderseite +Z. Blender verwendet Z oben und die Vorderseite -Y. Der Boden liegt exakt bei 0; der Ursprung liegt mittig zwischen den Grundfüßen bzw. im Sockelzentrum. Beim Tor ragt das Medaillon vorne leicht über die symmetrische Grundfläche. Die Meshtransformationen sind identisch; die Geometrie trägt die Maße. Keine zusätzliche Achsenrotation nötig. Alle drei GLBs enthalten nur statische Geometrie mit PBR-Materialien, ohne Kamera, Licht, Animation, Skin, Textur, UV oder externe Ressourcen. Keine Draco-/Meshopt-Dekompression erforderlich.

## Wiederholen

Im Worktree ausführen:

```bash
/usr/bin/blender --background --factory-startup --threads 6 --python-exit-code 1 \
  --python spiele-dev/lebenspfad/eigene-objekte/erzeugen.py -- --render
```

Ohne `--render` werden nur die GLBs und `messwerte.json` neu erzeugt. Ausgabepfade werden aus dem Skriptpfad abgeleitet. Es gibt keine Downloads, Installationen oder bezahlten Aufrufe. `/usr/bin/blender3` ist in dieser Umgebung nicht vorhanden; GEMESSEN wurde mit dem vorhandenen `/usr/bin/blender` in Version 4.3.2. Ist Blender anders benannt, muss nur der ausführbare Pfad im Befehl angepasst werden; andere Blender-Versionen wurden hier nicht geprüft.

Das Skript erstellt eigene `LP_Eigen_*`-Scenes und Collections. Es löscht oder verändert keine bestehende Szene und stellt die zuvor aktive Szene am Ende wieder her. Wiederholungen innerhalb einer geöffneten Blender-Sitzung behalten die vorherigen eigenen Szenen ebenfalls; Blender vergibt dann Namenssuffixe. Für reproduzierbare Dateinamen und Inhalte ist der oben genannte separate Factory-Startup-Prozess vorgesehen. Vorhandene eigene Ausgabe-GLBs werden dabei ersetzt.

Die Exportprüfung liest Positionen und Indices frisch aus dem GLB, misst Bounds und Dateigröße, prüft endliche Koordinaten, gültige Indices, Dreiecksflächen, Bodenhöhe und die Budgets. Vor dem Rendern importiert Blender die geschriebenen GLBs in eine weitere eigene Szene und prüft die Mesh-/Dreieckszahlen erneut. `messwerte.json` enthält SHA-256-Prüfsummen zur Übergabe.

Die zusätzliche Gegenprüfung lässt sich wiederholen mit:

```bash
/usr/bin/blender --background --factory-startup --threads 6 --python-exit-code 1 \
  --python spiele-dev/lebenspfad/eigene-objekte/pruefen.py
```

Sie prüft das Messgerät mit einem bekannten Dreieck und absichtlich defekten Indices/Flächen, den Erhalt vorhandener Szenen, byteidentische Wiederholung und die Bounds/Dreieckszahlen durch unabhängigen Blender-Reimport. Ergebnisse stehen in `pruefung.json`. Auch dieser Aufruf erzeugt die eigenen GLBs erneut; die Renderdatei bleibt erhalten.

## Vorschau und Grenzen

`kontaktbogen.png` wird in Blender aus den **wieder importierten GLBs** orthografisch gerendert. SETZUNG: 1500 × 700 Pixel, Cycles mit CPU, 128 Samples, ohne Denoising, da der installierte Build OpenImageDenoise nicht enthält. Die Vorschau verwendet einen eigenen neutralen Boden, Studiolichter und Blenders eingebaute Schrift; diese Elemente gehören nicht zu den GLBs. Kein Browser-/GPU-Test läuft durch dieses Skript parallel.

**GEMESSEN / GEPRÜFT:** finaler Render am 16.11.2026 tatsächlich mit dem Bildwerkzeug geöffnet und angesehen. Alle drei Modelle vollständig im Bild; Toröffnung, Stern, Banklatten, offenes Buch, Pflanze, Kuppelschlitz und Teleskop sind erkennbar. Die zunächst sichtbare Messing-Abdeckfläche im Kuppelinneren wurde vor dem finalen Render korrigiert. `pruefung.json` bestätigt acht bestandene Gegenprüfungen. Dieser Bildbefund betrifft die lokale Studiovorschau.

Die Objekte sind stilisierte Dekoration, keine betretbaren Gebäude und keine Kollisionsmodelle. Sich berührende Bauteile sind nicht als ein wasserdichter Körper vereinigt. Die Kuppelöffnung hat keine aufwendig modellierte Innenraumarchitektur. Buchschrift wird durch abstrakte Geometrie angedeutet; sehr kleine Details können aus Spielentfernung verschwinden. Die tatsächliche Webbeleuchtung, Schatten, Ladezeiten und Platzierung prüft der Integrationsagent; dazu wird hier kein Browserergebnis behauptet.

Higgsfield/3DJutsu ist momentan nicht angeschlossen. `erzeugen.py` ist eine wiederverwendbare reine `bpy`-Vorlage für einen später verfügbaren Blender-Anschluss. Es wurde ausschließlich lokal ausgeführt; keine private Szene, kein privater Connector und keine Plattform-Kompatibilitätsprüfung werden behauptet.

Keine Commits, kein Push und keine Veröffentlichung durch diesen Auftrag.
