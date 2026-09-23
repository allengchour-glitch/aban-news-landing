---
tags: [falle, teuer-gelernt]
quelle: dropship/LERNEN-EMAIL-EINSAMMELN-2026-09-13.md
gelernt: 2026-09-13
---
# YouTube liefert zwei Fassungen derselben Videoseite

GEMESSEN 2026-09-13 ueber acht Abrufe desselben Videos: YouTube liefert zufaellig eine volle und eine reduzierte Fassung derselben Seite. Der reduzierten fehlen shortDescription, viewCount, Dauer und Kanalname - sie traegt den echten Titel aber in videoPrimaryInfoRenderer und die echte Beschreibung in attributedDescription. Bei sechs Abrufen kam die volle Fassung ein Mal. KORREKTUR der gestrigen Lehre: die Seite mit Like this video ist KEINE Einwilligungsseite, sondern genau diese reduzierte Fassung; der Satz steht dort unter title.simpleText, waehrend der echte Titel daneben vollstaendig vorhanden ist. Wer die erste Titelquelle nimmt, bekommt die Gefaellt-mir-Frage als Videotitel. Und: lengthText in der reduzierten Fassung gehoert zu einem Vorschlagsvideo aus der Seitenspalte - es meldete 38:45 fuer ein 14-Minuten-Video, darum bleibt die Dauer dort unbekannt statt geraten. tools/yt_lernen.mjs behebt das, Selbsttests 11 auf 24, YT_VERSUCHE regelt die Anlaeufe.

Verwandt: [[Hypothese-mit-Datum]]
