#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
theme_reparatur_14_08.py — die drei Theme-Reparaturen vom 14.08.2026, idempotent nachfahrbar.

BEFUND (aus dropship/FEHLERSUCHE-14-08.md, jeder Punkt vor der Änderung live nachgemessen mit
Playwright/iPhone 390x844 über den Agent-Proxy, Skript-Muster wie automation/site_shot.mjs):

  1. [mobil] Der Cookie-Banner verdeckte den Kauf-Knopf der Sticky-Kaufleiste auf JEDER der
     31'398 aktiven Produktseiten. Gemessen auf /products/edelstahl-uhr-herren-klassisch:
     Kaufleiste y=770..844 (z-index 7), Banner y=708..828 (z-index 99999), Knopf 52x52 px bei
     x=327/y=781 → 24 von 25 Rasterpunkten trafen #lx-cookie-banner. Auf
     /products/premium-leder-geldborse-slim identisch.
     URSACHE: Der Banner trug «bottom:16px» als INLINE-Style im Markup. Die Reparatur vom
     09.08. stand als Stylesheet-Regel OHNE !important da und konnte einen Inline-Wert nie
     überschreiben — sie war vom ersten Tag an tot.

  2. [menue] Das Menü »Footer menu« (gid://shopify/Menu/310224126337, 14 Einträge) wurde auf
     der Storefront nirgends gerendert. URSACHE: sections/footer-group.json enthielt im
     Abschnitt footer_m9NzUG nur zwei Blöcke (Newsletter-Text + E-Mail-Anmeldung) und KEINEN
     Block vom Typ «menu». Das Menü war in der Shopify-Navigation gepflegt, aber vom Theme
     schlicht nie abgefragt — 12 von 14 Service- und Rechtsseiten (Impressum, AGB, Widerruf,
     Versand, Rückgabe, Sendungsverfolgung, FAQ …) waren aus der Navigation unerreichbar.

  3. [mobil] Die eigene Handy-Suchleiste #luxsb-wrap stand zusätzlich zur Theme-Suche auf jeder
     Produktseite: [16, 115, 358, 65], zusammen mit Ankündigungsband und Kopfzeile 180 von
     844 px = 21 % des ersten Bildschirms. URSACHE: Die Ausblend-Regel lautete
     «body.template-product #luxsb-wrap{display:none}», Horizon setzt dem <body> aber gar keine
     Seitentyp-Klasse — live stand dort auf jeder Seite nur
     «page-width-narrow card-hover-effect-lift».

FEHLTREFFER / GEGENPROBEN AUS DEM PROBELAUF — was NICHT angefasst wurde und warum:

  a) Erste Messung meldete «0/25 verdeckt» und sah nach Erfolg aus — der Kauf-Knopf lag aber
     bei y=884, also UNTERHALB des 844-px-Bildschirms, weil die Kaufleiste erst nach weiterem
     Scrollen einfährt. elementFromPoint gab dort schlicht null zurück. Eine 0 aus einer
     Messung, die den Knopf gar nicht erreicht, sieht genauso aus wie eine behobene Verdeckung.
     Erst mit scrollTo(0,2200)+scrollBy(0,400) stand die Leiste im Bild.

  b) Nach der Reparatur meldete die Messung erneut «0/25», die Treffer waren aber ein
     klassenloses DIV statt der Kaufleiste. Das war NICHT der Cookie-Banner, sondern das
     E-Mail-Popup #lx-pop (z-index 99998, inset:0, volle 390x844), das 7 s nach dem Laden
     erscheint und alles überdeckt. Vorher war es unsichtbar, weil der Cookie-Banner (99999)
     an dieser Stelle darüber lag. Ein «0» wäre hier ein Fehlschluss gewesen. Für die
     Abnahme des Banner-Fixes wird das Popup per localStorage vorab stummgeschaltet und
     zusätzlich gegengeprüft, dass alle 25 Punkte die KAUFLEISTE treffen — nicht bloss «nicht
     den Banner». Das Popup selbst wurde bewusst NICHT verändert: es ist ein absichtlicher
     Modal-Dialog mit Schliesskreuz, einmal je Besucher, und seine Taktung ist eine
     Marketing-Entscheidung, keine Theme-Panne. Es steht als eigener Befund im Bericht.

  c) Der z-index des Banners wurde NICHT gesenkt. Dann läge der Banner unter der Kaufleiste
     und seine eigenen Knöpfe («Alle akzeptieren»/«Nur notwendige») wären unantippbar — der
     Fehler wäre nur umgezogen. Nachgeprüft wird deshalb beides: Knopf frei UND beide
     Banner-Knöpfe weiterhin erreichbar.

  d) Die Suchleiste wird NUR auf der Produktseite ausgeblendet, nicht global. Auf Start- und
     Kollektionsseite ist der erste Bildschirm nicht der Kaufabschluss, dort bleibt sie. Sie
     wird auch nicht gelöscht, nur ausgeblendet — der Block lux_searchbar in
     sections/header-group.json bleibt unangetastet und ist mit einer Zeile wieder da.

  e) Vor dem Setzen der neuen body-Klasse wurde assets/base.css und das ausgelieferte
     Live-HTML nach «.template-» durchsucht: einziger Treffer war die eigene tote Regel.
     Die Klasse kann also nichts Bestehendes umschalten.

  f) Für das Footer-Menü wurde bewusst EIN Block auf die BESTEHENDE Liste «footer» gesetzt,
     statt zwei neue Menüs anzulegen und die Einträge zu verteilen. Zwei neue Listen hätten
     schöner ausgesehen, aber das gepflegte »Footer menu« stillgelegt: wer es künftig im Admin
     bearbeitet, hätte sich gewundert, dass sich nichts ändert. Nichts wurde gelöscht.

QUELLE (Regel 7 — wer schreibt das Feld beim nächsten Mal?):
  Alle drei Fehler leben in Theme-Dateien, die kein Importer und kein Automat neu schreibt.
  Es gibt hier also keine nachlaufende Quelle zu reparieren. Die EINE Stelle, die sie
  zurückbringen kann, ist der Shopify-Theme-Editor: sections/footer-group.json trägt oben
  ausdrücklich «auto-generated … may be overwritten». Deshalb steht der Grund jeder Änderung
  als Kommentar direkt an der geänderten Zeile in layout/theme.liquid, und dieses Skript kann
  den Stand jederzeit erneut herstellen und nachprüfen.

NUTZUNG:
    python3 automation/theme_reparatur_14_08.py --pruefen    # nur berichten (Vorgabe)
    python3 automation/theme_reparatur_14_08.py --anwenden   # fehlende Reparaturen setzen

  Das Skript ist idempotent: es liest die Live-Theme-Dateien, prüft je Reparatur, ob sie schon
  drinsteht, und schreibt nur das Fehlende. Vor jedem Schreiben legt es eine Sicherung unter
  /tmp/theme_backup/ ab. Ein fehlgeschlagener API-Aufruf gilt NICHT als Erfolg (Regel 6).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time

THEME_ID = "gid://shopify/OnlineStoreTheme/187533001089"
SHOP = "au3j0y-hq.myshopify.com"
API = f"https://{SHOP}/admin/api/2024-10/graphql.json"
TOKEN_DATEI = "/tmp/cj_shop_token.txt"
SICHERUNG = "/tmp/theme_backup"

MARKE_KAUFKNOPF = "lux-fix-20260814-kaufknopf"
MARKE_SUCHLEISTE = "lux-fix-20260814-suchleiste"
MENUE_BLOCK_ID = "menu_service_recht"


def gql(query, variables=None):
    """Ein GraphQL-Aufruf. Wirft bei jedem Fehler — eine gescheiterte Anfrage ist kein Ergebnis."""
    token = open(TOKEN_DATEI).read().strip()
    daten = json.dumps({"query": query, "variables": variables or {}})
    p = subprocess.run(
        ["curl", "-sS", "-X", "POST", API,
         "-H", f"X-Shopify-Access-Token: {token}",
         "-H", "Content-Type: application/json",
         "--data-binary", "@-"],
        input=daten, capture_output=True, text=True, timeout=120,
    )
    if p.returncode != 0:
        raise RuntimeError(f"curl fehlgeschlagen: {p.stderr[:400]}")
    antwort = json.loads(p.stdout)
    if "errors" in antwort:
        raise RuntimeError(f"GraphQL-Fehler: {json.dumps(antwort['errors'])[:600]}")
    return antwort["data"]


def datei_lesen(name):
    d = gql(
        'query($f:[String!]){ theme(id:"%s"){ files(filenames:$f, first:1){ nodes{ filename '
        'body{ ... on OnlineStoreThemeFileBodyText { content } '
        '... on OnlineStoreThemeFileBodyUrl { url } } } } } }' % THEME_ID,
        {"f": [name]},
    )
    knoten = d["theme"]["files"]["nodes"]
    if not knoten:
        raise RuntimeError(f"Theme-Datei nicht gefunden: {name}")
    koerper = knoten[0]["body"]
    if "content" in koerper:
        return koerper["content"]
    p = subprocess.run(["curl", "-sS", koerper["url"]], capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError(f"Konnte Dateikoerper nicht laden: {name}")
    return p.stdout


def datei_schreiben(name, inhalt):
    os.makedirs(SICHERUNG, exist_ok=True)
    alt = datei_lesen(name)
    pfad = os.path.join(SICHERUNG, name.replace("/", "__") + "." + time.strftime("%Y%m%d-%H%M%S"))
    with open(pfad, "w") as f:
        f.write(alt)
    d = gql(
        "mutation($tid:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){"
        " themeFilesUpsert(themeId:$tid, files:$files){"
        "  upsertedThemeFiles{ filename } userErrors{ filename code message } } }",
        {"tid": THEME_ID, "files": [{"filename": name, "body": {"type": "TEXT", "value": inhalt}}]},
    )
    fehler = d["themeFilesUpsert"]["userErrors"]
    if fehler:
        raise RuntimeError(f"themeFilesUpsert meldete Fehler: {json.dumps(fehler)}")
    if not d["themeFilesUpsert"]["upsertedThemeFiles"]:
        raise RuntimeError("themeFilesUpsert lieferte keine Datei zurueck — gilt als NICHT geschrieben")
    return pfad


# ---------------------------------------------------------------- Reparatur 1 + 3 (theme.liquid)

CSS_KAUFKNOPF = """
<style id="%s">
/* 14.08.2026 — Cookie-Banner ueber die Sticky-Kaufleiste heben.
   Der Banner trug «bottom» als INLINE-Style; eine Stylesheet-Regel ohne !important kann das
   nie ueberschreiben — daran scheiterte die Reparatur vom 09.08. Der Inline-Wert ist jetzt
   entfernt, die Position lebt hier. Nicht zurueck ins style="" schreiben. */
#lx-cookie-banner { bottom: 16px; }
body:has(.sticky-add-to-cart__bar) #lx-cookie-banner { bottom: 90px; }
</style>
""" % MARKE_KAUFKNOPF

CSS_SUCHLEISTE = """
<style id="%s">
/* 14.08.2026 — doppelte Handy-Suchleiste auf der Produktseite ausblenden.
   Die Regel vom 09.08. hing an body.template-product; Horizon setzt diese Klasse nicht.
   Sie wird jetzt in layout/theme.liquid selbst gesetzt (Wurzel), die zweite Bedingung
   main[data-template] traegt auch ohne sie. */
@media (max-width: 749px) {
  body.template-product #luxsb-wrap,
  body:has(main[data-template='product']) #luxsb-wrap { display: none !important; }
}
</style>
""" % MARKE_SUCHLEISTE


def pruefe_theme_liquid(inhalt):
    befunde = {
        "banner_inline_bottom_weg": "bottom:16px;left:16px" not in inhalt,
        "css_kaufknopf": MARKE_KAUFKNOPF in inhalt,
        "js_banner_platzierung": "lxBannerPlatzieren" in inhalt,
        "css_suchleiste": MARKE_SUCHLEISTE in inhalt,
        "body_template_klasse": "template-{{ template.name }}" in inhalt,
    }
    return befunde


def repariere_theme_liquid(inhalt):
    """Setzt nur, was fehlt. Gibt (neuer_inhalt, liste_der_aenderungen) zurueck."""
    aenderungen = []

    # 1a — «bottom:16px» aus dem Inline-Style des Banners entfernen
    if "bottom:16px;left:16px" in inhalt:
        inhalt = inhalt.replace(
            'style="display:none;position:fixed;bottom:16px;left:16px;',
            'style="display:none;position:fixed;left:16px;', 1)
        aenderungen.append("Inline-«bottom» aus #lx-cookie-banner entfernt")

    # 1b — CSS-Block fuer die Banner-Position
    if MARKE_KAUFKNOPF not in inhalt:
        inhalt = inhalt.replace("</head>", CSS_KAUFKNOPF + "</head>", 1)
        aenderungen.append("CSS-Block %s ergaenzt" % MARKE_KAUFKNOPF)

    # 1c — Laufzeit-Rueckfall im Banner-Skript (Browser ohne :has())
    if "lxBannerPlatzieren" not in inhalt:
        alt = ('      if(!localStorage.getItem(KEY)){\n'
               '        setTimeout(function(){banner.style.display="block"},800);\n'
               '      }')
        neu = ('      function lxBannerPlatzieren(){\n'
               '        if(!banner) return;\n'
               '        var leiste=document.querySelector(".sticky-add-to-cart__bar");\n'
               '        var h=leiste?Math.round(leiste.getBoundingClientRect().height):0;\n'
               '        banner.style.bottom=(h>0?h+16:16)+"px";\n'
               '      }\n'
               '      if(!localStorage.getItem(KEY)){\n'
               '        setTimeout(function(){lxBannerPlatzieren();banner.style.display="block"},800);\n'
               '        setTimeout(lxBannerPlatzieren,2500);\n'
               '        window.addEventListener("resize",lxBannerPlatzieren);\n'
               '      }')
        if alt in inhalt:
            inhalt = inhalt.replace(alt, neu, 1)
            aenderungen.append("Laufzeit-Rueckfall lxBannerPlatzieren() ergaenzt")

    # 3a — CSS-Block fuer die Suchleiste
    if MARKE_SUCHLEISTE not in inhalt:
        inhalt = inhalt.replace("</head>", CSS_SUCHLEISTE + "</head>", 1)
        aenderungen.append("CSS-Block %s ergaenzt" % MARKE_SUCHLEISTE)

    # 3b — Seitentyp-Klasse an den <body> (die Wurzel)
    if "template-{{ template.name }}" not in inhalt:
        m = re.search(r'<body class="([^"]*)"', inhalt)
        if m and "template-" not in m.group(1):
            inhalt = inhalt.replace(
                m.group(0), '<body class="%s template-{{ template.name }}"' % m.group(1), 1)
            aenderungen.append("Seitentyp-Klasse template-{{ template.name }} an <body> gesetzt")

    return inhalt, aenderungen


# ------------------------------------------------------------- Reparatur 2 (footer-group.json)

MENUE_BLOCK = {
    "type": "menu",
    "settings": {
        "menu": "footer",           # die BESTEHENDE Liste »Footer menu«, bewusst keine neue
        "heading": "Service & Rechtliches",
        "menu_spacing": 10,
        "show_as_accordion": True,  # auf dem Handy zusammengeklappt, sonst 14 Zeilen Fusszeile
        "accordion_icon": "caret",
        "accordion_dividers": False,
        "inherit_color_scheme": True,
        "color_scheme": "",
        "heading_preset": "h4",
        "link_preset": "paragraph",
        "padding-block-start": 0,
        "padding-block-end": 0,
        "padding-inline-start": 0,
        "padding-inline-end": 0,
    },
    "blocks": {},
}


def footer_zerlegen(roh):
    m = re.match(r"\s*/\*.*?\*/\s*", roh, re.S)
    kopf = m.group(0) if m else ""
    return kopf, json.loads(roh[m.end():] if m else roh)


def pruefe_footer(roh):
    _, d = footer_zerlegen(roh)
    for abschnitt in d.get("sections", {}).values():
        if abschnitt.get("type") != "footer":
            continue
        for block in abschnitt.get("blocks", {}).values():
            if block.get("type") == "menu":
                return True
    return False


def repariere_footer(roh):
    kopf, d = footer_zerlegen(roh)
    aenderungen = []
    for sid, abschnitt in d.get("sections", {}).items():
        if abschnitt.get("type") != "footer":
            continue
        if any(b.get("type") == "menu" for b in abschnitt.get("blocks", {}).values()):
            continue
        abschnitt.setdefault("blocks", {})[MENUE_BLOCK_ID] = MENUE_BLOCK
        abschnitt.setdefault("block_order", []).append(MENUE_BLOCK_ID)
        aenderungen.append("Menue-Block %s in Abschnitt %s ergaenzt" % (MENUE_BLOCK_ID, sid))
        break
    return kopf + json.dumps(d, indent=2, ensure_ascii=False) + "\n", aenderungen


# ------------------------------------------------------------------------------------ Hauptlauf

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--anwenden", action="store_true", help="fehlende Reparaturen wirklich setzen")
    ap.add_argument("--pruefen", action="store_true", help="nur berichten (Vorgabe)")
    args = ap.parse_args()
    scharf = args.anwenden

    theme = datei_lesen("layout/theme.liquid")
    footer = datei_lesen("sections/footer-group.json")

    print("== Stand layout/theme.liquid")
    for k, v in pruefe_theme_liquid(theme).items():
        print("   %-28s %s" % (k, "ok" if v else "FEHLT"))
    print("== Stand sections/footer-group.json")
    print("   %-28s %s" % ("menue_block_im_footer", "ok" if pruefe_footer(footer) else "FEHLT"))

    neu_theme, aend_theme = repariere_theme_liquid(theme)
    neu_footer, aend_footer = repariere_footer(footer)

    if not aend_theme and not aend_footer:
        print("\nNichts zu tun — alle drei Reparaturen stehen.")
        return 0

    print("\nWuerde aendern:")
    for a in aend_theme + aend_footer:
        print("   -", a)

    if not scharf:
        print("\nProbelauf. Mit --anwenden wirklich schreiben.")
        return 0

    if aend_theme:
        p = datei_schreiben("layout/theme.liquid", neu_theme)
        print("geschrieben: layout/theme.liquid (Sicherung %s)" % p)
    if aend_footer:
        p = datei_schreiben("sections/footer-group.json", neu_footer)
        print("geschrieben: sections/footer-group.json (Sicherung %s)" % p)

    # Gegenprobe gegen die Live-Datei, nicht gegen die eigene Variable
    theme2 = datei_lesen("layout/theme.liquid")
    footer2 = datei_lesen("sections/footer-group.json")
    offen = [k for k, v in pruefe_theme_liquid(theme2).items() if not v]
    if not pruefe_footer(footer2):
        offen.append("menue_block_im_footer")
    if offen:
        print("NACHKONTROLLE FEHLGESCHLAGEN, offen:", offen)
        return 1
    print("Nachkontrolle gegen die Live-Dateien: alle drei Reparaturen stehen.")
    print("HINWEIS: Shopifys Edge-Cache liefert danach noch Minuten lang die alte Seite —")
    print("         Storefront erst nachpruefen, wenn der neue Marker im HTML auftaucht.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
