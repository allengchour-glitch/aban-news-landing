#!/usr/bin/env python3
"""index_probe.py — Index-Messgerät: Search-Console-«inspect_urls» → dropship/_index_stand.tsv (13.10.2026).

WOZU: Ohne dieses Gerät lässt sich nicht messen, ob Index-Anträge, neue Kollektionen oder SEO-Texte bei Google ankommen.
GEMESSEN 13.10.: 6 von 9 Top-Produkten zuletzt im Juli/August abgerufen (shirt-zum-selbstgestalten 18.08.) — eine
Oktober-Änderung dort hat Google nie gesehen. Wer dann «hat nichts gebracht» schreibt, urteilt über etwas, das nie ankam.

WIE (nur in einer Claude-Sitzung — Search Console ist hier nur über den OpenSEO-Konnektor lesbar, kein Schlüssel im
Container; deshalb kein Tageslauf im Aufseher). Die Verbesserungsrunde macht MONTAGS und DONNERSTAGS, 0 Credits:
    1. python3 tools/index_probe.py --pakete            → druckt die URL-Pakete (je höchstens 4 Adressen)
    2. je Paket: mcp OpenSEO inspect_urls  projectId 443c940c-93c9-4feb-9d0c-1e4d1d88c6cf, urls [<das Paket>]
       (GEMESSEN 13.10.: 10 Adressen laufen in den 60-s-Timeout, 4 gehen in ~10 s)
       → jede Antwort unverändert als Datei ablegen (…/antworten_JJJJ-MM-TT/paket_NN.json; richResultsResult darf
         gekürzt werden, gelesen wird nur indexStatusResult)
    3. python3 tools/index_probe.py --trocken <paket_*.json>    → Liste LESEN
       python3 tools/index_probe.py <paket_*.json>              → hängt den Lauf an dropship/_index_stand.tsv
    4. Ampel (automation/betreiber_ampel.py, Zeile INDEX) liest nur die Datei.

GESPEICHERT wird nur «indexiert 1/0» (+ letzter Abruf), NICHT der coverageState: «URL is unknown to Google» und
«Discovered - currently not indexed» kippen zwischen zwei Abfragen derselben Seite (gemessen 13.10.: damen-mode und
beauty-pflege tauschten die Zustände innerhalb von 1 h). Eine Seite ohne Antwort (Timeout, Teilfehler, fehlendes Paket)
steht als «unklar» da, NIE als 0 — sonst meldet die Ampel einen Absturz, der nur ein Zeitüberschreiten war.

Weitere Aufrufe:
    python3 tools/index_probe.py --stand                         → Zusammenfassung des letzten Laufs (je Gruppe)
    python3 tools/index_probe.py --abgerufen-seit 2026-10-10 [teil-der-url]
        → Runbook-Regel (a): eine Nachmessung zählt nur, wenn Google die Seite NACH der Änderung abgerufen hat
    python3 tools/index_probe.py --abgleich <alte.tsv>           → Vergleich mit einer früheren Handmessung
    python3 tools/index_probe.py --antraege                      → welche nicht indexierte Adresse wurde nie beantragt (Klickliste),
        welche beantragte wartet / wirkt / ist nach 3 Tagen weiter draussen (22.10.2026, liest dropship/_index_beantragt.tsv)
    python3 tools/index_probe.py --selbsttest
"""
import datetime as dt, json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LISTE = os.path.join(REPO, "dropship", "_index_probe_urls.txt")
STAND = os.path.join(REPO, "dropship", "_index_stand.tsv")
KOPF = ["messdatum", "gruppe", "url", "indexiert", "letzter_abruf"]
PAKET = 4                 # gemessen 13.10.: 10 URLs → 60-s-Timeout
ALARM_TAGE = 8            # Ampel: Lauf älter als 8 Tage (zweimal je Woche geplant)
GUELTIG_ANTEIL = 0.5      # ein Lauf mit mehr als der Hälfte «unklar» zählt nicht als frische Messung
# Register der Suchbegriff-Kollektionen (automation/suchbegriff_kollektionen.py legt sie an). Jede Kollektion dort kommt
# automatisch in die Messliste (Gruppe «suchbegriff») — so erfasst das Gerät auch Kollektionen, die NACH dem 13.10. entstehen.
REGISTER = os.path.join(REPO, "automation", "data", "suchbegriff_kollektionen.json")
# Anträge «Indexierung beantragen» (Search Console, ~10/Tag, nur der Betreiber im eingeloggten Konto). GEMESSEN 22.10.2026: die 10 Anträge
# vom 20.10. abends standen am 22.10. 00:33 UTC ALLE im Index (Abruf 20.10. 21:48–21:54), keine der 10 nicht beantragten Adressen — der
# Antrag ist der einzige Hebel, der bei Google wirkt (IndexNow gilt nur für Bing). Die Handarbeit «welche Adresse fehlt noch?» steckt hier.
BEANTRAGT = os.path.join(REPO, "dropship", "_index_beantragt.tsv")
WIRKT_TAGE = 3            # beantragt und nach so vielen Tagen weiter nicht indexiert → eigene Klasse (Seite/Qualität), nicht «Antrag fehlt»


def norm(url):
    u = url.strip()
    if u.startswith("/"):
        u = "https://luxestyle.ch" + u
    return u.rstrip("/") if u.count("/") > 3 else u.rstrip("/") + "/"


def lies_liste(pfad=LISTE):
    """→ [(gruppe, url)] in Dateireihenfolge, ohne Kommentare/Doppel."""
    out, gesehen = [], set()
    for z in open(pfad, encoding="utf-8"):
        z = z.split("#", 1)[0].strip()
        if not z:
            continue
        teile = z.split()
        if len(teile) != 2:
            raise ValueError(f"Listenzeile ohne «gruppe url»: {z!r}")
        g, u = teile[0], norm(teile[1])
        if u in gesehen:
            continue
        gesehen.add(u)
        out.append((g, u))
    return out


def register_handles(pfad=None):
    try:
        return [k["handle"] for k in json.load(open(pfad or REGISTER, encoding="utf-8"))["kollektionen"] if k.get("handle")]
    except (OSError, ValueError, KeyError):
        return []


def register_fehlt(liste, register=None):
    """Register-Kollektionen, die (unter irgendeiner Gruppe) noch nicht in der Messliste stehen."""
    drin = {u for _, u in liste}
    reg = register_handles() if register is None else register
    return [h for h in reg if norm(f"/collections/{h}") not in drin]


def liste_ergaenzen(pfad=LISTE):
    """Hängt fehlende Register-Kollektionen als «suchbegriff» an die Messliste an. → Liste der ergänzten Handles."""
    fehlt = register_fehlt(lies_liste(pfad))
    if fehlt:
        with open(pfad, "a", encoding="utf-8") as f:
            f.write(f"\n# automatisch aus {os.path.relpath(REGISTER, REPO)} ergänzt {dt.date.today().isoformat()}\n")
            for h in fehlt:
                f.write(f"suchbegriff https://luxestyle.ch/collections/{h}\n")
    return fehlt


def lies_antwort(pfad):
    d = json.load(open(pfad, encoding="utf-8"))
    # Der Harness legt Antworten teils als [{"type":"text","text":"{…}"}] ab
    if isinstance(d, list) and d and isinstance(d[0], dict) and "text" in d[0]:
        d = json.loads(d[0]["text"])
    return d


def urteil(eintrag):
    """Ein Element aus results[] → (indexiert '1'|'0'|'unklar', letzter_abruf 'JJJJ-MM-TT'|'-')."""
    r = eintrag.get("result") if isinstance(eintrag, dict) else None
    if not isinstance(r, dict) or eintrag.get("error") or r.get("error"):
        return "unklar", "-"
    s = r.get("indexStatusResult")
    if not isinstance(s, dict) or not (s.get("verdict") or s.get("coverageState")):
        return "unklar", "-"
    abruf = (s.get("lastCrawlTime") or "")[:10] or "-"
    zustand = (s.get("coverageState") or "").lower()
    ja = s.get("verdict") == "PASS" or zustand.startswith(("submitted and indexed", "indexed"))
    return ("1" if ja else "0"), abruf


def auswerten(liste, antworten):
    """liste [(gruppe,url)], antworten [dict] → (zeilen [{gruppe,url,indexiert,letzter_abruf}], warnungen)."""
    gefunden, warn = {}, []
    for i, a in enumerate(antworten):
        if not isinstance(a, dict) or not a.get("ok") or not isinstance(a.get("results"), list):
            warn.append(f"Antwort {i + 1}: ohne ok/results — ihre Seiten bleiben «unklar»")
            continue
        for e in a["results"]:
            u = norm((e or {}).get("url") or "")
            if not u.startswith("http"):
                continue
            gefunden[u] = urteil(e)
    bekannt = {u for _, u in liste}
    fremd = sorted(set(gefunden) - bekannt)
    if fremd:
        warn.append(f"{len(fremd)} Antwort-URL(s) nicht in der Liste, ignoriert: {', '.join(fremd[:3])}")
    zeilen = []
    for g, u in liste:
        ix, ab = gefunden.get(u, ("unklar", "-"))
        zeilen.append({"gruppe": g, "url": u, "indexiert": ix, "letzter_abruf": ab})
    fehlt = sum(1 for u in bekannt if u not in gefunden)
    if fehlt:
        warn.append(f"{fehlt} Seite(n) ohne Antwort → «unklar» (Paket fehlt oder Zeitüberschreitung)")
    return zeilen, warn


def lies_stand(pfad=STAND):
    """→ {messdatum: [zeile…]} in Dateireihenfolge (dict hält Einfügeordnung)."""
    laeufe = {}
    if not os.path.exists(pfad):
        return laeufe
    for n, z in enumerate(open(pfad, encoding="utf-8")):
        teile = z.rstrip("\n").split("\t")
        if n == 0 and teile[:1] == ["messdatum"]:
            continue
        if len(teile) != len(KOPF):
            continue
        laeufe.setdefault(teile[0], []).append(dict(zip(KOPF, teile)))
    return laeufe


def schreibe_lauf(zeilen, messdatum, pfad=STAND):
    """Hängt einen Lauf an. Ein zweiter Lauf am SELBEN Tag ersetzt den ersten (Korrektur, nicht neue Messung)."""
    laeufe = lies_stand(pfad)
    tag = messdatum[:10]
    for k in [k for k in laeufe if k[:10] == tag]:
        del laeufe[k]
    laeufe[messdatum] = [dict(z, messdatum=messdatum) for z in zeilen]
    tmp = pfad + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("\t".join(KOPF) + "\n")
        for k in sorted(laeufe):
            for z in laeufe[k]:
                f.write("\t".join(str(z[c]) for c in KOPF) + "\n")
    os.replace(tmp, pfad)


def gueltig(lauf):
    bekannt = sum(1 for z in lauf if z["indexiert"] != "unklar")
    return bool(lauf) and bekannt >= GUELTIG_ANTEIL * len(lauf)


def bewerte(laeufe, heute=None):
    """Ampel-Logik (auch von automation/betreiber_ampel.py benutzt). → dict mit zeile, alarm (bool), gründen.
    Alarm NUR, wenn (a) der letzte GÜLTIGE Lauf älter als ALARM_TAGE ist / keiner existiert, oder (b) im letzten Lauf
    weniger Seiten indexiert sind als im vorigen — verglichen nur über Seiten, die in BEIDEN Läufen bekannt (nicht
    «unklar») sind; so verfälscht weder eine Listenänderung noch ein Zeitüberschreiten den Vergleich."""
    heute = heute or dt.datetime.utcnow().date()
    gl = [k for k in sorted(laeufe) if gueltig(laeufe[k])]
    if not gl:
        return {"alarm": True, "zeile": "INDEX: kein gültiger Lauf — Verbesserungsrunde Mo/Do: tools/index_probe.py --pakete"}
    neu = laeufe[gl[-1]]
    datum = dt.date.fromisoformat(gl[-1][:10])
    alter = (heute - datum).days
    ja = [z for z in neu if z["indexiert"] == "1"]
    unklar = sum(1 for z in neu if z["indexiert"] == "unklar")
    abrufe = sorted(z["letzter_abruf"] for z in ja if z["letzter_abruf"] not in ("", "-"))
    aeltester = dt.date.fromisoformat(abrufe[0]).strftime("%d.%m.") if abrufe else "–"
    zeile = f"INDEX: {len(ja)}/{len(neu)} indexiert · ältester Abruf {aeltester}"
    if unklar:
        zeile += f" · {unklar} unklar"
    gruende = []
    if alter > ALARM_TAGE:
        gruende.append(f"Lauf {alter} T alt (vom {datum.strftime('%d.%m.')})")
    verloren = []
    if len(gl) >= 2:
        alt = {z["url"]: z["indexiert"] for z in laeufe[gl[-2]]}
        jetzt = {z["url"]: z["indexiert"] for z in neu}
        gemeinsam = [u for u in jetzt if u in alt and "unklar" not in (alt[u], jetzt[u])]
        n_alt = sum(alt[u] == "1" for u in gemeinsam)
        n_neu = sum(jetzt[u] == "1" for u in gemeinsam)
        verloren = [u for u in gemeinsam if alt[u] == "1" and jetzt[u] == "0"]
        if n_neu < n_alt:
            kurz = ", ".join(u.split("luxestyle.ch")[-1] for u in verloren[:3])
            gruende.append(f"weniger indexiert als am {gl[-2][8:10]}.{gl[-2][5:7]}. ({n_neu} statt {n_alt}: {kurz})")
    if gruende:
        zeile += " — ⚠️ " + "; ".join(gruende) + " → tools/index_probe.py"
    return {"alarm": bool(gruende), "zeile": zeile, "alter": alter, "verloren": verloren}


def gruppen_text(lauf):
    gr = {}
    for z in lauf:
        a = gr.setdefault(z["gruppe"], [0, 0, 0])
        a[0] += z["indexiert"] == "1"
        a[1] += 1
        a[2] += z["indexiert"] == "unklar"
    return " · ".join(f"{g} {a[0]}/{a[1]}" + (f" ({a[2]} unklar)" if a[2] else "") for g, a in gr.items())


def suchbegriff_quote(lauf, register=None):
    """Runbook-Regel (b): unter 50 % indexierter Suchbegriff-Kollektionen keine neue Suchbegriff-Kollektion.
    Zählt die Gruppe «suchbegriff» UND jede Register-Kollektion, auch wenn sie unter «saison» steht (Weihnachtspullover)."""
    reg = {norm(f"/collections/{h}") for h in (register_handles() if register is None else register)}
    z = [x for x in lauf if (x["gruppe"] == "suchbegriff" or x["url"] in reg) and x["indexiert"] != "unklar"]
    ja = sum(x["indexiert"] == "1" for x in z)
    return ja, len(z)


def lies_antraege(pfad=BEANTRAGT):
    """→ {url: 'JJJJ-MM-TT'} der Anträge, die der BETREIBER wirklich gestellt hat (Spalte «wer» beginnt mit «Betreiber»; jüngster
    Eintrag je Adresse). Vorschläge der Sitzung und Nachmessungen zählen NICHT — sonst gälte eine nur vorgeschlagene Adresse als beantragt."""
    out = {}
    if not os.path.exists(pfad):
        return out
    for n, z in enumerate(open(pfad, encoding="utf-8")):
        t = z.rstrip("\n").split("\t")
        if n == 0 or len(t) < 3 or not t[2].strip().lower().startswith("betreiber"):
            continue
        try:
            dt.date.fromisoformat(t[0].strip())
        except ValueError:
            continue
        u = norm(t[1])
        out[u] = max(out.get(u, ""), t[0].strip())
    return out


def antraege_offen(lauf, antraege, heute=None):
    """Nur Seiten mit gültigem Urteil (indexiert 1/0; «unklar» zählt nicht). → dict:
    ohne = nicht indexiert, nie beantragt (→ Klickliste für den Betreiber) · wartet = beantragt vor weniger als WIRKT_TAGE ·
    wirkungslos = beantragt vor ≥ WIRKT_TAGE und weiter nicht indexiert (Seite/Qualität prüfen, NICHT nochmal beantragen) ·
    wirkt = indexiert und beantragt (Beleg für den Hebel)."""
    heute = heute or dt.datetime.utcnow().date()
    ohne, wartet, wirkungslos, wirkt = [], [], [], []
    for z in lauf:
        if z["indexiert"] == "unklar":
            continue
        d = antraege.get(z["url"])
        if z["indexiert"] == "1":
            if d:
                wirkt.append((z["url"], d))
            continue
        if not d:
            ohne.append(z["url"])
        elif (heute - dt.date.fromisoformat(d)).days >= WIRKT_TAGE:
            wirkungslos.append((z["url"], d))
        else:
            wartet.append((z["url"], d))
    return {"ohne": ohne, "wartet": wartet, "wirkungslos": wirkungslos, "wirkt": wirkt}


def antraege_zeile(r):
    """Eine Zeile für Bericht und Ampel (ohne Antwort-Details)."""
    z = (f"ANTRÄGE: {len(r['wirkt'])} beantragt und indexiert · {len(r['ohne'])} nicht indexiert OHNE Antrag"
         f" · {len(r['wartet'])} warten · {len(r['wirkungslos'])} wirkungslos")
    if r["wirkungslos"]:
        z += " — ⚠️ beantragt, aber nach " + str(WIRKT_TAGE) + "+ Tagen weiter nicht im Index: Seite prüfen, nicht erneut beantragen"
    return z


def drucke_lauf(zeilen, warn):
    for z in zeilen:
        print(f"  {z['indexiert']:>6}  {z['letzter_abruf']:>10}  {z['gruppe']:<11} {z['url'].split('luxestyle.ch')[-1]}")
    for w in warn:
        print(f"  ⚠️ {w}")
    print("GRUPPEN: " + gruppen_text(zeilen))
    ja, n = suchbegriff_quote(zeilen)
    if n:
        print(f"SUCHBEGRIFF: {ja}/{n} indexiert ({100 * ja // n} %) — Regel b: unter 50 % keine NEUE Suchbegriff-Kollektion"
              + (" → GESPERRT" if ja * 2 < n else " → frei"))


def abgleich(alt_pfad, lauf):
    """Vergleich mit einer Handmessung (TSV mit Spalten url, coverageState, lastCrawl …)."""
    alt = {}
    for n, z in enumerate(open(alt_pfad, encoding="utf-8")):
        t = z.rstrip("\n").split("\t")
        if n == 0 or len(t) < 3:
            continue
        ix = "1" if t[1].lower().startswith(("submitted and indexed", "indexed")) else "0"
        alt[norm(t[0])] = (ix, t[2])
    gleich = anders = 0
    for z in lauf:
        if z["url"] not in alt:
            continue
        a = alt[z["url"]]
        if (a[0], a[1]) == (z["indexiert"], z["letzter_abruf"]):
            gleich += 1
        else:
            anders += 1
            print(f"  ≠ {z['url'].split('luxestyle.ch')[-1]}: vorher {a[0]}/{a[1]} · jetzt {z['indexiert']}/{z['letzter_abruf']}")
    print(f"ABGLEICH: {gleich + anders} gemeinsame Seiten, {gleich} gleich, {anders} anders")


def selbsttest():
    liste = [("hub", "https://luxestyle.ch/collections/a"), ("suchbegriff", "https://luxestyle.ch/collections/b"),
             ("produkt", "https://luxestyle.ch/products/c"), ("suchbegriff", "https://luxestyle.ch/collections/d")]
    ok_a = {"indexStatusResult": {"verdict": "PASS", "coverageState": "Submitted and indexed", "lastCrawlTime": "2026-09-14T08:15:49Z"}}
    nein_b = {"indexStatusResult": {"verdict": "NEUTRAL", "coverageState": "Discovered - currently not indexed"}}
    unbek = {"indexStatusResult": {"verdict": "NEUTRAL", "coverageState": "URL is unknown to Google"}}
    gecr = {"indexStatusResult": {"verdict": "NEUTRAL", "coverageState": "Crawled - currently not indexed", "lastCrawlTime": "2026-06-12T20:46:23Z"}}
    nicht_eing = {"indexStatusResult": {"verdict": "PASS", "coverageState": "Indexed, not submitted in sitemap", "lastCrawlTime": "2026-10-01T00:00:00Z"}}
    a1 = {"ok": True, "results": [{"url": "https://luxestyle.ch/collections/a", "result": ok_a},
                                  {"url": "https://luxestyle.ch/collections/b", "result": nein_b}]}
    a2 = {"ok": True, "results": [{"url": "https://luxestyle.ch/products/c", "error": "quota"},
                                  {"url": "https://luxestyle.ch/collections/fremd", "result": ok_a}]}
    harness = [{"type": "text", "text": json.dumps(a1)}]
    fehler = 0

    def pruefe(name, ist, soll):
        nonlocal fehler
        ok = ist == soll
        fehler += not ok
        print(f"  {'✓' if ok else '✗'} {name}: {ist!r}" + ("" if ok else f" (soll {soll!r})"))

    pruefe("PASS → 1 + Datum", urteil({"result": ok_a}), ("1", "2026-09-14"))
    pruefe("Discovered → 0", urteil({"result": nein_b}), ("0", "-"))
    pruefe("unknown → 0", urteil({"result": unbek}), ("0", "-"))
    pruefe("Crawled-not-indexed → 0 mit Datum", urteil({"result": gecr}), ("0", "2026-06-12"))
    pruefe("Indexed-not-submitted → 1", urteil({"result": nicht_eing}), ("1", "2026-10-01"))
    pruefe("Fehler je URL → unklar", urteil({"url": "x", "error": "boom"}), ("unklar", "-"))
    pruefe("ohne indexStatusResult → unklar", urteil({"result": {}}), ("unklar", "-"))
    z, w = auswerten(liste, [a1, a2])
    pruefe("Teilfehler: c unklar, d fehlt → unklar", [x["indexiert"] for x in z], ["1", "0", "unklar", "unklar"])
    pruefe("fremde URL gewarnt", any("nicht in der Liste" in x for x in w), True)
    z2, _ = auswerten(liste, [{"ok": False, "error": "timeout"}])
    pruefe("Timeout-Paket → alles unklar, nie 0", {x["indexiert"] for x in z2}, {"unklar"})
    pruefe("Harness-Format gelesen", json.loads(harness[0]["text"])["results"][0]["url"], "https://luxestyle.ch/collections/a")
    pruefe("norm Pfad", norm("/collections/a"), "https://luxestyle.ch/collections/a")
    pruefe("norm Startseite", norm("https://luxestyle.ch"), "https://luxestyle.ch/")
    pruefe("Suchbegriff-Quote", suchbegriff_quote(z, register=[]), (0, 1))
    pruefe("Register zählt auch unter «hub»", suchbegriff_quote(z, register=["a"]), (1, 2))
    pruefe("Register fehlt in Liste", register_fehlt(liste, ["a", "neu-x"]), ["neu-x"])
    import tempfile
    lp = os.path.join(tempfile.mkdtemp(), "liste.txt")
    open(lp, "w").write("hub https://luxestyle.ch/collections/a\n")
    global REGISTER
    alt_reg, REGISTER = REGISTER, os.path.join(os.path.dirname(lp), "reg.json")
    json.dump({"kollektionen": [{"handle": "a"}, {"handle": "neu-x"}]}, open(REGISTER, "w"))
    erg = liste_ergaenzen(lp)
    erg2 = liste_ergaenzen(lp)
    REGISTER = alt_reg
    pruefe("Liste ergänzt, zweimal idempotent", (erg, erg2, [g for g, _ in lies_liste(lp)]), (["neu-x"], [], ["hub", "suchbegriff"]))
    # Ampel-Logik
    heute = dt.date(2026, 10, 20)
    L = lambda d, werte: [{"messdatum": d, "gruppe": g, "url": u, "indexiert": v, "letzter_abruf": "2026-08-18" if v == "1" else "-"}
                          for (g, u), v in zip(liste, werte)]
    pruefe("kein Lauf → Alarm", bewerte({}, heute)["alarm"], True)
    r = bewerte({"2026-10-16T08:00Z": L("2026-10-16T08:00Z", ["1", "0", "1", "0"])}, heute)
    pruefe("frisch, ein Lauf → kein Alarm", (r["alarm"], r["zeile"]), (False, "INDEX: 2/4 indexiert · ältester Abruf 18.08."))
    pruefe("9 Tage alt → Alarm", bewerte({"2026-10-11T08:00Z": L("2026-10-11T08:00Z", ["1", "0", "1", "0"])}, heute)["alarm"], True)
    r = bewerte({"2026-10-13T08:00Z": L("2026-10-13T08:00Z", ["1", "0", "1", "0"]),
                 "2026-10-16T08:00Z": L("2026-10-16T08:00Z", ["1", "0", "0", "0"])}, heute)
    pruefe("weniger indexiert → Alarm + URL", (r["alarm"], r["verloren"]), (True, ["https://luxestyle.ch/products/c"]))
    r = bewerte({"2026-10-13T08:00Z": L("2026-10-13T08:00Z", ["1", "0", "1", "0"]),
                 "2026-10-16T08:00Z": L("2026-10-16T08:00Z", ["1", "1", "unklar", "0"])}, heute)
    pruefe("unklar zählt nicht als Verlust", r["alarm"], False)
    r = bewerte({"2026-10-16T08:00Z": L("2026-10-16T08:00Z", ["1", "0", "1", "0"]),
                 "2026-10-19T08:00Z": L("2026-10-19T08:00Z", ["unklar", "unklar", "unklar", "1"])}, heute)
    pruefe("Lauf fast nur unklar → vorheriger gilt (kein Fehlalarm)", (r["alarm"], r["zeile"].startswith("INDEX: 2/4")), (False, True))
    r = bewerte({"2026-10-10T08:00Z": L("2026-10-10T08:00Z", ["1", "0", "1", "0"]),
                 "2026-10-19T08:00Z": L("2026-10-19T08:00Z", ["unklar", "unklar", "unklar", "1"])}, heute)
    pruefe("…aber nur bis zur 8-Tage-Grenze", r["alarm"], True)
    # Schreiben: zweiter Lauf am selben Tag ersetzt den ersten
    p = os.path.join(tempfile.mkdtemp(), "stand.tsv")
    schreibe_lauf(L("x", ["1", "0", "1", "0"]), "2026-10-13T08:00Z", p)
    schreibe_lauf(L("x", ["1", "1", "1", "0"]), "2026-10-13T19:00Z", p)
    schreibe_lauf(L("x", ["1", "1", "1", "1"]), "2026-10-16T08:00Z", p)
    st = lies_stand(p)
    pruefe("gleicher Tag ersetzt, neuer Tag hängt an", sorted(st), ["2026-10-13T19:00Z", "2026-10-16T08:00Z"])
    pruefe("Spalten vollständig", sorted(st["2026-10-16T08:00Z"][0]), sorted(KOPF))
    # Anträge (22.10.): wer wurde wirklich beantragt, was fehlt noch
    pt = os.path.join(tempfile.mkdtemp(), "beantragt.tsv")
    with open(pt, "w", encoding="utf-8") as f:
        f.write("datum\turl\twer\tstatus\n")
        f.write("2026-10-13\thttps://luxestyle.ch/collections/a\tBetreiber (GSC «Indexierung beantragen»)\tindexiert\n")
        f.write("2026-10-20\thttps://luxestyle.ch/collections/b\tvorgeschlagen (Sitzung, OpenSEO)\tvorgeschlagen für 22.10.\n")
        f.write("2026-10-21\thttps://luxestyle.ch/collections/c\tBetreiber (GSC)\tbeantragt\n")
        f.write("2026-10-17\thttps://luxestyle.ch/collections/d\tBetreiber (GSC)\tbeantragt\n")
        f.write("2026-10-10\thttps://luxestyle.ch/collections/d\tSitzung (Nachmessung)\talt\n")
        f.write("2026-10-05\thttps://luxestyle.ch/collections/h\tBetreiber (GSC)\tbeantragt\n")
        f.write("2026-10-19\thttps://luxestyle.ch/collections/h\tBetreiber (GSC)\tnochmal beantragt\n")
        f.write("kaputt\n")
    an = lies_antraege(pt)
    pruefe("Anträge: nur Betreiber-Zeilen, jüngstes Datum", {u.split("/")[-1]: d for u, d in an.items()},
           {"a": "2026-10-13", "c": "2026-10-21", "d": "2026-10-17", "h": "2026-10-19"})
    heute22 = dt.date(2026, 10, 22)
    lz = [{"gruppe": "x", "url": "https://luxestyle.ch/collections/" + k, "indexiert": v, "letzter_abruf": "-"}
          for k, v in (("a", "1"), ("b", "0"), ("c", "0"), ("d", "0"), ("e", "0"), ("f", "unklar"), ("g", "1"))]
    ro = antraege_offen(lz, an, heute22)
    pruefe("a indexiert+beantragt → wirkt", [u.split("/")[-1] for u, _ in ro["wirkt"]], ["a"])
    pruefe("b nur vorgeschlagen, e nie → ohne Antrag", sorted(u.split("/")[-1] for u in ro["ohne"]), ["b", "e"])
    pruefe("c vor 1 Tag beantragt → wartet", [u.split("/")[-1] for u, _ in ro["wartet"]], ["c"])
    pruefe("d vor 5 Tagen beantragt, weiter 0 → wirkungslos", [u.split("/")[-1] for u, _ in ro["wirkungslos"]], ["d"])
    pruefe("unklar (f) und indexiert ohne Antrag (g) tauchen nirgends auf",
           any("/f" in u or "/g" in u for k in ("ohne", "wartet", "wirkungslos", "wirkt")
               for u in [x if isinstance(x, str) else x[0] for x in ro[k]]), False)
    pruefe("Zeile nennt Wirkungslos als Warnung", "⚠️" in antraege_zeile(ro) and "1 wirkungslos" in antraege_zeile(ro), True)
    pruefe("Zeile ohne Wirkungslose hat kein ⚠️", "⚠️" in antraege_zeile(antraege_offen(lz[:3], an, heute22)), False)
    print(f"SELBSTTEST {'OK' if not fehler else f'{fehler} FEHLER'}")
    return fehler == 0


def main():
    a = sys.argv[1:]
    if "--selbsttest" in a:
        return 0 if selbsttest() else 1
    if "--pakete" in a:
        neu = liste_ergaenzen()
        if neu:
            print(f"# {len(neu)} neue Suchbegriff-Kollektion(en) aus dem Register in die Liste aufgenommen: {', '.join(neu)}",
                  file=sys.stderr)
        liste = lies_liste()
        for i in range(0, len(liste), PAKET):
            print(json.dumps([u for _, u in liste[i:i + PAKET]]))
        print(f"# {len(liste)} URLs in {-(-len(liste) // PAKET)} Paketen — je Paket inspect_urls (projectId "
              "443c940c-93c9-4feb-9d0c-1e4d1d88c6cf), Antworten als Dateien ablegen", file=sys.stderr)
        return 0
    laeufe = lies_stand()
    if "--stand" in a:
        if not laeufe:
            print("kein Stand"); return 1
        k = sorted(laeufe)[-1]
        print(f"LAUF {k}: " + gruppen_text(laeufe[k]))
        print(bewerte(laeufe)["zeile"])
        ja, n = suchbegriff_quote(laeufe[k])
        print(f"SUCHBEGRIFF: {ja}/{n}")
        return 0
    if "--antraege" in a:
        if not laeufe:
            print("kein Stand"); return 1
        k = sorted(laeufe)[-1]
        r = antraege_offen(laeufe[k], lies_antraege())
        print(f"Stand {k}")
        for name, titel in (("ohne", "NICHT INDEXIERT, NIE BEANTRAGT (Klickliste für den Betreiber)"), ("wartet", "beantragt, wartet"),
                            ("wirkungslos", "BEANTRAGT, WIRKUNGSLOS (nicht nochmal beantragen — Seite prüfen)"), ("wirkt", "beantragt und indexiert")):
            if r[name]:
                print(f"{titel}:")
                for x in r[name]:
                    u, d = (x, "") if isinstance(x, str) else x
                    print(f"  {u.split('luxestyle.ch')[-1]}" + (f"  (beantragt {d})" if d else ""))
        print(antraege_zeile(r))
        return 0
    if "--abgerufen-seit" in a:
        i = a.index("--abgerufen-seit")
        seit, teil = a[i + 1], (a[i + 2] if len(a) > i + 2 else "")
        if not laeufe:
            print("kein Stand"); return 1
        k = sorted(laeufe)[-1]
        for z in laeufe[k]:
            if teil and teil not in z["url"]:
                continue
            ab = z["letzter_abruf"]
            u = "abgerufen nach Änderung" if ab not in ("-", "") and ab >= seit else "NOCH NICHT ABGERUFEN (Urteil offen, nicht «wirkungslos»)"
            print(f"  {ab:>10}  {z['url'].split('luxestyle.ch')[-1]}: {u}")
        print(f"(Stand {k})")
        return 0
    if "--abgleich" in a:
        i = a.index("--abgleich")
        if not laeufe:
            print("kein Stand"); return 1
        abgleich(a[i + 1], laeufe[sorted(laeufe)[-1]])
        return 0
    dateien = [x for x in a if not x.startswith("--")]
    if not dateien:
        print(__doc__); return 2
    liste = lies_liste()
    antworten = []
    for p in dateien:
        try:
            antworten.append(lies_antwort(p))
        except Exception as e:
            print(f"  ⚠️ {p}: unlesbar ({type(e).__name__}) — Seiten daraus bleiben «unklar»")
    zeilen, warn = auswerten(liste, antworten)
    fehlt = register_fehlt(liste)
    if fehlt:
        warn.append(f"{len(fehlt)} Register-Kollektion(en) nicht in der Messliste ({', '.join(fehlt[:4])}) → erst --pakete laufen lassen")
    drucke_lauf(zeilen, warn)
    if "--trocken" in a:
        print("TROCKEN: nichts geschrieben")
        return 0
    messdatum = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")
    schreibe_lauf(zeilen, messdatum)
    print(f"FERTIG: Lauf {messdatum} ({len(zeilen)} Seiten) → {os.path.relpath(STAND, REPO)}")
    print(bewerte(lies_stand())["zeile"])
    print(antraege_zeile(antraege_offen(zeilen, lies_antraege())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
