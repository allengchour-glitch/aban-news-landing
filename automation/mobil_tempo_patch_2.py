#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mobil_tempo_patch_2.py — Plan-Tag 11 «Tempo & Mobil», zweite Runde (08.10.2026, Betreiber «mehr verbesserung»).

GEMESSEN VORHER (390 px, DPR 2, tools/browser.mjs, Startseite, OHNE zu scrollen, 08.10. 11:36 UTC):
  10'817 KB übertragen, davon 9'658 KB Bilder — 150 Bilddateien (in 171 von 398 <img>) geladen, obwohl der erste Bildschirm 2 Bilder zeigt.
  (05.10. nach Patch 1 waren es 3'014 KB.) Zwei Klassen:

  1. Karten-Vorladen (≈ 8 MB): Horizon `assets/product-card.js` #preloadNextPreviewImage() nimmt bei JEDER Karte in einem
     Karussell (Slideshow «isNested») dem ZWEITEN Bild das loading="lazy" weg — gleich beim connectedCallback, egal wo die
     Karte steht. 16 Karussell-Reihen × 8 Karten = 128 verdeckte Zweitbilder, auch 8'800 px unter dem Bildschirm, während
     das sichtbare Erstbild dort korrekt lazy wartet. Weil «auto» in sizes ohne lazy ungültig ist, wählte der Browser
     width=832 (Ø 70 KB, bis 247 KB) für eine 172-px-Karte. Server-HTML hat loading="lazy" (geprüft) — das Skript nimmt es weg.
     FIX: Das Zweitbild lädt erst, wenn das Erstbild geladen ist (das lädt nur nahe am Bildschirm), und bekommt als
     sizes die gemessene Kartenbreite (172px → width=352 statt 832). Zweck des Originals (kein weisser Blitz beim
     Wischen/Hover) bleibt: vorgeladen wird weiterhin, nur nicht mehr blind.
  2. Kollektions-Cover (1'438 KB): `snippets/resource-image.liquid` setzt bei layout grid/carousel IMMER loading="eager"
     und Mobil «100vw». Die Sektion collection_list steht an Position 7 (y ≈ 2'000 px) und rendert wegen
     grid + carousel_on_mobile DOPPELT (16 sichtbar + 16 display:none, alle eager) → 32× width=832.
     FIX: ab Sektion 3 (section.index > 2) lazy + sizes «auto, …»; Mobil 50vw bei mobile_columns 2; srcset-Stufen 480/600.

Design unverändert. Backups: theme_backup/<datei>.vor-tempo-2026-10-08
NUTZUNG:
    python3 automation/mobil_tempo_patch_2.py            # DRY: holt live, zeigt Diffs, schreibt nichts
    SCHARF=1 python3 automation/mobil_tempo_patch_2.py   # Backup, themeFilesUpsert, Rücklesen
Idempotent (Marke MARK). Rücknahme: Backup-Datei zurückschreiben.
"""
import difflib
import os
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from mobil_tempo_patch import THEME, lese  # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
MARK = "LuxeStyle Tempo 2026-10-08"

ALT_JS = """  #preloadNextPreviewImage() {
    const currentSlide = this.refs.slideshow?.slides?.[this.refs.slideshow?.current];
    currentSlide?.nextElementSibling?.querySelector('img[loading="lazy"]')?.removeAttribute('loading');
  }
"""
NEU_JS = f"""  #preloadNextPreviewImage() {{
    const currentSlide = this.refs.slideshow?.slides?.[this.refs.slideshow?.current];
    const next = currentSlide?.nextElementSibling?.querySelector('img[loading="lazy"]');
    if (!next) return;
    // {MARK}: Original nahm JEDER Karussell-Karte sofort das lazy vom Zweitbild — gemessen 128 verdeckte Bilder
    // (≈ 8 MB, width=832) beim Öffnen der Startseite auf dem Handy, auch 8'800 px unter dem Bildschirm.
    // Jetzt erst nach dem Laden des Erstbildes (das ist lazy = nur nahe am Bildschirm), sizes = gemessene Kartenbreite.
    const cur = currentSlide.querySelector('img');
    const vorladen = () => {{
      const w = cur ? Math.round(cur.getBoundingClientRect().width) : 0;
      const s = next.getAttribute('sizes') || '';
      if (w > 0) next.sizes = w + 'px';
      else if (s.startsWith('auto')) next.sizes = s.replace(/^auto,\\s*/, '');
      next.removeAttribute('loading');
    }};
    if (cur && !cur.complete) {{
      cur.addEventListener('load', vorladen, {{ once: true }});
      return;
    }}
    vorladen();
  }}
"""

ANKER_RI = """  assign widths = '240, 352, 832, 1200, 1600, 1920, 2560, 3840'
"""
NEU_RI = f"""  # {MARK}: Cover waren bei grid/carousel IMMER eager + Mobil 100vw — gemessen Startseite 32× width=832 (1'438 KB),
  # Sektion an Position 7 (y ≈ 2'000 px), wegen grid + carousel_on_mobile doppelt gerendert (16 davon display:none).
  # Ab Sektion 3 lazy (sizes auto), Mobil 50vw bei 2 Spalten, Stufen 480/600 zwischen 352 und 832.
  if section_settings.layout_type == 'grid' or section_settings.layout_type == 'carousel'
    if section_settings.mobile_columns == '2' or section_settings.mobile_columns == 2
      assign sizes = sizes | replace: ', 100vw', ', 50vw'
    endif
  endif
  if section.index > 2 and loading == 'eager'
    assign loading = 'lazy'
    assign sizes = 'auto, ' | append: sizes
  endif
  assign widths = '240, 352, 480, 600, 832, 1200, 1600, 1920, 2560, 3840'
"""


def patch_js(src):
    if MARK in src:
        return src, ["product-card.js: schon gepatcht"]
    assert ALT_JS in src, "product-card.js: #preloadNextPreviewImage nicht in Originalform"
    return src.replace(ALT_JS, NEU_JS, 1), ["product-card.js: Zweitbild erst nach Erstbild, sizes = Kartenbreite"]


def patch_ri(src):
    if MARK in src:
        return src, ["resource-image: schon gepatcht"]
    assert src.count(ANKER_RI) == 1, "resource-image: widths-Zeile nicht eindeutig"
    return src.replace(ANKER_RI, NEU_RI, 1), ["resource-image: lazy ab Sektion 3, Mobil 50vw, Stufen 480/600"]


def main():
    names = ["assets/product-card.js", "snippets/resource-image.liquid"]
    live = lese(names)
    neu, notizen = {}, []
    for n, fn in zip(names, (patch_js, patch_ri)):
        try:
            neu[n], nz = fn(live[n])
        except AssertionError as e:
            neu[n], nz = live[n], [f"{n}: NICHT angefasst — {e}"]
        notizen += nz
    for x in notizen:
        print("  " + x)
    zu = [n for n in names if neu[n] != live[n]]
    for n in zu:
        print(f"\n--- {n} ---")
        print("\n".join(difflib.unified_diff(live[n].splitlines(), neu[n].splitlines(), n, n + " (neu)", lineterm="", n=1)))
    if not zu:
        print("nichts zu schreiben"); return
    if not SCHARF:
        print(f"\nDRY: {len(zu)} Dateien würden geschrieben: {zu}"); return
    for n in zu:
        ziel = os.path.join(REPO, "theme_backup", n.split("/")[-1] + ".vor-tempo-2026-10-08")
        if not os.path.exists(ziel):
            open(ziel, "w", encoding="utf-8").write(live[n])
            print("Backup:", os.path.relpath(ziel, REPO))
    files = [{"filename": n, "body": {"type": "TEXT", "value": neu[n]}} for n in zu]
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files)"
            "{upsertedThemeFiles{filename} userErrors{field message}}}", {"id": THEME, "files": files})["themeFilesUpsert"]
    if r.get("userErrors"):
        print("FEHLER", r["userErrors"]); sys.exit(1)
    print("geschrieben:", [f["filename"] for f in r["upsertedThemeFiles"]])
    ok, back = False, {}
    for _ in range(5):
        time.sleep(4)
        back = lese(zu)
        ok = all(back.get(n) == neu[n] for n in zu)
        if ok:
            break
    print("Rücklesen identisch:", ok, {n: back.get(n) == neu[n] for n in zu})


if __name__ == "__main__":
    main()
