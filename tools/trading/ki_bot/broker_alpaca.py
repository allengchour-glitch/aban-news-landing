#!/usr/bin/env python3
"""Broker-Anbindung Alpaca (Trading API v2) — standardmässig im PAPIERKONTO.

Sicherungen (alle aktiv, nicht abschaltbar ausser durch die genannten Schalter):
  • Ohne ALPACA_KEY_ID + ALPACA_SECRET_KEY passiert nichts.
  • Papier ist Standard. Echtes Geld NUR, wenn BEIDES gesetzt ist:
        ALPACA_PAPER=false   und   KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"
    Fehlt eines davon, geht jeder Auftrag ins Papierkonto.
  • Not-Aus: Umgebungsvariable KI_BOT_STOP=1 oder Datei tools/trading/ki_bot/STOP → keine Aufträge.
  • Nur kaufen und verkaufen, was da ist: kein Leerverkauf, kein Hebel, kein Margin.
  • Höchstens KI_BOT_ANTEIL (Standard 0.5) des Kontowerts wird überhaupt investiert.
  • Jeder einzelne Auftrag höchstens KI_BOT_MAX_AUFTRAG USD (Standard 1000). Grössere Umschichtungen
    werden über mehrere Tage verteilt.
  • Aufträge unter 50 USD werden ausgelassen (Kosten/Rauschen).
  • --trocken zeigt die Aufträge nur an.
  • Keine Schlüssel im Protokoll. Jeder Lauf wird in data/ki-bot-broker.json angehängt.

Strategie für echte Aufträge: KI_BOT_STRATEGIE (Standard "Ausgleich" — im Backtest die beste).
Handelbar über Alpaca sind nur US-Wertpapiere und Krypto. Abbildung (Ersatz, nicht identisch!):
  S&P 500 → SPY · SMI → EWL (iShares MSCI Switzerland ETF) · Gold → GLD · Silber → SLV · Bitcoin → BTC/USD
  Nestlé, EUR/CHF und Öl werden NICHT gehandelt (kein sauberer Ersatz bzw. Rollkosten bei Öl-ETFs).
"""
from __future__ import annotations

import http.client
import json
import os
import random
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
STOP_DATEI = HIER / "STOP"    # Not-Aus
PAUSE_DATEI = HIER / "PAUSE"  # Cockpit «Auto-Handel aus»
ROOT = HIER.parents[2]
PROTOKOLL = ROOT / "data" / "ki-bot-broker.json"
PAPIER_URL = "https://paper-api.alpaca.markets"
ECHT_URL = "https://api.alpaca.markets"
ECHTGELD_SATZ = "JA, MIT ECHTEM GELD"
SYMBOLE = {"S&P 500": "SPY", "SMI": "EWL", "Gold": "GLD", "Silber": "SLV", "Bitcoin": "BTC/USD"}
MIN_AUFTRAG = 50.0



def env_zahl(env, name, standard):
    """Zahl aus einer Umgebungsvariable: «0,5», «1'000», « 0.5 » gehen; Unsinn → Standard mit Hinweis (nie ein Absturz,
    der auch den Not-Aus lahmlegen würde)."""
    roh = (env.get(name) or "").strip().replace("'", "").replace("’", "")
    if not roh:
        return float(standard)
    roh = roh.replace(",", ".") if "," in roh and "." not in roh else roh.replace(",", "")
    try:
        return float(roh)
    except ValueError:
        print(f"⚠️ {name}={env.get(name)!r} ist keine Zahl — nehme {standard}.")
        return float(standard)

ERLAUBTE_HOSTS = {False: {"paper-api.alpaca.markets", "127.0.0.1", "localhost"}, True: {"api.alpaca.markets", "127.0.0.1", "localhost"}}
NETZFEHLER = (OSError, http.client.HTTPException)  # Zeitlimit, abgerissene Verbindung: ob ausgeführt, ist offen


def einstellungen(env=None):
    env = os.environ if env is None else env
    echt = env.get("ALPACA_PAPER", "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == ECHTGELD_SATZ
    url = env.get("ALPACA_BASIS_URL")
    host = urllib.parse.urlparse(url).hostname if url else None
    return {
        "key": env.get("ALPACA_KEY_ID", ""), "secret": env.get("ALPACA_SECRET_KEY", ""),
        "basis": url or (ECHT_URL if echt else PAPIER_URL),  # ALPACA_BASIS_URL nur für Tests
        # eine Adresse allein darf nie auf echtes Geld umschalten (wie bei Binance)
        "url_fehler": (f"ALPACA_BASIS_URL zeigt auf «{host}» — passt nicht zum Modus {'Echtgeld' if echt else 'Papier'}. "
                       "Aus Sicherheit keine Aufträge.") if url and host not in ERLAUBTE_HOSTS[echt] else "",
        "echtgeld": echt,
        "strategie": env.get("KI_BOT_STRATEGIE") or "Ausgleich",
        "anteil": max(0.0, min(1.0, env_zahl(env, "KI_BOT_ANTEIL", 0.5))),
        "max_auftrag": max(0.0, env_zahl(env, "KI_BOT_MAX_AUFTRAG", 1000)),
        "stop": env.get("KI_BOT_STOP", "") == "1" or STOP_DATEI.exists() or PAUSE_DATEI.exists(),
    }


class Alpaca:
    def __init__(self, cfg):
        self.cfg = cfg

    def _req(self, methode, pfad, daten=None):
        url = self.cfg["basis"].rstrip("/") + pfad
        body = json.dumps(daten).encode() if daten is not None else None
        req = urllib.request.Request(url, data=body, method=methode, headers={
            "APCA-API-KEY-ID": self.cfg["key"], "APCA-API-SECRET-KEY": self.cfg["secret"],
            "Content-Type": "application/json", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None

    def konto(self):
        return self._req("GET", "/v2/account")

    def positionen(self):
        return {p["symbol"]: p for p in self._req("GET", "/v2/positions")}

    def offene_auftraege(self):
        return self._req("GET", "/v2/orders?status=open&limit=500") or []

    def auftrag(self, symbol, seite, notional):
        krypto = "/" in symbol
        return self._req("POST", "/v2/orders", {
            "symbol": symbol, "side": seite, "type": "market", "notional": f"{notional:.2f}",
            "time_in_force": "gtc" if krypto else "day"})


def unterwegs(offene):
    """Noch nicht ausgeführte eigene Marktaufträge (z. B. vor Börsenöffnung vorgemerkt) → {Symbol: +Kauf/−Verkauf in USD}.
    Bracket-Beine (Stop/Ziel der Daytrades) zählen nicht."""
    out = {}
    for o in offene or []:
        if o.get("type") != "market" or o.get("order_class") not in (None, "", "simple") or not o.get("notional"):
            continue
        sym = o["symbol"].replace("/", "")
        out[sym] = out.get(sym, 0.0) + float(o["notional"]) * (1 if o.get("side") == "buy" else -1)
    return out


def plane(cfg, konto, positionen, ziele, offene=None):
    """Reine Rechnung (ohne Netz, testbar): Ziel-Beträge je Symbol → Liste von Aufträgen. offene = noch nicht ausgeführte
    Aufträge: sie zählen schon zum Bestand (sonst sendet ein zweiter Lauf vor Börsenöffnung alles nochmals)."""
    wert = float(konto["equity"])
    investierbar = wert * cfg["anteil"]
    plan = []
    vorgemerkt = unterwegs(offene)
    for sym, anteil_ziel in ziele.items():
        ist = float(positionen.get(sym.replace("/", ""), positionen.get(sym, {})).get("market_value", 0.0) or 0.0)
        ist += vorgemerkt.get(sym.replace("/", ""), 0.0)
        soll = investierbar * anteil_ziel
        diff = soll - ist
        if abs(diff) < MIN_AUFTRAG:
            continue
        betrag = min(abs(diff), cfg["max_auftrag"])
        if diff < 0:
            betrag = min(betrag, ist)  # nie mehr verkaufen als vorhanden → kein Leerverkauf
            if betrag < MIN_AUFTRAG:
                continue
        plan.append({"symbol": sym, "seite": "buy" if diff > 0 else "sell", "notional": round(betrag, 2),
                     "ist": round(ist, 2), "soll": round(soll, 2)})
    # Käufe dürfen das freie Geld nicht übersteigen (kein Margin)
    frei = float(konto.get("cash", wert)) - sum(max(0.0, v) for v in vorgemerkt.values())
    verkauf = sum(a["notional"] for a in plan if a["seite"] == "sell")
    budget = frei + verkauf
    for a in plan:
        if a["seite"] == "buy":
            a["notional"] = round(max(0.0, min(a["notional"], budget)), 2)
            budget -= a["notional"]
    return [a for a in plan if a["notional"] >= MIN_AUFTRAG]


def ziele_aus_logbuch(lb, strategie):
    """Zielanteile je Alpaca-Symbol aus der letzten Entscheidung der gewählten Strategie (auf handelbare Märkte normiert)."""
    st = lb["strategien"].get(strategie)
    if not st or not st.get("eintraege"):
        raise SystemExit(f"Strategie {strategie!r} hat noch keine Entscheidung im Logbuch.")
    pos = st["eintraege"][-1]["positionen"]
    roh = {SYMBOLE[m]: v["gewicht"] * v["quote"] for m, v in pos.items() if m in SYMBOLE}
    gew = {SYMBOLE[m]: v["gewicht"] for m, v in pos.items() if m in SYMBOLE}
    s = sum(gew.values())
    return {sym: (x / s if s else 0.0) for sym, x in roh.items()}


def ausfuehren(lb, trocken=False, env=None, client=None):
    cfg = einstellungen(env)
    eintrag = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": "ECHTGELD" if cfg["echtgeld"] else "papier",
               "strategie": cfg["strategie"], "trocken": trocken, "auftraege": [], "hinweis": ""}
    if not cfg["key"] or not cfg["secret"]:
        print("Broker: keine Alpaca-Schlüssel gesetzt — nichts zu tun.")
        return 0
    if cfg["stop"]:
        eintrag["hinweis"] = "Not-Aus oder Pause aktiv (KI_BOT_STOP, Datei STOP oder PAUSE) — keine Aufträge."
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 0
    if cfg["url_fehler"]:
        eintrag["hinweis"] = cfg["url_fehler"]
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 1
    if cfg["echtgeld"]:
        print("⚠️  ECHTGELD-MODUS: Aufträge gehen an ein echtes Konto.")
    c = client or Alpaca(cfg)
    try:
        konto = c.konto()
        if konto.get("trading_blocked") or konto.get("account_blocked"):
            eintrag["hinweis"] = "Konto gesperrt — keine Aufträge."
            print("Broker: " + eintrag["hinweis"])
            _protokolliere(eintrag)
            return 1
        plan = plane(cfg, konto, c.positionen(), ziele_aus_logbuch(lb, cfg["strategie"]), c.offene_auftraege())
    except (*NETZFEHLER, KeyError, ValueError) as e:
        eintrag["hinweis"] = f"Broker nicht erreichbar oder Antwort unerwartet: {type(e).__name__}"
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 1
    for a in plan:
        print(f"{'(trocken) ' if trocken else ''}{a['seite']:4} {a['symbol']:8} {a['notional']:>9.2f} USD (ist {a['ist']:.2f} → soll {a['soll']:.2f})")
        if not trocken:
            try:
                antwort = c.auftrag(a["symbol"], a["seite"], a["notional"])
                a["id"] = (antwort or {}).get("id")
                a["status"] = (antwort or {}).get("status")
            except urllib.error.HTTPError as e:
                a["fehler"] = f"HTTP {e.code}"
            except NETZFEHLER as e:
                a["fehler"] = f"Antwort verloren ({type(e).__name__}) — ob ausgeführt, zeigt das Depot"
        eintrag["auftraege"].append(a)
    if not plan:
        print("Broker: Depot liegt im Zielbereich — keine Aufträge.")
    _protokolliere(eintrag)
    return 0


def _protokolliere(eintrag):
    """Auftrags-Protokoll (ohne Schlüssel). Wirft NIE: ein Protokollfehler darf einen Lauf nach den Aufträgen nicht als
    «abgebrochen» melden. Atomar geschrieben; eine kaputte Datei wird beiseitegelegt statt jeden Lauf scheitern zu lassen."""
    try:
        try:
            alt = json.loads(PROTOKOLL.read_text(encoding="utf-8")) if PROTOKOLL.exists() else []
            if not isinstance(alt, list):
                raise ValueError("keine Liste")
        except (ValueError, UnicodeDecodeError):
            PROTOKOLL.replace(PROTOKOLL.with_name(PROTOKOLL.name + f".kaputt-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}"))
            print("⚠️ Auftrags-Protokoll war unlesbar — beiseitegelegt, neues begonnen.")
            alt = []
        alt.append(eintrag)
        PROTOKOLL.parent.mkdir(exist_ok=True)
        tmp = PROTOKOLL.with_name(PROTOKOLL.name + f".tmp{os.getpid()}")
        tmp.write_text(json.dumps(alt[-500:], ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        os.replace(tmp, PROTOKOLL)
    except Exception as ex:  # noqa: BLE001
        print(f"⚠️ Auftrags-Protokoll nicht geschrieben ({type(ex).__name__}: {ex}) — die Aufträge selbst sind davon nicht betroffen.")


# ───────────── Daytrading: Bracket-Aufträge aus Signalen mit Gütesiegel ─────────────
# Futures-Signal → US-ETF als Ersatz (Prozent-Abstände werden übertragen, nicht absolute Kurse)
DAYTRADE_SYMBOLE = {"ES=F": "SPY", "NQ=F": "QQQ", "GC=F": "GLD", "SI=F": "SLV"}
DATEN_URL = "https://data.alpaca.markets"


class AlpacaDaten(Alpaca):
    def letzter_kurs(self, symbol):
        url = (self.cfg.get("daten_basis") or DATEN_URL).rstrip("/") + f"/v2/stocks/{symbol}/trades/latest"
        req = urllib.request.Request(url, headers={"APCA-API-KEY-ID": self.cfg["key"], "APCA-API-SECRET-KEY": self.cfg["secret"]})
        with urllib.request.urlopen(req, timeout=20) as r:
            return float(json.load(r)["trade"]["p"])

    def uhr(self):
        return self._req("GET", "/v2/clock")

    def bracket(self, symbol, menge, stop, ziel, kennung=None):
        d = {"symbol": symbol, "qty": str(menge), "side": "buy", "type": "market", "time_in_force": "day",
             "order_class": "bracket", "take_profit": {"limit_price": f"{ziel:.2f}"}, "stop_loss": {"stop_price": f"{stop:.2f}"}}
        if kennung:
            d["client_order_id"] = kennung
        return self._req("POST", "/v2/orders", d)

    def auftrag_holen(self, auftrag_id=None, kennung=None):
        if kennung:
            return self._req("GET", f"/v2/orders:by_client_order_id?client_order_id={urllib.parse.quote(kennung)}")
        return self._req("GET", f"/v2/orders/{auftrag_id}?nested=true")

    def auftrag_stornieren(self, auftrag_id):
        return self._req("DELETE", f"/v2/orders/{auftrag_id}")

    def schliessen(self, symbol, menge=None):
        """Mit Menge: nur diese Stückzahl verkaufen (der Ausgleich-Bestand im selben Symbol bleibt!)."""
        return self._req("DELETE", f"/v2/positions/{symbol}" + (f"?qty={menge:g}" if menge else ""))


def plane_daytrade(cfg, konto, signal, kurs, risiko_pct):
    """Reine Rechnung: Signal → Bracket (nur Kauf, ganze Stücke, Risiko = Stop-Verlust)."""
    if signal["richtung"] != 1:
        return None, "nur Kauf-Signale werden automatisch gehandelt (kein Leerverkauf)"
    sym = DAYTRADE_SYMBOLE.get(signal["symbol"])
    if not sym:
        return None, "kein handelbarer Ersatz bei Alpaca"
    stop_pct = signal["stop_abstand"] / signal["einstieg"]
    if not 0 < stop_pct < 0.2:
        return None, "Stop-Abstand unplausibel"
    risiko = float(konto["equity"]) * risiko_pct / 100
    menge = int(risiko / (kurs * stop_pct))
    menge = min(menge, int(cfg["max_auftrag"] // kurs), int(float(konto.get("cash", 0)) // kurs))
    if menge < 1:
        return None, "Position wäre kleiner als 1 Stück (Konto/Risiko/Höchstbetrag zu klein)"
    return {"symbol": sym, "menge": menge, "stop": round(kurs * (1 - stop_pct), 2), "ziel": round(kurs * (1 + 3 * stop_pct), 2),
            "kurs": kurs, "risiko": round(menge * kurs * stop_pct, 2)}, ""


def daytrade(signale, trocken=False, env=None, client=None):
    cfg = einstellungen(env)
    env = os.environ if env is None else env
    risiko_pct = env_zahl(env, "KI_BOT_RISIKO", 1)
    eintrag = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "art": "daytrade",
               "modus": "ECHTGELD" if cfg["echtgeld"] else "papier", "trocken": trocken, "auftraege": [], "hinweis": ""}
    if not cfg["key"] or not cfg["secret"] or not signale:
        return 0
    if cfg["url_fehler"]:
        eintrag["hinweis"] = cfg["url_fehler"]
        _protokolliere(eintrag)
        return 0
    if cfg["stop"]:
        eintrag["hinweis"] = "Not-Aus oder Pause aktiv — keine Aufträge."
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 0
    c = client or AlpacaDaten(cfg)
    try:
        if not c.uhr().get("is_open"):
            eintrag["hinweis"] = "US-Börse geschlossen — Signale nur gepusht, kein Auftrag."
            print("Broker: " + eintrag["hinweis"])
            _protokolliere(eintrag)
            return 0
        konto = c.konto()
    except (*NETZFEHLER, KeyError, ValueError) as e:
        eintrag["hinweis"] = f"Broker-Fehler: {type(e).__name__}"
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 0
    for s in signale:
        try:
            sym = DAYTRADE_SYMBOLE.get(s["symbol"])
            plan, grund = plane_daytrade(cfg, konto, s, c.letzter_kurs(sym) if sym else 0.0, risiko_pct)
        except (*NETZFEHLER, KeyError, ValueError) as e:
            plan, grund = None, f"Kurs nicht lesbar ({type(e).__name__})"
        if not plan:
            eintrag["auftraege"].append({"signal": s["id"], "ausgelassen": grund})
            continue
        print(f"{'(trocken) ' if trocken else ''}Bracket {plan['symbol']} {plan['menge']} Stk. · Stop {plan['stop']} · Ziel {plan['ziel']} · Risiko {plan['risiko']} USD")
        plan["signal"] = s["id"]
        if not trocken:
            plan["kennung"] = f"kb{int(datetime.now(timezone.utc).timestamp() * 1000)}{random.randint(0, 99999):05d}"
            try:
                antwort = c.bracket(plan["symbol"], plan["menge"], plan["stop"], plan["ziel"], plan["kennung"])
                plan["id"] = (antwort or {}).get("id")
            except urllib.error.HTTPError as e:
                plan["fehler"] = f"HTTP {e.code}"
            except NETZFEHLER as e:  # angenommen oder nicht? Die Glattstellung fragt per Kennung nach
                plan["unklar"] = True
                eintrag["hinweis"] = (eintrag["hinweis"] + f" ⚠️ Antwort auf Bracket {plan['symbol']} verloren ({type(e).__name__}).").strip()
            # SOFORT protokollieren: die Glattstellung findet ihre Daytrades nur über das Protokoll
            _protokolliere({**eintrag, "auftraege": [plan]})
        else:
            eintrag["auftraege"].append(plan)
    if trocken or [a for a in eintrag["auftraege"] if "ausgelassen" in a] or eintrag["hinweis"]:
        _protokolliere({**eintrag, "auftraege": [a for a in eintrag["auftraege"] if trocken or "ausgelassen" in a]})
    return 0


def schliesse_daytrades(heute, trocken=False, env=None, client=None):
    """Zum Tagesschluss: alle heute per Daytrade eröffneten Positionen glattstellen (nie über Nacht)."""
    cfg = einstellungen(env)
    if not cfg["key"] or not cfg["secret"] or not PROTOKOLL.exists() or cfg["url_fehler"]:
        return []
    try:
        protokoll = json.loads(PROTOKOLL.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        protokoll = []
    heutige = [a for e in protokoll if e.get("art") == "daytrade" and e.get("zeit", "").startswith(heute) and not e.get("trocken")
               for a in e.get("auftraege", []) if a.get("id") or a.get("kennung")]
    c = client or AlpacaDaten(cfg)
    geschlossen, fehler = [], []
    for a in heutige:
        try:
            try:
                o = c.auftrag_holen(a.get("id"), None if a.get("id") else a["kennung"]) or {}
            except urllib.error.HTTPError as ex:
                if ex.code == 404 and not a.get("id"):
                    continue  # Antwort war verloren und der Auftrag kam nie an — nichts glattzustellen, kein Fehlalarm
                raise
            beine = o.get("legs") or []
            if beine and not a.get("id"):
                o = c.auftrag_holen(o.get("id")) or o  # mit Beinen nachladen
                beine = o.get("legs") or []
            gekauft = float(o.get("filled_qty") or 0)
            verkauft = sum(float(b.get("filled_qty") or 0) for b in beine)
            for b in beine:  # offene Stop-/Ziel-Beine stornieren, sonst verkaufen sie später den Ausgleich-Bestand
                if b.get("status") in ("new", "accepted", "held", "partially_filled", "pending_new"):
                    if not trocken:
                        c.auftrag_stornieren(b["id"])
            rest = round(gekauft - verkauft, 6)
            if rest > 0:
                if not trocken:
                    c.schliessen(a["symbol"], rest)  # NUR der Daytrade-Teil — nie die ganze Position
                geschlossen.append({"symbol": a["symbol"], "menge": rest})
        except (*NETZFEHLER, KeyError, ValueError) as ex:
            fehler.append(f"{a['symbol']}: {type(ex).__name__}")
    if geschlossen or fehler:
        _protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "art": "daytrade-schluss",
                        "trocken": trocken, "auftraege": [{**g, "glattgestellt": True} for g in geschlossen],
                        "hinweis": ("⚠️ Glattstellen gescheitert: " + ", ".join(fehler)) if fehler else ""})
    if fehler:
        try:
            import signale as SG
            SG.push("⚠️ Daytrade-Glattstellung gescheitert (" + ", ".join(fehler) + ") — Position bleibt über Nacht. Bitte im "
                    "Alpaca-Konto prüfen!")
        except Exception:  # noqa: BLE001
            pass
    return [g["symbol"] for g in geschlossen]


def kurz_vor_schluss(minuten=20, env=None, client=None, jetzt=None):
    """True, wenn die US-Börse offen ist und laut Alpaca-Uhr in höchstens `minuten` schliesst."""
    cfg = einstellungen(env)
    if not cfg["key"] or not cfg["secret"]:
        return False
    try:
        u = (client or AlpacaDaten(cfg)).uhr()
    except (urllib.error.URLError, ValueError):
        return False
    if not u.get("is_open"):
        return False
    schluss = datetime.fromisoformat(u["next_close"].replace("Z", "+00:00"))
    jetzt = jetzt or datetime.now(timezone.utc)
    return 0 <= (schluss - jetzt).total_seconds() <= minuten * 60
