---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-10-07 10:30 Nachtrag
gelernt: 2026-10-07
---
# Nach Container-Neustart erst Keepalive abwarten

engine_keepalive.sh ruft nach Neustart repo_vorspulen.sh (Reset auf origin). Eine neu geschriebene, noch unversionierte Datei (automation/fremdtext.py) war danach weg. Regel: nach Neustart den Keepalive zu Ende laufen lassen, erst dann schreiben — und neue Dateien sofort committen+pushen.

Verwandt: [[Hypothese-mit-Datum]]
