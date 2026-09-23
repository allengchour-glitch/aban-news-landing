#!/usr/bin/env python3
"""bild_heilversprechen.py — Hauptbilder mit Krankheits- oder Heilversprechen ersetzen (23.09.2026).

ANLASS: Kontaktbogen der 445 Produkte, die Google als «Inappropriate image» aus den Gratis-Einträgen hält.
Darunter Hauptbilder wie «HELP YOU GET RID OF PSORIASIS» mit Vorher/Nachher-Händen (Hand- und Fusspflegespray)
und «TYPES OF FUNGAL INFECTIONS · Onychomycosis · Subungual hematoma» (Nagelpflege-Fluid). Der Text-Wächter
`heilversprechen_wache.py` liest nur Titel und Beschreibung — ein Heilversprechen IM BILD sah bisher niemand.
Für die Kundin ist es dasselbe Versprechen, für Google ein Ablehnungsgrund, für den Shop ein Scam-Signal.

REGEL: Tesseract liest das Hauptbild. Treffer = ein Medizinwort (Krankheit/Heilung) ODER «before» und «after»
zusammen. Dann werden die übrigen Bilder in ihrer Reihenfolge gelesen; das erste ohne Treffer und mit weniger
als WORTGRENZE Wörtern Werbetext wird per productReorderMedia nach vorne geholt (Rücklesen: featuredMedia).
Gibt es kein sauberes Bild, wird NUR gemeldet — kein Draft (Betreiber 14.09.: Katalog nicht verkleinern).

Kandidaten: Google-Liste (dropship/_google_feedback_stand.json, Klasse «Inappropriate image») + aktive Produkte
zu Haut/Nagel/Fuss-Themen (Shopify-Suche). Ledger dropship/_bild_heilversprechen.txt (handle, befund, zeit) —
geprüfte Handles werden übersprungen. DRY (Standard) misst nur, SCHARF=1 schreibt. Bericht
dropship/BILD-HEILVERSPRECHEN.md.
"""
import datetime, io, json, os, re, subprocess, sys, time
# 23.09.: Tesseract startet je Aufruf eigene OpenMP-Threads — vier parallele Aufrufe trieben die Last auf 16.
os.environ.setdefault("OMP_THREAD_LIMIT", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eimer_etikette import nachlauf, bilanz
import pytesseract
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "dropship", "_bild_heilversprechen.txt")
BERICHT = os.path.join(ROOT, "dropship", "BILD-HEILVERSPRECHEN.md")
STAND_GOOGLE = os.path.join(ROOT, "dropship", "_google_feedback_stand.json")
SHOP = "au3j0y-hq.myshopify.com"
TOK = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or (open("/tmp/cj_shop_token.txt").read() if os.path.exists("/tmp/cj_shop_token.txt") else "")).strip()
SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "2500"))
ARBEITER = int(os.environ.get("ARBEITER", "4"))
WORTGRENZE = 10   # Ersatzbild: etwas Beschriftung ist erlaubt, kein Medizinwort
SUCHE = "status:active AND (Nagel OR Nagelpilz OR Fusspflege OR Warze OR Hornhaut OR Akne OR Ekzem OR Schuppenflechte OR Narbe OR Zehennagel OR Hautpflege OR Pilz)"
# Medizinwörter (englisch, wie sie in CJ-Bildern stehen). Wortgrenzen: «pain» allein ist KEIN Treffer
# («Remove Without Pain» an Wimpern ist Komfort, keine Heilung); «wart» nicht in «Stewart».
MEDIZIN = re.compile(r"\b(psoriasis|fungal|fungus|fungi|infections?|eczema|warts?|acne|cure[sd]?|disease|onycho\w*|"
                     r"hematoma|syndrome|inflammation|itch(?:ing|y)?|bacteri\w*|virus|dermatitis|rash|mycosis|"
                     r"athlete'?s|heal(?:s|ing)?|treatment|therapy|scars?|melasma|vitiligo|rosacea)\b", re.I)


def gql(q, v=None):
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5); continue
        if d.get("data") is not None:
            nachlauf(d); return d
        time.sleep(min(30, 5 * (versuch + 1)))
    raise RuntimeError("Shopify antwortet nicht mit Daten")


def kante(b, n):
    """Längste Kante auf n px. 23.09. gemessen: `width=` behält das Seitenverhältnis — ein CJ-Detailbild von
    1000×12000 px hielt einen Tesseract-Aufruf über vier Minuten fest."""
    if max(b.size) > n:
        f = n / max(b.size); b = b.resize((max(1, int(b.width * f)), max(1, int(b.height * f))))
    return b


def lies(url):
    """Sicher gelesene Wörter (≥3 Buchstaben, Konfidenz ≥60). None = Bild nicht lesbar (≠ sauber)."""
    raw = subprocess.run(["curl", "-sL", "--max-time", "30", url + ("&" if "?" in url else "?") + "width=1000"],
                         capture_output=True).stdout
    if not raw:
        return None
    try:
        b = kante(Image.open(io.BytesIO(raw)).convert("L"), 1000)
        if max(b.size) < 900:
            f = 900 / max(b.size); b = b.resize((int(b.width * f), int(b.height * f)))
        d = pytesseract.image_to_data(b, output_type=pytesseract.Output.DICT, timeout=40)
    except Exception:
        return None
    out = []
    for w, k in zip(d["text"], d["conf"]):
        try:
            if float(k) >= 60 and re.match(r"^[A-Za-zÄÖÜäöüß']{3,}$", (w or "").strip()):
                out.append(w.strip())
        except (TypeError, ValueError):
            pass
    return out


# Zweite Lesart (23.09., gemessen): Das Psoriasis-Bild in Konturschrift liest die Wort-Lesart als NICHTS. Mit
# 1600 px und --psm 11 (Streutext) kommt «HELPAYOU/GETIRID OF ESORIASIS … BEFORE» — verklebt und mit Fehlern.
# Darum hier nur lange, eindeutige Stämme ohne Wortgrenzen im Buchstabenbrei; kurze Wörter bleiben Pass 1.
STAEMME = re.compile(r"(soriasis|fungal|fungus|infection|eczema|onycho|hematoma|syndrome|inflammat|dermatit|mycosis|"
                     r"bacteri|vitiligo|rosacea|melasma|getridof|ringworm|tinea|nailfungus|symptoms)", re.I)


def lies_roh(url):
    raw = subprocess.run(["curl", "-sL", "--max-time", "30", url + ("&" if "?" in url else "?") + "width=1600"],
                         capture_output=True).stdout
    if not raw:
        return ""
    try:
        t = pytesseract.image_to_string(kante(Image.open(io.BytesIO(raw)).convert("L"), 1600), config="--psm 11", timeout=40)
    except Exception:
        return ""
    return re.sub(r"[^a-z]", "", t.lower())


def treffer(woerter, roh=""):
    t = " ".join(woerter).lower()
    m = set(x.lower() for x in MEDIZIN.findall(t))
    m |= set(x.lower() for x in STAEMME.findall(roh or ""))
    if re.search(r"\bbefore\b", t) and re.search(r"\bafter\b", t):
        m.add("before/after")
    return sorted(m)


def pruefe(h, p):
    """Ein Produkt: (Ledger-Zeile oder None, Befund oder None). 23.09.: in Threads — ein Lauf mit einem Faden
    schaffte 13 Produkte/min (Latenz, nicht CPU: Last 0,6 bei 4 Kernen) und starb am stuendlichen Neustart."""
    zeit = f"{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}"
    if not p or p["status"] != "ACTIVE":
        return (h, "nicht-aktiv", zeit), None
    bilder = [(m["id"], (m.get("image") or {}).get("url")) for m in p["media"]["nodes"]
              if m.get("mediaContentType") == "IMAGE" and (m.get("image") or {}).get("url")]
    if not bilder:
        return (h, "ohne-bild", zeit), None
    w0 = lies(bilder[0][1])
    if w0 is None:
        return (h, "unlesbar", zeit), None
    r0 = lies_roh(bilder[0][1])
    if not treffer(w0, r0):
        return (h, "sauber", zeit), None
    grund = ",".join(treffer(w0, r0))
    ersatz = None
    for mid, u in bilder[1:]:
        w = lies(u)
        if w is not None and len(w) < WORTGRENZE and not treffer(w, lies_roh(u)):
            ersatz = mid; break
    if ersatz is None:
        return (h, f"KEIN-ERSATZ:{grund}", zeit), (h, p["title"], grund, "KEIN-ERSATZ")
    if not SCHARF:
        return None, (h, p["title"], grund, "DRY: würde Bild tauschen")
    r = gql("mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ job{id} mediaUserErrors{message} } }",
            {"id": p["id"], "m": [{"id": ersatz, "newPosition": "0"}]})
    ue = r["data"]["productReorderMedia"]["mediaUserErrors"]
    ist = None
    for _ in range(6):
        time.sleep(2)
        ist = ((gql("query($id:ID!){ product(id:$id){ featuredMedia{id} } }", {"id": p["id"]})
                ["data"]["product"] or {}).get("featuredMedia") or {}).get("id")
        if ist == ersatz:
            break
    z = f"GETAUSCHT:{grund}" if (not ue and ist == ersatz) else f"FEHLER:{(ue or [{}])[0].get('message', 'rueckgelesen ' + str(ist))}"
    return (h, z, zeit), (h, p["title"], grund, z)


def kandidaten():
    hs = []
    try:
        s = json.load(open(STAND_GOOGLE, encoding="utf-8"))
        hs += s.get("handles", {}).get("Inappropriate image in", []) or s.get("handles", {}).get("Inappropriate image", [])
    except Exception:
        pass
    cur = None
    while True:
        d = gql("query($c:String,$q:String){ products(first:250, after:$c, query:$q){ pageInfo{hasNextPage endCursor} nodes{handle} } }",
                {"c": cur, "q": SUCHE})
        pg = d["data"]["products"]
        hs += [n["handle"] for n in pg["nodes"]]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    seen, out = set(), []
    for h in hs:
        if h not in seen:
            seen.add(h); out.append(h)
    return out


def main():
    if not TOK:
        print("kein Shop-Token → No-op"); return
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.strip()}
    hs = [h for h in kandidaten() if h not in erledigt][:CAP]
    print(f"Kandidaten offen: {len(hs)} (bereits geprüft {len(erledigt)})", flush=True)
    befunde = []
    for i in range(0, len(hs), 10):
        teil = hs[i:i + 10]
        q = "{" + " ".join(f'p{j}: productByHandle(handle:{json.dumps(h)}){{ id handle title status '
                           f'media(first:10){{ nodes{{ id mediaContentType ... on MediaImage {{ image{{url}} }} }} }} }}'
                           for j, h in enumerate(teil)) + "}"
        d = gql(q)["data"]
        with ThreadPoolExecutor(max_workers=ARBEITER) as pool:
            ergebnisse = list(pool.map(lambda jh: pruefe(jh[1], d.get(f"p{jh[0]}")), enumerate(teil)))
        with open(LEDGER, "a", encoding="utf-8") as lf:
            for zeile, befund in ergebnisse:
                if befund:
                    befunde.append(befund)
                if zeile:
                    lf.write("\t".join(zeile) + "\n")
        print(f"… {min(i + 10, len(hs))}/{len(hs)} · Befunde {len(befunde)}", flush=True)
    alle = [l.rstrip("\n").split("\t") for l in open(LEDGER, encoding="utf-8")] if os.path.exists(LEDGER) else []
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Hauptbilder mit Krankheits-/Heilversprechen — Stand {datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC\n\n")
        f.write(f"Geprüft (Ledger): {len(alle)} · getauscht: {sum(1 for a in alle if a[1].startswith('GETAUSCHT'))} · "
                f"ohne sauberes Ersatzbild: {sum(1 for a in alle if a[1].startswith('KEIN-ERSATZ'))} · unlesbar: {sum(1 for a in alle if a[1]=='unlesbar')}\n\n")
        f.write("## Befunde dieses Laufs\n\n" + "\n".join(f"- {h} · {t} · Wörter: {g} → {z}" for h, t, g, z in befunde) + "\n\n")
        f.write("## Ohne sauberes Ersatzbild (Betreiber-Entscheid: Bild ersetzen oder Produkt aus dem Verkauf)\n\n" +
                "\n".join(f"- {a[0]} · {a[1]}" for a in alle if a[1].startswith("KEIN-ERSATZ")) + "\n")
    print(f"FERTIG: {len(hs)} geprüft · Befunde {len(befunde)} · {'SCHARF' if SCHARF else 'DRY'} · {bilanz()}")


if __name__ == "__main__":
    main()
