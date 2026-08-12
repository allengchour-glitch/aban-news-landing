"""Streicht schnelle Lieferversprechen bei Ware, die aus China kommt.

WARUM DAS ZÄHLT: Heute kam die Mail eines Kunden — «Ich habe bei Ihnen eine Hängematte
gekauft. Wann kann ich mit der Lieferung rechnen?» Er wartete seit dem 7. August auf ein
Paket, das ab Werk verschickt wird und 10 bis 20 Werktage braucht. Genau solche Mails
entstehen, wenn im Produkttext etwas anderes steht als in der Realität.

DER BEFUND (12.08.2026): Die grosse Prüfung ist SAUBER — alle 2'593 Produkte mit «Lieferung in
nur 1–2 Werktagen (DPD)» tragen ausnahmslos den Tag `ch-lager`, exakt 2'593 zu 2'593, kein
einziger Ausreisser. Das Blitzversand-Versprechen steht also nirgends fälschlich auf
China-Ware.

Übrig bleiben sechs Einzelfälle, und die widersprechen sich im EIGENEN Text:
 • «Casual Paar-Sneakers in Rot» verspricht «Expresslieferung innerhalb von 3 Tagen» und
   zwei Zeilen tiefer «Lieferung ca. 10–20 Tage».
 • Fünf Produkte sagen «sofort lieferbar» bei real 10–20 Tagen — bei einem steht es sogar im
   Titel («Zigarettenhalter mit Band – Sofort Lieferbar»).

Die schnelle Zusage wird gestrichen, die ehrliche Angabe bleibt stehen. Nicht andersherum:
Die 10–20 Tage sind die Wahrheit, und ein Kunde, der sie vorher liest, schreibt keine Mail —
und storniert nicht.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_lieferzeit_widerspruch.txt"

# Nur Zusagen, die eine SCHNELLE Lieferung behaupten. Die Zeitspannen selbst (10–20 Tage)
# bleiben unangetastet — sie sind die richtige Angabe.
SCHNELL_SATZ = re.compile(r'[^.<>]*\b(?:Expresslieferung\s+innerhalb\s+von\s+\d+\s*Tag\w*|'
                          r'sofort\s+lieferbar|sofort\s+verf[üu]gbar)\b[^.<>]*\.?', re.I)
SCHNELL_TITEL = re.compile(r'\s*[–—·-]?\s*\bSofort\s+Lieferbar\b\s*', re.I)


def gql(q, v=None):
    with open("/tmp/_lz.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_lz.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def main():
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        tags = {x.lower() for x in (p.get("tags") or [])}
        if "ch-lager" in tags:
            continue                       # dort stimmt die schnelle Zusage
        t, html = p["title"], (p.get("descriptionHtml") or "")
        neu_html = SCHNELL_SATZ.sub("", html)
        neu_html = re.sub(r'<li\b[^>]*>\s*</li>', '', neu_html)
        neu_html = re.sub(r'<p\b[^>]*>\s*</p>', '', neu_html)
        neu_html = re.sub(r'\s{2,}', ' ', neu_html)
        neu_t = re.sub(r'\s{2,}', ' ', SCHNELL_TITEL.sub(' ', t)).strip(" ·-–—,")
        if neu_html != html or (neu_t != t and len(neu_t) >= 12):
            aufgaben.append((p["id"], t, neu_t if len(neu_t) >= 12 else t, html, neu_html))

    print(f"Widersprüchliche Lieferversprechen: {len(aufgaben)}", flush=True)
    for _, t, neu_t, html, _ in aufgaben:
        m = SCHNELL_SATZ.search(html)
        print(f"   {t[:42]:<44} weg: «{(m.group(0).strip() if m else '')[:44]}»", flush=True)
        if neu_t != t:
            print(f"   {'':<44} Titel → «{neu_t[:44]}»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, t, neu_t, html, neu_html in aufgaben:
        if gid in done:
            continue
        eingabe = {"id": gid, "descriptionHtml": neu_html}
        if neu_t != t:
            eingabe["title"] = neu_t
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": eingabe})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        n += 1
        f.write(f"{gid}\tschnellzusage-weg\t{neu_t}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Produkte ohne falsches Schnellversprechen")


if __name__ == "__main__":
    main()
