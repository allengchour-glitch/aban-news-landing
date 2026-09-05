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
# ⚠️ Die WENDUNG entfernen, nicht den Satz. «Das Kleid ist sofort lieferbar und in den Grössen
# S–XL erhältlich» enthält neben der falschen Zusage eine echte Information; wer den ganzen
# Satz streicht, nimmt der Kundin die Grössenangabe mit. Genauso bei «Sie ist sofort lieferbar
# und wird sorgfältig verpackt».
LIEFERBAR = r'sofort\s+(?:lieferbar|verf[üu]gbar)'
# Die Reihenfolge entscheidet, ob der Satz danach noch steht. «… ist sofort lieferbar UND WIRD
# sorgfältig verpackt» braucht das «ist» nicht mehr (der zweite Teil bringt sein eigenes Verb
# mit), «… ist sofort lieferbar UND IN den Grössen S–XL erhältlich» braucht es sehr wohl.
SCHNELL_REGELN = [
    (re.compile(r'\s*(?:ist|sind)\s+' + LIEFERBAR + r'\s+und\s+'
                r'(?=(?:wird|werden|kann|k[öo]nnen|kommt|hat|haben|liegt|passt)\b)', re.I), ' '),
    (re.compile(LIEFERBAR + r'\s+und\s+', re.I), ''),
    (re.compile(r'\s*,?\s+und\s+' + LIEFERBAR, re.I), ''),
    (re.compile(r'\s*(?:ist|sind)\s+' + LIEFERBAR, re.I), ''),
    (re.compile(r'\s*' + LIEFERBAR, re.I), ''),
    # Die Express-Zusage steht für sich allein — dort fällt der ganze Satz.
    (re.compile(r'[^.<>]*\bExpresslieferung\s+innerhalb\s+von\s+\d+\s*Tag\w*[^.<>]*\.?', re.I), ''),
]


def schnell_weg(text):
    """Gibt den Text unverändert zurück, wenn keine Regel greift — sonst geglättet.

    ⚠️ Die Glättung DARF NICHT bedingungslos laufen. «\\s{2,}» → « » verändert praktisch jede
    Beschreibung im Katalog; im ersten Anlauf meldete dieses Skript deshalb 5'718 «Fälle», von
    denen 5'712 gar keine Schnellzusage enthielten. Der Vergleich «neu != alt» nützt nichts,
    wenn schon das Werkzeug selbst jeden Text anfasst.
    """
    neu = text
    for muster, ersatz in SCHNELL_REGELN:
        neu = muster.sub(ersatz, neu)
    if neu == text:
        return text
    neu = re.sub(r'\s{2,}', ' ', neu)
    neu = re.sub(r'\s+([.,;:])', r'\1', neu)
    # Der entfernte Zusatz hinterlässt sonst einen nackten Gedankenstrich am Zeilenende
    # («Zigarettenhalter mit Band – </h3>»).
    return re.sub(r'\s*[–—·-]\s*(?=</|$)', '', neu)
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
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def _neu_for_show(html):
    return schnell_weg(html)


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
        # ⚠️ NUR AUFRÄUMEN, WO AUCH ETWAS ENTFERNT WURDE. Der erste Entwurf liess die
        # Leerraum-Normalisierung («\s{2,}» → « ») und das Entfernen leerer Absätze
        # bedingungslos laufen — und meldete daraufhin 5'734 «Widersprüche», von denen 5'728
        # gar keine Schnellzusage enthielten. Sie hätten alle eine sinnlose Textänderung
        # bekommen. Ein Reiniger, der jede Beschreibung anfasst, ist kein Reiniger.
        neu_html = schnell_weg(html)
        if neu_html != html:
            neu_html = re.sub(r'<li\b[^>]*>\s*</li>', '', neu_html)
            neu_html = re.sub(r'<p\b[^>]*>\s*</p>', '', neu_html)
            neu_html = re.sub(r'\s{2,}', ' ', neu_html)
        neu_t = re.sub(r'\s{2,}', ' ', SCHNELL_TITEL.sub(' ', t)).strip(" ·-–—,")
        if neu_html != html or (neu_t != t and len(neu_t) >= 12):
            aufgaben.append((p["id"], t, neu_t if len(neu_t) >= 12 else t, html, neu_html))

    print(f"Widersprüchliche Lieferversprechen: {len(aufgaben)}", flush=True)
    for _, t, neu_t, html, _ in aufgaben:
        import difflib
        a = re.sub(r'<[^>]+>', ' ', html)
        b = re.sub(r'<[^>]+>', ' ', _neu_for_show(html))
        print(f"   {t[:42]:<44}", flush=True)
        for zeile in difflib.unified_diff(a.split('. '), b.split('. '), n=0, lineterm=''):
            if zeile.startswith(('-', '+')) and not zeile.startswith(('---', '+++')):
                print(f"      {zeile[0]} {zeile[1:].strip()[:78]}", flush=True)
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
