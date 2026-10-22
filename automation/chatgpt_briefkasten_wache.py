#!/usr/bin/env python3
"""chatgpt_briefkasten_wache.py — Briefkasten ChatGPT → Claude beobachten (19.10.2026, aus dem Prototyp des Spähtrupps wf_62fc1cba). Nur lesend.

Zeile fuer die Keepalive-Meldung:  CHATGPT-BRIEFKASTEN: ...
Eingaben : dropship/CHATGPT-AUFTRAEGE.md (Auftragstabelle), Metricool-Planer (REST, ueber metricool_planer_wache.holen),
           dropship/_vorlauf_plan.json (eigene Eintraege ausschliessen), dropship/_posted_produkte.txt (Reservierung),
           optional dropship/_chatgpt_geprueft.json ({id: stand}) = von Claude nach Pruefung freigegebene Eintraege.
Modi     : (ohne) eine Zeile · --liste Befunde · --selbsttest
Hinweis  : Gmail ist aus dem Container NICHT lesbar (nur Konnektor in der Sitzung) -> Zeile sagt das ehrlich;
           die Sitzung schreibt nach jeder Mail-Sichtung  dropship/_chatgpt_post_stand.txt  ("ISO-UTC<TAB>n_neue_Mails").
"""
import json, os, re, sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get("LUXE_REPO", os.path.dirname(HIER))
sys.path.insert(0, os.path.join(REPO, "automation"))
TZ = ZoneInfo("Europe/Zurich")
UTC = timezone.utc
AUFTRAEGE = os.path.join(REPO, "dropship", "CHATGPT-AUFTRAEGE.md")
PLAN = os.path.join(REPO, "dropship", "_vorlauf_plan.json")
GEPRUEFT = os.path.join(REPO, "dropship", "_chatgpt_geprueft.json")
POST_STAND = os.path.join(REPO, "dropship", "_chatgpt_post_stand.txt")
PAUSE = os.path.join(REPO, "dropship", "_chatgpt_pause_bis.txt")


def pausiert(jetzt, pfad=PAUSE):
    """22.10.2026 (Betreiber: «er hat keine Nutzungsdaten mehr, noch 5 Tage»): ChatGPT ist bis zu einem Datum nicht erreichbar.
    Datei dropship/_chatgpt_pause_bis.txt, erste Zeile «JJJJ-MM-TT [Grund]». -> (Datum, Grund) solange jetzt (Zuerich) vor dem Tag
    LIEGT, sonst None. Ein kaputtes oder fehlendes Format pausiert NIE (still schweigen waere schlimmer als warnen). Die Pause
    laeuft von selbst ab; die Zeile bleibt sichtbar (kein Schweigen), nur ohne ⚠️."""
    try:
        erste = open(pfad, encoding="utf-8").read().strip().splitlines()[0]
        tag, _, grund = erste.partition(" ")
        bis = datetime.strptime(tag, "%Y-%m-%d").replace(tzinfo=TZ)
    except (OSError, ValueError, IndexError):
        return None
    return (bis, grund.strip() or "ChatGPT nicht erreichbar") if jetzt < bis else None

EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿⬀-⯿️]")
PREIS = re.compile(r"(?i)\b(chf|fr\.|eur|€|\$)\s*\d|\d+[.,]\d{2}\s*(chf|fr\.|€)|\bab\s+\d+\s*(chf|fr)|gratis\s*versand|lieferzeit|\b\d+\s*(werk)?tage?\b")
HEILWORT = re.compile(r"(?i)\b(heilt|lindert|therapie|schmerzfrei|wasserdicht|echtleder|echtes leder|garantiert)\b")
TAGS_VERBOTEN = {"#fyp", "#foryou", "#foryoupage", "#viral"}
NETZ_NAME = {"fb": "facebook", "facebook": "facebook", "ig": "instagram", "instagram": "instagram", "tiktok": "tiktok"}


# ───────────── Auftrag lesen ─────────────
def auftrag_lesen(pfad=AUFTRAEGE):
    """-> (stand_utc|None, [ {auftrag, status, nr, handle, titel, termin(aware Zuerich), netze[set]} ]). Rechnet NIE still: Format kaputt -> ([], Fehlertext)."""
    txt = open(pfad, encoding="utf-8").read()
    m = re.search(r"Stand\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})", txt)
    stand = datetime(int(m[3]), int(m[2]), int(m[1]), int(m[4]), int(m[5]), tzinfo=TZ).astimezone(UTC) if m else None
    zeilen, auftrag, status = [], None, None
    for z in txt.splitlines():
        h = re.match(r"##\s+Auftrag\s+(\d+)\s+·\s+Status\s+(OFFEN|ERLEDIGT)", z)
        if h:
            auftrag, status = int(h[1]), h[2]
            continue
        t = re.match(r"\|\s*(\d+\.\d+)\s*\|\s*([a-z0-9][a-z0-9\-]+)\s*\|\s*([^|]+?)\s*\|\s*(?:[A-Za-z]{2}\s+)?(\d{1,2})\.(\d{1,2})\.\s*(\d{1,2}):(\d{2})\s*\|\s*([^|]+?)\s*\|", z)
        if t and auftrag:
            jahr = (stand or datetime.now(UTC)).astimezone(TZ).year
            netze = set()
            for w in re.split(r"[,\s]+", t[8].lower().replace("-reel", "")):
                if w in NETZ_NAME:
                    netze.add(NETZ_NAME[w])
            if "tiktok" in t[8].lower():
                netze.add("tiktok")
            zeilen.append({"auftrag": auftrag, "status": status, "nr": t[1], "handle": t[2], "titel": t[3],
                           "termin": datetime(jahr, int(t[5]), int(t[4]), int(t[6]), int(t[7]), tzinfo=TZ),
                           "netze": netze or {"facebook", "instagram", "tiktok"}})
    return stand, zeilen


# ───────────── Herkunft ─────────────
def eigene_ids(plan_pfad=PLAN):
    try:
        return {i for s in json.load(open(plan_pfad)).get("slots", {}).values() for i in s.get("mc_ids", [])}
    except (OSError, ValueError):
        return None   # unklar, nie "keine eigenen"


def chatgpt_herkunft(p, eigene):
    """Fremd (nicht im Vorlauf-Plan) UND Merkmal: UTM organic_social | Entwurf | Termin >12 h nach Anlage bei einem Text ohne «..»-Produktname/CHF."""
    if eigene is None or p.get("id") in eigene:
        return False
    t = p.get("text") or ""
    if "utm_medium=organic_social" in t or p.get("draft"):
        return True
    return False


# ───────────── Regeln (Auftrag 1) ─────────────
def bloecke(text):
    return [b.strip() for b in re.split(r"\n\s*\n", (text or "").strip()) if b.strip()]


def text_befunde(text, netz, handle):
    b, f = bloecke(text), []
    if len(b) < 3:
        return ["AUFBAU: weniger als 3 Absaetze (Hook · Nutzen · CTA · Hashtags)"]
    hook, tags = b[0], [w for w in re.findall(r"#\w+", b[-1])] if b[-1].lstrip().startswith("#") else []
    cta = " ".join(b[1:-1]) if tags else " ".join(b[1:])
    if len(hook) > 45:
        f.append(f"HOOK {len(hook)} > 45 Zeichen")
    if EMOJI.search(hook):
        f.append("HOOK mit Emoji")
    if PREIS.search(text):
        f.append("PREIS/Versand/Lieferzeit im Text")
    if HEILWORT.search(re.sub(r"https?://\S+|luxestyle\.ch/\S+", "", text)):
        f.append("Heil-/Beleg-Wort ohne Beleg")
    if not tags or tags[0].lower() != "#luxestyle":
        f.append("HASHTAGS: #LuxeStyle nicht zuerst")
    if len(tags) > 5:
        f.append(f"HASHTAGS {len(tags)} > 5")
    if TAGS_VERBOTEN & {x.lower() for x in tags}:
        f.append("HASHTAGS: #fyp/#foryou/#viral")
    if netz == "instagram" and ("Link im Profil" not in cta or "http" in text):
        f.append("CTA instagram: «Link im Profil» fehlt oder URL im Text")
    if netz == "facebook" and (f"luxestyle.ch/products/{handle}" not in text or "http" in text or "utm" in text):
        f.append("CTA facebook: Adresse ohne https:// und ohne UTM fehlt")
    if netz == "tiktok" and ("luxestyle.ch" not in cta or "Link im Profil" in text or "http" in text):
        f.append("CTA tiktok: «findest du auf luxestyle.ch» fehlt, «Link im Profil»/URL im Text")
    return f


def feld_befunde(p, netz):
    f, alt = [], [a for a in (p.get("mediaAltText") or []) if a]
    if not alt:
        f.append("mediaAltText fehlt")
    elif not all(80 <= len(a) <= 250 for a in alt):
        f.append("mediaAltText nicht 80-250 Zeichen: " + ",".join(str(len(a)) for a in alt))
    if not p.get("videoThumbnailUrl"):
        f.append("videoThumbnailUrl (Titelkarte) fehlt")
    ki_alt = any(re.search(r"\bKI\b|KI-Stimme", a) for a in alt)
    if netz == "facebook":
        fd = p.get("facebookData") or {}
        if fd.get("type") != "REEL" or not fd.get("title"):
            f.append("facebookData: type REEL + title Pflicht")
    if netz == "instagram":
        d = p.get("instagramData") or {}
        if d.get("type") != "REEL" or not d.get("showReelOnFeed"):
            f.append("instagramData: type REEL + showReelOnFeed Pflicht")
        if ki_alt and not d.get("isAiGenerated"):
            f.append("KI-Stimme im Alt-Text, aber isAiGenerated=false")
    if netz == "tiktok":
        d = p.get("tiktokData") or {}
        if not d.get("title") or not d.get("commercialContentOwnBrand"):
            f.append("tiktokData: title + commercialContentOwnBrand Pflicht")
        if ki_alt and not d.get("isAigc"):
            f.append("KI-Stimme im Alt-Text, aber isAigc=false")
    return f


def eintrag_befunde(p, handle):
    """Befunde je Netz des Eintrags. Kombi-Eintrag (mehrere Netze, ein Text) ist selbst ein Befund: Auftrag verlangt EIN Eintrag je Netz."""
    nets = [x.get("network") for x in p.get("providers", [])]
    out = {}
    if len(nets) > 1:
        out["*"] = [f"KOMBI_TEXT: ein Text fuer {','.join(nets)} (Auftrag: ein Eintrag je Netz)"]
    for n in nets:
        if n in ("facebook", "instagram", "tiktok"):
            out.setdefault(n, []).extend(text_befunde(p.get("text"), n, handle) + feld_befunde(p, n))
    return out


# ───────────── Zuordnung + Zustand ─────────────
def zuordnen(zeile, planer, eigene):
    """Planer-Eintraege, die zu Auftragszeile+Netz passen: Termin +-20 min, Netz enthalten, fremd."""
    gef = {}
    for p in planer:
        if eigene is None or p.get("id") in eigene:   # Zuordnung per Auftrags-SLOT (Auftrag-1-Regeln verbieten UTM -> kein Fingerabdruck mehr)
            continue
        try:
            t = datetime.fromisoformat(p["publicationDate"]["dateTime"]).replace(tzinfo=TZ)
        except (KeyError, ValueError):
            continue
        if abs((t - zeile["termin"]).total_seconds()) > 20 * 60:
            continue
        for x in p.get("providers", []):
            if x.get("network") in zeile["netze"]:
                gef.setdefault(x["network"], []).append(p)
    return gef


def pruefen(jetzt, planer, stand, zeilen, geprueft=None, eigene=None):
    """-> dict mit 'zeilen' (je Auftragszeile+Netz Zustand) und Summenzaehlern. Zustaende:
    FEHLT · ENTWURF_MAENGEL · ENTWURF_OK · LIVE_UNGEPRUEFT · LIVE_MAENGEL · LIVE_OK · ABGELAUFEN"""
    geprueft = geprueft or {}
    res, z = [], {}
    for zl in zeilen:
        if zl["status"] != "OFFEN":
            continue
        gef = zuordnen(zl, planer, eigene)
        for n in sorted(zl["netze"]):
            ps = gef.get(n, [])
            h_in = (zl["termin"] - jetzt).total_seconds() / 3600
            if not ps:
                zust = "ABGELAUFEN" if h_in < 0 else "FEHLT"
                res.append({"nr": zl["nr"], "netz": n, "zustand": zust, "bis_termin_h": round(h_in, 1), "mangel": []})
                continue
            p = ps[0]
            m = eintrag_befunde(p, zl["handle"]).get(n, []) + eintrag_befunde(p, zl["handle"]).get("*", [])
            if len(ps) > 1:
                m.append(f"{len(ps)} Eintraege fuer dasselbe Netz+Termin")
            live = (not p.get("draft")) and p.get("autoPublish", True)
            frei = str(p.get("id")) in geprueft
            if live and not frei:
                zust = "LIVE_UNGEPRUEFT" if not m else "LIVE_MAENGEL"
            elif live:
                zust = "LIVE_OK" if not m else "LIVE_MAENGEL"
            else:
                zust = "ENTWURF_OK" if not m else "ENTWURF_MAENGEL"
            res.append({"nr": zl["nr"], "netz": n, "zustand": zust, "bis_termin_h": round(h_in, 1), "mangel": m, "id": p.get("id")})
    for r in res:
        z[r["zustand"]] = z.get(r["zustand"], 0) + 1
    return {"zeilen": res, "summe": z}


def zeile(erg, stand, jetzt, mail_stand=None):
    s, n = erg["summe"], len(erg["zeilen"])
    if n == 0:
        return "CHATGPT-BRIEFKASTEN: kein OFFENER Auftrag"
    alter_h = (jetzt - stand).total_seconds() / 3600 if stand else None
    teile, warn = [], False
    fehlt = [r for r in erg["zeilen"] if r["zustand"] == "FEHLT"]
    if fehlt:
        naechst = min(r["bis_termin_h"] for r in fehlt)
        teile.append(f"{len(fehlt)}/{n} Eintraege fehlen, naechster Termin in {naechst:.0f} h")
        warn = warn or naechst < 36 or (alter_h or 0) > 48
    for k, txt in (("ABGELAUFEN", "Termin ohne Eintrag verstrichen"), ("LIVE_MAENGEL", "LIVE mit Regelverstoss"),
                   ("LIVE_UNGEPRUEFT", "LIVE ohne Claude-Pruefung (ChatGPT hat selbst freigegeben?)"), ("ENTWURF_MAENGEL", "Entwuerfe mit Maengeln")):
        if s.get(k):
            teile.append(f"{s[k]} {txt}")
            warn = warn or k in ("ABGELAUFEN", "LIVE_MAENGEL", "LIVE_UNGEPRUEFT") or (k == "ENTWURF_MAENGEL" and False)
    if s.get("ENTWURF_OK"):
        teile.append(f"{s['ENTWURF_OK']} Entwuerfe pruefbereit/ok -> freigeben")
        warn = True   # wartet auf Claude: Entwurf nie sendet
    if s.get("LIVE_OK"):
        teile.append(f"{s['LIVE_OK']} geprueft+freigegeben")
    kopf = f"offen seit {alter_h:.0f} h" if alter_h is not None else "Alter unbekannt"
    mail = "Mail: " + (mail_stand or "nur in der Sitzung pruefbar (Konnektor)")
    return f"{'⚠️ ' if warn else ''}CHATGPT-BRIEFKASTEN: {kopf} · " + (" · ".join(teile) or "alles geliefert") + f" · {mail}"


# ───────────── Selbsttest ─────────────
def selbsttest():
    jetzt = datetime(2026, 10, 19, 8, 0, tzinfo=TZ)
    L = "luxestyle.ch/products/katze-1"
    gut_ig = f"Endlich Ruhe bei Katzen?\n\nSpielt allein mit Fernbedienung.\n\nEntdecke Katze bei LuxeStyle. Produktdetails über den Link im Profil.\n\n#LuxeStyle #Katzen #Haustier"
    gut_fb = f"Endlich Ruhe bei Katzen?\n\nSpielt allein.\n\nKatze bei LuxeStyle: {L}\n\n#LuxeStyle #Katzen #Haustier"
    gut_tt = "Endlich Ruhe bei Katzen?\n\nSpielt allein.\n\nKatze findest du auf luxestyle.ch\n\n#LuxeStyle #Katzen #Haustier"
    alt = ["Eine graue Katze jagt einen kleinen Ball, der von einer Fernbedienung gesteuert wird; Untertitel und Markenzeichen sind sichtbar."]
    def post(i, text, netz, draft=True, **kw):
        base = {"id": i, "text": text, "draft": draft, "autoPublish": not draft, "mediaAltText": alt, "videoThumbnailUrl": "https://x/t.jpg",
                "publicationDate": {"dateTime": "2026-10-21T18:30:00"}, "providers": [{"network": netz, "status": "PENDING"}],
                "facebookData": {"type": "REEL", "title": "Katze: Spiel | LuxeStyle"}, "instagramData": {"type": "REEL", "showReelOnFeed": True},
                "tiktokData": {"title": "Endlich Ruhe bei Katzen?", "commercialContentOwnBrand": True}}
        base.update(kw)
        return base
    zl = [{"auftrag": 1, "status": "OFFEN", "nr": "1.1", "handle": "katze-1", "titel": "Katze", "termin": datetime(2026, 10, 21, 18, 30, tzinfo=TZ),
           "netze": {"facebook", "instagram", "tiktok"}}]
    fehler = []
    def erwarte(name, planer, soll):
        e = pruefen(jetzt, planer, jetzt - timedelta(hours=9), zl, eigene=set())
        ist = {(r["netz"], r["zustand"]) for r in e["zeilen"]}
        if ist != soll:
            fehler.append(f"{name}: erwartet {sorted(soll)} gemessen {sorted(ist)}")
    erwarte("nichts geliefert", [], {("facebook", "FEHLT"), ("instagram", "FEHLT"), ("tiktok", "FEHLT")})
    erwarte("alles ok als Entwurf", [post(1, gut_fb, "facebook"), post(2, gut_ig, "instagram"), post(3, gut_tt, "tiktok")],
            {("facebook", "ENTWURF_OK"), ("instagram", "ENTWURF_OK"), ("tiktok", "ENTWURF_OK")})
    erwarte("Hook zu lang + Preis", [post(1, gut_fb.replace("Endlich Ruhe bei Katzen?", "Endlich Ruhe bei Katzen und Hunden im ganzen Haus?"), "facebook"),
                                     post(2, gut_ig.replace("Spielt allein", "Spielt allein für CHF 19.90"), "instagram")],
            {("facebook", "ENTWURF_MAENGEL"), ("instagram", "ENTWURF_MAENGEL"), ("tiktok", "FEHLT")})
    erwarte("Kombi-Eintrag = Mangel", [post(1, gut_fb, "facebook", providers=[{"network": "facebook"}, {"network": "instagram"}, {"network": "tiktok"}])],
            {("facebook", "ENTWURF_MAENGEL"), ("instagram", "ENTWURF_MAENGEL"), ("tiktok", "ENTWURF_MAENGEL")})
    erwarte("selbst freigegeben (live, ungeprueft)", [post(1, gut_ig, "instagram", draft=False, **{"autoPublish": True})],
            {("facebook", "FEHLT"), ("instagram", "LIVE_UNGEPRUEFT"), ("tiktok", "FEHLT")})
    # Herkunft: Vorlauf-Eintrag wird nie zugeordnet
    e = pruefen(jetzt, [post(7, gut_ig + "\nutm_medium=organic_social", "instagram")], jetzt, zl, eigene={7})
    if any(r["zustand"] != "FEHLT" for r in e["zeilen"]):
        fehler.append("Vorlauf-Eintrag wurde als ChatGPT gewertet")
    # KI-Widerspruch + Alt-Text zu kurz + TikTok-CTA falsch
    kurz = post(1, gut_tt.replace("findest du auf luxestyle.ch", "Link im Profil"), "tiktok", mediaAltText=["zu kurz"])
    m = eintrag_befunde(kurz, "katze-1")["tiktok"]
    if not (any("mediaAltText nicht" in x for x in m) and any("CTA tiktok" in x for x in m)):
        fehler.append(f"Alt/CTA nicht erkannt: {m}")
    ki = post(1, gut_ig, "instagram", mediaAltText=[alt[0] + " Sprecher: KI-Stimme, deutsche Untertitel und ein Markenzeichen im Bild."])
    if not any("isAiGenerated" in x for x in eintrag_befunde(ki, "katze-1")["instagram"]):
        fehler.append("KI-Widerspruch nicht erkannt")
    # Auftrag lesen: Format kaputt darf nie 'ok' ergeben
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write("Stand 18.10.2026 23:45 Zuercher Zeit\n## Auftrag 1 · Status OFFEN · x\n| Nr | P |\n| 1.1 | katze-1 | Katze | Mi 21.10. 18:30 | Facebook-Reel, Instagram-Reel, TikTok |\n")
    st, zz = auftrag_lesen(f.name)
    os.unlink(f.name)   # 19.10.: Tempdatei nicht liegen lassen (/tmp-Leichen-Klasse)
    if not (st and len(zz) == 1 and zz[0]["netze"] == {"facebook", "instagram", "tiktok"} and zz[0]["termin"].hour == 18):
        fehler.append(f"Auftragstabelle nicht gelesen: {zz}")
    # Pause: Datum in der Zukunft pausiert, Vergangenheit/kaputt/fehlend nie
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("2026-10-27 Nutzungsgrenze bis Montag\n")
    pz = pausiert(datetime(2026, 10, 22, 10, 0, tzinfo=TZ), f.name)
    if not (pz and pz[0].day == 27 and pz[1] == "Nutzungsgrenze bis Montag"):
        fehler.append(f"Pause nicht erkannt: {pz}")
    if pausiert(datetime(2026, 10, 27, 0, 0, tzinfo=TZ), f.name) is not None:
        fehler.append("Pause endet nicht am Stichtag 00:00")
    if pausiert(datetime(2026, 10, 28, 9, 0, tzinfo=TZ), f.name) is not None:
        fehler.append("Pause laeuft nicht aus")
    with open(f.name, "w", encoding="utf-8") as g:
        g.write("bald wieder\n")
    if pausiert(datetime(2026, 10, 22, 10, 0, tzinfo=TZ), f.name) is not None:
        fehler.append("kaputtes Datum pausiert (muss warnen)")
    os.unlink(f.name)
    if pausiert(datetime(2026, 10, 22, 10, 0, tzinfo=TZ), f.name + ".fehlt") is not None:
        fehler.append("fehlende Datei pausiert")
    print("SELBSTTEST chatgpt_briefkasten_wache:", "OK" if not fehler else "FEHLER " + " | ".join(fehler))
    return 0 if not fehler else 1


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    import metricool_planer_wache as W
    jetzt = datetime.now(TZ)
    try:
        stand, zeilen = auftrag_lesen()
        if not zeilen:
            print("CHATGPT-BRIEFKASTEN: unklar (Auftragstabelle nicht lesbar — Format geaendert?)")
            return
        pause = pausiert(jetzt)
        if pause and "--liste" not in sys.argv:
            offen = sum(1 for z in zeilen if z["termin"] < pause[0])
            print(f"CHATGPT-BRIEFKASTEN: pausiert bis {pause[0]:%d.%m.} ({pause[1]}) · {offen} Termine des Auftrags fallen in die Pause "
                  f"(Plaetze bleiben frei, kein Eigenersatz) · danach laeuft die Pruefung von selbst weiter")
            return
        planer = W.holen(jetzt)
    except Exception as e:
        print(f"CHATGPT-BRIEFKASTEN: unklar ({type(e).__name__})")
        return
    eigene = eigene_ids()
    if eigene is None:
        print("CHATGPT-BRIEFKASTEN: unklar (Vorlauf-Plan nicht lesbar)")
        return
    try:
        geprueft = json.load(open(GEPRUEFT))
    except (OSError, ValueError):
        geprueft = {}
    mail = None
    try:
        t, n = open(POST_STAND).read().split()[:2]
        mail = f"zuletzt gesichtet {t[:16]}, {n} neue"
    except (OSError, ValueError):
        pass
    erg = pruefen(jetzt, planer, stand, zeilen, geprueft, eigene)
    print(zeile(erg, stand, jetzt, mail))
    if "--liste" in sys.argv:
        for r in erg["zeilen"]:
            print(f"  {r['nr']:4} {r['netz']:9} {r['zustand']:16} Termin in {r['bis_termin_h']:6} h  {'; '.join(r['mangel'])}")
        # Nebenbei: alle fremden Eintraege (nicht Auftrag) auf Regeln pruefen
        zugeordnet = set()
        for zl in zeilen:
            for n, ps in zuordnen(zl, planer, eigene).items():
                zugeordnet |= {p["id"] for p in ps}
        for p in planer:
            if chatgpt_herkunft(p, eigene) and p["id"] not in zugeordnet:
                t = datetime.fromisoformat(p["publicationDate"]["dateTime"]).replace(tzinfo=TZ)
                if t < jetzt - timedelta(hours=1) or (p.get("providers") or [{}])[0].get("status") == "PUBLISHED":
                    continue
                h = W.handle(p)
                bf = eintrag_befunde(p, h)
                print(f"  ALT-ID {p['id']} {t:%d.%m %H:%M} {'ENTWURF' if p.get('draft') else 'LIVE'} {[x.get('network') for x in p['providers']]} " +
                      "; ".join(f"{k}: {', '.join(v)}" for k, v in bf.items() if v))


if __name__ == "__main__":
    main()
