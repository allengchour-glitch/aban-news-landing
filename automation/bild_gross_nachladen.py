"""bild_gross_nachladen.py — der Lieferanten-Nachlauf zu hauptbild_gross.py (25.08.2026).

DER BEFUND: 642 aktive Produkte tragen den Tag `bild-zu-klein` — ihr GESAMTER Bildsatz
liegt unter Googles 500×500-Grenze («Image too small»-Vorwarnung im Merchant). Die grossen
Originale liegen bei CJ; sie wurden beim Import nur nie geholt (dieselbe Luecke wie beim
Einkaufspreis und beim Gewicht: bekannt, benutzt, verworfen).

Vorgehen je Produkt: SKU -> CJ (alle FUENF Formen, Lehre 22./25.08.) -> productImageSet ->
Bildmasse aus dem DATEIKOPF lesen (JPEG-SOF/PNG-IHDR, nur die ersten 64 KB — dieselbe
Technik wie grossGenug() in cj_variantenbild.mjs) -> groesstes Bild mit beiden Kanten >=500
per productCreateMedia anhaengen -> auf READY warten -> nach vorn sortieren -> Tag weg.

⚠️ NUR MIT QUITTUNG: erst wenn das Medium READY ist, wird umsortiert und der Tag entfernt.
Ein FAILED-Medium wird geloescht statt liegengelassen (Messer-Falle: 7 FAILED, 0 sichtbar).
⚠️ CJ: 1 Anfrage/s ueber ALLE Prozesse; 1600200 = warten, 16900500 = Feierabend.
ENV: CAP (Standard 60) · DRY=1
Ledger: dropship/_bild_gross_cj.txt (pid<TAB>ergebnis)
"""
import json, os, re, struct, subprocess, time, urllib.request

TOK = open("/tmp/cj_shop_token.txt").read().strip()
CJT = json.load(open("/tmp/cj_token.json"))["accessToken"]
CAP = int(os.environ.get("CAP", "60"))
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_bild_gross_cj.txt"

def sgql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}}).encode()
    for _ in range(6):
        try:
            rq = urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                data=p, headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(rq, timeout=50).read())
            if "data" in d: return d
            if "THROTTLED" in json.dumps(d.get("errors", "")): time.sleep(4); continue
        except Exception: pass
        time.sleep(3)
    return {}

def cj(path):
    for v in range(8):
        try:
            rq = urllib.request.Request("https://developers.cjdropshipping.com/api2.0/v1/" + path,
                headers={"CJ-Access-Token": CJT})
            d = json.loads(urllib.request.urlopen(rq, timeout=45).read())
        except Exception:
            time.sleep(3 + v); continue
        if d.get("code") == 1600200 or "QPS" in str(d.get("message", "")):
            time.sleep(1.6 + v * 0.7); continue
        return d
    return {}

def masse(url):
    """Bildmasse aus den ersten 64 KB. None bei unlesbar (Kandidat wird uebersprungen)."""
    try:
        rq = urllib.request.Request(url, headers={"Range": "bytes=0-65535", "User-Agent": "Mozilla/5.0"})
        b = urllib.request.urlopen(rq, timeout=25).read()
    except Exception:
        return None
    if b[:8] == b"\x89PNG\r\n\x1a\n" and len(b) > 24:
        w, h = struct.unpack(">II", b[16:24]); return (w, h)
    if b[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(b):
            if b[i] != 0xFF: i += 1; continue
            m = b[i+1]
            if m in (0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF):
                h, w = struct.unpack(">HH", b[i+5:i+9]); return (w, h)
            ln = struct.unpack(">H", b[i+2:i+4])[0]; i += 2 + ln
    return None

done = set()
if os.path.exists(LEDGER):
    done = set(l.split("\t")[0] for l in open(LEDGER) if l.strip() and not l.startswith("#"))

Q = '''query($c:String){ products(first:50, after:$c, query:"status:ACTIVE tag:bild-zu-klein"){
  pageInfo{hasNextPage endCursor}
  nodes{ id title variants(first:1){nodes{sku}} } }}'''

cur = None; getan = 0; fertig = False
while not fertig:
    d = sgql(Q, {"c": cur})
    pg = (d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        if getan >= CAP: fertig = True; break
        pid = p["id"].split("/")[-1]
        if pid in done: continue
        sku = (p["variants"]["nodes"][0]["sku"] or "").strip()
        base = sku[3:] if sku.startswith("CJ-") else sku
        r = {}
        if re.fullmatch(r"\d{15,}", base) or re.fullmatch(r"[0-9A-F-]{30,}", base, re.I):
            r = cj("product/query?pid=" + base); time.sleep(1.5)
        else:
            m = re.match(r"^(CJ[A-Z]{2}[0-9A-Z]+?)(?:-.*)?$", base)
            if m:
                kern = m.group(1)
                r = cj("product/query?productSku=" + kern); time.sleep(1.5)
                if r.get("code") != 200 and re.search(r"\d{4}$", kern):
                    r = cj("product/query?productSku=" + kern[:-4]); time.sleep(1.5)
                if r.get("code") != 200 and re.search(r"\d{2}[A-Z]{2}$", kern):
                    r = cj("product/query?productSku=" + re.sub(r"\d{2}[A-Z]{2}$", "", kern)); time.sleep(1.5)
        if r.get("code") == 16900500 or "Insufficient" in str(r.get("message", "")):
            print("CJ-Tagesbudget erschoepft — PAUSE"); fertig = True; break
        data = r.get("data") or {}
        raw = data.get("productImageSet") or data.get("productImage") or []
        if isinstance(raw, str):
            try: raw = json.loads(raw)
            except Exception: raw = [raw] if raw.startswith("http") else []
        urls = [u for u in (raw if isinstance(raw, list) else [raw]) if isinstance(u, str) and u.startswith("http")]
        best = None
        for u in urls[:10]:
            wh = masse(u)
            if wh and wh[0] >= 500 and wh[1] >= 500 and (not best or wh[0]*wh[1] > best[1][0]*best[1][1]):
                best = (u, wh)
        if not best:
            with open(LEDGER, "a") as f: f.write(f"{pid}\tkein-grosses-bild-bei-cj\n")
            done.add(pid); getan += 1
            print(f"{pid} kein grosses Bild ({len(urls)} Kandidaten)", flush=True); continue
        if DRY:
            print(f"{pid} DRY: wuerde {best[1][0]}x{best[1][1]} anhaengen: {best[0][:80]}", flush=True)
            getan += 1; continue
        cr = sgql('''mutation($id:ID!,$m:[CreateMediaInput!]!){
            productCreateMedia(productId:$id, media:$m){ media{ id } mediaUserErrors{message} }}''',
            {"id": p["id"], "m": [{"originalSource": best[0], "mediaContentType": "IMAGE"}]})
        med = ((cr.get("data") or {}).get("productCreateMedia") or {})
        errs = med.get("mediaUserErrors") or []
        mid = (med.get("media") or [{}])[0].get("id")
        if errs or not mid:
            with open(LEDGER, "a") as f: f.write(f"{pid}\tcreate-fehler\n")
            done.add(pid); getan += 1; print(f"{pid} create-Fehler {errs}", flush=True); continue
        status = "PROCESSING"
        for _ in range(12):
            time.sleep(3)
            st = sgql('query($id:ID!){ node(id:$id){ ... on MediaImage{ status } } }', {"id": mid})
            status = ((st.get("data") or {}).get("node") or {}).get("status") or "PROCESSING"
            if status in ("READY", "FAILED"): break
        if status != "READY":
            sgql('mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p, mediaIds:$m){deletedMediaIds userErrors{message}}}',
                 {"p": p["id"], "m": [mid]})
            with open(LEDGER, "a") as f: f.write(f"{pid}\tmedium-{status.lower()}-geloescht\n")
            done.add(pid); getan += 1; print(f"{pid} Medium {status} -> geloescht", flush=True); continue
        sgql('mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ userErrors{message} }}',
             {"id": p["id"], "m": [{"id": mid, "newPosition": "0"}]})
        sgql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
             {"id": p["id"], "t": ["bild-zu-klein"]})
        with open(LEDGER, "a") as f: f.write(f"{pid}\tOK-{best[1][0]}x{best[1][1]}\n")
        done.add(pid); getan += 1
        print(f"{pid} OK {best[1][0]}x{best[1][1]} <- {p['title'][:45]}", flush=True)
    if fertig or not pg["pageInfo"]["hasNextPage"]: break
    cur = pg["pageInfo"]["endCursor"]
print(f"FERTIG: {getan} bearbeitet")
