"""Übersetzer-Client für Produkttexte (Deutsch → Schweizer Französisch) über die Gemini-Schnittstelle.

Nur Standardbibliothek. Schlüssel kommen aus den Umgebungsvariablen GEMINI_API_KEY und GEMINI_API_KEY2 (nie ausgeben).
Rückgabe immer (Ergebnis, Nutzung); Fehler (429, 5xx, Zeitlimit, ungültige Antwort) werden mit Wartezeit wiederholt,
nach zwei Fehlversuchen mit einem Schlüssel wechselt der Aufruf zum anderen.
"""
import json
import os
import time
import urllib.error
import urllib.request

MODELL_VORGABE = os.environ.get('FR_MODELL', 'gemini-flash-lite-latest')
URL = 'https://generativelanguage.googleapis.com/v1beta/models/{modell}:generateContent'

SYSTEM = """Du übersetzt Produkttexte eines Schweizer Online-Shops (LuxeStyle, luxestyle.ch) vom Deutschen ins Schweizer Französisch.

Regeln:
1. Anrede: «du» und «Sie» im Original werden zu «vous». Sachlich, freundlich, kein Werbeüberschwang.
2. Inhalt unverändert: nichts hinzufügen, weglassen oder umdeuten. Zahlen, Masse, Einheiten (cm, mm, g, kg, W, V, ml, L, GB), Preise (CHF), Modell- und Markennamen, Produktcodes, Emojis und das Mass-Zeichen «x» oder «×» zwischen Zahlen bleiben unverändert. Dezimalzahlen mit Punkt bleiben mit Punkt.
3. HTML: Jeder Eintrag ist ein Textstück und kann Inline-HTML enthalten (<strong>, <a href="…">, <br>). Diese Tags in gleicher Anzahl und Reihenfolge übernehmen, Attribute (href) unverändert lassen, nur den Text dazwischen übersetzen. Entities wie &amp; unverändert lassen.
4. Wörterbuch: Lieferung → livraison; Versand → expédition; Rückgabe → retour («30 Tage Rückgabe» → «30 jours de retour»); Warenkorb → panier; Grösse → taille; Farbe → couleur; Lieferumfang → contenu de la livraison; Technische Daten → caractéristiques techniques; Produktdetails → détails du produit; Material → matière; Gewicht → poids; Masse (Abmessungen) → dimensions; Leistung → puissance; Anschluss → connexion; Werktage → jours ouvrés; Stück → pièce(s); Geschenk → cadeau; Schweizer Shop → boutique suisse; Datenblatt des Lieferanten → fiche technique du fournisseur. Etiketten und Überschriften beginnen mit einem Grossbuchstaben.
5. Kurze Etiketten (zum Beispiel «Farbe», «Leistung») werden als Etiketten übersetzt. Mehrdeutige englische Reste (zum Beispiel «plug in crown») sinngemäss ins Französische übertragen.
6. Die Liste «uebersetzung» hat genau «anzahl» Strings: jeder Eintrag bleibt EIN String, auch wenn er Zeilenumbrüche, Aufzählungszeichen oder senkrechte Striche enthält.
7. Produkttitel knapp und natürlich: gängige französische Wörter statt Wort-für-Wort-Übersetzung zusammengesetzter deutscher Wörter (zum Beispiel «Hoodie-Decke» → «couverture à capuche», «Plüsch Panda» → «Panda en peluche»).
8. Antworte ausschliesslich mit einem JSON-Objekt der Form {"uebersetzung": [ … ]} mit genau so vielen Strings wie Einträge in der Eingabe, in gleicher Reihenfolge. Kein weiterer Text."""


def _schluessel():
    return [k for k in (os.environ.get('GEMINI_API_KEY'), os.environ.get('GEMINI_API_KEY2')) if k]


def aufruf(eintraege, kontext='', modell=None, versuche=4, zeitlimit=120):
    """Übersetzt eine Liste von Strings. Rückgabe: (liste, nutzung) mit nutzung = {'ein': Tokens, 'aus': Tokens, 'denk': Tokens}."""
    modell = modell or MODELL_VORGABE
    nutzer = {'produkt': kontext, 'anzahl': len(eintraege), 'eintraege': eintraege}
    body = {
        'systemInstruction': {'parts': [{'text': SYSTEM}]},
        'contents': [{'role': 'user', 'parts': [{'text': json.dumps(nutzer, ensure_ascii=False)}]}],
        'generationConfig': {'temperature': 0.2, 'responseMimeType': 'application/json', 'maxOutputTokens': 16384},
    }
    keys = _schluessel()
    if not keys:
        raise RuntimeError('Kein GEMINI_API_KEY gesetzt')
    letzter = None
    for versuch in range(versuche):
        key = keys[(versuch // 2) % len(keys)]
        req = urllib.request.Request(URL.format(modell=modell), data=json.dumps(body).encode('utf-8'), method='POST',
                                     headers={'content-type': 'application/json', 'x-goog-api-key': key})
        try:
            with urllib.request.urlopen(req, timeout=zeitlimit) as r:
                j = json.loads(r.read().decode('utf-8'))
            c = j['candidates'][0]
            if c.get('finishReason') not in (None, 'STOP'):
                raise ValueError(f"finishReason {c.get('finishReason')}")
            text = ''.join(p.get('text', '') for p in c['content']['parts'] if not p.get('thought'))
            erg = json.loads(text)['uebersetzung']
            if not isinstance(erg, list) or len(erg) != len(eintraege) or not all(isinstance(x, str) for x in erg):
                raise ValueError(f'Antwort hat {len(erg) if isinstance(erg, list) else "keine Liste"} statt {len(eintraege)} Einträge')
            u = j.get('usageMetadata', {})
            return erg, {'ein': u.get('promptTokenCount', 0), 'aus': u.get('candidatesTokenCount', 0), 'denk': u.get('thoughtsTokenCount', 0)}
        except urllib.error.HTTPError as e:
            letzter = f'HTTP {e.code}'
            if e.code in (400, 401, 403, 404) and versuch >= 1:
                raise RuntimeError(f'Schnittstelle lehnt ab: HTTP {e.code}') from None
            time.sleep(min(60, 4 * 2 ** versuch))
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError, IndexError, json.JSONDecodeError) as e:
            letzter = type(e).__name__ + ': ' + str(e)[:120]
            time.sleep(min(30, 2 * 2 ** versuch))
    raise RuntimeError('Übersetzung fehlgeschlagen: ' + str(letzter))
