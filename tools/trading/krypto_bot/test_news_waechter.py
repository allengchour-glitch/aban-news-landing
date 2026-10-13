#!/usr/bin/env python3
"""Tests für den News-Wächter (news_waechter.py), ohne Netz.
    python3 tools/trading/krypto_bot/test_news_waechter.py"""
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import news_waechter as N  # noqa: E402

ALTER = N.MAX_ALTER_STUNDEN
N.MAX_ALTER_STUNDEN = None  # die Beispiel-Daten sind fest datiert — das Alters-Limit prüft ein eigener Test unten

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


eintraege, fehler = N.sammeln(laden_json=json_laden, laden_xml=lambda u: XML if "t.me" not in u else b"", env={})
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


N.schleife(gemeldet.append, runden=3, sammeln_fn=sammeln_fn, speicher=sp, schnell_fn=lambda: [], schlafen=lambda s: None)
pruefe("Schleife: meldet neue Alarme einmal, übersteht eine Runde ohne Netz", len(gemeldet) == 1 and "nur Info" in gemeldet[0], gemeldet)
pruefe("NEWS_COINS: deine Coins (Komma oder Strichpunkt, gross/klein egal) kommen zu BTC/ETH dazu",
       N.beobachtete({"NEWS_COINS": "sol, doge;Pepe"}) == {"BTC", "ETH", "SOL", "DOGE", "PEPE"} and N.beobachtete({}) == {"BTC", "ETH"})
sol = [{"quelle": "Binance Delisting", "titel": "Binance Will Delist SOL, XYZ on 2026-11-01", "zeit": 9, "link": "https://b/sol"}]
schnell = N.nur_delistings(laden_json=lambda u: {"data": {"catalogs": [{"articles": [{"title": sol[0]["titel"], "releaseDate": 9,
                                                                                    "code": "sol"}]}]}} if "catalogId=161" in u else None)
pruefe("Schnell-Abfrage liest nur die Delisting-Liste (mit Coins und Kennung)", len(schnell) == 1 and "SOL" in schnell[0]["coins"]
       and schnell[0]["id"], schnell)
gem2, sp2, schlaf, abfragen = [], Path(tempfile.mkdtemp()) / "s.json", [], [0]
sp2.write_text('{"gesehen": []}')


def schnell_fn():
    abfragen[0] += 1
    return N._ergaenzen([dict(sol[0])]) if abfragen[0] >= 2 else []


N.schleife(gem2.append, runden=1, sammeln_fn=lambda: ([], []), speicher=sp2, schnell_fn=schnell_fn, warte_s=180, takt_s=60,
           beobachtet={"BTC", "ETH", "SOL"}, schlafen=schlaf.append)
pruefe("Schnell-Takt: zwischen den 30-Minuten-Runden jede Minute die Delistings (180 s → 3 Abfragen à 60 s)",
       abfragen[0] == 3 and schlaf == [60, 60, 60], (abfragen, schlaf))
pruefe("… das Delisting eines eigenen Coins (NEWS_COINS) kommt in der nächsten Minute — und nur einmal",
       len(gem2) == 1 and "SOL" in gem2[0] and "−17 % in 30 Min." in gem2[0], gem2)
TG = ('<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message text_not_supported_wrap js-widget_message" '
      'data-post="WatcherGuru/15481"><div class="tgme_widget_message_text js-message_text" dir="auto">JUST IN: 🇺🇸 SEC approves '
      'spot <b>XRP</b> ETF<br/><br/>@WatcherGuru</div><time datetime="2026-10-13T20:37:43+00:00" class="time">20:37</time></div></div>'
      '<div class="tgme_widget_message_wrap"><div data-post="WatcherGuru/15482"><div class="tgme_widget_message_text js-message_text">'
      'Exchange &amp; Co. suspends withdrawals</div><time datetime="2026-10-13T21:00:00+00:00"></time></div></div>')
tg = N.telegram("WatcherGuru", laden=lambda u: TG.encode() if u == "https://t.me/s/WatcherGuru" else b"")
pruefe("Telegram-Kanal (Web-Vorschau): Titel = erste Zeile ohne HTML, Zeit, Link auf die Nachricht", len(tg) == 2
       and tg[0]["titel"] == "JUST IN: 🇺🇸 SEC approves spot XRP ETF" and tg[0]["link"] == "https://t.me/WatcherGuru/15481"
       and tg[0]["zeit"] == 1791923863000 and tg[1]["titel"] == "Exchange & Co. suspends withdrawals"
       and tg[0]["quelle"] == "Telegram Watcher.Guru", tg)
pruefe("NEWS_TELEGRAM: eigene öffentliche Kanäle dazu (mit/ohne @), Unsinn wird ignoriert",
       N.telegram_kanaele({"NEWS_TELEGRAM": "@whale_alert_io, foo/../bar;WatcherGuru"}) == ["WatcherGuru", "wublockchainenglish", "whale_alert_io"])
sp3 = Path(tempfile.mkdtemp()) / "s.json"
sp3.write_text('{"gesehen": []}')
doppel = N._ergaenzen([{"quelle": "Binance Delisting", "titel": "Binance Will Delist SOL on 2026-11-01", "zeit": 7, "link": "https://b/1"},
                       {"quelle": "Telegram @binance_announcements", "titel": "Binance Will Delist SOL on 2026-11-01", "zeit": 8,
                        "link": "https://t.me/binance_announcements/9"}])
pruefe("dieselbe Schlagzeile aus zwei Quellen (Binance-Seite + Telegram) → nur EIN Alarm",
       len(N.neue_alarme(doppel, speicher=sp3, beobachtet={"SOL"})) == 1)
N.MAX_ALTER_STUNDEN = ALTER
sp4 = Path(tempfile.mkdtemp()) / "s.json"
sp4.write_text('{"gesehen": []}')
jetzt = 1791924663000
alt_neu = N._ergaenzen([{"quelle": "Decrypt", "titel": "Exchange A suspends withdrawals", "zeit": jetzt - 13 * 3_600_000, "link": "https://a/x"},
                        {"quelle": "Decrypt", "titel": "Exchange B suspends withdrawals", "zeit": jetzt - 1 * 3_600_000, "link": "https://a/y"}])
al = N.neue_alarme(alt_neu, speicher=sp4, jetzt_ms=jetzt)
pruefe(f"Meldung älter als {ALTER} Stunden → kein Alarm mehr (neue Quelle, PC war aus), frische schon", [a["titel"] for a in al]
       == ["Exchange B suspends withdrawals"], al)
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
