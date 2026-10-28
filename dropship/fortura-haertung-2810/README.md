# Fortura-Bestell-Engine: Härtung nach Zweitmeinung (28.10.2026)

**Status: NICHT eingespielt.** Die Engine läuft nur im Branch `claude/luxestyle-status-tztnn1` (eigene Historie).
Ein Push dorthin wurde am 28.10. vom Berechtigungsprüfer als Produktions-Auslieferung abgelehnt und nicht weiter versucht.
Dieser Ordner ist deshalb nur der geprüfte Vorschlag; wirksam wird er erst, wenn der Besitzer das Einspielen freigibt.

## Inhalt

| Datei | Zweck |
|---|---|
| `fortura_bestell_engine.py` | fertige Fassung (1 254 Zeilen) |
| `fortura_bestell_engine.patch` | Unterschied zur Fassung im Engine-Zweig (Tip `112b67cf4b`), `patch -p1` |

Gemessen: das Patch lässt sich auf die Engine-Fassung aus `origin/claude/luxestyle-status-tztnn1` anwenden und ergibt
bitgleich die fertige Datei (`cmp`). Die Datei im Engine-Zweig war seit dem 26.10. unverändert.

## Was geändert ist (Funde der Zweitmeinung Codex/GPT-6 Astra, jeder am echten Code nachgestellt)

1. **Sperre gegen Doppelläufe** (`flock`, nicht blockierend): ein zweiter Lauf meldet «ein anderer Lauf ist noch aktiv» und tut nichts.
2. **Frischer Blick vor dem Senden**: Ledger-Zeile und Ordner `/home/ORDERS` werden direkt vor dem Setzen von «xml-unterwegs» neu gelesen; eine fremde Zeile wird übernommen statt überschrieben.
3. **Lieferschein-Schleife (DESADV)**: ein fehlerhafter Lieferschein stoppt die übrigen nicht mehr, die Warnung nennt den Dateinamen.
4. **Adresse im Paket**: schlägt die Auffrischung fehl, wird die Bestellung gehalten (`PAKET:…`) statt mit alter Adresse gesendet.
5. **Sendungseintrag**: Mengen je Position werden aufgebraucht (`rest`), nicht mehrfach gezählt.
6. **Seitenzähler**: Bestellungen und Positionen lesen `pageInfo.hasNextPage`; mehr als 30 bezahlte offene Bestellungen werden gemeldet, Bestellungen mit über 30 Positionen gehalten.

Nicht behoben, nur dokumentiert (Fortura-Fragen oder Besitzer-Entscheide): `norm_artnr` mit führenden Nullen, Neubuchung bei Teillieferung, mehrere Lieferscheine je Bestellung, `Internet_VE` leer/0 gilt als 1, Teilerstattung gilt als beendet, `curl -k`.

## Prüfung

- Selbsttest der Engine: 107 Prüfungen grün; Selbsttest `fortura_xml`: 25 von 25.
- Mutationsprobe: 11 von 11 Mutanten erkannt.
- Die Zweitmeinung selbst ist eine Behauptung der Modellfamilie; vor dem Einspielen den Unterschied einmal lesen.

## Einspielen (nur nach Freigabe des Besitzers)

```bash
git checkout claude/luxestyle-status-tztnn1
git show origin/main:dropship/fortura-haertung-2810/fortura_bestell_engine.py > automation/fortura_bestell_engine.py
python3 -B automation/fortura_bestell_engine.py --selbsttest   # erwartet: 107 OK
```

Danach Stufe 1 ohne Schalterdatei laufen lassen (prüft nur Paket + Ledger) und erst dann die Schalterdatei setzen.
