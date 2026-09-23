---
tags: [sackgasse, nicht-erneut-versuchen]
quelle: Session
gelernt: 2026-09-20
---
# Instagram ist aus diesem Container nicht lesbar

Gemessen am 2026-09-20 an einem Reel: Instagram liefert nur eine leere JS-Huelle - 628 KB, title Instagram, NULL og-Tags, keine Video-URL, kein Nutzername, caption null. Vier Wege geprueft: Browser-Kennung plus stkn-Share-Parameter gibt dieselbe Huelle, ?__a=1&__d=dis gibt HTTP 404 not-logged-in, api.instagram.com/oembed gibt HTTP 302 (abgeschafft, braucht FB-App-Token). Die Gegenprobe entscheidet: ein ANDERER oeffentlicher Beitrag liefert identische 628 KB mit 0 og-Tags - es liegt also an Instagram, nicht am einzelnen Reel. Anders als bei TikTok, wo die Untertitelspur in den Metadaten steckt, gibt es hier keinen Weg ohne angemeldeten Browser. Der gebaute Ausweg: automation/local/ig-reel-lesen.mjs laeuft auf dem PC gegen das eingeloggte Brave auf Port 9222 und schreibt Text, Urheber und Zahlen als JSON. Quelle: automation/local/ig-reel-lesen.mjs

Verwandt: [[Hypothese-mit-Datum]]
