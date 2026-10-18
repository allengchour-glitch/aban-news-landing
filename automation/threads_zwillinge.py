#!/usr/bin/env python3
"""threads_zwillinge.py — Threads-Zwilling zu schon geplanten Instagram-Bildposts (Betreiber «3 ja», 18.10.2026: Threads wieder an).

Der Bild-Poster (social-autopost-meta.mjs) plant seit heute Instagram + Threads zusammen. Die 7 Bild-Slots, die der 7-Tage-Treiber VOR dieser
Änderung geplant hat, haben keinen Threads-Zwilling. Dieses Skript holt ihn nach — gleiche Bilddatei, gleicher Termin, Text mit klickbarem
Produktlink (Instagram trägt «Link in Bio», Threads hat keine Bio).

Ablauf je Slot (nur Slot-Format «bild», Status «geplant», Termin > +30 min, noch kein Threads-Eintrag):
  Planer-Eintrag → Bildunterschrift == Queue-Zeile social/posts_image.csv (Zeilen-ID endet auf die Produktnummer) → Storefront-API (ohne Token):
  Handle + kaufbar → Text → POST /v2/scheduler/posts (Netz threads) → ID in den Slot (mc_ids), damit Prüfer/Notbremse/STOPP sie erreichen.
Ohne SCHARF=1 nur Anzeige. Idempotent (zweiter Lauf findet nichts mehr).
⚠️ Anlegen geht NUR über den Metricool-Konnektor (createScheduledPost): die REST-API verweigert Threads mit 403 (GEMESSEN 19.10.).

  SCHARF=1 python3 automation/threads_zwillinge.py        --selbsttest
"""
import csv, json, os, re, subprocess, sys
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import social_vorlauf as V  # noqa: E402
import metricool_planer_wache as W  # noqa: E402

REPO = os.path.dirname(HIER)
QUEUE = os.path.join(REPO, "social", "posts_image.csv")
SCHARF = os.environ.get("SCHARF") == "1"
UTM = "utm_source=threads&utm_medium=social&utm_campaign=autopost"
FOLGE = "➕ Folge LuxeStyle CH – jeden Tag ein neues Fundstück aus der Schweiz 🇨🇭"


def threads_text(caption, url):
    """Instagram-Text → Threads-Text: «Link in Bio» wird zum klickbaren Link, nur EIN Hashtag, ≤ 480 Zeichen."""
    zeilen = [z for z in str(caption or "").split("\n")]
    out, tag, link_gesetzt = [], False, False
    for z in zeilen:
        if re.match(r"^\s*(#\S+\s*)+$", z):
            if not tag:
                out.append(z.split()[0]); tag = True
            continue
        if re.search(r"link\s+in\s+(?:der\s+)?bio", z, re.I):
            z = re.sub(r"\s*[–—·|-]?\s*\(?\s*link\s+in\s+(?:der\s+)?bio\s*\)?", "", z, flags=re.I)
            z = re.sub(r"(?<![\w/.-])luxestyle\.ch\b", "", z).rstrip(" –—·|-")
            z = f"{z.rstrip()} {url}".strip(); link_gesetzt = True
        out.append(z)
    if not link_gesetzt:
        out.insert(max(0, len(out) - (1 if tag else 0)), f"👉 {url}")
    if tag:   # Folge-Zeile vor dem Hashtag
        out.insert(len(out) - 1, FOLGE + "\n")
    else:
        out.append(FOLGE)
    t = "\n".join(out).strip()
    if len(t) > 480:
        t = t[:480].rsplit("\n", 1)[0].rstrip()
    return t


def produkt(gid_num):
    q = json.dumps({"query": f'{{ product(id:"gid://shopify/Product/{gid_num}"){{ handle availableForSale onlineStoreUrl }} }}'})
    r = subprocess.run(["curl", "-s", "--max-time", "25", "-H", "Content-Type: application/json", "-d", q,
                        "https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json"], capture_output=True, text=True)
    try:
        p = json.loads(r.stdout)["data"]["product"]
    except (ValueError, KeyError, TypeError):
        return None
    return p


def lauf():
    from datetime import datetime, timedelta
    plan = V.plan_laden()
    planer = W.holen(V.jetzt())
    nach_id = {p["id"]: p for p in planer}
    zeilen = list(csv.DictReader(open(QUEUE, encoding="utf-8")))
    je_caption = {" ".join((z.get("caption") or "").split()): z for z in zeilen}
    neu = 0
    nutzlast = []
    for name, s in sorted(plan["slots"].items(), key=lambda x: x[1]["termin_utc"]):
        if s["format"] != "bild" or s["status"] != "geplant" or V.von_iso(s["termin_utc"]) < V.jetzt() + timedelta(minutes=30):
            continue
        eintraege = [nach_id[i] for i in s["mc_ids"] if i in nach_id]
        if not eintraege or any("threads" in W.netze(p) for p in eintraege):
            continue
        ig = next((p for p in eintraege if "instagram" in W.netze(p)), None)
        if ig is None:
            continue
        z = je_caption.get(" ".join((ig.get("text") or "").split()))
        m = re.search(r"(\d{10,})$", (z or {}).get("id", ""))
        if not m:
            print(f"· {name}: keine Queue-Zeile/Produktnummer zur Bildunterschrift → übersprungen"); continue
        p = produkt(m.group(1))
        if not p or not p.get("availableForSale"):
            print(f"· {name}: Produkt {m.group(1)} nicht kaufbar/unbekannt → übersprungen"); continue
        url = f"https://luxestyle.ch/products/{p['handle']}?{UTM}"
        text = threads_text(ig.get("text"), url)
        body = {"publicationDate": ig["publicationDate"], "text": text, "providers": [{"network": "threads"}], "media": ig.get("media") or [],
                "autoPublish": True, "draft": False, "shortener": False,
                "threadsData": {"replyControl": "EVERYONE", "type": "POST", "shareAsInstagramStory": False}}
        print(f"{'+' if SCHARF else '[DRY]'} {name} ({ig['publicationDate']['dateTime']}): Threads-Zwilling zu {ig['id']} · {p['handle']} · {len(text)} Z.")
        if not SCHARF:
            print("    " + text.replace("\n", "\n    ")); continue
        # GEMESSEN 19.10.2026: die Metricool-REST-API antwortet auf JEDEN Threads-Beitrag mit 403 «Access denied to blog: \'\'» (Entwurf und
        # Termin, mit/ohne media/providers.id). Der Metricool-Konnektor (createScheduledPost, OAuth des Betreibers) geht. Deshalb nur die
        # Nutzlast ablegen; angelegt wird in einer Sitzung mit Konnektor, danach `--merken SLOT=ID` (damit Prüfer/Notbremse sie erreichen).
        nutzlast.append({"slot": name, "ig_id": ig["id"], "date": ig["publicationDate"]["dateTime"], "media": body["media"], "text": text, "handle": p["handle"]})
        neu += 1
    if nutzlast and SCHARF:
        json.dump(nutzlast, open("/tmp/_threads_plan.json", "w"), ensure_ascii=False, indent=1)
    print(f"THREADS-ZWILLINGE: {neu} vorbereitet" + (" → /tmp/_threads_plan.json (über den Metricool-Konnektor anlegen)" if nutzlast and SCHARF else ""))
    return 0


def merken(paare):
    """--merken SLOT=ID …: die per Konnektor angelegten Threads-Einträge in den Plan-Slot schreiben."""
    plan = V.plan_laden()
    for z in paare:
        slot, _, tid = z.partition("=")
        s_ = plan["slots"].get(slot)
        if not s_ or not tid.isdigit():
            print(f"✗ {z}: Slot unbekannt oder ID keine Zahl"); continue
        if int(tid) not in s_["mc_ids"]:
            s_["mc_ids"].append(int(tid))
        print(f"✓ {slot}: {s_['mc_ids']}")
    if SCHARF:
        V.plan_speichern(plan)
    return 0


def selbsttest():
    t = threads_text("Rechteckig, Unisex\nArmbanduhr «Rettangolo» · CHF 39.90\nKleiner Shop.\nJetzt im Shop 🇨🇭 luxestyle.ch – Link in Bio\n\n#schweiz #luxestyle #x", "https://luxestyle.ch/products/a?u=1")
    fehler = []
    if "Link in Bio" in t or t.count("#") != 1 or "https://luxestyle.ch/products/a?u=1" not in t or len(t) > 480 or "Folge" not in t:
        fehler.append(f"Text: {t!r}")
    t2 = threads_text("Nur Text ohne Link", "https://luxestyle.ch/products/b")
    if "https://luxestyle.ch/products/b" not in t2:
        fehler.append("Link fehlt ohne Bio-Zeile")
    print("SELBSTTEST threads_zwillinge:", "OK" if not fehler else "FEHLER " + "; ".join(fehler))
    return 1 if fehler else 0


if __name__ == "__main__":
    if "--merken" in sys.argv:
        sys.exit(merken(sys.argv[sys.argv.index("--merken") + 1:]))
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else lauf())
