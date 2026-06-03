# KI-Sichtbarkeits-Monitor → echtes SaaS (Briefing für 10k-Einsatz)

Ziel: Aus dem Stellvertreter-Check ein **echtes** Abo-Produkt machen, das monatlich
**live** prüft, ob Kund:innen-Firmen in KI-Antworten genannt werden — autonom, kein
Kundenkontakt. Was fertig ist und was Geld/Freelancer braucht:

## Schon gebaut (kostenlos, in diesem Repo)
- **Live-Abfrage-Engine** `monitor/live_check.py`: fragt echte APIs ab und prüft Nennung —
  OpenAI/ChatGPT, **Perplexity** (mit Websuche, am aussagekräftigsten), Google Gemini.
  Pro Anbieter mit Key, sonst sauber übersprungen. Kosten-Deckel: 5 Prompts/Engine.
- **Report-Bauer** `monitor/generate_report.py`: nutzt die Live-Ergebnisse, sonst den
  Claude-Stellvertreter-Fallback. Monatsvergleich über `verlauf.json`.
- **Verkaufsseite** `ki-sichtbarkeit-monitor.html` (9 €/Monat, Stripe-Platzhalter).
- **Monats-Cron** `.github/workflows/sichtbarkeit-monitor.yml`.

## API-Keys setzen (Live-Modus an) — laufende Kosten
Als GitHub-Secrets bzw. Cron-Env (NIE ins Repo):
- `PERPLEXITY_API_KEY` (empfohlen, da Websuche), optional `OPENAI_API_KEY`, `GEMINI_API_KEY`.
- Kosten grob: wenige Cent pro Firma/Monat (5 Prompts × aktive Engines). Bei 100 Abos
  niedrige zweistellige Euro/Monat — vor Skalierung real nachrechnen.

## Was der 10k-Freelancer baut (2–3 Wochen, das fehlt zum Vollprodukt)
1. **Stripe-Abo-Anbindung:** Subscription-Checkout (9 €/Mt), Webhook → schreibt neue
   Abos automatisch nach `monitor/abos.json`-Äquivalent (besser: kleine DB/KV statt Datei).
2. **Speicher:** Abos + Verlauf in KV/D1/Postgres statt Dateien (mehrbenutzerfähig,
   sicher; Kundendaten gehören nicht ins Repo — sind bereits git-ignored).
3. **Versand:** monatlicher Report per Mail (Resend/Postmark/SMTP). HTML steht schon;
   nur Versand-Job + Bounce/Abmelde-Handling fehlt.
4. **Self-Service:** Abo verwalten/kündigen (Stripe Customer Portal — fast ohne Code).
5. **Skalierung/Kosten-Cap:** Queue + Rate-Limit für die API-Abfragen, Retry, Logging.

## Reihenfolge (Budget)
1. Perplexity-Key + Cron-Test mit 1–2 echten Abos (~50 €) → Beweis, dass Live funktioniert.
2. Stripe-Checkout + Customer Portal (Freelancer, ~1 Woche).
3. Speicher + Versand (Freelancer, ~1–2 Wochen).
4. Erst dann Reichweite (Block A): Sponsorings/Ads auf die Verkaufsseite.

## Ehrlich
Eine API-Abfrage ist eine Momentaufnahme, nicht 1:1 die Web-Oberfläche (Region,
Personalisierung). Der Report sagt das. Keine Garantie auf Nennung — der Wert ist das
monatliche, belegte Dranbleiben.
