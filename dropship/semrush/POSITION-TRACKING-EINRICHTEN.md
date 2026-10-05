# Positions-Tracking (05.10.2026, Betreiber «position tracking und alles machen»)

## Stand GEMESSEN
- Semrush-Projekt 31464185 «luxestyle.ch»: `campaigns` → **keine Positions-Kampagne** (targets null). Per MCP nur lesbar, nicht anlegbar.
- Semrush-Datenbank (`resource_organic`): 559 Begriffe Top 100, **0 in den Top 10**, Verkehr 0. ⚠️ Die Datenbank frischt kleine Begriffe
  nur alle paar Wochen auf (Timestamps 31.07.–27.09., Position = Vorposition bei 80/80) → sie zeigt die Wirkung unserer SEO-Arbeit
  vom 02.–05.10. NICHT rechtzeitig. Echte Tageswerte gibt nur die Kampagne.

## Eigener Tracker (läuft schon)
- `automation/semrush_positionen.py` liest Schnappschüsse aus `dropship/semrush/positionen/` (02.10. Datenbank 395 Zeilen, 05.10. Top 40)
  und schreibt `dropship/semrush/POSITIONEN.md`: je Zielbegriff erste/letzte Position, Δ, und ob die RICHTIGE Seite rankt.
- Zielliste: `position_tracking_ziele.tsv` (197 Begriffe mit Ziel-URL) = `POSITION-TRACKING-KEYWORDS.txt` (zum Einfügen).
- Erster Fund: **7 Begriffe, bei denen die SEO-Runde vom 02.10. eine andere Seite optimiert hatte als die rankende** (Kannibalisierung:
  zwei eigene Seiten um denselben Begriff; einmal war das Ziel ein Entwurf, einmal rankte ein Entwurf). Behoben 05.10. 07:45 UTC:
  5 Doppelseiten bekamen einen unterscheidenden SEO-Titel (Meta unverändert mitgesendet), die rankende Stahlkappen-Seite einen sauberen
  Titel, 2 Umleitungen (GPS-Auto-Tracker-Entwurf → Fahrzeug-Tracker; Sternenhimmel-Projektor-Entwurf → /collections/sub-beleuchtung).
  Ledger `_kannibalisierung_2026-10-05.tsv`.

## Betreiber-Klick (2 Minuten, nur in der Semrush-Oberfläche möglich)
1. semrush.com → Projekte → «luxestyle.ch» → **Position Tracking** → «Einrichten».
2. Suchmaschine **Google**, Gerät **Mobil** (77 % der Besuche sind mobil), Standort **Schweiz**, Sprache **Deutsch**.
3. Domain: `luxestyle.ch` (Root-Domain), Unternehmensname LuxeStyle.
4. Keywords: den Inhalt von `dropship/semrush/POSITION-TRACKING-KEYWORDS.txt` einfügen (197 Begriffe, PRO erlaubt 500).
5. Wettbewerber optional leer lassen. «Start Tracking».
Danach liest die Session die Kampagne täglich (`tracking_position_organic`) und legt `positionen/<datum>_tracking_*.csv` ab — bis zum
Abo-Ende 09.10. (kündigen!).
