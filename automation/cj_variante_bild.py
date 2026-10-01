#!/usr/bin/env python3
"""cj_variante_bild.py — welche CJ-Variante zeigt das Shop-Produkt? (Bildvergleich, zwei Modelle)

ANLASS 01.10.2026 (#1021): Das Shop-Produkt hatte EINE Variante, CJ fünf Farben. Die Bestell-Engine meldete
«manuell prüfen», die Kundin wartete, bis jemand die Bilder von Hand verglich. Stichprobe 40 von 27'390 aktiven
Einzelvarianten-Produkten mit CJ-pid-SKU: 29 haben bei CJ mehrere Varianten (≈ 72 %) — jede Bestellung darauf
bliebe stehen.

Regel: Shop-Hauptbild + nummerierte CJ-Variantenbilder an Gemini UND ChatGPT, unabhängig. Bestellt wird nur, wenn
beide dieselbe Nummer nennen und beide «sicher» ≥ 0.8 melden. Sonst None + Grund → Engine meldet «manuell prüfen».
Ein Treffer wird mit Beleg in dropship/_cj_varianten_zuordnung.tsv geschrieben (nächste Bestellung ohne KI-Aufruf).

Aufruf zum Testen:  python3 automation/cj_variante_bild.py <shop-sku>      (schreibt NICHT in die Zuordnung)
"""
import base64, json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
ZUORDNUNG = os.path.join(HIER, "..", "dropship", "_cj_varianten_zuordnung.tsv")
MAX_KANDIDATEN = 12
SICHER_AB = 0.8

PROMPT = """Bild 0 ist das Produktbild eines Online-Shops. Die Bilder 1 bis {n} zeigen die Varianten desselben Artikels
beim Lieferanten (Farbe/Ausführung). Welche Variante (1–{n}) entspricht GENAU dem Artikel auf Bild 0 — gleiche Farbe
von Gehäuse/Stoff/Zifferblatt/Band, gleiche Ausführung? Achte auf Farbe, nicht auf Hintergrund oder Perspektive.
Wenn mehrere gleich gut passen oder keine sicher passt: index null.
Antworte NUR als JSON: {{"index": <Zahl oder null>, "sicher": <0.0–1.0>, "grund": "<ein kurzer Satz>"}}"""


def _holen(url, timeout=40):
    r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(r, timeout=timeout).read()


def _klein(b):
    """auf ≤ 640 px verkleinern (Kosten, Zeit); fällt auf das Original zurück, wenn PIL fehlt."""
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(b)).convert("RGB"); im.thumbnail((640, 640))
        o = io.BytesIO(); im.save(o, "JPEG", quality=85); return o.getvalue()
    except Exception:
        return b


def _gemini(bilder, text):
    sys.path.insert(0, HIER)
    from gemini_jury import schluessel
    k = schluessel()
    if not k:
        raise RuntimeError("GEMINI_API_KEY fehlt")
    teile = [{"text": text}] + [{"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(b).decode()}} for b in bilder]
    body = {"contents": [{"parts": teile}], "generationConfig": {"temperature": 0.0, "response_mime_type": "application/json"}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={k}"
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=120))
            return json.loads(re.search(r"\{.*\}", j["candidates"][0]["content"]["parts"][0]["text"], re.S).group(0))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("Gemini ohne Antwort — " + letzter)


def _gpt(bilder, text):
    sys.path.insert(0, HIER)
    from gemini_jury import openai_schluessel, MODELL_GPT
    k = openai_schluessel()
    if not k:
        raise RuntimeError("OPENAI-Schlüssel fehlt")
    inhalt = [{"type": "text", "text": text}] + [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(b).decode()}} for b in bilder]
    body = {"model": MODELL_GPT, "messages": [{"role": "user", "content": inhalt}], "response_format": {"type": "json_object"}}
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": "Bearer " + k})
            j = json.load(urllib.request.urlopen(r, timeout=180))
            return json.loads(re.search(r"\{.*\}", j["choices"][0]["message"]["content"], re.S).group(0))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("ChatGPT ohne Antwort — " + letzter)


def waehlen(shop_bild_url, varianten):
    """-> (variante, beleg) oder (None, grund). varianten = CJ variant/query-Liste."""
    kand = [v for v in varianten if v.get("variantImage")][:MAX_KANDIDATEN]
    if len(kand) < 2:
        return None, f"Bildvergleich unmöglich: nur {len(kand)} CJ-Varianten mit Bild"
    if len(kand) < len(varianten) and len(varianten) > MAX_KANDIDATEN:
        return None, f"Bildvergleich: {len(varianten)} Varianten (> {MAX_KANDIDATEN}) — manuell prüfen"
    try:
        bilder = [_klein(_holen(shop_bild_url))] + [_klein(_holen(v["variantImage"])) for v in kand]
    except Exception as e:
        return None, f"Bildvergleich: Bild nicht ladbar ({type(e).__name__})"
    # identische Variantenbilder (Grössen-Varianten mit gleichem Foto) → kein Farbunterschied, nicht raten
    if len({b for b in bilder[1:]}) < len(bilder) - 1:
        return None, "Bildvergleich: mehrere Varianten haben dasselbe Bild (Grösse/Menge?) — manuell prüfen"
    text = PROMPT.format(n=len(kand))
    urteile = {}
    for name, f in (("gemini", _gemini), ("gpt", _gpt)):
        try:
            urteile[name] = f(bilder, text)
        except Exception as e:
            return None, f"Bildvergleich: {name} ausgefallen ({str(e)[:80]}) — manuell prüfen"
    idx = {n: u.get("index") for n, u in urteile.items()}
    sicher = {n: float(u.get("sicher") or 0) for n, u in urteile.items()}
    kurz = "; ".join(f"{n} {idx[n]} ({sicher[n]:.2f}): {str(urteile[n].get('grund',''))[:80]}" for n in urteile)
    i = idx["gemini"]
    if i is None or i != idx["gpt"] or not isinstance(i, int) or not (1 <= i <= len(kand)):
        return None, f"Bildvergleich uneinig/kein Treffer — {kurz}"
    if min(sicher.values()) < SICHER_AB:
        return None, f"Bildvergleich unsicher — {kurz}"
    return kand[i - 1], f"auto Bildvergleich Gemini+ChatGPT einig (#{i}) — {kurz}"


def zuordnung_schreiben(shop_sku, v, beleg):
    neu = not os.path.exists(ZUORDNUNG)
    with open(ZUORDNUNG, "a", encoding="utf-8") as f:
        if neu:
            f.write("# shopify_sku\tcj_vid\tcj_variantSku\tbeleg\n")
        f.write(f"{shop_sku}\t{v.get('vid')}\t{v.get('variantSku') or ''}\t{time.strftime('%d.%m.%Y')}: {beleg.replace(chr(9),' ').replace(chr(10),' ')}\n")


if __name__ == "__main__":
    # Probelauf: Shop-Bild über die Admin-API, CJ-Varianten über die Engine — schreibt nichts.
    sys.path.insert(0, HIER)
    import cj_order_engine as e
    sku = sys.argv[1]
    d = e.gql('{productVariants(first:1, query:"sku:\\"%s\\""){nodes{product{featuredMedia{preview{image{url}}}}}}}' % sku)
    url = d["data"]["productVariants"]["nodes"][0]["product"]["featuredMedia"]["preview"]["image"]["url"]
    vs = e.cj(f"/api2.0/v1/product/variant/query?pid={sku[3:]}").get("data") or []
    v, beleg = waehlen(url, vs)
    print(json.dumps({"sku": sku, "varianten": len(vs), "vid": (v or {}).get("vid"),
                      "variante": (v or {}).get("variantKey"), "beleg": beleg}, ensure_ascii=False))
