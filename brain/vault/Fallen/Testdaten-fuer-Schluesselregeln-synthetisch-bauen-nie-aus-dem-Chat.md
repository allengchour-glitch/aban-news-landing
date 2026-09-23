---
tags: [falle, teuer-gelernt]
quelle: Journal Nachtrag 48
gelernt: 2026-09-23
---
# Testdaten für Schlüsselregeln synthetisch bauen, nie aus dem Chat

GitHubs Push-Schutz lehnte den Push ab, weil eine 84-Zeichen-Gegenprobe in server/wartung.test.mjs aus dem Chat kopiert war und wie ein Azure-Schlüssel aussah. Regel: Testzeichenketten per repeat() bauen; lokale Commits vor dem ersten Push mit reset --soft origin/… neu schreiben (kein Force-Push nötig); Signaturprobe git grep vor dem Push. Der Push-Schutz ist die letzte Schicht.

Verwandt: [[Hypothese-mit-Datum]]
