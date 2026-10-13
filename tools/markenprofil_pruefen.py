#!/usr/bin/env python3
"""markenprofil_pruefen.py — misst das Shopify-Markenprofil (Einstellungen → Marke) und die Startseiten-Beschreibung (13.10.2026).

ANLASS: Richter «mehr Käufer» B1. Agenten (ChatGPT, Copilot) und die Shop-App lesen `shop.brand` und `shop.description`
über die Storefront-API. GEMESSEN 13.10. 21:00 UTC: Slogan/Logos/Titelbild/Farben = null, Kurzbeschreibung mitten im
Wort abgeschnitten («…persönlich ausgewähl»), Beschreibung «… in die Schweiz und nach Deutschland».
Die Felder lassen sich über KEINE Admin-API schreiben (Schema geprüft: Shop hat kein `brand`, keine Mutation) —
setzen kann sie nur der Betreiber im Admin. Dieses Werkzeug prüft danach, ob alles angekommen ist. Schreibt nichts.

  python3 tools/markenprofil_pruefen.py           # Tabelle, Exit 0 = alles wie Soll, 1 = Abweichung
  python3 tools/markenprofil_pruefen.py --zeile   # eine Zeile «MARKENPROFIL: …» (für Aufseher/Wache)

Token: env SHOPIFY_STOREFRONT_TOKEN oder /tmp/sf_token.txt. Soll-Texte: dropship/MARKENPROFIL-B1-2026-10-13.md.
"""
import json, os, sys, urllib.request

SHOP = "au3j0y-hq.myshopify.com"
SOLL = {
    "slogan": "Online-Shop aus Belp für die Schweiz & Liechtenstein",
    "shortDescription": "LuxeStyle aus Belp: Mode, Beauty, Wohnen & Geschenke. Versand in die Schweiz und nach Liechtenstein, "
                        "TWINT & Klarna, 30 Tage Rückgabe.",
    "description": "LuxeStyle aus Belp: Mode, Beauty, Wohnen & Geschenke online. Versand in die Schweiz und nach Liechtenstein, "
                   "TWINT, Klarna & Karte, 30 Tage Rückgabe.",
}
# Shopify-Vorgaben (help.shopify.com/en/manual/promoting-marketing/managing-brand-assets, gelesen 13.10.2026)
MIN = {"logo": (512, 0), "squareLogo": (512, 512), "coverImage": (1920, 1080)}
VERBOTEN = ("Deutschland", "Österreich", "EU-weit")

Q = """{ shop { description brand { slogan shortDescription
  logo { image { url width height } } squareLogo { image { url width height } } coverImage { image { url width height } }
  colors { primary { background foreground } secondary { background foreground } } } } }"""


def token():
    t = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "").strip()
    if not t and os.path.exists("/tmp/sf_token.txt"):
        t = open("/tmp/sf_token.txt").read().strip()
    if not t:
        raise SystemExit("MARKENPROFIL: unklar (kein Storefront-Token: SHOPIFY_STOREFRONT_TOKEN oder /tmp/sf_token.txt)")
    return t


def lesen():
    r = urllib.request.Request(f"https://{SHOP}/api/2026-01/graphql.json", data=json.dumps({"query": Q}).encode(),
                               headers={"X-Shopify-Storefront-Access-Token": token(), "Content-Type": "application/json"})
    d = json.loads(urllib.request.urlopen(r, timeout=60).read())
    if d.get("errors") or not d.get("data"):
        raise SystemExit("MARKENPROFIL: unklar (Storefront-API: " + json.dumps(d.get("errors"))[:200] + ")")
    return d["data"]["shop"]


def pruefen(shop):
    b = shop.get("brand") or {}
    out = []  # (feld, ok, text)
    for feld in ("slogan", "shortDescription"):
        ist = b.get(feld)
        out.append((feld, ist == SOLL[feld], "leer" if not ist else ("wie Soll" if ist == SOLL[feld] else f"anders: «{ist[:70]}…»")))
    ist = shop.get("description") or ""
    schlecht = [w for w in VERBOTEN if w in ist]
    out.append(("description", ist == SOLL["description"] and not schlecht,
                "wie Soll" if ist == SOLL["description"] else (f"enthält {schlecht}" if schlecht else f"anders: «{ist[:70]}…»")))
    for feld, (mw, mh) in MIN.items():
        img = ((b.get(feld) or {}).get("image") or {})
        w, h = img.get("width") or 0, img.get("height") or 0
        if not img.get("url"):
            out.append((feld, False, "fehlt"))
        else:
            gross = w >= mw and h >= mh and (feld != "squareLogo" or w == h)
            out.append((feld, gross, f"{w}×{h} " + ("ok" if gross else f"zu klein/unpassend (Soll ≥ {mw}×{mh})")))
    farben = b.get("colors") or {}
    prim = [c for c in (farben.get("primary") or []) if c.get("background")]
    sek = [c for c in (farben.get("secondary") or []) if c.get("background")]
    out.append(("colors", bool(prim), f"primär {[c['background'] for c in prim]} · sekundär {[c['background'] for c in sek]}"))
    return out


def main():
    res = pruefen(lesen())
    offen = [f for f, ok, _ in res if not ok]
    if "--zeile" in sys.argv:
        print("MARKENPROFIL: " + ("ok (7/7)" if not offen else f"{len(res) - len(offen)}/{len(res)} · offen: {', '.join(offen)}"))
    else:
        for f, ok, t in res:
            print(f"{'✅' if ok else '❌'} {f:17s} {t}")
    sys.exit(0 if not offen else 1)


if __name__ == "__main__":
    main()
