#!/usr/bin/env python3
"""Tests für die Markt-Infos und die MVRV-Bremse (ohne Netz): python3 tools/trading/krypto_bot/test_infos.py"""
from __future__ import annotations

import json
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import info_pruefung as IP  # noqa: E402
import infos as I  # noqa: E402
import pilot as PI  # noqa: E402
import pilot_kern as K  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def tag(i, start=date(2024, 1, 1)):
    return (start + timedelta(days=i)).isoformat()


# ── keine Zukunftsdaten ──
tage = [tag(i) for i in range(10)]
d = {tag(2): 5.0, tag(5): 7.0}
x = I.auf_tage(d, tage, 1)
pruefe("vor Datenbeginn: None", x[:3] == [None, None, None], x)
pruefe("Wert von Tag 2 erst ab Tag 3 sichtbar", x[3] == 5.0 and x[4] == 5.0, x)
pruefe("Wert von Tag 5 erst ab Tag 6, dann vorwärts gefüllt", x[5] == 5.0 and x[6:] == [7.0] * 4, x)
pruefe("Verzug 2 (Notenbank-Bilanz)", I.auf_tage(d, tage, 2)[4] == 5.0 and I.auf_tage(d, tage, 2)[3] is None)
pruefe("stand(): gleicher Tag zählt nicht", I.stand(d, tag(5), 1) == (tag(2), 5.0) and I.stand(d, tag(6), 1) == (tag(5), 7.0))
pruefe("stand(): ohne Daten (None, None)", I.stand({}, tag(5)) == (None, None))

# ── Rechenhelfer des Prüfstands ──
pruefe("Schnitt startet nach Lücke neu", IP.schnitt([1, 2, None, 3, 5, 7], 2) == [None, 1.5, None, None, 4.0, 6.0], IP.schnitt([1, 2, None, 3, 5, 7], 2))
pruefe("Änderung über n Tage", IP.aenderung([100, 110, 121], 1)[1:] == [0.10000000000000009, 0.10000000000000009] and IP.aenderung([0, 5], 1)[1] is None)
z = [1.0, -1.0, 0.8, -0.5]
pruefe("Filter: Long halbiert, Short auf 0", IP.filter_z(z, [True, True, False, False], [True, True, False, True]) == [0.5, 0.0, 0.8, 0.0])
v = IP.verschoben([0, 0, 1, 0, 0, 1, 1], 2, 1)
pruefe("Verschiebung: Anfang bleibt, gleich viele Bremstage", v[:2] == [0, 0] and sum(v) == 3 and v != [0, 0, 1, 0, 0, 1, 1], v)


# Kausalität der Flaggen: ein Wert vom Tag k darf die Flagge von Tag k nicht ändern, erst die von k+1
def mit_reihen(reihen):
    alt = I.reihe
    I.reihe = lambda name, *a, **k: reihen.get(name, {})
    try:
        return IP.flaggen("btc", tage30)
    finally:
        I.reihe = alt


tage30 = [tag(i) for i in range(30)]
mv = {tag(i): 1.5 for i in range(30)}
f1 = mit_reihen({"mvrv_btc": mv})["mvrv_tief"]
mv2 = dict(mv)
mv2[tag(20)] = 0.5
f2 = mit_reihen({"mvrv_btc": mv2})["mvrv_tief"]
pruefe("Flagge Tag 20 unverändert, Tag 21 reagiert (keine Zukunft)", f1[20] is False and f2[20] is False and f2[21] is True, (f2[19:23]))
pruefe("ohne Daten: keine Flagge (None)", mit_reihen({})["gier"][5] is None)

# ── MVRV-Bremse im Kern und im Piloten ──
pruefe("Bremse: Short bei MVRV 0,9 → 0", K.mvrv_bremse(-0.7, 0.9) == 0.0)
pruefe("Bremse: Long bleibt", K.mvrv_bremse(0.7, 0.5) == 0.7)
pruefe("Bremse: MVRV genau 1 → Short bleibt", K.mvrv_bremse(-0.7, 1.0) == -0.7)
pruefe("Bremse: ohne MVRV → Grundregel", K.mvrv_bremse(-0.7, None) == -0.7)
fallend = [(tag(i, date(2023, 1, 1)), 100 * 0.999 ** i) for i in range(400)]
letzter = fallend[-1][0]
mv_tief = {tag(i, date(2023, 1, 1)): 0.8 for i in range(400)}
from datetime import datetime, timezone  # noqa: E402
jetzt = datetime(2030, 1, 1, tzinfo=timezone.utc)
ohne = PI.entscheid("BTC", env={}, jetzt=jetzt, kurse=fallend, mvrv={})
mit = PI.entscheid("BTC", env={}, jetzt=jetzt, kurse=fallend, mvrv=mv_tief)
pruefe("Pilot ohne MVRV: short", ohne["hebel"] < 0 and ohne["bremse"] is None, ohne["hebel"])
pruefe("Pilot mit MVRV 0,8: flach, Grund im Logbuch", mit["hebel"] == 0 and mit["hebel_roh"] < 0 and "MVRV" in mit["bremse"], mit)
pruefe("Pilot nimmt MVRV vom Vortag", mit["mvrv"]["tag"] == fallend[-2][0], mit["mvrv"])
veraltet = {tag(0, date(2023, 1, 1)): 0.8}
alt = PI.entscheid("BTC", env={}, jetzt=jetzt, kurse=fallend, mvrv=veraltet)
pruefe("veraltetes MVRV (> 5 Tage): keine Bremse, kein Wert", alt["hebel"] < 0 and alt["mvrv"]["wert"] is None, alt["mvrv"])
pruefe("Text nennt die Bremse", "kein Short" in PI.text(mit) and "veraltet" in PI.text(alt))

# ── Zwischenspeicher: Netz weg → alter Stand ──
with tempfile.TemporaryDirectory() as tmp:
    alt_daten, alt_q = I.DATEN, dict(I.QUELLEN)
    I.DATEN = Path(tmp)
    try:
        (Path(tmp) / "info_angst_gier.json").write_text(json.dumps({"2024-01-01": 50.0}))
        I.QUELLEN["angst_gier"] = lambda alt: (_ for _ in ()).throw(OSError("Netz weg"))
        pruefe("Netz-Fehler: gespeicherter Stand", I.reihe("angst_gier", neu=True) == {"2024-01-01": 50.0})
        I.QUELLEN["angst_gier"] = lambda alt: {"2024-01-02": 60.0}
        pruefe("frischer Speicher wird nicht neu geladen", I.reihe("angst_gier") == {"2024-01-01": 50.0})
        pruefe("veralteter Speicher wird neu geladen", I.reihe("angst_gier", max_alter_h=0) == {"2024-01-02": 60.0})
        I.QUELLEN["angst_gier"] = lambda alt: (_ for _ in ()).throw(OSError("Netz weg"))
        (Path(tmp) / "info_angst_gier.json").unlink()
        pruefe("ohne Speicher und ohne Netz: leer statt Absturz", I.reihe("angst_gier") == {})
    finally:
        I.DATEN, I.QUELLEN = alt_daten, alt_q
pruefe("Lagebild markiert alte Werte", "(Stand 2024-01-01)" in I.text({"angst_gier": {"tag": "2024-01-01", "wert": 50}}, "2024-02-01")
       and "(Stand" not in I.text({"angst_gier": {"tag": "2024-01-31", "wert": 50}}, "2024-02-01"))

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
