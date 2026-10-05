#!/usr/bin/env python3
"""gemini_jury.py — Vision-KI-Jury VOR jedem Social-Post (28.09.2026, Betreiber: «mache jede post ein meisterwerk in sozial
media, jetzt hast du gemini» · «vision ai»).

Das technische Tor (meisterwerk_tor.py) misst Format, Hook-Bewegung, Lautheit und Bildpreis — es SIEHT nicht. Gemessene
Fehler, die kein Zähler fand: «Dein Zuhause, gemütlicher» auf einem Lederrucksack (28.09.), Produkt als 326-px-Streifen im
Bild (28.09.), englische CJ-Untertitel im Video, Pappbecher als Social-Post. Diese Jury schaut hin wie eine Kundin.

Eingabe: Bild (jpg/png/webp, Datei oder URL) oder Video (mp4: 4 Standbilder bei 0,3 s / 1,2 s / Mitte / Ende) + Caption.
Kriterien je 0–10: erstes_bild (stoppt es den Daumen, Produkt sofort erkennbar), bildqualitaet, sauberkeit (kein fremder
Lieferantentext, keine Wasserzeichen/Fremdlogos/Fremdpreise), text_im_bild (lesbar, korrektes Deutsch, nichts abgeschnitten),
stimmigkeit (Caption/Hook passt zum gezeigten Produkt), wirkung (hochwertig, vertrauenswürdig — nicht billig/Scam).
K.-o.: falsches/anderes Produkt als die Caption, anstössig, Heilversprechen, Waffe, Preis im Bild ≠ Preis der Caption.
Urteil: ok = Schnitt ≥ MIN (7.0) UND jedes Kriterium ≥ 5 UND kein K.-o.

  python3 automation/gemini_jury.py <datei|url> --caption "…" [--typ reel|bild|karussell] [--nur-cache] [--ohne-cache]
  → letzte Zeile JSON {ok, schnitt, noten, ko, gruende, verbesserung}
  Exit 0 = Meisterwerk, 4 = durchgefallen, 2 = kein Urteil (Netz/Schlüssel) — der Poster überspringt dann, kein Urteil ist kein Ja.
Cache: dropship/_gemini_jury.tsv (sha1 der Datei + Caption → Urteil) — dieselbe Datei kostet nur einmal.
Kosten: gemini-2.5-flash, ~4 Bilder à ~260 Tokens + Prompt ≈ 0,1 Rappen je Post (Budget-Regel 11: kein Veo, keine Schleife).
"""
import argparse, base64, calendar, hashlib, json, os, re, subprocess, sys, tempfile, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(REPO, "dropship", "_gemini_jury.tsv")
MODELL = os.environ.get("JURY_MODELL", "gemini-2.5-flash")
MIN = float(os.environ.get("JURY_MIN", "7.0"))
# 29.09.2026 Streuung GEMESSEN: 8 Grenzfälle (Schnitt 6–8) je 3× beurteilt → 2 kippten zwischen bestanden/durchgefallen,
# Schnitt bis 3,3 Punkte auseinander (5,5 vs 8,83). Darum: liegt das erste Urteil im Grenzband, kommen 2 weitere dazu
# und die MEHRHEIT entscheidet (Schnitt = Median). Klare Fälle kosten weiter nur ein Urteil.
RUNDEN = int(os.environ.get("JURY_RUNDEN", "3"))
BAND = float(os.environ.get("JURY_BAND", "1.5"))
# 30.09.2026 Betreiber «dann alle sollen helfen»: im Grenzband entscheidet nicht mehr 3× Gemini (dieselben Augen), sondern
# Gemini + ChatGPT-Vision + Gemini — ein zweites Modell sieht andere Fehler (kritik.py-Erfahrung). Ohne OpenAI-Schlüssel
# oder bei Ausfall fällt die Runde auf Gemini zurück (kein Urteil ist kein Nein).
MODELL_GPT = os.environ.get("JURY_MODELL_GPT", "gpt-5.5")
KRIT = ["erstes_bild", "bildqualitaet", "sauberkeit", "text_im_bild", "stimmigkeit", "wirkung"]
# 05.10.2026 (Prüfer, Plan 23): seit 02:43 UTC gab die Jury KEIN Urteil — Gemini 402, OpenAI leer, und Groq hat auf allen drei
# Schlüsseln nur EIN Bildmodell (qwen/qwen3.8-27b; GET /models gemessen: gpt-oss-120b ist reines Textmodell). «Kein Urteil =
# kein Post» hiess: 9 ready-Reels, 0 Posts, Kadenz ≥ 21 h, an jedem Groq-Tag. Gemessen: 6 der 9 ready-Reels hatten ein
# POSITIVES Urteil (Note 8.17–8.83) zum früheren Render DERSELBEN Datei — Unterschied nur der Preis (CHF 54.90 → 47.90 nach
# der Preissenkung vom 02.10.; alter Blob + alte Caption = Cache-Signatur, nachgerechnet). Deshalb RÜCKFALL, nur wenn alle
# Bildmodelle leer sind: ein früheres ok-Urteil zur selben Datei (Basename, ≤ RUECKFALL_TAGE alt, nach den Cache-Regeln
# gültig) gilt — der Preis im Bild wird davor vom Meisterwerk-Tor (PREIS_SOLL) gemessen. Ledger: dropship/_jury_rueckfall.tsv.
RUECKFALL_TAGE = int(os.environ.get("JURY_RUECKFALL_TAGE", "14"))
RUECKFALL_LEDGER = os.path.join(REPO, "dropship", "_jury_rueckfall.tsv")


def _basename(q):
    return os.path.basename(str(q).split("?")[0].split("#")[0])


def cache_gueltig(v):
    """Dieselbe Regel wie beim Cache-Treffer: ein Einzelurteil im Grenzband (vor 29.09.) zählt nicht mehr."""
    return not (RUNDEN > 1 and grenzfall(v) and "runden" not in v)


def kontingent_leer():
    """Alle Bild-Jurys leer: Gemini-Marke (402), OpenAI-Marke oder kein Schlüssel, Groq-Bildmodell auf JEDEM Schlüssel gemerkt."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import zweitmodell as z
    ks = z.groq_schluessel()
    groq = bool(ks) and all(z.groq_leer(i + 1, [z.GROQ_BILD]) for i in range(len(ks)))
    openai = z.openai_leer() or not z.openai_schluessel()
    return z.gemini_leer() and openai and groq


def frueheres_urteil(quelle):
    """Jüngstes gültiges ok-Urteil zu derselben Datei (Basename ohne Query), höchstens RUECKFALL_TAGE alt — sonst None."""
    name = _basename(quelle)
    if not name or not os.path.exists(CACHE):
        return None
    best = None
    for l in open(CACHE, encoding="utf-8"):
        t = l.rstrip("\n").split("\t")
        if len(t) < 4 or _basename(t[3]) != name:
            continue
        try:
            v = json.loads(t[2]); alter = time.time() - calendar.timegm(time.strptime(t[1], "%Y-%m-%dT%H:%M:%SZ"))
        except Exception:
            continue
        if v.get("ok") and cache_gueltig(v) and alter <= RUECKFALL_TAGE * 86400 and (best is None or t[1] > best[0]):
            best = (t[1], v)
    if not best:
        return None
    v = dict(best[1]); v["rueckfall"] = f"Kontingent leer — ok-Urteil vom {best[0][:16]}Z zum früheren Render von {name}"
    return v


def rueckfall_merken(quelle, caption, v):
    if os.environ.get("DRY") == "1":      # Trockenlauf des Posters: nichts ins Ledger
        return
    try:
        with open(RUECKFALL_LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{_basename(quelle)}\t{v['rueckfall']}\t"
                    f"schnitt {v['schnitt']}\t{hashlib.sha1(caption.encode()).hexdigest()[:12]}\n")
    except OSError:
        pass


def schluessel():
    k = os.environ.get("GEMINI_API_KEY", "")
    if not k and os.path.exists("/tmp/dienste.env"):
        m = re.search(r"GEMINI_API_KEY=['\"]?([^\s'\"]+)", open("/tmp/dienste.env").read())
        k = m.group(1) if m else ""
    return k


def lokal(q):
    if re.match(r"^https?://", q):
        suf = os.path.splitext(q.split("?")[0])[1] or ".bin"
        f = tempfile.NamedTemporaryFile(suffix=suf, delete=False).name
        subprocess.run(["curl", "-sL", "--max-time", "120", "-o", f, q], check=False)
        if not os.path.exists(f) or os.path.getsize(f) < 2000:
            raise RuntimeError("Download fehlgeschlagen")
        return f
    return q


def bilder(pfad):
    """JPEG-Bytes: Video → 4 Standbilder, Bild → 1 (max 1024 px)."""
    ist_video = pfad.lower().endswith((".mp4", ".mov", ".webm")) or open(pfad, "rb").read(12)[4:8] == b"ftyp"
    tmp = tempfile.mkdtemp()
    out = []
    if ist_video:
        try:
            import av
            with av.open(pfad) as c:
                dauer = float(c.duration / 1e6) if c.duration else 10.0
        except Exception:
            dauer = 10.0
        for i, t in enumerate([0.3, 1.2, dauer / 2, max(dauer - 1.0, 0.5)]):
            f = os.path.join(tmp, f"f{i}.jpg")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", pfad, "-frames:v", "1",
                            "-vf", "scale=540:-2", "-q:v", "4", f], check=False)
            if os.path.exists(f):
                out.append(open(f, "rb").read())
    else:
        f = os.path.join(tmp, "b.jpg")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", pfad, "-vf", "scale='min(1024,iw)':-2", "-q:v", "4", f], check=False)
        if os.path.exists(f):
            out.append(open(f, "rb").read())
    return out, ist_video


PROMPT = """Du bist eine strenge Art-Direktorin für den Schweizer Online-Shop LuxeStyle (Instagram, TikTok, Facebook, Pinterest).
Beurteile diesen {typ}-Post so, wie eine Schweizer Kundin ihn auf dem Handy im Feed sieht. {bildinfo}

Caption des Posts:
---
{caption}
---

Vergib je 0–10 (10 = Weltklasse, 7 = gut postbar, 4 = schwach, 0 = unbrauchbar):
- erstes_bild: stoppt das erste Bild den Daumen? Ist das Produkt sofort gross und klar erkennbar?
- bildqualitaet: scharf, gut belichtet, nicht verzerrt/gestreckt, keine Pixel/Artefakte, Produkt nicht winzig im Bild.
- sauberkeit: KEIN fremder Lieferantentext (chinesisch, englische Werbetexte/Untertitel), keine Wasserzeichen, fremde Logos,
  fremde Shop-Namen oder fremde Preise im Bild. Unsere eigenen Elemente sind erlaubt: Schriftzug «LUXESTYLE», deutscher Titel,
  CHF-Preis, «luxestyle.ch · Klarna & TWINT · Gratis Versand ab CHF 50». ERLAUBT ist auch der Marken-/Herstellername, der
  AUF dem Produkt oder seiner Originalverpackung steht (z. B. «HEKU», «Made in Germany») — das ist die Ware selbst, keine Fremdwerbung.
- text_im_bild: eingeblendeter Text lesbar, korrektes Deutsch, nicht abgeschnitten oder vom Produkt verdeckt (ohne Text: 8).
- stimmigkeit: passt die erste Caption-Zeile / der Hook inhaltlich zum gezeigten Produkt? (z. B. «Dein Zuhause, gemütlicher»
  auf einem Rucksack = 2). Zeigt das Bild wirklich das Produkt aus der Caption?
- wirkung: wirkt der Post hochwertig und vertrauenswürdig — oder billig, zusammengewürfelt, nach Scam?

K.-o.-Gründe (Liste, sonst leer): "falsches_produkt" (Bild zeigt etwas anderes als die Caption), "anstoessig",
"heilversprechen" (Caption verspricht Heilung/Wirkung gegen Krankheit), "waffe", "preis_widerspruch" (CHF-Preis im Bild ≠ CHF-Preis in der Caption).

Antworte NUR mit JSON:
{{"noten": {{"erstes_bild": n, "bildqualitaet": n, "sauberkeit": n, "text_im_bild": n, "stimmigkeit": n, "wirkung": n}},
 "ko": [], "gruende": "max. 2 Sätze, konkret was stört", "verbesserung": "1 konkreter Vorschlag"}}"""


def fragen(jpgs, caption, typ, ist_video):
    """Frage Gemini; bei HTTP 402 fallback zu Groq über zweitmodell.chat_json."""
    import urllib.error
    info = ("Du siehst 4 Standbilder aus dem Video (0,3 s, 1,2 s, Mitte, Ende)." if ist_video and len(jpgs) > 1
            else "Du siehst das Bild des Posts.")
    teile = [{"text": PROMPT.format(typ=typ, bildinfo=info, caption=caption[:1500])}]
    teile += [{"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(b).decode()}} for b in jpgs]
    body = {"contents": [{"parts": teile}],
            "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELL}:generateContent?key={schluessel()}"
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=120))
            txt = j["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(re.search(r"\{.*\}", txt, re.S).group(0))
        except urllib.error.HTTPError as e:
            if e.code == 402:
                # Gemini HTTP 402: Payment Required — Fallback zu Groq
                import zweitmodell
                zweitmodell.handle_gemini_402(f"HTTP {e.code} von Gemini")
                return fragen_gpt(jpgs, caption, typ, ist_video)
            letzter = f"HTTP {e.code}: {e.read()[:150].decode('utf-8', 'replace')}"
            time.sleep(4 * (a + 1))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
            time.sleep(4 * (a + 1))
    raise RuntimeError("Gemini ohne Antwort — " + letzter)


def openai_schluessel():
    k = os.environ.get("OPENAI_API_KEY", "").strip()
    if not k and os.path.exists("/tmp/openai_key"):
        k = open("/tmp/openai_key").read().strip()
    return k


def fragen_gpt(jpgs, caption, typ, ist_video):
    """Dieselbe Frage an den Zweitprüfer (ChatGPT-Vision, bei leerem Guthaben Groq-Vision; zweitmodell.py, 02.10.2026)."""
    import zweitmodell
    info = ("Du siehst 4 Standbilder aus dem Video (0,3 s, 1,2 s, Mitte, Ende)." if ist_video and len(jpgs) > 1
            else "Du siehst das Bild des Posts.")
    return zweitmodell.chat_json(PROMPT.format(typ=typ, bildinfo=info, caption=caption[:1500]), jpgs)


def urteilen(a):
    noten = {k: float((a.get("noten") or {}).get(k, 0)) for k in KRIT}
    schnitt = round(sum(noten.values()) / len(KRIT), 2)
    ko = [k for k in (a.get("ko") or []) if k]
    ok = schnitt >= MIN and min(noten.values()) >= 5 and not ko
    return {"ok": ok, "schnitt": schnitt, "noten": noten, "ko": ko,
            "gruende": a.get("gruende", ""), "verbesserung": a.get("verbesserung", "")}


def grenzfall(v):
    """Nahe an der Schwelle: Schnitt innerhalb ±BAND um MIN, oder tiefste Note genau an der 5er-Grenze (4–5.5)."""
    lo = min(v["noten"].values()) if v["noten"] else 0
    return abs(v["schnitt"] - MIN) <= BAND or 4.0 <= lo <= 5.5


def mehrheit(urteile):
    """Mehrheit der ok-Urteile entscheidet; Rückgabe = das Median-Urteil der Mehrheitsseite (Begründung passt zum Ergebnis)."""
    ja = [u for u in urteile if u["ok"]]
    nein = [u for u in urteile if not u["ok"]]
    seite = ja if len(ja) > len(nein) else nein
    seite = sorted(seite, key=lambda u: u["schnitt"])
    v = dict(seite[len(seite) // 2])
    v["runden"] = [{"ok": u["ok"], "schnitt": u["schnitt"], "modell": u.get("modell", MODELL)} for u in urteile]
    return v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("quelle"); ap.add_argument("--caption", default=""); ap.add_argument("--typ", default="reel")
    ap.add_argument("--ohne-cache", action="store_true")
    ap.add_argument("--nur-cache", action="store_true", help="nur gecachtes Urteil, keine neue Anfrage (Exit 2 wenn keins)")
    ap.add_argument("--kontingent", action="store_true", help="nur messen: Exit 0 = alle Bild-Jurys leer, Exit 1 = mindestens eine frei")
    ap.add_argument("--rueckfall-pruefen", action="store_true", help="ohne Download/Anfrage: gibt es ein früheres ok-Urteil zur Datei? Exit 0/2")
    a = ap.parse_args()
    if a.kontingent:
        leer = kontingent_leer()
        print(json.dumps({"kontingent_leer": leer})); sys.exit(0 if leer else 1)
    if a.rueckfall_pruefen:
        v = frueheres_urteil(a.quelle)
        print(json.dumps(v or {"ok": None, "grund": "kein früheres ok-Urteil zu " + _basename(a.quelle)}, ensure_ascii=False))
        sys.exit(0 if v else 2)
    if not schluessel():
        print(json.dumps({"ok": None, "grund": "GEMINI_API_KEY fehlt"})); sys.exit(2)
    try:
        pfad = lokal(a.quelle)
        roh = open(pfad, "rb").read()
    except Exception as e:
        print(json.dumps({"ok": None, "grund": str(e)[:150]})); sys.exit(2)
    sig = hashlib.sha1(roh + a.caption.encode()).hexdigest()
    if not a.ohne_cache and os.path.exists(CACHE):
        for l in open(CACHE, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if t[0] == sig and len(t) >= 3:
                v = json.loads(t[2])
                if RUNDEN > 1 and grenzfall(v) and "runden" not in v:
                    continue          # Einzelurteil im Grenzband (vor 29.09.) zählt nicht mehr → neu mit Mehrheit
                v["cache"] = True
                print(json.dumps(v, ensure_ascii=False)); sys.exit(0 if v["ok"] else 4)
    if a.nur_cache:
        v = frueheres_urteil(a.quelle) if a.typ == "reel" and kontingent_leer() else None
        if v:
            rueckfall_merken(a.quelle, a.caption, v); print(json.dumps(v, ensure_ascii=False)); sys.exit(0)
        print(json.dumps({"ok": None, "grund": "kein gecachtes Urteil (--nur-cache)"})); sys.exit(2)
    jpgs, ist_video = bilder(pfad)
    if not jpgs:
        print(json.dumps({"ok": None, "grund": "keine Standbilder"})); sys.exit(2)
    try:
        v = urteilen(fragen(jpgs, a.caption, a.typ, ist_video))
        if RUNDEN > 1 and grenzfall(v):
            weitere = []
            for i in range(RUNDEN - 1):
                u = None
                if i == 0:                                   # erste Zusatzrunde: anderes Modell
                    try:
                        u = urteilen(fragen_gpt(jpgs, a.caption, a.typ, ist_video)); u["modell"] = __import__("zweitmodell").LETZTES_MODELL or MODELL_GPT
                    except Exception as e:
                        print(f"  ChatGPT-Runde ausgefallen ({str(e)[:120]}) → Gemini", file=sys.stderr)
                if u is None:
                    u = urteilen(fragen(jpgs, a.caption, a.typ, ist_video)); u["modell"] = MODELL
                weitere.append(u)
            v["modell"] = MODELL
            v = mehrheit([v] + weitere)
    except Exception as e:
        # 05.10.2026 Rückfall (nur Reels, nur bei leerem Kontingent — jeder andere Ausfall bleibt «kein Urteil = kein Post»)
        v = frueheres_urteil(a.quelle) if a.typ == "reel" and ("Kontingent leer" in str(e) or kontingent_leer()) else None
        if v:
            v["grund_rueckfall"] = str(e)[:160]
            rueckfall_merken(a.quelle, a.caption, v); print(json.dumps(v, ensure_ascii=False)); sys.exit(0)
        print(json.dumps({"ok": None, "grund": str(e)[:200]})); sys.exit(2)
    with open(CACHE, "a", encoding="utf-8") as f:
        f.write(f"{sig}\t{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{json.dumps(v, ensure_ascii=False)}\t{a.quelle[:200]}\n")
    print(json.dumps(v, ensure_ascii=False))
    sys.exit(0 if v["ok"] else 4)


if __name__ == "__main__":
    main()
