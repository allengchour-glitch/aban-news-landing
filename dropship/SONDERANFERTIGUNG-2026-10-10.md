# Sonderanfertigungs-Grössen aus dem Angebot (10.10.2026, Betreiber «2 aus dem angebot»)

## Gemessen

- **Voll-Export** vom 10.10. 06:39 (52'348 aktive), in den Beschreibungen gesucht nach Sonderanfertigung, Massanfertigung, «auf Bestellung gefertigt», «vom Umtausch ausgeschlossen» und «keine Rückgabe».
- **Ergebnis: 17 Schuhe und 1 Nagelset.** Dazu kommt 1 eigener Hygiene-Hinweis bei Bademode, der bleibt.
- Beispiel: «Verfügbare Grössen: 34-40 (Grössen 41-48 sind Sonderanfertigungen und vom Umtausch ausgeschlossen)».
- Der Vertrauensblock im selben Text verspricht «🔄 30 Tage Rückgabe». Der Lieferant nimmt diese Grössen nicht zurück.
- **Der Betreiber hat entschieden: diese Grössen nicht anbieten.**

**Quelle der Lücke:**
- `cj_copy_prompt.mjs` liess Rückgabe-Ausschlüsse seit heute früh einfach weg (Händlerbedingungen-Regel 10.10.).
- Damit wären Sonderanfertigungen bei Neuimporten **unsichtbar** geworden: Die Grössen bleiben im Angebot, nur der Hinweis fehlt.

## Getan

**Regel `automation/data/sonderanfertigung_regel.json` + `automation/sonderanfertigung_wache.py`** (16 Kanarien, im Skript vor jedem Lauf):

| Fall | Erkennung | Massnahme |
|---|---|---|
| Teilbereich | «Grössen 41–48 …», «über 40», «für Grössen 42–44», Importer-Marke «Sonderanfertigung: Grössen X–Y.» | Varianten dieser Grössen löschen, ab der ersten Sondergrösse alles darüber. Den Satz entfernen, Bereichsangaben und die Faktenblock-Liste («Grösse: 34, 35 …») kürzen |
| alle Grössen | «alle Grössen …», «individuell angefertigt», «auf Mass gefertigt» | Entwurf + Tag `sonderanfertigung-keine-rueckgabe` |
| unklar | übrig bliebe kein Block ab der kleinsten Grösse (Liste 34–41 + 45–48 «Spezialgrössen») | Entwurf + Tag |
| unbestimmt | «kundenspezifische Übergrössen», «Massanfertigungen» ohne Zahl | ab Grösse 41 (Annahme nach dem Muster von 8 der 10 bezifferten Fälle) |
| keine Zahlengrössen | Nagelset XS–L, «kundenspezifische Anpassungen …» | nur den Satz entfernen |
| Hygiene | «Versiegelung», «Hygiene» | bleibt |

**Bestand SCHARF** (Vorher-Stand `dropship/_sonderanfertigung_vorher_2026-10-10.json`, Ledger `dropship/_sonderanfertigung_entfernt.tsv` mit den SKUs der gelöschten Varianten):
- **11 Produkte bleiben aktiv, nur mit den Grössen bis 40**, bei einem bis 41. Zurückgelesen: Optionswerte bereinigt, alle Varianten kaufbar, kein Ausschluss-Satz mehr im Text.
  - Beispiele: Overknee flach 45 → 21 Varianten, Stretch-Overknee 90 → 42, Chunky Boots Nieten 60 → 28.
- **5 Entwürfe:**
  - Sandalen klobig: alle 33–48 auf Bestellung
  - Hochhackstiefel: individuell
  - Pailletten-Overknee: individuell
  - Pumps britisch: auf Mass
  - Overknee mit Schnürung: Liste unklar
- **Nagelset:** Satz entfernt.
- **«Plus-Grössen»-Stiefel:** Die Plus-Grössen 42–44 sind weg. Titel jetzt «Overknee-Stiefel mit Stiletto-Absatz und spitzer Zehe», «Plus-Grössen» aus dem Text entfernt, die Adresse bleibt.
- Plateau-Sandalen (34–40): schon sauber, kein Eingriff.

**Quelle:** In `cj_copy_prompt.mjs` gilt jetzt «Rückgabe-Ausschlüsse weglassen — AUSNAHME Sonderanfertigung: am Textende genau «Sonderanfertigung: Grössen X–Y.» (bzw. «alle Grössen.»)». Diese Marke findet der Wächter.

**Wächter:**
- `fixer_keepalive.sh` prüft alle 6 h die Neuimporte der letzten 2 Tage (SCHARF, über `shopify_schranke.sh`).
- Trockenlauf jetzt: 0 neue Fälle.
- Der Auswahl-Nachrüster baut nur Produkte mit genau 1 Variante um. Gelöschte Grössen kommen dort nicht zurück.

## Offen

- **Die 5 Entwürfe sind zurückholbar**, falls CJ für die Standardgrössen eine Rückgabe bestätigt.
- Die Seiten-Regel «personalisierte, individuell angefertigte Artikel sind von der Rückgabe ausgeschlossen» in der Rückgaberichtlinie bleibt. Sie betrifft Gravuren und den Editor, nicht Konfektionsgrössen.

## Lehre

**Eine Regel «Händlerbedingungen weglassen» darf keine Information über die WARE löschen.** Der Satz zum Rückgabe-Ausschluss war die einzige Spur, dass bestimmte Grössen anders behandelt werden. Weglassen hätte das Problem versteckt, nicht gelöst. Bedingungen fallen weg, Eigenschaften der Ware werden zu einer Marke, die ein Wächter findet.
