#!/usr/bin/env python3
"""merkliste_wache.py — hängt die Merkliste (Herz auf den Karten + Seite /pages/merkliste) noch zusammen? (18.10.2026)

ANLASS: Die Merkliste besteht aus ZWEI Stücken, die sich nur über den localStorage-Schlüssel `lux_wish` kennen: das Herz auf den
Produktkarten (Skript in layout/theme.liquid) und die Seite (sections/lux-merkliste.liquid, eingebunden in templates/page.merkliste.json).
Ändert eine Theme-Überarbeitung, eine andere Sitzung oder der Theme-Editor eines der Stücke, bleibt die Seite still leer — die Besucherin
sieht «Deine Merkliste ist leer», obwohl sie Herzen gesetzt hat; kein Fehler, kein Log. Am 18.10. wurde die Seite überarbeitet
(Handle-Prüfung, tote Produkte entfernen, Ausverkauft-Kennzeichen, Warenkorb-Knopf, «Alle entfernen»; Test: tools/merkliste_test.mjs).

PRÜFT (nur lesend, Admin-API, Haupt-Theme):
  1. sections/lux-merkliste.liquid == Soll (dropship/theme_live_backup/lux-merkliste.liquid.neu-2026-10-18) — Abweichung heisst: jemand hat
     die Seite überschrieben (Rückweg: Soll-Datei hochladen, Vorgänger liegt in ...vor-2026-10-18)
  2. layout/theme.liquid trägt das Herz-Skript mit demselben Schlüssel `lux_wish` und der Klasse `.lux-wish`
  3. templates/page.merkliste.json bindet die Sektion `lux-merkliste` ein
Modi:  (ohne)  eine Zeile + «FERTIG», Exit 0 immer;  --selbsttest  prüft die Entscheidungen an Texten, Exit 1 bei Fehler.
Ändert NICHTS im Shop.
"""
import json, os, re, subprocess, sys, urllib.error, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOLL = os.path.join(REPO, "dropship", "theme_live_backup", "lux-merkliste.liquid.neu-2026-10-18")
SHOP = "au3j0y-hq.myshopify.com"
DATEIEN = ["sections/lux-merkliste.liquid", "layout/theme.liquid", "templates/page.merkliste.json"]


def pruefen(sektion, layout, vorlage, soll):
    """Reine Funktion: → Liste von Befunden (leer = in Ordnung)."""
    b = []
    if sektion is None:
        b.append("Sektion sections/lux-merkliste.liquid fehlt im Live-Theme")
    elif sektion.strip() != soll.strip():
        b.append(f"Sektion weicht vom Soll ab ({len(sektion)} statt {len(soll)} Zeichen) — überschrieben? Soll: dropship/theme_live_backup/lux-merkliste.liquid.neu-2026-10-18")
    elif "lux_wish" not in sektion:
        b.append("Sektion liest nicht mehr den Schlüssel lux_wish")
    if layout is None:
        b.append("layout/theme.liquid nicht lesbar")
    else:
        if not re.search(r"KEY\s*=\s*'lux_wish'", layout):
            b.append("Herz-Skript in theme.liquid schreibt nicht mehr nach 'lux_wish'")
        if ".lux-wish" not in layout:
            b.append("Herz-Klasse .lux-wish fehlt in theme.liquid")
    if vorlage is None:
        b.append("templates/page.merkliste.json fehlt")
    elif '"lux-merkliste"' not in vorlage:
        b.append("page.merkliste.json bindet die Sektion lux-merkliste nicht mehr ein")
    return b


def secret_kandidaten():
    yield os.environ.get("SHOPIFY_CLIENT_SECRET", "")
    try:   # abgelehnter Umgebungswert (15.10.: 60 statt 38 Zeichen) → Wert aus der Secrets-Datei
        yield subprocess.run(["bash", "-c", '. /tmp/secrets_env.sh >/dev/null 2>&1; printf %s "${SHOPIFY_CLIENT_SECRET:-}"'],
                             capture_output=True, text=True, timeout=10).stdout
    except Exception:
        yield ""


def post(u, d, h):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, data=json.dumps(d).encode(), headers=h), timeout=60))


def live_lesen():
    cid = os.environ.get("SHOPIFY_CLIENT_ID", "")
    tok = None
    for sec in secret_kandidaten():
        if not sec:
            continue
        try:
            tok = post(f"https://{SHOP}/admin/oauth/access_token", {"client_id": cid, "client_secret": sec, "grant_type": "client_credentials"},
                       {"Content-Type": "application/json", "User-Agent": "luxe-merkliste-wache"})["access_token"]
            break
        except urllib.error.HTTPError:
            continue
    if not tok:
        return None
    H = {"Content-Type": "application/json", "X-Shopify-Access-Token": tok, "User-Agent": "luxe-merkliste-wache"}
    G = f"https://{SHOP}/admin/api/2025-01/graphql.json"
    t = post(G, {"query": "{themes(first:1,roles:[MAIN]){nodes{id}}}"}, H)["data"]["themes"]["nodes"][0]["id"]
    q = ("query($t:ID!,$f:[String!]!){theme(id:$t){files(filenames:$f){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}")
    n = post(G, {"query": q, "variables": {"t": t, "f": DATEIEN}}, H)["data"]["theme"]["files"]["nodes"]
    return {x["filename"]: x["body"]["content"] for x in n}


def selbsttest():
    soll = "<div>Merkliste lux_wish</div>"
    layout = "x var KEY='lux_wish'; .lux-wish{}"
    vorlage = '{"sections":{"wl":{"type":"lux-merkliste"}}}'
    fehler = []
    if pruefen(soll, layout, vorlage, soll):
        fehler.append("in Ordnung wurde beanstandet")
    for name, args, stichwort in (
        ("Sektion fehlt", (None, layout, vorlage, soll), "fehlt im Live-Theme"),
        ("Sektion geändert", (soll + "x", layout, vorlage, soll), "weicht vom Soll ab"),
        ("Schlüssel umbenannt", (soll, layout.replace("lux_wish", "wish2"), vorlage, soll), "nicht mehr nach 'lux_wish'"),
        ("Herz-Klasse weg", (soll, "var KEY='lux_wish'", vorlage, soll), ".lux-wish fehlt"),
        ("Vorlage ohne Sektion", (soll, layout, '{"sections":{}}', soll), "bindet die Sektion"),
        ("Layout unlesbar", (soll, None, vorlage, soll), "nicht lesbar"),
    ):
        b = pruefen(*args)
        if not any(stichwort in x for x in b):
            fehler.append(f"{name}: nicht erkannt ({b})")
    print("SELBSTTEST merkliste_wache:", "OK (6 Abweichungen erkannt, Sollzustand unbeanstandet)" if not fehler else "FEHLER " + "; ".join(fehler))
    return 0 if not fehler else 1


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    try:
        soll = open(SOLL, encoding="utf-8").read()
        live = live_lesen()
    except Exception as e:
        print(f"MERKLISTE-WACHE: unklar ({type(e).__name__}: {e})")
        print("FERTIG (unklar)")
        return
    if live is None:
        print("MERKLISTE-WACHE: unklar (Shopify nimmt keinen Schlüssel an)")
        print("FERTIG (unklar)")
        return
    b = pruefen(live.get(DATEIEN[0]), live.get(DATEIEN[1]), live.get(DATEIEN[2]), soll)
    print("MERKLISTE-WACHE: ok · Seite = Soll, Herz-Skript + Vorlage verbunden (Schlüssel lux_wish)" if not b
          else "⚠️ MERKLISTE: " + " · ".join(b))
    print("FERTIG")


if __name__ == "__main__":
    main()
