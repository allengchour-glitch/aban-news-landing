#!/usr/bin/env python3
"""top_produktseiten_check.py — prüft die meistbesuchten Produkt-Landeseiten (12-Tage-Plan Tag 5, 04.10.2026).

Fragen je Seite (nur Menschen, letzte TAGE Tage, Top N nach Sitzungen):
  kaufbar     ACTIVE + im Onlineshop veröffentlicht + mind. eine Variante verfügbar
  bilder      Zahl der Bild-Medien (Ziel ≥ 5; POD/«Selbst gestalten» ≥ 2 — Druckvorschauen, kein Fotoset)
  groesse     Kleidung/Schuhe brauchen eine Option «Grösse/Size» — NUR dann blendet das Theme die
              Grössentabelle ein (templates/product.json, Bedingung `on contains 'grösse'|'groesse'|'size'`)
  empfehlung  /recommendations/products.json liefert ≥ 4 kaufbare Empfehlungen (Theme: related, 4 Karten)
Lieferzeit wird nicht je Produkt geprüft: der Balken im Theme hat einen else-Zweig und erscheint immer.

Schreibt NICHTS im Shop. Ausgabe: Tabelle auf stdout + JSON nach ARG1 (optional).
"""
import json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

TAGE = int(os.environ.get("TAGE", "30"))
N = int(os.environ.get("N", "30"))
KLEIDUNG = re.compile(r"\b(kleid|rock|hose|jeans|shorts|shirt|t-shirt|bluse|top|pullover|hoodie|jacke|mantel|weste|"
                      r"bikini|badeanzug|set|anzug|overall|jumpsuit|tunika|sweater|strickjacke|cardigan|"
                      r"sneaker|schuh|sandale|sandalen|loafer|stiefel|pumps|mule|sandalette|leggings|body|strampler)\w*",
                      re.I)
KEINE_GROESSE = re.compile(r"\b(kristall|sticker|ring|kette|halskette|armband|uhr|cap|hat|kissen|lupe|rizinus|tasche)",
                           re.I)


def top_seiten():
    q = (f"FROM sessions SHOW sessions, sessions_with_cart_additions GROUP BY landing_page_path "
         f"WHERE human_or_bot_session = 'human' AND landing_page_type = 'Product' SINCE -{TAGE}d UNTIL today "
         f"ORDER BY sessions DESC LIMIT {N + 10}")
    d = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})["shopifyqlQuery"]
    if d["parseErrors"]:
        raise RuntimeError(d["parseErrors"])
    aus, seen = [], set()
    for r in d["tableData"]["rows"]:
        m = re.search(r"/products/([^/?#]+)", r.get("landing_page_path") or "")
        if m and m.group(1) not in seen:
            seen.add(m.group(1))
            aus.append((m.group(1), int(float(r["sessions"])), int(float(r["sessions_with_cart_additions"]))))
    return aus[:N]


Q = """query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id legacyResourceId title status productType
  onlineStoreUrl tags options{name values} totalInventory tracksInventory
  media(first:50){nodes{mediaContentType}} variants(first:100){nodes{availableForSale}} } }"""


def empfehlungen(pid):
    for _ in range(3):
        try:
            out = subprocess.run(["curl", "-s", "--max-time", "25",
                                  f"https://luxestyle.ch/recommendations/products.json?product_id={pid}&limit=4"],
                                 capture_output=True, text=True, timeout=30).stdout
            return [p.get("title", "") for p in json.loads(out).get("products", []) if p.get("available")]
        except Exception:
            continue
    return None


def weiterleitung(h):
    """Ziel einer 301 für /products/h und ob es kaufbar ist — ein Entwurf MIT kaufbarem Ziel ist kein Mangel."""
    n = gql('query($q:String!){urlRedirects(first:1,query:$q){nodes{target}}}',
            {"q": f"path:/products/{h}"})["urlRedirects"]["nodes"]
    if not n:
        return None, False
    ziel = n[0]["target"]
    m = re.match(r"/products/([^/?#]+)", ziel)
    if m:
        z = gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){status onlineStoreUrl '
                'variants(first:50){nodes{availableForSale}}}}', {"h": m.group(1)})["productByIdentifier"]
        return ziel, bool(z and z["status"] == "ACTIVE" and z["onlineStoreUrl"]
                          and any(v["availableForSale"] for v in z["variants"]["nodes"]))
    m = re.match(r"/collections/([^/?#]+)", ziel)
    if m:
        c = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){productsCount{count}}}',
                {"h": m.group(1)})["collectionByIdentifier"]
        return ziel, bool(c and c["productsCount"]["count"] >= 8)
    return ziel, True


def pruefe(h):
    p = gql(Q, {"h": h})["productByIdentifier"]
    if not p:
        ziel, ok = weiterleitung(h)
        return {"handle": h, "fehlt": True, "weiterleitung": ziel, "ziel_ok": ok}
    if not (p["status"] == "ACTIVE" and p["onlineStoreUrl"]):
        ziel, ok = weiterleitung(h)
        return {"handle": h, "titel": p["title"], "status": p["status"], "weiterleitung": ziel, "ziel_ok": ok}
    bilder = sum(1 for m in p["media"]["nodes"] if m["mediaContentType"] == "IMAGE")
    videos = sum(1 for m in p["media"]["nodes"] if m["mediaContentType"] in ("VIDEO", "EXTERNAL_VIDEO"))
    optnamen = [o["name"] for o in p["options"]]
    hat_groesse = any(re.search(r"grösse|groesse|size", o, re.I) for o in optnamen)
    braucht = bool(KLEIDUNG.search(p["title"] + " " + (p["productType"] or ""))) and not KEINE_GROESSE.search(p["title"])
    emp = empfehlungen(p["legacyResourceId"])
    return {"handle": h, "titel": p["title"], "status": p["status"], "online": bool(p["onlineStoreUrl"]),
            "verfuegbar": any(v["availableForSale"] for v in p["variants"]["nodes"]),
            "bilder": bilder, "videos": videos,
            "pod": "pod" in [t.lower() for t in p["tags"]] or h.startswith("pod-") or "selbst-gestalten" in h
                   or "selbstgestalten" in h, "optionen": optnamen,
            "braucht_groesse": braucht, "hat_groesse": hat_groesse,
            "empfehlungen": emp}


def maengel(r):
    if "weiterleitung" in r:
        if r["weiterleitung"] and r["ziel_ok"]:
            return []
        return [f"{'fehlt' if r.get('fehlt') else r['status']} ohne kaufbares 301-Ziel ({r['weiterleitung']})"]
    m = []
    if not r["verfuegbar"]:
        m.append("ausverkauft")
    # POD («Selbst gestalten», Sticker): Bilder sind Druck-Vorschauen + Grössenvorschau, kein Fotoset — Ziel 2
    if r["bilder"] < (2 if r["pod"] else 5):
        m.append(f"{r['bilder']} Bilder")
    if r["braucht_groesse"] and not r["hat_groesse"]:
        m.append("keine Grössen-Option → keine Tabelle")
    if r["empfehlungen"] is None:
        m.append("Empfehlungen unklar")
    elif len(r["empfehlungen"]) < 4:
        m.append(f"{len(r['empfehlungen'])} Empfehlungen")
    return m


def main():
    zeilen = []
    for h, s, w in top_seiten():
        r = pruefe(h)
        r.update(sitzungen=s, warenkorb=w, maengel=maengel(r))
        zeilen.append(r)
        stand = ", ".join(r["maengel"]) or ("ok → 301 " + r["weiterleitung"] if r.get("weiterleitung") else "ok")
        print(f"{s:>3} {w} {stand:<45} {h}", flush=True)
    ok = sum(1 for r in zeilen if not r["maengel"])
    print(f"TOP{N} ({TAGE} T): {ok}/{len(zeilen)} ohne Mangel")
    if len(sys.argv) > 1:
        json.dump(zeilen, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
