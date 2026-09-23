#!/usr/bin/env python3
"""bild_queue_captions_ehrlich.py — schreibt die Captions wartender Bildposts (social/posts_image.csv, status=ready)
in die ehrliche Laden-Sprache um. 23.09.2026, Betreiber «schön weiter machen»; Klasse aus dem Kundenfeedback 05.09.
(«zu fest KI, wie Scam»).

GEMESSEN 23.09.: 70 «ready»-Zeilen, alle vom 01.08. (Kimi): «Glitzernde Momente mit unserem … ✨ Bezahl bequem auf
Rechnung mit Klarna. 💎 🔗 luxestyle.ch · Link in Bio #…» — kein Preis, Emoji-Kette, derselbe Klarna-Satz in jeder
Zeile. Der Nachschub (queue_new_products.mjs) schrieb bis heute «Spar dir den Designer-Preis», «Schreib LINK 👇»,
«–10% WELCOME10». Beides ist die Scam-Klasse; der Karussell-Bauer (tiktok_karussell.py) spricht seit 05.09. anders.

REGEL (gleiche Bausteine wie tiktok_karussell.py):
  <erster Kimi-Satz, wenn sachlich (ohne Klarna/Rabatt/Code/%), höchstens 140 Zeichen, ein Emoji>
  <Kurztitel> · CHF <Preis>            ← Preis vom LIVE-Produkt, nicht aus dem Text
  Kleiner Schweizer Shop aus Belp, kein Konzern. <Lieferzeit je Tag ch-lager> · 30 Tage Rückgabe · TWINT oder Rechnung.
  Fragen? Schreib sie in die Kommentare 👇
  Jetzt im Shop 🇨🇭 luxestyle.ch – Link in Bio
  <blank>
  #schweiz #luxestyle + bis 3 passende Tags (aus den bisherigen Hashtags, ohne #fyp/#onlineshopping/#sale)

Idempotent: eine Zeile, die schon «Kleiner Schweizer Shop» trägt und keinen Scam-Marker, bleibt unberührt.
Produkt-Daten kommen live aus Shopify (Zeilen-ID endet auf die Produkt-ID); ohne Antwort wird NICHT geschrieben.
DRY (Standard) zeigt Vorher/Nachher; SCHARF=1 schreibt. Bericht: dropship/BILD-QUEUE-CAPTIONS.md.
Täglich im Aufseher (fixer_keepalive.sh) — auch für Zeilen, die der Nachschub künftig anhängt.
"""
import csv, io, json, os, re, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, "social", "posts_image.csv")
BERICHT = os.path.join(ROOT, "dropship", "BILD-QUEUE-CAPTIONS.md")
SCHARF = os.environ.get("SCHARF") == "1"
SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip() if os.path.exists("/tmp/cj_shop_token.txt") else ""

SCAM = re.compile(r"WELCOME10|Designer-Preis|Schreib LINK|#fyp\b|nur heute|Rabatt|Bezahl bequem|Klarna\.|"
                  r"Spar dir|Limitiert|Nur noch|%", re.I)
GENERISCH = {"#onlineshopping", "#sale", "#fyp", "#viral", "#shopping", "#neu", "#trend", "#trending", "#luxestyle", "#schweiz"}
EMOJI = re.compile(r"[\U0001F300-\U0001FAFF☀-➿⭐⭕️]")


def gql(q, v=None):
    for versuch in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            d = {}
        if d.get("data") is not None:
            return d
        import time; time.sleep(5)
    raise RuntimeError("Shopify hat auf keinen Versuch mit Daten geantwortet — nichts geschrieben.")


def produkte(ids):
    out = {}
    for i in range(0, len(ids), 50):
        teil = ids[i:i + 50]
        d = gql("query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status onlineStoreUrl tags "
                "priceRangeV2{minVariantPrice{amount}}}}}", {"ids": ["gid://shopify/Product/" + x for x in teil]})
        for n in (d["data"]["nodes"] or []):
            if n:
                out[n["id"].split("/")[-1]] = n
    return out


def chf(p):
    return "CHF " + f"{float(p):.2f}".replace(".00", ".–")


def kurztitel(t):
    t = re.sub(r"\s*[·|]\s*.*$", "", t)
    t = re.sub(r"\s+[–—-]\s+.*$", "", t)
    return t.strip()


def erster_satz(cap):
    """Der Kimi-Text beginnt meist mit einem brauchbaren Produktsatz. Nur behalten, wenn sachlich."""
    s = cap.split("\n")[0]
    s = re.split(r"(?<=[.!?])\s+", s)[0].strip()
    s = re.sub(r"\s*🔗.*$", "", s)
    if not s or len(s) > 140 or SCAM.search(s) or "Link in Bio" in s or "luxestyle" in s.lower():
        return ""
    em = EMOJI.findall(s)
    if len(em) > 1:                                   # hoechstens ein Emoji, und das am Ende
        s = EMOJI.sub("", s).strip() + " " + em[0]
    return s.strip()


def laden_zeile(tags):
    t = {x.lower() for x in tags}
    liefer = "Versand ab Schweizer Lager in 1–2 Werktagen" if "ch-lager" in t else "Lieferung 10–20 Werktage, dafür ehrlich angeschrieben"
    return (f"Kleiner Schweizer Shop aus Belp, kein Konzern. {liefer} · 30 Tage Rückgabe · TWINT oder Rechnung.\n"
            "Fragen? Schreib sie in die Kommentare 👇")


def hashtags(alt_cap):
    alte = [h.lower() for h in re.findall(r"#[\wäöüß]+", alt_cap)]
    extra = [h for h in alte if h not in GENERISCH][:3]
    return " ".join(["#schweiz", "#luxestyle"] + extra)


def neu_caption(alt, p):
    zeilen = []
    s = erster_satz(alt)
    if s:
        zeilen.append(s)
    zeilen.append(f"{kurztitel(p['title'])} · {chf(p['priceRangeV2']['minVariantPrice']['amount'])}")
    zeilen.append(laden_zeile(p.get("tags") or []))
    zeilen.append("Jetzt im Shop 🇨🇭 luxestyle.ch – Link in Bio")
    return "\n".join(zeilen) + "\n\n" + hashtags(alt)


def braucht_umbau(cap):
    return SCAM.search(cap) is not None or "Kleiner Schweizer Shop" not in cap or "CHF" not in cap


def main():
    text = open(CSV, encoding="utf-8", newline="").read()
    rows = list(csv.reader(io.StringIO(text)))
    hdr = rows[0]; ci = {h: i for i, h in enumerate(hdr)}
    ready = [r for r in rows[1:] if len(r) > ci["status"] and r[ci["status"]].strip() == "ready"]
    kand = [(r, re.search(r"(\d{12,})\s*$", r[ci["id"]].strip())) for r in ready]
    kand = [(r, m.group(1)) for r, m in kand if m and braucht_umbau(r[ci["caption"]])]
    print(f"ready {len(ready)} · umzubauen {len(kand)}")
    if not kand:
        bericht(0, 0, [])
        return
    live = produkte([pid for _, pid in kand])
    umgebaut, beispiele, uebersprungen = 0, [], 0
    for r, pid in kand:
        p = live.get(pid)
        if not p or p["status"] != "ACTIVE" or not p.get("onlineStoreUrl"):
            uebersprungen += 1; continue           # nicht kaufbar → das Kaufbarkeits-Tor des Posters entscheidet
        alt = r[ci["caption"]]
        neu = neu_caption(alt, p)
        if len(beispiele) < 3:
            beispiele.append((r[ci["id"]], alt, neu))
        if SCHARF:
            r[ci["caption"]] = neu
        umgebaut += 1
    if SCHARF and umgebaut:
        out = io.StringIO(); w = csv.writer(out, lineterminator="\n"); w.writerows(rows)
        open(CSV, "w", encoding="utf-8", newline="").write(out.getvalue())
        # Ruecklesen: kein Scam-Marker mehr in ready-Zeilen
        rest = [r for r in csv.DictReader(open(CSV, encoding="utf-8")) if r["status"].strip() == "ready" and SCAM.search(r["caption"])]
        print(f"Ruecklesen: {len(rest)} ready-Zeilen mit Scam-Marker uebrig")
    for zid, alt, neu in beispiele:
        print(f"\n# {zid[:60]}\n--- vorher\n{alt[:300]}\n--- nachher\n{neu}")
    print(f"\n{'SCHARF' if SCHARF else 'DRY'}: {umgebaut} umgebaut, {uebersprungen} nicht kaufbar uebersprungen")
    bericht(len(ready), umgebaut, beispiele)


def bericht(ready, umgebaut, beispiele):
    if not SCHARF:
        return
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Bild-Queue-Captions — ehrliche Laden-Sprache · Stand {datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC\n\n")
        f.write(f"Werkzeug `automation/bild_queue_captions_ehrlich.py` (täglich im Aufseher). ready: {ready} · heute umgebaut: {umgebaut}\n\n")
        f.write("Regel: erster sachlicher Satz (optional) · Kurztitel · CHF-Preis (live) · Laden-Zeile aus Belp mit belegter Lieferzeit ·\n"
                "Kommentar-Frage · «Jetzt im Shop 🇨🇭 luxestyle.ch – Link in Bio» · #schweiz #luxestyle + bis 3 Sach-Tags.\n"
                "Scam-Marker (WELCOME10, Designer-Preis, Schreib LINK, #fyp, Rabatt, «Bezahl bequem … Klarna», %) werden entfernt.\n\n")
        for zid, alt, neu in beispiele:
            f.write(f"## {zid}\n\n**vorher**\n\n```\n{alt}\n```\n\n**nachher**\n\n```\n{neu}\n```\n\n")


if __name__ == "__main__":
    main()
