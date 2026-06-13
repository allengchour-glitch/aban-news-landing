# 🧠 BRAIN — die selbstlernende Social-Schleife von LuxeStyle

Ein „Gehirn", das **mit jedem Lauf nur besser wird** und über Sessions hinweg dazulernt.
Kern-Idee: nicht den letzten Report blind übernehmen, sondern **alle** Daten kumulativ ins Gedächtnis
schreiben und mit einer **Ratsche** gegen Rückschritt versehen.

## Der Zyklus
```
node automation/brain/brain.mjs       # lernen + Pools/Aktionen ableiten (no-op-safe, idempotent)
bash automation/brain/run.sh          # frische TikTok-Daten ziehen + lernen (ganzer Zyklus)
node automation/brain/brain.mjs --dry # nur Vorschau, nichts schreiben
```

## Wieso es „nur besser" wird (Ratsche)
1. **Kumulatives Gedächtnis** (`knowledge.json` → `signals.hashtags`): jeder Report wird **einmal**
   (idempotent über `reports_ingested`) eingerechnet. Mehr Daten = robustere Ø-Views, kein Snapshot-Rauschen.
2. **Konfidenz-Schwelle:** Tags brauchen ≥3 Nutzungen, um in die Daten-Top zu kommen → keine One-Hit-Wonder
   (z.B. die 8 Aesthetik-Tags eines einzigen viralen Videos) verzerren die Pools.
3. **Blocklist (`rules.blocked_hashtags`):** bewiesene Sackgassen (z.B. Marken-Tag `#luxestyle`) erscheinen
   **nie** im Output — einmal als Verlierer erkannt, bleibt geblockt.
4. **Kuratierte Gewinner (`curated_discovery`, `winner_hooks`):** bleiben immer erhalten; Daten reihen/ergänzen
   nur, können sie aber nicht löschen.
5. **Append-only Entscheidungs-Log (`decisions`):** jede Änderung mit Beleg → nachvollziehbar, kein stilles Zurückdrehen.

## Output
- `automation/learned_pools.sh` — `TAGSETS` (1 Reach + 2 Discovery + 2 Daten-Top) + `CAPS` (Gewinner-Hooks).
  Wird von `auto_render.sh` / dem Caption-System gesourct → künftige Reels/Posts nutzen automatisch das Gelernte.
- `automation/brain/BRAIN.md` — Live-Dashboard: beste Hashtags, letzter Stand, **automatisch abgeleitete
  nächste Aktionen** (z.B. „0 Shares → Share-Trigger", „keine CH-Primetime → Zeit verschieben").

## So lernt das Gehirn Neues dazu
- **Daten:** neue `reports/tiktok_*.json` (von `tools/tiktok_analyze.py`) → einfach `brain.mjs` laufen lassen.
- **Lehren/Regeln:** in `knowledge.json` unter `rules` pflegen (Gewinner-Hooks, Discovery-Tags, Blocklist,
  Format-Prioritäten). NICHT `learned_pools.sh` direkt editieren — das überschreibt das Gehirn.

## Einbindung
- `automation/learn_from_analytics.mjs` ist nur noch ein **Shim**, der hierher delegiert (Altpfade bleiben gültig).
- In jeder Dropship/Social-Session: `bash automation/brain/run.sh` → BRAIN.md lesen → die roten/gelben Aktionen abarbeiten.
