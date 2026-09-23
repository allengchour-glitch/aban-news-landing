"""Schweizer Rechtschreibung: ß → ss in Titel und Beschreibung (2026-08-15, Live-Quelle seit 23.09.2026).

Der Katalog wird von Übersetzern beliefert, die bundesdeutsches Deutsch schreiben —
Stand 15.08.: 198 aktive Titel und 2'279 Beschreibungen mit ß («Große Shisha»,
«Reißverschluss», «weißes Rauschen»). Ein Schweizer Shop schreibt durchgehend ss;
die amtliche Schweizer Orthografie kennt kein ß, die Ersetzung ß→ss ist darum in
JEDEM Wort korrekt (auch «Maße»→«Masse» — im CH-Kontext üblich und richtig).

⚠️ 23.09.2026 (Audit-Befund 31): Bis heute las der Wächter /tmp/frisch.jsonl — eine Datei, die KEIN Werkzeug
erzeugt. Der Aufseher startete ihn 22× am Tag, jeder Lauf endete mit «PAUSE (Kandidatenquelle fehlt)», 263 Mal.
Ein Werkzeug ohne Eingabe ist ein Einmal-Lauf (dieselbe Falle wie am 23.08.). Jetzt sucht er LIVE:
  • Die Shopify-Suche indexiert das Zeichen «ß» allein NICHT («status:active AND ß» = 0, «ß» überhaupt = 0),
    aber ganze Wörter mit ß, und sie sucht am Wortanfang als Präfix («gros» 1'979 ⊃ «gross» 1'977;
    Gegenprobe «status:draft AND groß» = 777, «status:draft AND weiß» = 554). Gesucht wird deshalb nach
    Wortanfängen mit ß (STAEMME, aus 600 Entwürfen mit ß gemessen), in Gruppen per OR.
  • Unsinnswort-Gegenprobe vor jedem Lauf: muss 0 ergeben, sonst PAUSE (kein Ergebnis ist kein Befund).
  • ß mitten im Wort («Damenfußkette») findet die Präfix-Suche nicht → ein frischer Voll-Export
    (/tmp/aktiv_bulk_*.jsonl, höchstens 4 Tage alt) liefert ZUSÄTZLICH Kandidaten-IDs.
  • Geschrieben wird immer gegen den LIVE-Text (Lehre 15.08.), je Produkt unter /tmp/lock_produkttext.lock
    (sperren, lesen, schreiben, zurücklesen, freigeben), danach zurückgelesen: kein ß mehr = quittiert.
  • 0 Kandidaten ⇒ «FERTIG: 0 …» — das 20-h-Tor des Aufsehers greift, statt 22 Starts am Tag.
Gemessen 23.09.: 0 aktive Produkte mit ß (Titel/Text) — Suche UND Export vom 22.09. (51'336 aktive).

DRY=1 zeigt nur. EXPORT=<datei> nimmt Kandidaten aus einer Export-Datei (Altweg); Standard ist live.
Ledger: dropship/_ss_statt_scharf_s.txt (Spur; im Live-Modus filtert es nicht — das Objekt ist die Wahrheit).
⚠️ Die QUELLE nachwachsender ß ist mit-gepatcht (cj_category_fill/cj_sku_import/
cj_trending_import ersetzen ß jetzt vor dem Anlegen) — dieser Lauf ist die Wache dahinter.
"""
import fcntl, glob, json, os, re, signal, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from eimer_etikette import nachlauf, bilanz
except Exception:  # noqa: BLE001
    def nachlauf(d): return 0.0
    def bilanz(): return ""

DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "live")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "dropship", "_ss_statt_scharf_s.txt")
TEXTSPERRE = "/tmp/lock_produkttext.lock"
CAP = int(os.environ.get("CAP", "2000"))

# Wortanfänge mit ß — die Suche ergänzt als Präfix («groß» trifft «große», «großen», «Großpackung»).
# Gemessen an 600 Entwürfen mit ß (23.09.): nicht gedeckt waren nur Wörter mit ß in der Mitte
# («gleichmäßig», «draußen», «Vergrößerung») — die stehen jetzt als eigene Anfänge hier.
STAEMME = [
    "groß", "größ", "weiß", "maß", "mäß", "fuß", "füß", "heiß", "reiß", "straß", "süß", "spaß", "auß", "äuß",
    "gieß", "stoß", "stöß", "schließ", "schieß", "bloß", "fließ", "genieß", "gemäß", "grüß", "dreiß", "fleiß",
    "schweiß", "strauß", "gruß", "muß", "daß", "bißchen", "ließ", "hieß", "soß", "grieß", "spieß", "gefäß",
    "beiß", "schoß", "floß", "fraß", "drauß", "gleichmäß", "regelmäß", "übermäß", "zeitgemäß", "zweckmäß",
    "ordnungsgemäß", "vergröß", "einheitsgröß", "mittelgroß", "übergroß", "meiß", "verschließ", "anschließ",
    "abschließ", "einschließ", "ausschließ", "umschließ", "verschleiß", "reißfest", "weißgold", "blumenstrauß",
    "gießkanne", "kloß", "nuß", "schluß", "verschluß", "anschluß", "fluß", "kuß", "biß", "riß", "paß", "haß",
]
GRUPPE = 20


def token():
    t = os.environ.get("SHOPIFY_ADMIN_TOKEN") or ""
    if not t and os.path.exists("/tmp/cj_shop_token.txt"):
        t = open("/tmp/cj_shop_token.txt").read()
    return t.strip()


def gql(q, v=None):
    tok = token()
    if not tok:
        raise RuntimeError("kein Shopify-Token (/tmp/cj_shop_token.txt fehlt)")
    letzte = None
    for i in range(8):
        try:
            r = urllib.request.Request(
                "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                data=json.dumps({"query": q, "variables": v or {}}).encode(),
                headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(r, timeout=45).read())
            if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
                time.sleep(min(20, max(2, (1000 - float(ts.get("currentlyAvailable") or 0))
                                       / float(ts.get("restoreRate") or 100))))
                continue
            nachlauf(d)
            if d.get("data") is not None:
                return d
            letzte = d.get("errors")
        except Exception as e:  # noqa: BLE001
            letzte = f"{type(e).__name__}: {e}"
        time.sleep(3 * (i + 1))
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError(f"Shopify antwortet nicht ({str(letzte)[:150]}) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def umstellen(s):
    return s.replace("ß", "ss").replace("ẞ", "SS")


def hat_ss(*texte):
    return any(("ß" in (t or "")) or ("ẞ" in (t or "")) for t in texte)


def zaehle(q):
    pc = gql('query($q:String){productsCount(query:$q,limit:null){count precision}}', {"q": q})["data"]["productsCount"]
    return pc["count"], pc["precision"]


def export_zusatz():
    """Frischer Voll-Export (≤ 4 Tage) → IDs mit ß in Titel/Text (fängt ß mitten im Wort)."""
    dateien = sorted(glob.glob("/tmp/aktiv_bulk_*.jsonl"), key=os.path.getmtime)[-1:]
    if not dateien or time.time() - os.path.getmtime(dateien[0]) > 4 * 86400:
        print("  (kein Voll-Export ≤ 4 Tage — nur Live-Suche)", flush=True)
        return []
    ids = []
    for z in open(dateien[0], encoding="utf-8"):
        if "ß" not in z and "ẞ" not in z and "\\u00df" not in z and "\\u1e9e" not in z:
            continue
        try:
            o = json.loads(z)
        except ValueError:
            continue
        if o.get("id", "").startswith("gid://shopify/Product/") and hat_ss(o.get("title"), o.get("descriptionHtml")):
            ids.append(o["id"])
    print(f"  Zusatz aus {os.path.basename(dateien[0])}: {len(ids)} Produkte mit ß", flush=True)
    return ids


def kandidaten_live():
    n0, p0 = zaehle("status:active AND (xqzvwkss OR qqzzyxss)")
    if n0 != 0:
        print(f"PAUSE (Suchfilter wirkungslos: Unsinnswort ergibt {n0} {p0}) — kein Ergebnis ist kein Befund")
        return None
    np_, _ = zaehle("status:draft AND groß")
    print(f"  Gegenprobe: Unsinnswort 0 · «status:draft AND groß» = {np_} (Suche kennt ß-Wörter)", flush=True)
    ids, gesehen = [], set()
    for i in range(0, len(STAEMME), GRUPPE):
        q = "status:active AND (" + " OR ".join(STAEMME[i:i + GRUPPE]) + ")"
        n, p = zaehle(q)
        if n > 20000:
            print(f"  ⚠️ Gruppe {i // GRUPPE + 1}: {n} Treffer — Suchwörter wirken nicht, übersprungen", flush=True)
            continue
        cur, gef = None, 0
        while n:
            d = gql('query($q:String,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor}'
                    ' nodes{id title descriptionHtml}}}', {"q": q, "c": cur})
            pg = d["data"]["products"]
            for x in pg["nodes"]:
                if x["id"] not in gesehen and hat_ss(x.get("title"), x.get("descriptionHtml")):
                    gesehen.add(x["id"]); ids.append(x["id"]); gef += 1
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]
        print(f"  Gruppe {i // GRUPPE + 1}: {n} Suchtreffer ({p}), {gef} mit ß", flush=True)
    for gid in export_zusatz():
        if gid not in gesehen:
            gesehen.add(gid); ids.append(gid)
    return ids


def kandidaten_export(pfad):
    ids = []
    for zeile in open(pfad, encoding="utf-8"):
        try:
            p = json.loads(zeile)
        except ValueError:
            continue
        if p.get("id", "").startswith("gid://shopify/Product/") and hat_ss(p.get("title"), p.get("descriptionHtml")):
            ids.append(p["id"])
    return ids


def geerbte_sperre_freigeben():
    """Vom Aufseher geerbte Lauf-Sperre (TXTLOCK, fd 8) sofort lösen — die Kandidatensuche braucht keine Sperre,
    und wer sie während der Suche hält, blockiert du_form & Co. (23.09.: 80 Min Verklemmung Text-Sperre ↔
    Shopify-Schranke zwischen liechtenstein_raus und produkttexte_du_form)."""
    for fd in os.listdir("/proc/self/fd"):
        try:
            if os.readlink(f"/proc/self/fd/{fd}") == TEXTSPERRE:
                fcntl.flock(int(fd), fcntl.LOCK_UN); os.close(int(fd))
                print(f"  geerbte Lauf-Sperre (fd {fd}) freigegeben — gesperrt wird je Produkt", flush=True)
        except OSError:
            pass


class TextSperre:
    """Je Produkt sperren, nie für den ganzen Lauf. Einmal je Prozess anlegen.
    Der Aufseher startet dieses Werkzeug mit TXTLOCK (fd 8, gehalten für den GANZEN Lauf). Diese geerbte
    Sperre wird hier freigegeben — sonst wartete der Prozess beim Sperren je Produkt auf sich selbst
    (22.09.: 52 Min Selbst-Deadlock bei du_form, identisches Muster)."""

    def __init__(self, warte=300):
        self.warte = warte
        geerbte_sperre_freigeben()
        self.f = open(TEXTSPERRE, "a")

    def __enter__(self):
        def _frist(*a):
            raise TimeoutError(f"Text-Sperre seit {self.warte} s belegt")
        alt = signal.signal(signal.SIGALRM, _frist)
        signal.alarm(self.warte)
        try:
            fcntl.flock(self.f, fcntl.LOCK_EX)
        finally:
            signal.alarm(0); signal.signal(signal.SIGALRM, alt)
        return self

    def __exit__(self, *a):
        fcntl.flock(self.f, fcntl.LOCK_UN)
        time.sleep(0.2)


def ausschnitt(s, n=3):
    t = re.sub(r"<[^>]+>", " ", s or "")
    return " · ".join(t[max(0, m.start() - 25):m.end() + 25].strip() for m in list(re.finditer(r"[ßẞ]", t))[:n])


def main():
    print(f"ss_statt_scharf_s {time.strftime('%Y-%m-%d %H:%M')} · {'DRY' if DRY else 'SCHARF'} · Quelle {EXPORT}",
          flush=True)
    geerbte_sperre_freigeben()
    try:
        if EXPORT != "live" and os.path.exists(EXPORT):
            kandidaten = kandidaten_export(EXPORT)
        else:
            kandidaten = kandidaten_live()
    except RuntimeError as e:
        print(f"PAUSE ({e})"); return
    if kandidaten is None:
        return
    print(f"Kandidaten mit ß: {len(kandidaten)}", flush=True)
    if not kandidaten:
        print(f"{bilanz()}")
        print("FERTIG: 0 Produkte mit ß (Live-Suche + Export-Zusatz) — nichts umzustellen", flush=True)
        return

    sperre = None if DRY else TextSperre()
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    f = open(LEDGER, "a")
    n = schon = fehl = 0
    heute = time.strftime("%Y-%m-%d")
    for gid in kandidaten[:CAP]:
        try:
            if sperre:
                sperre.__enter__()
            try:
                d = gql('query($id:ID!){product(id:$id){title descriptionHtml status}}', {"id": gid})
                k = d["data"]["product"]
                if not k:
                    continue
                t, h = k.get("title") or "", k.get("descriptionHtml") or ""
                nt, nh = umstellen(t), umstellen(h)
                if nt == t and nh == h:
                    schon += 1
                    if not DRY:
                        f.write(f"{gid}\tlive-schon-sauber\t{heute}\n")
                    continue
                if DRY:
                    print(f"   {t[:60]} → {nt[:60]}  | {ausschnitt(h)}", flush=True)
                    n += 1
                    continue
                inp = {"id": gid}
                if nt != t:
                    inp["title"] = nt
                if nh != h:
                    inp["descriptionHtml"] = nh
                r = gql('mutation($p:ProductInput!){productUpdate(input:$p){userErrors{message}}}', {"p": inp})
                err = (r["data"].get("productUpdate") or {}).get("userErrors")
                if err:
                    print("✗", gid, err, flush=True); fehl += 1
                    continue
                zr = gql('query($id:ID!){product(id:$id){title descriptionHtml}}', {"id": gid})["data"]["product"] or {}
                if hat_ss(zr.get("title"), zr.get("descriptionHtml")):
                    print(f"✗ {gid}: Rücklesen zeigt noch ß", flush=True); fehl += 1
                    continue
                f.write(f"{gid}\tumgestellt\t{heute}\n")
                f.flush()
                n += 1
                if n % 100 == 0:
                    print(f"  … {n}", flush=True)
            finally:
                if sperre:
                    sperre.__exit__()
        except TimeoutError as e:
            print(f"PAUSE ({e}) — nächster Lauf macht weiter"); return
        except RuntimeError as e:
            print(f"PAUSE ({e})"); return
    print(f"{bilanz()}")
    wort = "würden umgestellt (DRY)" if DRY else "auf Schweizer Schreibung umgestellt (rückgelesen)"
    print(f"FERTIG: {n} Produkte {wort} · {schon} live schon sauber · {fehl} Fehler", flush=True)


if __name__ == "__main__":
    main()
