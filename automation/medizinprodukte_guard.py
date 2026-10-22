"""Nimmt Medizingeräte aus dem Verkauf und streicht unhaltbare Gesundheitsversprechen.

GEFUNDEN ÜBER DIE SHOP-SUCHE (11.08.2026): Wer im Shop «Ventilator» eingibt — im August, also
auf der Suche nach einem Lüfter —, bekommt als ersten Treffer ein «Ventilator Nasenpolster-Set»
für CHF 45.90. Die Beschreibung verrät, was es wirklich ist: Zubehör für eine **Beatmungsmaske**.
Im Englischen heisst das Gerät «ventilator», im Deutschen «Beatmungsgerät» — die Übersetzung
wurde wörtlich übernommen. Die Spur führte zu einer ganzen Warengruppe.

ZWEI GETRENNTE PROBLEME:

 1. VIERZEHN ECHTE MEDIZINGERÄTE stehen aktiv im Shop — acht **Hörgeräte** (CHF 40–79), ein
    Hörtest-Headset (CHF 200.90), ein **Fetusstethoskop**, zwei Atemtrainer/Notfallmasken, ein
    Ultraschall-Vernebler, das CPAP-Zubehör. In der Schweiz sind das Medizinprodukte nach MepV:
    Sie brauchen eine Konformitätsbewertung, und Hörgeräte werden üblicherweise angepasst, nicht
    im Versand verkauft. Ein Modehaus im Dropshipping kann das nicht leisten. Schlimmer als das
    rechtliche Risiko ist das tatsächliche: Wer sich als Seniorin auf ein Hörgerät für CHF 40
    verlässt oder als Schwangere auf ein Fetusstethoskop, kann echten Schaden nehmen.
    → auf DRAFT, mit Tag `medizinprodukt-pruefen`. Nicht gelöscht: mit Konformitätsunterlagen
      lassen sie sich jederzeit wieder freischalten.

 2. EIN ARMBAND VERSPRICHT BLUTZUCKERMESSUNG. «Smart Armband mit EKG, Blutzucker- &
    Körpertemperaturmessung», CHF 59.90. Kein Konsumenten-Armband misst Blutzucker durch die
    Haut — die Technik existiert nicht als Serienprodukt. Wer als Diabetikerin darauf vertraut,
    riskiert eine Unterzuckerung. Die Behauptung wird aus Titel und Text gestrichen; die übrigen
    Funktionen bleiben, das Produkt bleibt im Verkauf.

⚠️ ZWEI FEHLTREFFER, die NICHT angefasst werden — beide beim Nachlesen entdeckt:
    «10er Pack Silberoxid-Knopfzellen» nennt Blutzuckermessgeräte als Einsatzzweck der Batterie.
    «Saure Zungen» führt Glukosesirup in der Zutatenliste.
   Beides ist korrekt und hat mit einem Messversprechen nichts zu tun. Deshalb greift das Muster
   nur, wenn das Produkt selbst ein Armband, eine Uhr oder ein Ring ist.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, sys, time

try:
    TOK = open("/tmp/cj_shop_token.txt").read().strip()
except OSError:   # 22.10.2026: --selbsttest braucht kein Token; main() bricht ohne Token laut ab
    TOK = ""
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_medizinprodukte.txt"

# ⚠️ NACHTRAG 12.08.2026 — die Nachkontrolle fand NEUN weitere aktive Geräte. Alle waren
# gestern schon da; das Muster hat sie nicht erkannt, weil sie ANDERS HEISSEN. Der
# «Hörverstärker für Senioren» (CHF 78.90) ist dasselbe Gerät wie die acht gedrafteten
# Hörgeräte, nur mit einem Wort davor, das nicht auf der Liste stand. Lehre: bei
# Medizinprodukten nach der FUNKTION suchen, nicht nach der Produktbezeichnung des Verkäufers.
GERAET = re.compile(r'H[öo]rger[äa]t|H[öo]rverst[äa]rker|H[öo]rtest|Fetusstethoskop|'
                    r'Atemtrainer|Atmungstrainer|Lungentrainer|Spirometer|Lungenfunktion\w*|Notfallmaske|Vernebler|Inhalator|Ventilator[- ]Nasen|CPAP|'
                    r'(?:Stirn|Fieber|Ohr)thermometer|Thermometer.{0,20}kontaktlos|'
                    r'kontaktlos.{0,20}Thermometer|Milchpumpe|Entlastungsschuh|'
                    r'Vorfuss\w*schuh|Zahnsteinentferner|Zahnstein\w*Entferner|'
                    r'Lichtwellen[- ]?Therapie|Lasertherapie\w*|Blutbestrahlung', re.I)
# ⚠️ Zubehör ist kein Gerät. Das «Reinigungsset für digitale Hörgeräte» trägt das Wort
# «Hörgerät» im Titel und ist doch nur eine Bürste mit Tuch.
ZUBEHOER = re.compile(r'Reinigungs(?:set|-?Set|b[üu]rste)|Pflegeset|Ersatz(?:filter|polster)|'
                      r'Aufbewahrungsbox|Etui\b|'
                      # 22.10.2026: «Ultraschall-Vernebler» im Aroma-Diffusor/Luftbefeuchter ist ein Wohnartikel, kein Inhalationsgerät (3 Fehlalarme im Trockenlauf)
                      r'Diffusor|Diffuser|Aroma|Luftbefeuchter|Duftlampe|Raumduft|[ÖO]l-?Vernebler|Nebel-?Maschine|Kunstnebel|'
                      r'Scheinwerfer|Auto-?Lack|Politur|Aufbereitung|'
                      # 22.10.2026 (Prüfung): ein Ventilator/Kühler/Lüfter MIT Vernebler (Sprühnebel-Kühlung) ist kein Inhalationsgerät
                      r'(?:Ventilator|K[üu]hler|L[üu]fter|Klimager[äa]t)\b.{0,40}Vernebler|Vernebler.{0,40}(?:Ventilator|K[üu]hler|L[üu]fter)', re.I)   # «Scheinwerfer-Vernebler-Becher» = Autopflege, 22.10.


def ist_geraet(titel):
    """Rein: ist der Titel ein Medizingerät (Funktion), kein Zubehör/Wohnartikel?"""
    return bool(GERAET.search(titel)) and not ZUBEHOER.search(titel)


# ⚠️ Eine Selbstaussage im Text («dies ist ein medizinisches Gerät», «FDA-zertifiziert») war im
# ersten Entwurf ein Draft-Grund. Der Probelauf zeigte, warum das nicht trägt:
#   • Ein Massagegerät schrieb «KEIN medizinisches Gerät – dient dem Wohlbefinden» — also genau
#     den richtigen Hinweis. Das Muster las die Verneinung als Geständnis.
#   • Eine Trinkwasserpumpe nannte «lebensmittelechte Materialien, von der US FDA zertifiziert».
#     Das ist die Lebensmittelbehörde in ihrer Lebensmittelrolle, kein Medizinproduktesiegel.
# Übrig blieben zwei echte Fälle (LED-Maske, Photonen-Gerät) — und bei denen ist nicht das
# Produkt das Problem, sondern der Satz. Die Behauptung wird deshalb in
# `heilversprechen.py` gestrichen; gedraftet wird hier nur, was der FUNKTION nach ein
# Medizingerät ist.
# Nur Tragbares zählt als Kandidat für das Blutzucker-Versprechen.
TRAGBAR = re.compile(r'armband|smartwatch|uhr\b|watch|\bring\b|tracker|band\b', re.I)
ZUCKER_TITEL = re.compile(r'\s*[,·&-]?\s*Blutzucker\s*-?\s*(?:und|&|,)?\s*', re.I)


def gql(q, v=None):
    with open("/tmp/_mp.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mp.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
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


def titel_ohne_zucker(t):
    # «Smart Armband mit EKG, Blutzucker- & Körpertemperaturmessung»
    #  → «Smart Armband mit EKG & Körpertemperaturmessung»
    neu = re.sub(r'Blutzucker\s*-?\s*(?:,|und|&)?\s*', '', t, flags=re.I)
    neu = re.sub(r'\s*,\s*&', ' &', neu)
    neu = re.sub(r'\s{2,}', ' ', neu).strip(" ,-–&")
    # Aus «EKG, Blutzucker- & Körpertemperatur» wird sonst «EKG, Körpertemperatur» — das Komma
    # stand für eine dreigliedrige Aufzählung, die jetzt zweigliedrig ist. Bleibt genau ein
    # Komma und kein «&» übrig, gehört dort ein «&» hin.
    if neu.count(",") == 1 and "&" not in neu and " und " not in neu:
        neu = neu.replace(",", " &", 1)
        neu = re.sub(r'\s{2,}', ' ', neu)
    return neu


def text_ohne_zucker(html):
    neu = re.sub(r'Blutzucker\s*-?\s*(?:,|und|&)?\s*', '', html, flags=re.I)
    neu = re.sub(r'<li>\s*(?:und|&|,)?\s*</li>', '', neu)
    return re.sub(r'\s{2,}', ' ', neu)


def main():
    if not TOK:
        raise SystemExit("MEDIZINPRODUKTE-WÄCHTER: kein Shopify-Token (/tmp/cj_shop_token.txt) — nichts geschrieben")
    geraete, zucker = [], []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        t = p["title"]
        html = p.get("descriptionHtml") or ""
        if ist_geraet(t):
            geraete.append((p["id"], t, float(p["priceRangeV2"]["minVariantPrice"]["amount"])))
            continue
        if not TRAGBAR.search(t):
            continue                     # Batterien und Bonbons bleiben aussen vor
        if re.search(r'Blutzucker', t + html[:1500], re.I):
            zucker.append((p["id"], t, titel_ohne_zucker(t), html))

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    # 22.10.2026: Sicherung gegen ein zu weit geratenes Muster — mehr als MAX_TREFFER NEUE Treffer (nicht schon im Ledger) in EINEM Lauf sind ein Muster-Fehler, kein
    # Warensturz. (Die erste Fassung zählte auch Treffer, die das Ledger längst kannte, und schlug dann bei einem veralteten Export grundlos an.)
    neue = [g for g in geraete if g[0] not in done]
    if len(neue) > int(os.environ.get("MAX_TREFFER", "15")):
        print(f"⚠️ MEDIZINPRODUKTE-WÄCHTER: {len(neue)} neue Treffer (> MAX_TREFFER) — nichts geschrieben, Muster prüfen", flush=True)
        raise SystemExit(2)
    print(f"Medizingeräte → DRAFT: {len(geraete)}", flush=True)
    for _, t, pr in geraete:
        print(f"   CHF {pr:>6.2f}  {t[:56]}", flush=True)
    print(f"\nBlutzucker-Versprechen streichen: {len(zucker)}", flush=True)
    for _, alt, neu, _ in zucker:
        print(f"   «{alt[:54]}»\n      → «{neu[:54]}»", flush=True)
    if DRY:
        return

    f = open(LEDGER, "a")
    n1 = n2 = 0
    for gid, t, _ in geraete:
        if gid in done:
            continue
        # 22.10.2026: userErrors prüfen, BEVOR das Ledger quittiert (sonst bleibt ein nicht gedrafteter Treffer für immer «erledigt»)
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{status} userErrors{message}}}',
                {"i": {"id": gid, "status": "DRAFT"}})
        pu = (r.get("data") or {}).get("productUpdate") or {}
        if pu.get("userErrors") or (pu.get("product") or {}).get("status") != "DRAFT":
            print(f"  ⚠️ Draften fehlgeschlagen: {t[:40]}: {(pu.get('userErrors') or [{'message': 'Status nicht DRAFT'}])[0]['message'][:60]}", flush=True)
            continue
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {"id": gid, "t": ["medizinprodukt-pruefen"]})
        n1 += 1
        f.write(f"{gid}\tdraft-medizinprodukt\t{t}\n")
        time.sleep(0.3)
    for gid, alt, neu, html in zucker:
        if gid in done:
            continue
        eingabe = {"id": gid, "descriptionHtml": text_ohne_zucker(html)}
        if neu != alt and len(neu) >= 12:
            eingabe["title"] = neu
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": eingabe})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {alt[:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n2 += 1
        f.write(f"{gid}\tblutzucker-gestrichen\t{neu}\n")
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n1} Medizingeräte gedraftet, {n2} Blutzucker-Versprechen gestrichen")


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    ECHT = ["Hörgerät für Senioren", "Hörverstärker mit Akku", "Fetusstethoskop", "Ventilator Nasenpolster-Set", "Infrarot Stirnthermometer", "Ultraschall-Vernebler für Kinder",
            "Atemtrainer für Lungen", "Elektrische Milchpumpe"]
    KEIN = ["Reinigungsset für digitale Hörgeräte", "Aroma-Diffusor Ultraschall-Vernebler", "Scheinwerfer-Vernebler-Becher", "Luftbefeuchter mit Vernebler",
            "Tisch-Ventilator mit Vernebler und Wasserspray", "Mini-Kühler mit Vernebler für den Sommer", "Vernebler-Lüfter für Terrasse", "Silberoxid-Knopfzellen 10er Pack",
            "Smartwatch mit Pulsmesser"]

    def faelle(m):
        f = []
        for t in ECHT:
            if not m.ist_geraet(t):
                f.append(f"A «{t}» muss ein Medizingerät sein")
        for t in KEIN:
            if m.ist_geraet(t):
                f.append(f"B «{t}» darf kein Medizingerät sein")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Ventilator mit Vernebler zählt als Gerät", "(?:Ventilator|K[üu]hler|L[üu]fter|Klimager[äa]t)\\b.{0,40}Vernebler|Vernebler.{0,40}(?:Ventilator|K[üu]hler|L[üu]fter)", "ZZZZ"),
           ("Zubehör egal", "and not ZUBEHOER.search(titel)", ""),
           ("Diffusor zählt als Gerät", "Diffusor|Diffuser|Aroma|Luftbefeuchter|", "")]
    erkannt = 0
    for name, alt, neu in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu, 1), "mutant", "exec"), m.__dict__)
        if faelle(m):
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: {len(ECHT) + len(KEIN)} Titel, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    main()
