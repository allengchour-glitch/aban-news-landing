#!/usr/bin/env python3
"""Bestell-Ampel: EINE Zeile für die Keepalive-Ausgabe.

Betreiber 03.09.2026: «die bestellungen von kunden müssen sofort erledigt werden und alles
reibungslos». Bis dahin stand ein Fehlschlag des Bestell-Automaten nur in dessen Log — bei #1016
hat es niemand gesehen, bis von Hand nachgeschaut wurde. Diese Zeile steht ab jetzt in JEDER
stündlichen Keepalive-Meldung: bezahlte, unerfüllte Bestellungen mit Alter und dem Stand des
CJ-Auftrags (LX<nr>) aus dropship/_cj_order_watch_state.json.

Meldet nur. Liest Shopify (1 Abfrage) und die lokale Watch-Datei. Bei Fehler: eine Zeile
«BESTELLUNGEN: unklar (…)» — ein Ausfall darf nie wie «alles erledigt» aussehen.
"""
import json, os, sys, time, urllib.request, datetime as dt

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"

CJ_STATUS = {"CREATED": "angelegt, UNBEZAHLT", "IN_CART": "im CJ-Warenkorb, UNBEZAHLT", "UNPAID": "UNBEZAHLT",
             "UNSHIPPED": "bezahlt, wartet auf Versand", "SHIPPED": "versandt", "DELIVERED": "zugestellt",
             "TRASH": "verworfen", "CANCELLED": "storniert"}
ZAHLLISTE = "https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5"   # wartende Zahlungen (ZAHLUNG-LINKS-MERKEN.md)
LEDGER = os.path.join(REPO, "dropship/_cj_orders_done.txt")


def ledger_eintrag(nr, pfad=LEDGER):
    """Bestell-Ledger des Automaten (cj_order_engine): «#1025\tSD…\tLX1025\t$73.29» → {'sd','lx','betrag'}; sonst None.
    «(bereits-bei-cj)» ohne SD-Nummer zählt nicht als frischer Auftrag (Zustand kommt dann aus dem Abgleich)."""
    try:
        for z in open(pfad, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if t and t[0].strip() == f"#{nr}" and len(t) >= 3 and t[1].startswith("SD"):
                return {"sd": t[1], "lx": t[2], "betrag": t[3].strip() if len(t) > 3 else ""}
    except OSError:
        pass
    return None


# 13.10.2026 (Betreiber «check mal 1023»): eine BEZAHLTE Bestellung, die CJ nicht versendet, sah keiner unserer Wächter —
# versand_stillstand.py prüft nur Sendungen, die in Shopify schon ERFÜLLT sind (mit Nummer), die Ampel zeigte «bezahlt, wartet
# auf Versand» ohne Frist. GEMESSEN: bezahlt → Übergabe an den Carrier 1–5 T (LX1012/LX1015 je 3 T, Journal 02.10.); ab 5 T
# (= IRIS_H in versand_stillstand.py) ist es ein Fall für CJ (Agentin/Ticket).
UNVERSANDT_H = float(os.environ.get("UNVERSANDT_H", "120"))


def unversandt_warnung(stati, h):
    """stati = CJ-Status der LX-Aufträge einer Bestellung, h = Stunden seit Bestellung → Warnzusatz oder ''."""
    if h >= UNVERSANDT_H and any(x == "UNSHIPPED" for x in stati):
        return f" ⚠️ seit {h / 24:.0f} T unversandt → CJ fragen (Ticket/Agentin)"
    return ""


FORTURA_LEDGER = os.path.join(REPO, "dropship/_fortura_bestellungen.tsv")


def fortura_stand(nr, h, pfad=FORTURA_LEDGER, jetzt=None):
    """Reine Fortura-Bestellung → (Stand, Warnzusatz). 13.10.2026 (Trockenlauf Fortura-Kette): nur «bestellt» (Stufe 1, Quittung)
    galt als in Ordnung — der Normalzustand von Stufe 2, «xml-hochgeladen», stand damit IMMER mit ⚠️ da. Jetzt: hochgeladen ist in
    Ordnung bis 24 h (seit 20.10.; dieselbe Frist wie fortura_bestell_engine: «bei Fortura nachfragen»), «bereit»/«versandt»/unbekannt bleiben ⚠️."""
    fst, info = "unbekannt", ""
    try:
        for z in open(pfad, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) > 3 and t[0] == nr: fst, info = t[3], (t[4] if len(t) > 4 else "")
    except Exception:
        pass
    # 20.10.2026 (Härtung 6): die 24-h-Frist zählt Werktage-Stunden (Fortura arbeitet Mo–Fr) — wie fortura_bestell_engine. Ohne fortura_xml: echte Stunden.
    try:
        import datetime as _dt
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from fortura_xml import werktag_stunden
        _jetzt = jetzt or _dt.datetime.now(_dt.timezone.utc)
        h_frist = werktag_stunden(_jetzt - _dt.timedelta(hours=h), _jetzt)
    except Exception:
        h_frist = h
    ok = fst == "bestellt" or (fst == "xml-hochgeladen" and h_frist <= 24)   # 20.10.2026: 48 → 24 h (#1027: Fortura stornierte nach 20,7 h per Mail)
    # 20.10.2026 (Härtung 2): «xml-unterwegs» = Absturz zwischen Senden und Quittung — der Betreiber muss bei Fortura nachfragen (`--erneut`/`--bestellt`)
    if fst == "xml-unterwegs":
        return f"Fortura: UPLOAD-UNKLAR · {info[:80]}", " ⚠️"
    # 13.10.2026 Nachtrag (Prüfer N2): «abweichend» (Lieferschein mit Ersatzartikel/fremder Nummer) und «teilgeliefert» zeigen,
    # WAS fehlt bzw. fremd ist — sonst steht nur ein Wort da und die Kundin wartet auf das bestellte Teil.
    if fst in ("abweichend", "teilgeliefert"):
        d = info[info.find(" · fehlt"):] if " · fehlt" in info else info[info.find(" · fremd"):] if " · fremd" in info else ""
        return f"Fortura: {fst.upper()}{d[:140]}", " ⚠️"
    # 20.10.2026 (#1027): «nicht-lagernd» = Fortura-Lager (nicht Bazar) hat die Ware JETZT nicht; es wurde kein XML gesendet. Die Kundin
    # wartet — ⚠️ mit Grund (Artikel/Lager/Menge) statt nur dem Wort, bis die Bestellung erstattet/geschlossen ist.
    if fst == "nicht-lagernd":
        return f"Fortura: NICHT-LAGERND · {info[:140]}", " ⚠️"
    return f"Fortura: {fst}", "" if ok else " ⚠️"


def selbsttest():
    import tempfile
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt") as f:
        f.write("#1023\t(bereits-bei-cj)\tLX1023\n#1025\tSD2610121602510642100\tLX1025\t$73.29\n")
    faelle = [(ledger_eintrag("1025", f.name), {"sd": "SD2610121602510642100", "lx": "LX1025", "betrag": "$73.29"}),
              (ledger_eintrag("1023", f.name), None),      # schon bei CJ, kein frischer Auftrag
              (ledger_eintrag("1026", f.name), None),      # nicht im Ledger
              (ledger_eintrag("102", f.name), None)]       # kein Präfix-Treffer (#102 ≠ #1025)
    os.unlink(f.name)
    faelle += [(unversandt_warnung(["UNSHIPPED"], 55), ""),                        # #1023 am 13.10.: 2 T, normal
               (unversandt_warnung(["UNSHIPPED"], 121), " ⚠️ seit 5 T unversandt → CJ fragen (Ticket/Agentin)"),
               (unversandt_warnung(["SHIPPED"], 300), ""),                          # unterwegs = versand_stillstand
               (unversandt_warnung([], 300), "")]
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".tsv") as f:
        f.write("nr\tzeit\tpositionen\tstatus\tfortura_auftrag\n1030\tx\t93583×1\txml-hochgeladen\tORDERS_LX1030.xml\n"
                "1031\tx\t93583×1\tbereit\t\n1032\tx\t93583×1\tbestellt\t\n")
    import datetime as _d
    mi = _d.datetime(2026, 10, 21, 12, 0, tzinfo=_d.timezone.utc)       # Mittwoch: Frist = echte Stunden (keine Wochenendlücke im Fenster)
    so = _d.datetime(2026, 10, 25, 12, 0, tzinfo=_d.timezone.utc)       # Sonntag: 40 h zurück = Freitag 20:00 → nur 4 Werktage-Stunden
    faelle += [(fortura_stand("1030", 5, f.name, jetzt=mi), ("Fortura: xml-hochgeladen", "")),
               (fortura_stand("1030", 60, f.name, jetzt=mi), ("Fortura: xml-hochgeladen", " ⚠️")),
               (fortura_stand("1030", 40, f.name, jetzt=so), ("Fortura: xml-hochgeladen", "")),      # Freitag-Abend-Bestellung warnt nicht am Wochenende
               (fortura_stand("1031", 1, f.name), ("Fortura: bereit", " ⚠️")),
               (fortura_stand("1032", 90, f.name), ("Fortura: bestellt", "")),
               (fortura_stand("1099", 1, f.name), ("Fortura: unbekannt", " ⚠️"))]
    os.unlink(f.name)
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".tsv") as f:     # 13.10.2026 Nachtrag N2
        f.write("nr\tzeit\tpositionen\tstatus\tfortura_auftrag\n"
                "1040\tx\t93583×1, 90654-2×1\tabweichend\tORDERS_LX1040.xml · Lieferschein LS1 · DPD 1 · fehlt 90654-2 0/1"
                " · fremd 99999×1 nicht bestellt\n"
                "1041\tx\t93583×2\tteilgeliefert\tORDERS_LX1041.xml · fehlt 93583 1/2\n"
                "1042\tx\t93583×1\terfuellt\tORDERS_LX1042.xml\n"
                "1043\tx\t77777×1\tnicht-lagernd\t77777 Fortura-Lager 0 < 1\n")
    faelle += [(fortura_stand("1040", 30, f.name),
                ("Fortura: ABWEICHEND · fehlt 90654-2 0/1 · fremd 99999×1 nicht bestellt", " ⚠️")),
               (fortura_stand("1041", 30, f.name), ("Fortura: TEILGELIEFERT · fehlt 93583 1/2", " ⚠️")),
               (fortura_stand("1042", 30, f.name), ("Fortura: erfuellt", " ⚠️")),   # erfüllt + trotzdem offen = Shopify hinkt → ⚠️
               (fortura_stand("1043", 2, f.name), ("Fortura: NICHT-LAGERND · 77777 Fortura-Lager 0 < 1", " ⚠️"))]   # 20.10.: #1027-Klasse
    os.unlink(f.name)
    ok = all(a == b for a, b in faelle)
    for i, (a, b) in enumerate(faelle):
        print(f"  {'OK  ' if a == b else 'FEHL'} Fall {i + 1}: {a}")
    print("SELBSTTEST", "OK" if ok else "FEHLER")
    return 0 if ok else 1


def main():
    try:
        tok = open("/tmp/cj_shop_token.txt").read().strip()
    except Exception as e:
        print(f"BESTELLUNGEN: unklar (kein Shop-Token: {e})"); return
    # 13.10.2026 Nachtrag: teilerfüllt (Fortura-Teil versandt, CJ-Teil oder Ersatzfall offen) darf nicht aus der Ampel fallen.
    # GEMESSEN: «(… OR …)» wirkt (unfulfilled 12 + shipped 11 = 23); ob «unfulfilled» partial schon einschliesst, war nicht
    # messbar (0 teilerfüllte Bestellungen) → ausdrücklich dazu.
    q = ('{orders(first:20,query:"financial_status:paid AND (fulfillment_status:unfulfilled OR fulfillment_status:partial) AND status:open",'
         'sortKey:CREATED_AT,reverse:true){nodes{name createdAt '
         'totalPriceSet{shopMoney{amount}} '
         'refunds(first:3){id totalRefundedSet{shopMoney{amount}} transactions(first:5){nodes{kind status amountSet{shopMoney{amount}}}}} '
         'lineItems(first:3){nodes{title sku}}}}}')
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
        data=json.dumps({"query": q}).encode(),
        headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    # ⚠️ Shopifys Drosselung ist KEIN Ausfall. Am 03.09. meldete die Ampel «unklar
    # (Shopify: 'data')», weil vier CJ-Runner und vier Hintergrundlaeufe den Punkte-Eimer
    # leer hielten — einzeln aufgerufen antwortete dieselbe Abfrage sofort. Eine Warnzeile,
    # die bei jedem knappen Eimer «unklar» sagt, wird nach dem dritten Mal nicht mehr
    # gelesen; genau dann steht der echte Ausfall darin. Also warten statt aufgeben.
    nodes, fehler = None, ""
    for versuch in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            fehler = str(e)[:80]; time.sleep(2 + 2 * versuch); continue
        if d.get("data"):
            nodes = d["data"]["orders"]["nodes"]; break
        errs = d.get("errors") or []
        fehler = (errs[0].get("message") if errs else "keine Daten")
        ts = (d.get("extensions") or {}).get("cost", {}).get("throttleStatus") or {}
        if ts:
            fehlt = 20 - ts.get("currentlyAvailable", 0)
            time.sleep(max(2, fehlt / max(ts.get("restoreRate", 50), 1) + 1))
        else:
            time.sleep(2 + 2 * versuch)
    if nodes is None:
        print(f"BESTELLUNGEN: unklar (Shopify: {fehler})"); return
    try:
        watch = json.load(open(os.path.join(REPO, "dropship/_cj_order_watch_state.json")))
    except Exception:
        watch = {}
    if not nodes:
        print("BESTELLUNGEN: 0 offen"); return
    now = dt.datetime.now(dt.timezone.utc)
    teile = []
    for o in nodes:
        nr = o["name"].lstrip("#")
        alter = now - dt.datetime.fromisoformat(o["createdAt"].replace("Z", "+00:00"))
        h = alter.total_seconds() / 3600
        alt = f"{h:.0f}h" if h < 48 else f"{h/24:.0f}d"
        # Eine erstattete Bestellung ist erledigt, auch wenn Shopify sie bis zum Settlement
        # noch als "paid" fuehrt — sonst steht das ⚠️ weiter, nachdem der Fall geloest ist.
        # ⚠️ 30.09.2026 (#1019): «irgendeine Rückerstattung» ≠ erstattet — CHF 16.11 von 23.11 (Versand fehlte) stand als
        # «erstattet». Gezählt werden die Rückerstattungs-Buchungen (auch PENDING: Shopify Payments bucht nach), nicht die Existenz.
        summe = float(o["totalPriceSet"]["shopMoney"]["amount"])
        from erstattung import zurueck as _zurueck
        zurueck = _zurueck(o)
        erstattet = bool(o.get("refunds")) and zurueck >= summe - 0.005
        teil = bool(o.get("refunds")) and not erstattet
        lx = [k for k in watch if k.startswith((f"LX{nr}", f"#{nr}"))]  # «#1020» = von Hand in der CJ-Konsole (30.09.)
        if erstattet:
            st, warn = "erstattet", ""
        elif teil:
            st, warn = f"TEILERSTATTET CHF {zurueck:.2f}/{summe:.2f}", " ⚠️"
        else:
            # 02.10.2026: «LX1021:UNSHIPPED» wurde als «unbezahlt» gelesen (auch von mir) — bei CJ heisst UNSHIPPED
            # «bezahlt, noch nicht versandt». Status deutsch ausschreiben, Tracking dazu.
            # 05.10.2026: reine Fortura-Bestellung (Schweizer Lager) hat nie einen CJ-Auftrag — Stand aus dem Fortura-Ledger.
            skus = [(li.get("sku") or "") for li in o["lineItems"]["nodes"]]
            if skus and all(x.startswith("fortura-") for x in skus):
                st, warn = fortura_stand(nr, h)
                teile.append(f"#{nr} {alt} CHF {float(o['totalPriceSet']['shopMoney']['amount']):.2f} → {st}{warn}")
                continue
            # 13.10.2026 Nachtrag: Mischkorb (CJ + Fortura) zeigte nur den CJ-Stand; der Fortura-Teil (z. B. «abweichend») fehlte.
            f_zusatz = ""
            if any(x.startswith("fortura-") for x in skus):
                fst, fwarn = fortura_stand(nr, h)
                f_zusatz = f" · {fst}{'' if fst == 'Fortura: erfuellt' else fwarn}"   # Fortura-Teil erledigt, CJ-Teil offen = normal
            st = ", ".join(f"{k}: {CJ_STATUS.get(watch[k].get('status'), watch[k].get('status', '?'))}"
                           + (f" ({watch[k]['tracking']})" if watch[k].get("tracking") else "") for k in lx) \
                if lx else "KEIN CJ-Auftrag"
            if any(watch[k].get("status") in ("CREATED", "IN_CART", "UNPAID") for k in lx):
                st += f" → 💳 zahlen: {ZAHLLISTE}"          # 12.10.: die Zeile führt direkt zum Bezahlen (Dauerauftrag 11.10.)
            warn = " ⚠️" if (not lx and h > 2) or any(watch[k].get("status") in ("TRASH", "CANCELLED") for k in lx) else ""
            warn = warn or unversandt_warnung([watch[k].get("status") for k in lx], h)
            # 19.10.2026 (Betreiber «1024 check? mail? wo ist es»): von Hand bestellte Ware (Mister DTF, A-Post ohne Sendungsnummer)
            # hat keinen Abgleich — ohne diese Frist stand #1024 acht Tage ohne ⚠️ da. Zusage 3–5 Arbeitstage + A-Post ≈ 8 Tage.
            if not warn and h > 240 and any(str(watch[k].get("status", "")).startswith("MANUELL") for k in lx):
                if any(str(watch[k].get("status", "")).startswith("MANUELL") and watch[k].get("tracking") for k in lx):
                    warn = f" ⚠️ seit {h / 24:.0f} T offen, Sendungsnummer vorhanden → in Shopify als versandt buchen"   # 19.10. (AMP-3)
                else:
                    warn = f" ⚠️ seit {h / 24:.0f} T ohne Versandnachweis → beim Anbieter nachfragen (Kundin informieren)"
            # 12.10.2026 (#1025): Der Bestell-Automat legt den CJ-Auftrag sofort an und schreibt ihn ins Ledger; der
            # Abgleich (cj_order_watch, Zustand oben) lief nur alle 2 h. Die Ampel zeigte «KEIN CJ-Auftrag», obwohl
            # LX1025 seit Minuten auf ZAHLUNG wartete — genau die Zeile, die der Betreiber zum Bezahlen braucht.
            if not lx:
                le = ledger_eintrag(nr)
                if le:
                    st = (f"{le['lx']} angelegt ({le['sd']}{', ' + le['betrag'] if le['betrag'] else ''}), CJ-Abgleich folgt — "
                          f"falls unbezahlt: 💳 {ZAHLLISTE}")
                    warn = " ⚠️" if h > 6 else ""
            st += f_zusatz
        teile.append(f"#{nr} {alt} CHF {float(o['totalPriceSet']['shopMoney']['amount']):.2f} → {st}{warn}")
    print(f"BESTELLUNGEN: {len(nodes)} offen · " + " | ".join(teile))

if __name__ == "__main__":
    sys.exit(selbsttest()) if "--selbsttest" in sys.argv else main()
