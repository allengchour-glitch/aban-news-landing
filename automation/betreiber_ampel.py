#!/usr/bin/env python3
"""EINE Zeile in jedem Keepalive: was gerade WIRKLICH den Betreiber braucht.

Der Betreiber am 04.09.2026: «mach das alles geht ohne mich». Das meiste geht — was nicht
geht, sind Klicks in fremden Konsolen und Geld. Bisher stand das in
`dropship/COWORK-AUFTRAEGE.md`, also in einem Dokument, das nur liest, wer danach fragt.

⚠️ Und ein Dokument veraltet: Ein Punkt, den er längst erledigt hat, steht dort weiter und
macht die Liste unglaubwürdig — dieselbe Klasse wie «ein Ledger sagt, was einmal geschrieben
wurde». Deshalb wird alles MESSBARE hier live nachgemessen und verschwindet von selbst,
sobald es behoben ist. Nur der unmessbare Rest wird gezählt, nicht behauptet.

Gibt genau eine Zeile aus (oder nichts, wenn nichts blockiert). MELDET NUR.
"""
import json, os, re, subprocess, sys, urllib.request, datetime

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
TOKPFAD = "/tmp/cj_shop_token.txt"
QUEUE_CDN = ("https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
             "tiktok_queue.json")


def gql(q, v=None):
    tok = open(TOKPFAD).read().strip()
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(),
        headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read())


def datei_speicher_voll():
    """Scheiterte in den letzten 24 h ein Upload am Speicherdeckel? Selbstklärend."""
    try:
        # ⚠️ NICHT die neuesten Dateien lesen: der Grind legt ~2'000 Produktbilder/Tag an,
        # ein Fehlschlag von heute Morgen ist mittags schon 2'000 Eintraege zurueck.
        # `query:"status:FAILED"` trifft ihn direkt (gegengeprueft: liefert genau die
        # gescheiterten; `file_status:` wird still ignoriert und liefert PROCESSING).
        d = gql('{files(first:10,query:"status:FAILED",sortKey:CREATED_AT,reverse:true)'
                '{nodes{createdAt fileErrors{code}}}}')
        knoten = ((d.get("data") or {}).get("files") or {}).get("nodes") or []
    except Exception:
        return None                      # kein Befund aus einer kaputten Abfrage
    grenze = (datetime.datetime.now(datetime.timezone.utc)
              - datetime.timedelta(hours=24))
    for k in knoten:
        codes = [f.get("code") for f in (k.get("fileErrors") or [])]
        if "FILE_STORAGE_LIMIT_EXCEEDED" not in codes:
            continue
        try:
            wann = datetime.datetime.fromisoformat(k["createdAt"].replace("Z", "+00:00"))
        except Exception:
            continue
        if wann > grenze:
            return "Shopify-Datei-Speicher voll (Einstellungen → Dateien)"
    return None


def tiktok_queue_alt():
    """Der PC-Poster liest die Queue vom CDN. Steht sie still, postet er alten Stand.

    ⚠️ NICHT am HTTP-Kopf messen: Shopifys CDN setzt `last-modified` auf den Zeitpunkt, zu dem
    der EDGE die Datei geholt hat — gemessen stand dort «jetzt» fuer eine Datei vom 31.08.
    Ein Zeitstempel des Zustellers ist kein Alter des Inhalts. Das Alter steht IM Inhalt
    (Feld `stand`), das schreibt tiktok_cowork_auftrag.py bei jedem Lauf.
    """
    try:
        roh = subprocess.run(
            ["curl", "-s", "--max-time", "20", QUEUE_CDN + "?v=ampel"],
            capture_output=True, text=True, timeout=30).stdout
        stand = (json.loads(roh) or {}).get("stand")
        tag = datetime.date.fromisoformat(stand)
    except Exception:
        return None                      # kein Befund aus einer kaputten Abfrage
    tage = (datetime.date.today() - tag).days
    return f"TikTok-Queue {tage} Tage alt" if tage >= 3 else None


def offene_punkte():
    """Zählt die Abschnitte in COWORK-AUFTRAEGE.md VOR dem Erledigt-Teil."""
    p = os.path.join(REPO, "dropship", "COWORK-AUFTRAEGE.md")
    if not os.path.exists(p):
        return 0
    text = open(p, encoding="utf-8", errors="ignore").read()
    schnitt = re.split(r"(?im)^#+\s*(?:✅\s*|bereits\s+)?erledigt", text)[0]
    # Nur echte Auftraege zaehlen: nummerierte Punkte und neu markierte. Kopfzeilen wie
    # «Wenn du heute nur drei Dinge machst» sind Wegweiser, keine Aufgaben — sie mitzuzaehlen
    # blaeht die Zahl auf, und eine aufgeblaehte Zahl wird beim zweiten Mal nicht mehr geglaubt.
    return len(re.findall(r"(?m)^##\s+(?:🆕|\d+[a-z]?\.)", schnitt))


def main():
    if not os.path.exists(TOKPFAD):
        return
    teile = [t for t in (datei_speicher_voll(), tiktok_queue_alt()) if t]
    rest = offene_punkte()
    if not teile and not rest:
        return
    if rest:
        teile.append(f"{rest} Punkte in COWORK-AUFTRAEGE.md")
    print("BRAUCHT DICH: " + " · ".join(teile))


if __name__ == "__main__":
    main()
