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

## Auswertung (03.10.2026, Stand Google-Scan 02.10. 13:26 UTC)
| Gruppe (Pilot 30.09.) | n | nicht mehr blockiert |
|---|---:|---:|
| **Tausch** | 18 | **15 (83 %)** |
| Kontrolle, bis zum Scan unberührt | 26 | 11 (42 %) |
| Kontrolle, am 01.10. doch getauscht | 14 | 8 (57 %, nur 1 Tag Zeit) |
| Motiv (nichts getauscht) | 15 | 12 (80 %) |

Tausch ist klar besser als Kontrolle (83 % vs. 42 %). Die Kontrolle zeigt aber auch: **rund 40 % gibt Google ohne
Eingriff wieder frei** (Neuprüfung). Der echte Gewinn des Tauschs liegt also bei etwa +40 Prozentpunkten, nicht bei 83 %.
Auffällig ist «Motiv» mit 80 %. Daraus folgt nicht, dass das Motiv harmlos ist; es ist eine kleine Stichprobe mit
Google-eigenem Rauschen.

**Ausgerollt ist schon** (01.10. mit Zwischenstand 10/13 vs. 0/25, Commit 645e807d7; danach 02./03.10.). Die
Kontroll-Zeilen fielen beim Ausrollen aus dem Ledger (Rekonstruktion aus aaa2908db). Die Klasse ist vollständig
bearbeitet: Von 250 blockierten haben nur noch 2 keinen Ledger-Eintrag (≤ 1 Bild). Ein weiterer SCHARF-Lauf ist nicht nötig.
**Nächste Messung:** der laufende Vollscan vom 03.10. (Start 08:09 UTC). «tausch-g» (150, nur Gemini) dort getrennt auswerten.
Rückweg je Produkt: alte media-id aus Spalte 4 per productReorderMedia an Position 0.
