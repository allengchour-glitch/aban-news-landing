"""Schiebt führende Modellcodes ans Titelende, statt sie zu löschen.

GEFUNDEN IM KATALOG-AUDIT (2026-08-10): 14 Titel beginnen mit einem Code — «YSM8003
Rahmenlose Sonnenbrille», «SF3500 Handheld-Konsole». In der Kachelansicht sieht der Kunde
zuerst eine Buchstaben-Zahlen-Folge statt des Produkts.

WARUM VERSCHIEBEN UND NICHT LÖSCHEN: Die Codes sind ungleich viel wert. «YSM8003» ist eine
reine Lieferantennummer, aber «ER26500» ist die genormte Batteriegrösse, «ELM327» der
Chip-Standard für OBD2-Diagnose und «BM800» ein Mikrofonmodell, nach dem Kunden ausdrücklich
suchen. Sie zu löschen würde Bedeutung und Suchtreffer vernichten. Ein Code am Ende stört
niemanden; ein fehlender Code kann ein Produkt unauffindbar machen. Im Zweifel also erhalten.

Das ist dieselbe Lehre wie bei der Tag-Chirurgie (Regel 9b): die schonendste Variante wählen,
die das Problem löst — nicht die gründlichste.

Vorlage: /tmp/_code_titel.json (aus katalog_audit.py). DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_modellcode_titel.txt"
EXPORT = os.environ.get("EXPORT", "/tmp/katalog_export.jsonl")

# Bewusst OHNE re.I: Lieferantencodes sind gross geschrieben. Mit Ignorierung der Gross-
# schreibung träfe das Muster auch Wörter wie «Skulptur» — genau die Wortgrenzen-Falle,
# die dieses Projekt schon zweimal Geld gekostet hat.
FUEHREND = re.compile(r'^([A-Z]{2,5}[-_]?\d{3,6}[A-Z]?)\s+(?=[A-ZÄÖÜ])')
# Genormte Bezeichnungen, die vorne stehen dürfen, weil sie den Artikel BESCHREIBEN.
NORMCODE = re.compile(r'^(?:CR|LR|SR|AG|LV|IPX?|USB|HDMI|DDR|SATA|PD|QC|RGB|LED|UV|SPF)\d')


def gql(q, v=None):
    with open("/tmp/_mc.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mc.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["id"] in done:
            continue
        m = FUEHREND.match(p["titel"])
        if not m or NORMCODE.match(m.group(1)):
            continue
        code, rest = m.group(1), p["titel"][m.end():].strip()
        if len(rest) < 12:
            continue                     # ohne Code bliebe kein aussagekräftiger Titel
        neu = f"{rest} · {code}"
        if len(neu) > 255:
            continue
        n += 1
        print(f"  {p['titel'][:52]}\n     → {neu[:52]}", flush=True)
        if DRY:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": p["id"], "title": neu}})
        errs = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if errs:
            print(f"     ⚠️ {errs[0].get('message')}", flush=True)
            continue
        f.write(f"{p['id']}\t{code}\t{neu}\n"); f.flush()
        time.sleep(0.25)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {n} Titel umgestellt")


if __name__ == "__main__":
    main()
