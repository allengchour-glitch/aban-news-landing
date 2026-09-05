"""Prüft jeden gesetzten `google_product_category`-Wert gegen Googles echte Taxonomie.

DER BEFUND (12.08.2026): Gestern wurde die Abdeckung von 6 % auf 87 % gehoben. Die
Nachkontrolle stellte eine Frage, die gestern niemand gestellt hat: **Gibt es die Pfade, die
wir schreiben, überhaupt?** Antwort für 257 Produkte: nein.

Der grösste Block war ausgerechnet eine bewusste Entscheidung. Um Smartwatches nicht unter
«Schmuck > Uhren» einzuordnen, wurde eine Vorrang-Regel eingebaut, die sie nach
«Electronics > Electronics Accessories > Wearable Technology > Smart Watches» schreibt.
Diesen Zweig gibt es in Googles Taxonomie **nicht** — er stammt aus SHOPIFYS Taxonomie, die
ähnlich aussieht und an dieser Stelle feiner ist. Google verwirft den Wert und klassifiziert
selbst. Die Regel, die eine Ungenauigkeit vermeiden wollte, hat 204 Produkten den Wert ganz
genommen. Gegengeprüft an der Quelldatei
`google.com/basepages/producttype/taxonomy-with-ids.en-US.txt` (5'595 gültige Pfade):
«wearable» kommt darin kein einziges Mal vor.

DAS ALLGEMEINE MITTEL statt einer Liste von Einzelkorrekturen: Ist ein Pfad ungültig, wird
das letzte Glied abgeschnitten und der Rest geprüft — so lange, bis ein gültiger Vorfahr
übrig bleibt. «… > Wearable Technology > Smart Watches» hat keinen: schon «Electronics >
Electronics Accessories > Wearable Technology» existiert nicht, wohl aber «Electronics >
Electronics Accessories». Ein gröberer richtiger Wert ist im Feed immer besser als ein
präziser falscher, denn der falsche wird verworfen. Wo ein Abschneiden zu grob würde, greift
vorher eine benannte Umleitung (Smartwatch → «Apparel & Accessories > Jewelry > Watches»,
der Zweig, den Google für Uhren am Handgelenk tatsächlich führt).

Damit ist die Prüfung nicht auf die heute bekannten fünf Fehler beschränkt: Jeder künftige
Tippfehler und jeder aus Shopifys Taxonomie verirrte Zweig fällt automatisch auf einen
gültigen Vorfahren zurück, statt still verworfen zu werden.

DRY=1 zeigt jede Korrektur.
"""
import json, os, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
TAXONOMIE = os.environ.get("TAXONOMIE", "/tmp/gtax.txt")
LEDGER = "dropship/_gkategorie_geprueft.txt"

# Benannte Umleitungen für Fälle, in denen der gültige Vorfahr die Ware nicht mehr beschreibt.
UMLEITUNG = {
    "Electronics > Electronics Accessories > Wearable Technology > Smart Watches":
        "Apparel & Accessories > Jewelry > Watches",
    "Electronics > Electronics Accessories > Wearable Technology > Activity Trackers":
        "Apparel & Accessories > Jewelry > Watches",
    "Home & Garden > Decor > Party Supplies":
        "Arts & Entertainment > Party & Celebration > Party Supplies",
    "Home & Garden > Kitchen & Dining > Outdoor Cooking > Barbeque Grills":
        "Home & Garden > Kitchen & Dining > Kitchen Appliances > Outdoor Grills",
    "Luggage & Bags > Toiletry Bags": "Luggage & Bags > Cosmetic & Toiletry Bags",
    "Toys & Games > Toys > Outdoor Play Equipment": "Toys & Games > Outdoor Play Equipment",
    "Toys & Games > Toys > Remote Control Aircraft": "Toys & Games > Toys > Remote Control Toys",
}


def gql(q, v=None):
    with open("/tmp/_gkp.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gkp.json"], capture_output=True, text=True)
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


def taxonomie_laden():
    """Gibt (gültige Pfade, Nummer→Pfad) zurück. Google akzeptiert beide Schreibweisen."""
    gueltig, nummern = set(), {}
    for zeile in open(TAXONOMIE, encoding="utf-8"):
        if zeile.startswith("#") or " - " not in zeile:
            continue
        nr, pfad = zeile.split(" - ", 1)
        pfad = pfad.strip()
        gueltig.add(pfad)
        nummern[nr.strip()] = pfad
    return gueltig, nummern


def korrigieren(pfad, gueltig, nummern):
    # ⚠️ 1'618 Werte im Katalog sind reine Nummern («1604», «222»). Der erste Entwurf zählte
    # sie als ungültig — sie sind es nicht: Google nimmt die Nummer genauso wie den Textpfad.
    # Sie werden trotzdem umgeschrieben, aber nur in ihre EIGENE Bedeutung. Der Gewinn ist
    # nicht technisch, sondern menschlich: erst als Text fällt auf, dass ein Sticker «Ski»
    # unter «Sporting Goods» und ein Fahrradhelm unter «Lawn & Garden» steht. Als Zahl hätte
    # das nie jemand bemerkt — genau deshalb steht im Projektgedächtnis, Nummern nicht zu
    # verwenden.
    if pfad.isdigit():
        return nummern.get(pfad)
    if pfad in gueltig:
        return None
    ziel = UMLEITUNG.get(pfad)
    if ziel and ziel in gueltig:
        return ziel
    teile = pfad.split(" > ")
    while len(teile) > 1:
        teile.pop()
        kandidat = " > ".join(teile)
        if kandidat in gueltig:
            return kandidat
    return None                       # nicht einmal die Wurzel stimmt → lieber nichts anfassen


def main():
    gueltig, nummern = taxonomie_laden()
    print(f"Googles Taxonomie: {len(gueltig)} gültige Pfade", flush=True)

    aufgaben, unrettbar = [], Counter()
    werte = Counter()
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        mf = {m["key"]: m["value"] for m in ((p.get("mf") or {}).get("nodes") or [])}
        pfad = mf.get("google_product_category")
        if not pfad:
            continue
        werte[pfad] += 1
        if pfad in gueltig:
            continue
        neu = korrigieren(pfad, gueltig, nummern)
        if neu is None:
            unrettbar[pfad] += 1
            continue
        aufgaben.append((p["id"], p["title"], pfad, neu))

    ungueltig = sum(v for k, v in werte.items() if k not in gueltig)
    print(f"Gesetzte Werte: {sum(werte.values())} auf {len(werte)} verschiedenen Pfaden | "
          f"davon ungültig: {ungueltig} auf {len([k for k in werte if k not in gueltig])} Pfaden",
          flush=True)
    zusammen = Counter((a, n) for _, _, a, n in aufgaben)
    for (alt, neu), z in zusammen.most_common(20):
        print(f"   {z:>4}  {alt[:62]}\n         → {neu}", flush=True)
    if unrettbar:
        print("   ⚠️ ohne gültigen Vorfahren (bleiben unangetastet):", flush=True)
        for k, v in unrettbar.most_common(5):
            print(f"      {v:>4}  {k[:70]}", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    stapel = []
    for gid, titel, alt, neu in aufgaben:
        if gid in done:
            continue
        stapel.append((gid, titel, alt, neu))
        # metafieldsSet nimmt höchstens 25 Einträge — das ist eine harte Grenze, keine Empfehlung.
        if len(stapel) == 25:
            n += schreiben(stapel, f)
            stapel = []
    if stapel:
        n += schreiben(stapel, f)
    f.flush()
    print(f"FERTIG: {n} Kategorien auf einen gültigen Pfad korrigiert")


def schreiben(stapel, f):
    felder = [{"ownerId": gid, "namespace": "mm-google-shopping",
               "key": "google_product_category", "type": "single_line_text_field", "value": neu}
              for gid, _, _, neu in stapel]
    r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
            '{userErrors{message}}}', {"m": felder})
    e = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
    if e:
        print(f"  ⚠️ {e[0]['message'][:80]}", flush=True)
        return 0
    for gid, titel, alt, neu in stapel:
        f.write(f"{gid}\t{alt}\t{neu}\n")
    f.flush()
    time.sleep(0.4)
    return len(stapel)


if __name__ == "__main__":
    main()
