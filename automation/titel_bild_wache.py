#!/usr/bin/env python3
"""titel_bild_wache.py — passt der Titel eines Neuimports zu dem, was sein Hauptbild zeigt? (04.10.2026)

ANLASS (12-h-Fixlauf, Sichtprüfung der 1'645 Neuimporte seit 01.10.): rund jeder dritte Titel war falsch oder unsinnig,
obwohl er deutsch war und `titel_sprache.mjs` / `titel_kauderwelsch_wache.py` ihn durchliessen:
  «Digitales Ölgemälde 40×50 cm»  → Bild: Leinwand mit Zahlenfeldern = Malen-nach-Zahlen-Set (数字油画 wörtlich übersetzt)
  «Multifunktionaler Schneeknauf mit Allen-Schlüssel» → Bild: Schneeflocken-Multitool
  «Zwei-Stelliger Trimm-Schnittteller» → Bild: Bündigfräser für die Oberfräse
Der Texter (Groq gpt-oss-20b) sieht nur den englischen CJ-Namen, nie das Bild. Kein Wort ist «falsch», der TITEL ist es —
das findet nur, wer Titel und Bild nebeneinander sieht.

Vier Augen wie in titel_kauderwelsch_wache.py:
  Gemini sieht ein Raster aus bis zu 12 Hauptbildern mit nummerierten Titeln → meldet Titel, die eine ANDERE Ware
  benennen als das Bild zeigt (oder Unsinn), mit Korrektur.
  Der Zweitprüfer (ChatGPT, sonst Groq-Vision; zweitmodell.py) sieht jedes gemeldete Bild EINZELN mit dem alten Titel,
  ohne Geminis Antwort, und sagt passt ja/nein + eigene Korrektur.
  Geändert wird nur, wenn beide «passt nicht» sagen UND die Korrekturen ein neues Hauptwort teilen (= sie meinen dieselbe
  Ware). Sonst nur gemeldet. Masse/Stückzahlen aus dem alten Titel bleiben (Prompt + Prüfung).
Ledger dropship/_titel_bild.tsv (jedes Produkt einmal). Bericht dropship/TITEL-BILD.md.
  python3 automation/titel_bild_wache.py                  # Trockenlauf, STUNDEN=48
  SCHARF=1 python3 automation/titel_bild_wache.py
  python3 automation/titel_bild_wache.py --kanarienvogel   # Fälle aus der Sichtprüfung vom 04.10.
"""
import base64, json, os, re, subprocess, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from gemini_jury import schluessel  # noqa: E402
import zweitmodell  # noqa: E402
from titel_kauderwelsch_wache import gql  # noqa: E402  (Eimer-Etikette inklusive)

SCHARF = os.environ.get("SCHARF") == "1"
STUNDEN = float(os.environ.get("STUNDEN", "48"))
MAX = int(os.environ.get("MAX", "600"))
LEDGER = os.path.join(REPO, "dropship", "_titel_bild.tsv")
BERICHT = os.path.join(REPO, "dropship", "TITEL-BILD.md")
PROXY = os.environ.get("HTTPS_PROXY", "")

REGELN = """Shop: LuxeStyle, Schweiz, Hochdeutsch mit ss statt ß.
Melde einen Titel NUR, wenn er eine ANDERE Ware benennt als das Bild zeigt, oder ein Unsinnswort/eine falsche
Übersetzung enthält, sodass eine Kundin nicht versteht, was sie kauft. Beispiele: Bild zeigt eine Leinwand mit
nummerierten Feldern und Farbtöpfchen, Titel «Digitales Ölgemälde» → «Malen nach Zahlen …»; Bild zeigt ein
Schneeflocken-Multitool, Titel «Schneeknauf» → «Schneeflocken-Multitool …»; Bild zeigt eine Fusspumpe, Titel «Handpumpe».
NICHT melden: Grammatik, Stil, Werbewörter, fehlende Details, Marken- oder Modellnamen, Titel, die die Ware richtig
benennen (auch wenn sie ungenau sind), Bilder mit mehreren Varianten, wenn eine davon zum Titel passt.
Korrektur: deutsch, 20–70 Zeichen, Warenwort zuerst; Masse, Mengen und Stückzahlen aus dem alten Titel übernehmen;
NICHTS erfinden (kein Material, keine Masse, keine Marke, die nicht im alten Titel steht)."""

PROMPT_BLOCK = REGELN + """
Du siehst ein Raster mit nummerierten Produktbildern («Bild N»). Die Titel dazu:
{titel}
Antworte NUR als JSON: {{"titel": [{{"nr": <N>, "bild_zeigt": "<was zu sehen ist, 3–8 Wörter>", "korrektur": "<ganzer neuer Titel>"}}]}}
Leere Liste, wenn alle Titel zur Ware passen."""

PROMPT_EINZEL = REGELN + """
Das Bild zeigt das Hauptbild eines Produkts. Aktueller Titel: «{titel}»
Passt der Titel zur abgebildeten Ware? Antworte NUR als JSON:
{{"passt": true|false, "bild_zeigt": "<3–8 Wörter>", "korrektur": "<ganzer neuer Titel, leer wenn passt>"}}"""


def bild(url):
    if not url:
        return None
    r = subprocess.run(["curl", "-sS", "--max-time", "25", "-x", PROXY, url + ("&" if "?" in url else "?") + "width=480"],
                       capture_output=True)
    return r.stdout if r.returncode == 0 and len(r.stdout) > 2000 else None


def gemini_bild(text, jpeg):
    if zweitmodell.gemini_leer():
        raise RuntimeError("Gemini-Guthaben leer (Marke /tmp/gemini_leer)")
    body = {"contents": [{"parts": [{"text": text},
                                    {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(jpeg).decode()}}]}],
            "generationConfig": {"temperature": 0.0, "response_mime_type": "application/json"}}
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={schluessel()}",
                data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=180))
            return json.loads(re.search(r"\{.*\}", j["candidates"][0]["content"]["parts"][0]["text"], re.S).group(0))
        except urllib.error.HTTPError as e:
            k = e.read()
            if zweitmodell.ist_gemini_402(k):
                zweitmodell.handle_gemini_402(k[:200].decode("utf-8", "replace"))
                raise RuntimeError("Gemini 402 — Guthaben leer")
            letzter = f"HTTP {e.code}: {k[:150]!r}"
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(5 * (a + 1))
    raise RuntimeError("Gemini ohne Antwort — " + letzter)


ERSTMODELL = ""


def erstmodell(text, jpeg):
    """Nur Gemini. Gemessen 04.10. 22:40: Gemini 402 (seit 21:53), OpenAI ohne Guthaben (seit 20:11), Groq-Schlüssel 1+2
    Tageskontingent leer, Schlüssel 3 7'000 Tokens/Minute — ein Raster kostet ~2'600. Eine Massenprüfung über Groq-Vision
    würde den Varianten-Bildvergleich echter BESTELLUNGEN (cj_fulfill, gleiches Modell) aushungern → hier PAUSE statt Ausweichen."""
    global ERSTMODELL
    if zweitmodell.gemini_leer():
        raise RuntimeError("Gemini-Guthaben leer — Massenprüfung wartet (Groq-Vision bleibt den Bestellungen)")
    out = gemini_bild(text, jpeg); ERSTMODELL = "gemini"
    return out


def flach(s):
    return re.sub(r"[^a-z0-9äöüß]", "", (s or "").lower())


def hauptwoerter(s):
    """Grossgeschriebene Wörter (≥ 4 Zeichen), Bindestrich-Teile einzeln — deutsche Nomen."""
    out = set()
    for w in re.findall(r"[A-ZÄÖÜ][\wäöüß-]+", s or ""):
        for t in w.split("-"):
            if len(t) >= 4 and t[:1].isupper():
                out.add(flach(t))
    return out


def zahlen(s):
    return set(re.findall(r"\d+", s or ""))


def einig(alt, kg, zweit):
    """Beide sagen «passt nicht» und meinen dieselbe Ware (gemeinsames NEUES Hauptwort); Zahlen des alten Titels bleiben."""
    if not kg or not zweit or zweit.get("passt") is not False:
        return False
    ko = (zweit.get("korrektur") or "").strip()
    if not ko or not (0.4 <= len(kg) / max(1, len(alt)) <= 2.2) or len(kg) > 80:
        return False
    neu_g = hauptwoerter(kg) - hauptwoerter(alt)
    o = flach(ko)
    if not neu_g or not any(w in o for w in neu_g):
        return False
    return zahlen(alt) <= zahlen(kg) or not zahlen(alt)


def pruefen(produkte):
    """produkte: [{id,title,url}] → Liste (produkt, gemini_korr, zweit_antwort, einig)."""
    erg = []
    for s in range(0, len(produkte), 12):
        block = [p for p in produkte[s:s + 12]]
        jpgs = [(p, bild(p["url"])) for p in block]
        jpgs = [(p, b) for p, b in jpgs if b]
        if not jpgs:
            continue
        raster = zweitmodell.raster([b for _, b in jpgs], 1, zelle=360, spalten=4)
        titel = "\n".join(f"Bild {i + 1}: {p['title']}" for i, (p, _) in enumerate(jpgs))
        g = erstmodell(PROMPT_BLOCK.format(titel=titel), raster)
        for e in g.get("titel") or []:
            try:
                i = int(e["nr"]) - 1
            except Exception:
                continue
            if not 0 <= i < len(jpgs):
                continue
            p, b = jpgs[i]
            kg = (e.get("korrektur") or "").strip()
            try:
                z = zweitmodell.chat_json(PROMPT_EINZEL.format(titel=p["title"]), [b])
            except Exception as ex:
                z = {"fehler": str(ex)[:120]}
            erg.append((p, kg, z, einig(p["title"], kg, z), e.get("bild_zeigt", "")))
    return erg


KANARIEN = [  # (Produkt-ID, soll_geaendert) — Sichtprüfung 04.10.; None = Grenzfall (darf, muss nicht)
    ("gid://shopify/Product/16606943609223", True),    # «Digitales Ölgemälde 40×50 cm» — Leinwand mit Zahlen
    ("gid://shopify/Product/16607076090247", True),    # «Linen-Ölgemälde Blumen» — Zahlenfelder (Hauptbild jetzt Motiv → None möglich)
]


def kanarienvogel():
    ix = json.load(open(os.environ.get("KB_INDEX", "/dev/null"))) if os.environ.get("KB_INDEX") else []
    faelle = []
    for e in ix:
        if e.get("soll") is not None or e.get("grenz"):
            faelle.append(e)
    if not faelle:
        print("KB_INDEX mit Feldern id/titel/url/soll fehlt"); return 2
    r = pruefen([{"id": e["id"], "title": e["titel"], "url": e["url"]} for e in faelle])
    gemeldet = {p["id"]: ok for p, _, _, ok, _ in r}
    ok = 0
    for e in faelle:
        ist = gemeldet.get(e["id"], False)
        if e.get("soll") is None:
            print(f"· Grenzfall (geändert {ist})  {e['titel']}"); ok += 1; continue
        ok += ist == e["soll"]
        kg = next((k for p, k, _, _, _ in r if p["id"] == e["id"]), "")
        print(f"{'✓' if ist == e['soll'] else '✗'} soll {e['soll']!s:5} ist {ist!s:5}  {e['titel'][:60]}  → {kg[:60]}")
    print(f"Kanarienvögel {ok}/{len(faelle)}")
    return 0 if ok == len(faelle) else 1


def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    seit = (datetime.now(timezone.utc) - timedelta(hours=STUNDEN)).strftime("%Y-%m-%dT%H:%M:%SZ")
    fertig = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8")} if os.path.exists(LEDGER) else set()
    prod, c = [], None
    while True:
        d = gql('query($c:String,$q:String!){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{id title featuredMedia{preview{image{url}}}}}}',
                {"c": c, "q": f"created_at:>='{seit}' AND status:active"})["products"]
        for p in d["nodes"]:
            if p["id"] not in fertig:
                u = (((p.get("featuredMedia") or {}).get("preview") or {}).get("image") or {}).get("url")
                prod.append({"id": p["id"], "title": p["title"], "url": u})
        if not d["pageInfo"]["hasNextPage"] or len(prod) >= MAX:
            break
        c = d["pageInfo"]["endCursor"]
    prod = prod[:MAX]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(prod)} neue aktive Titel seit {seit} · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    if not prod:
        print("FERTIG: 0 geprüft"); return 0
    try:
        befunde = pruefen(prod)
    except RuntimeError as e:
        print(f"PAUSE: {e}"); return 0
    bef = {p["id"]: (kg, z, ok, zeigt) for p, kg, z, ok, zeigt in befunde}
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    geaendert, gemeldet, zeilen = 0, 0, []
    for p in prod:
        if p["id"] not in bef:
            if led:
                led.write(f"{p['id']}\tok\t{p['title']}\n")
            continue
        kg, z, ok, zeigt = bef[p["id"]]
        if ok and SCHARF:
            r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{title} userErrors{message}}}',
                    {"i": {"id": p["id"], "title": kg}})["productUpdate"]
            if not r["userErrors"] and r["product"]["title"] == kg:
                geaendert += 1
                led.write(f"{p['id']}\tkorrigiert\t{p['title']}\t→ {kg}\t{zeigt}\n")
                zeilen.append(f"| ✅ | {p['title']} | {kg} | {zeigt} |")
                continue
        gemeldet += 1
        if led:
            led.write(f"{p['id']}\tgemeldet\t{p['title']}\tG: {kg}\tZ: {(z or {}).get('korrektur', '')}\t{zeigt}\n")
        zeilen.append(f"| {'(einig)' if ok else '·'} | {p['title']} | G: {kg} · Z: {(z or {}).get('korrektur', '')} | {zeigt} |")
    if led:
        led.close()
    if zeilen:
        with open(BERICHT, "a", encoding="utf-8") as f:
            f.write(f"\n## {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())} · {len(prod)} geprüft · "
                    f"{geaendert} korrigiert · {gemeldet} nur gemeldet\n| | alt | neu | Bild zeigt |\n|---|---|---|---|\n"
                    + "\n".join(zeilen) + "\n")
    print(f"FERTIG: {len(prod)} geprüft · {geaendert} korrigiert · {gemeldet} nur gemeldet · Erstprüfer {ERSTMODELL or '-'}, "
          f"Zweitprüfer {zweitmodell.LETZTES_MODELL or '-'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
