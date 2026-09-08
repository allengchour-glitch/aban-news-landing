#!/usr/bin/env python3
"""Zaehlt die Klasse «Produktdetails doppelt» am OBJEKT nach und stellt die Falle.

WARUM ES DIESE DATEI GIBT (08.09.2026): Die Nachmessung lag als Wegwerf-Skript im
Scratchpad und war nach dem naechsten Container-Neustart weg — «was nur in /tmp lebt,
existiert nicht» (Lehre 11.08.). Sie wird aber TAEGLICH gebraucht, solange der
Verursacher nicht benannt ist.

Es MELDET NUR. Repariert wird mit `produktdetails_vereinen.py` (LISTE=), damit es
weiterhin genau EINE Regelquelle gibt.

Zwei Dinge werden gemessen, nicht eines:
  1. wie viele der Liste den Doppelblock LIVE tragen, und
  2. `updatedAt` je Produkt — denn wer den Block zurueckschreibt, hinterlaesst dabei
     eine MINUTE. Die laesst sich gegen die Zeitstempel der Logs in /tmp halten; genau
     so wurde am 08.09. `versand_jenachland` als Schreiber der 18:58-Runde erkannt
     (und als Verursacher ausgeschlossen).

⚠️ Gezaehlt wird die UEBERSCHRIFT `<h4>Produktdetails</h4>`, nie das blosse Wort — der
CSS-Klassenname `ls-produktdetails` steht im selben Text und hat am 03.09. schon einmal
4'559 statt 1'743 gemeldet.
"""
import os, re, ssl, sys, json, time, subprocess, urllib.request

LISTE = os.environ.get("LISTE", "dropship/_klassen/produktdetails-doppelt.txt")
TOK = open("/tmp/cj_shop_token.txt").read().strip()
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
H4 = re.compile(r"<h4[^>]*>\s*Produktdetails\s*</h4>", re.I)


def gql(q, v=None, versuche=12):
    for _ in range(versuche):
        req = urllib.request.Request(
            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
            data=json.dumps({"query": q, "variables": v or {}}).encode(),
            headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        d = json.loads(urllib.request.urlopen(req, context=CTX).read())
        if d.get("data") is not None:
            return d
        errs = d.get("errors") or []
        # ⚠️ Eine Drosselung ist kein Abbruchgrund (Lehre 21.08.) — sie sagt nur, wie
        # lange zu warten ist. Nur ein ECHTER Fehler beendet den Lauf.
        if any(e.get("extensions", {}).get("code") == "THROTTLED" for e in errs):
            ts = d.get("extensions", {}).get("cost", {}).get("throttleStatus", {})
            need = d["extensions"]["cost"].get("requestedQueryCost", 50) - ts.get("currentlyAvailable", 0)
            time.sleep(max(2, need / max(ts.get("restoreRate", 50), 1) + 1))
            continue
        raise SystemExit(f"⛔ Shopify: {errs}")
    raise SystemExit("⛔ dauerhaft gedrosselt — PAUSE, kein Befund")


def logs_um(minute):
    """Welche /tmp-Logs wurden in dieser Minute geschrieben? Das benennt den Schreiber."""
    try:
        r = subprocess.run(
            ["find", "/tmp", "-maxdepth", "1", "-name", "*.log",
             "-newermt", minute + ":00", "!", "-newermt", minute + ":59",
             "-printf", "%TH:%TM %f\n"], capture_output=True, text=True, timeout=30)
        return [z for z in r.stdout.strip().split("\n") if z]
    except Exception:
        return []


def main():
    ids = [l.split("\t")[0].strip() for l in open(LISTE) if l.strip()]
    doppelt, einfach, ohne, fehlt = [], 0, 0, 0
    stand = {}
    for i in range(0, len(ids), 50):
        q = "{nodes(ids:[%s]){... on Product{id title status updatedAt descriptionHtml}}}" % ",".join(
            '"gid://shopify/Product/%s"' % x for x in ids[i:i + 50])
        for n in gql(q)["data"]["nodes"]:
            if not n:
                fehlt += 1
                continue
            pid = n["id"].split("/")[-1]
            stand[pid] = n["updatedAt"]
            c = len(H4.findall(n.get("descriptionHtml") or ""))
            if c >= 2:
                doppelt.append((pid, n["title"][:44], c, n["updatedAt"], n["status"]))
            elif c == 1:
                einfach += 1
            else:
                ohne += 1
        time.sleep(0.3)

    print(f"gemessen: {len(ids)} · doppelt: {len(doppelt)} · einfach: {einfach} · "
          f"ohne Block: {ohne} · nicht gefunden: {fehlt}")

    if not doppelt:
        # ⚠️ «0» ist erst dann eine Aussage, wenn seither jemand am Text war. Sonst
        # heisst es nur «seit der Reparatur hat niemand geschrieben».
        minuten = sorted({t[:16] for t in stand.values()})
        print(f"letzte Schreibminuten der Liste: {minuten[0]} … {minuten[-1]}")
        print("FERTIG: Klasse am Objekt geschlossen")
        return

    print("\nDIE FALLE — wer hat geschrieben?")
    for m in sorted({d[3][:16].replace("T", " ") for d in doppelt}):
        tag_zeit = m.replace(" ", " ")
        treffer = logs_um(tag_zeit)
        print(f"  {m} UTC · {sum(1 for d in doppelt if d[3][:16].replace('T',' ') == m)} Produkte")
        for t in treffer[:12]:
            print(f"      Log geschrieben: {t}")
        if not treffer:
            print("      ⚠️ kein /tmp-Log in dieser Minute — Schreiber laeuft ausserhalb "
                  "des Containers ODER das Log ist einem Neustart zum Opfer gefallen")
    for d in doppelt[:25]:
        print("   DOPPELT", d[0], d[2], "×", d[3], d[1])
    # ⚠️ Ein MELDER meldet auch dann FERTIG, wenn er etwas GEFUNDEN hat: sein FERTIG haengt
    # an der Zahl der AENDERUNGEN (hier immer 0), nicht an der Zahl der Befunde. Ohne diese
    # Zeile startet der Aufseher ihn alle zwei Minuten neu — genau der Kurzschluss vom 21.08.
    print(f"FERTIG: {len(doppelt)} Befunde gemeldet, 0 geaendert")


if __name__ == "__main__":
    main()
