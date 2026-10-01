#!/usr/bin/env python3
"""Baut das Krankenkassen-Wechsel-Paket aus EINER Engine (und den Engine-Block der Gratis-Seite).

    python3 tools/krankenkasse/build.py
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
engine = (HIER / "engine.js").read_text(encoding="utf-8")
src = (HIER / "krankenkasse.src.html").read_text(encoding="utf-8")
assert src.count("/*ENGINE*/") == 1
ziel = ROOT / "content" / "packs" / "de" / "krankenkasse-wechsel" / "krankenkasse-wechsel.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
ziel.write_text(src.replace("/*ENGINE*/", engine), encoding="utf-8")
print(f"→ {ziel.relative_to(ROOT)}")
seite = ROOT / "krankenkasse-wechseln-schweiz.html"
if seite.exists():
    s = seite.read_text(encoding="utf-8")
    a, e = "/*ENGINE-START*/", "/*ENGINE-END*/"
    assert s.count(a) == 1 and s.count(e) == 1, "Engine-Marken fehlen oder doppelt"
    neu = s[:s.index(a) + len(a)] + "\n" + engine + "\n" + s[s.index(e):]
    if neu != s:
        seite.write_text(neu, encoding="utf-8")
    print(f"→ {seite.relative_to(ROOT)} (Engine-Block)")
vergleich = (HIER / "vergleich.js").read_text(encoding="utf-8")
seite = ROOT / "krankenkassen-vergleich-2027.html"
if seite.exists():
    s = seite.read_text(encoding="utf-8")
    for a, e, inhalt in (("/*ENGINE-START*/", "/*ENGINE-END*/", engine), ("/*VERGLEICH-START*/", "/*VERGLEICH-END*/", vergleich)):
        assert s.count(a) == 1 and s.count(e) == 1, f"Marken {a} fehlen oder doppelt"
        s = s[:s.index(a) + len(a)] + "\n" + inhalt + "\n" + s[s.index(e):]
    if s != seite.read_text(encoding="utf-8"):
        seite.write_text(s, encoding="utf-8")
    print(f"→ {seite.relative_to(ROOT)} (Engine + Vergleich)")
