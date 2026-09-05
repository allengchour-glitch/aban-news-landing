"""Zweite Säuberung des Google-Kanals: die Gruppen, nach denen niemand gesucht hat.

WAS DER ERSTE LAUF ERWISCHT HAT (und was hält): Alle 88 Entfernungen von heute stehen im
frischen Export mit g=false, das Butterfly-Messer ist DRAFT. Kein Rückfaller. Der erste Lauf
suchte aber nach den Gruppen, an die man beim Wort «Risiko» denkt — Rauchzubehör, Waffen,
Erotik, Refurbished. Die grösste offene Gruppe ist eine, die harmlos klingt:

 1. VERDECKTE ÜBERWACHUNG (11). Bei Google heisst die Rubrik «Dishonest behavior», und sie
    führt nicht zur Ablehnung des Artikels, sondern zur Sperrung des KONTOS. Vier
    Nano-Kameras bewerben sich selbst mit «diskrete Aufnahmen» und «unauffällig», sieben
    Ortungsgeräte versprechen ausdrücklich die Verfolgung von **Personen** — eines davon
    zusätzlich «Tonüberwachung und Aufzeichnung», was das Gerät zur Wanze macht, und drei
    haften magnetisch am fremden Fahrzeug. Das ist nicht bloss eine Google-Richtlinie: Wer
    in der Schweiz eine Person heimlich ortet oder abhört, erfüllt StGB Art. 179quater.

 2. ARZNEIMITTEL ALS NAHRUNGSERGÄNZUNG (1 scharfer Fall). «Melatonin-Film», CHF 19.90, aus
    China über CJ, beworben als «Nahrungsergänzungsmittel für Erwachsene». Melatonin ist in
    der Schweiz ein ARZNEIMITTEL nach Swissmedic. Das Produkt steht kurios unter der
    Warengruppe «Aufbewahrung & Organizer» und ist damit durch jede Warengruppenprüfung
    gerutscht.

 3. FREMDE MARKEN, die nicht auf der Liste standen (4). Der erste Lauf kannte elf Luxusnamen
    in der Bauform «im X-Stil». «Kinder **Doc Martens** Stiefel» für CHF 14.90 — zu dem Preis
    unmöglich echt —, «**Mercedes-Benz** Echtleder Umhängetasche» CHF 39.90, «Stiefeletten im
    **Dr. Martens** Stil» und eine «Lenkradverzierung für **Tesla** Model 3 mit Logo».
    Dieselbe Bauform, nur ein Name, den die geschlossene Liste nicht kannte.

 4. WAS DIE MUSTER STRUKTURELL VERFEHLT HABEN (2). «Einziehbare **Selbstverteidigungswaffe**
    für Frauen» — das Waffen-Muster verlangte ein KLINGEN-Nomen, und «Waffe» stand gar nicht
    darin; selbst ein `\bWaffe\b` hätte hier versagt, weil das Wort am Ende einer
    Zusammensetzung steht. Und ein «**Zigarren**anzünder mit Doppelflamme» — das Rauch-Muster
    kannte «Zigarrenetui», nicht den Anzünder.

DIE LEHRE, die über diesen Lauf hinausgeht: Eine geschlossene Namensliste altert mit jedem
Import. Wo möglich wird deshalb nach dem MUSTER gesucht (Markenname + «Stil», Kompositum-Ende
«…waffe») statt nach dem einzelnen Wort.

⚠️ BEWUSST DRIN GELASSEN: Die echten Markenartikel von BigBuy (Michael Kors CHF 124.90,
Adidas, Converse) sind Grosshandelsware und tragen den Markennamen zu Recht. Die Trennlinie
ist der Lieferanten-Tag und der Preis, nicht der Markenname. Ebenso bleiben GPS-Tracker für
den EIGENEN Schlüsselbund oder Koffer drin — verboten ist das heimliche Orten von Personen,
nicht das Wiederfinden der eigenen Sachen.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_google_kanal_gesaeubert2.txt"
GOOGLE = "gid://shopify/Publication/302872297857"

# ── Verdeckte Überwachung ─────────────────────────────────────────────────────
# Eine Kamera ist erlaubt. Eine Kamera, die mit ihrer UNAUFFÄLLIGKEIT wirbt, ist es nicht.
VERSTECKT = re.compile(r'diskret\w*\s+(?:Aufnahm|Aufzeichn|[ÜU]berwach|Film|Video|Beobacht)|'
                       r'unauff[äa]llig|versteckte?\s+Kamera|Spionage|Spy[- ]?Cam|'
                       r'getarnt|verborgen\w*\s+(?:Kamera|Linse)|'
                       r'nicht\s+bemerk|unbemerkt|heimlich', re.I)
# ⚠️ Nur WINZIGE Kameras. Der erste Entwurf nahm jedes Produkt mit «Kamera» im Titel, dessen
# Text irgendwo «unauffällig» sagte — und traf damit eine Solar-Aussenkamera, ein Vogelhaus
# mit Infrarotkamera, eine Sport-Actioncam und sogar eine 32-GB-Speicherkarte.
KAMERA = re.compile(r'(?:Mini|Nano|Micro|Mikro|Kleinst|Taschen|Knopf|Stift|Versteckt\w*)'
                    r'[- ]?Kamera|\bSQ\d{2}\b|\bA9\b.{0,12}Kamera|Spy[- ]?Cam', re.I)
# ⚠️ Und NIEMALS die Gegenrichtung: Ein «Wanzen- und Kamera-Detektor», ein «Kameradetektor»
# und ein «Smart Detector Kamera-Finder» SUCHEN versteckte Kameras. Sie aus dem Kanal zu
# nehmen hiesse, ausgerechnet das Schutzgerät zu bestrafen.
GEGENTEIL = re.compile(r'Detektor|Detector|Finder|Melder|Sp[üu]rger[äa]t|Aufsp[üu]r|'
                       r'Speicherkarte|TF[- ]?Card|SD[- ]?Karte|Stativ|Halterung', re.I)
# Personen zu orten ist der Kern des Problems — Gegenstände zu orten nicht.
PERSONENORTUNG = re.compile(r'(?:Ortung|Verfolgung|[üu]berwach\w*|Tracking)\s+von\s+[^.<]{0,40}'
                            r'Personen|Personen\s+(?:orten|verfolgen|[üu]berwachen)|'
                            r'an\s+Personen\s+anbring', re.I)
TRACKER = re.compile(r'GPS[- ]?Tracker|Ortungsger[äa]t|Peilsender|Tracker\b', re.I)
WANZE = re.compile(r'Tonaufzeichnung|Ton[üu]berwachung|Abh[öo]r|Audio[üu]berwachung|'
                   r'Sprachaufzeichnung|Mith[öo]ren', re.I)

# ── Arzneimittel, das als Nahrungsergänzung verkauft wird ─────────────────────
# ⚠️ NUR ZUM EINNEHMEN. Der erste Entwurf hatte «CBD» in der Liste und traf damit sechs
# InnovaGoods-KOSMETIKPACKUNGEN (Gesichtsreinigung, Feuchtigkeitspflege) von BigBuy. CBD in
# Kosmetik ist in der Schweiz zulässig; verboten ist der Arzneistoff zum Schlucken. Deshalb
# muss eine Einnahmeform dazukommen.
ARZNEI = re.compile(r'\bMelatonin\b|\bNikotin\b|Testosteron|Ephedrin|Yohimbin|\bDHEA\b', re.I)
EINNAHME = re.compile(r'\bFilm\b|Tablette|Kapsel|Tropfen|Spray|oral|einnehm|schluck|'
                      r'Nahrungserg[äa]nzung|zum\s+Einnehmen|sublingual', re.I)

# ── Fremde Marken ─────────────────────────────────────────────────────────────
# ⚠️ HIER HABE ICH MICH SELBST WIDERLEGT. Der Entwurf ersetzte die geschlossene Markenliste
# durch das offene Muster «im <Grossgeschriebenes Wort>-Stil», mit der Begründung, eine Liste
# altere. Das Muster fand 145 Treffer — und fast alle waren Stilrichtungen, keine Marken:
# «im Bowling-Stil», «im China-Stil», «im Outdoor-Stil», «im Mittelalter-Stil», «im
# Streetwear-Stil», «im Maillard-Stil», «im Magazin-Stil», «im French-Stil». An dieser Stelle
# steht im Deutschen fast immer ein Stil und fast nie eine Marke; die Ausnahme zu erkennen
# verlangt Weltwissen, kein Muster. Die Liste war also richtig — sie war nur zu kurz. Sie wird
# erweitert statt geöffnet, und wer sie pflegt, ergänzt einen Namen, wenn er auffällt.
MARKE_STIL = None
FIGUR_MARKE = re.compile(r'\bDoc\s?Martens?\b|\bDr\.?\s?Martens?\b|Mercedes[- ]?Benz|\bTesla\b|'
                         r'\bBMW\b|\bAudi\b|\bPorsche\b|\bFerrari\b|\bLamborghini\b|'
                         r'\bNike\b|\bJordan\b|\bYeezy\b|\bSupreme\b|\bBalenciaga\b|'
                         r'\bChanel\b|\bGucci\b|\bPrada\b|\bDior\b|Louis\s?Vuitton|'
                         r'\bHerm[èe]s\b|\bRolex\b|\bBarbie\b|\bVersace\b|\bBurberry\b|'
                         r'\bApple\b(?!\s*(?:Duft|Apfel))|\bSamsung\b(?=.{0,20}Stil)', re.I)

# ── Was die alten Muster strukturell verfehlt haben ───────────────────────────
# «…waffe» am Wortende: Selbstverteidigungswaffe, Elektroschockwaffe, Stichwaffe.
WAFFE_ENDE = re.compile(r'\w*waffe\b|Elektroschocker|Pfefferspray|Teleskopschlagstock|'
                        r'Reizgas|Tierabwehrspray', re.I)
# ⚠️ «für Zigarettenanzünder» ist die AUTO-STECKDOSE, kein Rauchzubehör. Der erste Entwurf
# hätte drei USB-Autoladegeräte aus dem Kanal genommen, weil sie in diese Buchse passen.
RAUCH2 = re.compile(r'Zigarrenanz[üu]nder|Tabakpfeife|Drehmaschine.{0,12}Zigarett|'
                    r'\bBlunt\b|Rolling\s?Paper|Wasserpfeifenkopf', re.I)
FUER_AUTOBUCHSE = re.compile(r'f[üu]r\s+Zigarettenanz[üu]nder|Autoladeger[äa]t|'
                             r'KFZ[- ]?Ladeger[äa]t|12\s?V[- ]?(?:Buchse|Stecker)', re.I)


def gql(q, v=None):
    with open("/tmp/_gk2.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gk2.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


# ⚠️ «für Apple Watch», «für Tesla Model 3», «kompatibel mit iPhone» sind
# KOMPATIBILITÄTSANGABEN und ausdrücklich erlaubt — dieselbe Regel, unter der «Hülle für
# Nintendo Switch» im Kanal bleiben darf. Ohne diese Ausnahme hätte der Lauf 42 Armbänder
# für die Apple Watch aus dem Feed genommen, also lauter einwandfreies Zubehör.
KOMPATIBEL = re.compile(r'(?:f[üu]r|kompatibel\s+mit|passend\s+f[üu]r|geeignet\s+f[üu]r)\s*'
                        r'(?:die|den|das)?\s*$', re.I)
ZUBEHOER_NOMEN = re.compile(r'Fussmatte|Fußmatte|Halterung|Halter\b|Ladeger[äa]t|H[üu]lle|'
                            r'Schutzh[üu]lle|Armband\b|Kabel\b|Adapter|Aufkleber|Anh[äa]nger|'
                            r'Sitzbezug|Lenkradbezug|Schl[üu]sselanh[äa]nger|Displayschutz|'
                            r'St[äa]nder|Dock|Etui\b|Panzerglas', re.I)
MODELLBEZEICHNUNG = re.compile(r'\bModel\s*[3SXY]\b|\bX[1-7]\b|\biPhone\b|AirPods|'
                               r'\bGalaxy\s?[SZ]?\d|\bWatch\s?(?:Series|SE|Ultra|\d)', re.I)


def markenname(titel):
    """Nur noch die geschlossene Liste — und nur, wenn der Name NICHT nach «für» steht."""
    m = FIGUR_MARKE.search(titel)
    if not m:
        return None
    if KOMPATIBEL.search(titel[:m.start()]):
        return None
    # Zubehör FÜR ein Marken-Gerät oder -Fahrzeug ist erlaubt, auch ohne das Wort «für»:
    # «Tesla Model 3/X Gummifussmatten», «BMW X5/X6 Kabelloses Ladegerät», «Magnethalterung
    # für iPhone, Apple Watch & AirPods». Verkauft wird die Matte, nicht der Wagen.
    if ZUBEHOER_NOMEN.search(titel) or MODELLBEZEICHNUNG.search(titel):
        return None
    return m.group(0)


def pruefen(p):
    t = p["title"]
    txt = t + " " + (p.get("descriptionHtml") or "")[:2500]
    tags = {x.lower() for x in (p.get("tags") or [])}

    if KAMERA.search(t) and VERSTECKT.search(txt) and not GEGENTEIL.search(t):
        return "versteckte-kamera", ""
    if TRACKER.search(t) and (PERSONENORTUNG.search(txt) or WANZE.search(txt)):
        return "personenortung", ""
    if ARZNEI.search(t) and EINNAHME.search(txt):
        return "arzneimittel", "draft"
    if WAFFE_ENDE.search(t):
        return "waffe", ""
    if RAUCH2.search(t) and not FUER_AUTOBUCHSE.search(t):
        return "rauchzubehoer", ""
    # Markenware von BigBuy trägt den Namen zu Recht — Grosshandel, kein Nachbau.
    # ⚠️ Der Lieferant wird an der SKU erkannt, nicht am Tag: der Tag heisst «bb-real», nicht
    # «bigbuy», und ein Tag-Test hätte den echten Puma-Ferrari-Pullover als Fälschung gemeldet.
    # Die SKU ist die verlässliche Spur, weil der Importer sie schreibt.
    skus = " ".join((v.get("sku") or "") for v in ((p.get("variants") or {}).get("nodes") or []))
    if not re.match(r'^\s*bb[-_]', skus, re.I):
        if markenname(t):
            return "fremde-marke-im-titel", "titel"
    return None


# Ein Titel, der nach dem Schnitt auf einer Präposition endet, ist eine Satzruine.
# ⚠️ TEUER GELERNT (Nachkontrolle 14.08.2026): Genau sechs solcher Ruinen standen tagelang
# kundensichtbar im Shop und im Google-Kanal — «Kissenbezug mit Quasten im -Stil»,
# «Rundhals-Spitzentop im -Stil», «Lenkradblende für -Benz», «TPU Silikon Schlüsselhülle
# für». Bei den beiden Autoteilen war damit die KOMPATIBILITÄTSANGABE weg: die Kundin
# konnte nicht mehr erkennen, für welches Fahrzeug das Teil passt.
RUINE = re.compile(r'(?:\b(?:f[üu]r|mit|von|im|in|aus|und|zu|passend)\s*$)|'
                   r'(?:\bim\s+[-–]\s*Stil\b)|(?:\s[-–]\s*$)|(?:\bf[üu]r\s+[-–])', re.I)


def titel_ohne_marke(t):
    neu = FIGUR_MARKE.sub("", t)
    neu = re.sub(r'\bim\s+[- ]?Stil\b', '', neu, flags=re.I)
    neu = re.sub(r'\s{2,}', ' ', neu).strip(" ·-–,")
    # Lieber den alten Titel behalten und den Fall melden, als eine Ruine zu veröffentlichen.
    if RUINE.search(neu) or len(neu) < 6:
        print(f"  ⚠️ Titel-Schnitt ergäbe eine Ruine, Titel unverändert gelassen: "
              f"«{t}» → «{neu}» — von Hand nachziehen", flush=True)
        return t
    return neu


def main():
    treffer = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or not p.get("g"):
            continue
        r = pruefen(p)
        if r:
            treffer.append((p, r[0], r[1]))

    nach = {}
    for p, grund, _ in treffer:
        nach.setdefault(grund, []).append(p)
    print(f"Zweite Runde — riskante Ware im Google-Kanal: {len(treffer)}", flush=True)
    for grund, ps in sorted(nach.items(), key=lambda x: -len(x[1])):
        print(f"\n── {grund}: {len(ps)}", flush=True)
        for p in ps[:10 if DRY else 4]:
            pr = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
            print(f"     CHF {pr:>6.2f}  {p['title'][:58]}", flush=True)
    if DRY or not treffer:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = draft = titel = 0
    for p, grund, zusatz in treffer:
        gid = p["id"]
        if gid in done:
            continue
        r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishableUnpublish(id:$id,'
                'input:$i){userErrors{message}}}', {"id": gid, "i": [{"publicationId": GOOGLE}]})
        if ((r.get("data") or {}).get("publishableUnpublish") or {}).get("userErrors"):
            continue
        n += 1
        if zusatz == "draft":
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "status": "DRAFT"}})
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": ["arzneimittel-pruefen"]})
            draft += 1
        elif zusatz == "titel":
            neu = titel_ohne_marke(p["title"])
            if len(neu) >= 12 and neu != p["title"]:
                gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                    {"i": {"id": gid, "title": neu}})
                titel += 1
        f.write(f"{gid}\t{grund}\t{p['title']}\n")
        f.flush()
        time.sleep(0.3)
    print(f"\nFERTIG: {n} aus dem Google-Kanal · {draft} gedraftet (Arzneimittel) · "
          f"{titel} Markenname aus dem Titel")


if __name__ == "__main__":
    main()
