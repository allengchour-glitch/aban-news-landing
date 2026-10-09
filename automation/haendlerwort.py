#!/usr/bin/env python3
"""haendlerwort.py — wörtlich übersetzte chinesische Händlerwörter + Uhren-Modellnamen fremder Marken (09.10.2026, «weiter»).

ANLASS: Lehre aus 穿戴甲 (nagel_titel.py) auf den ganzen Katalog angewendet. GEMESSEN am Export 05:01 UTC (51'904 aktive):
  * 防爆 (berst-/reissfest) → «explosionsgeschützt/explosionssicher/Explosionsschutz»: 75 Produkte. 50 Hundeleinen,
    Halsbänder und Geschirre («Explosionsgeschütztes, bissfestes Haustierhalsband»), dazu Schraubendreher («explosionsgeschützt
    und isoliert»), Powerbanks («Explosionsgeschützter Polymer-Lithium-Akku»), Reissverschlüsse und ein Glasdeckel. Bei Werkzeug
    und Akkus ist das eine falsche Sicherheitsangabe (ATEX-Begriff) — wer es glaubt, arbeitet damit an der falschen Stelle.
  * 爆款 (Verkaufsschlager) → «Explosive Y2HDMAX Retro-Gaming Konsole», «Explosion Money – …», «Tragbarer Holzofen Explosion».
  * ins风 → «Ins Wind», «Wild Ins Wind»; 百搭 → «All-match»; 韩版 → «Koreanische Version»; 懒人 → «Fauler Handy-Halter».
  * Uhren-Modellnamen fremder Marken: «Submariner», «Daytona», «Datejust» (Rolex), «Nautilus» (Patek Philippe) — die Bilder
    zeigen Eigenmarken (OLEVS, FAIRWHALE, CADISEN, SHIRLEY), nur der Titel lehnt sich an. «für Apple Watch»/«für Aquanaut»
    (Passt-für-Angabe) bleibt.
REGEL: automation/data/haendlerwort_regel.json — dieselbe Datei liest haendlerwort.mjs (fallenSicher = alle drei CJ-Importer).
  Titel: Händlerwort weg; «explosionsgeschützt» bei Tier/Reissverschluss → «reissfest», sonst weg. Text: Satz/Stichpunkt mit
  der Angabe wird umgeschrieben oder fällt (Stichpunkt ohne Zahl fällt ganz; Satz, der nach dem Streichen zerbricht, fällt).
WÄCHTER (täglich im Aufseher, nach versprechen_wache — derselbe Export): Titel, Beschreibung, SEO; Adresse mit 301, wenn sie das
  Wort trägt; Bild-Alts zieht alt_titel_abgleich.py nach. Ledger dropship/_haendlerwort.tsv · Bericht dropship/HAENDLERWORT.md.
  python3 automation/haendlerwort.py --kanarien · (trocken) · SCHARF=1 python3 automation/haendlerwort.py
"""
import collections, json, os, re, sys, time, unicodedata

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
R = json.load(open(os.path.join(HIER, "data", "haendlerwort_regel.json"), encoding="utf-8"))
SCHARF = os.environ.get("SCHARF") == "1"
EXPORT = os.environ.get("EXPORT") or "/tmp/versprechen_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_haendlerwort.tsv")
BERICHT = os.path.join(REPO, "dropship", "HAENDLERWORT.md")
POD = re.compile(r"printful|\bpod\b|selbst-gestalten|editor", re.I)


def _s(p):
    return p.replace("{V}", R["grenze_vor"]).replace("{N}", R["grenze_nach"]).replace("{M}", R["uhr_modell"])


EXPL = re.compile(_s(R["explosion_wort"]), re.I)
REISS_KTX = re.compile(R["reissfest_kontext"], re.I)
REISS = [(re.compile(_s(p)), r) for p, r in R["reissfest"]]                 # Gross/klein bleibt erhalten
WEG = [(re.compile(_s(p), re.I), r) for p, r in R["weg_attributiv"]]
EXPLOSIV_T = [(re.compile(_s(p), re.I), r) for p, r in R["explosiv_titel"]]
HAENDLER = [(re.compile(_s(p), re.I), r) for p, r in R["haendlerwort"]]
HAENDLER_TEXT = [(re.compile(_s(p), re.I), r) for p, r in R["haendlerwort_text"]]
UHR_KTX = re.compile(R["uhr_kontext"], re.I)
UHR_KOMP = re.compile(_s(R["uhr_kompatibel"]), re.I)
UHR = [(re.compile(_s(p), re.I), r) for p, r in R["uhr_regeln"]]
PRAEP = re.compile(r"^(?:für|mit|zur|zum|und|oder|durch|bei|von|aus)\b", re.I)
HAENGT = re.compile(r"\b(?:seine|ihre|die|der|das|durch|mit|und|eine|einen|einer|für)\s*[.!?]?\s*$", re.I)


def _sub(regeln, t):
    for rx, rep in regeln:
        t = rx.sub(rep, t)
    return t


def _glatt(t):
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\s+([,.;:!?)])", r"\1", t)
    t = re.sub(r",\s*,", ",", t)
    return t.strip(" ,·-–")


def _gross(t):
    return t[:1].upper() + t[1:] if t else t


HAENDLER_WORT = re.compile(r"(?<![a-zäöü])(?:ins[\s-](?:wind|style|stil)|all-?match(?:ing)?)(?![a-zäöü])", re.I)


def titel_fix(t, hand=True):
    """→ (neu, gründe). hand=False: nur die Regel (Kanarien prüfen die Regel, nicht die Handliste)."""
    if hand and (t or "") in R.get("handtitel", {}):
        return R["handtitel"][t], ["hand"]
    neu, gr = t or "", []
    n2 = _sub(EXPLOSIV_T, neu)
    if n2 != neu:
        gr.append("explosiv"); neu = n2
    if UHR_KTX.search(neu) and not UHR_KOMP.search(neu):
        n2 = _sub(UHR, neu)
        if n2 != neu:
            gr.append("uhr-modell"); neu = n2
    if EXPL.search(neu):
        n2 = _sub(REISS, neu) if REISS_KTX.search(neu) else _sub(WEG, neu)
        if n2 != neu:
            gr.append("explosion"); neu = n2
    n2 = _sub(HAENDLER, neu)
    if n2 != neu:
        gr.append("haendlerwort"); neu = n2
    if not gr:
        return t, []
    return _gross(_glatt(neu)), gr


def satz_fix(s, reiss, im_li):
    """Ein Satz/Stichpunkt mit Explosions-Angabe → neuer Text ('' = fällt)."""
    if not EXPL.search(s):
        return s
    if reiss or REISS_KTX.search(s):         # Satz nennt Reissverschluss/Leine → «reissfest», auch wenn der Titel es nicht tut
        return _sub(REISS, s)
    n = _glatt(_sub(WEG, s))
    kopf_weg = (s.split() or [""])[0] != (n.split() or [""])[0]       # Satzanfang gestrichen → «für erhöhte Sicherheit.» fällt
    if EXPL.search(n) or (kopf_weg and PRAEP.match(n)) or HAENGT.search(n) or len(re.findall(r"[A-Za-zÄÖÜäöüß]{2,}", n)) < (2 if im_li else 4):
        return ""
    return _gross(n)


def text_fix(html, titel):
    """Beschreibung (HTML) oder SEO-Text → neuer Text. Kontext «reissfest» kommt aus dem Titel."""
    if not html or not (EXPL.search(html) or HAENDLER_WORT.search(html) or
                        (UHR_KTX.search(titel or "") and re.search(_s(R["uhr_modell"]), html, re.I))):
        return html
    reiss = bool(REISS_KTX.search(titel or ""))
    teile = re.split(r"(<[^>]+>)", html)
    offen = []
    for i, tk in enumerate(teile):
        if tk.startswith("<"):
            m = re.match(r"<(/?)([a-z0-9]+)", tk, re.I)
            if m:
                (offen.pop() if m.group(1) and offen and offen[-1] == m.group(2).lower() else
                 None if m.group(1) else offen.append(m.group(2).lower()))
            continue
        if UHR_KTX.search(titel or "") and not UHR_KOMP.search(tk):
            tk = _sub(UHR, tk)
        if HAENDLER_WORT.search(tk):          # «Ins Wind», «All-match» im Text: umschreiben oder Satz fällt (kein «im angesagten -Stil»)
            saetze = re.split(r"(?<=[.!?])(\s+)", tk)
            waise = re.compile(r"(?<![\wäöüÄÖÜ])-[A-Za-zÄÖÜäöü]|[«»\"„“]\s*[«»\"„“]")   # «im angesagten -Stil», leere «»
            tk = "".join(x if x.isspace() or not HAENDLER_WORT.search(x) else
                         (lambda n, x=x: "" if (HAENDLER_WORT.search(n) or len(waise.findall(n)) > len(waise.findall(x)))
                          else n)(_glatt(_sub(HAENDLER_TEXT, x))) for x in saetze)
        if EXPL.search(tk):
            saetze = re.split(r"(?<=[.!?])(\s+)", tk)
            tk = "".join(satz_fix(x, reiss, "li" in offen) if not x.isspace() else x for x in saetze)
            tk = re.sub(r"\s{2,}", " ", tk)
        teile[i] = tk
    out = "".join(teile)
    out = re.sub(r"<li>\s*(?:<strong>\s*</strong>)?\s*</li>\s*", "", out)
    out = re.sub(r"<p>\s*</p>", "", out)
    return out


def kanarien(still=False):
    f = 0
    for alt, soll, art in R["kanarien"]:
        if art == "titel":
            ist = titel_fix(alt, hand=False)[0]
        else:
            ist = text_fix(f"<p>{alt}</p>", art[5:]).replace("<p>", "").replace("</p>", "")
        if ist != soll:
            f += 1
            print(f"  ✗ [{art}] {alt!r}\n      ist  {ist!r}\n      soll {soll!r}")
    if not still:
        print(f"HAENDLERWORT-KANARIEN {len(R['kanarien']) - f}/{len(R['kanarien'])}")
    return f == 0


def _norm(t):
    t = (t or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def slug(t):
    t = t.lower()
    for a, b in [("ä", "a"), ("ö", "o"), ("ü", "u"), ("ß", "ss")]:
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9]+", "-", t).strip("-"))


HANDLE_WORT = re.compile(r"explosion|explosiv|(?:^|-)ins-(?:wind|style|stil)|all-?match|datejust|submariner|daytona|nautilus|"
                         r"day-?date|gmt-?master|yacht-?master|royal-oak|speedmaster|seamaster|koreanische-version|fauler", re.I)


def neuer_handle(alt, titel):
    m = re.search(r"-([a-z0-9]{4,})$", alt, re.I)
    nr = m.group(1) if (m and re.search(r"\d", m.group(1))) else ""
    n = slug(titel)[:60].strip("-")
    return f"{n}-{nr}" if nr else n


Q = 'query($id:ID!){product(id:$id){id title handle status tags descriptionHtml seo{title description}}}'


def kandidaten():
    out = []
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" in o or "title" not in o:
            continue
        t, d = o["title"], o.get("descriptionHtml") or ""
        seo = o.get("seo") or {}
        if titel_fix(t)[1] or text_fix(d, t) != d or text_fix(seo.get("description") or "", t) != (seo.get("description") or ""):
            out.append(o["id"])
    return out


def main():
    if not kanarien():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if "--kanarien" in sys.argv:
        return 0
    from kaufwille_zeile import gql
    kand = kandidaten()
    titel_norm = collections.Counter()
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" not in o and "title" in o:
            titel_norm[_norm(o["title"])] += 1
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(kand)} Kandidaten aus {EXPORT} · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    st = collections.Counter(); zeilen = []
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for pid in kand:
        p = gql(Q, {"id": pid})["product"]
        if not p or p["status"] != "ACTIVE" or POD.search(" ".join(p.get("tags") or [])):
            continue
        t = p["title"]; tn, gr = titel_fix(t)
        if tn != t and titel_norm[_norm(tn)] and _norm(tn) != _norm(t):
            st["dublette-titel-bleibt"] += 1
            zeilen.append(f"- ⚠️ Dublette, Titel bleibt (Hand-Titel in der Regeldatei nachtragen): «{t}» → «{tn}»")
            tn, gr = t, []
        elif tn != t:
            titel_norm[_norm(tn)] += 1
        d = p.get("descriptionHtml") or ""; dn = text_fix(d.replace(t, tn) if tn != t else d, tn)
        seo = p.get("seo") or {}
        st_ = seo.get("title") or ""; sd = seo.get("description") or ""
        stn = st_.replace(t, tn) if tn != t else st_
        sdn = text_fix(sd.replace(t, tn) if tn != t else sd, tn)
        h_neu = neuer_handle(p["handle"], tn) if tn != t and HANDLE_WORT.search(p["handle"]) else p["handle"]
        if (tn, dn, stn, sdn) == (t, d, st_, sd):
            continue
        art = "+".join(gr) or "nur-text"
        st[art] += 1
        zeilen.append(f"- {art}: «{t}»" + (f" → «{tn}»" if tn != t else " (Text)") +
                      (f" · Adresse → `{h_neu}`" if h_neu != p["handle"] else ""))
        if not SCHARF:
            continue
        inp = {"id": pid}
        if tn != t:
            inp["title"] = tn
        if dn != d:
            inp["descriptionHtml"] = dn
        if (stn, sdn) != (st_, sd):
            inp["seo"] = {"title": stn or None, "description": sdn or None}
        if h_neu != p["handle"]:
            inp["handle"] = h_neu
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title handle} userErrors{message}}}", {"p": inp})
        pu = r["productUpdate"]; pr = pu.get("product") or {}
        ok = not pu["userErrors"] and pr.get("title") == tn
        w = ""
        if ok and h_neu != p["handle"]:
            r2 = gql('mutation($in:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$in){urlRedirect{path} userErrors{message}}}',
                     {"in": {"path": f"/products/{p['handle']}", "target": f"/products/{pr['handle']}"}})
            w = "301" if r2["urlRedirectCreate"]["urlRedirect"] else "OHNE-301"
        st["ok" if ok else "fehler"] += 1
        led.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), pid, art, t, tn, p["handle"], pr.get("handle", ""), w,
                             "ok" if ok else "FEHLER " + "; ".join(e["message"] for e in pu["userErrors"])[:80]]) + "\n")
        led.flush(); time.sleep(0.3)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Händlerwörter + Uhren-Modellnamen — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Werkzeug `automation/haendlerwort.py`, Regel `automation/data/haendlerwort_regel.json` (Importer: `haendlerwort.mjs` "
                f"in `fallenSicher`). {'Geändert' if SCHARF else 'Zu ändern'}: {dict(st)}\n\n" + ("\n".join(zeilen) or "Nichts zu tun.") + "\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {dict(st)}", flush=True)
    return 1 if st["fehler"] else 0


if __name__ == "__main__":
    sys.exit(main())
