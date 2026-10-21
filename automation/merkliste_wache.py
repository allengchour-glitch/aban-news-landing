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
  4. (21.10.2026, Kollegen-Feedback 16.10.) snippets/header-actions.liquid trägt das Kopf-Herz mit Zähler (`lux-wish-link`, `data-lux-wish-count`,
     Ziel /pages/merkliste), templates/product.json den Block `lux_wish_pdp` (Herz auf der Produktseite), layout/theme.liquid den Hinweis
     (`lux-wish-toast`) — fehlt eines, merkt man auf der Produktseite oder findet die Liste nicht mehr, ohne dass etwas meldet
Modi:  (ohne)  eine Zeile + «FERTIG», Exit 0 immer;  --selbsttest  prüft die Entscheidungen an Texten, Exit 1 bei Fehler.
Ändert NICHTS im Shop.
"""
import json, os, re, subprocess, sys, urllib.error, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOLL = os.path.join(REPO, "dropship", "theme_live_backup", "lux-merkliste.liquid.neu-2026-10-21")
SHOP = "au3j0y-hq.myshopify.com"
DATEIEN = ["sections/lux-merkliste.liquid", "layout/theme.liquid", "templates/page.merkliste.json", "snippets/header-actions.liquid", "templates/product.json"]


def pruefen(sektion, layout, vorlage, soll, kopf="", produkt=""):
    """Reine Funktion: → Liste von Befunden (leer = in Ordnung). kopf/produkt = snippets/header-actions.liquid / templates/product.json
    (None = nicht lesbar; leerer Text = nicht gelesen, wird dann nicht beanstandet — nur der Selbsttest alter Fassung)."""
    b = []
    if sektion is None:
        b.append("Sektion sections/lux-merkliste.liquid fehlt im Live-Theme")
    elif sektion.strip() != soll.strip():
        b.append(f"Sektion weicht vom Soll ab ({len(sektion)} statt {len(soll)} Zeichen) — überschrieben? Soll: dropship/theme_live_backup/lux-merkliste.liquid.neu-2026-10-21")
    elif "lux_wish" not in sektion:
        b.append("Sektion liest nicht mehr den Schlüssel lux_wish")
    if layout is None:
        b.append("layout/theme.liquid nicht lesbar")
    else:
        if not re.search(r"KEY\s*=\s*'lux_wish'", layout):
            b.append("Herz-Skript in theme.liquid schreibt nicht mehr nach 'lux_wish'")
        if ".lux-wish" not in layout:
            b.append("Herz-Klasse .lux-wish fehlt in theme.liquid")
        elif "lux-wish-toast" not in layout:
            b.append("Hinweis nach dem Merken (#lux-wish-toast) fehlt in theme.liquid — Skript v1 zurückgekehrt? (Zähler im Kopf + Link zur Liste weg)")
    if vorlage is None:
        b.append("templates/page.merkliste.json fehlt")
    elif '"lux-merkliste"' not in vorlage:
        b.append("page.merkliste.json bindet die Sektion lux-merkliste nicht mehr ein")
    if kopf is None:
        b.append("snippets/header-actions.liquid nicht lesbar")
    elif kopf and not ("lux-wish-link" in kopf and "data-lux-wish-count" in kopf and "/pages/merkliste" in kopf):
        b.append("Kopf-Herz mit Zähler fehlt in snippets/header-actions.liquid (Theme-Update?) — die Merkliste ist dann von keiner Seite aus sichtbar verlinkt")
    if produkt is None:
        b.append("templates/product.json nicht lesbar")
    elif produkt and not ("lux_wish_pdp" in produkt and "lux-wish--pdp" in produkt):
        b.append("Herz auf der Produktseite (Block lux_wish_pdp) fehlt in templates/product.json — Kundschaft kann auf der Produktansicht nicht merken")
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
    layout = "x var KEY='lux_wish'; .lux-wish{} #lux-wish-toast{}"
    vorlage = '{"sections":{"wl":{"type":"lux-merkliste"}}}'
    kopf = '<a class="lux-wish-link" href="/pages/merkliste"><span data-lux-wish-count></span></a>'
    produkt = '{"lux_wish_pdp":{"settings":{"custom_liquid":"<button class=\\"lux-wish lux-wish--pdp\\">"}}}'
    fehler = []
    if pruefen(soll, layout, vorlage, soll, kopf, produkt):
        fehler.append("in Ordnung wurde beanstandet")
    faelle = (
        ("Sektion fehlt", (None, layout, vorlage, soll, kopf, produkt), "fehlt im Live-Theme"),
        ("Sektion geändert", (soll + "x", layout, vorlage, soll, kopf, produkt), "weicht vom Soll ab"),
        ("Schlüssel umbenannt", (soll, layout.replace("lux_wish", "wish2"), vorlage, soll, kopf, produkt), "nicht mehr nach 'lux_wish'"),
        ("Herz-Klasse weg", (soll, "var KEY='lux_wish'", vorlage, soll, kopf, produkt), ".lux-wish fehlt"),
        ("Vorlage ohne Sektion", (soll, layout, '{"sections":{}}', soll, kopf, produkt), "bindet die Sektion"),
        ("Layout unlesbar", (soll, None, vorlage, soll, kopf, produkt), "nicht lesbar"),
        ("Hinweis (Skript v1)", (soll, layout.replace("#lux-wish-toast{}", ""), vorlage, soll, kopf, produkt), "lux-wish-toast"),
        ("Kopf-Herz weg", (soll, layout, vorlage, soll, "<a>Konto</a>", produkt), "Kopf-Herz mit Zähler fehlt"),
        ("Kopf-Herz ohne Ziel", (soll, layout, vorlage, soll, kopf.replace("/pages/merkliste", "/x"), produkt), "Kopf-Herz mit Zähler fehlt"),
        ("Kopf-Snippet unlesbar", (soll, layout, vorlage, soll, None, produkt), "header-actions.liquid nicht lesbar"),
        ("PDP-Block weg", (soll, layout, vorlage, soll, kopf, "{}"), "Herz auf der Produktseite"),
        ("product.json unlesbar", (soll, layout, vorlage, soll, kopf, None), "product.json nicht lesbar"),
    )
    for name, args, stichwort in faelle:
        b = pruefen(*args)
        if not any(stichwort in x for x in b):
            fehler.append(f"{name}: nicht erkannt ({b})")
    print(f"SELBSTTEST merkliste_wache:", f"OK ({len(faelle)} Abweichungen erkannt, Sollzustand unbeanstandet)" if not fehler else "FEHLER " + "; ".join(fehler))
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
    b = pruefen(live.get(DATEIEN[0]), live.get(DATEIEN[1]), live.get(DATEIEN[2]), soll, live.get(DATEIEN[3]), live.get(DATEIEN[4]))
    print("MERKLISTE-WACHE: ok · Seite = Soll, Herz-Skript + Vorlage verbunden (Schlüssel lux_wish), Kopf-Herz + Produktseiten-Herz da" if not b
          else "⚠️ MERKLISTE: " + " · ".join(b))
    print("FERTIG")


if __name__ == "__main__":
    main()
