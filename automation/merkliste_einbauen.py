#!/usr/bin/env python3
"""merkliste_einbauen.py — Merkliste-Herz v3 in ein Theme einbauen (21.10.2026, Kollegen-Feedback 16.10.).

ANLASS: «Das Herz gibt es nur in der Übersicht, nicht in der Produktansicht — und die Liste finde ich nirgends.» Die Lösung berührt FÜNF Theme-Dateien:
  layout/theme.liquid                       Herz-Skript + Stil + Hinweis (Quelle automation/theme/merkliste/wish_block.html)
  snippets/header-actions.liquid            Kopf-Herz mit Zähler + Stil (header_herz.liquid, header_stil.css)
  snippets/product-media-gallery-content.liquid   Herz am Hauptbild, nur Handy (bild_herz.liquid)
  templates/product.json                    Block lux_wish_pdp unter den Kauf-Knöpfen (pdp_block.liquid)
  sections/lux-merkliste.liquid             die Seite /pages/merkliste (dropship/theme_live_backup/lux-merkliste.liquid.neu-2026-10-21)

WARUM EIN WERKZEUG STATT DATEIEN KOPIEREN: Jede Datei wird auf dem AKTUELLEN Stand des Zieltheme gelesen, nur der eigene Teil ersetzt und zurückgeschrieben
(Lesen-Ändern-Schreiben) — eine Test-Datei ins Haupttheme zu kopieren würde alles überschreiben, was inzwischen anderswo geändert wurde (Prüfbefund L3).
Wiederholbar: ein zweiter Lauf ändert nichts (Marken LUX-WISH:BEGIN/END, LUX-WISH-HEADER:BEGIN/END, LUX-WISH-BILD, Block lux_wish_pdp);
v1 (alter Stand, ein Block ohne Marken) und v2 (Test-Stand) werden erkannt und ersetzt.

FÜNF Theme-Dateien + die Karten-Datei blocks/_product-card-gallery.liquid (nur der Name des Karten-Herzens für Screenreader: «<Titel>: zur Merkliste»).
RÜCKWEG (--zurueck): lokale Umkehr, KEIN Datei-Restore — jede Datei wird auf dem AKTUELLEN Stand gelesen, nur der eigene Teil entfernt (Marken), das alte
Herz-Skript v1 aus der Sicherung wieder eingesetzt, die Seite aus der Sicherung zurückgeschrieben; danach Rücklesen und Exit 1 bei Abweichung.
Nach einem Einbau in das Haupttheme schreibt das Werkzeug dropship/_merkliste_v3_aktiv.txt (der Wächter prüft dann den v3-Stand) und lässt den Wächter einmal
laufen; --zurueck löscht die Marke.

Aufruf:
  python3 automation/merkliste_einbauen.py --thema test              DRY: zeigt, was sich ändern würde (Testtheme)
  python3 automation/merkliste_einbauen.py --thema test --ja         schreibt ins Testtheme
  python3 automation/merkliste_einbauen.py --thema main --ja         schreibt ins VERKAUFSTHEME (vorher Sicherung nach dropship/theme_live_backup/merkliste-vor-2026-10-21/)
  python3 automation/merkliste_einbauen.py --thema main --zurueck --ja   spielt die Sicherung zurück
  python3 automation/merkliste_einbauen.py --selbsttest              prüft die Ersetz-Regeln an Texten (Exit 1 bei Fehler)
Ohne --ja wird NICHTS geschrieben.
"""
import difflib, json, os, re, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
QUELLEN = os.path.join(REPO, "automation", "theme", "merkliste")
SEKTION_SOLL = os.path.join(REPO, "dropship", "theme_live_backup", "lux-merkliste.liquid.neu-2026-10-21")
SICHERUNG = os.path.join(REPO, "dropship", "theme_live_backup", "merkliste-vor-2026-10-21")
TEST_THEME = "gid://shopify/OnlineStoreTheme/212172341639"

AKTIV = os.path.join(REPO, "dropship", "_merkliste_v3_aktiv.txt")
LAYOUT, KOPF, GALERIE, PRODUKT, SEKTION, KARTE = ("layout/theme.liquid", "snippets/header-actions.liquid", "snippets/product-media-gallery-content.liquid",
                                                  "templates/product.json", "sections/lux-merkliste.liquid", "blocks/_product-card-gallery.liquid")
REIHENFOLGE = [LAYOUT, SEKTION, KOPF, GALERIE, KARTE, PRODUKT]       # Skript/Stil zuerst, der Block in product.json zuletzt


def lesen_quelle(name):
    return open(os.path.join(QUELLEN, name), encoding="utf-8").read()


# ---------- reine Ersetz-Regeln (Selbsttest unten) ----------
def layout_patch(src, block):
    BEG, END = "  <!-- LUX-WISH:BEGIN", "  <!-- LUX-WISH:END -->\n"
    if BEG in src:
        a = src.index(BEG)
        if src.count(BEG) != 1 or src.count(END) != 1:
            raise ValueError("layout: LUX-WISH-Marken nicht eindeutig")
        b = src.index(END, a) + len(END)
    else:
        m1, m2 = "  <style>\n    .lux-wish{position:absolute", "  <style>\n    /* LUX-WISH v2"
        if src.count(m1) + src.count(m2) != 1:
            raise ValueError(f"layout: alter Herz-Block nicht eindeutig gefunden ({src.count(m1) + src.count(m2)} Treffer)")
        a = src.index(m1) if m1 in src else src.index(m2)
        e = src.index("  </script>\n", a)
        b = e + len("  </script>\n")
        alt = src[a:b]
        if alt.count("<style>") != 1 or alt.count("</style>") != 1 or alt.count("<script>") != 1 or alt.count("lux_wish") < 1:
            raise ValueError("layout: der alte Block hat nicht die erwartete Form (ein Stil, ein Skript, Schlüssel lux_wish)")
    return src[:a] + block + src[b:]


def kopf_patch(src, herz, stil):
    ANKER = "  {% if settings.cart_type == 'drawer' and template.name != 'cart' %}"
    if "{%- comment -%} LUX-WISH-HEADER (" in src:
        a = src.index("  {%- comment -%} LUX-WISH-HEADER (")
        e = src.index("  </a>\n", a) + len("  </a>\n")
        if src[e:e + 1] == "\n":
            e += 1
        src = src[:a] + herz + src[e:]
    else:
        if src.count(ANKER) != 1:
            raise ValueError(f"kopf: Anker «cart_type == drawer» nicht eindeutig ({src.count(ANKER)})")
        src = src.replace(ANKER, herz + ANKER)
    if "LUX-WISH-HEADER:BEGIN" in src:
        a = src.index("  /* LUX-WISH-HEADER:BEGIN")
        mark = "  /* LUX-WISH-HEADER:END */\n"
        e = src.index(mark, a) + len(mark)
        return src[:a] + stil + src[e:]
    if src.count("{% endstylesheet %}") != 1:
        raise ValueError("kopf: genau ein {% endstylesheet %} erwartet")
    return src.replace("{% endstylesheet %}", "\n" + stil + "{% endstylesheet %}")


def galerie_patch(src, bild):
    if "LUX-WISH-BILD" in src:
        a = src.index("    {%- comment -%} LUX-WISH-BILD")
        m = "{%- endif -%}\n"
        e = src.index(m, src.index("{%- if closest.product.handle", a)) + len(m)
        return src[:a] + bild + src[e:]
    anker = "  </media-gallery>\n{% endif %}"
    if src.count(anker) != 1:
        raise ValueError(f"galerie: Anker </media-gallery> nicht eindeutig ({src.count(anker)})")
    return src.replace(anker, bild + anker)


def produkt_patch(src, text):
    i = src.find("*/")
    kopf, body = (src[:i + 2] + "\n", src[i + 2:]) if src.lstrip().startswith("/*") else ("", src)
    d = json.loads(body)

    def finde(o):
        if isinstance(o, dict):
            if isinstance(o.get("blocks"), dict) and isinstance(o.get("block_order"), list) and any(k.startswith("buy_buttons") for k in o["blocks"]):
                return o
            for v in o.values():
                r = finde(v)
                if r is not None:
                    return r
        elif isinstance(o, list):
            for v in o:
                r = finde(v)
                if r is not None:
                    return r
        return None
    z = finde(d)
    if z is None:
        raise ValueError("produkt: Kaufknopf-Block (buy_buttons…) nicht gefunden")
    kauf = [k for k in z["block_order"] if k.startswith("buy_buttons")]
    if len(kauf) != 1:
        raise ValueError(f"produkt: genau ein buy_buttons-Block in block_order erwartet ({kauf})")
    z["blocks"]["lux_wish_pdp"] = {"type": "custom-liquid", "settings": {"custom_liquid": text}}
    z["block_order"] = [k for k in z["block_order"] if k != "lux_wish_pdp"]
    z["block_order"].insert(z["block_order"].index(kauf[0]) + 1, "lux_wish_pdp")
    return kopf + json.dumps(d, ensure_ascii=False, indent=2) + "\n"


KARTE_RE = re.compile(r'(<button type="button" class="lux-wish" data-handle="\{\{ product\.handle \}\}" aria-label=")[^"]*(">)')


def karte_patch(src):
    """Karten-Herz: aria-label «<Titel>: zur Merkliste» statt 24× «Zur Merkliste» (Prüfbefund F-07). Wiederholbar (ersetzt den Wert, egal welcher steht)."""
    if len(KARTE_RE.findall(src)) != 1:
        raise ValueError(f"karte: Karten-Herz-Zeile nicht eindeutig gefunden ({len(KARTE_RE.findall(src))})")
    return KARTE_RE.sub(lambda m: m.group(1) + "{{ product.title | escape }}: zur Merkliste" + m.group(2), src)


# ---------- Umkehrregeln (lokal, auf dem aktuellen Stand) ----------
def layout_rueck(src, sicherung):
    BEG, END = "  <!-- LUX-WISH:BEGIN", "  <!-- LUX-WISH:END -->\n"
    m1 = "  <style>\n    .lux-wish{position:absolute"
    if src.count(BEG) != 1 or src.count(END) != 1:
        raise ValueError("layout: LUX-WISH-Marken nicht eindeutig — nichts zu entfernen oder schon entfernt")
    if sicherung.count(m1) != 1:
        raise ValueError("layout: das alte Herz-Skript v1 steht nicht eindeutig in der Sicherung")
    a = sicherung.index(m1)
    alt = sicherung[a:sicherung.index("  </script>\n", a) + len("  </script>\n")]
    i = src.index(BEG)
    return src[:i] + alt + src[src.index(END, i) + len(END):]


def kopf_rueck(src):
    if "{%- comment -%} LUX-WISH-HEADER (" in src:
        a = src.index("  {%- comment -%} LUX-WISH-HEADER (")
        e = src.index("  </a>\n", a) + len("  </a>\n")
        if src[e:e + 1] == "\n":
            e += 1
        src = src[:a] + src[e:]
    if "LUX-WISH-HEADER:BEGIN" in src:
        a = src.index("  /* LUX-WISH-HEADER:BEGIN")
        mark = "  /* LUX-WISH-HEADER:END */\n"
        e = src.index(mark, a) + len(mark)
        if src[a - 1:a] == "\n" and src[a - 2:a - 1] == "\n":
            a -= 1                           # die Leerzeile, die der Einbau davor gesetzt hat
        src = src[:a] + src[e:]
    return src


def galerie_rueck(src):
    if "LUX-WISH-BILD" not in src:
        return src
    a = src.index("    {%- comment -%} LUX-WISH-BILD")
    m = "{%- endif -%}\n"
    e = src.index(m, src.index("{%- if closest.product.handle", a)) + len(m)
    return src[:a] + src[e:]


def karte_rueck(src):
    return KARTE_RE.sub(lambda m: m.group(1) + "Zur Merkliste" + m.group(2), src) if KARTE_RE.search(src) else src


def produkt_rueck(src):
    i = src.find("*/")
    kopf, body = (src[:i + 2] + "\n", src[i + 2:]) if src.lstrip().startswith("/*") else ("", src)
    d = json.loads(body)

    def gehe(o):
        if isinstance(o, dict):
            if isinstance(o.get("blocks"), dict) and "lux_wish_pdp" in o["blocks"]:
                del o["blocks"]["lux_wish_pdp"]
                if isinstance(o.get("block_order"), list):
                    o["block_order"] = [k for k in o["block_order"] if k != "lux_wish_pdp"]
            for v in list(o.values()):
                gehe(v)
        elif isinstance(o, list):
            for v in o:
                gehe(v)
    gehe(d)
    return kopf + json.dumps(d, ensure_ascii=False, indent=2) + "\n"


def alle_rueck(aktuell, sicherung):
    """Jede Datei auf dem aktuellen Stand lokal umkehren; Sektion aus der Sicherung."""
    for n in (LAYOUT, KOPF, GALERIE, PRODUKT, KARTE):
        if aktuell.get(n) is None:
            raise ValueError(f"{n} nicht lesbar")
    if sicherung.get(SEKTION) is None or sicherung.get(LAYOUT) is None:
        raise ValueError("Sicherung unvollständig (Sektion/Layout) — kein Rückweg möglich")
    return {LAYOUT: layout_rueck(aktuell[LAYOUT], sicherung[LAYOUT]), KOPF: kopf_rueck(aktuell[KOPF]), GALERIE: galerie_rueck(aktuell[GALERIE]),
            KARTE: karte_rueck(aktuell[KARTE]), PRODUKT: produkt_rueck(aktuell[PRODUKT]), SEKTION: sicherung[SEKTION]}


def alle_patches(aktuell, quellen=None):
    """aktuell: {dateiname: text|None} → {dateiname: neuer Text}; Fehler → ValueError."""
    q = quellen or {"block": lesen_quelle("wish_block.html"), "herz": lesen_quelle("header_herz.liquid"), "stil": lesen_quelle("header_stil.css"),
                    "bild": lesen_quelle("bild_herz.liquid"), "pdp": lesen_quelle("pdp_block.liquid"),
                    "sektion": open(SEKTION_SOLL, encoding="utf-8").read()}
    for n in (LAYOUT, KOPF, GALERIE, PRODUKT, KARTE):
        if aktuell.get(n) is None:
            raise ValueError(f"{n} nicht lesbar")
    return {LAYOUT: layout_patch(aktuell[LAYOUT], q["block"]), KOPF: kopf_patch(aktuell[KOPF], q["herz"], q["stil"]),
            GALERIE: galerie_patch(aktuell[GALERIE], q["bild"]), KARTE: karte_patch(aktuell[KARTE]), PRODUKT: produkt_patch(aktuell[PRODUKT], q["pdp"]),
            SEKTION: q["sektion"]}


# ---------- Selbsttest ----------
def selbsttest():
    f = []
    block = "  <!-- LUX-WISH:BEGIN v3 -->\n  <style>\n    .lux-wish{x}\n  </style>\n  <script>\n  var KEY='lux_wish';\n  </script>\n  <!-- LUX-WISH:END -->\n"
    v1 = "A\n  <style>\n    .lux-wish{position:absolute;top:8px}\n  </style>\n  <script>\n  var KEY='lux_wish';\n  </script>\nB\n"
    v2 = "A\n  <style>\n    /* LUX-WISH v2 (x) */\n    .lux-wish{y}\n  </style>\n  <script>\n  var KEY='lux_wish';\n  </script>\nB\n"
    for nm, v in (("v1", v1), ("v2", v2)):
        n = layout_patch(v, block)
        if not (n.startswith("A\n") and n.endswith("<!-- LUX-WISH:END -->\nB\n")) or n.count("LUX-WISH:BEGIN") != 1:
            f.append(f"layout {nm}: Ersetzung falsch")
        if layout_patch(n, block) != n:
            f.append(f"layout {nm}: zweiter Lauf ändert")
    for nm, bad in (("ohne Block", "A\nB\n"), ("zwei Blöcke", v1 + v1)):
        try:
            layout_patch(bad, block); f.append(f"layout {nm}: nicht abgelehnt")
        except ValueError:
            pass
    herz = "  {%- comment -%} LUX-WISH-HEADER (x) {%- endcomment -%}\n  <a class=\"lux-wish-link\">\n  </a>\n\n"
    stil = "  /* LUX-WISH-HEADER:BEGIN (x) */\n  .lux-wish-link{}\n  /* LUX-WISH-HEADER:END */\n"
    k = "X\n  {% if settings.cart_type == 'drawer' and template.name != 'cart' %}\n  C\n  {% endif %}\n{% stylesheet %}\n  .a{}\n{% endstylesheet %}\n"
    n = kopf_patch(k, herz, stil)
    if n.count("lux-wish-link") != 2 or not n.index("LUX-WISH-HEADER (") < n.index("cart_type") or not n.index("LUX-WISH-HEADER:BEGIN") < n.index("{% endstylesheet %}"):
        f.append("kopf: Einbau falsch")
    if kopf_patch(n, herz, stil) != n:
        f.append("kopf: zweiter Lauf ändert")
    n2 = kopf_patch(n, herz.replace("(x)", "(y)"), stil.replace("(x)", "(y)"))
    if n2.count("(y)") != 2 or "(x)" in n2:
        f.append("kopf: alter Stand nicht ersetzt")
    for nm, bad in (("ohne Anker", k.replace("cart_type", "xx")), ("ohne Stil-Ende", k.replace("{% endstylesheet %}", ""))):
        try:
            kopf_patch(bad, herz, stil); f.append(f"kopf {nm}: nicht abgelehnt")
        except ValueError:
            pass
    bild = "    {%- comment -%} LUX-WISH-BILD (x) {%- endcomment -%}\n    {%- if closest.product.handle != blank -%}\n      <button></button>\n    {%- endif -%}\n"
    g = "<media-gallery>\n  Z\n  </media-gallery>\n{% endif %}\n"
    n = galerie_patch(g, bild)
    if n.index("LUX-WISH-BILD") > n.index("</media-gallery>") or galerie_patch(n, bild) != n:
        f.append("galerie: Einbau/Wiederholung falsch")
    if "(y)" not in galerie_patch(n, bild.replace("(x)", "(y)")):
        f.append("galerie: alter Stand nicht ersetzt")
    try:
        galerie_patch("<media-gallery></media-gallery>", bild); f.append("galerie: fehlenden Anker nicht abgelehnt")
    except ValueError:
        pass
    karte0 = '{% unless product == blank %}\n<button type="button" class="lux-wish" data-handle="{{ product.handle }}" aria-label="Zur Merkliste">&#9825;</button>\n{% endunless %}\n'
    kn = karte_patch(karte0)
    if "{{ product.title | escape }}: zur Merkliste" not in kn or karte_patch(kn) != kn:
        f.append("karte: Einbau/Wiederholung falsch")
    for nm, bad in (("ohne Herz", "<button>x</button>"), ("zwei Herzen", karte0 + karte0)):
        try:
            karte_patch(bad); f.append(f"karte {nm}: nicht abgelehnt")
        except ValueError:
            pass
    pj = "/* kopf */\n" + json.dumps({"sections": {"main": {"blocks": {"details": {"type": "group", "blocks": {"preis": {"type": "price"}, "buy_buttons_x": {"type": "buy"}, "info": {"type": "t"}},
                                                                              "block_order": ["preis", "buy_buttons_x", "info"]}}}}}, indent=2) + "\n"
    n = produkt_patch(pj, "TEXT1")
    d = json.loads(n[n.find("*/") + 2:])
    z = d["sections"]["main"]["blocks"]["details"]
    if z["block_order"] != ["preis", "buy_buttons_x", "lux_wish_pdp", "info"] or z["blocks"]["lux_wish_pdp"]["settings"]["custom_liquid"] != "TEXT1" or not n.startswith("/* kopf */"):
        f.append("produkt: Einfügen falsch")
    if produkt_patch(n, "TEXT1") != n:
        f.append("produkt: zweiter Lauf ändert")
    if json.loads(produkt_patch(n, "TEXT2")[n.find("*/") + 2:])["sections"]["main"]["blocks"]["details"]["blocks"]["lux_wish_pdp"]["settings"]["custom_liquid"] != "TEXT2":
        f.append("produkt: alter Text nicht ersetzt")
    try:
        produkt_patch('{"sections":{}}', "x"); f.append("produkt: fehlender Kaufblock nicht abgelehnt")
    except ValueError:
        pass
    # RÜCKWEG: Einbau → Umkehr ergibt wieder den Ausgangszustand (Kopf/Galerie/Karte/Produkt byte-gleich, Layout = altes Skript v1) und lässt Fremdes stehen
    k_neu = kopf_patch(k, herz, stil)
    if kopf_rueck(k_neu) != k:
        f.append("rückweg kopf: nicht byte-gleich zum Ausgang")
    if galerie_rueck(galerie_patch(g, bild)) != g:
        f.append("rückweg galerie: nicht byte-gleich zum Ausgang")
    if karte_rueck(karte_patch(karte0)) != karte0:
        f.append("rückweg karte: nicht byte-gleich zum Ausgang")
    pj0 = "/* kopf */\n" + json.dumps({"sections": {"main": {"blocks": {"details": {"type": "group", "blocks": {"preis": {"type": "price"}, "buy_buttons_x": {"type": "buy"}, "info": {"type": "t"}},
                                                                               "block_order": ["preis", "buy_buttons_x", "info"]}}}}}, ensure_ascii=False, indent=2) + "\n"
    if produkt_rueck(produkt_patch(pj0, "TEXT1")) != pj0:
        f.append("rückweg produkt: nicht byte-gleich zum Ausgang")
    lay_neu = layout_patch(v1, block)
    if layout_rueck(lay_neu, v1) != v1:
        f.append("rückweg layout: altes Skript v1 nicht wiederhergestellt")
    fremd = lay_neu.replace("B\n", "B\nFREMDE-AENDERUNG\n")        # eine spätere Änderung ausserhalb unseres Teils muss den Rückweg überleben
    if "FREMDE-AENDERUNG" not in layout_rueck(fremd, v1):
        f.append("rückweg layout: fremde Änderung gelöscht (E1)")
    fremd_k = k_neu.replace("  C\n", "  C\n  FREMD\n")
    if "FREMD" not in kopf_rueck(fremd_k):
        f.append("rückweg kopf: fremde Änderung gelöscht (E1)")
    for nm, fn in (("layout ohne Marken", lambda: layout_rueck(v1, v1)), ("layout ohne Sicherung-v1", lambda: layout_rueck(lay_neu, "kein v1"))):
        try:
            fn(); f.append(f"rückweg {nm}: nicht abgelehnt")
        except ValueError:
            pass
    # Pflicht-Merkmale der echten Quellen (damit eine Quelle nicht still etwas verliert, das der Wächter verlangt)
    try:
        b = lesen_quelle("wish_block.html")
        for m in ("KEY='lux_wish'", ".lux-wish", "#lux-wish-toast{position:fixed", "LUX-WISH:BEGIN", "LUX-WISH:END", "lux-wish--bild", "lux-wish--pdp", "lux-wish-live"):
            if m not in b:
                f.append(f"wish_block.html ohne «{m}»")
        if "data-lux-wish-count" not in lesen_quelle("header_herz.liquid") or "/pages/merkliste" not in lesen_quelle("header_herz.liquid"):
            f.append("header_herz.liquid ohne Zähler/Ziel")
        if "lux-wish--pdp" not in lesen_quelle("pdp_block.liquid") or "lux-wish--bild" not in lesen_quelle("bild_herz.liquid"):
            f.append("pdp/bild-Quelle ohne Klasse")
        st = lesen_quelle("header_stil.css")
        if "max-width: 749.98px" not in st or "max-width: 1349.98px" not in st:
            f.append("header_stil.css ohne Handy- oder Ausblend-Regel")
        for q, txt in (("wish_block.html", b), ("header_stil.css", st), ("bild_herz.liquid", lesen_quelle("bild_herz.liquid")), ("pdp_block.liquid", lesen_quelle("pdp_block.liquid"))):
            if any(ord(c) < 32 and c not in "\n\t" for c in txt):
                f.append(f"{q}: enthält Steuerzeichen (das Schreibwerkzeug wandelt Escape-Folgen in rohe Zeichen)")
        if "\\u0000-\\u001f" not in b:
            f.append("wish_block.html: Handle-Regel ohne Steuerzeichen-Ausschluss (als Escape-Text)")
        sek = open(SEKTION_SOLL, encoding="utf-8").read()
        if "\\u0000-\\u001f" not in sek or any(ord(c) < 32 and c not in "\n\t" for c in sek):
            f.append("Sektion: Handle-Regel nicht wie im Skript oder Steuerzeichen im Text")
    except OSError as e:
        f.append(f"Quelle nicht lesbar: {e}")
    print("SELBSTTEST merkliste_einbauen:", "OK" if not f else "FEHLER " + "; ".join(f))
    return 0 if not f else 1


# ---------- Ausführung ----------
def schreibe(gql, tid, aenderungen, aktuell, datei_schreiben):
    """Schreibt in der festen Reihenfolge; bei einem Fehler: Liste der schon geschriebenen Dateien + Hinweis, Exit 1."""
    fertig = []
    try:
        for n in REIHENFOLGE:
            if n in aenderungen and aktuell.get(n) != aenderungen[n]:
                datei_schreiben(gql, tid, n, aenderungen[n])
                fertig.append(n)
    except Exception as e:
        print(f"⛔ Fehler beim Schreiben von {n}: {type(e).__name__}: {str(e)[:200]}")
        print(f"   schon geschrieben: {', '.join(fertig) or 'nichts'} · Rückweg: python3 automation/merkliste_einbauen.py --thema main --zurueck --ja (kehrt nur unseren Teil um)")
        sys.exit(1)
    return fertig


def diff_zeigen(al, ne, name):
    for l in difflib.unified_diff((al or "").splitlines(), ne.splitlines(), f"live/{name}", f"neu/{name}", lineterm="", n=0):
        print("    " + l[:220])


def main():
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    ja = "--ja" in a
    thema = a[a.index("--thema") + 1] if "--thema" in a else ""
    if thema not in ("test", "main"):
        print(__doc__); sys.exit(2)
    if "--test-id" in a and thema != "test":
        print("--test-id gilt nur mit --thema test"); sys.exit(2)
    from lux_assistent import _gql, theme_id, datei_lesen, datei_schreiben
    gql = _gql()
    tid = TEST_THEME if thema == "test" else theme_id(gql)
    if "--test-id" in a:
        tid = a[a.index("--test-id") + 1]
    print(f"Ziel: {thema} {tid} · {'SCHREIBEN' if ja else 'DRY (nichts wird geschrieben)'}")
    if "--zurueck" in a:
        sich = {}
        for n in REIHENFOLGE:
            pth = os.path.join(SICHERUNG, n.replace("/", "__"))
            if os.path.exists(pth):
                sich[n] = open(pth, encoding="utf-8", newline="").read()
        aktuell = {n: datei_lesen(gql, tid, n) for n in REIHENFOLGE}
        try:
            neu = alle_rueck(aktuell, sich)
        except ValueError as e:
            print(f"⛔ {e} — nichts geändert"); sys.exit(2)
        for n in REIHENFOLGE:
            al, ne = aktuell.get(n) or "", neu[n]
            print(f"  {n}: {len(al)} → {len(ne)} Zeichen{'' if al != ne else ' · unverändert'}")
            if "--diff" in a and al != ne:
                diff_zeigen(al, ne, n)
        if not ja:
            print("DRY — nichts geschrieben"); return
        schreibe(gql, tid, neu, aktuell, datei_schreiben)
        bad = [n for n in REIHENFOLGE if (datei_lesen(gql, tid, n) or "").strip() != neu[n].strip()]
        print("Rücklesen:", "alle Dateien wie berechnet" if not bad else "⚠️ ABWEICHUNG " + ", ".join(bad))
        if not bad and thema == "main" and os.path.exists(AKTIV):
            os.remove(AKTIV)
            print("Marke dropship/_merkliste_v3_aktiv.txt gelöscht (der Wächter prüft wieder den alten Stand)")
        sys.exit(1 if bad else 0)
    aktuell = {n: datei_lesen(gql, tid, n) for n in REIHENFOLGE}
    try:
        neu = alle_patches(aktuell)
    except ValueError as e:
        print(f"⛔ {e} — nichts geändert"); sys.exit(2)
    aend = [n for n in REIHENFOLGE if (aktuell.get(n) or "") != neu[n]]
    for n in REIHENFOLGE:
        al, ne = aktuell.get(n) or "", neu[n]
        plus = sum(1 for l in difflib.unified_diff(al.splitlines(), ne.splitlines(), lineterm="", n=0) if l.startswith("+") and not l.startswith("+++"))
        minus = sum(1 for l in difflib.unified_diff(al.splitlines(), ne.splitlines(), lineterm="", n=0) if l.startswith("-") and not l.startswith("---"))
        print(f"  {n}: {len(al)} → {len(ne)} Zeichen (+{plus}/-{minus} Zeilen){'' if al != ne else ' · unverändert'}")
        if "--diff" in a and al != ne:
            diff_zeigen(al, ne, n)
    if not ja:
        print("DRY — nichts geschrieben"); return
    if not aend:
        print("alles schon auf dem Stand — nichts zu tun")
    else:
        if thema == "main":
            os.makedirs(SICHERUNG, exist_ok=True)
            for n in REIHENFOLGE:
                pth = os.path.join(SICHERUNG, n.replace("/", "__"))
                if not os.path.exists(pth) and aktuell.get(n) is not None:       # die Sicherung zeigt immer den Stand VOR dem ersten Einbau
                    open(pth, "w", encoding="utf-8", newline="").write(aktuell[n])
            print(f"Sicherung: {SICHERUNG} (jetzt committen und pushen — ein lokaler Commit schützt nach einem Container-Neustart nicht)")
        schreibe(gql, tid, neu, aktuell, datei_schreiben)
    bad = [n for n in REIHENFOLGE if (datei_lesen(gql, tid, n) or "").strip() != neu[n].strip()]
    print("Rücklesen:", "alle Dateien gleich" if not bad else "⚠️ ABWEICHUNG " + ", ".join(bad))
    if not bad and thema == "main":
        open(AKTIV, "w", encoding="utf-8").write(dt_now() + "\tMerkliste v3 im Haupttheme eingebaut (automation/merkliste_einbauen.py); Rückweg: --thema main --zurueck --ja\n")
        print("Marke dropship/_merkliste_v3_aktiv.txt geschrieben — der Wächter prüft ab jetzt den v3-Stand")
        r = subprocess.run([sys.executable, os.path.join(REPO, "automation", "merkliste_wache.py")], capture_output=True, text=True, timeout=300)
        print("Wächter:", (r.stdout.strip().splitlines() or ["(keine Ausgabe)"])[0][:300])
        with open("/tmp/merkliste_wache.log", "a", encoding="utf-8") as lg:
            lg.write(r.stdout)
    sys.exit(1 if bad else 0)


def dt_now():
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


if __name__ == "__main__":
    main()
