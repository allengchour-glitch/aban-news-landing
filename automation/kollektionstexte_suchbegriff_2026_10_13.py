#!/usr/bin/env python3
"""kollektionstexte_suchbegriff_2026_10_13.py — erster Absatz + SEO-Beschreibung mit GEMESSENEN Suchbegriffen (SEO-Sofort
ON-M7 + K5, 13.10.2026). Einmal-Lauf wie saison_texte_2026_10_08.py; die Texte hier SIND die Quelle (kein Tageslauf
überschreibt sie — geprüft 13.10.: saison_texte ist ein Einmal-Lauf, koll_seo_fuellen füllt nur LEERE SEO-Texte,
koll_seo_laengen kürzt nur > 160 Zeichen, kollektion_mengen_wache ändert nur «über/rund N Artikel», geschenk_unterwelten
schreibt nur Regel + Sortierung, interne_links nur den ls-verwandt-Block).

WARUM (GEMESSEN):
  ON-M7  Search Console 10.07.–10.10.: die einzigen Kollektionen, die im Index sind UND Impressionen haben —
         beamer-heimkino «beamer für handy» 13 Impr. Pos. 46,8 · sub-beleuchtung «stimmungslicht» 7 Impr. Pos. 22,3 ·
         fussball-fanshop «fussball online shop schweiz» 6 Impr. Pos. 67,3. beleuchtung-lampen ist NICHT veröffentlicht
         (301 → sub-beleuchtung); Sternenhimmel-Begriffe gehören zu licht-nachtlicht-projektor → sub-beleuchtung
         verlinkt dorthin, statt selbst mit Sternenhimmel zu werben.
  K5     OpenSEO (nicht gegengeprüft): geschenke für freundin 2'400 · mama 1'900 · papa 1'600 · freund 1'000 /Monat.
         Warenarten live gezählt 13.10. (Kategorien aus geschenk_unterwelten.py): für Sie 399 aktiv — Beauty 71, Schmuck 70
         (43 Armbänder), Taschen 70, Duft/Diffuser 69, Damenuhren 52, Schals 30; für Ihn 397 — Uhren 63, Taschen 63,
         Portemonnaies & Leder 62, Grill/Bar 62 (48 Grill), Technik 61 (39 Smartwatches), Camping 61, Bartpflege 25.
         Preise 19.90–129.90 bzw. 124.90. weihnachten-2026: 11 aktive Weihnachtskugel-Artikel ohne eigene Kollektion
         (K4 verworfen) → Absatz «Christbaumschmuck» mit Links auf vier davon.
Inhalte live gezählt (beamer-heimkino 32 aktiv: 5 Titel mit Handy/Smartphone; sub-beleuchtung 308: Steh/Decke/Wand 80,
Nachtlicht 55, Tisch/Nachttisch 53, Sternenhimmel 35, Solar 23; fussball-fanshop 29: Fussballschuhe 7, Trikots/Shirts 3,
Bälle/Tore/Training 9, Taschen 3, Hund 5, Wandlampe 1). Keine Mengenzahlen im Text (die müsste jemand nachführen).

REGELN (Tor vor jedem Schreiben, wie saison_texte 08.10.): du-Form, ss statt ß, «Gratis-Versand ab CHF 50», keine
Floskeln (perfekt/garantiert/hochwertig/exklusiv/handverlesen), keine Lieferzusage in Werktagen, beim Fussball keine
Vereins-/Verbandsnamen und kein «offiziell» (Lizenzrisiko); SEO-Beschreibung 110–155 Zeichen und enthält den Begriff;
SEO-TITEL BLEIBT (Kopfbegriff), seo{title,description} immer zusammen; jeder Link zeigt auf eine veröffentlichte
Kollektion mit ≥ 3 aktiven bzw. ein aktives Produkt im Onlineshop (live geprüft).
LEDGER: dropship/semrush/_kollektionstexte_suchbegriff_2026-10-13.tsv (Altwert descriptionHtml + seo als JSON) und für die
SEO-Beschreibung zusätzlich dropship/semrush/_seo_kollektion_ledger.tsv (Format von seo_kollektion_suchbegriff.py).
WÄCHTER danach (bestehend, täglich): kollektion_mengen_wache.py, kollektionstexte_wahrheit.py, koll_seo_laengen.py;
Produktlinks: interne_links.py --waisen → «KOLLEKTIONSTEXT-PRODUKTLINKS» (neu 13.10., täglich im Aufseher).

  python3 automation/kollektionstexte_suchbegriff_2026_10_13.py              Trockenlauf: Tor + Vorher/Nachher-Liste
  SCHARF=1 python3 automation/kollektionstexte_suchbegriff_2026_10_13.py     schreiben + zurücklesen
  SCHARF=1 python3 automation/kollektionstexte_suchbegriff_2026_10_13.py --zurueck   Altwerte zurück (nur wenn live noch
                                                                             unser Stand ist; ERZWINGEN=1 überschreibt)
"""
import csv, datetime as dt, html, json, os, re, sys, unicodedata

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql                     # mit Eimer-Etikette + Drossel-Geduld

SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship", "semrush", "_kollektionstexte_suchbegriff_2026-10-13.tsv")
SEO_LEDGER = os.path.join(REPO, "dropship", "semrush", "_seo_kollektion_ledger.tsv")
VERSAND = "<p>Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · TWINT, Klarna oder Karte · –10 % auf die erste Bestellung mit Code WELCOME10</p>"
MARK_A, MARK_E = "<!-- christbaumschmuck -->", "<!-- /christbaumschmuck -->"

TEXTE = {
    "beamer-heimkino": dict(
        kw="Beamer fürs Handy",
        kopf=("<p>Beamer fürs Handy und fürs Heimkino: Viele unserer Mini-Beamer verbinden sich per WLAN oder Kabel mit dem "
              "Smartphone – so läuft der Film vom Handy gross an der Wand, im Wohnzimmer, im Schlafzimmer oder beim Filmabend "
              "im Garten. Dazu findest du hier Smart-Beamer mit Android, die Apps direkt auf dem Gerät haben, und "
              "Full-HD-Projektoren fürs Heimkino.</p>"),
        seo=("Beamer fürs Handy und fürs Heimkino: Mini-Beamer mit WLAN oder Kabel, Smart-Beamer mit Android und "
             "Full-HD-Projektoren. Gratis-Versand ab CHF 50.")),
    "sub-beleuchtung": dict(
        kw="Stimmungslicht",
        kopf=("<p>Stimmungslicht für dein Zuhause: warmes Licht für den Abend auf dem Sofa, ein sanftes Nachtlicht im "
              "Kinderzimmer, Farbwechsel für die Leseecke. Hier findest du Steh-, Decken- und Wandleuchten, LED-Nachtlichter, "
              "Sonnenuntergangslampen und Deko-Leuchten. Wer Sterne an die Decke bringen will, findet die "
              "<a href=\"/collections/licht-nachtlicht-projektor\">Sternenhimmel-Projektoren und Nachtlichter</a> in einer "
              "eigenen Auswahl.</p>"),
        seo=("Stimmungslicht für Zuhause: Tisch- und Nachttischlampen, Steh- und Wandleuchten, LED-Nachtlichter und "
             "Solar-Gartenleuchten. Gratis-Versand ab CHF 50.")),
    "fussball-fanshop": dict(
        kw="Fussball-Fanartikel in der Schweiz",
        kopf=("<p>Fussball-Fanartikel in der Schweiz online bestellen: Trikots und Trainingsshirts, eine Fussball-Wandlampe "
              "fürs Fanzimmer und Rucksäcke für Training und Schule. Für den Platz und den Garten gibt es Fussballschuhe für Herren und "
              "Jugendliche, Bälle, Fussballtore, ein Rebound-Netz und Trainingsgurte – und für den Hund Fussball-Spielzeug "
              "und ein Hundetrikot.</p>"
              "<p><strong>Mehr für Fans:</strong> <a href=\"/collections/ft-fanartikel\">Fanartikel &amp; Länder</a> mit "
              "Fahnen, Caps und Schals · <a href=\"/collections/sport-outdoor\">Sport &amp; Outdoor</a></p>"
              + VERSAND),
        seo=("Fussball-Fanartikel in der Schweiz: Trikots, Fussball-Wandlampe, Rucksäcke, Fussballschuhe, Bälle und Tore "
             "fürs Training. Gratis-Versand ab CHF 50.")),
    "geschenke-fuer-sie": dict(
        kw="Geschenke für Freundin",
        kopf=("<p>Geschenke für Freundin, Frau &amp; Mama: Handtaschen und Umhängetaschen, Damenuhren und Schmuck – vor allem "
              "Armbänder –, dazu Lockenstab, Glätteisen und Schminkspiegel, Aroma-Diffuser und Kerzen, Schals und "
              "Kuscheldecken. Jeder Artikel hat mindestens zwei Bilder, die Preise liegen zwischen CHF 19 und 150, die meisten "
              "unter CHF 30.</p>"),
        seo=("Geschenke für Freundin, Frau & Mama: Handtaschen, Damenuhren, Schmuck, Lockenstab und Glätteisen, Aroma-Diffuser. "
             "Ab CHF 19, Gratis-Versand ab CHF 50.")),
    "geschenke-fuer-ihn": dict(
        kw="Geschenke für Freund",
        kopf=("<p>Geschenke für Freund, Mann &amp; Papa: Rucksäcke und Taschen, Portemonnaies und Kartenetuis, Herrenuhren "
              "und Smartwatches, dazu Grill-Zubehör, Camping-Ausrüstung und Bartpflege. Jeder Artikel hat mindestens zwei "
              "Bilder, die Preise liegen zwischen CHF 19 und 150.</p>"),
        seo=("Geschenke für Freund, Mann & Papa: Rucksäcke, Portemonnaies, Herrenuhren, Smartwatches, Grill- und "
             "Camping-Zubehör. Ab CHF 19, Gratis-Versand ab CHF 50.")),
    "weihnachten-2026": dict(
        kw="Christbaumschmuck",
        einfuegen=(MARK_A + "<h2>Christbaumschmuck und Weihnachtskugeln</h2><p>Für den Christbaum gibt es Weihnachtskugeln "
                   "in mehreren Varianten: <a href=\"/products/30er-set-weihnachtskugeln-6-cm-629400\">Weihnachtskugeln im "
                   "30er-Set</a> mit 6 cm, <a href=\"/products/retro-weihnachtskugeln-12er-set-615500\">Retro-Weihnachtskugeln "
                   "im 12er-Set</a>, <a href=\"/products/weihnachtskugeln-antik-look-601300\">Weihnachtskugeln im "
                   "Antik-Look</a> und ein <a href=\"/products/christbaumkugel-exquisites-design-geschenkball-647300\">"
                   "Christbaumkugel-Set in der Geschenkbox</a>. Wer lieber selbst bastelt, findet ein Häkel-Set für "
                   "eigene Baumanhänger.</p>" + MARK_E),
        seo=None),
}

VERBOTEN = re.compile(r"garantiert|hochwertig|handverlesen|sicher,|perfekt|exklusiv|offiziell|ß|\b[0-9]\s*[–-]\s*[0-9]+\s*Werktag", re.I)
SIE = re.compile(r"\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b")
VEREIN = re.compile(r"\bFC\b|young boys|\byb\b|basel|z[üu]rich|servette|lugano|barcelona|real madrid|bayern|juventus|liverpool|"
                    r"manchester|arsenal|chelsea|psg|champions league|uefa|fifa|\bnati\b|bundesliga|premier league", re.I)
LINK = re.compile(r'href="/(collections|products)/([^"#?]+)"')


def norm(t):
    t = unicodedata.normalize("NFKC", html.unescape(t or "")).lower().replace("ß", "ss")
    return re.sub(r"[\s\-–]+", " ", t).strip()


def tor(h, t):
    """Regelprüfung ohne Netz → Liste der Fehler."""
    f = []
    neu = t.get("kopf") or t.get("einfuegen") or ""
    for feld, s in (("Text", neu), ("SEO", t.get("seo") or "")):
        for rx, name in ((VERBOTEN, "verboten"), (SIE, "Sie-Form")):
            m = rx.search(s)
            if m:
                f.append(f"{feld}: {name} «{m.group(0)}»")
        if h == "fussball-fanshop" and VEREIN.search(s):
            f.append(f"{feld}: Vereins-/Verbandsname «{VEREIN.search(s).group(0)}»")
    if norm(t["kw"]) not in norm(neu):
        f.append("Text ohne Suchbegriff")
    if t.get("seo") is not None:
        if not (110 <= len(t["seo"]) <= 155):
            f.append(f"SEO {len(t['seo'])} Zeichen (110–155)")
        if norm(t["kw"]) not in norm(t["seo"]):
            f.append("SEO ohne Suchbegriff")
    return f


def links_ok(t):
    """Jeder Link: veröffentlichte Kollektion mit ≥ 3 aktiven bzw. aktives Produkt im Onlineshop (live)."""
    f = []
    for art, h in LINK.findall(t.get("kopf") or t.get("einfuegen") or ""):
        if art == "collections":
            c = gql('query($h:String!){c:collectionByHandle(handle:$h){id p:publishedOnPublication(publicationId:'
                    '"gid://shopify/Publication/301970915713")}}', {"h": h})["c"]
            n = gql('query($q:String!){productsCount(query:$q){count}}',
                    {"q": f"collection_id:{c['id'].split('/')[-1]} AND status:active"})["productsCount"]["count"] if c else 0
            if not c or not c["p"] or n < 3:
                f.append(f"/collections/{h} ({'fehlt' if not c else 'unveröffentlicht' if not c['p'] else f'{n} aktiv'})")
        else:
            p = gql('query($h:String!){p:productByHandle(handle:$h){status onlineStoreUrl}}', {"h": h})["p"]
            if not p or p["status"] != "ACTIVE" or not p["onlineStoreUrl"]:
                f.append(f"/products/{h} ({(p or {}).get('status') or 'fehlt'})")
    return f


def neu_html(alt, t):
    alt = alt or ""
    if "kopf" in t:
        m = re.match(r"\s*<p\b[^>]*>.*?</p>", alt, re.S)
        if not m:
            return None                                   # Text beginnt nicht mit einem Absatz → nicht raten
        return t["kopf"] + alt[m.end():]
    blk = re.compile(re.escape(MARK_A) + r".*?" + re.escape(MARK_E), re.S)
    if blk.search(alt):
        return blk.sub(lambda _: t["einfuegen"], alt, count=1)
    m = re.search(r"</p>", alt)
    if not m:
        return None
    return alt[:m.end()] + t["einfuegen"] + alt[m.end():]


def gleich(a, b):
    n = lambda s: re.sub(r">\s+<", "><", html.unescape(s or "")).strip()
    return n(a) == n(b)


def ledger(zeile):
    neu = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n")
        if neu:
            w.writerow(["zeit", "handle", "id", "alt_json", "neu_json", "status"])
        w.writerow(zeile)


Q = 'query($h:String!){c:collectionByHandle(handle:$h){id descriptionHtml seo{title description}}}'
M = ('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{descriptionHtml seo{title description}} '
     'userErrors{field message}}}')


def zurueck():
    """Altwerte aus dem Ledger zurück — nur wenn live noch unser geschriebener Stand ist (sonst hat danach jemand
    korrigiert; ERZWINGEN=1 schreibt trotzdem)."""
    if not os.path.exists(LEDGER):
        print("kein Ledger"); return
    letzte = {}
    for z in csv.DictReader(open(LEDGER, encoding="utf-8"), delimiter="\t"):
        if z["status"] == "ok":
            letzte[z["handle"]] = z
    for h, z in sorted(letzte.items()):
        alt, neu = json.loads(z["alt_json"]), json.loads(z["neu_json"])
        c = gql(Q, {"h": h})["c"]
        if not gleich(c["descriptionHtml"], neu["descriptionHtml"]) and os.environ.get("ERZWINGEN") != "1":
            print(f"  ÜBERSPRUNGEN {h}: live seit unserem Schreiben verändert"); continue
        print(f"  {h}: zurück auf Altwert" + ("" if SCHARF else " (trocken)"))
        if SCHARF:
            r = gql(M, {"i": {"id": z["id"], "descriptionHtml": alt["descriptionHtml"],
                              "seo": {"title": alt["seo"]["title"], "description": alt["seo"]["description"]}}})["collectionUpdate"]
            print("    ok" if not r["userErrors"] else f"    FEHLER {r['userErrors']}")


def main():
    if "--zurueck" in sys.argv:
        return zurueck()
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    ok = fe = gleich_n = 0
    for h, t in TEXTE.items():
        f = tor(h, t) + links_ok(t)
        c = gql(Q, {"h": h})["c"]
        if not c:
            f.append("Kollektion fehlt")
        neu = neu_html(c["descriptionHtml"], t) if c else None
        if c and neu is None:
            f.append("Text beginnt nicht mit <p> / kein </p> — nicht raten")
        if f:
            fe += 1
            print(f"  ✗ {h}: " + "; ".join(f)); continue
        seo_neu = t["seo"] if t.get("seo") is not None else c["seo"]["description"]
        if gleich(neu, c["descriptionHtml"]) and seo_neu == c["seo"]["description"]:
            gleich_n += 1
            print(f"  = {h}: schon so"); continue
        print(f"  ✓ {h} [{t['kw']}] Text {len(c['descriptionHtml'] or '')} → {len(neu)} Z. · SEO {len(seo_neu or '')} Z.\n"
              f"      ALT  SEO: {c['seo']['description']}\n      NEU  SEO: {seo_neu}\n"
              f"      NEU Text: {re.sub(r'<[^>]+>', '', (t.get('kopf') or t.get('einfuegen')))[:400]}")
        if not SCHARF:
            ok += 1; continue
        r = gql(M, {"i": {"id": c["id"], "descriptionHtml": neu,
                          "seo": {"title": c["seo"]["title"], "description": seo_neu}}})["collectionUpdate"]
        z = gql(Q, {"h": h})["c"]
        gut = not r["userErrors"] and gleich(z["descriptionHtml"], neu) and z["seo"]["description"] == seo_neu \
            and z["seo"]["title"] == c["seo"]["title"]
        ok += gut; fe += not gut
        st = "ok" if gut else "FEHLER " + json.dumps(r["userErrors"], ensure_ascii=False)[:150]
        ledger([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), h, c["id"],
                json.dumps({"descriptionHtml": c["descriptionHtml"], "seo": c["seo"]}, ensure_ascii=False),
                json.dumps({"descriptionHtml": neu, "seo": {"title": c["seo"]["title"], "description": seo_neu}}, ensure_ascii=False),
                st])
        if gut and t.get("seo") is not None:            # Rückweg auch über seo_kollektion_suchbegriff.py --zurueck
            with open(SEO_LEDGER, "a", encoding="utf-8") as led:
                led.write(f"{dt.date.today()}\t{h}\t{t['kw'].lower()}\t{c['seo']['title'] or ''}\t"
                          f"{(c['seo']['description'] or '').replace(chr(9), ' ')}\t{c['seo']['title'] or ''}\tok\n")
        print(f"    {st} (zurückgelesen)")
    print(f"FERTIG: KOLLEKTIONSTEXTE-SUCHBEGRIFF {len(TEXTE)} · {'geschrieben' if SCHARF else 'regelkonform'} {ok} · "
          f"schon so {gleich_n} · verworfen/Fehler {fe}")


if __name__ == "__main__":
    main()
