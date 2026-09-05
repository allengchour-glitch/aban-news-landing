"""⛔ STILLGELEGT (24.08.2026) — dieses Skript hat das Problem VERSCHOENERT statt geloest.

Das dritte Audit hat belegt, dass die Streichpreise dieses Shops NIE verlangte Preise
waren: dropship/PRODUKT-PIPELINE.md (30.05.) fuehrt dieselben Produkte SKU-identisch zum
heutigen «Aktionspreis» — der durchgestrichene Wert war von Anfang an konstruiert
(x1.55/1.65/1.70, steht unten im alten Kopftext dieses Skripts selbst). PBV Art. 16
verlangt einen tatsaechlich verlangten Vergleichspreis; dieses Skript hat 8 solcher
Fantasiewerte stattdessen AUFGERUNDET (38.93 → 39.90) und damit huebscher gemacht.

Alle 57 Streichpreise der Eigenmarke sind am 24.08. entfernt
(automation/streichpreis_entfernen.py, Ledger dropship/_streichpreis_entfernt.txt);
kein Importer schreibt compareAtPrice (Grep ueber automation/: 0 Treffer) — die Klasse
waechst nicht nach. Sollten je wieder Streichpreise gesetzt werden, gilt:
NUR mit belegtem frueherem Preis, mit Enddatum (Tag sale-bis-JJJJ-MM-TT) und
Selbstabraeumer. Ein unbelegter Wert wird ENTFERNT, nie gerundet.
"""
raise SystemExit("streichpreise.py ist stillgelegt — siehe Kopfkommentar (24.08.2026)")

_ALT = """Räumt die Streichpreise auf: krumme Werte runden, Schein-Rabatte entfernen.

DER BEFUND (12.08.2026): Der Katalog ist bei den VERKAUFSpreisen erstaunlich diszipliniert —
94,98 % enden auf .90, es gibt im ganzen Shop nur vier verschiedene Endungen und keinen
einzigen krummen Preis wie «CHF 23.47». Ausgerechnet der STREICHPREIS fällt aus der Reihe:
von 54 gesetzten `compareAtPrice` sind 12 krumm — «Statt CHF 38.93», «CHF 42.33»,
«CHF 154.60». Sie sind offensichtlich als Verkaufspreis × 1.55/1.65/1.70 berechnet und nie
gerundet worden. Alle 12 stehen live im Shop, 8 zusätzlich im Google-Kanal.

Der Streichpreis ist die Zahl, die den Rabatt begründet — gerade dort sieht ein krummer Wert
nach einer Rechnung aus, die jemand vergessen hat.

ZWEITER BEFUND, unangenehmer: Bei vier Geschenk-Sets beträgt der Rabatt nur 3–8 %
(«CHF 51.90 statt CHF 53.80» = 3,5 %). Ein durchgestrichener Preis, der kaum über dem
aktuellen liegt, wirkt nicht wie ein Angebot, sondern wie ein Tippfehler — und ein Rabatt,
der praktisch keiner ist, ist als Werbeaussage angreifbar. Solche Streichpreise werden
entfernt statt gerundet: lieber kein Rabatt als ein behaupteter.

⚠️ NICHT ANGEFASST werden die 1'250 Fortura-Verkaufspreise auf .00 und die 321 auf .50. Das
sind durchgereichte Lieferantenpreise, keine Fehler — sie zu «begradigen» hiesse, 1'571
Preise ohne kaufmännischen Grund zu ändern. Hier geht es nur um den Streichpreis.

DRY=1 meldet nur.
"""

import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_streichpreise.txt"
MINDEST_RABATT = 0.10          # unter 10 % ist es kein Angebot mehr


def gql(q, v=None):
    with open("/tmp/_sp.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_sp.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def auf90(betrag):
    """Rundet auf die im Shop übliche .90-Endung — kaufmännisch, nie unter den Verkaufspreis."""
    return float(int(betrag)) + 0.90 if betrag - int(betrag) <= 0.90 else float(int(betrag)) + 1.90


def main():
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        for v in ((p.get("variants") or {}).get("nodes") or []):
            cap = v.get("compareAtPrice")
            if not cap:
                continue
            cap, preis = float(cap), float(v["price"])
            if cap <= preis:
                aufgaben.append((p["id"], p["title"], preis, cap, None, "Streichpreis ≤ Preis"))
                continue
            rabatt = (cap - preis) / cap
            if rabatt < MINDEST_RABATT:
                aufgaben.append((p["id"], p["title"], preis, cap, None,
                                 f"Schein-Rabatt {rabatt * 100:.1f} %"))
            elif round(cap % 1, 2) not in (0.90, 0.00, 0.50):
                neu = auf90(cap)
                aufgaben.append((p["id"], p["title"], preis, cap, neu, "krumm"))

    print(f"Streichpreise zu korrigieren: {len(aufgaben)}", flush=True)
    for _, t, preis, cap, neu, grund in aufgaben[:20]:
        ziel = f"→ CHF {neu:.2f}" if neu else "→ entfernen"
        print(f"   {t[:38]:<40} CHF {preis:>6.2f} statt {cap:>7.2f}  {ziel:<14} ({grund})",
              flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, titel, preis, cap, neu, grund in aufgaben:
        if gid in done:
            continue
        d = gql('query($id:ID!){node(id:$id){... on Product{variants(first:100)'
                '{nodes{id price compareAtPrice}}}}}', {"id": gid})
        vs = (((d.get("data") or {}).get("node") or {}).get("variants") or {}).get("nodes") or []
        upd = []
        for v in vs:
            c = v.get("compareAtPrice")
            if not c:
                continue
            c, pr = float(c), float(v["price"])
            if c <= pr or (c - pr) / c < MINDEST_RABATT:
                upd.append({"id": v["id"], "compareAtPrice": None})
            elif round(c % 1, 2) not in (0.90, 0.00, 0.50):
                upd.append({"id": v["id"], "compareAtPrice": f"{auf90(c):.2f}"})
        if not upd:
            f.write(f"{gid}\tnichts-zu-tun\n")
            continue
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){'
                'productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
                {"p": gid, "v": upd})
        e = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\t{grund}\t{titel}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Produkte mit korrigiertem Streichpreis")


if __name__ == "__main__":
    main()
