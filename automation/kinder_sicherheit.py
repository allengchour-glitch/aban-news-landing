"""Setzt die gesetzlichen Warnhinweise bei Kinderspielzeug — und korrigiert falsche Altersgruppen.

DER BEFUND (12.08.2026): Von 1'817 aktiven kindergerichteten Produkten tragen **66 Spielwaren
mit bauartbedingten Kleinteilen keinen einzigen Warnhinweis** (Bausteine-Sets bis 321 Teile,
3D-Puzzles, Steckspiele, Perlen), 27 davon nicht einmal eine Altersangabe im Fliesstext.

Das schwerste Einzelrisiko sind **6 Magnetspielzeuge**, keines mit Hinweis. «Magnetische
Bausteine für Kids» (CHF 14.90) beschreibt im eigenen Text «kleine Partikel für feinmotorische
Übungen». Werden zwei Magnete verschluckt, ziehen sie sich durch die Darmwand hindurch an und
können sie durchtrennen — dafür schreibt EN 71-1 einen Warnhinweis zwingend vor. Das ist kein
Formfehler; daran sind Kinder gestorben.

DASS ES GEHT, BEWEIST DER EIGENE KATALOG: Die 21 BRUDER-Modelle tragen die vollständige
Warnung — «Achtung! Nicht für Kinder unter 36 Monaten geeignet. Erstickungsgefahr wegen
verschluckbarer Kleinteile» —, weil sie so im Fortura-Feed steht. Der Feed liefert den Text
also; der Importer wertet ihn nur bei 8 von 255 Fortura-Spielzeugen aus. Der Hinweis muss
nicht erfunden werden, er muss übernommen werden.

ZWEITER BEFUND: 319 Kinderprodukte tragen `age_group=adult` — «Kinder-Schutzhelm»,
«Velours-Decke für Baby», «Kinderrucksack Superleicht». Das ist im Google-Feed schlicht
falsch und sortiert Kinderware in Erwachsenen-Suchen. 532 tragen gar keine Altersgruppe.

⚠️ WAS NICHT ALS KINDERPRODUKT ZÄHLT: 158 Hunde- und Katzenspielzeuge tragen den Tag
`spielzeug`. Ein Kauspielzeug braucht keinen EN-71-Hinweis. Tierbedarf wird deshalb
ausdrücklich ausgenommen — ohne diese Ausnahme wäre fast jeder zehnte «Fund» ein Hund.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_kinder_sicherheit.txt"

# ⚠️ ENG FASSEN. Der erste Entwurf nahm den Tag `spielzeug` und das Wort «Plüsch» als Beleg
# für ein Kinderprodukt und kam auf 417 fehlende Warnhinweise. Im Probelauf standen darunter:
# «Plüsch-Kapuzenjacke», «Warme Plüsch-Handschuhe für Damen», «Cremefarbener Plüsch-Sofabezug»,
# «Plüsch-Haargummi», «Elastischer Plüsch Hockerbezug» — **Plüsch ist hier der STOFF**, nicht
# das Kuscheltier. Und der Tag `spielzeug` klebt auch auf einem Garten-Wassersprinkler und
# einer Aufbewahrungsbox. Ein Warnhinweis «Nicht für Kinder unter 36 Monaten» auf einer
# Damenjacke macht den Shop unglaubwürdig und den echten Hinweis wertlos.
KIND_TAG = {"kinder", "baby-kids", "kinderschuhe", "kinderkostuem", "baby"}
KIND_TYP = {"Kinderschuhe", "Spielzeug & Spiele", "Kinder"}
KIND_TITEL = re.compile(r'\b(?:Kinder|Baby|Kleinkind|Kids)\b', re.I)
# ⚠️ 28.08.2026: «Baby» im Titel ist oft KEINE Altersangabe. Das Muster `\bBaby` (ohne Grenze am
# ENDE) hat «Babydoll-Kleid» — Damen-Dessous, Gr. S–2XL — und «Babyrosa» (eine FARBE) als
# Neugeborenen-Ware gemeldet; mit Grenze am Ende bleiben «Bush Baby» (Tierart Galago),
# «Hello Baby» (Ballon-Aufdruck) und «Baby Schriftzug-Print» (Aufdruck auf Damenware) übrig.
# Dieselbe Substring-Falle wie «IPL» in «L-IPL-iner». Solche Titel werden GAR NICHT bewertet.
BABY_FALSCHFREUND = re.compile(
    r'Babydoll|Babyrosa|Baby\s*-?\s*(?:Pink|Blau|Blue|Rosa)|Bush\s+Baby|Hello\s+Baby|'
    r'Baby\s+Schriftzug|Baby\s+Print', re.I)
BABY_ECHT = re.compile(r'\b(?:Baby\w*|Neugeboren\w*|S[äa]ugling\w*)\b', re.I)
# Tierbedarf trägt dieselben Tags und ist kein Kinderprodukt.
TIER = re.compile(r'\b(?:Hunde?|Katzen?|Haustier|Pet|Kauspielzeug|Tierspielzeug|Vogel|Nager)\b',
                  re.I)
# Kleidung und Heimtextil aus Plüsch — nie ein Spielzeug.
STOFF = re.compile(r'Jacke|Mantel|Handschuh|Pullover|Shirt|Hose|M[üu]tze|Schal|Pantoffel|'
                   r'Hausschuh|Socke|Bezug|[ÜU]berwurf|Decke|Teppich|Kissen|Sofa|Hocker|'
                   r'Sessel|Haargummi|Scrunchie|Tasche|Rucksack|Vorhang|Bademantel', re.I)

# Bauarten mit verschluckbaren Kleinteilen.
KLEINTEILE = re.compile(r'Baustein|Bausatz|Bauklotz|Klemmbaustein|\d{2,}[- ]?teilig|'
                        r'\bPuzzle\b|Steckspiel|Perlen|Mosaik|Modellbau|Konstruktions|'
                        r'Sortierspiel|Steckwürfel|Legespiel', re.I)
# ⚠️ «Magnet» allein genügt nicht. Im Probelauf trafen ein «Kinder Velohelm mit MagnetBRILLE»
# (magnetisch angesetzte Visierscheibe) und eine «Kinder-Zahnbürste» (Magnethalterung/Ladung).
# Gefährlich sind lose Magnete zum SPIELEN, nicht jedes magnetische Bauteil.
MAGNET = re.compile(r'Magnet\w*\s*-?\s*(?:Baustein|Bauklotz|Bausteine|W[üu]rfel|Kugel|Stab|'
                    r'Bl[öo]cke|Puzzle|Spiel)|'
                    r'(?:Baustein|Bauklotz|Bausteine|Bl[öo]cke)\w*\s+magnetisch|'
                    r'\bmagnetische[rs]?\s+(?:Baustein|Bauklotz|Bausteine|Spielzeug|Bl[öo]cke)',
                    re.I)
# Ein Kuscheltier heisst so — oder «Plüsch» steht direkt vor einem Tier.
PLUESCH = re.compile(r'Pl[üu]schtier|Kuscheltier|Stofftier|'
                     r'Pl[üu]sch[- ]?(?:hund|b[äa]r|teddy|hase|katze|ente|koala|wolf|elefant|'
                     r'einhorn|affe|l[öo]we|tiger|alligator|dino|pinguin|fuchs|schaf|robbe|'
                     r'sennenhund|maus|frosch|giraffe|panda|delfin|eule)', re.I)
# Steht schon ein Hinweis drin, wird nichts angefügt.
HINWEIS_DA = re.compile(r'nicht f[üu]r Kinder unter|Erstickungsgefahr|Achtung!|'
                        r'unter 36 Monaten|verschluckbare', re.I)

WARNUNG_KLEIN = (
    '<p class="ls-warnhinweis" style="background:#fff6f6;border:1px solid #f0d4d4;'
    'border-radius:10px;padding:10px 14px;font-size:13px;margin:14px 0 0">'
    '⚠️ <strong>Achtung!</strong> Nicht für Kinder unter 36 Monaten geeignet. '
    'Erstickungsgefahr wegen verschluckbarer Kleinteile. Altersempfehlung: ab 3 Jahren.</p>')
WARNUNG_MAGNET = (
    '<p class="ls-warnhinweis" style="background:#fff6f6;border:1px solid #f0d4d4;'
    'border-radius:10px;padding:10px 14px;font-size:13px;margin:14px 0 0">'
    '⚠️ <strong>Achtung!</strong> Nicht für Kinder unter 36 Monaten geeignet. '
    'Erstickungsgefahr wegen verschluckbarer Kleinteile. '
    '<strong>Enthält Magnete:</strong> Werden zwei oder mehr Magnete verschluckt, können sie '
    'sich im Körper gegenseitig anziehen und schwere innere Verletzungen verursachen. '
    'In diesem Fall sofort ärztliche Hilfe suchen. Altersempfehlung: ab 3 Jahren.</p>')


def gql(q, v=None):
    with open("/tmp/_ks.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ks.json"], capture_output=True, text=True)
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


def ist_kind(p):
    t = p["title"]
    if TIER.search(t):
        return False
    tags = {x.lower() for x in (p.get("tags") or [])}
    if tags & {"haustier", "pet", "hund", "katze"}:
        return False
    if STOFF.search(t) and not KIND_TITEL.search(t):
        return False            # Plüschjacke, Sofabezug, Haargummi — Stoff, kein Spielzeug
    return bool(tags & KIND_TAG or (p.get("productType") or "") in KIND_TYP
                or KIND_TITEL.search(t))


def main():
    warnen, alter = [], []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or not ist_kind(p):
            continue
        t, html = p["title"], (p.get("descriptionHtml") or "")
        mf = {m["key"]: m["value"] for m in ((p.get("mf") or {}).get("nodes") or [])}

        if not HINWEIS_DA.search(html):
            if MAGNET.search(t) or MAGNET.search(html[:1200]):
                warnen.append((p["id"], t, html, WARNUNG_MAGNET, "Magnete"))
            elif KLEINTEILE.search(t + html[:1200]) or PLUESCH.search(t):
                warnen.append((p["id"], t, html, WARNUNG_KLEIN, "Kleinteile"))

        # ⚠️ age_group NUR anfassen, wo die Ware zweifelsfrei für Kinder ist. Der Tag
        # `spielzeug` allein reicht nicht: er klebt auch auf einem Garten-Wassersprinkler und
        # einer Aufbewahrungsbox, und «kids» wäre dort genauso falsch wie das heutige «adult».
        eindeutig = (KIND_TITEL.search(t)
                     or (p.get("productType") or "") in {"Kinderschuhe", "Kinder"}
                     or {"kinderschuhe", "baby-kids", "kinderkostuem"}
                     & {x.lower() for x in (p.get("tags") or [])})
        if not eindeutig:
            continue
        if BABY_FALSCHFREUND.search(t):
            continue                       # «Baby» ist hier Farbe, Tierart oder Aufdruck
        ag = mf.get("age_group")
        # ⚠️ KEIN `newborn` mehr aus einem blossen Titelwort. Google definiert newborn als
        # «bis 3 Monate»; Lauflernschuhe («geeignet für die ersten Schritte») und ein Kostüm
        # in Gr. 104 sind das nie. Ohne Grössenbeleg ist `toddler` (1–5 J.) die belegbare
        # Untergrenze — die feine Zuordnung aus der Grössenleiter macht
        # automation/newborn_altersgruppe.py.
        neu_ag = "toddler" if BABY_ECHT.search(t) else "kids"
        if ag != neu_ag and ag not in ("toddler", "infant", "newborn"):
            alter.append((p["id"], t, ag, neu_ag))

    print(f"Warnhinweis fehlt: {len(warnen)}  |  age_group falsch/fehlend: {len(alter)}",
          flush=True)
    for _, t, _, _, art in warnen[:14 if DRY else 5]:
        print(f"   [{art:<10}] {t[:58]}", flush=True)
    print("   age_group:", flush=True)
    for _, t, ag, neu in alter[:6 if DRY else 3]:
        print(f"     {str(ag):<8} → {neu:<8} {t[:48]}", flush=True)
    if DRY:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n1 = 0
    for gid, t, html, warnung, art in warnen:
        if gid + "\tw" in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "descriptionHtml": html + warnung}})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        n1 += 1
        f.write(f"{gid}\tw\t{art}\t{t}\n")
        if n1 % 50 == 0:
            f.flush()
            print(f"  … {n1}/{len(warnen)}", flush=True)
        time.sleep(0.3)

    n2 = 0
    stapel = []
    for gid, t, _, neu in alter:
        if gid + "\ta" in done:
            continue
        stapel.append((gid, neu))
        if len(stapel) == 25:                 # metafieldsSet: harte Grenze von 25
            n2 += ag_schreiben(stapel, f)
            stapel = []
    if stapel:
        n2 += ag_schreiben(stapel, f)
    f.flush()
    print(f"FERTIG: {n1} Warnhinweise gesetzt, {n2} Altersgruppen korrigiert")


def ag_schreiben(stapel, f):
    felder = [{"ownerId": gid, "namespace": "mm-google-shopping", "key": "age_group",
               "type": "single_line_text_field", "value": neu} for gid, neu in stapel]
    r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
            '{userErrors{message}}}', {"m": felder})
    if ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors"):
        return 0
    for gid, neu in stapel:
        f.write(f"{gid}\ta\t{neu}\n")
    f.flush()
    time.sleep(0.4)
    return len(stapel)


if __name__ == "__main__":
    main()
