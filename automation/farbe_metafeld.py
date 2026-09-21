"""Füllt das Google-Feld `color` für Bekleidung und Accessoires.

ANLASS (Sauber-Lauf 2026-08-10): In einer Stichprobe von 200 Feed-Produkten fehlt bei 83 %
die Farbangabe. Google verlangt `color` verbindlich für die Kategorie «Apparel & Accessories»
— fehlt sie dort, wird das Angebot abgelehnt. Für Elektronik, Haushalt und Werkzeug ist das
Feld dagegen freiwillig; dort etwas hineinzuschreiben brächte nichts und könnte falsch sein.
Deshalb arbeitet dieses Skript ausschliesslich auf Mode-nahen Tags.

WOHER DIE FARBE KOMMT, in dieser Reihenfolge:
 1. eine Produktoption namens «Farbe»/«Color» — dann liefert Shopify die Farbe ohnehin
    variantengenau an Google, und es ist NICHTS zu tun (das Skript überspringt solche
    Produkte, statt eine zweite, womöglich widersprüchliche Quelle anzulegen);
 2. ein eindeutiges Farbwort im Titel.

⚠️ Die Titel-Erkennung folgt der teuer gelernten Wortgrenzen-Regel (CLAUDE.md 9b): «Rose»
darf nicht in «Rosé» oder «Rosette» treffen, «Gold» nicht in «Goldfisch», «Braun» nicht im
Markennamen «Braun». Darum: nur eigenständige Tokens, deutsche Wortformen mitgedacht, und
bei MEHR als einer gefundenen Farbe wird nichts geschrieben — eine geratene Farbe ist bei
Google schlimmer als eine fehlende, weil sie dem Bild widerspricht.

DRY=1 zeigt die Zuordnung, ohne zu speichern.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_farbe_metafeld.txt"
GOOG = "302872297857"

# Nur Mode/Accessoires — dort ist `color` bei Google Pflicht.
MODE_TAGS = ["kleidung", "damen-mode", "herren-mode", "schuhe", "damen-taschen", "schmuck",
             "sonnenbrille", "kategorie-armband", "kategorie-halskette", "ohrringe", "uhr",
             "accessoire", "bademode", "unterwaesche"]

# Wortformen bewusst ausgeschrieben; der Wert ist die Google-Normfarbe.
FARBEN = [
    (r'schwarz(?:e[rsnm]?)?', "Schwarz"), (r'wei(?:ss|ß)(?:e[rsnm]?)?', "Weiss"),
    (r'grau(?:e[rsnm]?)?', "Grau"), (r'silber(?:n|farben)?', "Silber"),
    (r'gold(?:en|farben)?(?!fisch|hamster|barsch)', "Gold"),
    (r'ros[ée]gold', "Roségold"), (r'bronze', "Bronze"),
    (r'rot(?:e[rsnm]?)?', "Rot"), (r'bordeaux|weinrot', "Bordeaux"),
    (r'blau(?:e[rsnm]?)?', "Blau"), (r'marine|navy|dunkelblau', "Marineblau"),
    (r'hellblau|himmelblau', "Hellblau"), (r't[üu]rkis', "Türkis"),
    (r'gr[üu]n(?:e[rsnm]?)?', "Grün"), (r'oliv(?:gr[üu]n)?', "Oliv"),
    (r'gelb(?:e[rsnm]?)?', "Gelb"), (r'senf(?:gelb)?', "Senfgelb"),
    (r'orange', "Orange"), (r'lila|violett', "Violett"), (r'flieder|lavendel', "Flieder"),
    (r'rosa|pink', "Rosa"), (r'beige', "Beige"), (r'creme|cr[èe]me|ecru', "Creme"),
    (r'braun(?!\s*(?:GmbH|AG))', "Braun"), (r'khaki', "Khaki"),
    (r'bunt|mehrfarbig|regenbogen', "Mehrfarbig"), (r'transparent|klar(?:sichtig)?', "Transparent"),
]
FARB_RX = [(re.compile(r'(?<![a-zäöüß])' + m + r'(?![a-zäöüß])', re.I), w) for m, w in FARBEN]


def gql(q, v=None):
    with open("/tmp/_fm.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    grund = "kein Versuch ausgefuehrt"
    drossel = 0; versuche = 0       # Drosselungen zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_fm.json"], capture_output=True, text=True)
        # ⚠️ 17.09.2026: Hier stand `except Exception: pass` — der GRUND wurde
        # verschluckt. 15 Waechter meldeten «Shopify antwortet nicht», und keiner
        # konnte sagen warum. Ein Fehler ohne Grund ist eine Sackgasse fuer den,
        # der ihn als naechstes liest.
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
            grund = str(d.get("errors") or d)[:300]
            # THROTTLED ist kein Fehler, sondern eine Bitte um Geduld: der Eimer
            # fuellt sich mit restoreRate pro Sekunde, eine teure Abfrage braucht
            # laenger als der feste Kurzschlaf.
            if "THROTTLED" in grund.upper():
                # ⚠️ 21.09.2026: der feste 12-s-Schlaf reichte nicht. Nach JEDEM stuendlichen
                # Container-Neustart startet der Aufseher ~25 Waechter auf EINEN 2000-Punkte-
                # Eimer (100/s Nachlauf); wer hier nach 4 Versuchen aufgab, schrieb einen
                # Traceback ins Log und wartete auf den naechsten Aufseher-Zyklus — 30 min fuer
                # die 13 Reiniger, 24 h fuer die Tageswaechter (Start nach Log-ALTER). Gemessen
                # 09:08-Runde: 4 von 21 Waechtern so gestorben. Shopify sagt
                # in throttleStatus, wie lange es dauert — fragen statt raten (menue_links, frueh).
                drossel += 1
                wartezeit = 12.0
                try:
                    _k = (d.get("extensions") or {}).get("cost") or {}
                    _t = _k.get("throttleStatus") or {}
                    _fehlt = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                    _rate = float(_t.get("restoreRate") or 0)
                    if _fehlt > 0 and _rate > 0:
                        wartezeit = min(30.0, _fehlt / _rate + 0.5)
                except Exception:
                    pass
                time.sleep(wartezeit)
                if drossel < 12:
                    continue
                grund = "12x gedrosselt (Eimer dauerhaft leer): " + grund
                break
        except Exception as e:
            roh = (r.stdout or "")[:200]
            grund = "Antwort unlesbar (" + type(e).__name__ + "): " + roh
        versuche += 1
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird. Letzter Grund: " + grund)


def farbe_aus_titel(titel):
    treffer = {w for rx, w in FARB_RX if rx.search(titel)}
    # Genau eine eindeutige Farbe -> verwertbar. Null oder mehrere -> Finger weg.
    return treffer.pop() if len(treffer) == 1 else None


def main():
    query = ("status:ACTIVE AND publication_ids:" + GOOG + " AND ("
             + " OR ".join(f"tag:{t}" for t in MODE_TAGS) + ")")
    st = "/tmp/farbe_cursor.txt"
    cur = (open(st).read().strip() or None) if os.path.exists(st) else None
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = gesetzt = hat_option = unklar = 0
    while True:
        d = gql('query($c:String,$q:String!){products(first:100,after:$c,query:$q){'
                'pageInfo{hasNextPage endCursor} nodes{id title options{name} '
                'metafields(first:8,namespace:"mm-google-shopping"){nodes{key value}}}}}',
                {"c": cur, "q": query})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("keine Daten", flush=True); break
        for p in pg["nodes"]:
            n += 1
            if p["id"] in done:
                continue
            mf = {m["key"]: m["value"] for m in p["metafields"]["nodes"]}
            if mf.get("color"):
                continue
            if any(o["name"].lower() in ("farbe", "color", "colour", "farben")
                   for o in p["options"]):
                hat_option += 1        # Shopify liefert die Farbe variantengenau — nichts tun.
                continue
            farbe = farbe_aus_titel(p["title"])
            if not farbe:
                unklar += 1
                continue
            gesetzt += 1
            if gesetzt <= 12:
                print(f"  {farbe:<12} ← {p['title'][:56]}", flush=True)
            if DRY:
                continue
            gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
                '{userErrors{message}}}',
                {"m": [{"ownerId": p["id"], "namespace": "mm-google-shopping",
                        "key": "color", "value": farbe, "type": "single_line_text_field"}]})
            f.write(f"{p['id']}\t{farbe}\n"); f.flush()
            time.sleep(0.16)
        if n % 1000 < 100:
            print(f"  … {n} geprüft | gesetzt {gesetzt} | Variantenfarbe {hat_option} | "
                  f"unklar {unklar}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        if not DRY:
            open(st, "w").write(cur)
    # Cursor am Ende löschen: der Google-Kanal wächst laufend, ein stehengebliebener Cursor
    # würde jeden Folgelauf sofort am Ende starten lassen und Neuzugänge nie erfassen.
    if not DRY and os.path.exists(st):
        os.remove(st)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {n} geprüft, {gesetzt} Farben gesetzt, "
          f"{hat_option} haben Variantenfarbe, {unklar} ohne eindeutige Farbe (bewusst leer)")


if __name__ == "__main__":
    main()
