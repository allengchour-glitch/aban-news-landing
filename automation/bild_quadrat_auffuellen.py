"""Zu kleine Hauptbilder quadratisch auffüllen — statt sie aufzugeben.

DER BEFUND (26.08.2026): 618 aktive Produkte tragen `bild-zu-klein`, weil kein Bild
500×500 auf BEIDEN Kanten erreicht. `bild_gross_nachladen.py` hat für jedes davon den
Lieferanten gefragt — CJ hat nichts Grösseres. Das war ein ehrliches Ende, aber kein
vollständiges: Bei **293 der 618** ist die LÄNGERE Kante längst ≥ 500 px. Beispiele:
633×497 (drei Pixel zu wenig), 655×424, 458×611, 467×525.

Diese Bilder werden hier auf ein QUADRAT gebracht, indem an den kurzen Seiten Rand
ergänzt wird — das Produktfoto selbst bleibt unangetastet, es wird nicht gestreckt,
nicht hochskaliert und nichts hinzuerfunden. Genau so machen es Händler seit jeher, und
Googles Bildrichtlinie verlangt nur, dass die Ware den Grossteil der Fläche füllt und
keine Werbe-Overlays/Wasserzeichen im Bild stehen. Beides bleibt erfüllt.

⚠️ DIE RANDFARBE WIRD GEMESSEN, NICHT GERATEN. Ein weisser Balken an einem Foto mit
grauem oder pastellfarbenem Hintergrund sieht aus wie ein Fehler. Der Lauf liest die
vier Bildränder aus und nimmt deren häufigste Farbe — ist der Hintergrund weiss, wird
der Rand weiss; ist er beige, wird er beige. Sind die Ränder uneinheitlich (Freisteller
mit Objekt bis an den Rand), wird auf Weiss zurückgefallen.

⚠️ NUR AUFFÜLLEN, NIE HOCHSKALIEREN. Ist auch die längere Kante < 500, kann dieses
Werkzeug nichts ausrichten — das Produkt behält seinen Tag. Ein hochgerechnetes Bild
wäre schärfer nur in der Zahl, nicht im Auge der Kundin.

Das Originalbild bleibt als weiteres Medium erhalten; das neue kommt an Position 0.

ENV: CAP (Standard 40) · DRY=1 · NUR=<Produkt-ID> für einen Einzelfall
"""
import io, json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
CAP = int(os.environ.get("CAP", "40"))
NUR = os.environ.get("NUR")
LEDGER = "dropship/_bild_quadrat.txt"
API = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"


def sgql(q, v=None):
    """Shopify-Abfrage mit Drosselungs-Geduld. Eine Drosselung ist kein Abbruchgrund —
    sie sagt nur, wie lange zu warten ist (Lehre 21.08.)."""
    for _ in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60", API,
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(4); continue
        if "data" in d and d["data"]:
            return d
        if "Throttled" in str(d.get("errors", "")):
            time.sleep(6); continue
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def hole(url):
    r = subprocess.run(["curl", "-sL", "--max-time", "40", url.split("?")[0]], capture_output=True)
    return r.stdout if len(r.stdout) > 500 else None


def randfarbe(im):
    """Häufigste Farbe der vier Bildränder — oder Weiss, wenn sie uneinheitlich sind."""
    from collections import Counter
    b, h = im.size
    pix = im.convert("RGB").load()
    rand = []
    for x in range(0, b, max(1, b // 60)):
        rand += [pix[x, 0], pix[x, h - 1]]
    for y in range(0, h, max(1, h // 60)):
        rand += [pix[0, y], pix[b - 1, y]]
    if not rand:
        return (255, 255, 255)
    farbe, n = Counter(rand).most_common(1)[0]
    # Uneinheitlicher Rand (kein Farbton stellt die Mehrheit) -> Weiss ist die sichere Wahl.
    return farbe if n >= len(rand) * 0.5 else (255, 255, 255)


def quadrat(roh):
    from PIL import Image
    im = Image.open(io.BytesIO(roh))
    im = im.convert("RGB")
    b, h = im.size
    k = max(b, h)
    if k < 500:
        return None, None
    neu = Image.new("RGB", (k, k), randfarbe(im))
    neu.paste(im, ((k - b) // 2, (k - h) // 2))
    aus = io.BytesIO()
    neu.save(aus, "JPEG", quality=92)
    return aus.getvalue(), (k, k)


def hochladen(bytes_, name):
    """stagedUploadsCreate -> PUT -> fileCreate -> URL (derselbe Weg wie upload_to_shopify_cdn.mjs)."""
    d = sgql('''mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){
        stagedTargets{ url resourceUrl parameters{name value} } userErrors{message} } }''',
             {"i": [{"filename": name, "mimeType": "image/jpeg",
                     "httpMethod": "POST", "resource": "IMAGE"}]})
    t = (((d.get("data") or {}).get("stagedUploadsCreate") or {}).get("stagedTargets") or [None])[0]
    if not t:
        return None
    tmp = "/tmp/_quadrat.jpg"
    open(tmp, "wb").write(bytes_)
    cmd = ["curl", "-s", "--max-time", "90", "-X", "POST", t["url"]]
    for p in t["parameters"]:
        cmd += ["-F", f'{p["name"]}={p["value"]}']
    cmd += ["-F", "file=@" + tmp]
    subprocess.run(cmd, capture_output=True)
    return t["resourceUrl"]


Q = '''query($c:String){ products(first:50, after:$c, query:"status:ACTIVE tag:bild-zu-klein"){
  pageInfo{hasNextPage endCursor}
  nodes{ id title media(first:10){nodes{ id ... on MediaImage{ image{url width height} } }} } }}'''


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    cur, getan, uebersprungen = None, 0, 0
    while getan < CAP:
        d = sgql(Q, {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("PAUSE (Shopify antwortet nicht)"); break
        for p in pg["nodes"]:
            if getan >= CAP:
                break
            pid = p["id"].split("/")[-1]
            if pid in done or (NUR and pid != NUR):
                continue
            bilder = [m for m in p["media"]["nodes"] if m.get("image")]
            if not bilder:
                continue
            best = max(bilder, key=lambda m: m["image"]["width"] * m["image"]["height"])
            w, h = best["image"]["width"], best["image"]["height"]
            if max(w, h) < 500:
                uebersprungen += 1
                continue                      # nicht heilbar, Tag bleibt
            # ⚠️ VERALTETER TAG (26.08.): Manche Produkte tragen `bild-zu-klein` noch, obwohl
            # laengst ein Bild >= 500x500 auf BEIDEN Kanten vorliegt — etwa weil ein spaeterer
            # Backfill ein grosses Bild nachgeliefert hat. Hier darf NICHTS hochgeladen werden:
            # der erste Lauf legte fuer ein 800x800-Produkt eine identische Kopie an. Richtig
            # ist, das grosse Bild nach vorn zu holen und den Tag zu entfernen.
            if w >= 500 and h >= 500:
                if DRY:
                    print(f"DRY {pid} Tag veraltet ({w}x{h}) — nur umsortieren  {p['title'][:40]}", flush=True)
                    getan += 1; continue
                sgql('''mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ userErrors{message} }}''',
                     {"id": p["id"], "m": [{"id": best["id"], "newPosition": "0"}]})
                sgql('''mutation($id:ID!,$t:[String!]!){ tagsRemove(id:$id, tags:$t){ userErrors{message} }}''',
                     {"id": p["id"], "t": ["bild-zu-klein"]})
                with open(LEDGER, "a") as f:
                    f.write(f"{pid}\ttag-veraltet {w}x{h}\t{p['title'][:50]}\n")
                done.add(pid); getan += 1
                print(f"TAG-WEG {pid} {w}x{h} war schon gross  {p['title'][:40]}", flush=True)
                continue
            roh = hole(best["image"]["url"])
            if not roh:
                continue
            neu, masse = quadrat(roh)
            if not neu:
                continue
            if DRY:
                print(f"DRY {pid} {w}x{h} -> {masse[0]}x{masse[1]}  {p['title'][:40]}", flush=True)
                getan += 1
                continue
            url = hochladen(neu, f"{pid}-quadrat.jpg")
            if not url:
                print(f"{pid} upload-fehler", flush=True); continue
            cr = sgql('''mutation($id:ID!,$m:[CreateMediaInput!]!){
                productCreateMedia(productId:$id, media:$m){ media{id} mediaUserErrors{message} }}''',
                      {"id": p["id"], "m": [{"originalSource": url, "mediaContentType": "IMAGE"}]})
            med = (cr.get("data") or {}).get("productCreateMedia") or {}
            mid = (med.get("media") or [{}])[0].get("id")
            if med.get("mediaUserErrors") or not mid:
                print(f"{pid} create-fehler {med.get('mediaUserErrors')}", flush=True); continue
            # ⚠️ Auf READY warten. Ein FAILED-Medium wird geloescht — ein Produkt mit
            # unsichtbarem Hauptbild ist schlimmer als eines mit kleinem (Messer-Falle 11.08.).
            status, fehler = "PROCESSING", []
            for _ in range(12):
                time.sleep(3)
                st = sgql('query($id:ID!){ node(id:$id){ ... on MediaImage{ status '
                          'fileErrors{code message} } } }', {"id": mid})
                nd = ((st.get("data") or {}).get("node") or {})
                status = nd.get("status") or status
                fehler = nd.get("fileErrors") or fehler
                if status in ("READY", "FAILED"):
                    break
            if status != "READY":
                sgql('mutation($id:ID!,$m:[ID!]!){ productDeleteMedia(productId:$id, mediaIds:$m){ deletedMediaIds } }',
                     {"id": p["id"], "m": [mid]})
                # ⚠️ 04.09.2026: Ein FAILED sagte bisher nur «medium-failed-geloescht» — der GRUND
                # steht aber in fileErrors, und er war an diesem Morgen 33× derselbe:
                # FILE_STORAGE_LIMIT_EXCEEDED. Ohne ihn sieht ein voller Datei-Speicher aus wie
                # ein sprunghafter Bildfehler, und der Lauf probiert stur weiter.
                code = (fehler[0].get("code") if fehler else "") or ""
                print(f"{pid} medium-{status.lower()}-geloescht {code}", flush=True)
                if code == "FILE_STORAGE_LIMIT_EXCEEDED":
                    print("⛔ DATEI-SPEICHER VOLL — jeder weitere Upload scheitert gleich. "
                          "Lauf beendet (Betreiber: Shopify → Einstellungen → Dateien).",
                          flush=True)
                    return
                continue
            sgql('mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ userErrors{message} }}',
                 {"id": p["id"], "m": [{"id": mid, "newPosition": "0"}]})
            sgql('mutation($id:ID!,$t:[String!]!){ tagsRemove(id:$id, tags:$t){ userErrors{message} }}',
                 {"id": p["id"], "t": ["bild-zu-klein"]})
            with open(LEDGER, "a") as f:
                f.write(f"{pid}\t{w}x{h} -> {masse[0]}x{masse[1]}\t{p['title'][:50]}\n")
            done.add(pid); getan += 1
            print(f"OK {pid} {w}x{h} -> {masse[0]}x{masse[1]}  {p['title'][:40]}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    print(f"FERTIG: {getan} quadratisch aufgefuellt, {uebersprungen} nicht heilbar (auch laengere Kante < 500)"
          + (" [DRY]" if DRY else ""))


if __name__ == "__main__":
    main()
