---
tags: [sackgasse, nicht-erneut-versuchen]
quelle: dropship/LERNEN-SHOPIFY-CLAUDE-2026-09-13.md
gelernt: 2026-09-13
---
# YouTube-Transkripte gehen aus diesem Container nicht

Der Weg, der bei TikTok funktioniert hat (Untertitelspur aus den Seitendaten holen), scheitert bei YouTube. captionTracks steht im HTML, aber der timedtext-Abruf liefert HTTP 200 mit 0 Bytes, in allen Formaten srv1, vtt, json3 und mit tlang. Die Innertube-API antwortet UNPLAYABLE beim WEB-Client und FAILED_PRECONDITION beim ANDROID-Client. YouTube verlangt inzwischen ein PO-Token. Was stattdessen geht: die Videoseite per curl mit Browser-Kennung holen (rund 1,3 MB HTML) und shortDescription, ownerChannelName, uploadDate und viewCount herausschneiden. Die Kapitelmarken stehen in der Beschreibung und sind fast so gut wie ein Transkript. WebFetch auf eine YouTube-Seite ist nutzlos, es kommt nur die leere Huelle zurueck.

Verwandt: [[Hypothese-mit-Datum]]
