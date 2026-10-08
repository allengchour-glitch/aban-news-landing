#!/usr/bin/env python3
"""ratgeber_tag10_2026_10_08.py — Plan Tag 10 «SEO»: Ratgeber Herbst-Deko ausbauen, Weihnachtsgeschenke aktualisieren (08.10.2026).

GEMESSEN 08.10.: «wohn-ideen-herbst-2026» hatte 1'085 Zeichen, drei Produktlinks, keine SEO-Beschreibung; «weihnachtsgeschenke-
2026-schweiz-ideen» (29.05.) kennt die Geschenkwelten (für sie/ihn/Kinder, je 400) und die Weihnachten-Kollektion (250 aktiv)
nicht. Regeln: nur kaufbare Produkte (ACTIVE + im Onlineshop + ≥ 2 Bilder), Preis LIVE beim Schreiben (blog_preise_aktualisieren.py
hält ihn danach täglich nach: Format «<a …>Name</a> (CHF 22.90)», «Preise Stand TT.MM.JJJJ»), nur Angaben aus dem Produkttext
(Kerzenwärmer-Lampe = laut Text ein 5-V-Nachtlicht → NICHT aufgenommen). Altfassung als JSON in dropship/_ratgeber_vorher/.
Einmal-Lauf. Standard trocken; SCHARF=1 schreibt (articleUpdate + metafieldsSet title_tag/description_tag) und liest zurück.
"""
import datetime, json, os, re, sys, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
VORHER = os.path.join(REPO, "dropship", "_ratgeber_vorher")
HEUTE = datetime.date.today().strftime("%d.%m.%Y")
R = "/blogs/ratgeber/"
_P = {}


def p(handle, name=None):
    """Produktlink mit Live-Preis; bricht ab, wenn das Produkt nicht kaufbar ist."""
    if handle not in _P:
        d = gql('query($h:String!){productByHandle(handle:$h){title status onlineStoreUrl mediaCount{count} '
                'priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}}}}', {"h": handle})["productByHandle"]
        if not d or d["status"] != "ACTIVE" or not d["onlineStoreUrl"] or d["mediaCount"]["count"] < 2:
            raise SystemExit(f"NICHT KAUFBAR: {handle} → {d and (d['status'], bool(d['onlineStoreUrl']), d['mediaCount'])}")
        lo, hi = float(d["priceRangeV2"]["minVariantPrice"]["amount"]), float(d["priceRangeV2"]["maxVariantPrice"]["amount"])
        _P[handle] = (d["title"], ("ab " if hi > lo else "") + f"CHF {lo:.2f}")
    titel, preis = _P[handle]
    return f'<a href="/products/{urllib.parse.quote(handle, safe="-")}">{name or titel}</a> ({preis})'


def k(handle, text):
    return f'<a href="/collections/{urllib.parse.quote(handle, safe="-")}">{text}</a>'


def herbst():
    return dict(
        handle="wohn-ideen-herbst-2026",
        titel="Herbst-Deko 2026: 8 Ideen für ein gemütliches Zuhause",
        seo_titel="Herbst-Deko 2026: 8 Ideen fürs gemütliche Zuhause | LuxeStyle",
        seo_text="Herbst-Deko ohne Umbau: Kissen mit Kürbis und Ahornblatt, Kuscheldecken, LED-Teelichter, Solar-Laterne, Aroma-Diffuser. Mit Preisen in CHF.",
        body=f"""<p>Im Herbst wird die Wohnung wieder zur Hauptbühne. Für einen gemütlichen Look brauchst du keine neuen Möbel: Textilien, Licht und
ein paar Kürbisse, die man nicht schnitzen muss, reichen. Acht Ideen mit Artikeln, die du heute bestellen kannst.</p>
<h2>1. Kissen wechseln statt Möbel</h2>
<p>Ein neuer Kissenbezug verändert das Sofa schneller als alles andere. Herbstlich wird es mit dem {p("kissenbezug-mit-kurbis-stickerei-634500")}
aus Baumwolle oder der {p("kissenhulle-ahornblatt-kurbis-stickerei-608100")}. Wer es schlichter mag, nimmt den
{p("jacquard-strick-kissenbezug-mit-blattmuster-630016")} – das Strickmuster zeigt grosse Blätter, der Stoff ist pflegeleichtes Polyester.</p>
<h2>2. Eine Decke, die liegen bleiben darf</h2>
<p>Eine Decke über der Sofalehne ist Deko und Wärme zugleich. Klassisch: die {p("kuscheldecke-rot-schwarz-kariert-613800")} aus weichem
Polyester. Grob und auffällig: die {p("merino-wolldecke-handgestrickt-mit-extra-dicke-630300", "handgestrickte Kuscheldecke mit extra-dickem Garn")}
aus Acryl, in mehreren Grössen.</p>
<h2>3. Kürbisse, die nicht faulen</h2>
<p>Ein {p("kurbis-sitzkissen-aus-plusch-473088")} auf dem Sessel oder ein {p("kurbisformiger-korb-aus-baumwollseil-628700")} (24 × 29 cm) für
Wolle, Zeitschriften oder Hausschuhe – beides hält länger als ein echter Kürbis und bleibt bis Ende November stimmig.</p>
<h2>4. Warmes Licht statt Deckenlampe</h2>
<p>Am meisten Stimmung macht Licht auf Tischhöhe. Die {p("led-teelichter-flackernd-batteriebetrieben-594688")} flackern wie echte Kerzen,
aber ohne offene Flamme – praktisch mit Kindern oder Katze. Für Balkon oder Hauseingang lädt sich die
{p("solar-laterne-aus-schmiedeeisen-637600")} tagsüber auf und schaltet sich bei Dunkelheit selbst ein.</p>
<h2>5. Duft gehört dazu</h2>
<p>Der {p("aroma-diffuser-persimmon-kaki-frucht-design-mit-licht-🍂", "Aroma-Diffuser «Persimmon»")} sieht aus wie eine Kaki-Frucht, verteilt
feinen Duftnebel und hat ein sanftes Licht. Ein paar Tropfen Zimt-, Orangen- oder Vanilleöl, und der Herbst ist auch in der Nase angekommen.</p>
<h2>6. Der Tisch als Bühne</h2>
<p>Ein {p("tischlaufer-baumwolle-leinen-modern-minimalist-631100")} in Senf oder Rost, darauf das
{p("ahornblatt-serviertablett-aus-massivholz-626300")} mit Nüssen und Mandarinen – fertig ist die Herbst-Tafel.</p>
<h2>7. Für die Suppenabende</h2>
<p>Der {p("kurbis-gusseisentopf-mit-emaille-24cm-e59b09")} fasst 3–4 Liter, passt auf alle Herdarten inklusive Induktion und darf
nach dem Kochen direkt auf den Tisch.</p>
<h2>8. Auch der Hund macht mit</h2>
<p>Der {p("hunde-pullover-mit-kurbis-muster-624100")} gibt es von S bis XXL – für Spaziergänge an kühlen Abenden und für Halloween.</p>
<h2>Farben, die zusammenpassen</h2>
<p>Bleib bei drei bis vier Tönen: Orange oder Rost, Senfgelb, Braun und ein helles Creme. Holz und Strick bringen die Textur dazu.
Mehr braucht es nicht – lieber wenige grosse Stücke als viele kleine.</p>
<h2>Rechtzeitig bestellen</h2>
<p>Die meisten dieser Artikel kommen per Direktversand in 10–20 Werktagen; die genaue Lieferzeit steht auf jeder Produktseite. Wer die
Deko noch im Oktober geniessen will, bestellt jetzt.</p>
<p><strong>Mehr für die Saison:</strong> {k("herbst-favoriten", "Herbst-Favoriten")} · {k("halloween", "Halloween")} ·
<a href="{R}halloween-deko-selber-machen-10-ideen-ratgeber">Ratgeber: Halloween-Deko selber machen</a> · {k("winter-kaelte", "Winter &amp; Kälte")} ·
{k("wohnen-dekoration", "Wohnen &amp; Deko")}</p>
<p>Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Bezahlen mit TWINT, Klarna oder Karte. Preise Stand {HEUTE}.</p>""")


def weihnachten_block():
    """Neuer Abschnitt direkt vor «Geschenke bis CHF 30» im bestehenden Weihnachtsartikel."""
    return (f'<h2>Geschenkwelten 2026: nach Empfänger sortiert</h2>\n<p>Neu für diese Saison haben wir die Geschenke nach Empfänger und '
            f'Warenart geordnet – jede Welt mit 400 Artikeln, alle mit mindestens zwei Bildern:</p>\n<ul>'
            f'<li>{k("geschenke-fuer-sie", "Geschenke für sie")}: Handtaschen, Damenuhren, Schmuck, Lockenstab und Glätteisen, Aroma-Diffuser.</li>'
            f'<li>{k("geschenke-fuer-ihn", "Geschenke für ihn")}: Rucksäcke und Portemonnaies, Herrenuhren, Smartwatches, Camping-Kochsets.</li>'
            f'<li>{k("geschenke-fuer-kinder", "Geschenke für Kinder")}: Klemmbaustein-Bausätze, 3D-Holzpuzzles, ferngesteuerte Modelle.</li>'
            f'<li>{k("🎁-geschenke-bis-chf-30", "Geschenke bis CHF 30")} für Wichteln und Mitbringsel.</li></ul>\n'
            f'<p>Weihnachtsdeko, Weihnachtspullover und Familien-Pyjamas findest du gesammelt unter {k("weihnachten-2026", "Weihnachten 2026")}, '
            f'Kalender unter {k("adventskalender", "Adventskalender")} und im Ratgeber '
            f'<a href="{R}adventskalender-zum-befuellen-24-kleine-geschenke-ratgeber">Adventskalender zum Befüllen: 24 kleine Geschenke</a>.</p>\n')


def main():
    os.makedirs(VORHER, exist_ok=True)
    arts = {}
    cur = None
    while True:
        d = gql('query($c:String){articles(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title body '
                't:metafield(namespace:"global",key:"title_tag"){value} d:metafield(namespace:"global",key:"description_tag"){value}}}}',
                {"c": cur})["articles"]
        for n in d["nodes"]:
            arts[n["handle"]] = n
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    plan = []
    h = herbst()
    a = arts[h["handle"]]
    plan.append((a, h["titel"], h["body"], h["seo_titel"], h["seo_text"]))
    w = arts["weihnachtsgeschenke-2026-schweiz-ideen"]
    if "Geschenkwelten 2026" not in w["body"]:
        anker = re.search(r"<h2[^>]*>\s*Geschenke bis CHF 30", w["body"])
        if not anker:
            raise SystemExit("Anker «Geschenke bis CHF 30» im Weihnachtsartikel nicht gefunden")
        neu = w["body"][:anker.start()] + weihnachten_block() + w["body"][anker.start():]
        plan.append((w, w["title"], neu, (w["t"] or {}).get("value"), (w["d"] or {}).get("value")))
    for a, titel, body, st, sd in plan:
        txt = re.sub(r"<[^>]+>", " ", body)
        print(f"  {a['handle']}: Titel «{titel}» · {len(re.sub(chr(10), ' ', txt))} Zeichen · "
              f"{len(re.findall(r'href=', body))} Links · SEO {len(sd or '')}")
        assert len(sd or "") <= 160 and len(st or "") <= 70, (len(sd or ""), len(st or ""))
    if not SCHARF:
        print("TROCKEN — SCHARF=1 schreibt"); return
    ok = 0
    for a, titel, body, st, sd in plan:
        json.dump({k_: a.get(k_) for k_ in ("id", "handle", "title", "body", "t", "d")},
                  open(os.path.join(VORHER, f"{a['handle']}_2026-10-08.json"), "w", encoding="utf-8"), ensure_ascii=False)
        r = gql('mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a){article{title body} userErrors{message}}}',
                {"id": a["id"], "a": {"title": titel, "body": body}})["articleUpdate"]
        m = [x for x in (("title_tag", st, "single_line_text_field"), ("description_tag", sd, "multi_line_text_field")) if x[1]]
        r2 = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}',
                 {"m": [{"ownerId": a["id"], "namespace": "global", "key": kk, "type": tt, "value": v} for kk, v, tt in m]})
        gut = not r["userErrors"] and not r2["metafieldsSet"]["userErrors"] and (r["article"] or {}).get("title") == titel
        ok += gut
        print(f"  {'✓' if gut else '✗'} {a['handle']} {r['userErrors']} {r2['metafieldsSet']['userErrors']}")
    print(f"FERTIG: RATGEBER-TAG10 {ok}/{len(plan)}")


if __name__ == "__main__":
    main()
