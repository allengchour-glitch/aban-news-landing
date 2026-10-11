#!/usr/bin/env python3
"""Telegram-Calls lesen: aus dem Text einer Signal-Nachricht einen Call machen — oder None.

  py tools/trading/krypto_bot/calls_parser.py "LONG #SOLUSDT Entry 145-148 TP 150/155 SL 140 20x"

Versteht die üblichen Formate (Englisch/Deutsch, Emojis, Fettschrift, Dezimalkomma, Ziele in einer Zeile oder untereinander,
Cornix «Entry/Take-Profit/Stop Targets», «Short/Mid Term»-Ziele, «Sell zone / Buy back» bei Shorts, Keycap-Nummern 1️⃣).
Lieber KEIN Call als ein falsch gelesener: bei zwei verschiedenen Coins ohne klaren Bezug, bei LONG und SHORT zugleich, bei
Erfolgsmeldungen/Erinnerungen («TP1 ✅», «ALL TARGETS HIT», «still valid») und bei Werbung gibt es None.

Ergebnis: {"symbol": "SOLUSDT", "richtung": "LONG"|"SHORT", "einstieg": [tief, hoch] (leer = sofort zum Marktpreis),
"ziele": [...], "stop": Preis|None, "hebel": Zahl|None, "stimmig": bool, "quelle": "regel"|"claude",
"ausbruch": True (nur bei «Buy above …» / «Short below …»: Einstieg erst nach dem Durchbruch — wird nicht kopiert)}
«stimmig» = Stop, Einstieg und Ziele liegen in der richtigen Reihenfolge (Long: Stop < Einstieg < Ziele) und keine
Angabe ist ein Vielfaches der anderen (Faktor > 1,5 = fast sicher falsch gelesen).

Ist eine Nachricht mit den Regeln nicht lesbar, sieht aber wie ein Call aus, kann Claude helfen (nur mit CALLS_CLAUDE=1 und
ANTHROPIC_API_KEY; ein paar Zehntel-Cent je Nachricht). Claude liest dabei nur den Text — er entscheidet nichts.
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

# Wörter, die wie Coin-Kürzel aussehen, aber keine sind
KEINE_COINS = {
    "LONG", "SHORT", "BUY", "SELL", "TP", "TPS", "SL", "ENTRY", "TARGET", "TARGETS", "STOP", "LOSS", "STOPLOSS", "LEVERAGE", "CROSS",
    "ISOLATED", "ZONE", "SIGNAL", "COIN", "PAIR", "SPOT", "FUTURES", "VIP", "FREE", "NEW", "CALL", "CALLS", "TRADE", "SCALP", "SWING",
    "MARKET", "CMP", "NOW", "EINSTIEG", "ZIEL", "ZIELE", "STOPP", "HEBEL", "KAUFEN", "KAUF", "VERKAUFEN", "USDT", "USDC", "USD",
    "BUSD", "FDUSD", "PERP", "TAKE", "PROFIT", "PROFITS", "HIT", "DONE", "CLOSED", "CLOSE", "OPEN", "ENTER", "RISK", "HIGH",
    "LOW", "MID", "MEDIUM", "AND", "THE", "AT", "IN", "ON", "FOR", "TO", "OF", "ALL", "AUF", "BEI", "DER", "DIE", "DAS", "UND",
    "BINANCE", "BYBIT", "OKX", "MEXC", "BITGET", "KUCOIN", "ALERT", "UPDATE", "BREAKOUT", "BULLISH", "BEARISH", "SETUP", "AREA",
    "RANGE", "LIMIT", "ORDER", "ORDERS", "DCA", "AVG", "AVERAGE", "MAX", "MIN", "X", "R", "RR", "TF", "H1", "H4", "D1", "M15",
    "YOUR", "MY", "OUR", "BALANCE", "ACCOUNT", "WALLET", "CAPITAL", "DEIN", "DEINE", "DEINES", "VOM", "VON", "IHR", "EUER",
    "ALTCOIN", "ALTCOINS", "ALTS", "CRYPTO", "KRYPTO", "TERM", "OTE", "EXCHANGE", "EXCHANGES", "TYPE", "REGULAR", "ID", "NFA", "DYOR",
}
QUOTE = r"(?:USDT|USDC|FDUSD|BUSD|PERP)"
RE_PAAR = re.compile(r"(?<![A-Z0-9])[#$]?([A-Z0-9]{2,15}?)\s*(?:/|-|_)?\s*" + QUOTE + r"\b")
RE_MARKE = re.compile(r"[#$]([A-Z][A-Z0-9]{1,14})\b")
RE_FELD = re.compile(r"\b(?:COIN|PAIR|ASSET|MÜNZE|PAAR|SIGNAL)\s*[:=\-]?\s*[#$]?([A-Z][A-Z0-9]{1,14})\b")
RE_TERM = re.compile(r"\b(?:SHORT|MID|LONG)\s*-?\s*TERM\b")         # «Short Term:»-Ziele sind keine Richtung
RE_LONG, RE_SHORT = re.compile(r"\bLONG\b"), re.compile(r"\bSHORT\b")
RE_KAUF, RE_VERKAUF = re.compile(r"\b(?:BUY|KAUFEN|KAUF)\b"), re.compile(r"\b(?:SELL|VERKAUFEN|VERKAUF)\b")
# Erfolgsmeldung, Erinnerung, Nachziehen, Stornierung — nie ein neuer Call (auch wenn der alte Stop noch drinsteht)
RE_UPDATE = re.compile(r"\b(?:HIT|ERREICHT|CLOSED|GESCHLOSSEN|DONE|ACHIEVED|SMASHED|BOOKED|SECURED|CANCELL?ED|STORNIERT|REMINDER|"
                       r"ERINNERUNG|NACHZIEHEN|BREAKEVEN|BREAK\s+EVEN|UPDATE)\b|ALL\s+TARGETS|LAST\s+CALL|STILL\s+VALID|"
                       r"MOVE\s+(?:SL|STOP)|PROFIT\s*:\s*\+?\d|(?:TP|TARGET|ZIEL)\s*#?\d*[^\n]{0,20}✅")
RE_MARKT = re.compile(r"\b(?:MARKET|CMP|NOW|ZUM\s+MARKTPREIS|SOFORT|CURRENT\s+PRICE)\b")
RE_AUSBRUCH_LONG = re.compile(r"\b(?:ABOVE|ÜBER|OBERHALB|BREAKOUT|BREAKS?)\b")
RE_AUSBRUCH_SHORT = re.compile(r"\b(?:BELOW|UNTER|UNTERHALB|BREAKDOWN)\b")
RE_ZAHL = re.compile(r"(?<![A-Z0-9.,'])(\d+(?:[.,']\d+)*)(?![A-Z0-9%]|[.,']\d)")
RE_HEBEL = re.compile(r"(?:\b(?:LEVERAGE|HEBEL|LEV)\b\s*[:=\-]?\s*(?:CROSS|ISOLATED|ISO)?\s*\(?\s*(\d{1,3})(?:[.,]\d+)?\s*X?)"
                      r"|(?:\b(\d{1,3})(?:[.,]\d+)?\s*X\b)|(?:\bX\s*(\d{1,3})\b)")
# Abschnitts-Wörter. Kaufen/Verkaufen hängen von der Richtung ab: bei einem Short ist «Sell» der Einstieg, «Buy back» das Ziel.
ABSCHNITTE = [
    ("stop", re.compile(r"\bSTOP\s*-?\s*LOSS\b|\bSTOPLOSS\b|\bSTOP\s+TARGETS?\b|\bSTOPP?\b|\bSL\b|\bINVALIDATION\b")),
    ("ziele", re.compile(r"\bTAKE\s*-?\s*PROFIT(?:\s+TARGETS?)?\b|\bTPS?\d{0,2}\b|\bTARGETS?\b|\bZIELE?\b|\b(?:SHORT|MID|LONG)\s*-?\s*TERM\b")),
    ("einstieg", re.compile(r"\bENTRY\s+(?:TARGETS?|ZONE)\b|\bENTRIES\b|\bENTRY\b|\bENTER\b|\bEINSTIEG(?:SZONE)?\b|\bOTE\b")),
    ("rueckkauf", re.compile(r"\bBUY\s*-?\s*BACK\b|\bRÜCKKAUF\b")),
    ("kauf", re.compile(r"\b(?:BUY|KAUFEN|KAUF|KAUFZONE)\b")),
    ("verkauf", re.compile(r"\b(?:SELL|VERKAUFEN|VERKAUF)\b")),
]
ZUORDNUNG = {"LONG": {"kauf": "einstieg", "verkauf": "ziele", "rueckkauf": "einstieg"},
             "SHORT": {"kauf": "ziele", "verkauf": "einstieg", "rueckkauf": "ziele"}}
PLAUSIBEL = 1.5  # Einstieg/Stop höchstens so weit vom Kurs — sonst fast sicher falsch gelesen
SPANNE = 3.0     # Ziele (auch «Mid Term») und alle Preise untereinander höchstens Faktor 3 (eine Aufzählungs-«1» neben 152 fällt auf)
RE_NEU = re.compile(r"\bNEW\s+(?:SIGNAL|CALL|TRADE|SETUP)\b|\bNEUES\s+SIGNAL\b|\bNEUER\s+(?:CALL|TRADE)\b")


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
    """Einheitlicher Text: Fettschrift → normal (NFKC), Grossbuchstaben, Keycap-Nummern weg, Pfeile → «:», Emojis → Leerzeichen."""
    t = unicodedata.normalize("NFKC", text).upper()
    t = re.sub(r"\d️?⃣", " ", t)                      # 1️⃣ 2️⃣ = Aufzählung, kein Preis
    for a in ("→", "➡️", "➡", "=>", "->", "⟶"):
        t = t.replace(a, ":")
    for a, b in (("–", "-"), ("—", "-"), ("−", "-"), ("：", ":"), ("*", " "), ("_", " "), ("`", " "), ("|", " "), ("~", " ")):
        t = t.replace(a, b)
    t = re.sub(r"\$(?=\s*\d)", " ", t)                         # «$3.42» = Preis, «$SUI» = Coin
    t = re.sub(r"[^\x00-\x7FÄÖÜ]", " ", t)                      # Emojis/Symbole zwischen Zahlen sind Trenner
    t = re.sub(r"(?<![\d.,])(\d{1,2})((?: \d{3})+)(?![\d.,])", lambda m: m.group(1) + m.group(2).replace(" ", ""), t)  # «1 012»
    t = re.sub(r"(?<![\d.])\.(\d)", r"0.\1", t)                  # «.490» = 0.490
    return t


def _kandidaten(zeile):
    out = []
    for rx in (RE_PAAR, RE_MARKE, RE_FELD):
        for m in rx.finditer(zeile):
            basis = re.sub(r"(?<=.)" + QUOTE + "$", "", m.group(1).lstrip("#$"))  # «#SOLUSDT» = SOL
            if basis and basis not in KEINE_COINS and not basis.isdigit() and not RE_TERM.fullmatch(basis):
                out.append(basis)
    return out


def _richtung(t):
    """Nur eindeutige Richtungswörter zählen; «Short-term»/«Long-term» nie, Stimmungswörter (bullish/bearish) nie."""
    t = RE_TERM.sub(" ", t)
    lang, kurz = bool(RE_LONG.search(t)), bool(RE_SHORT.search(t))
    if lang != kurz:
        return "LONG" if lang else "SHORT"
    if lang and kurz:
        return None  # beides genannt (z. B. Werbung «Long & Short Signale»): lieber kein Call
    k, v = RE_KAUF.search(t), RE_VERKAUF.search(t)
    if k or v:
        return "LONG" if k and (not v or k.start() < v.start()) else "SHORT"
    return None


def _symbol(t, richtung):
    """Coin aus der Zeile mit der Richtung; sonst nur, wenn im ganzen Text genau EIN Coin vorkommt."""
    zeilen = t.splitlines()
    rx = RE_LONG if richtung == "LONG" else RE_SHORT
    for z in zeilen:
        if rx.search(RE_TERM.sub(" ", z)) or (richtung == "LONG" and RE_KAUF.search(z)) or (richtung == "SHORT" and RE_VERKAUF.search(z)):
            k = set(_kandidaten(z))
            if len(k) == 1:
                return k.pop() + "USDT"
            if len(k) > 1:
                return None
    alle = {b for z in zeilen for b in _kandidaten(z)}
    return alle.pop() + "USDT" if len(alle) == 1 else None


def _bereinigen(seg):
    """Teilstück → nur noch Preise: Hebel, Nummern («Target #1:», «1)»), Prozente und Wörter raus."""
    z = RE_HEBEL.sub(" ", seg)
    z = re.sub(r"\b(?:TP|TARGET|TAKE\s*PROFIT|ZIEL|ENTRY|EINSTIEG|ORDER|STOP|SL)\s*#?\s*\d{1,2}\s*[:.)=]", " ", z)
    z = re.sub(r"#\d{1,2}\b\s*[:.)]?", " ", z)
    z = re.sub(r"^\s*[:.)=\-]?\s*\d{1,2}\s*[:.)=]\s+", " ", z)   # «1: 149.5» direkt nach «Target»
    z = re.sub(r"(?:^|\s)\(?\d{1,2}\s*[).]\s+", " ", z)         # Aufzählung «1) 145» / «2. 145»
    z = re.sub(r"[+-]?\d+(?:[.,]\d+)?\s*(?:-|TO|BIS)\s*\d+(?:[.,]\d+)?\s*%", " ", z)   # «5-8%»
    z = re.sub(r"\(?[+-]?\d+(?:[.,]\d+)?\s*%\)?", " ", z)       # Prozente
    z = re.sub(r"[#$]?\b[A-Z0-9]*[A-Z][A-Z0-9]*\b", " ", z)      # Wörter mit Buchstaben (Symbole, Text)
    return z


def _zahlen(seg):
    return [zahl(m.group(1)) for m in RE_ZAHL.finditer(_bereinigen(seg))]


def _prozente(seg):
    return [float(m.group(1).replace(",", ".")) for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*%", seg)]


def _nur_zahlen(zeile):
    """Fortsetzungszeile? Nur Aufzählung, Zahlen und Trennzeichen — eine Zeile mit Wörtern beendet den Abschnitt."""
    rest = re.sub(r"\b(?:TP|TARGET|ZIEL|ENTRY|EINSTIEG|OF\s+PROFIT|PROFIT)\b", " ", _bereinigen(zeile + " "))
    return not re.search(r"[A-ZÄÖÜ©]", re.sub(r"\d", "", zeile.replace("PROFIT", "").replace("TP", "").replace("TARGET", "")
                                                         .replace("OF", ""))) and bool(RE_ZAHL.search(rest))


def parse(text):
    """Text → Call-dict oder None (kein Call, Erfolgsmeldung, mehrdeutig oder unvollständig)."""
    if not text or len(text) > 4000:
        return None
    roh = unicodedata.normalize("NFKC", text).upper()
    teile = list(RE_NEU.finditer(roh))
    if teile:  # «Last call #AVAX smashed all targets ✅ … New signal 👇 #OP LONG …»: nur der Teil nach «New signal» zählt
        text = unicodedata.normalize("NFKC", text)[teile[-1].end():]
        roh = roh[teile[-1].end():]
    if RE_UPDATE.search(roh):
        return None  # «TP1 ✅», «ALL TARGETS HIT», «Reminder … still valid»: kein neuer Call
    t = _normal(text)
    richtung = _richtung(t)
    if not richtung:
        return None
    symbol = _symbol(t, richtung)
    if not symbol:
        return None
    gefunden = {"einstieg": [], "ziele": [], "stop": []}
    prozent = {"ziele": [], "stop": []}
    ausbruch = False
    abschnitt = None
    for zeile in t.splitlines():
        if not zeile.strip():
            continue
        treffer = sorted((m.start(), name, m.end()) for name, rx in ABSCHNITTE for m in rx.finditer(zeile))
        # verschachtelte Treffer (z. B. «STOP» in «STOP LOSS», «BUY» in «BUY BACK») entfernen, gleiche zusammenfassen
        runs = []
        for st, name, en in treffer:
            if runs and st < runs[-1][2]:
                continue
            if runs and runs[-1][1] == name and st - runs[-1][2] <= 2:
                runs[-1] = (runs[-1][0], name, en)
            else:
                runs.append((st, name, en))
        if not runs:
            if abschnitt and _nur_zahlen(zeile):
                gefunden[abschnitt] += _zahlen(zeile)   # Fortsetzung untereinander («1) 149.5»)
            else:
                abschnitt = None                         # Text («Holding period: 2-3 days», «Risk 3/10», Fusszeile) beendet
            continue
        for i, (st, name, en) in enumerate(runs):
            ziel = ZUORDNUNG[richtung].get(name, name)
            bis = runs[i + 1][0] if i + 1 < len(runs) else len(zeile)
            seg = zeile[en:bis]
            gefunden[ziel] += _zahlen(seg)
            if ziel in prozent and not _zahlen(seg):
                prozent[ziel] += _prozente(seg)
            if ziel == "einstieg" and (RE_AUSBRUCH_LONG.search(seg) if richtung == "LONG" else RE_AUSBRUCH_SHORT.search(seg)):
                ausbruch = True
            abschnitt = ziel
    # «#LTC SHORT below 82.50» ohne Einstiegs-Wort
    if not gefunden["einstieg"]:
        m = (re.search(r"\b(?:ABOVE|ÜBER|OBERHALB)\s+(\d+(?:[.,]\d+)?)", t) if richtung == "LONG"
             else re.search(r"\b(?:BELOW|UNTER|UNTERHALB)\s+(\d+(?:[.,]\d+)?)", t))
        if m:
            gefunden["einstieg"], ausbruch = [zahl(m.group(1))], True
    markt = bool(RE_MARKT.search(t)) and not gefunden["einstieg"]
    einstieg = sorted(set(gefunden["einstieg"]))
    if not einstieg and not markt:
        return None
    lang = richtung == "LONG"
    mitte = (einstieg[0] + einstieg[-1]) / 2 if einstieg else None
    ziele = list(dict.fromkeys(gefunden["ziele"]))
    if not ziele and prozent["ziele"] and mitte:  # «TP: 3% / 6% / 10%» relativ zum Einstieg
        ziele = [round(mitte * (1 + p / 100 if lang else 1 - p / 100), 10) for p in prozent["ziele"]]
    stop = gefunden["stop"][0] if gefunden["stop"] else None
    unvollstaendig = False
    if stop is None and prozent["stop"]:
        if mitte:
            stop = round(mitte * (1 - prozent["stop"][0] / 100 if lang else 1 + prozent["stop"][0] / 100), 10)
        else:
            unvollstaendig = True  # Stop in Prozent ohne Einstiegspreis: nicht raten
    if not ziele and stop is None:
        return None
    m = RE_HEBEL.search(t)
    hebel = int(next(g for g in m.groups() if g)) if m else None
    c = {"symbol": symbol, "richtung": richtung, "einstieg": [einstieg[0], einstieg[-1]] if einstieg else [],
         "ziele": sorted(ziele, reverse=not lang), "stop": stop, "hebel": hebel if hebel and 1 <= hebel <= 200 else None,
         "quelle": "regel"}
    if ausbruch:
        c["ausbruch"] = True
    if unvollstaendig:
        c["unvollstaendig"] = True
    c["stimmig"] = stimmig(c)
    return c


def stimmig(c):
    """Long: Stop < Einstieg < Ziele · Short: umgekehrt; und kein Preis mehr als Faktor 1,5 von den anderen entfernt
    (eine Aufzählungs-«1» neben 152 USDT wäre sonst ein Ziel)."""
    if c.get("unvollstaendig"):
        return False
    lang = c["richtung"] == "LONG"
    alle = [p for p in c["einstieg"] + c["ziele"] + ([c["stop"]] if c["stop"] else []) if p]
    if not alle or min(alle) <= 0 or max(alle) / min(alle) > SPANNE:
        return False
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


def plausibel(c, kurs, seiten=True):
    """Passt der Call zum aktuellen Kurs? Einstieg und Stop höchstens Faktor 1,5 vom Kurs, Ziele höchstens Faktor 3; bei
    Markt-Einstieg liegen Ziele und Stop auf der richtigen Seite. Gleiche Prüfung im Prüfstand und vor jedem Auftrag —
    gehandelt wird nur, was auch gewertet wird."""
    if not kurs or kurs <= 0 or not c.get("stimmig", True):
        return False
    nah = [p for p in c["einstieg"] + ([c["stop"]] if c["stop"] else []) if p]
    if any(p / kurs > PLAUSIBEL or kurs / p > PLAUSIBEL for p in nah):
        return False
    if any(z / kurs > SPANNE or kurs / z > SPANNE for z in c["ziele"]):
        return False
    if seiten and not c["einstieg"]:
        lang = c["richtung"] == "LONG"
        if any((z <= kurs if lang else z >= kurs) for z in c["ziele"]):
            return False
        if c["stop"] and (c["stop"] >= kurs if lang else c["stop"] <= kurs):
            return False
    return True


def sieht_aus_wie_call(text):
    """Grobe Vorprüfung (Claude-Rückfall, Unlesbar-Zählung im Prüfstand): Coin, Richtung, mindestens zwei Zahlen, keine Meldung."""
    if not text or RE_UPDATE.search(unicodedata.normalize("NFKC", text).upper()):
        return False
    t = _normal(text)
    r = _richtung(t)
    return bool(r and _symbol(t, r) and len(_zahlen(t)) >= 2)


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
