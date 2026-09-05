"""Benennt Optionen um, die «Farbe» heissen, aber keine Farbe enthalten.

DER BEFUND (12.08.2026): 95 aktive Produkte haben in der Auswahl «Farbe» Werte wie

    «Infrared Obstacle Avoidance-Single Electric Version-White»   (57 Zeichen)
    «Red Monolever Remote Control-1 Set Of Batteries»
    «5inch-Laser version-White light And ber lampshade»
    «White Suit 8 To9mm-With Metallic Belt Boxes»

CJ presst dort mehrere Merkmale — Ausstattung, Grösse, Zubehör, Farbe — mit Bindestrichen in
EIN Feld. Alle 95 stehen live im Shop und im Google-Kanal.

WARUM NICHT GEKÜRZT WIRD: Der naheliegende Eingriff wäre, den Wert auf die Farbe
einzudampfen. Das zerstört aber die Unterscheidung, die der Kunde treffen MUSS: zwischen
«1 Set Of Batteries», «2 Sets Of Batteries» und «3 Sets Of Batteries» liegt der Preis und der
Lieferumfang. Aus drei sinnvollen Auswahlpunkten würden drei gleich benannte — aus einem
hässlichen Feld ein kaputtes.

WAS STATTDESSEN FALSCH IST: das ETIKETT. «Farbe: 5inch-Laser version-White light» ist eine
falsche Beschriftung; «Ausführung: 5inch-Laser version-White light» ist eine richtige. Die
Werte bleiben unangetastet, die Auswahl funktioniert weiter, und die Seite behauptet nichts
Falsches mehr. Die Übersetzung der Rohstrings bleibt eine eigene, grössere Aufgabe — aber
solange sie offen ist, soll wenigstens das Etikett stimmen.

BEDINGUNGEN, damit keine echte Farbauswahl umbenannt wird — alle drei müssen zutreffen:
 • Die Option heisst «Farbe» / «Color» / «Colour».
 • Mindestens die Hälfte der Werte ist länger als 40 Zeichen ODER trägt zwei Bindestriche.
 • Mindestens 70 % der Werte beginnen NICHT mit einem Farbwort.
Das letzte Kriterium schützt Fälle wie «Schwarz-XL», wo trotz Bindestrich eine Farbe steht.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_option_umbenannt.txt"
NEUER_NAME = "Ausführung"

FARBWORT = re.compile(
    r'^(?:schwarz|weiss|weiß|rot|blau|gr[üu]n|gelb|grau|rosa|pink|lila|braun|beige|gold|'
    r'silber|orange|t[üu]rkis|violett|creme|bunt|khaki|marineblau|elfenbein|bordeaux|'
    r'black|white|red|blue|green|yellow|gray|grey|purple|brown|navy|ivory|silver)\b', re.I)


def gql(q, v=None):
    with open("/tmp/_ou.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ou.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def ist_keine_farbe(werte):
    if not werte:
        return False
    lang = sum(1 for v in werte if len(v) > 40)
    mehrfach = sum(1 for v in werte if v.count("-") >= 2)
    keine = sum(1 for v in werte if not FARBWORT.match(v))
    return ((lang / len(werte) >= 0.5 or mehrfach / len(werte) >= 0.5)
            and keine / len(werte) >= 0.7)


def main():
    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        for o in (p.get("options") or []):
            if (o.get("name") or "").strip().lower() not in ("farbe", "color", "colour"):
                continue
            werte = [v.strip() for v in (o.get("values") or []) if v.strip()]
            if ist_keine_farbe(werte):
                kandidaten.append((p["id"], p["title"], werte[0]))
            break

    print(f"Optionen «Farbe» ohne Farbwerte → «{NEUER_NAME}»: {len(kandidaten)}", flush=True)
    for _, t, v in kandidaten[:14 if DRY else 5]:
        print(f"   {t[:40]:<42} «{v[:48]}»", flush=True)
    if DRY or not kandidaten:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, titel, _ in kandidaten:
        if gid in done:
            continue
        d = gql('query($id:ID!){node(id:$id){... on Product{options{id name}}}}', {"id": gid})
        opts = ((d.get("data") or {}).get("node") or {}).get("options") or []
        opt = next((o for o in opts if (o.get("name") or "").strip().lower()
                    in ("farbe", "color", "colour")), None)
        if not opt:
            continue
        # Trägt das Produkt schon eine Option «Ausführung», würde der neue Name kollidieren.
        if any((o.get("name") or "").strip().lower() == NEUER_NAME.lower() for o in opts):
            f.write(f"{gid}\tname-schon-vergeben\n")
            continue
        r = gql('mutation($p:ID!,$o:OptionUpdateInput!){productOptionUpdate(productId:$p,'
                'option:$o){userErrors{message}}}',
                {"p": gid, "o": {"id": opt["id"], "name": NEUER_NAME}})
        e = ((r.get("data") or {}).get("productOptionUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:34]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\tFarbe→{NEUER_NAME}\t{titel}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Optionen umbenannt")


if __name__ == "__main__":
    main()
