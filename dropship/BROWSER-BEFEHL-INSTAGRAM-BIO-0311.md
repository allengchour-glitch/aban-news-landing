# Auftrag für PC-Claude: Instagram-Bio-Link prüfen und auf luxestyle.ch/ig setzen (03.11.2026)

Ersetzt für Instagram den Auftrag `BROWSER-BEFEHL-BIO-LINKS-2810.md` (der ist veraltet: er schickt auf `kostueme-ch-lager` mit anderer Kampagne und verlangt einen TikTok-Link, den das persönliche TikTok-Konto nicht speichert). Für TikTok gilt nur `BROWSER-BEFEHL-TIKTOK-0311.md`.

**Warum:** In 14 Tagen kamen 0 Sitzungen aus Instagram oder TikTok (GEMESSEN 03.11.); die Beiträge sagen «Link in Bio». Ob der Link in der Instagram-Bio klickbar auf den Shop führt, ist ungeprüft (Instagram hinter Login-Wand). Ein Metricool-Link `f.mtr.cool/XRISHONHRA` (vorgesehen in `dropship/SOCIAL-MEDIA-POLITUR.md`) führt laut Messung 03.11. per 302 auf die Metricool-Seite «Konten verbinden», also ins Leere.

**Mach genau das (Brave auf Port 9222, Konto `luxestyle.ch` ist eingeloggt):**
1. Instagram-Profil öffnen, **den aktuellen Bio-Link wörtlich abschreiben und einen Screenshot machen** (vorher, nicht überschreiben ohne Notiz). Steht dort `f.mtr.cool/XRISHONHRA` oder gar nichts: melden.
2. Profil bearbeiten → Links → als einzigen Link `https://luxestyle.ch/ig` eintragen (Titel «Shop»). Er leitet per 301 auf die Sammlung `aus-tiktok-und-instagram` mit `utm_source=instagram&utm_medium=bio&utm_campaign=profil` (gemessen 03.11., Zielseite HTTP 200, `noindex`).
3. Speichern, Profil neu laden, Screenshot **nachher**, dann den Link einmal in Instagram anklicken (mobiler In-App-Browser, wenn möglich) und prüfen, dass die Sammlung «Aus TikTok und Instagram» mit Produkten lädt.
4. **Nicht ändern:** Name, Bio-Text, Profilbild, Kontoart. Keine Beiträge, keine Nachrichten, keine Käufe.
5. Stoppen und melden bei Login-Wand, 2FA, Captcha oder Sicherheitsabfrage (nicht umgehen).

**Bericht zurück (kurz):** alter Link (wörtlich), neuer Link, Ergebnis des Klicktests, beide Screenshots.
**Kontrolle durch Claude:** Shopify-Sitzungen mit `utm_medium = bio` und `utm_source = instagram` einen Tag nach der Änderung (Testklick sichtbar?) und am Mo 17.11. (Erwartung 0 bis etwa 10 in 14 Tagen bei der heutigen Reichweite von rund 123 pro Woche: ein Kaufurteil ist daraus nicht möglich, nur «Klickweg funktioniert: ja oder nein»).
