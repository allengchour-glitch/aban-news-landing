#!/usr/bin/env python3
"""keyword_kollektionen.py — Suchbegriffe mit gemessenem CH-Volumen auf BESTEHENDE Kollektionsseiten legen (05.10.2026).

ANLASS: Betreiber «keyword mehr machen». Die Gratis-Ernte `dropship/semrush/keywords_erweiterung_ch_2026-10-05.csv`
trägt 19 Begriffe mit Semrush-Volumen (Konto danach leer) und 6'678 Google-Vorschläge ohne Volumen. Dieses Skript ist das
Tor für den Bereich «kollektionen-keywords»: je Kollektion EIN Begriff (≥ 50/Mt), der in SEO-Titel, H1 und erstem Satz noch
nicht vorkommt; SEO-Titel + Meta (IMMER beide Felder — SEOInput ersetzt) und die Einleitung (descriptionHtml) neu, der Block
<!-- ls-verwandt --> … <!-- /ls-verwandt --> bleibt wörtlich stehen (interne_links.py besitzt ihn).

  Regeln  Titel ≤ 60 Zeichen inkl. « | LuxeStyle», Meta ≤ 155, Begriff in beiden; Einleitung 80–150 Wörter mit Begriff + 1–2
          Long-Tail-Varianten (aus den Google-Vorschlägen derselben CSV); kein ß, kein «!», keine Sie-Form, keine Fremdmarke.
          Zahlen nur aus Varianten (selectedOptions + availableForSale) — gemessen am 05.10. in der Vorbereitung.
  Sperre  Handles aus den Ledgern paralleler Workflows (SPERR_DATEIEN) werden direkt vor dem Schreiben NEU gelesen.
  Ledger  dropship/semrush/_keyword_kollektionen_2026-10-05.tsv (zeit, handle, keyword, alt_json, neu_json, status) — umkehrbar.
  python3 automation/keyword_kollektionen.py            Trockenlauf (Prüfliste, nichts geschrieben)
  SCHARF=1 python3 automation/keyword_kollektionen.py   schreiben + live zurücklesen
  SCHARF=1 python3 automation/keyword_kollektionen.py --zurueck   Altwerte aus dem Ledger zurückschreiben
"""
import datetime as dt, glob, json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql

ORDNER = os.path.join(REPO, "dropship", "semrush")
LEDGER = os.path.join(ORDNER, "_keyword_kollektionen_2026-10-05.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
SPERR_DATEIEN = ["_neue_kollektionen_2_2026-10-05.tsv", "_neue_kollektionen_2026-10-05.tsv", "_platz41_heben_2026-10-05.tsv",
                 "_draft_ersatz_2026-10-05.tsv", "_seite2_heben_2026-10-05.tsv", "_nacharbeit_runde2_2026-10-05.tsv",
                 "_seo_kollektion_ledger.tsv", "seo_titel_geprueft_2026-10-02.tsv", "_kannibalisierung_2026-10-05.tsv"]
ANFANG, ENDE = "<!-- ls-verwandt -->", "<!-- /ls-verwandt -->"
BLOCK_RE = re.compile(re.escape(ANFANG) + r".*?" + re.escape(ENDE), re.S)
SIE = re.compile(r"\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b")
MARKEN = re.compile(r"calzedonia|beldona|tamaris|gabor|rieker|hunter|stanley|dyson|nike|adidas", re.I)
Q = "query($h:String!){c:collectionByHandle(handle:$h){id title seo{title description} descriptionHtml}}"
M = ("mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{seo{title description} descriptionHtml} "
     "userErrors{field message}}}")

# Begriff (Volumen/Mt), Long-Tail-Varianten (quelle=suggest derselben CSV), neue Felder. Zahlen = Varianten-Messung 05.10.
PLAN = [
    {
        "handle": "sub-bademode", "keyword": "bikini set damen", "volumen": 1000,
        "longtail": ["bikini damen schwarz", "bikini kaufen schweiz"],
        "titel": "Bikini-Set Damen & Badeanzüge kaufen | LuxeStyle",
        "meta": "Bikini-Set Damen online kaufen: Neckholder, Einteiler, Tankini und Badeanzüge in S bis 4XL, viele Farben. "
                "Gratisversand ab CHF 50, TWINT & Klarna.",
        "html": "<p>Bikini-Set Damen, Badeanzug oder Tankini: In der Bademode findest du zweiteilige Bikini-Sets mit Neckholder, "
                "Front-Zip oder doppelten Trägern, Tankinis mit hohem Kragen, sportliche Einteiler und figurbetonte Badeanzüge – "
                "dazu gehäkelte Cover-ups für den Strand. Auch als Partnerlook-Set oder zum Selbstgestalten mit deinem eigenen Motiv.</p>"
                "<p>Wer einen Bikini in der Schweiz kaufen will, bekommt hier Grössen von S bis 4XL und Farben von Schwarz über "
                "Saphirblau bis Weinrot – ein Bikini Damen schwarz ist bei den meisten Modellen wählbar. Jede Produktseite zeigt "
                "Material, Grössentabelle und Lieferzeit.</p>"
                "<p>✔ Geprüfte Angaben · 🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · "
                "–10 % mit Code WELCOME10</p><!--gd2-->",
    },
    {
        "handle": "sub-ballerinas", "keyword": "ballerinas schwarz", "volumen": 260,
        "longtail": ["ballerinas damen leder", "ballerinas kinder mädchen"],
        "titel": "Ballerinas schwarz, Flats & Loafers kaufen | LuxeStyle",
        "meta": "Ballerinas schwarz für Damen und Mädchen, dazu Flats, Mary Janes und Loafers aus Leder, Satin oder Mesh in "
                "Gr. 21–48. Gratisversand ab CHF 50, TWINT & Klarna.",
        "html": "<p>Ballerinas schwarz, Flats und Loafers für Damen, Herren und Kinder bei LuxeStyle Schweiz: flache Schuhe für "
                "Büro, Schule und Alltag. Die Auswahl reicht von Mary Janes mit Riemchen über Ballerinas Damen aus Leder, Wildleder "
                "oder Satin bis zu Loafers mit Quasten und Mokassins für Herren. Ballerinas für Kinder und Mädchen gibt es mit "
                "Schleife, Strass oder Klettverschluss – Schwarz steht bei den meisten Paaren zur Wahl. Grössen von 21 bis 48, "
                "faire Preise, Gratis-Versand ab CHF 50, 30 Tage Rückgabe.</p>",
    },
    {
        "handle": "babykleidung", "keyword": "babykleidung junge", "volumen": 170,
        "longtail": ["babykleidung mädchen", "babykleidung neugeborene"],
        "titel": "Babykleidung Junge & Mädchen: Sets, Strampler | LuxeStyle",
        "meta": "Babykleidung Junge und Mädchen: Strampler, Bodys, Sets mit Shirt und Hose, Kleidchen und Badeanzüge in "
                "Gr. 52–150 cm. Gratisversand ab CHF 50, TWINT & Klarna.",
        "html": "<p>Babykleidung für Junge und Mädchen: Strampler, Bodys, Sets, Kleidchen und Badeanzüge für Babys und Kinder – "
                "weich, bequem und alltagstauglich. Für Jungen gibt es zweiteilige Sets mit Kurzarmshirt und Shorts, eine "
                "Latzhose, Strickpullover mit Hose und Sweatshirts mit Bagger-Motiv (Gr. 70–140 cm); Babykleidung für Mädchen "
                "reicht vom Strampler mit Tüllrock bis zum Sommerkleid mit Cartoon-Print. Babykleidung für Neugeborene: "
                "Body-und-Hose-Set aus Baumwolle und Foto-Set mit Mütze. Die Grössen gehen von 52 bis 150 cm – auf jeder "
                "Produktseite steht die Masstabelle. Gratis Versand in die Schweiz ab CHF 50, bezahlen mit TWINT oder auf "
                "Rechnung mit Klarna.</p>",
    },
]


def norm(t):
    t = (t or "").lower().replace("ß", "ss")
    return re.sub(r"[\s\-–]+", " ", re.sub(r"<[^>]+>", " ", t)).strip()


def woerter(html):
    return len(re.findall(r"\S+", re.sub(r"<[^>]+>", " ", BLOCK_RE.sub("", html or ""))))


def gesperrt():
    s = set()
    for n in SPERR_DATEIEN:
        p = os.path.join(ORDNER, n)
        if not os.path.exists(p):
            continue
        for z in open(p, encoding="utf-8"):
            for f in z.rstrip("\n").split("\t")[:4]:
                s.add(f.strip())
    for p in glob.glob(os.path.join(ORDNER, "NACHARBEIT*")) + glob.glob(os.path.join(ORDNER, "_nacharbeit*")):
        for z in open(p, encoding="utf-8"):
            for f in z.rstrip("\n").split("\t")[:4]:
                s.add(f.strip())
    return s


def pruefen(e, c):
    f, kw, t, x = [], e["keyword"], e["titel"], e["meta"]
    if len(t) > 60: f.append(f"Titel {len(t)} Z.")
    if not t.endswith(" | LuxeStyle"): f.append("Titel ohne « | LuxeStyle»")
    if len(x) > 155: f.append(f"Meta {len(x)} Z.")
    if norm(kw) not in norm(t): f.append("Titel ohne Begriff")
    if norm(kw) not in norm(x): f.append("Meta ohne Begriff")
    if norm(kw) not in norm(e["html"]): f.append("Einleitung ohne Begriff")
    lt = [l for l in e["longtail"] if norm(l) not in norm(e["html"])]
    if lt: f.append(f"Long-Tail fehlt: {lt}")
    w = woerter(e["html"])
    if not 80 <= w <= 150: f.append(f"Einleitung {w} Wörter")
    for name, s in (("Titel", t), ("Meta", x), ("Einleitung", e["html"])):
        if "ß" in s or "!" in re.sub(r"<!--.*?-->", "", s): f.append(f"{name}: ß/!")
        if SIE.search(re.sub(r"<[^>]+>", " ", s)): f.append(f"{name}: Sie-Form")
        if MARKEN.search(s): f.append(f"{name}: Fremdmarke")
    alt = c["seo"] or {}
    for name, s in (("SEO-Titel", alt.get("title")), ("H1", c["title"]), ("erster Satz", re.split(r"[.!?]", norm(c["descriptionHtml"]))[0])):
        if norm(kw) in norm(s): f.append(f"Begriff schon in {name}")
    if ANFANG in (c["descriptionHtml"] or "") and ANFANG in e["html"]:
        f.append("Block darf nicht im Plan stehen")
    return f


def neu_html(e, alt):
    m = BLOCK_RE.search(alt or "")
    return e["html"] + ("\n" + m.group(0) if m else "")


def schreiben(cid, t, x, html):
    r = gql(M, {"i": {"id": cid, "seo": {"title": t, "description": x}, "descriptionHtml": html}})["collectionUpdate"]
    c = r.get("collection") or {}
    s = c.get("seo") or {}
    gut = (not r["userErrors"]) and s.get("title") == t and s.get("description") == x and (c.get("descriptionHtml") or "").strip() == html.strip()
    return gut, r["userErrors"]


def zurueck():
    for z in open(LEDGER, encoding="utf-8"):
        f = z.rstrip("\n").split("\t")
        if len(f) < 6 or f[5] != "ok":
            continue
        alt = json.loads(f[3])
        c = gql(Q, {"h": f[1]})["c"]
        print(f"  {f[1]}: «{(c['seo'] or {}).get('title')}» → «{alt['seo'].get('title')}»" + ("" if SCHARF else " (trocken)"))
        if SCHARF and c:
            gut, err = schreiben(c["id"], alt["seo"].get("title"), alt["seo"].get("description"), alt["descriptionHtml"])
            print("    ok" if gut else f"    FEHLER {err}")


def main():
    if "--zurueck" in sys.argv:
        return zurueck()
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[1] for z in open(LEDGER, encoding="utf-8") if z.rstrip("\n").endswith("\tok")}
    begriffe, ok = set(), 0
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for e in PLAN:
        h = e["handle"]
        if h in erledigt:
            print(f"  = {h} schon im Ledger"); continue
        sperre = gesperrt()          # direkt VOR jedem Schreiben neu lesen (parallele Workflows)
        c = gql(Q, {"h": h})["c"]
        f = pruefen(e, c) if c else ["Kollektion fehlt"]
        if h in sperre: f.append("GESPERRT (Ledger eines parallelen Workflows)")
        if norm(e["keyword"]) in begriffe: f.append("Begriff schon auf anderer Seite (Kannibalisierung)")
        html = neu_html(e, c["descriptionHtml"] if c else "")
        print(f"  {'✓' if not f else '✗'} {h} [{e['keyword']} {e['volumen']}/Mt] «{e['titel']}» ({len(e['titel'])} Z.) · Meta {len(e['meta'])} Z. · "
              f"Einleitung {woerter(e['html'])} W." + (f" — {'; '.join(f)}" if f else ""))
        if f:
            continue
        begriffe.add(norm(e["keyword"])); ok += 1
        if SCHARF:
            alt = {"seo": c["seo"] or {}, "descriptionHtml": c["descriptionHtml"] or ""}
            gut, err = schreiben(c["id"], e["titel"], e["meta"], html)
            neu = {"seo": {"title": e["titel"], "description": e["meta"]}, "descriptionHtml": html}
            led.write("\t".join([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), h, e["keyword"], json.dumps(alt, ensure_ascii=False),
                                 json.dumps(neu, ensure_ascii=False), "ok" if gut else "FEHLER " + str(err)]) + "\n")
            led.flush()
            print("    " + ("geschrieben + zurückgelesen" if gut else f"FEHLER {err}"))
    print(f"FERTIG: {ok} regelkonform")


if __name__ == "__main__":
    main()
