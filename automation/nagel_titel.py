#!/usr/bin/env python3
"""nagel_titel.py — Nagel-Ware mit falschem Warenwort im Titel + Fremdware im Nagel-Korb (09.10.2026, Betreiber «weiter»).

ANLASS: «Nagelverstärkungstabletten» (Google: Vitamine & Nahrungsergänzung) ist ein Press-on-Set mit rosa Herzen. CJ übersetzt
穿戴甲 (tragbarer Nagel; 甲 heisst Nagel UND Panzer) wörtlich: «Wear Armor», «Long Wear Armor», «Rüstung», «Nagelarmor»,
«Nagelstifte», «Handpflaster», «Schutzgeflecht». GEMESSEN 09.10. 05:40 UTC am Export (51'904 aktive): 1'039 Nagel-Produkte,
120 ohne ehrliches Warenwort — Kontaktbogen aller 120 + Detailbogen der 12 unklaren: ~60 Press-on-Sets, 9 Geräte/Zubehör
mit falschem Wort («Nagelreiniger» = Staubabsauger, «Viskose Nagelstift» = Strass-Kleber, «Porzellanweiss Nageldesign-Blatt»
= Soft-Gel-Tips, «Nagelpiercing-Gerät» = Nagelfräse). Dazu 25 Titel mit «Wear Armor», auch NACH dem Zusatz «· Press-on-Nägel».
Und der Korb selbst: 21 aktive mit Typ «Nageldesign» ausserhalb der Kosmetik (Mauspad, MP3-Player, Angelhaken,
Uhrenarmband, Kühlschrankregal, Tattoo-Maschinen …) — CJ-Suchgruppe als Warenurteil (Klasse Büro-Sammelkorb 08.10.).

REGEL (eine Datei für Wächter + Importer: automation/data/nagel_titel_regel.json):
  1. hart (immer, sobald Nagel-Kontext): «Wear Armor» weg, «Wearable Nails»/«Nagelarmor»/«Nagel…tabletten»/«Rüstung» →
     «Press-on-Nägel». Hat danach kein Warenwort → Sticker-Wort ersetzen oder «· Press-on-Nägel» anhängen (das harte Wort IST
     der Beleg: es kommt nur aus 穿戴甲). Adjektiv davor in die Mehrzahl («Weisses» → «Weisse Press-on-Nägel»).
  2. handgeprüft (Bildsichtung): [alter Titel, neuer Titel, art] — gesetzt nur, solange der Live-Titel noch der alte ist.
  3. fremd (Bildsichtung/Kategorie): Nagel-Tags weg, Typ nach der Ware.
  Mit dem Titel ziehen mit: Beschreibung + SEO (alter Titel → neuer, harte Regel auf den Text), Adresse mit 301 (wenn sie ein
  Unsinnswort trägt), Kategorie False Nails bei Press-on ausserhalb des Nagel-Zweigs. Bild-Alts zieht alt_titel_abgleich.py nach.
  Editor/POD nie. Ledger dropship/_nagel_korb.tsv · Bericht dropship/NAGEL-TITEL.md.
  python3 automation/nagel_titel.py --kanarien · python3 automation/nagel_titel.py (trocken) · SCHARF=1 python3 automation/nagel_titel.py
"""
import collections, json, os, re, sys, time, unicodedata

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
REGEL = json.load(open(os.path.join(HIER, "data", "nagel_titel_regel.json"), encoding="utf-8"))
SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship", "_nagel_korb.tsv")   # NICHT _nagel_titel.tsv (gehört nagel_fein.py)
BERICHT = os.path.join(REPO, "dropship", "NAGEL-TITEL.md")
POD = re.compile(r"printful|\bpod\b|selbst-gestalten|editor", re.I)
NAGEL_TAGS = ["nagel", "naegel", "nageldesign", "maniküre", "manikuere", "nagelverlaengerung"]
FALSE_NAILS = ("Health & Beauty > Personal Care > Cosmetics > Nail Care > False Nails", "hb-3-2-7-2")


def _rx(s):
    return re.compile(s.replace("{V}", REGEL["grenze_vor"]).replace("{N}", REGEL["grenze_nach"]), re.I)


KONTEXT = _rx(REGEL["nagel_kontext"])
NOMEN = _rx(REGEL["nagel_nomen"])
STICKER = _rx(REGEL["sticker"])
HART = [(_rx(p), r, g) for p, r, g in REGEL["hart"]]
ADJ_ENDE = _rx(REGEL["adjektiv_ende"])
ADJ_PLURAL = _rx(REGEL["adjektiv_plural"])
JUNK_HANDLE = re.compile(REGEL["junk_handle"])


def aufraeumen(t):
    t = re.sub(r"\s{2,}", " ", t)
    t = re.sub(r"\s+([,.;:)])", r"\1", t)
    t = re.sub(r"(?:\s*·\s*){2,}", " · ", t)
    t = re.sub(r"\(\s*\)", "", t)
    return t.strip(" ·-–,")


def hart(t):
    """Harte Regel auf einen Text → (neu, gründe)."""
    neu, gr = t, []
    for rx, rep, g in HART:
        n2 = rx.sub(rep, neu)
        if n2 != neu:
            gr.append(g)
            neu = n2
    return neu, gr


def nagel_titel(titel, en="", nagel_ware=False):
    """→ (neuer Titel, gründe). Ohne Nagel-Kontext (Titel + CJ-Name, oder nagel_ware) oder ohne harten Treffer: unverändert."""
    t = titel or ""
    if not nagel_ware and not KONTEXT.search(f"{t} {en or ''}"):
        return t, []
    neu, gr = hart(t)
    if not gr:
        return t, []
    neu = aufraeumen(neu)
    if not NOMEN.search(neu):
        n2 = STICKER.sub("Press-on-Nägel", neu, count=1)
        if n2 != neu:
            neu = n2
        elif not neu:
            neu = "Press-on-Nägel"
        elif ADJ_ENDE.search(neu):
            neu = neu + " Press-on-Nägel"
        else:
            neu = neu + " · Press-on-Nägel"
    neu = ADJ_PLURAL.sub(lambda m: m.group(1) + "e" + m.group(2), neu)
    return aufraeumen(neu), gr


def kanarien(still=False):
    f = 0
    for k in REGEL["kanarien"]:
        alt, soll = k[0], k[1]
        ist = nagel_titel(alt, "", len(k) > 2 and k[2])[0]
        if ist != soll:
            f += 1
            print(f"  ✗ {alt!r}\n      ist  {ist!r}\n      soll {soll!r}")
    if not still:
        print(f"NAGEL-TITEL-KANARIEN {len(REGEL['kanarien']) - f}/{len(REGEL['kanarien'])}")
    return f == 0


def slug(t):
    t = t.lower()
    for a, b in [("ä", "a"), ("ö", "o"), ("ü", "u"), ("ß", "ss")]:
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9]+", "-", t).strip("-"))


def neuer_handle(alt_handle, titel):
    m = re.search(r"-([a-z0-9]{4,})$", alt_handle, re.I)
    nummer = m.group(1) if (m and re.search(r"\d", m.group(1))) else ""
    neu = slug(titel)[:60].strip("-")
    return f"{neu}-{nummer}" if nummer else neu


def text_neu(text, alt, neu, kontext_ok):
    """Alter Titel → neuer Titel, harte Regel im Text (nur bei Nagel-Ware)."""
    if not text:
        return text
    t = text.replace(alt, neu) if alt and alt != neu else text
    if kontext_ok:
        t = hart(t)[0]
        t = re.sub(r"  +", " ", t)
    return t


Q = ('query($q:String!,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id handle title '
     'status tags productType descriptionHtml seo{title description} category{id fullName}}}}')


def bestand(gql):
    out = {}
    for q in ("status:active product_type:Nageldesign", "status:active (tag:nageldesign OR tag:nagel OR tag:naegel)"):
        cur = None
        while True:
            r = gql(Q, {"q": q, "c": cur})["products"]
            for n in r["nodes"]:
                out[n["id"]] = n
            if not r["pageInfo"]["hasNextPage"]:
                break
            cur = r["pageInfo"]["endCursor"]
            time.sleep(0.3)
    return list(out.values())


def plan_fuer(p):
    """→ dict mit Änderungen oder None."""
    if POD.search(" ".join(p.get("tags") or [])):
        return None
    h, t = p["handle"], p["title"]
    fr = REGEL["fremd"].get(h)
    if fr:
        weg = [x for x in NAGEL_TAGS + ["beauty"] + fr.get("extra", []) if x in (p.get("tags") or [])
               and (x != "beauty" or fr.get("beauty_weg"))]
        if weg or p.get("productType") != fr["typ"]:
            return {"art": "fremd", "tags_weg": weg, "typ": fr["typ"], "grund": fr.get("grund", "")}
        return None
    hg = REGEL["handgeprueft"].get(h)
    if hg and t == hg[0] and hg[1] != t:
        return {"art": "hand-" + hg[2], "titel": hg[1], "presson": hg[2] == "p"}
    neu, gr = nagel_titel(t, "", True)
    if gr and neu != t:
        return {"art": "regel-" + "+".join(sorted(set(gr))), "titel": neu, "presson": True}
    return None


def main():
    if not kanarien():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if "--kanarien" in sys.argv:
        return 0
    from kaufwille_zeile import gql
    alle = bestand(gql)
    titel_alle = collections.Counter(slug(p["title"]) for p in alle)
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(alle)} Nagel-Produkte (Typ oder Tag) · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    st = collections.Counter(); zeilen = []; kat_plan = []
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for p in alle:
        pl = plan_fuer(p)
        if not pl:
            continue
        st[pl["art"]] += 1
        jetzt = time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime())
        if pl["art"] == "fremd":
            zeilen.append(f"- fremd: `{p['handle']}` {p['title'][:60]} — Tags weg {pl['tags_weg']}, Typ «{p.get('productType')}» → «{pl['typ']}»")
            if SCHARF:
                r = gql('mutation($id:ID!,$t:[String!]!,$p:ProductUpdateInput!){a:tagsRemove(id:$id,tags:$t){userErrors{message}} '
                        'b:productUpdate(product:$p){product{productType tags} userErrors{message}}}',
                        {"id": p["id"], "t": pl["tags_weg"] or ["-"], "p": {"id": p["id"], "productType": pl["typ"]}})
                pr = (r.get("b") or {}).get("product") or {}
                ok = pr.get("productType") == pl["typ"] and not set(pl["tags_weg"]) & set(pr.get("tags") or [])
                st["ok" if ok else "fehler"] += 1
                led.write(f"{jetzt}\t{p['id']}\tfremd\t{p.get('productType')}\t{pl['typ']}\t{'ok' if ok else 'FEHLER'}\n"); led.flush()
            continue
        neu = pl["titel"]
        if titel_alle[slug(neu)] and slug(neu) != slug(p["title"]):
            st["titel-dublette"] += 1
            zeilen.append(f"- ⚠️ Dublette, übersprungen: «{p['title']}» → «{neu}»")
            continue
        titel_alle[slug(neu)] += 1
        kontext = True
        html = text_neu(p.get("descriptionHtml") or "", p["title"], neu, kontext)
        seo = p.get("seo") or {}
        seo_t = text_neu(seo.get("title") or "", p["title"], neu, kontext)
        seo_d = text_neu(seo.get("description") or "", p["title"], neu, kontext)
        h_neu = neuer_handle(p["handle"], neu) if JUNK_HANDLE.search(p["handle"]) else p["handle"]
        cat = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        kat = pl.get("presson") and not cat.startswith("hb-3-2-7")
        zeilen.append(f"- {pl['art']}: «{p['title']}» → «{neu}»" + (f" · Adresse → `{h_neu}`" if h_neu != p["handle"] else "")
                      + (f" · Kategorie {(p.get('category') or {}).get('fullName', '-')[-40:]} → False Nails" if kat else ""))
        if not SCHARF:
            continue
        inp = {"id": p["id"], "title": neu}
        if html != (p.get("descriptionHtml") or ""):
            inp["descriptionHtml"] = html
        if seo_t != (seo.get("title") or "") or seo_d != (seo.get("description") or ""):
            inp["seo"] = {"title": seo_t or None, "description": seo_d or None}
        if h_neu != p["handle"]:
            inp["handle"] = h_neu
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title handle} userErrors{message}}}", {"p": inp})
        pu = r["productUpdate"]; pr = pu.get("product") or {}
        ok = pr.get("title") == neu and not pu["userErrors"]
        w = ""
        if ok and h_neu != p["handle"]:
            r2 = gql('mutation($in:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$in){urlRedirect{path} userErrors{message}}}',
                     {"in": {"path": f"/products/{p['handle']}", "target": f"/products/{pr['handle']}"}})
            w = "301" if r2["urlRedirectCreate"]["urlRedirect"] else "OHNE-301"
        st["ok" if ok else "fehler"] += 1
        led.write("\t".join([jetzt, p["id"], pl["art"], p["title"], neu, p["handle"], pr.get("handle", ""), w,
                             "ok" if ok else "FEHLER " + "; ".join(e["message"] for e in pu["userErrors"])[:80]]) + "\n"); led.flush()
        if ok and kat:
            kat_plan.append((p["id"], FALSE_NAILS[0], FALSE_NAILS[1]))
        time.sleep(0.3)
    if SCHARF and kat_plan:
        import kosmetik_fein as kos
        for pid, s_, g_, sid, feh in kos.schreiben(kat_plan):
            st["kategorie-" + s_] += 1
            led.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{pid}\tkategorie\t{g_}\t{sid}\t{s_} {feh}\n")
        led.flush()
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Nagel-Titel und Nagel-Korb — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Werkzeug `automation/nagel_titel.py`, Regel `automation/data/nagel_titel_regel.json` (Importer: `nagel_titel.mjs`). "
                f"{len(alle)} aktive Nagel-Produkte (Typ «Nageldesign» oder Nagel-Tag) · {'geändert' if SCHARF else 'zu ändern'}: "
                f"{dict(st)}\n\n" + ("\n".join(zeilen) or "Nichts zu tun.") + "\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {dict(st)}", flush=True)
    return 1 if st["fehler"] else 0


if __name__ == "__main__":
    sys.exit(main())
