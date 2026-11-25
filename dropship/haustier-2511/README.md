# Haustierwelt verbessern (Betreiber 25.11.2026 «kannst du die seite für haustiere noch besser machen»)

Seite `/collections/sub-haustier` («Haustierwelt», 3'848 Produkte, Smart-Regel `kat-haustier`, Sortierung MANUAL).
Tore: `dropship/tore/haustierwelt.md` → 5/5 erfüllt (25.11. ~22:30 UTC).

- **Vorher:** oben 6 ähnliche Brustgeschirre/Leinen, kein Winter, keine Weihnacht; Text ohne «nach Rabatt».
- **Jetzt:** erste 24 = Winter & Weihnachten (Weihnachtspullover, Hundemäntel, Betten, Heizmatte, Adventskalender für Katzen,
  Kratzbaum), aus Kontaktbögen ausgewählt (≥ 3 Bilder, Bild ≥ 700 px, ab CHF 17, kaufbar). Sicherung der alten Reihenfolge
  (erste 60) + Text: `haustierwelt-vorher.json`. Text: Winter-Einleitung, 11 Schnellwahl-Links, «ab CHF 50 nach Rabatt», TWINT/Klarna.
  ⚠️ Saisontext + Reihenfolge im Januar zurück auf ganzjährig.
- **Fremdkörper (Ursache behoben):** 6 Neuimporte vom 25.11. (4 Damen-/Unisex-Jacken, Weihnachtsbaumstumpf, Geschenkbeutel) waren
  «Haustierbedarf» — Suchauftrag «dog winter coat» / «cat tree small» im CJ-Suchimport, Relevanz-Tor liess 2 von 3 Wörtern ohne
  Tierwort durch. `cj_sku_import.mjs`: Zielgruppe (Tier/Kinder) ist jetzt Pflicht, 8 neue Kanarien, Gegenprobe 24/28 rot ohne Regel.
  Produkte umkategorisiert (Typ, Kategorie, Google-Kategorie, Tags), Sicherung `fremdkoerper-vorher.json`.
- **Gesehen, NICHT geändert (Betreiber-Entscheid/eigene Runde):** «Hundemantel Entencamouflage» trägt auf dem Bild ein rundes
  Fremdmarken-Logo am Ärmel; «Katzenkorb mit Höhenanpassung» zeigt einen Trinkbrunnen; «PP Zügel mit weichem Kissen» ist Pferdezubehör;
  144 ältere aktive Produkte ohne Tierwort im Titel (Stichprobe nötig). Alle Top-Produkte zeigen «5 von 5 · 8 Bewertungen»
  (CJ-Import, Entscheid 20./21.10.).
