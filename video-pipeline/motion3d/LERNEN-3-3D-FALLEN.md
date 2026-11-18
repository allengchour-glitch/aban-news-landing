# 3D-Animation mit three.js: Weg und Fallen

Gelernt beim Bau von Pia Folge 2 (`projekte/pia-folge2`). Der Weg: Seite mit `window.__seek3d(t)`, der Renderer setzt die Zeit, macht ein Bild, ffmpeg schneidet.

- **Aufbau:** `lib/toon.js` (Toon-Material, Umrisse), `lib/pia3d.js` (Figur als reine Funktion der Zeit), `lib/welt3d.js` (Welt, Tageszeit), `lib/kamera3d.js` (Einstellungen mit Schlüsseln), `lib/post.js` (Bloom, Farbton, Korn, Blende).
- **Software-WebGL:** ohne Grafikkarte rendert Chromium über SwiftShader, `--webgl sw`. Auf dem Laptop mit `--webgl gpu` (siehe `laptop/`). Gemessen: etwa drei Sekunden je Bild bei 1080×1920 mit Bloom.
- **Falle Skript-Tag:** fehlt `</script>` am Ende der Seite, führt der Browser das Modul nie aus, ohne Fehlermeldung. Zuerst das Ende der Datei prüfen.
- **Falle Warten:** `waitForFunction(ausdruck, arg, {timeout})`; die Optionen gehören an die dritte Stelle.
- **Falle Massstab:** Figur, Tisch und Häuser müssen zueinander passen. Hüfte 1 m neben einem Tisch von 1,3 m ergab Riesen: Figuren skalieren, Tisch niedriger, Sitzhöhe = Hüfte beim Sitzen.
- **Falle Hochformat:** ein 9:16-Bild zeigt in fünf Metern nur zwei Meter Breite. Gruppen brauchen acht Meter Abstand.
- **Falle Kamera im Haus:** Umrisse sind Rückseiten; steht die Kamera in einem Modell, bleibt das Bild schwarz. Häuser vor dem Planen der Fahrt an ihre Stelle rücken.
- **Falle Licht:** ein Punktlicht dicht an der Figur brennt das Gesicht weiss. Lichtstärke klein halten, Bloom-Schwelle hoch.
- **Falle Blickrichtung:** `ry = atan2(dx, dz)`, Figur blickt bei 0 nach +z.
- **Prüfen:** je Einstellung drei bis vier Standbilder zu einem Kontaktbogen; erst danach den vollen Lauf.
