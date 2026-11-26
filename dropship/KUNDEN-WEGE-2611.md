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

## Stand 26.11. abends (Betreiber: «1 geht. 2 wie? 3 4 5 mach du»)
Geprüft von 4 Recherchen und 4 Gegenprüfungen. Ergebnis: Die Sitzung kann sich bei Microsoft, Trustpilot und Klarna
nicht selbst anmelden. Dafür braucht es deinen Login, die Annahme der Bedingungen und teils deinen Ausweis bzw. ein Captcha.
Was ohne dich geht, ist erledigt oder vorbereitet.

1. ✅ **iPhone-Kasse in ChatGPT:** geht (TWINT und Apple Pay kommen zur Kasse zurück). Verdacht widerlegt.
2. **ChatGPT-Business-Profil: so geht es** (optional; Nutzen = offizielle Zahlen, wie oft ChatGPT uns nennt, keine bessere Platzierung)
   1. Am PC chatgpt.com/business-hub öffnen und mit einem ChatGPT-Konto anmelden. Am besten eines mit info@luxestyle.ch, dann sehe ich die Mails von OpenAI.
   2. Nach «LuxeStyle» suchen → Treffer wählen → bestätigen. Möglich sind Code per E-Mail (ich lese ihn dir aus dem Postfach vor), per SMS oder ein DNS-Eintrag.
      Gibt es keinen Treffer: Shopify → Vertriebskanäle → «Agentic» → «ChatGPT» installieren (App von OpenAI, gratis). Sie bestätigt den Shop automatisch, will aber Pixel-Rechte.
   3. «Verify with Persona»: Ausweis hochladen. Name und Adresse genau wie im Impressum. Keine UID erfinden.
   4. Nach der Freigabe die Texte aus `dropship/CHATGPT-PROFIL-TEXTE.md` einfügen.
   - ⚠️ Gut zu wissen: Das Profil lässt sich danach nicht mehr löschen. OpenAI erhält eine dauerhafte Lizenz an Name, Adresse und Kontakt.
     NIE «Ads-Konto», «Pixel», «Kampagne» oder «Sponsor» anklicken und kein Zahlungsmittel hinterlegen.
3. **Microsoft (Bing-Shopping gratis): du musst klicken, ich habe vorbereitet**
   - Von mir erledigt: Die Fusszeile nennt jetzt die Lieferzeit, wie in der Versandrichtlinie: «ab Schweizer Lager meist 2–3 Werktage, sonst 7–20 Werktage, Liechtenstein 15–45 Tage».
   - Du (am PC, ca. 10 Min.):
     1. Shopify → Onlineshop → Einstellungen → «Bild für soziale Medien und SEO» → Meta-Beschreibung ersetzen durch:
        > LuxeStyle aus Belp: Mode, Beauty, Technik und Wohnen. Lieferung nur in die Schweiz und nach Liechtenstein. 30 Tage Rückgabe, ausser selbst gestaltete Artikel.
     2. ads.microsoft.com (Werbekonto «LuxeStyle» G1203U3V) → Tools → Merchant Center → Store **50042597 «LuxeStyle CH»** → «Edit» → Store-Beschreibung ersetzen durch:
        > LuxeStyle aus Belp, Schweiz. Mode, Beauty, Technik und Wohnen. Lieferung nur in die Schweiz und nach Liechtenstein. Lieferzeit ab Schweizer Lager meist 2 bis 3 Werktage, sonst 7 bis 20 Werktage, nach Liechtenstein 15 bis 45 Tage. 30 Tage Rückgabe, ausser selbst gestaltete Artikel. Kontakt info@luxestyle.ch.
     3. Erst danach: Merchant Center → Summary → Reiter «Product issues» → **«Request a review»**. ⚠️ Es gibt nur EINEN Versuch pro Store. Die Prüfung dauert bis 5 Tage.
     4. Nach der Freigabe: Feeds → «Import from Google Merchant Center» (Konto 5797470070), Zielregion Schweiz.
   - Nicht klicken: Guthaben, Kampagne, Performance Max. Die App «Microsoft Channel» nicht installieren (Schweiz fehlt). Microsoft in Shopify-Autopilot nicht wieder verbinden (das wären bezahlte Anzeigen).
4. **Trustpilot: Anmeldung macht du (5 Min.), den Rest mache ich**
   - Die Sitzung kann das nicht: Das Formular hat ein Captcha und verlangt deine Zustimmung zu den AGB.
   - Du: signup.business.trustpilot.com/create-account → Land Schweiz, «LuxeStyle», luxestyle.ch → E-Mail **info@luxestyle.ch** (damit ist die Domain gleich bestätigt) → Link in der Mail klicken → AGB → fertig.
     Dann Invitations → Emails → «Automatic Feedback Service» → Adresse kopieren und mir schicken.
   - Ich: Einladung an ALLE Besteller bauen, nicht selektiv: Mail bei jeder Bestellung mit der Trustpilot-Adresse im BCC, Smart Sending aus. Dazu der Satz in der Datenschutzerklärung (Trustpilot, Dänemark) nach deinem Ja.
5. **Klarna Search & Compare: meine Empfehlung ist NICHT machen**
   - Das ist Werbung mit Bezahlung pro Klick. Gratis ist nur ein Budget von USD 100 pro Monat, danach wird in USD abgerechnet.
   - Klarna nennt die Schweiz für Händler noch nicht, eine Ablehnung ist wahrscheinlich.
   - Du müsstest garantieren, dass wir alle Bildrechte haben. Das ist heikel bei den CJ-Lieferantenfotos.
   - Willst du es trotzdem, sag «Klarna ja», dann gebe ich dir die Schritte.

## Gestrichen
- Google-Ads-Test: bleibt dein Geld-Entscheid.
- tutti/anibis: für Händler nicht gratis, Shop-Links verboten.
