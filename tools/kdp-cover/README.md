# KDP Cover & Planner Tools

Wiederverwendbare Generatoren für **Amazon-KDP-Taschenbücher** (Low-/No-Content:
Planer, Logbooks, Journals). Entstanden 2026-06-02 beim Fertigstellen des
*ADHD Daily Planner* und *Mileage Log Book* (Pen-Name Marcus Reilly).

> Hinweis: Dieses KDP-Buch-Business ist ein **separates Projekt** (siehe
> `PROJEKT.md`, Abschnitt „KDP-Buch-Business"). Die Tools liegen hier, weil dies
> der Hub ist; die fertigen Buch-PDFs selbst werden **nicht** eingecheckt
> (`out/` ist git-ignored).

## Dateien

| Datei | Zweck |
|-------|-------|
| `build_book.py` | **Pipeline:** ein Aufruf → Cover + Innenteil + `metadata.md` + `upload-playbook.md` |
| `kdp_cover.py` | Full-Wrap-**Cover** als echtes Vektor-PDF (Front/Rücken/Back) |
| `planner_interior.py` | **Innenteil** eines Tages-Planers (6×9, s/w), N Tagesseiten |

## Pipeline (empfohlen)

```bash
python3 build_book.py            # baut alle BOOKS nach ./out/<slug>/
python3 build_book.py adhd       # nur ein Buch
```

Pro Buch entsteht in `out/<slug>/`:
`*-cover.pdf`, `*-interior.pdf` (bei `interior.type=="planner"`),
`metadata.md` (KDP-Felder zum Reinkopieren) und `upload-playbook.md`
(Browser-Claude-Auftrag). **Der Cover-Rücken wird aus der echten Innenteil-
Seitenzahl berechnet** — Cover und Innenteil passen automatisch zusammen.
Bücher mit fremdem Innenteil: `interior={"type":"external","pages":N}` →
Cover + Metadaten + Playbook werden gebaut, Innenteil lädst du selbst hoch.

## Nutzung

```bash
pip install reportlab pikepdf        # pymupdf nur zum Prüfen/Rendern
cd tools/kdp-cover
python3 kdp_cover.py                 # baut die Beispiel-Cover nach ./out/
python3 planner_interior.py          # baut den ADHD-Beispiel-Innenteil
```

Eigenes Buch: Config-Dict anlegen (siehe `EXAMPLES` in `kdp_cover.py` bzw. `ADHD`
in `planner_interior.py`) und `build_cover(cfg, "out.pdf")` /
`build_interior(cfg, "out.pdf")` aufrufen.

**Wichtig:** Der Cover-Parameter `pages` muss exakt der **finalen Seitenzahl des
Innenteils** entsprechen — daraus wird die Rückenbreite berechnet.

## KDP-Lehren (warum die Tools so gebaut sind)

Diese Punkte haben beim ADHD-Planner fünf Cover-Versionen gekostet — hier fix verankert:

1. **Vektor statt Raster.** Ein als Bild geflachtes Cover (Pillow→PDF) wird von
   KDPs Bildanalyse wiederholt falsch als *„Objekt außerhalb der Ränder"* geflaggt,
   obwohl alles innen liegt. Ein **Vektor-PDF mit echtem, eingebettetem Text** wird
   präzise vermessen und geht durch. → `kdp_cover.py` erzeugt reinen Vektor.
2. **Exakte Größe.** Full-Wrap = `(2·trim_w + spine + 2·bleed) × (trim_h + 2·bleed)`,
   Bleed 0,125". Rücken = `Seiten × Multiplikator`: weiß **0,002252**, creme 0,0025,
   Farbe 0,002347 (Zoll/Seite).
3. **Dünner Rücken → kein Rückentext.** Unter ~0,35" reicht die KDP-Clearance
   (0,0625"/Seite) nicht; Rückentext wird als Objekt außerhalb der Ränder geflaggt.
   Tool setzt Rückentext nur ab `spine ≥ 0.35"`.
4. **Keinen eigenen Barcode / kein Barcode-Kästchen** aufs Cover. KDP platziert
   seinen Barcode selbst (mit eigenem weißen Hintergrund). Unten frei lassen.
   Die Meldung „kein gültiger Barcode" ist **informativ, kein Blocker**.
5. **Ein flaches Hintergrundfeld.** Keine Farbblöcke/Streifen (z. B. ein dunklerer
   Rücken-Streifen), die die Außenkante berühren — KDP wertet sie als „Objekt".
6. **Fonts einbetten.** reportlab hängt eine Helvetica-Default-Ressource an;
   beide Tools **remappen sie via pikepdf** auf den eingebetteten DejaVu-Font,
   sodass keine nicht-eingebettete Schrift übrig bleibt.
7. **Upload-Reihenfolge:** Innenteil-PDF **zuerst** (setzt Seitenzahl → Cover-Maß),
   dann Cover. Trim & Papier im KDP-Setup müssen zu den Generator-Parametern passen.

## Abhängigkeiten
`reportlab` (PDF), `pikepdf` (Helvetica-Remap), optional `pymupdf` (Prüfen/Rendern).
Fonts: DejaVu Sans / Sans-Bold (Standard auf den meisten Linux-Systemen).
