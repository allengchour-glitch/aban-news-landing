#!/usr/bin/env python3
"""Telegram-Calls lesen: aus dem Text einer Signal-Nachricht einen Call machen — oder None.

  py tools/trading/krypto_bot/calls_parser.py "LONG #SOLUSDT Entry 145-148 TP 150/155 SL 140 20x"

Versteht die üblichen Formate (Englisch/Deutsch, Emojis, Dezimalkomma, Ziele in einer Zeile oder untereinander):
  #SOLUSDT LONG · Entry: 145.2 - 147.8 · Target 1: 149.5 · StopLoss: 140 · Leverage: Cross 20x
  BUY $PEPE · Buy zone: 0.0000102 - 0.0000105 · Sell: 0.000011, 0.0000115 · SL: 0.0000098
  AVAX Long · Einstieg: 28,40 – 28,90 · Ziele: 29,50 / 30,20 · Stopp: 27,60 · Hebel 5x
Erfolgsmeldungen («TP1 hit ✅», «Closed in profit») sind KEINE neuen Calls und geben None.

Ergebnis: {"symbol": "SOLUSDT", "richtung": "LONG"|"SHORT", "einstieg": [tief, hoch] (leer = sofort zum Marktpreis),
"ziele": [...], "stop": Preis|None, "hebel": Zahl|None, "stimmig": bool, "quelle": "regel"|"claude"}
«stimmig» = Stop, Einstieg und Ziele liegen in der richtigen Reihenfolge (Long: Stop < Einstieg < Ziele).

Ist eine Nachricht mit den Regeln nicht lesbar, sieht aber wie ein Call aus, kann Claude helfen (nur mit CALLS_CLAUDE=1 und
ANTHROPIC_API_KEY; ein paar Zehntel-Cent je Nachricht). Claude liest dabei nur den Text — er entscheidet nichts.
"""
from __future__ import annotations

import json
import os
import re
import sys

QUOTES = ("USDT", "USDC", "FDUSD", "BUSD", "USD", "PERP")
# Wörter, die wie Coin-Kürzel aussehen, aber keine sind
KEINE_COINS = {
    "LONG", "SHORT", "BUY", "SELL", "TP", "SL", "ENTRY", "TARGET", "TARGETS", "STOP", "LOSS", "STOPLOSS", "LEVERAGE", "CROSS",
    "ISOLATED", "ZONE", "SIGNAL", "COIN", "PAIR", "SPOT", "FUTURES", "VIP", "FREE", "NEW", "CALL", "TRADE", "SCALP", "SWING",
    "MARKET", "CMP", "NOW", "EINSTIEG", "ZIEL", "ZIELE", "STOPP", "HEBEL", "KAUFEN", "KAUF", "VERKAUFEN", "USDT", "USDC", "USD",
    "BUSD", "FDUSD", "PERP", "TAKE", "PROFIT", "PROFITS", "HIT", "DONE", "CLOSED", "CLOSE", "OPEN", "ENTER", "RISK", "HIGH",
    "LOW", "MID", "MEDIUM", "AND", "THE", "AT", "IN", "ON", "FOR", "TO", "OF", "ALL", "AUF", "BEI", "DER", "DIE", "DAS", "UND",
    "BINANCE", "BYBIT", "OKX", "MEXC", "BITGET", "KUCOIN", "ALERT", "UPDATE", "BREAKOUT", "BULLISH", "BEARISH", "SETUP", "AREA",
    "RANGE", "LIMIT", "ORDER", "ORDERS", "DCA", "AVG", "AVERAGE", "MAX", "MIN", "X", "R", "RR", "TF", "H1", "H4", "D1", "M15",
}
RE_ZAHL = re.compile(r"(?<![A-Za-z0-9.,'])(\d+(?:[.,']\d+)*)(?![A-Za-z0-9%×]|[.,']\d)")
RE_HEBEL = re.compile(r"(?:(?:LEVERAGE|HEBEL|LEV)\s*[:=]?\s*(?:CROSS|ISOLATED|ISO)?\s*\(?\s*(\d{1,3})\s*[X×]?)|(?:\b(\d{1,3})\s*[X×](?![A-Z0-9]))")
RE_SYMBOL_PAAR = re.compile(r"[#$]?\b([A-Z0-9]{2,15}?)\s*(?:/|-|_)?\s*(USDT|USDC|FDUSD|BUSD|USD|PERP)\b")
RE_SYMBOL_MARKE = re.compile(r"[#$]([A-Z][A-Z0-9]{1,14})\b")
RE_SYMBOL_FELD = re.compile(r"\b(?:COIN|PAIR|ASSET|MÜNZE|PAAR|SIGNAL)\s*[:=\-–]?\s*[#$]?([A-Z][A-Z0-9]{1,14})\b")
ABSCHNITTE = [  # (Name, Muster) — Reihenfolge zählt: «stop» vor «ziele» («stop loss» ist kein Ziel)
    ("stop", re.compile(r"\b(?:SL|STOP\s*-?\s*LOSS|STOPLOSS|STOPP?|STOP-LOSS|INVALIDATION)\b")),
    ("ziele", re.compile(r"\b(?:TP\d{0,2}|TPS|TARGETS?|ZIELE?|TAKE\s*-?\s*PROFITS?|SELL|VERKAUF(?:EN)?|EXIT)\b")),
    ("einstieg", re.compile(r"\b(?:ENTRY|ENTRIES|ENTER|EINSTIEG(?:SZONE)?|BUY\s*ZONE|BUY\s*(?:AT|@)|BUY|KAUFZONE|KAUFEN|OPEN|LIMIT|DCA|ZONE)\b")),
]
RE_MARKT = re.compile(r"\b(?:MARKET|CMP|NOW|AT\s+MARKET|ZUM\s+MARKTPREIS|SOFORT|CURRENT\s+PRICE)\b")
RE_UPDATE = re.compile(r"\b(?:HIT|ERREICHT|CLOSED|GESCHLOSSEN|DONE|ACHIEVED|CANCEL(?:LED)?|STORNIERT|BOOKED|SECURED)\b|✅|🎯\s*\d+\s*%")


def zahl(s):
    """«1,234.5» · «0,0123» · «1'234» · «28,40» → float. Ein einzelnes Komma mit genau 3 Ziffern danach gilt als Tausender."""
    s = s.replace("'", "")
    if "," in s and "." in s:
        s = s.replace(",", "") if s.rfind(".") > s.rfind(",") else s.replace(".", "").replace(",", ".")
    elif "," in s:
        teile = s.split(",")
        s = s.replace(",", "") if len(teile) > 1 and all(len(t) == 3 for t in teile[1:]) and teile[0] not in ("0", "") else s.replace(",", ".")
    elif s.count(".") > 1:  # 1.234.567 = Tausender-Punkte
        s = s.replace(".", "")
    return float(s)


def _normal(text):
    t = text.upper()
    for a, b in (("–", "-"), ("—", "-"), ("−", "-"), ("：", ":"), ("*", " "), ("_", " "), ("`", " "), ("|", " "), ("~", " ")):
        t = t.replace(a, b)
    return t


def _symbol(t):
    for m in RE_SYMBOL_PAAR.finditer(t):
        basis = m.group(1).lstrip("#$")
        if basis and basis not in KEINE_COINS and not basis.isdigit():
            return basis + "USDT"
    for rx in (RE_SYMBOL_MARKE, RE_SYMBOL_FELD):
        for m in rx.finditer(t):
            if m.group(1) not in KEINE_COINS and not m.group(1).isdigit():
                return m.group(1) + "USDT"
    return None


def _richtung(t):
    long_, short_ = re.search(r"\bLONG\b|📈|🟢|🚀", t), re.search(r"\bSHORT\b|📉|🔴", t)
    if bool(re.search(r"\bLONG\b", t)) != bool(re.search(r"\bSHORT\b", t)):
        return "LONG" if re.search(r"\bLONG\b", t) else "SHORT"
    kauf = re.search(r"\b(?:BUY|KAUFEN|KAUF|BULLISH)\b", t)
    verkauf = re.search(r"\b(?:SELL|VERKAUFEN|BEARISH)\b", t)
    if kauf and (not verkauf or kauf.start() < verkauf.start()):
        return "LONG"
    if verkauf:
        return "SHORT"
    if long_ and not short_:
        return "LONG"
    if short_ and not long_:
        return "SHORT"
    return None


def _zahlen(zeile):
    z = RE_HEBEL.sub(" ", zeile)
    z = re.sub(r"\b(?:TP|TARGET|ZIEL|ENTRY|EINSTIEG)\s*(\d{1,2})\s*[:.)=\-]\s*", " ", z)  # «Target 1:» — Nummer, kein Preis
    z = re.sub(r"^\s*\d{1,2}\s*[:.)=\-]\s+", " ", z)                                          # «1: 149.5» nach «Target»
    z = re.sub(r"(?:^|\s)\d{1,2}\s*[).]\s+", " ", z)                                          # Aufzählung «1) 145»
    z = re.sub(r"\(?[+-]?\d+(?:[.,]\d+)?\s*%\)?", " ", z)                                     # Prozente
    z = re.sub(r"[#$]?\b[A-Z0-9]*[A-Z][A-Z0-9]*\b", " ", z)                                  # Wörter mit Buchstaben (Symbole)
    return [zahl(m.group(1)) for m in RE_ZAHL.finditer(z)]


def parse(text):
    """Text → Call-dict oder None (kein Call, nur Erfolgsmeldung, oder unvollständig)."""
    if not text or len(text) > 4000:
        return None
    t = _normal(text)
    symbol, richtung = _symbol(t), _richtung(t)
    if not symbol or not richtung:
        return None
    gefunden = {"einstieg": [], "ziele": [], "stop": []}
    abschnitt = None
    for zeile in t.splitlines():
        if not zeile.strip():
            continue
        treffer = [(m.start(), name, m.end()) for name, rx in ABSCHNITTE for m in rx.finditer(zeile)]
        if not treffer:
            if abschnitt and abschnitt != "stop":
                gefunden[abschnitt] += _zahlen(zeile)   # Fortsetzung untereinander («1) 149.5»)
            continue
        treffer.sort()
        # Gleiche Abschnitte direkt hintereinander zusammenfassen («Entry zone», «Stop loss», «TP1 … TP2 …» bleibt getrennt egal)
        runs = []
        for start, name, ende in treffer:
            if runs and runs[-1][1] == name and start - runs[-1][2] <= 2:
                runs[-1] = (runs[-1][0], name, ende)
            elif not runs or start >= runs[-1][2]:
                runs.append((start, name, ende))
        # Eine Zeile kann mehrere Abschnitte enthalten: «Entry 145-148 TP 150/155 SL 140»
        for i, (start, name, ende) in enumerate(runs):
            bis = runs[i + 1][0] if i + 1 < len(runs) else len(zeile)
            gefunden[name] += _zahlen(zeile[ende:bis])
            abschnitt = name
    markt = bool(RE_MARKT.search(t))
    einstieg = sorted(set(gefunden["einstieg"]))
    ziele = list(dict.fromkeys(gefunden["ziele"]))
    stop = gefunden["stop"][0] if gefunden["stop"] else None
    if not einstieg and not markt:
        return None
    if not ziele and stop is None:
        return None
    if RE_UPDATE.search(t) and not stop:
        return None  # «TP1 hit ✅ +45 %» ist eine Erfolgsmeldung, kein neuer Call
    m = RE_HEBEL.search(t)
    hebel = int(m.group(1) or m.group(2)) if m else None
    c = {"symbol": symbol, "richtung": richtung, "einstieg": [einstieg[0], einstieg[-1]] if einstieg else [],
         "ziele": sorted(ziele, reverse=richtung == "SHORT"), "stop": stop, "hebel": hebel if hebel and 1 <= hebel <= 200 else None,
         "quelle": "regel"}
    c["stimmig"] = stimmig(c)
    return c


def stimmig(c):
    """Long: Stop < Einstieg < Ziele · Short: umgekehrt. Ohne Einstieg (Markt) nur Stop gegen Ziele."""
    lang = c["richtung"] == "LONG"
    ref = c["einstieg"] or None
    tief, hoch = (ref[0], ref[1]) if ref else (None, None)
    for z in c["ziele"]:
        if ref and ((lang and z <= hoch) or (not lang and z >= tief)):
            return False
    if c["stop"] is not None:
        if ref and ((lang and c["stop"] >= tief) or (not lang and c["stop"] <= hoch)):
            return False
        if c["ziele"] and ((lang and c["stop"] >= min(c["ziele"])) or (not lang and c["stop"] <= max(c["ziele"]))):
            return False
    return True


def sieht_aus_wie_call(text):
    """Grobe Vorprüfung für den Claude-Weg: Kürzel, Richtung und mindestens zwei Zahlen."""
    t = _normal(text or "")
    return bool(_symbol(t) and _richtung(t) and len(_zahlen(t)) >= 2 and not RE_UPDATE.search(t))


# ───────────────────────── Claude als Rückfall (optional) ─────────────────────────
SCHEMA = {"type": "object", "additionalProperties": False,
          "properties": {"ist_call": {"type": "boolean"}, "symbol": {"type": "string"}, "richtung": {"type": "string", "enum": ["LONG", "SHORT"]},
                         "einstieg": {"type": "array", "items": {"type": "number"}}, "ziele": {"type": "array", "items": {"type": "number"}},
                         "stop": {"type": ["number", "null"]}, "hebel": {"type": ["integer", "null"]}},
          "required": ["ist_call", "symbol", "richtung", "einstieg", "ziele", "stop", "hebel"]}
SYSTEM = ("Du liest Krypto-Trading-Signale aus Telegram-Gruppen und gibst sie als JSON zurück. Nur abschreiben, nichts ergänzen, "
          "nichts bewerten. symbol = Basis-Kürzel + USDT (z. B. SOLUSDT, 1000PEPEUSDT). einstieg = alle Einstiegspreise "
          "(leer, wenn «Markt»/«CMP»). ist_call = false bei Erfolgsmeldungen, Werbung, Analysen ohne Einstieg.")


def parse_mit_claude(text, client=None, modell=None):
    """→ (call oder None, info). Nur wenn CALLS_CLAUDE=1 (oder client übergeben). Wirft nie."""
    if client is None:
        if os.environ.get("CALLS_CLAUDE") != "1":
            return None, {"hinweis": "Claude-Rückfall aus (CALLS_CLAUDE=1 schaltet ihn ein)"}
        try:
            import anthropic
        except ImportError:
            return None, {"hinweis": "Paket fehlt: py -m pip install anthropic"}
        client = anthropic.Anthropic()
    import ki_trader as KT
    modell = modell or os.environ.get("CALLS_CLAUDE_MODELL") or KT.MODELL_STANDARD
    extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"} if modell in KT.MIT_FALLBACK else {}
    try:
        r = client.beta.messages.create(model=modell, max_tokens=4000, system=SYSTEM, messages=[{"role": "user", "content": text[:4000]}],
                                        output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}}, **extra)
    except Exception as ex:  # noqa: BLE001
        return None, {"hinweis": f"Claude nicht erreichbar: {type(ex).__name__}"}
    ein, aus = KT.PREISE.get(getattr(r, "model", modell) or modell, KT.PREISE.get(modell, (0.0, 0.0)))
    info = {"kosten_usd": round(r.usage.input_tokens / 1e6 * ein + r.usage.output_tokens / 1e6 * aus, 5)}
    if r.stop_reason in ("refusal", "max_tokens"):
        return None, {**info, "hinweis": f"Claude: {r.stop_reason}"}
    try:
        d = json.loads(next(b.text for b in r.content if b.type == "text"))
    except (StopIteration, ValueError):
        return None, {**info, "hinweis": "Antwort nicht lesbar"}
    if not d.get("ist_call") or not d.get("symbol"):
        return None, info
    sym = re.sub(r"[^A-Z0-9]", "", d["symbol"].upper())
    if not sym.endswith("USDT"):
        sym = re.sub(r"(USDC|USD|PERP)$", "", sym) + "USDT"
    e = sorted(float(x) for x in d["einstieg"] if x and x > 0)
    c = {"symbol": sym, "richtung": d["richtung"], "einstieg": [e[0], e[-1]] if e else [],
         "ziele": sorted((float(x) for x in d["ziele"] if x and x > 0), reverse=d["richtung"] == "SHORT"),
         "stop": float(d["stop"]) if d.get("stop") else None, "hebel": d.get("hebel"), "quelle": "claude"}
    if not c["ziele"] and c["stop"] is None:
        return None, info
    c["stimmig"] = stimmig(c)
    return c, info


def lesen(text, claude=True):
    """Erst die Regeln, dann (falls eingeschaltet und es wie ein Call aussieht) Claude."""
    c = parse(text)
    if c or not claude or not sieht_aus_wie_call(text):
        return c
    return parse_mit_claude(text)[0]


if __name__ == "__main__":
    print(json.dumps(lesen(" ".join(sys.argv[1:]) or sys.stdin.read()), ensure_ascii=False, indent=1))
