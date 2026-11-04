#!/usr/bin/env python3
"""Fixtures für die Übersicht des Cockpits: realistische Zahlen, von Hand nachrechenbar. Schreibt fx/<fall>/{stand,profit,protokoll,fern}.json."""
import copy
import json
import math
import sys
from datetime import date, timedelta
from pathlib import Path

AUS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "fx"
HEUTE = date(2026, 11, 3)


def tage(n, ende):
    return [(ende - timedelta(days=n - 1 - i)).isoformat() for i in range(n)]


def kurve(start, ziel, n, amp, phase=0.0):
    """Glatte, aber unruhige Reihe von start nach ziel (deterministisch)."""
    out = []
    for i in range(n):
        f = i / (n - 1)
        out.append(start + (ziel - start) * f + amp * math.sin(i * 0.37 + phase) + amp * 0.5 * math.sin(i * 0.91 + phase * 2))
    out[-1] = ziel
    return out


def position(symbol, menge, einstieg, mark, hebel, liq):
    gewinn = (mark - einstieg) * menge
    marge = menge * einstieg / hebel
    return {"symbol": symbol, "seite": "LONG", "menge": menge, "einstieg": einstieg, "mark": mark, "gewinn": round(gewinn, 4),
            "gewinn_prozent": gewinn / marge, "kursbewegung": mark / einstieg - 1, "liquidation": liq, "hebel": float(hebel), "wert": round(menge * mark, 2)}


POSITIONEN = [
    position("BTCUSDT", 0.0521, 75100.0, 76677.0, 2, 41180.0),
    position("ETHUSDT", 1.1, 2210.0, 2249.0, 2, 1160.0),
    position("SOLUSDT", 0.66, 151.0, 154.2, 2, 80.5),
    position("LINKUSDT", 7.2, 13.9, 13.4, 2, 7.2),
    position("DOGEUSDT", 280.0, 0.3571, 0.3704, 2, 0.19),
]
OFFEN = round(sum(p["gewinn"] for p in POSITIONEN), 4)
GESAMT = 5122.95
WALLET = round(GESAMT - OFFEN, 2)


def zeitraum(netto, prozent, offen_bekannt=True):
    return {"realisiert": round(netto * 0.2, 4), "funding": -1.8, "gebuehren": -3.1, "offen": round(netto * 0.8, 4) if offen_bekannt else None, "netto": netto,
            "prozent": prozent, "ab": "2026-11-03T00:00", "einzahlungen": 0.0}


def profit_voll(modus="TESTNETZ"):
    kk = [[t, round(v, 4)] for t, v in zip(tage(40, HEUTE), kurve(0, 18.6, 40, 2.0))]
    return {"modus": modus, "wallet": WALLET, "offen": OFFEN, "gesamt": GESAMT,
            "zeitraeume": {"heute": zeitraum(34.2, 0.0067), "7_tage": zeitraum(128.6, 0.0258), "30_tage": zeitraum(176.4, 0.0357, offen_bekannt=False), "gesamt": zeitraum(122.95, 0.0246)},
            "pro_markt": {"BTCUSDT": 82.16}, "positionen": copy.deepcopy(POSITIONEN),
            "tage": [[t, round(math.sin(i) * 6 + 1, 2)] for i, t in enumerate(tage(30, HEUTE))], "kumuliert": kk, "seit": "2026-09-24", "nicht_umgerechnet": []}


def gesundheit_voll():
    return [
        {"name": "Futures-Schlüssel (Pilot)", "ok": True, "text": "gesetzt"},
        {"name": "ETH-Sparplan", "ok": None, "text": "aus (einschalten: setx ETH_SPARPLAN_BETRAG \"50\")"},
        {"name": "Claude (KI-Trader)", "ok": False, "text": "noch keine Einschätzung — letzter Versuch 2026-11-03 02:31 UTC gescheitert: Claude nicht erreichbar: AuthenticationError: 401 invalid x-api-key"},
        {"name": "Handy-Nachrichten", "ok": None, "text": "nicht eingerichtet (optional)"},
        {"name": "Letzter Pilot-Lauf", "ok": True, "text": "Tagesstand 2026-11-02"},
        {"name": "Letzter Lauf mit Aufträgen", "ok": False, "text": "2026-11-03 18:04 UTC — ⚠️ Mindestens ein Auftrag scheiterte — bitte im Konto prüfen. · Grund: SOLUSDT BUY 0.7: HTTP 400: Binance-Code -2019 Margin is insufficient"},
        {"name": "Telegram-Calls mitlesen", "ok": False, "text": "noch nie gelaufen — calls.bat starten"},
        {"name": "Not-Aus", "ok": True, "text": "aus"},
        {"name": "Auto-Handel", "ok": True, "text": "an"},
        {"name": "Täglicher Start (Aufgabenplanung)", "ok": True, "text": "eingerichtet (02:30)"},
        {"name": "Nachkontrolle (Aufgabenplanung)", "ok": False, "text": "fehlt — Knopf «Täglich automatisch einrichten» legt sie mit an"},
        {"name": "Satellit (Testnetz-Zusatz)", "ok": None, "warnung": True, "text": "3 Position(en): SOL, LINK, DOGE · letzter Lauf mit Warnung: ⚠️ Satellit SOL: aufbauen: BUY 0.7 ✗ HTTP 400 -2019"},
        {"name": "Markt-Infos", "ok": True, "text": "vor 5 Std. geladen"},
    ]


def maerkte_voll():
    gemeinsam = {"bremse": None, "trend_tage": 150, "short_erlaubt": True, "max_hebel": 2.0, "risiko": 2.0, "hebel": 2.0, "hebel_roh": 2.0, "stand": "2026-11-02"}
    btc = dict(gemeinsam, markt="BTC", symbol="BTCUSDT", kurs=76677.0, schnitt=70487.69, schwankung=0.32, mvrv={"tag": "2026-11-01", "wert": 1.45},
               detektor={"ok": False, "skill_2j": 0.22, "einbruch_1j": 0.1}, stop_long=72000.0, stop_short=80000.0, stop=72851.8, stop_berechnet=72000.0,
               broker={"stop": 72851.8, "position": 0.0521})
    eth = dict(gemeinsam, markt="ETH", symbol="ETHUSDT", kurs=2249.0, schnitt=2157.18, schwankung=0.36, trend_tage=200, mvrv={"tag": "2026-11-01", "wert": 1.03},
               detektor={"ok": False, "skill_2j": 0.41, "einbruch_1j": 0.2}, stop_long=2100.0, stop_short=2400.0, stop=2120.9, stop_berechnet=2100.0,
               broker={"stop": 2120.9, "position": 1.1})
    return [btc, eth]


def kurse_voll():
    t = tage(90, date(2026, 11, 2))
    btc = [round(v, 2) for v in kurve(68200.0, 76677.0, 90, 1400.0)]
    eth = [round(v, 2) for v in kurve(2420.0, 2249.0, 90, 70.0, 1.3)]
    sb = [round(v, 2) for v in kurve(70100.0, 70487.69, 90, 120.0, 0.4)]
    se = [round(v, 2) for v in kurve(2190.0, 2157.18, 90, 12.0, 0.9)]
    return ({"BTC": [[a, b] for a, b in zip(t, btc)], "ETH": [[a, b] for a, b in zip(t, eth)]},
            {"BTC": [[a, b] for a, b in zip(t, sb)], "ETH": [[a, b] for a, b in zip(t, se)]})


def satellit_voll():
    return {"aus": False, "grund": "", "anteil": 0.2, "echtgeld": False, "hat_schluessel": True, "hinweis": "", "entschieden": "2026-10-29",
            "ziele": [{"symbol": "SOLUSDT", "gewicht": 0.1}, {"symbol": "LINKUSDT", "gewicht": 0.1}, {"symbol": "DOGEUSDT", "gewicht": 0.1}, {"symbol": "ADAUSDT", "gewicht": 0.1}],
            "positionen": [{"symbol": "SOLUSDT", "spot": "SOLUSDT", "menge": 0.66, "stop": 138.4, "seit": "2026-10-30", "stop_anteil": 0.083},
                           {"symbol": "LINKUSDT", "spot": "LINKUSDT", "menge": 7.2, "stop": 12.2, "seit": "2026-10-30", "stop_anteil": 0.1},
                           {"symbol": "DOGEUSDT", "spot": "DOGEUSDT", "menge": 280.0, "stop": 0.3198, "seit": "2026-10-30", "stop_anteil": 0.137}],
            "ausgestoppt": [{"symbol": "ADAUSDT", "tag": "2026-11-01"}], "naechster_tag": "2026-11-05",
            "letzter_lauf": {"zeit": "2026-11-03T02:41:20+00:00", "ok": False, "auftraege": 1, "positionen": 3, "hinweise": ["⚠️ Satellit SOL: aufbauen: BUY 0.7 ✗ HTTP 400 -2019"]}}


LABOR_ZAHLEN = (   # (Markt, k, Handel, Treffer, brutto bp, netto bp, Summe %, Erwartung brutto bp, Erwartung netto bp, Erwartung Handel je Tag) — echte Messung des Labors über 34 Tage (Oktober 2026), auf eine Stelle gerundet
    ("BTC", 2.0, 3795, 0.32, -2.3, -8.9, -336.6, -3.039, -9.565, 119.7), ("BTC", 2.5, 2426, 0.36, -1.4, -8.0, -194.1, -1.600, -8.037, 76.7),
    ("BTC", 3.0, 1536, 0.36, -1.2, -7.8, -119.0, -0.763, -7.192, 49.1), ("BTC", 3.5, 973, 0.36, -1.3, -8.0, -77.8, -0.457, -6.927, 30.5),
    ("ETH", 2.0, 3966, 0.38, -3.0, -9.8, -389.7, -4.502, -11.338, 126.7), ("ETH", 2.5, 2554, 0.41, -1.8, -8.6, -218.7, -2.517, -9.244, 81.9),
    ("ETH", 3.0, 1630, 0.42, -1.0, -7.8, -127.7, -1.286, -8.008, 53.1), ("ETH", 3.5, 992, 0.41, -1.0, -7.9, -78.8, -0.719, -7.485, 34.0))


def scalp_zeilen(mit_handel=True):
    out = []
    for (m, k, n, tr, br, ne, su, eb, en, ej) in LABOR_ZAHLEN:
        z = {"markt": m, "k": k, "n": n if mit_handel else 0, "erw_brutto_bp": eb, "erw_netto_bp": en, "erw_je_tag": ej, "offen": False}
        if mit_handel:
            z.update(treffer=tr, brutto_bp=br, netto_bp=ne, kosten_bp=round(ne - br, 3), summe_pct=su, einbruch_pct=su, dauer_min=12.5, nachgerechnet=0)
        out.append(z)
    return out


def scalp_voll():
    """Scalping-Labor (Papier) wie cockpit.scalp_stand() es liefert: 8 Bücher, Urteil «durchgefallen». Mittlere Kosten je Trade von Hand: Σ(kosten × n) / Σ n = 119980 / 17872 = 6.71 bp."""
    return {"aus": False, "grund": "", "hinweis": "", "gelaufen": True, "zeilen": scalp_zeilen(),
            "urteil": {"urteil": "durchgefallen", "tage": 34.0, "je_stufe": {}, "text": "durchgefallen — wie der Prüfstand es erwarten liess"},
            "letzter_lauf": {"zeit": "2026-11-04T02:30:41+00:00", "kerzen": 1440, "trades": 214, "hinweise": []},
            "letzte_trades": [{"markt": "ETH", "k": 2.0, "t_ein": 1793759400000, "t_aus": 1793759460000, "richtung": 1, "ein": 2249.1, "aus": 2248.8, "art": "T", "netto_bp": -9.2}],
            "daten_ab": 1790812800000, "kosten_bp": 6.71, "ampel": {"ok": True, "text": "Papier, durchgefallen"}}


def scalp_leer():
    return {"aus": False, "grund": "", "hinweis": "", "gelaufen": False, "zeilen": scalp_zeilen(False),
            "urteil": {"urteil": "zu wenig Daten", "tage": 0.0, "je_stufe": {}, "text": "zu wenig Daten"}, "letzter_lauf": None, "letzte_trades": [], "daten_ab": None,
            "kosten_bp": None, "ampel": {"ok": None, "text": "noch kein Lauf (Papier)"}}


def auftraege_voll():
    z = lambda s: s  # noqa: E731
    return [
        {"zeit": z("2026-11-03T18:04:15+00:00"), "symbol": "SOLUSDT", "modus": "testnetz", "trocken": False, "seite": "BUY", "menge": 0.7, "nur_verkleinern": False,
         "status": "HTTP 400: /fapi/v1/order: Binance-Code -2019 Margin is insufficient", "fehler": True},
        {"zeit": z("2026-11-03T18:04:13+00:00"), "symbol": "ETHUSDT", "modus": "testnetz", "trocken": False, "seite": "BUY", "menge": 0.435, "nur_verkleinern": False, "status": "FILLED", "fehler": False},
        {"zeit": z("2026-11-03T18:04:12+00:00"), "symbol": "BTCUSDT", "modus": "testnetz", "trocken": False, "seite": "BUY", "menge": 0.0128, "nur_verkleinern": False, "status": "FILLED", "fehler": False},
        {"zeit": z("2026-11-02T02:41:09+00:00"), "symbol": "LINKUSDT", "modus": "testnetz", "trocken": False, "seite": "BUY", "menge": 7.2, "nur_verkleinern": False, "status": "FILLED", "fehler": False},
        {"zeit": z("2026-11-01T02:40:55+00:00"), "symbol": "ADAUSDT", "modus": "testnetz", "trocken": False, "seite": "SELL", "menge": 410.0, "nur_verkleinern": True, "status": "FILLED", "fehler": False},
        {"zeit": z("2026-10-30T02:40:02+00:00"), "symbol": "BTCUSDT", "modus": "testnetz", "hinweis": "Kurs 71234 liegt schon unter dem Stop 72000.00 — heute kein Long."},
    ]


def lage_voll():
    return {"angst_gier": {"tag": "2026-11-02", "wert": 37.0}, "funding_btc": {"tag": "2026-11-02", "wert": 0.0001}, "funding_eth": {"tag": "2026-11-02", "wert": 0.00008},
            "mvrv_btc": {"tag": "2026-11-01", "wert": 1.42}, "mvrv_eth": {"tag": "2026-11-01", "wert": 1.02}, "vix": {"tag": "2026-11-02", "wert": 21.1}, "zins10": {"tag": "2026-11-02", "wert": 4.94}}


def stand_voll(modus="TESTNETZ"):
    ks = kurve(5000.0, GESAMT, 41, 18.0)
    kurse, schnitt = kurse_voll()
    return {"zeit": "2026-11-03T22:43:00+00:00", "modus": modus, "modus_spot": modus, "gesundheit": gesundheit_voll(), "notaus": False, "pause": False, "maerkte": maerkte_voll(),
            "konto": {"wert": GESAMT, "seit_start": 0.0246, "seit_woche": 0.0258, "unter_hoch": -0.012, "start_tag": "2026-09-24", "modus": modus.lower()},
            "kontostand": [[a, round(b, 2)] for a, b in zip(tage(41, HEUTE), ks)], "auftraege": auftraege_voll(), "lage": lage_voll(),
            "ki": {"letzter": None, "vergleich": {}, "kosten": 0.0}, "sammler": None, "backtest": None, "risiko": {"stufe": 2.0, "test": {}, "anteil": 0.8},
            "telegram": False, "calls": None, "programm": {"geladen": "2026-11-03.7524d36", "auf_platte": "2026-11-03.7524d36"},
            "satellit": satellit_voll(), "scalp": scalp_voll(), "kurse": kurse, "kurse_schnitt": schnitt}


def fall_voll():
    return stand_voll(), profit_voll()


def fall_leer():
    s = stand_voll()
    p = profit_voll()
    p["positionen"], p["gesamt"], p["offen"], p["wallet"] = [], 5000.0, 0.0, 5000.0
    for n in p["zeitraeume"].values():
        n.update(netto=0.0, prozent=0.0, offen=0.0)
    s["konto"].update(wert=5000.0, seit_start=0.0, seit_woche=0.0, unter_hoch=0.0)
    s["kontostand"] = [[t, 5000.0] for t in tage(5, HEUTE)]
    s["maerkte"] = [dict(m, hebel=0.0, hebel_roh=0.0, stop=None, stop_berechnet=None, broker=None) for m in maerkte_voll()]
    s["auftraege"] = []
    s["satellit"].update(entschieden=None, ziele=[], positionen=[], ausgestoppt=[], letzter_lauf=None)
    s["scalp"] = scalp_leer()
    s["gesundheit"] = [g for g in gesundheit_voll() if g["ok"] is not False][:6] + [{"name": "Nachkontrolle (Aufgabenplanung)", "ok": True, "text": "eingerichtet"}]
    return s, p


def fall_echtgeld():
    s, p = stand_voll("ECHTGELD"), profit_voll("ECHTGELD")
    s["satellit"]["echtgeld"] = True  # wie im Server: derselbe Umgebungsschalter → der Satellit ist mit Echtgeld aus
    return s, p


def fall_gross():
    """Lange Zahlen (Millionenkonto) — nichts darf überlaufen."""
    s, p = fall_voll()
    p["gesamt"] = 1234567.89
    p["wallet"] = 1200000.12
    p["offen"] = 34567.77
    for k, v in zip(("heute", "7_tage", "30_tage", "gesamt"), (12345.67, 45678.9, 123456.78, 1234567.89)):
        p["zeitraeume"][k].update(netto=v, prozent=0.0123)
    p["positionen"][0].update(gewinn=123456.78, wert=12345678.9, menge=160.1234)
    s["konto"].update(wert=1234567.89)
    s["kontostand"] = [[a, b * 240] for a, b in s["kontostand"]]
    s["scalp"]["zeilen"][0].update(n=12345678, summe_pct=-1234567.8)   # Millionen Handel: nichts darf überlaufen
    return s, p


def fall_daten_fehlen():
    s = stand_voll()
    s.update(konto=None, kontostand=[], maerkte=[], auftraege=[], lage={}, satellit=None, scalp=None, kurse={}, kurse_schnitt={}, risiko={"stufe": 1.0, "test": {}, "anteil": 0.5})
    s["gesundheit"] = [{"name": "Futures-Schlüssel (Pilot)", "ok": False, "text": "fehlt — ohne Schlüssel nur Probeläufe"}]
    return s, {"hinweis": "Profit nicht lesbar: URLError"}


def fall_xss():
    s, p = fall_voll()
    boese = "<img src=x onerror=window.__xss=1>"
    s["gesundheit"][0].update(name="Name " + boese, text="Text " + boese)
    s["auftraege"][0].update(symbol="SOL" + boese, status="Grund " + boese)
    s["auftraege"][5].update(hinweis="Hinweis " + boese)
    s["maerkte"][0].update(markt="BTC" + boese, bremse="Bremse " + boese)
    s["satellit"].update(hinweis="Buch " + boese, grund="Grund " + boese)
    s["satellit"]["ziele"][0]["symbol"] = "A" + boese + "USDT"
    s["satellit"]["ausgestoppt"][0]["symbol"] = "B" + boese + "USDT"
    s["lage"]["angst_gier"]["tag"] = "2026-11-02" + boese
    s["scalp"].update(aus=True, grund="Grund " + boese, hinweis="Labor " + boese)
    s["scalp"]["zeilen"][0]["markt"] = "BTC" + boese
    s["scalp"]["letzter_lauf"]["zeit"] = "2026-11-04T02:30:41+00:00" + boese
    p["positionen"][0]["symbol"] = "BTC" + boese + "USDT"
    return s, p


FERN_SCHLUESSEL = "FAKEkeyFAKEkeyFAKEkeyFAKEkey1234"       # erfunden, 32 Zeichen: sieht aus wie ein Schlüssel, öffnet nichts


def fern(fall):
    """Antwort von GET /api/fern (Karte «Handy-Ansicht» am PC): voll = an mit zwei Adressen und fünf Ereignissen, leer = aus, daten_fehlen = Modul fehlt, xss = Schadtext überall."""
    if fall == "daten_fehlen":
        return {"verfuegbar": False}
    aus = {"verfuegbar": True, "an": False, "laeuft": False, "port": 8766, "gesperrt_durch_umgebung": False, "fehler": "", "adressen": [], "erzeugt": "", "geraete": [], "ereignisse": []}
    if fall == "leer":
        return aus
    adr = [{"art": "Heimnetz (WLAN/LAN)", "tailscale": False, "anzeige": "http://192.168.1.23:8766/", "url": "http://192.168.1.23:8766/?k=" + FERN_SCHLUESSEL},
           {"art": "Tailscale (von unterwegs)", "tailscale": True, "anzeige": "http://100.101.102.103:8766/", "url": "http://100.101.102.103:8766/?k=" + FERN_SCHLUESSEL}]
    ev = [{"zeit": "2026-11-04T09:05:11+00:00", "art": "fremde-quelle", "quelle": "203.0.113.9", "info": "", "n": 12}, {"zeit": "2026-11-04T09:01:40+00:00", "art": "methode", "quelle": "192.168.1.77", "info": "POST"},
          {"zeit": "2026-11-04T08:59:02+00:00", "art": "gesperrt", "quelle": "192.168.1.77", "info": ""}, {"zeit": "2026-11-04T08:58:30+00:00", "art": "falscher-schluessel", "quelle": "192.168.1.77", "info": ""},
          {"zeit": "2026-11-04T08:40:00+00:00", "art": "angemeldet", "quelle": "192.168.1.40", "info": ""}]
    an = dict(aus, an=True, laeuft=True, adressen=adr, erzeugt="2026-11-04T08:30:00+00:00", geraete=[{"quelle": "192.168.1.40", "vor_s": 185}, {"quelle": "100.101.102.50", "vor_s": 7200}], ereignisse=ev)
    if fall == "xss":
        boese = "<img src=x onerror=window.__xss=1>"
        an["adressen"][0].update(art="Heimnetz" + boese, url='http://192.168.1.23:8766/?k="' + boese)
        an["geraete"][0]["quelle"] = "192.168.1.40" + boese
        an["ereignisse"][0].update(art="böse-art" + boese, quelle="Q" + boese, info="I" + boese)
        an["fehler"] = "Port belegt" + boese
    return an


FAELLE = {"voll": fall_voll, "leer": fall_leer, "echtgeld": fall_echtgeld, "daten_fehlen": fall_daten_fehlen, "xss": fall_xss, "gross": fall_gross}

if __name__ == "__main__":
    for name, f in FAELLE.items():
        s, p = f()
        ordner = AUS / name
        ordner.mkdir(parents=True, exist_ok=True)
        (ordner / "stand.json").write_text(json.dumps(s, ensure_ascii=False), encoding="utf-8")
        (ordner / "profit.json").write_text(json.dumps(p, ensure_ascii=False), encoding="utf-8")
        (ordner / "protokoll.json").write_text(json.dumps({"protokoll": [], "laufend": []}), encoding="utf-8")
        (ordner / "fern.json").write_text(json.dumps(fern(name), ensure_ascii=False), encoding="utf-8")
    print("Fixtures:", ", ".join(FAELLE), "→", AUS)
    print("offen =", OFFEN, "wallet =", WALLET, "gesamt =", GESAMT, "wert gesamt =", round(sum(p['wert'] for p in POSITIONEN), 2))
