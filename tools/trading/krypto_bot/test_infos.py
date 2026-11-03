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

# ── Funding: BitMEX gesperrt (HTTP 403, Fund vom 03.11.2026 am Cockpit des Besitzers: «Info funding_btc: nicht verfügbar (HTTPError)»), OKX erreichbar ──
import time as _zeit  # noqa: E402
import urllib.error as _ue  # noqa: E402
from datetime import datetime as _dt, timezone as _tz  # noqa: E402


def _ms(tag_):
    return int(_dt.fromisoformat(tag_).replace(tzinfo=_tz.utc).timestamp() * 1000)


def _netz(bitmex, okx_tage):
    """Ersatz für infos._hole: BitMEX liefert `bitmex` (Liste von Datensätzen oder eine Ausnahme), OKX die Tage in okx_tage (eine Seite, danach leer)."""
    zaehler = {"okx": 0}

    def hole(url, versuche=3, kopf=None):
        if "bitmex.com" in url:
            if isinstance(bitmex, Exception):
                raise bitmex
            return json.dumps(bitmex)
        if "okx.com" in url:
            zaehler["okx"] += 1
            if zaehler["okx"] > 1 or okx_tage is None:
                if okx_tage is None:
                    raise _ue.URLError("OKX nicht erreichbar")
                return json.dumps({"code": "0", "data": []})
            return json.dumps({"code": "0", "data": [{"fundingTime": str(_ms(t) + 8 * 3600 * 1000 * k), "fundingRate": str(v), "realizedRate": str(v)}
                                                  for t, v in okx_tage.items() for k in (0,)]})
        raise AssertionError(url)
    return hole


_h_alt, _sl_alt = I._hole, _zeit.sleep
_zeit.sleep = lambda s: None
try:
    I._hole = _netz(_ue.HTTPError("https://www.bitmex.com/x", 403, "Forbidden", {}, None), {"2026-11-01": 0.0001, "2026-11-02": 0.00012})
    f1 = I.funding("XBTUSD", "BTC-USDT-SWAP", None)
    pruefe("Funding: BitMEX gesperrt (403), OKX erreichbar → die OKX-Tage kommen an (vorher: leer)", sorted(f1) == ["2026-11-01", "2026-11-02"] and abs(f1["2026-11-02"] - 0.00012) < 1e-12, f1)
    I._hole = _netz(_ue.HTTPError("https://www.bitmex.com/x", 403, "Forbidden", {}, None), {"2026-11-01": 0.0001, "2026-11-02": 0.00012})  # frischer Zähler für die OKX-Seiten
    f2 = I.funding("XBTUSD", "BTC-USDT-SWAP", {"2026-10-30": 0.0002, "2026-11-01": 0.0003})
    pruefe("Funding: BitMEX gesperrt, gespeicherter Stand vorhanden → alter Stand bleibt, nur NEUERE OKX-Tage kommen dazu",
           f2 == {"2026-10-30": 0.0002, "2026-11-01": 0.0003, "2026-11-02": 0.00012}, f2)
    I._hole = _netz(_ue.HTTPError("https://www.bitmex.com/x", 403, "Forbidden", {}, None), None)
    try:
        I.funding("XBTUSD", "BTC-USDT-SWAP", {"2026-10-30": 0.0002})
        beide_aus = False
    except _ue.HTTPError:
        beide_aus = True
    pruefe("Funding: BitMEX UND OKX weg → der BitMEX-Fehler bleibt (reihe() nimmt den gespeicherten Stand, kein falsch frischer Zwischenspeicher)", beide_aus)
    I._hole = _netz(_ue.HTTPError("https://www.bitmex.com/x", 403, "Forbidden", {}, None), {"2026-10-29": 0.0001})
    try:
        I.funding("XBTUSD", "BTC-USDT-SWAP", {"2026-10-30": 0.0002})
        nichts_neu = False
    except _ue.HTTPError:
        nichts_neu = True
    pruefe("Funding: BitMEX gesperrt und OKX bringt keinen NEUEN Tag → Fehler bleibt (nichts wird als frisch ausgegeben)", nichts_neu)
    I._hole = _netz([{"timestamp": "2026-11-01T04:00:00.000Z", "fundingRate": 0.0001}, {"timestamp": "2026-11-01T12:00:00.000Z", "fundingRate": 0.0003}], {"2026-11-02": 0.0005})
    f3 = I.funding("XBTUSD", "BTC-USDT-SWAP", None)
    pruefe("Funding: BitMEX erreichbar → Tagesmittel aus BitMEX, neuere Tage aus OKX (wie bisher)", abs(f3["2026-11-01"] - 0.0002) < 1e-12 and f3["2026-11-02"] == 0.0005, f3)
    _bm_seiten = {"n": 0}
    _okx_nur = _netz(None, {"2026-11-01": 0.0001})

    def _netz_halb(url, versuche=3, kopf=None):
        """BitMEX: erste Seite (500 Sätze) kommt an, die zweite wird gedrosselt (429) — OKX wie gewohnt."""
        if "bitmex.com" in url:
            _bm_seiten["n"] += 1
            if _bm_seiten["n"] == 1:
                return json.dumps([{"timestamp": f"2020-01-{1 + (i // 3) % 28:02d}T00:00:00.000Z", "fundingRate": 0.0001} for i in range(500)])
            raise _ue.HTTPError(url, 429, "Too Many Requests", {}, None)
        return _okx_nur(url)
    I._hole = _netz_halb
    f4 = I.funding("XBTUSD", "BTC-USDT-SWAP", None)
    pruefe("Funding: BitMEX bricht nach der ersten Seite ab (429) → halb geholte Seiten werden verworfen (keine Reihe mit Loch), OKX-Tage bleiben",
           sorted(f4) == ["2026-11-01"] and _bm_seiten["n"] == 2, (sorted(f4)[:3], _bm_seiten))
    with tempfile.TemporaryDirectory() as tmp2:
        alt_daten2 = I.DATEN
        I.DATEN = Path(tmp2)
        try:
            I._hole = _netz(_ue.HTTPError("https://www.bitmex.com/x", 403, "Forbidden", {}, None), {"2026-11-01": 0.0001, "2026-11-02": 0.00012})
            r1 = I.reihe("funding_btc")
            pruefe("reihe(funding_btc): ohne Speicher, BitMEX gesperrt → Werte aus OKX, Zwischenspeicher geschrieben", sorted(r1) == ["2026-11-01", "2026-11-02"] and (Path(tmp2) / "info_funding_btc.json").exists(), r1)
            pruefe("Lagebild-Text nennt jetzt den Funding-Satz", "Funding BTC 0.0120 %" in I.text(I.lagebild(nur_speicher=True), "2026-11-03") or "0.01" in I.text({"funding_btc": {"tag": "2026-11-02", "wert": 0.00012}}, "2026-11-03"))
        finally:
            I.DATEN = alt_daten2
finally:
    I._hole, _zeit.sleep = _h_alt, _sl_alt

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
