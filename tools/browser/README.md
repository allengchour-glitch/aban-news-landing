# Browser-Toolkit (Playwright)

Steuert einen echten Browser von der Kommandozeile - fuer Screenshots,
Link-Checks und das Holen von Seiteninhalten. Laeuft auf **deinem Rechner**
(nicht in der Cloud-Session).

## Installation (einmalig)

```bash
pip install playwright
python3 -m playwright install chromium
```

## Die drei Befehle

**Screenshot** einer Seite:
```bash
python3 browser.py shot https://abannews.com/glut --out glut.png
python3 browser.py shot https://abannews.com/glut --voll   # ganze Seite, nicht nur Viewport
```

**Link-Check** - laedt eine Seite, klickt alle internen Links durch, meldet
defekte (Exit-Code 1 bei Problemen, CI-tauglich):
```bash
python3 browser.py check https://abannews.com
python3 browser.py check https://abannews.com --max 80
```

**Inhalte holen** - Text, Links oder Ueberschriften einer Seite:
```bash
python3 browser.py grab https://example.com --was text      > seite.txt
python3 browser.py grab https://example.com --was links --json
python3 browser.py grab https://example.com --was headings
```

## Wofuer es gut ist
- Eigene Seiten testen (z. B. `abannews.com` nach jedem Deploy durchklicken).
- Screenshots fuer Doku/Vergleich.
- Oeffentliche Recherche: Ueberschriften/Links/Text einsammeln.

## Wofuer NICHT
- Logins, Captchas und kostenpflichtige Plattformen (Amazon KDP, Tolino,
  Lemon Squeezy) automatisch bedienen. Das verstoesst meist gegen deren AGB,
  scheitert an Bot-Schutz und kann dein Konto sperren. Solche Schritte machst
  du von Hand.
- Fremde Seiten im Sekundentakt hammern. Respektiere robots.txt und Tempo.

## Hinweis zu "Claude steuert den Browser selbst"
Dieses Toolkit ist bewusst **deterministisch** (Playwright): du gibst die
Schritte vor. Das ist guenstiger, schneller und zuverlaessiger als Claude
Computer Use fuer feste Ablaeufe. Wenn du wirklich einen Agenten brauchst, der
unbekannte Seiten selbst erkundet (teurer, langsamer), sag Bescheid - das ist
ein eigener Aufbau mit der Anthropic-API.
