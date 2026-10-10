#!/usr/bin/env python3
"""meta_beschreibung_escape.py — <meta name="description"> genau EINMAL escapen (09.10.2026, Betreiber «nur 18 google
suche ist wenig warum»).

ANLASS (gemessen 09.10., Produktseite «2-teiliges Leinen-Set», SEO-Text gespeichert mit rohem «&»):
  og:description       content="… (Hemd &amp; Wide-Leg-Hose) …"       ← richtig (seit dem og-Fix)
  name="description"   content="… (Hemd &amp;amp; Wide-Leg-Hose) …"   ← doppelt: Google zeigt «&amp;» im Snippet
`page_description` liefert Shopify BEREITS escaped (Kommentar im selben Snippet, og-Fix). Die Zeile für
name="description" hängt trotzdem `| escape` an. Betroffen: jede Seite mit &, " oder < im SEO-Text — Stichprobe
2'500 aktive: 118 (≈ 5 %); der og-Fix zählte damals 7'041 von 28'705 im Google-Kanal. name="description" ist der
Text unter dem blauen Link in der Google-Suche.
REGEL: erst Entitäten zurück (&amp; &quot; &#39; &lt; &gt;), dann genau einmal `| escape` — richtig, egal ob der
Text von Shopify (escaped) oder aus unserem fallback_desc (roh) kommt.

  python3 automation/meta_beschreibung_escape.py              # Trockenlauf
  SCHARF=1 python3 automation/meta_beschreibung_escape.py     # Live-Datei holen, sichern (/tmp), ersetzen, zurücklesen
  python3 automation/meta_beschreibung_escape.py --pruefen    # Wächter: Marke + Formel live? (täglich im Aufseher)
"""
import os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

THEME = "gid://shopify/OnlineStoreTheme/187533001089"
DATEI = "snippets/meta-tags.liquid"
MARKE = "LUX-META-EINMAL-ESCAPE"
ALT = "{{ meta_desc | escape }}"
UNESC = "replace: '&amp;', '&' | replace: '&quot;', '\"' | replace: '&#39;', \"'\" | replace: '&lt;', '<' | replace: '&gt;', '>'"
NEU = "{{ meta_desc | " + UNESC + " | escape }}"
# 10.10.2026 (OpenSEO-Audit): Seiten OHNE SEO-Text bekommen von Shopify einen Auszug aus dem Inhalt — der kommt ZWEIFACH
# escaped («Kostüme &amp;amp; Fasnacht» in name="description" UND og:description, Seite alle-kategorien). Vor der Formel
# einmal einklappen; für Texte, die nur einfach escaped sind, ändert die Zeile nichts.
DOPPEL_MARKE = "LUX-META-DOPPEL"
DOPPEL_META = ("{%- assign meta_desc = meta_desc | replace: '&amp;amp;', '&amp;' -%}{%- comment -%} " + DOPPEL_MARKE +
               " (10.10.2026, automation/meta_beschreibung_escape.py): Auszug aus Seiteninhalt kommt zweifach escaped → einklappen. {%- endcomment -%}")
DOPPEL_OG = "  assign og_description = og_description | replace: '&amp;amp;', '&amp;'"
KOMMENTAR = ("{%- comment -%} " + MARKE + " (09.10.2026, automation/meta_beschreibung_escape.py): page_description kommt "
             "BEREITS escaped — gemessen «Hemd &amp;amp; Wide-Leg-Hose» im Google-Snippet-Text. Erst zurück, dann einmal "
             "escapen; gilt für Shopify-Text und fallback_desc gleich. {%- endcomment -%}\n")


def lese():
    r = gql('query($id:ID!){theme(id:$id){role files(filenames:["%s"],first:1){nodes{body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % DATEI,
            {"id": THEME})["theme"]
    return r["role"], r["files"]["nodes"][0]["body"]["content"]


def kanarien():
    """Liquid-Formel in Python nachgebaut: Shopify-escaped und roh ergeben dasselbe, einmal escaped."""
    import html
    def liquid(s):
        for a, b in (("&amp;", "&"), ("&quot;", '"'), ("&#39;", "'"), ("&lt;", "<"), ("&gt;", ">")):
            s = s.replace(a, b)
        return html.escape(s, quote=True).replace("&#x27;", "&#39;")
    def doppel(s):   # LUX-META-DOPPEL: Auszug aus Seiteninhalt kommt zweifach escaped → einmal einklappen
        return s.replace("&amp;amp;", "&amp;")
    roh = 'Hemd & Wide-Leg-Hose "Provence" <neu>'
    soll = "Hemd &amp; Wide-Leg-Hose &quot;Provence&quot; &lt;neu&gt;"
    faelle = [(roh, soll), (html.escape(roh, quote=True), soll), ("Schweizer Shop – 1–2 Werktage", "Schweizer Shop – 1–2 Werktage"),
              ("Kostüme &amp;amp; Fasnacht", "Kostüme &amp; Fasnacht")]   # 10.10.: Seite «alle-kategorien» ohne SEO-Text
    f = sum(liquid(doppel(a)) != b for a, b in faelle)
    print(f"META-KANARIEN {len(faelle) - f}/{len(faelle)}")
    return f == 0


def ohne_seo_text():
    """Veröffentlichte Seiten + Blogs ohne global.description_tag (und nicht per seo.hidden ausgeblendet)."""
    out, after = [], None
    while True:
        d = gql('query($a:String){pages(first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{handle isPublished '
                'm:metafield(namespace:"global",key:"description_tag"){value} h:metafield(namespace:"seo",key:"hidden"){value}}}}',
                {"a": after})["pages"]
        out += [f"/pages/{p['handle']}" for p in d["nodes"]
                if p["isPublished"] and not (p["m"] or {}).get("value") and (p["h"] or {}).get("value") != "1"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        after = d["pageInfo"]["endCursor"]
    for b in gql('{blogs(first:50){nodes{handle articlesCount{count} m:metafield(namespace:"global",key:"description_tag"){value}}}}')["blogs"]["nodes"]:
        if b["articlesCount"]["count"] and not (b["m"] or {}).get("value"):
            out.append(f"/blogs/{b['handle']}")
    return out


def main():
    if not kanarien():
        raise SystemExit("Kanarien rot")
    role, c = lese()
    if "--pruefen" in sys.argv:
        bef = []
        if role != "MAIN":
            bef.append(f"Theme nicht MAIN ({role})")
        if MARKE not in c or NEU not in c:
            bef.append("Marke/Formel fehlt (Theme-Update?) → SCHARF=1 erneut")
        if ALT in c:
            bef.append("doppeltes Escape wieder da")
        if DOPPEL_META.strip() not in c or DOPPEL_OG.strip() not in c:
            bef.append("Doppel-Einklappen fehlt (LUX-META-DOPPEL)")
        ohne = ohne_seo_text()
        if ohne:   # 10.10.: alle-kategorien (seit 14.08. neu) ohne SEO-Text → 323 Zeichen Auszug mit «&amp;amp;»
            bef.append(f"{len(ohne)} Seiten/Blogs ohne SEO-Text: {', '.join(ohne[:5])} (global.description_tag setzen)")
        print(("⚠️ META-ESCAPE: " + " · ".join(bef)) if bef else "META-ESCAPE ✓: name=\"description\" einmal escaped · alle Seiten/Blogs mit SEO-Text")
        return 1 if bef else 0
    neu = c
    if MARKE not in neu:
        if neu.count(ALT) != 1:
            raise SystemExit(f"Anker «{ALT}» {neu.count(ALT)}× (erwartet 1) — Snippet geändert, nicht blind ersetzen")
        i = neu.find("<meta\n    name=\"description\"")
        if i < 0:
            raise SystemExit("name=\"description\"-Block nicht gefunden")
        neu = neu[:i] + KOMMENTAR + neu[i:].replace(ALT, NEU, 1)
        print(f"{DATEI}: {ALT}  →  {NEU}")
    for zeile, anfang in ((DOPPEL_META, "{%- assign meta_desc = page_description"),
                          (DOPPEL_OG, "  assign og_description = og_description | replace: 'in die Schweiz und nach Deutschland'")):
        if zeile.strip() in neu:
            continue
        zeilen = neu.split("\n")
        treffer = [k for k, z in enumerate(zeilen) if z.lstrip().startswith(anfang.lstrip())]
        if len(treffer) != 1:
            raise SystemExit(f"Anker «{anfang[:50]}» {len(treffer)}× (erwartet 1) — nicht blind einfügen")
        z0 = zeilen[treffer[0]]
        zeilen.insert(treffer[0] + 1, z0[:len(z0) - len(z0.lstrip())] + zeile.strip())
        neu = "\n".join(zeilen)
        print(f"{DATEI}: + {zeile[:70]}")
    if neu == c:
        print("schon drin"); return 0
    if os.environ.get("SCHARF") != "1":
        print("TROCKEN — SCHARF=1 schreibt"); return 0
    pfad = f"/tmp/meta-tags.vor-einmal-escape.{int(time.time())}.liquid"
    open(pfad, "w", encoding="utf-8").write(c)
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": THEME, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"], "· Sicherung", pfad); return 1
    for _ in range(8):
        time.sleep(4)
        if lese()[1] == neu:
            print(f"GESCHRIEBEN + ZURÜCKGELESEN · Sicherung {pfad}"); return 0
    print("RÜCKLESEN FEHLT · Sicherung", pfad); return 1


if __name__ == "__main__":
    sys.exit(main())
