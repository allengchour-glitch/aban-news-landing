---
tags: [falle, html, generatoren, teuer-gelernt]
quelle: CLAUDE.md
gelernt: 2026-09-02
---
# Generator-Vorlagen mitziehen, sonst ist die Änderung nach dem nächsten Lauf zurück

Beim Entfernen des Assistenten gab es **drei** Einbau-Orte, nicht einen: die HTML-Seiten,
`automation/inject_assistant.py` und **sieben Generator-Vorlagen** (`build_markets_detail`,
`generate_sichtbarkeit_branchen` ×2, `_compliance_pakete`, `_schnellstart`, `_ki_audit`,
`_angebote`, `_dossiers`). Wer nur die Seiten bereinigt, hat ihn nach dem nächsten Generatorlauf
wieder.

## Die Vorlagenkette

`angebote-suche.html` **ist die Vorlage** für alle `*-angebote.html`.
`automation/gen_angebote_pages.mjs` kopiert sie und ersetzt nur Kopf, Hero und Query.
Rasteränderungen also **dort zuerst**.

## Zwei Nebenwirkungen

- Generatoren arbeiten mit **Ankern**. `gen_angebote_pages.mjs` war seit dem Floskel-Aufräumen
  kaputt, weil die Anker `desc` und `ogtitle` nicht mehr zur Vorlage passten und er abbrach.
  Nach Textänderungen an einer Vorlage: Generator einmal laufen lassen.
- Ein Generator-**Neubau zieht Vorlageninhalte nach** (etwa ein BreadcrumbList-JSON-LD, das die
  Kategorieseiten vorher nicht hatten). Wenn der Diff minimal bleiben soll: chirurgisch in den
  fertigen Seiten **und** in der Vorlage ersetzen, aber nicht neu generieren.

Verwandt: [[Diff-Falle]] · [[abannews]]
