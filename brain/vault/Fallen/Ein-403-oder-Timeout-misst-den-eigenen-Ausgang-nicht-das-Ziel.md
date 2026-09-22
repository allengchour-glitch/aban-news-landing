---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-18 · 🪞; 2026-09-17 · 🖥️ hetzner
gelernt: 2026-09-22
---
# Ein 403 oder Timeout misst den eigenen Ausgang, nicht das Ziel

Die Cowork-Session schloss aus einem 403 ihrer Sandbox, das Repo sei privat, und legte Bank, Kontoinhaber und Auszahlungsbeträge hinein; es wurde ungeprüft gepusht. Gemessen: GitHub meldet visibility public, und derselbe Ausgang gibt 403 auch für anthropics/claude-code (Sitzungs-Proxy nach Erlaubnisliste). Ebenso: Port 22 läuft von hier auch gegen github.com in die Zeitüberschreitung, und :443 «gelingt» sogar gegen 203.0.113.1 (Proxy nimmt alles an). Regel: bevor ein HTTP-Status oder Port-Test zum Befund über ein Ziel wird, denselben Test gegen ein bekannt öffentliches und ein bekannt totes Ziel fahren; Sichtbarkeitsfragen nie über einen Ausgang beantworten, der Anmeldedaten anhängt.

Verwandt: [[Hypothese-mit-Datum]]
