# TOOLS.md — Build- und Generator-Skripte

Diese Seite beschreibt alle Python-Skripte im Repo-Root, die Assets erzeugen:
PDFs, ePubs, OG-Bilder, KDP-Dateien und LinkedIn-Entwuerfe. Nutz sie als
Nachschlagewerk, damit du nach langer Pause sofort weisst, welches
Skript welche Datei baut und wie du es aufrufst.

Alle Skripte sind eigenstaendig und laufen mit `python3 SKRIPT.py` aus dem
Repo-Root. Es gibt keinen Build-Step fuer die Website selbst — die Skripte
erzeugen nur statische Assets, die danach committet und mit deployt werden.

## Schnellstart

Voraussetzung sind zwei Pakete. Einmalig installieren:

```bash
pip install reportlab pillow
```

- `reportlab` baut alle PDFs (eBook, Lead-Magnets, KDP-Print, Launch-Manual).
- `pillow` baut alle PNG-Bilder (OG-Bilder, KDP-Cover).
- Die LinkedIn-Engine braucht **kein** Paket (reine Standardbibliothek).

Danach pro Aufgabe der passende Befehl:

| Befehl | Was passiert |
|--------|--------------|
| `python3 generate_ebook.py` | eBook als PDF **und** ePub in vier Sprachen (de/en/fr/it) |
| `python3 generate_pdfs.py` | Die fuenf Lead-Magnet-PDFs |
| `python3 generate_og_images.py` | Drei OG-Bilder (1200x630) im Repo-Root |
| `python3 generate_kdp_cover.py` | KDP-eBook-Frontcover (1600x2560 PNG) |
| `python3 generate_kdp_print.py` | KDP-Taschenbuch-Innenteil als PDF |
| `python3 generate_linkedin_posts.py` | Fuenf LinkedIn-Entwuerfe aus einer Tagesausgabe |
| `python3 generate_launch_manual_pdf.py` | Launch-Manual als PDF (Sonderfall, siehe unten) |
| `python3 minify_launch_manual.py` | Launch-Manual-HTML verkleinern (Sonderfall) |

Alle PDF- und ePub-Dateien landen in `downloads/`. Die OG-Bilder landen im
Repo-Root. Die KDP-Dateien landen ebenfalls in `downloads/`.

## Skripte im Detail

### generate_ebook.py

- **Zweck:** Baut das "Anti-Hype"-eBook ("Wie deutsche Solopreneure KI ohne
  Bullshit einsetzen") in vier Sprachen, jeweils als PDF und als ePub. Der Inhalt
  steht datengetrieben in einem Dict `CONTENT` (ein Eintrag pro Sprache), ein
  gemeinsamer Renderer baut daraus die Dateien. Pro Sprache gibt es Cover,
  Inhaltsverzeichnis und Kapitel; die hinteren Kapitel enthalten Vorlagen, einen
  durchgerechneten Arbeitstag und eine Werkzeug-nach-Aufgabe-Uebersicht.
- **Aufruf:**
  - `python3 generate_ebook.py` — alle Sprachen.
  - `python3 generate_ebook.py de en` — nur ausgewaehlte Sprachen.
  - Unbekannte Sprach-Codes werden uebersprungen (Hinweis auf der Konsole).
- **Abhaengigkeiten:** `pip install reportlab` (ePub nutzt nur die
  Standardbibliothek `zipfile`).
- **Output-Dateien** (in `downloads/`):
  - `anti-hype-ebook.pdf` / `.epub` (de)
  - `anti-hype-ebook-en.pdf` / `.epub`
  - `anti-hype-ebook-fr.pdf` / `.epub`
  - `anti-hype-ebook-it.pdf` / `.epub`
- **Hinweise:** Dies ist die einzige Quelle fuer den Buchtext. `generate_kdp_print.py`
  importiert `CONTENT` direkt aus dieser Datei (`from generate_ebook import CONTENT`).
  Wenn du den Inhalt aenderst, aendern sich eBook **und** KDP-Print zugleich.

### generate_pdfs.py

- **Zweck:** Baut die fuenf Lead-Magnet-PDFs, die auf `resources.html` verlinkt
  sind. Gemeinsames Layout ueber die Helfer `make_styles()`, `cover_page()`,
  `new_doc()` und `footer_canvas()`.
- **Aufruf:** `python3 generate_pdfs.py` (keine Argumente; baut immer alle fuenf).
- **Abhaengigkeiten:** `pip install reportlab`.
- **Output-Dateien** (in `downloads/`):
  - `30-prompts-fuer-solopreneure.pdf` — 30 Prompts in sechs Kategorien.
  - `anti-hype-glossar.pdf` — KI-Begriffe ehrlich erklaert plus Sperrwort-Liste.
  - `dsgvo-ki-checkliste.pdf` — 20 Punkte zur DSGVO-Konformitaet.
  - `ai-tool-stack-2026.pdf` — 12 Tools mit Kosten und Bewertung.
  - `cold-email-templates.pdf` — fuenf Cold-Email-Vorlagen.
- **Hinweise:** Am Ende listet das Skript alle `.pdf` im `downloads/`-Ordner auf.
  Jede Build-Funktion gibt eine `OK:`-Zeile mit der Stueckzahl aus.

### generate_og_images.py

- **Zweck:** Baut die Open-Graph-Bilder (1200x630) fuer die Money- und
  eBook-Seiten. Reines Pillow, keine externen Schriften — nutzt System-Schriften
  (DejaVu / Liberation) mit Fallback.
- **Aufruf:** `python3 generate_og_images.py` (keine Argumente).
- **Abhaengigkeiten:** `pip install pillow`.
- **Output-Dateien** (im **Repo-Root**, nicht in `downloads/`):
  - `og-ebook.png`
  - `og-ki-tools.png`
  - `og-chatgpt.png`
- **Hinweise:** Die Dateien liegen bewusst im Root, weil die HTML-Seiten sie als
  OG-Image relativ einbinden. Der Build-Workflow committet sie ueber das Muster
  `og-*.png`.

### generate_kdp_cover.py

- **Zweck:** Baut ein druckfertiges eBook-Frontcover fuer Amazon KDP mit reinem
  Pillow. KDP-Format 1600x2560 px (Verhaeltnis 1.6), RGB. Aller Text bleibt
  innerhalb einer Sicherheitsmarge von rund 10 %, damit KDP das Cover nicht wegen
  Text im Anschnitt ablehnt.
- **Aufruf:** `python3 generate_kdp_cover.py` (keine Argumente).
- **Abhaengigkeiten:** `pip install pillow`.
- **Output-Dateien** (in `downloads/`):
  - `kdp-cover-ebook.png`
- **Hinweise:** Es ist ein reines Frontcover fuer das Kindle-eBook. Ein
  Taschenbuch braucht ein durchgehendes Wraparound-Cover mit Ruecken und
  Rueckseite — das ist hier bewusst nicht enthalten und muss im KDP-Cover-Tool
  angelegt werden. Aktuell nur die deutsche Variante; weitere Sprachen lassen sich
  ueber das Dict `COVERS` ergaenzen.

### generate_kdp_print.py

- **Zweck:** Baut den druckfertigen Innenteil (Interior) des Buchs "Anti-Hype"
  fuer ein KDP-Taschenbuch: Titelseite, Inhaltsverzeichnis und Kapitel.
  Trim-Size 5" x 8" (12,7 x 20,32 cm), gespiegelte Raender fuer gerade/ungerade
  Seiten (Bund).
- **Aufruf:**
  - `python3 generate_kdp_print.py` — nur Deutsch (Standard).
  - `python3 generate_kdp_print.py de en` — bestimmte Sprachen.
- **Abhaengigkeiten:** `pip install reportlab`.
- **Output-Dateien** (in `downloads/`):
  - `anti-hype-print-de.pdf` (Standard)
  - `anti-hype-print-<lang>.pdf` (weitere Sprachen)
- **Hinweise:** Der Buchinhalt kommt per Import aus `generate_ebook.py`
  (`from generate_ebook import CONTENT`) — eine Quelle der Wahrheit fuer eBook
  und Print. Das Cover wird **nicht** hier gebaut; es muss separat im
  KDP-Cover-Tool angelegt werden, sobald die finale Seitenzahl feststeht (die
  Rueckenbreite haengt von Seitenzahl und Papiertyp ab).

### generate_linkedin_posts.py

- **Zweck:** Macht aus einer Tagesausgabe (drei KI-Items) fuenf fertige
  LinkedIn-Post-Entwuerfe in der aban-Stimme (pragmatisch, direkt, anti-hype,
  du-Form). Nur Standardbibliothek, keine Netzwerk-Aufrufe.
- **Aufruf:**
  - Einzel-Modus: `python3 generate_linkedin_posts.py [ausgabe-datei]`.
    Ohne Argument wird `linkedin/beispiel-ausgabe.txt` verwendet.
  - Wochen-/Batch-Modus: `python3 generate_linkedin_posts.py --woche [ordner]`
    (Aliase: `--batch`, `-w`). Liest alle `*.txt` aus dem Ordner (Standard:
    `linkedin/woche/`), sortiert nach Dateiname.
- **Abhaengigkeiten:** keine (reines Python 3).
- **Output-Dateien:**
  - Einzel-Modus: `linkedin/drafts/post-N-*.txt` (und Ausgabe auf der Konsole).
  - Wochen-Modus: `linkedin/drafts/woche/<dateiname>/post-N-*.txt`.
- **Hinweise:** Nicht Teil des Asset-Build-Workflows — du rufst es bei Bedarf
  manuell auf. Die Entwuerfe sind Startpunkte, nicht Endprodukte.

### generate_launch_manual_pdf.py (Sonderfall)

- **Zweck:** Baut `launch-manual.pdf`, eine druckfertige Offline-Version des
  Launch-Day-Manuals.
- **Aufruf:** `python3 generate_launch_manual_pdf.py`.
- **Abhaengigkeiten:** `pip install reportlab`.
- **Output-Datei:** `~/aban-deploy/downloads/launch-manual.pdf`.
- **Hinweise:** Achtung — dieses Skript schreibt nach `~/aban-deploy/...`, also
  **ausserhalb** des Repos, und nicht in `downloads/` im Repo. Es nutzt eine
  eigene Farbpalette (violett/cyan), nicht den Amber-Brand-Stack. Es ist **nicht**
  Teil des Build-Workflows.

### minify_launch_manual.py (Sonderfall)

- **Zweck:** Verkleinert `launch-manual.html` (entfernt Kommentare und
  ueberfluessigen Whitespace; `<script>`- und `<style>`-Bloecke werden vorher
  ausgeklammert und wieder eingesetzt).
- **Aufruf:** `python3 minify_launch_manual.py`.
- **Abhaengigkeiten:** keine (reines Python 3).
- **Output-Datei:** arbeitet auf `~/aban-deploy/launch-manual.html` (ausserhalb
  des Repos).
- **Hinweise:** Wie das Launch-Manual-PDF ein eigenstaendiger Helfer ausserhalb
  des regulaeren Asset-Flows.

## Automatischer Build (GitHub Action)

Die Datei `.github/workflows/build-assets.yml` regeneriert die Kern-Assets
automatisch.

- **Ausloeser:**
  - Push auf `main`, wenn sich eines dieser Skripte aendert:
    `generate_ebook.py`, `generate_pdfs.py`, `generate_og_images.py`,
    `generate_kdp_cover.py`, `generate_kdp_print.py`.
  - `workflow_dispatch` (manueller Start ueber die Actions-Oberflaeche).
- **Ablauf:**
  1. Checkout und Python 3.12 einrichten.
  2. `pip install reportlab pillow`.
  3. `python3 generate_ebook.py` (PDF + ePub, alle Sprachen).
  4. `python3 generate_pdfs.py` (Lead-Magnets).
  5. `python3 generate_og_images.py` (OG-Bilder).
  6. `python3 generate_kdp_cover.py` (KDP-Cover).
  7. `python3 generate_kdp_print.py` (KDP-Print-Innenteil).
  8. `git add downloads/ og-*.png`, dann committen und pushen — aber nur, wenn
     sich tatsaechlich etwas geaendert hat (`git diff --cached --quiet ||
     git commit ...`). Die Commit-Message enthaelt `[skip ci]`, damit der Push
     keinen erneuten Lauf ausloest.
- **Nicht abgedeckt:** `generate_linkedin_posts.py`, `generate_launch_manual_pdf.py`
  und `minify_launch_manual.py` laufen **nicht** im Workflow. Diese rufst du bei
  Bedarf lokal auf.

Praktisch heisst das: Wenn du nur den Inhalt eines Generators aenderst und nach
`main` pushst, baut die Action die Dateien neu und committet sie zurueck. Du musst
die erzeugten PDFs/Bilder also nicht zwingend selbst committen — aber lokal
ausfuehren und pruefen schadet nie.

## Asset-Inventar

Welche Ausgabedatei stammt aus welchem Skript:

| Ausgabedatei | Ort | Skript |
|--------------|-----|--------|
| `anti-hype-ebook.pdf` / `.epub` (de) | `downloads/` | `generate_ebook.py` |
| `anti-hype-ebook-en.pdf` / `.epub` | `downloads/` | `generate_ebook.py` |
| `anti-hype-ebook-fr.pdf` / `.epub` | `downloads/` | `generate_ebook.py` |
| `anti-hype-ebook-it.pdf` / `.epub` | `downloads/` | `generate_ebook.py` |
| `30-prompts-fuer-solopreneure.pdf` | `downloads/` | `generate_pdfs.py` |
| `anti-hype-glossar.pdf` | `downloads/` | `generate_pdfs.py` |
| `dsgvo-ki-checkliste.pdf` | `downloads/` | `generate_pdfs.py` |
| `ai-tool-stack-2026.pdf` | `downloads/` | `generate_pdfs.py` |
| `cold-email-templates.pdf` | `downloads/` | `generate_pdfs.py` |
| `og-ebook.png` | Repo-Root | `generate_og_images.py` |
| `og-ki-tools.png` | Repo-Root | `generate_og_images.py` |
| `og-chatgpt.png` | Repo-Root | `generate_og_images.py` |
| `kdp-cover-ebook.png` | `downloads/` | `generate_kdp_cover.py` |
| `anti-hype-print-de.pdf` (+ weitere Sprachen) | `downloads/` | `generate_kdp_print.py` |
| `post-N-*.txt` (LinkedIn-Entwuerfe) | `linkedin/drafts/` (bzw. `.../woche/<name>/`) | `generate_linkedin_posts.py` |
| `launch-manual.pdf` | `~/aban-deploy/downloads/` (ausserhalb Repo) | `generate_launch_manual_pdf.py` |

## Voice-Check

Diese Datei und alle Texte folgen der aban-Stimme: du-Form, keine Hype-Woerter,
keine Mehrfach-Ausrufezeichen. Vor dem Commit pruefen:

```bash
python3 tools/brand-voice-linter.py docs/TOOLS.md --strict   # Exit 0 = sauber
```
