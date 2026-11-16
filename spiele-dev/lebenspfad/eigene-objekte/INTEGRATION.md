# Übergabe an Parent / Linnaeus

**FERTIG / FREEZE – 16.11.2026.** Die drei GLBs sind zur Integration bereit und werden durch diesen Agenten nicht weiter geändert. Finaler Kontaktbogen tatsächlich geöffnet und visuell geprüft. Acht Gegenprüfungen bestanden, einschließlich byteidentischer Reproduktion und Erhalt der vorhandenen Blender-Szene. Nur die beiden eigenen Ordner wurden bearbeitet.

GEMESSEN am Export, Dateipfade relativ zum Worktree:

| Spielobjekt | Bytes | Dreiecke |
| --- | ---: | ---: |
| `models/lebenspfad-eigen/willkommenstor.glb` | 74788 | 1440 |
| `models/lebenspfad-eigen/erinnerungsplatz.glb` | 88580 | 1588 |
| `models/lebenspfad-eigen/sternwarte.glb` | 90788 | 2487 |

Je fünf Materialien, fünf zusammengefasste Meshes/Primitives. glTF-Koordinaten: Y oben, Vorderseite +Z, Boden Y=0; Ursprung mittig in X/Z (Tor: Grundfüße mittig, Medaillon ragt vorne leicht vor). Breite/Höhe/Tiefe: Tor 5.4/4/1.066, Platz 4.8/2/2.65, Sternwarte 5/5/5.

Statische lokale Spielobjekte, keine Texturen, keine Animationen, keine externen Dateien, kein Decoder nötig. HTML-/JS-Integration bleibt vollständig bei Linnaeus.

Rezept und Grenzen: `README.md`; ausführbares bpy-Rezept: `erzeugen.py`; Messwerte einschließlich GLB-SHA-256: `messwerte.json`; Gegenprüfung: `pruefen.py` und `pruefung.json`; tatsächlich gesichteter Blender-Render: `kontaktbogen.png`. `FREEZE.sha256` fixiert die vollständige Lieferung und lässt sich vom Worktree aus mit `sha256sum --check spiele-dev/lebenspfad/eigene-objekte/FREEZE.sha256` prüfen.

Kein Commit, Push oder Deployment. Higgsfield/3DJutsu wurde nicht benutzt; ausschließlich lokales Blender 4.3.2 unter `/usr/bin/blender`.
