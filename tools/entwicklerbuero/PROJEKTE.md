# Automationsprojekte

Vier Projekte gehören zur gemeinsamen Werkstatt. E-Mail und Kommentare erstellen ungesendete Antwortentwürfe. Der neue Angebots-Nachfasser liest CSV mit `id,datum,status` und bereitet für offene Angebote ab sieben Tagen einen freundlichen Entwurf vor. Der neue Webseiten-Prüfer liest eine gespeicherte HTML-Datei und prüft Titel und Beschreibung. Das ist ein lokaler Prototyp, kein vollständiges SEO-Audit.

```bash
python3 automationen.py nachfassen angebote.csv entwürfe.json --heute 2026-11-08
python3 automationen.py webseite startseite.html prüfung.json
```

Die Fortschrittsanzeige zählt sieben gleich gewichtete Meilensteine. Vier nachgewiesene Schritte ergeben gerundet 57 %. Das ist eine Checkliste, keine Schätzung der verbleibenden Arbeitszeit. Kundensystem, abgenommener Pilot und produktspezifischer Checkout bleiben offen. Ein fehlgeschlagener Bau gibt keinen neuen Projektfortschritt frei.

Die vorhandene Stripe-Integration liegt in `automation/stripe_sync.py`, der geschützte Download in `functions/api/kit-download.js`. Bestehende Payment Links gehören anderen Produkten und werden nicht umgewidmet. Für jedes Automationsprodukt fehlen Preisentscheidung, Leistungsumfang und eigener Checkout mit geprüfter Lieferung. Keine Kunden oder Einnahmen sind für diese Projekte gemessen.

Der tägliche GitHub-Lauf prüft und paketiert die bestehenden Projekte und exportiert `buero.json` mit Fortschrittsanzeige. Er erzeugt keine neuen Produktideen oder Quellcode. Weitere Projekte können im Register `projekte.py` ergänzt werden; eine dauerhaft selbst programmierende KI ist damit nicht eingerichtet. Die private Claude-Datenquelle muss den Bericht importieren, bevor der Stand dort sichtbar wird.
