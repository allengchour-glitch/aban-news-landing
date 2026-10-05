#!/usr/bin/env python3
"""kategorie_rein.py — Menü-Kategorien ohne Fremdware (04.10.2026, Betreiber «kategorien und fein filter verbessern»).

GEMESSEN 04.10. (Produkttyp-Filter von 153 Menü-Kollektionen): «Ringe» führte 30 Produkttypen — Hundeleine mit Zugring,
Smartwatch, Turnringe, «Concealer gegen Augenringe», Schmuckbox; «Taschen» 27 (Aufbewahrungstasche für Camping-Geschirr,
Overall mit Reissverschlusstasche, Hängematte); «Vasen & Deko» (Kleid mit Rüschendekor, Damenuhr mit Diamant-Dekoration);
«Kissen» (Duschvorhang, Luftkissen-Sneaker, Concealer Kissen); «Stiefel» (Midikleid mit Bootsausschnitt, Sushi-Platten im
Boots-Design). Ursache: Titel-ODER-Regeln (in Shopify ohne «enthält nicht» möglich) oder breit vergebene Tags.
REGEL je Kategorie: gehört dazu ⇔ Titel trifft ECHT ∧ kein BAN ∧ Produkttyp in TYPEN. Dann eigener Tag «kat-…», die
Kollektion zeigt nur noch diesen Tag (alte Regel in dropship/_kategorie_rein_regeln_alt.json). Täglich: neue Ware rein,
Fremdware raus. Schutz: wird die Kollektion um mehr als 40 % kleiner, wird NICHT umgestellt (Meldung).
  python3 automation/kategorie_rein.py [handle …]         (trocken, Stichprobe der Zu-/Abgänge)
  SCHARF=1 python3 automation/kategorie_rein.py [handle …]
"""
import json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALT = os.path.join(REPO, "dropship/_kategorie_rein_regeln_alt.json")
LEDGER = os.path.join(REPO, "dropship/_kategorie_rein.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
SAMMEL = {"Trend-Gadget", "Trend-Produkt", "Accessoires", "Gadget", ""}   # Sammeltypen: Titel entscheidet
R = lambda s: re.compile(s, re.I)

CFG = {
    "sub-ringe": dict(
        tag="kat-ringe", suche=["ring"],
        echt=R(r"\w*ring(e|en|set)?\b"),
        ban=R(r"ohrring|ohrstecker|schmuck(box|kiste|kasten|ständer)|aufbewahrung|ring(grösse|groesse|mass|maß)|"
              r"schlüssel|zugring|beissring|beißring|schutzring|turnring|hüftring|augenring|ring ?licht|o-ring|dichtring|"
              r"leine|halsband|smartwatch|watch|uhr\b|klingel|ringbuch|boxring|sparring|kerzenring|serviettenring|"
              r"tearing|lettering|bearing|touring|string|spring|earring|catering|armreif|armband|zählring|spinnrolle"),
        typen={"Ring", "Schmuck", "Damenmode", "Herrenmode"} | SAMMEL),
    "sub-taschen": dict(
        tag="kat-taschen", suche=["tasche", "rucksack", "clutch", "shopper"],
        echt=R(r"tasche|taschen\b|rucksack|rucksäcke|clutch|shopper|\bbag\b|geldbörse|portemonnaie|brieftasche|wallet|beutel"),
        ban=R(r"aufbewahrung|reissverschlusstasche|reißverschlusstasche|pattentasche|seitentasche|(mit|und|&)\s+(\w+\s+){0,3}taschen\b|"
              r"pullover|hoodie|hose\b|hosen\b|jacke|kleid|mantel|weste|shirt|overall|"
              r"mit tasche|taschenlampe|taschenmesser|taschenrechner|taschenuhr|taschentuch|hängematte|windel|garn|"
              r"werkzeug|taschenwaage|kühltasche|camping-geschirr|autositz|kopfstütze|wanddeko|plüsch-taschen|kostüm|teebeutel|duftbeutel"),
        typen={"Taschen", "Tasche", "Damenmode", "Herrenmode", "Make-up", "Sport & Outdoor"} | SAMMEL),
    "sub-deko": dict(
        tag="kat-deko", suche=["vase", "deko", "kunstpflanze", "pflanzenständer", "skulptur"],
        echt=R(r"vase|deko|kunstpflanze|pflanzenständer|skulptur|figur\b"),
        ban=R(r"dekor\b|-dekor|dekorationsmaschine|masking tape|kleid|hemd|bluse|\buhr|uhren|hundegeschirr|bausteine|"
              r"puzzle|tapete|nagel|haar|torte|kuchen|backform|aschenbecher|kreuzstich|band mit schleife|dekodier|dekompression"),
        typen={"Wohnen & Deko", "Haushalt & Wohnen", "Garten & Pflanzen", "Basteln & DIY", "Aufbewahrung & Organizer",
               "Partydeko & Ballone", "Küche & Bar", "Beleuchtung", "Heimtextilien"} | SAMMEL),
    "kissen-wohntextilien": dict(
        tag="kat-kissen", suche=["kissen", "überwurf", "vorhang", "decke"],
        echt=R(r"kissen|überwurf|vorhang|vorhänge|gardine|tagesdecke|sofadecke|wolldecke|kuscheldecke|plaid\b|tischdecke"),
        ban=R(r"duschvorhang|vorhanghaken|vorhangmotor|vorhangstange|insektenschutz|luftkissen|concealer|bb.?creme|"
              r"kissenmantel|nadelkissen|airbag|massage|sitzkissen für (auto|outdoor)|zügel|schnüffel|nackenkissen fürs auto|füllmaterial|füllung für"),
        typen={"Heimtextilien", "Wohnen & Deko", "Kissen", "Haushalt & Wohnen", "Spielzeug & Spiele", "Aufbewahrung & Organizer",
               "Basteln & DIY"} | SAMMEL),
    "jeans-denim": dict(
        tag="kat-jeans", suche=["jeans", "denim"],
        echt=R(r"jeans|denim"),
        ban=R(r"uhrenarmband|armband|\bstoff\b|baumwollstoff|twill|schürze|nägel|nail|leine|halsband|kostüm|schurze"),
        typen={"Damenmode", "Herrenmode", "Baby & Kinder", "Kinder", "Damenschuhe", "Herrenschuhe", "Kinderschuhe",
               "Taschen", "Hüte & Caps", "Jacke", "Hose"} | SAMMEL),
    "sub-stiefel-boots": dict(
        tag="kat-stiefel", suche=["stiefel", "boots", "stiefelette", "chelsea"],
        echt=R(r"stiefel|stiefelette|boots?\b|chelsea"),
        ban=R(r"bootsausschnitt|bootsnacken|boots-design|sushi|helmbeutel|stiefelbeutel|stiefelspanner|stiefelknecht|"
              r"stiefelständer|boots?(kragen|ausschnitt)|kleid|bluse|shirt"),
        typen={"Damenschuhe", "Herrenschuhe", "Kinderschuhe", "Schuhe", "Sportschuhe", "Spielzeug & Spiele"} | SAMMEL),
    "sub-halsketten": dict(
        tag="kat-halsketten", suche=["kette", "halskette", "collier", "anhänger"],
        echt=R(r"halskette|kette\b|ketten\b|kettenhalsband|collier|choker|anhänger|pendant|necklace"),
        ban=R(r"lichterkette|schlüsselanhänger|schlüsselband|schlüsselkette|^(?!.*halskette).*taschenuhr|\bauto|kettensäge|fahrrad|schneekette|uhrenkette|"
              r"schnullerkette|brillenkette|körperkette|bh-kette|agarholz|^(?!.*(halskette|collier|kette und|kette &)).*armband"),
        typen={"Halskette", "Schmuck", "Damenmode", "Ohrringe", "Uhren", "Armband"} | SAMMEL),
    "sub-armbaender": dict(
        tag="kat-armbaender", suche=["armband", "armreif", "armkette"],
        echt=R(r"armband|armbänder|armreif|armkette|bracelet|\bcuff\b"),
        ban=R(r"uhrenarmband|smart|fitness|tracker|herzfrequenz|wecker|gps|ersatzarmband|aufbewahrung|beutel|"
              r"leder-?armband für uhr|uhrband|armbanduhr|\buhr\b|kleid"),
        typen={"Armband", "Schmuck", "Halskette", "Ohrringe", "Damenmode", "Herrenmode"} | SAMMEL),
    "sub-ohrringe": dict(
        tag="kat-ohrringe", suche=["ohrring", "ohrhänger", "creolen", "ohrstecker"],
        echt=R(r"ohrring|ohrhänger|creole|ohrstecker|ohrclip|ear ?cuff"),
        ban=R(r"schmuck(box|kiste)|aufbewahrung|ohrloch|stechen|diy|haarstecker"),
        typen={"Ohrringe", "Schmuck", "Halskette", "Damenmode"} | SAMMEL),
}


try:  # 05.10.2026: Semrush-Landeseiten (Teppiche, Bettwäsche, …) tragen dieselbe Regelform — Tabelle in kategorie_rein_semrush.py
    from kategorie_rein_semrush import CFG as _CFG_SEMRUSH
    CFG.update(_CFG_SEMRUSH)
except Exception as _e:  # pragma: no cover
    print("⚠️ kategorie_rein_semrush nicht geladen:", _e)


def produkte(query=None, handle=None):
    cur, out = None, {}
    while True:
        if handle:
            d = gql('query($h:String!,$c:String){collectionByIdentifier(identifier:{handle:$h}){products(first:250,after:$c)'
                    '{pageInfo{hasNextPage endCursor} nodes{id title productType tags status}}}}', {"h": handle, "c": cur})
            d = d["collectionByIdentifier"]["products"]
        else:
            d = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id title productType tags status}}}', {"q": query, "c": cur})["products"]
        for p in d["nodes"]:
            if p["status"] == "ACTIVE":
                out[p["id"]] = p
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def gehoert(c, p):
    return bool(c["echt"].search(p["title"])) and not c["ban"].search(p["title"]) and p["productType"] in c["typen"]


def lauf(handle, c):
    jetzt = produkte(handle=handle)
    kand = dict(jetzt)
    for s in c["suche"]:
        kand.update(produkte(query=f"title:*{s}* status:active"))
    kand.update(produkte(query=f"tag:{c['tag']} status:active"))
    rein = {i for i, p in kand.items() if gehoert(c, p)}
    raus = set(jetzt) - rein
    neu = rein - set(jetzt)
    print(f"== {handle}: jetzt {len(jetzt)} · gehört {len(rein)} · raus {len(raus)} · neu {len(neu)}")
    for i in list(raus)[:6]: print("   −", kand[i]["productType"][:18].ljust(19), kand[i]["title"][:62])
    for i in list(neu)[:4]: print("   +", kand[i]["productType"][:18].ljust(19), kand[i]["title"][:62])
    if len(rein) < 0.6 * len(jetzt):
        print(f"   ⛔ würde um {100 - 100 * len(rein) // max(1, len(jetzt))} % schrumpfen — nicht umgestellt, Regeln prüfen")
        return
    if not SCHARF:
        return
    # 04.10.2026: einzeln geschrieben brauchte «Taschen» (3'128 neue Tags) allein ~40 min — der Lauf
    # (timeout 3000) kam nie über die zweite Kategorie hinaus. Jetzt 10 Mutationen je Anfrage (Aliase).
    ops = [("tagsAdd", i) for i in rein if c["tag"] not in kand[i]["tags"]] + \
          [("tagsRemove", i) for i, p in kand.items() if i not in rein and c["tag"] in p["tags"]]
    # Der Shopify-Eimer wird von ~30 Wächtern geteilt: «Throttled» heisst warten, nicht abbrechen (gemessen 22:33).
    for k in range(0, len(ops), 10):
        teil = ops[k:k + 10]
        m = " ".join(f'm{j}:{op}(id:"{i}",tags:["{c["tag"]}"]){{userErrors{{message}}}}' for j, (op, i) in enumerate(teil))
        for versuch in range(30):
            try:
                antwort = gql("mutation{" + m + "}")
                break
            except RuntimeError as e:
                if "Throttled" not in str(e) or versuch == 29:
                    raise
                time.sleep(15)
        fehler = [e for v in (antwort or {}).values() for e in (v or {}).get("userErrors", [])]
        if fehler:
            print("   ⚠️", fehler[:2])
    col = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id ruleSet{appliedDisjunctively '
              'rules{column relation condition}}}}', {"h": handle})["collectionByIdentifier"]
    ziel = [{"column": "TAG", "relation": "EQUALS", "condition": c["tag"]}]
    if [(r["column"], r["condition"]) for r in col["ruleSet"]["rules"]] != [("TAG", c["tag"])]:
        alt = json.load(open(ALT)) if os.path.exists(ALT) else {}
        alt.setdefault(handle, col["ruleSet"])
        json.dump(alt, open(ALT, "w"), ensure_ascii=False, indent=1)
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": col["id"], "ruleSet": {"appliedDisjunctively": False, "rules": ziel}}})
        print("   Regel → TAG", c["tag"], r["collectionUpdate"]["userErrors"] or "✅")
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{handle}\tjetzt {len(jetzt)}\tgehört {len(rein)}\traus {len(raus)}\tneu {len(neu)}\n")


def main():
    ziele = sys.argv[1:] or list(CFG)
    for h in ziele:
        lauf(h, CFG[h])


if __name__ == "__main__":
    main()
