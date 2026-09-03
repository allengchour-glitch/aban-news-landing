# ⛔ TikTok-Autoposter steht — 3 Tage keine neuen Videos

Stand 2026-09-03: Das Profil @luxestyle.ch zeigt seit 3 erfassten Tagen
unverändert **66 Videos**, obwohl die Queue **7 freie Beiträge** hat.
Der tägliche 17:31-Post auf dem PC läuft also nicht.

## Die vier üblichen Ursachen, in Prüf-Reihenfolge (alles am PC)
1. **PC war aus** um 17:31 — dann reicht: anlassen, oder von Hand
   `%USERPROFILE%\LuxeStyleTT\run-post.cmd` doppelklicken.
2. **Browser abgemeldet:** `%USERPROFILE%\LuxeStyleTT\start-browser.cmd` öffnen und
   prüfen, ob tiktok.com noch als @luxestyle.ch angemeldet ist.
3. **STOPP.txt** liegt im Ordner `LuxeStyleTT` → löschen, wenn es weitergehen soll.
4. **log.txt** im selben Ordner lesen — die letzte Zeile nennt den Grund
   (ffmpeg fehlt, Port 9222 zu, Queue leer …).
