#!/usr/bin/env python3
"""cj_real_luecke.py — CJ-Ware ohne Tag «cj-real» finden und nachtragen (14.10.2026).

WARUM: Alle Lieferbarkeits-Wächter wählen ihre Arbeit über den Tag «cj-real» (cj_lager_abgleich Bulk «tag:cj-real
status:active», cj_verfuegbarkeit, cj_stock_guard, cj_varianten_wache, cj_versand_ch_sichtbar). Die Importgruppe
«cjwerkzeug» in automation/cj_groups_extra.json trug den Tag nicht. GEMESSEN 14.10. ~13:15 UTC: 1'331 aktive Produkte
mit CJ-SKU ohne «cj-real» (1'084 mit Tag werkzeug), alle CONTINUE + tracksInventory false = immer kaufbar, auch wenn
CJ ausverkauft oder ausgelistet hat (Ghost-Sale-Klasse #1019/#1006/#1009). Quelle repariert (Gruppe + Zwangszeile
CJ_REAL_PFLICHT in cj_category_fill.mjs); dieses Werkzeug hält den Bestand auf Soll 0.

REGEL (eine Quelle: cj_form unten):
  * Kandidat = aktives Produkt, gefunden mit «status:active AND sku:CJ* AND -tag:cj-real» (Shopify-Suche, Gross-/Klein-
    schreibung egal, gemessen: sku:cj* = sku:CJ* = 1'331), das live noch kein «cj-real» trägt UND mindestens eine
    Variante in einer der drei CJ-Formen hat:
      CJ-<Zahl 15–20>  (pid)           CJ-2606160740461633600
      CJ-<UUID>        (ältere pid)    CJ-5AF5A72D-0897-4AF6-AFF5-D6A33F2D3A01
      [CJ-]CJ<2–8 Buchstaben><≥5 Ziffern>…  (CJ-Varianten-/Produkt-SKU)  CJYD291508502BY, CJ-CJJZGJSD00513-Red
  * «CJ-» allein beweist nichts (Lehre 20.08., ohne_lieferantenref_guard): frei getippte Slugs wie «CJ-SHOWERCADDY-5SET»
    zählen als «unprüfbar» — gemeldet, nie getaggt.
  * Werbetest-Sperre (dropship/_werbetest_sperre.txt verbietet bis 24.10. auch Tags) → übersprungen und gemeldet.
  * Geschrieben wird NUR tagsAdd ['cj-real'] (nie productUpdate(tags:) — ersetzt alle Tags), in Alias-Bündeln à 20,
    neueste zuerst, höchstens CAP (Standard 500) je Lauf; je Bündel zurückgelesen; nur Bestätigte ins Ledger.
  * Entwürfe werden nur GEZÄHLT (2'394 am 14.10., davon 2'074 duplikat-auto-draft) — ein Rückholer, der einen davon
    aktiviert, landet beim nächsten Lauf hier.

LEDGER dropship/_cj_real_nachtrag.tsv: «zeit<TAB>gid<TAB>handle» je Nachtrag; der Rückweg schreibt «…<TAB>zurueck».

AUSGABE: immer eine Zeile «CJ-REAL-LÜCKE: n aktiv (…)»; bei Fehler «CJ-REAL-LÜCKE: unklar (Grund)» + «PAUSE: …», nie 0.
EXIT (für den Aufseher, NACH-Liste): 0 = keine CJ-Form-Lücke mehr offen · 1 = noch offen (nächster Tick setzt fort)
      · 2 = unklar (Netz/Shopify) · 3 = Selbsttest rot.

  python3 automation/cj_real_luecke.py                    # DRY (Standard): zählen + Liste + Stichproben, schreibt nichts
  python3 automation/cj_real_luecke.py --pruefen          # nur Zählung + Zeile (keine Liste)
  SCHARF=1 [CAP=500] python3 automation/cj_real_luecke.py # Nachtrag tagsAdd ['cj-real']
  python3 automation/cj_real_luecke.py --zurueck          # DRY: was der Rückweg entfernen würde
  SCHARF=1 python3 automation/cj_real_luecke.py --zurueck # tagsRemove ['cj-real'] für alle Ledger-Einträge
  python3 automation/cj_real_luecke.py --gegenfall        # zählt CJ-Ware OHNE «CJ»-Präfix ohne cj-real (behebt nichts)
  python3 automation/cj_real_luecke.py --selbsttest       # ohne Netz
"""
import collections
import datetime as dt
import fcntl
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
LEDGER = os.path.join(REPO, "dropship", "_cj_real_nachtrag.tsv")
GRUPPEN = os.path.join(HIER, "cj_groups_extra.json")
IMPORTER = os.path.join(HIER, "cj_category_fill.mjs")
IMPORT_LEDGER = os.path.join(REPO, "dropship", "cj_niche_done.txt")
SCHREIB_SPERRE = "/tmp/cj_real_luecke_schreib.lock"   # NICHT /tmp/lock_cj_real_luecke.lock — den hält der Aufseher (fd 9)
TAG = "cj-real"
Q_AKTIV = "status:active AND sku:CJ* AND -tag:cj-real"
Q_ENTWURF = "status:draft AND sku:CJ* AND -tag:cj-real"
Q_GEGENFALL = "status:active AND -tag:cj-real AND -sku:CJ*"
SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "500"))
BUENDEL = 20
STICHPROBEN = 20

_UUID = r"[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"


def cj_form(sku):
    """True, wenn die SKU die FORM einer echten CJ-Referenz hat (pid-Zahl, pid-UUID oder CJ-Varianten-SKU).
    Präfix «CJ» ist Pflicht (die Suche sku:CJ* liefert nur solche); «CJ-» vor einem freien Slug zählt nicht."""
    s = (sku or "").strip()
    if not re.match(r"^CJ", s, re.I):
        return False
    kern = re.sub(r"^CJ-", "", s, flags=re.I)
    if re.fullmatch(r"\d{15,20}", kern):
        return True
    if re.fullmatch(_UUID, kern, re.I):
        return True
    return bool(re.match(r"^CJ[A-Z]{2,8}\d{5,}", kern, re.I))


def sku_form(sku):
    """Name der Form für die Statistik."""
    s = (sku or "").strip()
    kern = re.sub(r"^CJ-", "", s, flags=re.I)
    if not re.match(r"^CJ", s, re.I):
        return "ohne-CJ-Präfix"
    if re.fullmatch(r"\d{15,20}", kern):
        return "CJ-<pid-Zahl>"
    if re.fullmatch(_UUID, kern, re.I):
        return "CJ-<pid-UUID>"
    if re.match(r"^CJ[A-Z]{2,8}\d{5,}", kern, re.I):
        return "CJ<Varianten-SKU>"
    return "CJ-freier-Slug"


def gruppen_ohne_tag(gruppen):
    """→ Liste der Gruppen-Schlüssel, deren tags «cj-real» NICHT enthalten (Soll: leer)."""
    return sorted(k for k, g in (gruppen or {}).items() if TAG not in ((g or {}).get("tags") or []))


def importer_ok(text):
    """Quelle repariert? Zwangszeile da und kein tag-ersetzendes productUpdate im Bild-Fehlerpfad."""
    pflicht = "CJ_REAL_PFLICHT" in text and re.search(r"tagsFinal=\[\.\.\.tagsFinal,'cj-real'\]", text) is not None
    ersetzt = re.search(r"status:'DRAFT',tags:\['bilder-fehlgeschlagen'\]", text) is not None
    return pflicht and not ersetzt


def alias_mutation(ids, feld="tagsAdd"):
    """Ein Bündel → eine Mutation mit Aliasen a0..aN (IDs als JSON-Literale, nur Produkt-GIDs erlaubt)."""
    teile = []
    for i, gid in enumerate(ids):
        if not re.fullmatch(r"gid://shopify/Product/\d+", gid or ""):
            raise ValueError(f"keine Produkt-GID: {gid!r}")
        teile.append(f'a{i}:{feld}(id:{json.dumps(gid)},tags:["{TAG}"]){{userErrors{{field message}}}}')
    return "mutation{" + " ".join(teile) + "}"


def ledger_lesen(pfad=LEDGER):
    """→ {gid: handle} der nachgetragenen und NICHT zurückgenommenen Produkte (Reihenfolge der Datei)."""
    aktiv = {}
    try:
        for z in open(pfad, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) < 3 or not t[1].startswith("gid://"):
                continue
            if len(t) >= 4 and t[3] == "zurueck":
                aktiv.pop(t[1], None)
            else:
                aktiv[t[1]] = t[2]
    except OSError:
        pass
    return aktiv


def zeile(n, teile=None, grund=None):
    if n is None:
        return f"CJ-REAL-LÜCKE: unklar ({grund or 'kein Messwert'})"
    return f"CJ-REAL-LÜCKE: {n} aktiv" + (f" ({' · '.join(teile)})" if teile else "")


# ───────────────────────────── Netz ─────────────────────────────
def _gql():
    from kaufwille_zeile import gql   # Retry + Drossel + Eimer-Nachlauf (eimer_etikette)
    return gql


def zaehlen(q):
    d = _gql()('query($q:String){productsCount(query:$q, limit:null){count precision}}', {"q": q})["productsCount"]
    if d.get("precision") != "EXACT":
        raise RuntimeError(f"productsCount nicht EXACT ({d.get('precision')}) für {q}")
    return int(d["count"])


def holen(q):
    """Alle Produkte der Suche, NEUESTE ZUERST, mit Live-Tags und SKUs (erste 10 Varianten genügen: Formen nie gemischt,
    gemessen 0 von 1'331)."""
    gql = _gql()
    out, cur = [], None
    while True:
        d = gql('''query($c:String,$q:String){products(first:100,after:$c,query:$q,sortKey:CREATED_AT,reverse:true){
                   pageInfo{hasNextPage endCursor}
                   nodes{id handle title status createdAt productType tags variants(first:10){nodes{sku}}}}}''',
                {"c": cur, "q": q})["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def einteilen(produkte):
    """→ dict mit Listen: kandidat, unpruefbar, gesperrt, schon (Index hinkt: trägt cj-real schon), nicht_aktiv."""
    from werbetest_sperre import gesperrt
    teil = {k: [] for k in ("kandidat", "unpruefbar", "gesperrt", "schon", "nicht_aktiv")}
    for p in produkte:
        skus = [v.get("sku") or "" for v in (p.get("variants") or {}).get("nodes") or []]
        if p.get("status") != "ACTIVE":
            teil["nicht_aktiv"].append(p)
        elif TAG in (p.get("tags") or []):
            teil["schon"].append(p)
        elif not any(cj_form(s) for s in skus):
            teil["unpruefbar"].append(p)
        elif gesperrt(p["id"]) or gesperrt(p.get("handle")):
            teil["gesperrt"].append(p)
        else:
            teil["kandidat"].append(p)
    return teil


def erste_sku(p):
    vs = (p.get("variants") or {}).get("nodes") or []
    return next((v.get("sku") for v in vs if cj_form(v.get("sku"))), (vs[0].get("sku") if vs else "")) or ""


def verteilung(ps):
    def muster(p):
        t = set(p.get("tags") or [])
        if "werkzeug" in t:
            return "werkzeug"
        if "heimwerken" in t:
            return "heimwerken"
        if "dropship" in t:
            return "dropship (andere Gruppe)"
        return "ohne Gruppen-Tag"
    print("  Tag-Muster:  " + " · ".join(f"{k} {v}" for k, v in collections.Counter(map(muster, ps)).most_common()))
    print("  SKU-Form:    " + " · ".join(f"{k} {v}" for k, v in collections.Counter(sku_form(erste_sku(p)) for p in ps).most_common()))
    print("  Anlagemonat: " + " · ".join(f"{k} {v}" for k, v in sorted(collections.Counter((p.get('createdAt') or '')[:7] for p in ps).items())))
    print("  Typ (Top 10): " + " · ".join(f"{k or '—'} {v}" for k, v in collections.Counter(p.get('productType') for p in ps).most_common(10)))
    sperr = collections.Counter(t for p in ps for t in (p.get("tags") or []) if t in ("raucher", "18plus", "waffe-pruefen", "nur-onlineshop"))
    if sperr:
        print("  Sperr-Tags (bleiben, nur tagsAdd): " + " · ".join(f"{k} {v}" for k, v in sperr.most_common()))


def stichproben(ps, n=STICHPROBEN):
    # gleichmässig über die Liste (neueste … älteste), damit alle Monate vorkommen
    if len(ps) <= n:
        wahl = ps
    else:
        schritt = len(ps) / n
        wahl = [ps[int(i * schritt)] for i in range(n)]
    for p in wahl:
        print(f"    {p['createdAt'][:10]}  {erste_sku(p)[:34]:34}  {(p.get('productType') or '')[:22]:22}  {p['handle'][:60]}")


def nachtragen(kand):
    """tagsAdd in Alias-Bündeln, je Bündel zurücklesen, nur Bestätigte ins Ledger. → (bestätigt, fehler)."""
    gql = _gql()   # kaufwille_zeile.gql ruft nach JEDER Antwort eimer_etikette.nachlauf (Eimer-Boden für Massen-Schreiber)
    bestaetigt, fehler = 0, 0
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    with open(LEDGER, "a", encoding="utf-8") as led:
        for k in range(0, len(kand), BUENDEL):
            b = kand[k:k + BUENDEL]
            ids = [p["id"] for p in b]
            r = gql(alias_mutation(ids, "tagsAdd"))
            ue = [(ids[i], e) for i in range(len(ids)) for e in ((r.get(f"a{i}") or {}).get("userErrors") or [])]
            for gid, e in ue[:3]:
                print(f"  ✗ {gid}: {e.get('message')}", flush=True)
            ist = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id tags}}}', {"ids": ids})["nodes"]
            ok = {n["id"] for n in ist if n and TAG in (n.get("tags") or [])}
            jetzt = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            for p in b:
                if p["id"] in ok:
                    led.write(f"{jetzt}\t{p['id']}\t{p['handle']}\n"); bestaetigt += 1
                else:
                    fehler += 1
            led.flush()
            if (k // BUENDEL) % 5 == 4:
                print(f"  … {bestaetigt} nachgetragen, {fehler} nicht bestätigt", flush=True)
    return bestaetigt, fehler


def _schreibsperre():
    global _sp
    _sp = open(SCHREIB_SPERRE, "w")
    try:
        fcntl.flock(_sp, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("Ein anderer schreibender Lauf hält die Sperre — dieser macht nichts.", flush=True)
        raise SystemExit(0)


_sp = None


def main(nur_pruefen=False):
    try:
        n = zaehlen(Q_AKTIV)
        d = zaehlen(Q_ENTWURF)
        produkte = holen(Q_AKTIV) if n else []
        teil = einteilen(produkte)
    except Exception as e:
        print(zeile(None, grund=f"{type(e).__name__}: {str(e)[:100]}"), flush=True)
        print("PAUSE: Messung unklar — nächster Versuch frühestens in 1 h", flush=True)
        return 2
    kand = teil["kandidat"]
    teile = [f"CJ-Form {len(kand)}", f"unprüfbar {len(teil['unpruefbar'])}", f"Werbetest-Sperre {len(teil['gesperrt'])}",
             f"Entwürfe {d}"]
    if teil["schon"]:
        teile.append(f"Index hinkt {len(teil['schon'])}")
    if len(produkte) != n:
        teile.append(f"gelesen {len(produkte)}")
    if not SCHARF or nur_pruefen:
        print(zeile(n, teile + ([] if nur_pruefen else ["DRY"])), flush=True)
        if not nur_pruefen:
            if kand:
                print(f"\nKandidaten ({len(kand)}, neueste zuerst; ein SCHARF-Lauf nähme höchstens CAP {CAP}):")
                verteilung(kand)
                print(f"  Stichproben ({min(STICHPROBEN, len(kand))}, gleichmässig von neu nach alt):")
                stichproben(kand)
            for name, titel in (("unpruefbar", "Unprüfbar (CJ-Präfix, aber keine CJ-Form — NIE taggen; ohne_lieferantenref_guard meldet sie)"),
                                ("gesperrt", "Werbetest-Sperre (bis Ende der Sperre nicht schreiben)")):
                if teil[name]:
                    print(f"\n{titel}:")
                    for p in teil[name][:20]:
                        print(f"    {erste_sku(p)[:34]:34}  {p['handle'][:70]}")
        return 1 if kand else 0
    _schreibsperre()
    los = kand[:CAP]
    try:
        ok, fehler = nachtragen(los)
    except Exception as e:
        print(zeile(None, grund=f"Schreiben abgebrochen: {type(e).__name__}: {str(e)[:90]}"), flush=True)
        print("PAUSE: Schreiben unklar — nächster Versuch frühestens in 1 h (Ledger enthält nur Bestätigte)", flush=True)
        return 2
    offen = len(kand) - ok
    print(zeile(n, teile + [f"nachgetragen {ok}", f"nicht bestätigt {fehler}", f"offen {offen}"]), flush=True)
    return 1 if offen > 0 else 0


def zurueck():
    eintraege = ledger_lesen()
    if not eintraege:
        print("CJ-REAL-LÜCKE Rückweg: Ledger leer — nichts zu tun"); return 0
    gql = _gql()
    from werbetest_sperre import gesperrt
    ids = list(eintraege)
    tragen = []
    for k in range(0, len(ids), 100):
        for n in gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle tags}}}', {"ids": ids[k:k + 100]})["nodes"]:
            if n and TAG in (n.get("tags") or []) and not (gesperrt(n["id"]) or gesperrt(n.get("handle"))):
                tragen.append(n)
    print(f"CJ-REAL-LÜCKE Rückweg: Ledger {len(ids)} · tragen cj-real noch {len(tragen)} · {'SCHARF' if SCHARF else 'DRY'}")
    if not SCHARF:
        return 0
    _schreibsperre()
    weg = 0
    with open(LEDGER, "a", encoding="utf-8") as led:
        for k in range(0, len(tragen), BUENDEL):
            b = [p["id"] for p in tragen[k:k + BUENDEL]]
            gql(alias_mutation(b, "tagsRemove"))
            ist = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id tags}}}', {"ids": b})["nodes"]
            frei = {n["id"] for n in ist if n and TAG not in (n.get("tags") or [])}
            jetzt = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            for gid in b:
                if gid in frei:
                    led.write(f"{jetzt}\t{gid}\t{eintraege.get(gid, '')}\tzurueck\n"); weg += 1
            led.flush()
    print(f"CJ-REAL-LÜCKE Rückweg: {weg} von {len(tragen)} entfernt (Ledger-Zeilen «zurueck»)")
    return 0 if weg == len(tragen) else 1


def gegenfall():
    """Aktive Ware OHNE «CJ»-Präfix und ohne cj-real, deren SKU eine CJ-pid sein könnte (Zahl 15–20 / UUID) und die im
    CJ-Import-Ledger steht. Zählen, nicht beheben. (14.10.: 0 von 2'900 — die 10 UUIDs sind Gelato-Poster.)"""
    try:
        led = {z.strip()[3:].upper() for z in open(IMPORT_LEDGER, encoding="utf-8") if z.startswith("cj:")}
        ps = holen(Q_GEGENFALL)
    except Exception as e:
        print(f"CJ-REAL-GEGENFALL: unklar ({type(e).__name__}: {str(e)[:80]})"); return 2
    form = collections.Counter(); treffer = []
    for p in ps:
        for v in (p.get("variants") or {}).get("nodes") or []:
            s = (v.get("sku") or "").strip()
            if re.fullmatch(r"\d{15,20}", s) or re.fullmatch(_UUID, s, re.I):
                form["pid-förmig"] += 1
                if s.upper() in led:
                    treffer.append((p["handle"], s)); break
    print(f"CJ-REAL-GEGENFALL: {len(treffer)} CJ-Ware ohne CJ-Präfix (von {len(ps)} aktiven ohne cj-real/ohne sku:CJ*; "
          f"pid-förmige SKUs {form['pid-förmig']}, im CJ-Import-Ledger {len(treffer)})")
    for h, s in treffer[:20]:
        print(f"    {s}  {h}")
    return 0


def selbsttest():
    t = []
    # (a) Gruppen-Datei: jede Gruppe trägt cj-real (+ Köder: Gruppe ohne Tag MUSS auffallen)
    try:
        g = json.load(open(GRUPPEN, encoding="utf-8"))
        t.append((gruppen_ohne_tag(g) == [], f"cj_groups_extra.json: jede Gruppe hat «cj-real» ({len(g)} Gruppen)"))
        koeder = json.loads(json.dumps(g))
        k0 = next(iter(koeder))
        koeder[k0]["tags"] = [x for x in koeder[k0]["tags"] if x != TAG]
        t.append((gruppen_ohne_tag(koeder) == [k0], f"Köder: Gruppe «{k0}» ohne cj-real fällt auf"))
    except Exception as e:
        t.append((False, f"cj_groups_extra.json lesbar ({e})"))
    # (b) SKU-Regel — Kanarienvögel aus dem Live-Bestand vom 14.10.
    faelle = [
        ("CJ-2606160740461633600", True, "pid-Zahl"),
        ("CJ-5AF5A72D-0897-4AF6-AFF5-D6A33F2D3A01", True, "pid-UUID"),
        ("CJYD291508502BY", True, "Varianten-SKU ohne Präfix"),
        ("CJ-CJYD292641701AZ-Black", True, "Varianten-SKU mit Präfix + Zusatz"),
        ("CJJZGJSD00513-Q4 pic a set", True, "Werkzeug-SKU mit Variantenname"),
        ("cj-CJBQ2934265", True, "kleines cj-"),
        ("CJ-SHOWERCADDY-5SET", False, "frei getippter Slug (Juni) — unprüfbar"),
        ("CJ-ANTIGRAV-HUMID", False, "getarnter Slug"),
        ("2606160740461633600", False, "pid ohne CJ-Präfix (Gegenfall, nur gezählt)"),
        ("b56083b3-67ee-4716-ab35-3249da7aa0f9", False, "Gelato-UUID ohne CJ"),
        ("fortura-12345", False, "Fortura"),
        ("5599797_4012", False, "Printful"),
        ("200000182:193#black cologne", False, "AliExpress-Altimport"),
        ("", False, "leer"),
    ]
    for s, soll, name in faelle:
        t.append((cj_form(s) is soll, f"SKU-Regel: {name} ({s or '«»'}) → {soll}"))
    # (c) Quelle im Importer
    try:
        t.append((importer_ok(open(IMPORTER, encoding="utf-8").read()), "cj_category_fill.mjs: CJ_REAL_PFLICHT da, kein tag-ersetzendes DRAFT"))
    except OSError as e:
        t.append((False, f"cj_category_fill.mjs lesbar ({e})"))
    t.append((not importer_ok("productSet ... tags:[...tagsFinal]"), "Köder: Importer ohne Zwangszeile fällt auf"))
    # (d) Alias-Mutation
    m = alias_mutation(["gid://shopify/Product/1", "gid://shopify/Product/22", "gid://shopify/Product/333"])
    t.append((m.count("tagsAdd(") == 3 and "a2:" in m and "productUpdate" not in m and '"cj-real"' in m, "Alias-Bündel: 3× tagsAdd, nie productUpdate"))
    try:
        alias_mutation(['x")){x}'])
        t.append((False, "Alias-Bündel lehnt Nicht-GID ab"))
    except ValueError:
        t.append((True, "Alias-Bündel lehnt Nicht-GID ab"))
    # (e) Zeile: Fehler nie als 0
    t.append(("unklar" in zeile(None, grund="x") and " 0 " not in zeile(None, grund="x"), "Fehler → «unklar», nie 0"))
    t.append((zeile(3, ["CJ-Form 3"]) == "CJ-REAL-LÜCKE: 3 aktiv (CJ-Form 3)", "Zeilenformat"))
    # (f) Ledger: Nachtrag + Rückweg
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".tsv", delete=False, encoding="utf-8") as f:
        f.write("2026-10-14T13:00:00Z\tgid://shopify/Product/1\ta\n2026-10-14T13:00:00Z\tgid://shopify/Product/2\tb\n"
                "2026-10-14T14:00:00Z\tgid://shopify/Product/1\ta\tzurueck\nkaputt\n")
    try:
        t.append((ledger_lesen(f.name) == {"gid://shopify/Product/2": "b"}, "Ledger: zurückgenommene fallen raus"))
    finally:
        os.unlink(f.name)
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}")
    return 0 if ok == len(t) else 3


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    if "--zurueck" in a:
        sys.exit(zurueck())
    if "--gegenfall" in a:
        sys.exit(gegenfall())
    sys.exit(main(nur_pruefen="--pruefen" in a))
