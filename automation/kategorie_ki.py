#!/usr/bin/env python3
"""kategorie_ki.py — Shopify-Produktkategorie per Zwei-Modell-Einigkeit für Produkte, die KEINE Titelregel trifft (04.10.2026).

ANLASS (Verbesserungsrunde «fix 12 h lang alles», Bereich kategorie-typ): die Ampel stand seit Tagen auf «KATEGORIE:
~30–42 aktive ohne Kategorie · unbekannte Typen (Trend-Produkt, Büro & Home Office, Trend-Gadget)». Gemessen 04.10.
22:45: 30 aktive ohne Kategorie, alle Sammeltypen, keine Titelregel in kategorie_wache.py traf. Der Titel allein sagt
dort oft nichts («Gel-Pads 2er Pack» = Handyhalter, «Diamant-Tropfen» = Ohrstecker, «Versteckte Leckereien» =
Hundespielzeug, «Antirutsch-Mat» = Badematte aus Diatomeenerde) — erst die Beschreibung sagt, was es ist. Der Grind legt
täglich ~250 Produkte an; solche Titel kommen immer wieder. Eine Regel je Einzelfall wäre Raten per Regex.

REGEL (eng, Zweitprüfer-Prinzip wie google_fein_ki.py):
  * Nur aktive Produkte OHNE Kategorie, für die kategorie_wache.ziel_fuer() nichts liefert (die Regeln bleiben erste Wahl).
  * Kandidaten = NUR die Taxonomie-IDs, die kategorie_wache.py schon kennt und beim Start verifiziert (TABELLE +
    TITELREGELN + KINDERREGELN, ~100 Pfade). Kein freier Text, keine erfundene ID.
  * 05.10.: UNEINIG/KEINER sperren nur SPERRTAGE_UNEINIG (1) Tag, GESETZT/FEHLER weiter SPERRTAGE (30).
  * Erstprüfer (titel_kauderwelsch_wache.gemini: Gemini, bei leerem Guthaben Groq qwen) und Zweitprüfer
    (titel_kauderwelsch_wache.gpt: ChatGPT, bei leerem Guthaben Groq gpt-oss) wählen UNABHÄNGIG je eine Nummer aus
    derselben Liste (oder 0 = «keiner passt»). Geschrieben wird nur bei gleicher Wahl ≠ 0 — oder wenn die eine Wahl
    der Elternpfad der anderen ist (gemessen 04.10.: «Antirutsch-Mat» hg-1 vs. hg-1-2, «Gel-Pads» el vs. el-4-8-4-2);
    dann gilt der GRÖBERE Pfad, auf den sich beide einigen. Sonst uneinig/0 → Ledger mit beiden Antworten, kein
    zweiter Versuch vor SPERRTAGE (30) Tagen.
  * Kontingent leer (Groq 429 «per day», Gemini 402, ChatGPT leer — gemessen 04.10. 23:00: alle drei an einem Abend):
    sauberer Abbruch ohne Ledger-Zeile, der nächste Tageslauf holt es nach. Ein Wächter, der am Kontingent stirbt,
    ist keiner — aber einer, der dann rät, ist schlimmer.
  * Eingabe je Produkt: Titel + Beschreibung ohne Boilerplate (max. 350 Zeichen). Editor/POD (pod/printful/
    selbst-gestalten/editor) nie anfassen.
  * productUpdate einzeln (höchstens MAX Produkte je Lauf, kein Massenlauf), Rücklesen category.id aus der Antwort.
  * DRY (Standard) fragt die Modelle und druckt die Wahl, schreibt KEIN Ledger (sonst sperrte der Trockenlauf den
    scharfen Lauf 30 Tage); SCHARF=1 schreibt Kategorie + Ledger dropship/_kategorie_ki.tsv (datum, handle, typ, titel,
    erst, zweit, ergebnis). MAX begrenzt (Standard 60).
  Täglich im Aufseher NACH kategorie_wache (Regeln zuerst), damit die Ampel «KATEGORIE» nicht auf Dauerständen steht.
"""
import datetime as dt, html, json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import kategorie_wache as kw
from kaufwille_zeile import gql
import titel_kauderwelsch_wache as tk
import zweitmodell

REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_kategorie_ki.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX", "60"))
SPERRTAGE = int(os.environ.get("SPERRTAGE", "30"))
# 05.10.2026 (Prüfer «kategorie», Plan 7): UNEINIG/KEINER sperrte 30 Tage — vier Produkte (Winter-Geschenkset, Antirutsch-Mat,
# Innenraum-Bürsten-Set, Gel-Pads) wären bis 03.11. ohne Kategorie geblieben. Uneinigkeit ist kein Urteil, nur ein Tag Pause;
# GESETZT/FEHLER behalten die 30 Tage.
SPERRTAGE_UNEINIG = int(os.environ.get("SPERRTAGE_UNEINIG", "1"))
POD = re.compile(r"\bpod\b|printful|selbst-gestalten|editor", re.I)
BOILER = re.compile(r"(🛡️|🚚|Sorglos shoppen|Gratis-Versand ab|Produktdetails|Das zeichnet (es|sie) aus).*$", re.S)
TC = kw.TC

PROMPT = """Du ordnest Produkte eines Schweizer Onlineshops in die Shopify-Produkt-Taxonomie ein.
Wähle für JEDES Produkt die EINE Nummer aus der Liste, deren Pfad das Produkt am genauesten beschreibt. Lies die
Beschreibung — der Titel ist oft unklar. Nimm 0, wenn kein Pfad der Liste klar passt. Lieber 0 als geraten.
Regel: Spielzeug FÜR Tiere (Hunde-/Katzenspielzeug, Kauspielzeug, Schnüffelspielzeug, Futterspielzeug) gehört zu
«Animals & Pet Supplies > Pet Supplies», nie zu «Toys & Games». Ein ferngesteuertes Tier oder ein Tier als Motiv ist kein Tierbedarf.

Pfade:
{liste}

Produkte:
{produkte}

Antworte NUR als JSON: {{"wahl": {{"<Produktnummer>": <Pfadnummer>, ...}}}} — für jedes Produkt genau ein Eintrag."""


def kandidaten():
    """Alle Taxonomie-IDs, die kategorie_wache kennt, mit fullName (verifiziert über nodes(ids:))."""
    ids = sorted(set(kw.TABELLE.values()) | {z for _, z in kw.TITELREGELN} | {z for _, z in kw.KINDERREGELN} | {"aa-1-25"})
    d = gql("query($ids:[ID!]!){ nodes(ids:$ids){ ... on TaxonomyCategory { id fullName } } }", {"ids": [TC + i for i in ids]})
    out = []
    for i, n in zip(ids, d["nodes"]):
        if not n:
            raise RuntimeError(f"Taxonomie-ID unbekannt: {i} — nichts geschrieben.")
        out.append((i, n["fullName"]))
    return out


def ledger_lesen():
    """handle → (datum, ergebnis); die jüngste Zeile je Handle zählt."""
    gesperrt = {}
    if os.path.exists(LEDGER):
        for l in open(LEDGER, encoding="utf-8"):
            f = l.rstrip("\n").split("\t")
            if len(f) >= 2:
                gesperrt[f[1]] = (f[0], (f[6] if len(f) >= 7 else "").split(" ")[0])
    return gesperrt


def gesperrt_bis(eintrag):
    """Sperrfrist je Ergebnis: UNEINIG/KEINER → SPERRTAGE_UNEINIG, alles andere → SPERRTAGE."""
    datum, erg = eintrag
    tage = SPERRTAGE_UNEINIG if erg in ("UNEINIG", "KEINER") else SPERRTAGE
    try:
        return (dt.datetime.strptime(datum[:10], "%Y-%m-%d") + dt.timedelta(days=tage)).strftime("%Y-%m-%d")
    except ValueError:
        return "9999-12-31"


def offene():
    """Aktive ohne Kategorie, ohne Regeltreffer, ohne POD, nicht im Ledger-Sperrfenster."""
    sperre = ledger_lesen()
    heute = dt.datetime.utcnow().strftime("%Y-%m-%d")
    out, cur = [], None
    while True:
        d = gql('query($c:String){ products(first:250, after:$c, query:"status:active AND -category_id:*"){ pageInfo{hasNextPage endCursor} '
                'nodes{ id handle title productType tags descriptionHtml category{id} } } }', {"c": cur})
        pg = d["products"]
        for p in pg["nodes"]:
            if p.get("category"):
                continue
            typ = (p.get("productType") or "").strip()
            if kw.ziel_fuer(typ, p.get("title")):
                continue                                   # Regel trifft → kategorie_wache setzt es
            if POD.search(" ".join(p.get("tags") or [])):
                continue
            if p["handle"] in sperre and gesperrt_bis(sperre[p["handle"]]) > heute:
                continue
            txt = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", p.get("descriptionHtml") or ""))).strip()
            txt = BOILER.sub("", txt).strip()[:350]
            out.append({"id": p["id"], "handle": p["handle"], "typ": typ, "titel": p["title"], "text": txt})
        if not pg["pageInfo"]["hasNextPage"]:
            return out
        cur = pg["pageInfo"]["endCursor"]


def fragen(fn, kand, block):
    liste = "\n".join(f"{i + 1}. {name}" for i, (_, name) in enumerate(kand))
    produkte = "\n".join(f"{j + 1}. «{p['titel']}» — {p['text'] or '(keine Beschreibung)'}" for j, p in enumerate(block))
    antwort = fn(PROMPT.format(liste=liste, produkte=produkte))
    wahl = (antwort or {}).get("wahl") or {}
    out = {}
    for j in range(len(block)):
        try:
            n = int(wahl.get(str(j + 1), 0))
        except (TypeError, ValueError):
            n = 0
        out[j] = kand[n - 1][0] if 1 <= n <= len(kand) else None
    return out


def schreiben(p, ziel):
    d = gql('mutation($id:ID!,$cat:ID!){ productUpdate(product:{id:$id, category:$cat}){ product{ category{id} } userErrors{ message } } }',
            {"id": p["id"], "cat": TC + ziel})
    r = d["productUpdate"]
    ist = ((r.get("product") or {}).get("category") or {}).get("id", "")
    return not r.get("userErrors") and ist == TC + ziel


def main():
    kand = kandidaten()
    namen = dict(kand)
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'} · {len(kand)} Kandidaten-Pfade", flush=True)
    offen = offene()[:MAX]
    print(f"  offen ohne Regeltreffer: {len(offen)}")
    if not offen:
        print("FERTIG: nichts zu tun"); return
    einig, uneinig, fehler = 0, 0, 0
    with open(LEDGER if SCHARF else os.devnull, "a", encoding="utf-8") as led:
        for i in range(0, len(offen), 15):
            block = offen[i:i + 15]
            try:
                a = fragen(tk.gemini, kand, block); erst = tk.ERSTPRUEFER
                b = fragen(tk.gpt, kand, block); zweit = zweitmodell.LETZTES_MODELL or "chatgpt"
            except Exception as e:                                  # Kontingent leer / Modelle ohne Antwort → kein Raten
                print(f"  ABBRUCH: Prüfer ohne Antwort ({type(e).__name__}: {str(e)[:160]}) — Rest ({len(offen) - i}) morgen")
                break
            for j, p in enumerate(block):
                za, zb = a.get(j), b.get(j)
                ok = bool(za) and za == zb
                if za and zb and not ok:                          # Eltern/Kind → der gröbere Pfad, auf den sich beide einigen
                    if zb.startswith(za + "-"): ok = True
                    elif za.startswith(zb + "-"): za = zb; ok = True
                erg = "EINIG" if ok else ("UNEINIG" if (za or zb) else "KEINER")
                if ok and SCHARF:
                    if schreiben(p, za):
                        erg = "GESETZT"
                    else:
                        erg = "FEHLER"; fehler += 1
                einig += ok; uneinig += (not ok)
                print(f"  {erg:8s} {p['typ'][:14]:14s} | {p['titel'][:52]:52s} | {erst[:12]}:{za or '-':12s} {zweit[:14]}:{zb or '-':12s}"
                      + (f" → {namen[za]}" if ok else ""))
                led.write(f"{dt.date.today()}\t{p['handle']}\t{p['typ']}\t{p['titel'][:80]}\t{erst}:{za or '0'}\t{zweit}:{zb or '0'}\t{erg}\n")
            led.flush()
    print(f"FERTIG: einig {einig} · uneinig/keiner {uneinig} · Fehler {fehler}" + ("" if SCHARF else " (TROCKEN, nichts geschrieben)"))


if __name__ == "__main__":
    main()
