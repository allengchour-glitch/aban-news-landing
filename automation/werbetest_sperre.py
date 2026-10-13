#!/usr/bin/env python3
"""werbetest_sperre.py — Produkte im laufenden Werbetest nicht anfassen (13.10.2026).

ANLASS: Werbetest A «geschenke-test» (Betreiber «A ja», 13.10.) bewirbt 13 Produkte über ihre Artikel-IDs. Jeder
Schreibvorgang an einem Produkt ist ein neuer Zug um das Werbe-Kontingent im Merchant Center (Sirène/Aurora 12.10.:
«Over capacity for Shopping ads [CH]» nach Änderungen) und verfälscht den Vergleich. Gemessen 13.10.: 11 der 13 wurden
in 30 h geschrieben, 95 % der 933 Geschenk-Produkte in 7 Tagen. Ein zentraler Riegel im GraphQL-Helfer reicht nicht
(nur 28 von 142 Schreibern nutzen ihn) → jeder betroffene Schreiber fragt diese Datei selbst.

DATEI dropship/_werbetest_sperre.txt:
    # ende: 2026-10-24            ← Pflicht. Ohne gültiges Ende gilt NICHTS (eine Sperre ohne Ende würde ewig blockieren)
    15453601890689  silberarmband-614500   # Silberarmband
Erste Spalte = Produkt-ID (Ziffern oder gid://shopify/Product/…), zweite Spalte optional der Handle, «#» = Kommentar.
Optional je Zeile «bis:JJJJ-MM-TT» (früheres Ende für ein einzelnes Produkt). Nach dem Ende (UTC-Datum) wird die Zeile
ignoriert — kein Aufräumen nötig.

    from werbetest_sperre import gesperrt
    if gesperrt(pid_oder_handle): print("übersprungen (Werbetest-Sperre)"); continue

Gegenstück für Node: automation/lib/werbetest_sperre.mjs (gleiche Regeln, gleicher Selbsttest).
    python3 automation/werbetest_sperre.py              aktive Sperre anzeigen
    python3 automation/werbetest_sperre.py --selbsttest
"""
import datetime as dt
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATEI = os.environ.get("WERBETEST_SPERRE") or os.path.join(REPO, "dropship", "_werbetest_sperre.txt")
HINWEIS = "übersprungen (Werbetest-Sperre)"
_DATUM = re.compile(r"(\d{4}-\d{2}-\d{2})")


def _pid(x):
    """'gid://shopify/Product/123' | '123' | 123 → '123'; sonst None."""
    m = re.fullmatch(r"(?:gid://shopify/Product/)?(\d{6,})", str(x or "").strip())
    return m.group(1) if m else None


def lesen(text, heute=None):
    """Text der Sperrdatei → (ids:set, handles:set, ende:date|None). Abgelaufen oder ohne Ende → leere Mengen."""
    heute = heute or dt.datetime.now(dt.timezone.utc).date()
    ende, zeilen = None, []
    for roh in (text or "").splitlines():
        z = roh.strip()
        if not z:
            continue
        if z.startswith("#"):
            m = re.match(r"#\s*ende\s*:\s*(\d{4}-\d{2}-\d{2})", z, re.I)
            if m:
                try:
                    ende = dt.date.fromisoformat(m.group(1))
                except ValueError:
                    ende = None
            continue
        zeilen.append(z.split("#", 1)[0].split())
    ids, handles = set(), set()
    if not ende or heute > ende:
        return ids, handles, ende
    for teile in zeilen:
        if not teile:
            continue
        bis = next((t[4:] for t in teile if t.lower().startswith("bis:")), None)
        if bis:
            try:
                if heute > dt.date.fromisoformat(bis):
                    continue
            except ValueError:
                pass
        p = _pid(teile[0])
        if not p:
            continue
        ids.add(p)
        for t in teile[1:]:
            if not t.lower().startswith("bis:"):
                handles.add(t.lower())
    return ids, handles, ende


_CACHE = {}


def laden(datei=None, heute=None):
    datei = datei or DATEI
    try:
        text = open(datei, encoding="utf-8").read()
    except OSError:
        return set(), set(), None
    schluessel = (datei, os.path.getmtime(datei), heute)
    if schluessel not in _CACHE:
        _CACHE.clear()
        _CACHE[schluessel] = lesen(text, heute)
    return _CACHE[schluessel]


def gesperrt(x, datei=None, heute=None):
    """True, wenn Produkt-ID/GID oder Handle in einer gültigen Werbetest-Sperre steht."""
    ids, handles, _ = laden(datei, heute)
    if not ids:
        return False
    p = _pid(x)
    if p:
        return p in ids
    return str(x or "").strip().lower() in handles


def gesperrte_ids(datei=None, heute=None):
    return set(laden(datei, heute)[0])


def selbsttest():
    t = """# Werbetest A
# ende: 2026-10-24
15453601890689  silberarmband-614500   # Silberarmband
gid://shopify/Product/15454414111105 luminous-sonne-mond-stern-herren-mechanische-u-602700
15412915110273 abendkleid-sirene bis:2026-10-15
kein-id-zeile
"""
    d = dt.date
    ids, handles, ende = lesen(t, d(2026, 10, 14))
    faelle = [
        ("Ende gelesen", ende == d(2026, 10, 24)),
        ("3 IDs aktiv am 14.10.", ids == {"15453601890689", "15454414111105", "15412915110273"}),
        ("Handle-Spalte", "silberarmband-614500" in handles),
        ("Zeile ohne ID ignoriert", "kein-id-zeile" not in handles),
        ("am Endtag noch gültig", len(lesen(t, d(2026, 10, 24))[0]) == 2),
        ("nach Ende leer", lesen(t, d(2026, 10, 25))[0] == set()),
        ("bis: früher abgelaufen", "15412915110273" not in lesen(t, d(2026, 10, 16))[0]),
        ("ohne Ende-Zeile gilt nichts", lesen("15453601890689 x\n", d(2026, 10, 14))[0] == set()),
        ("leere Datei", lesen("", d(2026, 10, 14))[0] == set()),
    ]
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(t)
    try:
        h = d(2026, 10, 14)
        faelle += [
            ("gesperrt: Ziffern", gesperrt("15453601890689", f.name, h)),
            ("gesperrt: GID", gesperrt("gid://shopify/Product/15454414111105", f.name, h)),
            ("gesperrt: Zahl", gesperrt(15453601890689, f.name, h)),
            ("gesperrt: Handle (Gross/klein)", gesperrt("Silberarmband-614500", f.name, h)),
            ("nicht gesperrt: fremde ID", not gesperrt("gid://shopify/Product/15500372771201", f.name, h)),
            ("nicht gesperrt: fremder Handle", not gesperrt("silberarmband", f.name, h)),
            ("nach Ende frei", not gesperrt("15453601890689", f.name, d(2026, 10, 25))),
            ("Datei fehlt → frei", not gesperrt("15453601890689", f.name + ".fehlt", h)),
        ]
    finally:
        os.unlink(f.name)
    fehler = [n for n, ok in faelle if not ok]
    for n, ok in faelle:
        print(("  ok  " if ok else "  FEHLER ") + n)
    print(f"Selbsttest werbetest_sperre: {len(faelle) - len(fehler)}/{len(faelle)}")
    return not fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    ids, handles, ende = laden()
    print(f"Werbetest-Sperre {DATEI}: {len(ids)} Produkte aktiv, Ende {ende or '—'}")
    for i in sorted(ids):
        print("  ", i)
