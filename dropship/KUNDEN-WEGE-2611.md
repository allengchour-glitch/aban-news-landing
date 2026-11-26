# Neue Kunden-Wege, 26.11.2026 (Betreiber: «suche kunden die noch nicht gemacht hast sachen machen»)

Quelle: Workflow «neue-kunden-wege». 10 Wege, jeder von einem Skeptiker gegen Web und Repo geprüft. Tore: `dropship/tore/neue-kunden-wege.md`.

## Von der Sitzung erledigt (26.11.)
1. **Newsletter-Fenster zählt die ganze Sitzung**
   - Bisher: Jede Seite fing bei 0 an (mobil 30 s Mindestzeit). Wer 5 Seiten zu je 20 s ansah, bekam nie ein Angebot.
   - Neu: Ab der 2. Seite und wenn die Sitzung schon mindestens 45 s läuft, geht das Fenster nach 10 s auf der Seite auf. Auf Produktseiten bleibt die alte Regel.
   - Technik: `automation/popup_sitzung_patch_2611.py`; Wächter `popup_tor_wache.py`; Sicherung `theme_backup/footer-group.json.vor-popup-sitzung-2611`.
   - Live gemessen: Kollektionsseite nach 14 s offen, Produktseite nach 14 s zu.
2. **Klaviyo-Flow «Warenkorb-Erinnerung · 4 Std»** (T9aiM7, live)
   - Ablauf: «In den Warenkorb» → 4 h warten → eine Mail mit Produktbild und Link, ohne Rabatt.
   - Empfänger: nur Abonnenten. Wer inzwischen zur Kasse ging oder bestellt hat, bekommt keine Mail. Höchstens 1 Mail pro Person in 7 Tagen.
   - Wirkung zuerst klein: Seit September gab es nur 8 solche Ereignisse von bekannten Personen. Sie wächst mit jeder Anmeldung über das Fenster (Punkt 1).
   - Messung ab 26.12.

## Nur du kannst klicken (je 10–30 Min., kein Geld)
1. ✅ **iPhone-Kassentest in der ChatGPT-App** — Betreiber 26.11.: «geht» (TWINT und Apple Pay kommen zur Kasse zurück).
   - In ChatGPT «luxestyle.ch» suchen, Produkt in den Warenkorb legen, zur Kasse gehen.
   - Prüfen: Kommst du nach TWINT bzw. nach dem Apple-Pay-Fenster zur Kasse zurück? Dann abbrechen.
   - Mir melden: «geht» oder «bricht ab bei …».
2. **ChatGPT-Business-Profil**
   - Shopify-App «ChatGPT» installieren, «Geschäft beanspruchen». Werbung bleibt aus.
   - Danach sehe ich, wie oft ChatGPT uns nennt. ChatGPT ist der stärkste Kanal.
3. **Microsoft Merchant Center** (Bing-Shopping, Gratis-Einträge, Schweiz ausdrücklich unterstützt)
   - ads.microsoft.com → Tools → Merchant Center → Store **erneut zur Prüfung einreichen**. Die Ablehnung vom 01.10. («Beschreibung irreführend») ist behoben.
   - Danach «Aus Google Merchant Center importieren». Keine Kampagne, kein Guthaben.
   - Vorher (2 Min.): Shopify → Onlineshop → Einstellungen → Startseiten-Meta-Beschreibung ersetzen. Dort steht noch «… Versand in die Schweiz und nach Deutschland» und das stimmt nicht. Ich kann das Feld nicht per API ändern. Vorschlag:
     > LuxeStyle CH – Online-Shop für Mode, Schmuck, Beauty, Wohnen und Geschenke. Lieferung in die Schweiz und nach Liechtenstein, Gratis-Versand in die Schweiz ab CHF 50 nach Rabatt, Bezahlen mit TWINT und Klarna.
4. **Trustpilot-Gratisprofil**
   - business.trustpilot.com, Konto mit info@luxestyle.ch, Domain bestätigen. Gratis sind 50 Einladungen pro Monat.
   - ⚠️ Regel von Trustpilot: **alle** zugestellten Bestellungen einladen. Nicht nur die zufriedenen und keine erstatteten weglassen, sonst droht eine Sperre. Die Einladungen über Trustpilots eigene Shopify-Anbindung schicken.
5. **Klarna Search & Compare** (seit 25.11. in der Schweiz, nur ausprobieren)
   - Shopify-App installieren. Vorher auf der Abrechnungsseite nachsehen, was nach dem Startguthaben von USD 100 kostet. «Paid boosts» bleibt aus.
   - Offen, ob ein Schweizer Shop in CHF einliefern kann. Bringt es nach 30 Tagen nichts, die App wieder entfernen.

## Gestrichen
- Google-Ads-Test: bleibt dein Geld-Entscheid.
- tutti/anibis: für Händler nicht gratis, Shop-Links verboten.
