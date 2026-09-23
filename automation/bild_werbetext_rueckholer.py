#!/usr/bin/env python3
"""bild_werbetext_rueckholer.py — Nicht-Hauptbilder mit eingebranntem Werbetext finden und zurückholen (23.09.2026).

ANLASS (Prüfer 23.09. 23:05 UTC): Produkt 15453774086529 «Stiller Aroma Diffusor für Zuhause & Büro» trägt an
Position 2 das Medium 69926701629825 mit einer Sprechblase «FOR YOU PROVIDE COMFORT FRAGRANCE ENVIRONMENT · THREE
USES · MULTI-SCENE AROMA DIFFUSER». Tesseract liest 5 sichere Wörter — über der Schwelle (4), die der Bild-Nachfüller
`cj_bild_backfill.mjs` seit 13.08. gegen genau solche Bilder hat. Das Produkt steht im Nachfüller-Ledger als «+4».

GEMESSEN, BEVOR GEBAUT WURDE: Das Bild ist NICHT vom Nachfüller angehängt worden. Sein `?v=1783806347` ist der
11.07.2026 — es war das Hauptbild des Juli-Imports (cj_sku_import ohne OCR-Wache); die vier Nachfüller-Bilder
(77305892…) tragen `?v=1790187855` = 23.09. 18:24 UTC, und eines davon steht seither vorne. Die OCR-Wache des
Nachfüllers prüft nur, was ER anhängt; das alte Bild rutschte unbesehen auf Position 2. Das ältere Werkzeug
`bildtext_entfernen.py` (13.08.) prüft ebenfalls nur «die letzten N Medien» und liesse dieses Bild stehen.
→ Die Lücke ist keine undichte Wache, sondern eine NIE gestellte Frage: Was steht an Position 2 bis n?

WARUM ES ZÄHLT: Google verbietet Werbetext im Produktbild (Ablehnungsgrund für Anzeigen, Qualitätsabzug in den
Gratis-Einträgen — dem einzigen Kanal mit belegten Verkäufen). Englischer Lieferantentext in einem Schweizer Shop
sagt der Kundin, woher die Ware kommt.

REGEL: Je «+N»-Produkt des Nachfüller-Ledgers alle Medien lesen; geprüft werden NUR Bilder ab Position 2, die nicht
`featuredMedia` sind (das Hauptbild bleibt unter allen Umständen stehen — es gehört in einen Lauf mit Ersatzquelle,
nicht hierhin). Videos/3D werden übersprungen. Messgerät = `bildtext_pruefen.woerter()` — dasselbe, das der
Nachfüller per `--url` ruft, hier importiert, damit die gelesenen WÖRTER im Bericht stehen (nur eine Zahl liesse sich
nicht auf Fehlalarm prüfen). Treffer = ≥ WORTGRENZE (4) sichere Wörter; −1 = nicht lesbar = KEIN Urteil (steht im
Ledger als −1, damit ein zweiter Lauf es noch einmal versucht — «keine Antwort» ist nicht «sauber», Lehre vom 13.08.).

LEDGER (Zeile anhängen, Datei schliessen — kein offener Stream, der Container stirbt stündlich):
  dropship/_bild_werbetext_geprueft.txt   produkt_id  media_id  woerter  url  ISO-Datum  [text: erste 8 Wörter]
  dropship/_bild_werbetext_entfernt.txt   produkt_id  media_id  url  ISO-Datum   (URL bleibt — Rückholung möglich)
Bericht dropship/BILD-WERBETEXT.md + Kontaktbogen dropship/bild_werbetext_kontaktbogen.jpg (max. 24 Treffer, aus dem
Ledger gebaut — überlebt einen Neustart). Ohne SCHARF=1 wird NUR gemessen.

AUFRUF:
  python3 automation/bild_werbetext_rueckholer.py                       DRY über alle «+N»-Produkte
  NUR_PRODUKT=<id> python3 …                                            nur dieses Produkt (auch ohne Ledger-Eintrag)
  SCHARF=1 NUR_MEDIA=<media_id> [NUR_PRODUKT=<id>] python3 …            genau dieses Medium löschen (Rücklesen Pflicht)
  SCHARF=1 python3 …                                                    alle Treffer löschen (erst nach Sichtprüfung!)
  NUR_BERICHT=1 python3 …                                               Bericht + Kontaktbogen aus dem Ledger neu bauen
Umgebung: TAKT (Sekunden je OCR, Standard 1.0), CAP (Produkte je Lauf, Standard 0 = alle), WORTGRENZE (4).
Sperre /tmp/bild_werbetext_rueckholer.lock — ein zweiter Lauf beendet sich sofort.
"""
import datetime, fcntl, io, json, os, subprocess, sys, time
# Tesseract startet je Aufruf eigene OpenMP-Threads — bei parallelen Wächtern trieb das die Last auf 16 (23.09.).
os.environ.setdefault("OMP_THREAD_LIMIT", "1")
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import google_titel_reparatur as G                       # G.gql: Token, Retry, Drossel, Eimer-Etikette
try:
    from bildtext_pruefen import woerter, WORTGRENZE     # beendet sich mit Meldung, wenn Tesseract fehlt
except SystemExit:
    print("bild_werbetext_rueckholer: OCR fehlt im Container — nichts geprüft, nichts geändert.", flush=True)
    sys.exit(0)
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(HIER)
QUELLE = os.path.join(ROOT, "dropship", "_cj_bild_backfill.txt")
GEPRUEFT = os.path.join(ROOT, "dropship", "_bild_werbetext_geprueft.txt")
ENTFERNT = os.path.join(ROOT, "dropship", "_bild_werbetext_entfernt.txt")
BERICHT = os.path.join(ROOT, "dropship", "BILD-WERBETEXT.md")
BOGEN = os.path.join(ROOT, "dropship", "bild_werbetext_kontaktbogen.jpg")
SPERRE = "/tmp/bild_werbetext_rueckholer.lock"
SCHARF = os.environ.get("SCHARF") == "1"
NUR_BERICHT = os.environ.get("NUR_BERICHT") == "1"
TAKT = float(os.environ.get("TAKT", "1.0"))
CAP = int(os.environ.get("CAP", "0"))
PID = "gid://shopify/Product/"
MID = "gid://shopify/MediaImage/"


def gid(prefix, x):
    x = (x or "").strip()
    return x if x.startswith("gid://") else (prefix + x if x else "")


NUR_PRODUKT = gid(PID, os.environ.get("NUR_PRODUKT", ""))
NUR_MEDIA = {gid(MID, x) for x in os.environ.get("NUR_MEDIA", "").split(",") if x.strip()}


def jetzt():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def anhaengen(pfad, *felder):
    """Eine Zeile anhängen und die Datei sofort schliessen (appendFileSync-Prinzip)."""
    with open(pfad, "a", encoding="utf-8") as f:
        f.write("\t".join(str(x).replace("\t", " ").replace("\n", " ") for x in felder) + "\n")


def ledger_lesen(pfad):
    if not os.path.exists(pfad):
        return []
    return [l.rstrip("\n").split("\t") for l in open(pfad, encoding="utf-8") if l.strip()]


def laden(url):
    """Bildbytes über den Proxy holen; b'' wenn nichts kam."""
    r = subprocess.run(["curl", "-sL", "--max-time", "30", url], capture_output=True)
    return r.stdout or b""


def ocr(raw):
    """Wortliste; None = nicht lesbar."""
    try:
        return woerter(raw)
    except Exception:
        return None


def kandidaten():
    """«+N»-Produkte aus dem Nachfüller-Ledger, in Ledger-Reihenfolge, ohne Doppelte."""
    gesehen, raus = set(), []
    for zeile in open(QUELLE, encoding="utf-8"):
        t = zeile.rstrip("\n").split("\t")
        if len(t) < 2 or not t[1].startswith("+") or t[0] in gesehen:
            continue
        gesehen.add(t[0]); raus.append(t[0])
    return raus


def medien(pid):
    d = G.gql('query($id:ID!){product(id:$id){id title status featuredMedia{id} '
              'media(first:20){nodes{id mediaContentType ... on MediaImage{image{url}}}}}}', {"id": pid})
    return (d.get("data") or {}).get("product")


def loeschen(pid, mids):
    d = G.gql('mutation($id:ID!,$m:[ID!]!){productDeleteMedia(productId:$id,mediaIds:$m)'
              '{deletedMediaIds mediaUserErrors{field message}}}', {"id": pid, "m": mids})
    r = ((d.get("data") or {}).get("productDeleteMedia") or {})
    return r.get("deletedMediaIds") or [], r.get("mediaUserErrors") or []


def schrift(gr):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, gr)
    return ImageFont.load_default()


def bericht(titel_von):
    """Bericht + Kontaktbogen aus den Ledgern — nicht aus dem Speicher, damit ein Neustart nichts verliert."""
    g = ledger_lesen(GEPRUEFT)
    e = ledger_lesen(ENTFERNT)
    entfernt_ids = {z[1] for z in e if len(z) > 1}
    # Je Medium zählt die letzte Zeile (ein −1 kann später gelesen worden sein).
    letzte = {}
    for z in g:
        if len(z) >= 5:
            letzte[z[1]] = z
    zeilen = list(letzte.values())
    treffer = [z for z in zeilen if z[2].lstrip("-").isdigit() and int(z[2]) >= WORTGRENZE]
    unlesbar = [z for z in zeilen if z[2] == "-1"]
    produkte = {z[0] for z in zeilen}
    treffer_produkte = {z[0] for z in treffer}
    heute = jetzt()
    L = [f"# Bild-Werbetext in Nicht-Hauptbildern — Stand {heute}", "",
         f"Quelle: «+N»-Produkte aus `dropship/_cj_bild_backfill.txt` ({len(kandidaten())} Produkte). "
         f"Geprüft werden nur Bilder ab Position 2, nie das Hauptbild. Messgerät `bildtext_pruefen.woerter()`, "
         f"Schwelle ≥ {WORTGRENZE} sichere Wörter (Tesseract, Konfidenz ≥ 60, mind. 3 Buchstaben).", "",
         f"- Medien geprüft: **{len(zeilen)}** in {len(produkte)} Produkten",
         f"- Treffer (≥ {WORTGRENZE} Wörter): **{len(treffer)}** in {len(treffer_produkte)} Produkten",
         f"- nicht lesbar (−1, wird beim nächsten Lauf erneut versucht): {len(unlesbar)}",
         f"- entfernt (`_bild_werbetext_entfernt.txt`): **{len(e)}**", "",
         "## Treffer", "",
         "| Produkt | Medium | Wörter | Gelesen | Stand |", "|---|---|---|---|---|"]
    treffer.sort(key=lambda z: -int(z[2]))
    for z in treffer:
        pid, mid, n, url = z[0], z[1], z[2], z[3]
        text = z[5] if len(z) > 5 else ""
        t = titel_von.get(pid, "")
        stand = "ENTFERNT" if mid in entfernt_ids else "offen"
        L.append(f"| {t[:48] or pid.rsplit('/', 1)[-1]} `{pid.rsplit('/', 1)[-1]}` | [{mid.rsplit('/', 1)[-1]}]({url.split('?')[0]}) "
                 f"| {n} | {text[:70]} | {stand} |")
    if not treffer:
        L.append("| — | — | — | — | — |")
    L += ["", f"Kontaktbogen der ersten 24 Treffer: `dropship/bild_werbetext_kontaktbogen.jpg`", ""]
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    # Kontaktbogen: 6 Spalten, Kachel 300 px, Beschriftung darunter.
    zeigen = [z for z in treffer if z[1] not in entfernt_ids][:24] or treffer[:24]
    if zeigen:
        KW, KH, LAB, SP = 300, 300, 54, 6
        bogen = Image.new("RGB", (SP + 6 * (KW + SP), SP + ((len(zeigen) + 5) // 6) * (KH + LAB + SP)), (236, 234, 230))
        d = ImageDraw.Draw(bogen); f1 = schrift(13); f2 = schrift(11)
        for i, z in enumerate(zeigen):
            x = SP + (i % 6) * (KW + SP); y = SP + (i // 6) * (KH + LAB + SP)
            raw = laden(z[3])
            try:
                im = Image.open(io.BytesIO(raw)).convert("RGB"); im.thumbnail((KW, KH))
                bogen.paste(im, (x + (KW - im.width) // 2, y + (KH - im.height) // 2))
            except Exception:
                d.rectangle((x, y, x + KW, y + KH), outline=(180, 60, 60))
            t = titel_von.get(z[0], z[0].rsplit("/", 1)[-1])
            d.text((x, y + KH + 4), f"{z[2]} W · {t[:36]}", font=f1, fill=(30, 30, 30))
            d.text((x, y + KH + 22), (z[5] if len(z) > 5 else "")[:44], font=f2, fill=(90, 90, 90))
            d.text((x, y + KH + 37), z[1].rsplit("/", 1)[-1], font=f2, fill=(120, 120, 120))
        bogen.save(BOGEN, quality=88)
    return len(zeilen), len(treffer), len(unlesbar), len(e)


def main():
    sperre = open(SPERRE, "w")
    try:
        fcntl.flock(sperre, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("läuft schon (Sperre) — Ende", flush=True); return
    titel_von = {}
    if NUR_BERICHT:
        for z in ledger_lesen(GEPRUEFT):
            if z[0] not in titel_von:
                p = medien(z[0]); titel_von[z[0]] = (p or {}).get("title", "")
        print("Bericht: geprüft %d · Treffer %d · unlesbar %d · entfernt %d" % bericht(titel_von), flush=True); return

    geprueft = {z[1]: z for z in ledger_lesen(GEPRUEFT) if len(z) >= 5}
    schon_entfernt = {z[1] for z in ledger_lesen(ENTFERNT) if len(z) > 1}
    liste = [NUR_PRODUKT] if NUR_PRODUKT else kandidaten()
    if NUR_MEDIA and not NUR_PRODUKT:
        # Produkt zum Medium aus dem Prüf-Ledger — sonst muss NUR_PRODUKT gesetzt sein.
        liste = sorted({z[0] for z in geprueft.values() if z[1] in NUR_MEDIA})
        if not liste:
            raise SystemExit("NUR_MEDIA ohne Ledger-Eintrag — NUR_PRODUKT=<id> dazu angeben")
    modus = "SCHARF" if SCHARF else "DRY"
    print(f"{jetzt()} {modus} · {len(liste)} Produkte · Schwelle {WORTGRENZE} · Takt {TAKT}s"
          + (f" · NUR_MEDIA {','.join(sorted(NUR_MEDIA))}" if NUR_MEDIA else ""), flush=True)
    z = {"produkte": 0, "medien": 0, "neu": 0, "treffer": 0, "unlesbar": 0, "entfernt": 0, "fehler": 0}
    for n, pid in enumerate(liste, 1):
        if CAP and z["produkte"] >= CAP:
            print(f"CAP {CAP} erreicht", flush=True); break
        p = medien(pid)
        if not p:
            print(f"   {pid}: kein Produkt (gelöscht?)", flush=True); continue
        z["produkte"] += 1
        titel_von[pid] = p.get("title") or ""
        feat = ((p.get("featuredMedia") or {}).get("id"))
        nodes = p["media"]["nodes"]
        raus = []
        for pos, m in enumerate(nodes, 1):
            if pos == 1 or m["id"] == feat:
                continue                                   # Hauptbild: nie
            if m.get("mediaContentType") != "IMAGE" or not (m.get("image") or {}).get("url"):
                continue                                   # Video/3D/fehlgeschlagen: nie
            if NUR_MEDIA and m["id"] not in NUR_MEDIA:
                continue
            if m["id"] in schon_entfernt:
                continue
            url = m["image"]["url"]
            alt = geprueft.get(m["id"])
            if alt and alt[2] != "-1":
                w = int(alt[2]); text = alt[5] if len(alt) > 5 else ""
            else:
                raw = laden(url)
                ws = ocr(raw) if raw else None
                z["neu"] += 1
                if ws is None:
                    w, text = -1, ""
                    z["unlesbar"] += 1
                else:
                    w, text = len(ws), " ".join(ws[:8])
                anhaengen(GEPRUEFT, pid, m["id"], w, url, jetzt(), text)
                geprueft[m["id"]] = [pid, m["id"], str(w), url, "", text]
                time.sleep(TAKT)
            z["medien"] += 1
            if w >= WORTGRENZE:
                z["treffer"] += 1
                raus.append((m["id"], pos, w, text, url))
        if raus:
            print(f"   [{n}/{len(liste)}] {titel_von[pid][:44]:<46} {len(raus)} Treffer: "
                  + "; ".join(f"Pos{pos} {w}W «{t[:40]}»" for _, pos, w, t, _ in raus), flush=True)
        if raus and SCHARF:
            mids = [r[0] for r in raus]
            ok, fehler = loeschen(pid, mids)
            if fehler:
                z["fehler"] += 1
                print(f"   ⚠️ {pid}: {fehler[0].get('message', '')[:100]}", flush=True)
            # Rücklesen — die Wahrheit ist die Medienliste danach, nicht die Antwort der Mutation.
            p2 = medien(pid) or {}
            danach = {m["id"] for m in (p2.get("media") or {}).get("nodes", [])}
            feat2 = ((p2.get("featuredMedia") or {}).get("id"))
            for mid, pos, w, t, url in raus:
                if mid not in danach:
                    anhaengen(ENTFERNT, pid, mid, url, jetzt())
                    schon_entfernt.add(mid); z["entfernt"] += 1
                    print(f"   ✅ entfernt {mid.rsplit('/', 1)[-1]} (Pos {pos}, {w} W) · Produkt hat noch "
                          f"{len(danach)} Medien, Hauptbild {'unverändert' if feat2 == feat else 'GEÄNDERT ' + str(feat2)}",
                          flush=True)
                else:
                    z["fehler"] += 1
                    print(f"   ⛔ {mid.rsplit('/', 1)[-1]} steht nach der Mutation NOCH — nicht quittiert", flush=True)
        if n % 25 == 0 or n == len(liste):
            bericht(titel_von)
            print(f"{jetzt()} Zwischenstand {n}/{len(liste)}: Medien {z['medien']} (neu gelesen {z['neu']}) · "
                  f"Treffer {z['treffer']} · unlesbar {z['unlesbar']} · entfernt {z['entfernt']}", flush=True)
    g, t, u, e = bericht(titel_von)
    print(f"{jetzt()} FERTIG {modus}: {z['produkte']} Produkte, {z['medien']} Medien geprüft ({z['neu']} neu gelesen), "
          f"{z['treffer']} Treffer, {z['unlesbar']} unlesbar, {z['entfernt']} entfernt, {z['fehler']} Fehler · "
          f"Ledger gesamt: {g} geprüft / {t} Treffer / {u} unlesbar / {e} entfernt · {G.bilanz()}", flush=True)


if __name__ == "__main__":
    main()
