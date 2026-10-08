#!/usr/bin/env python3
"""schuhe_fein.py — Schuhe in Shopifys feine Schuhklassen (08.10.2026).

ANLASS (Betreiber «verbessere feinkataloge»). GEMESSEN 08.10. (Export 51'626 aktive): **5'647 Schuhe** stehen in Shopify nur
auf «Apparel & Accessories > Shoes» (aa-8). Google kennt unter «Shoes» keine feinere Klasse — darum verfeinert kategorie_fein
(Weg über Google) sie nie, und der Shop-Filter «Kategorie» kann Sneakers nicht von Stiefeln trennen. Shopify unterteilt:
Athletic Shoes aa-8-1, Boots aa-8-3, Sandals aa-8-6, Slippers aa-8-7, Sneakers aa-8-8, Flats aa-8-9, Heels aa-8-10,
Baby & Children's Shoes aa-8-11 (Boots -1, Sandals -2, Athletic -4, Sneakers -5, First Steps & Crawlers -6).

REGEL (Titelwort, erste Regel gewinnt; Google bleibt «Shoes»):
  Kinder-/Babywort → Kinderzweig (Lauflern/Erste Schritte → First Steps; dann Stiefel, Sandale, Sport, Sneaker; sonst aa-8-11)
  Hausschuh/Pantoffel/Finken → Slippers · Stiefel/Boots → Boots · Sandale/Zehentrenner/Pantolette → Sandals (Stiletto-Sandalette
  = Sandale) · Lauf-/Sport-/Trainings-/Wanderschuh → Athletic · Sneaker/Canvas/Freizeit-/Skate-/Board-Schuh → Sneakers ·
  Pumps/High Heels/Absatz → Heels · Ballerina/Loafer/Mokassin/Halbschuh/Schnürschuh/Oxford → Flats.
  «Slipper» allein ist zweideutig (deutsch = Slip-on, englisch = Hausschuh): mit Leder/Business/elegant → Flats, mit
  Plüsch/flauschig/Cartoon/warm → Slippers, sonst bleibt er.
  NICHT: Sicherheits-/Arbeitsschuhe, Roll-/Schlittschuhe, Inline, Schuhzubehör (Einlage, Schnürsenkel, Regal) — bleiben.
NUR Produkte auf aa-8 oder aa-8-11 (grob); eine schon feine Klasse wird nie überschrieben. Schreibt über kosmetik_fein.schreiben
(Google-Wert bleibt), Ledger dropship/_schuhe_fein.tsv. Täglich im Aufseher (Kategorie-Kette) → erfasst auch Neuimporte.

  python3 automation/schuhe_fein.py --kanarien  ·  python3 automation/schuhe_fein.py  ·  SCHARF=1 …
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kosmetik_fein as kos  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_schuhe_fein.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
G = "Apparel & Accessories > Shoes"
GROB = {"aa-8", "aa-8-11"}
R = lambda s: re.compile(s, re.I)

KIND = R(r"kinder|\bkids?\b|mädchen|jungen|\bbaby|babys|kleinkind|lauflern|erste[ns]? schritte|krabbel|teens?\b")
NICHT = R(r"sicherheits|arbeitsschuh|stahlkappe|schutzschuh|rollschuh|schlittschuh|inline|skates?\b(?!board)|einlage|einlegesohle|"
          r"schnürsenkel|schuhregal|schuhschrank|schuhcreme|schuhbürste|schuhspanner|schuhanzieher|überschuh|schuhüberzieher|"
          r"schuhclip|schuhanhänger|schuhaufbewahr")
STIEFEL = r"stiefel|boots?\b|booties|bootie\b|stiefelette|chelsea|schneeschuh|winterschuh|kniehoch|overknee|over-knee"
SANDALE = r"sandal|zehentrenner|zehensteg|flip-?flop|pantolette|\bslides?\b|badeschlappe|badelatschen|espadrille|\bclogs?\b|crocs"
SPORT = (r"laufschuh|running|sportschuh|trainingsschuh|training-schuh|trainings-schuh|joggingschuh|tennisschuh|basketball|fussballschuh|"
         r"wanderschuh|trekkingschuh|trail|hallenschuh|fitness-?schuh|gym|outdoorschuh|bergschuh|kletterschuh|radschuh|radfahrer|golfschuh")
SNEAKER = r"sneaker|turnschuh|canvas|freizeitschuh|skate|board-?schuh|leinenschuh|segeltuchschuh|high-?top|low-?top|slip-?on"
HEELS = r"high[ -]?heels?|\bpumps\b|-pumps|stiletto|absatz|absätz|hochhackig|stöckel|keilabsatz|\bwedges?\b|plateau-?pumps|slingback|peeptoe|peep-toe"
FLATS = r"ballerina|loafer|mokassin|halbschuh|schnürschuh|oxford|derby|brogue|bootsschuh|mary[\s-]?jane|flache schuhe|budapester|business[\w-]*schuh|\bflats?\b|-flats"
HAUS = r"hausschuh|pantoffel|\bfinken\b|bettschuh|filzpantoffel|plüschpantoffel|hüttenschuh"

REGELN_KIND = [
    (R(r"lauflern|erste[ns]? schritte|krabbel|first walker"), "aa-8-11-6"),
    (R(STIEFEL), "aa-8-11-1"),
    (R(SANDALE), "aa-8-11-2"),
    (R(SPORT), "aa-8-11-4"),
    (R(SNEAKER), "aa-8-11-5"),
]
REGELN = [
    (R(HAUS), "aa-8-7"),
    (R(r"slipper[\w\s,-]*(plüsch|flausch|fussel|cartoon|tier|warm|fell|kuschel)|(plüsch|flausch|fussel|cartoon|kuschel)[\w\s,-]*slipper"), "aa-8-7"),
    (R(STIEFEL), "aa-8-3"),
    (R(SANDALE), "aa-8-6"),
    (R(SPORT), "aa-8-1"),
    (R(r"loafer|mokassin|ballerina|mary[\s-]?jane"), "aa-8-9"),          # vor «High-top»/«Canvas»: Loafer bleibt Loafer
    (R(SNEAKER), "aa-8-8"),
    (R(r"^(?!.*(verdeckt|versteckt|unsichtbar)).*(" + HEELS + ")"), "aa-8-10"),   # «verdeckter Absatz» = Herren-Erhöhung, kein Absatzschuh
    (R(FLATS), "aa-8-9"),
    (R(r"(leder|business|elegant|loafer|mokassin)[\w\s,·-]*slipper|slipper[\w\s,·-]*(leder|business|elegant)"), "aa-8-9"),
]


def ziel(titel):
    t = titel or ""
    if NICHT.search(t):
        return None
    if KIND.search(t) and not re.search(r"kinder- und erwachsenen|erwachsene und kinder|für paare|eltern-kind", t, re.I):
        for rx, sid in REGELN_KIND:
            if rx.search(t):
                return sid
        return "aa-8-11"
    for rx, sid in REGELN:
        if rx.search(t):
            return sid
    return None


KANARIEN = [   # echte Titel aus dem Export vom 08.10.
    ("Plateau-Sandalen · Damen, Retro-Style mit Komfort-Sohle", "aa-8-6"),
    ("Zehensteg-Sandalen «Riva» · flach, mit Metall-Detail", "aa-8-6"),
    ("Stiletto-Sandalette «Gala» · Violett, Knöchelriemen", "aa-8-6"),
    ("Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer", "aa-8-8"),
    ("Herren Sport-Sneaker «Velocità» · Mesh, Wide-Toe", "aa-8-8"),
    ("Bequeme Kniehoch-Boots mit Nietenriemen, massiven Absätzen u", "aa-8-3"),
    ("Rivetten-Boots mit Blockabsatz", "aa-8-3"),
    ("Herren Laufschuhe · Flyknit, atmungsaktiv, leicht", "aa-8-1"),
    ("Herren Trainingsschuhe «Forza» · Gym & Weightlifting", "aa-8-1"),
    ("Slingback-Pumps · Damen, mit Absatz, wasserfest beschichtet", "aa-8-10"),
    ("Schuhe mit Chunky-Absatz", "aa-8-10"),
    ("Loafer · Damen, Rundkappe flach, vielseitig (Basic 2026)", "aa-8-9"),
    ("Mary-Jane-Ballerina «Dolce» · Lack, mit Riemchen", "aa-8-9"),
    ("Herren Leder-Slipper · elegant, zum Reinschlüpfen (Business", "aa-8-9"),
    ("Shark-Cartoon-Slipper, weich & rutschsicher", "aa-8-7"),
    ("Leichte Anti-Rutsch Hausschuhe für Paare", "aa-8-7"),
    ("Kinder- und Erwachsenen-Hausschuhe mit Tiermotiven", "aa-8-7"),
    ("Herren-Slip-on «Sail» · Canvas, leichte Sohle", "aa-8-8"),
    ("Leichte, atmungsaktive Skateboard-Schuhe für Herren", "aa-8-8"),
    ("Baby-Lauflernschuhe aus weichem Kunstleder", "aa-8-11-6"),
    ("Erste Schritte", "aa-8-11-6"),
    ("Warme Kinderstiefel mit Fleecefutter und nicht rutschenden w", "aa-8-11-1"),
    ("Herbst- und Winterstiefel für Mädchen", "aa-8-11-1"),
    ("Kinder-Sportsandalen mit Klettverschluss", "aa-8-11-2"),
    ("Kinder-Laufschuhe mit Mesh", "aa-8-11-4"),
    ("Leder-Sneaker für Kinder mit Klettverschluss", "aa-8-11-5"),
    ("Kinder Ballerinas mit Leoparden-Schleife", "aa-8-11"),
    ("Jazz-Tanzschuhe aus Echtleder für Kinder", "aa-8-11"),
    ("Sicherheits-Schuhe mit Stahlkappe", None),
    ("Doppelte Rollen Schlittschuhe", None),
    ("Mules mit geschlossener Zehenpartie", None),
    ("Hai-Pantinen mit Abfluss", None),
    ("Sommeratmungsaktive koreanische Casualschuhe", None),
    ("Paarweise Hausschuhe", "aa-8-7"),
    ("Sneaker mit unsichtbarer Absatz Erhöhung", "aa-8-8"),
    ("Winter High-Top Sneaker mit Keilabsatz", "aa-8-8"),
    ("Rundspitzige Knöchelboots mit Stitch-Detail", "aa-8-3"),
    ("Damen-Booties mit massiver Sohle, winterfest", "aa-8-3"),
    ("Hochhackige Chunky-Sohlen Leder Kniehochschuhe", "aa-8-3"),
    ("Massive Absätze Spitzschuhe mit Rückenriemen", "aa-8-10"),
    ("Königlich zarte Lolita-Mary Jane Schuhe", "aa-8-9"),
    ("Bootsschuhe aus Wildleder für Herren", "aa-8-9"),
    ("Hochzeitsschuhe · Damen", None),
    ("Bestickte Mesh Flats im Hanfu-Stil", "aa-8-9"),
    ("Herren Ultra-leichte EVA Trekkingschuhe", "aa-8-1"),
    ("Business-Lederschuhe für Herren – Atmungsaktiv", "aa-8-9"),
    ("Robuste Outdoor-Sicherheitsstiefel für Herren", None),
    ("Plattform Slipper – Leicht & Rutschfest", None),
    ("Sommer Mesh-Mules mit Perlen-Schnalle", None),
    ("Business-Lederschuhe mit verdecktem Absatz", "aa-8-9"),
    ("Herren High-top Wildleder Loafer", "aa-8-9"),
    ("Atmungsaktive Canvas Loafers für Herren", "aa-8-9"),          # Sneaker vor Absatz; «Winter» allein ist kein Stiefelwort
]


def kanarien():
    ok = 0
    for t, s in KANARIEN:
        ist = ziel(t); gut = ist == s; ok += gut
        if not gut:
            print(f"  ✗ {t!r} → {ist} (soll {s})")
    print(f"SCHUH-KANARIEN {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


def main():
    import kategorie_fein as kf
    if not kanarien():
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    kf.export_holen()
    try:
        erledigt = {(l.split("\t")[0], l.split("\t")[3]) for l in open(LEDGER, encoding="utf-8") if l.count("\t") >= 4}
    except OSError:
        erledigt = set()
    plan, st, bsp = [], collections.Counter(), collections.defaultdict(list)
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        cid = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        g = (p.get("metafield") or {}).get("value") or ""
        if cid not in GROB or g != G:
            continue
        st["grob"] += 1
        sid = ziel(p["title"])
        if not sid or sid == cid or (cid == "aa-8-11" and not sid.startswith("aa-8-11")):
            st["bleibt"] += 1
            if not sid and len(bsp["—"]) < 15:
                bsp["—"].append(p["title"][:60])
            continue
        if (p["id"], sid) in erledigt:
            st["schon-im-ledger"] += 1; continue
        plan.append((p["id"], g, sid)); st[sid] += 1
        if len(bsp[sid]) < 4:
            bsp[sid].append(p["title"][:60])
    gueltig = kf.ids_pruefen({x[2] for x in plan}) if plan else set()
    plan = [x for x in plan if x[2] in gueltig]
    print("Stand:", dict(st))
    for k, v in bsp.items():
        print(f"  {k}: {v}")
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), 25):
                for pid, s_, g_, sid, feh in kos.schreiben(plan[i:i + 25]):
                    f.write(f"{pid}\t{s_}\t{g_}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{feh}\n")
                    ok += s_ == "gesetzt"; fe += s_ == "fehler"
                f.flush()
                time.sleep(0.4)
    print(f"FERTIG: SCHUHE-FEIN {len(plan)} geplant{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · grob {st['grob']} · bleibt {st['bleibt']}")


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    main()
