# 📖 Session-Handoff — ki-schriftsteller (Bücher)

> Stand: 2026-06-08. Für die nächste Buch-Session. Kurz & high-signal.

## 🟢 Zuletzt erledigt (Session 2026-06-08)
**Bug behoben: überlappender Text an Kapitelanfängen in den PDFs.**
- **Ursache:** Versal-Initiale (erster Buchstabe) war **30 pt** in einem Absatz mit fester
  Zeilenhöhe (`leading=16.5`). reportlab unterschätzt dadurch die Absatzhöhe → der Folge-
  absatz wird zu weit oben gezeichnet → zwei Sätze liegen übereinander.
  (`autoLeading="max"` hilft **nicht** — wrap/draw bleiben dort inkonsistent, ~10 pt Versatz.)
- **Fix (1 Zeile in `buch_pdf.py`):** Initiale auf **16 pt** → passt in die feste Zeile,
  berechnete = gezeichnete Höhe → kein Versatz. Bleibt eine amberfarbene Hervorhebung.
- **Verifiziert** mit pdfminer + **Baseline-Clustering** (wichtig: rohes pdfminer splittet
  Justify-Zeilen in Fragmente → falsche „Überlappungen"; erst nach Baseline-y0 clustern,
  Toleranz ~3 pt, dann auf echte vertikale Überlappung prüfen). **0 echte Überlappungen
  über ALLE 16 PDFs.** Merge: PR #461.
- **Neu gerendert + in `downloads/`** aktualisiert: das-tal, schicht, the-seam (Gesamt + Bände).
  **EPUB war nicht betroffen** (CSS `float`-Drop-Cap, `p.first::first-letter`) → unverändert.

## 📚 Roman-Inventar & Build-Befehle
| roman-json | Titel | slug | kapitel-dir | Bände | publiziert (downloads/) |
|---|---|---|---|---|---|
| roman-drama-trilogie.json | Das Tal hält den Atem an | das-tal-haelt-den-atem-an | `kapitel` | 3 | ✅ |
| roman-drama-trilogy-en.json | The Valley Holds Its Breath | the-valley-holds-its-breath | `kapitel-en` | 3 | ❌ (gerendert, sauber) |
| roman-schicht.json | Schicht | schicht | `kapitel-schicht` | 3 | ✅ |
| roman-schicht-en.json | The Seam | the-seam | `kapitel-schicht-en` | 3 | ✅ |
| roman-thriller.json | Der stille Posten | der-stille-posten | — | flach | ❌ (noch keine Kapitel) |

**Bauen (PDF + EPUB), Beispiel Schicht:**
```bash
cd ki-schriftsteller
pip install reportlab pillow          # falls nötig
python3 buch_pdf.py   --roman roman-schicht.json --kapitel-dir kapitel-schicht --out ausgabe
python3 buch_bauen.py --roman roman-schicht.json --kapitel-dir kapitel-schicht --out ausgabe
```
Ausgabe: `ausgabe/<slug>-band-0N.{pdf,epub}` + `ausgabe/<slug>-gesamt.{pdf,epub}`.
`ausgabe/` ist **gitignored** → zum Veröffentlichen nach `downloads/` kopieren:
```bash
A=ki-schriftsteller/ausgabe; S=schicht
cp "$A/$S-gesamt.pdf"  "downloads/$S.pdf";  cp "$A/$S-gesamt.epub" "downloads/$S.epub"
for n in 01 02 03; do cp "$A/$S-band-$n.pdf" downloads/; cp "$A/$S-band-$n.epub" downloads/; done
```
(Konvention: `downloads/<slug>.pdf` = die **gesamt**-Datei; build-assets.yml macht das für das-tal automatisch.)

## 🛒 Store-Upload (Lemon Squeezy) — Stolperfallen
- Dateien liegen in **`downloads/`**; Direkt-Download via `…/raw/main/downloads/<datei>` (NICHT `/blob/`).
- Repo-Namen mit Bindestrich: **`the-seam`** (nicht „theseam").
- `.epub/.pdf` gehören in den **„Files"**-Bereich des Produkts — NICHT in den Bild-Upload
  (der nimmt nur `.jpg/.png`, z. B. `img/covers/schicht-gesamt.jpg`).
- ⚠️ Nach jedem Re-Render: **frische** `downloads/`-Dateien neu hochladen (alte hatten den Overlap-Bug).

## ✍️ Fertige Texte
**„Schicht" — Store-Beschreibung (faithful zur Prämisse, drei Bände 1905–1989):**
> Eine Bergmannsfamilie, ein Jahrhundert, ein verschwiegener Verrat: Die Ruhrgebiet-Saga
> »Schicht« — vom Streik 1905 bis zum Zechensterben 1989. Drei Bände. (E-Book & PDF.)

Bände: **Anfahrt** (Voßlohe 1905–1923) · **Vor Ort** (1929–1948) · **Abkehr** (1962–1989).
Titel-Dreifachbedeutung: Arbeits-Schicht / geologische Schicht / soziale Schicht.
**Offen:** EN-Description für „The Seam" (analog).

## 🔧 Relevante Dateien
- `buch_pdf.py` — PDF-Satz (reportlab, A5). Initiale-Markup ~Zeile 159; Styles in `_styles()`.
- `buch_bauen.py` — EPUB + `lies_kapitel/teile_kapitel` (gemeinsame Kapitel-Quelle).
- `roman_util.py` — `lade_roman/slugify/baende_aus_roman/ist_trilogie`.
- `pdf_fonts.py` — eingebettete Serif-Fonts (KDP-Pflicht).
- Cover: `img/covers/<slug>{,-band-0N,-gesamt}.jpg` (`generate_schicht_covers.py`).
