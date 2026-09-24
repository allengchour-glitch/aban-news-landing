# Workflow-Skripte (Ultracode)

Die Session-Kopien unter `/root/.claude/...` überleben keinen Container-Neustart (24.09.2026 gemessen: Snapshot-Rewind,
Skript weg). Deshalb liegen die wiederverwendbaren Skripte hier.

- `ratgeber-keywordplan-c2.js` — zwei Ratgeber je Runde aus `dropship/KEYWORDPLAN-2026-09.md` (C2): schreiben → adversarial prüfen →
  beheben. Aufruf: `Workflow({scriptPath: "automation/workflows/ratgeber-keywordplan-c2.js", args: {datum, themen:[{key,titel,keywords,
  kollektion,zweitkollektion,gruppe,vorlage}]}})`. Vorlage-Handle = ein bestehender, guter Ratgeber (z. B. kratzbaum-kaufen-groesse-stabilitaet-sisal-ratgeber).
