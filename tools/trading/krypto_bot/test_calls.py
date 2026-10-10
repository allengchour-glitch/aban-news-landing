#!/usr/bin/env python3
"""Tests für Telegram-Calls (Parser, Prüfstand, Leser, Kopierer) — ohne Netz, ohne Telegram, ohne Schlüssel:
python3 tools/trading/krypto_bot/test_calls.py"""
from __future__ import annotations

import hashlib
import hmac
import json
import math
import random
import sys
import tempfile
import threading
import urllib.parse
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from types import SimpleNamespace

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import calls_kopierer as CK  # noqa: E402
import calls_leser as CL  # noqa: E402
import calls_parser as CP  # noqa: E402
import calls_pruefung as CQ  # noqa: E402
import broker_futures as BF  # noqa: E402
import sperre as SP  # noqa: E402
import testumgebung  # noqa: E402

TMP = testumgebung.schalter_umbiegen(CK, BF, SP)

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


# ───────────────────────── Parser ─────────────────────────
P = CP.parse
a = P("""📍Coin : #SOLUSDT
🟢 LONG
👉 Entry: 145.20 - 147.80
🌐 Leverage: 20x
🎯 Target 1: 149.50
🎯 Target 2: 152.00
🎯 Target 3: 156.00
❌ StopLoss: 140.00""")
pruefe("Emoji-Format: Symbol, Richtung, Zone, nummerierte Ziele (Nummer ist kein Preis), Stop, Hebel",
       a and a["symbol"] == "SOLUSDT" and a["richtung"] == "LONG" and a["einstieg"] == [145.2, 147.8] and a["ziele"] == [149.5, 152.0, 156.0]
       and a["stop"] == 140.0 and a["hebel"] == 20 and a["stimmig"], a)
b = P("#ETH/USDT SHORT\nEntry zone: 3450-3500\nTargets: 3400 - 3350 - 3300 - 3200\nStop loss: 3560\nLeverage: Cross 10x")
pruefe("Short: «Entry zone», Ziele mit Bindestrich getrennt (keine Spanne), absteigend", b and b["richtung"] == "SHORT"
       and b["einstieg"] == [3450.0, 3500.0] and b["ziele"] == [3400.0, 3350.0, 3300.0, 3200.0] and b["stop"] == 3560.0 and b["stimmig"], b)
c = P("BUY $PEPE\nBuy zone: 0.00001020 - 0.00001050\nSell: 0.00001100, 0.00001150, 0.00001200\nSL: 0.00000980")
pruefe("Kleinstpreise, «Sell:» = Ziele bei einem Long", c and c["symbol"] == "PEPEUSDT" and c["richtung"] == "LONG"
       and abs(c["ziele"][0] - 0.000011) < 1e-12 and abs(c["stop"] - 0.0000098) < 1e-12, c)
d = P("🚀 Signal: AVAX Long\nEinstieg: 28,40 – 28,90\nZiele: 29,50 / 30,20 / 31,00\nStopp: 27,60\nHebel 5x")
pruefe("Deutsch mit Dezimalkomma", d and d["symbol"] == "AVAXUSDT" and d["einstieg"] == [28.4, 28.9] and d["ziele"] == [29.5, 30.2, 31.0]
       and d["stop"] == 27.6 and d["hebel"] == 5, d)
e = P("Scalp: LONG #BTC at market, TP 65200, SL 63900, 50x")
pruefe("zum Marktpreis: keine Zone", e and e["einstieg"] == [] and e["ziele"] == [65200.0] and e["stop"] == 63900.0 and e["hebel"] == 50, e)
h = P("#LINK/USDT\nLong\nEntry:\n1) 14.20\n2) 13.90\nTargets:\n1) 14.80\n2) 15.40\n3) 16.20\nStop: 13.40")
pruefe("Werte untereinander mit Aufzählung", h and h["einstieg"] == [13.9, 14.2] and h["ziele"] == [14.8, 15.4, 16.2] and h["stop"] == 13.4, h)
i = P("BTCUSDT SHORT Entry 66,500 - 67,100 TP1 65,000 TP2 63,800 SL 68,200 Lev 3x")
pruefe("Tausender-Komma, mehrere Abschnitte in einer Zeile", i and i["einstieg"] == [66500.0, 67100.0] and i["ziele"] == [65000.0, 63800.0]
       and i["stop"] == 68200.0 and i["hebel"] == 3, i)
g = P("1000PEPEUSDT Long Entry 0.0105 TP 0.011 SL 0.0101")
pruefe("Symbol mit Zahl vorne (1000PEPE)", g and g["symbol"] == "1000PEPEUSDT" and g["einstieg"] == [0.0105, 0.0105], g)
pruefe("Erfolgsmeldungen sind keine Calls", P("#SOLUSDT Target 1 ✅ Profit: 45% 📈") is None and P("Closed #ETH in profit 🔥") is None
       and P("SOL TP2 hit 🎯 +120%") is None)
pruefe("Plauderei ist kein Call", P("Guten Morgen! Heute schauen wir auf BTC, der Markt ist bullish 🚀") is None and P("") is None)
pruefe("ohne Ziele UND ohne Stop kein Call", P("LONG #SOLUSDT Entry 145") is None)
w = P("LONG #SOLUSDT Entry 145-148 TP 140 SL 150")
pruefe("widersprüchlicher Call (Long mit Ziel unter dem Einstieg) wird erkannt", w and not w["stimmig"], w)
pruefe("Zahlen: 1.234,5 · 0,00001234 · 1'234 · 28,40", CP.zahl("1.234,5") == 1234.5 and CP.zahl("0,00001234") == 0.00001234
       and CP.zahl("1'234") == 1234.0 and CP.zahl("28,40") == 28.4 and CP.zahl("1,234") == 1234.0)
pruefe("Stopwörter sind keine Coins", CP._symbol(CP._normal("#LONG ENTRY TARGET")) is None)


class FakeClaude:
    def __init__(self, antwort, stop="end_turn"):
        self.antwort, self.stop, self.aufrufe = antwort, stop, []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    def _create(self, **kw):
        self.aufrufe.append(kw)
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=json.dumps(self.antwort))], stop_reason=self.stop,
                               model=kw["model"], usage=SimpleNamespace(input_tokens=400, output_tokens=120))


fc = FakeClaude({"ist_call": True, "symbol": "op/usdt", "richtung": "LONG", "einstieg": [1.52, 1.55], "ziele": [1.6, 1.7], "stop": 1.45, "hebel": 10})
cc, info = CP.parse_mit_claude("Grab OP around 1.52-1.55, aim 1.60 then 1.70, invalid below 1.45", client=fc)
pruefe("Claude-Rückfall: Symbol vereinheitlicht, Schema, Rückfall-Modelle, niedriger Aufwand, Kosten",
       cc and cc["symbol"] == "OPUSDT" and cc["quelle"] == "claude" and cc["stimmig"] and info["kosten_usd"] > 0
       and fc.aufrufe[0]["output_config"]["format"]["type"] == "json_schema" and fc.aufrufe[0]["fallbacks"] == "default"
       and fc.aufrufe[0]["output_config"]["effort"] == "low", (cc, info))
pruefe("Claude: «kein Call» und Ablehnung → None", CP.parse_mit_claude("x", client=FakeClaude({**fc.antwort, "ist_call": False}))[0] is None
       and CP.parse_mit_claude("x", client=FakeClaude(fc.antwort, stop="refusal"))[0] is None)
pruefe("Claude nur mit CALLS_CLAUDE=1", CP.parse_mit_claude("x")[0] is None)

# ───────────────────────── Prüfstand: ein Call ─────────────────────────
T0 = int(datetime(2026, 3, 2, 10, 0, tzinfo=timezone.utc).timestamp() * 1000)
M = CQ.MIN15


def reihe(preise, start=T0 + M):
    """Kerzen aus (o, h, l, c)-Tupeln ab der ersten ganzen Kerze nach T0."""
    return [(start + i * M, *p) for i, p in enumerate(preise)]


long_ = {"symbol": "SOLUSDT", "richtung": "LONG", "einstieg": [], "ziele": [110.0, 120.0], "stop": 95.0, "hebel": 20, "stimmig": True}
r = CQ.simuliere(long_, T0, reihe([(100, 101, 99, 100), (100, 111, 100, 110), (110, 121, 109, 120)]))
erw = 0.5 * 0.10 + 0.5 * 0.20 - 2 * CQ.GEBUEHR - CQ.FUNDING_8H * 0.5 / 8
pruefe("Long zum Markt: zwei Ziele je zur Hälfte, Gebühren und Funding abgezogen", r["status"] == "geschlossen" and r["grund"] == "ziele"
       and abs(r["r"] - erw) < 1e-5 and r["einstieg"] == 100, r)
r = CQ.simuliere(long_, T0, reihe([(100, 101, 99, 100), (100, 111, 94, 100)]))
pruefe("Stop und Ziel in derselben Kerze: der Stop zählt (vorsichtig)", r["grund"] == "stop" and r["r"] < -0.05, r)
r = CQ.simuliere(long_, T0, reihe([(100, 101, 99, 100), (93, 94, 90, 91)]))
pruefe("Lücke über den Stop: Ausstieg zum (schlechteren) Eröffnungskurs mit Schlupf", abs(r["r"] - (0.93 * (1 - CQ.SCHLUPF) - 1 - 2 * CQ.GEBUEHR - CQ.FUNDING_8H * 0.25 / 8)) < 1e-5, r)
zone = {**long_, "einstieg": [90.0, 92.0], "stop": 85.0}
r = CQ.simuliere(zone, T0, reihe([(100, 101, 99, 100)] * 100))
pruefe("Zone in 24 Std. nicht erreicht: nicht ausgelöst", r["status"] == "nicht_ausgeloest", r)
r = CQ.simuliere(zone, T0, reihe([(100, 101, 99, 100), (100, 100, 84, 86)]))
pruefe("Füllung in der Kerze und Stop in derselben Kerze: ausgestoppt (Reihenfolge unbekannt → vorsichtig)", r["grund"] == "stop"
       and r["einstieg"] == 92.0, r)
r = CQ.simuliere({**zone, "stop": 85.0}, T0, reihe([(100, 101, 99, 100), (100, 120, 91, 95), (95, 96, 94, 95)]))
pruefe("Einstieg mitten in der Kerze: Ziele in derselben Kerze zählen nicht (Reihenfolge unbekannt)", r["status"] == "offen", r)
r = CQ.simuliere({**long_, "stop": None}, T0, reihe([(100, 101, 99, 100), (100, 100, 89, 95)]))
pruefe("ohne Stop: 10 % gegen die Position", r["grund"] == "stop" and abs(r["stop"] - 90.0) < 1e-9, r)
r = CQ.simuliere({**long_, "ziele": [200.0]}, T0, reihe([(100, 101, 99, 100)] * (7 * 96 + 5)))
pruefe("nach 7 Tagen geschlossen", r["grund"] == "zeit" and abs(r["stunden"] - 168) < 0.3, r)
short = {"symbol": "SOLUSDT", "richtung": "SHORT", "einstieg": [], "ziele": [90.0], "stop": 105.0, "hebel": None, "stimmig": True}
r = CQ.simuliere(short, T0, reihe([(100, 101, 99, 100), (100, 100, 89, 90)]))
pruefe("Short: verdient am Fall, erhält Funding", r["grund"] == "ziele" and abs(r["r"] - (0.10 - 2 * CQ.GEBUEHR + CQ.FUNDING_8H * 0.25 / 8)) < 1e-5, r)
pruefe("Preise 100× daneben (falsches Symbol/Faktor): unplausibel", CQ.simuliere({**long_, "ziele": [11000.0], "stop": 9500.0}, T0,
                                                                                 reihe([(100, 101, 99, 100)]))["status"] == "unplausibel")
r = CQ.simuliere(long_, T0, reihe([(100, 101, 99, 100), (100, 105, 99, 104)]))
pruefe("Daten enden vorher: offen (für das Schattenkonto)", r["status"] == "offen" and r["r_offen"] > 0, r)
pruefe("Kurs schon unter dem Stop: nicht ausgelöst", CQ.simuliere(long_, T0, reihe([(94, 95, 93, 94)]))["status"] == "nicht_ausgeloest")
k = CQ.konto([{"status": "geschlossen", "r": -0.05, "abstand_stop": 0.05, "t_ende": 1}, {"status": "geschlossen", "r": 0.10, "abstand_stop": 0.001, "t_ende": 2}])
pruefe("Konto: 1 % Risiko je Call, Hebel höchstens 2×", abs(k["summe"] - (-0.01 + 2 * 0.10)) < 1e-9 and abs(k["schlimmster_rueckgang"] + 0.01) < 1e-9, k)

# ───────────────────────── Prüfstand: ganze Gruppe ─────────────────────────
rnd = random.Random(5)
TAGE = 400
preise = [100.0]
for _ in range(TAGE * 96):
    preise.append(preise[-1] * math.exp(rnd.gauss(0, 0.004)))
START = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
call_zeiten = [START + (20 + 9 * n) * CQ.TAG + 37 * M for n in range(40)]
# «Hellseher»: nach jedem Call steigt der Kurs binnen 2 Std. um 4 % und bleibt dort (eingepflanzt) — sonst Zufall
for t in call_zeiten:
    j = (t - START) // M + 2
    for x in range(j, len(preise)):
        preise[x] *= 1.04 ** (min(x - j + 1, 8) / 8)
KS = [(START + i * M, p, p * 1.002, p / 1.002, p) for i, p in enumerate(preise)]


def kerzen_fn(sym, von, bis):
    a_, b_ = max(0, (von - START) // M), min(len(KS), (bis - START) // M + 1)
    return KS[a_:b_]


def nachrichten(zeiten, text):
    return {n: {"id": n, "zeit": datetime.fromtimestamp(t / 1000, timezone.utc).isoformat(), "text": text, "art": "neu"} for n, t in enumerate(zeiten)}


def call_text(t):
    p = kerzen_fn("X", t + 2 * M, t + 3 * M)[0][1]
    return f"LONG #XYZUSDT Entry {p * 0.99:.4f}-{p * 1.01:.4f} TP {p * 1.03:.4f} SL {p * 0.97:.4f}"


gut = {n: {"id": n, "zeit": datetime.fromtimestamp(t / 1000, timezone.utc).isoformat(), "text": call_text(t), "art": "neu"}
       for n, t in enumerate(call_zeiten)}
g_gut = CQ.pruefe_gruppe(gut, kerzen_fn, kopien=60, jetzt_ms=START + TAGE * CQ.TAG)
pruefe("Hellseher-Gruppe (eingepflanzter Vorsprung): kopierwürdig, schlägt die Zufallskopien", g_gut["urteil"] == "kopierwürdig"
       and g_gut["zufallsprobe"] >= 0.9 and g_gut["gesamt"]["n"] >= 30, {k_: g_gut[k_] for k_ in ("urteil", "gruende", "zufallsprobe")})
zufall = random.Random(9)
z_zeiten = [START + (25 + 9 * n) * CQ.TAG + zufall.randint(0, 90) * M for n in range(40)]
schlecht = {n: {"id": n, "zeit": datetime.fromtimestamp(t / 1000, timezone.utc).isoformat(), "text": call_text(t), "art": "neu"}
            for n, t in enumerate(z_zeiten) if not any(abs(t - c) < 2 * CQ.TAG for c in call_zeiten)}
g_z = CQ.pruefe_gruppe(schlecht, kerzen_fn, kopien=60, jetzt_ms=START + TAGE * CQ.TAG)
pruefe("Zufalls-Gruppe: nicht kopieren", g_z["urteil"] == "nicht kopieren" and g_z["gruende"], {k_: g_z[k_] for k_ in ("urteil", "gruende", "zufallsprobe")})
wenig = CQ.pruefe_gruppe(dict(list(gut.items())[:10]), kerzen_fn, kopien=10, jetzt_ms=START + TAGE * CQ.TAG)
pruefe("zu wenige Calls: nicht kopieren, Zufallsprobe gar nicht erst", wenig["urteil"] == "nicht kopieren" and wenig["zufallsprobe"] is None
       and "erst" in wenig["gruende"][0])
pruefe("Text des Prüfstands", "Urteil: KOPIERWÜRDIG" in CQ.text("Hellseher", g_gut) and "Zufallsprobe" in CQ.text("x", g_gut))

with tempfile.TemporaryDirectory() as td:
    f = Path(td) / "g.jsonl"
    zeilen = [{"id": 1, "zeit": "2026-03-02T10:00:00+00:00", "text": "LONG #SOLUSDT Entry 100 TP 110 SL 95", "art": "neu"},
              {"id": 1, "zeit": "2026-03-02T10:00:00+00:00", "text": "LONG #SOLUSDT Entry 100 TP 110 SL 90 ✅ TP hit", "art": "bearbeitet"},
              {"id": 2, "zeit": "2026-03-02T11:00:00+00:00", "text": "SHORT #ADAUSDT Entry 1 TP 0.9 SL 1.1", "art": "neu"},
              {"id": 2, "art": "geloescht", "zeit": "2026-03-03T11:00:00+00:00"},
              {"id": 3, "zeit": "2026-03-02T12:00:00+00:00", "text": "LONG #SOLUSDT Entry 100 TP 110 SL 95", "art": "neu"}]
    f.write_text("\n".join(json.dumps(z) for z in zeilen) + "\nkaputte zeile\n")
    n = CQ.lies_nachrichten(f)
    pruefe("Bearbeitung: Ursprungstext bleibt massgeblich", n[1]["text_original"] == zeilen[0]["text"] and "hit" in n[1]["text"], n[1])
    pruefe("Löschung wird vermerkt, der Call zählt trotzdem", n[2]["geloescht"] and n[2]["text"])
    cs = CQ.calls_aus(n)
    pruefe("Wiederholung binnen 6 Std. zählt einmal, gelöschter Call zählt mit", [c_[2] for c_ in cs] == [1, 2], cs)
    pruefe("nachträglich geänderter Stop (95 → 90) zählt NICHT — gerechnet wird der ursprüngliche Call", cs[0][1]["stop"] == 95.0, cs[0])

# Kerzen holen: Futures zuerst, sonst Spot, «1000PEPE» = PEPE × 1000; nur abgeschlossene Tage im Speicher
geholt = []


def fake_holen(url):
    geholt.append(url)
    if "fapi" in url:
        raise OSError("HTTP 451")
    sym = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["symbol"][0]
    if sym == "PEPEUSDT":
        return [[T0, "0.0000035", "0.0000036", "0.0000034", "0.0000035", "1"]]
    return []


with tempfile.TemporaryDirectory() as td:
    ks = CQ.tag_kerzen("1000PEPEUSDT", T0 // CQ.TAG * CQ.TAG, holen=fake_holen, ordner=td)
    pruefe("1000PEPE: Futures gesperrt → Spot PEPE × 1000", ks and abs(ks[0][1] - 0.0035) < 1e-12 and "fapi" in geholt[0], (ks, geholt))
    n0 = len(geholt)
    CQ.tag_kerzen("1000PEPEUSDT", T0 // CQ.TAG * CQ.TAG, holen=fake_holen, ordner=td)
    pruefe("vergangener Tag aus dem Speicher (kein neuer Abruf)", len(geholt) == n0)
    pruefe("unbekanntes Symbol: leer, kein Absturz", CQ.tag_kerzen("GIBTSNICHTUSDT", T0 // CQ.TAG * CQ.TAG, holen=fake_holen, ordner=td) == [])

# ───────────────────────── Leser (ohne Telegram) ─────────────────────────
pruefe("Gruppen-Kennung: Nummer, Link, @name", CL.gruppen_kennung("-1001234") == -1001234 and CL.gruppen_kennung("https://t.me/calls_vip") == "calls_vip"
       and CL.gruppen_kennung("@Calls") == "Calls" and CL.gruppen_kennung("Meine Gruppe") == "Meine Gruppe")
m = SimpleNamespace(id=42, date=datetime(2026, 3, 2, 10, 0, tzinfo=timezone.utc), message="LONG #SOL", edit_date=None,
                    reply_to=SimpleNamespace(reply_to_msg_id=40), sender_id=999, from_id="geheim")
e = CL.eintrag(m)
pruefe("Eintrag: nur Text, Zeit, IDs — keine Absender-Daten", e == {"id": 42, "zeit": "2026-03-02T10:00:00+00:00", "text": "LONG #SOL",
                                                                   "art": "neu", "antwort_auf": 40}, e)
with tempfile.TemporaryDirectory() as td:
    CL.anhaengen(-100, [e, {**e, "id": 43}], ordner=td)
    CL.anhaengen(-100, [{**e, "art": "bearbeitet", "text": "neu"}], ordner=td)
    hoechste, texte = CL.bekannt(-100, ordner=td)
    pruefe("Nachladen: höchste ID, Ursprungstexte", hoechste == 43 and texte[42] == "LONG #SOL", (hoechste, texte))
pruefe("Einstellungen: Gruppen-Liste", CL.einstellungen({"TELEGRAM_CALL_GRUPPEN": " -1001, @x ,"})["gruppen"] == ["-1001", "@x"])

# ───────────────────────── Kopierer: Freigabe-Regeln ─────────────────────────
basis_bf = {"key": "k", "secret": "s", "url_fehler": "", "echtgeld": False}
rec = {"gruppe": "-1001", "call": {**long_}}
leer = {"calls": []}


def darf(env=None, bf=None, buch=None, pruef=("kopierwürdig", ""), stop=False, pause=False, r=None):
    return CK.darf_kopieren(r or rec, CK.einstellungen(env or {"CALLS_MODUS": "testnetz"}), {**basis_bf, **(bf or {})}, buch or leer,
                            pruefung=pruef, stop=stop, pause=pause)


pruefe("Standard = Schattenkonto, nie Aufträge", not CK.darf_kopieren(rec, CK.einstellungen({}), basis_bf, leer, ("kopierwürdig", ""), False, False)[0])
pruefe("Testnetz: kopiert", darf()[0], darf())
pruefe("Not-Aus / Pause / ohne Schlüssel / falsche Adresse: nicht", not darf(stop=True)[0] and not darf(pause=True)[0]
       and not darf(bf={"key": ""})[0] and not darf(bf={"url_fehler": "x"})[0])
pruefe("Modus passt nicht zu den Schlüsseln: nicht (beide Richtungen)", not darf(bf={"echtgeld": True})[0]
       and not darf(env={"CALLS_MODUS": "echtgeld"})[0])
echt = {"CALLS_MODUS": "echtgeld", "CALLS_ECHTGELD_GRUPPEN": "-1001"}
pruefe("Echtgeld nur mit Freigabe, Gruppe in der Liste UND bestandener Prüfung", darf(env=echt, bf={"echtgeld": True})[0]
       and not darf(env={**echt, "CALLS_ECHTGELD_GRUPPEN": "-999"}, bf={"echtgeld": True})[0]
       and not darf(env=echt, bf={"echtgeld": True}, pruef=("nicht kopieren", "x"))[0]
       and not darf(env=echt, bf={"echtgeld": True}, pruef=(None, "keine Prüfung"))[0])
pruefe("CALLS_NUR_GEPRUEFT=1 sperrt ungeprüfte Gruppen auch im Testnetz", not darf(env={"CALLS_MODUS": "testnetz", "CALLS_NUR_GEPRUEFT": "1"},
                                                                                    pruef=("nicht kopieren", ""))[0])
pruefe("Bitcoin/Ethereum gehören dem Pilot", not darf(r={"gruppe": "-1001", "call": {**long_, "symbol": "BTCUSDT"}})[0])
pruefe("widersprüchlicher Call: nicht", not darf(r={"gruppe": "-1001", "call": {**long_, "stimmig": False}})[0])
voll = {"calls": [{"auftrag": {}, "status": "offen", "call": {"symbol": s}} for s in ("AUSDT", "BUSDT", "CUSDT")]}
pruefe("höchstens 3 offen, je Coin nur einer", not darf(buch=voll)[0]
       and not darf(buch={"calls": [{"auftrag": {}, "status": "wartet", "call": {"symbol": "SOLUSDT"}}]})[0])
R = {"step": 0.01, "min_qty": 0.01, "tick": 0.01, "min_notional": 5.0}
cfg = CK.einstellungen({})
pruefe("Grösse: 1 % Risiko bis zum Stop (100 USDT Verlust am Stop), sonst 1000-USDT-Deckel",
       abs(CK.groesse(CK.einstellungen({"CALLS_MAX_AUFTRAG": "100000"}), 10000, 100, 95, R) - 20.0) < 1e-9
       and abs(CK.groesse(cfg, 10000, 100, 95, R) - 10.0) < 1e-9)
pruefe("Grösse: gedeckelt auf 25 % × 2× und 1000 USDT", abs(CK.groesse(cfg, 10000, 100, 99.9, R) - 10.0) < 1e-9
       and abs(CK.groesse(CK.einstellungen({"CALLS_MAX_AUFTRAG": "100000"}), 10000, 100, 99.9, R) - 50.0) < 1e-9)
pruefe("Grösse: unter Binance-Minimum → 0", CK.groesse(cfg, 30, 100, 95, R) == 0.0)
pruefe("Einstellungen: Komma und Grenzen", CK.einstellungen({"CALLS_RISIKO": "0,5"})["risiko"] == 0.03
       and CK.einstellungen({"CALLS_MODUS": "quatsch"})["modus"] == "schatten")

# ───────────────────────── Kopierer gegen nachgebauten Binance-Server ─────────────────────────
GEHEIM = "calls-geheim"


class Fake(BaseHTTPRequestHandler):
    log, pos, mark, algo, offen, stop_fehler, naechste_id = [], 0.0, "100", [], {}, None, 10

    def _a(self, o, code=200):
        b_ = json.dumps(o).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b_)

    def _route(self, methode):
        pfad, _, q = self.path.partition("?")
        p = dict(urllib.parse.parse_qsl(q))
        roh, _, sig = q.rpartition("&signature=") if "&signature=" in q else (q, "", "")
        Fake.log.append((methode, pfad, p))
        if sig and sig != hmac.new(GEHEIM.encode(), roh.encode(), hashlib.sha256).hexdigest():
            return self._a({"code": -1022, "msg": "Signature"}, 400)
        if pfad == "/fapi/v1/time":
            return self._a({"serverTime": int(datetime.now(timezone.utc).timestamp() * 1000)})
        if pfad == "/fapi/v1/exchangeInfo":
            return self._a({"symbols": [{"symbol": "SOLUSDT", "status": "TRADING", "filters": [
                {"filterType": "PRICE_FILTER", "tickSize": "0.01"}, {"filterType": "LOT_SIZE", "stepSize": "0.01", "minQty": "0.01"},
                {"filterType": "MIN_NOTIONAL", "notional": "5"}]}]})
        if pfad == "/fapi/v2/account":
            return self._a({"totalWalletBalance": "10000", "totalUnrealizedProfit": "0"})
        if pfad == "/fapi/v2/positionRisk":
            return self._a([{"symbol": "SOLUSDT", "positionAmt": str(Fake.pos)}])
        if pfad == "/fapi/v1/premiumIndex":
            return self._a({"markPrice": Fake.mark, "lastFundingRate": "0.0001"})
        if pfad in ("/fapi/v1/marginType", "/fapi/v1/leverage"):
            return self._a({"ok": True})
        if pfad == "/fapi/v1/order" and methode == "POST":
            Fake.naechste_id += 1
            if p["type"] == "MARKET":
                Fake.pos = round(Fake.pos + float(p["quantity"]) * (1 if p["side"] == "BUY" else -1), 6)
                return self._a({"orderId": Fake.naechste_id, "status": "FILLED", "avgPrice": Fake.mark})
            if p["type"] == "LIMIT":
                Fake.offen[Fake.naechste_id] = {**p, "status": "NEW"}
                return self._a({"orderId": Fake.naechste_id, "status": "NEW"})
        if pfad == "/fapi/v1/order" and methode == "GET":
            return self._a({"status": Fake.offen.get(int(p["orderId"]), {}).get("status", "NEW")})
        if pfad == "/fapi/v1/algoOrder":
            if p["type"] == "STOP_MARKET" and Fake.stop_fehler:
                return self._a({"code": -2021, "msg": "Order would immediately trigger."}, 400)
            Fake.algo.append(p)
            return self._a({"algoId": len(Fake.algo)})
        if pfad == "/fapi/v1/algoOpenOrders" and methode == "DELETE":
            Fake.algo = []
            return self._a({"code": 200})
        if pfad == "/fapi/v1/allOpenOrders" and methode == "DELETE":
            Fake.offen = {}
            return self._a({"code": 200})
        return self._a({"code": -1, "msg": "?"}, 404)

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_DELETE(self):
        self._route("DELETE")

    def log_message(self, *a_):
        pass


srv = HTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()
ENV = {"BINANCE_FUTURES_API_KEY": "KEY-C", "BINANCE_FUTURES_API_SECRET": GEHEIM, "BINANCE_FUTURES_URL": f"http://127.0.0.1:{srv.server_port}",
       "CALLS_MODUS": "testnetz"}
JETZT = datetime.now(timezone.utc)
gepusht = []


def nachricht(text, nid, zeit=None):
    return {"id": nid, "zeit": (zeit or JETZT).isoformat(timespec="seconds"), "text": text, "art": "neu"}


def neu(text, nid, env=ENV, zeit=None):
    return CK.neue_nachricht("-1001", "VIP Calls", nachricht(text, nid, zeit), env=env, push=gepusht.append, buch_datei=CK.BUCH)


rec1 = neu("#SOLUSDT LONG Entry 99-101 TP 110/120 SL 95 Leverage 50x", 1)
stops = [x for x in Fake.algo if x["type"] == "STOP_MARKET"]
tps = [x for x in Fake.algo if x["type"] == "TAKE_PROFIT_MARKET"]
lev = [x for x in Fake.log if x[1] == "/fapi/v1/leverage"]
pruefe("Markt-Kopie: Kauf 10 SOL (1000-USDT-Deckel), Hebel 2 statt 50, Stop an der Börse, 2 Teil-Ziele = ganze Menge",
       rec1["status"] == "offen" and Fake.pos == 10.0 and lev and lev[-1][2]["leverage"] == "2" and stops and stops[0]["triggerPrice"] == "95"
       and stops[0]["closePosition"] == "true" and len(tps) == 2 and sum(float(x["quantity"]) for x in tps) == 10.0
       and all(x["reduceOnly"] == "true" for x in tps) and [x["triggerPrice"] for x in tps] == ["110", "120"], (rec1, Fake.algo))
pruefe("Handy: Call erkannt und KOPIERT", gepusht and "VIP Calls" in gepusht[-1] and "KOPIERT" in gepusht[-1], gepusht[-1:])
pruefe("Wiederholung desselben Calls binnen 6 Std.: ignoriert", neu("#SOLUSDT LONG Entry 99-101 TP 110/120 SL 95", 2) is None)
pruefe("Not-Aus kennt die kopierten Symbole", CK.offene_symbole(CK.BUCH) == ["SOLUSDT"])
Fake.pos, Fake.algo = 0.0, Fake.algo  # Börse hat Ziele/Stop ausgeführt
gepusht.clear()
CK.pflegen(env=ENV, kerzen_fn=lambda *a_: [], push=gepusht.append, buch_datei=CK.BUCH)
b1 = CK.lies(CK.BUCH)["calls"][0]
pruefe("Pflege: Position 0 → geschlossen, restliche Algo-Aufträge gelöscht, Meldung", b1["status"] == "geschlossen" and Fake.algo == []
       and any("ist zu" in g_ for g_ in gepusht), (b1["status"], Fake.algo, gepusht))

# Stop abgelehnt → Position sofort zu
Fake.stop_fehler = True
rec2 = neu("#SOLUSDT LONG Entry 99-101 TP 110 SL 95", 3, zeit=JETZT + timedelta(hours=7))
Fake.stop_fehler = None
pruefe("Stop abgelehnt: Position SOFORT geschlossen, laut gemeldet", Fake.pos == 0.0 and rec2["auftrag"].get("fehler")
       and "sofort geschlossen" in rec2["auftrag"]["hinweis"], rec2.get("auftrag"))
CK.pflegen(env=ENV, kerzen_fn=lambda *a_: [], push=gepusht.append, buch_datei=CK.BUCH)

# Limit an der Zone: Kurs über der Zone → GTD-Limit, Stop vorab; nach Füllung setzt die Pflege die Ziele
Fake.algo, Fake.mark = [], "105"
rec3 = neu("#SOLUSDT LONG Entry 99-101 TP 110/120 SL 95", 4, zeit=JETZT + timedelta(hours=14))
lim = [x[2] for x in Fake.log if x[1] == "/fapi/v1/order" and x[2].get("type") == "LIMIT"]
pruefe("Kurs über der Zone: Limit am oberen Rand, verfällt nach 24 Std., Stop schon gesetzt", rec3["status"] == "wartet" and lim
       and lim[-1]["price"] == "101" and lim[-1]["timeInForce"] == "GTD"
       and abs(int(lim[-1]["goodTillDate"]) - (rec3["auftrag"]["zeit_ms"] + 24 * 3600 * 1000)) < 5000
       and [x["type"] for x in Fake.algo] == ["STOP_MARKET"], (rec3, lim[-1:], Fake.algo))
Fake.pos = float(rec3["auftrag"]["menge"])
CK.pflegen(env=ENV, kerzen_fn=lambda *a_: [], push=gepusht.append, buch_datei=CK.BUCH)
b3 = [r_ for r_ in CK.lies(CK.BUCH)["calls"] if r_["id"].endswith(":4")][0]
pruefe("nach der Füllung: Ziele gesetzt, Stop nicht doppelt", b3["status"] == "offen" and [x["type"] for x in Fake.algo].count("STOP_MARKET") == 1
       and [x["type"] for x in Fake.algo].count("TAKE_PROFIT_MARKET") == 2, (b3["status"], Fake.algo))
# 7 Tage später: schliessen
CK.pflegen(env=ENV, kerzen_fn=lambda *a_: [], push=gepusht.append, buch_datei=CK.BUCH, jetzt_ms=int((JETZT + timedelta(days=8)).timestamp() * 1000))
b3 = [r_ for r_ in CK.lies(CK.BUCH)["calls"] if r_["id"].endswith(":4")][0]
pruefe("nach 7 Tagen: Rest zum Markt geschlossen (nur verkleinern), Aufträge weg", b3["status"] == "geschlossen" and Fake.pos == 0.0
       and Fake.algo == [] and any(x[2].get("reduceOnly") == "true" for x in Fake.log[-8:] if x[1] == "/fapi/v1/order"), b3["status"])
# Limit verfällt
Fake.mark = "105"
rec5 = neu("#SOLUSDT LONG Entry 99-101 TP 110 SL 95", 5, zeit=JETZT + timedelta(days=9))
Fake.offen[rec5["auftrag"]["einstieg_id"]]["status"] = "EXPIRED"
CK.pflegen(env=ENV, kerzen_fn=lambda *a_: [], push=gepusht.append, buch_datei=CK.BUCH)
b5 = [r_ for r_ in CK.lies(CK.BUCH)["calls"] if r_["id"].endswith(":5")][0]
pruefe("Limit verfallen: nicht ausgelöst, vorab gesetzter Stop gelöscht", b5["status"] == "nicht_ausgeloest" and Fake.algo == [], (b5["status"], Fake.algo))
# Schattenkonto
rec6 = neu("#SOLUSDT LONG Entry 99-101 TP 110/120 SL 95", 6, env={**ENV, "CALLS_MODUS": "schatten"}, zeit=JETZT + timedelta(days=10))
t6 = rec6["zeit_ms"]
schatten_ks = [(t6 // M * M + M, 100, 101, 99, 100), (t6 // M * M + 2 * M, 100, 121, 100, 120)]
CK.pflegen(env=ENV, kerzen_fn=lambda *a_: schatten_ks, push=gepusht.append, buch_datei=CK.BUCH)
b6 = [r_ for r_ in CK.lies(CK.BUCH)["calls"] if r_["id"].endswith(":6")][0]
pruefe("Schatten: keine Aufträge, Ergebnis mit echten Kursen gerechnet", "auftrag" not in b6 and b6["schatten"]["status"] == "geschlossen"
       and b6["schatten"]["r"] > 0.1, b6)
s = CK.stand(CK.BUCH, CK.PRUEFUNG)
pruefe("Bilanz je Gruppe", s["gruppen"]["-1001"]["calls"] >= 5 and s["gruppen"]["-1001"]["schatten"]["n"] >= 1 and s["letzte"]
       and "VIP Calls" in CK.stand_text(s), s["gruppen"])
pruefe("keine Schlüssel im Buch", GEHEIM not in CK.BUCH.read_text() and "KEY-C" not in CK.BUCH.read_text())

# Not-Aus des Piloten schliesst auch kopierte Calls
import pilot as PI  # noqa: E402
testumgebung.schalter_umbiegen(PI)
CK.schreiben({"calls": [{"id": "x", "gruppe": "-1", "call": {**long_, "symbol": "OPUSDT"}, "status": "offen", "auftrag": {"menge": 1}}]}, CK.BUCH)
aufrufe = []


def zu(e_, symbol, gewicht):
    aufrufe.append(symbol)
    e_["broker"] = {"position": 0.0, "hinweis": ""}
    return []


alles, zeilen = PI.schliessen_alle(zu, heute="2026-03-02")
pruefe("Not-Aus: Pilot-Märkte UND kopierte Calls", aufrufe == ["BTCUSDT", "ETHUSDT", "OPUSDT"] and alles and any("Call OPUSDT" in z for z in zeilen),
       (aufrufe, zeilen))
srv.shutdown()
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
