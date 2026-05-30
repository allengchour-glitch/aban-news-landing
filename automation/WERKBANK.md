# 🛠️ Aban News — Werkbank

Verbindet das **Newsletter-Projekt** mit dem **Aban-Netzwerk** (KI-Tools-/Förder-/Jobs-Radar).
Ein Tool für drei Aufgaben — erzeugt nur **Entwürfe**, Versand bleibt bei dir (beehiiv).

## Befehle

```bash
# 1) Ausgaben-Entwurf aus echten Netzwerk-Daten erzeugen (Tool + Förderung + Jobs)
python automation/werkbank.py issue
#   -> schreibt automation/entwurf-JJJJ-MM-TT.md (gitignored) + zeigt Voice-Score

# 2) Brand-Voice-Check für jeden Text (Score 0-10 + Hype-Phrasen + Korrekturtipps)
python automation/werkbank.py check automation/entwurf-2026-05-30.md

# 3) Social-Posts aus einem Ausgaben-Entwurf ableiten (für social/posts.json)
python automation/werkbank.py social automation/entwurf-2026-05-30.md
```

## Workflow (so kombinierst du alles)
1. **`issue`** → fertiger Ausgaben-Entwurf, zieht automatisch das bestbewertete Tool, einen
   Förder-Tipp und aktuelle Jobs aus den Radars. Verlinkt zurück auf radar./foerder./jobs.abannews.com.
2. **Prüfen & kürzen** (du, menschlich) — der Entwurf ist eine Vorlage, kein Endprodukt.
3. **`check`** → bestätigt Brand-Voice (kein Hype). Ziel: Score ≥ 7, keine Hype-Phrasen.
4. **In beehiiv einfügen & versenden** (du).
5. **`social`** → 3 Social-Posts aus der Ausgabe → in `social/posts.json` einfügen → Auto-Posting (Mo/Mi/Fr).

## Prinzipien
- **Keine erfundenen Fakten** — nur vorhandene, kuratierte Daten (`data/tools.json`,
  `foerder-radar/foerderungen.json`, `jobs-radar/jobs.json`).
- **Brand-Voice eingebaut** — Forbidden-Phrasen gespiegelt aus `brand-voice-validator-api.py`.
- **Mensch entscheidet** — die Werkbank liefert Entwürfe, du hast die redaktionelle Verantwortung.
- Pure stdlib, keine Abhängigkeiten.

So schließt sich der Kreis: **Radar-Daten → Newsletter-Ausgabe → Social-Posts → zurück zu den Radars.**
Ein zusammenhängendes Aban-Netzwerk statt vier getrennter Projekte.

## KI-News-Aggregator (Rohmaterial)
`python automation/news_aggregator.py` sammelt aktuelle KI-News aus 7 seriösen RSS-Feeds (OpenAI, Google AI, Hugging Face, TechCrunch, VentureBeat, MIT Tech Review, heise) und legt sie als kuratierbare Checkliste `news-roh-<Datum>.md` ab. **Erfindet nichts** — verlinkt echte Quellen. Du wählst 3–5 Meldungen, prüfst sie an der Quelle und schreibst sie in deiner Stimme.
