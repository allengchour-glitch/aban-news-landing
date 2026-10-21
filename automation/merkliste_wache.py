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
     Ziel /pages/merkliste) UND den Stil mit der Handy-Regel (rechte Kopf-Spalte 88 px — ohne sie überlappen Logo und Konto-Symbol),
     templates/product.json den Block `lux_wish_pdp` (in blocks UND block_order), snippets/product-media-gallery-content.liquid das Herz am Hauptbild
     (`LUX-WISH-BILD`), layout/theme.liquid Hinweis (`lux-wish-toast`), Bild-Herz-Stil und Ansage-Region (`lux-wish-live`) — fehlt eines, merkt man
     auf der Produktseite nicht oder findet die Liste nicht mehr, ohne dass etwas meldet. Einbau/Wiederholung: automation/merkliste_einbauen.py
Modi:  (ohne)  eine Zeile + «FERTIG», Exit 0 immer;  --selbsttest  prüft die Entscheidungen an Texten, Exit 1 bei Fehler.
Ändert NICHTS im Shop.
"""
import json, os, re, subprocess, sys, urllib.error, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOLL = os.path.join(REPO, "dropship", "theme_live_backup", "lux-merkliste.liquid.neu-2026-10-21")
SHOP = "au3j0y-hq.myshopify.com"
DATEIEN = ["sections/lux-merkliste.liquid", "layout/theme.liquid", "templates/page.merkliste.json", "snippets/header-actions.liquid", "templates/product.json",
           "snippets/product-media-gallery-content.liquid"]


def pruefen(sektion, layout, vorlage, soll, kopf="", produkt="", galerie=""):
    """Reine Funktion: → Liste von Befunden (leer = in Ordnung). kopf/produkt = snippets/header-actions.liquid / templates/product.json
    (None = nicht lesbar; leerer Text = nicht gelesen, wird dann nicht beanstandet — nur der Selbsttest alter Fassung).
    galerie = snippets/product-media-gallery-content.liquid (Herz am Hauptbild, v3 vom 21.10.2026)."""
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
        elif "lux-wish--bild" not in layout or "lux-wish-live" not in layout:
            b.append("Skript v3 unvollständig in theme.liquid (Stil für das Bild-Herz oder die Ansage-Region für Screenreader fehlt) — v2 zurückgekehrt?")
    if vorlage is None:
        b.append("templates/page.merkliste.json fehlt")
    elif '"lux-merkliste"' not in vorlage:
        b.append("page.merkliste.json bindet die Sektion lux-merkliste nicht mehr ein")
    if kopf is None:
        b.append("snippets/header-actions.liquid nicht lesbar")
    elif kopf and not ("lux-wish-link" in kopf and "data-lux-wish-count" in kopf and "/pages/merkliste" in kopf):
        b.append("Kopf-Herz mit Zähler fehlt in snippets/header-actions.liquid (Theme-Update?) — die Merkliste ist dann von keiner Seite aus sichtbar verlinkt")
    elif kopf and not ("LUX-WISH-HEADER:BEGIN" in kopf and "749.98px" in kopf):
        b.append("Stil des Kopf-Herzens (LUX-WISH-HEADER, rechte Spalte 88 px auf dem Handy) fehlt in snippets/header-actions.liquid — sonst überlappen Logo und Konto-Symbol")
    if produkt is None:
        b.append("templates/product.json nicht lesbar")
    elif produkt and not ("lux_wish_pdp" in produkt and "lux-wish--pdp" in produkt):
        b.append("Herz auf der Produktseite (Block lux_wish_pdp) fehlt in templates/product.json — Kundschaft kann auf der Produktansicht nicht merken")
    elif produkt and produkt.count('"lux_wish_pdp"') < 2:
        b.append("Block lux_wish_pdp steht in templates/product.json, aber nicht in der block_order — er wird nicht angezeigt")
    if galerie is None:
        b.append("snippets/product-media-gallery-content.liquid nicht lesbar")
    elif galerie and not ("LUX-WISH-BILD" in galerie and "lux-wish--bild" in galerie):
        b.append("Herz am Hauptbild (LUX-WISH-BILD) fehlt in snippets/product-media-gallery-content.liquid (Theme-Update?) — auf dem Handy steht das Herz dann erst weit unter dem Bild")
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
    layout = "x var KEY='lux_wish'; .lux-wish{} .lux-wish--bild{} #lux-wish-toast{} lux-wish-live"
    vorlage = '{"sections":{"wl":{"type":"lux-merkliste"}}}'
    kopf = '<a class="lux-wish-link" href="/pages/merkliste"><span data-lux-wish-count></span></a> /* LUX-WISH-HEADER:BEGIN */ @media (max-width: 749.98px){}'
    produkt = '{"blocks":{"lux_wish_pdp":{"settings":{"custom_liquid":"<button class=\\"lux-wish lux-wish--pdp\\">"}}},"block_order":["lux_wish_pdp"]}'
    fehler = []
    galerie = "{%- comment -%} LUX-WISH-BILD {%- endcomment -%}<button class=\"lux-wish lux-wish--bild\">"
    if pruefen(soll, layout, vorlage, soll, kopf, produkt, galerie):
        fehler.append("in Ordnung wurde beanstandet")
    faelle = (
        ("Sektion fehlt", (None, layout, vorlage, soll, kopf, produkt, galerie), "fehlt im Live-Theme"),
        ("Sektion geändert", (soll + "x", layout, vorlage, soll, kopf, produkt, galerie), "weicht vom Soll ab"),
        ("Schlüssel umbenannt", (soll, layout.replace("lux_wish", "wish2"), vorlage, soll, kopf, produkt, galerie), "nicht mehr nach 'lux_wish'"),
        ("Herz-Klasse weg", (soll, "var KEY='lux_wish'", vorlage, soll, kopf, produkt, galerie), ".lux-wish fehlt"),
        ("Vorlage ohne Sektion", (soll, layout, '{"sections":{}}', soll, kopf, produkt, galerie), "bindet die Sektion"),
        ("Layout unlesbar", (soll, None, vorlage, soll, kopf, produkt, galerie), "nicht lesbar"),
        ("Hinweis (Skript v1)", (soll, layout.replace("#lux-wish-toast{}", ""), vorlage, soll, kopf, produkt, galerie), "lux-wish-toast"),
        ("Skript v2 (ohne Bild-Herz-Stil)", (soll, layout.replace(".lux-wish--bild{}", ""), vorlage, soll, kopf, produkt, galerie), "Skript v3 unvollständig"),
        ("Skript v2 (ohne Ansage-Region)", (soll, layout.replace("lux-wish-live", ""), vorlage, soll, kopf, produkt, galerie), "Skript v3 unvollständig"),
        ("Kopf-Herz weg", (soll, layout, vorlage, soll, "<a>Konto</a>", produkt, galerie), "Kopf-Herz mit Zähler fehlt"),
        ("Kopf-Herz ohne Ziel", (soll, layout, vorlage, soll, kopf.replace("/pages/merkliste", "/x"), produkt, galerie), "Kopf-Herz mit Zähler fehlt"),
        ("Kopf-Stil ohne Handy-Regel", (soll, layout, vorlage, soll, kopf.replace("749.98px", "1px"), produkt, galerie), "Logo und Konto-Symbol"),
        ("Kopf-Stil ohne Marke", (soll, layout, vorlage, soll, kopf.replace("LUX-WISH-HEADER:BEGIN", ""), produkt, galerie), "Logo und Konto-Symbol"),
        ("Kopf-Snippet unlesbar", (soll, layout, vorlage, soll, None, produkt, galerie), "header-actions.liquid nicht lesbar"),
        ("PDP-Block weg", (soll, layout, vorlage, soll, kopf, "{}", galerie), "Herz auf der Produktseite"),
        ("PDP-Block nicht in block_order", (soll, layout, vorlage, soll, kopf, produkt.replace('"block_order":["lux_wish_pdp"]', '"block_order":[]'), galerie), "block_order"),
        ("product.json unlesbar", (soll, layout, vorlage, soll, kopf, None, galerie), "product.json nicht lesbar"),
        ("Bild-Herz weg", (soll, layout, vorlage, soll, kopf, produkt, "<media-gallery></media-gallery>"), "Herz am Hauptbild"),
        ("Galerie unlesbar", (soll, layout, vorlage, soll, kopf, produkt, None), "product-media-gallery-content.liquid nicht lesbar"),
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
    b = pruefen(live.get(DATEIEN[0]), live.get(DATEIEN[1]), live.get(DATEIEN[2]), soll, live.get(DATEIEN[3]), live.get(DATEIEN[4]), live.get(DATEIEN[5]))
    print("MERKLISTE-WACHE: ok · Seite = Soll, Herz-Skript + Vorlage verbunden (Schlüssel lux_wish), Kopf-Herz, Bild-Herz + Produktseiten-Herz da" if not b
          else "⚠️ MERKLISTE: " + " · ".join(b))
    print("FERTIG")


if __name__ == "__main__":
    main()
