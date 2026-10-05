#!/usr/bin/env python3
"""ek_luecke_cj.py — schliesst die EK-Lücke bei aktiver CJ-Ware (05.10.2026, Fixlauf «fix 12 h lang alles», Bereich Preis/Marge).

DER BEFUND: 87 aktive CJ-Produkte (312 Varianten) trugen keinen Einkaufspreis. 78 davon hatte `cj_kosten_backfill.mjs` im Ledger
quittiert (70× «cj-abgekuendigt-pruefen», 6× «cj-ohne-antwort») — eine Quittung, die kein Lauf je wieder anfasste. Live gefragt
antwortete CJ bei 21 wieder mit Preis + Gewicht, und sobald der EK stand, lagen **10 Produkte / 34 Varianten unter dem Boden**
(Katzentoilette CHF 50.90 bei EK 62.37, Agility-Set 92.90 bei 115.88). `preis_verlustschutz` sieht Varianten ohne EK nie —
ohne EK gibt es keinen Schutz. 47 weitere antwortete CJ mit 1602002 «removed from shelves»: aktiv im Shop, nicht bestellbar
(#1019-Klasse) — der tägliche Wächter `cj_ausgelistet_sichtbar.py` kommt im 30-T-Zyklus hin, aber gedrosselt und langsam.

WAS DER LAUF TUT (täglich, idempotent):
  1. Kandidaten = aktive Produkte mit CJ-SKU und mindestens einer Variante ohne unitCost — aus /tmp/kost28.jsonl
     (Kosten-Kette des Aufsehers; fehlt er oder ist er älter als 3 Tage → PAUSE, nichts wird erfunden).
  2. Ganz ohne EK  → `cj_kosten_backfill.mjs NUR_IDS=…` (alle sieben SKU-Formen, Ledger-Quittung gilt nicht als Urteil für immer).
     Teils ohne EK  → `ek_varianten_nachtragen.py NUR_IDS=…` (bekannter EK × Preisverhältnis, Rücklesen).
  3. `preis_verlustschutz.py NUR_IDS=…` (live) hebt, was nach Schritt 2 unter dem Boden liegt. Nie senken.
  3b. Alle aktiven Produkte der letzten 36 h ebenfalls live durch den Verlustschutz (Export-Lücke bei Neuimporten).
  4. Produkte, die danach IMMER NOCH ohne EK sind und bei denen CJ live 1602002 antwortet → DRAFT + Tags
     cj-entfernt / cj-entfernt-<datum> / ohne-ek-cj-weg (dieselbe Regel und dasselbe Ledger `_cj_nachpruefung.tsv` wie
     cj_ausgelistet_sichtbar.py). Vor der Mutation Live-Lesen (Status, EK); CJ wird EINMAL live gefragt — nur 1602002 ist ein Urteil,
     1602003 («Variant removed») und alles andere = kein Urteil, nur Bericht.
  Altwerte: dropship/_ek_luecke_cj_<datum>.tsv. Bericht: dropship/EK-LUECKE-CJ.md.
  Standard = TROCKENLAUF (Schritte 2–4 nur melden). SCHARF=1 schreibt. CAP begrenzt Schritt 4 (Standard 60).
"""
import datetime, json, os, re, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
os.chdir(REPO)
from kaufwille_zeile import gql          # noqa: E402
from cj_versand_ch_guard import cj       # noqa: E402  (1 Anfrage/s, prozessübergreifend)

SCHARF = os.environ.get("SCHARF") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/kost28.jsonl")
CAP = int(os.environ.get("CAP", "60"))
HEUTE = datetime.date.today().isoformat()
LED = f"dropship/_ek_luecke_cj_{HEUTE}.tsv"
NACH = "dropship/_cj_nachpruefung.tsv"
BERICHT = "dropship/EK-LUECKE-CJ.md"
TMP = "/tmp/ek_luecke_cj"
NODE = "/opt/node22/bin/node"
SKU_PID = re.compile(r"^CJ-([0-9]{10,}|[0-9A-Fa-f-]{30,})$")
SKU_VAR = re.compile(r"^(?:CJ-)?(CJ[A-Z]{2,4}[0-9]{6,}[A-Z0-9]*)$")


def cj_ref(sku):
    m = SKU_PID.match((sku or "").strip()) or SKU_VAR.match((sku or "").strip())
    return m.group(1) if m else None


def kandidaten():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 3 * 86400:
        print(f"PAUSE: {EXPORT} fehlt oder älter als 3 Tage"); sys.exit(2)
    vs, kaputt = {}, 0
    for z in open(EXPORT, encoding="utf-8"):
        try:
            o = json.loads(z)
        except ValueError:
            kaputt += 1; continue      # Export wird gerade geschrieben (curl -o) — eigene Falle 05.10.: JSONDecodeError
        if "/ProductVariant/" not in o["id"]:
            continue
        uc = ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
        vs.setdefault(o["__parentId"], []).append((o.get("sku") or "", uc))
    if kaputt:
        print(f"PAUSE: {kaputt} unlesbare Zeilen in {EXPORT} — Export in Arbeit, nächster Lauf"); sys.exit(2)
    ganz, teils = [], []
    for pid, v in vs.items():
        if not any(x[1] is None for x in v) or not re.search(r"\bCJ", " ".join(x[0] for x in v)):
            continue
        (ganz if all(x[1] is None for x in v) else teils).append(pid)
    return ganz, teils


def lauf(cmd, env, log):
    e = dict(os.environ, **env)
    r = subprocess.run(cmd, env=e, capture_output=True, text=True, timeout=3000)
    out = (r.stdout + r.stderr).strip().splitlines()
    print(f"  {log}: {out[-1][:160] if out else '(keine Ausgabe)'}", flush=True)


def main():
    os.makedirs(TMP, exist_ok=True)
    ganz, teils = kandidaten()
    print(f"Kandidaten: {len(ganz)} CJ-Produkte ganz ohne EK, {len(teils)} teils · SCHARF={SCHARF}", flush=True)
    for name, ids in (("ganz", ganz), ("teils", teils)):
        open(f"{TMP}/{name}.txt", "w").write("\n".join(ids) + ("\n" if ids else ""))
    if SCHARF:
        if ganz:
            lauf([NODE, "automation/cj_kosten_backfill.mjs"], {"NUR_IDS": f"{TMP}/ganz.txt", "LIMIT": "400"}, "cj_kosten_backfill")
        if teils:
            lauf([sys.executable, "automation/ek_varianten_nachtragen.py"], {"NUR_IDS": f"{TMP}/teils.txt", "SCHARF": "1"}, "ek_varianten_nachtragen")
        if ganz or teils:
            open(f"{TMP}/alle.txt", "w").write("\n".join(ganz + teils) + "\n")
            lauf([sys.executable, "automation/preis_verlustschutz.py"],
                 {"NUR_IDS": f"{TMP}/alle.txt", "SCHARF": "1", "SPERRE": f"{TMP}/pv.lock"}, "preis_verlustschutz")
    # Schritt 3b (05.10.): NEUWARE der letzten 36 h live durch den Verlustschutz. Der Tagesläufer sieht Neuimporte erst
    # mit dem nächsten Voll-Export (≤ 3 Tage) — gemessen 05.10. 00:55: 27 Produkte / 371 Varianten vom selben Morgen unter dem
    # Boden, Export 00:08 kannte sie noch nicht. Nur IDs lesen (billig), preis_verlustschutz liest selbst live.
    seit = (datetime.datetime.utcnow() - datetime.timedelta(hours=36)).strftime("%Y-%m-%dT%H:%M:%SZ")
    neu, cur = [], None
    while True:
        d = gql('query($q:String!,$c:String){products(first:250,query:$q,after:$c){pageInfo{hasNextPage endCursor} nodes{id}}}',
                {"q": f"status:active created_at:>{seit}", "c": cur})["products"]
        neu += [n["id"] for n in d["nodes"]]
        if not d["pageInfo"]["hasNextPage"] or len(neu) >= 5000:
            break
        cur = d["pageInfo"]["endCursor"]
    print(f"Neuware seit {seit}: {len(neu)} aktive Produkte → preis_verlustschutz live", flush=True)
    if neu:
        open(f"{TMP}/neu.txt", "w").write("\n".join(neu) + "\n")
        lauf([sys.executable, "automation/preis_verlustschutz.py"],
             {"NUR_IDS": f"{TMP}/neu.txt", "SPERRE": f"{TMP}/pv.lock", **({"SCHARF": "1"} if SCHARF else {})}, "preis_verlustschutz (Neuware)")
    # Schritt 4: wer jetzt noch ohne EK ist → CJ fragen
    weg, kein_urteil, ek_da, n = [], [], 0, 0
    for pid in ganz[:CAP * 3]:
        if n >= CAP:
            break
        d = gql('query($id:ID!){product(id:$id){id handle title status tags variants(first:5){nodes{sku inventoryItem{unitCost{amount}}}}}}',
                {"id": pid})["product"]
        if not d or d["status"] != "ACTIVE":
            continue
        if any(v["inventoryItem"]["unitCost"] for v in d["variants"]["nodes"]):
            ek_da += 1; continue
        ref = cj_ref(d["variants"]["nodes"][0]["sku"] if d["variants"]["nodes"] else "")
        if not ref:
            kein_urteil.append((d["handle"], "keine CJ-Referenz")); continue
        feld = "pid" if re.fullmatch(r"[0-9]{10,}|[0-9A-Fa-f-]{30,}", ref) else "variantSku"
        code, data, msg = cj(f"/product/query?{feld}={ref}")
        if code != 1602002:
            kein_urteil.append((d["handle"], f"CJ {code} {msg[:50]}")); continue
        n += 1
        print(f"  {'' if SCHARF else 'DRY '}⛔ ausgelistet: {d['handle']} | {d['title'][:50]}", flush=True)
        weg.append((d["handle"], d["title"], ref))
        if not SCHARF:
            continue
        r = gql('mutation($id:ID!){productUpdate(product:{id:$id,status:DRAFT}){product{status} userErrors{message}}}', {"id": pid})["productUpdate"]
        if r["userErrors"] or r["product"]["status"] != "DRAFT":
            print("   ⚠️ Draft nicht bestätigt", r["userErrors"]); continue
        t = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){node{... on Product{tags}} userErrors{message}}}',
                {"id": pid, "t": ["cj-entfernt", f"cj-entfernt-{HEUTE}", "ohne-ek-cj-weg"]})["tagsAdd"]
        if "cj-entfernt" not in ((t.get("node") or {}).get("tags") or []):
            print("   ⚠️ Tag nicht bestätigt", t["userErrors"])
        with open(LED, "a") as f:
            f.write(f"{pid}\t{d['handle']}\tACTIVE→DRAFT\t{ref}\t{','.join(d['tags'])}\t{HEUTE}\n")
        with open(NACH, "a") as f:
            f.write(f"{pid}\t{HEUTE}\tweg\n")
        time.sleep(0.5)
    zeit = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    z = [f"# EK-Lücke CJ — {'scharf' if SCHARF else 'Trockenlauf'} {zeit}", "",
         f"Kandidaten: {len(ganz)} ganz ohne EK, {len(teils)} teils · nach Nachtrag mit EK: {ek_da} · CJ ausgelistet (1602002) → DRAFT: **{len(weg)}** · kein Urteil: {len(kein_urteil)}",
         "", "| ausgelistet | CJ-Referenz |", "|---|---|"] + [f"| {t[:60]} (`{h}`) | {r} |" for h, t, r in weg] + \
        ["", "| kein Urteil | Grund |", "|---|---|"] + [f"| `{h}` | {g} |" for h, g in kein_urteil]
    if SCHARF:
        open(BERICHT, "w", encoding="utf-8").write("\n".join(z) + "\n")
    print(f"FERTIG {zeit}: {len(weg)} ausgelistet{'' if SCHARF else ' (DRY)'}, {ek_da} haben jetzt EK, {len(kein_urteil)} ohne Urteil")


if __name__ == "__main__":
    main()
