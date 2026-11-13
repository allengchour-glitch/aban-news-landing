# KI-Sichtbarkeits-Monitor — Abo-Produkt (`monitor/`)

Report-Generator für das bestehende Monitor-Angebot. Quellcode und ein gespeicherter
Auftrag belegen keinen laufenden Abo-/Versandbetrieb. Abgleich bezahlter Abos und
Reportversand sind hier nicht angebunden. Baut auf der Logik von
`functions/_visibility-engine.mjs` auf.

- **Verkaufsseite:** `ki-sichtbarkeit-monitor.html` (Self-Checkout, 9 €/Monat, kündbar).
- **Report-Engine:** `monitor/generate_report.py` (stdlib; optional `anthropic`).

## Bauen / testen
```bash
cd monitor
python3 generate_report.py --beispiel # offline, auch bei gesetzten Anbieter-Keys
python3 -B -m unittest discover -p 'test_generate_report.py'
python3 generate_report.py            # erfordert abos.json; kann Anbieter aufrufen
```
Fehlt `abos.json`, endet der normale Lauf mit Exitcode2 vor jeder Anbieteranfrage und
ohne Ausgabe oder Verlauf. Kein automatischer Ersatz durch Beispielkund:innen.
`--beispiel` nutzt ausschliesslich `abos.example.json`, überspringt alle Anbieter,
schreibt nach `ausgabe/beispiel/` und verändert `verlauf.json` nicht. Die HTML-Datei
ist als Offline-Beispiel markiert; sie ist kein Kundenreport und wird nicht versandt.
Ohne `ANTHROPIC_API_KEY`: Report mit Prompts + Selbst-Test + Maßnahmen. Mit Key zusätzlich
Stellvertreter-Check (kennt ein Modell die Firma?) + Veränderung ggü. Vormonat (`verlauf.json`).
Output: `monitor/ausgabe/<id>-<YYYYMM>.html` (git-ignored). `abos.json` + `verlauf.json` sind
git-ignored (enthalten Kundendaten/E-Mails — **nie committen**).

## Live schalten (3 Schalter — deine Konten)
1. **Stripe-Abo:** Subscription-Payment-Link anlegen (9 €/Monat), URL in
   `ki-sichtbarkeit-monitor.html` bei `MONITOR_ABO_URL` eintragen (leer → Mail-Fallback).
2. **Abonnent:innen erfassen:** aus Stripe (Webhook/Export) je Abo `{id, firma, branche, ort,
   leistungen[], email}` nach `monitor/abos.json` schreiben. Vorlage: `abos.example.json`.
3. **Versand:** den monatlichen Lauf an einen Mail-Weg hängen — z. B. die fertigen HTML-Reports
   per SMTP/Resend/Make-Webhook an `email` schicken. (Bewusst nicht fest verdrahtet, damit kein
   Dienst erzwungen wird.)

## Automatik
Der Cron in `.github/workflows/sichtbarkeit-monitor.yml` ist pausiert; der Workflow
ist nur manuell auslösbar. Er erwartet eine bereitgestellte private Abodatei, die ein
normaler Repository-Checkout nicht enthält. Ohne sie bricht er vor Anbieteranfragen ab.
Dieser Code ergänzt weder eine Abosynchronisierung noch Versand und aktiviert keinen
Zeitplan. Die vorhandene Deploy-Prüfung führt die Offline-Gegenproben aus.

## Ehrlich
Kein Live-ChatGPT, keine Garantie auf Nennung. Der Wert ist das monatliche Dranbleiben +
der Maßnahmenplan. Daten „ohne Gewähr".

## Live-Modus (echtes SaaS)
`monitor/live_check.py` fragt mit gesetzten Keys echte Engines ab (statt Stellvertreter):
- `PERPLEXITY_API_KEY` (empfohlen, Websuche), `OPENAI_API_KEY`, `GEMINI_API_KEY`.
- `generate_report.py` nutzt automatisch Live, wenn ein Key da ist; sonst Claude-Fallback;
  ohne jeden Key nur Prompts+Maßnahmen. Kosten-Deckel: 5 Prompts/Engine.
- Vollprodukt-Briefing (Stripe/Speicher/Versand): `docs/MONITOR-SAAS-BRIEFING.md`.
