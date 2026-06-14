# 🧠 BRAIN v2 — die selbstlernende Social-Schleife von LuxeStyle

Ein „Gehirn", das **mit jedem Lauf nur besser wird** und über Sessions hinweg dazulernt.
Kern-Idee: nicht den letzten Report blind übernehmen, sondern **alle** Daten kumulativ ins Gedächtnis
schreiben und mit einer **Ratsche** gegen Rückschritt versehen.

## v2-Intelligenz (Maximum)
1. **Bayes-Shrinkage** beim Hashtag-Ranking — kleine Stichproben werden zum Gesamtmittel gezogen (Konfidenz
   hoch/mittel/niedrig wird mitgeführt); für die TAGSETS zusätzlich Robustheits-Schwelle (≥3 Nutzungen),
   damit kein Einmal-Tag eines einzigen viralen Videos die Sätze verzerrt.
2. **Hook-Typ-Lernen** — jeder Video-Hook wird klassifiziert (Mundart / Preis-Vergleich / Neugier / Frage-CTA /
   Preis / generisch) und nach Ø-Views gerankt → die CAPS werden automatisch nach gewinnendem Typ sortiert,
   und „bester Hook-Typ" landet als Aktion in BRAIN.md. (Aktuell datenbelegt: **Mundart > Preis-Vergleich**.)
3. **KPI-Verlauf** — pro Report ein Snapshot (Views/Likes/Shares/Engagement/Dauer) → Trend mit ▲▼-Pfeilen,
   inkl. Warnung „Views steigen, aber Shares nicht = hohle Reichweite".
4. **Momentum** — letzter Report vs. kumulativ je Tag → steigende Tags (×-Faktor) werden erkannt.
5. **Konfidenz-Labels** auf allen Tag-Empfehlungen.

## Der Zyklus
```
bash automation/brain/auto.sh         # 🤖 AUTO-MODUS: analysieren → lernen → Autopost-Queue → Aktionen (alles)
node automation/brain/brain.mjs       # nur lernen + Pools/Aktionen ableiten (no-op-safe, idempotent)
node automation/brain/build_queue.mjs # nur Autopost-Queue aus gelernten Captions neu bauen
node automation/brain/brain.mjs --dry # nur Vorschau, nichts schreiben
```
`auto.sh` ist der Standard: ein Befehl macht alles und gibt am Ende die nächsten Aktionen + den
Follower-Wachstums-Befehl (PC-Claude) + die rein manuellen Hebel (Pixel/Kampagne) aus.

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

## Auto-Modus-Bausteine
- `auto.sh` — der Orchestrator (analysieren → lernen → Queue → Aktionen + Follower/Manuell-Hebel).
- `build_queue.mjs` — füllt die Cloudflare-Autopost-Queue (`…/luxe-poster/src/queue.json`) aus sauberen
  Produkten (`automation/good_products.csv`) mit echten Preisen + gelernten Discovery-Hashtags + Gewinner-Hooks
  + Share/Save-Triggern. Danach Worker `deploy.sh` (Cursor ggf. zurücksetzen) → postet autonom 2×/Tag in CH-Primetime.
- `pools.json` — maschinenlesbare Pools (TAGSETS/CAPS), die das Gehirn für andere Tools ausgibt.

## Einbindung
- `automation/learn_from_analytics.mjs` ist nur noch ein **Shim**, der hierher delegiert (Altpfade bleiben gültig).
- In jeder Dropship/Social-Session: `bash automation/brain/auto.sh` → BRAIN.md lesen → rote/gelbe Aktionen abarbeiten.
- **Follower-Wachstum** (`automation/local/ch-follower-growth.mjs`, `ch-unfollow.mjs`) braucht Browser/CDP →
  läuft nur am immer-laufenden PC-Claude, nicht in der Cloud. auto.sh gibt den Befehl als Erinnerung aus.
