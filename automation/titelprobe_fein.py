#!/usr/bin/env python3
"""titelprobe_fein.py — Kleidung und Schmuck: wenn der Titel der Google-Klasse widerspricht, entscheidet das Titelwort (08.10.2026).

ANLASS (Betreiber «weiter fein katalog verbessern»). GEMESSEN 08.10. (Export 51'609 aktive): kategorie_fein.py liess
233 Produkte grob, weil die Titelprobe die Google-Klasse ablehnte — und meist zu Recht: 142 «Dresses» waren Röcke
(«Weisser A-Linienrock»), Blusen, Hosen, Jumpsuits, Nachthemden und Bikinis; 56 «Bracelets» waren Ketten, Ringe,
Armbanduhren, ein Gürtel. Google lag falsch, der Shop blieb auf «Clothing»/«Jewelry» stehen. Jeder Neuimport mit
derselben CJ-Kategorie läuft in dieselbe Lücke.

REGEL (Titel klein, ß→ss; nur Produkte, deren Google-Klasse unter Kleidung/Schmuck liegt UND deren Titelprobe scheitert):
  Kleidung: ganzer Titel zuerst — Nachtwäsche → Bademode → Set/Zweiteiler → Jumpsuit → Kimono; dann das KOPFWORT
  (Teil vor «für/mit/aus/im/…»): Blazer/Jacke/Weste → Strickjacke/Pullover/Hoodie → Rock → Hose → Shorts → Bluse/Body/Top.
  «Rock» mit Ärmel/Ausschnitt/Trägern/Neckholder ist ein falsch übersetztes Kleid → Dresses (Titel im Bericht zum Umbenennen).
  Schmuck (nur Kopfwort): Uhr → Ohrring → Fuss-/Körperkette → Schlüsselanhänger → Gürtel → Haarspange → Schmuckset → Ring →
  Armband/Armreif → Kette → Anhänger. Kein Treffer = bleibt grob (grob ist besser als falsch).
Schreibt Google-Kategorie UND Shopify-Kategorie (kosmetik_fein.schreiben, zurückgelesen); eine feinere Shopify-Klasse
desselben Zweigs bleibt; Kinderkleidung (aa-1-25-*) wird nie angefasst. Täglich im Aufseher → erfasst Neuimporte.

  python3 automation/titelprobe_fein.py --kanarien  ·  python3 automation/titelprobe_fein.py  ·  SCHARF=1 …
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kosmetik_fein as kos  # noqa: E402
import kategorie_fein as kf  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_titelprobe_fein.tsv")
BERICHT = os.path.join(REPO, "dropship", "TITELPROBE-FEIN.md")
SCHARF = os.environ.get("SCHARF") == "1"
A = "Apparel & Accessories"; C = A + " > Clothing"; J = A + " > Jewelry"
R = lambda s: re.compile(s, re.I)
TRENNER = re.compile(r"\s+(?:für|mit|aus|im|in|zum|zur|ohne|und|&)\s+|\s+[–·|]\s+|,|:|\(", re.I)
KRAGEN = R(r"ärmel|armel|langarm|kurzarm|ausschnitt|neckholder|träger|trager|one-shoulder|schulter|rundhals|v-neck|deep-v|halterneck|kragen")

GANZ = [   # ganzer Titel
    (R(r"nachthemd|nachtkleid"), C + " > Sleepwear & Loungewear > Nightgowns", None),
    (R(r"nachtrobe|bademantel|morgenmantel"), C + " > Sleepwear & Loungewear > Robes", None),
    (R(r"pyjama|schlafanzug|schlaf-?set"), C + " > Sleepwear & Loungewear > Pajamas", None),
    (R(r"loungewear|homewear|nachtwäsche|nachtwasche"), C + " > Sleepwear & Loungewear", None),
    (R(r"bikini|badeanzug|tankini|monokini|badehose|swimsuit|bademode"), C + " > Swimwear", None),
    (R(r"zweiteiler|\bset\b|-set\b|2-teilig|zweiteilig|(?:top|bluse|shirt|weste|cardigan)\s*&\s*\S*\s*(?:rock|röck|shorts|hose|jupe)"),
     C + " > Outfit Sets", None),
    (R(r"\b(?:top|bluse|cardigan)\b.*\bmit\b.*(?:rock|röck|jupe|shorts|hose)\b"), C + " > Outfit Sets", None),   # «Top mit Maxirock»
    (R(r"jumpsuit|overall|romper|playsuit"), C + " > One-Pieces > Jumpsuits & Rompers", None),
    (R(r"kimono"), C + " > Traditional & Ceremonial Clothing > Kimonos", None),
]
KOPF = [   # Kopfwort
    (R(r"blazer|sakko"), C + " > Outerwear > Coats & Jackets", "aa-1-10-2-18"),
    (R(r"strickjacke|cardigan"), C + " > Shirts & Tops", "aa-1-13-3"),
    (R(r"hoodie|kapuzenpullover|kapuzenpulli"), C + " > Shirts & Tops", "aa-1-13-13"),
    (R(r"pullover|pulli\b|sweater|strickpulli"), C + " > Shirts & Tops", "aa-1-13-12"),
    (R(r"weste|\bvest\b|gilet"), C + " > Outerwear > Vests", None),
    (R(r"(?<!strick)(?<!rock)jacke\b|mantel|parka|blouson|anorak|windbreaker"), C + " > Outerwear > Coats & Jackets", None),
    (R(r"(?<!shirt)(?<!hemd)(?<!hosen)(?:\brock\b|röck|\w+rock\b)|jupe\b|\bskirt"), C + " > Skirts", None),
    (R(r"hose\b|\w+hose\b|jeans|pantalon|trouser|leggings|chino"), C + " > Pants", None),
    (R(r"shorts|bermuda"), C + " > Shorts", None),
    (R(r"bluse"), C + " > Shirts & Tops", "aa-1-13-1"),
    (R(r"\bbody\b"), C + " > Shirts & Tops", "aa-1-13-2"),
    (R(r"\btop\b|\w+top\b|shirt|oberteil|hemd|tunika"), C + " > Shirts & Tops", None),
]
SCHMUCK = [   # Kopfwort
    (R(r"armbanduhr|damenuhr|herrenuhr|\buhr\b|uhren\b|watch"), J + " > Watches", "aa-6-11"),
    (R(r"ohrring|ohrstecker|creolen|ohrclip|ohrh[äa]nger"), J + " > Earrings", None),
    (R(r"fusskett|fussket|anklet"), J + " > Anklets", None),
    (R(r"fingerkett|hüftkett|huftkett|bauchkett|körperkett|korperkett|body ?chain"), J + " > Body Jewelry", None),
    (R(r"schlüsselanh|schluesselanh|schlusselanh|keychain"), A + " > Handbag & Wallet Accessories > Keychains", None),
    (R(r"gürtel|gurtel"), A + " > Clothing Accessories > Belts", None),
    (R(r"haarspange|haarklammer|haarclip"), A + " > Clothing Accessories > Hair Accessories > Hair Pins, Claws & Clips", None),
    (R(r"schmuck-?set"), J + " > Jewelry Sets", None),
    (R(r"(?<!ohr)(?<!schlüssel)(?<!schlussel)ring\b|ringe\b"), J + " > Rings", None),
    (R(r"armband|armbänd|armreif|armkette|armspange|(?<!st)reifen?\b"), J + " > Bracelets", None),   # «Doppelstreifen» ≠ Reif
    (R(r"halskette|\w*kette\b|kettchen|collier|choker"), J + " > Necklaces", None),
    (R(r"anhänger|anhanger|\bcharm|pendant"), J + " > Charms & Pendants", None),   # «Luftschlaucharm» ≠ Charm
]
ZIELE = sorted({z for _, z, _ in GANZ + KOPF + SCHMUCK} | {C + " > Dresses"})


def kopf(titel):
    return TRENNER.split(titel or "", maxsplit=1)[0]


def ziel(titel, google):
    """→ (Google-Pfad, Shopify-ID oder None, Kleid-statt-Rock?) oder None."""
    t = (titel or "").replace("ß", "ss")
    if google.startswith(C):
        for rx, g, sid in GANZ:
            if rx.search(t):
                return g, sid, False
        k = kopf(t)
        if re.search(r"rockjacke|shirtrock|hemdrock", t, re.I):
            return None
        for rx, g, sid in KOPF:
            if rx.search(k):
                if g.endswith("> Skirts") and KRAGEN.search(t):
                    return C + " > Dresses", "aa-1-4", True     # «Minirock mit Spaghettiträgern» = Kleid
                if g.endswith(("> Pants", "> Shorts")) and KRAGEN.search(t):
                    return None                                  # «Langarm-Hose» — widersprüchlich
                return g, sid, False
        return None
    if google.startswith(J):
        k = kopf(t)
        for rx, g, sid in SCHMUCK:
            if rx.search(k):
                return g, sid, False
    return None


KANARIEN = [   # (Titel, heutige Google-Klasse, Soll-Google-Endung oder None)
    ("Weisser A-Linienrock", C + " > Dresses", "Skirts"),
    ("Bunt gestreifte A-Linien-Rock", C + " > Dresses", "Skirts"),
    ("Eleganter Maxi-Jupe mit hoher Taille", C + " > Dresses", "Skirts"),
    ("Minirock mit Spaghettiträgern und A-Linie", C + " > Dresses", "Dresses"),
    ("Kurzer Rock mit Perlen und langen Ärmeln", C + " > Dresses", "Dresses"),
    ("Apricot-Bluse", C + " > Dresses", "Shirts & Tops"),
    ("Sommerliche Leinenhose", C + " > Dresses", "Pants"),
    ("Elegante Langarm-Hose", C + " > Dresses", None),
    ("Eleganter Jumpsuit mit Print", C + " > Dresses", "Jumpsuits & Rompers"),
    ("High-Waist Bikini mit Cut-Outs", C + " > Dresses", "Swimwear"),
    ("Nachthemd mit Spaghettiträgern und Brustpolstern", C + " > Dresses", "Nightgowns"),
    ("Durchsichtige Nachtrobe", C + " > Dresses", "Robes"),
    ("Mid-Langer Bademantel für Damen", C + " > Dresses", "Robes"),
    ("Damen Schlaf-Set für Zuhause", C + " > Dresses", "Pajamas"),
    ("Zweiteiler: Halterneck-Top & Midi-Rock", C + " > Dresses", "Outfit Sets"),
    ("Elegante V-Neck Bluse & Maxi-Rock Set", C + " > Dresses", "Outfit Sets"),
    ("Damen-Set: Weste & Shorts mit Taschen", C + " > Dresses", "Outfit Sets"),
    ("Grüne Strickjacke", C + " > Dresses", "Shirts & Tops"),
    ("Taillierter Blazer mit doppelreihiger Knopfleiste", C + " > Dresses", "Coats & Jackets"),
    ("Modernisierter Kimono für junge Damen", C + " > Dresses", "Kimonos"),
    ("Langärmlige Rockjacke", C + " > Dresses", None),
    ("Blauer Striped-Langarm-Shirtrock", C + " > Dresses", None),
    ("Elegant Schulterfrei", C + " > Dresses", None),
    ("Lange Steppweste mit Kapuze", C + " > Outerwear > Coats & Jackets", "Vests"),
    ("Herren Kapuzenpullover, Langarm", C + " > Outerwear > Coats & Jackets", "Shirts & Tops"),
    ("Schwarzer Parka mit Fellkapuze und Taillenzug", C + " > One-Pieces > Jumpsuits & Rompers", "Coats & Jackets"),
    ("Goldkette für Frauen", J + " > Bracelets", "Necklaces"),
    ("Edelstahl-Ring", J + " > Bracelets", "Rings"),
    ("Goldene Oktogonal-Armbanduhr", J + " > Bracelets", "Watches"),
    ("Gold-veredelter Ledergürtel mit Wolf-Head-Design", J + " > Bracelets", "Belts"),
    ("Fusskette Schildkröte und Seestern aus 925er Silber", J + " > Bracelets", "Anklets"),
    ("Ovale Zirkon-Fingerkette, 18K vergoldet", J + " > Bracelets", "Body Jewelry"),
    ("Hüftkettchen aus Metall", J + " > Necklaces", "Body Jewelry"),
    ("Herz-Schluesselanhanger", J + " > Necklaces", "Keychains"),
    ("Haarspange Herz-Keks", J + " > Earrings", "Hair Pins, Claws & Clips"),
    ("Herz-Vierblatt-Kleeblatt-Schmuckset", J + " > Bracelets", "Jewelry Sets"),
    ("Goldener Armband · Damen", J + " > Necklaces", "Bracelets"),
    ("DIY-Anhänger für Armbänder im Resort-Stil", J + " > Bracelets", "Charms & Pendants"),
    ("Stahlkette mit Lederband", J + " > Bracelets", "Necklaces"),
    ("Glücksklee-Bead Set für DIY Armbänder", J + " > Bracelets", None),
    ("Ohrring Set Gold", J + " > Rings", "Earrings"),
    ("Vierblättriges Glück", J + " > Bracelets", None),
    ("Fächerförmige Doppelstreifen Huggie Hoops", J + " > Bracelets", None),
    ("Sterling Silber Luftschlaucharm", J + " > Bracelets", None),
    ("Goldener Brillanzreifen", J + " > Necklaces", "Bracelets"),
    ("Ärmelloses Top mit Vintage-Maxirock", C + " > Dresses", "Outfit Sets"),
    ("Cardigan mit Print und minimalistischer Jupe", C + " > Dresses", "Outfit Sets"),
]


def kanarien(gueltig=None):
    ok = 0
    for t, g, soll in KANARIEN:
        z = ziel(t, g)
        ist = z[0].split(" > ")[-1] if z else None
        gut = ist == soll and (z is None or gueltig is None or z[0] in gueltig)
        ok += gut
        if not gut:
            print(f"  ✗ {t!r} → {ist} (soll {soll})")
    print(f"TITELPROBE-KANARIEN {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


def main():
    gueltig = kos.google_taxonomie()
    for z in ZIELE:
        if z not in gueltig:
            raise SystemExit(f"Google-Pfad unbekannt: {z} — nichts geschrieben")
    if not kanarien(gueltig):
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    karte = json.load(open(kf.KARTE, encoding="utf-8"))["karte"]
    kf.export_holen()
    try:
        erledigt = {(l.split("\t")[0], l.split("\t")[2]) for l in open(LEDGER, encoding="utf-8") if l.count("\t") >= 3}
    except OSError:
        erledigt = set()
    st = collections.Counter(); plan = []; umbenennen = []; ohne = []; ziele = collections.Counter()
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        g = (p.get("metafield") or {}).get("value") or ""
        if not g.startswith((C, J)) or kf.titel_ok(g, p["title"]):
            continue
        cid = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        st["titelprobe-nein"] += 1
        if cid.startswith("aa-1-25"):
            st["kinderkleidung"] += 1; continue
        z = ziel(p["title"], g)
        if not z:
            st["kein-treffer"] += 1; ohne.append(f'{p["title"][:70]}  [G: {g.split(" > ")[-1]}]'); continue
        neu, sid, kleid = z
        sid = sid or kos.shopify_ziel(neu, karte)
        if cid.startswith(sid + "-"):
            sid = cid                                  # schon feiner im selben Zweig
        if kleid:
            umbenennen.append(p["title"])
        if neu == g and sid == cid:
            st["stimmt"] += 1; continue
        if (p["id"], neu) in erledigt:
            st["schon-im-ledger"] += 1; continue
        plan.append((p["id"], neu, sid)); ziele[neu.split(" > ")[-1]] += 1
    gs = kf.ids_pruefen({x[2] for x in plan if x[2]}) if plan else set()
    plan = [x for x in plan if x[2] in gs]
    print("Stand:", dict(st), "· Plan", len(plan), dict(ziele.most_common()))
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), 25):
                for pid, s, g, sid, fehler in kos.schreiben(plan[i:i + 25]):
                    f.write(f"{pid}\t{s}\t{g}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{fehler}\n")
                    ok += s == "gesetzt"; fe += s == "fehler"
                f.flush(); time.sleep(0.5)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Titelprobe-Fein — Stand {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}\n\n"
                f"Werkzeug `automation/titelprobe_fein.py` (Regel im Kopf). {'SCHARF' if SCHARF else 'TROCKEN'}: "
                f"Plan {len(plan)}{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ''}.\n\n"
                + "".join(f"- {n} → {k}\n" for k, n in ziele.most_common())
                + f"\n## «Rock» mit Ärmeln/Ausschnitt = Kleid — Titel umbenennen ({len(umbenennen)})\n\n"
                + "".join(f"- {t}\n" for t in umbenennen)
                + f"\n## Ohne Treffer — bleibt grob ({len(ohne)})\n\n" + "".join(f"- {t}\n" for t in ohne))
    print(f"TITELPROBE-FEIN: {len(plan)} geplant{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · "
          f"ohne Treffer {st['kein-treffer']} · Kleid-statt-Rock {len(umbenennen)}")


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien(kos.google_taxonomie()) else 1)
    main()
