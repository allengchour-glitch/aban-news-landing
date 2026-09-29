---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Cloud-Sessions HABEN einen Browser - der Satz im Gedaechtnis ist widerlegt

GEMESSEN 2026-09-27: CLAUDE.md sagt seit dem 12.06. in Grossbuchstaben 'Cloud-Sessions haben KEINEN Browser' und verweist Browser-Aufgaben an den PC des Users. Nachgemessen: Chromium 141.0.7390.37 liegt ausfuehrbar unter /opt/pw-browsers/chromium-1194/chrome-linux/chrome, playwright liegt GLOBAL in /opt/node22/lib/node_modules (darum scheitert ein blosses import playwright aus dem Projekt - das erklaert die Notiz vom 11.09.), und eine echte Produktseite laedt mit HTTP 200 und rendert. Die Huerde ist das Zertifikat: der Agent-Proxy bricht TLS auf und Chromium 141 bringt seinen eigenen Wurzelspeicher mit, System-Trust und NSS unter ~/.pki/nssdb helfen ihm nicht, Ergebnis ERR_CERT_AUTHORITY_INVALID. Der Weg ist NICHT ignoreHTTPSErrors (das schaltet die Pruefung ganz ab), sondern --ignore-certificate-errors-spki-list mit den SPKI-Fingerabdruecken der dokumentierten Anthropic-Proxy-CAs aus /root/.ccr/ca-bundle.crt. Fertig gebaut als tools/browser.mjs mit 12 Selbsttests. Was das oeffnet: gerenderten Text statt Quelltext lesen, Screenshots in echter Handybreite, Cookie-Banner und Ueberlagerungen sehen. Was es NICHT oeffnet: Instagram und alles mit Anmeldung - dafuer bleibt der PC-Weg.

Verwandt: [[Hypothese-mit-Datum]]
