"""Schreibt die Stückzahl in den Titel, wo ein Bündel wie ein Einzelstück aussieht.

DIE HAUSREGEL (Betreiber, 26.07.2026): «Multipack-/Set-Produkte MÜSSEN die Stückzahl im Titel
tragen — sonst fragen Leute, warum ein Ballon so teuer ist.» Damals wurde sie für 15
Luftballon-Produkte umgesetzt. Die Nachkontrolle der Startseiten-Reihe zeigt, dass sie
weiterhin gebrochen wird:

    «Seife Schraubenschlüssel»          CHF 19.90 — «Verkauf in Bündeln zu 4 Stück»
    «Umhängetasche transparent rosa»    CHF 22.00 — «Verkauf in Bündeln zu 4 Stück»
    «Windlicht aus Glas»                CHF 22.50 — «Lieferumfang: 3 Stück»
    «Badeset in Werkzeugtasche»         CHF 31.90 — «Verkauf in Bündeln zu 2 Stück»

Auf einer Produktkarte steht nur Titel und Preis. Wer «Seife Schraubenschlüssel · CHF 19.90»
liest, rechnet mit EINER Seife und findet den Preis unverschämt — dabei sind es vier, und
das Angebot ist gut. Die Zahl im Titel dreht denselben Preis von abschreckend auf attraktiv.

⚠️ «Lieferumfang: 1 Stück» ist die häufigste Angabe im Katalog und bedeutet das Gegenteil —
ein Einzelstück. Nur Mengen ab 2 zählen. Und der Titel darf die Zahl nicht schon tragen:
«Luftballons · 100 Stück» ist fertig, «3er-Set Handtücher» ebenfalls.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_multipack_titel.txt"

# ⚠️ NUR «Stück», NICHT «Nx». Der Probelauf fand «Superhelle Laser-Taschenlampe —
# Lieferumfang: 2x 26650» und hätte daraus «Taschenlampe · 2 Stück» gemacht. Die 2x sind
# die beigelegten AKKUS. Bei «Nx» folgt fast immer das Zubehör, bei «N Stück» das Produkt;
# der Unterschied kostet hier eine falsche Mengenangabe im Titel, und eine falsche Menge ist
# schlimmer als gar keine.
MENGE = re.compile(r'(?:Verkauf\s+in\s+B[üu]ndeln\s+zu|Lieferumfang\s*:?|Beutel\s+à|Set\s+à|'
                   r'Packung\s+(?:mit|à)|Inhalt\s*:?)\s*(\d{1,4})\s*(?:St[üu]ck|Stk)\b', re.I)
# ⚠️ 23.08.2026 — ZWEI WEITERE KLASSEN aus dem Katalog-Audit §1.8.
# (a) «Dose à N Stück» und «Lieferumfang: N Sets» — die Reparatur vom 26.07. kannte nur
#     «Beutel à». Der wertvollste Fall ist ein Besteckset mit «Lieferumfang: 50 Sets»:
#     als «· 50 Sets» schreiben, NICHT «50 Stück» — das wären 200 Teile.
# (b) «N-teilig» bei Produkten, die sich im Titel «Set» nennen, ohne die Teilezahl zu
#     nennen. ⚠️ NUR, wenn im ganzen Text GENAU EINE Teilezahl steht. Bei 19 von 64
#     Kandidaten ist sie eine Auswahl («4-, 6-, 8- oder 14-teilig») oder ein Bauteil
#     («60-teiliges Schraubendreher-Set INNERHALB eines Reparatur-Sets») — eine Titelzahl
#     wäre dort eine Falschaussage im Google-Feed.
DOSE = re.compile(r'(?:Dose|Box|Glas|Eimer|Karton)\s+à\s*(\d{1,4})\s*(?:St[üu]ck|Stk)\b', re.I)
SETS = re.compile(r'Lieferumfang\s*:?\s*(\d{1,4})\s*Sets?\b', re.I)
TEILIG = re.compile(r'(\d{1,3})\s*[- ]?teilig', re.I)
# ⚠️ HARTER STOPP. Zwei CH-Lager-Artikel tragen «Lieferumfang: 1 Stück» UND «📦 Verkauf in
# Bündeln zu 10 Stück» — Letzteres ist eine Fortura-Grosshandelsnotiz zur Gebindegrösse,
# die Bilder zeigen EINEN Stab. Heute rettet uns nur die Reihenfolge im Text (der
# Lieferumfang steht zufällig zuerst). Wer «· 10 Stück» schreibt, verspricht das Zehnfache.
EINZELSTUECK = re.compile(r'Lieferumfang\s*:?\s*1\s*(?:St[üu]ck|Stk)\b', re.I)
IST_SET = re.compile(r'\bSets?\b', re.I)

# Trägt der Titel die Menge schon, ist nichts zu tun.
# ⚠️ 23.08.2026 erweitert. Der Probelauf wollte «… – 196 Teile, Sportwagen» zu
# «· 196-teilig» ergaenzen und «…, 100 Stk.» zu «· 100 Stück» — die Zahl stand jeweils
# schon da, nur in einer Schreibweise, die dieses Muster nicht kannte. Eine doppelte
# Mengenangabe im Titel ist schlimmer als keine.
SCHON_DA = re.compile(r'·\s*\d+\s*St|\d+\s*St[üu]ck|\d+\s*Stk\b|\d+[- ]?teilig|'
                      r'\d+\s*Teile\b|\d+\s*[- ]?in[- ]?1\b|\d+\s*Sets?\b|'
                      r'\d+er[- ]?(?:Set|Pack|Packung)|'
                      r'\bSet\s+à\s*\d+|\(\s*\d+\s*(?:St|x)\b', re.I)
# ⚠️ «Ballonhose», «Ballonärmel» und «Weinglas» sind Fashion- und Glaswörter, keine Mengen —
# an genau dieser Verwechslung hing der Lauf vom 26.07. Hier wird ohnehin nur der
# Beschreibungstext ausgewertet, aber die Zahl muss plausibel sein.
def plausibel(n):
    return 2 <= n <= 500


def norm(w):
    return (w.lower().replace("ä", "a").replace("ö", "o").replace("ü", "u")
            .replace("ß", "ss"))


def teilezahl(html, titel):
    """Teilezahl NUR, wenn sie diesem Produkt gehört und eindeutig ist.

    Zwei Fehlgriffe des Probelaufs, beide echt und beide teuer:
    · «36-, 38-, 39- oder 41-teiliges Set» — eine AUSWAHL. Das Muster findet nur die 41
      (nur dort steht «teilig»), die Eindeutigkeitsprüfung sah also einen sauberen Fall.
      Erkannt wird die Aufzählung deshalb an der Form «N-, N…» VOR dem Treffer.
    · «Das 60-teilige Schraubendreher-Set» in einem «Reparatur-Set für Elektronik» — die
      Zahl gehört einem BAUTEIL. Deshalb muss auf «N-teilig» ein Wort folgen, das auch im
      Titel steht; «Handtuchhalter-Set» und «Boston Shaker Set» bestehen das, «Schrauben-
      dreher-Set» nicht.
    """
    titelworte = {norm(w) for w in re.findall(r'[A-Za-zÄÖÜäöüß]{5,}', titel)}
    treffer = set()
    for m in TEILIG.finditer(html):
        davor = html[max(0, m.start() - 40):m.start()]
        if re.search(r'\d+\s*[-–]\s*,|\d+\s*[-–]\s*(?:oder|bis)\b', davor):
            return None                       # Auswahl, keine feste Menge
        danach = html[m.end():m.end() + 48]
        if not any(norm(w) in titelworte
                   for w in re.findall(r'[A-Za-zÄÖÜäöüß]{5,}', danach)):
            continue                          # gehoert einem Bauteil, nicht dem Produkt
        treffer.add(int(m.group(1)))
    if len(treffer) != 1:
        return None
    z = treffer.pop()
    return z if 2 <= z <= 200 else None


def gql(q, v=None):
    with open("/tmp/_mp2.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mp2.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def main():
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        # Ein Bulk-Export mischt Produkt-, Varianten- und Publikationszeilen. Nur die
        # Produktzeilen tragen `status` — alles andere wird uebersprungen.
        if p.get("status") != "ACTIVE" or "title" not in p:
            continue
        t = p["title"]
        # ⚠️ Der frische Export trägt das Feld `description`, der alte `descriptionHtml`.
        # Wer nur eines liest, bekommt bei der falschen Quelle lautlos «0 Kandidaten».
        html = re.sub(r'<[^>]+>', ' ',
                      p.get("descriptionHtml") or p.get("description") or "")
        if EINZELSTUECK.search(html):
            continue                          # Einzelstueck — jede Buendelzahl ist Gebinde
        n = einheit = None
        # ⚠️ «Sets» ZUERST. Das Besteckset sagt «Lieferumfang: 50 Sets📦 Verkauf in Bündeln
        # zu 50 Stück» — greift das Stück-Muster zuerst, entsteht «· 50 Stück», und das
        # sind 200 Teile. Die genauere Einheit hat Vorrang vor der allgemeineren.
        if SETS.search(html):
            n, einheit = int(SETS.search(html).group(1)), "Sets"
        elif MENGE.search(html) or DOSE.search(html):
            m = MENGE.search(html) or DOSE.search(html)
            n, einheit = int(m.group(1)), "Stück"
        elif IST_SET.search(t):
            n, einheit = teilezahl(html, t), None
            if n:
                einheit = "teilig"
        if n is None or not plausibel(n):
            continue
        # ⚠️ SCHON_DA gilt NICHT fuer «Sets». Das «Besteckset aus Holz, 4-teilig» wurde
        # dadurch uebersprungen — die 4 sind die Teile JE Set, geliefert werden 50 Sets
        # (also 200 Teile). Eine vorhandene Zahl anderer Bedeutung ist keine Mengenangabe.
        if einheit != "Sets" and SCHON_DA.search(t):
            continue
        # ⚠️ Universelle Wache gegen die doppelte Angabe: Steht die ZAHL schon irgendwo im
        # Titel, ist die Menge dort bereits ausgedrueckt — «24er Make-up Pinsel-Set»,
        # «38-in-1 Schraubenzieher-Set», «… – 196 Teile». Jede Schreibweise einzeln ins
        # Muster zu schreiben, hat im Probelauf dreimal nicht gereicht.
        if re.search(r'(?<!\d)' + str(n) + r'(?!\d)', t):
            continue
        # Bei kleinen Sets zaehlt der Titel die Teile oft schon auf: «Herren-Set «Costa» ·
        # Kapuzen-Shirt + Jogger», «Schmuck-Set «Trio» · 925 Silber (Kette · Ohrringe ·
        # Armband)». Ein «· 2-teilig» dahinter erklaert nichts mehr und macht den Titel nur
        # laenger — die Hausregel zielt auf Buendel, die wie EIN Stueck AUSSEHEN.
        if einheit == "teilig" and n <= 4 and re.search(r'[+&(]', t):
            continue
        neu = f"{t} · {n}-teilig" if einheit == "teilig" else f"{t} · {n} {einheit}"
        if len(neu) > 255:
            continue
        aufgaben.append((p["id"], t, neu, n,
                         float(p["priceRangeV2"]["minVariantPrice"]["amount"])))

    print(f"Bündel ohne Stückzahl im Titel: {len(aufgaben)}", flush=True)
    for _, t, neu, n, preis in sorted(aufgaben, key=lambda x: -x[3])[:16 if DRY else 6]:
        print(f"   CHF {preis:>6.2f}  {t[:44]:<46} → «{neu[-24:]}»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    z = 0
    for gid, t, neu, n, _ in aufgaben:
        if gid in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "title": neu}})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        z += 1
        f.write(f"{gid}\t{n}\t{neu}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {z} Titel mit Stückzahl versehen")


if __name__ == "__main__":
    main()
