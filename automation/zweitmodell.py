#!/usr/bin/env python3
"""zweitmodell.py — der zweite Prüfer neben Gemini: ChatGPT, solange Guthaben da ist, sonst Groq (02.10.2026).

ANLASS: OpenAI antwortete am 02.10. `429 insufficient_quota / credit_balance_exhausted` (DeepSeek `402 Insufficient Balance`).
Alles, was auf «Gemini UND ChatGPT einig» baut, stand still oder lief ohne Zweitprüfer: Google-Feinkategorien,
CJ-Varianten-Bildvergleich (Bestellungen blieben «manuell prüfen»), Kauderwelsch-Wache, Google-Bildtausch, Jury-Grenzfälle.
Ein 429 ist dabei NICHT immer Drosselung — der Antwortkörper sagt, ob das Guthaben leer ist.

  chat_json(text, bilder=None, nummer_ab=1) → dict   (Antwort als JSON-Objekt; nummer_ab = Nummer des ersten Bildes
  im Prompt — Groq nimmt höchstens GROQ_MAX_BILDER Bilder, mehr werden zu EINEM beschrifteten Raster)
  * OpenAI `MODELL_GPT` (gpt-5.5), JSON-Modus, 3 Versuche
  * leeres Guthaben erkannt → Marke /tmp/openai_leer (6 h gültig, danach wird OpenAI wieder versucht) → Groq:
    Text `openai/gpt-oss-120b`, Bilder `qwen/qwen3.8-27b` (Vision, gemessen 02.10.: Probe «Kreis, rot» richtig)
  * LETZTES_MODELL sagt, wer geantwortet hat (für Protokolle).
Groq verlangt einen User-Agent (sonst 403) und lehnt sehr grosse Anfragen mit 413 ab.
  python3 automation/zweitmodell.py --probe
"""
import base64, json, os, re, sys, time, urllib.error, urllib.request

MODELL_GPT = os.environ.get("MODELL_GPT", "gpt-5.5")
GROQ_TEXT = os.environ.get("GROQ_MODELL", "openai/gpt-oss-120b")
GROQ_BILD = os.environ.get("GROQ_MODELL_BILD", "qwen/qwen3.8-27b")
# Ausweich-Textmodell bei 429; leer = keins. 02.10.: Groq hat ein TAGES-Kontingent von 200'000 Tokens JE MODELL (gemessen:
# beide Modelle durch den Google-Massenlauf leer) → Massenläufe nehmen ein eigenes Modell (GROQ_MODELL=openai/gpt-oss-20b,
# GROQ_AUSWEICH=""), damit Bestellungen (Bildvergleich) und SEO-Faktenprüfung ihr Kontingent behalten.
GROQ_AUSWEICH = os.environ.get("GROQ_AUSWEICH", GROQ_BILD)


class TagesKontingentLeer(RuntimeError):
    pass
MARKE = "/tmp/openai_leer"
GEMINI_MARKE = "/tmp/gemini_leer"
LEER_GUELTIG_S = 6 * 3600
LETZTES_MODELL = ""


class OpenAILeer(RuntimeError):
    pass


def openai_schluessel():
    k = os.environ.get("OPENAI_API_KEY", "").strip()
    if not k and os.path.exists("/tmp/openai_key"):
        k = open("/tmp/openai_key").read().strip()
    return k


def openai_leer():
    try:
        return time.time() - os.path.getmtime(MARKE) < LEER_GUELTIG_S
    except OSError:
        return False


def gemini_leer():
    """Check if Gemini fallback marker is valid (6h)."""
    try:
        return time.time() - os.path.getmtime(GEMINI_MARKE) < LEER_GUELTIG_S
    except OSError:
        return False


def _gemini_leer_markieren(grund):
    """Mark Gemini as quota-exhausted, create fallback marker."""
    try:
        open(GEMINI_MARKE, "w").write(time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()) + " " + grund[:200] + "\n")
    except OSError:
        pass
    print(f"  Gemini HTTP 402 → Zweitprüfer Groq ({grund[:80]})", file=sys.stderr, flush=True)


def ist_gemini_402(koerper):
    """Detect Gemini HTTP 402 Payment Required errors."""
    k = koerper if isinstance(koerper, str) else koerper.decode("utf-8", "replace")
    return "402" in k and ("Payment Required" in k or "quota" in k.lower() or "billing" in k.lower())


def _leer_markieren(grund):
    try:
        open(MARKE, "w").write(time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()) + " " + grund[:200] + "\n")
    except OSError:
        pass
    print(f"  ChatGPT ohne Guthaben → Zweitprüfer Groq ({grund[:80]})", file=sys.stderr, flush=True)


def ist_leer(koerper):
    k = koerper if isinstance(koerper, str) else koerper.decode("utf-8", "replace")
    return "insufficient_quota" in k or "credit_balance_exhausted" in k or "Insufficient Balance" in k


def _inhalt(text, bilder):
    if not bilder:
        return text
    return [{"type": "text", "text": text}] + [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(b).decode()}} for b in bilder]


def _json(txt):
    return json.loads(re.search(r"\{.*\}", txt, re.S).group(0))


def _openai(text, bilder):
    k = openai_schluessel()
    if not k:
        raise OpenAILeer("kein OPENAI_API_KEY")
    body = {"model": MODELL_GPT, "messages": [{"role": "user", "content": _inhalt(text, bilder)}],
            "response_format": {"type": "json_object"}}
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": "Bearer " + k})
            j = json.load(urllib.request.urlopen(r, timeout=180))
            return _json(j["choices"][0]["message"]["content"])
        except urllib.error.HTTPError as e:
            koerper = e.read()
            if ist_leer(koerper):
                raise OpenAILeer(koerper[:200].decode("utf-8", "replace"))
            letzter = f"HTTP {e.code}: {koerper[:150].decode('utf-8', 'replace')}"
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 * (a + 1))
    raise RuntimeError("ChatGPT ohne Antwort — " + letzter)


GROQ_MAX_BILDER = int(os.environ.get("GROQ_MAX_BILDER", "3"))   # mehr → HTTP 400 «Too many images» (02.10.: 5; 03.10. gemessen: «supports up to 3 images»)


def raster(bilder, nummer_ab=1, zelle=360, spalten=4):
    """Mehrere Bilder als EIN beschriftetes Raster (gleiche Nummern wie im Prompt)."""
    import io
    from PIL import Image, ImageDraw, ImageFont
    zeilen = (len(bilder) + spalten - 1) // spalten
    bogen = Image.new("RGB", (spalten * zelle, zeilen * (zelle + 40)), "white")
    d = ImageDraw.Draw(bogen)
    try:
        schrift = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    except OSError:
        schrift = ImageFont.load_default()
    for i, b in enumerate(bilder):
        im = Image.open(io.BytesIO(b)).convert("RGB")
        im.thumbnail((zelle - 8, zelle - 8))
        x, y = (i % spalten) * zelle, (i // spalten) * (zelle + 40)
        d.rectangle((x, y, x + zelle - 1, y + 39), fill="black")
        d.text((x + 10, y + 3), f"Bild {i + nummer_ab}", fill="white", font=schrift)
        bogen.paste(im, (x + (zelle - im.width) // 2, y + 40 + (zelle - im.height) // 2))
    out = io.BytesIO()
    bogen.save(out, "JPEG", quality=85)
    return out.getvalue()


def groq_schluessel():
    """04.10.2026: GROQ_API_KEY, GROQ_API_KEY2, GROQ_API_KEY3 — gemessen: Key 1 und 2 hängen an DERSELBEN Organisation
    (Tageskontingent gemeinsam, 197'755/200'000 verbraucht), Key 3 antwortete noch. Rotation nur beim Tageslimit."""
    ks = [os.environ.get(n, "").strip() for n in ("GROQ_API_KEY", "GROQ_API_KEY2", "GROQ_API_KEY3")]
    return [k for k in ks if k]


def _groq_leer_marke(n):
    return f"/tmp/groq_leer_{n}"


def groq_leer(n, modelle):
    """05.10.2026 (Prüfer): die Rotation hatte kein Gedächtnis — jeder Aufruf schickte das Bildraster erst an Schlüssel 1
    und 2 (seit Stunden leer), dann an 3: drei Uploads je Produkt. Ein leerer Schlüssel wird je MODELL 6 h gemerkt
    (/tmp/groq_leer_<n>, Zeilen «Zeit Modell»); das Tageskontingent gilt je Modell und Organisation, ein Textmodell
    auf demselben Schlüssel bleibt nutzbar."""
    p = _groq_leer_marke(n)
    try:
        if time.time() - os.path.getmtime(p) >= LEER_GUELTIG_S:
            return False
        inhalt = open(p).read()
    except OSError:
        return False
    return any(m in inhalt for m in modelle)


def _groq_leer_merken(n, modelle, grund):
    try:
        with open(_groq_leer_marke(n), "a") as f:
            for m in modelle:
                f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())} {m} {grund[:320]}\n")
        os.utime(_groq_leer_marke(n), None)
    except OSError:
        pass


def groq_json(text, bilder=None, nummer_ab=1):
    ks = groq_schluessel()
    if not ks:
        raise RuntimeError("GROQ_API_KEY fehlt")
    modelle = [GROQ_BILD] if bilder else [m for m in (GROQ_TEXT, GROQ_AUSWEICH) if m]
    letzter = None
    uebersprungen = []
    for i, k in enumerate(ks):
        if groq_leer(i + 1, modelle):
            uebersprungen.append(i + 1); continue
        try:
            return _groq_json_mit(k, text, bilder, nummer_ab)
        except TagesKontingentLeer as e:
            letzter = e
            _groq_leer_merken(i + 1, modelle, str(e))
            if i + 1 < len(ks):
                print(f"  Groq-Tageskontingent leer mit Schlüssel {i + 1} → Schlüssel {i + 2}", file=sys.stderr, flush=True)
    if letzter is None:
        letzter = TagesKontingentLeer(f"Groq-Tageskontingent leer ({', '.join(modelle)}) — Schlüssel {uebersprungen} "
                                      f"als leer gemerkt (/tmp/groq_leer_<n>, {LEER_GUELTIG_S // 3600} h)")
    raise letzter


def _groq_json_mit(k, text, bilder=None, nummer_ab=1):
    if bilder and len(bilder) > GROQ_MAX_BILDER:
        text = (f"Die {len(bilder)} Bilder sind zu EINEM Raster zusammengesetzt; jedes trägt oben sein Etikett "
                f"«Bild {nummer_ab}» bis «Bild {nummer_ab + len(bilder) - 1}». Diese Etiketten sind die Nummern im Auftrag.\n\n" + text)
        bilder = [raster(bilder, nummer_ab)]
    global LETZTES_MODELL
    # Text: bei 429 (Minutenkontingent, geteilt mit Dauerläufen) zuerst auf das zweite Modell mit eigenem Kontingent
    modelle = [GROQ_BILD] if bilder else [m for m in (GROQ_TEXT, GROQ_AUSWEICH) if m]
    modell = modelle[0]
    body = {"model": modell, "temperature": 0, "messages": [{"role": "user", "content": _inhalt(text, bilder)}],
            "response_format": {"type": "json_object"}}
    letzter = ""
    tageslimit = set()
    for a in range(6):
        modell = modelle[a % len(modelle)]
        if modell in tageslimit:
            continue
        body["model"] = modell
        try:
            r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": "Bearer " + k,
                                                "User-Agent": "luxestyle-zweitmodell/1"})
            j = json.load(urllib.request.urlopen(r, timeout=120))
            LETZTES_MODELL = "groq:" + modell
            return _json(j["choices"][0]["message"]["content"])
        except urllib.error.HTTPError as e:
            letzter = f"HTTP {e.code}: {e.read()[:400].decode('utf-8', 'replace')}"
            if e.code in (400, 401, 403, 404, 413):
                break
            if e.code == 429 and a % len(modelle) < len(modelle) - 1:
                continue                      # sofort das nächste Modell, erst danach warten
            m = re.search(r"try again in (?:(\d+)m)?([\d.]+)(ms|s)", letzter)
            if e.code == 429 and m:           # Groq nennt die Wartezeit selbst — genau so lange warten
                warte = int(m.group(1) or 0) * 60 + float(m.group(2)) / (1000 if m.group(3) == "ms" else 1)
                if "per day" in letzter or warte > 180:
                    tageslimit.add(modell)
                    if all(x in tageslimit for x in modelle):
                        raise TagesKontingentLeer(f"Groq-Tageskontingent leer ({', '.join(modelle)}) — {letzter[:320]}")   # 05.10.: 320 statt 160 — «try again in …» (Reset-Zeit) stand sonst nie im Log
                    continue
                time.sleep(min(90, warte + 1))
                continue
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(15 * (a + 1))
    if tageslimit or "per day" in letzter:
        raise TagesKontingentLeer(f"Groq-Tageskontingent leer ({', '.join(modelle)}) — {letzter[:320]}")   # 05.10.: 320 statt 160 — «try again in …» (Reset-Zeit) stand sonst nie im Log
    raise RuntimeError(f"Groq ({modell}) ohne Antwort — " + letzter)


def chat_json(text, bilder=None, nummer_ab=1):
    """Zweitprüfer: ChatGPT oder (bei leerem Guthaben) Groq. Antwort = JSON-Objekt."""
    global LETZTES_MODELL
    if not openai_leer():
        try:
            out = _openai(text, bilder)
            LETZTES_MODELL = MODELL_GPT
            return out
        except OpenAILeer as e:
            _leer_markieren(str(e))
    out = groq_json(text, bilder, nummer_ab)   # setzt LETZTES_MODELL auf das tatsächlich antwortende Modell
    return out


def gemini_fallback_check():
    """Check if Gemini is in fallback mode (HTTP 402). Use Groq if true."""
    return gemini_leer()


def handle_gemini_402(error_msg):
    """Call this when catching HTTP 402 from Gemini. Creates fallback marker."""
    _gemini_leer_markieren(error_msg)


if __name__ == "__main__" and "--leer" in sys.argv:
    # Stand der Leer-Marken je Schlüssel (ohne Aufruf)
    for n in range(1, 4):
        p = _groq_leer_marke(n)
        if os.path.exists(p):
            alter = int(time.time() - os.path.getmtime(p))
            print(f"Schlüssel {n}: {'GÜLTIG' if alter < LEER_GUELTIG_S else 'abgelaufen'} ({alter // 60} min) — " + open(p).read().strip().replace("\n", " | ")[:200])
        else:
            print(f"Schlüssel {n}: keine Marke")
    sys.exit(0)

if __name__ == "__main__" and "--probe" in sys.argv:
    import io
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (256, 256), "white")
    ImageDraw.Draw(im).ellipse((60, 60, 196, 196), fill="red")
    b = io.BytesIO(); im.save(b, "JPEG")
    print(chat_json('Welche Form und Farbe? Antworte als JSON {"form": "...", "farbe": "..."}', [b.getvalue()]), LETZTES_MODELL)
    print(chat_json('Antworte als JSON {"ok": true}'), LETZTES_MODELL)
