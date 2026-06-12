#!/usr/bin/env python3
# Fügt jeder Tool-Seite eine anfängerfreundliche "Was macht das?"-Zeile direkt
# unter dem Hero ein. Idempotent (Marker data-aban-was) — mehrfaches Ausführen
# ändert nichts. Einfügepunkt: nach dem schließenden </section> des Hero (nach </h1>).
import os, sys

SENT = {
 # Rechnen & Geld / Business
 "prozent-rechner.html": "Rechnet Prozente, Rabatt, Aufschlag und den Dreisatz aus — Zahl eingeben, Ergebnis ablesen.",
 "mwst-rechner.html": "Rechnet die Mehrwertsteuer für CH, DE und AT — von netto auf brutto und zurück.",
 "iban-pruefer.html": "Prüft, ob eine IBAN-Kontonummer technisch gültig ist — komplett lokal, nichts wird hochgeladen.",
 "rechnung-generator.html": "Hilft dir, eine vollständige Rechnung zu erstellen und als PDF zu speichern — mit allen Pflichtangaben.",
 "mahnung-schreiben.html": "Erstellt eine höfliche Zahlungserinnerung oder Mahnung als fertigen Text zum Kopieren.",
 "angebot-schreiben.html": "Hilft dir, ein sauberes Angebot zu schreiben — mit oder ohne Mehrwertsteuer, zum Kopieren.",
 "auftragsbestaetigung-schreiben.html": "Bestätigt einen Auftrag schriftlich — fertiger Text zum Kopieren und Versenden.",
 "email-vorlagen.html": "Gibt dir für 14 knifflige Geschäfts-Situationen eine höfliche E-Mail als fertigen Text zum Kopieren.",
 "skonto-rechner.html": "Zeigt, ob es sich lohnt, früh zu zahlen und Skonto abzuziehen — mit dem effektiven Jahreszins.",
 "finanz-rechner.html": "Berechnet deinen fairen Stundensatz und wie viel du für Steuern zurücklegen solltest.",
 "stundensatz-rechner.html": "Zeigt, welchen Stundensatz du wirklich brauchst, um von deiner Arbeit zu leben.",
 "ki-kosten-rechner.html": "Zählt deine KI-Abos zusammen und zeigt, was du wirklich pro Monat und Jahr zahlst.",
 "automatisierung-rechner.html": "Rechnet ehrlich aus, ob sich das Automatisieren einer Aufgabe für dich lohnt.",
 "ki-spar-rechner.html": "Schätzt, wie viel Zeit und Geld dir KI bei einer Aufgabe sparen kann.",
 "cron-generator.html": "Baut Zeitpläne für automatische Aufgaben (Cron) und erklärt, was sie bedeuten.",
 "was-automatisieren.html": "Sortiert deine Aufgaben danach, welche Automatisierung am meisten Zeit spart.",
 "passwort-generator.html": "Erzeugt starke, zufällige Passwörter — sicher direkt in deinem Browser.",
 # Geld-Guides
 "sparplan-statt-trading.html": "Zeigt live, wie dein Geld mit Zinseszins wächst — Startbetrag, Monatsrate, Jahre, Rendite.",
 "etf-fuer-einsteiger.html": "Erklärt ETFs einfach und rechnet aus, was die Gebühren über die Jahre kosten.",
 "inflation-einfach-erklaert.html": "Zeigt einfach, wie Inflation deine Kaufkraft über die Jahre verändert.",
 "notgroschen-aufbauen.html": "Hilft dir auszurechnen, wie du Schritt für Schritt einen Notgroschen aufbaust.",
 "maerkte.html": "Zeigt aktuelle Kurse von Krypto und Aktien mit Umrechner und 30-Tage-Charts.",
 "steuer-basics-selbststaendige.html": "Erklärt einfach, welche Steuern dich treffen und wie viel du zurücklegst.",
 "kleinunternehmerregelung-einfach-erklaert.html": "Erklärt die Kleinunternehmer-Regelung und prüft schnell, ob sie für dich gilt.",
 # Entwickler & Daten
 "json-formatter.html": "Macht unübersichtliche JSON-Daten ordentlich lesbar und zeigt dir Fehler an.",
 "regex-tester.html": "Testet Suchmuster (Regex) live an deinem Text — z. B. um alle E-Mails zu finden.",
 "encoder.html": "Wandelt Text in Web-Formate wie Base64 oder URL um — und wieder zurück.",
 "hash-generator.html": "Erzeugt aus Text einen eindeutigen Prüf-Fingerabdruck (Hash/SHA).",
 "uuid-generator.html": "Erzeugt eindeutige IDs (UUID) und saubere Web-Adressen (Slugs).",
 "env-parser.html": "Wandelt Konfig-Zeilen und HTTP-Header schnell ins JSON-Format um.",
 "jwt-decoder.html": "Entschlüsselt ein Login-Token (JWT) und zeigt seinen Inhalt im Klartext.",
 "diff-tool.html": "Vergleicht zwei Texte Zeile für Zeile und markiert, was sich geändert hat.",
 "timestamp-konverter.html": "Rechnet Computer-Zeitstempel (Unix) in ein normales Datum um — und zurück.",
 "markdown-tabelle.html": "Wandelt Tabellen zwischen Markdown (für Doku) und CSV (für Excel) um.",
 "qr-code.html": "Macht aus einem Link oder Text einen QR-Code zum Ausdrucken oder Teilen.",
 # Text, Farbe & Web
 "hype-filter.html": "Markiert übertriebene Buzzwords in deinem Marketing-Text.",
 "zeichenzaehler.html": "Zählt Zeichen und Wörter — mit Limits für Tweet, Seitentitel und Meta-Text.",
 "kontrast-checker.html": "Prüft, ob deine Schrift auf dem Hintergrund gut lesbar ist (auch barrierefrei).",
 "farb-umrechner.html": "Rechnet Farbwerte um (HEX, RGB, HSL) — fertig zum Einsetzen ins CSS.",
 # KI-Sichtbarkeit & KI-Helfer
 "ai-sichtbarkeit.html": "Prüft, ob KI wie ChatGPT deine Website gut lesen kann — mit Tipps.",
 "ki-erwaehnungs-check.html": "Hilft zu prüfen, ob KI dich nennt — und wie du sichtbarer wirst.",
 "namen-generator.html": "Macht aus einem Namen ein Schild, einen Anhänger oder eine Karte.",
 "text-anonymisieren.html": "Schwärzt Namen, IBAN und Co. im Text, bevor er in die KI geht.",
 "ki-token-rechner.html": "Schätzt, aus wie vielen Tokens dein KI-Text besteht und was er kostet.",
 "hashtag-helfer.html": "Macht aus Stichworten passende Hashtags und ein Caption-Gerüst.",
 "betreffzeilen-check.html": "Testet deine E-Mail-Betreffzeile und gibt dir einen Score mit Tipps.",
 "lesbarkeits-check.html": "Prüft, wie leicht dein Text zu verstehen ist.",
 "wie-nutze-ich-ki-richtig.html": "Einsteiger-Guide: wofür KI taugt, wo nicht, und 5 einfache Regeln.",
 "welche-ki-fuer-was.html": "Hilft dir, für deine Aufgabe das passende KI-Tool zu finden.",
 "bessere-prompts.html": "Zeigt mit Beispielen, wie du KI bessere Anweisungen (Prompts) gibst.",
 "3d-animation.html": "Zeigt interaktive 3D-Grafik, live im Browser gerendert — zum Drehen mit der Maus.",
}

MARK = "data-aban-was"

def block(sentence):
    return ('\n<p ' + MARK + ' style="max-width:760px;margin:14px auto 0;padding:10px 14px;'
            'background:#fef3c7;border:1px solid #fde9c8;border-radius:10px;color:#374151;'
            'font-size:.92rem;line-height:1.5;text-align:left">'
            '\U0001F4A1 <strong style="color:#1f2937">Was macht das?</strong> ' + sentence + '</p>')

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    added, skip, miss = [], [], []
    for fn, sentence in SENT.items():
        path = os.path.join(root, fn)
        if not os.path.exists(path):
            miss.append(fn); continue
        with open(path, encoding="utf-8") as f:
            html = f.read()
        if MARK in html:
            skip.append(fn); continue
        h1 = html.find("</h1>")
        if h1 == -1:
            miss.append(fn + " (kein <h1>)"); continue
        sec = html.find("</section>", h1)
        if sec == -1:
            miss.append(fn + " (kein </section>)"); continue
        ins = sec + len("</section>")
        html = html[:ins] + block(sentence) + html[ins:]
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        added.append(fn)
    print("EINGEFÜGT (%d): %s" % (len(added), ", ".join(sorted(added))))
    print("ÜBERSPRUNGEN/schon da (%d): %s" % (len(skip), ", ".join(sorted(skip))))
    print("FEHLT/kein Anker (%d): %s" % (len(miss), ", ".join(sorted(miss))))

if __name__ == "__main__":
    main()
