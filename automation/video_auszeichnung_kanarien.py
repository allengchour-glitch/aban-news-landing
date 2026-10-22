#!/usr/bin/env python3
"""video_auszeichnung_kanarien.py — Kanarienvogel für den VideoObject-Block der Produktseite (22.10.2026, Betreiber «video ja»).

ANLASS (GEMESSEN 22.10.): Das Live-Theme gab kein VideoObject aus; 547 von 56'652 aktiven Produkten haben ein echtes Video-Medium (nur 33 davon das
Tag `video-hit`; meine erste Zählung «27 von 1'082» las nur die ersten 12 Medien je Produkt und nur das Tag). Der Block steht in
dropship/theme_patches/video_auszeichnung_2026-10-22.liquid; im Live-Theme soll er in sections/product-information.liquid stehen (NOCH NICHT live;
nach dem Einbau die Marken `LUX-VIDEO-JSONLD` / `luxe_vid` in theme_marken_wache.MARKEN eintragen — heute prüft dieser Test nur die QUELLE).
Dieser Test schützt die QUELLE des Blocks gegen Rückfälle, die kein Shopify-Fehler anzeigt:
  1. Entschieden wird am Medium (`media_type`), nie am Tag `video-hit` (das Tag `video-hit` trägt 1'082 Produkte, nur 33 davon ein Video; umgekehrt haben 547 ein Video).
  2. Pflichtfelder für Google: name, description, thumbnailUrl, uploadDate, contentUrl.
  3. JEDER ausgegebene Wert läuft durch `| json` (ein `</script>` oder ein Anführungszeichen im Produkttext bricht sonst den Block).
  4. Nur MP4 (kein m3u8), und nur MIT Vorschaubild UND Quelle; sonst kein Block.
  5. Keine `blank`-Vergleiche (Shopify-Eigenheit; python-liquid liest sie anders — am 22.10. im Render-Test aufgefallen).
  6. contentUrl UND thumbnailUrl bekommen `https:` vorangestellt: `video_source.url` kommt in echtem Shopify PROTOKOLL-RELATIV
     (//luxestyle.ch/cdn/shop/videos/…) — der erste Render-Test mit https-Testdaten sah das nicht, zwei Prüfer fanden es (22.10.).
  7. Die Beschreibung wird vor dem Strippen an jedem schliessenden Tag getrennt (sonst «…ausSchnell…» in 34 von 50 Produkten).
  8. Marken LUX-VIDEO-JSONLD / /LUX-VIDEO-JSONLD (das Einbauwerkzeug ersetzt zwischen ihnen statt zu verdoppeln).
  9. Ist python-liquid vorhanden, wird der Block zusätzlich mit Produktfällen gerendert (gültiges JSON, Sonderfälle, protokoll-relative Adressen).
  python3 automation/video_auszeichnung_kanarien.py             Exit 0 = Block in Ordnung, 1 = Regel verletzt
  python3 automation/video_auszeichnung_kanarien.py --selbsttest  prüft die Prüfung selbst (9 Mutanten müssen auffallen)
Ohne Shop-Zugriff, < 2 s. Aufruf: Aufseher (fixer_keepalive.sh) täglich neben den anderen Kanarienvögeln.
"""
import json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
BLOCK = os.path.join(REPO, "dropship", "theme_patches", "video_auszeichnung_2026-10-22.liquid")


def pruefe(text):
    """Liste der verletzten Regeln (leer = in Ordnung)."""
    f = []
    if "where: 'media_type', 'video'" not in text:
        f.append("Entscheidung nicht am Medium (media_type=video)")
    if re.search(r"tags\s+contains|video-hit", re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", "", text, flags=re.S)):
        f.append("Entscheidung hängt am Tag video-hit statt am Medium")
    if len(re.findall(r'<script type="application/ld\+json">', text)) != 1:
        f.append("nicht genau ein JSON-LD-Script")
    if '"@type": "VideoObject"' not in text:
        f.append("@type VideoObject fehlt")
    for k in ("name", "description", "thumbnailUrl", "uploadDate", "contentUrl"):
        if f'"{k}":' not in text:
            f.append(f"Pflichtfeld {k} fehlt")
    skript = re.search(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)
    if skript:
        for ausdruck in re.findall(r"\{\{(.*?)\}\}", skript.group(1), re.S):
            if not re.search(r"\|\s*json\s*-?$", ausdruck.strip()):
                f.append(f"Ausgabe ohne `| json`: {{{{{ausdruck.strip()[:60]}}}}}")
    if "'video/mp4'" not in text:
        f.append("MP4-Auswahl (mime_type video/mp4) fehlt")
    if "m3u8" in re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", "", text, flags=re.S):
        f.append("m3u8 darf nicht als contentUrl in Frage kommen")
    if not re.search(r"\{%-?\s*if luxe_vsrc and luxe_vid\.preview_image\s*-?%\}", text):
        f.append("Bedingung «Quelle UND Vorschaubild» fehlt")
    if re.search(r"[!=]=\s*blank", re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", "", text, flags=re.S)):
        f.append("blank-Vergleich (engine-abhängig) — `.size > 0` bzw. Objekt-Vorhandensein verwenden")
    if "{%- assign luxe_vurl = luxe_vurl | prepend: 'https:' -%}" not in text or "{%- assign luxe_vthumb = luxe_vthumb | prepend: 'https:' -%}" not in text:
        f.append("https:-Normalisierung für contentUrl oder thumbnailUrl fehlt (Shopify liefert //…)")
    if '"contentUrl": {{ luxe_vurl | json }}' not in text:
        f.append("contentUrl nutzt nicht die normalisierte Adresse luxe_vurl")
    if "replace: '</', ' </'" not in text or "split: ' ' | join: ' '" not in text:
        f.append("Beschreibung wird nicht an Tag-Grenzen getrennt / Leerraum nicht normalisiert (verklebte Wörter)")
    if text.count("LUX-VIDEO-JSONLD") != 2 or "/LUX-VIDEO-JSONLD" not in text:
        f.append("Marken LUX-VIDEO-JSONLD (Anfang) und /LUX-VIDEO-JSONLD (Ende) fehlen oder sind doppelt")
    for auf, zu in (("if", "endif"), ("unless", "endunless")):
        n_auf = len(re.findall(r"\{%-?\s*" + auf + r"\b", text))
        n_zu = len(re.findall(r"\{%-?\s*" + zu + r"\s*-?%\}", text))
        if n_auf != n_zu:
            f.append(f"{auf}/{zu} nicht ausgeglichen ({n_auf}/{n_zu})")
    return f


def render_faelle(text):
    """None = python-liquid fehlt (übersprungen), sonst Liste Fehler."""
    for p in (os.environ.get("PYLIQUID_PFAD", ""), ""):
        if p:
            sys.path.insert(0, p)
    try:
        from liquid import Environment
    except Exception:
        return None
    env = Environment()

    def shop_json(v):
        return json.dumps(v, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")

    def image_url(img, **kw):
        if img is None:
            return ""
        return (img["src"] if isinstance(img, dict) else str(img)) + "?width=" + str(kw.get("width", ""))
    def ruby_split(s, sep=" "):                 # Shopify/Ruby: split(' ') trennt an JEDEM Leerraum und ignoriert Ränder (awk-Modus)
        s = "" if s is None else str(s)
        return s.split() if sep == " " else s.split(sep)
    env.add_filter("json", shop_json)
    env.add_filter("image_url", image_url)
    env.add_filter("split", ruby_split)
    tpl = env.from_string(text)
    mp4 = lambda h, u: {"url": u, "mime_type": "video/mp4", "height": h, "width": h, "format": "mp4"}
    m3 = {"url": "//luxestyle.ch/cdn/shop/videos/x.m3u8?v=0", "mime_type": "application/x-mpegURL", "height": 1080, "width": 1080, "format": "m3u8"}
    bild = {"media_type": "image", "src": "//cdn.shopify.com/a.jpg"}
    vid = {"media_type": "video", "preview_image": {"src": "https://cdn.shopify.com/v.jpg"},      # Quellen wie in echtem Shopify: //shop/cdn/…?v=0
           "sources": [mp4(480, "//luxestyle.ch/cdn/shop/videos/480.mp4?v=0"), mp4(1080, "//luxestyle.ch/cdn/shop/videos/1080.mp4?v=0"),
                       mp4(720, "//luxestyle.ch/cdn/shop/videos/720.mp4?v=0"), m3]}
    basis = {"title": 'Kerzenlicht "Aroma"-Diffuser', "description": "<p>Schön\nmit </script><script>x</script> Duft & Licht</p>",
             "published_at": "2026-09-07T14:55:23+02:00", "created_at": "2026-09-01T10:00:00+02:00"}

    def ld(produkt):
        h = tpl.render(closest={"product": produkt})
        return h, [json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)]
    fehler = []
    h, l = ld(dict(basis, media=[bild, vid]))
    d = l[0] if len(l) == 1 else {}
    if len(l) != 1:
        fehler.append("Normalfall: nicht genau ein Block")
    if not all(d.get(k) for k in ("name", "description", "thumbnailUrl", "uploadDate", "contentUrl")):
        fehler.append("Normalfall: Pflichtfeld leer")
    if d.get("contentUrl") != "https://luxestyle.ch/cdn/shop/videos/1080.mp4?v=0":
        fehler.append(f"contentUrl ist nicht die höchste MP4 mit https: ({d.get('contentUrl')})")
    if not str((d.get("thumbnailUrl") or [""])[0]).startswith("https://"):
        fehler.append("thumbnailUrl nicht https")
    if d.get("name") != 'Produktvideo: Kerzenlicht "Aroma"-Diffuser':
        fehler.append("Anführungszeichen im Titel")
    if "<" in d.get("description", "<"):
        fehler.append("HTML in der Beschreibung")
    if len(ld(dict(basis, media=[dict(vid, preview_image={"src": "//cdn.shopify.com/p.jpg"})]))[1][0]["thumbnailUrl"][0]) < 10:
        fehler.append("//-Vorschaubild")
    for name, p in (("ohne Video", dict(basis, media=[bild])), ("nur m3u8", dict(basis, media=[dict(vid, sources=[m3])])),
                    ("ohne Vorschaubild", dict(basis, media=[{k: v for k, v in vid.items() if k != "preview_image"}]))):
        if tpl.render(closest={"product": p}).strip() != "":
            fehler.append(f"{name}: Block darf nicht erscheinen")
    if ld(dict(basis, description="", media=[vid]))[1][0].get("description") != basis["title"]:
        fehler.append("leere Beschreibung → Titel")
    roh = "<p>Kurz.</p><h3>Das zeichnet es aus</h3><ul>\n<li>Erstens a</li>\n<li>Zweitens &amp; b</li>\n</ul>"
    bd = ld(dict(basis, description=roh, media=[vid]))[1][0].get("description")
    if bd != "Kurz. Das zeichnet es aus Erstens a Zweitens & b":
        fehler.append(f"Beschreibung verklebt oder Entität nicht aufgelöst: {bd!r}")
    if len(ld(dict(basis, media=[vid, vid]))[1]) != 1:
        fehler.append("zwei Videos → ein Block")
    return fehler


def main():
    text = open(BLOCK, encoding="utf-8").read()
    f = pruefe(text)
    r = render_faelle(text)
    for x in f:
        print("  ❌", x)
    for x in (r or []):
        print("  ❌ Render:", x)
    print(f"VIDEO-AUSZEICHNUNG-KANARIEN: {len(f) + len(r or [])} Verstösse · Render-Test " + ("übersprungen (python-liquid fehlt)" if r is None else "gelaufen"))
    return 1 if (f or r) else 0


def selbsttest():
    text = open(BLOCK, encoding="utf-8").read()
    fehler = []
    ok = lambda b, t: b or fehler.append(t)
    ok(pruefe(text) == [], f"echter Block ist sauber ({pruefe(text)})")
    mutanten = {
        "Tag statt Medium": ("where: 'media_type', 'video'", "where: 'media_type', 'video' %}{% if closest.product.tags contains 'video-hit'"),
        "name ohne json": ("{{ closest.product.title | prepend: 'Produktvideo: ' | json }}", "{{ closest.product.title | prepend: 'Produktvideo: ' }}"),
        "thumbnailUrl fehlt": ('"thumbnailUrl": [{{ luxe_vthumb | json }}],', ""),
        "m3u8 statt mp4": ("'video/mp4'", "'application/x-mpegURL'"),
        "Vorschaubild-Bedingung fehlt": ("{%- if luxe_vsrc and luxe_vid.preview_image -%}", "{%- if luxe_vsrc -%}"),
        "blank-Vergleich": ("{%- unless luxe_vdesc.size > 0 -%}", "{%- if luxe_vdesc == blank -%}"),
        "contentUrl ohne json": ("{{ luxe_vurl | json }}", "{{ luxe_vurl }}"),
        "contentUrl ohne https-Normalisierung": ("{%- assign luxe_vurl = luxe_vurl | prepend: 'https:' -%}", "{%- assign luxe_vurl = luxe_vurl -%}"),
        "Beschreibung ohne Tag-Trennung": ("replace: '</', ' </' | ", ""),
    }
    for name, (a, b) in mutanten.items():
        ok(text.count(a) == 1, f"Mutant «{name}»: Ersetzungsstelle genau einmal vorhanden ({text.count(a)})")
        if text.count(a) == 1:
            ok(pruefe(text.replace(a, b)) != [], f"Mutant «{name}» wird NICHT erkannt")
    r = render_faelle(text)
    ok(r is None or r == [], f"Render-Fälle am echten Block: {r}")
    if r is not None:
        schlecht = text.replace("{%- if luxe_vsrc and luxe_vid.preview_image -%}", "{%- if luxe_vsrc -%}")
        ok(render_faelle(schlecht) != [], "Render-Test erkennt fehlende Vorschaubild-Bedingung nicht")
    if fehler:
        print("SELBSTTEST FEHLER:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK ({len(mutanten)} Mutanten erkannt, Render-Test {'übersprungen' if r is None else 'inkl. Mutant'})")
    return 0


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
