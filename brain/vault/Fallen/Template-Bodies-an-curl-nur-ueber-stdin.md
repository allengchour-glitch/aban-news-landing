---
tags: [falle, teuer-gelernt]
quelle: automation/homepage_katalog_rotation.py
gelernt: 2026-09-14
---
# Template-Bodies an curl nur ueber stdin

14.09.2026: themeFilesUpsert mit dem 140-KB-index.json als curl -d Argument → OSError Argument list too long. Loesung: --data-binary @- mit input= (subprocess) bzw. --data-binary @datei. Gilt fuer jeden grossen GraphQL-Body.

Verwandt: [[Hypothese-mit-Datum]]
