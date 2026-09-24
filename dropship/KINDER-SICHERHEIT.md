# Kinder-Sicherheit — Warnhinweise und Altersgruppen (Stand 24.09.2026, 21:10 UTC)

Wächter: `automation/kinder_sicherheit.py` — seit 24.09. im Aufseher-Tageslauf (vorher nur Handlauf, Ledger bis 30.08.).

## Gemessen (Live-Quelle, nicht Export)
| | Anzahl |
|---|---|
| Warnhinweis «Nicht für Kinder unter 36 Monaten … Erstickungsgefahr» fehlte | **581** (Bausteine/Bausätze/Puzzles ~507, Kuscheltiere 74) |
| davon mit Magnet-Warnung | 5 |
| `age_group` falsch/fehlend (Google) | 111 |
| Kleinkind-Spielzeug mit Kleinteil-Wort — NUR gemeldet, nicht beschriftet | 8 (z. B. «Grossteile Bauklötze mit Wal», «Grosse Bausteine für Kinder») |

## Getan
- 581 Hinweise gesetzt, 111 Altersgruppen korrigiert, 0 Rücklese-Fehler; Kanarienvogel live per WebFetch
  (`/products/plusch-faultier-15-cm-fga25868` zeigt den Hinweis).
- Regeln: Tierliste vervollständigt (Faultier fehlte; «Plüsch Berner Sennenhund» fiel durch, weil ein Wort zwischen
  «Plüsch» und Tier stand); Verkleidungen (Kostüm, Maske, Overall …) und Schuhe («Sandalen mit Perlen») ausgenommen;
  Kleinkind-Spielzeug wird gemeldet statt beschriftet (der Hinweis würde dem Produkt widersprechen).
- Sicherheit des Schreibers: liest live (QUELLE=live), liest jeden Text vor dem Schreiben frisch (vorher wurde das HTML
  aus dem Export zurückgeschrieben — jede spätere Textänderung wäre verloren gewesen), holt die Text-Sperre ohne zu
  warten, liest den Hinweis nach dem Schreiben zurück.

## Offen
- Die 8 Kleinkind-Spielzeuge: Altersangabe des Lieferanten prüfen (Fortura/CJ), bevor etwas dazu geschrieben wird.
- Lizenz-Plüsch (Pikachu u. a.) trägt nach Regel keinen Hinweis (Tiername fehlt) — bewusst nicht erweitert, weil
  «Plüsch <beliebiges Wort>» Jacken und Bezüge trifft.
