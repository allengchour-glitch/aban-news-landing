#!/usr/bin/env python3
"""nagel_fein.py — Press-on-Nägel, die als «Nagelsticker» verkauft werden, nach Grössenoption und Beschreibung einordnen (08.10.2026).

ANLASS (Betreiber «ordne alles sauber ein»). GEMESSEN 08.10. 17:00: In Shopify «Nail Art Kits & Accessories» (hb-3-2-7-4) standen
145 Produkte grob, die meisten mit «Nagelsticker» im Titel. Der Titel trennt nicht: CJ nennt Press-on-Sets (10 Nägel in Grössen
XS–L, Jelly-Kleber) genauso «Nagelsticker» wie echte Aufkleber. Die Beschreibung und die Grössenoption trennen: 51 von 145 tragen
ein Press-on-Merkmal. Die Titelregeln (kosmetik_fein, shopify_fein) können das nicht sehen — darum dieser eigene Wächter.

REGEL (nur starke Merkmale, nie raten):
  Press-on = Grössenoption mit ≥ 2 Werten aus XXS…XL ODER in der Beschreibung: künstliche Nägel, Kunstnägel, Nägel zum
  Aufkleben, Press-on, tragbare Nägel/Nagelsets, Nagelstücke, Nagelspitzen, Mandel-/Sarg-/Ballerinaform, Coffin, Grössen-
  angabe «XS, S, M» im Text, Jelly-/Gelee-Kleber. Schwache Merkmale (Feile, Alkoholtupfer, «Jelly» allein) zählen NICHT —
  die liegen auch Sticker-Sets bei.
    → Google «… > Nail Care > False Nails» UND Shopify «False Nails» (hb-3-2-7-2).
  Kein Press-on, Titel «Sticker/Aufkleber/Decal» und Shopify genau hb-3-2-7-4 → Shopify «Nail Stickers & Decals» (hb-3-2-7-4-2),
  Google bleibt «Nail Art Kits & Accessories».
  Alles andere bleibt (shopify_fein ordnet Pinsel/Folien/Strass nach Titel).
Geltungsbereich: aktive Produkte, Shopify in hb-3-2-7 / hb-3-2-7-4 / hb-3-2-7-4-2 / hb-3-2-7-4-3, Google leer oder im Zweig Nail Care.
TITEL (08.10.2026 abends, Betreiber «weiter»): Ein Press-on-Set, das «Nagelsticker» heisst, führt Käuferinnen in die Irre. Der Titel
  wird nur geändert, wenn die BESCHREIBUNG Nägel belegt (künstliche Nägel, Nagelstücke/-spitzen/-platten, Jelly-Kleber, Mandelform …)
  — die Grössenoption allein reicht für die Kategorie, nicht für einen neuen Titel. «Nagelsticker/Nagelaufkleber/Sticker» →
  «Press-on-Nägel» (Begriff wie google_titel_reparatur.py); ohne Nagel-Nomen « · Press-on-Nägel» angehängt; Verlängerungs-Sets
  (Tips + Kleber) bleiben. SEO-Titel, die mit dem alten Titel beginnen, ziehen mit. Neuer Titel, der schon bei einem anderen
  Produkt steht → übersprungen (dup_title_fix würde sonst draften). Bereich zusätzlich «False Nails» (hb-3-2-7-2) für Neuimporte.
  Ledger dropship/_nagel_titel.tsv.
VORRANG: kosmetik_fein.lauf überspringt die hier gesetzten Press-on-Produkte (sonst setzt seine Titelregel «nagelsticker → Nail Art»
sie jeden Morgen zurück). Ledger dropship/_nagel_fein.tsv. Täglich im Aufseher (Kategorie-Kette, NACH kosmetik_fein).

  python3 automation/nagel_fein.py --kanarien  ·  python3 automation/nagel_fein.py (trocken)  ·  SCHARF=1 python3 automation/nagel_fein.py
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

LEDGER = os.path.join(REPO, "dropship", "_nagel_fein.tsv")
TITEL_LEDGER = os.path.join(REPO, "dropship", "_nagel_titel.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
NC = "Health & Beauty > Personal Care > Cosmetics > Nail Care"
FALSE_NAILS = (NC + " > False Nails", "hb-3-2-7-2")
STICKER_S = "hb-3-2-7-4-2"
BEREICH = {"hb-3-2-7", "hb-3-2-7-4", "hb-3-2-7-4-2", "hb-3-2-7-4-3"}

GROESSE_NAME = re.compile(r"gr[öo]s+e|size", re.I)
GROESSE_WERT = re.compile(r"(xx?s|s|m|l|xl)", re.I)
STARK = re.compile(
    r"k[üu]nstliche[n]?\s+n[äa]gel|kunstn[äa]gel|n[äa]gel\s+zum\s+aufkleben|press[\s-]?on|tragbare[nrs]?\s+(nagel|n[äa]gel)|"
    r"nagelst[üu]cke|nagelspitzen|(mandel|sarg|ballerina)-?form|\bcoffin\b|\balmond\b|"
    r"gr[öo]ssen?\s*\(?\s*xx?s\s*,|verf[üu]gbar\s+in\s+xx?s\b|\bxs\s*,\s*s\s*,\s*m\b|"
    r"(jelly|gelee)[\s-]?(glue|kleber)", re.I)
STICKER_T = re.compile(r"sticker|aufkleber|\bdecals?\b|zum\s+aufkleben|patches", re.I)


def press_on(optionen, beschreibung):
    """(bool, Grund) — Grössenoption oder starkes Beschreibungsmerkmal."""
    for o in optionen or []:
        if GROESSE_NAME.search(o.get("name", "")):
            n = sum(1 for v in o.get("values", []) if GROESSE_WERT.fullmatch(v.strip()))
            if n >= 2:
                return True, f"Grössenoption {n}"
    m = STARK.search(beschreibung or "")
    return (True, m.group(0)) if m else (False, "")


def ziel(cid, titel, optionen, beschreibung):
    """→ (google | None, shopify | None, grund). google None = Google unverändert."""
    ja, grund = press_on(optionen, beschreibung)
    if ja:
        return FALSE_NAILS[0], FALSE_NAILS[1], grund
    if cid == "hb-3-2-7-4" and STICKER_T.search(titel or ""):
        return None, STICKER_S, "sticker"
    return None, None, ""



# Beleg für ECHTE Nägel in der Beschreibung (für den Titel; die Kategorie reicht schon mit der Grössenoption).
# «ultra-dünn, nahtlos» ist bei CJ ein Stilname der Press-on-Sets, KEIN Folienmerkmal (08.10. an 8 Beschreibungen gesehen).
NAGEL_BELEG = re.compile(
    r"k[üu]nstliche[n]?\s+n[äa]gel|kunstn[äa]gel|n[äa]gel\s+zum\s+aufkleben|press[\s-]?on|tragbare[nrs]?\s+n[äa]gel|"
    r"nagelst[üu]cke|nagelspitzen|nagelpl[äa]ttchen|nagelplatten|(mandel|sarg|ballerina)-?form|\bcoffin\b|\balmond\b|"
    r"(jelly|gelee)[\s-]?(glue|kleber)|wearing nail|wear(able)? nails?|nagel-?tips", re.I)
STICKER_WORT = re.compile(r"nagel-?stickers?|nail-?stickers?|nail\s+stickers?|nailstickers?|nagel-?aufkleber|\bstickers?\b", re.I)
# Titel sagt schon «Nägel/Nails» (Mehrzahl = die Nägel selbst) → nichts anhängen; «Nail Art», «Nagel-Set» reichen nicht
NAGEL_NOMEN = re.compile(r"press[\s-]?on|nägel|naegel|\bnails\b|nail\s?tips|nagelspitzen|nagel-?tipp?s?\b|kunstnagel", re.I)
VERLAENGERUNG = re.compile(r"extension|verl[äa]ngerung", re.I)


def titel_ehrlich(titel):
    """Ehrlicher Titel für ein belegtes Press-on-Set (oder derselbe Titel, wenn nichts zu tun ist)."""
    t = titel or ""
    if VERLAENGERUNG.search(t) or NAGEL_NOMEN.search(t):
        return t                      # Titel nennt die Nägel schon («Nagel-Tips mit Polka-Dot Sticker» = Tips MIT Sticker)
    neu = STICKER_WORT.sub("Press-on-Nägel", t)
    if not NAGEL_NOMEN.search(neu):
        neu = neu.rstrip() + " · Press-on-Nägel"
    return re.sub(r"\s{2,}", " ", neu)


def _norm(t):
    t = (t or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


TITEL_KANARIEN = [
    ("Nagelsticker Weiss", "Press-on-Nägel Weiss"),
    ("Handgemachte abnehmbare Mandel-Nagelsticker", "Handgemachte abnehmbare Mandel-Press-on-Nägel"),
    ("Mädchenhafte Schleifen-Nailsticker", "Mädchenhafte Schleifen-Press-on-Nägel"),
    ("Nationale Stil Nagel-Sticker Drachen-Biographie", "Nationale Stil Press-on-Nägel Drachen-Biographie"),
    ("Cat's Eye Nails: Abnehmbare Sticker in Mint", "Cat's Eye Nails: Abnehmbare Sticker in Mint"),   # nennt «Nails» schon
    ("Wassermelonen-Nagelaufkleber", "Wassermelonen-Press-on-Nägel"),
    ("Fairy White Polarised Nagelstickers", "Fairy White Polarised Press-on-Nägel"),
    ("Sterntaler-Maniküre", "Sterntaler-Maniküre · Press-on-Nägel"),
    ("Kurz, Katzenaugen-Form", "Kurz, Katzenaugen-Form · Press-on-Nägel"),
    ("Blutroter Guokui-Nagel-Set", "Blutroter Guokui-Nagel-Set · Press-on-Nägel"),
    ("Herz-Muster 3D Nagel-Kunst Mandelform", "Herz-Muster 3D Nagel-Kunst Mandelform · Press-on-Nägel"),
    ("Kaffee-Leopardenprint Cat-Eye Nägel", "Kaffee-Leopardenprint Cat-Eye Nägel"),
    ("Handgemachte French Nails mit Zirkon & Kristall", "Handgemachte French Nails mit Zirkon & Kristall"),
    # schon ehrlich / bewusst nicht
    ("24er Set Schwarze Schmetterling Press-On Nägel", "24er Set Schwarze Schmetterling Press-On Nägel"),
    ("Rote und weisse Herz-Kunstnägel, lang, eckig", "Rote und weisse Herz-Kunstnägel, lang, eckig"),
    ("Painless Fast Nail Art Extension Set", "Painless Fast Nail Art Extension Set"),
    ("Cat-Eye Nagel-Tips mit Polka-Dot Sticker", "Cat-Eye Nagel-Tips mit Polka-Dot Sticker"),
    ("Aurora Nagel-Tipps mit Blumenmotiv", "Aurora Nagel-Tipps mit Blumenmotiv"),
    ("Weinroter Kunstnagel zum Aufkleben, extra lang", "Weinroter Kunstnagel zum Aufkleben, extra lang"),
]

KANARIEN = [   # (cid, Titel, Optionen, Beschreibungsausschnitt, Google-Ziel, Shopify-Ziel) — echte Fälle 08.10.
    ("hb-3-2-7-4", "Handgemachte Luxus-Nagelsticker", [{"name": "Grösse", "values": ["XS", "S", "M", "L"]}], "handgemachte Nagelsticker", FALSE_NAILS[0], "hb-3-2-7-2"),
    ("hb-3-2-7-4", "Nagelsticker Weiss", [], "Lieferumfang: Nagelstücke, Jelly-Glue, Glue, Alkohol-Cotton", FALSE_NAILS[0], "hb-3-2-7-2"),
    ("hb-3-2-7-4", "Herz-Muster 3D Nagel-Kunst Mandelform", [], "Die Nägel sind in einer kurzen Mandelform gehalten", FALSE_NAILS[0], "hb-3-2-7-2"),
    ("hb-3-2-7-4", "Lila Nagelsticker", [], "Lila Farbe Verfügbar in XS, S und M Einfach aufzutragen", FALSE_NAILS[0], "hb-3-2-7-2"),
    ("hb-3-2-7-4", "Painless Fast Nail Art Extension Set", [{"name": "Farbe", "values": ["F301"]}], "Lieferumfang: Phototherapiekleber, Pinsel und Kunststoff-Nagelspitzen", FALSE_NAILS[0], "hb-3-2-7-2"),
    ("hb-3-2-7", "Blaues Katzenauge Kurz-Nagelset", [], "24 künstliche Nägel mit Klebepads", FALSE_NAILS[0], "hb-3-2-7-2"),
    # Köder: schwache Merkmale reichen nicht
    ("hb-3-2-7-4", "Nail Sticker Set mit Rose, Herz und Katze", [], "Das Set kommt mit 2 Reinigungspads aus Baumwolle, einer Nagelfeile und einem Entferner", None, "hb-3-2-7-4-2"),
    ("hb-3-2-7-4", "Profi-Gel für Nageldesign – Grosse Flasche", [], "Jelly-Effekt, ideal für Nagelkunst", None, None),
    ("hb-3-2-7-4", "Weinroter Schmetterlings-Nagelaufkleber", [], "selbstklebende Aufkleber für deine Nägel", None, "hb-3-2-7-4-2"),
    ("hb-3-2-7-4", "Nail Art Graffiti Stifte Set", [{"name": "Farbe", "values": ["12 Colors Suit"]}], "Acryl-Marker", None, None),
    ("hb-3-2-7-4-2", "Japanische Nagelsticker", [], "20 Stück Gel-Patches Universal", None, None),
    ("hb-3-2-7-4", "Nagelsticker «Astronaut» für die Hände", [], "Hergestellt aus Kunststoffmaterial, Feile im Lieferumfang", None, "hb-3-2-7-4-2"),
]


def kanarien():
    tok = 0
    for alt, soll in TITEL_KANARIEN:
        ist = titel_ehrlich(alt); tok += ist == soll
        if ist != soll:
            print(f"  ✗ Titel {alt!r} → {ist!r} (soll {soll!r})")
    print(f"NAGEL-TITEL-KANARIEN {tok}/{len(TITEL_KANARIEN)}")
    if tok != len(TITEL_KANARIEN):
        return False
    ok = 0
    for cid, t, o, d, g, s in KANARIEN:
        ist = ziel(cid, t, o, d)[:2]
        ok += ist == (g, s)
        if ist != (g, s):
            print(f"  ✗ {t!r} → {ist} (soll {(g, s)})")
    print(f"NAGEL-KANARIEN {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


def vorrang_ids():
    """Produkt-IDs, deren Press-on-Urteil hier gesetzt wurde — kosmetik_fein.lauf lässt sie aus."""
    try:
        return {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.split("\t")[1:2] == ["gesetzt"] and FALSE_NAILS[1] in l}
    except OSError:
        return set()


def main():
    import kategorie_fein as kf, kosmetik_fein as kos
    from kaufwille_zeile import gql
    if not kanarien():
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    if FALSE_NAILS[0] not in kos.google_taxonomie():
        raise SystemExit("Google-Pfad unbekannt — nichts geschrieben")
    kf.export_holen()
    kand = {}; titel_alle = collections.Counter(); titel_plan = []
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        cid = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        g = (p.get("metafield") or {}).get("value") or ""
        titel_alle[_norm(p["title"])] += 1
        if (cid in BEREICH or cid == FALSE_NAILS[1]) and (not g or g == NC or g.startswith(NC + " > ")):
            kand[p["id"]] = (cid, g, p["title"])
    try:
        erledigt = {(l.split("\t")[0], l.split("\t")[3]) for l in open(LEDGER, encoding="utf-8") if l.count("\t") >= 4}
    except OSError:
        erledigt = set()
    ids = list(kand); plan = []; st = collections.Counter(); bsp = collections.defaultdict(list)
    for i in range(0, len(ids), 40):
        r = gql("query($i:[ID!]!){nodes(ids:$i){... on Product{id title description options{name values} seo{title}}}}", {"i": ids[i:i + 40]})
        for n in r["nodes"]:
            if not n:
                continue
            cid, g, t = kand[n["id"]]
            gz, sz, grund = ziel(cid, t, n["options"], n["description"])
            # Titel: nur belegte Press-on-Sets (Kategorie False Nails jetzt oder nach diesem Lauf), Live-Titel massgeblich
            if (sz == FALSE_NAILS[1] or (not sz and cid == FALSE_NAILS[1])) and NAGEL_BELEG.search(n["description"] or ""):
                tn = titel_ehrlich(n["title"])
                if tn != n["title"]:
                    if titel_alle[_norm(tn)]:
                        st["titel-dublette"] += 1
                    else:
                        seo = (n.get("seo") or {}).get("title") or ""
                        seo_neu = tn + seo[len(n["title"]):] if seo.startswith(n["title"]) else None
                        titel_plan.append((n["id"], n["title"], tn, seo_neu)); titel_alle[_norm(tn)] += 1
                        if len(bsp["titel"]) < int(os.environ.get("ZEIGEN", "8")):
                            bsp["titel"].append(f"{n['title'][:45]} → {tn[:60]}")
            if cid == FALSE_NAILS[1]:
                continue                     # schon eingeordnet — hier nur der Titel
            if not sz:
                st["bleibt"] += 1; continue
            gz = gz or g or NC + " > Nail Art Kits & Accessories"   # metafieldsSet verlangt einen Wert; Sticker = Nail Art
            if gz == g and sz == cid:
                st["stimmt"] += 1; continue
            if (n["id"], sz) in erledigt:
                st["rueckfall"] += 1; continue
            plan.append((n["id"], gz, sz)); st["press-on" if sz == FALSE_NAILS[1] else "sticker"] += 1
            if len(bsp[sz]) < 6:
                bsp[sz].append(f"{t[:50]}  [{grund}]")
        time.sleep(0.3)
    print("Stand:", dict(st), f"· Plan {len(plan)} · Titel {len(titel_plan)}")
    for z, b in bsp.items():
        print(f"  → {z}:", *b, sep="\n      ")
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), 25):
                charge = [(pid, gz or "", sz) for pid, gz, sz in plan[i:i + 25]]
                for pid, s_, g_, sid, feh in kos.schreiben(charge):
                    f.write(f"{pid}\t{s_}\t{g_}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{feh}\t{kand[pid][0]}\n")
                    ok += s_ == "gesetzt"; fe += s_ == "fehler"
                f.flush(); time.sleep(0.4)
    tok = tfe = 0
    if SCHARF and titel_plan:
        with open(TITEL_LEDGER, "a", encoding="utf-8") as f:
            for pid, alt, tn, seo_neu in titel_plan:
                inp = {"id": pid, "title": tn}
                if seo_neu:
                    inp["seo"] = {"title": seo_neu}
                r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title seo{title}} userErrors{message}}}", {"p": inp})
                pu = r["productUpdate"]; gut = (pu.get("product") or {}).get("title") == tn and not pu["userErrors"]
                tok += gut; tfe += not gut
                f.write(f"{pid}\t{'gesetzt' if gut else 'fehler'}\t{alt}\t{tn}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t"
                        f"{'; '.join(e['message'] for e in pu['userErrors'])[:120]}\n")
                f.flush(); time.sleep(0.3)
    print(f"FERTIG: NAGEL-FEIN {len(plan)} geplant{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · "
          f"Titel {len(titel_plan)}{f' · gesetzt {tok} · fehler {tfe}' if SCHARF else ''} · {dict(st)}")


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    main()
