#!/usr/bin/env python3
"""cj_ausgelistet_sichtbar.py — prüft die SICHTBAR beworbene CJ-Ware erneut darauf, ob CJ sie ausgelistet hat (27.09.2026).

ANLASS #1019: «Leuchtender Halloween-Schaukelgeist» wurde um 21:27 verkauft; CJ lehnte den Auftrag ab («Produkt
entfernt», API 1602002 «removed from shelves»). cj_verfuegbarkeit.py prüft jedes Produkt nur EINMAL (Ledger: 49'097
«schon geprüft») — ein Artikel, der beim Import lieferbar war und später ausgelistet wird, bleibt dort für immer grün.
Dieser Wächter prüft täglich die Kollektionen, die wir gerade bewerben (Startseite, Saison, Social), neu.

Regel: CJ antwortet 1602002 (ausgelistet) → DRAFT + Tags cj-entfernt / cj-entfernt-<datum> (tagsAdd, nie tags: ersetzen —
productUpdate(tags:) löscht alle anderen Tags, eigener Fehler 27.09.). Jede andere Antwort (Netz, Drossel, unklar) = kein Urteil.
Bericht: dropship/CJ-AUSGELISTET-SICHTBAR.md.   DRY=1 meldet nur.
"""
import datetime, json, os, re, subprocess, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from cj_takt import takt  # noqa: E402  (1/s-Drossel, gemeinsam mit allen CJ-Skripten)
import urllib.parse  # noqa: E402
import cj_sku  # noqa: E402  (20.10.2026: EINE Quelle für CJ-SKU-Formen)
import cj_nachpruefung_netz as netz  # noqa: E402  (21.10.2026: Stand, Tagesziel, Ampelzeile)

SHOP = "au3j0y-hq.myshopify.com"
DRY = os.environ.get("DRY") == "1"
KOLLEKTIONEN = ["halloween", "herbst-favoriten", "hype-jetzt", "bestseller", "neu-eingetroffen", "weihnachten-2026"]
BERICHT = os.path.join(REPO, "dropship", "CJ-AUSGELISTET-SICHTBAR.md")
PRO_KOLLEKTION = int(os.environ.get("PRO_KOLLEKTION", "200"))


def stok():
    return (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()


def gql(q, v=None):
    # 28.09.: Grund nicht mehr verschlucken (zweites_gehirn «grund-verschluckt») — der Wächter der #1019-Klasse muss sagen,
    # WARUM er aufgibt (Drossel, 401, GraphQL-Fehler), sonst sieht «Shopify nicht erreichbar» wie ein Netzproblem aus.
    grund = "?"
    for a in range(5):
        r = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                   headers={"X-Shopify-Access-Token": stok(), "Content-Type": "application/json"})
        try:
            j = json.load(urllib.request.urlopen(r, timeout=60))
            if j.get("data"):
                return j["data"]
            grund = "GraphQL: " + json.dumps(j.get("errors") or j)[:200]
        except Exception as e:
            grund = f"{type(e).__name__}: {str(e)[:200]}"
        print(f"  gql Versuch {a + 1}/5: {grund}", file=sys.stderr, flush=True)
        time.sleep(3 * (a + 1))
    raise SystemExit(f"Shopify nicht erreichbar — letzter Grund: {grund}")


def cj_status(pid, tok):
    """'weg' (1602002), 'ok' (Produkt geliefert), 'eimer' (API-Punkte-Eimer leer, 16900500), 'unklar' (1602001 «Produkt unbekannt»
    — ein Urteil über die Abfrage, keins über das Produkt) oder None (Netz/Drossel/sonst nichts).
    21.10.2026 (Spähtrupp W1): 16900500 war None und zählte 54–60 % aller Fragen als «ohne Urteil» — jede mit Takt-Verbrauch; der Lauf fragte
    einen leeren Eimer stundenlang ab. Kontozustand ist kein Produkturteil (Vault-Falle 23.09.).
    27.09.: Zwei SKU-Formen — «CJ-<Zahl/UUID>» = Produkt-ID (?pid=), «CJ-CJYD…AZ» = Varianten-SKU (?variantSku=). Der erste
    Lauf fragte beide als pid: 205 von 645 «ohne Urteil» (CJ: 1602001 «Product not found: pid:CJYD…»)."""
    feld = "pid" if re.fullmatch(r"[0-9]{10,}|[0-9A-Fa-f-]{30,}", pid) else (cj_sku.abfrage(pid) or ("variantSku", pid))[0]
    for a in range(3):
        takt()
        out = subprocess.run(["curl", "-s", "--max-time", "40", "-H", f"CJ-Access-Token: {tok}",
                              f"https://developers.cjdropshipping.com/api2.0/v1/product/query?{feld}={urllib.parse.quote(pid, safe='')}"], capture_output=True, text=True).stdout
        try:
            j = json.loads(out)
        except Exception:
            time.sleep(3); continue
        if j.get("code") == 1602002:
            return "weg"
        if j.get("code") in (200, 0) and (j.get("data") or {}).get("pid"):
            return "ok"
        if str(j.get("code")) == "16900500":
            return "eimer"
        if j.get("code") == 1602001:
            return "unklar"
        if j.get("code") == 1600200:
            time.sleep(8); continue
        return None
    return None


NACHPRUEF = os.path.join(REPO, "dropship", "_cj_nachpruefung.tsv")   # gid \t datum \t urteil (ok/weg) — jede Prüfung sofort
ZYKLUS_TAGE = int(os.environ.get("ZYKLUS_TAGE", "30"))              # Rest-Bestand: jedes Produkt spätestens alle N Tage
ROLLEN = int(os.environ.get("ROLLEN", "1500"))                      # Rest-Bestand je Lauf (CJ: 10 Punkte je Abfrage)
SKU_PID = re.compile(r"^CJ-([0-9]{10,}|[0-9A-Fa-f-]{30,})$")          # CJ-<Produkt-ID>
SKU_VAR = re.compile(r"^(?:CJ-)?(CJ[A-Z]{2,4}[0-9]{6,}[A-Z0-9]*)$")   # CJYD304327501AZ, CJ-CJLY291609201AZ


def cj_ref(sku):
    """CJ-Referenz aus der Shop-SKU. 28.09.: die alte Regel «^CJ-…» übersah Varianten-SKUs OHNE Präfix (CJLY…AZ) —
    dieselbe Falle wie besuchte_seiten_lieferbar.py am 18.09. (33 von 35 «keine CJ-SKU»).
    20.10.2026: SKU_VAR kannte nur 2–4 Buchstaben + Ziffern ohne Bindestrich — 3'466 Varianten («CJYDQXHB00011-BROWN-39») waren für diesen
    Wächter unsichtbar: ein bei CJ ausgelistetes Produkt blieb im Verkauf. Jetzt entscheidet cj_sku.abfrage() (Feld UND Wert)."""
    a = cj_sku.abfrage(sku)
    return a[1] if a else None


def ledger():
    stand = {}
    if os.path.exists(NACHPRUEF):
        for l in open(NACHPRUEF, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 3 and t[1] > stand.get(t[0], ("", ""))[0]:
                stand[t[0]] = (t[1], t[2])
    return stand


def sichtbare_ware():
    """Stufe A — alles, was eine Kundin heute sieht: beworbene Kollektionen (ganz, nur neu-eingetroffen gekappt),
    besuchte Produktseiten (90 T), Produkte in den wartenden Social-Posts, gekaufte Lieblinge."""
    ware, quelle = {}, {}
    def nimm(p, woher):
        v = p["variants"]["nodes"]
        ref = cj_ref(v[0]["sku"] if v else "")
        if p["status"] == "ACTIVE" and ref and p["id"] not in ware:
            ware[p["id"]] = (ref, p["handle"], p["title"], woher)
    NODE = "nodes{id handle title status variants(first:1){nodes{sku}}}"
    for h in KOLLEKTIONEN:
        cur, n = None, 0
        while True:
            d = gql('query($h:String!,$c:String){collectionByHandle(handle:$h){products(first:100,after:$c){pageInfo{hasNextPage endCursor} ' + NODE + '}}}', {"h": h, "c": cur})
            c = d.get("collectionByHandle")
            if not c:
                break
            for p in c["products"]["nodes"]:
                nimm(p, h); n += 1
            if not c["products"]["pageInfo"]["hasNextPage"] or (h == "neu-eingetroffen" and n >= PRO_KOLLEKTION):
                break
            cur = c["products"]["pageInfo"]["endCursor"]
    quelle["kollektionen"] = len(ware)
    handles = set()
    try:   # besuchte Produktseiten (dieselbe Abfrage wie besuchte_seiten_lieferbar.py)
        q = ('{ shopifyqlQuery(query: "FROM sessions SHOW sessions GROUP BY landing_page_path '
             "WHERE human_or_bot_session = 'human' SINCE -90d ORDER BY sessions DESC LIMIT 500\") { parseErrors tableData { rows } } }")
        for r in (gql(q)["shopifyqlQuery"].get("tableData") or {}).get("rows") or []:
            pfad = (r.get("landing_page_path") or "").split("?")[0]
            if "/products/" in pfad:
                handles.add(pfad.rsplit("/products/", 1)[1].strip("/"))
        quelle["besucht"] = len(handles)
    except Exception as e:
        print(f"  ⚠️ besuchte Seiten nicht lesbar: {e}", flush=True)
    import csv, glob
    for f in ["automation/reels_seed.csv", "social/posts_image.csv", "social/ig_karussell.csv"]:
        try:
            for r in csv.DictReader(open(os.path.join(REPO, f), encoding="utf-8")):
                if (r.get("status") or "").strip() == "ready":
                    handles.update(re.findall(r"luxestyle\.ch/products/([a-z0-9-]+)", " ".join(str(v) for v in r.values())))
        except Exception:
            pass
    quelle["besucht+social"] = len(handles)
    liste = sorted(handles)
    for k in range(0, len(liste), 40):
        q = " OR ".join(f"handle:{h}" for h in liste[k:k + 40])
        for p in gql('query($q:String!){products(first:50,query:$q){' + NODE + '}}', {"q": q})["products"]["nodes"]:
            nimm(p, "besucht/social")
    d = gql('{products(first:100,query:"tag:kunden-liebling status:active"){' + NODE + '}}')
    for p in d["products"]["nodes"]:
        nimm(p, "kunden-liebling")
    quelle["gesamt"] = len(ware)
    return ware, quelle


def rest_bestand(schon, stand):
    """Stufe B — der übrige aktive CJ-Bestand, rollierend: nie geprüft zuerst, dann die ältesten. Quelle: die geteilten
    Exporte (/tmp/export.jsonl = Status, /tmp/kost28.jsonl = SKU). Fehlt einer oder hat das falsche Format → Stufe B
    meldet sich ab (kein stilles «0 geprüft»)."""
    try:
        aktiv = {}
        for l in open("/tmp/export.jsonl", encoding="utf-8"):
            d = json.loads(l)
            if d.get("status") == "ACTIVE":
                aktiv[d["id"]] = (d.get("handle") or "", d.get("title") or "")
        sku = {}
        for l in open("/tmp/kost28.jsonl", encoding="utf-8"):
            d = json.loads(l)
            par = d.get("__parentId")
            if par and par in aktiv and par not in sku:
                ref = cj_ref(d.get("sku"))
                if ref:
                    sku[par] = ref
    except Exception as e:
        print(f"  ⚠️ Stufe B aus: Exporte nicht lesbar ({e}) — nur Stufe A", flush=True)
        return {}, 0
    grenze = (datetime.date.today() - datetime.timedelta(days=ZYKLUS_TAGE)).isoformat()
    faellig = [g for g in sku if g not in schon and stand.get(g, ("", ""))[0] < grenze]
    # 01.10.2026: Verdacht zuerst — der Kosten-Nachtrag hat 69 AKTIVE Produkte schon als «removed from shelves» (1602002)
    # quittiert (`cj-abgekuendigt-pruefen`), aber nie vollstreckt; im 30-T-Zyklus kämen sie irgendwann dran (#1019-Klasse).
    try:
        verdacht = {l.split("\t")[0] for l in open(os.path.join(REPO, "dropship", "_cj_kosten_done.txt"), encoding="utf-8")
                    if "\tcj-abgekuendigt-pruefen" in l}
    except OSError:
        verdacht = set()
    faellig.sort(key=lambda g: (g not in verdacht, stand.get(g, ("", ""))[0]))
    return {g: (sku[g], aktiv[g][0], aktiv[g][1], "rest") for g in faellig[:ROLLEN]}, len(sku)


def main():
    # 21.10.2026: «START » als ERSTE Zeile — der Aufseher (still_gestorben/letzter_lauf) erkennt damit einen gestorbenen Lauf auch dann,
    # wenn das FERTIG des Vortags noch im Log steht.
    print(f"START {datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')} (cj_ausgelistet_sichtbar)", flush=True)
    tok = open("/tmp/_cjtok").read().strip() if os.path.exists("/tmp/_cjtok") else ""
    if not tok:
        print("⛔ Kein CJ-Token (/tmp/_cjtok) — KEIN Urteil (kein «0 ausgelistet»)"); sys.exit(2)
    heute = datetime.date.today().isoformat()
    stand = ledger()
    ware, quelle = sichtbare_ware()
    a_offen = {g: v for g, v in ware.items() if stand.get(g, ("", ""))[0] != heute}   # Stufe A: täglich, Neustart-fest
    rest, cj_aktiv = rest_bestand(set(ware), stand)
    a_ids = set(a_offen)
    ziel = len(ware) + ROLLEN                         # Tagesziel: Stufe A komplett + ROLLEN Rest-Bestand (Ledger-Einträge von heute)
    heute_n, abgedeckt, _ = netz.ledger_zaehlen(heute)
    print(f"Stufe A sichtbar {len(ware)} ({quelle}), heute offen {len(a_offen)} | Stufe B Rest {len(rest)} "
          f"von {cj_aktiv} aktiven CJ | Tagesziel {heute_n}/{ziel} | DRY={DRY}", flush=True)
    jetzt_iso = lambda: datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    def stand_schreiben(extra=None):
        if DRY:
            return
        f = {"tag": heute, "a_gesamt": len(ware), "a_offen": len(a_ids), "ziel": ziel, "cj_aktiv": cj_aktiv,
             "b_abgedeckt": netz.ledger_zaehlen(heute)[1], "eimer": ""}
        if not a_ids:
            f["a_voll"] = jetzt_iso()                 # Stufe A heute vollständig (auch wenn der Lauf nichts mehr zu fragen hatte)
        f.update(extra or {})
        netz.schreiben(f)
    stand_schreiben()
    weg, unklar, gepr, unbekannt, eimer_folge = [], 0, 0, 0, 0
    alle = list(a_offen.items()) + list(rest.items())
    for n, (gid, (ref, handle, titel, woher)) in enumerate(alle, 1):
        # 28.09.: Fortschritt alle 25 — sonst steht nach einem Neustart das FERTIG des VORIGEN Laufs in den letzten 3 Log-Zeilen,
        # und fixer_keepalive.still_gestorben hält den abgebrochenen Lauf für beendet (gemessen 18:09: 567/2277, kein Neustart).
        if n % 25 == 0:
            print(f"  … {n}/{len(alle)} geprüft", flush=True)
            stand_schreiben()
        if heute_n >= ziel and not DRY:
            print(f"  Tagesziel {heute_n}/{ziel} erreicht — Rest morgen", flush=True)
            break
        # 05.10.2026 (Prüfer): die Kandidatenliste stammt aus dem Export — ein anderer Wächter (ek_luecke_cj.py) hatte
        # 47 davon schon gedraftet, und dieser Lauf fragte 7 erneut bei CJ an (10 Punkte je Abfrage, zweite «weg»-Zeile).
        # Live-Status vor der CJ-Abfrage: DRAFT/ARCHIVED = schon entschieden, überspringen.
        try:
            live = (gql('query($id:ID!){product(id:$id){status}}', {"id": gid}).get("product") or {}).get("status")
        except Exception:
            live = None
        if live and live != "ACTIVE":
            a_ids.discard(gid)                        # nicht mehr sichtbar → für Stufe A erledigt
            continue
        s = cj_status(ref, tok)
        if s == "eimer":
            # 21.10.2026: leerer CJ-Punkte-Eimer ist ein Kontozustand — nach 3 in Folge sauber beenden (PAUSE als LETZTE Zeile; der
            # Aufseher startet nach EIMER_PAUSE_MIN neu), statt Stunden lang Takt-Slots für nichts zu verbrauchen.
            eimer_folge += 1; unklar += 1
            if eimer_folge >= 3:
                stand_schreiben({"eimer": jetzt_iso()})
                print(f"  geprüft {gepr}, ausgelistet {len(weg)}, kein Urteil {unklar}", flush=True)
                print(f"PAUSE: CJ-Punkte-Eimer leer (API 16900500) nach {n} Fragen — Stufe A offen {len(a_ids)} von {len(ware)}, "
                      f"nächster Versuch nach {netz.EIMER_PAUSE_MIN} min (Reset 00:00 UTC)", flush=True)
                sys.exit(0)
            continue
        eimer_folge = 0
        if s is None:
            unklar += 1; continue
        if s == "unklar":
            # 1602001: das Produkt ist für CJ unbekannt, aber NICHT als ausgelistet gemeldet → kein Draft (nur 1602002 ist ein Urteil).
            # Mit Datum ins Ledger, damit die Schlange weiterrückt und der Kopf nicht für immer an diesen Einträgen klebt.
            unbekannt += 1; unklar += 1; heute_n += 1; a_ids.discard(gid)
            if not DRY:
                with open(NACHPRUEF, "a", encoding="utf-8") as f:
                    f.write(f"{gid}\t{heute}\tunklar\n")
            continue
        gepr += 1; heute_n += 1; a_ids.discard(gid)
        if not DRY:
            with open(NACHPRUEF, "a", encoding="utf-8") as f:
                f.write(f"{gid}\t{heute}\t{s}\n")
        if s == "weg":
            weg.append((handle, titel, woher, ref))
            print(f"  ⛔ ausgelistet: {titel[:60]} ({woher}, {ref})", flush=True)
            if not DRY:
                gql('mutation($id:ID!){productUpdate(product:{id:$id,status:DRAFT}){userErrors{message}}}', {"id": gid})
                gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": gid, "t": ["cj-entfernt", f"cj-entfernt-{heute}"]})
    abgedeckt = netz.ledger_zaehlen(heute)[1]
    stand_schreiben()
    zeit = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    zeilen = [f"# CJ ausgelistet — Nachprüfung (Stand {zeit})", "",
              f"Stufe A (täglich, sichtbar): {len(ware)} (heute offen am Ende: {len(a_ids)}) · Stufe B (rollierend, {ZYKLUS_TAGE} T): {len(rest)} dieser Lauf · "
              f"aktive CJ gesamt {cj_aktiv} · in {ZYKLUS_TAGE} T geprüft (ok/weg): {abgedeckt}",
              f"Dieser Lauf: geprüft {gepr} · ausgelistet **{len(weg)}** → DRAFT · von CJ «unbekannt» (1602001) {unbekannt} · kein Urteil insgesamt {unklar}",
              "", "| Produkt | Quelle | CJ-Referenz |", "|---|---|---|"] + [f"| {t} (`{h}`) | {w} | {r} |" for h, t, w, r in weg]
    if not DRY:
        open(BERICHT, "w", encoding="utf-8").write("\n".join(zeilen) + "\n")
    print(f"FERTIG: {gepr} geprüft, {len(weg)} ausgelistet{' (DRY)' if DRY else ' → DRAFT'}, {unklar} ohne Urteil ({unbekannt} unbekannt bei CJ) · "
          f"Abdeckung {abgedeckt}/{cj_aktiv} in {ZYKLUS_TAGE} T · Stufe A offen {len(a_ids)}")

if __name__ == "__main__":
    main()
