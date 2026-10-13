---
tags: [falle, teuer-gelernt]
quelle: 13.10.2026 CH-LAGER-PROFIL Nachtrag
gelernt: 2026-10-13
---
# Stufen-Umstellung: Zeichen am Produkt statt Merkmal aller

Läuft eine Umstellung (Versandprofil) in Stufen, darf das Theme nicht aus einem Merkmal rechnen, das alle tragen (Tag ch-lager) — sonst zeigt die Seite für Nicht-Umgestellte ein zu frühes Datum. Das umstellende Skript setzt/entfernt ein eigenes Zeichen (profil-ch-lager), Rückweg entfernt es zuerst; Wächter prüft, dass das Theme das Zeichen abfragt. Massen-tagsAdd mit 20 Aliassen bündeln; pgrep -f in Warteschleifen findet die eigene Zeile.

Verwandt: [[Hypothese-mit-Datum]]
