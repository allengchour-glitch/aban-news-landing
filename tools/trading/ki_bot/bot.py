#!/usr/bin/env python3
"""KI-Bot-Trader — läuft automatisch, lernt jeden Tag, führt ehrlich Buch.

Modi
  python3 tools/trading/ki_bot/bot.py --backtest      # ehrliche Messung: Bot gegen Halten, gegen
                                                      # „Halten + Risiko", gegen Komitee ohne Lernen,
                                                      # Zeit-Verschiebungs-Test, Gegenproben
                                                      # → reports/KI-BOT.md + data/ki-bot-backtest.json
  python3 tools/trading/ki_bot/bot.py --pruefen       # Selbsttest (Gegenproben); Fehler → Exit 1
  python3 tools/trading/ki_bot/bot.py --lauf          # täglicher Lauf: gestern abrechnen, heute
                                                      # entscheiden → data/ki-bot.json (nur anhängen)
  python3 tools/trading/ki_bot/bot.py --lauf --broker alpaca [--trocken]
                                                      # zusätzlich Aufträge an Alpaca (Standard:
                                                      # Papierkonto). Echtes Geld nur mit doppelter
                                                      # Freigabe, siehe broker_alpaca.py.

Das Logbuch ist absichtlich nicht nachträglich änderbar: Jede Entscheidung wird mit dem Schlusskurs
des Entscheidungstags gespeichert und erst mit späteren Kursen abgerechnet. Ein Rückblick lässt sich
schönrechnen, eine laufende Buchführung nicht.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
import kern as K  # noqa: E402
from lern_bot import MAERKTE, kurse  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "ki-bot.json"
BACKTEST_JSON = ROOT / "data" / "ki-bot-backtest.json"
BERICHT = ROOT / "reports" / "KI-BOT.md"
START = 10000.0


def renditen(p):
    return [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]


def lade(sym, offline):
    reihe = kurse(sym, offline)
    d = [x[0] for x in reihe]
    p = [float(x[1]) for x in reihe]
    return d, p


def zufallsmarkt(n, vol=0.18, rendite=0.07, seed=1):
    rnd = random.Random(seed)
    mu, sd = math.log(1 + rendite) / 252, vol / math.sqrt(252)
    p = [100.0]
    for _ in range(n - 1):
        p.append(p[-1] * math.exp(mu - sd * sd / 2 + sd * rnd.gauss(0, 1)))
    d, t = [], datetime(2000, 1, 3)
    while len(d) < n:  # echte Werktags-Daten (Saison- und Monatswechsel-Experten brauchen echte Monate)
        if t.weekday() < 5:
            d.append(t.date().isoformat())
        t += timedelta(days=1)
    return d, p


def wahrsager(r):
    """Gegenprobe: ein Experte, der den nächsten Tag kennt. Der Gewichter MUSS ihm folgen lernen."""
    return [1 if i + 1 < len(r) and r[i + 1] > 0 else 0 for i in range(len(r))]


# ───────────── Backtest ─────────────
def bewerte(p, d, kosten=K.KOSTEN):
    r = renditen(p)
    n = len(p)
    a = K.PARAMETER["aufwaermen"]
    teil = a + int((n - a) * 0.6)  # letzte 40 % separat (Robustheit über die Zeit)
    var = {
        "KI-Bot": K.simuliere(p, d, r, kosten),
        "Halten + Risiko": K.simuliere(p, d, r, kosten, mit_logit=False, nur_experten=["Halten"]),
        "Komitee ohne Lernen": K.simuliere(p, d, r, kosten, mit_lernen=False),
        "KI ohne Risiko": K.simuliere(p, d, r, kosten, mit_risiko=False),
    }
    erg = {"von": d[a], "bis": d[-1], "jahre": round((n - a) / 252, 1), "varianten": {}}
    halten_q = [1.0] * n
    for name, q in [("Halten", halten_q)] + [(k, v["quote"]) for k, v in var.items()]:
        ganz = K.kennzahlen(K.tagesrenditen(q, r, a, n, kosten))
        spaet = K.kennzahlen(K.tagesrenditen(q, r, teil, n, kosten))
        wechsel = sum(abs(q[i] - q[i - 1]) for i in range(a + 1, n)) / ((n - a) / 252)
        erg["varianten"][name] = {"ganz": rund(ganz), "letzte_40": rund(spaet), "umschichtung_jahr": round(wechsel, 2),
                                  "quote_schnitt": round(sum(q[a:]) / (n - a), 3)}
    erg["skill_ki"] = K.skill_verschiebung(var["KI-Bot"]["quote"], r, a, n, kosten)
    erg["skill_halten_risiko"] = K.skill_verschiebung(var["Halten + Risiko"]["quote"], r, a, n, kosten)
    g = var["KI-Bot"]["gewichte_letzt"]
    erg["gewichte_heute"] = sorted(([k, round(v, 3)] for k, v in g.items()), key=lambda x: -x[1])[:5]
    return erg


def rund(k):
    return {a: round(b, 4) for a, b in k.items()}


def gegenproben():
    """1) Wahrsager im Komitee → Skill fast 100 %. 2) Zufallsmarkt → kein Können (Skill nicht extrem)."""
    d, p = zufallsmarkt(3000, seed=7)
    r = renditen(p)
    a = K.PARAMETER["aufwaermen"]
    mit = K.simuliere(p, d, r, extra_experten={"Wahrsager": wahrsager(r)})
    s1 = K.skill_verschiebung(mit["quote"], r, a, len(p))
    gw = mit["gewichte_letzt"].get("Wahrsager", 0)
    ohne = K.simuliere(p, d, r)
    s2 = K.skill_verschiebung(ohne["quote"], r, a, len(p))
    return {"wahrsager_skill": s1, "wahrsager_gewicht": round(gw, 3), "zufallsmarkt_skill": s2}


def portfolio(reihen, quoten, ab, kosten=K.KOSTEN, risiko_gewichtet=True):
    """Mehrere Märkte in EINEM Depot. Gemeinsamer Kalender = Vereinigung aller Handelstage ab `ab`;
    fehlende Kurse werden fortgeschrieben (Rendite 0). Gewichte monatlich neu: risiko-gewichtet = 1/Schwankung
    (EWMA, nur Vergangenheit), sonst gleich verteilt. Je Markt zählt die eigene Quote (0..1) des Vortags.
    Kein Hebel: Summe der Gewichte = 1, investiert ist Gewicht × Quote."""
    tage = sorted({t for d, _p in reihen.values() for t in d if t >= ab})
    idx = {m: {t: i for i, t in enumerate(d)} for m, (d, _p) in reihen.items()}
    letzt = {m: None for m in reihen}
    var = {m: None for m in reihen}
    gew = {m: 0.0 for m in reihen}
    out, monat = [], None
    vorher_q = {m: 0.0 for m in reihen}
    for t in tage:
        tag_r = 0.0
        neu_monat = t[:7] != monat
        for m, (d, p) in reihen.items():
            i = idx[m].get(t)
            if i is None or i == 0:
                continue
            r = p[i] / p[i - 1] - 1
            var[m] = r * r if var[m] is None else 0.94 * var[m] + 0.06 * r * r
            tag_r += gew[m] * vorher_q[m] * r
            letzt[m] = i
        kost = 0.0
        if neu_monat:
            monat = t[:7]
            bereit = [m for m in reihen if letzt[m] is not None and letzt[m] >= 260 and var[m]]
            if bereit:
                roh = {m: (1 / math.sqrt(var[m]) if risiko_gewichtet else 1.0) for m in bereit}
                s = sum(roh.values())
                neu = {m: (roh[m] / s if m in roh else 0.0) for m in reihen}
                kost = kosten * sum(abs(neu[m] - gew[m]) for m in reihen)
                gew = neu
        for m in reihen:
            if letzt[m] is not None:
                q_neu = quoten[m][letzt[m]]
                kost += kosten * gew[m] * abs(q_neu - vorher_q[m])
                vorher_q[m] = q_neu
        out.append(tag_r - kost)
    return tage, out


def portfolio_vergleich(offline):
    reihen, sims = {}, {}
    for sym, name in MAERKTE.items():
        try:
            d, p = lade(sym, offline)
        except Exception:  # noqa: BLE001
            continue
        r = renditen(p)
        reihen[name] = (d, p)
        sims[name] = {
            "Halten": [1.0] * len(p),
            "Komitee ohne Lernen": K.simuliere(p, d, r, mit_lernen=False)["quote"],
            "KI-Bot": K.simuliere(p, d, r)["quote"],
            "Trendfilter 200": [1.0 if s is not None and p[i] > s else 0.0 for i, s in enumerate(K.sma(p, 200))],
        }
    erg = {}
    for fenster, ab, ohne in (("2015–heute, 8 Märkte", "2015-01-01", []), ("2004–heute, 7 Märkte ohne Bitcoin", "2004-01-01", ["Bitcoin"])):
        rh = {m: v for m, v in reihen.items() if m not in ohne}
        zeile = {}
        for name, rg, q in (("V1 Gleich verteilt halten", False, "Halten"), ("V2 Risiko-gewichtet halten", True, "Halten"),
                            ("V3 Risiko-gewichtet + Komitee ohne Lernen", True, "Komitee ohne Lernen"),
                            ("V4 Risiko-gewichtet + KI-Bot", True, "KI-Bot"), ("V5 Risiko-gewichtet + Trendfilter 200", True, "Trendfilter 200")):
            tage, x = portfolio(rh, {m: sims[m][q] for m in rh}, ab, risiko_gewichtet=rg)
            x, tage = x[260:], tage[260:]  # erstes Jahr: Gewichte bauen sich auf
            k = K.kennzahlen(x)
            # Tage pro Jahr aus dem gemeinsamen Kalender (mit Bitcoin auch Wochenenden, Feiertage je Börse verschieden)
            span = (datetime.fromisoformat(tage[-1]) - datetime.fromisoformat(tage[0])).days / 365.25
            proj = len(tage) / span
            w = k["endwert"]
            jahre = len(x) / proj
            zeile[name] = {"cagr": round(w ** (1 / jahre) - 1, 4), "vol": round(k["vol"] * math.sqrt(proj / 252), 4),
                           "sharpe": round(k["sharpe"] * math.sqrt(proj / 252), 3), "einbruch": round(k["einbruch"], 4)}
        erg[fenster] = zeile
    return erg


def backtest(offline):
    alle = {}
    for sym, name in MAERKTE.items():
        try:
            d, p = lade(sym, offline)
        except Exception as e:  # noqa: BLE001
            print(f"⚠️  {name}: Kurse nicht verfügbar ({e})")
            continue
        print(f"… {name}: {len(p)} Tage")
        alle[name] = bewerte(p, d)
    gp = gegenproben()
    pf = portfolio_vergleich(offline)
    # Empfindlichkeit (nur zeigen, nicht auswählen): Ø Sharpe des Bots über alle Märkte
    empf = []
    for eta in (5.0, 10.0, 20.0):
        for verg in (0.99, 0.995, 0.999):
            sh = []
            for sym, name in MAERKTE.items():
                if name not in alle:
                    continue
                d, p = lade(sym, True)
                r = renditen(p)
                q = K.simuliere(p, d, r, par={"eta": eta, "vergessen": verg})["quote"]
                sh.append(K.kennzahlen(K.tagesrenditen(q, r, K.PARAMETER["aufwaermen"], len(p)))["sharpe"])
            empf.append({"eta": eta, "vergessen": verg, "sharpe_schnitt": round(sum(sh) / len(sh), 3) if sh else None})
    out = {"stand": datetime.now(timezone.utc).date().isoformat(), "kosten": K.KOSTEN, "parameter": K.PARAMETER,
           "maerkte": alle, "portfolio": pf, "gegenproben": gp, "empfindlichkeit": empf}
    BACKTEST_JSON.parent.mkdir(exist_ok=True)
    BACKTEST_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    BERICHT.parent.mkdir(exist_ok=True)
    BERICHT.write_text(bericht(out), encoding="utf-8")
    print(f"→ {BACKTEST_JSON.relative_to(ROOT)} + {BERICHT.relative_to(ROOT)}")
    return out


def pct(x, d=1):
    return f"{x * 100:+.{d}f} %" if x is not None else "–"


def bericht(o):
    L = [f"# KI-Bot-Trader — ehrlicher Backtest (Stand {o['stand']})", "",
         "Bot = Komitee aus 18 Experten (9 Stile, 6 Indikator-Regeln, Halten, Cash, lernender Online-Logit),",
         "gewichtet von einem lernenden Gewichter (Hedge), mit Volatilitäts-Ziel 15 %, Verlust-Bremse und Umschicht-Band.",
         f"Kosten {o['kosten'] * 100:.1f} % pro voller Umschichtung, Signal am Schlusskurs, wirksam ab dem Folgetag, kein Hebel.",
         "Parameter vorab festgelegt, nicht optimiert.", "",
         "| Markt | Halten | Halten + Risiko | Komitee ohne Lernen | **KI-Bot** | KI ohne Risiko | Skill KI-Bot | Skill Halten+Risiko |",
         "|---|---|---|---|---|---|---:|---:|"]
    for name, m in o["maerkte"].items():
        v = m["varianten"]
        z = lambda k: f"{pct(v[k]['ganz']['cagr'])} / {pct(v[k]['ganz']['einbruch'], 0)} / {v[k]['ganz']['sharpe']:.2f}"
        L.append(f"| {name} ({m['von'][:4]}–) | {z('Halten')} | {z('Halten + Risiko')} | {z('Komitee ohne Lernen')} | **{z('KI-Bot')}** | {z('KI ohne Risiko')} | "
                 f"{(m['skill_ki'] or 0) * 100:.0f} % | {(m['skill_halten_risiko'] or 0) * 100:.0f} % |")
    L += ["", "Zellen: Rendite pro Jahr / schlimmster Einbruch / Sharpe. Skill = Anteil zeitverschobener Kopien derselben Quote mit",
          "schlechterer Sharpe (50 % = Timing nicht besser als Zufall).", "",
          "## Portfolio: alle Märkte in einem Depot (Varianten vorab festgelegt, einmal gemessen)", ""]
    for fenster, zeilen in o.get("portfolio", {}).items():
        L += [f"**{fenster}**", "", "| Variante | Rendite/Jahr | Schwankung | Sharpe | schlimmster Einbruch |", "|---|---:|---:|---:|---:|"]
        for name, k in zeilen.items():
            L.append(f"| {name} | {pct(k['cagr'])} | {k['vol'] * 100:.1f} % | {k['sharpe']:.2f} | {pct(k['einbruch'], 0)} |")
        L.append("")
    L += ["## Gegenproben", "",
          f"- Wahrsager im Komitee: Skill {o['gegenproben']['wahrsager_skill'] * 100:.0f} %, Gewicht am Ende {o['gegenproben']['wahrsager_gewicht'] * 100:.0f} % (muss gegen 100 % gehen).",
          f"- Zufallsmarkt ohne Muster: Skill {o['gegenproben']['zufallsmarkt_skill'] * 100:.0f} % (sollte nicht extrem sein).", "",
          "## Empfindlichkeit (nur Anzeige, keine Auswahl)", "", "| eta | Vergessen | Ø Sharpe |", "|---|---|---|"]
    for e in o["empfindlichkeit"]:
        L.append(f"| {e['eta']} | {e['vergessen']} | {e['sharpe_schnitt']} |")
    return "\n".join(L) + "\n"


# ───────────── Täglicher Lauf mit Logbuch ─────────────
STRATEGIEN = {
    # Name: (Gewichtung über die Märkte, Quote je Markt)
    "KI-Bot": ("risiko", "ki"),
    "Ausgleich": ("gleich", "halten"),
    "Trendfilter 200": ("risiko", "trend200"),
}


def lies_logbuch():
    if LOGBUCH.exists():
        return json.loads(LOGBUCH.read_text(encoding="utf-8"))
    return {"version": 2, "start": None, "kosten": K.KOSTEN, "parameter": K.PARAMETER, "signale": {}, "strategien": {}}


def signale_heute(offline):
    """Je Markt: letzter Schlusskurs, KI-Quote mit Begründung, Trendfilter, Schwankung (EWMA). Nur Vergangenheit."""
    out = {}
    for sym, name in MAERKTE.items():
        try:
            d, p = lade(sym, offline)
        except Exception as e:  # noqa: BLE001
            print(f"⚠️  {name}: keine Kurse ({e}) — übersprungen")
            continue
        if len(p) < 300:
            continue
        r = renditen(p)
        sim = K.simuliere(p, d, r)
        i = len(p) - 1
        gewichte, p_auf, vol, bremse = sim["erklaerung"][i]
        var = None
        for x in r[1:]:
            var = x * x if var is None else 0.94 * var + 0.06 * x * x
        s200 = K.sma(p, 200)[i]
        out[name] = {"datum": d[i], "kurs": p[i], "ki": round(sim["quote"][i], 4), "trend200": 1.0 if p[i] > s200 else 0.0,
                     "halten": 1.0, "vol_jahr": round(math.sqrt(var * 252), 4),
                     "warum": {"top_experten": [[k, round(v, 3)] for k, v in sorted(gewichte.items(), key=lambda kv: -kv[1])[:3]],
                               "p_steigt": round(p_auf, 3) if p_auf is not None else None, "bremse": bremse}}
    return out


def zielgewichte(sig, art):
    namen = list(sig)
    if not namen:
        return {}
    if art == "gleich":
        return {m: 1 / len(namen) for m in namen}
    roh = {m: 1 / sig[m]["vol_jahr"] for m in namen if sig[m]["vol_jahr"] > 0}
    s = sum(roh.values())
    return {m: roh.get(m, 0.0) / s for m in namen}


def lauf(offline, heute=None):
    """Ein Depot je Strategie (Startkapital 10'000), wie ein echtes Konto: Bargeld + Positionen.
    1) Positionen mit den neuen Schlusskursen bewerten (nur wenn es einen neuen Kurs gibt).
    2) Ziel: Gewicht je Markt (monatlich neu) × Quote (täglich), höchstens voll investiert.
    3) Umschichten mit 0.1 % Kosten; Einträge werden nur angehängt, nie geändert."""
    lb = lies_logbuch()
    heute = heute or datetime.now(timezone.utc).date().isoformat()
    lb["start"] = lb["start"] or heute
    sig = signale_heute(offline)
    if not sig:
        print("Keine Kurse — nichts zu tun.")
        return lb
    stand = max(v["datum"] for v in sig.values())
    lb["signale"] = {"stand": stand, "maerkte": sig}
    for name, (gewichtung, quote_art) in STRATEGIEN.items():
        st = lb["strategien"].setdefault(name, {"bargeld": START, "positionen": {}, "gewichte": {}, "monat": None, "eintraege": []})
        if st["eintraege"] and st["eintraege"][-1]["stand"] >= stand:
            print(f"= {name}: kein neuer Schlusskurs seit {st['eintraege'][-1]['stand']}")
            continue
        for m, pos in st["positionen"].items():  # 1) bewerten
            if m in sig and sig[m]["datum"] > pos["datum"]:
                pos["wert"] *= sig[m]["kurs"] / pos["kurs"]
                pos["kurs"], pos["datum"] = sig[m]["kurs"], sig[m]["datum"]
        gesamt = st["bargeld"] + sum(p["wert"] for p in st["positionen"].values())
        neuer_monat = st["monat"] != stand[:7] or not st["gewichte"]
        if neuer_monat:  # 2) Gewichte monatlich neu
            st["gewichte"], st["monat"] = zielgewichte(sig, gewichtung), stand[:7]
        ziel = {m: gesamt * st["gewichte"].get(m, 0.0) * sig[m][quote_art] for m in sig}
        for m in sig:  # Band: nur umschichten bei Monatswechsel, neuer Quote oder > 2 % Abweichung
            alt = st["positionen"].get(m)
            if alt and not neuer_monat and alt.get("quote") == sig[m][quote_art] and abs(ziel[m] - alt["wert"]) <= 0.02 * gesamt:
                ziel[m] = alt["wert"]
        umsatz = sum(abs(ziel[m] - st["positionen"].get(m, {}).get("wert", 0.0)) for m in sig)
        kosten = K.KOSTEN * umsatz  # 3) umschichten
        st["positionen"] = {m: {"wert": ziel[m], "kurs": sig[m]["kurs"], "datum": sig[m]["datum"], "quote": sig[m][quote_art]}
                            for m in sig if ziel[m] > 0}
        st["bargeld"] = gesamt - sum(ziel.values()) - kosten
        depot = st["bargeld"] + sum(p["wert"] for p in st["positionen"].values())
        st["eintraege"].append({"lauf": heute, "stand": stand, "depot": round(depot, 2), "kosten": round(kosten, 2),
                                "positionen": {m: {"gewicht": round(st["gewichte"].get(m, 0.0), 4), "quote": sig[m][quote_art],
                                                   "wert": round(ziel[m], 2)} for m in sig}})
        print(f"+ {name}: Stand {stand} · Depot {depot:,.0f} · investiert {sum(ziel.values()) / depot * 100:.0f} %")
    LOGBUCH.parent.mkdir(exist_ok=True)
    LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return lb


def wochenbericht(lb, heute=None, signale_lb=None, broker=None):
    """Kurzer Stand fürs Handy: Depots gegen Start und gegen die Vorwoche, Gütesiegel, letzter Broker-Lauf."""
    heute = heute or datetime.now(timezone.utc).date().isoformat()
    vor7 = (datetime.fromisoformat(heute) - timedelta(days=7)).date().isoformat()
    def chf(x):
        return f"{x:,.0f}".replace(",", "'")
    z = [f"📊 KI-Bot Wochenbericht {heute} (Spielgeld, Start je {chf(START)})"]
    rangliste = []
    for name, st in lb.get("strategien", {}).items():
        e = st.get("eintraege") or []
        if not e:
            continue
        jetzt = e[-1]["depot"]
        alt = next((x["depot"] for x in reversed(e) if x["stand"] <= vor7), e[0]["depot"])
        invest = sum(p["wert"] for p in st.get("positionen", {}).values()) / jetzt if jetzt else 0.0
        rangliste.append((jetzt, name))
        z.append(f"• {name}: {chf(jetzt)} ({(jetzt / START - 1) * 100:+.1f} % seit Start, {(jetzt / alt - 1) * 100:+.1f} % Woche) · "
                 f"{invest * 100:.0f} % investiert")
    if rangliste:
        z.append(f"Vorne: {max(rangliste)[1]}. Eine Woche sagt wenig — erst nach Monaten vergleichen.")
    if signale_lb and signale_lb.get("pruefungen"):
        mit = [n for n, v in signale_lb["pruefungen"].items() if v["siegel"].get("ok")]
        z.append("Daytrading-Gütesiegel: " + (", ".join(mit) if mit else "kein Markt — der Bot handelt dort bewusst nicht"))
        fertig = [x for x in signale_lb.get("signale", []) if x.get("ergebnis") and x.get("gesendet")]
        if fertig:
            z.append(f"Gesendete Signale abgerechnet: {len(fertig)}, Ø {sum(x['ergebnis']['rendite'] for x in fertig) / len(fertig) * 100:+.2f} % je Trade")
    if broker:
        b = broker[-1]
        z.append(f"Broker zuletzt {b['zeit'][:10]} ({b['modus']}): {len(b.get('auftraege', []))} Aufträge" + (f" · {b['hinweis']}" if b.get("hinweis") else ""))
    z.append("Keine Anlageberatung.")
    return "\n".join(z)


def bericht_senden(lb, erzwingen=False, heute=None):
    """Höchstens einmal pro 7 Tage (oder sofort mit erzwingen); Push über Telegram und/oder ntfy."""
    heute = heute or datetime.now(timezone.utc).date().isoformat()
    zuletzt = lb.get("bericht_gesendet")
    if not erzwingen and zuletzt and (datetime.fromisoformat(heute) - datetime.fromisoformat(zuletzt)).days < 7:
        return False
    import signale as SG
    bp = ROOT / "data" / "ki-bot-broker.json"
    text = wochenbericht(lb, heute, SG.lies() if SG.LOGBUCH.exists() else None,
                         json.loads(bp.read_text(encoding="utf-8")) if bp.exists() else None)
    SG.push(text)
    lb["bericht_gesendet"] = heute
    LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return True


def pruefen():
    gp = gegenproben()
    ok = gp["wahrsager_skill"] is not None and gp["wahrsager_skill"] >= 0.95 and gp["wahrsager_gewicht"] >= 0.5 \
        and gp["zufallsmarkt_skill"] is not None and 0.02 < gp["zufallsmarkt_skill"] < 0.98
    print(("✅" if ok else "❌") + f" Gegenproben: Wahrsager-Skill {gp['wahrsager_skill']:.2f} (Gewicht {gp['wahrsager_gewicht']:.2f}), "
          f"Zufallsmarkt-Skill {gp['zufallsmarkt_skill']:.2f}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backtest", action="store_true")
    ap.add_argument("--pruefen", action="store_true")
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--offline", action="store_true", help="nur zwischengespeicherte Kurse (fehlende werden geholt)")
    ap.add_argument("--broker", choices=["alpaca"])
    ap.add_argument("--trocken", action="store_true", help="Broker: Aufträge nur anzeigen, nichts senden")
    ap.add_argument("--bericht", action="store_true", help="Wochenbericht jetzt anzeigen und aufs Handy schicken")
    a = ap.parse_args()
    if a.bericht:
        lb = lies_logbuch()
        if not lb.get("strategien"):
            print("Noch kein Logbuch — zuerst: bot.py --lauf")
            return 1
        bericht_senden(lb, erzwingen=True)
        return 0
    if a.pruefen:
        return 0 if pruefen() else 1
    if a.backtest:
        backtest(a.offline)
        return 0
    if a.lauf:
        if not pruefen():
            print("Selbsttest fehlgeschlagen — heute wird nichts geschrieben.")
            return 1
        lb = lauf(a.offline)
        rc = 0
        if a.broker == "alpaca":
            import broker_alpaca as B
            rc = B.ausfuehren(lb, trocken=a.trocken)
        bericht_senden(lb)  # einmal pro Woche aufs Handy
        return rc
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
