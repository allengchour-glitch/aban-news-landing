# Unterkategorien: Wo fehlen Chips? (gemessen 2026-10-22T17:18:29Z)

Die Chips oben in der App (und die Menü-Unterpunkte im Web) sind die Unterpunkte der Hauptkategorie im Menü `main-menu`. Ein Produkt, das in keiner Unterkollektion (Kind oder Enkel) steht, erreicht man nur über die lange Gesamtliste.

Befund-Schwelle: ≥ 300 aktive Produkte UND (≥ 20 % ohne Unterkollektion ODER eine Unterkollektion mit > 50 % der Hauptkategorie).
Ausnahmen (Hauptkollektion ist selbst das Thema, kein Befund): `jacken-outdoor` — Hauptkollektion = Thema «Jacken & Mäntel»; `fitness-training` — Hauptkollektion = Thema «Sport & Fitness».


| Hauptkategorie | aktiv | ohne Unterkollektion | Anteil | zu grobe Unterkollektion | Befund |
|---|---:|---:|---:|---|---|
| 🎁 Geschenke & Weihnachten | 400 | 19 | 4 % | – | ok |
| Damen | 10683 | 1350 | 12 % | – | ok |
| Herren | 5323 | 423 | 7 % | – | ok |
| Schuhe | 4786 | 4 | 0 % | – | ok |
| Schmuck & Uhren | 5656 | 512 | 9 % | – | ok |
| Beauty & Pflege | 4096 | 936 | 22 % | – | ⚠️ |
| Wohnen & Garten | 4915 | 757 | 15 % | – | ok |
| Technik & Gaming | 4515 | 803 | 17 % | – | ok |
| Kinder & Haustier | 3764 | 745 | 19 % | – | ok |
| Highlights | 32 | 20 | 62 % | – | ok |
| Herbst & Übergang | 413 | 341 | 82 % | – | ok |
| Sport & Party | 1459 | 795 | 54 % | – | ok |

## Beauty & Pflege — häufigste Titelwörter der Produkte OHNE Unterkollektion

kabelloser (24), farben (21), elektrischer (19), puder (16), haarschneider (16), pinselset (16), multifunktionaler (16), locken (14), gesicht (13), lipgloss (12), teilig (12), augen (11), glättkamm (11), teiliges (11), gloss (11), pinsel (10), feuchtigkeitsspendender (10), makeup (10), pinsel-set (10), elektrisches (9)

Bestehende Kollektionen, die Lücken-Produkte abdecken (noch nicht im Menü unter dieser Kategorie):

| Kollektion | Handle | Lücken-Produkte | Grösse gesamt | davon in der Kategorie |
|---|---|---:|---:|---:|
| Masken | `ft-maske` | 17 | 246 | 53 % |

Hinweis: Eine fehlende Unterkollektion zeigt sich hier als Wortgruppe (z. B. «mikrofon», «projektor»). Erst prüfen, ob es die Kollektion schon gibt (`automation/menue_unterkat_ordnen.py` hängt vorhandene Fachkollektionen ins Menü), sonst `automation/data/suchbegriff_kollektionen.json` (Feeder oder neue Kollektion).
