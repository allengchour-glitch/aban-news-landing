# KI-Sichtbarkeits-Monitor — Abo-Produkt (`monitor/`)

Wiederkehrendes Mikro-SaaS (MRR), **ohne Kundenkontakt**: jeden Monat ein automatischer
Report, ob die Firma einer Abonnent:in in KI-Antworten genannt wird — mit Veränderung
zum Vormonat und Maßnahmen. Baut auf der Logik von `functions/_visibility-engine.mjs` auf.

- **Verkaufsseite:** `ki-sichtbarkeit-monitor.html` (Self-Checkout, 9 €/Monat, kündbar).
- **Report-Engine:** `monitor/generate_report.py` (stdlib; optional `anthropic`).

## Bauen / testen
```bash
cd monitor
python3 generate_report.py            # nutzt abos.json, sonst abos.example.json (Trockenlauf)
```
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
`.github/workflows/sichtbarkeit-monitor.yml` läuft **monatlich** (Cron) + manuell. Ohne Secrets
baut er nur den Beispiel-Report als Artefakt; mit `ANTHROPIC_API_KEY` den echten Check. Der
eigentliche Versand bleibt dein Schritt (siehe oben).

## Ehrlich
Kein Live-ChatGPT, keine Garantie auf Nennung. Der Wert ist das monatliche Dranbleiben +
der Maßnahmenplan. Daten „ohne Gewähr".
