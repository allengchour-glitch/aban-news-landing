#!/usr/bin/env python3
"""News-Wächter: Krypto-News und Binance-Ankündigungen lesen, Wichtiges sofort melden — ohne danach zu handeln.

Quellen (gratis, ohne Konto): Binance-Ankündigungen (Delistings, neue Listings, Binance-News), RSS von Cointelegraph,
Decrypt, The Block und CoinDesk, öffentliche Telegram-Kanäle über die Web-Vorschau t.me/s/… (Watcher.Guru, Wu Blockchain —
beide spiegeln ihre X/Twitter-Meldungen; eigene Kanäle mit NEWS_TELEGRAM="kanal1,kanal2"); mit CRYPTOPANIC_KEY zusätzlich
CryptoPanic. X/Twitter direkt liest nur, wer für die X-API bezahlt. Private Telegram-Gruppen liest dein PC (calls_leser.py).
Telegram- und News-Texte sind fremde Daten: sie werden nur nach Schlagworten eingestuft und als Titel weitergeleitet.

Warum nur melden und nicht handeln? Stimmungs-Infos (z. B. Angst & Gier, das auch Social-Media-Stimmung enthält) haben unseren
Prüfstand nicht bestanden (info_pruefung.py). Gehandelt wird nur nach Regeln, die ein Prüfstand vorher bestätigt.

Alarm-Arten (Schlagworte im Titel, Gross/klein egal): Hack · Abhebungen gestoppt · Insolvenz · Stablecoin-Depeg ·
Regulierung/ETF · Delisting (BTC/ETH und deine Coins aus NEWS_COINS, z. B. «SOL,DOGE»). Jeder Eintrag wird nur einmal gemeldet.
Delistings prüft er jede Minute: Nach der Ankündigung fällt der Kurs im Median 4 % in der ersten Minute und 17 % in den
ersten 30 Minuten (delisting_pruefung.py, 112 Coins 2022–2026) — für Halter zählt jede Minute.
Aufruf: python3 tools/trading/krypto_bot/news_waechter.py [--melden]   (--melden: Alarme aufs Handy)
"""
from __future__ import annotations

import hashlib
import html
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
TELEGRAM = {"WatcherGuru": "Watcher.Guru", "wublockchainenglish": "Wu Blockchain"}  # öffentliche Kanäle (spiegeln X/Twitter)
MAX_ALTER_STUNDEN = 12  # ältere Meldungen lösen keinen Alarm mehr aus (neue Quelle, PC war aus) — nur noch «gelesen»
BEOBACHTET = {"BTC", "ETH"}  # Delisting-Alarm für die Coins des Bots — dazu deine Coins aus NEWS_COINS
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


def beobachtete(env=None):
    """BTC/ETH (der Bot) + deine Coins aus NEWS_COINS («SOL,DOGE;PEPE»)."""
    env = os.environ if env is None else env
    roh = (env.get("NEWS_COINS") or "").replace(";", ",")
    return BEOBACHTET | {c.strip().upper() for c in roh.split(",") if c.strip()}


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


def telegram_kanaele(env=None):
    """Standard-Kanäle + deine öffentlichen Kanäle aus NEWS_TELEGRAM («kanal1,@kanal2»)."""
    env = os.environ if env is None else env
    extra = [k.strip().lstrip("@") for k in (env.get("NEWS_TELEGRAM") or "").replace(";", ",").split(",") if k.strip()]
    return list(TELEGRAM) + [k for k in extra if k not in TELEGRAM and re.fullmatch(r"[A-Za-z0-9_]{4,64}", k)]


def telegram(kanal, laden=None):
    """Öffentlicher Telegram-Kanal über die Web-Vorschau t.me/s/<kanal> (ohne Konto) → Einträge (erste Zeile = Titel)."""
    roh = (laden or (lambda u: _hole(u, roh=True)))(f"https://t.me/s/{kanal}")
    text = roh.decode("utf-8", "replace") if isinstance(roh, bytes) else (roh or "")
    out = []
    for teil in text.split('class="tgme_widget_message_wrap')[1:]:
        post = re.search(r'data-post="([A-Za-z0-9_]+/\d+)"', teil)
        msg = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', teil, re.S)
        zeit = re.search(r'<time datetime="([^"]+)"', teil)
        if not (post and msg):
            continue
        inhalt = html.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", "\n", msg.group(1))))
        titel = next((z.strip() for z in inhalt.splitlines() if z.strip()), "")[:240]
        try:
            ms = int(datetime.fromisoformat(zeit.group(1)).timestamp() * 1000) if zeit else 0
        except ValueError:
            ms = 0
        if titel:
            out.append({"quelle": f"Telegram {TELEGRAM.get(kanal, '@' + kanal)}", "titel": titel, "zeit": ms,
                        "link": f"https://t.me/{post.group(1)}"})
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
    for kanal in telegram_kanaele(env):
        try:
            eintraege += telegram(kanal, laden_xml)
        except Exception as ex:  # noqa: BLE001
            fehler.append(f"Telegram {kanal}: {type(ex).__name__}")
    if env.get("CRYPTOPANIC_KEY"):
        try:
            d = (laden_json or _hole)(f"https://cryptopanic.com/api/v1/posts/?auth_token={env['CRYPTOPANIC_KEY']}&public=true")
            eintraege += [{"quelle": "CryptoPanic", "titel": p.get("title", ""), "link": p.get("url", ""),
                           "zeit": int(datetime.fromisoformat(p["published_at"].replace("Z", "+00:00")).timestamp() * 1000)
                           if p.get("published_at") else 0} for p in d.get("results", [])]
        except Exception as ex:  # noqa: BLE001
            fehler.append(f"CryptoPanic: {type(ex).__name__}")
    return _ergaenzen(eintraege), fehler


def _ergaenzen(eintraege):
    for e in eintraege:
        e["coins"] = coins_im_titel(e["titel"])
        e["id"] = hashlib.sha1((e["quelle"] + "|" + (e["link"] or e["titel"])).encode()).hexdigest()[:16]
    return eintraege


def nur_delistings(laden_json=None):
    """Schnell-Abfrage (jede Minute): nur die Binance-Delisting-Liste."""
    return _ergaenzen(binance(161, BINANCE_KATALOGE[161], laden_json))


def _titel_schluessel(titel):
    return re.sub(r"[^a-z0-9]+", " ", titel.lower()).strip()[:120]


def neue_alarme(eintraege, speicher=None, beobachtet=None, jetzt_ms=None):
    """Nur noch nicht gemeldete Einträge mit Alarm-Art. Speichert die gesehenen IDs und Titel (je die letzten 3000).
    Dieselbe Schlagzeile aus mehreren Quellen (z. B. Binance-Seite + Telegram) kommt nur einmal; älter als
    MAX_ALTER_STUNDEN → nur «gelesen», kein Alarm."""
    speicher = Path(speicher or SPEICHER)
    erstlauf = not speicher.exists()  # beim allerersten Lauf alles als gelesen merken — sonst käme die ganze Liste aufs Handy
    try:
        alt = json.loads(speicher.read_text()) if speicher.exists() else {"gesehen": []}
    except ValueError:
        alt = {"gesehen": []}
    gesehen = set(alt["gesehen"])
    alt.setdefault("titel", [])
    titel_gesehen = set(alt["titel"])
    jetzt_ms = jetzt_ms if jetzt_ms is not None else time.time() * 1000
    neu = []
    for e in sorted(eintraege, key=lambda x: x["zeit"]):
        if e["id"] in gesehen:
            continue
        gesehen.add(e["id"])
        alt["gesehen"].append(e["id"])
        tk = _titel_schluessel(e["titel"])
        doppelt = bool(tk) and tk in titel_gesehen
        if tk and not doppelt:
            titel_gesehen.add(tk)
            alt["titel"].append(tk)
        zu_alt = bool(MAX_ALTER_STUNDEN) and e["zeit"] > 1e12 and jetzt_ms - e["zeit"] > MAX_ALTER_STUNDEN * 3_600_000
        art = einstufen(e, beobachtet)
        if art and not erstlauf and not doppelt and not zu_alt:
            neu.append({**e, "alarm": art})
    alt["gesehen"] = alt["gesehen"][-3000:]
    alt["titel"] = alt["titel"][-3000:]
    alt["stand"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    alt["letzte_alarme"] = (alt.get("letzte_alarme", []) + [{k: a[k] for k in ("alarm", "quelle", "titel", "link", "zeit")} for a in neu])[-50:]
    speicher.parent.mkdir(parents=True, exist_ok=True)
    speicher.write_text(json.dumps(alt, ensure_ascii=False, indent=1))
    return neu


NEWS_MINUTEN = 30
DELISTING_SEKUNDEN = 60


def _runde(melden, holen, speicher, beobachtet):
    """Einmal lesen und Neues melden. Ein Fehler (Netz weg …) hält die Schleife nie an."""
    try:
        r = holen()
        alarme = neue_alarme(r[0] if isinstance(r, tuple) else r, speicher=speicher, beobachtet=beobachtet)
        if alarme:
            melden("📰 News-Wächter\n" + text(alarme) + "\n(nur Info — der Bot handelt nicht nach News) Keine Anlageberatung.")
    except Exception:  # noqa: BLE001
        pass


def schleife(melden, runden=None, warte_s=NEWS_MINUTEN * 60, sammeln_fn=None, speicher=None, schnell_fn=None,
             takt_s=DELISTING_SEKUNDEN, beobachtet=None, schlafen=time.sleep):
    """Alle 30 Minuten alles lesen, dazwischen jede Minute nur die Binance-Delistings. Neue Alarme → melden(text).
    Die erste Runde liest immer alles (beim allerersten Start wird dabei alles als gelesen gemerkt)."""
    beobachtet = beobachtet or beobachtete()
    n = 0
    while runden is None or n < runden:
        n += 1
        _runde(melden, sammeln_fn or sammeln, speicher, beobachtet)
        if takt_s <= 0:
            schlafen(warte_s)
            continue
        for _ in range(max(0, int(warte_s // takt_s))):
            schlafen(takt_s)
            _runde(melden, schnell_fn or nur_delistings, speicher, beobachtet)


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
    zeilen = [f"🚨 {a['alarm']}: {a['titel']} ({a['quelle']}) {a['link']}"
              + (" — früher fiel der Kurs danach im Median −4 % in 1 Min., −17 % in 30 Min." if a["alarm"] == "Delisting" else "")
              for a in alarme]
    if fehler:
        zeilen.append("ℹ️ nicht erreichbar: " + ", ".join(fehler))
    return "\n".join(zeilen)


def main():
    eintraege, fehler = sammeln()
    alarme = neue_alarme(eintraege, beobachtet=beobachtete())
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
