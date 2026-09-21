"""Arbeitet die Google-Merchant-Problemliste ab (Export aus dem Merchant Center).

WARUM DAS ZUERST KOMMT: Richtlinienverstösse (Drogen, Erwachseneninhalte, personalisierte
Werbung zu persönlichen Notlagen) gefährden das GANZE Merchant-Konto, nicht nur den einzelnen
Artikel. Sie sind wenige und schnell behoben — anders als die 6'012 «Over capacity»-Meldungen,
die ein Kontingentproblem sind und nicht am Produkt liegen.

Betroffene Produkte werden aus dem Google-&-YouTube-Kanal genommen (publishableUnpublish) und
getaggt — NICHT gelöscht und NICHT aus dem Onlineshop entfernt. Im eigenen Shop dürfen ein
CBD-Gesichtspflegeset, ein Umstandskleid und eine Yoga-Shorts selbstverständlich verkauft werden;
sie dürfen nur nicht über Google beworben werden.

⚠️ «Over capacity» wird hier bewusst NICHT behandelt: Das ist kein Produktfehler, sondern das
CSS-Kontingent des Kontos. Dagegen hilft nur eine Feed-Regel im Merchant Center oder weniger
Artikel im Anzeigenziel — beides Sache des Kontoinhabers.

DRY=1 meldet nur.
"""
import csv, json, os, re, subprocess, sys, time, collections

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
GOOGLE_PUB = "302872297857"
LEDGER = "dropship/_merchant_issue_done.txt"

# Verstoss -> Tag. Nur diese Kategorien werden aus dem Google-Kanal genommen.
RICHTLINIE = {
    "Illegal drugs": "google-gesperrt-cbd",
    "Restricted adult content": "google-gesperrt-adult",
    "Personalized advertising: Sexual interests": "google-gesperrt-adult",
    "Personalized advertising: personal hardships": "google-gesperrt-notlage",
}


def gql(q, v=None):
    payload = json.dumps({"query": q, "variables": v or {}})
    with open("/tmp/_mi.json", "w") as f:
        f.write(payload)
    grund = "kein Versuch ausgefuehrt"
    drossel = 0; versuche = 0       # Drosselungen zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mi.json"], capture_output=True, text=True)
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
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird. Letzter Grund: " + grund)


def lade(pfad):
    """Merchant-Exporte haben teils Vorspann-Zeilen vor der Kopfzeile."""
    lines = open(pfad, encoding="utf-8-sig").readlines()
    start = 0
    for i, l in enumerate(lines[:10]):
        if l.startswith("Item ID,") or l.startswith("Product,"):
            start = i
            break
    return list(csv.DictReader(lines[start:]))


def main(pfad):
    rows = lade(pfad)
    treffer = collections.defaultdict(set)   # tag -> {produkt-id}
    titel = {}
    for x in rows:
        tag = RICHTLINIE.get(x.get("Issue title"))
        if not tag:
            continue
        m = re.match(r'shopify_\w+_(\d+)_', x.get("Item ID") or "")
        if not m:
            continue
        treffer[tag].add(m.group(1))
        titel[m.group(1)] = (x.get("Title") or "")[:60]

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    gesamt = sum(len(v) for v in treffer.values())
    print(f"Richtlinien-Verstösse: {gesamt} Produkte | schon erledigt {len(done)} | DRY={DRY}", flush=True)

    for tag, pids in treffer.items():
        for pid in sorted(pids):
            if pid in done:
                continue
            gid = f"gid://shopify/Product/{pid}"
            print(f"  [{tag}] {titel.get(pid, pid)[:52]}", flush=True)
            if DRY:
                continue
            r = gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p)'
                    '{userErrors{message}}}',
                    {"id": gid, "p": [{"publicationId": "gid://shopify/Publication/" + GOOGLE_PUB}]})
            e = ((r.get("data") or {}).get("publishableUnpublish") or {}).get("userErrors") or []
            if e:
                print(f"     ⚠️ {e[:1]}", flush=True)
                continue
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": [tag]})
            f.write(f"{pid}\t{tag}\t{titel.get(pid,'')}\n"); f.flush()
            time.sleep(0.3)

    # Übrige Meldungen nur berichten — sie brauchen andere Werkzeuge
    rest = collections.Counter(x.get("Issue title") for x in rows
                               if x.get("Issue title") not in RICHTLINIE)
    print("\nNicht hier behandelt (anderes Werkzeug bzw. Kontingent):", flush=True)
    for k, v in rest.most_common():
        print(f"  {v:>6}  {k}", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
