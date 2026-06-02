# Produkt-Imperium — Ratgeber-Fabrik (`produkt-imperium/`)

Pipeline, die aus einem Thema einen **KDP-tauglichen Sachbuch-Ratgeber** macht:
Gliederung → Kapitel für Kapitel, im Aban-Voice (anti-hype, du-Form). Ergänzt den
bestehenden Buch-Stack (`generate_ebook.py`, `generate_kdp_print.py`, `ki-schriftsteller/`),
fokussiert aber auf **Sach-Ratgeber für die DACH-KI-Zielgruppe** statt Belletristik.

## Status: läuft, sobald der Key da ist

- **Mit `ANTHROPIC_API_KEY`:** schreibt komplette Kapitel (Modell `claude-opus-4-8`,
  gecachter Aban-Voice-System-Präfix).
- **Ohne Key:** Trockenlauf — schreibt nur die Gliederung als Gerüst. Kein Hard-Fail.

```bash
cd produkt-imperium
python3 generate_guide.py                      # Backlog anzeigen
python3 generate_guide.py <thema-id> --dry     # nur Gliederung (ohne API)
export ANTHROPIC_API_KEY=sk-...                 # Key setzen (nie ins Repo!)
python3 generate_guide.py <thema-id>           # vollen Ratgeber bauen
```

Output landet in `ausgabe/` (**git-ignored**). Braucht `pip install anthropic`.

## Markenversprechen (hart eingebaut)

- Die KI liefert **Entwürfe**, keine fertige Wahrheit. Jeder Entwurf trägt den Marker
  `[Redaktion: prüfen]`.
- **Keine erfundenen Zahlen, Studien, Zitate oder Quellen** als Fakt — wo ein Beleg nötig
  wäre, setzt die KI den Platzhalter `[Redaktion: prüfen]`. Ein Mensch verifiziert vor
  der Veröffentlichung.
- Anti-Hype-Sperrliste ist im System-Präfix verankert (revolutionär, game-changer, 10x …).

## Ablauf bis zum verkauften Buch

1. Thema aus `themen-backlog.json` wählen (oder neues ergänzen).
2. `generate_guide.py <id>` → Entwurf in `ausgabe/<slug>.md`.
3. **Fakten prüfen:** alle `[Redaktion: prüfen]`-Stellen verifizieren/füllen.
4. KDP-Layout bauen (analog `generate_kdp_print.py`) und auf Amazon KDP veröffentlichen
   (Anleitung: `docs/KDP-VEROEFFENTLICHEN.md`).
5. `status` im Backlog auf `veroeffentlicht` setzen.

## Dateien

- `generate_guide.py` — die Fabrik (stdlib + optional `anthropic`).
- `themen-backlog.json` — kuratierte, echte Ratgeber-Themen mit `status`.
- `ausgabe/` — generierte Entwürfe (git-ignored).
