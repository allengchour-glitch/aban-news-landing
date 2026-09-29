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

## Nachtrag 20:40 UTC — die 23 Reel-Sperren gingen verloren (Verbesserungsrunde)

GEMESSEN nach dem Container-Neustart: `reels_seed.csv` trug **0** `jury-skip` (Bild-Queue: 32 ✓), 34 «ready». Schon der
Commit 66a763d31 enthielt die Sperren nicht: zwischen meinem Textersatz und dem Commit schrieb ein anderer Schreiber
(Poster/Reel-Motor; 20+ Skripte schreiben diese Datei) seine zu Beginn gelesenen Zeilen zurück — **Lost Update**.
Dieselbe Klasse steckte im Säuberer selbst: er las alle Zeilen, prüfte Minuten lang (OCR) und schrieb dann ALLES zurück.

GETAN:
- `social_queue_saeubern.py` hat den Schritt **jury-skip** (Reels + Bilder, gleicher Cache-Schlüssel wie die Poster,
  `JURY_NEU` = 40 neue Urteile/Lauf, danach nur Cache via `gemini_jury.py --nur-cache`; kein Urteil = bleibt ready).
  Er läuft täglich im Aufseher → eine verlorene Sperre kommt spätestens am nächsten Tag zurück (idempotent).
- **Schreiben = nachlesen:** Datei direkt vor dem Schreiben neu lesen, nur Zeilen ändern, die dort noch «ready» sind
  (Schlüssel id + Medium), atomar über `.tmp` + `os.replace`.
- Kanarienvogel DRY: 23 jury-skip (alle aus dem Cache, 18 s), echt: 23 gesetzt, zurückgelesen 23; Reels ready 11.

OFFEN (nicht behoben, gemessen): `post_guard.lock()` beendet einen Poster bei fremdem Lock mit **Exit 0** — der
Autopilot setzt dann die Takt-Marke wie nach einem Post (Klasse Nachtrag 94). Tritt nur bei parallelen Postern auf
(Autopilot ruft seriell) — nächster Kandidat einer Runde.

## Nachtrag 20:50 UTC — gesperrt heisst nicht verloren: `jury_nachbessern.py` (Betreiber «mehr verbessern»)

GEMESSEN: 32 Bildposts auf `jury-skip`, 28 davon aus der Kimi-Queue. Die Begründungen fielen in zwei reparierbare Klassen:
**BILD** (englischer Lieferantentext wie «8.5 Inches», «Sonic Sweeping Vibration Toothbrush», «Simple fashion & creative»)
und **CAPTION** (Kimi versprach «Mondstein», «Reise-Rucksack», «7-Chakra Wickelarmband», was das Bild nicht zeigt).

GETAN: `automation/jury_nachbessern.py` — je gesperrter Zeile das Produkt über die tokenlose Storefront API holen, die
ersten zwei Caption-Zeilen aus dem ECHTEN Shopify-Titel + Live-Preis bauen (keine KI), dann altes Bild und bis zu 3 weitere
Produktbilder (≥ 600 px, nie schon gepostet) der Jury vorlegen; der erste bestandene Kandidat geht zurück auf `ready`
(nachgelesen, atomar, nur wenn die Zeile noch `jury-skip` ist). K.-o. heilversprechen/waffe/anstoessig bleibt gesperrt.
Ledger `dropship/_jury_nachbesserung.tsv` (je Zeile ein Versuch). Täglich im Aufseher direkt nach dem Säuberer.

Ergebnis: **23 von 32 repariert** (16 mit anderem Bild, 7 nur mit ehrlicher Caption), 5 ohne bestandenen Kandidaten,
4 ohne Produkt-ID. Bild-Queue ready 34 → 57. Sichtprüfung Kontaktbogen der 16 neuen Bilder: alle sauber, kein
Lieferantentext (Markenname auf Zifferblatt/Sohle = Ware selbst).

## Nachtrag 29.09. 00:45 UTC — die Jury streut: Mehrheit aus 3 im Grenzband (Verbesserungsrunde)

GEMESSEN: 8 Grenzfälle aus dem Cache (Schnitt 6–8) je 2× neu beurteilt → **2 von 8 kippten** zwischen bestanden und
durchgefallen (reel 1744902…: F/F/T; reel 1745985…: T/F/T), der Schnitt lag bis 3,3 Punkte auseinander (5,5 vs 8,83).
Schon am 28.09. bekam die HyperFrames-Probe v4 erst 9,33, dann 7,17.

GETAN (`automation/gemini_jury.py`):
- **Grenzfall** = Schnitt innerhalb ±1,5 um die Schwelle 7,0 ODER tiefste Note 4–5,5 → 2 weitere Urteile, die
  **Mehrheit** entscheidet, gespeichert wird das Median-Urteil der Mehrheitsseite + `runden` (alle Einzelurteile).
  Klare Fälle bleiben bei 1 Urteil. Schalter `JURY_RUNDEN` (Standard 3), `JURY_BAND` (1,5).
- Alte Einzelurteile im Grenzband (120 von 195 Cache-Einträgen) gelten nicht mehr → nächster Aufruf urteilt neu mit Mehrheit.
- Selbsttest (7 Fälle) bestanden. Einmal-Nachprüfung der gesperrten Grenzfälle: 13 Zeilen (9 Reels, 4 Bilder) mit
  Mehrheit neu beurteilt → **0 freigegeben** (alle Sperren bestätigt). Die Mehrheit schützt vor allem vor
  **Zufallsfreigaben** wie T/F/T.
Kosten: nur im Grenzband ×3 (~0,3 Rp. statt ~0,1 Rp. je Post).
