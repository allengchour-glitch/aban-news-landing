# Gemini-Vision-Jury vor jedem Social-Post (28.09.2026)

Betreiber: «mache jede post ein meisterwerk in sozial media, jetzt hast du gemini» · «vision ai».

## Warum eine zweite Prüfung neben `meisterwerk_tor.py`

Das Tor **misst** (Format, Bewegung in der 1. Sekunde, Standbild-Anteil, Lautheit, Bildpreis per OCR). Es **sieht** nicht.
GEMESSEN heute, von keinem Zähler gefunden: «Dein Zuhause, gemütlicher» auf einem Lederrucksack, englische CJ-Untertitel,
ein «Dropshipping.com»-Wasserzeichen, ein Wok im Reel für ein Löffel-Set, Kimi-Captions, die Dinge versprechen, die das Bild
nicht zeigt («Mondstein», «Reise-Rucksack» für ein Täschchen, «oberschenkelhoch» für Stiefeletten).

## Werkzeug

`automation/gemini_jury.py <datei|url> --caption "…" --typ reel|bild|karussell`
- Video → 4 Standbilder (0,3 s · 1,2 s · Mitte · Ende−1 s), Bild → 1 (≤ 1024 px); gemini-2.5-flash, JSON-Antwort.
- Noten 0–10: erstes_bild, bildqualitaet, sauberkeit, text_im_bild, stimmigkeit, wirkung.
- K.-o.: falsches_produkt, anstoessig, heilversprechen, waffe, preis_widerspruch.
- **Bestanden = Schnitt ≥ 7,0 UND jede Note ≥ 5 UND kein K.-o.** (SETZUNG, `JURY_MIN`).
- Exit 0 bestanden · 4 durchgefallen · 2 kein Urteil. Cache `dropship/_gemini_jury.tsv` (sha1 Datei + Caption).
- Markenname AUF der Ware/Originalverpackung ist erlaubt (Fehlalarm HEKU/«Made in Germany» beim ersten Lauf → Prompt ergänzt).

## Verdrahtung (`post_guard.juryPruefen`)

| Poster | Stelle | 4 (durchgefallen) | 2 (kein Urteil) |
|---|---|---|---|
| `meta_reel_post.mjs` (IG/FB) | nach dem Meisterwerk-Tor | `jury-skip`, Exit 3 | Exit 3, Zeile bleibt |
| `metricool_tiktok_post.mjs` (TikTok/YouTube) | nach dem Meisterwerk-Tor | `jury-skip`, Exit 3 | Exit 3 |
| `social-autopost-meta.mjs` (Bild) | nach der Bildtext-Schicht (elfte Schicht) | `jury-skip`, nächste Zeile | Zeile bleibt, nächste |
| `ig_karussell_post.mjs` | Titelfolie `01.jpg` | `jury-skip`, nächstes Set | bleibt ready |
| `metricool_pinterest_pin.mjs` | Pin-Bild + Titel/Preis | nächster Kandidat (Cache) | nächster Kandidat |

`JURY=0` schaltet die Jury ab (nur für Notfälle).

**Nebenfund, gleiche Klasse wie Nachtrag 94:** Der Bildposter sah pro Lauf genau EINE Zeile an (`ready.slice(0, MAX)`) und
beendete sich mit Exit 0 auch bei 0 Posts → der Autopilot setzte die 6-h-Marke. Jede Ablehnung hätte einen ganzen Takt
gekostet. Jetzt: bis zu `VERSUCHE` (12) Zeilen, Abbruch beim ersten Post; 0 gepostet ohne Fehler = Exit 3, Autopilot
unterscheidet «übersprungen» von «fehlgeschlagen» und lässt die Marke alt.

## Messung an der Queue (GEMESSEN, 28.09. 19:55–20:15 UTC)

| Queue | beurteilt | bestanden | durchgefallen | K.-o. |
|---|---|---|---|---|
| Reels (`reels_seed.csv`, ready) | 35 | 12 | 23 | falsches_produkt mehrfach |
| Bilder (`posts_image.csv`, ready) | 68 | 36 | 32 | falsches_produkt 10 (gesamt), heilversprechen 1 |

Häufigste Gründe der Durchgefallenen (Stichwort in der Begründung): englischer Lieferantentext 18 · «generisch» 7 ·
Marke/Hook passt nicht 3+3 · Fremdlogo 2 · Wasserzeichen 1 · chinesisch 1.
**Sichtprüfung (Kontaktbogen, 3 Reels):** «Dropshipping.com»-Wasserzeichen ✔, «3Cr14 tool steel» im Bild ✔, Wok statt
Löffel-Set ✔ — die Jury lag in allen drei Fällen richtig.
Alle 55 Durchgefallenen stehen jetzt auf `jury-skip` (Statusänderung per Textersatz, CSV-Vergleich vorher/nachher: nur
diese Zeilen geändert).

**Erster Live-Beleg:** Autopilot 20:11 UTC — Karussell «Blockabsatz-Stiefel» abgelehnt (K.-o. falsches_produkt: nicht
oberschenkelhoch), YouTube-Short «Herbst-Favoriten» mit Note 9,17 durchgelassen und geplant.

## Offen

- Kimi-Captions behaupten Details, die das Bild nicht zeigt (≥ 8 von 32 Bild-Durchfällern) → Quelle der Klasse ist die
  Caption-Erzeugung, nicht das Bild. Nächster Schritt: Jury schon beim Bau der Queue (`queue_new_products.mjs`), damit
  nur postbare Zeilen entstehen.
- Reel-Nachschub: 12 postbare Reels ≈ 4 Tage IG/FB-Takt. Durchgefallene Reels mit Quelle können über
  `reel/reel_neu_rendern.py` neu gebaut werden (Fremdtext ist aber meist im Quellvideo — dann hilft nur `schnitt.py --sperren`).
- Kosten: ~0,1 Rappen je Urteil (gemini-2.5-flash, 1–4 Bilder); Cache verhindert Doppelzahlungen. Budget-Regel 11 (kein Veo) unberührt.
