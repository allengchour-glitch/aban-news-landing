#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mobil_tempo_patch.py — Plan-Tag 11 «Mobil & Tempo» (04./05.10.2026, Betreiber «fix 12 h lang alles»).

GEMESSEN VORHER (390 px, tools/browser.mjs, 05.10. 01:05 UTC, Startseite):
  - LCP 5'232 ms. LCP-Element = DIV .hero__media-grid mit CSS-HINTERGRUNDBILD tati-model-hero-mobil.jpg
    (333 KB, 1080×1350, Theme-Asset ohne Verkleinerung), gesetzt im Custom-Liquid-Block «lux_usp» (30.09.).
    Hintergrundbilder entdeckt der Browser erst beim Zeichnen und lädt sie mit niedriger Priorität;
    daneben lädt das UNSICHTBARE Original-Hero-<img> (visibility:hidden) weiter 102 KB mit fetchpriority=high.
    Produktseiten zum Vergleich: LCP 1'136–1'628 ms (echtes <img> mit fetchpriority=high).
  - 6'818 KB übertragen, davon 2'839 KB das Video meisterwerk-0830-clean.mp4 (Sektion 18 von 25,
    y=6'749 px, weit unter dem ersten Bildschirm) — `autoplay` lädt es sofort ganz. Dazu 159 KB
    luxestyle-pod-banner.mp4 (y=3'951). Beide mit preload="metadata", das autoplay aushebelt.
  - 16 eager-Kartenbilder (pl_trends + pl_herbst) mit width=832 (152 KB je Bild) für Karten von 234 px
    Breite (= 468 Gerätepixel bei DPR 2): sizes sagt «100vw» für Mobil, die srcset-Stufen springen von
    352 direkt auf 832. Richtig wären ~480 px (52 KB). Safari kennt sizes="auto" nicht → betrifft dort
    ALLE Kartenbilder (auch lazy), Startseite 414 <img>.
  - Überbreite 0/5 Seiten, Sticky-Überlappung keine echte (Backdrop opacity 0), Produktseiten-LCP ohne lazy.

WAS DER PATCH TUT (minimal, Design unverändert):
  1. index.json · lux_usp: Mobil-Hintergrund als 800x-Ableitung (201 KB statt 333 KB) + <link rel=preload
     as=image fetchpriority=high> für Mobil UND Desktop (media-Attribut), damit das LCP-Bild früh und hoch
     priorisiert geladen wird. Der Block bleibt die einzige Stelle (Rücknahme = Block löschen, wie bisher).
  2. index.json · lux_spotlight_video + banner_selbst_gestalten: `autoplay` raus, preload="none",
     data-lx-lazyplay; ein 400-Byte-Skript startet das Video erst, wenn es 600 px vor dem Bildschirm steht.
     Poster bleibt sichtbar, Verhalten im Blick identisch.
  3. snippets/card-gallery.liquid: bei mobile_columns == 2 heisst der Mobil-Teil von sizes «60vw» (Karte
     gemessen 234/390 px im Karussell, 189/390 im Raster), statt «100vw».
  4. snippets/product-media.liquid: srcset-Stufen 480 und 600 zwischen 352 und 832 ergänzt.

NUTZUNG:
    python3 automation/mobil_tempo_patch.py            # DRY: holt live, zeigt Diffs, schreibt nichts
    SCHARF=1 python3 automation/mobil_tempo_patch.py   # schreibt per themeFilesUpsert und liest zurück
Idempotent: schon gepatchte Dateien werden erkannt und übersprungen.
"""
import difflib
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

THEME = "gid://shopify/OnlineStoreTheme/187533001089"
SCHARF = os.environ.get("SCHARF") == "1"
MARK = "LuxeStyle Mobil&Tempo 2026-10-05"

LAZYPLAY_JS = (
    '<script>(function(){var vs=document.querySelectorAll(\'video[data-lx-lazyplay]:not([data-lx-io])\');'
    'if(!vs.length)return;function an(v){v.preload="auto";v.muted=true;v.setAttribute("autoplay","");v.load();'
    'var p=v.play();if(p&&p.catch)p.catch(function(){})}'
    'if(!("IntersectionObserver" in window)){vs.forEach(an);return}'
    'var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);an(e.target)})},{rootMargin:"600px 0px"});'
    'vs.forEach(function(v){v.setAttribute("data-lx-io","1");io.observe(v)})})();</script>'
)


def lese(filenames):
    q = ('query($id:ID!,$f:[String!]){theme(id:$id){files(filenames:$f,first:10){nodes{filename '
         'body{... on OnlineStoreThemeFileBodyText{content}}}}}}')
    n = gql(q, {"id": THEME, "f": filenames})["theme"]["files"]["nodes"]
    return {x["filename"]: x["body"]["content"] for x in n}


def patch_index(raw):
    pre = raw[:raw.index("{")]
    t = json.loads(raw[len(pre):])
    s = t["sections"]
    notizen = []

    # 1. Tati-Hero: Preload + 800x für Mobil
    cl = s["lux_usp"]["settings"]["custom_liquid"]
    if MARK not in cl:
        alt_mobil = "@media (max-width:749px){section[id$=\"__hero_jVaWmY\"] .hero__media-grid{background-image:url({{ 'tati-model-hero-mobil.jpg' | asset_url }});background-position:center top}}"
        assert alt_mobil in cl, "Mobil-Hintergrundregel nicht gefunden"
        neu_mobil = "@media (max-width:749px){section[id$=\"__hero_jVaWmY\"] .hero__media-grid{background-image:url({{ 'tati-model-hero-mobil.jpg' | asset_img_url: '800x' }});background-position:center top}}"
        cl = cl.replace(alt_mobil, neu_mobil)
        preload = (
            f"<!-- {MARK}: Das LCP-Bild ist dieser CSS-Hintergrund (gemessen LCP 5.2 s, 333 KB, spät entdeckt). "
            "Preload mit hoher Priorität + Mobil als 800x-Ableitung (201 KB). -->\n"
            "<link rel=\"preload\" as=\"image\" href=\"{{ 'tati-model-hero-mobil.jpg' | asset_img_url: '800x' }}\" media=\"(max-width:749px)\" fetchpriority=\"high\">\n"
            "<link rel=\"preload\" as=\"image\" href=\"{{ 'tati-model-hero-desktop.jpg' | asset_url }}\" media=\"(min-width:750px)\" fetchpriority=\"high\">\n"
        )
        cl = preload + cl
        s["lux_usp"]["settings"]["custom_liquid"] = cl
        notizen.append("lux_usp: Preload (Mobil 800x + Desktop) + Mobil-Hintergrund 800x")
    else:
        notizen.append("lux_usp: schon gepatcht")

    # 2. Videos: autoplay → lazyplay
    for key, alt, neu in (
        ("lux_spotlight_video",
         ' autoplay muted loop playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>',
         ' muted loop playsinline preload="none" data-lx-lazyplay style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>' + LAZYPLAY_JS),
        ("banner_selbst_gestalten",
         '<video autoplay muted loop playsinline preload="metadata" poster=',
         '<video muted loop playsinline preload="none" data-lx-lazyplay poster='),
    ):
        cl = s[key]["settings"]["custom_liquid"]
        if "data-lx-lazyplay" in cl:
            notizen.append(f"{key}: schon gepatcht"); continue
        assert alt in cl, f"{key}: Video-Tag nicht gefunden"
        cl = cl.replace(alt, neu, 1)
        if key == "banner_selbst_gestalten":
            cl = cl.replace("</section>", LAZYPLAY_JS + "\n</section>", 1)
        s[key]["settings"]["custom_liquid"] = cl
        notizen.append(f"{key}: autoplay → lazyplay (preload=none, 600 px vor dem Bild)")

    neu = pre + json.dumps(t, ensure_ascii=False, indent=2)
    json.loads(neu[len(pre):])
    return neu, notizen


def patch_card_gallery(src):
    if MARK in src:
        return src, ["card-gallery: schon gepatcht"]
    anker = ("    assign sizes_attribute = '(min-width: 750px) [viewport_width]vw, 100vw' | replace: '[viewport_width]', viewport_width\n"
             "    assign image_sizes = sizes_attribute | strip\n"
             "  endif\n")
    assert anker in src, "card-gallery: sizes-Block nicht gefunden"
    zusatz = (
        f"  # {MARK}: Bei 2 Spalten auf dem Handy ist eine Karte 50-60 vw breit, nicht 100 vw\n"
        "  # (gemessen 390 px: Karussell 234 px, Raster 189 px). Mit «100vw» lud der Browser width=832 (152 KB)\n"
        "  # statt ~480 (52 KB) — 16 eager-Bilder auf der Startseite; Safari kennt sizes=auto nicht, dort alle.\n"
        "  if section.settings.mobile_columns == '2' or section.settings.mobile_columns == 2\n"
        "    assign image_sizes = image_sizes | replace: ', 100vw', ', 60vw'\n"
        "  endif\n"
    )
    return src.replace(anker, anker + zusatz, 1), ["card-gallery: Mobil-sizes 60vw bei 2 Spalten"]


def patch_product_media(src):
    if MARK in src:
        return src, ["product-media: schon gepatcht"]
    alt = "  assign widths = widths | default: '240, 352, 832, 1200, 1600, 1920, 2560, 3840'\n"
    assert alt in src, "product-media: widths-Zeile nicht gefunden"
    neu = (f"  # {MARK}: Stufen 480 + 600 ergänzt — Handy-Karten brauchen 380-700 px, bisher sprang srcset von 352 auf 832.\n"
           "  assign widths = widths | default: '240, 352, 480, 600, 832, 1200, 1600, 1920, 2560, 3840'\n")
    return src.replace(alt, neu, 1), ["product-media: widths 480, 600 ergänzt"]


def diff(a, b, name):
    d = list(difflib.unified_diff(a.splitlines(), b.splitlines(), name, name + " (neu)", lineterm="", n=1))
    return "\n".join(d)


def main():
    names = ["templates/index.json", "snippets/card-gallery.liquid", "snippets/product-media.liquid"]
    live = lese(names)
    neu = {}
    alle_notizen = []
    # Jeder Patch für sich: findet einer seinen Anker nicht (z. B. Tati-Block bewusst entfernt = Rücknahme),
    # bleibt diese Datei unverändert, die anderen laufen weiter.
    for n, fn in ((names[0], patch_index), (names[1], patch_card_gallery), (names[2], patch_product_media)):
        try:
            neu[n], nz = fn(live[n])
        except AssertionError as e:
            neu[n], nz = live[n], [f"{n}: NICHT angefasst — {e}"]
        alle_notizen += nz
    for n in alle_notizen:
        print("  " + n)
    zu_schreiben = [n for n in names if neu[n] != live[n]]
    for n in zu_schreiben:
        if n.endswith(".json"):
            # Nur die geänderten custom_liquid-Blöcke zeigen
            a = json.loads(live[n][live[n].index("{"):]); b = json.loads(neu[n][neu[n].index("{"):])
            for k in a["sections"]:
                ca = a["sections"][k].get("settings", {}).get("custom_liquid"); cb = b["sections"][k].get("settings", {}).get("custom_liquid")
                if ca != cb:
                    print(f"\n--- {n} · {k} ---"); print(diff(ca or "", cb or "", k))
        else:
            print(f"\n--- {n} ---"); print(diff(live[n], neu[n], n))
    if not zu_schreiben:
        print("nichts zu schreiben"); return
    if not SCHARF:
        print(f"\nDRY: {len(zu_schreiben)} Dateien würden geschrieben: {zu_schreiben}"); return
    files = [{"filename": n, "body": {"type": "TEXT", "value": neu[n]}} for n in zu_schreiben]
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": THEME, "files": files})["themeFilesUpsert"]
    if r.get("userErrors"):
        print("FEHLER", r["userErrors"]); sys.exit(1)
    print("geschrieben:", [f["filename"] for f in r["upsertedThemeFiles"]])
    # Rücklesen (23.09.: direkt danach kommt noch die alte Datei — bis 5× warten)
    for _ in range(5):
        time.sleep(4)
        back = lese(zu_schreiben)
        ok = all(back[n] == neu[n] for n in zu_schreiben)
        if ok:
            break
    print("Rücklesen identisch:", ok, {n: back[n] == neu[n] for n in zu_schreiben})


if __name__ == "__main__":
    main()
