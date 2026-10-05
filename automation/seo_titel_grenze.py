#!/usr/bin/env python3
"""seo_titel_grenze.py — gekappte, leere und doppelt bemengte SEO-Titel finden und aus dem Produkttitel neu setzen
(05.10.2026, Prüfer «titel-neuimport»).

ANLASS: Shopify kappt seo.title still bei 70 Zeichen (gemessen 05.10.: 0 von 1'150 Produkten > 70, 23 exakt 70). Die
Importer schrieben `Titel | LuxeStyle CH` ohne Rücksicht darauf — 15 von 900 Neuimporten endeten mitten im Wort oder
mit halber Marke («… | LuxeSt», «… | »), 4 hatten gar keinen SEO-Titel, 3 trugen «· N Stück» doppelt (Titel bereinigt,
SEO nicht). Die Rücklese-Wache des Vorlaufs prüfte nur «beginnt mit» — damit war die Kappung unsichtbar.

EINE REGEL (dieselbe wie seo_titel.mjs): längste saubere Form, die in 70 Zeichen passt —
  Titel | LuxeStyle CH → Titel | LuxeStyle → Titel allein → Titel an Wortgrenze gekürzt.
Nur diese zwei Klassen werden angefasst (gekappt, doppelmenge). Bewusst abweichende SEO-Titel (Semrush-Suchbegriff
aus seo_suchbegriff_titel.py, Unterscheidung aus seo_voll_fix.py) bleiben unberührt — Abweichung allein ist kein Fehler.
Rücklesen = GLEICHHEIT (nicht «beginnt mit»); jede Kappung zählt als Fehler.

  python3 automation/seo_titel_grenze.py              # trocken, aktive Produkte der letzten TAGE (14)
  SCHARF=1 python3 automation/seo_titel_grenze.py     # schreiben + zurücklesen → dropship/_seo_titel_grenze.tsv
  NUR=messen python3 automation/seo_titel_grenze.py   # eine Ampel-Zeile «SEO-TITEL: …»
  ALLE=1 …                                            # ohne Datumsfilter (alle aktiven, ~200 Seiten)
  python3 automation/seo_titel_grenze.py --test       # Kanarienvögel
"""
import datetime as dt, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_seo_titel_grenze.tsv")
GRENZE = 70
MARKE = ("LuxeStyle CH", "LuxeStyle")
SCHARF = os.environ.get("SCHARF") == "1"
TAGE = int(os.environ.get("TAGE", "14"))
POD = re.compile(r"^(pod|printful|selbst-gestalten)$", re.I)
# halbe Marke am Ende: «| », «| L» … «| LuxeStyle C» — nie «| LuxeStyle» oder «| LuxeStyle CH»
HALBE_MARKE = re.compile(r"\|\s*(?:L|Lu|Lux|Luxe|LuxeS|LuxeSt|LuxeSty|LuxeStyl|LuxeStyle C)?$")
MENGE = re.compile(r"(\d+)\s*(?:stück|stk\.?|teilig|-teiliges?|er[- ]?(?:set|pack))", re.I)


def kuerzen(s, n=GRENZE):
    s = re.sub(r"\s+", " ", s or "").strip()
    if len(s) <= n:
        return s
    k = s[:n + 1]
    for z in (". ", " · ", " – ", ", "):
        i = k.rfind(z)
        if i > n * 0.6:
            k = k[:i + (1 if z == ". " else 0)]
            break
    if len(k) > n:
        k = k[:k.rfind(" ")] if k.rfind(" ") > 0 else k[:n]
    k = re.sub(r"[\s,;:–\-·|(]+$", "", k)
    if k.count("(") > k.count(")"):
        k = re.sub(r"[\s,;:–\-·|]+$", "", k[:k.rfind("(")])
    return k.strip()


def seo_titel(titel):
    t = re.sub(r"\s+", " ", titel or "").strip()
    for m in MARKE:
        f = f"{t} | {m}"
        if len(f) <= GRENZE:
            return f
    return t if len(t) <= GRENZE else kuerzen(t, GRENZE)


def formen(titel):
    return (titel, f"{titel} | LuxeStyle", f"{titel} | LuxeStyle CH")


def klasse(titel, st):
    """None = in Ordnung (oder bewusst abweichend), sonst 'gekappt' / 'doppelmenge'.
    ⚠️ LEER ist KEIN Fehler (gemessen 05.10. 07:1x): schreibt man seo.title = Produkttitel, speichert Shopify null; der
    Theme-Kopf rendert dann «Titel – LuxeStyle» (WebFetch luxestyle.ch/products/memory-pilz-kissen-…: <title> =
    «Kopfkissen … Schmetterlingsform – LuxeStyle»). Die 4 «leeren» Neuimporte waren genau das: Titel 59–65 Zeichen,
    SEO-Titel = Titel gesetzt → null. Darum zählt «leer» hier nur als Information."""
    st = st or ""
    if not st.strip():
        return None
    if st in formen(titel):
        return None
    if len(st) == GRENZE and (st != st.rstrip() or HALBE_MARKE.search(st)
                              or any(f != st and f.startswith(st) for f in formen(titel))):
        return "gekappt"
    m = re.fullmatch(re.escape(titel) + r"\s*·\s*(\d+)\s*(?:Stück|Stk\.?)\s*(?:\| LuxeStyle(?: CH)?)?", st)
    if m and any(z.group(1) == m.group(1) for z in MENGE.finditer(titel)):
        return "doppelmenge"
    return None


def kanarienvoegel():
    f = [
        ("Rundes Haustierbett aus Cord", "Rundes Haustierbett aus Cord | LuxeStyle CH", None),
        ("Rundes Haustierbett aus Cord", "Rundes Haustierbett aus Cord | LuxeStyle", None),
        ("Rundes Haustierbett aus Cord", "Rundes Haustierbett aus Cord", None),
        ("Rundes Haustierbett aus Cord", "", None),                                      # leer = Titel (Shopify speichert null)
        ("Rundes Haustierbett aus Cord", "Hundebett Cord rund kaufen Schweiz | LuxeStyle CH", None),      # bewusst abweichend (Semrush)
        ("Hunde-Kostüm «Prisoner»: gestreifter Strickpullover mit Mütze", "Hunde-Kostüm «Prisoner»: gestreifter Strickpullover mit Mütze | LuxeSt", "gekappt"),
        ("Schuluniform-Set im Anime-Stil: Blazer, Rock, Hemd & Fliege (Cosplay)", "Schuluniform-Set im Anime-Stil: Blazer, Rock, Hemd & Fliege (Cosplay) ", "gekappt"),
        ("Doppelseitiger Blechschneider-Aufsatz für Bohrmaschine, 175 × 80 mm", "Doppelseitiger Blechschneider-Aufsatz für Bohrmaschine, 175 × 80 mm | ", "gekappt"),
        ("Weihnachtsdeko-Figur aus weichem Stoff, rote Zipfelmütze", "Weihnachtsdeko-Figur aus weichem Stoff, rote Zipfelmütze | LuxeStyle C", "gekappt"),
        ("Memory-Pilz Kissen für Nackenstütze", "Armauflage-Kissen aus Memory-Schaum in Schmetterlingsform | LuxeStyle ", "gekappt"),   # Titel inzwischen anders, Kappung trotzdem
        ("5-teiliges Küchenhelfer-Set aus Akazienholz", "5-teiliges Küchenhelfer-Set aus Akazienholz · 5 Stück | LuxeStyle CH", "doppelmenge"),
        ("Tennis- und Badmintontaschen-Set (2 Stück)", "Tennis- und Badmintontaschen-Set (2 Stück) · 2 Stück | LuxeStyle CH", "doppelmenge"),
        ("Luftballons bunt · 100 Stück", "Luftballons bunt · 100 Stück | LuxeStyle CH", None),           # Menge EINMAL = richtig
        ("Kleid mit Volant", "Kleid mit Volant · 2 Stück | LuxeStyle CH", None),                     # Menge nur im SEO, nicht im Titel → nicht unsere Klasse
        ("Sommerkleid Damen", "Sommerkleid Damen Gr. 38 | LuxeStyle", None),                           # Unterscheidung aus seo_voll_fix
    ]
    fehler = 0
    for t, st, soll in f:
        ist = klasse(t, st)
        if ist != soll:
            fehler += 1; print(f"❌ {t!r} / {st!r} → {ist}, soll {soll}")
    for t in ("Rundes Haustierbett aus Cord", "304 Edelstahl Lebensmittelbehälter mit luftdichtem Deckel",
              "Schuluniform-Set im Anime-Stil: Blazer, Rock, Hemd & Fliege (Cosplay)",
              "Ergonomisches Kopfkissen aus Memory-Schaum mit Armauflagen (Schmetterlingsform) für Rücken- und Seitenschläfer"):
        n = seo_titel(t)
        if len(n) > GRENZE or klasse(t, n) is not None and len(t) <= GRENZE:
            fehler += 1; print(f"❌ seo_titel({t!r}) = {n!r} ({len(n)})")
    print(f"{fehler} Fehler" if fehler else f"✅ {len(f)} + 4 Kanarienvögel richtig")
    return 1 if fehler else 0


def laden(gql):
    seit = "" if os.environ.get("ALLE") == "1" else f" created_at:>={(dt.datetime.utcnow() - dt.timedelta(days=TAGE)).strftime('%Y-%m-%dT00:00:00Z')}"
    q = ('query($c:String,$q:String!){products(first:250,after:$c,query:$q,sortKey:CREATED_AT){pageInfo{hasNextPage endCursor} '
         'nodes{id title tags seo{title description}}}}')
    alle, c = [], None
    while True:
        r = gql(q, {"c": c, "q": "status:active" + seit})["products"]
        alle += r["nodes"]
        if not r["pageInfo"]["hasNextPage"]:
            break
        c = r["pageInfo"]["endCursor"]
    return alle, seit


def main():
    if "--test" in sys.argv:
        return kanarienvoegel()
    from kaufwille_zeile import gql
    nur_messen = os.environ.get("NUR") == "messen"
    try:
        alle, seit = laden(gql)
    except Exception as e:
        print(f"SEO-TITEL: unklar ({str(e)[:80]})"); return 1
    bef, leer = [], 0
    for p in alle:
        if any(POD.match(x) for x in p["tags"]):
            continue
        k = klasse(p["title"], (p.get("seo") or {}).get("title"))
        if k:
            bef.append((k, p))
        leer += not ((p.get("seo") or {}).get("title") or "").strip()
    z = {k: sum(1 for b in bef if b[0] == k) for k in ("gekappt", "doppelmenge")}
    zeit = time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime())
    stand = f"{z['gekappt']} gekappt · {z['doppelmenge']} Doppelmenge von {len(alle)} aktiven ({leer} ohne SEO-Titel = Titel, ok)" + \
            (" (alle)" if not seit else f" (seit {TAGE} T)") + f", gemessen {zeit}"
    if nur_messen:
        print(("⚠️ " if bef else "") + "SEO-TITEL: " + stand + (" → SCHARF=1 seo_titel_grenze.py" if bef else "")); return 0
    print(f"START {zeit}: {stand} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    for k, p in bef[:25]:
        print(f"   [{k}] {p['title']!r}\n      alt {((p.get('seo') or {}).get('title') or '')!r}\n      neu {seo_titel(p['title'])!r}")
    if not SCHARF:
        print(f"FERTIG (trocken): {len(bef)} Kandidaten"); return 0
    ok = fehler = 0
    with open(LEDGER, "a", encoding="utf-8") as led:
        for k, p in bef:
            alt = (p.get("seo") or {}).get("title") or ""
            neu = seo_titel(p["title"])
            r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{seo{title}} userErrors{message}}}",
                    {"p": {"id": p["id"], "seo": {"title": neu, "description": (p.get("seo") or {}).get("description") or ""}}})["productUpdate"]
            live = ((r.get("product") or {}).get("seo") or {}).get("title")
            # Gleichheit, nicht «beginnt mit» — null ist nur dann gleich, wenn der SEO-Titel = Produkttitel sein soll
            gut = not r.get("userErrors") and (live == neu or (live is None and neu == p["title"]))
            ok += gut; fehler += not gut
            led.write("\t".join([zeit, p["id"], k, alt.replace("\t", " "), neu, "ok" if gut else f"FEHLER live={live!r} {str(r.get('userErrors'))[:60]}"]) + "\n")
            if not gut:
                print(f"   ⚠️ {p['id']} live {live!r} ≠ {neu!r} {r.get('userErrors')}")
            time.sleep(0.3)
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {ok} gesetzt (gleich zurückgelesen), {fehler} Fehler")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
