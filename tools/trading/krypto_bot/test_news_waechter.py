#!/usr/bin/env python3
"""Tests für den News-Wächter (news_waechter.py), ohne Netz.
    python3 tools/trading/krypto_bot/test_news_waechter.py"""
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import news_waechter as N  # noqa: E402

n_ok = n_f = 0


def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c)
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}"))
    n_ok += c
    n_f += not c


def e(titel, quelle="Decrypt"):
    return {"quelle": quelle, "titel": titel, "zeit": 1, "link": "x", "coins": N.coins_im_titel(titel)}


faelle = [
    ("Ledger Finds Implant That Stole Recovery Phrases in $86M Drain", "Hack"),
    ("DeFi protocol exploited for $12 million", "Hack"),
    ("Exchange XY suspends withdrawals amid liquidity crunch", "Abhebungen gestoppt"),
    ("Withdrawals paused on Bybit after incident", "Abhebungen gestoppt"),
    ("Crypto lender files for Chapter 11 bankruptcy", "Insolvenz"),
    ("USDe briefly loses its peg", "Stablecoin-Depeg"),
    ("SEC approves spot Solana ETF", "Regulierung/ETF"),
    ("SEC sues exchange over unregistered securities", "Regulierung/ETF"),
    ("Bitcoin hashrate hits new record", None),
    ("Ether price climbs 5% as traders eye upgrade", None),
    ("Hackathon winners announced in Lisbon", None),
]
for titel, art in faelle:
    pruefe(f"«{titel[:50]}» → {art or 'kein Alarm'}", N.einstufen(e(titel)) == art, N.einstufen(e(titel)))
pruefe("Binance-Delisting fremder Coins → kein Alarm", N.einstufen(e("Binance Will Delist ICX, SCRT, STORJ on 2026-09-03", "Binance Delisting")) is None)
pruefe("Binance-Delisting eines beobachteten Coins → Alarm «Delisting»",
       N.einstufen(e("Binance Will Delist PEPE, ABC on 2026-11-01", "Binance Delisting"), beobachtet={"PEPE"}) == "Delisting")
pruefe("Delisting-Paar «USDT/UAH» löst keinen Alarm für BTC/ETH aus",
       N.einstufen(e("Binance Will Delist USDT/UAH Spot Trading Pair", "Binance Delisting")) is None)
pruefe("Coins im Titel erkannt (Kürzel und Namen)", {"ICX", "SCRT", "STORJ"} <= set(N.coins_im_titel("Binance Will Delist ICX, SCRT, STORJ"))
       and "BTC" in N.coins_im_titel("Bitcoin falls below 60k"))
XML = b"""<?xml version="1.0"?><rss><channel>
<item><title>Exchange suspends withdrawals</title><link>https://a/1</link><pubDate>Mon, 13 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>Bitcoin climbs</title><link>https://a/2</link><pubDate>Mon, 13 Oct 2026 11:00:00 GMT</pubDate></item>
</channel></rss>"""
BIN = {"data": {"catalogs": [{"articles": [{"title": "Binance Will Delist BTC on 2026-12-01", "releaseDate": 5, "code": "c1"}]}]}}
gerufen = []


def json_laden(url):
    gerufen.append(url)
    if "catalogId=48" in url:
        raise OSError("weg")
    return BIN


eintraege, fehler = N.sammeln(laden_json=json_laden, laden_xml=lambda u: XML, env={})
pruefe("eine Quelle fällt aus → gemeldet, alle anderen trotzdem gelesen", fehler == ["Binance Listing: OSError"]
       and len([x for x in eintraege if x["quelle"] == "Cointelegraph"]) == 2, (fehler, len(eintraege)))
pruefe("ohne CRYPTOPANIC_KEY keine CryptoPanic-Abfrage", not any("cryptopanic" in u for u in gerufen))
tmp = Path(tempfile.mkdtemp()) / "s.json"
pruefe("allererster Lauf: nichts melden (alles als gelesen merken — keine Flut aufs Handy)", N.neue_alarme(eintraege, speicher=tmp) == [] and tmp.exists())
tmp = Path(tempfile.mkdtemp()) / "s.json"
tmp.write_text('{"gesehen": []}')
erst = N.neue_alarme(eintraege, speicher=tmp)
arten = sorted({a["alarm"] for a in erst})
pruefe("erster Lauf: Alarme aus RSS (Abhebungen) und Binance (BTC-Delisting)", arten == ["Abhebungen gestoppt", "Delisting"], arten)
pruefe("zweiter Lauf: dieselben Einträge werden nie zweimal gemeldet", N.neue_alarme(eintraege, speicher=tmp) == [])
pruefe("Meldungstext enthält Art, Titel, Quelle und Link", "🚨 Delisting: Binance Will Delist BTC" in N.text(erst) and "https://" in N.text(erst))
pruefe("/news zeigt die letzten Alarme", "🚨 Delisting" in N.letzte(tmp) and "Abhebungen" in N.letzte(tmp))
pruefe("/news ohne Daten: freundlicher Hinweis statt Fehler", "noch keine Daten" in N.letzte(Path(tempfile.mkdtemp()) / "fehlt.json"))
gemeldet = []
sp = Path(tempfile.mkdtemp()) / "s.json"
sp.write_text('{"gesehen": []}')
runde = [0]


def sammeln_fn():
    runde[0] += 1
    if runde[0] == 2:
        raise OSError("Netz weg")
    return eintraege, []


N.schleife(gemeldet.append, runden=3, sammeln_fn=sammeln_fn, speicher=sp)
pruefe("Schleife: meldet neue Alarme einmal, übersteht eine Runde ohne Netz", len(gemeldet) == 1 and "nur Info" in gemeldet[0], gemeldet)
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
