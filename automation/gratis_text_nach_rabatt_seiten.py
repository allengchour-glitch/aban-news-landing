#!/usr/bin/env python3
"""gratis_text_nach_rabatt_seiten.py — «gratis ab CHF 50» in FAQ, Versandseiten und Versandrichtlinie um «nach Rabatt» ergänzen (22.10.2026).

ANLASS (Betreiber «50 behalten, Text anpassen»): Alle drei Versandprofile verlangen CHF 50 NACH Rabatt; der automatische 10-%-Rabatt ab 2 Artikeln lässt Körbe von
50.00–55.55 unter 50 fallen (CHF 7 Versand). Das Versprechen muss das sagen. Theme: automation/theme_gratis_schwelle_50.py. Hier: die Texte, in denen die Zusage rechtlich/erklärend
steht — Versandrichtlinie (SHIPPING_POLICY), Seiten faq, faq-versand-lieferung, versand-lieferung. NICHT angefasst: die ~40 weiteren Marketing-/Ratgeberseiten, Blogartikel,
Kollektions- und Produkttexte mit «gratis ab CHF 50» (für Einzelartikel und Körbe ohne Mengenrabatt weiter wahr; Sammel-Lauf nur auf Anweisung).

  python3 automation/gratis_text_nach_rabatt_seiten.py              # trocken
  SCHARF=1 python3 automation/gratis_text_nach_rabatt_seiten.py     # sichert nach dropship/_ratgeber_vorher/, schreibt, liest zurück
  python3 automation/gratis_text_nach_rabatt_seiten.py --selbsttest
"""
import json
import os
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
SCHARF = os.environ.get("SCHARF") == "1"
VORHER = os.path.join(REPO, "dropship", "_ratgeber_vorher")

# (Art, Kennung, alt, neu, erwartete Anzahl)
TEXTE = [
    ("page", "faq", "Gratis Versand ab CHF 50", "Gratis Versand ab CHF 50 nach Rabatt", 2),   # Text + FAQ-Schema (JSON-LD) der Seite
    ("page", "faq-versand-lieferung", "<strong>CHF 50 liefern wir gratis</strong>",
     "<strong>CHF 50 nach Abzug von Rabatten liefern wir gratis</strong>", 1),
    ("page", "versand-lieferung", "GRATIS ab CHF 50", "GRATIS ab CHF 50 nach Rabatt", 1),
    ("policy", "SHIPPING_POLICY", "Gratis-Standardversand ab einem Bestellwert von CHF 50.–",
     "Gratis-Standardversand ab einem Bestellwert von CHF 50.– nach Abzug von Rabatten", 1),
    ("policy", "SHIPPING_POLICY", "Bei einem Bestellwert unter CHF 50.–", "Bei einem Bestellwert (nach Abzug von Rabatten) unter CHF 50.–", 1),
]


def ersetze(texte):
    """Rein: ({(art, kennung): neuer Text}, Fehler). Jede Zeile muss genau n-mal vorkommen oder schon umgestellt sein (idempotent)."""
    neu, fehler = dict(texte), []
    for art, kennung, alt, ers, n in TEXTE:
        k = (art, kennung)
        t = neu.get(k)
        if t is None:
            fehler.append(f"{art} {kennung}: fehlt")
            continue
        # Der neue Satz enthält den alten als Anfang («… ab CHF 50» ⊂ «… ab CHF 50 nach Rabatt»): schon Umgestelltes erst schützen, sonst würde ein zweiter Lauf verdoppeln
        geschuetzt = t.replace(ers, "\x00")
        c = geschuetzt.count(alt)
        if c == 0 and t.count(ers) >= n:
            continue
        if c != n:
            fehler.append(f"{art} {kennung}: «{alt[:40]}» {c}× (erwartet {n}×)")
            continue
        neu[k] = geschuetzt.replace(alt, ers).replace("\x00", ers)
    return neu, fehler


def lesen(gql):
    out, ids = {}, {}
    for h in {k for a, k, *_ in TEXTE if a == "page"}:
        d = gql('query($q:String!){pages(first:3,query:$q){nodes{id handle body}}}', {"q": "handle:" + h})["pages"]["nodes"]
        p = next((x for x in d if x["handle"] == h), None)
        if p:
            out[("page", h)], ids[("page", h)] = p["body"], p["id"]
    for pol in gql('{shop{shopPolicies{type body}}}')["shop"]["shopPolicies"]:
        if any(a == "policy" and k == pol["type"] for a, k, *_ in TEXTE):
            out[("policy", pol["type"])] = pol["body"]
    return out, ids


def schreiben(gql, art_k, text, ids):
    art, k = art_k
    if art == "page":
        r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){page{body} userErrors{message}}}', {"id": ids[art_k], "p": {"body": text}})["pageUpdate"]
        return r["userErrors"], (r["page"] or {}).get("body")
    r = gql('mutation($p:ShopPolicyInput!){shopPolicyUpdate(shopPolicy:$p){shopPolicy{body} userErrors{message}}}', {"p": {"type": k, "body": text}})["shopPolicyUpdate"]
    return r["userErrors"], (r["shopPolicy"] or {}).get("body")


def hauptlauf():
    from kaufwille_zeile import gql
    alt, ids = lesen(gql)
    neu, fehler = ersetze(alt)
    if fehler:
        print("⛔ Anker stimmen nicht — nichts geschrieben:\n  " + "\n  ".join(fehler))
        return 1
    aend = [k for k in alt if neu[k] != alt[k]]
    for k in alt:
        print(f"  {k[0]} {k[1]}: {'ändert' if k in aend else 'schon umgestellt'}")
    if not aend:
        return 0
    if not SCHARF:
        print("TROCKEN — SCHARF=1 schreibt")
        return 0
    os.makedirs(VORHER, exist_ok=True)
    fehl = 0
    for k in aend:
        sich = os.path.join(VORHER, f"{k[1]}_2026-10-22-nach-rabatt.json")
        if not os.path.exists(sich):
            json.dump({"art": k[0], "kennung": k[1], "body": alt[k]}, open(sich, "w", encoding="utf-8"), ensure_ascii=False)
        err, zurueck = schreiben(gql, k, neu[k], ids)
        time.sleep(1)
        if err or zurueck != neu[k]:
            print(f"   ⚠️ {k}: Schreiben/Rücklesen abweichend: {err or 'Text ungleich'}")
            fehl += 1
        else:
            print(f"   ✓ {k[0]} {k[1]} geschrieben und zurückgelesen")
    return 1 if fehl else 0


def selbsttest():
    probe = {}
    for art, k, alt, _, n in TEXTE:
        probe[(art, k)] = probe.get((art, k), "") + (alt + " | ") * n
    neu, f = ersetze(probe)
    ok = not f and all(neu[(a, k)].count(e) >= n for a, k, _, e, n in TEXTE)
    zw, f2 = ersetze(neu)
    ok = ok and not f2 and zw == neu
    d = dict(probe)
    d[("page", "faq")] += TEXTE[0][2]
    ok = ok and bool(ersetze(d)[1])
    print("SELBSTTEST OK: Ersetzung, Idempotenz, Doppelanker" if ok else "SELBSTTEST FEHLGESCHLAGEN")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else hauptlauf())
