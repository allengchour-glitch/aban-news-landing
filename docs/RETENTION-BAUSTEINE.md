# Bausteine für zufriedene Abonnenten (Retention)

Neue Leser zu gewinnen ist die halbe Miete — sie **zu halten** entscheidet, ob aban news wächst.
Hier die wirksamsten Hebel, alle marken-konform (ehrlich, kein Hype, kein Tracking-Pixel, keine Fake-Zahlen).

## 1. Verlässlichkeit ist das Produkt
- **Immer gleich:** Mo–Fr, 7:30 Uhr, 5 Minuten, Format 3+1+1, am Wochenende Ruhe. Erwartung halten = Vertrauen.
- Lieber einen Tag auslassen und sagen „heute kürzer" als Füllmaterial senden.

## 2. Zustellbarkeit (der unterschätzte Churn-Grund)
- **Sender-Domain authentifizieren** (beehiiv → Settings → Email/Domain): SPF, DKIM, DMARC setzen, damit Mails
  im **Posteingang** statt im Spam landen. Größter unsichtbarer Abo-Killer.
- In der Welcome-Mail bitten: „Verschieb diese Mail nach Posteingang / markiere als ‚kein Spam'." (Text liegt in `docs/NEWSLETTER-ATTRAKTIV.md`.)

## 3. Starker erster Eindruck
- **Welcome-Mail mit Geschenk** (10-Prompts-PDF) sofort nach Double-Opt-in. → Sticky ab Minute 1.
- Klare Erwartung: was kommt, wann, wie oft, wie man kündigt.

## 4. Dialog statt Monolog
- **Jede Ausgabe endet mit einer echten Frage.** Antworten = Engagement-Signal (verbessert Zustellbarkeit)
  + Themen-Ideen. Auf der Startseite ist der „Dialog statt Monolog"-Block dazu schon live.
- Antworten wirklich lesen und gelegentlich zitieren (mit Erlaubnis) — das bindet.

## 5. Der Prompt ist der „Sticky"-Teil
- Das tägliche „1 Prompt zum Kopieren" ist konkreter Mehrwert, den man weiterverwendet → Grund, dranzubleiben.
- Monatlich die besten Prompts als „Best-of" bündeln (auch als Lead-Magnet/Premium-Häppchen nutzbar).

## 6. Zweiter Touchpoint: Telegram
- Kanal `@abannews` als locker-frequenter Begleiter (Setup: `docs/TELEGRAM-SETUP.md`). Wer Mail mal verpasst,
  bleibt über Telegram verbunden — mehr Berührungspunkte = weniger Abwanderung.

## 7. Win-back statt stiller Abgang
- **beehiiv-Automation „Re-engagement":** Wer 30–60 Tage nicht öffnet, bekommt eine ehrliche
  „Lohnt sich das noch für dich?"-Mail mit Best-of-Link. Reaktiviert manche, hält die Liste sauber.

## 8. Sanfte, ehrliche Upgrades
- Premium/Founding nie aufdrängen. Gelegentlich eine **echte Mittwoch-Premium-Leseprobe** zeigen — Wert demonstrieren statt anpreisen.

## 9. Themen-Relevanz
- Optional **Subscriber-Preferences** in beehiiv (z. B. „eher Tools" / „eher Strategie") → relevantere Mails,
  weniger „nicht für mich"-Abmeldungen.

## 10. Konsequenz beim Markenversprechen
- Kein Affiliate-Müll, kein Tracking-Pixel, keine erfundenen Zahlen. Genau das hebt aban news von „noch einem
  KI-Newsletter" ab — und ist der Hauptgrund, warum jemand bleibt. Nicht verwässern.

---
### Was davon schon im Repo umgesetzt ist
- Welcome-Mail-Text + Anmelde-Geschenk (PDF) · Dialog-Block · echte Archiv-Vorschau · Gründer-Vertrauen
  · Telegram-Autopost-Pipeline. **Deine Dashboard-Schritte:** Domain-Auth, Welcome-Mail einsetzen,
  Empfehlungs- & Re-engagement-Automation, Telegram-Secrets.
