#!/usr/bin/env python3
"""google_feedback_wache.py — liest täglich die Google-Diagnosen, die die App «Google & YouTube» als
`product.feedback` an jedes Produkt schreibt, und zählt die Blocker für die GRATIS-EINTRÄGE (Free Listings —
der einzige Kanal mit Verkäufen, gemessen 14.09./22.09.). Task #100, gebaut 23.09.2026.

GEMESSEN 22.09. (Vollscan 51'326 aktive): 21'485 Meldungen, davon 21'180 «Over capacity for Shopping ads (in CSS
program) in [Shopping_ads] [CH]» — betrifft NUR Shopping Ads (bezahlte Anzeigen, die wir nicht schalten) und ist
kein Blocker für Gratis-Einträge. Der Rest sind die echten Blocker: 371 «Product page unavailable», 26 «Image too
small», 18 «Unable to show image», 7 «Promotional overlay», 3 «Guns and Parts». Bis heute gab es dafür keinen
Wächter — der Vollscan war eine Handmessung.

REGEL: Eine Meldung mit «[Shopping_ads]» im Text zählt nicht (nur Anzeigen). Alles andere («[]» = alle Ziele) ist
ein Free-Listings-Blocker. Je Klasse werden Handles gesammelt (bis HANDLES_MAX), für «Product page unavailable»
zusätzlich gemessen, wie viele davon KEINE onlineStoreUrl haben (= nicht im Onlineshop publiziert, aber im
Google-Kanal → Google sieht eine 404; das ist die Reparatur-Kandidatin für einen späteren Fixer).

Abfrage: products(first:250, query:"status:active") { feedback{details{app{title} messages{message}}} } —
GEMESSEN 23.09.: 47 Punkte je 250 Produkte, ~206 Seiten für 51k aktive; Eimer-Etikette nach jeder Antwort.
Schreibt NUR am Ende (Teil-Läufe hinterlassen keinen halben Stand). Stand: dropship/_google_feedback_stand.json,
Bericht: dropship/GOOGLE-FEEDBACK.md. Ampel-Zeile «GOOGLE: N Free-Listings-Blocker …» liest den Stand.
"""
import datetime, json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eimer_etikette import nachlauf, bilanz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(ROOT, "dropship", "_google_feedback_stand.json")
BERICHT = os.path.join(ROOT, "dropship", "GOOGLE-FEEDBACK.md")
SHOP = "au3j0y-hq.myshopify.com"
TOK = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or (open("/tmp/cj_shop_token.txt").read() if os.path.exists("/tmp/cj_shop_token.txt") else "")).strip()
HANDLES_MAX = int(os.environ.get("HANDLES_MAX", "300"))
SEITEN_MAX = int(os.environ.get("SEITEN_MAX", "400"))
NUR_ANZEIGEN = re.compile(r"\[Shopping_ads\]")


def gql(q, v=None):
    grund = "kein Versuch"
    drossel = 0
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "90", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            grund = "kein JSON"; time.sleep(5); continue
        if d.get("data") is not None:
            nachlauf(d)
            return d
        grund = str(d.get("errors") or d)[:300]
        if "THROTTLED" in grund.upper():
            drossel += 1; time.sleep(min(30, 6 * drossel)); continue
        time.sleep(5)
    raise RuntimeError("Shopify hat auf keinen Versuch mit Daten geantwortet — kein Stand geschrieben. Letzter Grund: " + grund)


def klasse(msg):
    """Meldungstext ohne die Ziel-/Land-Klammern → Klassenname."""
    return re.sub(r"\s+in$", "", re.sub(r"\s*\[[^\]]*\]", "", msg).strip().rstrip(".")).strip()


def main():
    if not TOK:
        print("kein Shop-Token → No-op"); return
    cursor, seiten, gescannt = None, 0, 0
    klassen, handles, ohne_url, andere = {}, {}, {}, {}
    anzeigen_meldungen = 0
    t0 = time.time()
    while True:
        d = gql("query($c:String){ products(first:250, after:$c, query:\"status:active\"){ pageInfo{hasNextPage endCursor} "
                "nodes{ handle onlineStoreUrl feedback{ details{ app{title} messages{ message } } } } } }", {"c": cursor})
        pg = d["data"]["products"]; seiten += 1
        for n in pg["nodes"]:
            gescannt += 1
            for det in ((n.get("feedback") or {}).get("details") or []):
                app = ((det.get("app") or {}).get("title") or "?")
                for m in det.get("messages") or []:
                    txt = m.get("message") or ""
                    # 23.09.: product.feedback traegt die Diagnosen ALLER Kanal-Apps. Der erste Lauf zaehlte 33'863
                    # «Dieses Produkt ist in Shop nicht auffindbar» als Google-Blocker — das ist die App «Shop»
                    # (Shop-Kanal), nicht «Google & YouTube». Fremde Apps werden getrennt gezaehlt.
                    if app != "Google & YouTube":
                        k = f"[{app}] " + klasse(txt)
                        andere[k] = andere.get(k, 0) + 1
                        continue
                    if NUR_ANZEIGEN.search(txt):
                        anzeigen_meldungen += 1; continue
                    k = klasse(txt)
                    klassen[k] = klassen.get(k, 0) + 1
                    h = handles.setdefault(k, [])
                    if len(h) < HANDLES_MAX:
                        h.append(n["handle"])
                    if not n.get("onlineStoreUrl"):
                        ohne_url[k] = ohne_url.get(k, 0) + 1
        if not pg["pageInfo"]["hasNextPage"] or seiten >= SEITEN_MAX:
            break
        cursor = pg["pageInfo"]["endCursor"]
    voll = seiten < SEITEN_MAX
    blocker = sum(klassen.values())
    stand = {"stand": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "gescannt": gescannt, "seiten": seiten,
             "vollstaendig": voll, "blocker": blocker, "klassen": dict(sorted(klassen.items(), key=lambda x: -x[1])),
             "ohne_onlineStoreUrl": ohne_url, "anzeigen_meldungen": anzeigen_meldungen, "handles": handles,
             "andere_apps": dict(sorted(andere.items(), key=lambda x: -x[1])),
             "dauer_s": round(time.time() - t0)}
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Google-Diagnosen (product.feedback der App «Google & YouTube») — Stand {stand['stand']}\n\n")
        f.write(f"Gescannt: {gescannt} aktive Produkte in {seiten} Seiten ({'vollständig' if voll else '⚠️ DECKEL erreicht'}), "
                f"{stand['dauer_s']} s. Meldungen nur für Shopping Ads (ignoriert): {anzeigen_meldungen}.\n\n")
        f.write(f"## Free-Listings-Blocker: {blocker}\n\n| Klasse | Produkte | davon ohne onlineStoreUrl |\n|---|---:|---:|\n")
        for k, v in stand["klassen"].items():
            f.write(f"| {k} | {v} | {ohne_url.get(k, 0)} |\n")
        if andere:
            f.write("\n## Meldungen anderer Kanal-Apps (kein Google-Blocker)\n\n" + "\n".join(f"- {k}: {v}" for k, v in stand["andere_apps"].items()) + "\n")
        f.write("\n«ohne onlineStoreUrl» = nicht im Onlineshop publiziert, aber im Google-Kanal — Google sieht eine 404. "
                "Reparatur: Onlineshop-Publikation nachziehen oder aus dem Google-Kanal nehmen (Fixer folgt).\n\n")
        for k, hs in handles.items():
            f.write(f"### {k} ({klassen[k]})\n\n" + "\n".join(f"- {h}" for h in hs[:60]) + ("\n- …" if klassen[k] > 60 else "") + "\n\n")
    print(f"FERTIG: {gescannt} gescannt · {blocker} Free-Listings-Blocker (Google) · andere Apps {sum(andere.values())} · {dict(list(stand['klassen'].items())[:5])} · {bilanz()}")


if __name__ == "__main__":
    main()
