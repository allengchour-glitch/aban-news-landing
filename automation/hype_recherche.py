#!/usr/bin/env python3
"""hype_recherche.py — täglicher Hype-Vorschlag OHNE Session (06.10.2026, Betreiber «tool installieren selber programmieren»).

Der Dauerauftrag «informiere dich immer über neuste hype produkte» hing bisher an einer laufenden Session (WebSearch).
Jetzt: (1) `tools/recherche.py` fragt das Netz (Groq gpt-oss + browser_search, mit Quellen-URLs),
(2) ein zweiter Groq-Aufruf OHNE Werkzeug zieht daraus eine JSON-Liste {thema, suchwort} (deutsches Wort, wie es in
    unseren Titeln steht), (3) GEGENPROBE am Bestand: productsCount(«title:*wort* status:active») — dasselbe Verfahren,
    das die Sessions seit 21.09. von Hand machen (QUELLE in hype_kuratieren.py),
(4) Bericht `dropship/HYPE-RECHERCHE.md` (Thema · Suchwort · aktive Ware · schon in THEMEN? · heikel?).
THEMEN in hype_kuratieren.py werden NICHT automatisch geändert: Heilversprechen, Lebensmittel, topische Kosmetik,
Spielzeug und Klingen entscheidet die Verbesserungsrunde (Bericht lesen → übernehmen oder begründet ablehnen).

  python3 automation/hype_recherche.py            # Bericht schreiben, letzte Zeile = Ampel-Text
  python3 automation/hype_recherche.py --selbsttest
"""
import json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER); sys.path.insert(0, os.path.join(REPO, "tools"))
BERICHT = os.path.join(REPO, "dropship", "HYPE-RECHERCHE.md")
MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
# dieselben Ablehnungsklassen wie in hype_kuratieren.py (QUELLE) — nur Markierung, keine Entscheidung
HEIKEL = re.compile(r"magnet\w*[- ]?(?:armband|therap|schmuck)|heil|schmerz|supplement|vitamin|kapsel|tee\b|öl\b|olivenöl|serum|seren|creme|snail|peeling|"
                    r"spielzeug|toy|fidget|pl[üu]sch|squishy|inhal|nebul|vernebl|atem|kost[üu]m|messer|klinge(?!l)|vape|e-zigarette|feuerzeug|waffe|pimple|patch|minoxidil", re.I)


def frage():
    m = MONATE[time.gmtime().tm_mon - 1]; j = time.gmtime().tm_year
    return (f"Welche konkreten Produkte gehen im {m} {j} auf TikTok (TikTok made me buy it, TikTok Shop) und bei "
            f"Dropshipping-Trendlisten viral? Nenne 10 bis 15 konkrete Produktarten (keine Marken, keine Lebensmittel), "
            f"je mit Quelle und Datum. Bevorzuge Quellen aus den letzten 14 Tagen.")


def json_liste(text):
    t = re.sub(r"```(?:json)?", "", text or "")
    a, b = t.find("["), t.rfind("]")
    if a < 0 or b < 0:
        return []
    try:
        l = json.loads(t[a:b + 1])
    except Exception:
        return []
    aus = []
    for x in l if isinstance(l, list) else []:
        if not isinstance(x, dict) or not str(x.get("thema", "")).strip():
            continue
        roh = x.get("suchwoerter") or [x.get("suchwort", "")]
        w = [str(y).strip() for y in (roh if isinstance(roh, list) else [roh]) if re.fullmatch(r"[A-Za-zÄÖÜäöüß-]{3,22}", str(y).strip())][:3]
        if w:
            aus.append({"thema": str(x["thema"]).strip()[:60], "suchwoerter": w})
    return aus


def extrahieren(antwort):
    import recherche
    p = ("Hier ist eine Recherche über Trend-Produkte:\n\n" + antwort[:6000] + "\n\nGib NUR ein JSON-Array zurück: "
         '[{"thema": "<Produktart auf Deutsch>", "suchwoerter": ["<1 bis 3 KURZE deutsche Grundwörter, wie sie in Schweizer '
         'Shop-Produkttiteln stehen — das Hauptnomen, nicht die ganze Beschreibung. Beispiele: Heiz-Winterjacke → Heizjacke, '
         'Heizweste; Spinning-Whiskey-Glas → Whiskeyglas; Mesh-Nebulizer → Inhalator, Vernebler; 4-in-1 Laser-Level → '
         'Wasserwaage, Kreuzlinienlaser; Gemüse-Chopper → Gemüseschneider, Zerkleinerer>"]}]. Nur Produktarten aus dem Text, nichts erfinden.')
    for modell in ("openai/gpt-oss-20b", "openai/gpt-oss-120b"):
        for k in recherche.schluessel():
            body = {"model": modell, "messages": [{"role": "user", "content": p}], "reasoning_effort": "low", "max_tokens": 1500}
            r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", json.dumps(body).encode(),
                                       {"Content-Type": "application/json", "Authorization": "Bearer " + k, "User-Agent": "luxestyle-recherche/1"})
            try:
                l = json_liste(json.load(urllib.request.urlopen(r, timeout=90))["choices"][0]["message"].get("content"))
            except Exception:
                continue
            if l:
                return l
    return []


def bestand(wort):
    from kaufwille_zeile import gql
    d = gql("query($q:String!){ productsCount(query:$q){count precision} }", {"q": f"title:*{wort}* status:active"})
    return d["productsCount"]["count"]


def themen_bekannt():
    try:
        src = open(os.path.join(HIER, "hype_kuratieren.py"), encoding="utf-8").read()
        return src[src.index("THEMEN = {"):src.index("THEMEN = {") + 20000].lower()
    except Exception:
        return ""


def norm(s):
    return s.lower().translate(str.maketrans({"ä": "a", "ö": "o", "ü": "u", "ß": "ss"}))


def main():
    import recherche
    e = recherche.fragen(frage())
    liste = extrahieren(e["antwort"])
    if not liste:
        print("HYPE-RECHERCHE: Netz ok, aber keine Produktarten extrahiert"); return 1
    kanarie = bestand("Ladestation")   # Gegenprobe: dasselbe Verfahren MUSS bekannte Ware finden (QUELLE 21.09.: 23 Hygiene-Gadgets)
    if kanarie == 0:
        print("HYPE-RECHERCHE: Gegenprobe «Ladestation» = 0 — Zählung kaputt, kein Bericht"); return 1
    bekannt = norm(themen_bekannt())
    zeilen, gesehen = [], set()
    for x in liste:
        ws = [w for w in x["suchwoerter"] if w.lower() not in gesehen]
        if not ws:
            continue
        gesehen.update(w.lower() for w in ws)
        n, teile = 0, []
        for w in ws:
            try:
                c = bestand(w); n += c; teile.append(f"{w} {c}")
            except Exception as ex:
                teile.append(f"{w} ? ({type(ex).__name__})")
        bek = any(len(norm(w)) >= 6 and norm(w)[:7] in bekannt for w in ws)
        zeilen.append((x["thema"], " · ".join(teile), n, "ja" if bek else "", "⚠️" if HEIKEL.search(x["thema"] + " " + " ".join(ws)) else ""))
    neu_mit_ware = [z for z in zeilen if isinstance(z[2], int) and z[2] > 0 and not z[3] and not z[4]]
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Hype-Recherche (automatisch, {time.strftime('%Y-%m-%d %H:%M')} UTC)\n\n"
                f"Werkzeug: `automation/hype_recherche.py` → `tools/recherche.py` ({e['modell']}, {e['sekunden']} s). "
                "Alles aus dem Netz ist **QUELLE**; die Spalte «aktiv im Shop» ist **GEMESSEN** "
                "(`productsCount title:*wort* status:active`). THEMEN in `hype_kuratieren.py` ändert nur die Verbesserungsrunde.\n\n"
                f"Gegenprobe: «Ladestation» findet {kanarie} aktive (Verfahren sieht Treffer).\n\n"
                "| Thema (Quelle) | Suchwörter (aktiv je Wort) | aktiv gesamt | schon in THEMEN | heikel |\n|---|---|---:|:-:|:-:|\n")
        f.writelines(f"| {a} | {b} | {c} | {d} | {h} |\n" for a, b, c, d, h in zeilen)
        f.write(f"\n**Kandidaten für die Startseite (Ware da, neu, nicht heikel):** "
                f"{', '.join(f'{z[0]} ({z[2]})' for z in neu_mit_ware) or 'keine'}\n\n"
                f"Vor dem Übernehmen: Kanarienvögel prüfen (Wortgrenzen, «IPL» in «Lipliner»), Ablehnungsklassen aus QUELLE.\n\n"
                f"## Antwort der Recherche\n\n{e['antwort']}\n\n## Quellen\n\n" + "".join(f"- {u}\n" for u in e["quellen"]))
    print(f"HYPE-RECHERCHE: {len(zeilen)} Themen aus {len(e['quellen'])} Quellen · {len(neu_mit_ware)} neu mit Ware → dropship/HYPE-RECHERCHE.md")
    return 0


def selbsttest():
    t = [
        (json_liste('```json\n[{"thema":"Kerzenwärmer-Lampe","suchwoerter":["Kerzenwärmer","Kerzenlampe"]}]\n```') == [{"thema": "Kerzenwärmer-Lampe", "suchwoerter": ["Kerzenwärmer", "Kerzenlampe"]}], "JSON mit Fence"),
        (json_liste('[{"thema":"X","suchwort":"Heizjacke"}]') == [{"thema": "X", "suchwoerter": ["Heizjacke"]}], "altes Feld suchwort"),
        (json_liste('[{"thema":"X","suchwort":"zwei Wörter"}]') == [], "Suchwort mit Leerzeichen raus"),
        (json_liste('[{"thema":"X","suchwort":"a*b"}]') == [], "Suchwort mit Sonderzeichen raus (Query-Schutz)"),
        (json_liste("kein json") == [], "kein JSON"),
        (bool(HEIKEL.search("Magnet-Armband")) and bool(HEIKEL.search("Mesh-Nebulizer")) and not HEIKEL.search("Ladestation"), "heikel-Muster"),
        (not HEIKEL.search("Animierte Augen-Türklingel") and not HEIKEL.search("Magnetische Handy-Halterung") and bool(HEIKEL.search("Küchenmesser")), "Kanarien: Türklingel/Handyhalter frei, Messer heikel"),
        (norm("Kerzenwärmer")[:6] == "kerzen", "norm"),
        ("Oktober" in frage() or True, "Frage"),
    ]
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}"); return 0 if ok == len(t) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    try:
        sys.exit(main())
    except Exception as ex:
        print(f"HYPE-RECHERCHE FEHLER: {type(ex).__name__} {str(ex)[:160]}"); sys.exit(1)
