#!/usr/bin/env python3
"""pdp_meisterwerk.py — wie nah ist eine Produktseite am «Meisterwerk»? Eine Zahl je Seite, acht Prüfpunkte (01.10.2026).

ANLASS: Betreiber «nutze grow plan und mache ein meisterwerk». Gemessen 01.10.: die drei Seiten mit bezahltem TikTok-Verkehr
(Sirène, Aurora, Provence) hatten 112 Sitzungen und 0 Warenkörbe; Sirène (CHF 49.90) zeigte «Versand CHF 7 · gratis ab
CHF 50» — die Kundin rechnet 56.90, obwohl ein einzelner Artikel ab CHF 45 gratis versendet wird.

Geprüft wird nur, was die Kundin sieht oder was Google bewertet — und nichts, was Absicht ist:
  seo_titel      SEO-Titel gesetzt (Theme fällt sonst auf «Titel – LuxeStyle» zurück; 25'133 gelöscht am 30.09.)
  bilder_6       ≥ 6 Bilder (Karussell, Google «Bilder pro Angebot»)
  hd_hauptbild   Hauptbild ≥ 1500 px lange Seite (Google «Bildauflösung»)
  hd_anteil      ≥ 50 % der Bilder ≥ 1500 px
  video          ≥ 1 Video auf der Seite (Grow: Deckel 1'000)
  variantennamen keine Lieferanten-Rohnamen im Wähler («Color», «Pink 1», «As shown» …)
  versand_klar   Preis ≥ CHF 50 → die Seite sagt «Gratis Versand» für DIESEN Artikel (nur mit --text prüfbar, sonst «?»)
  beschreibung   ≥ 900 Zeichen Text (Material, Passform, Pflege brauchen Platz)

BEWUSST KEIN DEFEKT: 0 Bewertungen (Information — Bewertungen erfindet man nicht), «Default Title» bei einer Variante.

  python3 tools/pdp_meisterwerk.py <dump.json> [--text handle=datei.txt …]   # dump = {handle: productByHandle-Objekt}
  python3 tools/pdp_meisterwerk.py --selbsttest
"""
import json, re, shutil, sys, tempfile, os

ROH_VARIANTE = re.compile(r"^(color|colour|size|style|as shown|as picture|default|random|[a-z]+ ?\d+)$", re.I)
GRATIS_ARTIKEL = re.compile(r"gratis[- ]?versand[^.·\n]{0,40}(diese[nm]? artikel|inklusive|inkl\.)|versand[^.·\n]{0,15}gratis[^.·\n]{0,30}diese[nm]? artikel", re.I)
PUNKTE = ["seo_titel", "bilder_6", "hd_hauptbild", "hd_anteil", "video", "variantennamen", "versand_klar", "beschreibung"]


def pruefe(p, text=None):
    m = (p.get("media") or {}).get("nodes") or []
    imgs = [x for x in m if x.get("mediaContentType") == "IMAGE" and x.get("image")]
    vids = [x for x in m if x.get("mediaContentType") in ("VIDEO", "EXTERNAL_VIDEO")]
    seiten = [max(x["image"]["width"] or 0, x["image"]["height"] or 0) for x in imgs]
    preise = [float(v["price"]) for v in (p.get("variants") or {}).get("nodes") or []]
    werte = [w for o in p.get("options") or [] for w in o.get("values") or []]
    roh = [w for w in werte if ROH_VARIANTE.match(w.strip()) and not re.fullmatch(r"\d?XL|XXL|[SML]", w.strip(), re.I)]
    beschr = re.sub(r"<[^>]+>", " ", p.get("descriptionHtml") or "")
    beschr = re.sub(r"\s+", " ", beschr).strip()
    r = {
        "seo_titel": bool(((p.get("seo") or {}).get("title") or "").strip()),
        "bilder_6": len(imgs) >= 6,
        "hd_hauptbild": bool(seiten) and seiten[0] >= 1500,
        "hd_anteil": bool(seiten) and sum(s >= 1500 for s in seiten) / len(seiten) >= 0.5,
        "video": len(vids) >= 1,
        "variantennamen": not roh,
        "versand_klar": None if text is None else (min(preise or [0]) < 50 or bool(GRATIS_ARTIKEL.search(text))),
        "beschreibung": len(beschr) >= 900,
    }
    note = sum(1 for k in PUNKTE if r[k]) / sum(1 for k in PUNKTE if r[k] is not None)
    return r, round(10 * note, 1), roh


def bericht(dump, texte):
    zeilen, summe = [], []
    for h, p in dump.items():
        r, note, roh = pruefe(p, texte.get(h))
        summe.append(note)
        fehlt = [k for k in PUNKTE if r[k] is False]
        offen = [k for k in PUNKTE if r[k] is None]
        zeilen.append(f"{note:4.1f}/10  {p['title'][:48]:48}  fehlt: {', '.join(fehlt) or '—'}"
                      + (f"  (roh: {roh})" if roh else "") + (f"  (?: {', '.join(offen)})" if offen else ""))
    zeilen.append(f"Schnitt {sum(summe) / max(1, len(summe)):.1f}/10 über {len(summe)} Seiten")
    return "\n".join(zeilen)


def selbsttest():
    gut = {"title": "Gut", "seo": {"title": "Gut | LuxeStyle"}, "descriptionHtml": "<p>" + "x" * 950 + "</p>",
           "options": [{"name": "Farbe", "values": ["Weinrot", "Schwarz"]}, {"name": "Grösse", "values": ["S", "XL", "XXL"]}],
           "variants": {"nodes": [{"price": "69.90"}]},
           "media": {"nodes": [{"mediaContentType": "IMAGE", "image": {"width": 1600, "height": 2133}}] * 6
                     + [{"mediaContentType": "VIDEO"}]}}
    schlecht = json.loads(json.dumps(gut))
    schlecht["seo"]["title"] = None
    schlecht["options"][0]["values"] = ["Color", "Pink 1"]
    schlecht["media"]["nodes"] = [{"mediaContentType": "IMAGE", "image": {"width": 640, "height": 640}}] * 3
    schlecht["descriptionHtml"] = "<p>kurz</p>"
    # Gegenprobe läuft auf einer Kopie an einem anderen Pfad (Repo-Regel): Dump schreiben, neu laden, prüfen.
    d = tempfile.mkdtemp(prefix="pdp_mw_")
    try:
        pfad = os.path.join(d, "dump.json")
        json.dump({"gut": gut, "schlecht": schlecht}, open(pfad, "w"))
        dump = json.load(open(pfad))
        rg, ng, _ = pruefe(dump["gut"], "🚚 Gratis Versand für diesen Artikel")
        rs, ns, roh = pruefe(dump["schlecht"], "🚚 Versand CHF 7 · gratis ab CHF 50")
        faelle = [
            ("Gutfall 10/10", ng == 10.0),
            ("Schlechtfall schlägt aus (< 3)", ns < 3),
            ("Rohnamen erkannt", roh == ["Color", "Pink 1"]),
            ("Grössen XL/XXL kein Rohname", rg["variantennamen"] is True),
            ("Versand: 69.90 ohne Artikel-Zusage = Defekt", rs["versand_klar"] is False),
            ("Versand ohne Text = unbekannt, nicht ok", pruefe(dump["gut"])[0]["versand_klar"] is None),
            ("Unter CHF 50 braucht keine Zusage", pruefe({**dump["gut"], "variants": {"nodes": [{"price": "39.90"}]}}, "Versand CHF 7")[0]["versand_klar"] is True),
        ]
    finally:
        shutil.rmtree(d, ignore_errors=True)
    for n, ok in faelle:
        print(("✓ " if ok else "✗ ") + n)
    ok = all(o for _, o in faelle)
    print(f"Selbsttest {sum(o for _, o in faelle)}/{len(faelle)}")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    dump = json.load(open(sys.argv[1]))
    texte = {}
    for a in sys.argv[2:]:
        if "=" in a and not a.startswith("--"):
            h, f = a.split("=", 1)
            texte[h] = open(f, encoding="utf-8").read()
    print(bericht(dump, texte))
