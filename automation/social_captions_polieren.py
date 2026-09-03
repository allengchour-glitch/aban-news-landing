#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""social_captions_polieren.py — die offenen Social-Texte auf die Wahrheit bringen.

Betreiber 03.09.2026: «tiktok und insta alles polish». Gemessen an den 82 offenen
Zeilen von `social/posts_image.csv`:
  · 77 versprechen «Blitzversand aus der Schweiz» / «Schweizer Lager» — die beworbene
    Ware ist aber fast durchweg CJ-Direktversand (10–20 Werktage). Das ist genau die
    Klasse, die im ganzen Shop am 14.08. auf EINE Wahrheit gebracht wurde; in den
    Social-Texten stand sie unverändert weiter.
  · 34 werben mit «Kauf auf Rechnung» ohne Klarna zu nennen — Rechnung gibt es NUR
    über Klarna (Korrektur vom 31.08. im USP-Block, hier nie nachgezogen).
  ·  7 tragen einen LEEREN Hashtag («#Bambus # #schweiz»).
Geprüft wird je Zeile am PRODUKT (die Shopify-ID steht am Ende der Zeilen-ID): trägt es
`ch-lager`, ist die Zusage wahr und bleibt. Sonst wird sie durch eine wahre ersetzt.
Ist das Produkt nicht mehr aktiv, wird die Zeile NICHT umgeschrieben, sondern als
`produkt-weg-skip` markiert — ein schöner Text für Ware, die es nicht gibt, hilft niemandem.

DRY=1 zeigt jede Änderung zum Lesen. Es wird NICHTS gepostet.
"""
import csv, json, os, re, ssl, sys, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(REPO, "social/posts_image.csv")
SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
DRY = os.environ.get("DRY") == "1"

def gql(q, v=None):
    for i in range(8):
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
            data=json.dumps({"query": q, "variables": v or {}}).encode(),
            headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        try:
            d = json.loads(urllib.request.urlopen(req, context=CTX, timeout=60).read())
        except Exception:
            continue
        if d.get("data") is not None:
            return d
    return {}

# Ganze Halbsätze, damit kein Fragment stehen bleibt (Lehre 21.08.: ein halber Satz
# ist schlimmer als ein fehlender).
# Der Anschluss an den naechsten Halbsatz wird MIT gestrichen — sonst bleibt
# «✨ und Kauf auf Rechnung» oder «⌚ – bequem bestellen» stehen. Ein global
# angewandter Regel-Rest wuerde auch echte «und» treffen; hier haengt er am
# Streichmuster selbst und kann nur an der Nahtstelle wirken.
ANSCHLUSS = r"(?:\s*(?:und|&|sowie|–|—|-|·|,))?"
CH_WEG = [
    (re.compile(r"\s*(?:–|-|·|,)?\s*(?:mit|dank)\s+Blitzversand\s+aus\s+der\s+Schweiz(?:\s+direkt\s+zu\s+dir)?" + ANSCHLUSS, re.I), ""),
    (re.compile(r"\s*(?:–|-|·|,)?\s*Blitzversand\s+aus\s+der\s+Schweiz(?:\s+direkt\s+zu\s+dir)?" + ANSCHLUSS, re.I), ""),
    (re.compile(r"\s*(?:–|-|·|,)?\s*(?:mit|dank)\s+(?:dem\s+)?Versand\s+aus\s+(?:dem\s+)?Schweizer\s+Lager" + ANSCHLUSS, re.I), ""),
    (re.compile(r"\s*(?:–|-|·|,)?\s*(?:ab|aus)\s+Schweizer\s+Lager(?:\s+in\s+1\s*[–-]\s*2\s+Tagen)?" + ANSCHLUSS, re.I), ""),
    (re.compile(r"\s*(?:–|-|·|,)?\s*in\s+1\s*[–-]\s*2\s+(?:Werk)?[Tt]agen\s+bei\s+dir" + ANSCHLUSS, re.I), ""),
]
RECHNUNG = re.compile(r"Kauf auf Rechnung(?!\s+mit Klarna)", re.I)

def produkt_id(zeilen_id):
    m = re.search(r"(\d{12,})\s*$", zeilen_id or "")
    return m.group(1) if m else None

def saeubern(c, ch_lager):
    n = c
    if not ch_lager:
        for mus, e in CH_WEG:
            n = mus.sub(e, n)
    n = RECHNUNG.sub("Kauf auf Rechnung mit Klarna", n)
    n = re.sub(r"#(?![\wÄÖÜäöüß])", "", n)          # leerer Hashtag
    n = re.sub(r"[ \t]{2,}", " ", n)
    n = re.sub(r"\s+([,.!?])", r"\1", n)
    n = re.sub(r"(?:\s*[·–-])+\s*(?=[✨🌿🔗]|$)", " ", n)   # zurückgebliebene Trenner
    return n.strip()

def main():
    rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
    felder = list(rows[0].keys())
    offen = [r for r in rows if (r.get("status") or "").strip() == "ready"]
    ids = {}
    for r in offen:
        p = produkt_id(r.get("id"))
        if p: ids.setdefault(p, []).append(r)
    print(f"offen: {len(offen)} · davon mit Produkt-ID: {sum(len(v) for v in ids.values())}")
    stand = {}
    liste = list(ids)
    for i in range(0, len(liste), 25):
        teil = liste[i:i + 25]
        f = " ".join(f'p{j}: product(id:"gid://shopify/Product/{p}"){{status tags title}}'
                     for j, p in enumerate(teil))
        d = (gql("query{" + f + "}").get("data") or {})
        if not d:
            print("⛔ Shopify stumm — Abbruch, es wird nichts geschrieben."); return 1
        for j, p in enumerate(teil):
            stand[p] = d.get(f"p{j}")
    geaendert = weg = ch = 0
    for p, zeilen in ids.items():
        o = stand.get(p)
        for r in zeilen:
            if o is None or o.get("status") != "ACTIVE":
                r["status"] = "produkt-weg-skip"; weg += 1; continue
            hat_ch = "ch-lager" in (o.get("tags") or [])
            if hat_ch: ch += 1
            alt = r.get("caption") or ""
            neu = saeubern(alt, hat_ch)
            if neu != alt:
                geaendert += 1
                if DRY:
                    print(f"\n  {o['title'][:46]}  (ch-lager={hat_ch})")
                    print(f"    ALT: {alt[:150]}")
                    print(f"    NEU: {neu[:150]}")
                r["caption"] = neu
    print(f"\nTexte geaendert: {geaendert} · Produkt weg: {weg} · echte CH-Lager-Ware: {ch}")
    if DRY:
        print("DRY — nichts geschrieben"); return 0
    with open(CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=felder); w.writeheader(); w.writerows(rows)
    print("geschrieben:", CSV)
    return 0

sys.exit(main())
