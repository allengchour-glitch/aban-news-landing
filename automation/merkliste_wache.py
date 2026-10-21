#!/usr/bin/env python3
"""merkliste_wache.py — hängt die Merkliste (Herz auf den Karten + Seite /pages/merkliste) noch zusammen? (18.10.2026, v3 am 21.10.2026)

ANLASS: Die Merkliste besteht aus mehreren Stücken, die sich nur über den localStorage-Schlüssel `lux_wish` kennen: das Herz auf den
Produktkarten (blocks/_product-card-gallery.liquid), das Herz-Skript (layout/theme.liquid) und die Seite (sections/lux-merkliste.liquid, eingebunden
in templates/page.merkliste.json). Ändert eine Theme-Überarbeitung, eine andere Sitzung oder der Theme-Editor eines der Stücke, bleibt die Seite still
leer — die Besucherin sieht «Deine Merkliste ist leer», obwohl sie Herzen gesetzt hat; kein Fehler, kein Log. Am 18.10. wurde die Seite überarbeitet
(Test: tools/merkliste_test.mjs); am 21.10. kamen Kopf-Herz mit Zähler, Herz am Hauptbild, Herz auf der Produktseite und ein Hinweis dazu
(Kollegen-Feedback 16.10.; Einbau: automation/merkliste_einbauen.py, Quellen automation/theme/merkliste/).

ZWEI BETRIEBSARTEN (Prüfbefund E2, 21.10.): Solange die Datei `dropship/_merkliste_v3_aktiv.txt` fehlt (sie schreibt merkliste_einbauen.py nach dem
Einbau in das Haupttheme und löscht sie beim Rückweg), prüft der Wächter nur den alten Stand (Seite = Soll vom 18.10., Skript, Vorlage). Danach prüft er
alles — sonst stünde er vor dem Einbau und nach einem Rückweg dauerhaft auf ⚠️.

PRÜFT (nur lesend, Admin-API, Haupt-Theme):
  1. sections/lux-merkliste.liquid == Soll (v3: dropship/theme_live_backup/lux-merkliste.liquid.neu-2026-10-21, alt: ...neu-2026-10-18)
  2. layout/theme.liquid: Herz-Skript mit Schlüssel `lux_wish`, Klasse `.lux-wish` (v3: Hinweis-Stil `#lux-wish-toast{position:fixed`, Bild-Herz-Stil, Ansage-Region)
  3. templates/page.merkliste.json bindet die Sektion `lux-merkliste` ein
  4. (v3) snippets/header-actions.liquid: Kopf-Herz mit Zähler, Ziel /pages/merkliste, Stil mit Handy-Regel (88 px) UND Ausblend-Regel bis 1349.98 px
     (ohne sie schiebt das Herz Menüpunkte ins «Mehr»); templates/product.json: Block `lux_wish_pdp` vorhanden, nicht deaktiviert, in der block_order;
     snippets/product-media-gallery-content.liquid: Bild-Herz (`LUX-WISH-BILD`); blocks/_product-card-gallery.liquid: Karten-Herz `class="lux-wish"`
Schreibt dropship/_merkliste_stand.json (Ampel «MERKLISTE», Stand älter als 36 h → ⚠️); «unklar» schreibt KEIN «FERTIG» (der Aufseher versucht es beim
nächsten Tick wieder, statt 20 h zu sperren — Prüfbefund E3).
Modi:  (ohne)  eine Zeile + «FERTIG», Exit 0 immer;  --selbsttest  prüft die Entscheidungen an Texten, Exit 1 bei Fehler.
Ändert NICHTS im Shop.
"""
import datetime as dt, json, os, re, subprocess, sys, urllib.error, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOLL = os.path.join(REPO, "dropship", "theme_live_backup", "lux-merkliste.liquid.neu-2026-10-21")
SOLL_ALT = os.path.join(REPO, "dropship", "theme_live_backup", "lux-merkliste.liquid.neu-2026-10-18")
AKTIV = os.path.join(REPO, "dropship", "_merkliste_v3_aktiv.txt")
STAND = os.path.join(REPO, "dropship", "_merkliste_stand.json")
STALE_H = 36
SHOP = "au3j0y-hq.myshopify.com"
DATEIEN = ["sections/lux-merkliste.liquid", "layout/theme.liquid", "templates/page.merkliste.json", "snippets/header-actions.liquid", "templates/product.json",
           "snippets/product-media-gallery-content.liquid", "blocks/_product-card-gallery.liquid"]


def _block_ok(produkt):
    """product.json: Block lux_wish_pdp vorhanden, nicht deaktiviert, in einer block_order, mit der Klasse lux-wish--pdp → (ok, Grund)."""
    try:
        i = produkt.find("*/")
        d = json.loads(produkt[i + 2:] if produkt.lstrip().startswith("/*") and i >= 0 else produkt)
    except Exception:
        return False, "templates/product.json ist kein lesbares JSON"
    treffer = []

    def gehe(o):
        if isinstance(o, dict):
            bl, bo = o.get("blocks"), o.get("block_order")
            if isinstance(bl, dict) and "lux_wish_pdp" in bl:
                treffer.append((bl["lux_wish_pdp"], isinstance(bo, list) and "lux_wish_pdp" in bo))
            for v in o.values():
                gehe(v)
        elif isinstance(o, list):
            for v in o:
                gehe(v)
    gehe(d)
    if not treffer:
        return False, "Block lux_wish_pdp fehlt in templates/product.json — Kundschaft kann auf der Produktansicht nicht merken"
    blk, in_order = treffer[0]
    if not in_order:
        return False, "Block lux_wish_pdp steht in templates/product.json, aber nicht in der block_order — er wird nicht angezeigt"
    if isinstance(blk, dict) and blk.get("disabled"):
        return False, "Block lux_wish_pdp ist in templates/product.json deaktiviert (disabled) — er wird nicht angezeigt"
    if "lux-wish--pdp" not in json.dumps(blk):
        return False, "Block lux_wish_pdp trägt das Herz (lux-wish--pdp) nicht mehr"
    return True, ""


def pruefen(sektion, layout, vorlage, soll, kopf="", produkt="", galerie="", karte="", v3=True):
    """Reine Funktion: → Liste von Befunden (leer = in Ordnung). None = nicht lesbar; leerer Text = nicht gelesen (wird nicht beanstandet).
    v3=False: nur der alte Stand (Seite, Schlüssel + Klasse im Skript, Vorlage)."""
    b = []
    if sektion is None:
        b.append("Sektion sections/lux-merkliste.liquid fehlt im Live-Theme")
    elif sektion.strip() != soll.strip():
        b.append(f"Sektion weicht vom Soll ab ({len(sektion)} statt {len(soll)} Zeichen) — überschrieben? Soll: dropship/theme_live_backup/lux-merkliste.liquid.neu-2026-10-{'21' if v3 else '18'}")
    elif "lux_wish" not in sektion:
        b.append("Sektion liest nicht mehr den Schlüssel lux_wish")
    if layout is None:
        b.append("layout/theme.liquid nicht lesbar")
    else:
        if not re.search(r"KEY\s*=\s*'lux_wish'", layout):
            b.append("Herz-Skript in theme.liquid schreibt nicht mehr nach 'lux_wish'")
        if ".lux-wish" not in layout:
            b.append("Herz-Klasse .lux-wish fehlt in theme.liquid")
        elif v3 and "lux-wish-toast" not in layout:
            b.append("Hinweis nach dem Merken (#lux-wish-toast) fehlt in theme.liquid — Skript v1 zurückgekehrt? (Zähler im Kopf + Link zur Liste weg)")
        elif v3 and ("#lux-wish-toast{position:fixed" not in layout or "lux-wish--bild" not in layout or "lux-wish-live" not in layout):
            b.append("Skript v3 unvollständig in theme.liquid (Hinweis-Stil #lux-wish-toast{position:fixed, Bild-Herz-Stil oder Ansage-Region für Screenreader fehlt) — v2 zurückgekehrt?")
    if vorlage is None:
        b.append("templates/page.merkliste.json fehlt")
    elif '"lux-merkliste"' not in vorlage:
        b.append("page.merkliste.json bindet die Sektion lux-merkliste nicht mehr ein")
    if not v3:
        return b
    if kopf is None:
        b.append("snippets/header-actions.liquid nicht lesbar")
    elif kopf and not ("lux-wish-link" in kopf and "data-lux-wish-count" in kopf and "/pages/merkliste" in kopf):
        b.append("Kopf-Herz mit Zähler fehlt in snippets/header-actions.liquid (Theme-Update?) — die Merkliste ist dann von keiner Seite aus sichtbar verlinkt")
    elif kopf and not ("LUX-WISH-HEADER:BEGIN" in kopf and "749.98px" in kopf):
        b.append("Stil des Kopf-Herzens (LUX-WISH-HEADER, rechte Spalte 88 px auf dem Handy) fehlt in snippets/header-actions.liquid — sonst überlappen Logo und Konto-Symbol")
    elif kopf and "1349.98px" not in kopf:
        b.append("Ausblend-Regel des Kopf-Herzens (750–1349.98 px) fehlt in snippets/header-actions.liquid — das Herz schiebt dort Hauptmenü-Punkte ins «Mehr»")
    if produkt is None:
        b.append("templates/product.json nicht lesbar")
    elif produkt:
        ok, grund = _block_ok(produkt)
        if not ok:
            b.append(grund)
    if galerie is None:
        b.append("snippets/product-media-gallery-content.liquid nicht lesbar")
    elif galerie and not ("LUX-WISH-BILD" in galerie and "lux-wish--bild" in galerie):
        b.append("Herz am Hauptbild (LUX-WISH-BILD) fehlt in snippets/product-media-gallery-content.liquid (Theme-Update?) — auf dem Handy steht das Herz dann erst weit unter dem Bild")
    if karte is None:
        b.append("blocks/_product-card-gallery.liquid nicht lesbar")
    elif karte and not re.search(r'class="lux-wish"[^>]*data-handle', karte):
        b.append("Karten-Herz (class=\"lux-wish\") fehlt in blocks/_product-card-gallery.liquid (Theme-Update?) — auf den Produktkarten kann nicht mehr gemerkt werden")
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


def stand_schreiben(befunde, unklar, v3, grund=""):
    d = {"geprueft": f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", "v3": bool(v3), "unklar": bool(unklar), "befunde": befunde, "grund": grund}
    tmp = STAND + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    os.replace(tmp, STAND)


def zeile(jetzt=None, stand=None):
    """Ampelzeile: leer = in Ordnung oder nie gelaufen; ⚠️ bei Befund, «unklar» oder Stand älter als 36 h."""
    pfad = stand or STAND
    if not os.path.exists(pfad):
        return ""
    try:
        s = json.load(open(pfad, encoding="utf-8"))
        alter = ((jetzt or dt.datetime.utcnow()) - dt.datetime.strptime(s["geprueft"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
    except Exception:
        return "⚠️ MERKLISTE: Stand unlesbar (dropship/_merkliste_stand.json)"
    if s.get("befunde"):
        return "⚠️ MERKLISTE: " + " · ".join(s["befunde"])[:320]
    if s.get("unklar"):
        return f"⚠️ MERKLISTE: letzte Prüfung unklar ({s.get('grund', '')[:120]}) — Log /tmp/merkliste_wache.log"
    if alter > STALE_H:
        return f"⚠️ MERKLISTE: seit {alter:.0f} h nicht geprüft (Takt 20 h) — Log /tmp/merkliste_wache.log"
    return ""


def selbsttest():
    soll = "<div>Merkliste lux_wish</div>"
    layout = "x var KEY='lux_wish'; .lux-wish{} .lux-wish--bild{} #lux-wish-toast{position:fixed} lux-wish-live"
    vorlage = '{"sections":{"wl":{"type":"lux-merkliste"}}}'
    kopf = '<a class="lux-wish-link" href="/pages/merkliste"><span data-lux-wish-count></span></a> /* LUX-WISH-HEADER:BEGIN */ @media (max-width: 749.98px){} @media (max-width: 1349.98px){}'
    produkt = '{"blocks":{"lux_wish_pdp":{"settings":{"custom_liquid":"<button class=\\"lux-wish lux-wish--pdp\\">"}}},"block_order":["lux_wish_pdp"]}'
    galerie = "{%- comment -%} LUX-WISH-BILD {%- endcomment -%}<button class=\"lux-wish lux-wish--bild\">"
    karte = '<button type="button" class="lux-wish" data-handle="{{ product.handle }}" aria-label="x">&#9825;</button>'
    fehler = []
    basis = (soll, layout, vorlage, soll, kopf, produkt, galerie, karte)
    if pruefen(*basis):
        fehler.append("in Ordnung wurde beanstandet")
    faelle = (
        ("Sektion fehlt", 0, None, "fehlt im Live-Theme"),
        ("Sektion geändert", 0, soll + "x", "weicht vom Soll ab"),
        ("Schlüssel umbenannt", 1, layout.replace("lux_wish", "wish2"), "nicht mehr nach 'lux_wish'"),
        ("Herz-Klasse weg", 1, "var KEY='lux_wish'", ".lux-wish fehlt"),
        ("Vorlage ohne Sektion", 2, '{"sections":{}}', "bindet die Sektion"),
        ("Layout unlesbar", 1, None, "nicht lesbar"),
        ("Hinweis (Skript v1)", 1, layout.replace("#lux-wish-toast{position:fixed}", ""), "lux-wish-toast"),
        ("Hinweis-Stil fehlt (Name steht noch im JS)", 1, layout.replace("#lux-wish-toast{position:fixed}", "lux-wish-toast"), "Skript v3 unvollständig"),
        ("Skript v2 (ohne Bild-Herz-Stil)", 1, layout.replace(".lux-wish--bild{}", ""), "Skript v3 unvollständig"),
        ("Skript v2 (ohne Ansage-Region)", 1, layout.replace("lux-wish-live", ""), "Skript v3 unvollständig"),
        ("Kopf-Herz weg", 4, "<a>Konto</a>", "Kopf-Herz mit Zähler fehlt"),
        ("Kopf-Herz ohne Ziel", 4, kopf.replace("/pages/merkliste", "/x"), "Kopf-Herz mit Zähler fehlt"),
        ("Kopf-Stil ohne Handy-Regel", 4, kopf.replace("749.98px", "1px"), "Logo und Konto-Symbol"),
        ("Kopf-Stil ohne Marke", 4, kopf.replace("LUX-WISH-HEADER:BEGIN", ""), "Logo und Konto-Symbol"),
        ("Kopf-Stil ohne Ausblend-Regel", 4, kopf.replace("1349.98px", "1099.98px"), "Ausblend-Regel"),
        ("Kopf-Snippet unlesbar", 4, None, "header-actions.liquid nicht lesbar"),
        ("PDP-Block weg", 5, "{}", "Block lux_wish_pdp fehlt"),
        ("PDP-Block nicht in block_order", 5, produkt.replace('"block_order":["lux_wish_pdp"]', '"block_order":[]'), "block_order"),
        ("PDP-Block deaktiviert", 5, produkt.replace('"settings"', '"disabled":true,"settings"'), "deaktiviert"),
        ("PDP-Block ohne Herz", 5, produkt.replace("lux-wish--pdp", "x"), "trägt das Herz"),
        ("product.json kein JSON", 5, "{kaputt", "kein lesbares JSON"),
        ("product.json unlesbar", 5, None, "product.json nicht lesbar"),
        ("Bild-Herz weg", 6, "<media-gallery></media-gallery>", "Herz am Hauptbild"),
        ("Galerie unlesbar", 6, None, "product-media-gallery-content.liquid nicht lesbar"),
        ("Karten-Herz weg", 7, "<div>Karte</div>", "Karten-Herz"),
        ("Karten-Datei unlesbar", 7, None, "_product-card-gallery.liquid nicht lesbar"),
    )
    for name, i, wert, stichwort in faelle:
        a = list(basis)
        a[i] = wert
        b = pruefen(*a)
        if not any(stichwort in x for x in b):
            fehler.append(f"{name}: nicht erkannt ({b})")
    # Betriebsart «alter Stand» (vor dem Einbau): v3-Teile werden nicht beanstandet, der alte Kern schon
    alt = pruefen(soll, "x var KEY='lux_wish'; .lux-wish{}", vorlage, soll, "<a>Konto</a>", "{}", "<x>", "<y>", v3=False)
    if alt:
        fehler.append(f"alter Stand wurde beanstandet: {alt}")
    if not any("weicht vom Soll ab" in x for x in pruefen(soll + "x", "x var KEY='lux_wish'; .lux-wish{}", vorlage, soll, v3=False)):
        fehler.append("alter Stand: Sektion-Abweichung nicht erkannt")
    # Ampelzeile
    import tempfile
    tmp = os.path.join(tempfile.mkdtemp(), "s.json")
    jetzt = dt.datetime(2026, 10, 22, 12, 0)
    if zeile(jetzt, tmp) != "":
        fehler.append("ohne Stand: nicht leer")
    json.dump({"geprueft": "2026-10-22T08:00Z", "befunde": [], "unklar": False}, open(tmp, "w"))
    if zeile(jetzt, tmp) != "":
        fehler.append("frisch + sauber: nicht leer")
    json.dump({"geprueft": "2026-10-22T08:00Z", "befunde": ["Kopf-Herz fehlt"], "unklar": False}, open(tmp, "w"))
    if "MERKLISTE" not in zeile(jetzt, tmp) or "Kopf-Herz" not in zeile(jetzt, tmp):
        fehler.append("Befund → keine ⚠️-Zeile")
    json.dump({"geprueft": "2026-10-22T08:00Z", "befunde": [], "unklar": True, "grund": "kein Schlüssel"}, open(tmp, "w"))
    if "unklar" not in zeile(jetzt, tmp):
        fehler.append("unklar → keine ⚠️-Zeile")
    json.dump({"geprueft": "2026-10-20T08:00Z", "befunde": [], "unklar": False}, open(tmp, "w"))
    if "nicht geprüft" not in zeile(jetzt, tmp):
        fehler.append("Stand 52 h alt → keine ⚠️-Zeile")
    print("SELBSTTEST merkliste_wache:", f"OK ({len(faelle)} Abweichungen erkannt, Sollzustand + alter Stand unbeanstandet, Ampelzeile 5 Fälle)" if not fehler else "FEHLER " + "; ".join(fehler))
    return 0 if not fehler else 1


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    v3 = os.path.exists(AKTIV)
    try:
        soll = open(SOLL if v3 else SOLL_ALT, encoding="utf-8").read()
        live = live_lesen()
    except Exception as e:
        stand_schreiben([], True, v3, f"{type(e).__name__}: {e}"[:200])
        print(f"MERKLISTE-WACHE: unklar ({type(e).__name__}: {e})")     # bewusst KEIN «FERTIG»: der Aufseher versucht es beim nächsten Tick wieder
        return
    if live is None:
        stand_schreiben([], True, v3, "Shopify nimmt keinen Schlüssel an")
        print("MERKLISTE-WACHE: unklar (Shopify nimmt keinen Schlüssel an)")
        return
    b = pruefen(live.get(DATEIEN[0]), live.get(DATEIEN[1]), live.get(DATEIEN[2]), soll, live.get(DATEIEN[3]), live.get(DATEIEN[4]),
                live.get(DATEIEN[5]), live.get(DATEIEN[6]), v3=v3)
    stand_schreiben(b, False, v3)
    if not b:
        print("MERKLISTE-WACHE: ok · " + ("v3: Seite = Soll, Skript + Vorlage verbunden (Schlüssel lux_wish), Kopf-Herz, Bild-Herz, Produktseiten-Herz, Karten-Herz da"
                                         if v3 else "alter Stand (v3 noch nicht eingebaut): Seite = Soll, Skript + Vorlage verbunden"))
    else:
        print("⚠️ MERKLISTE: " + " · ".join(b))
    print("FERTIG")


if __name__ == "__main__":
    main()
