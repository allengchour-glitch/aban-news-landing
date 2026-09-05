"""Zieht die Versandschwelle im BESCHREIBUNGSTEXT nach — dort, wo der Korrekturlauf nicht hinkam.

DER BEFUND (Nachkontrolle 12.08.2026): Die Quelle ist repariert, alle 1'995 heute angelegten
Produkte sagen «Gratis-Versand ab CHF 50». Der Altbestand aber nur zur Hälfte: der
Korrekturlauf vom 11.08. hat die SEO-Felder erfasst und den `descriptionHtml` NICHT.

Das Ergebnis ist schlimmer als ein einheitlich falscher Wert: **bei 458 Produkten sagt die
SEO-Beschreibung derselben Seite «ab CHF 50» und der Fliesstext «ab CHF 65».** Die Seite
widerspricht sich selbst, und Google zieht bevorzugt den Fliesstext.

Drei Quellen der Altlast, alle drei ein fest verdrahteter Textbaustein:
   263 POD/Sticker   «🇨🇭 Schweizer Shop · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe»
   142 BigBuy        «📦 Lieferung aus EU-Lager · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe»
    83 CJ + 11 hand-kuratierte Altprodukte aus Juni

Dazu eine DRITTE Zahl, nach der niemand gesucht hat: 12 Produkte vom 30./31. Mai versprechen
«Gratisversand ab CHF 49». Der Reiniger kannte nur 65, also blieb 49 unbehelligt — eine
Erinnerung daran, dass man beim Aufräumen nach dem FELD suchen muss, nicht nach dem Fehler,
den man erwartet.

Und ein Fund eigener Art: zwei Fasnachtsbonbons tragen den B2B-Grosshandelstext des
Lieferanten im Kundentext («Für Bestellungen ab 30 Kilo gelten unsere Portopauschalen
nicht…»). Das ist keine falsche Schwelle, das ist eine Konditionsvereinbarung mit einem
Händler, die eine Privatkundin lesen kann.

⚠️ Ersetzt wird nur, wo VERSAND im Satz steht. «CHF 653» (ein Schminktisch) und «112 x 65 x
35 mm» dürfen nicht angefasst werden — deshalb steht hinter der Zahl eine Grenze und vor ihr
ein Versandwort.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_versandschwelle_text.txt"

# «Gratis-Versand ab CHF 65» / «gratis ab CHF 65» / «Gratisversand ab CHF 49».
# Das Versandwort MUSS davorstehen; die Zahl darf keine weitere Ziffer nach sich haben.
SCHWELLE = re.compile(r'((?:Gratis[- ]?[Vv]ersand|[Vv]ersandkostenfrei|gratis)\s*(?:ab|über)\s*'
                      r'CHF\s*)(65|49)(?![0-9.,])')
# Der Grosshandelstext des Lieferanten, Satz für Satz.
B2B = re.compile(r'[^.<>]*\b(?:Portopauschale\w*|Bestellungen\s+ab\s+\d+\s*Kilo|'
                 r'Wiederverk[äa]ufer|B2B|Handelspartner|Mindestbestellwert\s+f[üu]r\s+H[äa]ndler)'
                 r'\b[^.<>]*\.?', re.I)


def gql(q, v=None):
    with open("/tmp/_vst.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_vst.json"], capture_output=True, text=True)
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


def main():
    aufgaben, statistik = [], Counter()
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        html = p.get("descriptionHtml") or ""
        seo = (p.get("seo") or {}).get("description") or ""
        neu_html = SCHWELLE.sub(lambda m: m.group(1) + "50", html)
        neu_seo = SCHWELLE.sub(lambda m: m.group(1) + "50", seo)
        b2b_weg = []
        for m in B2B.finditer(neu_html):
            if len(m.group(0).strip()) > 12:
                b2b_weg.append(m.group(0).strip())
        if b2b_weg:
            neu_html = B2B.sub("", neu_html)
            neu_html = re.sub(r'<p\b[^>]*>\s*</p>', '', neu_html)
            neu_html = re.sub(r'\s{2,}', ' ', neu_html)
        if neu_html == html and neu_seo == seo:
            continue
        for m in SCHWELLE.finditer(html + " " + seo):
            statistik["CHF " + m.group(2)] += 1
        if b2b_weg:
            statistik["B2B-Text"] += 1
        aufgaben.append((p["id"], p["title"], html, neu_html, seo, neu_seo, b2b_weg))

    print(f"Produkte mit falscher Versandschwelle im Text: {len(aufgaben)}", flush=True)
    for k, v in statistik.most_common():
        print(f"   {v:>4}  {k}", flush=True)
    for _, t, html, neu_html, _, _, b2b in aufgaben[:6 if DRY else 2]:
        m = SCHWELLE.search(html)
        if m:
            s = max(0, m.start() - 40)
            print(f"   {t[:34]:<36} «{re.sub(r'<[^>]+>', ' ', html[s:m.end() + 20]).strip()[:66]}»",
                  flush=True)
        for b in b2b[:1]:
            print(f"   {t[:34]:<36} B2B weg: «{re.sub(r'<[^>]+>', ' ', b).strip()[:66]}»",
                  flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, titel, html, neu_html, seo, neu_seo, _ in aufgaben:
        if gid in done:
            continue
        eingabe = {"id": gid}
        if neu_html != html:
            eingabe["descriptionHtml"] = neu_html
        if neu_seo != seo:
            eingabe["seo"] = {"description": neu_seo}
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": eingabe})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\tschwelle-50\n")
        if n % 100 == 0:
            f.flush()
            print(f"  … {n}/{len(aufgaben)}", flush=True)
        time.sleep(0.25)
    f.flush()
    print(f"FERTIG: {n} Texte auf CHF 50 gestellt")


if __name__ == "__main__":
    main()
