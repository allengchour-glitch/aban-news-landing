#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""querbeet_kuratieren.py — EINE Reihe mit «von bissel allen Kategorien etwas».

Betreiber 03.09.2026: «webseite mehr tolle produkten von bissel allen kategorien etwas?».
Die Startseite hat 25 Sektionen (Shopify-Deckel) und ~180 Karten (gemessene Stabilitaets-
grenze, 31.08.) — mehr Kategorien gehen also nur im TAUSCH. Statt weiter Reihen zu tauschen
zieht dieses Werkzeug aus JEDER Welt ein gutes Stueck in EINE Reihe.

AUSWAHL, und warum nicht «bestbewertet»: Bewertungen gibt es nur auf ~5 % der Ware
(Judge.me 1'706 Bewertungen auf ~250 Produkten) — «bestbewertet je Welt» haette fuer die
meisten Welten gar keinen Kandidaten. Gewaehlt wird deshalb nach dem, was der Katalog
ueberall hergibt und was eine Produktseite gut macht:
  · mindestens 3 Bilder            (eine Karte mit einem Bild sieht duenn aus)
  · Preis ab CHF 19                (die 14.90-Fuellware ist kein Aushaengeschild)
  · im Google-Kanal                (dort haben die Risiko-Waechter schon Ja gesagt)
  · kein Risiko-/Kostuem-/Wirkversprechen-Tag
  · eine Bewertung ist ein PLUS, keine Bedingung
Innerhalb der Welt gewinnt das juengste Produkt — so frischt sich die Reihe von selbst auf
(dieselbe Begruendung wie CREATED_DESC, 29.08.).

SELBSTABRAEUMEND wie die Hype-Reihe: jedes Produkt traegt `querbeet-seit-JJJJ-MM-TT`;
nach TAGE Tagen nimmt der naechste Lauf `querbeet` wieder weg. Die Ware bleibt im Shop.
DRY=1 zeigt die Auswahl zum Lesen, ohne etwas zu schreiben.
"""
import json, os, re, ssl, time, urllib.request, datetime as dt

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
DRY = os.environ.get("DRY") == "1"
TAGE = int(os.environ.get("TAGE", "10"))
TAG = "querbeet"
HEUTE = dt.date.today().isoformat()
LEDGER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "dropship/_querbeet.txt")

# Eine Welt = ein Menuepunkt. Reihenfolge = Reihenfolge in der Reihe.
WELTEN = ["damen-mode", "fur-ihn", "schuhe", "premium-schmuck", "uhren",
          "beauty-pflege", "parfum-duefte", "wohnen-dekoration", "sub-kueche",
          "elektronik-technik", "smartwatches-wearables", "kopfhoerer-audio",
          "gaming", "sub-haustier", "sub-baby-kids", "spielzeug",
          "fitness-training", "sub-taschen", "auto-kfz-zubehoer", "handy-zubehoer"]

# ⚠️ Was auf der Startseite nichts zu suchen hat. Die Liste ist die Summe teurer Funde:
# Kostuem/Spielzeugdeko (11.08.), Intimes und Wirkversprechen (12.08./29.08.),
# verdeckte Ueberwachung und Waffen (29.08.), zu kleine Bilder (26.08.).
RISIKO_TAG = {"kostuem-accessoire", "ft-damenkostuem", "ft-herrenkostuem", "ft-kinderkostuem",
              "18plus", "raucher", "waffe-pruefen", "waffengesetz-verboten",
              "verdeckte-ueberwachung", "abhoergeraet-pruefen", "medizinprodukt-pruefen",
              "bild-zu-klein", "hype-bild-schwach", "duplikat-auto-draft",
              "cj-nicht-versendbar-ch", "cj-abgekuendigt", "marge-verlust-draft",
              "nicht-bewerben", "nur-onlineshop", "lizenz-risiko"}
NICHT_TITEL = re.compile(
    r"(kost[üu]m|per[üu]cke|fasnacht|halloween|intim|vibrator|dessous"
    r"|(?:wimpern|haar|bart|brust)wachstum|gegen\s+(?:pigmentflecken|falten|akne|haarausfall)"
    r"|abnehm|whitening|facelift|blutzucker|blutdruck)", re.I)


def gql(q, v=None, versuche=10):
    for i in range(versuche):
        req = urllib.request.Request(
            f"https://{SHOP}/admin/api/2024-10/graphql.json",
            data=json.dumps({"query": q, "variables": v or {}}).encode(),
            headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        try:
            d = json.loads(urllib.request.urlopen(req, context=CTX, timeout=60).read())
        except Exception:
            time.sleep(2 + 2 * i); continue
        if d.get("data") is not None:
            return d
        ts = (d.get("extensions") or {}).get("cost", {}).get("throttleStatus") or {}
        if ts:
            need = d["extensions"]["cost"].get("requestedQueryCost", 60) - ts.get("currentlyAvailable", 0)
            time.sleep(max(2, need / max(ts.get("restoreRate", 50), 1) + 1))
        else:
            time.sleep(2 + 2 * i)
    return {}


Q_WELT = '''query($q:String!){products(first:100,query:$q,sortKey:CREATED_AT,reverse:true){
  nodes{id title tags mediaCount{count} featuredImage{url}
    priceRangeV2{minVariantPrice{amount}}
    r:metafield(namespace:"reviews",key:"rating"){value}
    rc:metafield(namespace:"reviews",key:"rating_count"){value}
    resourcePublicationsV2(first:10){nodes{publication{name}}}}}}'''


def taugt(p):
    if (p.get("mediaCount") or {}).get("count", 0) < 3:      return "unter 3 Bilder"
    if not p.get("featuredImage"):                            return "kein Bild"
    try:
        if float(p["priceRangeV2"]["minVariantPrice"]["amount"]) < 19: return "unter CHF 19"
    except Exception:                                         return "kein Preis"
    if set(p["tags"]) & RISIKO_TAG:                           return "Risiko-Tag"
    if NICHT_TITEL.search(p["title"]):                        return "Titel"
    pubs = [n["publication"]["name"] for n in p["resourcePublicationsV2"]["nodes"]]
    if not any("Google" in x for x in pubs):                  return "nicht im Google-Kanal"
    return ""


def bewertung(p):
    """Eine Bewertung ist ein Plus, keine Bedingung."""
    try:
        return (int(p["rc"]["value"]), float(json.loads(p["r"]["value"])["value"]))
    except Exception:
        return (0, 0.0)


def gleiche_warenart(a, b):
    """Zwei Titel mit einem gemeinsamen Wort ab 10 Zeichen sind dieselbe Ware —
    im Deutschen ist das lange Wort fast immer das Grundwort (Lehre 29.08.)."""
    wa = {w.lower() for w in re.findall(r"[A-Za-zÄÖÜäöüß]{10,}", a)}
    wb = {w.lower() for w in re.findall(r"[A-Za-zÄÖÜäöüß]{10,}", b)}
    return bool(wa & wb)


def main():
    ausw, verworfen = [], {}
    for h in WELTEN:
        g = gql('query($q:String!){collections(first:1,query:$q){nodes{id title}}}',
                {"q": f"handle:{h}"})
        n = ((g.get("data") or {}).get("collections") or {}).get("nodes") or []
        if not n:
            print(f"  ⚠️ {h}: Kollektion nicht gefunden"); continue
        num = n[0]["id"].split("/")[-1]
        d = gql(Q_WELT, {"q": f"collection_id:{num} AND status:active"})
        prods = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
        if not prods:
            print(f"  ⚠️ {h}: keine Antwort (stumm ist kein Befund)"); continue
        gut = []
        for p in prods:
            grund = taugt(p)
            if grund:
                verworfen[grund] = verworfen.get(grund, 0) + 1; continue
            gut.append(p)
        # ⚠️ «Juengstes zuerst» allein waehlte, was der Grind gerade importiert: ein
        # Apple-Watch-ARMBAND als Gesicht der Elektronik, eine Smartwatch bei den
        # Kopfhoerern. Eine Bewertung schlaegt alles; danach entscheidet, wie reich die
        # Produktseite ist (Bilderzahl) und der Preis — beides trennt ein echtes
        # Aushaengeschild von Zubehoer. Das Alter ist nur noch der letzte Schiedsrichter.
        gut.sort(key=lambda p: (-bewertung(p)[0], -bewertung(p)[1],
                                -(p.get("mediaCount") or {}).get("count", 0),
                                -float(p["priceRangeV2"]["minVariantPrice"]["amount"])))
        for p in gut:
            if any(gleiche_warenart(p["title"], q["title"]) for _, q in ausw):
                continue
            ausw.append((n[0]["title"], p)); break
        else:
            print(f"  ⚠️ {h}: kein Kandidat")
    print(f"\nAusgewaehlt: {len(ausw)} von {len(WELTEN)} Welten"
          f"   (verworfen: {', '.join(f'{k} {v}' for k, v in sorted(verworfen.items()))})")
    for welt, p in ausw:
        b = bewertung(p)
        stern = f"  {b[1]:.1f}★/{b[0]}" if b[0] else ""
        print(f"  {welt[:26]:<28} {p['title'][:52]}{stern}")
    if DRY or not ausw:
        print("DRY — nichts geschrieben" if DRY else "keine Auswahl"); return

    neu = {p["id"] for _, p in ausw}
    # Abraeumen: was laenger als TAGE in der Reihe steht, faellt raus
    alt = gql('query($q:String!){products(first:100,query:$q){nodes{id title tags}}}',
              {"q": f"status:active AND tag:{TAG}"})
    raus = 0
    for p in (((alt.get("data") or {}).get("products") or {}).get("nodes") or []):
        if p["id"] in neu:
            continue
        seit = next((t.split("-", 1)[1] for t in p["tags"] if t.startswith("querbeet-seit-")), None)
        if seit:
            try:
                if (dt.date.today() - dt.date.fromisoformat(seit.replace("seit-", ""))).days < TAGE:
                    continue
            except Exception:
                pass
        gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
            {"id": p["id"], "t": [TAG] + [t for t in p["tags"] if t.startswith("querbeet-seit-")]})
        raus += 1
    gesetzt = 0
    with open(LEDGER, "a", encoding="utf-8") as f:
        for welt, p in ausw:
            if TAG in p["tags"]:
                continue
            r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                    {"id": p["id"], "t": [TAG, f"querbeet-seit-{HEUTE}"]})
            e = ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors") or []
            if e:
                print(f"  X {p['title'][:40]}: {e[0]['message']}"); continue
            f.write(f"{p['id']}\t{HEUTE}\t{welt}\n"); gesetzt += 1
    print(f"neu in der Reihe: {gesetzt} · abgeraeumt: {raus}")


main()
