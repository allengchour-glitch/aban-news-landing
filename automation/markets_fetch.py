#!/usr/bin/env python3
"""Aban News — Märkte-Datensammler (Preise + Finanz-News).

Aktualisiert data/markets.json mit echten, öffentlich verfügbaren Daten:
  • Aktien-Kurse + 24h-Änderung via Stooq (keyless CSV-Endpoint)
  • Krypto-Kurse als statischer Fallback via CoinGecko (Browser aktualisiert live)
  • Finanz-News-Schlagzeilen aus seriösen RSS-Feeds (echte Quellen, nichts erfunden)

Pure stdlib (urllib + Regex). KEINE KI hier — Sentiment macht markets_ai.py.
No-op-sicher: schlägt eine Quelle fehl, bleiben die alten Werte erhalten.

Nutzung:
    python automation/markets_fetch.py
"""

from __future__ import annotations

import html
import json
import re
import sys
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "markets.json"

YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d"
COINGECKO = ("https://api.coingecko.com/api/v3/coins/markets"
             "?vs_currency=usd&ids={ids}&price_change_percentage=24h")

FINANCE_FEEDS = {
    "CNBC Markets": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
    "Investing.com": "https://www.investing.com/rss/news_25.rss",
    "Yahoo Finance": "https://finance.yahoo.com/news/rssindex",
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "Cointelegraph": "https://cointelegraph.com/rss",
    "Handelsblatt Finanzen": "https://www.handelsblatt.com/contentexport/feed/finanzen",
}

MAX_NEWS = 10


def fetch(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; aban-news-bot/1.0; +https://abannews.com)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def fetch_bytes(url: str, timeout: int = 20) -> str:
    return fetch(url, timeout)


# ---------- Aktien (Yahoo Finance, keyless) ----------
def yahoo_quote(symbol: str):
    """Aktueller Kurs + 24h-Änderung aus dem keyless Yahoo-Finance-Chart-Endpoint."""
    try:
        raw = fetch(YAHOO_CHART.format(sym=symbol), timeout=20)
        data = json.loads(raw)
        res = data["chart"]["result"][0]
        meta = res.get("meta", {})
        closes = [c for c in res["indicators"]["quote"][0]["close"] if c is not None]
    except Exception as ex:
        sys.stderr.write(f"  Yahoo {symbol}: {ex}\n")
        return None
    price = meta.get("regularMarketPrice")
    if price is None and closes:
        price = closes[-1]
    # 24h-Änderung: letzter vs. vorletzter Tagesschluss
    prev = closes[-2] if len(closes) >= 2 else meta.get("chartPreviousClose")
    if price is None:
        return None
    change = ((price - prev) / prev * 100.0) if prev else None
    return {"price": round(float(price), 2),
            "change_24h": round(change, 2) if change is not None else None}


# ---------- Krypto (CoinGecko, Fallback) ----------
def coingecko_quotes(ids):
    if not ids:
        return {}
    try:
        raw = fetch(COINGECKO.format(ids=",".join(ids)))
        data = json.loads(raw)
    except Exception as ex:
        sys.stderr.write(f"  CoinGecko: {ex}\n")
        return {}
    out = {}
    for row in data:
        out[row.get("id")] = {
            "price": row.get("current_price"),
            "change_24h": (round(row["price_change_percentage_24h"], 2)
                           if row.get("price_change_percentage_24h") is not None else None),
        }
    return out


# ---------- News (RSS) ----------
def _tag(block: str, *names: str) -> str:
    for n in names:
        m = re.search(rf"<{n}[^>]*>(.*?)</{n}>", block, re.S | re.I)
        if m:
            t = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", m.group(1), flags=re.S)
            t = re.sub(r"<[^>]+>", "", t)
            return html.unescape(t).strip()
    return ""


def _link(block: str) -> str:
    m = re.search(r"<link[^>]*href=[\"']([^\"']+)[\"']", block, re.I)
    return m.group(1) if m else _tag(block, "link")


def fetch_news():
    items, seen = [], set()
    for source, url in FINANCE_FEEDS.items():
        try:
            xml = fetch(url)
        except Exception as ex:
            sys.stderr.write(f"  Feed {source}: {ex}\n")
            continue
        blocks = re.findall(r"<(?:item|entry)\b.*?</(?:item|entry)>", xml, re.S | re.I)
        for b in blocks[:4]:
            title = _tag(b, "title")
            if not title:
                continue
            key = re.sub(r"\W+", "", title.lower())[:60]
            if not key or key in seen:
                continue
            seen.add(key)
            pub = _tag(b, "pubDate", "published", "updated")
            datum = ""
            m = re.search(r"(\d{4})-(\d{2})-(\d{2})", pub)
            if m:
                datum = m.group(0)
            else:
                m2 = re.search(r"(\d{1,2})\s+(\w{3})\s+(\d{4})", pub)
                if m2:
                    datum = pub  # roh belassen, lesbar genug
            items.append({"title": title, "source": source,
                          "url": _link(b), "datum": datum or date.today().isoformat(),
                          "sentiment": "neutral"})
    return items[:MAX_NEWS]


def main() -> int:
    if not DATA.exists():
        sys.stderr.write(f"Fehlt: {DATA}\n")
        return 1
    data = json.loads(DATA.read_text(encoding="utf-8"))
    assets = data.get("assets", [])

    # Krypto-Fallback
    cg_ids = [a["coingecko_id"] for a in assets
              if a.get("type") == "crypto" and a.get("coingecko_id")]
    cg = coingecko_quotes(cg_ids)

    updated = 0
    for a in assets:
        if a.get("type") == "crypto":
            q = cg.get(a.get("coingecko_id"))
            if q and q.get("price") is not None:
                a["price"] = q["price"]
                a["change_24h"] = q["change_24h"]
                updated += 1
        elif a.get("type") == "stock" and a.get("yahoo_symbol"):
            q = yahoo_quote(a["yahoo_symbol"])
            if q:
                a["price"] = q["price"]
                a["change_24h"] = q["change_24h"]
                updated += 1

    # News
    news = fetch_news()
    if news:
        data["news"] = news

    data["last_updated"] = date.today().isoformat()
    data["fetched_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Märkte aktualisiert: {updated}/{len(assets)} Kurse, {len(news)} News → {DATA}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
