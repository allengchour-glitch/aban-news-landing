#!/usr/bin/env python3
"""reel_neu_rendern.py — wartende Reels mit zu kleinem Videofenster neu rendern (28.09.2026).

Anlass: Betreiber-Screenshot TikTok «das video ist sehr klein?» — der Lederrucksack (9:16-Quelle) stand in make_reel.sh als
326×580 px im Bild (9 % der Fläche). make_reel.sh hat seit 28.09. das Band 390-1170 (Hochformat 600×780, quadratisch 780×780,
Querformat volle Breite). Dieses Skript rendert die WARTENDEN Reels (status ready, social/reels/reel_<pid>.mp4) neu, deren
scharfes Fenster schmaler als 700 px ist — mit denselben Texten, demselben Preis und derselben Musik; die Adresse bleibt gleich.

Quelle: auftraege/ergebnis/*-rq-<pid>.mp4 (Server-Weg vom 28.09.). Ohne Quelle bleibt das Reel, wie es ist (gemeldet).
Nach dem Render muss `meisterwerk_tor.py` bestehen (mit PREIS_SOLL aus der Caption), sonst bleibt die alte Datei.

  python3 automation/reel/reel_neu_rendern.py          → Trockenlauf: Liste mit Fensterbreite, Quelle, Hook, Musik
  SCHARF=1 python3 automation/reel/reel_neu_rendern.py → rendern, Tor, Datei ersetzen (git add/commit macht der Aufrufer)

MODUS=hook (30.09.2026): statt «Fenster zu schmal» die vom Meisterwerk-Tor gesperrten Reels (status meisterwerk-tor-skip)
neu schneiden — Einstieg = bewegteste Sekunde der Quelle (reel/hook_start.py). Besteht das Tor, geht die Zeile zurück auf
`ready` (Datei frisch gelesen, nur Zeilen, die noch meisterwerk-tor-skip stehen, atomar geschrieben — Lost-Update-Lehre 28.09.).
Seit 30.09. nimmt auch der Fenster-Modus den gefundenen Einstieg statt min(2, Dauer/4).

MODUS=preis (30.09.2026, Verbesserungsrunde): 36 Reels standen auf `preis-veraltet-skip` — post_guard.preisVeraltet sperrt
sie zu Recht (Preis in Caption UND im Bild ≠ Live-Preis), aber niemand reparierte sie: gesperrt ≠ verloren (Lehre 28.09.).
Hier: Live-Preis aus Shopify (Handle aus dem Caption-Link), Video mit neuem Preis neu rendern, Tor mit PREIS_SOLL = Live,
Caption-Preis ersetzen (Versand-Schwellen bleiben), Zeile atomar zurück auf `ready`. Ohne Quelle: tor_quellen_anfragen.mjs
fordert sie über den Server an (STATUS enthält preis-veraltet-skip).
"""
import csv, glob, json, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(REPO)
SCHARF = os.environ.get("SCHARF") == "1"
MODUS = os.environ.get("MODUS", "fenster")
MIN_BREITE = 700
CSV = "automation/reels_seed.csv"


def hook_start(quelle, d):
    try:
        r = json.loads(subprocess.run(["python3", "automation/reel/hook_start.py", quelle], capture_output=True, text=True,
                                      timeout=300).stdout.strip().split("\n")[-1])
        return float(r["start"])
    except Exception:
        return min(2, d / 4 if d else 0)


def status_setzen(ids, alt, neu):
    """Nur Zeilen, die noch `alt` tragen, auf `neu` — Datei frisch lesen, atomar schreiben. Gibt die Zahl zurück."""
    import io
    with open(CSV, newline="") as f:
        rows = list(csv.reader(f))
    h = rows[0]; iid, ist = h.index("id"), h.index("status"); n = 0
    for r in rows[1:]:
        if len(r) > ist and r[iid] in ids and r[ist] == alt:
            r[ist] = neu; n += 1
    buf = io.StringIO(); csv.writer(buf, lineterminator="\n").writerows(rows)
    with open(CSV + ".tmp", "w", newline="") as f:
        f.write(buf.getvalue())
    os.replace(CSV + ".tmp", CSV)
    return n


def fensterbreite(video):
    """Breite des scharfen Videofensters im Band (Zeilen 650-1100) bei t=5 s — Gradientenenergie je Spalte."""
    png = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "5", "-i", video, "-frames:v", "1", png], check=True, timeout=120)
        a = np.asarray(Image.open(png).convert("L"), dtype=float)[650:1100]
        g = np.abs(np.diff(a, axis=1)).mean(axis=0)
        cols = np.where(g > max(3, np.percentile(g, 95) * 0.25))[0]
        return int(cols.max() - cols.min()) if len(cols) else 0
    finally:
        os.unlink(png)


def zeilen(titel):
    """Titelzeilen genau wie der Reel-Motor (zeilen() aus cj_video_reel_engine.mjs)."""
    js = r"""const src=require('fs').readFileSync('automation/cj_video_reel_engine.mjs','utf8');
const k=src.match(/function kurzTitel\(title\) \{[\s\S]*?\n\}/)[0], z=src.match(/function zeilen\(title\) \{[\s\S]*?\n\}/)[0];
eval(k); eval(z); console.log(JSON.stringify(zeilen(process.argv[1])));"""
    return json.loads(subprocess.run(["/opt/node22/bin/node", "-e", js, titel], capture_output=True, text=True, check=True).stdout)


def dauer(p):
    import av
    with av.open(p) as c:
        return float(c.duration / 1e6) if c.duration else 0.0


def live_preis(handle):
    """Günstigste Variante (CHF, 2 Stellen) + Status aus Shopify — None bei Fehler (dann kein Urteil, keine Änderung)."""
    sys.path.insert(0, os.path.join(REPO, "automation"))
    import heilversprechen_wache as hw
    r = hw.gql('query($h:String!){productByHandle(handle:$h){status priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}}}}',
               {"h": handle})
    p = ((r.get("data") or {}).get("productByHandle")) if isinstance(r, dict) else None
    if not p:
        return None
    return p["status"], f'{float(p["priceRangeV2"]["minVariantPrice"]["amount"]):.2f}', f'{float(p["priceRangeV2"]["maxVariantPrice"]["amount"]):.2f}'


def shopify_quelle(handle, pid):
    """02.10.2026: Rückfall, wenn der Server-Download (auftraege/ergebnis/*-rq-<pid>.mp4) fehlt — die Reels wurden aus dem
    Produktvideo gebaut, das am Shopify-Produkt hängt (Tag video-hit), und das Shopify-CDN ist von hier erreichbar.
    Gemessen nach der Preissenkung: 29 von 31 gesperrten Reels «keine Quelle». Cache /tmp/reel_quellen/ (nie ins Repo)."""
    if not handle:
        return []
    ziel = f"/tmp/reel_quellen/{pid}.mp4"
    if os.path.exists(ziel) and os.path.getsize(ziel) > 100_000:
        return [ziel]
    sys.path.insert(0, os.path.join(REPO, "automation"))
    import heilversprechen_wache as hw
    r = hw.gql('query($h:String!){productByHandle(handle:$h){media(first:20){nodes{... on Video{sources{url mimeType height}}}}}}',
               {"h": handle})
    p = ((r.get("data") or {}).get("productByHandle")) if isinstance(r, dict) else None
    quellen = [s for n in ((p or {}).get("media") or {}).get("nodes", []) for s in (n.get("sources") or [])
               if s.get("mimeType") == "video/mp4"]
    if not quellen:
        return []
    beste = sorted(quellen, key=lambda s: (s.get("height") or 0) > 1080, )
    beste = sorted([s for s in quellen if (s.get("height") or 0) <= 1080] or quellen, key=lambda s: -(s.get("height") or 0))[0]
    os.makedirs("/tmp/reel_quellen", exist_ok=True)
    rc = subprocess.run(["curl", "-sL", "--max-time", "300", "-o", ziel + ".tmp", beste["url"]]).returncode
    if rc != 0 or not os.path.exists(ziel + ".tmp") or os.path.getsize(ziel + ".tmp") < 100_000:
        return []
    os.replace(ziel + ".tmp", ziel)
    return [ziel]


VERSAND = re.compile(r"(?:versand|lieferung|gratis|kostenlos)[^.\n]{0,25}?CHF\s?\d+(?:[.,]\d{2})?", re.I)


def caption_preis(cap, neu):
    """Jede CHF-Angabe mit Rappen ausser Versand-Schwellen (wie post_guard.preisVeraltet) → neuer Preis."""
    # Kanarienvogel 30.09.: «CHF 47.90 statt CHF 59.90» wurde zu «CHF 48.90 statt CHF 48.90» → Streichpreis raus
    cap = re.sub(r"\s*statt\s+CHF\s?\d+[.,]\d{2}\b", "", cap)
    schutz = {m.span() for m in VERSAND.finditer(cap)}
    def ersetze(m):
        if any(a <= m.start() < b for a, b in schutz):
            return m.group(0)
        return f"CHF {neu}"
    return re.sub(r"CHF\s?\d+[.,]\d{2}\b", ersetze, cap)


def zeile_ersetzen(rid, alt_status, neu_status, neue_caption):
    """Wie status_setzen, aber mit Caption — nur wenn die Zeile noch alt_status trägt (Lost-Update-Lehre 28.09.)."""
    import io
    with open(CSV, newline="") as f:
        rows = list(csv.reader(f))
    h = rows[0]; iid, ist, ica = h.index("id"), h.index("status"), h.index("caption"); n = 0
    for r in rows[1:]:
        if len(r) > ist and r[iid] == rid and r[ist] == alt_status:
            r[ist] = neu_status; r[ica] = neue_caption; n += 1
    buf = io.StringIO(); csv.writer(buf, lineterminator="\n").writerows(rows)
    with open(CSV + ".tmp", "w", newline="") as f:
        f.write(buf.getvalue())
    os.replace(CSV + ".tmp", CSV)
    return n


def main():
    rows = list(csv.DictReader(open("automation/reels_seed.csv")))
    erg = []
    for r in rows:
        soll = {"hook": "meisterwerk-tor-skip", "preis": "preis-veraltet-skip"}.get(MODUS, "ready")
        if r.get("status") != soll or not r["id"].startswith("cjreel-"):
            continue
        pid = r["id"][len("cjreel-"):]
        lokal = f"social/reels/reel_{pid}.mp4"
        if not os.path.exists(lokal):
            if MODUS != "preis":
                continue
            b = 0      # 02.10.2026: Preis-Reparatur braucht das alte Reel nicht (Quelle reicht), nur Musik-Erkennung fällt weg
        else:
            b = fensterbreite(lokal)
        if MODUS == "fenster" and b >= MIN_BREITE:
            continue
        q = sorted(glob.glob(f"auftraege/ergebnis/*-rq-{pid.lower()}.mp4"))
        cap = r["caption"]
        hook = re.sub(r"\s*👀\s*$", "", cap.split("\n")[0]).strip()
        m = re.search(r"«([^»]+)»", cap); titel = m.group(1) if m else ""
        p = re.search(r"CHF (\d+\.\d\d)", cap); preis = p.group(1) if p else ""
        if MODUS == "preis":
            hd = re.search(r"/products/([a-z0-9-]+)", cap)
            lp = live_preis(hd.group(1)) if hd else None
            if not lp or lp[0] != "ACTIVE":
                erg.append((pid, b, "UEBERSPRUNGEN", "kein Live-Preis" if not lp else f"Produkt {lp[0]}")); continue
            if lp[1] != lp[2]:
                erg.append((pid, b, "UEBERSPRUNGEN", f"Preisspanne {lp[1]}–{lp[2]} (Variantenpreise) — von Hand")); continue
            preis = lp[1]; cap = caption_preis(cap, preis)
        if not q:
            hd2 = re.search(r"/products/([a-z0-9-]+)", cap)
            q = shopify_quelle(hd2.group(1) if hd2 else "", pid)
        if not (q and titel and preis):
            erg.append((pid, b, "UEBERSPRUNGEN", "keine Quelle" if not q else "Caption ohne Titel/Preis")); continue
        mus = subprocess.run(["python3", "automation/music/produce/musik_erkennen.py", lokal], capture_output=True,
                             text=True).stdout.split("\t") if os.path.exists(lokal) else []
        stueck = mus[1] if len(mus) >= 5 and mus[4].strip() == "sicher" else "luxe-adventure-uplift.wav"
        ein = json.load(open("automation/music/_einstiege.json")).get(stueck, {}).get("einstiege", [0])[0]
        z1, z2 = zeilen(titel)
        print(f"{pid}: Fenster {b} px → neu · «{titel[:40]}» CHF {preis} · Hook «{hook}» · {stueck} ab {ein}s", flush=True)
        if not SCHARF:
            erg.append((pid, b, "TROCKEN", "")); continue
        tmp = f"/tmp/reelneu_{pid}.mp4"
        d = dauer(q[0])
        st = hook_start(q[0], d)
        env = {**os.environ, "START": str(st), "MUSIK_START": str(ein)}
        subprocess.run(["bash", "automation/reel/make_reel.sh", q[0], tmp, z1, z2, f"CHF {preis}", hook, "automation/music/" + stueck],
                       env=env, check=True, capture_output=True, timeout=600)
        tor = subprocess.run(["python3", "automation/meisterwerk_tor.py", tmp], env={**os.environ, "PREIS_SOLL": preis},
                             capture_output=True, text=True, timeout=600)
        nb = fensterbreite(tmp)
        if tor.returncode != 0:
            erg.append((pid, b, "TOR-DURCHGEFALLEN", tor.stdout.strip()[-200:])); os.unlink(tmp); continue
        os.replace(tmp, lokal)
        if MODUS == "hook":
            zurueck = status_setzen({r["id"]}, "meisterwerk-tor-skip", "ready")
        elif MODUS == "preis":
            zurueck = zeile_ersetzen(r["id"], "preis-veraltet-skip", "ready", cap)
        else:
            zurueck = 0
        erg.append((pid, b, "ERSETZT", f"neu {nb} px · Einstieg {st}s" + (" · wieder ready" if zurueck else "")))
    print("\nERGEBNIS:")
    for e in erg:
        print("  " + " · ".join(str(x) for x in e))
    print(f"FERTIG: {sum(1 for e in erg if e[2]=='ERSETZT')} ersetzt, {sum(1 for e in erg if e[2]!='ERSETZT' and e[2]!='TROCKEN')} nicht, "
          f"{sum(1 for e in erg if e[2]=='TROCKEN')} im Trockenlauf")


if __name__ == "__main__":
    main()
