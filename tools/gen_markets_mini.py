#!/usr/bin/env python3
"""Erzeugt data/markets-mini.json — nur was die Startseiten-Vorschau braucht.

Die Startseite lud fuer 8 Kurszeilen + 3 News die kompletten 136 kB
markets.json. Dieses Skript zieht die Vorschau-Haeppchen heraus (~2 kB).
Laeuft in build-pages.sh vor dem Deploy; die Startseite faellt auf die
volle Datei zurueck, falls die Mini fehlt.
"""
import json, pathlib
p = pathlib.Path(__file__).resolve().parent.parent / "data"
d = json.load(open(p / "markets.json"))
assets = d.get("assets", [])
def schlank(a):
    return {k: a.get(k) for k in ("id", "name", "symbol", "type", "price", "change_24h")}
mini = {
    "last_updated": d.get("last_updated"),
    "fx": d.get("fx", {"usd": 1}),
    "assets": ([schlank(a) for a in assets if a.get("type") == "crypto"][:4]
               + [schlank(a) for a in assets if a.get("type") in ("stock", "etf")][:4]),
    "news": [{k: n.get(k) for k in ("url", "title", "source")} for n in d.get("news", [])[:3]],
}
out = p / "markets-mini.json"
out.write_text(json.dumps(mini, ensure_ascii=False, separators=(",", ":")))
print("markets-mini.json:", out.stat().st_size, "Bytes")
