# R265 · Unabhängige Abschlussprüfung

**PASS für die drei beauftragten Härtungen.** Geprüfter Helper-SHA-256:
420c6217b63f3283061be9a646ca514269e090f6a56ad7dfbb07b0712d561b91.

GEMESSEN: 18/18 Offline-Unit-Tests bestanden; Syntaxprüfung bestanden. Die gemeldeten SHA-256-Werte von Helper, Test und Patch stimmen mit den tatsächlich geprüften Dateien überein.

Die Hauptpreis-Auslese liegt jetzt unter dem tatsächlichen PDP-Details-Vorfahren, verlangt die exakte Produkt-ID und schliesst Karten/Recommendations aus. Drei echte Chromium-DOM-Gegenproben mit statischen lokalen Inhalten bestätigen: Gleich-ID-Empfehlungen ausserhalb und innerhalb des Details-Bereichs ersetzen keinen fehlenden Hauptpreis; ein korrekter Hauptpreis bleibt trotz falschem Kartenpreis gültig.

Die CHF-Auswertung verlangt einen vollständigen Betrag und rundet nicht. Die ursprünglichen Gegenfälle CHF 28.90abc, CHF 28.90/99.90 und CHF 28.901 sowie der während dieser Prüfung entdeckte Fall CHF 1’’234.50 werden abgelehnt. Gruppierungszeichen dürfen weder wiederholt noch innerhalb einer Zahl gemischt werden.

Die urllib-Weiterleitung validiert das Ziel vor dem Folge-GET. Der zunächst verbliebene Browserfehler ist ebenfalls behoben: Playwright ruft einen normalen Route-Guard bei Redirects nicht erneut auf. Der neue Helper verwendet route.fetch(max_redirects=0), bricht 3xx ab und erfüllt sichere Antworten ohne continue_. Die Gegenprobe mit echtem Chromium und rein lokalem HTTP-Server sah vorher den unerlaubten Ziel-GET, nachher nur den ersten Request und redirect_rejected. Hierfür wurde ausschliesslich die URL-Validierung im Speicher auf den konkreten Loopback-Test angepasst; die Produktionsvalidierung blieb auf Datenträger unverändert.

Keine externe Seite, Plattform oder API angefragt; keine Installation, Repo-/Plattformänderung oder Veröffentlichung. Alle Browser-Redirects werden absichtlich abgebrochen, auch legitime; dies kann QA unmessbar/fehlgeschlagen machen. Dieser PASS gilt für die geprüften Korrekturen, nicht für aktuelle Produktpreise oder einen Live-Shop-Lauf. Details, Belege und Datei-Hashes stehen in final-independent-review.json.
