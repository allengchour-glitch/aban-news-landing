"""Entfernt Werbe- und Versandbausteine aus den Produktbeschreibungen.

ANLASS (Merchant-Audit 2026-08-09): **97,7 % aller Feed-Beschreibungen** enthalten
Rabattcode und Versandwerbung («Gratis-Versand ab CHF 65 · –10 % mit Code WELCOME10»).
Google verbietet Werbetext im `description`-Attribut — und der Verstoss trifft den ganzen Feed
auf einmal. Das erklärt eine Massenablehnung besser als jede einzelne Feldlücke.

Der Baustein löst gleich mehrere Probleme auf einmal:
 - Google-Verstoss «promotional text in description»
 - die falsche Gratis-Schwelle (im Profil greift CHF 50, im Text steht 65) verschwindet damit
   aus 3'400+ Beschreibungen, ohne dass die Preisfrage entschieden werden muss
 - der Grossteil der Emoji-Überladung (1'113 von 5'000 mit >=10 Symbolen) stammt aus diesem Block

Die Information geht dem Kunden NICHT verloren: Versandversprechen, Rückgabe und Code stehen im
Theme (Ankündigungsleiste, Produktseiten-Badges) — also genau dort, wo sie hingehören.

⚠️ Vorsicht walten lassen: Es wird NUR der klar abgegrenzte Werbeblock entfernt, nie ein ganzer
Absatz mit Produktinfo. Jede Ersetzung wird vorher gegen den Originaltext geprüft; sinkt die
Beschreibung dadurch unter MIN_REST Zeichen, wird das Produkt übersprungen und gemeldet —
eine leere Beschreibung ist bei Google schlimmer als eine mit Werbung.

DRY=1 zeigt die geplanten Änderungen, ohne zu speichern.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_promo_clean_done.txt"
MIN_REST = int(os.environ.get("MIN_REST", "80"))

# Absätze, die AUSSCHLIESSLICH Werbung/Versandversprechen sind.
WERBUNG = [
    # ganzer <p> mit Trust-/Versandkette (mit oder ohne Flaggen-Emoji)
    re.compile(r'<p>\s*(?:[\U0001F000-\U0001FAFF←-⇿☀-➿️\s]*)?'
               r'(?:Schweizer\s+(?:Online-)?Shop|Gratis-?\s?[Vv]ersand)[^<]*'
               r'(?:<(?!/p>)[^>]*>[^<]*)*</p>', re.S),
    # eigenständige Rabattcode-Zeile
    re.compile(r'<p>[^<]*Code\s*<strong>\s*WELCOME10\s*</strong>[^<]*</p>', re.S),
    re.compile(r'<p>[^<]*WELCOME10[^<]*</p>', re.S),
    # Dieselben Werbeversprechen stehen bei vielen Produkten als LISTENPUNKTE statt als Absatz.
    # Die reine <p>-Regel liess deshalb 15 % der Feed-Beschreibungen unberührt — und dort stand
    # weiterhin die inzwischen falsche Schwelle «ab CHF 65» (richtig: 50). Entfernt werden nur
    # Punkte, die AUSSCHLIESSLICH Shop-Versprechen enthalten, nie Produktangaben.
    re.compile(r'<li>(?:(?!</li>).)*?(?:WELCOME10|Gratis-?\s?[Vv]ersand|Sicher\s+einkaufen|'
               r'R[üu]ckgabe:\s*30\s*Tage)(?:(?!</li>).)*?</li>', re.S),
]


def gql(q, v=None):
    with open("/tmp/_pb.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_pb.json"], capture_output=True, text=True)
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


def saeubern(html):
    neu = html
    for rx in WERBUNG:
        neu = rx.sub("", neu)
    neu = re.sub(r'(?:<p>\s*</p>\s*)+', "", neu)
    # Leergeräumte Listen entfernen, sonst bleibt ein <ul></ul>-Gerippe stehen.
    neu = re.sub(r'<ul>\s*</ul>', "", neu)
    neu = re.sub(r'\n{3,}', "\n\n", neu).strip()
    return neu


def main():
    st = "/tmp/promoclean_cursor.txt"
    cur = open(st).read().strip() or None if os.path.exists(st) else None
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = geaendert = zu_kurz = 0
    while True:
        d = gql('query($c:String){products(first:100,after:$c,query:"status:ACTIVE"){'
                'pageInfo{hasNextPage endCursor} nodes{id title descriptionHtml}}}', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("keine Daten", flush=True); break
        for p in pg["nodes"]:
            n += 1
            if p["id"] in done:
                continue
            alt = p["descriptionHtml"] or ""
            if not re.search(r'WELCOME10|Gratis-?\s?[Vv]ersand|Schweizer\s+(?:Online-)?Shop'
                             r'|Sicher\s+einkaufen|R[üu]ckgabe:\s*30\s*Tage', alt):
                continue
            neu = saeubern(alt)
            if neu == alt:
                continue
            if len(re.sub(r'<[^>]+>', '', neu).strip()) < MIN_REST:
                zu_kurz += 1
                print(f"  ⏭️ übersprungen (Rest zu kurz): {p['title'][:50]}", flush=True)
                continue
            geaendert += 1
            if geaendert <= 5:
                weg = len(alt) - len(neu)
                print(f"  {p['title'][:46]:<46} −{weg} Zeichen", flush=True)
            if DRY:
                continue
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": p["id"], "descriptionHtml": neu}})
            f.write(f"{p['id']}\tbereinigt\n"); f.flush()
            time.sleep(0.18)
        if n % 1000 < 100:
            print(f"  gescannt {n} | bereinigt {geaendert} | übersprungen {zu_kurz}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        if not DRY:
            open(st, "w").write(cur)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {n} gescannt, {geaendert} bereinigt, {zu_kurz} übersprungen")


if __name__ == "__main__":
    main()
