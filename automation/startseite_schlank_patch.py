#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""startseite_schlank_patch.py — Startseite schlank halten (Stufe A, Schritt A1, 14.10.2026)

ANLASS: dropship/STARTSEITE-UMBAU-PLAN-2026-10-13.md. Die Liquid-Änderungen A2–A5 sind am 14.10. von Hand gesetzt worden
(Backups theme_backup/*.vor-a{2,3,4,5}-2026-10-14). Ein Horizon-Update oder ein Klick im Theme-Editor kann jede dieser Dateien
wieder auf den Auslieferungsstand setzen. Dann kommen 120 unsichtbare Überschriften, 360× «?variant=» und rund 0,5 MB HTML
zurück, und niemand merkt es. Dieses Skript hält die Änderungen fest:

  - jede Änderung ist ein Baustein mit Datei, altem Text (Anker) und neuem Text;
  - steht der neue Text schon da, gilt der Baustein als gesetzt;
  - steht der alte Text GENAU EINMAL da, wird ersetzt (nur mit SCHARF=1);
  - sonst «Anker fehlt»: die Datei hat sich anders geändert. Dann wird NICHTS geschrieben und gemeldet
    (blind ersetzen hiesse, ein fremdes Update kaputtzumachen).

Bausteine (Marke `lx-schlank-2026-10-14` in jeder Datei):
  A2  blocks/_product-card-gallery.liquid   Zoom-out-Titel nur mit product_card_size, als <p> statt <h3>
  A3  snippets/product-card.liquid, snippets/card-gallery.liquid (2×), blocks/product-title.liquid
      Kartenlinks auf der Startseite (template.name == 'index') ohne ?variant=
  A4  snippets/card-gallery.liquid          Karussell: höchstens 2 Folien, keine Kartenpfeile, srcset bis 1200 w
  A5  sections/header.liquid                versteckte H1 weg (die sichtbare H1 steht im Hero)
      layout/theme.liquid                   Text-Schatten auch für h1 im Hero

templates/index.json (Hero-H1, USP-Kacheln) wird NUR GEPRÜFT, nie geschrieben: der Betreiber ändert diese Datei im Theme-Editor,
und die Tagesrotation schreibt sie auch. Ein Zurücksetzen würde gegen beide kämpfen (Plan §2 «Gilt für alle Massnahmen»).

Das Skript schreibt nur ins Theme mit role MAIN. Wird eine neue Theme-Kopie veröffentlicht (Horizon-Update), meldet es das,
statt still ins alte Theme zu schreiben (Skeptiker-Befund).

    python3 automation/startseite_schlank_patch.py              prüfen (DRY), Zeile «SCHLANK: …»
    SCHARF=1 python3 automation/startseite_schlank_patch.py     fehlende Bausteine setzen, Backup + md5-Zeile, zurücklesen
    python3 automation/startseite_schlank_patch.py --zurueck A3 [SCHARF=1]   Baustein(e) zurücknehmen (Rückweg)
    python3 automation/startseite_schlank_patch.py --selbsttest

Exit 0 = alles gesetzt oder gesetzt worden; 1 = Anker fehlt / Theme nicht MAIN / Rücklesen fehlgeschlagen (der Aufseher
versucht es beim nächsten Tick erneut und die Zeile steht im Log).
"""
import datetime as dt
import hashlib
import json
import os
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))

THEME = "gid://shopify/OnlineStoreTheme/187533001089"
MARKE = "lx-schlank-2026-10-14"
SCHARF = os.environ.get("SCHARF") == "1"
BACKUP_DIR = os.path.join(REPO, "theme_backup")
MD5_TSV = os.path.join(BACKUP_DIR, "SCHLANK-MD5.tsv")

A3_KOPF = ("{%- comment -%} lx-schlank-2026-10-14 A3: Kartenlinks auf der Startseite ohne ?variant= (360× → 0), "
           "sonst unverändert {%- endcomment -%}\n")
INDEX_HREF = "{% if template.name == 'index' %}{{ product.url }}{% else %}"

# (Baustein, Datei, Art, alt, neu) — Art «ersetzen» oder «vorn» (Kopfzeile voranstellen, alt = None)
BAUSTEINE = [
    ("A2", "blocks/_product-card-gallery.liquid", "ersetzen",
     "{% # Title and price for the zoomed out grid view %}\n"
     "<div class=\"product-grid-view-zoom-out--details\">\n"
     "  {% if product == blank %}\n"
     "    <h3 class=\"h4\">{{ 'content.product_card_placeholder' | t }}</h3>\n"
     "  {% else %}\n"
     "    <h3 class=\"h4\">{{ product.title }}</h3>\n"
     "    <span class=\"h6\">\n"
     "      {%- if product.compare_at_price > product.price -%}<s>{{ product.compare_at_price | money }}</s> {% endif -%}\n"
     "      {{ product.price | money }}\n"
     "    </span>\n"
     "  {% endif %}\n"
     "</div>\n",
     "{% # Title and price for the zoomed out grid view %}\n"
     "{%- comment -%} lx-schlank-2026-10-14 A2: nur wo es die Zoom-out-Ansicht gibt (Kollektionsraster mit product_card_size); als <p>,\n"
     "  nicht <h3> — auf der Startseite waren es 120 unsichtbare Überschriften. {%- endcomment -%}\n"
     "{%- unless section.settings.product_card_size == blank -%}\n"
     "<div class=\"product-grid-view-zoom-out--details\">\n"
     "  {% if product == blank %}\n"
     "    <p class=\"h4\">{{ 'content.product_card_placeholder' | t }}</p>\n"
     "  {% else %}\n"
     "    <p class=\"h4\">{{ product.title }}</p>\n"
     "    <span class=\"h6\">\n"
     "      {%- if product.compare_at_price > product.price -%}<s>{{ product.compare_at_price | money }}</s> {% endif -%}\n"
     "      {{ product.price | money }}\n"
     "    </span>\n"
     "  {% endif %}\n"
     "</div>\n"
     "{%- endunless -%}\n"),
    ("A3", "snippets/product-card.liquid", "vorn", None, A3_KOPF),
    ("A3", "snippets/product-card.liquid", "ersetzen",
     "      href=\"{{ variant_to_link.url }}\"\n",
     "      href=\"" + INDEX_HREF + "{{ variant_to_link.url }}{% endif %}\"\n"),
    ("A3", "snippets/card-gallery.liquid", "vorn", None, A3_KOPF),
    ("A3", "snippets/card-gallery.liquid", "ersetzen",
     "      ref=\"cardGalleryLink\"\n      href=\"{{ product.selected_or_first_available_variant.url }}\"\n",
     "      ref=\"cardGalleryLink\"\n      href=\"" + INDEX_HREF
     + "{{ product.selected_or_first_available_variant.url }}{% endif %}\"\n"),
    ("A3", "snippets/card-gallery.liquid", "ersetzen",
     "        ref=\"productTitleLink\"\n        href=\"{{ product.selected_or_first_available_variant.url }}\"\n",
     "        ref=\"productTitleLink\"\n        href=\"" + INDEX_HREF
     + "{{ product.selected_or_first_available_variant.url }}{% endif %}\"\n"),
    ("A3", "blocks/product-title.liquid", "vorn", None, A3_KOPF),
    ("A3", "blocks/product-title.liquid", "ersetzen",
     "    href=\"{{ closest.product.selected_or_first_available_variant.url }}\"\n",
     "    href=\"{% if template.name == 'index' %}{{ closest.product.url }}{% else %}"
     "{{ closest.product.selected_or_first_available_variant.url }}{% endif %}\"\n"),
    ("A4", "snippets/card-gallery.liquid", "ersetzen",
     "      elsif settings.show_second_image_on_hover\n"
     "        assign max_visible_slide_count = 2\n"
     "      endif\n"
     "\n"
     "      capture slides\n",
     "      elsif settings.show_second_image_on_hover\n"
     "        assign max_visible_slide_count = 2\n"
     "      endif\n"
     "\n"
     "      # lx-schlank-2026-10-14 A4: in Produkt-KARUSSELLS (Startseitenreihen, 120 Karten) nur Erstbild + Hover-Bild und keine\n"
     "      # Kartenpfeile (die Reihenpfeile bleiben); kürzeres srcset (Karten sind auf dem Handy 380–700 px breit).\n"
     "      assign lx_card_widths = nil\n"
     "      if section.settings.layout_type == 'carousel'\n"
     "        assign max_visible_slide_count = 2\n"
     "        assign show_arrows = false\n"
     "        assign lx_card_widths = '240, 352, 480, 600, 832, 1200'\n"
     "      endif\n"
     "\n"
     "      capture slides\n"),
    ("A4", "snippets/card-gallery.liquid", "ersetzen",
     "render 'product-media', media: media, sizes: sizes, loading: loading, preview_image_only: true\n",
     "render 'product-media', media: media, sizes: sizes, loading: loading, preview_image_only: true, widths: lx_card_widths\n"),
    ("A5", "sections/header.liquid", "ersetzen",
     "  {%- if request.page_type == 'index' -%}\n"
     "    <h1 class=\"visually-hidden\">{{ shop.name }}</h1>\n"
     "  {%- endif -%}\n",
     "  {%- comment -%} lx-schlank-2026-10-14 A5: versteckte H1 entfernt — die Startseite hat jetzt die sichtbare H1 im Hero "
     "{%- endcomment -%}\n"),
    ("A5", "layout/theme.liquid", "ersetzen",
     "section[id$=\"__hero_jVaWmY\"] .hero__content-wrapper h2, section[id$=\"__hero_jVaWmY\"] .hero__content-wrapper p "
     "{ text-shadow",
     "section[id$=\"__hero_jVaWmY\"] .hero__content-wrapper h1, section[id$=\"__hero_jVaWmY\"] .hero__content-wrapper h2, "
     "section[id$=\"__hero_jVaWmY\"] .hero__content-wrapper p { text-shadow"),
]
DATEIEN = sorted({b[1] for b in BAUSTEINE})


def baustein_stand(text, art, alt, neu):
    """→ 'gesetzt' | 'offen' (Anker genau 1×) | 'anker_fehlt'"""
    if art == "vorn":
        return "gesetzt" if neu.strip() in text else "offen"
    if neu in text:
        return "gesetzt"
    return "offen" if text.count(alt) == 1 else "anker_fehlt"


def anwenden(text, bausteine):
    """Setzt alle offenen Bausteine einer Datei. → (neuer_text, [(name, stand_vorher)])"""
    bericht = []
    for name, _datei, art, alt, neu in bausteine:
        st = baustein_stand(text, art, alt, neu)
        bericht.append((name, st))
        if st != "offen":
            continue
        text = neu + text if art == "vorn" else text.replace(alt, neu, 1)
    return text, bericht


def zuruecknehmen(text, bausteine):
    """Rückweg: nimmt gesetzte Bausteine zurück (neu → alt). → (neuer_text, [(name, getan)])"""
    bericht = []
    for name, _datei, art, alt, neu in reversed(bausteine):
        if art == "vorn":
            if text.startswith(neu):
                text = text[len(neu):]
                bericht.append((name, True))
            else:
                bericht.append((name, False))
        elif text.count(neu) == 1:
            text = text.replace(neu, alt, 1)
            bericht.append((name, True))
        else:
            bericht.append((name, False))
    return text, bericht


def index_pruefen(raw):
    """Nur prüfen: Hero-H1 + USP-Marke in templates/index.json. → Liste Befunde"""
    try:
        k = raw.find("{", raw.find("*/")) if raw.lstrip().startswith("/*") else raw.find("{")
        j = json.loads(raw[k:])
    except Exception as e:
        return [f"index.json nicht lesbar ({type(e).__name__})"]
    b = []
    hero = ((j.get("sections") or {}).get("hero_jVaWmY") or {}).get("blocks") or {}
    if not any("<h1" in str((bl.get("settings") or {}).get("text", "")) for bl in hero.values()):
        b.append("Hero ohne <h1> (Betreiber/Editor geändert? nicht automatisch zurücksetzen)")
    usp = str((((j.get("sections") or {}).get("lux_usp") or {}).get("settings") or {}).get("custom_liquid", ""))
    if usp and f"{MARKE} A5" not in usp:
        b.append("USP-Kacheln ohne A5-Marke")
    return b


def md5(s):
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def lese_live():
    from kaufwille_zeile import gql
    q = ('query($id:ID!,$f:[String!]){theme(id:$id){role files(filenames:$f,first:20){nodes{filename '
         'body{... on OnlineStoreThemeFileBodyText{content}}}}}}')
    t = gql(q, {"id": THEME, "f": DATEIEN + ["templates/index.json"]})["theme"]
    return t["role"], {x["filename"]: x["body"]["content"] for x in t["files"]["nodes"]}


def schreiben(neu, alt, grund):
    from kaufwille_zeile import gql
    stempel = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    neu_md5 = not os.path.exists(MD5_TSV)
    with open(MD5_TSV, "a", encoding="utf-8") as f:
        if neu_md5:
            f.write("zeit\tdatei\tmd5_vorher\tmd5_nachher\tgrund\n")
        for fn, txt in neu.items():
            bk = os.path.join(BACKUP_DIR, f"{os.path.basename(fn)}.schlank-{stempel}")
            if not os.path.exists(bk):                       # erstes Backup des Tages = Stand vor dem Patch
                open(bk, "w", encoding="utf-8").write(alt[fn])
            f.write(f"{dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')}\t{fn}\t{md5(alt[fn])}\t{md5(txt)}\t{grund}\n")
    files = [{"filename": fn, "body": {"type": "TEXT", "value": txt}} for fn, txt in neu.items()]
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files)"
            "{upsertedThemeFiles{filename} userErrors{field message}}}", {"id": THEME, "files": files})["themeFilesUpsert"]
    if r["userErrors"]:
        print("SCHLANK: ⚠️ Fehler beim Schreiben:", r["userErrors"])
        return False
    for _ in range(8):                                       # zurücklesen (erste Antwort nach Upsert kann alt sein)
        time.sleep(4)
        _, live = lese_live()
        if all(md5(live.get(fn, "")) == md5(txt) for fn, txt in neu.items()):
            return True
    print("SCHLANK: ⚠️ Rücklesen: Inhalt weicht nach 32 s noch ab")
    return False


def main(argv):
    zurueck = argv[argv.index("--zurueck") + 1].split(",") if "--zurueck" in argv else None
    role, live = lese_live()
    if role != "MAIN":
        print(f"SCHLANK: ⚠️ Theme {THEME.rsplit('/', 1)[-1]} ist nicht MAIN ({role}) — neues Theme veröffentlicht? "
              "Nichts geschrieben; Theme-ID in den Patch-Skripten nachziehen.")
        return 1
    fehlt = [fn for fn in DATEIEN if fn not in live]
    if fehlt:
        print(f"SCHLANK: ⚠️ Datei(en) fehlen im Theme: {', '.join(fehlt)}")
        return 1
    neu, zeilen, anker_fehlt = {}, [], []
    for fn in DATEIEN:
        bs = [b for b in BAUSTEINE if b[1] == fn and (zurueck is None or b[0] in zurueck)]
        if not bs:
            continue
        if zurueck:
            txt, ber = zuruecknehmen(live[fn], bs)
            zeilen += [f"{n} {fn}: {'zurück' if g else 'nicht gesetzt'}" for n, g in ber]
        else:
            txt, ber = anwenden(live[fn], bs)
            zeilen += [f"{n} {fn}: {s}" for n, s in ber if s != "gesetzt"]
            anker_fehlt += [f"{n} {fn}" for n, s in ber if s == "anker_fehlt"]
        if txt != live[fn]:
            neu[fn] = txt
    idx = [] if zurueck else index_pruefen(live.get("templates/index.json", ""))
    gesetzt = sum(1 for b in BAUSTEINE if baustein_stand(live[b[1]], b[2], b[3], b[4]) == "gesetzt")
    for z in zeilen:
        print("  " + z)
    ok = True
    if neu and SCHARF:
        ok = schreiben(neu, live, "zurueck " + ",".join(zurueck) if zurueck else "Baustein fehlte (Theme-Update/Editor?)")
        print(f"  geschrieben: {', '.join(neu)} · Rücklesen {'ok' if ok else 'FEHLT'}")
    elif neu:
        print(f"  TROCKEN: würde schreiben: {', '.join(neu)} (SCHARF=1)")
    befunde = ([f"Anker fehlt: {', '.join(anker_fehlt)}"] if anker_fehlt else []) + idx + ([] if ok else ["Schreiben/Rücklesen"])
    print(f"SCHLANK: {'⚠️ ' if befunde else ''}{gesetzt}/{len(BAUSTEINE)} Bausteine gesetzt"
          + (f" · {len(neu)} Datei(en) {'neu gesetzt' if SCHARF else 'offen'}" if neu else "")
          + (" · " + "; ".join(befunde) if befunde else ""))
    return 1 if (anker_fehlt or not ok) else 0


def selbsttest():
    """Arbeitet auf den Backups vor A2–A5 (Auslieferungsstand) — ohne Netz."""
    vor = {
        "blocks/_product-card-gallery.liquid": "_product-card-gallery.liquid.vor-a2-2026-10-14",
        "snippets/product-card.liquid": "product-card.liquid.vor-a3-2026-10-14",
        "snippets/card-gallery.liquid": "card-gallery.liquid.vor-a3-2026-10-14",
        "blocks/product-title.liquid": "product-title.liquid.vor-a3-2026-10-14",
        "sections/header.liquid": "header.liquid.vor-a5-2026-10-14",
        "layout/theme.liquid": "theme.liquid.vor-a5-2026-10-14",
    }
    ok_n, faelle = 0, []
    for fn, b in vor.items():
        orig = open(os.path.join(BACKUP_DIR, b), encoding="utf-8").read()
        bs = [x for x in BAUSTEINE if x[1] == fn]
        p1, ber1 = anwenden(orig, bs)
        p2, ber2 = anwenden(p1, bs)
        z, _ = zuruecknehmen(p1, bs)
        kaputt = orig.replace(bs[-1][3], "XX", 1) if bs[-1][2] == "ersetzen" else orig
        _, berk = anwenden(kaputt, bs)
        faelle += [
            (f"{fn}: alle offen im Auslieferungsstand", all(s == "offen" for _, s in ber1)),
            (f"{fn}: alle Bausteintexte nach Patch", all(x[4].strip() in p1 for x in bs)),
            (f"{fn}: zweiter Lauf ändert nichts", p2 == p1 and all(s == "gesetzt" for _, s in ber2)),
            (f"{fn}: Rückweg = Original", z == orig),
        ]
        if bs[-1][2] == "ersetzen":
            faelle.append((f"{fn}: fremde Änderung → anker_fehlt", berk[-1][1] == "anker_fehlt"))
    cg, _ = anwenden(open(os.path.join(BACKUP_DIR, vor["snippets/card-gallery.liquid"]), encoding="utf-8").read(),
                     [x for x in BAUSTEINE if x[1] == "snippets/card-gallery.liquid"])
    faelle += [
        ("card-gallery: 0× variant-href ohne Index-Weiche",
         cg.count('href="{{ product.selected_or_first_available_variant.url }}"') == 0),
        ("card-gallery: widths an product-media", "widths: lx_card_widths" in cg),
        ("index.json: Hero ohne h1 → Befund", any("h1" in x for x in index_pruefen(
            '{"sections":{"hero_jVaWmY":{"blocks":{"t":{"settings":{"text":"<h2>x</h2>"}}}}}}'))),
        ("index.json: Hero mit h1 + Marke → kein Befund", index_pruefen(
            '{"sections":{"hero_jVaWmY":{"blocks":{"t":{"settings":{"text":"<h1>x</h1>"}}}},'
            '"lux_usp":{"settings":{"custom_liquid":"<!-- lx-schlank-2026-10-14 A5: x -->"}}}}') == []),
    ]
    for name, bed in faelle:
        print(f"  {'OK  ' if bed else 'FEHL'} {name}")
        ok_n += bool(bed)
    print("SELBSTTEST", "OK" if ok_n == len(faelle) else f"FEHLER ({len(faelle) - ok_n} von {len(faelle)})")
    return 0 if ok_n == len(faelle) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(main(sys.argv[1:]))
