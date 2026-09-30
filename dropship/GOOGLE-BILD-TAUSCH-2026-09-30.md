# Google «Inappropriate image»: vorhandenes unverfängliches Bild nach vorne — Gemini + ChatGPT (30.09.2026)

Betreiber: «google sachen mit chatgpt und gemini» · «merchant sachen auch».
GEMESSEN (Vollscan 29.09. 16:45): 1'013 Free-Listings-Blocker, grösste Klasse «Inappropriate image» 429 (Liste im Stand: 300).

## Verfahren (`automation/google_bild_tausch.py`)
Je Produkt bis 8 vorhandene Bilder → Gemini 2.5 Flash und ChatGPT (gpt-5.5) urteilen UNABHÄNGIG (gleicher Prompt: Artikel klar,
unverfänglich, kein Text-/Tabellenbild). Nur bei gleicher Wahl ≠ 1 und ohne «Motiv selbst ist das Problem» → `productReorderMedia`
(kein Upload — Dateispeicher voll; nichts gelöscht), Rücklesen. Ledger `dropship/_google_bild_tausch.tsv` (alte + neue media-id).

## Pilot 09:36 UTC (SCHARF, N=40, Kontrolle 40)
| Ergebnis | Anzahl |
|---|---:|
| **Tausch** (beide Modelle einig, zurückgelesen) | 18 |
| Motiv selbst = Problem (Totenkopf, Horror-Maske, Dessous/Nachthemd, Sturmfeuerzeug «wie Waffe», Skelett-Druck) | 15 |
| Bild 1 bleibt (beide) | 3 |
| Uneinig → unverändert | 4 |
| Fehler | 0 |
| **Kontrolle** (nur im Ledger, NICHT angefasst) | 40 |

Sichtprüfung aller 18 (Kontaktbogen alt/neu): Werbecollagen mit Text → Freisteller (Konsole, Megaphon, Kamera, Seren, Cremes),
Rückenposen → Frontansicht (Jumpsuit, Yoga-Hose), Vorher/Nachher-Haut → Packung. Keiner der Tausche zeigt ein anderes Produkt.
Nebenfund: `south-moon-fuss-pflegelosung-944002` ist ein **Warzenentferner** («WART REMOVAL» auf der Packung) — Heilmittel-Klasse,
Tausch löst das nicht; Kandidat für Heilversprechen-/Medizinprodukt-Wache.

## Auswertung (offen)
Nach dem nächsten Google-Prüflauf (`google_feedback_wache.py`, täglich): Anteil «nicht mehr Inappropriate image» bei den 18
Tauschen gegen die 40 Kontrollen. Nur wenn Tausch klar besser: restliche ~260 der Klasse laufen lassen (`SCHARF=1 N=…`).
Rückweg je Produkt: alte media-id aus Spalte 4 per productReorderMedia an Position 0.
