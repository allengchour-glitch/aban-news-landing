# Bereiche 2 live (2.11.2026): Sportschuhe, Hobby & Party, Sport, Beauty, Tiere (+ Wohnen läuft)

Auftrag des Besitzers 2.11.: «mach weiter mit den anderen bereichen» (nach Elektronik, Handy, Computer, Unterhaltung, Haus & Bau, Auto, Spielzeug am 1.11.).

## Kategorien (GEMESSEN im Lauflog `kategorien_anlegen.mjs`, `SCHMUCK=1 BEREICH_DATEI=<bereich> PREFIX=s-`)
| Bereich | Kategorien | Tag-Änderungen (Trockenlauf = Live) |
|---|---|---|
| Sportschuhe | 18 | 815 |
| Hobby & Party | 26 | 1 047 |
| Sport | 46 | 1 795 |
| Beauty | 66 | 4 500 |
| Tiere | 60 | 5 653 |
| **Summe** | **216** | **13 810** |

- Alle 216 Sammlungen: «Mitglieder n / erwartet m» mit n ≥ 90 % von m, 0 Abweichungen, 0 Fehler im Log; die Summe der geschriebenen Tags (13 810) gleicht der Summe der Trockenläufe.
- **Wohnen & Garten** (154 Kategorien, 6 881 Tag-Änderungen): Lauf war beim Schreiben dieses Berichts noch nicht fertig; Menü-Umbau für Wohnen NICHT gemacht (13 Gruppen gegen die Grenze von 3 Ebenen: Entscheid des Besitzers).

## Menü (`menue_bereiche2_0211.mjs`, Sicherung vor dem Umbau: `menu-sicherung/main-menu-vor-bereiche2-0211.json`)
- Umgebaut: **Haustiere** (Spazieren & Unterwegs, Futter & Trinken, Spielzeug, Kleidung & Accessoires, Schlafen/Möbel/Pflege, neu Kleintiere & Vögel), **Beauty & Pflege** (Gesicht & Haut, Make-up & Wimpern, Nägel, Haare/Rasur, Beauty-Geräte, Körper/Mund/Düfte, neu Massage & Entspannung, Rücken/Gelenke), **Sport & Party** (Fitness, Yoga, Camping, Wandern/Angeln/Wasser, Rad & Velo, neu Ballsport/Kampfsport, 5 Hobby-Köpfe), **Schuhe** (neuer Kopf «Sportschuhe» mit 11 Unterpunkten).
- Nichts gelöscht ausser drei Einzel-Köpfen unter Beauty, die jetzt als Unterpunkt derselben Sammlung stehen (Make-up Pinsel & Tools, Mundpflege & Zähne, Haarbürsten & Kämme); doppelte Unterpunkte über zwei Köpfe wurden entfernt (z. B. Kunstleder & Lederhandwerk nur einmal).
- Titel über 34 Zeichen gekürzt (15 Titel, `KURZMAP`).
- **Nachlesen:** ausserhalb der vier Äste «fehlend 0 | neu 0» nach jedem Schritt; **alle 132 neuen Menü-Links per HTTP 200 geprüft** (seriell, 3 s Pause, `pruef_bereiche2.mjs`).

## Lehren
1. **`menuUpdate` ging mit «Internal error» durch, obwohl der Baum gültig war.** Ursache gefunden durch Zuschneiden (Ast für Ast, dann Kopf für Kopf): das Skript suchte den alten Kopf «Velo & Radsport» **im ganzen Menü** und nahm die ID des ersten Treffers, der unter «Auto & Motorrad» steht; eine ID in einem fremden Ast ergibt einen Serverfehler. Fix: Kopf nur im eigenen Ast suchen. Eine Obergrenze für die Zahl der Einträge wurde widerlegt (689 und 694 Einträge gingen).
2. Die Fehlerantwort ist kein Beleg für «nicht geschrieben»: nachlesen (hier war nichts geschrieben).
3. Titel gleicher Köpfe können in mehreren Ästen vorkommen (Velo & Radsport, Parfum & Düfte): IDs immer innerhalb des Ziel-Asts suchen.

## Offen
- Wohnen & Garten: Menü-Entscheid; Lauf noch nicht fertig.
- Banner und «gut bewertete zuerst» für die 216 neuen Sammlungen (Gemini-Guthaben leer; Codex macht Banner).
- Index-Anträge für die neuen Seiten (Kontingent, morgen früh messen).
