#!/usr/bin/env python3
"""saison_texte_2026_10_08.py — Saison- und Geschenkwelt-Kollektionstexte nach Messung neu (Plan Tag 10, 08.10.2026).

GEMESSEN 08.10. (aktive Produkte je Kollektion, productType + Titelstichprobe):
  weihnachten-2026  250 aktiv: Partydeko 97 (LED-Kerzen, Glocken, Christbaumschmuck), Damenmode 54 (Pullover, Familien-Pyjamas),
                    Wohnen 23 (Kissenbezüge, Stuhlhussen), Haustier 18 — Text sagte «der grösste Teil sind Pullover …» = falsch.
  geschenke-fuer-*  je 400 (geschenk_unterwelten.py: ≥ 2 Bilder, CHF 19–150) — Texte versprachen «garantiert», «sicher,
                    hochwertig», «handverlesen» (ausgewählt wird per Skript nach Warenart). Sie: Taschen 73, Uhren 47, Schmuck 47,
                    Haarstyling 44, Aroma-Diffuser 27; Ihn: Taschen/Portemonnaies 113, Uhren 65, Camping-Küche 58, Smartwatches 54;
                    Kinder: Klemmbausteine 118, Puzzles 77, ferngesteuerte Modelle 42. Unter CHF 30: Weihnachten 92 %, Sie 64 %,
                    Kinder 57 %, Ihn 51 % (→ bei «Ihn» KEINE Aussage «die meisten unter 30»). Alter steht NICHT verlässlich am Artikel → keine Aussage.
  winter-kaelte     497 aktiv: Winterstiefel 102, Handschuhe 84, Heiz… 40, beheizbar 21, Handwärmer 12, Hundejacken —
                    Text nannte zuerst Heizungen/Heizdecken.
  herbst-favoriten / halloween: Inhalt stimmt, aber keine Querverweise zu Ratgebern und Nachbar-Saisons.
Erlaubte Zusagen nur die geprüften: Gratis-Versand ab CHF 50, 30 Tage Rückgabe, TWINT/Klarna, Lieferzeit auf der Produktseite.
Mengen («rund 250») hält kollektion_mengen_wache.py täglich nach. Einmal-Lauf; Altwerte im Ledger.

  python3 automation/saison_texte_2026_10_08.py   (trocken)   ·   SCHARF=1 python3 automation/saison_texte_2026_10_08.py
"""
import json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
LEDGER = os.path.join(REPO, "dropship", "_saison_texte_2026-10-08.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
R = "/blogs/ratgeber/"
U30 = "/collections/%F0%9F%8E%81-geschenke-bis-chf-30"
VERSAND = ("<p>🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · TWINT, Klarna oder Karte · "
           "–10 % auf die erste Bestellung mit Code WELCOME10</p>")   # Code GEMESSEN 08.10.: ACTIVE bis 31.12.2027, 1× je Kundin


def mehr(*links):
    return "<p><strong>Mehr Ideen:</strong> " + " · ".join(f'<a href="{u}">{t}</a>' for u, t in links) + "</p>"


TEXTE = {
    "weihnachten-2026": dict(
        kopf=("<p>Weihnachten 2026 bei LuxeStyle: rund 250 Artikel, die du heute bestellen kannst, die meisten unter CHF 30. Den grössten Teil "
              "macht die Deko aus: LED-Kerzen, Glocken mit Tannenzweig, Girlanden, Christbaumschmuck zum Selbermachen und Stuhlhussen im "
              "Schneemann-Look. Dazu kommen Weihnachtspullover, Hoodies und Pyjamas im Partnerlook für die ganze Familie, Kissenbezüge fürs "
              "Sofa und für Hund und Katze Halsbänder mit Schleife, Spielzeug und ein Countdown-Kalender.</p>"
              "<h2>Rechtzeitig bestellen</h2><p>Viele Artikel kommen per Direktversand. Die genaue Lieferzeit steht auf jeder Produktseite. "
              "Wer alles bis Weihnachten zu Hause haben will, bestellt am besten bis Mitte November.</p>"
              + mehr(("/collections/geschenke-fuer-sie", "Geschenke für sie"), ("/collections/geschenke-fuer-ihn", "Geschenke für ihn"),
                     ("/collections/geschenke-fuer-kinder", "Geschenke für Kinder"), ("/collections/adventskalender", "Adventskalender"),
                     (R + "weihnachtsgeschenke-2026-schweiz-ideen", "Ratgeber: Weihnachtsgeschenke 2026"))
              + VERSAND),
        seo="Weihnachtsdeko, Weihnachtspullover und Familien-Pyjamas, Kissenbezüge und Geschenke für Hund und Katze. Rechtzeitig bestellen, Versand in die Schweiz."),
    "geschenke-fuer-sie": dict(
        kopf=("<p>Geschenkideen für Frauen, nach Warenart gemischt: Handtaschen und Umhängetaschen, Damenuhren, Schmuck, Haarstyling-Geräte "
              "wie Lockenstab und Glätteisen, Aroma-Diffuser mit Farblicht und schöne Aufbewahrung. Jeder Artikel hat mindestens zwei Bilder, "
              "die Preise liegen zwischen CHF 19 und 150, die meisten unter CHF 30.</p>"
              + mehr(("/collections/geschenke-fuer-ihn", "Geschenke für ihn"), ("/collections/geschenke-fuer-kinder", "für Kinder"),
                     (U30, "Geschenke bis CHF 30"), ("/collections/weihnachten-2026", "Weihnachten"),
                     (R + "geschenke-fuer-frauen-2026-schweiz", "Ratgeber: Geschenke für Frauen"))
              + VERSAND),
        seo="Geschenkideen für Frauen: Handtaschen, Damenuhren, Schmuck, Lockenstab und Glätteisen, Aroma-Diffuser. Ab CHF 19, Versand in die Schweiz."),
    "geschenke-fuer-ihn": dict(
        kopf=("<p>Geschenkideen für Männer, nach Warenart gemischt: Rucksäcke, Umhängetaschen und Portemonnaies aus Leder, Herrenuhren, "
              "Smartwatches, Camping-Kochsets und Tischgrills für draussen. Jeder Artikel hat mindestens zwei Bilder, die Preise liegen "
              "zwischen CHF 19 und 150.</p>"
              + mehr(("/collections/geschenke-fuer-sie", "Geschenke für sie"), ("/collections/geschenke-fuer-kinder", "für Kinder"),
                     (U30, "Geschenke bis CHF 30"), ("/collections/weihnachten-2026", "Weihnachten"),
                     (R + "geschenke-fuer-maenner-2026-schweiz", "Ratgeber: Geschenke für Männer"))
              + VERSAND),
        seo="Geschenkideen für Männer: Rucksäcke und Portemonnaies, Herrenuhren, Smartwatches, Camping-Kochsets. Ab CHF 19, Versand in die Schweiz."),
    "geschenke-fuer-kinder": dict(
        kopf=("<p>Geschenkideen für Kinder zum Bauen, Tüfteln und Spielen: Klemmbaustein-Bausätze (Helikopter, Baumhaus, Drachenboot), "
              "3D-Holzpuzzles und Knobelspiele, ferngesteuerte Modelle und Bastelsets. Jeder Artikel hat mindestens zwei Bilder, die "
              "Preise liegen zwischen CHF 19 und 150, die meisten unter CHF 30.</p>"
              + mehr(("/collections/geschenke-fuer-sie", "Geschenke für sie"), ("/collections/geschenke-fuer-ihn", "für ihn"),
                     (U30, "Geschenke bis CHF 30"), ("/collections/adventskalender", "Adventskalender"),
                     (R + "weihnachtsgeschenke-2026-schweiz-ideen", "Ratgeber: Weihnachtsgeschenke 2026"))
              + VERSAND),
        seo="Geschenkideen für Kinder: Klemmbaustein-Bausätze, 3D-Holzpuzzles, Knobelspiele, ferngesteuerte Modelle und Bastelsets. Versand in die Schweiz."),
    "winter-kaelte": dict(
        kopf=("<p>Alles gegen Kälte: gefütterte Winterstiefel und Schneestiefel für Damen, Herren und Kinder, warme Handschuhe – auch "
              "touchscreen-fähig oder beheizbar –, Handwärmer, beheizbare Westen und Pullover, Heizdecken und kleine Heizgeräte für Zuhause. Für Hund und Katze gibt es "
              "Winterjacken und wärmende Mäntel.</p>"
              + mehr(("/collections/winterjacken", "Winterjacken"), ("/collections/winterschuhe", "Winterschuhe"),
                     ("/collections/herbst-favoriten", "Herbst-Favoriten"), ("/collections/weihnachten-2026", "Weihnachten"))
              + VERSAND),
        seo="Gegen Kälte: Winterstiefel, warme und beheizbare Handschuhe, Handwärmer, Heizdecken und Winterjacken für Hunde. Versand in die Schweiz."),
    "herbst-favoriten": dict(
        anhaengen=mehr(("/collections/halloween", "Halloween"), ("/collections/winter-kaelte", "Winter & Kälte"),
                       ("/collections/winterjacken", "Winterjacken"), (R + "wohn-ideen-herbst-2026", "Ratgeber: Herbst-Deko"))),
    "halloween": dict(
        anhaengen=mehr((R + "halloween-deko-selber-machen-10-ideen-ratgeber", "Ratgeber: Halloween-Deko selber machen"),
                       (R + "halloween-kostuem-damen-12-ideen-ratgeber", "12 Kostüm-Ideen für Damen"),
                       ("/collections/herbst-favoriten", "Herbst-Favoriten"))),
}
MARKER = re.compile(r"<!--gd2-->|<!-- ls-verwandt -->")
VERBOTEN = re.compile(r"garantiert|hochwertig|handverlesen|sicher,|perfekt|exklusiv", re.I)


def neu_html(alt, t):
    m = MARKER.search(alt)
    rest = alt[m.start():] if m else ""
    if "kopf" in t:
        return t["kopf"] + rest
    vorne = alt[:m.start()] if m else alt
    if "Mehr Ideen:" in vorne:
        return alt
    return vorne + t["anhaengen"] + rest


def main():
    from kaufwille_zeile import gql
    for h, t in TEXTE.items():
        for s in (t.get("kopf", ""), t.get("seo", ""), t.get("anhaengen", "")):
            assert not VERBOTEN.search(s), (h, VERBOTEN.search(s).group(0))
            assert len(t.get("seo", "")) <= 160, (h, len(t["seo"]))
    ok = fe = 0
    for h, t in TEXTE.items():
        c = gql('query($h:String!){collectionByHandle(handle:$h){id descriptionHtml seo{title description}}}', {"h": h})["collectionByHandle"]
        neu = neu_html(c["descriptionHtml"], t)
        seo = t.get("seo") or c["seo"]["description"]
        if neu == c["descriptionHtml"] and seo == c["seo"]["description"]:
            print(f"  = {h}: schon so"); continue
        print(f"  {h}: {len(c['descriptionHtml'])} → {len(neu)} Zeichen · SEO {len(seo)}")
        if not SCHARF:
            continue
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{descriptionHtml seo{description}} userErrors{message}}}',
                {"i": {"id": c["id"], "descriptionHtml": neu, "seo": {"title": c["seo"]["title"], "description": seo}}})["collectionUpdate"]
        col = (r or {}).get("collection") or {}
        gut = r and not r["userErrors"] and col.get("descriptionHtml") == neu and col["seo"]["description"] == seo
        ok += bool(gut); fe += not gut
        with open(LEDGER, "a", encoding="utf-8") as led:
            led.write("\t".join([h, "gesetzt" if gut else "fehler", time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()),
                                 json.dumps({"descriptionHtml": c["descriptionHtml"], "seo": c["seo"]}, ensure_ascii=False)]) + "\n")
    print(f"FERTIG: SAISON-TEXTE {len(TEXTE)}{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'}")


if __name__ == "__main__":
    main()
