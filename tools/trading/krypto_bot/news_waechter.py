#!/usr/bin/env python3
"""News-Wächter: Krypto-News und Binance-Ankündigungen lesen, Wichtiges sofort melden — ohne danach zu handeln.

Quellen (gratis, ohne Konto): Binance-Ankündigungen (Delistings, neue Listings, Binance-News), RSS von Cointelegraph,
Decrypt, The Block und CoinDesk; mit CRYPTOPANIC_KEY zusätzlich CryptoPanic. Twitter/X liest nur, wer für die X-API bezahlt —
darum nicht dabei. Telegram-Kanäle liest dein PC (calls_leser.py) mit deinem Konto.

Warum nur melden und nicht handeln? Stimmungs-Infos (z. B. Angst & Gier, das auch Social-Media-Stimmung enthält) haben unseren
Prüfstand nicht bestanden (info_pruefung.py). Gehandelt wird nur nach Regeln, die ein Prüfstand vorher bestätigt
(z. B. delisting_pruefung.py für «Binance kündigt Delisting an»).

Alarm-Arten (Schlagworte im Titel, Gross/klein egal): Hack · Abhebungen gestoppt · Insolvenz · Stablecoin-Depeg ·
Regulierung/ETF · Delisting (bei BTC/ETH oder beobachteten Coins). Jeder Eintrag wird nur einmal gemeldet.
Aufruf: python3 tools/trading/krypto_bot/news_waechter.py [--melden]   (--melden: Alarme aufs Handy)
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

HIER = Path(__file__).resolve().parent
SPEICHER = HIER.parents[2] / "data" / "news-waechter.json"
UA = {"User-Agent": "Mozilla/5.0 (aban-news-waechter)"}
BINANCE = "https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId={kat}&pageNo=1&pageSize=20"
BINANCE_KATALOGE = {161: "Binance Delisting", 48: "Binance Listing", 49: "Binance News"}
RSS = {"Cointelegraph": "https://cointelegraph.com/rss", "Decrypt": "https://decrypt.co/feed",
       "The Block": "https://www.theblock.co/rss.xml", "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/"}
BEOBACHTET = {"BTC", "ETH"}  # Delisting-Alarm nur für Coins, die der Bot handelt (weitere über beobachtet=…)
ALARME = [  # (Art, Muster) — Reihenfolge = Vorrang
    ("Hack", r"\b(hack(ed|s)?|exploit(ed)?|stolen|drain(ed)?|breach)\b"),
    ("Abhebungen gestoppt", r"\b(suspend(s|ed)?|halt(s|ed)?|paus(e|es|ed)|freez(e|es)|frozen)\b.{0,40}\bwithdrawals?\b|\bwithdrawals?\b.{0,30}\b(suspend|halt|paus|frozen)"),
    ("Insolvenz", r"\b(insolven(t|cy)|bankrupt(cy)?|chapter 11|liquidation proceedings)\b"),
    ("Stablecoin-Depeg", r"\b(de-?peg(ged|s)?|loses? (its )?peg)\b"),
    ("Regulierung/ETF", r"\b(sec|cftc)\b.{0,40}\b(approv|reject|den(y|ies|ied)|sues?|charg|lawsuit)|\betf\b.{0,30}\b(approv|reject|den(y|ied))"),
]
STOPP = {"THE", "AND", "FOR", "WILL", "WITH", "ON", "OF", "TO", "IN", "USD", "UM", "SPOT", "NEW", "PAIRS", "NOTICE", "OF"}


def _hole(url, roh=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        daten = r.read()
    return daten if roh else json.loads(daten.decode())


def coins_im_titel(titel):
    """Grossgeschriebene Kürzel (2–12 Zeichen) und bekannte Namen im Titel."""
    out = {w.strip("()$,.:") for w in re.findall(r"\(?\$?[A-Z0-9]{2,12}\)?", titel)}
    out = {w for w in out if w and not w.isdigit() and w not in STOPP}
    for name, kurz in (("bitcoin", "BTC"), ("ethereum", "ETH"), ("binance", "BINANCE"), ("tether", "USDT")):
        if name in titel.lower():
            out.add(kurz)
    return sorted(out)


def einstufen(eintrag, beobachtet=None):
    """→ Alarm-Art oder None."""
    titel = eintrag["titel"]
    for art, muster in ALARME:
        if re.search(muster, titel, re.I):
            return art
    if eintrag["quelle"] == "Binance Delisting" and set(eintrag["coins"]) & (beobachtet or BEOBACHTET):
        return "Delisting"
    return None


def binance(kat, quelle, laden=None):
    d = (laden or _hole)(BINANCE.format(kat=kat))
    arts = (((d or {}).get("data") or {}).get("catalogs") or [{}])[0].get("articles") or []
    return [{"quelle": quelle, "titel": a.get("title", ""), "zeit": int(a.get("releaseDate") or 0),
             "link": f"https://www.binance.com/en/support/announcement/{a.get('code', '')}"} for a in arts]


def rss(quelle, url, laden=None):
    xml = (laden or (lambda u: _hole(u, roh=True)))(url)
    out = []
    for item in ET.fromstring(xml).iter("item"):
        titel = (item.findtext("title") or "").strip()
        try:
            zeit = int(parsedate_to_datetime(item.findtext("pubDate") or "").timestamp() * 1000)
        except (TypeError, ValueError):
            zeit = 0
        out.append({"quelle": quelle, "titel": titel, "zeit": zeit, "link": (item.findtext("link") or "").strip()})
    return out


def sammeln(laden_json=None, laden_xml=None, env=None):
    env = os.environ if env is None else env
    eintraege, fehler = [], []
    for kat, quelle in BINANCE_KATALOGE.items():
        try:
            eintraege += binance(kat, quelle, laden_json)
        except Exception as ex:  # noqa: BLE001
            fehler.append(f"{quelle}: {type(ex).__name__}")
    for quelle, url in RSS.items():
        try:
            eintraege += rss(quelle, url, laden_xml)
        except Exception as ex:  # noqa: BLE001
            fehler.append(f"{quelle}: {type(ex).__name__}")
    if env.get("CRYPTOPANIC_KEY"):
        try:
            d = (laden_json or _hole)(f"https://cryptopanic.com/api/v1/posts/?auth_token={env['CRYPTOPANIC_KEY']}&public=true")
            eintraege += [{"quelle": "CryptoPanic", "titel": p.get("title", ""), "link": p.get("url", ""),
                           "zeit": int(datetime.fromisoformat(p["published_at"].replace("Z", "+00:00")).timestamp() * 1000)
                           if p.get("published_at") else 0} for p in d.get("results", [])]
        except Exception as ex:  # noqa: BLE001
            fehler.append(f"CryptoPanic: {type(ex).__name__}")
    for e in eintraege:
        e["coins"] = coins_im_titel(e["titel"])
        e["id"] = hashlib.sha1((e["quelle"] + "|" + (e["link"] or e["titel"])).encode()).hexdigest()[:16]
    return eintraege, fehler


def neue_alarme(eintraege, speicher=None, beobachtet=None):
    """Nur noch nicht gemeldete Einträge mit Alarm-Art. Speichert die gesehenen IDs (die letzten 3000)."""
    speicher = Path(speicher or SPEICHER)
    erstlauf = not speicher.exists()  # beim allerersten Lauf alles als gelesen merken — sonst käme die ganze Liste aufs Handy
    try:
        alt = json.loads(speicher.read_text()) if speicher.exists() else {"gesehen": []}
    except ValueError:
        alt = {"gesehen": []}
    gesehen = set(alt["gesehen"])
    neu = []
    for e in sorted(eintraege, key=lambda x: x["zeit"]):
        if e["id"] in gesehen:
            continue
        gesehen.add(e["id"])
        alt["gesehen"].append(e["id"])
        art = einstufen(e, beobachtet)
        if art and not erstlauf:
            neu.append({**e, "alarm": art})
    alt["gesehen"] = alt["gesehen"][-3000:]
    alt["stand"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    alt["letzte_alarme"] = (alt.get("letzte_alarme", []) + [{k: a[k] for k in ("alarm", "quelle", "titel", "link", "zeit")} for a in neu])[-50:]
    speicher.parent.mkdir(parents=True, exist_ok=True)
    speicher.write_text(json.dumps(alt, ensure_ascii=False, indent=1))
    return neu


NEWS_MINUTEN = 30


def schleife(melden, runden=None, warte_s=NEWS_MINUTEN * 60, sammeln_fn=None, speicher=None):
    """Alle 30 Minuten lesen; neue Alarme → melden(text). Fehler einer Runde halten die Schleife nie an."""
    n = 0
    while runden is None or n < runden:
        n += 1
        try:
            eintraege, _ = (sammeln_fn or sammeln)()
            alarme = neue_alarme(eintraege, speicher=speicher)
            if alarme:
                melden("📰 News-Wächter\n" + text(alarme) + "\n(nur Info — der Bot handelt nicht nach News) Keine Anlageberatung.")
        except Exception:  # noqa: BLE001
            pass
        if runden is None:
            time.sleep(warte_s)


def letzte(speicher=None, n=5):
    """Text für /news: die letzten Alarme."""
    speicher = Path(speicher or SPEICHER)
    try:
        alt = json.loads(speicher.read_text())
    except (OSError, ValueError):
        return "📰 News-Wächter: noch keine Daten (startet mit dem Cockpit, prüft alle 30 Minuten)."
    al = alt.get("letzte_alarme") or []
    kopf = f"📰 News-Wächter (zuletzt geprüft {alt.get('stand', '?')[:16].replace('T', ' ')} UTC)"
    if not al:
        return kopf + ": keine Alarme."
    return kopf + "\n" + "\n".join(f"🚨 {a['alarm']}: {a['titel']} ({a['quelle']})" for a in al[-n:])


def text(alarme, fehler=()):
    zeilen = [f"🚨 {a['alarm']}: {a['titel']} ({a['quelle']}) {a['link']}" for a in alarme]
    if fehler:
        zeilen.append("ℹ️ nicht erreichbar: " + ", ".join(fehler))
    return "\n".join(zeilen)


def main():
    eintraege, fehler = sammeln()
    alarme = neue_alarme(eintraege)
    print(f"{len(eintraege)} Einträge gelesen, {len(alarme)} neue Alarme.")
    if alarme or fehler:
        print(text(alarme, fehler))
    if alarme and "--melden" in sys.argv:
        sys.path.insert(0, str(HIER.parent / "ki_bot"))
        import signale as SG
        SG.push("📰 News-Wächter\n" + text(alarme) + "\n(nur Info — der Bot handelt nicht nach News) Keine Anlageberatung.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
